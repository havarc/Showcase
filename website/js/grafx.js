var gl_canvas, gl;

var degtorad = Math.PI / 180;

var main_program; // main shader program
var line_program; // showing lines

var old_ms = 0;

var n = 127;

var grafx = new function(){
	"use strict";
	this.init = function(){
		gl_canvas = document.getElementById('local-canvas');
		console.log('starting webgl');
		// loadup webgl
		gl = WebGLUtils.setupWebGL(gl_canvas);
		if (!gl) {alert("Can't get WebGL"); return;}
		// request main shader
		main_program = shader_manager.request_shader('main', gl);
		line_program = shader_manager.request_shader('line', gl);
		// setup gl

		// gl.enable(gl.DEPTH_TEST);
		// gl.disable(gl.DEPTH_TEST);
		// gl.depthFunc(gl.LESS);
		// gl.enable(gl.BLEND);
		// gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		// gl.clearDepth(1.0);
		// gl.clearColor(0.5, 1.0, 1.0, 1.0);
		// gl.enable(gl.POINT_SMOOTH)

		// settings
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.enable(gl.DEPTH_TEST);
		// gl.enable(gl.CULL_FACE);
		// gl.cullFace(gl.BACK);
		draw_scene();
	};


	// -- camera prototype --
	var cproto = function(args){
		// initialize this object
		trajectory_manager.generate_proto.call(this, args);
		this.scene_head = args.scene_head || {};
		this.target = args.target || {};
		this.up = args.up || [0,1,0];

		this.parameters = {FOV: 60, width: 400, height: 200}; // default if not provided
		this.projection = mat4.create();
		// var target; // TODO: attach any (empty?) object from the scene tree here as camera target
		this.scene_head = this.parent_node; // camera renders only its own scene head
		// get up to scene head
		while(this.scene_head.parent_node)
			this.scene_head = this.scene_head.parent_node;
		this.scene_head.cameras.push(this);

		this._line_buffer = [];

		this.change_projection(args.proj_params);
		// target_canvas = 'canvas';
		// draw_rect = [0. ,0. ,1. ,1. ]; // area to draw on the canvas

		// var visible_objects = []; // list of objects to render, aquired by child.prepare
		// var lights = []; // list of lights to render



		this.attach_visible_object = function(object){
			visible_objects.push(object);
		};

		this.attach_light = function(light){
			lights.push(light);
		};
	}
	cproto.prototype.is_camera_node = true;

	//*/
	// set this objects prototype
	cproto.prototype = Object.create(trajectory_manager.generate_proto.prototype);

	cproto.prototype.render = function(){
		if(this.get_transform()[15] == -1) // found myself marked for removal
		{
			// ----- camera panic -----
			// called when I find myself marked for removal during rendering
			// TODO: check if I even have a render target, if not then drop myself
			console.log('camera panic!');
			var pn = this.parent_node;
			// find non-marked parent_node or scene head
			// TODO: keep my relative position to the scene_head
			while(pn.get_transform()[15] == -1 && pn.parent_node)pn = pn.parent_node;
			// move myself to that parent_node
			parent_node.add_child(this);
			console.log('my new parent_node: ', parent_node);
			// get another transform
			this.get_transform()[15] = 0; // reset fail bit
			return this.get_transform(); // update transform
			// TODO: keep or delete camaera
		}

		// TODO use program by model
		gl.useProgram(main_program);

		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		// load matrices
		// TODO use uniform buffer object
		gl.uniformMatrix4fv(main_program.rtMatrix, false, this.get_transform());
		gl.uniformMatrix4fv(main_program.vpMatrix, false, this.projection);
		//-- static diffuse color --
		// Set the color to use
		gl.uniform4fv(main_program.u_color, [0.8, 1, 0.2, 0]); // green
	
		// set the light direction.
		gl.uniform3fv(main_program.u_reverseLightDirection, [0.5, -0.7, -1]);



		//TODO: cull objects outside of view
		this.scene_head.children.forEach(function(ch){
			ch.draw();
		});

		/*
		// draw lines
		// NOTE: render AFTER everything else
		// TODO: depth buffer handling
		// TODO: add copy and decay

		// gl.useProgram(line_program);
		gl.uniformMatrix4fv(main_program.rtMatrix, false, reverse_transform);
		gl.uniformMatrix4fv(main_program.vpMatrix, false, this.projection);
		this._line_buffer.forEach(function(l){
			// gl.uniformMatrix4fv(main_program.mvMatrix, false, mat4.create());
			gl.uniform3fv(main_program.position, l.pos);
			gl.uniform4fv(main_program.orientation, l.orn);
			gl.bindBuffer(gl.ARRAY_BUFFER, l);
			gl.vertexAttribPointer(main_program.vertex, 3, gl.FLOAT, false, 0, 0);
			gl.bindBuffer(gl.ARRAY_BUFFER, l.colors);
			gl.vertexAttribPointer(main_program.color, 4, gl.FLOAT, false, 0, 0);
			gl.drawArrays(gl.LINES, 0, l.size);
		})
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		// gl.useProgram(line_program);
		// gl.uniformMatrix4fv(line_program.rtMatrix, false, reverse_transform);
		// gl.uniformMatrix4fv(line_program.vpMatrix, false, this.projection);
		// this._line_buffer.forEach(function(l){
		// 	gl.uniformMatrix4fv(line_program.mvMatrix, false, mat4.create());
		// 	gl.bindBuffer(gl.ARRAY_BUFFER, l);
		// 	gl.vertexAttribPointer(line_program.vertex, 3, gl.FLOAT, false, 0, 0);
		// 	gl.drawArrays(gl.LINES, 0, l.size);
		// })
		// gl.bindBuffer(gl.ARRAY_BUFFER, null);
		//*/
	};

	// line tool
	// if other cameras need same line they can copy the reference
	// TODO: each line vertex has coordinates AND its own transform
	// -transform from physical object, moving or stationary
	// -transform from virtual objects, destinations, docks etc
	// -reverse reverse cam transform for screen space positioning
	let nullmat = new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);

	cproto.prototype.create_lines = function(ldata, lcolors, args){
		// manual transforms or trajectory copys
		args = args || {};
		let transform = args.transform || nullmat;
		// this.decay = args.decay || -1;
		// this.mode = args.mode || gl.LINES;
		let buffer = gl.createBuffer();
		buffer.colors = gl.createBuffer();
		buffer.size = ldata.length / 3;

		// if(!lcolors){
		// 	lcolors = [];
		// 	lcolors.fill(1, 0, buffer.size);
		// }

		if (args.pos instanceof Float32Array)
			buffer.pos = args.pos;
		else if (args.pos instanceof Array)
			buffer.pos = new Float32Array(args.pos);
		else buffer.pos = new Float32Array([0,0,0])

		if (args.orn instanceof Float32Array)
			buffer.orn = args.orn;
		else if (args.orn instanceof Array)
			buffer.orn = new Float32Array(args.orn);
		else buffer.orn = new Float32Array([0,0,0,1])

		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ldata), gl.STATIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer.colors);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lcolors), gl.STATIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);

		let i = this._line_buffer.push(buffer)-1; // return index
		return i;
	}

	cproto.prototype.change_projection = function(proj_params){
		proj_params = proj_params || {};
		this.parameters.FOV = proj_params.FOV || this.parameters.FOV;
		this.parameters.width = proj_params.width || this.parameters.width;
		this.parameters.height = proj_params.height || this.parameters.height;
		// mat4.perspective(projection, parameters.FOV/180*Math.PI, parameters.width/parameters.height, 0.1, 100);
		set_perspective(60, this.parameters.width/this.parameters.height, 0.1, 100, this.projection);
		function set_perspective(a,b,c,d,e){
			a=c*Math.tan(a*Math.PI/360);
			b=a*b;
			return set_frustum(-b,b,-a,a,c,d,e);
		}
		function set_frustum(a,b,c,d,e,g,f){
			f=f||mat4.create();
			let h=b-a,i=(d-c),j=g-e;
			f[0]=e*2/(2*b);
			f[1]=0;
			f[2]=0;
			f[3]=0;
			f[4]=0;
			f[5]=e*2/(2*d);
			f[6]=0;
			f[7]=0;
			f[8]=0;
			f[9]=0;
			f[10]=-(g+e)/(g-e);
			f[11]=-1;
			f[12]=0;
			f[13]=0;
			f[14]=-(g*e*2)/(g-e);
			f[15]=0;
			return f;
		}
	};

	// cproto.prototype.get_transform = trajectory_manager.cam_transform;
	cproto.prototype.delete = function(){
		// TODO remove me from scene_head.cameras using filter
	}

	// export
	this.generate_proto = cproto;
}();

// main frame call
// TODO: start only after all is ready
function draw_scene(){
	// return
	// console.log("rendering");
	window.requestAnimFrame(draw_scene, gl_canvas);
	// if(!main_program.ready){
	// 	gl.flush(); return; }

	scene_manager.render();

	// end scene
	gl.flush();

	// move things
	var d = new Date();
	var new_ms = d.getMilliseconds();
	trajectory_manager.cycle(1000*(new_ms < old_ms) + new_ms - old_ms);
	old_ms = new_ms;
}



"use strict";

const degtorad = Math.PI / 180;

// var n = 127;

/**
 * @module: rendering
 * @exports: camera prototype
 * 
 * puts the final images together
 */
const grafx = new function(){
	let gl_canvas, gl;
	let color_program;
	let texture_program;
	let line_program;
	let obj_program;
	let old_ms = 0;
	let sdcnt = 3;
	let lod = 0; // current level of detail

	this.init = function(){
		gl_canvas = document.getElementById('local-canvas');
		// loadup webgl
		gl = WebGLUtils.setupWebGL(gl_canvas);
		if (!gl) {alert("Can't get WebGL"); return;}
		// request main shader
		color_program = shader_manager.request_shader('color');
		texture_program = shader_manager.request_shader('texture');
		line_program = shader_manager.request_shader('line');
		obj_program = shader_manager.request_shader('obj');

		// settings
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.enable(gl.DEPTH_TEST);
		// gl.enable(gl.CULL_FACE);
		// gl.cullFace(gl.BACK);
		draw_scene();
	};

	this.get_gl = function(){return gl;};

	this.resize_canvas = function(){
		var width = gl_canvas.width = gl_canvas.clientWidth;
		var height = gl_canvas.height = gl_canvas.clientHeight;
		gl.viewport(0, 0, width, height);
		// TODO get cam from scene_manager
		// TODO: move to rendering
		scene_manager.change_viewport(width, height);
	};

	// generates a texture buffer for the texture-manager to manage
	this.create_texture_buffer= function(src){
		let texture = gl.createTexture();
		let image = new Image();
		image.onload = () => {
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
			gl.generateMipmap(gl.TEXTURE_2D);

			//turn off mips for now and clamp to edge
			// gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			// gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			// gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		}
		image.src = src;

  		return texture;
	}

	// let dtex = gl.createTexture();
	
	this.default_texture = function(){}

	// model_node can call this to get buffers for their data
	// returns the render-function for colored meshes
	this.generate_colored_render_function = function(mesh){
		if(!mesh.triangle_index){
			return () => {};
		}

		// create the Vertex Array Object
		let vao = gl.createVertexArray();
		gl.bindVertexArray(vao);

		let vertex_buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
		gl.bufferData(gl.ARRAY_BUFFER, mesh.vertex_data, gl.STATIC_DRAW);
		gl.enableVertexAttribArray(color_program.vertex);
		gl.vertexAttribPointer(color_program.vertex_data, 3, gl.FLOAT, false, 0, 0);

		if(Number.isInteger(color_program.normal_data)){
			let normal_buffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, normal_buffer);
			gl.bufferData(gl.ARRAY_BUFFER, mesh.normal_data, gl.STATIC_DRAW);
			gl.enableVertexAttribArray(color_program.normal_data);
			gl.vertexAttribPointer(color_program.normal_data, 3, gl.FLOAT, false, 0, 0);
		}

		if(Number.isInteger(color_program.color_data)){
			let color_buffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
			gl.bufferData(gl.ARRAY_BUFFER, mesh.color_data, gl.STATIC_DRAW);
			gl.enableVertexAttribArray(color_program.color_data);
			gl.vertexAttribPointer(color_program.color_data, 4, gl.FLOAT, false, 0, 0);
		}
		gl.bindBuffer(gl.ARRAY_BUFFER, null);

		gl.bindVertexArray(null);

		let lod_buffer = [];
		let lod_edge_buffer = [];
		let triangle_count = [];
		let line_count = [];

		for(let i = 0; i <= sdcnt; i++){
			// if(i)	mesh = subdivide(mesh, i);
			// create subsequent lod
			lod_buffer[i] = gl.createBuffer();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, lod_buffer[i]);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,mesh.triangle_index[i], gl.STATIC_DRAW);
			triangle_count[i] = mesh.triangle_index[i].length;

			lod_edge_buffer[i] = gl.createBuffer();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, lod_edge_buffer[i]);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.edge_index[i], gl.STATIC_DRAW);
			line_count[i] = mesh.edge_index[i].length;
		}

		// return drawing function
		return function(lod = 0, transform, projection){
			if(!transform instanceof Float32Array || !projection instanceof Float32Array){
				console.warn('transform or rojection matrix not Typed Array');
				return false;
			}

			gl.useProgram(color_program);

			// load matrices
			// TODO use uniform buffer object
			gl.uniformMatrix4fv(color_program.rtMatrix, false, transform);
			gl.uniformMatrix4fv(color_program.vpMatrix, false, projection);
	
			gl.uniform3fv(color_program.position, this.parent_node.gpos);
			gl.uniform4fv(color_program.orientation, this.parent_node.gorn);
			gl.uniformMatrix4fv(color_program.mvMatrix, false, this.get_transform());

			gl.bindVertexArray(vao);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, lod_buffer[lod]);

			// TODO: use drawRangeElements for lod
			gl.drawElements(gl.TRIANGLES, triangle_count[lod], gl.UNSIGNED_SHORT, 0);
			gl.bindVertexArray(null);
		};
	}

	// returns the render-function for textured meshes
	this.generate_textured_render_function = function(mesh, texture){
		if(!mesh.triangle_index){
			return () => {};
		}

		// create the Vertex Array Object
		let vao = gl.createVertexArray();
		gl.bindVertexArray(vao);

		let vertex_buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
		gl.bufferData(gl.ARRAY_BUFFER, mesh.vertex_data, gl.STATIC_DRAW);
		gl.enableVertexAttribArray(texture_program.vertex);
		gl.vertexAttribPointer(texture_program.vertex_data, 3, gl.FLOAT, false, 0, 0);

		// check if the data is used in the sahder
		if(Number.isInteger(texture_program.normal_data)){
			let normal_buffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, normal_buffer);
			gl.bufferData(gl.ARRAY_BUFFER, mesh.normal_data, gl.STATIC_DRAW);
			gl.enableVertexAttribArray(texture_program.normal_data);
			gl.vertexAttribPointer(texture_program.normal_data, 3, gl.FLOAT, false, 0, 0);
		}

		if(Number.isInteger(texture_program.texture_data)){
			let texture_buffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, texture_buffer);
			gl.bufferData(gl.ARRAY_BUFFER, mesh.texture_data, gl.STATIC_DRAW);
			gl.enableVertexAttribArray(texture_program.texture_data);
			gl.vertexAttribPointer(texture_program.texture_data, 2, gl.FLOAT, false, 0, 0);
		}

		gl.bindVertexArray(null);

		let lod_buffer = [];
		let lod_edge_buffer = [];
		let triangle_count = [];
		let line_count = [];

		for(let i = 0; i <= sdcnt; i++){
			lod_buffer[i] = gl.createBuffer();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, lod_buffer[i]);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,mesh.triangle_index[i], gl.STATIC_DRAW);
			triangle_count[i] = mesh.triangle_index[i].length;

			lod_edge_buffer[i] = gl.createBuffer();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, lod_edge_buffer[i]);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.edge_index[i], gl.STATIC_DRAW);
			line_count[i] = mesh.edge_index[i].length;
		}
	

		// return drawing function
		return function(lod = 0, transform, projection){
			if(!transform instanceof Float32Array || !projection instanceof Float32Array){
				console.warn('transform or rojection matrix not Typed Array');
				return false;
			}

			gl.useProgram(texture_program);

			// load matrices
			// TODO use uniform buffer object
			gl.uniformMatrix4fv(texture_program.rtMatrix, false, transform);
			gl.uniformMatrix4fv(texture_program.vpMatrix, false, projection);

			gl.uniform3fv(texture_program.position, this.parent_node.gpos);
			gl.uniform4fv(texture_program.orientation, this.parent_node.gorn);
			gl.uniformMatrix4fv(texture_program.mvMatrix, false, this.get_transform());

			gl.bindVertexArray(vao);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, lod_buffer[lod]);
	
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.uniform1i(texture_program.u_texture, 0)

			// TODO: use drawRangeElements for lod
			gl.drawElements(gl.TRIANGLES, triangle_count[lod], gl.UNSIGNED_SHORT, 0);
			gl.bindVertexArray(null);
		};

	}

	// returns the render-function for obj-files
	this.generate_obj_render_function = function(mesh, materials){
		// for some reason, the materials are given in as Promise
		// and we have to fetch them from the mat_man by name
		// console.log(materials);
		const mat = material_manager.load_material(materials[0].name);
		let parts = [];

		for(let m of mesh){
			console.log(m.data.position)
			const vao = gl.createVertexArray();
			gl.bindVertexArray(vao);

			let position = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, position);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(m.data.position), gl.STATIC_DRAW);
			gl.enableVertexAttribArray(obj_program.a_position);
			gl.vertexAttribPointer(obj_program.a_position, 3, gl.FLOAT, false, 0, 0);

			if(obj_program.a_normal){
				let normal = gl.createBuffer();
				gl.bindBuffer(gl.ARRAY_BUFFER, normal);
				if(m.data.normal && m.data.position.length === m.data.normal.length){
					gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(m.data.normal), gl.STATIC_DRAW);
				} else {
					gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(Array(m.data.position.length).fill(1)), gl.STATIC_DRAW);
				}
				gl.enableVertexAttribArray(obj_program.a_normal);
				gl.vertexAttribPointer(obj_program.a_normal, 3, gl.FLOAT, false, 0, 0);
			}

			if(obj_program.a_color){
				let color = gl.createBuffer();
				gl.bindBuffer(gl.ARRAY_BUFFER, color);
				if(m.data.color && m.data.position.length === m.data.color.length){
					gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(m.data.color), gl.STATIC_DRAW);
				} else {
					gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(Array(m.data.position.length/3*4).fill(1)), gl.STATIC_DRAW);
				}
				gl.enableVertexAttribArray(obj_program.a_color);
				gl.vertexAttribPointer(obj_program.a_color, 4, gl.FLOAT, false, 0, 0);
			}
		
			gl.bindVertexArray(null);
			vao.size = m.data.position.length/3;
			vao.mat = mat.get(m.material)
			console.log(vao.mat.ambient);
			parts.push(vao);
		}
		console.log(parts);


		// return drawing function
		return function(lod = 0, cam_transform, projection){
			var defaultmatrix = [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
			gl.useProgram(obj_program);
			// console.log(this.parent_node.gpos, this.parent_node.gorn);

			// load matrices
			// TODO use uniform buffer object
			// camera
			gl.uniformMatrix4fv(obj_program.rtMatrix, false, cam_transform);
			gl.uniformMatrix4fv(obj_program.vpMatrix, false, projection);

			// object to draw
			gl.uniformMatrix4fv(obj_program.transform, false, this.parent_node.get_transform());
			// gl.uniform3fv(obj_program.position, this.parent_node.gpos);
			// gl.uniform4fv(obj_program.orientation, this.parent_node.gorn);

			for(let p of parts){
				// console.log(p.mat);
				gl.uniform3fv(obj_program.ambient, p.mat.diffuse);
				gl.bindVertexArray(p);
				gl.drawArrays(gl.TRIANGLES, 0, p.size);
			}
			gl.bindVertexArray(null);
		};
		
		return

		
		let normal = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, normal);
		gl.bufferData(gl.ARRAY_BUFFER, mesh.normal, gl.STATIC_DRAW);
		
		let color = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, color);
		gl.bufferData(gl.ARRAY_BUFFER, mesh.color, gl.STATIC_DRAW);
		
		let texcoord = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, texcoord);
		gl.bufferData(gl.ARRAY_BUFFER, mesh.texcoord, gl.STATIC_DRAW);

		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		gl.bindVertexArray(null);

	
		// create the Vertex Array Object
		gl.bindVertexArray(vao);


		// check if the data is used in the sahder
		if(Number.isInteger(texture_program.normal_data)){
			gl.enableVertexAttribArray(texture_program.normal_data);
			gl.bindBuffer(gl.ARRAY_BUFFER, normal_buffer);
			gl.vertexAttribPointer(texture_program.normal_data, 3, gl.FLOAT, false, 0, 0);
		}

		if(Number.isInteger(texture_program.texture_data)){
			gl.enableVertexAttribArray(texture_program.texture_data);
			gl.bindBuffer(gl.ARRAY_BUFFER, texture_buffer);
			gl.vertexAttribPointer(texture_program.texture_data, 2, gl.FLOAT, false, 0, 0);
		}

		gl.bindVertexArray(null);

		// return drawing function
		return function(lod = 0, transform, projection){
			var defaultmatrix = [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
			// At init or draw time depending on use.
			var someWorldViewProjectionMat = projection;
			var lightWorldPos              = [100, 200, 300];
			var worldMat                   = transform;
			var viewInverseMat             = defaultmatrix;
			var worldInverseTransposeMat   = defaultmatrix;
			var lightColor                 = [1, 1, 1, 1];
			var ambientColor               = [0.1, 0.1, 0.1, 1];
			var diffuseTextureUnit         = 0;
			var specularColor              = [1, 1, 1, 1];
			var shininess                  = 60;
			var specularFactor             = 1;
			
			gl.useProgram(obj_program);
			gl.bindVertexArray(vao);
			
			// Setup the textures used
			gl.activeTexture(gl.TEXTURE0 + diffuseTextureUnit);
			gl.bindTexture(gl.TEXTURE_2D, diffuseTexture);
			
			// Set all the uniforms.
			gl.uniformMatrix4fv(u_worldViewProjectionLoc, false, someWorldViewProjectionMat);
			gl.uniform3fv(u_lightWorldPosLoc, lightWorldPos);
			gl.uniformMatrix4fv(u_worldLoc, worldMat);
			gl.uniformMatrix4fv(u_viewInverseLoc, viewInverseMat);
			gl.uniformMatrix4fv(u_worldInverseTransposeLoc, worldInverseTransposeMat);
			gl.uniform4fv(u_lightColorLoc, lightColor);
			gl.uniform4fv(u_ambientLoc, ambientColor);
			gl.uniform1i(u_diffuseLoc, diffuseTextureUnit);
			gl.uniform4fv(u_specularLoc, specularColor);
			gl.uniform1f(u_shininessLoc, shininess);
			gl.uniform1f(u_specularFactorLoc, specularFactor);
			
			gl.drawArrays(TRIANGLES);
			gl.bindVertexArray(null);
		};
	}

	// -- lod interface --
	this.lod_up = function(){lod = Math.min(sdcnt, lod+1);console.log(lod);};
	this.lod_down = function(){lod = Math.max(0, lod-1);console.log(lod);};

	// -- camera prototype --
	let cproto = function(args){
		// initialize this object
		args.prn && (this.parent_node = args.prn) && this.parent_node.add_child(this);
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



		// this.attach_visible_object = function(object){
		// 	visible_objects.push(object);
		// };

		// this.attach_light = function(light){
		// 	lights.push(light);
		// };
	}
	
	cproto.prototype.is_camera_node = true;
	cproto.prototype.get_transform = function(){
		return this.parent_node.get_transform();
	};
	cproto.prototype.get_local_transform = function(){
		return [1.0, 0.0,0.0,0.0,
		0.0,1.0,0.0,0.0,
		0.0,0.0,1.0,0.0,
		0.0,0.0,0.0,1.0];
	};

	//*/
	// set this objects prototype
	// cproto.prototype = Object.create(trajectory_manager.generate_proto.prototype);

	cproto.prototype.render = function(){
		if(this.parent_node.get_transform()[15] == -1) // found my parent marked for removal
		{
			// ----- camera panic -----
			// called when I find my parent marked for removal during rendering
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

		let t = this.get_transform();
		let p = this.projection;

		//TODO: cull objects outside of view
		// ! 23-03-03 render needs access to parent
		this.scene_head.children.forEach(function(ch){
			ch.is_model_node && ch.draw(lod, t, p)
			// ch.is_model_node && ch._mdata.render(0)
		});

		/*
		// draw lines
		// NOTE: render AFTER everything else
		// TODO: depth buffer handling
		// TODO: add copy and decay

		// gl.useProgram(line_program);
		gl.uniformMatrix4fv(color_program.rtMatrix, false, reverse_transform);
		gl.uniformMatrix4fv(color_program.vpMatrix, false, this.projection);
		this._line_buffer.forEach(function(l){
			// gl.uniformMatrix4fv(color_program.mvMatrix, false, mat4.create());
			gl.uniform3fv(color_program.position, l.pos);
			gl.uniform4fv(color_program.orientation, l.orn);
			gl.bindBuffer(gl.ARRAY_BUFFER, l);
			gl.vertexAttribPointer(color_program.vertex, 3, gl.FLOAT, false, 0, 0);
			gl.bindBuffer(gl.ARRAY_BUFFER, l.colors);
			gl.vertexAttribPointer(color_program.color, 4, gl.FLOAT, false, 0, 0);
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

	// main frame call
	// TODO: start only after all is ready
	function draw_scene(){
		// return
		// console.log("rendering");
		window.requestAnimFrame(draw_scene, gl_canvas);
		// if(!color_program.ready){
		// 	gl.flush(); return; }

		scene_manager.render();

		// end scene
		gl.flush();

		// move things
		let d = new Date();
		let new_ms = d.getMilliseconds();
		trajectory_manager.cycle(1000*(new_ms < old_ms) + new_ms - old_ms);
		old_ms = new_ms;
	}

}();




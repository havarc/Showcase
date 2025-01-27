"use strict";
/** @type {WebGLRenderingContext} */
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
	let gl2d;
	// let color_program;
	// let texture_program;
	// let billboard_program;
	// let particle_program;
	// let line_program;
	// let obj_program;
	// let arrow_program
	// let stars_program;
	let old_ms = 0;
	let sdcnt = 3;
	let lod = 0; // current level of detail
	// dummy texture, always available
	// let whitePixel = gl.createTexture();
	// gl.bindTexture(gl.TEXTURE_2D, whitePixel);
	// gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));	
	// gl.bindTexture(gl.TEXTURE_2D, null);
	let draw_stars;

	let fb;
	let fb_size = 256;
	let fb_tex;
	let fb_depth;
	let dBillboard;


	this.init = async function(){
		console.log("init grafx");
		gl_canvas = document.getElementById('local-canvas');
		// load up webgl
		gl = WebGLUtils.setupWebGL(gl_canvas);
		if (!gl) {alert("Can't get WebGL"); return;}
		console.log(gl2d);

		this.white_pixel = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.whitePixel);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));	
		gl.bindTexture(gl.TEXTURE_2D, null);

		// depth buffer experiment
		fb_tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, fb_tex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
			fb_size, fb_size, 0,
			gl.RGBA, gl.UNSIGNED_BYTE, null);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			
			

		fb_depth = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, fb_depth);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24,
			fb_size, fb_size, 0,
			gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			
				
		fb = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
		// attach the texture and depth map
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fb_tex, 0);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, fb_depth, 0);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		// dBillboard = this.generate_billboard_render_function(fb_tex);
		// dBillboard = this.generate_billboard_render_function(texture_manager.load_texture("Plushy.jpg"));

		// end depth buffer experiment


		let shaders = [
			'texture',
			'billboard',
			'particles',
			'obj',
			'arrow',
			'stars',
			'depth'
		]

		let pstack = [];
		// load all shaders
		shaders.forEach((s)=>{
			pstack.push(Promise.all(shader_manager.request_shader(s).pstack));
		})

		// wait for the shaders to load and compile, otherwise not-hilarious chaos ensues!
		return await Promise.all(pstack).then((val) => {

			draw_stars = get_draw_stars();

			// dBillboard = this.generate_billboard_render_function(this.whitePixel);
			// settings
			gl.clearColor(0.0, 0.0, 0.0, 1.0);
			gl.enable(gl.DEPTH_TEST);
			// gl.blendFunc(gl.ONE, gl.ONE)
			// gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
			gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
			gl.enable(gl.BLEND);
			// gl.enable(gl.ALPHA_TEST);
			// gl.enable(gl.CULL_FACE);
			// gl.cullFace(gl.BACK);
			draw_scene();
			return;
		})
	};

	this.get_billboard = function(){
		return this.generate_billboard_render_function(fb_depth, 2);
		// return this.generate_billboard_render_function(texture_manager.load_texture("Plushy.jpg"));
	}

	this.get_gl = function(){return gl;};

	// this.whitePixel = whitePixel;

	this.resize_canvas = function(){
		let width = gl_canvas.width = gl_canvas.clientWidth;
		let height = gl_canvas.height = gl_canvas.clientHeight;
		scene_manager.change_viewport(width, height);
	};

	// generates a texture buffer for the texture-manager to manage
	this.create_texture_buffer = function(src){
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
	
	// this.default_texture = function(){}

	// model_node can call this to get buffers for their data
	// returns the render-function for colored or textured meshes
	// TODO: program defined my model/given data
	this.generate_render_function = function(mesh){
		if(!mesh.triangle_index){
			return () => {};
		}

		let texture = mesh.texture;

		if(!texture)texture = this.white_pixel
		program = shader_manager.request_shader('texture');

		// create the Vertex Array Object
		let vao = gl.createVertexArray();
		gl.bindVertexArray(vao);

		let vertex_buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
		gl.bufferData(gl.ARRAY_BUFFER, mesh.vertex_data, gl.STATIC_DRAW);
		gl.enableVertexAttribArray(program.vertex);
		gl.vertexAttribPointer(program.vertex_data, 3, gl.FLOAT, false, 0, 0);

		// check if the data is used in the shader
		if(Number.isInteger(program.normal_data)){
			let normal_buffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, normal_buffer);
			gl.bufferData(gl.ARRAY_BUFFER, mesh.normal_data, gl.STATIC_DRAW);
			gl.enableVertexAttribArray(program.normal_data);
			gl.vertexAttribPointer(program.normal_data, 3, gl.FLOAT, false, 0, 0);
		}

		if(Number.isInteger(program.color_data)){
			let color_buffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
			gl.bufferData(gl.ARRAY_BUFFER, mesh.color_data, gl.STATIC_DRAW);
			gl.enableVertexAttribArray(program.color_data);
			gl.vertexAttribPointer(program.color_data, 4, gl.FLOAT, false, 0, 0);
		}

		if(Number.isInteger(program.texture_data)){
			let texture_buffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, texture_buffer);
			gl.bufferData(gl.ARRAY_BUFFER, mesh.texture_data, gl.STATIC_DRAW);
			gl.enableVertexAttribArray(program.texture_data);
			gl.vertexAttribPointer(program.texture_data, 2, gl.FLOAT, false, 0, 0);
		}

		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		gl.bindVertexArray(null);

		let lod_buffer = [];
		let lod_edge_buffer = [];
		let triangle_count = [];
		let line_count = [];

		// for(let i = 0; i <= sdcnt; i++){
		// 	lod_buffer[i] = gl.createBuffer();
		// 	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, lod_buffer[i]);
		// 	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,mesh.triangle_index[i], gl.STATIC_DRAW);
		// 	triangle_count[i] = mesh.triangle_index[i].length;

		// 	lod_edge_buffer[i] = gl.createBuffer();
		// 	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, lod_edge_buffer[i]);
		// 	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.edge_index[i], gl.STATIC_DRAW);
		// 	line_count[i] = mesh.edge_index[i].length;
		// }

		// return drawing function
		return function(transform, view, projection){
			if(!view instanceof Float32Array || !projection instanceof Float32Array){
				console.warn('view or projection matrix not Typed Array');
				return false;
			}

			gl.useProgram(program);

			if(this.billboard){
				// remove node rotation
				let dummy = new Float32Array(16);
				glMatrix.mat4.getTranslation(dummy, transform)
				transform = dummy;
				dummy = new Float32Array(16);
				glMatrix.mat4.getTranslation(dummy, view)
				view = dummy;

			}

			// load matrices
			// TODO use uniform buffer object
			gl.uniformMatrix4fv(program.rtMatrix, false, view);
			gl.uniformMatrix4fv(program.vpMatrix, false, projection);

			gl.uniformMatrix4fv(program.mvMatrix, false, transform);
			gl.uniform1f(program.scale, this.args.scale || 1);

			gl.bindVertexArray(vao);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, lod_buffer[lod]);
	
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.uniform1i(program.u_texture, 0)

			// TODO: use drawRangeElements for lod
			gl.drawElements(gl.TRIANGLES, triangle_count[lod], gl.UNSIGNED_SHORT, 0);
			gl.bindVertexArray(null);
		};
	}


	// model_node can call this to get buffers for their data
	// returns the render-function for textured billboards
	// TODO: program defined my model/given data
	this.generate_billboard_render_function = function(texture, size = 1){

		let program = shader_manager.request_shader('billboard');

		let triCorners = new Float32Array([
			-2.0, -2.0,
			2.0, -2.0,
			2.0, 2.0,
			-2.0, 2.0
		]);
		let texCoords = new Float32Array([
			0, 0,
			1, 0,
			1, 1,
			0, 1
		]);
		let triElem = new Uint8Array([
			0, 1, 2, 0, 2, 3
		])

		// create the Vertex Array Object
		let vao = gl.createVertexArray();
		gl.bindVertexArray(vao);

		let vertex_buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
		gl.bufferData(gl.ARRAY_BUFFER, triCorners, gl.STATIC_DRAW);
		gl.enableVertexAttribArray(program.vertex_data);
		gl.vertexAttribPointer(program.vertex_data, 2, gl.FLOAT, false, 0, 0);

		console.log("b");
		if(program.texture_data){
			let texture_buffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, texture_buffer);
			gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
			gl.enableVertexAttribArray(program.texture_data);
			gl.vertexAttribPointer(program.texture_data, 2, gl.FLOAT, false, 0, 0);
			console.log("t");
		}

		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		gl.bindVertexArray(null);

		let triBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, triElem, gl.STATIC_DRAW);
		let triangle_count = triElem.length;
		console.log(triangle_count, triElem);

		// return drawing function
		return function(lod = 0, view, projection){
			if(!view instanceof Float32Array || !projection instanceof Float32Array){
				console.warn('view or projection matrix not Typed Array');
				return false;
			}

			gl.useProgram(program);

			// load matrices
			// TODO use uniform buffer object
			gl.uniformMatrix4fv(program.rtMatrix, false, view);
			gl.uniformMatrix4fv(program.vpMatrix, false, projection);

			gl.uniform3fv(program.position, new Float32Array([0,0,0]));
			// gl.uniform3fv(program.position, this.parent_node.gpos);
			// gl.uniform4fv(program.orientation, this.parent_node.gorn);
			// gl.uniformMatrix4fv(program.mvMatrix, false, this.parent_node.get_transform());
			gl.uniform1f(program.size, size);

			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.uniform1i(program.u_texture, 0)

			gl.bindVertexArray(vao);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triBuffer);
	
			// TODO: use drawRangeElements for lod
			gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_BYTE, 0);
			gl.bindVertexArray(null);
		};
	}

	// model_node can call this to get buffers for their data
	// returns the render-function for textured billboards
	// TODO: program defined my model/given data
	this.generate_particle_render_function = function(texture, size = 1){

		// TODO: check for Promise
		// if(!texture || !gl.isTexture(texture)) texture = this.whitePixel
		
		let program = shader_manager.request_shader('particles');

		let triCorners = new Float32Array([
			-1.0, -1.0,
			1.0, -1.0,
			1.0, 1.0,
			-1.0, -1.0,
			1.0, 1.0,
			-1.0, 1.0
		]);
		let texCoords = new Float32Array([
			0, 0,
			1, 0,
			1, 1,
			0, 0,
			1, 1,
			0, 1
		]);

		let pOffsets = new Float32Array([
			0.0, 0.0, -1.0,
			0.0, 0.0, -2.0,
			0.0, 0.0, -3.0,
			0.0, 0.0, -4.0,
			0.0, 0.0, -5.0,
			0.0, 0.0, -6.0,
			0.0, 0.0, -7.0
		])
		let pColors = new Float32Array([
			1.0, 1.0, 0.0, 1.0,
			0.9, 0.9, 0.0, 0.9,
			0.8, 0.8, 0.0, 0.8,
			0.7, 0.7, 0.0, 0.7,
			0.6, 0.6, 0.0, 0.6,
			0.5, 0.5, 0.0, 0.5,
			0.4, 0.4, 0.0, 0.4
		])

		// create the Vertex Array Object
		let vao = gl.createVertexArray();
		gl.bindVertexArray(vao);

		let vertex_buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
		gl.bufferData(gl.ARRAY_BUFFER, triCorners, gl.STATIC_DRAW);
		gl.enableVertexAttribArray(program.vertex_data);
		gl.vertexAttribPointer(program.vertex_data, 2, gl.FLOAT, false, 0, 0);

		if(program.texture_data){
			let texture_buffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, texture_buffer);
			gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
			gl.enableVertexAttribArray(program.texture_data);
			gl.vertexAttribPointer(program.texture_data, 2, gl.FLOAT, false, 0, 0);
		}

		let offset_buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, offset_buffer);
		gl.bufferData(gl.ARRAY_BUFFER, pOffsets, gl.STATIC_DRAW);
		gl.enableVertexAttribArray(program.rel_pos);
		gl.vertexAttribPointer(program.rel_pos, 3, gl.FLOAT, false, 0, 0);
		gl.vertexAttribDivisor(program.rel_pos, 1);

		let color_buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
		gl.bufferData(gl.ARRAY_BUFFER, pColors, gl.STATIC_DRAW);
		gl.enableVertexAttribArray(program.tColor);
		gl.vertexAttribPointer(program.tColor, 4, gl.FLOAT, false, 0, 0);
		gl.vertexAttribDivisor(program.tColor, 1);

		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		gl.bindVertexArray(null);

		// let triBuffer = gl.createBuffer();
		// gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triBuffer);
		// gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, triElem, gl.STATIC_DRAW);
		// let triangle_count = triElem.length;
		// console.log(triangle_count, triElem);

		// return drawing function
		return function(lod = 0, view, projection){
			if(!view instanceof Float32Array || !projection instanceof Float32Array){
				console.warn('view or projection matrix not Typed Array');
				return false;
			}

			gl.useProgram(program);

			// load matrices
			// TODO use uniform buffer object
			gl.uniformMatrix4fv(program.rtMatrix, false, view);
			gl.uniformMatrix4fv(program.vpMatrix, false, projection);

			gl.uniform3fv(program.position, this.parent_node.gpos);
			gl.uniform4fv(program.orientation, this.parent_node.gorn);
			gl.uniformMatrix4fv(program.mvMatrix, false, this.parent_node.get_transform());
			gl.uniform1f(program.size, size);

			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.uniform1i(program.u_texture, 0)

			gl.bindVertexArray(vao);
			// gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triBuffer);
	
			// TODO: use drawRangeElements for lod
			gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, 7);
			gl.bindVertexArray(null);
		};
	}


	// draws an arrow-triangle from the currently selected unit to the target position on the plane
	this.generate_movement_indicator = (target, color = [0,1,0,1]) => {
		let program = shader_manager.request_shader('arrow');

		let colorVal = new Float32Array(color);
		console.log(colorVal);

		let vao = gl.createVertexArray();
		gl.bindVertexArray(vao);

		let vertex_buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-0.5,-0.5,0, -0.5,0.5,0   ,0.5,0,0]), gl.DYNAMIC_DRAW);
		gl.enableVertexAttribArray(program.vertex_data);
		gl.vertexAttribPointer(program.vertex_data, 3, gl.FLOAT, false, 0, 0);
		gl.bindVertexArray(null);

		// return drawing function
		return function(lod = 0, view, projection){
			if(!view instanceof Float32Array || !projection instanceof Float32Array){
				console.warn('view or projection matrix not Typed Array');
				return false;
			}

			let program = shader_manager.request_shader('arrow');

			let iView = new Float32Array(16);
			let iProjection = new Float32Array(16);
			
			glMatrix.mat4.invert(iView,view);
			glMatrix.mat4.invert(iProjection,projection);

			let mousePosX = (2.0*input.mouseX/gl_canvas.width) - 1.0;
			let mousePosY = (2.0*input.mouseY/(gl_canvas.height*(-1.0))) + 1.0;
			let vecNear = [mousePosX, mousePosY, 1.0];
			let vecFar = [mousePosX, mousePosY, -1.0];

			// reverse view from camera space
			glMatrix.vec3.transformMat4(vecNear, vecNear, iProjection);
			glMatrix.vec3.transformMat4(vecNear, vecNear, view);
			glMatrix.vec3.transformMat4(vecFar, vecFar, iProjection);
			glMatrix.vec3.transformMat4(vecFar, vecFar, view);

			let tPos = target.pos;
			let plane = tPos[1]; // Y-plane
			let pNear = Math.abs(vecNear[1]-plane);
			let pFar = Math.abs(vecFar[1]-plane);
			let pSum = pNear+pFar;
			pNear = pNear/pSum;
			pFar = pFar/pSum;

			// let pPos = [(pNear*vecNear[0])+(pFar*vecFar[0]), (pNear*vecNear[1])+(pFar*vecFar[1]), (pNear*vecNear[2])+(pFar*vecFar[2])];
			let pPos = [(vecNear[0])+(pNear*(vecFar[0]-vecNear[0])), (vecNear[1])+(pNear*(vecFar[1]-vecNear[1])), (vecNear[2])+(pNear*(vecFar[2]-vecNear[2]))];
			let dist = [pPos[0]-tPos[0], pPos[1]-tPos[1], pPos[2]-tPos[2]]; //distance/direction
			let distN = Math.sqrt((dist[0]*dist[0])+(dist[1]*dist[1])+(dist[2]*dist[2])); // distance length
			let distNorm = [dist[0]/distN, dist[1]/distN, dist[2]/distN]; // distance normalized
			let distNormInv = [distNorm[2], 0, -distNorm[0]]; // distance normalize inverted on plane

			// console.log(dist);
			// console.table([vecNear, vecFar, pNear, pFar, pPos, dist, distN]);

			// let size = target.size || 2;
			let size = 4.0;
			let corner1 = [
				tPos[0]+(distNorm[0]*size)-(distNorm[2]*size),
				tPos[1],
				tPos[2]+(distNorm[2]*size)+(distNorm[0]*size)
			]
			let corner2 = [
				tPos[0]+(distNorm[0]*size)+(distNorm[2]*size),
				tPos[1],
				tPos[2]+(distNorm[2]*size)-(distNorm[0]*size)
			]
			let corner3 = [
				pPos[0],
				pPos[1],
				pPos[2]
			]

			glMatrix.vec3.transformMat4(corner1, corner1, iView);
			glMatrix.vec3.transformMat4(corner1, corner1, projection);
			glMatrix.vec3.transformMat4(corner2, corner2, iView);
			glMatrix.vec3.transformMat4(corner2, corner2, projection);
			glMatrix.vec3.transformMat4(corner3, corner3, iView);
			glMatrix.vec3.transformMat4(corner3, corner3, projection);

			let tTri = new Float32Array([
				corner1[0], corner1[1], corner1[2],
				corner2[0], corner2[1], corner2[2],
				// mousePosX, mousePosY, 0.0
				corner3[0], corner3[1], corner3[2],
			])
	
			gl.useProgram(program);

			// load matrices
			// TODO use uniform buffer object
			gl.uniform4fv(program.u_color, colorVal);

			gl.bindVertexArray(vao);

			gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
			gl.bufferSubData(gl.ARRAY_BUFFER, 0, tTri);
			gl.enableVertexAttribArray(program.vertex_data);
			gl.vertexAttribPointer(program.vertex_data, 3, gl.FLOAT, false, 0, 0);
	
			// TODO: use drawRangeElements for lod
			gl.drawArrays(gl.TRIANGLES, 0, 3);
		};
	}

	// returns the render-function for obj-files
	this.generate_obj_render_function = function(mesh, mat){
		// for some reason, the materials are given in as Promise
		// and we have to fetch them from the mat_man by name
		// console.log(materials);
		// console.log(mesh, materials);

		let obj_program = shader_manager.request_shader('obj');

		// let mat = material_manager.load_material(materials[0].name);
		// await mat;
		// mat = material_manager.load_material(materials[0].name);
		// const mat = material_manager.load_material(materials[0].name);
		console.log(mesh, mat);
		let parts = [];

		// for(let m of mesh){
		for (const m of mesh){
			if(0 == m.data.position.length){
				console.warn("skipping");
				continue;
			}
			// console.log(m.data.position);
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
			vao.mat = mat.get(m.material) || material_manager.default_material;
			console.log(vao.mat.ambient);
			parts.push(vao);
		// }
		}
		console.log(parts);


		// return drawing function
		return function(transform, cam_transform, projection, args = {}){

			gl.useProgram(obj_program);
			// console.log(this.parent_node.gpos, this.parent_node.gorn);

			// load matrices
			// TODO use uniform buffer object
			// camera
			gl.uniformMatrix4fv(obj_program.rtMatrix, false, cam_transform);
			gl.uniformMatrix4fv(obj_program.vpMatrix, false, projection);
			// gl.uniform1f(obj_program.scale, 1);
			// gl.uniform1f(obj_program.scale, this && this.args && this.args.scale || 1);

			gl.uniform3fv(obj_program.scale, new Float32Array(args.scale || [1, 1, 1]));

			// object to draw
			gl.uniformMatrix4fv(obj_program.transform, false, transform);
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
		return function(lod = 0, view, projection){
			var defaultmatrix = [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
			// At init or draw time depending on use.
			var someWorldViewProjectionMat = projection;
			var lightWorldPos              = [100, 200, 300];
			var worldMat                   = view;
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


	// model_node can call this to get buffers for their data
	// returns the render-function for textured billboards
	// TODO: program defined my model/given data
	let get_draw_stars = function(){
		let program = shader_manager.request_shader('stars');

		let triCorners = new Float32Array([
			-1.0, -1.0,
			1.0, -1.0,
			1.0, 1.0,
			-1.0, 1.0
		]);
		let texCoords = new Float32Array([
			0, 0,
			1, 0,
			1, 1,
			0, 1
		]);
		let triElem = new Uint8Array([
			0, 1, 2, 0, 2, 3
		])

		// create the Vertex Array Object
		let vao = gl.createVertexArray();
		gl.bindVertexArray(vao);

		let vertex_buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
		gl.bufferData(gl.ARRAY_BUFFER, triCorners, gl.STATIC_DRAW);
		gl.enableVertexAttribArray(program.vertex_data);
		gl.vertexAttribPointer(program.vertex_data, 2, gl.FLOAT, false, 0, 0);

		if(program.texture_data){
			let texture_buffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, texture_buffer);
			gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
			gl.enableVertexAttribArray(program.texture_data);
			gl.vertexAttribPointer(program.texture_data, 2, gl.FLOAT, false, 0, 0);
		}

		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		gl.bindVertexArray(null);

		let triBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, triElem, gl.STATIC_DRAW);
		let triangle_count = triElem.length;
		// console.log(triangle_count, triElem);

		// return drawing function
		return function(view, projection){
			if(!view instanceof Float32Array || !projection instanceof Float32Array){
				console.warn('view or projection matrix not Typed Array');
				return false;
			}
			// console.log("drawing stars");
			// make sure they're always the background!
			gl.depthMask(false);

			gl.useProgram(program);

			// load matrices
			// TODO use uniform buffer object
			gl.uniform2fv(program.iResolution, new Float32Array([ gl_canvas.clientWidth, gl_canvas.clientHeight]));
			gl.uniformMatrix4fv(program.cameraPos, false, view);
			gl.bindVertexArray(vao);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triBuffer);
	
			// TODO: use drawRangeElements for lod
			gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_BYTE, 0);
			gl.bindVertexArray(null);
		};
	};

	// -- lod interface --
	this.lod_up = function(){lod = Math.min(sdcnt, lod+1);console.log(lod);};
	this.lod_down = function(){lod = Math.max(0, lod-1);console.log(lod);};

	function lookAt(dir, up){
		// Vector3f toVector = (destPoint - sourcePoint).normalized();

		// //compute rotation axis
		// Vector3f rotAxis = front.cross(toVector).normalized();
		// if (rotAxis.squaredNorm() == 0)
		// 	rotAxis = up;
	
		// //find the angle around rotation axis
		// float dot = VectorMath::front().dot(toVector);
		// float ang = std::acosf(dot);
	
		// //convert axis angle to quaternion
		// return Eigen::AngleAxisf(rotAxis, ang);
	}

	// -- camera prototype --
	let cproto = function(args){
		if(!args || !args.prn) {return {draw: ()=>{}};}
		if(!args.frame || !Array.isArray(args.frame)) {args.frame = [0,0,1,1];}
		args.frame[0] = Math.max(args.frame[0], 0);
		args.frame[1] = Math.max(args.frame[1], 0);
		args.frame[2] = Math.min(args.frame[2], 1);
		args.frame[3] = Math.min(args.frame[3], 1);
		this.args = args;
		// initialize this object
		args.prn && (this.parent_node = args.prn) && this.parent_node.add_child(this);
		this.scene_head = args.scene_head || {};
		this.target = args.target || {};
		this.up = args.up || [0,1,0];

		this.parameters = {FOV: 60, width: 400, height: 200}; // default if not provided
		this.fb_projection = glMatrix.mat4.create(); // separate mat for framebuffer render
		this.projection = glMatrix.mat4.create();
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

		// var visible_objects = []; // list of objects to render, acquired by child.prepare
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
		let t = this.parent_node.get_transform();
		if(this.target && typeof this.target.get_transform === 'function'){
			// console.log(c, this.parent_node.pos, this.target.pos, [0,1,0]);
			glMatrix.mat4.lookAt(t, this.parent_node.position, this.target.position, [0,1,0]);
			glMatrix.mat4.invert(t, t) // invert the combined for reverse view
			// glMatrix.mat4.translate(t, t, this.parent_node.pos);
			// c = this.target.get_transform();
			// glMatrix.mat4.invert(c, t) // invert the combined for reverse view
		}
		return t;

		return this.parent_node.get_transform();
	};
	cproto.prototype.get_local_transform = function(){
		return glMatrix.mat4.identity();
		// return [1.0, 0.0,0.0,0.0,
		// 0.0,1.0,0.0,0.0,
		// 0.0,0.0,1.0,0.0,
		// 0.0,0.0,0.0,1.0];
	};

	//*/
	// set this objects prototype
	// cproto.prototype = Object.create(trajectory_manager.generate_proto.prototype);

	let logged = false;
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
			// get another view
			this.get_transform()[15] = 0; // reset fail bit
			return this.get_transform(); // update view
			// TODO: keep or delete camera
		}

		let obj_program = shader_manager.request_shader('obj');
		let stars_program = shader_manager.request_shader('stars');
		if(!obj_program.ready || !stars_program.ready)return;
		let c = this.get_transform();
		let p = this.projection;


		/*
		//* draw to framebuffer
		// render to our targetTexture by binding the framebuffer
		gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
		gl.depthMask(true);
		// render cube with our 3x2 texture
		// gl.bindTexture(gl.TEXTURE_2D, fb_tex);
		// Tell WebGL how to convert from clip space to pixels
		gl.viewport(0, 0, fb_size, fb_size);
		// Clear the canvas AND the depth buffer.
		gl.clearColor(1, 1, 1, 1);   // clear to blue
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		// gl.clear(gl.COLOR_BUFFER_BIT);
		// p = this.fb_projection;
		// this.scene_head.children.forEach(function(ch){
		// 	ch.is_model_node && ch.visible && ch.draw(ch.get_transform(), c, p, ch.args)
		// });
		// this.ghost && this.ghost.draw(this.ghost.get_transform(), c, p, this.ghost.args);
		//*/


		//* draw to the canvas
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		// Tell WebGL how to convert from clip space to pixels
		let frame = this.args.frame;
		gl.viewport(frame[0]*gl.canvas.width, frame[1]*gl.canvas.height, frame[2]*gl.canvas.width, frame[3]*gl.canvas.height);
		// gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
		// Clear the canvas AND the depth buffer.
		// gl.clearColor(0, 0, 0, 1);   // clear to white
		// gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		gl.depthMask(false);
		if(this.draw_stars) draw_stars(c);

		
		// ---- render solid objects ----
		//TODO: cull objects outside of view
		// ! 23-03-03 render needs access to parent
		// gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		// gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
		// gl.enable(gl.DEPTH_TEST);
		gl.depthMask(true);
		this.scene_head.children.forEach(function(ch){
			ch.is_model_node && ch.visible && ch.draw(ch.parent_node.get_transform(), c, p, ch.args)
			// console.log(ch, ch.args);
			// ch.is_model_node && ch._mdata.render(0)
		});


		// ---- render particles ----
		// gl.blendFunc(gl.ONE, gl.ONE);
		// gl.disable(gl.DEPTH_TEST);
		gl.depthMask(false);
		this.scene_head.children.forEach(function(ch){
			ch.is_particle_node && ch.visible && ch.draw(ch.parent_node.get_transform(), c, p, ch.args)
			// ch.is_model_node && ch._mdata.render(0)
		});

		// dBillboard(lod, c, p)

		

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
			gl.uniform3fv(color_program.position, l.gpos);
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
	// TODO: each line vertex has coordinates AND its own view
	// -view from physical object, moving or stationary
	// -view from virtual objects, destinations, docks etc
	// -reverse reverse cam view for screen space positioning
	let nullmat = new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);

	cproto.prototype.create_lines = function(ldata, lcolors, args){
		// manual transforms or trajectory copys
		args = args || {};
		let view = args.view || nullmat;
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
		let frame = this.args.frame || [0,0,1,1];
		this.parameters.FOV = proj_params.FOV || this.parameters.FOV;
		this.parameters.width = proj_params.width || this.parameters.width;
		this.parameters.height = proj_params.height || this.parameters.height;
		// mat4.perspective(projection, parameters.FOV/180*Math.PI, parameters.width/parameters.height, 0.1, 100);
		console.log(frame);
		set_perspective(60, ((frame[2])*this.parameters.width)/((frame[3])*this.parameters.height), 0.1, 1000, this.projection);
		// set_perspective(60, this.parameters.width/this.parameters.height, 0.1, 1000, this.projection);
		set_perspective(60, 1, 0.1, 1000, this.fb_projection);
		console.log(this.projection, this.fb_projection);

		function set_perspective(FOV, ratio,c,d,e){
			let a=c*Math.tan(FOV*Math.PI/360);
			let b=a*ratio;
			return set_frustum(-b,b,-a,a,c,d,e);
		}
		function set_frustum(a,b,c,d,e,g,f){
			f=f||glMatrix.mat4.create();
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

	cproto.prototype.get_position_on_screen = function(obj){
		if(!obj || !obj.get_transform){return null};
		let tVec = new Float32Array(obj.position);
		// let tVec = new Float32Array([tpos[0], tpos[1], tpos[2], 1.0])
		// let tVec = new Float32Array(3);


		let c = this.get_transform();
		// let t;
		// if(this.target && typeof this.target.get_transform === 'function'){
		// 	t = this.target.get_transform();
		// } else {
		// 	t = new Float32Array(16);
		// 	mat4.identity(t);
		// 	console.log("blank target");
		// }
		let f1 = new Float32Array(16);
		let f2 = new Float32Array(16);
		
		// mat4.multiply(f1, c, t) // combine camera and target matrix
		glMatrix.mat4.invert(f1,c ) // invert the combined for reverse view
		let p = this.projection;

		glMatrix.vec3.transformMat4(tVec, tVec, f1);
		glMatrix.vec3.transformMat4(tVec, tVec, p);
		tVec = [tVec[0], tVec[1]];

		let frame = this.args.frame;
		// translate to canvas
		tVec[0] = (tVec[0]+1)/2 * gl_canvas.width;
		tVec[1] = (-tVec[1]+1)/2 * gl_canvas.height;
		//translate to viewport;
		tVec[0] = frame[2]*tVec[0]+(frame[0]*gl_canvas.width);
		tVec[1] = frame[3]*tVec[1]+(frame[1]*gl_canvas.height);

		return tVec;
	}

	cproto.prototype.get_point_on_plane = function(axis){

		let p;
		switch(axis){
			case "X", 0: p = 0;
			case "Z", 2: p = 2;
			default: p = 1;
		}

		let iProjection = new Float32Array(16);
		
		let view = this.get_transform();
		glMatrix.mat4.invert(iProjection,this.projection);

		let mousePosX = (2.0*input.mouseX/gl_canvas.width) - 1.0;
		let mousePosY = (2.0*input.mouseY/(gl_canvas.height*(-1.0))) + 1.0;
		let vecNear = [mousePosX, mousePosY, 1.0];
		let vecFar = [mousePosX, mousePosY, -1.0];

		// reverse view from camera space
		glMatrix.vec3.transformMat4(vecNear, vecNear, iProjection);
		glMatrix.vec3.transformMat4(vecNear, vecNear, view);
		glMatrix.vec3.transformMat4(vecFar, vecFar, iProjection);
		glMatrix.vec3.transformMat4(vecFar, vecFar, view);

		let plane = 0.0; // Y-plane
		let pNear = Math.abs(vecNear[p]-plane);
		let pFar = Math.abs(vecFar[p]-plane);
		let pSum = pNear+pFar;
		pNear = pNear/pSum;
		pFar = pFar/pSum;

		// let pPos = [(pNear*vecNear[0])+(pFar*vecFar[0]), (pNear*vecNear[1])+(pFar*vecFar[1]), (pNear*vecNear[2])+(pFar*vecFar[2])];
		let pPos = [(vecNear[0])+(pNear*(vecFar[0]-vecNear[0])), (vecNear[1])+(pNear*(vecFar[1]-vecNear[1])), (vecNear[2])+(pNear*(vecFar[2]-vecNear[2]))];

		return pPos;
	}

	// cproto.prototype.get_transform = trajectory_manager.cam_transform;
	cproto.prototype.delete = function(){
		// TODO remove me from scene_head.cameras using filter
	}

	// export
	this.generate_proto = cproto;

	// main frame call
	// TODO: start only after all is ready
	function draw_scene(){
		window.requestAnimFrame(draw_scene, gl_canvas);

		// move things
		let d = new Date();
		let new_ms = d.getMilliseconds();

		trajectory_manager.cycle(1000*(new_ms < old_ms) + new_ms - old_ms);

		scene_manager.render();

		// end scene
		gl.flush();
		old_ms = new_ms;
	}

}();




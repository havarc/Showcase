
// error margins for calculations
function EPSILON(value){
	return isNaN(value) || 0.0000001 > Math.abs(value);
}

// model resources
const model_manager = new function(){
	// -- setup --
	"use strict";
	let model_buffer = new Map(); // stored models
	let requests = new Map();
	// TODO: keep track of references and remove unused models

	let sdcnt = 2; // subdivision count
	let lod = 0; // current level of detail

	// let rg = new Randy(3812951);

	let subdivide = new Worker('js/subdivide-worker.js');


	// TODO: filter for unused vertex data
	// -- generate edges for wireframe --
	function generate_edges(data){
		let edge_index_cache = [];
		for(let i = 0; i<data.triangle_index.length;){
			let v0 = data.triangle_index[i++];
			let v1 = data.triangle_index[i++];
			let v2 = data.triangle_index[i++];
			let e0 = [v1,v2], b0 = 0;
			let e1 = [v2,v0], b1 = 0;
			let e2 = [v0,v1], b2 = 0;

			// ERROR: for some reason forEach kills any booleans changed inside
			// that's why we use integers

			edge_index_cache.forEach(function(elem){
				// console.log(e0, e1, e2, elem);
				b0 += elem[0] == e0[0] && elem[1] == e0[1] || elem[0] == e0[1] && elem[1] == e0[0];
				b1 += elem[0] == e1[0] && elem[1] == e1[1] || elem[0] == e1[1] && elem[1] == e1[0];
				b2 += elem[0] == e2[0] && elem[1] == e2[1] || elem[0] == e2[1] && elem[1] == e2[0];
				// console.log(b2);
			});
			// console.log("edge sort", b0, b1, b2);
			console.log("edges", e0, e1, e2);

			b0?true:edge_index_cache.push(e0);
			b1?true:edge_index_cache.push(e1);
			b2?true:edge_index_cache.push(e2);
		}
		edge_index_cache = edge_index_cache.flat();

		console.log(edge_index_cache);
		data.edge_index = edge_index_cache;
	}



	// -- private function for loading a model resource --
	// TODO: there's a shortcut to this
	function load_model(name){
		if(!name || name.length < 4) return null;
		var mdata = model_buffer.get(name);
		if(mdata){return mdata;}
		mdata = {};
		mdata.name = name;
		model_buffer.set(name, mdata);
		
		fetch(new Request(`models/${name}.json`))
			.then(response => response.json())
			.then(model_received);

		// model_buffer.set(name + '_normals', mdata_n);
		// requests.delete(name + '_normals')
		// requests.delete(name);
		return mdata;

		// private callback when the model is received
		async function model_received(response){
			console.log(name);
			mdata.lod_buffer = [];
			mdata.lod_edge_buffer = [];
			mdata.triangle_count = [0,0];
			mdata.line_count = [0,0];

			// if(settings.generate_model_normals){
			// 	mdata_n.triangle_count = [0,0];
			// 	mdata_n.line_count = [0,0];
			// }

			// normalize normals just in case
			for (let j = 0; j < response.normal_data.length / 3; j++) {
				let vx = response.normal_data[j*3+0];
				let vy = response.normal_data[j*3+1];
				let vz = response.normal_data[j*3+2];
				let vd = Math.sqrt(vx*vx+vy*vy+vz*vz);
				response.normal_data[j*3+0] /= vd;
				response.normal_data[j*3+1] /= vd;
				response.normal_data[j*3+2] /= vd;
			}
			generate_edges(response);
			// TODO error handling
			response.sdcnt = sdcnt;
			console.log(response);
			subdivide.postMessage(response);

			// * Vertex Data
			// create vertex based buffersn(mdata.normal_buffer);
			mdata.normal_buffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, mdata.normal_buffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(response.normal_data), gl.STATIC_DRAW);

			mdata.color_buffer && gl.deleteBuffer(mdata.color_buffer);
			mdata.color_buffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, mdata.color_buffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(response.color_data), gl.STATIC_DRAW);
			gl.bindBuffer(gl.ARRAY_BUFFER, null);

			// -- create dummy lod-data until subdivide is done --
			let lod_dummy = gl.createBuffer();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, lod_dummy);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(response.triangle_index), gl.STATIC_DRAW);
			let lod_length = response.triangle_index.length

			let edge_dummy = gl.createBuffer();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, edge_dummy);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(response.edge_index), gl.STATIC_DRAW);
			let edge_length = response.edge_index.length

			for(let i = 0; i <= sdcnt; i++){
				mdata.lod_buffer[i] = lod_dummy;
				mdata.triangle_count[i] = lod_length;
				mdata.lod_edge_buffer[i] = edge_dummy;
				mdata.line_count[i] = edge_length;

				// mdata_n.triangle_count[i] = 0;
				// normals are reused
				// mdata_n.line_count[i] = response.vertex_data.length/3*2;
			}
			/* editor only
			/* -- normal render data --
			let c = response.vertex_data.length/3;
			response.normal_render_data = [];
			response.normal_color_data = [];
			// response.normal_index = [];
			for(let j = 0; j<c; j++)
			{
				response.normal_render_data[j*6+0] = response.vertex_data[j*3+0];
				response.normal_render_data[j*6+1] = response.vertex_data[j*3+1];
				response.normal_render_data[j*6+2] = response.vertex_data[j*3+2];
				response.normal_render_data[j*6+3] = response.vertex_data[j*3+0] + response.normal_data[j*3+0];
				response.normal_render_data[j*6+4] = response.vertex_data[j*3+1] + response.normal_data[j*3+1];
				response.normal_render_data[j*6+5] = response.vertex_data[j*3+2] + response.normal_data[j*3+2];
				response.normal_color_data.push(0.5, 0.5, 0.5, 1.0);
				response.normal_color_data.push(0.5, 0.5, 0.5, 1.0);
				// response.normal_index[j*2+0] = j*2+0;
				// response.normal_index[j*2+1] = j*2+1;
			}
			//*/
			if(settings.generate_model_normals){
				mdata_n.vertex_buffer && gl.deleteBuffer(mdata_n.vertex_buffer);
				mdata_n.vertex_buffer = gl.createBuffer();
				gl.bindBuffer(gl.ARRAY_BUFFER, mdata_n.vertex_buffer);
				gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(response.normal_render_data), gl.STATIC_DRAW);

				mdata_n.color_buffer && gl.deleteBuffer(mdata_n.color_buffer);
				mdata_n.color_buffer = gl.createBuffer();
				gl.bindBuffer(gl.ARRAY_BUFFER, mdata_n.color_buffer);
				gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(response.normal_color_data), gl.STATIC_DRAW);

				// mdata_n.index_buffer && gl.deleteBuffer(mdata_n.index_buffer);
				// mdata_n.index_buffer = gl.createBuffer();
				// gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mdata_n.index_buffer);
				// gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(response.normal_index), gl.STATIC_DRAW);

			}
			//*/

		}
	};

	// subdivide webworker done working
	subdivide.onmessage = function(e){
		let response = e.data;
		let mdata = model_buffer.get(response.name);
		console.log(response);
		console.log("subdivider finished "+response.name);
		
		// create vertex based buffers
		// all lods can read from the same sequence
		// thus the same buffer can be used
		mdata.vertex_buffer && gl.deleteBuffer(mdata.vertex_buffer);
		mdata.vertex_buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, mdata.vertex_buffer);
		gl.bufferData(gl.ARRAY_BUFFER, response.vertex_data, gl.STATIC_DRAW);
		mdata.vertex_count = response.vertex_data.length/3;
		
		mdata.normal_buffer && gl.deleteBuffer(mdata.normal_buffer);
		mdata.normal_buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, mdata.normal_buffer);
		gl.bufferData(gl.ARRAY_BUFFER, response.normal_data, gl.STATIC_DRAW);
		
		mdata.color_buffer && gl.deleteBuffer(mdata.color_buffer);
		mdata.color_buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, mdata.color_buffer);
		gl.bufferData(gl.ARRAY_BUFFER, response.color_data, gl.STATIC_DRAW);

		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		gl.bindVertexArray(null);

		for(let i = 0; i <= sdcnt; i++){
			// if(i)	response = subdivide(response, i);
			// create subsequent lod
			mdata.lod_buffer[i] && gl.deleteBuffer(mdata.lod_buffer[i]);
			mdata.lod_buffer[i] = gl.createBuffer();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mdata.lod_buffer[i]);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,response.triangle_index[i], gl.STATIC_DRAW);
			mdata.triangle_count[i] = response.triangle_index[i].length;

			mdata.lod_edge_buffer[i] && gl.deleteBuffer(mdata.lod_edge_buffer[i]);
			mdata.lod_edge_buffer[i] = gl.createBuffer();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mdata.lod_edge_buffer[i]);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, response.edge_index[i], gl.STATIC_DRAW);
			mdata.line_count[i] = response.edge_index[i].length;

			// mdata_n.triangle_count[i] = 0;
			// normals are reused
			// mdata_n.line_count[i] = response.vertex_data.length/3*2;
		}

		mdata.trivao = [];
		for(let i = 0; i <= sdcnt; i++){
			// create the Vertex Array Object
			let vao = gl.createVertexArray();
			gl.bindVertexArray(vao);

			gl.enableVertexAttribArray(main_program.vertex);
			gl.bindBuffer(gl.ARRAY_BUFFER, mdata.vertex_buffer);
			gl.vertexAttribPointer(main_program.vertex, 3, gl.FLOAT, false, 0, 0);

			if(Number.isInteger(main_program.normal)){
				gl.enableVertexAttribArray(main_program.normal);
				gl.bindBuffer(gl.ARRAY_BUFFER, mdata.normal_buffer);
				gl.vertexAttribPointer(main_program.normal, 3, gl.FLOAT, false, 0, 0);
			}

			if(Number.isInteger(main_program.color)){
				gl.enableVertexAttribArray(main_program.color);
				gl.bindBuffer(gl.ARRAY_BUFFER, mdata.color_buffer);
				gl.vertexAttribPointer(main_program.color, 4, gl.FLOAT, false, 0, 0);
			}

			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mdata.lod_buffer[lod]);

			mdata.trivao[i] = vao;
			gl.bindVertexArray(null);
		}
		mdata.ready = true;
		console.log(mdata);
		
	}

	// -- lod interface --
	this.lod_up = function(){lod = Math.min(sdcnt, lod+1);console.log(lod);};
	this.lod_down = function(){lod = Math.max(0, lod-1);console.log(lod);};

	// -- model_node prototype export --
	let mproto = function(args){
		trajectory_manager.generate_proto.call(this, args);
		// this._mdata = model_buffer.get(args.mdl) || load_model(args.mdl).then(data=>{this._mdata=data});
		// this._mdata = model_buffer.get(args.mdl) || load_model(args.mdl);
		this._mdata = load_model(args.mdl);
	}

	mproto.prototype = Object.create(trajectory_manager.generate_proto.prototype)

	mproto.prototype.reload = function(){
		load_model(this._mdata.name).then(data=>{this._mdata=data});
	}

	// rendering section
	// ! Model needs to ask the scene head for the currently active camera
	// ! then apply its own Vertex Array Object
	// ! then apply camera settings
	// todo adjust lod in VAO when hitting the function

	mproto.prototype.draw_triangles = function(){
		if (this._mdata.ready){
			gl.bindVertexArray(this._mdata.trivao[lod]);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._mdata.lod_buffer[lod]);

			// gl.bindBuffer(gl.ARRAY_BUFFER, this._mdata.vertex_buffer);
			// gl.vertexAttribPointer(main_program.vertex, 3, gl.FLOAT, false, 0, 0);
	
			// gl.bindBuffer(gl.ARRAY_BUFFER, this._mdata.normal_buffer);
			// gl.vertexAttribPointer(main_program.normal, 3, gl.FLOAT, false, 0, 0);
	
			// gl.bindBuffer(gl.ARRAY_BUFFER, this._mdata.color_buffer);
			// gl.vertexAttribPointer(main_program.color, 4, gl.FLOAT, false, 0, 0);
	
			// gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._mdata.lod_buffer[lod]);
	

			gl.uniform3fv(main_program.position, this.gpos);
			gl.uniform4fv(main_program.orientation, this.gorn);
			gl.uniformMatrix4fv(main_program.mvMatrix, false, this.get_transform());
			// console.log(this.get_transform())

			// TODO: use drawRangeElements for lod
			gl.drawElements(gl.TRIANGLES, this._mdata.triangle_count[lod], gl.UNSIGNED_SHORT, 0);
			gl.bindVertexArray(null);
		}
		else{
			return
		}
	}

	mproto.prototype.draw_wireframe = function(){
		gl.bindBuffer(gl.ARRAY_BUFFER, this._mdata.vertex_buffer);
		gl.vertexAttribPointer(main_program.vertex, 3, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, this._mdata.color_buffer);
		gl.vertexAttribPointer(main_program.color, 4, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._mdata.lod_edge_buffer[lod]);

		gl.uniform3fv(main_program.position, this.gpos);
		gl.uniform4fv(main_program.orientation, this.gorn);

		gl.drawElements(gl.LINES, this._mdata.line_count[lod], gl.UNSIGNED_SHORT, 0);
		// TODO: use drawRangeElements for lod
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
	}

	mproto.prototype.draw_lines = function(){
		gl.bindBuffer(gl.ARRAY_BUFFER, this._mdata_n.vertex_buffer);
		gl.vertexAttribPointer(main_program.vertex, 3, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, this._mdata_n.color_buffer);
		gl.vertexAttribPointer(main_program.color, 4, gl.FLOAT, false, 0, 0);

		// gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._mdata_n.index_buffer);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

		gl.uniform3fv(main_program.position, this.gpos);
		gl.uniform4fv(main_program.orientation, this.gorn);

		gl.drawArrays(gl.LINES, 0, this._mdata_n.count[lod]);
		// gl.drawElements(gl.LINES, this._mdata_n.count[lod], gl.UNSIGNED_SHORT, 0);
		// TODO: use drawRangeElements for lod
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
	}

	// mproto.prototype.draw = mproto.prototype.draw_wireframe;
	mproto.prototype.draw = mproto.prototype.draw_triangles;

	this.generate_proto = mproto;

	// -- maintenance --
	this.report = function(){
		console.log(model_buffer);
	}

	this.cleanup = function(){
		model_buffer = new Map();
	};
};

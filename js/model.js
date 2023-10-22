"use strict";

// error margins for calculations
function EPSILON(value){
	return isNaN(value) || 0.0000001 > Math.abs(value);
}

/**
 * @module models
 * @exports model node prototype
 * loads and manages all the models
 * TODO: split into meshes and materials
 */
const model_manager = new function(){
	let gl;
	let model_buffer = new Map(); // stored models
	let requests = new Map();
	// TODO: keep track of references and remove unused models
	// TODO: create/load default/error models

	// TODO: use setup or default
	let sdcnt = 3; // subdivision count
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
		let mdata = model_buffer.get(name);
		if(mdata){return mdata;}

		if(name.endsWith(".json")){
			mdata = fetch(new Request(`models/${name}`))
			.then(response => response.json())
			.then(model_received_json);
		} else if(name.endsWith(".obj")){
			mdata = fetch(new Request(`models/${name}`))
			.then(response => response.text())
			.then(model_received_obj);
		} else {
			console.error("model in unknown data format requested: " + name)
			return
		}
		
		mdata.name = name;
		model_buffer.set(name, mdata);
		// model_buffer.set(name + '_normals', mdata_n);
		// requests.delete(name + '_normals')
		// requests.delete(name);
		return mdata;

		// private callback when the model is received
		async function model_received_json(response){
			console.log(name);
			console.log(response);
			// mdata.name = name;
			// mdata.lod_buffer = [];
			// mdata.lod_edge_buffer = [];
			// mdata.triangle_count = [0,0];
			// mdata.line_count = [0,0];
			// mdata.normal_data

			// if(settings.generate_model_normals){
			// 	mdata_n.triangle_count = [0,0];
			// 	mdata_n.line_count = [0,0];
			// }
			response.name = name
			process_model(response);
		}

		async function model_received_obj(response){
			const objPositions = [[]];
			const objTexcoords = [[]];
			const objNormals = [[]];

			// same order as `f` indices
			const objVertexData = [
				objPositions,
				objTexcoords,
				objNormals,
			];
			// same order as `f` indices
			let webglVertexData = [
				[],   // positions
				[],   // texcoords
				[],   // normals
			];
 
			console.log("Object file received");
			console.log(response);

			function addVertex(vert) {
				// console.log("vert:" + vert)
				const ptn = vert.split('/');
				ptn.forEach((objIndexStr, i) => {
					if (!objIndexStr) {
						return;
					}
					const objIndex = parseInt(objIndexStr);
					const index = objIndex + (objIndex >= 0 ? 0 : objVertexData[i].length);
					webglVertexData[i].push(...objVertexData[i][index]);
				});
			}

			const keywords = {
				v(parts) {
				  objPositions.push(parts.map(parseFloat));
				},
				vn(parts) {
				  objNormals.push(parts.map(parseFloat));
				},
				vt(parts) {
				  objTexcoords.push(parts.map(parseFloat));
				},
				f(parts) {
					const numTriangles = parts.length - 2;
					for (let tri = 0; tri < numTriangles; ++tri) {
						addVertex(parts[0]);
						addVertex(parts[tri + 1]);
						addVertex(parts[tri + 2]);
					}
				}
			}
					   
			const keywordRE = /(\w*)(?: )*(.*)/;
			const lines = response.split('\n');
			for (let lineNo = 0; lineNo < lines.length; ++lineNo) {
			  const line = lines[lineNo].trim();
			  if (line === '' || line.startsWith('#')) {
				continue;
			  }
			  const m = line.split(/\s+/);
			  const keyword = m[0];
			  const parts = m.slice(1);
			  const handler = keywords[keyword];
			//   console.log(m, keyword, parts)
			  if (!handler) {
				console.warn('unhandled keyword:', keyword, 'at line', lineNo + 1);
				continue;
			  }
			  handler(parts);
			}
			console.log(webglVertexData)
		  
		}
		
		function process_model(raw_blob){

			// normalize normals just in case
			for (let j = 0; j < raw_blob.normal_data.length ; j=j+3) {
				let vx = raw_blob.normal_data[j+0];
				let vy = raw_blob.normal_data[j+1];
				let vz = raw_blob.normal_data[j+2];
				let vd = Math.sqrt(vx*vx+vy*vy+vz*vz);
				raw_blob.normal_data[j+0] /= vd;
				raw_blob.normal_data[j+1] /= vd;
				raw_blob.normal_data[j+2] /= vd;
			}
			generate_edges(raw_blob);
			// TODO error handling
			raw_blob.sdcnt = sdcnt;
			// console.log(raw_blob);
			subdivide.postMessage(raw_blob);
		}
	};

	// subdivide webworker done working
	subdivide.onmessage = function(e){
		let response = e.data;
		let model = model_buffer.get(response.name);
		console.log("subdivider finished "+response.name);
		if(response.texture_data){
			let tex = texture_manager.load_texture(response.texture);
			console.log(tex);
			model.render = grafx.generate_textured_render_function(response, tex);
		} else {
			model.render = grafx.generate_colored_render_function(response);
		}

		model.ready = true;
	}

	// -- lod interface --
	this.lod_up = function(){lod = Math.min(sdcnt, lod+1);console.log(lod);};
	this.lod_down = function(){lod = Math.max(0, lod-1);console.log(lod);};

	// -- model_node prototype export --
	let mproto = function(args){
		args.prn && (this.parent_node = args.prn) && this.parent_node.add_child(this);
		// trajectory_manager.generate_proto.call(this, args);
		// this._mdata = model_buffer.get(args.mdl) || load_model(args.mdl).then(data=>{this._mdata=data});
		// this._mdata = model_buffer.get(args.mdl) || load_model(args.mdl);
		this._mdata = load_model(args.mdl);
		if(args.tex && typeof(args.tex)=="string"){
			this._texture = texture_manager.load_texture(args.tex)
		}
		console.log(this._mdata);
	}

	// mproto.prototype = Object.create(trajectory_manager.generate_proto.prototype)

	mproto.prototype.is_model_node = true
	mproto.prototype.visible = function(){return true;};
	// TODO: cull check by trajectory_manager
	mproto.prototype.get_transform = function(){
		return this.parent_node.get_transform();
	};
	mproto.prototype.get_local_transform = function(){
		return [1.0, 0.0,0.0,0.0,
		0.0,1.0,0.0,0.0,
		0.0,0.0,1.0,0.0,
		0.0,0.0,0.0,1.0];
	};

	mproto.prototype.reload = function(){
		load_model(this._mdata.name).then(data=>{this._mdata=data});
	}

	// rendering section
	// ! Model needs to ask the scene head for the currently active camera
	// ! then apply its own Vertex Array Object
	// ! then apply camera settings
	// todo adjust lod in VAO when hitting the function

	// ! currently not used (mesh is drawn via grafx, see below)
	/*
	mproto.prototype.draw_triangles = function(){
		if (!this._mdata.ready){
			return;
		}
		gl.bindVertexArray(this._mdata.trivao[lod]);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._mdata.lod_buffer[lod]);

		// gl.bindBuffer(gl.ARRAY_BUFFER, this._mdata.vertex_buffer);
		// gl.vertexAttribPointer(main_program.vertex, 3, gl.FLOAT, false, 0, 0);

		// gl.bindBuffer(gl.ARRAY_BUFFER, this._mdata.normal_buffer);
		// gl.vertexAttribPointer(main_program.normal, 3, gl.FLOAT, false, 0, 0);

		// gl.bindBuffer(gl.ARRAY_BUFFER, this._mdata.color_buffer);
		// gl.vertexAttribPointer(main_program.color, 4, gl.FLOAT, false, 0, 0);

		// gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._mdata.lod_buffer[lod]);


		gl.uniform3fv(main_program.position, this.parent_node.gpos);
		gl.uniform4fv(main_program.orientation, this.parent_node.gorn);
		gl.uniformMatrix4fv(main_program.mvMatrix, false, this.get_transform());
		// console.log(this.get_transform())

		// TODO: use drawRangeElements for lod
		gl.drawElements(gl.TRIANGLES, this._mdata.triangle_count[lod], gl.UNSIGNED_SHORT, 0);
		gl.bindVertexArray(null);
	}//*/

	// ! currently not used (mesh is drawn via grafx, see below)
	/*
	mproto.prototype.draw_wireframe = function(){
		gl.bindBuffer(gl.ARRAY_BUFFER, this._mdata.vertex_buffer);
		gl.vertexAttribPointer(main_program.vertex, 3, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, this._mdata.color_buffer);
		gl.vertexAttribPointer(main_program.color, 4, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._mdata.lod_edge_buffer[lod]);

		gl.uniform3fv(main_program.position, this.parent_node.gpos);
		gl.uniform4fv(main_program.orientation, this.parent_node.gorn);

		gl.drawElements(gl.LINES, this._mdata.line_count[lod], gl.UNSIGNED_SHORT, 0);
		// TODO: use drawRangeElements for lod
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
	}//*/


	// mproto.prototype.draw = mproto.prototype.draw_wireframe;
	// mproto.prototype.draw = mproto.prototype.draw_triangles;
	// mproto.prototype.draw = mproto._mdata.render
	mproto.prototype.draw = function(){
		if(this._mdata.ready){
			console.log("enabling draw");
			this.draw = this._mdata.render;
		}
	}

	this.generate_proto = mproto;

	// -- maintenance --
	this.report = function(){
		console.log(model_buffer);
	}

	// TODO: actually clean the buffers
	this.cleanup = function(){
		model_buffer = new Map();
	};
};



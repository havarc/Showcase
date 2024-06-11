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
	let model_buffer = new Map(); // stored models
	// TODO: keep track of references and remove unused models
	// TODO: create/load default/error models

	// TODO: use setup or default
	let sdcnt = 3; // subdivision count

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
			response.name = name
			let model = model_buffer.get(response.name);

			if(response.texture_data){
				model.stex = texture_manager.load_texture(response.texture);
			}

			if(response.triangle_index){ // solid mesh received

				// normalize normals just in case
				for (let j = 0; j < response.normal_data.length ; j=j+3) {
					let vx = response.normal_data[j+0];
					let vy = response.normal_data[j+1];
					let vz = response.normal_data[j+2];
					let vd = Math.sqrt(vx*vx+vy*vy+vz*vz);
					response.normal_data[j+0] /= vd;
					response.normal_data[j+1] /= vd;
					response.normal_data[j+2] /= vd;
				}
				generate_edges(response);
				// TODO error handling
				response.sdcnt = sdcnt;
				
				subdivide.postMessage(response);
				return;
			}

			if(response.shader && response.mode){ // shader and mode defined
				// let model = model_buffer.get(response.name);
				// console.log("subdivider finished "+response.name);
				// response.stex = model.stex;
				model.render = grafx.generate_custom_render_function(response);
				model.ready = true;
				return;
			}
		}

		// https://webgl2fundamentals.org/webgl/lessons/webgl-load-obj-w-mtl.html
		async function model_received_obj(text){
			// because indices are base 1 let's just fill in the 0th data
			const objPositions = [[0, 0, 0]];
			const objTexcoords = [[0, 0]];
			const objNormals = [[0, 0, 0]];
			const objColors = [[0, 0, 0]];

			// same order as `f` indices
			const objVertexData = [
				objPositions,
				objTexcoords,
				objNormals,
				objColors,
			];

			// same order as `f` indices
			let webglVertexData = [
				[],   // positions
				[],   // texcoords
				[],   // normals
				[],   // colors
			];

			let materialLibs = [];
			let geometries = [];
			let geometry;
			let groups = ['default'];
			let material = 'default';
			let object = 'default';

			const noop = () => {};

			function newGeometry() {
				// If there is an existing geometry and it's
				// not empty then start a new one.
				if (geometry && geometry.data.position.length) {
				geometry = undefined;
				}
			}

			function setGeometry() {
				if (!geometry) {
				const position = [];
				const texcoord = [];
				const normal = [];
				const color = [];
				webglVertexData = [
					position,
					texcoord,
					normal,
					color,
				];
				geometry = {
					object,
					groups,
					material,
					data: {
					position,
					texcoord,
					normal,
					color,
					},
				};
				geometries.push(geometry);
				}
			}

			function addVertex(vert) {
				const ptn = vert.split('/');
				ptn.forEach((objIndexStr, i) => {
				if (!objIndexStr) {
					return;
				}
				const objIndex = parseInt(objIndexStr);
				const index = objIndex + (objIndex >= 0 ? 0 : objVertexData[i].length);
				webglVertexData[i].push(...objVertexData[i][index]);
				// if this is the position index (index 0) and we parsed
				// vertex colors then copy the vertex colors to the webgl vertex color data
				if (i === 0 && objColors.length > 1) {
					geometry.data.color.push(...objColors[index]);
				}
				});
			}

			const keywords = {
				v(parts) {
				// if there are more than 3 values here they are vertex colors
				if (parts.length > 3) {
					objPositions.push(parts.slice(0, 3).map(parseFloat));
					objColors.push(parts.slice(3).map(parseFloat));
				} else {
					objPositions.push(parts.map(parseFloat));
				}
				},
				vn(parts) {
				objNormals.push(parts.map(parseFloat));
				},
				vt(parts) {
				// should check for missing v and extra w?
				objTexcoords.push(parts.map(parseFloat));
				},
				f(parts) {
				setGeometry();
				const numTriangles = parts.length - 2;
				for (let tri = 0; tri < numTriangles; ++tri) {
					addVertex(parts[0]);
					addVertex(parts[tri + 1]);
					addVertex(parts[tri + 2]);
				}
				},
				s: noop,    // smoothing group
				mtllib(parts, unparsedArgs) {
				// the spec says there can be multiple filenames here
				// but many exist with spaces in a single filename
				materialLibs.push(material_manager.load_material(unparsedArgs));
				},
				usemtl(parts, unparsedArgs) {
				material = unparsedArgs;
				newGeometry();
				},
				g(parts) {
				groups = parts;
				newGeometry();
				},
				o(parts, unparsedArgs) {
				object = unparsedArgs;
				newGeometry();
				},
			};

			const keywordRE = /(\w*)(?: )*(.*)/;
			const lines = text.split('\n');
			for (let lineNo = 0; lineNo < lines.length; ++lineNo) {
				const line = lines[lineNo].trim();
				if (line === '' || line.startsWith('#')) {
				continue;
				}
				const m = keywordRE.exec(line);
				if (!m) {
				continue;
				}
				const [, keyword, unparsedArgs] = m;
				const parts = line.split(/\s+/).slice(1);
				const handler = keywords[keyword];
				if (!handler) {
				console.warn('unhandled keyword:', keyword);  // eslint-disable-line no-console
				continue;
				}
				handler(parts, unparsedArgs);
			}

			// remove any arrays that have no entries.
			for (const geometry of geometries) {
				geometry.data = Object.fromEntries(
					Object.entries(geometry.data).filter(([, array]) => array.length > 0));
			}

			let model = model_buffer.get(name);
			console.log(materialLibs);
			const mat = materialLibs;


			Promise.all(materialLibs).then(getdraw);

			console.log(geometries);
			console.log(materialLibs);
			console.log(mat);
			async function getdraw(materialLibs) {
				console.log(geometries);
				console.log(materialLibs);
				console.log(mat);
				model.render = grafx.generate_obj_render_function(geometries, mat);
				model.ready = true;
			}
		}
	};

	// subdivide webworker done working
	subdivide.onmessage = function(e){
		let response = e.data;
		let model = model_buffer.get(response.name);
		console.log("subdivider finished "+response.name);
		response.stex = model.stex;
		model.render = grafx.generate_render_function(response);
		model.ready = true;
	}

	// -- model_node prototype export --
	let mproto = function(args = {}){
		this.args = args;
		args.prn && (this.parent_node = args.prn) && this.parent_node.add_child(this);
		// trajectory_manager.generate_proto.call(this, args);
		// attach temporary dataset to model node, see mproto.draw
		this._mdata = load_model(args.file);
		// if(args.tex && typeof(args.tex)=="string"){
		// 	this._texture = texture_manager.load_texture(args.tex)
		// }
	}

	// mproto.prototype = Object.create(trajectory_manager.generate_proto.prototype)

	mproto.prototype.is_model_node = true
	// mproto.prototype.visible = function(){return true;};
	mproto.prototype.visible = true;
	// TODO: cull check by trajectory_manager
	mproto.prototype.get_transform = function(){
		if(this.billboard){
			console.log("Hello billboard");
			let transform = this.parent_node.get_transform();

			// transform[0] = transform[1] = transform[2] = 0.0;
			// transform[4] = transform[5] = transform[6] = 0.0;
			// transform[8] = transform[9] = transform[10] = 0.0;
			return transform;
		}
		else{
			return this.parent_node.get_transform();
		}
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

	mproto.prototype.draw = function(){
		if(this._mdata.ready){
			console.log("enabling draw");
			this.draw = this._mdata.render;
			delete this._mdata;
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





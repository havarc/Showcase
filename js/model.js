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
	let active_calls = new Map(); // what Models are loading
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
	function load_model(name, part){
		if(!name || name.length < 4) return null;
		let mdata = model_buffer.get(name);
		if(mdata && part && mdata.parts){
			return mdata.parts.get(part);
		}
		if(mdata || active_calls.get(name)){return mdata;}

		// else load from file

		// setting call
		active_calls.set(name, true);
		if(name.endsWith(".json")){
			console.error("json-format currently not supported: " + name)
			// mdata = fetch(new Request(`models/${name}`))
			// .then(response => response.json())
			// .then(model_received_json);
			return {draw: ()=>{}};
		} else if(name.endsWith(".obj")){
			// console.log(mdata);
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
			let parts = new Map;
			let geometries = [];
			let geometry;
			let groups = ['default'];
			let material = 'default';
			let object = 'default';
			let mtlLibNames = [];
			// model_buffer.set(name, parts);

			const noop = () => {};

			function newPart(name){
				if(0 != geometries.length && 'default' == object && !parts.get('default')){
					// first geometries not stored
					parts.set(object, geometries)
				}
				geometries = [];
				parts.set(name, geometries);
				geometry = undefined;
			}

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
				v(parsed) {
					// if there are more than 3 values here they are vertex colors
					if (parsed.length > 3) {
						objPositions.push(parsed.slice(0, 3).map(parseFloat));
						objColors.push(parsed.slice(3).map(parseFloat));
					} else {
						objPositions.push(parsed.map(parseFloat));
					}
				},
				vn(parsed) {
					objNormals.push(parsed.map(parseFloat));
				},
				vt(parsed) {
					// should check for missing v and extra w?
					objTexcoords.push(parsed.map(parseFloat));
				},
				f(parsed) {
					setGeometry();
					const numTriangles = parsed.length - 2;
					for (let tri = 0; tri < numTriangles; ++tri) {
						addVertex(parsed[0]);
						addVertex(parsed[tri + 1]);
						addVertex(parsed[tri + 2]);
					}
				},
				s: noop,    // smoothing group
				mtllib(parsed, unparsedArgs) {
					// the spec says there can be multiple filenames here
					// but many exist with spaces in a single filename
					mtlLibNames.push(unparsedArgs);
					materialLibs.push(material_manager.load_material(unparsedArgs));
				},
				usemtl(parsed, unparsedArgs) {
					material = unparsedArgs;
					newGeometry();
				},
				g(parsed) {
					groups = parsed;
					newGeometry();
				},
				o(parsed, unparsedArgs) {
					newPart(unparsedArgs);
					object = unparsedArgs;
				},
			};

			const keywordRE = /(\w*)(?: )*(.*)/;
			const lines = text.split('\n');
			for (let lineNo = 0; lineNo < lines.length; ++lineNo) {
				const line = lines[lineNo].trim();
				if (line === '' || line.startsWith('#')) continue;
				const m = keywordRE.exec(line);
				if (!m) continue;
				const [, keyword, unparsedArgs] = m;
				const parsed = line.split(/\s+/).slice(1);
				const handler = keywords[keyword];
				if (!handler) {
					console.warn('unhandled keyword:', keyword);  // eslint-disable-line no-console
					continue;
				}
				handler(parsed, unparsedArgs);
			}


			// remove any arrays that have no entries.
			// done in draw call
			// for(const p of parts){
			// 	for (const geometry of p) {
			// 		geometry.data = Object.fromEntries(
			// 			Object.entries(geometry.data).filter(([, array]) => array.length > 0));
			// 	}
			// }
			// let model = model_buffer.get(name);

			console.log(materialLibs);
			// const mat = materialLibs;


			return Promise.all(materialLibs).then(getdraw);
			// return model;
			// return parts;

			// console.log(geometries);
			// console.log(materialLibs);
			// console.log(mat);
			function getdraw(materials) {
				// console.log(geometries);
				console.log(materialLibs);
				let mat = materials[0];
				// let mat = material_manager.load_material(mtlLibNames[0])
				// let mdata = model_manager.load_model(name)
				console.log(mat);
				for(const [key, p] of parts){
					p.draw = grafx.generate_obj_render_function(p, mat);
					p.ready = true;
				}
				mdata.parts = parts;

				mdata.draw = (...p)=>{
					parts.forEach((d)=>{d.draw(...p)});
				}
				mdata.ready = true;
				// model_buffer.set(name, mdata);
				// model_buffer.set(name, parts);
				console.log(mdata.parts, model_buffer.get(name))
				return mdata;
			}
		}
	};

	// -- model_node prototype export --
	let mproto = function(args = {}){
		this.args = args;
		args.prn && (this.parent_node = args.prn) && this.parent_node.add_child(this);
		// trajectory_manager.generate_proto.call(this, args);
		// attach temporary dataset to model node, see mproto.draw
		// this._mdata = load_model(args.file, args.part);
		this._mdata = load_model(args.file, args.part);
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
		// I got a Promise during construction
		// which I cannot resolve from here
		// so get a new Instance from the manager
		let _mdata = load_model(this.args.file, this.args.part);
		if(!_mdata){
			this.visible = false;
			return;
		}
		if(_mdata.ready){
			// console.log("enabling draw");
			this.draw = _mdata.draw;
		}
		// this._mdata = load_model(this.args.file, this.args.part);
		// if(this._mdata.ready){
		// 	console.log("enabling draw");
		// 	this.draw = this._mdata.draw;
		// 	// delete this._mdata;
		// 	this._mdata = undefined;
		// }
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





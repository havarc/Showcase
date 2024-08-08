"use strict";

// error margins for calculations
function EPSILON(value){
	return isNaN(value) || 0.0000001 > Math.abs(value);
}

/**
 * @module texture
 * loads and manages all the textures for materials
 */
const texture_manager = new function(){
	let texture_buffer = new Map();
	
	this.load_texture = function(name){
		if(!name || name.length < 4) return grafx.whitePixel;
		let xdata = texture_buffer.get(name);
		if(xdata){return xdata;}

		texture_buffer.set(name, grafx.create_texture_buffer(`models/${name}`));
		console.log(texture_buffer.get(name));

		return texture_buffer.get(name);
	}

	// -- maintenance --
	this.report = function(){
		console.log(texture_buffer);
	}
}

/**
 * @module materials
 * loads and manages all the material files
 */
const material_manager = new function(){
	let material_buffer = new Map(); // stored materials

	this.default_material = {
		shininess:      new Float32Array([0]),
		ambient:        new Float32Array([1, 1, 1]),
		diffuse:        new Float32Array([1, 1, 1]),
		specular:       new Float32Array([0, 0, 0]),
		emissive:       new Float32Array([0, 0, 0]),
		opticalDensity: new Float32Array([1]),
		opacity:        new Float32Array([0]),
		illum:          new Float32Array([0]),
		texture:        grafx.whitePixel
	}

	this.default_matLib = {
		"default": this.default_material
	}

	material_buffer.set("default", this.default_material)

	this.load_material = async function(name){
		if(!name || name.length < 4) return null;
		let mdata = material_buffer.get(name);
		if(mdata && !mdata.name)console.error("no name");
		if(mdata){
			// console.log(mdata);
			// await mdata;
			// console.log(mdata);
			// return material_buffer.get(name);
			return mdata;
		}

		if(name.endsWith(".json")){
			mdata = await fetch(new Request(`models/${name}`))
			.then(response => response.json())
			.then(material_received_json);
		} else if(name.endsWith(".mtl")){
			mdata = await fetch(new Request(`models/${name}`))
			.then(response => response.text())
			.then(process_material_mtl);
			// .then(material_received_mtl);
		} else {
			console.error("material in unknown data format requested: " + name)
			return
		}
		
		mdata.name = name;
		material_buffer.set(name, mdata);
		// console.log(material_buffer);
		// await mdata;
		// return material_buffer.get(name)
		return mdata;

		// private callback when the material file is received
		async function material_received_json(response){
			// console.log(name);
			// console.log(response);
			response.name = name
			process_material_json(response);
		}

		async function material_received_mtl(response){
			// console.log(name);
			// console.log(response);
			// response.name = name
			await process_material_mtl(response);
		}

		async function process_material_mtl(text){
			let materials = new Map();
			// material_buffer.set(name, materials)
			let material;
		  
			const keywords = {
				newmtl(parts, unparsedArgs) {
					material = {};
					materials.set(unparsedArgs,material);
				},

				/* eslint brace-style:0 */
				Ns(parts)     { material.shininess      = new Float32Array([parseFloat(parts[0])]); },
				Ka(parts)     { material.ambient        = new Float32Array(parts.map(parseFloat)); },
				Kd(parts)     { material.diffuse        = new Float32Array(parts.map(parseFloat)); },
				Ks(parts)     { material.specular       = new Float32Array(parts.map(parseFloat)); },
				Ke(parts)     { material.emissive       = new Float32Array(parts.map(parseFloat)); },
				Ni(parts)     { material.opticalDensity = new Float32Array([parseFloat(parts[0])]); },
				d(parts)      { material.opacity        = new Float32Array([parseFloat(parts[0])]); },
				illum(parts)  { material.illum          = new Float32Array([parseInt(parts[0])]); },
				map_Kd(parts) { material.texture        = texture_manager.load_texture(parts[0]); },
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

			// check each material for empty values
			materials.forEach((m)=>{
				if(!m.shininess) m.shininess = new Float32Array([0]);
				if(!m.ambient) m.ambient = new Float32Array([1,1,1]);
				if(!m.diffuse) m.diffuse = new Float32Array([0,0,0]);
				if(!m.specular) m.specular = new Float32Array([0,0,0]);
				if(!m.emissive) m.emissive = new Float32Array([0,0,0]);
				if(!m.opticalDensity) m.opticalDensity = new Float32Array([1]);
				if(!m.opacity) m.opacity = new Float32Array([1]);
				if(!m.illum) m.illum = new Float32Array([1]);
				console.log(m)
			})

			console.log(name, materials);
			return materials;
		}
	};

	// -- maintenance --
	this.report = function(){
		console.log(material_buffer);
	}

	// TODO: actually clean the buffers
	this.cleanup = function(){
		material_buffer = new Map();
	};
};


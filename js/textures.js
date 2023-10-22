"use strict";


/**
 * @module models
 * @exports model node prototype
 * loads and manages all the models
 * TODO: split into meshes and materials
 */
const texture_manager = new function(){
	//let gl;
	let texture_buffer = new Map();
	
	this.load_texture = function(name){
		if(!name || name.length < 4) return null;
			let xdata = texture_buffer.get(name);
		if(xdata){return xdata;}

		texture_buffer.name = grafx.create_texture_buffer(`textures/${name}`)
		console.log(texture_buffer.name);

		// texture_buffer.name = new Image();
		// texture_buffer.name.onload = grafx.create_texture_buffer;
		// texture_buffer.name.src = `textures/${name}`;
		// console.log(texture_buffer.name);

		// xdata = fetch(new Request(`textures/${name}`))
		// .then(texture_received);

		// xdata.name = name;
		// texture_buffer.set(name, xdata);
		// return xdata;

		// async function texture_received(response){
		// 	console.log(name);
		// 	return grafx.create_texture_buffer(response);
		// }
		return texture_buffer.name;
	}
}
 
"use strict";

/**
 * @module lights
 * @exports light node
 * creat3es and manages lights in a scene
 */
const lights_manager = new function(){
	// let light_cache = new Map(); // stored shaders

    // -- light_node prototype export --
	let lproto = function(args){
		trajectory_manager.generate_proto.call(this, args);
		//this._mdata = load_model(args.mdl);
	}

	lproto.prototype = Object.create(trajectory_manager.generate_proto.prototype)

	lproto.prototype.reload = function(){
		//load_model(this._mdata.name).then(data=>{this._mdata=data});
	}

    lproto.prototype.draw = function(){}


}

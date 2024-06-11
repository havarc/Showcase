"use strict";

/**
 * @module lights
 * @exports light node
 * creates and manages lights in a scene
 */
const lights_manager = new function(){
	let light_cache = new Map(); // stored lights
	let light_shader = shader_managaer.load_shader("light");

    // -- light_node prototype export --
	let lproto = function(args = {}){
		args.prn && (this.parent_node = args.prn) && this.parent_node.add_child(this);
		//this._mdata = load_model(args.mdl);
	}


	lproto.prototype.reload = function(){
		//load_model(this._mdata.name).then(data=>{this._mdata=data});
	}

    lproto.prototype.draw = function(){}


}

const particle_manager = new function(){


	// particle emitter
// -- model_node prototype export --
let peproto = function(args = {}){
	args.prn && (this.parent_node = args.prn) && this.parent_node.add_child(this);
	if(args.texture){

	}
	// trajectory_manager.generate_proto.call(this, args);
	// attach temporary dataset to model node, see mproto.draw
	// this._mdata = load_model(args.mdl);
	// if(args.tex && typeof(args.tex)=="string"){
	// 	this._texture = texture_manager.load_texture(args.tex)
	// }
}

// mproto.prototype = Object.create(trajectory_manager.generate_proto.prototype)

peproto.prototype.is_particle_node = true
peproto.prototype.visible = function(){return true;};
// TODO: cull check by trajectory_manager
peproto.prototype.get_transform = function(){
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
peproto.prototype.get_local_transform = function(){
	return [1.0, 0.0,0.0,0.0,
	0.0,1.0,0.0,0.0,
	0.0,0.0,1.0,0.0,
	0.0,0.0,0.0,1.0];
};

peproto.prototype.reload = function(){
	load_model(this._mdata.name).then(data=>{this._mdata=data});
}

peproto.prototype.draw = function(){
	if(this._mdata.ready){
		console.log("enabling draw");
		this.draw = this._mdata.render;
		delete this._mdata;
	}
}

this.generate_peproto = peproto;

};
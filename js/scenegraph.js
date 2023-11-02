// --- scene graph ---
// singleton to manage everything on the 3d canvas
// import object_node from "trajectory.js";
"use strict"


const scene_manager = new function(){
	// scene graph is the center of the world

	var	scene_heads = []; // all scene heads

	this.add_scene_head = function(sh){
		scene_heads.push(sh);
	}

	this.render = function(){
		// render all scene_heads
		scene_heads.forEach(function(sh){sh.render();});
	};
	// TODO: have cameras manage viewports themselves
	// scene manager will only store total size
	this.change_viewport = function(w, h){
		scene_heads.forEach(function(sh){sh.change_viewport(w, h);});
	};

	this.report = function(){
		console.log(scene_heads);
	}

};

/**
 * scene head node
 * object and camera nodes are attached directly to the scene head
 * sub objects and lights are attached to their respective parent_node object nodes
 */
var scene_head = function(){
	this.children = [];
	this.cameras = [];
	this.gpos = [0,0,0];
	this.gorn = [0,0,0,1];
}
scene_head.prototype.get_parent_node = function(){return false;};

scene_head.prototype.add_child = function(child){
	// if(!child.is_object_node){
	// 	console.warn('WARNING: attempted to add invalid child!'); console.trace(); return;
	// }
	if(this.children.indexOf(child) != -1){
		console.warn('WARNING: attempted to add child twice (or moved it around)!'); console.trace(); return;
	}
			
	// apply myself as parent, overwritten if called from below
	child.parent_node = this;
	// I can return false when I disagree with adding this child
	// TODO: add callback module/promise for this decision
	return !!this.children.push(child);
};

scene_head.prototype.flush = function(){
	console.log('scene_head flushing');
	console.log('before: ', this.children);
	let children_filtered = this.children.filter(function(ch){
		return -1 != ch.get_transform()[15];
	});
	this.children = children_filtered;
	console.log('after: ', children);
	trajectory_manager.flush();
};

scene_head.prototype.render = function(){
	// transform all objects inside the scene
	this.children.forEach(function(ch){
		ch.get_transform();
	});

	// render all cameras
	// this.cameras.forEach(function(c){this.activeCamera = c;c.render();});
	this.cameras.forEach(function(c){c.render();});
	this.activeCamera = {}
};

// TODO: let the camera manage the viewport 
scene_head.prototype.change_viewport = function(w, h){
	this.cameras.forEach(function(cam){cam.change_projection({width: w, height: h});});
};

// project world transforms down the tree
scene_head.prototype.prepare = function(){
	// go through all children and have their transforms created
	this.children.forEach(function(ch){
		ch.get_transform();
	});
	// todo: cull and get z, then render
};

scene_head.prototype.get_transform = function(force_update){
	return [1.0, 0.0,0.0,0.0,
		0.0,1.0,0.0,0.0,
		0.0,0.0,1.0,0.0,
		0.0,0.0,0.0,1.0];
};



// --- Object Node ---
var object_node = trajectory_manager.generate_proto;
object_node.prototype.is_object_node = true;
// non model nodes only update their transform
// object_node.prototype.draw = function(){};
object_node.prototype.add_child = function(child){
	let scene_head = this.parent_node;
	// get up to scene head
	while(scene_head.parent_node){
		if(child == scene_head) return false; // loop prevention
		scene_head = scene_head.parent_node;
	}
	// TODO: adjust child _tdata if it already has a parent_node, check transformations
	var sc_agree = scene_head.add_child(child);
	if(sc_agree) child.parent_node = this;
	return sc_agree;
}

// --- Model Node ---
var model_node = model_manager.generate_proto;

// --- lightsource ---
// attached to model_node, does have neither model nor children
function light_node(parent_node, traj_data, params){
	var self = object_node(parent_node, traj_data);
	return self;
}

// --- camera ---
// camera with a position in the world and a specified place on the canvas
var camera_node = grafx.generate_proto;
// cameras are not allowed to have children
// camera_node.prototype.add_child = function(){
// 	return false;
// }

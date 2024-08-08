"use strict";

/**
 * @module trajectory
 * @exports basic node
 * manages the position and orientation of object nodes
 */

const trajectory_manager = new function(){
		// size of one trajectory set
	//	0 float id
	//	1 vec3 position
	//	4 vec3 movement
	//	7 vec3 acceleration
	// 10 quat orientation
	// 14 quat rotation
	// 18 quat torque (angular acceleration)
	// 22 mat4 transform local
	// 38 mat4 transform global

	let set_size = 64;

	let current_index = 0; // index after the last used set
	let array_type = Float32Array;

	let trajectory_buffer = [];

	// trajectory prototype, object node
	// TODO: remove trq, gpos, gorn
	let tproto = function(args){
		if(!args.prn){
			console.error("node has no parent")
		}
		// create new dataset
		// TODO: receive full dataset on creation
		let tdata = new array_type(set_size);
		tdata.fill(0);
		tdata[0] = current_index;
		current_index++;
		// tdata[10] = tdata[14] = tdata[18] = 1;
		tdata[13] = tdata[17] = tdata[21] = 1;
		// TODO: test for number array
		args.pos && tdata.set(args.pos,  1);
		args.vel && tdata.set(args.vel,  4);
		args.acc && tdata.set(args.acc,  7);
		args.orn && tdata.set(norm4(args.orn), 10);
		args.rot && tdata.set(norm4(args.rot), 14);
		// args.trq && tdata.set(norm4(args.trq), 18);
		args.prn && (this.parent_node = args.prn) && this.parent_node.add_child(this);
		trajectory_buffer.push(tdata);
		this._tdata = tdata;
		this.ready = 0
		// console.log(tdata);
		// console.log(this);
		// return null
	}

	// let vecproto;
	// vecproto.prototype.x = function(){return this[0];}
	// vecproto.prototype.y = function(){return this[1];}
	// vecproto.prototype.z = function(){return this[3];}
	//*
	Object.defineProperty(tproto.prototype, 'pos', {
		get: function(){return this._tdata.subarray( 1,  4);},
		set: function(args){this._tdata.set(args.slice(0,3), 1);}
	});
	Object.defineProperty(tproto.prototype, 'vel', {
		get: function(){return this._tdata.subarray( 4,  7);},
		set: function(args){this._tdata.set(args.slice(0,3), 4);}
	});
	Object.defineProperty(tproto.prototype, 'acc', {
		get: function(){return this._tdata.subarray( 7,  10);},
		set: function(args){this._tdata.set(args.slice(0,3), 7);}
	});
	Object.defineProperty(tproto.prototype, 'orn', {
		get: function(){return this._tdata.subarray( 10, 14);},
		set: function(args){this._tdata.set(qfill(args.slice(0,4)), 10);}
	});
	Object.defineProperty(tproto.prototype, 'rot', {
		get: function(){return this._tdata.subarray( 14,  18);},
		set: function(args){this._tdata.set(qfill(args.slice(0,4)), 14);}
	});
	Object.defineProperty(tproto.prototype, 'trq', {
		get: function(){return this._tdata.subarray( 18,  22);},
		set: function(args){this._tdata.set(qfill(args.slice(0,4)), 18);}
	});

	Object.defineProperty(tproto.prototype, 'gpos', {
		get: function(){
			let t = this.get_transform();
			return(t.subarray(12, 15));
			// return(this._tdata.subarray(50, 53));
		}
	});
	Object.defineProperty(tproto.prototype, 'gorn', {
		get: function(){
			// data has to be updated before use
			let t = this.get_transform();
			let q = glMatrix.quat.create();
			let m3 = glMatrix.mat3.create();
			glMatrix.mat3.fromMat4(m3, this._tdata.subarray(38, 54));
			glMatrix.quat.fromMat3(q, m3)
			return q;
		}
	});
	// setup transform methods
	// TODO: add methods for camera set
	// TODO: array-add, SIMD

	// position vector
	tproto.prototype.set_position = function(val){
		this.pos.set(val);}
	tproto.prototype.add_position = function(val){
		for(let i = 0; i<3; i++) this.pos[i]+=val[i];}
	tproto.prototype.clr_position = function(){
		this.pos.set([0,0,0]);}
	// velocity vector
	tproto.prototype.set_velocity = function(val){
		this.vel.set(val);}
	tproto.prototype.add_velocity = function(val){
		for(let i = 0; i<3; i++) this.vel[i]+=val[i];}
	tproto.prototype.clr_velocity = function(){
		this.vel.set([0,0,0]);}
	// acceleration vector
	tproto.prototype.set_acceleration = function(val){
		this.acc.set(val);}
	tproto.prototype.add_acceleration = function(val){
		for(let i = 0; i<3; i++) this.acc[i]+=val[i];}
	tproto.prototype.clr_acceleration = function(){
		this.acc.set([0,0,0]);}

	// orientation quat
	tproto.prototype.set_orientation_quat = function(q){
		this.orn.set(qfill(q.slice(0,3)));}
	tproto.prototype.set_orientation_axan = function(ax, an){
		this.orn.set(quat_from_axan(ax, an));}
	tproto.prototype.add_orientation_quat = function(q){
		glMatrix.quat.multiply(this.orn, this.orn, qfill(q.slice(0,3)));}
	tproto.prototype.add_orientation_axan = function(ax, an){
		glMatrix.quat.multiply(this.orn, this.orn, quat_from_axan(ax, an));}
	tproto.prototype.clr_orientation = function(){
		this.orn.set([0,0,0,1]);}
	// rotation quat
	tproto.prototype.set_rotation_quat = function(q){
		this.rot.set(qfill(q.slice(0,3)));}
	tproto.prototype.set_rotation_axan = function(ax, an){
		this.rot.set(quat_from_axan(ax, an));}
	tproto.prototype.add_rotation_quat = function(q){
		glMatrix.quat.multiply(this.rot, this.rot, qfill(q.slice(0,3)));}
	tproto.prototype.add_rotation_axan = function(ax, an){
		glMatrix.quat.multiply(this.rot, this.rot, quat_from_axan(ax, an));}
	tproto.prototype.clr_rotation = function(){
		this.rot.set([0,0,0,1]);}
	// torque quat
	tproto.prototype.set_torque_quat = function(q){
		this.trq.set(qfill(q.slice(0,3)));}
	tproto.prototype.set_torque_axan = function(ax, an){
		this.trq.set(quat_from_axan(ax, an));}
	tproto.prototype.add_torque_quat = function(q){
		glMatrix.quat.multiply(this.trq, this.trq, qfill(q.slice(0,3)));}
	tproto.prototype.add_torque_axan = function(ax, an){
		glMatrix.quat.multiply(this.trq, this.trq, quat_from_axan(ax, an));}
	tproto.prototype.clr_torque = function(){
		this.trq.set([0,0,0,1]);}
	// end set values */

	// mark object for removal
	tproto.prototype.infect = function(){
		this._tdata[53] = -1;
	};

	tproto.prototype.get_transform = function(){
		// TODO: check for shared transform
		let t = this._tdata.subarray(38, 54); // global transform
		if(1 == t[15] || -1 == t[15]) return t; // already filled or infected
		let p = this.parent_node.get_transform();
		let v = this.get_local_transform();
		// mat4.scalar.multiply(t, p, v);
		glMatrix.mat4.multiply(t, p, v);

		// glMatrix.quat.multiply(this.gorn, this.orn, this.parent_node.gorn);

		//*/
		// this.gpos[0] = this.pos[0]*(2*(+oz*ow-oy*ow-oy*oy-oz*oz+ox*oy+ox*oz)+px+1)
		// this.gpos[1] = this.pos[1]*(2*(+ox*ow-oz*ow-oz*oz-ox*ox+oy*oz+oy*ox)+py+1)
		// this.gpos[2] = this.pos[2]*(2*(+oy*ow-ox*ow-ox*ox-oy*oy+oz*ox+oz*oy)+pz+1)
		//
		/* calculated with transfom matrix
		let ox = this.parent_node.gorn[0];
		let oy = this.parent_node.gorn[1];
		let oz = this.parent_node.gorn[2];
		let ow = this.parent_node.gorn[3];
		let px = this.parent_node.gpos[0];
		let py = this.parent_node.gpos[1];
		let pz = this.parent_node.gpos[2];
		let vx = this.pos[0];
		let vy = this.pos[1];
		let vz = this.pos[2];

		// get global position from local and parent pos and orn
		let rx = vy*oz-vz*oy+ow*vx;
		let ry = vz*ox-vx*oz+ow*vy;
		let rz = vx*oy-vy*ox+ow*vz;

		this.gpos = [
			vx+px+2*(ry*oz-rz*oy),
			vy+py+2*(rz*ox-rx*oz),
			vz+pz+2*(rx*oy-ry*ox)
		]
		//*/

		return t;
	};

	// special transform for cameras
	this.cam_transform = function(){
		let t = this._tdata.subarray(38, 54); // global transform
		if(1 == t[15] || -1 == t[15]) return t; // already filled or infected
		let p = this.parent_node.get_transform();
		let v = this.get_local_transform();
		glMatrix.mat4.scalar.multiply(t, p, v);
		let tgt = this.target.get_transform();
		let up = this.up;

		let zAxis = norm3([t[12]-tgt[12], t[13]-tgt[13], t[14]-tgt[14]]);
		let xAxis = norm3([
			(zAxis[1] * up[2] - zAxis[2] * up[1]),
			(zAxis[2] * up[0] - zAxis[0] * up[2]),
			(zAxis[0] * up[1] - zAxis[1] * up[0])
		]);
		let yAxis = norm3([
			((zAxis[1] * up[0] - zAxis[0] * up[1]) * zAxis[1] - (zAxis[0] * up[2] - zAxis[2] * up[0]) * zAxis[2]),
			((zAxis[2] * up[1] - zAxis[1] * up[2]) * zAxis[2] - (zAxis[1] * up[0] - zAxis[0] * up[1]) * zAxis[0]),
			((zAxis[0] * up[2] - zAxis[2] * up[0]) * zAxis[0] - (zAxis[2] * up[1] - zAxis[1] * up[2]) * zAxis[1])
		]);
		t[0]  = xAxis[0];
		t[1]  = xAxis[1];
		t[2]  = xAxis[2];
		t[4]  = yAxis[0];
		t[5]  = yAxis[1];
		t[6]  = yAxis[2];
		t[8]  = zAxis[0];
		t[9]  = zAxis[1];
		t[10] = zAxis[2];
		return t;
	}

	tproto.prototype.get_local_transform = function(){
		return this._tdata.subarray(22, 38); // local transform
		let t = this._tdata.subarray(22, 38); // local transform
		if(1 == t[15] || -1 == t[15]) return t; // already filled or infected

		let
			px = this._tdata[1],
			py = this._tdata[2],
			pz = this._tdata[3],
			ox = this._tdata[10],
			oy = this._tdata[11],
			oz = this._tdata[12],
			ow = this._tdata[13];

		t[0]  = 1-2*oy*oy-2*oz*oz;
		t[1]  = 2*ox*oy-2*oz*ow;
		t[2]  = 2*ox*oz+2*oy*ow;
		t[3]  = 0;
		t[4]  = 2*ox*oy+2*oz*ow;
		t[5]  = 1-2*ox*ox-2*oz*oz;
		t[6]  = 2*oy*oz-2*ox*ow;
		t[7]  = 0;
		t[8]  = 2*ox*oz-2*oy*ow;
		t[9]  = 2*oy*oz+2*ox*ow;
		t[10] = 1-2*ox*ox-2*oy*oy;
		t[11] = 0;
		t[12] = px;
		t[13] = py;
		t[14] = pz;
		t[15] = 1;
		return t;
	};

	//*/
	// tproto.prototype.constructor = tproto;

	// expose for object node
	this.generate_proto = tproto;

	this.cycle_objects = [];


	this.cycle = function(ms){
		// cycle each registered object
		this.cycle_objects.forEach((obj)=>{
			obj && typeof obj.cycle === 'function' && obj.cycle(ms);
		})

		// NOTE: keep this identical to server code!
		// TODO: hack around webgl or use SIMD
		// TODO: update after frame-loss
		trajectory_buffer.forEach(function(tdata){
			if(-1 == tdata[53]) return; // marked for removal
			let pos = tdata.subarray( 1,  4), // attribute in GLSL/CL
				vel = tdata.subarray( 4,  7),
				acc = tdata.subarray( 7, 10),
				orn = tdata.subarray(10, 14),
				rot = tdata.subarray(14, 18),
				trq = tdata.subarray(18, 22);
				let t = ms/1000;

			// update position
			// let tmprot = Array.from(rot);
			// quat.multiply(rot, rot, trq);
			// rot = slerp(tmprot, rot, ms/1000);
			// tmprot = slerp(tmprot, rot, 0.5);
			// quat.slerp(rot, tmprot, rot, ms/1000);
			// quat.slerp(tmprot, tmprot, rot, 0.5);

			// update rotation
			let tmporn = [0,0,0,1];
			let nRot  = [0,0,0,1];
			glMatrix.quat.conjugate(nRot, rot);
			// quat.multiply(tmporn, orn, tmprot);
			// quat.multiply(tmporn, nOrn, tmprot);
			glMatrix.quat.multiply(tmporn, orn, rot);
			// quat.multiply(tmporn, tmporn, nRot);
			glMatrix.quat.slerp(orn, orn, tmporn, ms/1000);
			norm4(rot);
			norm4(orn);
			// update position
			// pos[0] += (vel[0] + acc[0]/2)*ms/1000;
			// pos[1] += (vel[1] + acc[1]/2)*ms/1000;
			// pos[2] += (vel[2] + acc[2]/2)*ms/1000;
			pos[0] += (vel[0]*t) + (acc[0]*t*t/2);
			pos[1] += (vel[1]*t) + (acc[1]*t*t/2);
			pos[2] += (vel[2]*t) + (acc[2]*t*t/2);
			vel[0] += acc[0]*ms/1000;
			vel[1] += acc[1]*ms/1000;
			vel[2] += acc[2]*ms/1000;
			// reset transform matrix
			tdata[37] = 0; // local
			tdata[53] = 0; // global
			// TODO: create transform right here

			let
				px = pos[0],
				py = pos[1],
				pz = pos[2],
				ox = orn[0],
				oy = orn[1],
				oz = orn[2],
				ow = orn[3];

			let local = tdata.subarray(22, 38); // local transform
			local[0]  = 1-2*oy*oy-2*oz*oz;
			local[1]  = 2*ox*oy-2*oz*ow;
			local[2]  = 2*ox*oz+2*oy*ow;
			local[3]  = 0;
			local[4]  = 2*ox*oy+2*oz*ow;
			local[5]  = 1-2*ox*ox-2*oz*oz;
			local[6]  = 2*oy*oz-2*ox*ow;
			local[7]  = 0;
			local[8]  = 2*ox*oz-2*oy*ow;
			local[9]  = 2*oy*oz+2*ox*ow;
			local[10] = 1-2*ox*ox-2*oy*oy;
			local[11] = 0;
			local[12] = px;
			local[13] = py;
			local[14] = pz;
			local[15] = 1;

		});
	};

	// remove all marked datasets
	this.flush = function(){
		// console.log('before: ' + trajectory_buffer);
		trajectory_buffer = trajectory_buffer.filter(function(traj){return (-1 != traj[53]);});
		// console.log('after: ' + trajectory_buffer);
	};

	input.set_keydown('KeyM',function(){console.log(trajectory_buffer)});

	function quat_from_axan(ax, an){
		let s2 = Math.sin(an/2);
		// return normalize([ax[0]*s2, ax[1]*s2, ax[2]*s2, Math.cos(an/2)]);
		// return [Math.cos(an/2), ax[0]*s2, ax[1]*s2, ax[2]*s2];
		return qfill([ax[0]*s2, ax[1]*s2, ax[2]*s2, 0]);
	}

	function slerp(q1, q2, t){

		let dot = quat.dot(q1, q2);

		// The angle between start must be acute. Since q and -q represent
		// the same rotation, negate q to get the acute angle.
		let neg = Math.sign(dot);
		dot = neg * dot;
		q2[0] = neg*q2[0];
		q2[1] = neg*q2[1];
		q2[2] = neg*q2[2];
		q2[3] = neg*q2[3];
		// console.log(dot);

		// dot > 0, as the dot product approaches 1, the angle between the
		// quaternions vanishes. use linear interpolation.
		if ((1.0 - dot) < 0.00001) {
			// console.log('lerping ' + q1.join());
			// return quat.lerp(r, q1, r, t);
			return q1;
		}

		// console.log('slerping ' + q1.join());

		let theta = Math.acos(dot);
		let result = [];
		let i = 4;
		while(i){
			i--;
			result[i] = (q1[i]*Math.sin((1 - t) * theta) + q2[i]*Math.sin(t * theta))/Math.sin(theta);
		}
		return result;
	}

	function norm3(val){
		let l = Math.sqrt(val[0]*val[0]+val[1]*val[1]+val[2]*val[2]);
		for(let k=0; k < 3;k++){
			val[k] /= l;
		}
		return val;
	};

	function norm4(val){
		let l = Math.sqrt(val[0]*val[0]+val[1]*val[1]+val[2]*val[2]+val[3]*val[3]);
		for(let k=0; k < 4;k++){
			val[k] /= l;
		}
		return val;
	}

	function qfill(val){
		val[3] = Math.sqrt(1-((val[0]*val[0])+(val[1]*val[1])+(val[2]*val[2])));
		return val;
	}

	this.report = console.log.bind(null, trajectory_buffer);
};

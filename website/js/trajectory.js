var trajectory_manager = new function(){
	"use strict";
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
	// TODO: add environmental acceleration
	let set_size = 64;

	let current_index = 0; // index after the last used set
	let array_type = Float32Array;

	let trajectory_buffer = [];

	// trajectory prototype, object node
	let tproto = function(args){
		// create new dataset
		// TODO: receive full dataset on creation
		let tdata = new array_type(set_size);
		tdata.fill(0);
		tdata[0] = current_index;
		current_index++;
		tdata[13] = tdata[17] = tdata[21] = 1;
		// TODO: test for number array
		args.pos && tdata.set(args.pos,  1);
		args.vel && tdata.set(args.vel,  4);
		args.acc && tdata.set(args.acc,  7);
		args.orn && tdata.set(norm4(args.orn), 10);
		args.rot && tdata.set(norm4(args.rot), 14);
		args.trq && tdata.set(norm4(args.trq), 18);
		args.prn && (this.parent_node = args.prn) && this.parent_node.add_child(this);
		trajectory_buffer.push(tdata);
		this._tdata = tdata;
		this.ready = 0
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
		set: function(args){this._tdata.set(qfill(args.slice(0,3)), 10);}
	});
	Object.defineProperty(tproto.prototype, 'rot', {
		get: function(){return this._tdata.subarray( 14,  18);},
		set: function(args){this._tdata.set(qfill(args.slice(0,3)), 14);}
	});
	Object.defineProperty(tproto.prototype, 'trq', {
		get: function(){return this._tdata.subarray( 18,  22);},
		set: function(args){this._tdata.set(qfill(args.slice(0,3)), 18);}
	});

	Object.defineProperty(tproto.prototype, 'gpos', {
		get: function(){return this._tdata.subarray( 55,  58);},
		set: function(args){this._tdata.set(args.slice(0,3), 55);}
	});
	Object.defineProperty(tproto.prototype, 'gorn', {
		get: function(){return this._tdata.subarray( 60, 64);},
		set: function(args){this._tdata.set(qfill(args.slice(0,3)), 60);}
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
		quat.multiply(this.orn, this.orn, qfill(q.slice(0,3)));}
	tproto.prototype.add_orientation_axan = function(ax, an){
		quat.multiply(this.orn, this.orn, quat_from_axan(ax, an));}
	tproto.prototype.clr_orientation = function(){
		this.orn.set([0,0,0,1]);}
	// rotation quat
	tproto.prototype.set_rotation_quat = function(q){
		this.rot.set(qfill(q.slice(0,3)));}
	tproto.prototype.set_rotation_axan = function(ax, an){
		this.rot.set(quat_from_axan(ax, an));}
	tproto.prototype.add_rotation_quat = function(q){
		quat.multiply(this.rot, this.rot, qfill(q.slice(0,3)));}
	tproto.prototype.add_rotation_axan = function(ax, an){
		quat.multiply(this.rot, this.rot, quat_from_axan(ax, an));}
	tproto.prototype.clr_rotation = function(){
		this.rot.set([0,0,0,1]);}
	// torque quat
	tproto.prototype.set_torque_quat = function(q){
		this.trq.set(qfill(q.slice(0,3)));}
	tproto.prototype.set_torque_axan = function(ax, an){
		this.trq.set(quat_from_axan(ax, an));}
	tproto.prototype.add_torque_quat = function(q){
		quat.multiply(this.trq, this.trq, qfill(q.slice(0,3)));}
	tproto.prototype.add_torque_axan = function(ax, an){
		quat.multiply(this.trq, this.trq, quat_from_axan(ax, an));}
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
		mat4.scalar.multiply(t, p, v);

		quat.multiply(this.gorn, this.orn, this.parent_node.gorn);
		// vec3 tmp = position + vertex + 2.0 * cross(cross(vertex, orientation.xyz) + orientation.w * vertex, orientation.xyz );
		/*
		out[0] = ay * bz - az * by;
		out[1] = az * bx - ax * bz;
		out[2] = ax * by - ay * bx;
		t1:
		(vy*oz-vz*oy)
		(vz*ox-vx*oz)
		(vx*oy-vy*ox)
		t2:
		(ow*vx)
		(ow*vy)
		(ow*vz)
		t3:
		(t1x+t2x)
		(t1y+t2y)
		(t1z+t2z)
		t4:
		(((vz*ox-vx*oz)+(ow*vy)) * oz - ((vx*oy-vy*ox)+(ow*vz)) * oy)
		(((vx*oy-vy*ox)+(ow*vz)) * ox - ((vy*oz-vz*oy)+(ow*vx)) * oz)
		(((vy*oz-vz*oy)+(ow*vx)) * oy - ((vz*ox-vx*oz)+(ow*vy)) * ox)

		(vz*ox-vx*oz+ow*vy) * oz - (vx*oy-vy*ox+ow*vz) * oy
		(vx*oy-vy*ox+ow*vz) * ox - (vy*oz-vz*oy+ow*vx) * oz
		(vy*oz-vz*oy+ow*vx) * oy - (vz*ox-vx*oz+ow*vy) * ox

		vz*ox*oz - vx*oz*oz + ow*vy*oz - vx*oy*oy + vy*ox*oy - ow*vz*oy
		vx*oy*ox - vy*ox*ox + ow*vz*ox - vy*oz*oz + vz*oy*oz - ow*vx*oz
		vy*oz*oy - vz*oy*oy + ow*vx*oy - vz*ox*ox + vx*oz*ox - ow*vy*ox
		t5:
		t4*2
		final:
		t5 + this.pos + this.parent_node.pos


		//*/
		// this.gpos[0] = this.pos[0]*(2*(+oz*ow-oy*ow-oy*oy-oz*oz+ox*oy+ox*oz)+px+1)
		// this.gpos[1] = this.pos[1]*(2*(+ox*ow-oz*ow-oz*oz-ox*ox+oy*oz+oy*ox)+py+1)
		// this.gpos[2] = this.pos[2]*(2*(+oy*ow-ox*ow-ox*ox-oy*oy+oz*ox+oz*oy)+pz+1)
		//
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
		/*
		let t1 = new Float32Array(3);
		let t2 = new Float32Array(3);
		let t3 = new Float32Array(3);
		let t4 = new Float32Array(3);
		let t5 = new Float32Array(3);
		vec3.cross(t1, this.pos, this.parent_node.gorn);
		vec3.scale(t2, this.pos, this.parent_node.gorn[3])
		vec3.add(t3, t2, t1);
		vec3.cross(t4, t3, this.parent_node.gorn);
		vec3.scale(t5, t4, 2);
		vec3.add(this.gpos, this.pos, t5);
		vec3.add(this.gpos, this.gpos, this.parent_node.gpos);
		//*/
		// get global position from local and parent pos and orn
		let rx = vy*oz-vz*oy+ow*vx;
		let ry = vz*ox-vx*oz+ow*vy;
		let rz = vx*oy-vy*ox+ow*vz;

		this.gpos = [
			vx+px+2*(ry*oz-rz*oy),
			vy+py+2*(rz*ox-rx*oz),
			vz+pz+2*(rx*oy-ry*ox)
		]
		// vec3.add(this.gpos, this.pos, this.parent_node.gpos);
		// console.log(this.gorn);


		return t;
	};

	// special transform for cameras
	this.cam_transform = function(){
		let t = this._tdata.subarray(38, 54); // global transform
		if(1 == t[15] || -1 == t[15]) return t; // already filled or infected
		let p = this.parent_node.get_transform();
		let v = this.get_local_transform();
		mat4.scalar.multiply(t, p, v);
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
		//*


		//*/


		return t;
	}

	tproto.prototype.get_local_transform = function(){
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

	this.cycle = function(ms){
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

			// update position
			let tmprot = Array.from(rot);
			quat.multiply(rot, rot, trq);
			// quat.slerp(rot, tmprot, rot, ms/1000);
			// quat.slerp(tmprot, tmprot, rot, 0.5);
			rot = slerp(tmprot, rot, ms/1000);
			tmprot = slerp(tmprot, rot, 0.5);

			// update rotation
			let tmporn = [0,0,0,1];
			quat.multiply(tmporn, orn, tmprot);
			quat.slerp(orn, orn, tmporn, ms/1000);
			norm4(rot);
			norm4(orn);
			// reset transform matrix
			tdata[37] = 0; // local
			tdata[53] = 0; // global
			// TODO: create transform right here
		});
	};

	// remove all marked datasets
	this.flush = function(){
		console.log('before: ' + trajectory_buffer);
		trajectory_buffer = trajectory_buffer.filter(function(traj){return (-1 != traj[53]);});
		console.log('after: ' + trajectory_buffer);
	};

	input.set_keydown('KeyM',function(){console.log(trajectory_buffer)});

	function quat_from_axan(ax, an){
		let s2 = Math.sin(an/2);
		// return normalize([ax[0]*s2, ax[1]*s2, ax[2]*s2, Math.cos(an/2)]);
		return qfill([ax[0]*s2, ax[1]*s2, ax[2]*s2, 0]);
	}

	function slerp(q1, q2, t){

		var dot = quat.dot(q1, q2);

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
		val[3] = Math.sqrt(1-(val[0]*val[0]+val[1]*val[1]+val[2]*val[2]));
		return val;
	}

	this.report = console.log.bind(null, trajectory_buffer);
};

console.log("loading space");

var input_rotate_cam = false;
// params
let hover_dist = 2; // distance (x size) at which units don't face direction when moving
let x = 0, y = 1, z = 2;

let gradTex = texture_manager.load_texture("rg.png") 
// actual inits and mechanics go here
var sh1 = new scene_head(); //create scene head
var units = [];
let select_dist = 10;
let rOffset = 0;
let lOffset = 0;
let shift = false; // shift-key
let ctrl = false;
let groups = [];

//* ship 1
class Spaceship{
	#my_object; // base position
	#my_vertical; //vertical rotation
	#my_model;
	#my_selector;
	#my_plume;
	#my_default_target;
	#selected;
	constructor(args){
		this.name = args.name || "some ship";
		this.max_speed = args.max_speed || 10;
		this.max_acc = args.max_acc || 1;
		this.size = args.size || 4;
		this.#my_object = new object_node({
			prn: sh1,
			pos: args.pos || [0,0,0],
			vel: args.vel || [0,0,0],
			orn: args.orn || [0, 0, 0, 1]
		});
		this.#my_vertical = new object_node({
			prn: sh1,
			pos: args.pos || [0,0,0],
			vel: args.vel || [0,0,0],
			orn: args.orn || [0, 0, 0, 1]
		});
		this.#my_model = new model_node({
			prn: this.#my_object,
			file: 'Vulture.obj',
			scale: [1, 1, 1]
		})
		this.#my_selector = new model_node({
			prn: this.#my_object,
			file: "selector.obj",
			visible: false,
			scale: [this.size, this.size, this.size]
		})
		this.#my_default_target = new object_node({
			prn: sh1,
			pos: args.pos || [0,0,0],
			vel: args.vel || [0,0,0],
			orn: args.orn || [0, 0, 0, 1]
		})
		this.#my_plume = new object_node({
			prn: this.#my_object,
			pos: [0, 0, 0],
			orn: [0, 0, 0, 1]
		})
		this.#my_plume.draw = grafx.generate_particle_render_function(gradTex, 2);
		this.#my_plume.is_particle_node = true;
		this.#my_plume.visible = false;
		this.#my_object.size = 4;
		// this.#my_selector.args.scale = [4, 1, 4];
		
		// this.cycle = cycle;
		trajectory_manager.cycle_objects.push(this);
		this.selected = false;
		this.status = 5;
		units.push(this);
		this.target = this.#my_default_target;
			
	}

	// relay position
	get pos(){return this.#my_object.pos;}
	get gpos(){return this.#my_object.gpos;}
	set selected(stat){
		this.#selected = !!stat;
		this.#my_selector.visible = !!stat;
	}
	get selected(){return this.#selected}

	get_object(){
		return this.#my_object; // required for selecting
	};
	select(stat){
		if(stat)console.log(this.name, "selected");
		this.selected = stat;
		this.#my_selector.visible = stat;
	};
	set_default_target(){
		// TODO: set pos and orn
		this.#my_default_target.pos = this.#my_object.pos;
		this.#my_default_target.orn = this.#my_object.orn;

		this.#my_default_target.vel = [0,0,0];
		this.#my_default_target.acc = [0,0,0];
		this.#my_default_target.rot = [0,0,0,1];

		// this.target = this.#my_default_target;
	};
	set_target_pos(pos){
		this.set_default_target;
		this.#my_default_target.pos = pos;
		console.log("set target pos")
	};
	cycle(ms){
		// console.log("cycling");
		if(!this.target || typeof this.target.get_transform !== 'function'){return}
		let ts = this.#my_object.get_transform();
		let tp = this.target.get_transform();
		// let s = ts.subarray(12, 15);
		// let p = tp.subarray(12, 15);
		// let s = this.#my_object.gpos;
		// let p = this.#my_object.target.gpos;
		// console.log(p);
		let s = [0,0,0]; // ship
		let p = [0,0,0]; // target
		let r = [0,0,0]; // relative point
	
		let its = glMatrix.mat4.create();
		glMatrix.mat4.invert(its, ts);
		glMatrix.vec3.transformMat4(s, s, ts);
		glMatrix.vec3.transformMat4(p, p, tp);
		glMatrix.vec3.transformMat4(r, p, its);
		let d = Math.sqrt((r[0]*r[0])+(r[1]*r[1])+(r[2]*r[2]));
		if(1>d){return;}
		r = [r[0]/d, r[1]/d, r[2]/d];


		let dir = [p[0]-s[0], p[1]-s[1], p[2]-s[2]];
		// let dir = [s[0]-p[0], s[1]-p[1], s[2]-p[2]];
		let dist = glMatrix.vec3.length(dir);
		let orn = [dir[0]/dist, dir[1]/dist, dir[2]/dist];
		// this.#my_object.set_acceleration([orn[0]/1, orn[1]/1, orn[2]/1]);
	
		if(dist > hover_dist * this.size){ // too far to just casually hover there

			if(r[2] < 0.9){ // not even facing it
				this.#my_object.set_rotation_axan([0,1,0], -Math.sign(r[0]));
			}
			if(Math.abs(r[0]) < 0.1 && Math.abs(r[0]) > 0.01){ // almost there
				this.#my_object.set_rotation_axan([0,1,0], -r[0]/2);
				if(this.status == 2)	this.#my_plume.visible = true;
			}
			if(Math.abs(r[0]) < 0.01){
				this.#my_object.set_rotation_quat([0,0,0,1])
				if(this.status == 2)	this.#my_plume.visible = true;
			}
		} else {
			// TODO: check for orientation
			// otherwise casually hover there
		}
		// console.log("status", this.#my_object.vel, this.#my_object.acc);
		
		let vel = this.#my_object.vel;
		let v = glMatrix.vec3.length(vel);
		let b = glMatrix.vec3.normalize(glMatrix.vec3.create(), vel);
		// Math.sqrt((vel[0]*vel[0])+(vel[1]*vel[1])+(vel[2]*vel[2]))
		let a = this.max_acc; // de/acceleration
		// console.log(dist);
		
		if((dist && dist < 2)){ // not at destination
			// console.log("stopped", dist, this.#my_object.vel, v, this.#my_object.acc);
			this.#my_object.clr_acceleration();
			this.#my_object.set_velocity([0,0,0]);
			this.status = 5; // stopped
			// console.log("stopped", dist, this.#my_object.vel, v, this.#my_object.acc);
		} else {
			// console.log("accelerating", dist, this.#my_object.dist, v, orn, this.#my_object.acc);
			// console.log("ship, point: ", s, p)
			this.#my_object.set_acceleration([orn[0]*a,orn[1]*a,orn[2]*a]);
			this.status = 2; // accelerating
		
			if(this.status !=3 && v >= this.max_speed){ // not at destination and max speed
				this.#my_object.set_acceleration([0,0,0]);
				// console.log("max speed", dist, this.#my_object.dist, v, b);
				this.status = 3; // going
				this.#my_plume.visible = false;
			}
			if((2 == this.status || 3 == this.status) && v !=0 && dist && (dist < ((v*v)/(2*a)) || Math.abs(orn[0]-b[0]) > 0.1 || Math.abs(orn[1]-b[1]) > 0.1 || Math.abs(orn[2]-b[2]) > 0.1)){
				this.#my_object.set_acceleration([-orn[0]*a, -orn[1]*a, -orn[2]*a]);
				// console.log("decelerating", this.#my_object.acc, dist, v, b, a, orn);
				this.status = 4; // decelerating
				this.#my_plume.visible = false;
			}
		}
	}
	report(){
		console.log(this.#my_selector)
	}
}
let sp1 = new Spaceship({
	name: "sp1",
	pos: [0, 0, 0],
	orn: [0, 0, 0, 1],
	size: 4
})

new model_node({
	prn: sh1,
	file: "selector.obj",
	pos: [1, 1, 1]
})


//* CAMERA SETUP
// horizontal camera stick
let ch = new object_node({
	prn: sh1,
	pos: [0, 0, 0],
	orn: [0, 0, 0, 1]
}); // vertical camera stick
let cv = new object_node({
	prn: ch,
	pos: [0, 0, 0],
	orn: [0, 0, 0, 1]
}); // zoom stick
var cn = new object_node({
	prn: cv,
	pos: [0, 0, 100],
	orn: [0, 0, 0, 1]
}); // actual camera
var cm = new camera_node({
	prn: cn,
	pos: [0, 0, 0],
	orn: [0, 0, 0, 1],
	frame: [0, 0, 1, 1],
	target: ch
});
cm.draw_stars = true;

var nav_plane = new model_node({
	prn: ch,
	file: 'nav-plane.json'
});
nav_plane.args.scale = 5;
// need for transparent
nav_plane.is_model_node = false;
nav_plane.is_particle_node = true;



// tilt cam up a bit
cv.add_orientation_axan([1,0,0], degtorad * 60)
ch.add_orientation_axan([0,-1,0], degtorad * 30)



let circleTex = texture_manager.load_texture("circle.png") 
let emptyTex = texture_manager.load_texture("") 
var cc = new object_node({
	prn: sp1.get_object(),
	pos: [0, 0, 0],
	orn: [0, 0, 0, 1]
})
cc.draw = grafx.generate_billboard_render_function(circleTex, 4);
cc.is_model_node = true;
cc.visible = false; 

let f = new object_node({
	prn: sp1.get_object(),
	pos: [0, 0, 0],
	orn: [0, 0, 0, 1]
})
f.draw = grafx.generate_movement_indicator(sp1.get_object())
f.visible = false;
f.is_model_node = true;

// mouse moves camera
input.set_mousemove(1, function(x,y){
	ch.add_orientation_axan([0,1,0], x/100)
	cv.add_orientation_axan([1,0,0], y/100)
})

input.set_mousedown(1, function(event){
	let cpos = [event.clientX, event.clientY];
	gl_canvas = document.getElementById('local-canvas');
	let vpos;
	// let vpos = cm.get_position_on_screen(sp1);
	// console.log(vpos)
	// let posx = (vpos[0]+1)/2 * gl_canvas.clientWidth;
	// let posy = (-vpos[1]+1)/2 * gl_canvas.clientHeight;

	// console.log(x, y, posx, posy);

	// if(-100 < posx-x && posx-x < 100 && -100 < posy-y && posy-y < 100){
	// 	sp1.selected = true;
	// 	ee.visible = true;
	// } else {
	// 	sp1.selected = false;
	// 	ee.visible = false;
	// }

	if(shift){
		// console.log("shift");
		units.forEach((u)=>{
			vpos = cm.get_position_on_screen(u.get_object());
			u.selected = u.selected || glMatrix.vec2.dist(vpos, cpos) < select_dist;
		})
	}else{
		units.forEach((u)=>{
			vpos = cm.get_position_on_screen(u.get_object());
			u.selected = glMatrix.vec2.dist(vpos, cpos) < select_dist;
		})
	}
})

// camera zoom
input.set_mousewheel(0, function(y){
	cn.pos[2]+=y/100;
	nav_plane.args.scale = cn.pos[2]/20;
})


input.set_keydown('KeyR', ()=>{
	console.log("setting target");
	let p = cm.get_point_on_plane(); // absolute point
	let count = 0;
	let source = [0,0,0];
	let pos = [0,0,0];
	// sp1.dist = dist;

	units.forEach((u)=>{
		if(!u.selected)return;
		count ++;
		source[0] += u.pos[0];
		source[1] += u.pos[1];
		source[2] += u.pos[2];
	})

	source[0] /= count;
	source[1] /= count;
	source[2] /= count;

	units.forEach((u)=>{
		if(!u.selected)return;
		pos = [
			u.pos[0]-source[0]+p[0],
			u.pos[1]-source[1]+p[1],
			u.pos[2]-source[2]+p[2],
		]
		u.set_target_pos(pos);
	})


})

input.set_keydown("Shift", ()=>{shift = true;})
input.set_keyup("Shift",()=>{shift = false});
input.set_keydown("Control", ()=>{ctrl = true;})
input.set_keyup("Control",()=>{ctrl = false});


input.set_keydown('Digit1',()=>{
	if(ctrl){
		groups[1] = []
		units.forEach((u)=>{
			u.selected?groups[1].push(u):false;
		})
	} else {
		units.forEach((u)=>{u.selected = false;})
		groups[1].forEach((u)=>{u.selected = true;})
	}
});
input.set_keydown('Digit2',()=>{
	if(ctrl){
		groups[2] = []
		units.forEach((u)=>{
			u.selected?groups[2].push(u):false;
		})
	} else {
		units.forEach((u)=>{u.selected = false;})
		groups[2].forEach((u)=>{u.selected = true;})
	}
});
input.set_keydown('Digit3',()=>{
	if(ctrl){
		groups[3] = []
		units.forEach((u)=>{
			u.selected?groups[3].push(u):false;
		})
	} else {
		units.forEach((u)=>{u.selected = false;})
		groups[3].forEach((u)=>{u.selected = true;})
	}
});


input.set_keydown('KeyW',function(){
	let n = [0,0,0];
	let t = structuredClone(ch.get_transform());
	t[12]=t[13]=t[14] = 0;
	glMatrix.vec3.transformMat4(n, [0,0,-20], t)
	ch.set_velocity(n)});
input.set_keydown('KeyS',function(){
	let n = [0,0,0];
	let t = structuredClone(ch.get_transform());
	t[12]=t[13]=t[14] = 0;
	glMatrix.vec3.transformMat4(n, [0,0,20], t)
	ch.set_velocity(n)});
input.set_keyup('KeyW',function(){ch.set_velocity([0,0,0])});
input.set_keyup('KeyS',function(){ch.set_velocity([0,0,0])});

input.set_keydown('KeyA',function(){
	let n = [0,0,0];
	let t = structuredClone(ch.get_transform());
	t[12]=t[13]=t[14] = 0;
	glMatrix.vec3.transformMat4(n, [-20,0,0], t)
	ch.set_velocity(n)});
input.set_keydown('KeyD',function(){
	let n = [0,0,0];
	let t = structuredClone(ch.get_transform());
	t[12]=t[13]=t[14] = 0;
	glMatrix.vec3.transformMat4(n, [20,0,0], t)
	ch.set_velocity(n)});
input.set_keyup('KeyA',function(){ch.set_velocity([0,0,0])});
input.set_keyup('KeyD',function(){ch.set_velocity([0,0,0])});

input.set_keydown('KeyE', ()=>{f.visible = !f.visible;})
input.set_keydown('KeyB', ()=>{sp1.report();})
input.set_keydown('KeyT', ()=>{
	let t = sp1.target.gpos;
	let m = sp1.gpos;
	let dir = [t[0]-m[0], t[1]-m[1], t[2]-m[2]]; // direction
	let dist = Math.sqrt((dir[0]*dir[0])+(dir[1]*dir[1])+(dir[2]*dir[2]));
	let orn = [dir[0]/dist, dir[1]/dist, dir[2]/dist];
	console.log("t, m, dir, dist", t, m, dir, dist);

	let mv = [0,0,1]; // moving direction
	let tr = sp1.get_object().get_transform();
	// glMatrix.vec3.transformQuat(mv, mv, sp1.gorn);
	glMatrix.vec3.transformMat4(mv, mv, tr);
	let diffX = mv[0]-orn[0];
	let diffZ = mv[2]-orn[2];
	console.log("diffX, diffZ, orn, mv", diffX, diffZ, orn, mv);
	// console.log(sp1.gorn);

})


function load_ships_left(){
	lOffset += 5;
	new Spaceship({
		name: "left "+lOffset,
		pos: [lOffset, 0, 0],
		orn: [0, 0, 0, 1],
		size: 4
	})
}

function load_ships_right(){
	rOffset -= 5;
	new Spaceship({
		name: "right "+lOffset,
		pos: [rOffset, 0, 0],
		orn: [0, 0, 0, 1],
		size: 4
	})
}

function set_max_speed(event){
	sp1.max_speed = Number(event.data);
}

function set_select_dist(event){
	select_dist = Number(event.data);
}
let w1 = {
	name: 'buttons',
	width: '200px', height: '100px',
	top: '12px', left: '100px',
	title: 'Buttons',
	content: [
		// {	type: 'button',	icon: 'move', click: 'gui.toggle_bars'	},
		// {	type: 'button',	icon: 'refresh', click:	'setup.reload' },
		// {	type: 'button',	icon: 'gear', click: 'gui.save_settings' },
		{	type: 'button',	icon: 'left', click: load_ships_left },
		{	type: 'button',	icon: 'right', click: load_ships_right }
	]
};

let w2 = {
	name: 'Help',
	width: '400px', height: '150px',
	top: '12px', left: '400px',
	title: 'Help',
	content: [
		{type: 'text', text: "Welcome,"},
		{type: 'linebreak'},
		{type: 'text', text: "move the camera with WASD, create ships left and right with the arrow buttons, select ships with left mouse button, move selected ships to a position on the Y-plane with R" },
		{type: 'linebreak'},
		{type: 'text', text: "hold shift for multi-select, groups 1-3 are available, hold ctrl to assign"},
		{type: 'linebreak'},
		{type: 'text', text: "stepper changes select radius"},
		{type: 'number', min: 20, max: 200, step: 10, value: select_dist, click: set_max_speed}
	]
};

new gui.widget(w1);
new gui.widget(w2);

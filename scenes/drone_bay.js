console.log("loading drone hangar");

var input_rotate_cam = false;
// params
let hover_dist = 1; // distance (x size) at which units don't face direction when moving
let x = 0, y = 1, z = 2;

// let gradTex = texture_manager.load_texture("rg.png") 
// actual inits and mechanics go here
var sh1 = new scene_head(); //create scene head
var units = [];
let select_dist = 50;
let rOffset = 0;
let lOffset = 0;
let active_drone;
let waiting_drone;
let drones_total = 100;
let drones_queued = 20;
let drones = []

//* ship 1
class Drone{
	#my_object;
	#my_body;
	#my_obj_upper;
	#my_obj_lower;
	#my_doors_upper;
	#my_doors_lower;
	#status;
	#door_range = 0.5;
	#distance = 1.5;
	#complete = false;

	#statuses = {
		waiting: 1,
		arriving: 2,
		closed: 3,
		opening: 4, 
		open: 5,
		closing: 6,
		leaving: 7,
		flying: 8,
		queued: 9
	};
	constructor(args){
		this.name = args.name || "some drone";
		this.max_speed = args.max_speed || 10;
		this.max_acc = args.max_acc || 1;
		this.size = args.size || 2;
		this.#status = args.status || 2;
		let pos = [0,0,0];
		switch(this.#status){
			case 1: pos = [0,1*this.#distance,0]; console.log("waiting"); break;
			case 2:
			case 3:
			case 4:
			case 5:
			case 6: pos = [0,0,0]; this.#status = 3; console.log("closed"); break;
			default: pos = [0,2*this.#distance,0]; this.#status = 9; console.log("queued"); break;
		}
		this.#my_object = new object_node({
			prn: sh1,
			pos: pos,
			vel: [0,0,0],
			orn: [0, 0, 0, 1]
		});
		this.#my_body = new model_node({
			prn: this.#my_object,
			file: 'drone_body.obj',
			// file: 'drone.obj',
			// part: 'drone_body'
		})
		this.#my_obj_lower = new object_node({
			prn: this.#my_object,
			pos: [0,0,0],
			vel: [0,0,0],
			orn: [0, 0, 0, 1]
		});
		this.#my_doors_lower = new model_node({
			prn: this.#my_obj_lower,
			file: 'doors_lower.obj'
		})
		this.#my_obj_upper = new object_node({
			prn: this.#my_object,
			pos: [0,0,0],
			vel: [0,0,0],
			orn: [0, 0, 0, 1]
		});
		this.#my_doors_upper = new model_node({
			prn: this.#my_obj_upper,
			file: 'doors_upper.obj'
		})
		
		// this.cycle = cycle;
		trajectory_manager.cycle_objects.push(this);
			
	}

	report(){
		console.log(this.#my_body._mdata, this.#my_doors_lower._mdata, this.#my_doors_upper._mdata);
	}

	set_doors(stat){
		if(this.#status != 3 && this.#status != 5 ) return;
		this.#my_obj_upper.pos = [0, stat*this.#door_range];
		this.#my_obj_lower.pos = [0, -stat*this.#door_range];
		this.#status = 3 + 2*stat;
	}
	change_doors(comp){
		if(this.#status != 3 && this.#status != 5 ) return;
		this.#complete = comp;
		let stat = !this.#my_obj_upper.pos[1];
		this.#my_obj_upper.pos = [0, stat*this.#door_range];
		this.#my_obj_lower.pos = [0, -stat*this.#door_range];
		this.#status = 3 + 2*stat;
	}
	is_open(){
		return(this.#status == 5);
	}
	leave(){
		if(this.#status != 3) return;
		drones_queued -= 1;
		this.#my_object.vel = [0,-1,0];
		this.#status = 7;
	}
	next(){
		// closed to leaving
		if(this.#status == 3 && this.#complete) {// needs to be closed and complete
			this.#my_object.vel = [0,-2,0];
			this.#status = 7;
			return true;
		}
		// waiting to arriving
		if(this.#status == 1 && (active_drone?active_drone.can_leave():true )) {
			this.#my_object.vel = [0,-2,0];
			this.#status = 2;
			active_drone = this;
		}
		// queueing to waiting
		if(this.#status == 9 && (waiting_drone?waiting_drone.can_place():true)) {
			this.#my_object.vel = [0,-2,0];
			this.#status = 9; // keep status
			waiting_drone = this;
		}
	}
	can_leave(){ // can leave the place
		let can = (this.#status == 2 || (this.#status == 3 && this.#complete) || this.#status == 7);
		// console.log("can leave", this.#status, can);
		return can;
	}
	can_place(){ // can go from wait to active
		let can = this.#status == 2 || (this.#status == 1 && (active_drone?active_drone.can_leave():true));
		// console.log("can place", can);
		return can;
	}
	stat(){
		return this.#status;
	}

	get_object(){
		return this.#my_object; // required for selecting
	}
	cycle(ms){
		switch(this.#status){
			// arrived
			case 2: if(this.#my_object.pos[1]<0){
				this.#my_object.vel = [0,0,0];
				this.#my_object.pos = [0,0,0];
				this.#status = 3; // arrived
				if(waiting_drone == this)waiting_drone = false;
			}; break;
			// accelerating in flight
			case 7: if(this.#my_object.pos[1]<-1*this.#distance){
				this.#my_object.acc = [5,0,0];
				// this.#my_object.pos = [0,-1,0];
				this.#status = 8;
				this.#complete = false;
			}; break;
			// queuing up again
			case 8: if(this.#my_object.pos[0]>200){
				this.#my_object.acc = [0,0,0];
				this.#my_object.vel = [0,0,0];
				this.#my_object.pos = [0,2*this.#distance,0];
				this.#status = 9;
			}; break;
			// queue to wait
			case 9: if(this.#my_object.pos[1]<1*this.#distance){
				this.#my_object.acc = [0,0,0];
				this.#my_object.vel = [0,0,0];
				this.#my_object.pos = [0,1*this.#distance,0];
				this.#status = 1;
			}; break;
		}
		// Drone only moves down
	}
}


function setup(){

	console.log("setup")
	let gl_canvas = document.getElementById('local-canvas');


	for(let i = 0; i < 15; i++){
		drones.push(new Drone({
			name: "Drone "+i,
			status: 9
		}))
	}


	// let d2 = new object_node({
	// 	prn: sh1,
	// 	pos: [0,0,0],
	// 	vel: [0,0,0],
	// 	orn: [0, 0, 0, 1]
	// });
	// let d2m = new model_node({
	// 	prn: d2,
	// 	file: 'drone.obj',
	// 	part: 'drone_body'
	// })

	// let pl = new model_node({
	// 	prn: sh1,
	// 	file: 'battery_pack.obj'
	// })
	// pl.draw = grafx.get_billboard();

	function start(){
		drones_total = 100;
		drones_queued = 20;
		setTimeout(get_drones, 100);
	

	}

	function update_numbers(){
		let c_total = document.getElementById("num_total");
		let c_combat = document.getElementById("num_combat");
		let c_queued = document.getElementById("num_queued");
		c_total.value = drones_total;
		c_combat.value = drones_total-drones_queued;
		c_queued.value = drones_queued;
	}


	function get_drones(){
		if(drones_queued >= 20){
			drones_total -= 1;
		} else {
			drones_queued += 1;
		}
		update_numbers();

		setTimeout(get_drones, 20000 + Math.random()*10000);
	}
	function next_drone(){
		let left = false;
		drones.forEach((d)=>{
			let l = d.next();
			left ||= l;
		});
		if(left){
			battery1m.visible = false;
			battery2m.visible = false;
			shield1m.visible = false;
			shield2m.visible = false;
			drones_queued -= 1;
			update_numbers();
		}
	}

	function toggle_doors(){
		let complete = true;
		complete &&= battery1m.visible;
		complete &&= battery2m.visible;
		complete &&= shield1m.visible;
		complete &&= shield2m.visible;
		drones.forEach((d)=>{d.change_doors(complete);});
	}

	let battery1 = new object_node({
		prn: sh1,
		pos: [-.8,0,-.7],
		vel: [0,0,0],
		orn: [0, 0, 0, 1]
	});
	let battery1m = new model_node({
		prn: battery1,
		file: 'battery_pack.obj'
	})
	let battery2 = new object_node({
		prn: sh1,
		pos: [-.8,0,.7],
		vel: [0,0,0],
		orn: [0, 0, 0, 1]
	});
	let battery2m = new model_node({
		prn: battery2,
		file: 'battery_pack.obj'
	})
	let shield1 = new object_node({
		prn: sh1,
		pos: [.8,0,-.7],
		vel: [0,0,0],
		orn: [0, 0, 0, 1]
	});
	let shield1m = new model_node({
		prn: shield1,
		file: 'shield_pack.obj'
	})
	let shield2 = new object_node({
		prn: sh1,
		pos: [.8,0,.7],
		vel: [0,0,0],
		orn: [0, 1, 0, 0]
	});
	let shield2m = new model_node({
		prn: shield2,
		file: 'shield_pack.obj'
	})
	battery1m.visible = false;
	battery2m.visible = false;
	shield1m.visible = false;
	shield2m.visible = false;




	input.set_keydown('KeyE', toggle_doors)
	input.set_keydown('KeyR', next_drone)
	input.set_keydown('KeyT', ()=>{
		// cm.ghost = cm.ghost?false:battery1m;
		// console.log(active_drone.name);
		// drones.forEach((d)=>{console.log(d.stat());});
		// drones.push(new Drone({
		// 	name: "Drone 50",
		// 	status: 9
		// }))
	})

	// input.set_keydown('KeyY', ()=>{
	// 	if(active_drone && active_drone.is_open()){
	// 		battery1m.visible = true;
	// 	}
	// })
	// input.set_keydown('KeyU', ()=>{
	// 	if(active_drone && active_drone.is_open()){
	// 		battery2m.visible = true;
	// 	}
	// })
	// input.set_keydown('KeyH', ()=>{
	// 	if(active_drone && active_drone.is_open()){
	// 		shield1m.visible = true;
	// 	}
	// })
	// input.set_keydown('KeyJ', ()=>{
	// 	if(active_drone && active_drone.is_open()){
	// 		shield2m.visible = true;
	// 	}
	// })


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
		pos: [0, 0, 5],
		orn: [0, 0, 0, 1]
	}); // actual camera
	var cm = new camera_node({
		prn: cn,
		pos: [0, 0, 0],
		orn: [0, 0, 0, 1],
		target: ch
	});
	cm.draw_stars = true;

	let obj_b = [];
	let mod_b = [];
	let obj_s = [];
	let mod_s = [];

	for(let i=-2; i<4; i++){
		let b1 = new object_node({
			prn: cn,
			pos: [-2, i/2, -3],
			orn: [0, 0, 0, 1]
		});
		let b1m = new model_node({
			prn: b1,
			file: 'battery_pack.obj'
		});
		obj_b.push(b1);
		mod_b.push(b1m);
	}
	for(let i=-2; i<4; i++){
		let s1 = new object_node({
			prn: cn,
			pos: [2, i/2, -3],
			orn: [0, 1, 0, 0]
		});
		let s1m = new model_node({
			prn: s1,
			file: 'shield_pack.obj'
		});
		obj_s.push(s1);
		mod_s.push(s1m);
	}



	// tilt cam up a bit
	// cv.add_orientation_axan([1,0,0], degtorad * 60)
	// ch.add_orientation_axan([0,-1,0], degtorad * 30)

	// mouse moves camera
	input.set_mousemove(1, function(x,y){
		ch.add_orientation_axan([0,1,0], x/100)
	})

	input.set_mousedown(1, function(event){
		let cpos = [event.clientX, event.clientY];
		let vpos;


		if(active_drone && active_drone.is_open()){
			if(cn.gpos[2]<0){
				vpos = cm.get_position_on_screen(shield1);
				vpos[0] = (vpos[0]+1)/2 * gl_canvas.clientWidth;
				vpos[1] = (-vpos[1]+1)/2 * gl_canvas.clientHeight;
				shield1m.visible ||= glMatrix.vec2.dist(vpos, cpos) < select_dist;

				vpos = cm.get_position_on_screen(battery1);
				vpos[0] = (vpos[0]+1)/2 * gl_canvas.clientWidth;
				vpos[1] = (-vpos[1]+1)/2 * gl_canvas.clientHeight;
				battery1m.visible ||= glMatrix.vec2.dist(vpos, cpos) < select_dist;
			}


			if(cn.gpos[2]>0){
				vpos = cm.get_position_on_screen(shield2);
				vpos[0] = (vpos[0]+1)/2 * gl_canvas.clientWidth;
				vpos[1] = (-vpos[1]+1)/2 * gl_canvas.clientHeight;
				shield2m.visible ||= glMatrix.vec2.dist(vpos, cpos) < select_dist;

				vpos = cm.get_position_on_screen(battery2);
				vpos[0] = (vpos[0]+1)/2 * gl_canvas.clientWidth;
				vpos[1] = (-vpos[1]+1)/2 * gl_canvas.clientHeight;
				battery2m.visible ||= glMatrix.vec2.dist(vpos, cpos) < select_dist;
			}
		}
	})

	input.set_keydown('KeyA',function(){
		let n = [0,0,0];
		let t = structuredClone(ch.get_transform());
		t[12]=t[13]=t[14] = 0;
		glMatrix.vec3.transformMat4(n, [-20,0,0], t)
		ch.set_rotation_axan([0,1,0], 1);
	});
	input.set_keydown('KeyD',function(){
		ch.set_rotation_axan([0,-1,0], 1);
	});
	input.set_keyup('KeyA',function(){ch.clr_rotation()});
	input.set_keyup('KeyD',function(){ch.clr_rotation()});

	// input.set_keydown('KeyE', ()=>{f.visible = !f.visible;})


	function set_max_speed(event){
		// sp1.max_speed = Number(event.data);
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
			{	type: 'button',	icon: 'move', click: 'gui.toggle_bars'	},
			{	type: 'button',	icon: 'unlock', click:	toggle_doors },
			{	type: 'button',	icon: 'down', click: next_drone },
			{	type: 'button',	icon: 'play', click: start },
			{type: 'linebreak'},
			{type: 'text', text: "widgets|doors|next|start" },
		]
	};

	let w2 = {
		name: 'Help',
		width: '250px', height: '150px',
		top: '12px', left: '400px',
		title: 'Help',
		content: [
			{type: 'text', text: "You are under attack and must equip your drones with batteries and shield generators before sending them out. Open the doors with the unlock button and click into the openings on both sides, then close the doors and send them out with the down button. Press play to start combat!" }
		]
	};

	let w3 = {
		name: 'Drones',
		width: '150px', height: '150px',
		top: '12px', left: '650px',
		title: 'Drones',
		content: [
			{type: 'text', text: "drones total:"},
			{type: 'number', id: "num_total", min: 1, max: 200, step: 1, value: 0, disabled: true},
			{type: 'text', text: "drones in combat"},
			{type: 'number', id: "num_combat", min: 0, max: 200, step: 1, value: 0, disabled: true},
			{type: 'text', text: "drones in que"},
			{type: 'number', id: "num_queued", min: 0, max: 200, step: 1, value: 0, disabled: true}
		]
	};

	new gui.widget(w1);
	new gui.widget(w2);
	new gui.widget(w3);
}


var settings = {};
if(window.page_name){
	settings = JSON.parse(localStorage.getItem(page_name)|| "some site");
	// allow to set a default if there's nothing in the config
	settings.set_default = function(name, obj){
		this[name] = this[name] || obj;
	}

} else {
	settings.gui = {};
	settings.widgets = [];
}
settings.init = function(){
	this.track = function(){

	}
}


window.onload = async function() {
	// load settings
	// settings.init();
	// init stuff

	console.log("before")
	// js is too fast for the shaders to load properly
	await grafx.init();
	console.log("after")

	// grafx.init();
	input.init();

	// gui loads widgets from local storage
	gui.init();

	await setup();


	function setup_received(response){
		let d = document.getElementById("code_field");
		d.value = response;
	}

	function display_setup (){
		trajectory_manager.flush();
		scene_manager.flush();
		gui.flush();
		let d = document.getElementById("code_field");
		// console.log(d.value);
		eval(d.value)
		grafx.resize_canvas();
	}




	// setup();

	window.onresize=grafx.resize_canvas;
	grafx.resize_canvas();

};

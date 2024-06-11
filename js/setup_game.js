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

window.onload = function() {
	// load settings
	settings.init();
	// init stuff
	grafx.init();
	input.init();

	// gui loads widgets from local storage
	gui.init();

	let c = {
		name: 'code',
		width: '500px', height: '500px',
		top: '200px', left: '0px',
		title: 'Code',
		content: [
			{	type: 'dropdown',	options:[{option: "car.js", name:"car"}, {option: "plushy.js", name:"plushy"},{option: "bb.js", name:"spaceship"}], select:load_setup	},
			{	type: 'linebreak'},
			{	type: 'code',	lines: 20, columns: 50, text: 'something', id: "code_field"	},
			{	type: 'linebreak'},
			{	type: 'button',	icon: 'play', click: display_setup	},
			{	type: 'text',	text: 'button loads the scene'	}
		]
	};

	new gui.widget(c);
	get("scenes/car.js").then(setup_received);
	// settings.widgets.forEach(function(w){new gui.widget(w)});

	function load_setup (params){
		let t = params.target;
		let v = t.value;
		if(!v){return false;}
		get("scenes/" +v).then(setup_received);
	}

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

	window.onresize=grafx.resize_canvas;
	grafx.resize_canvas();

		var mn3;
	var cs; // camera stick
	var input_rotate_cam = false;
	// params

	let gradTex = texture_manager.load_texture("rg.png") 
	// actual inits and mechanics go here
	var sh1 = new scene_head(); //create scene head

	let sp1 = new object_node({
		prn: sh1,
		pos: [0, 0, 0],
		orn: [0, 0, 0, 1]
	})
	var mn1 = new model_node({
		prn: sp1,
		mdl: 'Vulture.obj'
	});

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
		pos: [0, 0, 10],
		orn: [0, 0, 0, 1]
	}); // actual camera
	var cm = new camera_node({
		prn: cn,
		pos: [0, 0, 0],
		orn: [0, 0, 0, 1],
		target: ch
	});

	// tilt cam up a bit
	cv.add_orientation_axan([1,0,0], degtorad * 30)
	ch.add_orientation_axan([0,-1,0], degtorad * 30)



	let circleTex = texture_manager.load_texture("circle.png") 
	var cc = new object_node({
		prn: sp1,
		pos: [0, 0, 0],
		orn: [0, 0, 0, 1]
	})
	cc.draw = grafx.generate_billboard_render_function(circleTex, 4);
	cc.is_model_node = true;
	cc.visible = false; 

	var dx = new object_node({
		prn: sp1,
		pos: [0, 0, -4],
		orn: [0, 0, 0, 1]
	})
	var dd = new object_node({
		prn: dx,
		pos: [0, 0, 0],
		orn: [0, 0, 0, 1]
	})
	dd.draw = grafx.generate_particle_render_function(gradTex, 2);
	dd.is_model_node = true;
	dd.visible = true; 



	// mouse moves camera
	input.set_mousemove(1, function(x,y){
		ch.add_orientation_axan([0,1,0], x/100)
		cv.add_orientation_axan([1,0,0], y/100)
	})

	input.set_mousedown(1, function(event){
		console.log(event);
		// let x = event.clientX;
		// let y = event.clientY;
		// let vpos = cm.get_position_on_screen(mn1);
		// console.log(x, y, vpos);
		// if((-100 < (vpos[0]-x) < 100) && (-100 < (vpos[1]-y) < 100)){
		// 	cc.visible = true;
		// }
	})

	// camera zoom
	input.set_mousewheel(0, function(y){cn.pos[2]+=y/300;})

	input.set_keydown('KeyW',function(){
		let n = [0,0,0];
		let t = structuredClone(ch.get_transform());
		t[12]=t[13]=t[14] = 0;
		vec3.transformMat4(n, [0,0,-5], t)
		ch.set_velocity(n)});
	input.set_keydown('KeyS',function(){
		let n = [0,0,0];
		let t = structuredClone(ch.get_transform());
		t[12]=t[13]=t[14] = 0;
		vec3.transformMat4(n, [0,0,5], t)
		ch.set_velocity(n)});
	input.set_keyup('KeyW',function(){ch.set_velocity([0,0,0])});
	input.set_keyup('KeyS',function(){ch.set_velocity([0,0,0])});

	input.set_keydown('KeyA',function(){
		let n = [0,0,0];
		let t = structuredClone(ch.get_transform());
		t[12]=t[13]=t[14] = 0;
		vec3.transformMat4(n, [-5,0,0], t)
		ch.set_velocity(n)});
	input.set_keydown('KeyD',function(){
		let n = [0,0,0];
		let t = structuredClone(ch.get_transform());
		t[12]=t[13]=t[14] = 0;
		vec3.transformMat4(n, [5,0,0], t)
		ch.set_velocity(n)});
	input.set_keyup('KeyA',function(){ch.set_velocity([0,0,0])});
	input.set_keyup('KeyD',function(){ch.set_velocity([0,0,0])});


};


var dtr = JSON.stringify(
[
	{
		name: 'buttons',
		width: '200px', height: '100px',
		top: '12px', left: '200px',
		title: 'Buttons',
		content: [
			{type: 'button', icon: 'move', click: gui.toggle_bars},
			{type: 'button', icon: 'gear', click: gui.save_settings}
		]
	},
	{
		name: 'websocket',
		width: '200px', height: '100px',
		top: '12px', left: '500px',
		title: 'Websocket',
		content: [
			{type: 'websocket'},
		]
	}
]
)
console.log(dtr);
console.log(JSON.parse(dtr));





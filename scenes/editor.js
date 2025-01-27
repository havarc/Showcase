function setup(){
	let mn3;
	let cs; // camera stick
	let input_rotate_cam = false;
	// params
	
	// actual inits and mechanics go here
	let sh1 = new scene_head(); //create scene head
	
	// every model needs a position parent
	let tn1 = new object_node({
		prn: sh1,
		pos: [0, 0, 0],
		orn: [0, 0, 0, 1]
	})
	let mn1 = new model_node({
		prn: tn1,
		file: 'car2.obj'
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
	let cn = new object_node({
		prn: cv,
		pos: [0, 0, 5],
		orn: [0, 0, 0, 1]
	}); // actual camera
	let cm = new camera_node({
		prn: cn,
		frame: [0.5, 0, 0.5, 0.5],
		target: tn1
	});

	let cpx = new object_node({
		prn: sh1,
		pos: [10, 0, 5],
		orn: [0, 0, 0, 1]
	}); // actual camera
	let cvx = new camera_node({
		prn: cpx,
		frame: [0, 0.5, 0.5, 0.5],
		target: tn1
	});
	
	let cpy = new object_node({
		prn: sh1,
		pos: [5, 10, 0],
		orn: [0, 0, 0, 1]
	}); // actual camera
	let cvy = new camera_node({
		prn: cpy,
		frame: [0.5, 0.5, 0.5, 0.5],
		target: tn1
	});
	
	let cpz = new object_node({
		prn: sh1,
		pos: [0, 0, 5],
		orn: [0, 0, 0, 1]
	}); // actual camera
	let cvz = new camera_node({
		prn: cpz,
		frame: [0, 0, 0.5, 0.5],
		target: tn1
	});
	
	
	// tilt cam up a bit
	ch.add_orientation_axan([1,0,0], degtorad * 30)
	ch.add_orientation_axan([0,-1,0], degtorad * 30)



	let w1 = {
		name: 'buttons',
		width: '200px', height: '100px',
		top: '12px', left: '100px',
		title: 'Buttons',
		content: [
			{	type: 'button',	icon: 'move', click: 'gui.toggle_bars'	},
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

let settings = {};
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

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
	settings.init();
	// init stuff
	await grafx.init();
	input.init();

	// gui loads widgets from local storage
	gui.init();

	let c = {
		name: 'code',
		width: '500px', height: '500px',
		top: '200px', left: '0px',
		title: 'Code',
		content: [
			{	type: 'dropdown',	options:[{option: "bb.js", name:"spaceship"}, {option: "car.js", name:"car"}], select:load_setup	},
			{	type: 'linebreak'},
			{	type: 'code',	lines: 20, columns: 50, text: 'something', id: "code_field"	},
			{	type: 'linebreak'},
			{	type: 'button',	icon: 'play', click: display_setup	},
			{	type: 'text',	text: 'button loads the scene'	}
		]
	};

	new gui.widget(c);
	get("scenes/bb.js").then(setup_received);
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

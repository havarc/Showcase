
var settings = JSON.parse(localStorage.getItem(page_name)) || {};
// allow to set a default if there's nothing in the config
settings.set_default = function(name, obj){
	this[name] = this[name] || obj;
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

	// run the env-specific setup
	setup();
	// gui loads widgets from local storage
	gui.init();

	window.onresize=resize_canvas;
	resize_canvas();

	function resize_canvas(){
		var width = gl_canvas.width = gl_canvas.clientWidth;
		var height = gl_canvas.height = gl_canvas.clientHeight;
		gl.viewport(0, 0, width, height);
		// TODO get cam from scene_manager
		scene_manager.change_viewport(width, height);
	}
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

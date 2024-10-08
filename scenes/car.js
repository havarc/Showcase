console.log("loading car");

var mn3;
var cs; // camera stick
var input_rotate_cam = false;
// params

// actual inits and mechanics go here
var sh1 = new scene_head(); //create scene head

// every model needs a position parent
var tn1 = new object_node({
	prn: sh1,
	pos: [0, 0, 0],
	orn: [0, 0, 0, 1]
})
var mn1 = new model_node({
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
var cn = new object_node({
	prn: cv,
	pos: [0, 0, 10],
	orn: [0, 0, 0, 1]
}); // actual camera
var cm = new camera_node({
	prn: cn,
	pos: [0, 0, 0],
	orn: [0, 0, 0, 1]
});


// tilt cam up a bit
ch.add_orientation_axan([1,0,0], degtorad * 30)
ch.add_orientation_axan([0,-1,0], degtorad * 30)

input.set_keydown('KeyF',function(){input_rotate_cam = !input_rotate_cam;});

// mouse moves camera
input.set_mousemove(1, function(x,y){
	ch.add_orientation_axan([0,1,0], x/100)
	cv.add_orientation_axan([1,0,0], y/100)
})

// camera zoom
input.set_mousewheel(0, function(y){cn.pos[2]+=y/300;})

// grafix functions
input.set_keydown('KeyI',grafx.lod_up);
input.set_keydown('KeyO',grafx.lod_down);
input.set_keydown('KeyK',function(){model_node.prototype.draw = model_node.prototype.draw_wireframe});
input.set_keydown('KeyL',function(){model_node.prototype.draw = model_node.prototype.draw_triangles});

// move the object around
input.set_keydown('KeyW',function(){
	let n = [0,0,0];
	let t = structuredClone(tn1.get_transform());
	t[12]=t[13]=t[14] = 0;
	vec3.transformMat4(n, [0,0,1], t)
	tn1.set_velocity(n)});
input.set_keydown('KeyS',function(){
	let n = [0,0,0];
	let t = structuredClone(tn1.get_transform());
	t[12]=t[13]=t[14] = 0;
	vec3.transformMat4(n, [0,0,-1], t)
	tn1.set_velocity(n)});
input.set_keyup('KeyW',function(){tn1.set_velocity([0,0,0])});
input.set_keyup('KeyS',function(){tn1.set_velocity([0,0,0])});
input.set_keydown('KeyA',function(){tn1.add_rotation_axan([0,1,0], 1)});
input.set_keydown('KeyD',function(){tn1.add_rotation_axan([0,1,0], -1)});
input.set_keyup('KeyA',function(){tn1.add_rotation_axan([0,1,0], -1)});
input.set_keyup('KeyD',function(){tn1.add_rotation_axan([0,1,0], 1)});


cm.target = tn1;

//automatic camera rotation
// ch.set_rotation_axan([0, 1, 0], 0.5);


let loffset = 0
let roffset = 0

function load_cars_left(){
	loffset += 2;
	var tn2 = new object_node({
		prn: sh1,
		pos: [loffset, 0, 0],
		orn: [0, 0, 0, 1]
	})
	var mn3 = new model_node({
		prn: tn2,
		file: 'car2.obj'
	});

}

function load_cars_right(){
	roffset -= 2;
	var tn2 = new object_node({
		prn: sh1,
		pos: [roffset, 0, 0],
		orn: [0, 0, 0, 1]
	})
	var mn3 = new model_node({
		prn: tn2,
		file: 'car2.obj'
	});

}

let w1 = {
	name: 'buttons',
	width: '200px', height: '100px',
	top: '12px', left: '100px',
	title: 'Buttons',
	content: [
		{	type: 'button',	icon: 'move', click: 'gui.toggle_bars'	},
		// {	type: 'button',	icon: 'refresh', click:	'setup.reload' },
		// {	type: 'button',	icon: 'gear', click: 'gui.save_settings' },
		{	type: 'button',	icon: 'left', click: load_cars_left },
		{	type: 'button',	icon: 'right', click: load_cars_right }
	]
};

let w2 = {
	name: 'Help',
	width: '200px', height: '150px',
	top: '12px', left: '400px',
	title: 'Help',
	content: [
		{	type: 'text', text: "Welcome, </br>Left click moves the camera around, wheel zooms. The 'arrows' button enable moving and resizing the Widgets, the 'left' and 'right' buttons spawn more cars.  WASD moves the first car around." },
	]
};

new gui.widget(w1);
new gui.widget(w2);

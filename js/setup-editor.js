// set page name for setting-autoloaders
var page_name = 'editor';

var ph = {};

var setup = function(){
  var mn3;
	var cs; // camera stick
	var input_rotate_cam = false;
	// params

	// actual inits and mechanics go here
	var sh1 = new scene_head(); //create scene head
	var mn1 = new model_node({
		prn: sh1,
		pos: [0, 0, 0],
		orn: [0, 0, 0, 1],
		mdl: 'testtri'
	});
  console.log(mn1);
	// var mn1n = new model_node({
	// 	prn: mn1,
	// 	pos: [0, 0, 0],
	// 	orn: [0, 0, 0, 1],
	// 	mdl: 'testtri_normals'
	// });
	let cv = new object_node({
		prn: sh1,
		pos: [0, 0, 0],
		orn: [0, 0, 0, 1]
	}); // camera stick
	let ch = new object_node({
		prn: cv,
		pos: [0, 0, 0],
		orn: [0, 0, 0, 1]
	}); // camera stick
	var cn = new camera_node({
		prn: ch,
		pos: [0, 0, 10],
		orn: [0, 0, 0, 1]
	}); // create camera

  ch.add_orientation_axan([1,0,0], 10)

	scene_manager.add_scene_head(sh1); // add scene head to camera for rendering
	// cn.scene_heads.push(sh1); // add scene head to camera for rendering
	// cameras.push(cn); // add cam to local cameras

	input.set_keydown('KeyF',function(){input_rotate_cam = !input_rotate_cam;});
	// input.set_keydown('KeyG',mn3.infect);
	// input.set_keydown('KeyH',sh1.flush);
	// input.set_keydown('KeyK',function(){console.log()});
	// input.set_mousedown(1, function(){cs.set_rotation([0,0]);});
	// input.set_mousedown(2, function(){console.log('buttons');});
	// input.set_mouseup(1, function(){cs.set_rotation([0,0.2]);});
	// console.log(cs);
	input.set_mousemove(1, function(x,y){
		cv.add_orientation_axan([0,1,0], x/100)
		ch.add_orientation_axan([1,0,0], y/100)
	})
  // input.set_keydown('KeyN',function(){cz.add_orientation_axan([0,0,1], Math.PI/100)});
	// input.set_keydown('KeyB',function(){cz.add_orientation_axan([0,0,1], -Math.PI/100)});
	input.set_mousewheel(0, function(y){cn.pos[2]+=y/300;})

	input.set_keydown('KeyI',model_manager.lod_up);
	input.set_keydown('KeyO',model_manager.lod_down);
	input.set_keydown('KeyK',function(){model_node.prototype.draw = model_node.prototype.draw_wireframe});
	input.set_keydown('KeyL',function(){model_node.prototype.draw = model_node.prototype.draw_triangles});


	cn.target = mn1;

	// cs.set_rotation_axan([0, 1, 0], 0.2);

	//* line draw test
	let lines = new Float32Array([
		0,0,0,
		10,0,0,
		0,0,0,
		0,10,0,
		0,0,0,
		0,0,10
	]);
	let lcolors = new Float32Array([
		1,0,0,1,
		0,0,0,0,
		0,1,0,1,
		0,0,0,0,
		0,0,1,1,
		0,0,0,0
	]);

	cn.create_lines(lines, lcolors, {});
  ph.reload = mn1.reload;

  // setup interface here
  // gui is loading everything from local storage after setup
  // localStorage.clear();
  // let widgets = JSON.parse(localStorage.getItem('editor_widgets'));
  // console.log(widgets);
  // if(!widgets || !widgets.length){
  //   console.log('no data');
  //   localStorage.setItem('editor_widgets', JSON.stringify({
  settings.set_default('gfx', {
      generate_model_normals: true,
      generate_edges: true,
  });
  settings.set_default('gui', {
      snapdist: 20
  });
  settings.set_default('widgets', [
    {
      name: 'buttons',
      width: '200px', height: '100px',
      top: '12px', left: '200px',
      title: 'Buttons',
      content: [
        {	type: 'button',	icon: 'move', click: 'gui.toggle_bars'	},
        // {	type: 'button',	icon: 'refresh', click:	'setup.reload' },
        {	type: 'button',	icon: 'gear', click:	'gui.save_settings' }
      ]
    },
    {
      name: 'websocket',
      width: '200px', height: '100px',
      top: '12px', left: '500px',
      title: 'Websocket',
      content: [
        {	type: 'websocket' },
      ]
    }
  ]);
}

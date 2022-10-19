var setup = function(){
  var mn3;
	var cs; // camera stick
	var input_rotate_cam = false;
	// params

  console.log('initializing scene graph');
  var sh1 = new scene_head(); //create scene head
  var mn1 = new model_node({
    prn: sh1,
    pos: [0, -2, 0],
    orn: [0, 0, 0, 1],
    mdl: 'simple'
  });
  var mn2 = new model_node({
    prn: sh1,
    pos: [-3.8, 0, -2],
    orn: [0.1, 0.2, 0, 0],
    mdl: 'test_objectxx'});
  mn3 = new model_node({
    prn: sh1,
    pos: [0, 4.2, -1.2],
    orn: [0, 0, 0, 1],
    mdl: 'test_objectxx'
  });
  let mn4 = new model_node({
    prn: mn3,
    pos: [0, -0.2, -3.2],
    orn: [0, 1, 0, 1],
    mdl: 'test_objectxx'
  });
  cs = new object_node({
    prn: sh1,
    pos: [0, 0, 0],
    orn: [0, 0, 0, 1]
  }); // camera stick
  let cz = new object_node({
    prn: cs,
    pos: [0, 0, 0],
    orn: [0, 0, 0, 1]
  }); // camera stick
  let cy = new object_node({
    prn: cz,
    pos: [0, 0, 0],
    orn: [0, 0, 0, 1]
  }); // camera stick
  let cx = new object_node({
    prn: cy,
    pos: [0, 0, 0],
    orn: [0, 0, 0, 1]
  }); // camera stick
  var cn = new camera_node({
    prn: cx,
    pos: [0, 0, 20],
    orn: [0, 0, 0, 1]
  }); // create camera
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
    cy.add_orientation_axan([0,1,0], x/100)
    cx.add_orientation_axan([1,0,0], y/100)
  })
  input.set_keydown('KeyN',function(){cz.add_orientation_axan([0,0,1], Math.PI/100)});
  input.set_keydown('KeyB',function(){cz.add_orientation_axan([0,0,1], -Math.PI/100)});
  input.set_mousewheel(0, function(y){cn.pos[2]+=y/3;})
  cn.target = cs;

  cs.set_rotation_axan([0, 1, 0], 0.2);
  // mn2.rot = [0, 0.5, 0, 1];
  mn3.rot = [0.5, 0.1, 0.2, 1];
  mn4.rot = [0.7, 0.2, 0, 1];

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


  new gui.widget({
    width: 200, height: 100,
    top: 12, left: 200,
    title: 'Buttons',
    content: [
      {	type: 'button',	icon: 'move', click: gui.toggle_bars	},
      {	type: 'button',	icon: 'move', click: gui.toggle_bars	},
    ]
  });
  new gui.widget({
    width: 200, height: 100,
    top: 12, left: 400,
    title: 'Websocket test',
    content: [
      {	type: 'websocket' },
    ]
  });
  // console.log(new gui.widget());
}

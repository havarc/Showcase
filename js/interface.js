"use strict";

var socket;

/**
 * @module gui
 * generates widgets, which contain buttons and various other elements
 */

// has to be var cuz JSON storage
var gui = new function(){
	// TODO: put canvas into widget?
	// TODO: put widget in front when focused
	// var container = document.getElementById('widget-container');
	let container = document.getElementById('main');
	let widget_buffer = new Map();
	let active_widget;
	let x_origin, y_origin; // movement origin
	let org_l, org_t, org_w, org_h; // widget origin
	let handle_style;
	let hsl, vsl; // snaplists
	let mm; // movement marker
	let snapdist = 10;

	// load config from localStorage
	// TODO: load from file/web
	this.init = function(){
		snapdist = settings.gui.snapdist || snapdist;
		container = document.getElementById('main');
		container.addEventListener('mouseup', c_onmouseup);
		// find handlebar css
		let ss = document.styleSheets[0].cssRules;
		for(let i=0; i<ss.length; i++){
			if('.widget-handle' == ss[i].selectorText)
			handle_style = ss[i].style;
		}

		// load widgets
		// let widgets = JSON.parse(localStorage.getItem(page_name));
		// console.log(widgets);
		settings.widgets.forEach(function(w){new gui.widget(w)});
	}

	//*
	this.save_settings = function(){
		let wlist = document.getElementsByClassName("widget");
		let t = [];
		// console.info(container.children);
		for(let e of wlist){
			// console.info(e);
			let s = {
				width: e.style.width,
				height: e.style.height,
				top: e.style.top,
				left: e.style.left,
				title: e.id,
				content: e.content
			};
			t.push(s);
		};
		localStorage.setItem(page_name + '_widgets', JSON.stringify(t));
	}
	//*/


	//* method for the settings
	widget_buffer.stringify = function(){
		let t = {};
		this.forEach(e => {
			// console.log(e);
			let s = {
				width: e.style.width,
				height: e.style.height,
				top: e.style.top,
				left: e.style.left,
				name: e.id,
				title: e.title,
				content: e.content
			};
			t[e.id] = s;
		});
		return t;
		// localStorage.setItem(page_name + '_widgets', JSON.stringify(t));
	}

	this.test = function(){
		console.log(widget_buffer.stringify());
		console.log(JSON.stringify(widget_buffer.stringify()));
	}
	//*/



	// widget prototype
	// TODO: fix div flow
	// TODO: add close button (and close websocket)
	this.widget = function(params){
		params = params || {};
		// console.log(params);

		// widget body
		let wdgt = document.createElement('div');
		wdgt.className = 'widget';
		wdgt.id = params.name;
		wdgt.title = params.title || "no title";
		// TODO: accept percentages
		wdgt.style.left = (params.left || '16px');
		wdgt.style.top = (params.top || '16px');
		wdgt.style.width = (params.width || '100px');
		wdgt.style.height = (params.height || '100px');
		// store content for localStorage
		wdgt.content = params.content || [];


		// widget title
		let t = document.createElement('div');
		t.className = 'widget-title';
		t.innerHTML = wdgt.title;
		t.addEventListener('mousedown', t_onmousedown);
		let e = document.createElement('div');
		// east handlebar
		e.className = 'widget-handle widget-east-handle';
		e.addEventListener('mousedown', e_onmousedown);
		// west handlebar
		let w = document.createElement('div');
		w.className = 'widget-handle widget-west-handle';
		w.addEventListener('mousedown', w_onmousedown);
		// north handlebar
		let n = document.createElement('div');
		n.className = 'widget-handle widget-north-handle';
		n.addEventListener('mousedown', n_onmousedown);
		// south handlebar
		let s = document.createElement('div');
		s.className = 'widget-handle widget-south-handle';
		s.addEventListener('mousedown', s_onmousedown);
		// content
		let c = document.createElement('div');
		c.className = 'widget-content';
		// creating content
		// TODO: append param.content if not array
		(params.content || []).forEach(function(elem){
			c.appendChild(gui['create_'+elem.type](elem));
			// makes gui extendable
		})


		wdgt.appendChild(w);
		wdgt.appendChild(e);
		wdgt.appendChild(n);
		wdgt.appendChild(t);
		wdgt.appendChild(c);
		wdgt.appendChild(s);
		// activate widget
		container.appendChild(wdgt);
		widget_buffer.set(wdgt.id, wdgt);
		return wdgt;
	}

	this.toggle_bars = function(){
		if('block' == handle_style.display)
			handle_style.display = 'none';
		else
			handle_style.display = 'block';
	}

	// draggable https://jsfiddle.net/tovic/Xcb8d/
	// TODO: add ghost at origin
	// TODO: use container instead of widget_buffer
	function setup_move(elem, evnt){
		evnt.preventDefault();
		// snapping
		hsl = [innerWidth, 0]; vsl = [0, innerHeight]
		widget_buffer.forEach((elem)=>{
			hsl.push(elem.offsetLeft);
			hsl.push(elem.offsetLeft + elem.offsetWidth);
			vsl.push(elem.offsetTop);
			vsl.push(elem.offsetTop + elem.offsetHeight);
		})
		hsl.sort();
		vsl.sort();

		active_widget = elem.parentElement;
		org_l = active_widget.offsetLeft;
		org_t = active_widget.offsetTop;
		org_w = active_widget.offsetWidth;
		org_h = active_widget.offsetHeight;
		x_origin = evnt.clientX;
		y_origin = evnt.clientY;
		container.addEventListener('mousemove',c_onmousemove);
	}

	// setup move
	function t_onmousedown(e) {
		setup_move(this, e);
		mm = 0;
		return false;
	}
	// setup resize
	function e_onmousedown(e) {
		setup_move(this, e);
		mm = 1;
		return false;
	}
	function w_onmousedown(e) {
		setup_move(this, e);
		mm = 2;
		return false;
	}
	function s_onmousedown(e) {
		setup_move(this, e);
		mm = 3;
		return false;
	}
	function n_onmousedown(e) {
		setup_move(this, e);
		mm = 4;
		return false;
	}
	// move mouse
	function c_onmousemove(e){
		// console.log(hsl, vsl);
		let x_rel = e.clientX - x_origin;
		let y_rel = e.clientY - y_origin;
		let adist = 0, bdist = snapdist,
			hselm = -1, vselm = -1;

		// active_widget.style.left		= (org_l + b_l*x_rel) + 'px';
		// active_widget.style.top		= (org_t + b_t*y_rel) + 'px';
		// active_widget.style.width	= (org_w + b_w*x_rel) + 'px';
		// active_widget.style.height	= (org_h + b_h*y_rel) + 'px';
		if(0 == mm || 2 == mm) active_widget.style.left		= (org_l + x_rel) + 'px';
		if(0 == mm || 4 == mm) active_widget.style.top		= (org_t + y_rel) + 'px';
		if(1 == mm) active_widget.style.width		= (org_w + x_rel) + 'px';
		if(2 == mm) active_widget.style.width		= (org_w - x_rel) + 'px';
		if(3 == mm) active_widget.style.height	= (org_h + y_rel) + 'px';
		if(4 == mm) active_widget.style.height	= (org_h - y_rel) + 'px';

		// horizontal
		let r = 0;
		let left = org_l + x_rel;
		let right = org_l + org_w + x_rel;
		// snap left
		if(0 == mm || 2 == mm)
			hsl.forEach((elem)=>{
				if((adist = Math.abs(elem-left)) < bdist){
					hselm = elem;
					bdist = adist;
				}
			});
		// snap right
		if(0 == mm || 1 == mm)
			hsl.forEach((elem)=>{
				if((adist = Math.abs(elem-right)) < bdist){
					hselm = elem;
					bdist = adist;
					r = 1;
				}
			});

		// reset for vertical
		adist = 0; bdist = snapdist;

		// vertical
		let b = 0;
		let top = org_t + y_rel;
		let bottom = org_t + org_h + y_rel;
		// snap top
		if(0 == mm || 4 == mm)
			vsl.forEach((elem)=>{
				if((adist = Math.abs(elem-top)) < bdist){
					vselm = elem;
					bdist = adist;
				}
			});
		// snap bottom
		if(0 == mm || 3 == mm)
			vsl.forEach((elem)=>{
				if((adist = Math.abs(elem-bottom)) < bdist){
					vselm = elem;
					bdist = adist;
					b = 1;
				}
			});

		// resizes the widget
		// don't ask how this works
		if(0 <= hselm){
			switch(mm){
				case 2: active_widget.style.width = org_w - hselm + org_l + 'px';
				case 0: active_widget.style.left = hselm - r*org_w + 'px'; break;
				case 1: active_widget.style.width = hselm - org_l + 'px'; break;
			}
		}
		if(0 <= vselm){
			switch(mm){
				case 4:	active_widget.style.height = org_h - vselm + org_t + 'px';
				case 0: active_widget.style.top = vselm - b*org_h + 'px'; break;
				case 3: active_widget.style.height = vselm - org_t + 'px'; break;
			}
		}

	}

	// end move/resize
	function c_onmouseup(){
		container.removeEventListener('mousemove', c_onmousemove);
		active_widget = null;
	}

	this.report = function(){
		console.log(widget_buffer);
	}
};

// widget content factory
// can be extended from outside

gui.create_text = function(params){
	params = params || {};
	let text = params.text;
	let d = document.createElement('div');
	d.className = 'text';
	d.innerHTML = text;
	return d;
}

gui.create_button = function(params){
	params = params || {};
	let btn = document.createElement('div');
	btn.className = 'button icon icon-' + (params.icon || 'list');
	btn.id = params.id || '';
	let clk = params.click;
	if(typeof clk !== 'function')
		clk = str2ref(clk);
	if(typeof clk !== 'function'){
		alert('function ' + clk + ' for button ' + params.icon + ' not found ');
	} else {
		btn.addEventListener('mousedown', clk)
	}
	return btn;
}

gui.create_websocket = function(params){
	params = params || {};
	// websocket handling
	var socket = new WebSocket("ws://localhost:4000");
	// TODO connection closed automatically on widget close
	// document.addEventListener("unload", socket.close);

	// input
	let f = document.createDocumentFragment();
	let input = document.createElement('input')
	input.className = 'ws';
	input.onkeydown = function(e){
		// console.log('hello input');
		if (e.code == 'Enter'){
			socket.send(this.value);
			this.value = '';
		}
		return true;
	};
	f.appendChild(input);

	// output
	let ws = document.createElement('div');
	ws.className = 'websocket';
	ws.addEventListener('mousedown', params.click)
	socket.onmessage = function(msg){
		ws.innerHTML += msg.data + '<br />';
		console.log(msg);
	}
	f.appendChild(ws);
	return f;
}

/**
 * @module input
 * manages keybinds and mousemovement
 */
const input = new function(){
	let cc; // cache the main mouse target
	this.init = function(){
		// keyboard is always caught by <body>
		document.body.onkeydown = key_down;
		document.body.onkeyup = key_up;
		// cc = document.body;
		// input is going to canvas only
		// TODO: adjust when canvas gets its own widget
		cc = document.getElementById('main');
		// mouse is caught by highest z-index
		// cc = document.getElementById('widget-container');
		// console.log(cc);
		// cc.addEventListener('onkeydown', key_down);
		// cc.addEventListener('onkeyup', key_up);
		cc.onmousedown = mouse_down;
		cc.onmouseup = mouse_up;
		cc.onmouseenter = mouse_enter;
		cc.onmouseleave = mouse_leave;
		cc.onmousemove = mouse_move;
		cc.onwheel = mouse_wheel;
	}

	// keyboard
	let keydown_events = new Map();
	let keyup_events = new Map();
	// handler functions
	// ignore error vs check if? it checks anyways, so what's the point?
	function key_down(evnt){
		// only act if the key has no target
		if(document.body == evnt.target){
			keydown_events[evnt.code] && keydown_events[evnt.code]();
			keydown_events[evnt.key] && keydown_events[evnt.key]();
		}
		return true;
	}
	function key_up(evnt){
		if(document.body == evnt.target){
			keyup_events[evnt.code] && keyup_events[evnt.code]();
			keyup_events[evnt.key] && keyup_events[evnt.key]();
		}
		return true;
	}

	// access functions
	// TODO: set a name between key and action for keybinding via cookies
	this.set_keydown = function(key, func){ keydown_events[key] = func; }
	this.set_keyup = function(key, func){ keyup_events[key] = func; }
	this.remove_keydown = function(key){ keydown_events.delete(key); }
	this.remove_keyup = function(key){ keyup_events.delete(key); }

	// mouse
	let mousedown_events = [];
	let mouseup_events = [];
	let mousemove_events = [];
	let mousewheel_events = [];
	let mstop = false;
	function mouse_down(evnt){
		mousedown_events[evnt.button] && mousedown_events[evnt.button]();
		mouseup_events[evnt.button] && (mstop = mouseup_events[evnt.button]);
		return true;
	}
	function mouse_up(evnt){
		mstop && mstop() && (mstop = false);
		return true;
	}
	function mouse_enter(evnt){
		// console.log('enter');
	}
	function mouse_leave(evnt){
		mstop && mstop() && (mstop = false);
		// console.log('leave');
		return true;
	}
	function mouse_move(evnt){
		mousemove_events[evnt.buttons] && mousemove_events[evnt.buttons](evnt.movementX, evnt.movementY);
		return true;
	}
	function mouse_wheel(evnt){
		mousewheel_events[evnt.buttons] && mousewheel_events[evnt.buttons](evnt.deltaY);
		return true
	}

	// mouse functions
	// TODO: add interface for buttons pressed
	this.set_mousedown = function(buttons, func){ mousedown_events[buttons] = func; }
	this.set_mouseup   = function(buttons, func){ mouseup_events[buttons] = func; }
	this.set_mousemove = function(buttons, func){ mousemove_events[buttons] = func; }
	this.set_mousewheel = function(buttons, func){ mousewheel_events[buttons] = func; }
	this.remove_mousedown = function(buttons){ mousedown_events.delete(buttons); }
	this.remove_mouseup   = function(buttons){ mouseup_events.delete(buttons); }
	this.remove_mousemove = function(buttons){ mousemove_events.delete(buttons); }
	this.remove_mousewheel = function(buttons){ mousewheel_events.delete(buttons); }

	this.report = function(){console.log(this);}
};

"use strict";

/**
 * @module shaders
 * loads and manages shaders
 * attached inputs are parsed and stored on the shader
 */
const shader_manager = new function(){
	let gl;
	let shader_cache = new Map(); // stored shaders

	/* subsystem for shader include files
	// currently only for fragment shader as vs won't have enough complexity
	var includes = function(){
		var self = {};

		var cache = new Map(); // include cache
		var queue = new Map(); // shaders still in request

		// request an include
		self.request = function(name){
			// queue.push(name);
			// todo: cache promises
			if(cache[name])	return resolve(cache[name]);
			if(!queue[name])
				queue[name] = get('shaders/' + name).then(include_received.bind(null, name));
			return queue[name];
		};

		function include_received(name, response){
			var shader = gl.createShader(gl.FRAGMENT_SHADER);
			gl.shaderSource(shader, response);
			gl.compileShader(shader);
			if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) === 0)
				alert('\n' + gl.getShaderInfoLog(shader));
			cache[name] = shader;
			queue.delete(name);
			return cache[name];
		}

		return self;
	}();
	//*/

	// public function for requesting a shader resource
	// returns a program with a 'ready' attribute that is set when the shader finished building
	this.request_shader = this.get_shader = function(name){
		if(!shader_cache.get(name) || !gl.isProgram(shader_cache.get(name)))
			return this.reload_shader(name);
		return shader_cache.get(name);
	};

	/**
	 * forces reload of a shader program
	 * @param {string} name 
	 * @returns compiled shader program with input locations attached
	 * TODO: unload shader if already loaded
	 */
	this.reload_shader = function(name){
		if(!gl){
			console.log("getting gl");
			gl = grafx.get_gl();
			console.log(gl)
		}
		// shader is build and set ready when all ajax is through
		let program = gl.createProgram(); // create the base object
		program.inputs = [];
		// program.ready = false; // flips when we're done
		program.name = name;
		// Promise stack to be resolved when everything is ready
		program.pstack = [];
		program.pstack.push(Promise.resolve(program));
		program.pstack.push(fetch(new Request(`shaders/${name}.vert`)).then(response => response.text()).then(vertex_shader_received));
		program.pstack.push(fetch(new Request(`shaders/${name}.frag`)).then(response => response.text()).then(fragment_shader_received));
		Promise.all(program.pstack).then(build_shader);

		shader_cache.set(name, program);
		return program;

		/**
		 * process vertex shader received
		 * @param {binary} vertex_shader_code
		 */
		 async function vertex_shader_received(vertex_shader_code){
			// test for main shader and extract includes
			let mainrx = /void\s+main\s*\((?:void)?\)\s*\{/gm;
			// mainrx.lastindex = 0;
			if(!mainrx.test(vertex_shader_code)){
				console.log('include shader recieved on main branch!');
				return;
			}

			// search for shader inputs
			let inputsrx = /^(in|uniform)\s+(float|vec1|vec2|vec3|vec4|mat2|mat3|mat4)\s+(\w+)/gm;
			let result;
			while(result = inputsrx.exec(vertex_shader_code))
				program.inputs.push(result);

			// compile
			let vshader = gl.createShader(gl.VERTEX_SHADER);
			gl.shaderSource(vshader, vertex_shader_code);
			gl.compileShader(vshader);
			if (gl.getShaderParameter(vshader, gl.COMPILE_STATUS) === 0)
				alert('\n' + gl.getShaderInfoLog(vshader));
			return vshader;
		}

		/**
		 * process fragment shader received
		 * @param {binary} fragment_shader_code
		 */
		 async function fragment_shader_received(fragment_shader_code){
			// test for main shader and extract includes
			let mainrx = /void\s+main\s*\((?:void)?\)\s*\{/gm;
			// mainrx.lastindex = 0;
			if(!mainrx.test(fragment_shader_code)){
				console.log('non-main shader recieved on main branch!');
				return;
			}

			/* look for #includes
			let rx = /^(#include)\s+(?:')(\w+\.c)(?:')|(?:")(\w+\.c)(?:")/gm;
			let rres = response;
			let result;
			while(result = rx.exec(response)){
				rres = rres.replace(result[0], ""); // remove the #include from the text
				let nm = result[2];
				// includes not yet supported
				program.pstack.push(includes.request(nm));
			}
			// program.reset_includes = program.includes.length;
			response = rres;
			// console.log(response);
			//*/

			// search for shader inputs
			let inputsrx = /^(uniform)\s+(float|vec1|vec2|vec3|vec4|mat2|mat3|mat4|sampler2D)\s+(\w+)/gm;
			let result;
			while(result = inputsrx.exec(fragment_shader_code))
				program.inputs.push(result);

			// create shader
			let fshader = gl.createShader(gl.FRAGMENT_SHADER);
			gl.shaderSource(fshader, fragment_shader_code);
			gl.compileShader(fshader);
			if (gl.getShaderParameter(fshader, gl.COMPILE_STATUS) === 0)
				alert('\n' + gl.getShaderInfoLog(fshader));
			return fshader;
		}

		/**
		 * build shader once all files are recieved
		 * @param {binary[]} stack 
		 */
		function build_shader(stack){
			// attach fragment includes
			//* not yet working
			while(stack.length > 3){ // frag includes
				let incl = stack.pop();
				gl.attachShader(program, incl);
				gl.deleteShader(incl);
			}
			//*/

			console.log('shader: ' + name);

			// attach fragment shader
			let fsx = stack.pop();
			gl.attachShader(program, fsx);
			gl.deleteShader(fsx);

			// attach vertex shader
			let vsx = stack.pop();
			gl.attachShader(program, vsx);
			gl.deleteShader(vsx);

			gl.linkProgram(program);
			if (!gl.getProgramParameter(program, gl.LINK_STATUS))
				alert('Could not initialise shaders ' + stack);

			// take the extracted attributes and uniforms
			// and attach their location to the final program
			let inputs = program.inputs;
			let result;
			let l;
			// attach attributes and uniforms
			while(result = inputs.pop()){
				switch(result[1]){ // attrib or uniform?
					case 'in':
						// todo: add matrix attribute handler (?)
						l = gl.getAttribLocation(program, result[3]);
						console.log('attribute: '+result[3]+','+l)
						if(0>l)break; // attribute is unused
						gl.vertexAttribPointer(l, +(result[2].charAt(result[2].length-1)), gl.FLOAT, false, 0, 0);
						gl.enableVertexAttribArray(l);
						program[result[3]] = l;
						break;
					case 'uniform':
						console.log('uniform: '+result[3]+','+l)
						l = gl.getUniformLocation(program, result[3]);
						if(!l && !l===0)break; // uniform is unused
						// and yes, uniform error is different from attribute
						program[result[3]] = l;
						break;
				}
				console.log(program);
			}

			// tidy up
			delete program.inputs;
			delete program.pstack;
			// do not delete program.includes! (required for shader directives)
		}
	};

	this.report = function(){console.log(shader_cache)};

	// deletes all shaders
	// TODO: properly unload all shaders
	this.cleanup = function(){
		//delete shader_programs;
		shader_cache = new Map();
	};

};

 // buffer cache
var texture_manager = function(){
	var self = {};
	var buffers = {};

	// creates a buffer from a stacked array, needs iOffset & iLength
	self.buffer_from_item_set = function(bufferdata, params){
		params = params || {};
		var item_offset = params.i_offset = params.i_offset || 0; // starting position within an item
		var item_length = params.i_length = params.i_length || 1;
		var buffer_offset = params.b_offset = params.b_offset || 0;
		var buffer_length = params.b_length = params.b_length || (bufferdata.length - buffer_offset);

		var b, bmax = buffer_offset + buffer_length, i, imax = item_offset + item_length, c=0;
		var bdata = new Float32Array(bmax * imax);
		for (b = buffer_offset; b < bmax; b++)
			for (i = item_offset; i < imax; i++){
				bdata[c++] = (bufferdata[b][i]);
		}

		return self.buffer(bdata, params);
	};

	// create a buffer from data
	// not passing bLength will pull all data from offset to end of buffer
	self.buffer = function(bufferdata, params){
		params = params || {};
		var item_offset = params.i_offset || 0;
		var item_length = params.i_length || 0;
		var item_size = params.i_size || 1;
		var buffer_offset = params.b_offset || 0;
		var buffer_length = params.b_length || (bufferdata.length - buffer_offset);
		var data_type = params.data_type || gl.FLOAT;

		var bid = 'BID' + Math.floor(Math.random()*99999);  // random buffer id, may derive from model/texture
		var t_buffer = gl.createBuffer();
		t_buffer.item_size = item_size;
		t_buffer.num_items = buffer_length;
		var bdata = new Float32Array(bufferdata, buffer_offset, buffer_length);

		gl.bindBuffer(gl.ARRAY_BUFFER, t_buffer);
		gl.bufferData(gl.ARRAY_BUFFER, bdata, gl.STATIC_DRAW);

		buffers[bid] = t_buffer;
		console.log('buffer '+bid+' created, items: '+t_buffer.num_items+', isize: '+t_buffer.item_size+', length: '+bdata.length);
		return bid;
	};

	self.set_attribute_buffer = function(pointer, bid, params){
		// todo: compare shader-atrribute size to buffer item size and console.error before the shader throws it
		gl.bindBuffer(gl.ARRAY_BUFFER, buffers[bid]);
		gl.vertexAttribPointer(pointer, buffers[bid].item_size, gl.FLOAT, false, 0, 0);
	};


	self.delete_buffer = function(bid){
		if(buffers[bid]){
			gl.deleteBuffer(buffers.bid);
			delete buffers.bid;
		}
	};

	// returns the proper gl-type from array-type
	function get_gl_type(arraytype){
		var glt;
		switch(arraytype){
			case(Float32Array): return gl.FLOAT;
			case(Uint8Array): return gl.UNSIGNED_BYTE;
		}
	}

	return self;
};

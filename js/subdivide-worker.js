// error margins for calculations
function EPSILON(value){
	return isNaN(value) || 0.0000001 > Math.abs(value);
}

// -- surface subdivision --
// TODO: optimize for vertex caching // done
// TODO: throw this into a webworker // done
// TODO: precalc num of vertices and use Float32Array // neccessary?
// TODO: skip flat triangles


// function generate_normal_render_data(data){
onmessage = function(e){
	let data = e.data;
	// console.log(e.data);
	let sdcnt = data.sdcnt;
	let response = e.data;

	let tl=data.triangle_index.length, tn=tl/3;
	let el=data.edge_index.length, en=el/2;
	let vl=data.vertex_data.length, vn=vl/3;
	// console.log(vn, en, tn);

	let textured = !!data.texture_data;

	// 3, +3=6, +9=15, +27=42+
	// 1,		2,		 5,		 14

	// 1, 1, 3, 10, 36
	// let new_vertex_count = Math.pow()
	// let new_edge_count = data.edge_index.length/2*Math.pow(3, sdcnt);
	// let new_triangle_count = data.triangle_index.length/3*Math.pow(4, sdcnt);

	// TODO: account for shared edges
	for(let l = 0; l<sdcnt; l++){
		vn += en; // each edge generates a vertice
		en *= 2; // each edge splits
		en += 3*tn; //each triangle generates 3 new edges
		tn *= 4; //each triangle splits into 4
	}

	// TODO: shorten caches for duplicate edges
	let vertex_cache = new Float32Array(vn*3);
	vertex_cache.set(data.vertex_data);
	let vertex_cache_index = data.vertex_data.length;

	let normal_cache = new Float32Array(vn*3);
	normal_cache.set(data.normal_data);
	let normal_cache_index = data.normal_data.length;

	let texture_cache = new Float32Array(vn*2);
	let color_cache = new Float32Array(vn*4);
	let data_cache_index = 0;
	if(textured){
		texture_cache.set(data.texture_data);
		data_cache_index = data.texture_data.length;
	} else {
		color_cache.set(data.color_data);
		data_cache_index = data.color_data.length;
	}

	// let vertex_cache = data.vertex_data;
	// let normal_cache = data.normal_data;
	// let color_cache = data.color_data;

	let v0x, v0y, v0z, v1x, v1y, v1z;
	let n0x, n0y, n0z, n1x, n1y, n1z;
	let vfx, vfy, vfz, nfx, nfy, nfz, nfd;

	/*
		step 1: subdivide each edge and cache that data
		step 2: subdivide all triangles the usual way and use
			cached data from previous calculation

	//*/
	// cache all edges, then let triangles reconstruct from that
	let edge_index_cache = [];
	// console.log(edge_index_cache);
	// console.log(data.edge_index);
	// push incoming data as layer 0
	edge_index_cache.push(data.edge_index);
	// console.log(edge_index_cache);
	// cache all the triangles
	let triangle_index_cache = [];
	// console.log(triangle_index_cache);
	// push incoming as layer 0
	triangle_index_cache.push(new Uint16Array(data.triangle_index));

	// for(each subdivision)
	for(let l = 0; l<sdcnt; l++){
		// get previous edges
		let edges = edge_index_cache[l];
		// console.log(l, edges, edge_index_cache);
		// list of indices where the new vertex for each edge is located
		// let new_vertex_locations = new Uint16Array(edges.length);
		// new edges, length is uncertain
		let new_edge_cache = [];
		let current_index = vertex_cache_index/3;
		// for(each edge)
		for(let k = 0; k<edges.length/2; k++){
			let vi0 = edges[k*2+0];
			let vi1 = edges[k*2+1];

			//* vectors and normals
			v0x = vertex_cache[vi0*3+0];
			v0y = vertex_cache[vi0*3+1];
			v0z = vertex_cache[vi0*3+2];
			v1x = vertex_cache[vi1*3+0];
			v1y = vertex_cache[vi1*3+1];
			v1z = vertex_cache[vi1*3+2];
			n0x = normal_cache[vi0*3+0];
			n0y = normal_cache[vi0*3+1];
			n0z = normal_cache[vi0*3+2];
			n1x = normal_cache[vi1*3+0];
			n1y = normal_cache[vi1*3+1];
			n1z = normal_cache[vi1*3+2];
			//*/

			// TODO: run this twice and compare with EPSILON
			// subdivide();
			subdivide_flat();
			// ----------------- end -----------------

			// vertices
			vertex_cache[vertex_cache_index++] = vfx;
			vertex_cache[vertex_cache_index++] = vfy;
			vertex_cache[vertex_cache_index++] = vfz;

			// normals
			normal_cache[normal_cache_index++] = nfx/nfd;
			normal_cache[normal_cache_index++] = nfy/nfd;
			normal_cache[normal_cache_index++] = nfz/nfd;

			if(textured){
				// texture coordinates
				texture_cache[data_cache_index++] = (texture_cache[vi0*2+0] + texture_cache[vi1*2+0])/2.0;
				texture_cache[data_cache_index++] = (texture_cache[vi0*2+1] + texture_cache[vi1*2+1])/2.0;
			}else{
				// colors
				color_cache[data_cache_index++] = (color_cache[vi0*4+0] + color_cache[vi1*4+0])/2.0;
				color_cache[data_cache_index++] = (color_cache[vi0*4+1] + color_cache[vi1*4+1])/2.0;
				color_cache[data_cache_index++] = (color_cache[vi0*4+2] + color_cache[vi1*4+2])/2.0;
				// color_cache[color_cache_index++] = (color_cache[vi0*4+1] + color_cache[vi1*4+2])/2.0;
				// color_cache[color_cache_index++] = (color_cache[vi0*4+2] + color_cache[vi1*4+0])/2.0;
				// color_cache[color_cache_index++] = (color_cache[vi0*4+0] + color_cache[vi1*4+1])/2.0;
				color_cache[data_cache_index++] = 1.0;
			}

			// check lengths
			if(vertex_cache_index != normal_cache_index){
				console.error("u fck'd");
			}

			// push new edges
			new_edge_cache.push(vi0, current_index+k);
			new_edge_cache.push(current_index+k, vi1);

		} // end for each edge

		// console.log("done edges");

		// get previous triangles
		let triangles = triangle_index_cache[l];
		// new triangles, length is uncertain
		let new_triangle_cache = [];
		// for each triangle
		for(let i = 0; i<triangles.length;){
			let v0 = triangles[i++];
			let v1 = triangles[i++];
			let v2 = triangles[i++];
			let v01, v12, v20;
			v01=v12=v20=current_index;

			let b0 = 0, b1 = 0, b2=0;

			let k = edges.length;
			do {
				e1 = edges[--k];
				e0 = edges[--k];
				if((e0 == v0 && e1 == v1) || (e0 == v1 && e1 == v0)){
					v01+=k/2;b0++;
				};
				if((e0 == v1 && e1 == v2) || (e0 == v2 && e1 == v1)){
					v12+=k/2;b1++;
				};
				if((e0 == v2 && e1 == v0) || (e0 == v0 && e1 == v2)){
					v20+=k/2;b2++;
				};
			} while (k)

			// hope I only needed this once, see edge-filter
			// if(b0>1||b1>1||b2>1)console.error("found edge index twice", b0, b1, b2);

			new_edge_cache.push(v01, v12);
			new_edge_cache.push(v12, v20);
			new_edge_cache.push(v20, v01);

			new_triangle_cache.push(v0, v01, v20);
			new_triangle_cache.push(v01, v12, v20);
			new_triangle_cache.push(v12, v01, v1);
			new_triangle_cache.push(v20, v12, v2);

		} // end foreach triangle

		// console.log("done triangles");

		// console.log(new_edge_cache);
		// console.log(new_triangle_cache);
		edge_index_cache.push(new_edge_cache);
		triangle_index_cache.push(new Uint16Array(new_triangle_cache));

		// flatten the previous edge cache for wireframe display
		// edge_index_cache[l] = new Uint16Array(edge_index_cache[l].flat());
		// can't chain flat and typed array for some reason
		// let blob = edge_index_cache[l].flat();
		// edge_index_cache[l] = new Uint16Array(blob);
	} // end for each subdivision

	// flatten the last cache
	// remember when you could use array[-1] in python
	// let blobl = edge_index_cache.length-1;
	// edge_index_cache[blobl] = new Uint16Array(edge_index_cache[blobl].flat());
	// let blob = edge_index_cache[blobl].flat();
	// edge_index_cache[blobl] = new Uint16Array(blob);



	// response.name = data.name
	response.vertex_data=vertex_cache;
	response.normal_data=normal_cache;
	if(textured){
		response.texture_data=texture_cache;
	}else{
		response.color_data=color_cache;
	}
	response.triangle_index=triangle_index_cache;
	response.edge_index=edge_index_cache;

	// console.log("done all");
	// console.log(response);
	postMessage(response);
	// // return response;




	function subdivide_flat(){
		// center point
		vfx = (v0x+v1x)/2;
		vfy = (v0y+v1y)/2;
		vfz = (v0z+v1z)/2;
		nfx = (n0x+n1x)/2;
		nfy = (n0y+n1y)/2;
		nfz = (n0z+n1z)/2;
		nfd = Math.sqrt(nfx*nfx+nfy*nfy+nfz*nfz);
			// -------------------------------------------------- */

	}
}


	// GLSL trajectory hackaround
	attribute int index; // which set (y)
	attribute vec4 tPosition;		// x = 0
	attribute vec4 tVelocity;		// x = 1
	attribute vec4 tLAcceleration;	// x = 2
	attribute vec4 tOrientation;	// x = 3
	attribute vec4 tRotation;		// x = 4
	attribute vec4 tAAcceleration;	// x = 5
	
	uniform int frame_time

	varying vec3 dColor;

void main(void) {
	// rotation first as it has influence on acceleration
	// if lacc_time = 0 then t = ms
	// if 0 < lacc_time < ms then t = lacc_time
	// if ms < lacc_time then t = ms
	int aacc_ms = ms * !tdata.aacc_time + min(tdata.aacc_time, ms);

	// if lacc_time = 0 then t = ms -> -= 0
	// if 0 < lacc_time < ms then t = lacc_time -> -= t
	// if ms < lacc_time then t = ms -> -= t
	tdata.aacc_time -= (aacc_ms * !!tdata.aacc_time);
	// TODO: check case where lacc_time == ms!

	float frame_aacc_time = aacc_ms/1000.; // remaining lacc_time in s
	float aremaining_time = frame_time - frame_aacc_time; // time that lacc = 0 in s

//		tdata.orientation += frame_aacc_time * tdata.rotation + frame_aacc_time * frame_aacc_time * tdata.aacceleration /2;
//		tdata.rotation += frame_aacc_time * tdata.aacceleration;
	// if lacceleration lasts shorter than frame time then add the rest
//		tdata.orientation += aremaining_time * tdata.rotation;


	// if lacc_time = 0 then t = ms
	// if 0 < lacc_time < ms then t = lacc_time
	// if ms < lacc_time then t = ms
	unsigned int lacc_ms = ms * !tdata.lacc_time + min(tdata.lacc_time, ms);

	// if lacc_time = 0 then t = ms -> -= 0
	// if 0 < lacc_time < ms then t = lacc_time -> -= t
	// if ms < lacc_time then t = ms -> -= t
	tdata.lacc_time -= (lacc_ms * !!tdata.lacc_time);
	// TODO: check case where lacc_time == ms!

	float frame_lacc_time = lacc_ms/1000.; // remaining lacc_time in s
	float lremaining_time = frame_time - frame_lacc_time; // time that lacc = 0 in s

	for(int k; k < 3; k++){
		tdata.position[k] += frame_lacc_time * tdata.velocity[k] + frame_lacc_time * frame_lacc_time * tdata.lacceleration[k] /2;
		tdata.velocity[k] += frame_lacc_time * tdata.lacceleration[k];
		// if lacceleration lasts shorter than frame time then add the rest
		tdata.position[k] += lremaining_time * tdata.velocity[k];
	}

	vec4 coord = vpMatrix * mvMatrix * vec4(dPos, 1.);
	coord = coord/coord.w;
	// vec4 coord = vpMatrix * dPos;

	// gl_Position = vpMatrix * mvMatrix * vec4(coord, 1.);
	gl_Position = coord;
	gl_PointSize = 20./coord.z;
	dColor = vec3(1., 1., 1.);
	// dColor = vec3(1.0-highlight/1.,1.0-highlight/4.,1.0);

}
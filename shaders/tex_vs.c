// pi not defined in GLSL?!
#define M_PI 3.1415926535897932384626433832795
	// grid positions
	attribute float dPos;
	// attribute vec3 coordSet; // each corner has a different 1 set, representing them in the following mat3s

	varying float p;

void main(void) {
	// have the interpolator get texel coords to triangle coords
	p = dPos;
	gl_Position = vec4(dPos, 0.0, 0.0, 1.0);
}


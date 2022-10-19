// pi not defined in GLSL?!
#define M_PI 3.1415926535897932384626433832795

	precision mediump float;

	// uniform mat3 innerCPs;
	// uniform mat3 outerCPs;

	// varying vec3 dist;
	varying float p dist;
void main(void) {
	// just set the interpolated triangle coords onto the new texture
	// vec3 mp = (sin(dist*M_PI/2.)+1.)/6.;
	// vec3 coord = mp*innerCPs - mp*outerCPs;

	gl_FragData[0] = vec4(p, 1.-p, 0., 1.);
	// gl_FragColor = vec4(coord.x+coord.y+coord.z, 0., 1., 1.);
}

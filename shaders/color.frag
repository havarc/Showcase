#version 300 es
// #include 'test.c'

precision mediump float;

uniform vec3 u_reverseLightDirection;
uniform vec4 u_color;

in vec3 vNormal;
in vec4 vColor;
out vec4 outColor;

void main(void){
	// because v_normal is a varying it's interpolated
	// so it will not be a unit vector. Normalizing it
	// will make it a unit vector again
	vec3 normal = normalize(vNormal);
 
	// compute the light by taking the dot product
	// of the normal to the light's reverse direction
	float light = dot(normal, normalize(u_reverseLightDirection));
 
//	 outColor = u_color;
//	 outColor = vec4(0.72, 0.83, 0.85, 1);
	outColor = vColor;
 
	// Lets multiply just the color portion (not the alpha)
	// by the light
	// outColor.rgb *= light;
}

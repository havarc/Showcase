#version 300 es
// #include 'test.c'

precision mediump float;

uniform vec3 u_reverseLightDirection;
uniform vec4 u_color;

in vec3 vNormal;
in vec2 vTexture;
in vec4 iColor;

uniform sampler2D u_texture;

out vec4 outColor;

void main(void){
	// because v_normal is a varying it's interpolated
	// so it will not be a unit vector. Normalizing it
	// will make it a unit vector again
	// vec3 normal = normalize(vNormal);
 
	// compute the light by taking the dot product
	// of the normal to the light's reverse direction
	// float light = dot(normal, normalize(u_reverseLightDirection));
 
	vec4 smpl = texture(u_texture, vTexture);
	if(smpl.r < 0.1){
		discard;
	}
	outColor = iColor * smpl.r;

	// outColor = texture(u_texture, vTexture);
	// outColor = vec4(0.72, 0.83, 0.85, 1.0);
	// outColor = iColor;
 
	// Lets multiply just the color portion (not the alpha)
	// by the light
	// outColor.rgb *= light;
}

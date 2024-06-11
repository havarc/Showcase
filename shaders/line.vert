#version 300 es
// dab, dab
in vec3 vertex_data;
in vec4 color_data;

uniform mat4 rtMatrix;
uniform mat4 mvMatrix;
uniform mat4 vpMatrix;
uniform vec3 position;
uniform vec4 orientation;
uniform float scale;

out vec4 vColor;

void main(void){
//   gl_Position = vpMatrix * inverse(rtMatrix) * mvMatrix * vec4(vertex_data, 1.0);
	vec3 tmp = position + scale*vertex_data + 2.0 * cross( cross( scale*vertex_data, orientation.xyz) + orientation.w * scale*vertex_data, orientation.xyz);

	gl_Position = vpMatrix * inverse(rtMatrix) * vec4(-tmp, 1.0);
	vColor = vec4(color_data)/10.0;
}

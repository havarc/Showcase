#version 300 es
// pi not defined in GLSL
// #define M_PI 3.1415926535897932384626433832795
#define rotation(a) mat2(cos(a),sin(a),-sin(a),cos(a))
#define pi 3.14159265358979323846
#define divide(what, part) floor(what * part) / part

in vec3 vertex_data;
in vec3 normal_data;
in vec4 color_data;

uniform mat4 rtMatrix;
uniform mat4 mvMatrix;
uniform mat4 vpMatrix;
uniform vec3 position;
uniform vec4 orientation;

out vec3 vNormal;
out vec4 vColor;

void main(void){
	vec3 tmp = position + vertex_data + 2.0 * cross( cross( vertex_data, orientation.xyz ) + orientation.w * vertex_data, orientation.xyz );
	gl_Position = vpMatrix * inverse(rtMatrix) * vec4(-tmp, 1.0);
	// gl_Position = vpMatrix * rtMatrix * mvMatrix * vec4(vertex_data, 1.0);


	vNormal = inverse(mat3(rtMatrix)) * normal_data;

	vColor = color_data;
}

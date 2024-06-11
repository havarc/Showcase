#version 300 es
// pi not defined in GLSL
// #define M_PI 3.1415926535897932384626433832795
#define rotation(a) mat2(cos(a),sin(a),-sin(a),cos(a))
#define pi 3.14159265358979323846
#define divide(what, part) floor(what * part) / part

in vec2 vertex_data;
in vec2 texture_data;
in vec2 rel_pos;
in vec4 tColor;

uniform mat4 rtMatrix;
uniform mat4 mvMatrix;
uniform mat4 vpMatrix;
uniform vec3 position;
uniform vec4 orientation;
uniform float size;

out vec3 vNormal;
out vec2 vTexture;
out vec4 iColor;

void main(void){
	// vec3 tmp = position + vertex_data;
	// gl_Position = (vpMatrix * inverse(rtMatrix) * vec4(-tmp, 1.0)) + 0.2 * vec4(vertex_data, 0.0, 0.0);
	// gl_Position = vec4(0.5 * vertex_data, 0.0, 1.0);
	vec4 outpos = (vpMatrix * inverse(rtMatrix) * vec4(position,1.0)) + vec4(size * vertex_data, 0.0, 1.0);
	// outpos.z = 1.0f;
	// outpos.w /= outpos.w;
	gl_Position = outpos;
	// gl_Position = (vec4(-position,1.0)) + vec4(0.5 * vertex_data, 0.0, 1.0);
	// gl_Position = vpMatrix * rtMatrix * vec4(-tmp, 1.0);
	// gl_Position = vpMatrix * rtMatrix * mvMatrix * vec4(vertex_data, 1.0);

	vTexture = texture_data;
	// iColor = tColor;
	// vNormal =  inverse(mat3(rtMatrix)) * normal_data;
	// vColor = color_data;
}

#version 300 es
in vec3 a_position;
in vec3 a_normal;
in vec4 a_color;


uniform mat4 rtMatrix;
uniform mat4 vpMatrix;
uniform mat4 transform;
uniform vec3 position;
uniform vec4 orientation;

out vec3 v_normal;
out vec3 v_surfaceToView;
out vec4 v_color;

void main() {
	// vec3 tmp = position + a_position + 2.0 * cross( cross( a_position, orientation.xyz ) + orientation.w * a_position, orientation.xyz );
	// gl_Position = vpMatrix * inverse(rtMatrix) * vec4(-tmp, 1.0);

	vec4 position = transform * vec4(a_position, 1.0);
	gl_Position = vpMatrix * inverse(rtMatrix) * position;

	// v_surfaceToView = u_viewWorldPosition - worldPosition.xyz;
	v_normal = mat3(rtMatrix) * a_normal;
	// v_color = a_color;
}
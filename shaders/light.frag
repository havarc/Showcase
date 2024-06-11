#version 300 es
precision highp float;

in vec3 v_normal;
in vec3 v_surfaceToView;
in vec4 v_color;

uniform vec3 diffuse;
uniform vec3 ambient;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
uniform vec3 u_lightDirection;
uniform vec3 u_ambientLight;

out vec4 outColor;

void main () {
	vec3 normal = normalize(v_normal);

	// vec3 surfaceToViewDirection = normalize(v_surfaceToView);
	// vec3 halfVector = normalize(u_lightDirection + surfaceToViewDirection);

	// float fakeLight = dot(u_lightDirection, normal) * .5 + .5;
	// float specularLight = clamp(dot(normal, halfVector), 0.0, 1.0);

	// vec3 effectiveDiffuse = diffuse.rgb * v_color.rgb;
	// float effectiveOpacity = v_color.a * opacity;

	// outColor = vec4(
	// 	emissive +
	// 	ambient * u_ambientLight +
	// 	effectiveDiffuse * fakeLight +
	// 	specular * pow(specularLight, shininess),
	// 	effectiveOpacity);
	// outColor = vec4(1.0,1.0, 0.0, 1.0);
	// outColor = v_color;

	vec3 fake_light = normalize(vec3(1, 1, 1));
	float diffuse_factor = dot(fake_light, normal);

	outColor = vec4(ambient  + ambient * diffuse_factor, 1.0);
	// outColor = vec4(ambient * diffuse_factor, 1.0);
	// outColor = vec4(ambient, 1.0);
}
#version 300 es
// #include 'test.c'

precision mediump float;

uniform vec3 u_reverseLightDirection;
uniform vec4 u_color;

in vec3 vNormal;
in vec4 vColor;
out vec4 outColor;

void main(void){
	outColor = u_color;
}

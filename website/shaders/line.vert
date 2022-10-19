#version 300 es
// dab, dab
in vec3 vertex;
in vec4 color;

uniform mat4 rtMatrix;
uniform mat4 mvMatrix;
uniform mat4 vpMatrix;

out vec4 vColor;

void main(void){
  gl_Position = vpMatrix * inverse(rtMatrix) * mvMatrix * vec4(vertex, 1.0);
  vColor = vec4(color)/10.0;
}

#version 300 es

precision mediump float;
 
in vec2 vertex_data;
in vec2 texture_data;
 
out vec2 tPos;
 
void main(void) {
    // tPos = texture_data;
    gl_Position = vec4(vertex_data, 0.0, 1.0);
}

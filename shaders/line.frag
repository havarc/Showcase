#version 300 es
// something something

precision mediump float;

in vec4 vColor;
out vec4 FragColor;

void main(void){
  // gl_FragColor = vec4(0.0, 0.0, 0.0, 0.1);
  FragColor = vColor;
}

precision mediump float;

	// varying vec4 fColor;
void main(void) {
	float alpha = ceil(1.-length((gl_PointCoord-0.5)*2.0));
	gl_FragColor = vec4(gl_PointCoord, 1., alpha);
	// float alpha = ceil(1.-length((gl_PointCoord-0.5)*2.0));
	// gl_FragColor = fColor;
	// gl_FragColor = vec4(0., 1.0, 0., 1.0);
}


precision mediump float;

	varying vec3 dColor;

void main(void)
{
	// vec2 qCoord = vec2(gl_FragCoord.x/vscrDim.x, gl_FragCoord.y/vscrDim.y)*2.-1.;
	float alpha = 1.0-length((gl_PointCoord-0.5)*2.0);
	gl_FragColor = vec4(dColor, alpha);
	// gl_FragColor = vec4(qCoord, 0., alpha);
}
    
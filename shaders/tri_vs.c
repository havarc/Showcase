// pi not defined in GLSL?!
#define M_PI 3.1415926535897932384626433832795

	// grid positions
	// attribute vec3 coord;
	attribute vec3 coordSet; // u, v, w
	// attribute mat3 innerCPs;
	// attribute mat3 outerCPs;
	// attribute vec4 color;

	// highlight color, per model or per patch
	// uniform vec4 highlight;
	uniform mat3 corners;
	uniform mat3 normals;
	uniform mat4 vpMatrix;
	uniform mat4 mvMatrix;
	uniform float offset;
	uniform float sizer;

	// varying vec4 fColor;

void main(void) {
	// position calculation within the shader
	
	float u = coordSet[0];
	float v = coordSet[1];
	float w = coordSet[2];
	
	// planar impact point
	vec3 Pi = u*corners[0]+v*corners[1]+w*corners[2];
	
	// calculations for curved surface
	// triangle normal
	// vec3 tnorm = cross(vcorners[2]-vcorners[0], vcorners[1]-vcorners[0]);
	
	// trigonometric calculation
	vec3 P0 = corners[0]; vec3 N0 = normals[0];
	vec3 P0s = corners[1]*v/(v+w) + corners[2]*w/(v+w);
	float r0 = abs(distance(P0, P0s)/(dot(normalize(Pi-P0), N0)*2.));
	vec3 C0 = P0-(r0*N0);
	float s0 = sign(C0.z-(P0.z+P0s.z)/2.);
	float z0 = s0*sqrt(r0*r0-(Pi.x-C0.x)*(Pi.x-C0.x)-(Pi.y-C0.y)*(Pi.y-C0.y));
	vec3 Pt0 = vec3(Pi.xy, z0); // true impact point on arc0
	vec3 Nt0 = normalize(Pt0-C0); // normal at true impact point on arc0
	float nu = acos(dot(N0, normalize(Pt0-C0)))/acos(dot(N0, normalize((P0s-C0))));
	float mu = dot(N0, normalize(Pt0-C0))/dot(N0, normalize(P0s-C0));
	
	vec3 P1 = corners[1]; vec3 N1 = normals[1];
	vec3 P1s = corners[0]*u/(u+w) + corners[2]*w/(u+w);
	float r1 = abs(distance(P1, P1s)/(dot(normalize(Pi-P1), N1)*2.));
	vec3 C1 = P1-(r1*N1);
	float s1 = sign(C1.z-(P1.z+P1s.z)/2.);
	float z1 = s1*sqrt(r1*r1-(Pi.x-C1.x)*(Pi.x-C1.x)-(Pi.y-C1.y)*(Pi.y-C1.y));
	vec3 Pt1 = vec3(Pi.xy, z1); // true impact point on arc1
	vec3 Nt1 = normalize(Pt1-C1); // normal at true impact point on arc1
	float nv = acos(dot(N1, normalize(Pt1-C1)))/acos(dot(N1, normalize((P1s-C1))));
	float mv = dot(N1, normalize(Pt1-C1))/dot(N1, normalize(P1s-C1));
	
	vec3 P2 = corners[2]; vec3 N2 = normals[2];
	vec3 P2s = corners[0]*u/(u+v) + corners[1]*v/(u+v);
	float r2 = abs(distance(P2, P2s)/(dot(normalize(Pi-P2), N2)*2.));
	vec3 C2 = P2-(r2*N2);
	float s2 = sign(C2.z-(P2.z+P2s.z)/2.);
	float z2 = s2*sqrt(r2*r2-(Pi.x-C2.x)*(Pi.x-C2.x)-(Pi.y-C2.y)*(Pi.y-C2.y));
	vec3 Pt2 = vec3(Pi.xy, z2); // true impact point on arc2
	vec3 Nt2 = normalize(Pt2-C2); // normal at true impact point on arc2
	float nw = acos(dot(N2, normalize(Pt2-C2)))/acos(dot(N2, normalize((P2s-C2))));
	float mw = dot(N2, normalize(Pt2-C2))/dot(N2, normalize(P2s-C2));
	
	// true impact point on curved surface
	vec3 Pti = u*Pt0+v*Pt1+w*Pt2;
	// normal at true impact point (not sure y et)
	vec3 Nti = u*Nt0+v*Nt1+w*Nt2;
	gl_Position = vpMatrix * mvMatrix * vec4(Pi, 1.);
	gl_PointSize = 10.;
	
	// vec3 ng = flatten(vec3(nu, nv, nw));
	// nu = ng[0];
	// nv = ng[1];
	// nw = ng[2];
	float alpha = 1.;
	// if(u<0. || v<0. || w<0.){alpha = 0.;};
	if(nu<0. || nv<0. || nw<0.){alpha = 0.;};
	// gl_FragColor = vec4(u, v, w, alpha);
	// gl_FragColor = vec4(abs(Pti), alpha);
	// gl_FragColor = vec4(abs(Nti), alpha);
	// gl_FragColor = vec4(flatten(vec3(nu, nv, nw)), alpha);
	// gl_FragColor = vec4(flatten(vec3(1./nu, 1./nv, 1./nw)), alpha);
	// gl_FragColor = vec4(mu, mv, mw, alpha);
	// gl_FragColor = vec4(abs(normalize(Nti)), alpha);
	// gl_FragColor = vec4(qCoord,0., 1.);
	// gl_FragColor = vec4(vcorners[0].xy, 0., 1.);
	// gl_FragColor = vec4(0.,qCoord, 1.);
	// float alpha = ceil(1.-length((gl_PointCoord-0.5)*2.0));
	// gl_FragColor = fColor;
	// gl_FragColor = vec4(0., 1.0, 0., 1.0);

}


// pi not defined in GLSL?!
#define M_PI 3.1415926535897932384626433832795

	// grid positions
	// attribute vec3 coord;
	// attribute vec3 coordSet; // u, v, w
	attribute mat3 corners;
	// attribute vec3 corners0;
	// attribute vec3 corners1;
	// attribute vec3 corners2;
	attribute mat3 normals;
	// attribute vec3 normals0;
	// attribute vec3 normals1;
	// attribute vec3 normals2;
	// attribute vec4 color;

	// highlight color, per model or per patch
	// uniform vec4 highlight;
	// uniform mat3 innerCPs;
	// uniform mat3 outerCPs;
	uniform mat4 vpMatrix;
	uniform mat4 mvMatrix;
	uniform mat4 nMatrix;
	uniform vec2 scrDim;
	// uniform float offset;
	// uniform float sizer;

	varying vec4 fColor;
	varying mat3 vcorners;
	varying mat3 vnormals;
	varying vec2 vscrDim;
	// varying float d01;
	// varying float d12;
	// varying float d20;


void main(void) {
	vscrDim = scrDim;
	vec4 c0s = vpMatrix * mvMatrix * vec4(corners[0], 1.);
	vec4 c1s = vpMatrix * mvMatrix * vec4(corners[1], 1.);
	vec4 c2s = vpMatrix * mvMatrix * vec4(corners[2], 1.);
	// vec4 c0s = mvMatrix * vec4(corners[0], 1.);
	// vec4 c1s = mvMatrix * vec4(corners[1], 1.);
	// vec4 c2s = mvMatrix * vec4(corners[2], 1.);
	c0s = c0s/c0s.w;
	c1s = c1s/c1s.w;
	c2s = c2s/c2s.w;
	vcorners = mat3(c0s.xyz, c1s.xyz, c2s.xyz);
	
	// transform normals
	// get the start and end point of the normal, transform both, then substract to get the transformed normal
	vec4 n0s = vpMatrix * mvMatrix * vec4(corners[0]+normals[0], 0.);
	vec4 n1s = vpMatrix * mvMatrix * vec4(corners[1]+normals[1], 0.);
	vec4 n2s = vpMatrix * mvMatrix * vec4(corners[2]+normals[2], 0.);
	// vec4 n0s = mvMatrix * vec4(corners[0]+normals[0], 1.);
	// vec4 n1s = mvMatrix * vec4(corners[1]+normals[1], 1.);
	// vec4 n2s = mvMatrix * vec4(corners[2]+normals[2], 1.);
	n0s = n0s/n0s.w;
	n1s = n1s/n1s.w;
	n2s = n2s/n2s.w;
	// may need normalisation, may aswell need to be used as is
	// vnormals = mat3((n0s-c0s).xyz, (n1s-c1s).xyz, (n1s-c1s).xyz);
	// vnormals = mat3(normalize((n0s-c0s).xyz), normalize((n1s-c1s).xyz), normalize((n2s-c2s).xyz));
	vnormals = mat3(
		normalize((nMatrix * vec4(normals[0], 0.)).xyz), 
		normalize((nMatrix * vec4(normals[1], 0.)).xyz), 
		normalize((nMatrix * vec4(normals[2], 0.)).xyz));
	
	// d01 = distance(c0s.xy, c1s.xy);
	// d12 = distance(c1s.xy, c2s.xy);
	// d20 = distance(c2s.xy, c0s.xy);
	// vcorners = corners;
	// vec3 lower_bound = min(corners0, min(corners1, corners2));
	// vec3 upper_bound = max(corners0, max(corners1, corners2));
	vec4 lower_bound = min(c0s, min(c1s, c2s));
	vec4 upper_bound = max(c0s, max(c1s, c2s));
	// position calculation within the shader
	// linear, no normals
	// vec3 coord = innerCPs*coordSet;
	// vec3 coord = coordSet;
	
	// quadratic
	// vec3 outerMP = coordSet*coordSet;
	// vec3 innerMP = 2.*coordSet.yzx*coordSet.zxy;
	// vec3 coord = (innerCPs * innerMP)+(outerCPs * outerMP);
	
	// trigo ???
	// vec3 mp = normalize(sin(coordSet*M_PI/2.));// * coordSet -> spiky
	// vec3 imp = (1./2.+mp);
	// vec3 omp = (1./2.-mp);
	// vec3 coord = (innerCPs*imp + outerCPs*omp)/2.;
	
	// vec3 imp = offset+normalize(sin(coordSet*M_PI/2.));// * coordSet -> spiky
	// vec3 omp = offset-normalize(sin(coordSet*M_PI/2.));// * coordSet -> spiky
	// vec3 imp = (1./2.+mp);
	// vec3 omp = (1./2.+mp);
	// vec3 coord = (innerCPs*imp + outerCPs*omp)/sizer;
	// following should do real trigo surface with normals
	// vec3 in = innerCPs*coordSet;
	// vec3 norm = normals*(innerCPs*sin(coordSet*M_PI/2.));
	// vec3 coord = in+norm;
	
	fColor = vec4(1., 0., 1., 0.);
	// fColor = vec4(coordSet, 1.);
	// fColor = vec4(fract(coord), 1.);
	// fColor = color;
	
	// vec4 apx = vpMatrix * mvMatrix * vec4(coord, 1.);
	gl_Position = (upper_bound+lower_bound)/2.;
	// gl_Position = vpMatrix * mvMatrix * vec4(corners0, 1.);
	// gl_Position = vpMatrix * vec4(coord, 1.);
	float width = (upper_bound.x-lower_bound.x)*scrDim.x;
	float height = (upper_bound.y-lower_bound.y)*scrDim.y;
	// gl_PointSize = max(width, height)/2.;
	gl_PointSize = 200.;
}


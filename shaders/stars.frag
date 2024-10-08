#version 300 es

precision mediump float;

uniform vec2 iResolution;
uniform mat4 cameraPos;
out vec4 outColor;


// 3D Gradient noise from: https://www.shadertoy.com/view/Xsl3Dl
vec3 hash( vec3 p ) // replace this by something better
{
	p = vec3( dot(p,vec3(127.1,311.7, 74.7)),
			  dot(p,vec3(269.5,183.3,246.1)),
			  dot(p,vec3(113.5,271.9,124.6)));

	return -1.0 + 2.0*fract(sin(p)*43758.5453123);
}
float noise( in vec3 p )
{
    vec3 i = floor( p );
    vec3 f = fract( p );
	
	vec3 u = f*f*(3.0-2.0*f);

    return mix( mix( mix( dot( hash( i + vec3(0.0,0.0,0.0) ), f - vec3(0.0,0.0,0.0) ), 
                          dot( hash( i + vec3(1.0,0.0,0.0) ), f - vec3(1.0,0.0,0.0) ), u.x),
                     mix( dot( hash( i + vec3(0.0,1.0,0.0) ), f - vec3(0.0,1.0,0.0) ), 
                          dot( hash( i + vec3(1.0,1.0,0.0) ), f - vec3(1.0,1.0,0.0) ), u.x), u.y),
                mix( mix( dot( hash( i + vec3(0.0,0.0,1.0) ), f - vec3(0.0,0.0,1.0) ), 
                          dot( hash( i + vec3(1.0,0.0,1.0) ), f - vec3(1.0,0.0,1.0) ), u.x),
                     mix( dot( hash( i + vec3(0.0,1.0,1.0) ), f - vec3(0.0,1.0,1.0) ), 
                          dot( hash( i + vec3(1.0,1.0,1.0) ), f - vec3(1.0,1.0,1.0) ), u.x), u.y), u.z );
}

vec4 simplex(void)
{
    // Normalized pixel coordinates (from 0 to 1)
    vec2 xy = gl_FragCoord.xy/iResolution.xy;
	vec4 tCoord = inverse(cameraPos) * vec4(0.0, 0.0, 1.0, 1.0);
	vec3 dir = vec3(tCoord.xy+xy, tCoord.z);
	// vec4 tCoord = inverse(cameraPos) * vec4(xy, 0.0, 1.0);
	// vec3 dir = tCoord.xyz;
	// vec2 uv = tCoord.xy;


    
    // Stars computation:
    // vec3 stars_direction = normalize(vec3(uv * 2.0f - 1.0f, 1.0f)); // could be view vector for example
    vec3 stars_direction = normalize(dir); // could be view vector for example
	float stars_threshold = 8.0f; // modifies the number of stars that are visible
	float stars_exposure = 200.0f; // modifies the overall strength of the stars
	float stars = pow(clamp(noise(stars_direction * 20000.0f), 0.0f, 1.0f), stars_threshold) * stars_exposure;
	// stars *= mix(0.4, 1.4, noise(stars_direction * 100.0f + vec3(iTime))); // time based flickering
	
    // Output to screen
    return vec4(vec3(stars),1.0);
}


// variant 2
#define MAGIC_ANGLE 0.868734829276 // radians
const float warp_theta = MAGIC_ANGLE;
float tan_warp_theta = tan(warp_theta);

/* Bunch o' globals. */
const float farval = 1e5;
const vec3 tgt = vec3(0);
const vec3 cpos = vec3(0,0,4.0);
const int rayiter = 60;
const float dmax = 20.0;
vec3 L = normalize(vec3(-0.7, 1.0, 0.5));
mat3 Rview;
const float nbumps = 6.0;
const float bump_pow = 2.0;
const float bump_scale = 18.0;


/* Return a permutation matrix whose first two columns are u and v basis 
   vectors for a cube face, and whose third column indicates which axis 
   (x,y,z) is maximal. */
mat3 getPT(in vec3 p) {

    vec3 a = abs(p);
    float c = max(max(a.x, a.y), a.z);    
    vec3 s = c == a.x ? vec3(1.,0,0) : c == a.y ? vec3(0,1.,0) : vec3(0,0,1.);
    s *= sign(dot(p, s));
    vec3 q = s.yzx;
    return mat3(cross(q,s), q, s);

}

/* For any point in 3D, obtain the permutation matrix, as well as grid coordinates
   on a cube face. */
void posToGrid(in float N, in vec3 pos, out mat3 PT, out vec2 g) {
    
    // Get permutation matrix and cube face id
    PT = getPT(pos);
    
    // Project to cube face
    vec3 c = pos * PT;     
    vec2 p = c.xy / c.z;      
    
    // Unwarp through arctan function
    vec2 q = atan(p*tan_warp_theta)/warp_theta; 
    
    // Map [-1,1] interval to [0,N] interval
    g = (q*0.5 + 0.5)*N;
    
}


/* For any grid point on a cube face, along with projection matrix, 
   obtain the 3D point it represents. */
vec3 gridToPos(in float N, in mat3 PT, in vec2 g) {
    
    // Map [0,N] to [-1,1]
    vec2 q = g/N * 2.0 - 1.0;
    
    // Warp through tangent function
    vec2 p = tan(warp_theta*q)/tan_warp_theta;

    // Map back through permutation matrix to place in 3D.
    return PT * vec3(p, 1.0);
    
}


/* Return whether a neighbor can be identified for a particular grid cell.
   We do not allow moves that wrap more than one face. For example, the 
   bottom-left corner (0,0) on the +X face may get stepped by (-1,0) to 
   end up on the -Y face, or, stepped by (0,-1) to end up on the -Z face, 
   but we do not allow the motion (-1,-1) from that spot. If a neighbor is 
   found, the permutation/projection matrix and grid coordinates of the 
   neighbor are computed.
*/
bool gridNeighbor(in float N, in mat3 PT, in vec2 g, in vec2 delta, out mat3 PTn, out vec2 gn) {

    vec2 g_dst = g.xy + delta;
    vec2 g_dst_clamp = clamp(g_dst, 0.0, N);

    vec2 extra = abs(g_dst_clamp - g_dst);
    float esum = extra.x + extra.y;
 
    if (max(extra.x, extra.y) == 0.0) {
        PTn = PT;
        gn = g_dst;
        return true;
    } else if (min(extra.x, extra.y) == 0.0 && esum < N) {
        vec3 pos = PT * vec3(g_dst_clamp/N*2.0-1.0, 1.0 - 2.0*esum/N);
        PTn = getPT(pos);
        gn = ((pos * PTn).xy*0.5 + 0.5) * N;
        return true;	        
    } else {
        return false;
    }
    

}


/* Return squared great circle distance of two points projected onto sphere. */
float sphereDist2(vec3 a, vec3 b) {
	// Fast-ish approximation for acos(dot(normalize(a), normalize(b)))^2
    return 2.0-2.0*dot((a),(b));
}


/* From https://www.shadertoy.com/view/Xd23Dh */
vec3 hash3( vec2 p )
{
    vec3 q = vec3( dot(p,vec2(127.1,311.7)), 
                  dot(p,vec2(269.5,183.3)), 
                  dot(p,vec2(419.2,371.9)) );
    return fract(sin(q)*43758.5453);
}

/* Magic bits. */
void voronoi(in vec3 pos, in float N,
             out vec4 pd1, out vec4 pd2) {

    mat3 PT;
    vec2 g;

    // Get grid coords
    posToGrid(N, pos, PT, g);   
    
    pd1 = vec4(farval);
    pd2 = vec4(farval);

    // Move to center of grid cell for neighbor calculation below.
    g = floor(g) + 0.5;
    
    // For each potential neighbor
    for (float u=-1.0; u<=1.0; ++u) {
        for (float v=-1.0; v<=1.0; ++v) {
            
            vec2 gn;
            mat3 PTn;

            // If neighbor exists
            if (gridNeighbor(N, PT, g, vec2(u,v), PTn, gn)) {
                
                float face = dot(PTn[2], vec3(1.,2.,3.));
                
                // Perturb based on grid cell ID
                gn = floor(gn);
                vec3 rn = hash3(gn*0.123 + face);
                gn += 0.5 + (rn.xy * 2.0 - 1.0)*0.5;

                // Get the 3D position
                vec3 pos_n = normalize(gridToPos(N, PTn, gn));                
                
                vec4 pd = vec4(pos_n, sphereDist2(pos, pos_n));
                                                            
                // See if new closest point (or second closest)
                if (pd.w < pd1.w) {
                    pd2 = pd1;
                    pd1 = pd;
                } else if (pd.w < pd2.w) {
                    pd2 = pd;
                }
                
            }
        }
    }       

}





vec3 fakeBlackBody(float t) {
    
    return (t < 0.3 ?
            mix(vec3(1.0, 0.0, 0.0), vec3(1.0, 1.0, 0.0), t/0.3) :
            t < 0.7 ?
            mix(vec3(1.0, 1.0, 0.0), vec3(1.0), (t-0.3)/0.4) :
            mix(vec3(1.0), vec3(0.5, 0.5, 1.0), (t-0.7)/0.3));
    
}

vec3 star(vec4 pd, float scl) {
    
    vec3 rn = hash3(pd.xy+pd.z);
    vec3 k = 0.3*fakeBlackBody(rn.z) + 0.7;
                
    float s = exp(-sqrt(scl*pd.w/0.000004));

	float star_size = 1.0;
	float threshold = 5.0;
    return k*s*star_size*pow(rn.x,threshold);

}

vec3 stars(in vec3 rd, in float scl) {
    vec4 pd1, pd2;
    rd = normalize(rd);
    voronoi(rd, 50.0, pd1, pd2);    
    return star(pd1, scl) + star(pd2, scl);
}
    

vec3 get_color() {

    vec2 uv = (gl_FragCoord.xy - .5*iResolution.xy) * 2.5 / (iResolution.x);

    // vec3 rd = inverse(mat3(cameraPos))*normalize(vec3(uv, 1.));
    vec3 rd = (mat3(cameraPos))*normalize(vec3(uv, -1.));
    // vec3 rd = inverse(mat3(cameraPos))*normalize(vec3( 1., -uv.x, uv.y).xyz);

    return stars(rd.xyz, 3.);


}



void main(void){

	outColor = vec4(get_color(), 1.0);
}
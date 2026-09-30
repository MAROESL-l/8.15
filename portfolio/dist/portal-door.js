// Adapted from the portal geometry and shader in portal.html for the room scene.
export function createPortalDoor(THREE) {
  const group = new THREE.Group();
  const portal = new THREE.Group();
  portal.rotation.z = -.055;
  group.add(portal);

  const halfWidth = .59;
  const halfHeight = 1.22;
  const uniforms = { uTime: { value: 0 } };
  const surface = new THREE.Mesh(
    // Leave enough geometry outside the irregular edge to avoid a straight clipped side.
    new THREE.PlaneGeometry(halfWidth * 2.4, halfHeight * 2.4),
    new THREE.ShaderMaterial({
      uniforms,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float noise(vec2 p){
          vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
          return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),
                     mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);
        }
        float fbm(vec2 p){
          float v=0.,a=.5;
          for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec2(4.1,2.7);a*=.5;}
          return v;
        }
        void main(){
          vec2 p=(vUv-.5)*2.4;
          float r=length(p);
          float a=atan(p.y,p.x);
          float edge=1.0+.045*sin(a*5.0+.4)+.027*sin(a*9.0-1.1)+.02*sin(a*17.0+.8);
          float alpha=1.0-smoothstep(edge*.84,edge*.98,r);
          if(alpha<=.001) discard;
          float t=uTime*.42;
          // Integer angular turns keep both sides of atan's -PI/PI seam identical.
          float spiral=a*3.0-r*13.8-t*2.0;
          vec2 flow=vec2(cos(a+t*.18),sin(a+t*.18));
          float n=fbm(p*4.3+flow*(1.2+t*.45)+vec2(sin(spiral),cos(spiral))*.19);
          float n2=fbm(p*8.5-flow*t*.35+vec2(3.2,-1.3));
          float streak=sin(spiral+n*7.0)*.5+.5;
          float veins=sin(spiral*2.0+n2*10.0)*.5+.5;
          float whirl=sin(a*6.0-r*19.0-t*2.4+n*4.0)*.5+.5;
          float value=clamp(.12+.55*n+.35*streak+.19*whirl-.14*veins,0.,1.);
          vec3 deep=vec3(.007,.11,.075);
          vec3 emerald=vec3(.045,.56,.22);
          vec3 lime=vec3(.55,1.0,.2);
          vec3 cyan=vec3(.12,.95,.72);
          vec3 col=mix(deep,emerald,smoothstep(.12,.7,value));
          col=mix(col,lime,smoothstep(.59,.95,value)*.77);
          col=mix(col,cyan,smoothstep(.72,1.0,n2)*.32);
          float cracks=smoothstep(.76,.91,veins)*smoothstep(.36,.66,n);
          col*=1.0-cracks*.47;
          col+=vec3(.18,.45,.07)*pow(max(0.0,1.0-r),4.0);
          gl_FragColor=vec4(col,alpha);
        }
      `
    })
  );
  surface.position.z = 0;
  portal.add(surface);

  const light = new THREE.PointLight('#75ff80', 2.4, 2.8, 2);
  light.position.z = .35;
  group.add(light);
  return { group, uniforms, light };
}

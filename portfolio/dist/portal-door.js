// Adapted from the portal geometry and shader in portal.html for the room scene.
export function createPortalDoor(THREE) {
  const group = new THREE.Group();
  const portal = new THREE.Group();
  portal.rotation.z = -.055;
  group.add(portal);

  const halfWidth = .59;
  const halfHeight = 1.22;
  const edge = angle => 1 + .045 * Math.sin(5 * angle + .4)
    + .027 * Math.sin(9 * angle - 1.1)
    + .02 * Math.sin(17 * angle + .8);
  const ringColors = ['#122922', '#1d5c35', '#3ed44c', '#92ff50', '#c9ff75', '#47f9b1'];
  for (let layer = 0; layer < ringColors.length; layer++) {
    const points = [];
    for (let step = 0; step < 160; step++) {
      const angle = step / 160 * Math.PI * 2;
      const radius = edge(angle) * (1.09 - layer * .024);
      points.push(new THREE.Vector3(
        halfWidth * Math.cos(angle) * radius,
        halfHeight * Math.sin(angle) * radius,
        .07 + layer * .035 + .04 * Math.sin(7 * angle + layer * .8)
          + .021 * Math.sin(13 * angle - layer * .8)
      ));
    }
    const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal');
    const ring = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 240, .039 - layer * .004, 9, true),
      new THREE.MeshStandardMaterial({
        color: ringColors[layer],
        emissive: ringColors[layer],
        emissiveIntensity: layer < 2 ? .24 : .85,
        roughness: .34,
        metalness: .14
      })
    );
    portal.add(ring);
  }

  const uniforms = { uTime: { value: 0 } };
  const surface = new THREE.Mesh(
    new THREE.PlaneGeometry(halfWidth * 2.17, halfHeight * 2.17),
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
          vec2 p=(vUv-.5)*2.0;
          float r=length(p);
          float a=atan(p.y,p.x);
          float edge=1.0+.025*sin(a*5.0+.4)+.018*sin(a*9.0-1.1)+.012*sin(a*17.0+.8);
          if(r>edge) discard;
          float t=uTime*.42;
          float spiral=a*2.8-r*13.8-t*2.0;
          vec2 flow=vec2(cos(a+t*.18),sin(a+t*.18));
          float n=fbm(p*4.3+flow*(1.2+t*.45)+vec2(sin(spiral),cos(spiral))*.19);
          float n2=fbm(p*8.5-flow*t*.35+vec2(3.2,-1.3));
          float streak=sin(spiral+n*7.0)*.5+.5;
          float veins=sin(spiral*2.3+n2*10.0)*.5+.5;
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
          col+=vec3(.32,.78,.18)*pow(smoothstep(.72,1.,r),3.0)*.55;
          gl_FragColor=vec4(col,1.0);
        }
      `
    })
  );
  surface.position.z = .14;
  portal.add(surface);

  const light = new THREE.PointLight('#75ff80', 2.4, 2.8, 2);
  light.position.z = .35;
  group.add(light);
  return { group, uniforms, light };
}

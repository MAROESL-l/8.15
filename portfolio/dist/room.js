import * as THREE from './vendor/three.module.min.js';

const host = document.querySelector('#room-canvas');
const loading = document.querySelector('#room-loading');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

try {
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  host.append(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  const camera = new THREE.PerspectiveCamera(88, 1, .05, 80);
  // Walk freely inside the room while keeping an upright eye level.
  const eye = new THREE.Vector3(.2, 1.95, 2.35);
  let yaw = -.045, pitch = -.14, targetYaw = yaw, targetPitch = pitch;
  const controls = {
    update() {
      const easing = reducedMotion.matches ? 1 : .09;
      yaw += (targetYaw - yaw) * easing;
      // Rebase both angles together: unlimited full turns without a seam or accumulated drift.
      const turns=Math.trunc(yaw/(Math.PI*2));
      if(turns){yaw-=turns*Math.PI*2;targetYaw-=turns*Math.PI*2;}
      pitch += (targetPitch - pitch) * easing;
      camera.position.copy(eye);
      camera.lookAt(eye.x + Math.sin(yaw) * Math.cos(pitch), eye.y + Math.sin(pitch), eye.z - Math.cos(yaw) * Math.cos(pitch));
    }
  };

  const palette = {
    wood: '#a7754e', edge: '#694a35', lightWood: '#cfa877', wall: '#d1c5ab',
    wallSide: '#b3baa1', cream: '#f3e4c9', sage: '#829577', green: '#435d4b',
    dark: '#293b35', metal: '#333c38', terracotta: '#c97656', skin: '#e4b188',
    hair: '#342a28', pants: '#3f5152', paper: '#ead9b8'
  };
  const materials = new Map();
  function material(color, roughness = .75, metalness = 0) {
    const key = `${color}/${roughness}/${metalness}`;
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness, metalness }));
    return materials.get(key);
  }
  function mesh(geometry, color, parent = scene) {
    const object = new THREE.Mesh(geometry, typeof color === 'string' ? material(color) : color);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  function box(w, h, d, x, y, z, color, parent = scene) {
    const object = mesh(new THREE.BoxGeometry(w, h, d), color, parent);
    object.position.set(x, y, z);
    return object;
  }
  function rounded(w, h, d, r, x, y, z, color, parent = scene) {
    const shape = new THREE.Shape();
    const a = -w / 2, b = -h / 2;
    shape.moveTo(a + r, b); shape.lineTo(a + w - r, b);
    shape.quadraticCurveTo(a + w, b, a + w, b + r);
    shape.lineTo(a + w, b + h - r); shape.quadraticCurveTo(a + w, b + h, a + w - r, b + h);
    shape.lineTo(a + r, b + h); shape.quadraticCurveTo(a, b + h, a, b + h - r);
    shape.lineTo(a, b + r); shape.quadraticCurveTo(a, b, a + r, b);
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: d - 2 * r, bevelEnabled: true, bevelSize: r, bevelThickness: r, bevelSegments: 3, steps: 1, curveSegments: 5 });
    geometry.translate(0, 0, -d / 2 + r);
    const object = mesh(geometry, color, parent); object.position.set(x, y, z); return object;
  }
  function cylinder(rt, rb, height, x, y, z, color, parent = scene, segments = 32) {
    const object = mesh(new THREE.CylinderGeometry(rt, rb, height, segments), color, parent);
    object.position.set(x, y, z); return object;
  }
  function sphere(x, y, z, radius, color, parent = scene, scale = [1, 1, 1]) {
    const object = mesh(new THREE.SphereGeometry(radius, 24, 16), color, parent);
    object.position.set(x, y, z); object.scale.set(...scale); return object;
  }
  function rod(start, end, radius, color, parent = scene) {
    const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end);
    const object = cylinder(radius, radius, a.distanceTo(b), 0, 0, 0, color, parent, 16);
    object.position.copy(a).add(b).multiplyScalar(.5);
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
    return object;
  }
  function texture(draw, w = 512, h = 512) {
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    draw(canvas.getContext('2d'), w, h);
    const result = new THREE.CanvasTexture(canvas); result.colorSpace = THREE.SRGBColorSpace; result.anisotropy = renderer.capabilities.getMaxAnisotropy(); return result;
  }
  function picture(w, h, x, y, z, map, parent = scene) {
    const object = mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, roughness: .85 }), parent);
    object.position.set(x, y, z); object.castShadow = false; return object;
  }

  const ambient=new THREE.HemisphereLight('#fff1d7', '#7c8773', 2.5);scene.add(ambient);
  const sun = new THREE.DirectionalLight('#ffe4b4', 4.2);
  sun.position.set(-3, 8, 5); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: .5, far: 25 });
  sun.shadow.normalBias = .035; sun.shadow.bias = -.0003; sun.shadow.radius = 4;
  scene.add(sun);
  const fill = new THREE.DirectionalLight('#d5e7ee', 1.4); fill.position.set(4, 5, -3); scene.add(fill);

  // A floating architectural model, with individual timber floorboards.
  rounded(7.2, .24, 6.1, .07, 0, -.17, 0, palette.edge);
  box(7.06, .09, 5.96, 0, -.015, 0, palette.lightWood);
  const floorColors = ['#b89062', '#c39c6c', '#c9a376', '#bd9468', '#c6a073'];
  for (let row = 0; row < 15; row++) {
    for (let col = 0; col < 4; col++) {
      const x = -3.5 + col * 1.75;
      box(1.735, .025, .384, x + .875, .048, -2.78 + row * .397, floorColors[(row * 3 + col) % 5]);
      for (let line = 0; line < 2; line++) box(1.32, .001, .007, x + .88, .061, -2.83 + row * .397 + line * .11, '#b18a60');
    }
  }
  const ground = mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: .2 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.31; ground.castShadow = false;
  const backWall = new THREE.Group(); scene.add(backWall);
  const leftWall = new THREE.Group(); scene.add(leftWall);
  box(7.12, 3.65, .15, 0, 1.85, -2.94, palette.wall, backWall);
  box(.15, 3.65, 5.96, -3.52, 1.85, 0, palette.wallSide, leftWall);
  box(7, .12, .06, 0, .13, -2.82, '#e0d3b7', backWall);
  box(.06, .12, 5.9, -3.4, .13, 0, '#c9ceb9', leftWall);
  box(7.16, .07, .19, 0, 3.7, -2.94, '#e3d9c1', backWall);
  box(.19, .07, 5.96, -3.52, 3.7, 0, '#cbd1bc', leftWall);

  // Complete room envelope: four solid walls and a ceiling.
  box(.15,3.65,5.96,3.52,1.85,0,palette.wall);
  box(7.12,3.65,.15,0,1.85,2.94,palette.wallSide);
  box(7.2,.16,6.04,0,3.76,0,'#e8dfcb');
  box(.06,.12,5.9,3.4,.13,0,'#e0d3b7');
  box(7,.12,.06,0,.13,2.82,'#c9ceb9');
  for(const x of [-3.4,3.4])box(.1,.13,5.8,x,3.6,0,'#eee4cf');
  for(const z of [-2.82,2.82])box(6.8,.13,.1,0,3.6,z,'#eee4cf');
  // Closed panel door on the right wall, with frame, threshold and brass handle.
  const door = new THREE.Group();door.position.set(3.42,0,-.15);door.rotation.y=-Math.PI/2;scene.add(door);
  box(1.24,2.62,.07,0,1.36,0,palette.edge,door);
  box(1.08,2.48,.06,0,1.32,.045,'#ad8059',door);
  for(const x of [-.61,.61])box(.09,2.69,.12,x,1.39,.06,'#dcc7a4',door);
  box(1.31,.1,.12,0,2.72,.06,'#dcc7a4',door);
  box(1.2,.04,.18,0,.08,.06,palette.edge,door);
  for(const y of [.69,1.91]){
    box(.85,1.03,.023,0,y,.083,'#99714f',door);
    box(.74,.91,.026,0,y,.1,'#b58b62',door);
  }
  sphere(-.39,1.29,.15,.045,'#bca579',door,[1,1,.5]);
  rod([-.39,1.29,.19],[-.19,1.29,.19],.024,'#bca579',door);
  // A warm ceiling fixture lights the enclosed interior.
  const ceilingFixture=new THREE.Group();scene.add(ceilingFixture);
  cylinder(.31,.31,.045,0,3.64,0,palette.edge,ceilingFixture);
  cylinder(.36,.28,.12,0,3.57,0,'#ede1bf',ceilingFixture);
  const bulbMaterial=new THREE.MeshStandardMaterial({color:'#fff1ce',emissive:'#ffe3ab',emissiveIntensity:1.4});
  cylinder(.29,.29,.013,0,3.505,0,bulbMaterial,ceilingFixture);
  const ceilingLight=new THREE.PointLight('#ffe8c5',12,10,2);ceilingLight.position.set(0,3.35,0);scene.add(ceilingLight);

  // Window, sunset landscape and soft linen curtains.
  const sky = texture((ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h); grad.addColorStop(0, '#a9c3c0'); grad.addColorStop(.65, '#eed9b4'); grad.addColorStop(1, '#e8bd8c'); ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff0c2'; ctx.beginPath(); ctx.arc(362, 174, 47, 0, Math.PI * 2); ctx.fill();
    ['#a7b4a0', '#829c8d', '#607e74'].forEach((color, i) => {ctx.fillStyle = color; ctx.beginPath();ctx.moveTo(0,h);ctx.lineTo(0,350+i*36);for(let x=0;x<=w;x+=8)ctx.lineTo(x,325+i*48+Math.sin(x/95+i*2)*32);ctx.lineTo(w,h);ctx.fill();});
  });
  const nightSky = texture((ctx,w,h)=>{
    const gradient=ctx.createLinearGradient(0,0,0,h);
    gradient.addColorStop(0,'#101b39');gradient.addColorStop(.65,'#263b61');gradient.addColorStop(1,'#465571');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
    // A separate crescent silhouette, rather than a recoloured sun.
    const glow=ctx.createRadialGradient(362,164,10,362,164,85);
    glow.addColorStop(0,'#e0edff33');glow.addColorStop(1,'#e0edff00');
    ctx.fillStyle=glow;ctx.fillRect(270,70,190,190);
    const moonCanvas=document.createElement('canvas');
    moonCanvas.width=w;moonCanvas.height=h;
    const moon=moonCanvas.getContext('2d');
    moon.fillStyle='#f4f0d5';moon.beginPath();moon.arc(362,164,44,0,Math.PI*2);moon.fill();
    moon.globalCompositeOperation='destination-out';
    moon.beginPath();moon.arc(382,151,40,0,Math.PI*2);moon.fill();
    ctx.drawImage(moonCanvas,0,0);
    for(let i=0;i<42;i++){
      const x=24+(i*137)%464,y=24+(i*79)%255;
      if(Math.hypot(x-362,y-164)<66)continue;
      ctx.globalAlpha=.4+(i%4)*.18;ctx.fillStyle='#e6eeff';ctx.beginPath();ctx.arc(x,y,i%7===0?2:1.2,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;
    ['#334968','#263c54','#1b3043'].forEach((color,i)=>{
      ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,h);ctx.lineTo(0,350+i*36);
      for(let x=0;x<=w;x+=8)ctx.lineTo(x,325+i*48+Math.sin(x/95+i*2)*32);
      ctx.lineTo(w,h);ctx.fill();
    });
  });
  box(2.82, 1.95, .12, 1.34, 2.35, -2.79, palette.edge, backWall);
  picture(2.62, 1.76, 1.34, 2.35, -2.718, sky, backWall);
  const glass = backWall.children[backWall.children.length - 1]; glass.material.emissive.set('#d2bc93'); glass.material.emissiveIntensity = .24;
  const nightGlass=mesh(new THREE.PlaneGeometry(2.62,1.76),new THREE.MeshBasicMaterial({map:nightSky,transparent:true,opacity:0,depthWrite:false}),backWall);
  nightGlass.position.set(1.34,2.35,-2.715);nightGlass.castShadow=false;nightGlass.receiveShadow=false;
  for (const x of [-.04, 1.34, 2.72]) box(.065, 1.94, .12, x, 2.35, -2.68, '#eee2c9', backWall);
  for (const y of [1.4, 2.35, 3.3]) box(2.8, .065, .12, 1.34, y, -2.68, '#eee2c9', backWall);
  box(3.08, .1, .33, 1.34, 1.38, -2.65, '#dfc7a1', backWall);
  rod([-.34, 3.47, -2.48], [3.06, 3.47, -2.48], .035, palette.edge, backWall);
  for (const side of [-.1, 2.83]) {
    for (let i = 0; i < 5; i++) {
      const curtain = cylinder(.075, .095, 2.05, side + (i - 2) * .083, 2.34, -2.49, i % 2 ? '#d4cdb8' : '#e7deca', backWall, 12);
      curtain.scale.z = .65;
    }
  }
  // Framed print on the rear wall.
  const art = texture((ctx, w, h) => {
    ctx.fillStyle = '#f0dfbd'; ctx.fillRect(0,0,w,h);ctx.fillStyle='#bd674b';ctx.beginPath();ctx.arc(256,215,130,Math.PI,0);ctx.lineTo(386,385);ctx.lineTo(126,385);ctx.fill();ctx.fillStyle='#394e40';ctx.beginPath();ctx.arc(250,240,82,Math.PI,0);ctx.lineTo(332,385);ctx.lineTo(168,385);ctx.fill();ctx.fillStyle='#f0dfbd';ctx.font='25px Georgia';ctx.textAlign='center';
  });
  box(.88, 1.13, .075, -2.2, 2.91, -2.8, palette.edge, backWall);
  picture(.77, 1.02, -2.2, 2.91, -2.756, art, backWall);

  // A quiet graphic print on the side wall.
  const sideArt = new THREE.Group(); sideArt.position.set(-3.42,2.45,.35); sideArt.rotation.y=Math.PI/2;leftWall.add(sideArt);
  const sideMap=texture((ctx,w,h)=>{
    ctx.fillStyle='#eee2c9';ctx.fillRect(0,0,w,h);ctx.fillStyle='#7d9274';
    for(let i=0;i<5;i++){ctx.beginPath();ctx.ellipse(180+i*36,280-i*30,38,95,-.55,0,Math.PI*2);ctx.fill();}
    ctx.strokeStyle='#48664f';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(145,390);ctx.quadraticCurveTo(270,280,340,150);ctx.stroke();
    ctx.fillStyle='#53664f';ctx.font='24px Georgia';ctx.textAlign='center';
  });
  box(1.08,1.32,.07,0,0,0,palette.lightWood,sideArt);
  picture(.97,1.21,0,0,.04,sideMap,sideArt);

  // Low bookshelf: open cubbies, varied books, a ceramic vase and a plant.
  const shelf = new THREE.Group(); shelf.position.set(-2.06, 0, -2.47); scene.add(shelf);
  box(2.08, 1.64, .065, 0, .92, -.25, '#805e41', shelf);
  for (const x of [-1.04, 0, 1.04]) box(.08, 1.66, .53, x, .92, 0, palette.wood, shelf);
  for (const y of [.12, .89, 1.76]) box(2.2, .1, .58, 0, y, 0, palette.lightWood, shelf);
  const bookColors = ['#596e61','#d9c19b','#ad634c','#384c52','#9c9e73','#dbb470','#826d61'];
  for (let level = 0; level < 2; level++) {
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i < 5; i++) {
        const height = .36 + ((i * 7 + side * 3 + level) % 5) * .055;
        const x = -.87 + side * 1.08 + i * .153;
        const y = .19 + level * .77 + height / 2;
        const book = box(.12, height, .34, x, y, .08, bookColors[(i + level * 3 + side) % 7], shelf);
        if (i === 4) book.rotation.z = -.12;
        box(.084, .014, .005, x, y - height / 2 + .075, .253, '#e1d0ac', shelf);
        box(.084, .012, .005, x, y + height / 2 - .07, .253, '#e1d0ac', shelf);
      }
    }
  }
  function plant(x, y, z, size = 1, parent = scene) {
    const group = new THREE.Group(); group.position.set(x,y,z); group.scale.setScalar(size); parent.add(group);
    // A real hollow pot: the rim and recessed soil never share a surface.
    const profile=[[0,0],[.128,0],[.18,.285],[.193,.291],[.193,.333],[.174,.34],[.158,.329],[.158,.3],[.113,.035],[0,.035]];
    mesh(new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),64),'#c67e57',group);
    cylinder(.155,.155,.012,0,.288,0,'#51402e',group,64);
    for(let i=0;i<16;i++){
      const a=i*2.4,r=.025+((i*7)%11)*.01;
      sphere(Math.cos(a)*r,.297,Math.sin(a)*r,.007,i%2?'#766047':'#9a8060',group,[1,.4,.75]);
    }
    for(let i=0;i<7;i++){
      const angle=i*2.4, height=.49+(i%3)*.105;
      const tip=[Math.cos(angle)*.14,height,Math.sin(angle)*.14];
      rod([0,.294,0],tip,.008,'#526b40',group);
      const leafGroup=new THREE.Group();leafGroup.position.set(...tip);group.add(leafGroup);
      leafGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(Math.cos(angle)*.75,.8,Math.sin(angle)*.75).normalize());
      const vertices=[],indices=[],rows=14,cols=8,length=.29+(i%3)*.025;
      for(let row=0;row<=rows;row++){
        const t=row/rows,width=Math.pow(Math.sin(Math.PI*t),.85)*.082;
        for(let col=0;col<=cols;col++){
          const across=col/cols*2-1;
          vertices.push(across*width,t*length,Math.sin(Math.PI*t)*(.032+.015*(1-across*across)));
        }
      }
      for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
        const v=row*(cols+1)+col;indices.push(v,v+1,v+cols+1,v+1,v+cols+2,v+cols+1);
      }
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
      const leafMaterial=new THREE.MeshStandardMaterial({color:i%2?'#526e3b':'#758946',roughness:.8,side:THREE.DoubleSide});
      mesh(geometry,leafMaterial,leafGroup);
      for(let segment=0;segment<8;segment++){
        const t0=segment/8,t1=(segment+1)/8;
        rod([0,t0*length,Math.sin(Math.PI*t0)*.047+.0015],[0,t1*length,Math.sin(Math.PI*t1)*.047+.0015],.0015,'#8f9d65',leafGroup);
      }
    }
    return group;
  }
  plant(-2.75, 1.82, -2.4, .7);
  cylinder(.1,.14,.32,-1.38,1.98,-2.43,'#e8d2ae');
  cylinder(.065,.09,.12,-1.38,2.19,-2.43,'#e8d2ae');

  // Bed, turned-down sage duvet, pillows and timber headboard.
  const bed = new THREE.Group(); bed.position.set(-2.22,0,.3); scene.add(bed);
  for(const x of [-.76,.76])for(const z of [-1.25,1.25]) cylinder(.065,.055,.3,x,.22,z,palette.edge,bed);
  rounded(1.96,.2,3.08,.04,0,.4,0,palette.wood,bed);
  rounded(1.92,.94,.13,.035,0,.84,-1.43,palette.lightWood,bed);
  for(let i=0;i<8;i++)box(.028,.73,.025,-.78+i*.223,.88,-1.345,'#ba9264',bed);
  rounded(1.85,.26,2.9,.09,0,.6,0,palette.cream,bed);
  rounded(1.9,.22,2.02,.07,0,.77,.49,palette.sage,bed);
  rounded(1.91,.09,.4,.025,0,.91,-.33,'#a5b298',bed);
  rounded(.76,.17,.49,.07,-.46,.84,-.93,'#f7ead3',bed).rotation.y = -.055;
  rounded(.76,.17,.49,.07,.42,.84,-.93,'#eee0c9',bed).rotation.y = .04;
  for(let i=0;i<7;i++)box(.018,.007,1.8,-.77+i*.255,.885,.56,'#90a184',bed);
  rounded(.53,.04,1.83,.015,.49,.93,.55,'#c28e66',bed);
  for(let i=0;i<5;i++)box(.009,.004,1.8,.29+i*.095,.958,.55,'#e0b68c',bed);
  // Bedside table and little reading lamp.
  box(.58,.57,.57,-.82,.36,-.92,palette.wood);
  box(.63,.075,.63,-.82,.68,-.92,palette.lightWood);
  box(.47,.22,.02,-.82,.47,-.625,'#bf986d');sphere(-.82,.47,-.599,.027,palette.edge);
  const bedsideLamp=new THREE.Group();scene.add(bedsideLamp);
  cylinder(.12,.13,.04,-.82,.745,-.92,palette.metal,bedsideLamp);
  cylinder(.02,.02,.33,-.82,.91,-.92,palette.metal,bedsideLamp);
  cylinder(.14,.24,.24,-.82,1.13,-.92,'#efe0b8',bedsideLamp);

  // Woven rug under the work chair.
  const rugMap = texture((ctx,w,h)=>{
    ctx.fillStyle='#c2b393';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#78826d';ctx.lineWidth=14;ctx.strokeRect(24,24,w-48,h-48);ctx.lineWidth=3;ctx.strokeRect(44,44,w-88,h-88);
    for(let i=0;i<128;i++){ctx.fillStyle=i%2?'#ffffff0a':'#00000008';ctx.fillRect(i*4,0,1,h);ctx.fillRect(0,i*4,w,1);}
    ctx.strokeStyle='#8e9378';ctx.lineWidth=4;for(let x=120;x<450;x+=130){ctx.beginPath();ctx.moveTo(x,180);ctx.lineTo(x+50,256);ctx.lineTo(x,332);ctx.lineTo(x-50,256);ctx.closePath();ctx.stroke();}
  });
  const rug=picture(3.3,2.95,.8,.084,.6,rugMap);rug.rotation.x=-Math.PI/2;
  for(let i=0;i<32;i++)for(const z of [-.92,2.12])box(.018,.014,.09,-.77+i*.101,.08,z,'#c8bd9f');

  // Desk facing the window, MacBook and everyday objects.
  const deskX = 1.25, deskZ = -1.68;
  rounded(2.64,.14,1.12,.035,deskX,1.36,deskZ,palette.lightWood);
  for(const x of [deskX-1.12,deskX+1.12])for(const z of [deskZ-.39,deskZ+.39]){
    rod([x,1.3,z],[x+(x<deskX?-.07:.07),.08,z+.06],.045,palette.metal);
  }
  box(.69,.32,.87,2.06,1.12,deskZ,palette.wood);
  box(.57,.025,.025,2.06,1.14,deskZ+.447,palette.edge);
  const laptop = new THREE.Group(); laptop.position.set(1.13,1.455,-1.59); scene.add(laptop);
  const aluminum = material('#bfc5c3',.3,.65);
  rounded(.85,.035,.51,.012,0,0,0,aluminum,laptop);
  box(.79,.008,.28,0,.024,-.063,'#394040',laptop);
  for(let row=0;row<5;row++)for(let key=0;key<13;key++)box(.054,.007,.039,-.354+key*.059,.032,-.18+row*.05,'#202727',laptop);
  box(.28,.005,.028,0,.033,.059,'#242b2b',laptop);
  rounded(.3,.006,.11,.002,0,.022,.16,'#929e9d',laptop);
  const lid = new THREE.Group(); lid.position.set(0,.015,-.238); lid.rotation.x=-.16; laptop.add(lid);
  rounded(.85,.56,.033,.012,0,.28,0,aluminum,lid);
  const screenLoader=new THREE.TextureLoader();
  const screenMaps=['light','dark'].map(theme=>{
    const map=screenLoader.load(`images/room-home-${theme}.png`);
    map.colorSpace=THREE.SRGBColorSpace;
    map.anisotropy=renderer.capabilities.getMaxAnisotropy();
    return map;
  });
  const screen=picture(.77,.47,0,.292,.02,screenMaps[0],lid);
  screen.material.emissive.set('#ffffff');screen.material.emissiveMap=screenMaps[0];screen.material.emissiveIntensity=.38;
  // Small recognisable apple silhouette on the lid's reverse.
  const apple = new THREE.Group(); apple.position.set(0,.29,-.022); lid.add(apple);
  sphere(-.018,0,0,.034,'#e5e9e7',apple,[.85,1,.1]);sphere(.021,0,0,.034,'#e5e9e7',apple,[.85,1,.1]);
  const leaf=sphere(.014,.051,0,.015,'#e5e9e7',apple,[.6,1,.12]);leaf.rotation.z=-.55;
  cylinder(.105,.088,.2,2.04,1.52,-1.47,'#e8e0c9');
  cylinder(.083,.083,.005,2.04,1.626,-1.47,'#61462f');
  const handle=mesh(new THREE.TorusGeometry(.073,.022,8,20),'#e8e0c9');handle.position.set(2.15,1.53,-1.47);
  box(.35,.045,.44,.26,1.46,-1.52,palette.terracotta).rotation.y=-.12;
  box(.32,.019,.41,.26,1.49,-1.52,palette.paper).rotation.y=-.12;
  rod([.22,1.513,-1.65],[.35,1.513,-1.42],.012,palette.dark);
  // Angled task lamp.
  const deskLamp=new THREE.Group();scene.add(deskLamp);
  cylinder(.15,.17,.045,2.3,1.47,-1.99,palette.green,deskLamp);
  rod([2.3,1.49,-1.99],[2.3,2.08,-1.99],.025,palette.green,deskLamp);
  rod([2.3,2.08,-1.99],[1.96,2.25,-1.89],.027,palette.green,deskLamp);
  const shade=cylinder(.095,.18,.18,1.93,2.21,-1.88,palette.green,deskLamp);shade.rotation.z=-.25;
  cylinder(.145,.145,.012,1.907,2.12,-1.88,new THREE.MeshStandardMaterial({color:'#fff0bc',emissive:'#ffd68a',emissiveIntensity:1}),deskLamp);
  const lampLight=new THREE.PointLight('#ffe0a1',.6,3);lampLight.position.set(1.92,2.05,-1.83);scene.add(lampLight);

  // Chair and a seated person. Both forearms have a pivot at the elbow.
  const chair = new THREE.Group(); chair.position.set(1.12,0,-.46);scene.add(chair);
  cylinder(.045,.065,.51,0,.38,0,palette.metal,chair);
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5;rod([0,.15,0],[Math.cos(a)*.37,.11,Math.sin(a)*.37],.028,palette.metal,chair);sphere(Math.cos(a)*.37,.09,Math.sin(a)*.37,.065,palette.metal,chair,[1,.85,1]);}
  rounded(.77,.15,.68,.06,0,.7,0,palette.terracotta,chair);
  rod([-.29,.69,.23],[-.29,1.21,.36],.025,palette.metal,chair);rod([.29,.69,.23],[.29,1.21,.36],.025,palette.metal,chair);
  rounded(.79,.56,.14,.06,0,1.11,.34,'#b97051',chair).rotation.x=-.1;
  const person=new THREE.Group();person.position.set(1.12,0,-.52);scene.add(person);
  // Bent legs and shoes rest naturally below the desk.
  for(const x of [-.19,.19]){
    rod([x,.81,.02],[x,.75,-.49],.115,palette.pants,person);
    sphere(x,.75,-.49,.117,palette.pants,person);
    rod([x,.75,-.49],[x,.25,-.56],.088,palette.pants,person);
    rounded(.2,.13,.36,.04,x,.16,-.63,'#e5dcc9',person);
    box(.21,.035,.37,x,.09,-.63,'#b5b3a1',person);
  }
  const torso=rounded(.57,.62,.36,.095,0,1.14,-.035,palette.cream,person);torso.rotation.x=-.09;
  cylinder(.09,.1,.14,0,1.51,-.09,palette.skin,person);
  const head=new THREE.Group();head.position.set(0,1.75,-.13);person.add(head);
  sphere(0,0,0,.225,palette.skin,head,[.88,1.08,.88]);
  sphere(0,.093,.027,.218,palette.hair,head,[.97,.76,.94]);
  sphere(0,.008,.122,.176,palette.hair,head,[1,.92,.55]);
  sphere(-.205,-.012,0,.042,palette.skin,head);sphere(.205,-.012,0,.042,palette.skin,head);
  sphere(0,-.03,-.201,.041,palette.skin,head,[.8,1,.9]);
  for(const x of [-.082,.082]){
    sphere(x,.016,-.183,.015,palette.dark,head,[1,1,.45]);
    const glasses=mesh(new THREE.TorusGeometry(.06,.009,8,24),palette.metal,head);glasses.position.set(x,.012,-.202);
  }
  rod([-.023,.012,-.205],[.023,.012,-.205],.007,palette.metal,head);
  head.rotation.x=.13;
  const forearms=[];
  for(const side of [-1,1]){
    const elbow=[side*.37,1.535,-.42];
    rod([side*.27,1.4,-.06],elbow,.09,palette.cream,person);
    sphere(...elbow,.08,palette.cream,person);
    const arm=new THREE.Group();arm.position.set(...elbow);person.add(arm);forearms.push(arm);
    rod([0,0,0],[-side*.17,.015,-.57],.047,palette.skin,arm);
    sphere(-side*.17,.015,-.59,.072,palette.skin,arm,[1,.35,1.1]);
    for(let finger=0;finger<4;finger++)rod([-side*.17-.05+finger*.031,.01,-.62],[-side*.17-.05+finger*.031,-.025,-.72+(finger%2)*.015],.011,palette.skin,arm);
  }

  // Record cabinet with spinning vinyl, tonearm, speakers and sleeve art.
  const recordGroup=new THREE.Group();recordGroup.position.set(2.63,0,1.53);recordGroup.rotation.y=-Math.PI/2;scene.add(recordGroup);
  for(const x of [-.59,.59])for(const z of [-.3,.3])cylinder(.035,.025,.22,x,.18,z,palette.edge,recordGroup);
  box(1.42,.75,.8,0,.65,0,palette.wood,recordGroup);
  box(1.5,.09,.87,0,1.06,0,palette.lightWood,recordGroup);
  box(1.29,.5,.018,0,.65,.412,palette.edge,recordGroup);
  box(.06,.54,.04,0,.65,.43,palette.lightWood,recordGroup);
  for(let i=0;i<9;i++)box(.034,.4-(i%3)*.024,.34,-.57+i*.051,.61,.29,bookColors[i%7],recordGroup).rotation.z=.06;
  for(let i=0;i<5;i++)box(.034,.42,.34,.16+i*.061,.62,.29,bookColors[(i+3)%7],recordGroup).rotation.z=-.13;
  rounded(.97,.09,.66,.025,-.12,1.15,0,palette.dark,recordGroup);
  cylinder(.265,.265,.024,-.22,1.214,0,'#1b2424',recordGroup,64);
  const vinyl=new THREE.Group();vinyl.position.set(-.22,1.232,0);recordGroup.add(vinyl);
  cylinder(.253,.253,.008,0,0,0,material('#252b2b',.28,.15),vinyl,64);
  for(const r of [.12,.15,.18,.21,.24]){const groove=mesh(new THREE.TorusGeometry(r,.002,4,64),'#424847',vinyl);groove.rotation.x=Math.PI/2;}
  cylinder(.083,.083,.009,0,.007,0,palette.terracotta,vinyl);
  box(.009,.005,.09,.025,.014,0,palette.cream,vinyl);
  cylinder(.014,.014,.03,0,.023,0,'#a8b0aa',vinyl);
  cylinder(.045,.045,.028,.23,1.22,-.21,'#aab2ab',recordGroup);
  rod([.23,1.25,-.21],[.17,1.25,.15],.013,'#c5c8ba',recordGroup);
  rod([.17,1.25,.15],[.07,1.25,.19],.013,'#c5c8ba',recordGroup);
  box(.053,.032,.084,.055,1.24,.18,palette.cream,recordGroup);
  for(const x of [-.52,.26])cylinder(.019,.019,.012,x,1.211,.24,'#d3bc84',recordGroup);
  box(.26,.43,.31,.55,1.31,-.08,palette.dark,recordGroup);
  for(const y of [1.22,1.42]){const speaker=cylinder(.077,.077,.015,.55,y,.084,'#101e1e',recordGroup);speaker.rotation.x=Math.PI/2;sphere(.55,y,.098,.033,'#58665c',recordGroup,[1,1,.25]);}
  const sleeve=texture((ctx,w,h)=>{ctx.fillStyle='#d9ad74';ctx.fillRect(0,0,w,h);ctx.fillStyle='#354b40';ctx.beginPath();ctx.arc(w*.5,h*.51,w*.32,0,7);ctx.fill();ctx.fillStyle='#d9ad74';ctx.beginPath();ctx.arc(w*.5,h*.51,w*.1,0,7);ctx.fill();ctx.font='32px Georgia';ctx.textAlign='center';ctx.fillStyle='#354b40';ctx.font='17px Georgia';});
  box(.49,.53,.03,-.42,1.42,-.34,palette.paper,recordGroup);
  picture(.47,.51,-.42,1.42,-.321,sleeve,recordGroup);
  plant(2.9,.09,-2.03,1.4);
  // Small ottoman with a slowly rotating Earth globe.
  cylinder(.39,.35,.37,-.39,.28,1.91,'#bf805e');
  cylinder(.39,.39,.09,-.39,.49,1.91,'#d29a73');
  cylinder(.13,.16,.022,-.39,.548,1.91,material('#263c45',.3,.65),scene,48);
  cylinder(.018,.025,.065,-.39,.59,1.91,material('#8abcca',.28,.65));
  const globe=new THREE.Group();globe.position.set(-.39,.79,1.91);scene.add(globe);
  // NASA Blue Marble Next Generation, September: global topography composite.
  const globeMap=new THREE.TextureLoader().load('images/earth-blue-marble.jpg',loaded=>{
    const canvas=document.createElement('canvas');
    canvas.width=loaded.image.width;canvas.height=loaded.image.height;
    const context=canvas.getContext('2d');
    context.drawImage(loaded.image,0,0);
    const pixels=context.getImageData(0,0,canvas.width,canvas.height);
    for(let i=0;i<pixels.data.length;i+=4){
      const red=pixels.data[i],green=pixels.data[i+1],blue=pixels.data[i+2];
      const ocean=Math.min(1,Math.max(0,(blue-Math.max(red,green)-2)/6));
      if(!ocean)continue;
      pixels.data[i]=red+(20+red*.5-red)*ocean;
      pixels.data[i+1]=green+(67+green*.5-green)*ocean;
      pixels.data[i+2]=blue+(108+blue*.6-blue)*ocean;
    }
    context.putImageData(pixels,0,0);
    loaded.image=canvas;loaded.needsUpdate=true;
  });
  globeMap.colorSpace=THREE.SRGBColorSpace;
  const earth=mesh(new THREE.SphereGeometry(.17,48,32),new THREE.MeshBasicMaterial({map:globeMap,toneMapped:false}),globe);
  earth.castShadow=false;
  const gridMaterial=new THREE.LineBasicMaterial({color:'#c8e1e9',transparent:true,opacity:.28,depthWrite:false,toneMapped:false});
  const referenceMaterial=new THREE.LineBasicMaterial({color:'#e2f2f5',transparent:true,opacity:.42,depthWrite:false,toneMapped:false});
  const gridRadius=.172;
  // The map is equirectangular: its center is 0° longitude, with north at the top.
  function globePoint(longitude,latitude){
    const lon=THREE.MathUtils.degToRad(longitude),lat=THREE.MathUtils.degToRad(latitude);
    return new THREE.Vector3(gridRadius*Math.cos(lat)*Math.cos(lon),gridRadius*Math.sin(lat),-gridRadius*Math.cos(lat)*Math.sin(lon));
  }
  for(const latitude of [-60,-30,0,30,60]){
    const points=[];
    for(let step=0;step<120;step++)points.push(globePoint(-180+step*3,latitude));
    globe.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points),latitude===0?referenceMaterial:gridMaterial));
  }
  for(let longitude=-180;longitude<180;longitude+=30){
    const points=[];
    for(let latitude=-90;latitude<=90;latitude+=3)points.push(globePoint(longitude,latitude));
    globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),longitude===0?referenceMaterial:gridMaterial));
  }

  let themeBlend=window.roomTheme.value==='dark'?1:0;
  let themeTarget=themeBlend;
  const darkAmbient=new THREE.Color('#9badcd');
  const darkGround=new THREE.Color('#303c52');
  const darkFill=new THREE.Color('#829ed5');
  const darkBulb=new THREE.Color('#687182');
  function updateRoomTheme(t){
    ambient.intensity=THREE.MathUtils.lerp(2.5,.65,t);
    ambient.color.set('#fff1d7').lerp(darkAmbient,t);
    ambient.groundColor.set('#7c8773').lerp(darkGround,t);
    sun.intensity=THREE.MathUtils.lerp(4.2,.25,t);
    fill.intensity=THREE.MathUtils.lerp(1.4,.45,t);
    fill.color.set('#d5e7ee').lerp(darkFill,t);
    ceilingLight.intensity=THREE.MathUtils.lerp(12,0,t);
    bulbMaterial.emissiveIntensity=THREE.MathUtils.lerp(1.4,0,t);
    bulbMaterial.color.set('#fff1ce').lerp(darkBulb,t);
    lampLight.intensity=THREE.MathUtils.lerp(.6,1.2,t);
    nightGlass.material.opacity=t;
    renderer.toneMappingExposure=THREE.MathUtils.lerp(1.12,.95,t);
  }
  function applyRoomTheme(){
    themeTarget=window.roomTheme.value==='dark'?1:0;
    screen.material.map=screenMaps[themeTarget];
    screen.material.emissiveMap=screenMaps[themeTarget];
    screen.material.needsUpdate=true;
    if(reducedMotion.matches)themeBlend=themeTarget;
    updateRoomTheme(themeBlend);
  }
  applyRoomTheme();
  window.addEventListener('themechange',applyRoomTheme);

  let animated = !reducedMotion.matches;
  let elapsed = 0, lastTime = 0, frame = null;
  reducedMotion.addEventListener('change',()=>{animated=!reducedMotion.matches;});
  function resetView(){eye.set(.2,1.95,2.35);yaw=targetYaw=-.045;pitch=targetPitch=-.14;controls.update();}
  const raycaster=new THREE.Raycaster();
  const pointer=new THREE.Vector2();
  const homePreview=document.querySelector('#home-preview');
  const previewAnchor=new THREE.Vector3();
  let previewVisible=false;
  function setHomePreview(visible){
    if(previewVisible===visible)return;
    previewVisible=visible;
    homePreview.classList.toggle('is-visible',visible);
    homePreview.setAttribute('aria-hidden',String(!visible));
  }
  function updateHomePreview(){
    if(!previewVisible)return;
    laptop.localToWorld(previewAnchor.set(0,.32,-.22));
    previewAnchor.project(camera);
    if(previewAnchor.z>1){setHomePreview(false);return;}
    const bounds=host.getBoundingClientRect();
    const x=bounds.left+(previewAnchor.x+1)*bounds.width/2;
    const y=bounds.top+(1-previewAnchor.y)*bounds.height/2;
    const panelWidth=Math.min(400,innerWidth-24);
    const besideRight=x+32+panelWidth<=innerWidth-12;
    const panelX=besideRight?x+32:Math.max(12,x-panelWidth-32);
    homePreview.style.setProperty('--preview-x',`${panelX}px`);
    homePreview.style.setProperty('--preview-y',`${Math.max(12,Math.min(y-190,innerHeight-Math.min(570,innerHeight-24)-12))}px`);
  }
  function interactiveTarget(event){
    const bounds=host.getBoundingClientRect();
    pointer.set((event.clientX-bounds.left)/bounds.width*2-1,-(event.clientY-bounds.top)/bounds.height*2+1);
    scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
    raycaster.setFromCamera(pointer,camera);
    // The nearest visible surface must belong to the laptop; do not click through a person or wall.
    let object=raycaster.intersectObjects(scene.children,true)[0]?.object;
    while(object){if(object===laptop)return 'computer';if((object===bedsideLamp||object===deskLamp))return 'light';object=object.parent;}
    return null;
  }
  let drag=null;
  host.addEventListener('pointerdown',event=>{
    if(!event.isPrimary || event.button!==0)return;
    host.focus({preventScroll:true});host.setPointerCapture(event.pointerId);
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,moved:false,target:interactiveTarget(event)};
  });
  host.addEventListener('pointermove',event=>{
    if(!drag){
      const target=interactiveTarget(event);
      host.style.cursor=target?'pointer':'grab';
      setHomePreview(target==='computer');
      if(previewVisible)updateHomePreview();
      return;
    }
    setHomePreview(false);
    if(drag.id!==event.pointerId)return;
    if(Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)>6)drag.moved=true;
    if(!drag.moved)return;
    host.style.cursor='grabbing';
    // One viewport-width drag is a full horizontal turn; vertical look stays comfortable.
    const horizontalScale=Math.PI*2/Math.max(host.clientWidth,320);
    const verticalScale=Math.PI*.75/Math.max(host.clientHeight,400);
    targetYaw-=(event.clientX-drag.x)*horizontalScale;
    targetPitch=THREE.MathUtils.clamp(targetPitch+(event.clientY-drag.y)*verticalScale,-1.35,1.35);
    drag.x=event.clientX;drag.y=event.clientY;
  });
  function endDrag(event){
    if(drag?.id!==event.pointerId)return;
    const activate=event.type==='pointerup'&&!drag.moved&&Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)<=6&&drag.target&&drag.target===interactiveTarget(event);
    const action=drag.target;
    drag=null;host.style.cursor='grab';
    if(host.hasPointerCapture(event.pointerId))host.releasePointerCapture(event.pointerId);
    if(activate&&action==='computer')window.location.assign('index.html');
    if(activate&&action==='light')window.roomTheme.toggle();
  }
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>host.addEventListener(type,endDrag));
  host.addEventListener('pointerleave',()=>{if(!drag)host.style.cursor='grab';setHomePreview(false);});
  // Floor-plan collision volumes include the space occupied by the seated person.
  const obstacles = [
    [-3.24,-1.2,-1.3,1.85], // bed
    [-3.16,-.95,-2.78,-2.17], // bookshelf
    [-.14,2.64,-2.28,-1.08], // desk
    [.64,1.6,-1.08,.05], // chair and person
    [2.18,3.08,.77,2.29], // record cabinet
    [-1.15,-.49,-1.25,-.6], // bedside table
    [-.79,.01,1.51,2.31], // ottoman
    [2.61,3.19,-2.32,-1.74] // plant
  ];
  const bodyRadius=.16;
  function walkable(x,z){
    if(x < -3.42+bodyRadius || x > 3.42-bodyRadius || z < -2.83+bodyRadius || z > 2.83-bodyRadius)return false;
    return !obstacles.some(([left,right,back,front])=>{
      const dx=x-THREE.MathUtils.clamp(x,left,right),dz=z-THREE.MathUtils.clamp(z,back,front);
      return dx*dx+dz*dz<bodyRadius*bodyRadius;
    });
  }
  function walk(forward,sideways){
    const dx=Math.sin(yaw)*forward+Math.cos(yaw)*sideways;
    const dz=-Math.cos(yaw)*forward+Math.sin(yaw)*sideways;
    const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.04));
    // Small steps prevent tunnelling; separate axes allow sliding along furniture.
    for(let i=0;i<steps;i++){
      if(walkable(eye.x+dx/steps,eye.z))eye.x+=dx/steps;
      if(walkable(eye.x,eye.z+dz/steps))eye.z+=dz/steps;
    }
  }
  const heldKeys=new Set();
  const movementKeys=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'];
  host.addEventListener('keydown',event=>{
    if(event.code==='KeyL'){event.preventDefault();if(!event.repeat)window.roomTheme.toggle();return;}
    if(movementKeys.includes(event.code)){event.preventDefault();heldKeys.add(event.code);return;}
    if(event.code==='Space'){event.preventDefault();if(!event.repeat)animated=!animated;return;}
    if(event.key==='Home'){event.preventDefault();heldKeys.clear();resetView();}
  });
  window.addEventListener('keyup',event=>heldKeys.delete(event.code));
  window.addEventListener('blur',()=>{heldKeys.clear();drag=null;host.style.cursor='grab';});
  host.addEventListener('blur',()=>heldKeys.clear());
  document.addEventListener('visibilitychange',()=>heldKeys.clear());
  host.addEventListener('wheel',event=>{
    if(event.ctrlKey)return;
    event.preventDefault();
    const unit=event.deltaMode===1?16:event.deltaMode===2?host.clientHeight:1;
    walk(THREE.MathUtils.clamp(-event.deltaY*unit*.002,-.35,.35),THREE.MathUtils.clamp(event.deltaX*unit*.002,-.35,.35));
  },{passive:false});
  function updateWalking(delta){
    let forward=Number(heldKeys.has('KeyW')||heldKeys.has('ArrowUp'))-Number(heldKeys.has('KeyS')||heldKeys.has('ArrowDown'));
    let sideways=Number(heldKeys.has('KeyD')||heldKeys.has('ArrowRight'))-Number(heldKeys.has('KeyA')||heldKeys.has('ArrowLeft'));
    const length=Math.hypot(forward,sideways);
    if(!length)return;
    const speed=(heldKeys.has('ShiftLeft')||heldKeys.has('ShiftRight')?2.4:1.35)*delta/length;
    walk(forward*speed,sideways*speed);
  }
  new ResizeObserver(()=>{
    const {clientWidth:width,clientHeight:height}=host;
    renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();
  }).observe(host);
  function render(time){
    const delta=lastTime?Math.min((time-lastTime)/1000,.05):0;lastTime=time;
    updateWalking(delta);
    controls.update();
    if(Math.abs(themeTarget-themeBlend)>.001){
      themeBlend+=(themeTarget-themeBlend)*(reducedMotion.matches?1:Math.min(1,delta*14));
      updateRoomTheme(themeBlend);
    }
    updateHomePreview();
    if(animated){
      elapsed+=delta;vinyl.rotation.y=-elapsed*3.49;globe.rotation.y=elapsed*.28;
      forearms.forEach((arm,i)=>{arm.rotation.x=(1+Math.sin(elapsed*12+i*Math.PI))*.007;});
      head.rotation.x=.13+Math.sin(elapsed*1.9)*.018;head.rotation.z=Math.sin(elapsed*.7)*.018;
      torso.scale.y=1+Math.sin(elapsed*2)*.006;
    }
    renderer.render(scene,camera);frame=requestAnimationFrame(render);
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=null;}else if(frame===null){lastTime=0;frame=requestAnimationFrame(render);}});
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();cancelAnimationFrame(frame);loading.hidden=false;loading.dataset.error='true';loading.setAttribute('aria-label','图形显示已中断，请刷新页面。');});
  renderer.setSize(host.clientWidth,host.clientHeight);camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();resetView();
  renderer.render(scene,camera);loading.hidden=true;frame=requestAnimationFrame(render);
} catch(error) {
  loading.hidden=false;loading.dataset.error='true';loading.setAttribute('aria-label','房间无法加载，请使用支持 WebGL 的浏览器刷新重试。');
  console.error('Room initialization failed:',error);
}

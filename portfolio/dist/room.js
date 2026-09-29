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
    dark: '#293b35', metal: '#333c38', terracotta: '#c97656', paper: '#ead9b8'
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

  // Landscape photograph beside the bed.
  const sideArt = new THREE.Group(); sideArt.position.set(-3.42,2.45,.35); sideArt.rotation.y=Math.PI/2;leftWall.add(sideArt);
  const sideMap=new THREE.TextureLoader().load('images/bedside-photo.jpg?v=2');
  sideMap.colorSpace=THREE.SRGBColorSpace;
  sideMap.anisotropy=renderer.capabilities.getMaxAnisotropy();
  box(1.68,1.28,.07,0,0,0,palette.lightWood,sideArt);
  picture(1.56,1.17,0,0,.04,sideMap,sideArt);

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
  rounded(1.68,.12,1.76,.055,0,.79,.43,palette.sage,bed);
  rounded(1.7,.07,.34,.025,0,.865,-.37,'#a5b298',bed);
  rounded(.76,.17,.49,.07,-.46,.84,-.93,'#f7ead3',bed).rotation.y = -.055;
  rounded(.76,.17,.49,.07,.42,.84,-.93,'#eee0c9',bed).rotation.y = .04;
  for(let i=0;i<7;i++)box(.018,.007,1.61,-.69+i*.23,.855,.47,'#90a184',bed);
  rounded(.53,.025,1.64,.012,.49,.87,.47,'#c28e66',bed);
  for(let i=0;i<5;i++)box(.009,.004,1.6,.29+i*.095,.885,.47,'#e0b68c',bed);
  // Drawer boxes slide out of hollow cabinets, rather than through solid blocks.
  const slidingDrawers=[];
  const bedsideCabinet=new THREE.Group();bedsideCabinet.position.set(-.82,0,-.92);scene.add(bedsideCabinet);
  box(.58,.055,.57,0,.115,0,palette.wood,bedsideCabinet);
  for(const x of [-.27,.27])box(.04,.52,.57,x,.375,0,palette.wood,bedsideCabinet);
  box(.5,.52,.035,0,.375,-.267,palette.edge,bedsideCabinet);
  box(.52,.045,.55,0,.345,0,palette.lightWood,bedsideCabinet);
  box(.63,.075,.63,0,.68,0,palette.lightWood,bedsideCabinet);
  const bedsideDrawer=new THREE.Group();bedsideCabinet.add(bedsideDrawer);
  box(.445,.018,.45,0,.375,.035,palette.lightWood,bedsideDrawer);
  for(const x of [-.215,.215])box(.018,.245,.45,x,.5,.035,palette.wood,bedsideDrawer);
  box(.445,.245,.018,0,.5,-.185,palette.wood,bedsideDrawer);
  rounded(.49,.278,.035,.012,0,.505,.286,'#bf986d',bedsideDrawer);
  sphere(0,.475,.32,.027,palette.edge,bedsideDrawer);
  slidingDrawers.push({group:bedsideDrawer,travel:.34,open:false});
  const lowerBedsideDrawer=new THREE.Group();bedsideCabinet.add(lowerBedsideDrawer);
  box(.445,.018,.45,0,.17,.035,palette.lightWood,lowerBedsideDrawer);
  for(const x of [-.215,.215])box(.018,.105,.45,x,.23,.035,palette.wood,lowerBedsideDrawer);
  box(.445,.105,.018,0,.23,-.185,palette.wood,lowerBedsideDrawer);
  rounded(.49,.225,.035,.012,0,.245,.286,'#bf986d',lowerBedsideDrawer);
  sphere(0,.245,.32,.027,palette.edge,lowerBedsideDrawer);
  slidingDrawers.push({group:lowerBedsideDrawer,travel:.34,open:false});
  // Little reading lamp on the bedside cabinet.
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
  const deskCabinet=new THREE.Group();deskCabinet.position.set(2.06,0,deskZ);scene.add(deskCabinet);
  for(const y of [.98,1.28])box(.69,.035,.87,0,y,0,palette.wood,deskCabinet);
  for(const x of [-.33,.33])box(.03,.3,.87,x,1.13,0,palette.wood,deskCabinet);
  box(.63,.28,.025,0,1.13,-.425,palette.edge,deskCabinet);
  const deskDrawer=new THREE.Group();deskCabinet.add(deskDrawer);
  box(.58,.018,.67,0,1.005,.055,palette.lightWood,deskDrawer);
  for(const x of [-.28,.28])box(.018,.16,.67,x,1.09,.055,palette.wood,deskDrawer);
  box(.58,.16,.018,0,1.09,-.28,palette.wood,deskDrawer);
  rounded(.63,.29,.04,.015,0,1.13,.447,palette.lightWood,deskDrawer);
  rounded(.24,.025,.025,.008,0,1.13,.475,palette.edge,deskDrawer);
  slidingDrawers.push({group:deskDrawer,travel:.35,open:false});
  // 14-inch MacBook Pro proportions: 31.26 cm wide by 22.12 cm deep, in Space Black.
  const laptop = new THREE.Group(); laptop.position.set(1.13,1.446,-1.59); scene.add(laptop);
  const spaceBlack=material('#22252a',.48,.46);
  rounded(.85,.029,.601,.011,0,0,0,spaceBlack,laptop);
  // A contrasting keyboard well keeps the individual dark keycaps readable.
  rounded(.72,.003,.275,.001,0,.016,-.105,'#858c91',laptop);
  for(let row=0;row<5;row++)for(let key=0;key<13;key++){
    const x=-.33+key*.055,z=-.205+row*.051;
    box(.041,.006,.029,x,.022,z,'#20252a',laptop);
    box(.013,.001,.005,x-.008,.026,z-.007,'#c6cbc9',laptop);
  }
  box(.25,.006,.029,0,.022,.046,'#20252a',laptop);
  for(const x of [-.39,.39])box(.026,.002,.25,x,.016,-.105,'#17191d',laptop);
  rounded(.34,.003,.17,.001,0,.016,.187,'#111317',laptop);
  rounded(.335,.003,.165,.001,0,.018,.187,'#303339',laptop);
  const lid = new THREE.Group(); lid.position.set(0,.0145,-.292); lid.rotation.x=-.22; laptop.add(lid);
  rounded(.85,.56,.018,.007,0,.28,0,spaceBlack,lid);
  rounded(.824,.53,.002,.0008,0,.28,.01,'#08090b',lid);
  const screenLoader=new THREE.TextureLoader();
  const screenMaps=['light','dark'].map(theme=>{
    const map=screenLoader.load(`images/room-home-${theme}.png`);
    map.colorSpace=THREE.SRGBColorSpace;
    map.anisotropy=renderer.capabilities.getMaxAnisotropy();
    return map;
  });
  const screen=picture(.8,.5,0,.28,.013,screenMaps[0],lid);
  screen.material.emissive.set('#ffffff');screen.material.emissiveMap=screenMaps[0];screen.material.emissiveIntensity=.38;
  rounded(.075,.022,.003,.001,0,.53,.016,'#060709',lid);
  sphere(0,.527,.019,.0025,'#29323a',lid);
  // Small recognisable apple silhouette on the lid's reverse.
  const apple = new THREE.Group(); apple.position.set(0,.29,-.012); lid.add(apple);
  sphere(-.018,0,0,.034,'#55585c',apple,[.85,1,.1]);sphere(.021,0,0,.034,'#55585c',apple,[.85,1,.1]);
  const leaf=sphere(.014,.051,0,.015,'#55585c',apple,[.6,1,.12]);leaf.rotation.z=-.55;
  // Open cup with a visible inner wall; keep the water surface below its rim.
  const cupProfile=[
    [0,0],[.088,0],[.105,.2],[.086,.2],[.07,.02],[0,.02]
  ].map(([radius,height])=>new THREE.Vector2(radius,height));
  const cup=mesh(new THREE.LatheGeometry(cupProfile,32),'#e8e0c9');
  cup.position.set(2.27,1.42,-1.47);
  const water=mesh(new THREE.CircleGeometry(.077,32),material('#61462f',.25));
  water.rotation.x=-Math.PI/2;
  water.position.set(2.27,1.585,-1.47);
  const handle=mesh(new THREE.TorusGeometry(.073,.022,8,20),'#e8e0c9');handle.position.set(2.38,1.53,-1.47);
  const notebook=new THREE.Group();scene.add(notebook);
  box(.35,.045,.44,.26,1.46,-1.52,palette.terracotta,notebook).rotation.y=-.12;
  box(.32,.019,.41,.26,1.49,-1.52,palette.paper,notebook).rotation.y=-.12;
  rod([.22,1.513,-1.65],[.35,1.513,-1.42],.012,palette.dark,notebook);
  const notebookHit=mesh(new THREE.PlaneGeometry(.43,.5),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false,side:THREE.DoubleSide}),notebook);
  notebookHit.position.set(.26,1.535,-1.52);notebookHit.rotation.x=-Math.PI/2;
  notebookHit.castShadow=false;notebookHit.receiveShadow=false;
  // Angled task lamp.
  const deskLamp=new THREE.Group();scene.add(deskLamp);
  const lampX=.45,lampZ=-2.03;
  cylinder(.15,.17,.045,lampX,1.47,lampZ,palette.green,deskLamp);
  rod([lampX,1.49,lampZ],[lampX,2.08,lampZ],.025,palette.green,deskLamp);
  rod([lampX,2.08,lampZ],[lampX+.34,2.25,lampZ+.1],.027,palette.green,deskLamp);
  const deskShade=new THREE.Group();deskShade.position.set(lampX+.37,2.21,lampZ+.11);deskShade.rotation.z=.25;deskLamp.add(deskShade);
  mesh(new THREE.CylinderGeometry(.095,.18,.18,32,1,true),new THREE.MeshStandardMaterial({color:palette.green,roughness:.8,side:THREE.DoubleSide}),deskShade);
  mesh(new THREE.CylinderGeometry(.086,.168,.171,32,1,true),new THREE.MeshStandardMaterial({color:'#e9dfbc',roughness:.7,side:THREE.DoubleSide}),deskShade);
  const shadeRim=mesh(new THREE.TorusGeometry(.174,.008,8,32),palette.green,deskShade);shadeRim.rotation.x=Math.PI/2;shadeRim.position.y=-.09;
  cylinder(.025,.025,.085,0,-.035,0,palette.metal,deskShade);
  const deskBulbMaterial=new THREE.MeshStandardMaterial({color:'#fff1ce',emissive:'#ffd68a',emissiveIntensity:1.1,roughness:.25});
  sphere(0,-.115,0,.06,deskBulbMaterial,deskShade,[.82,1,.82]);
  const lampLight=new THREE.PointLight('#ffe0a1',.6,3);lampLight.position.set(lampX+.395,2.1,lampZ+.11);scene.add(lampLight);

  // Desk chair.
  const chair = new THREE.Group(); chair.position.set(1.12,0,-.46);scene.add(chair);
  cylinder(.045,.065,.51,0,.38,0,palette.metal,chair);
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5;rod([0,.15,0],[Math.cos(a)*.37,.11,Math.sin(a)*.37],.028,palette.metal,chair);sphere(Math.cos(a)*.37,.09,Math.sin(a)*.37,.065,palette.metal,chair,[1,.85,1]);}
  rounded(.77,.15,.68,.06,0,.7,0,palette.terracotta,chair);
  rod([-.29,.69,.23],[-.29,1.21,.36],.025,palette.metal,chair);rod([.29,.69,.23],[.29,1.21,.36],.025,palette.metal,chair);
  rounded(.79,.56,.14,.06,0,1.11,.34,'#b97051',chair).rotation.x=-.1;
  // Record cabinet with vertically stored sleeves and a working turntable.
  const recordGroup=new THREE.Group();recordGroup.position.set(2.63,0,1.53);recordGroup.rotation.y=-Math.PI/2;scene.add(recordGroup);
  for(const x of [-.59,.59])for(const z of [-.3,.3])cylinder(.035,.025,.22,x,.18,z,palette.edge,recordGroup);
  box(1.42,.07,.8,0,.33,0,palette.wood,recordGroup);
  box(1.32,.055,.74,0,.4,0,palette.lightWood,recordGroup);
  for(const x of [-.675,.675])box(.07,.7,.8,x,.68,0,palette.wood,recordGroup);
  box(.06,.67,.76,0,.675,0,palette.lightWood,recordGroup);
  for(const y of [.39,.99])box(1.32,.045,.045,0,y,-.36,palette.edge,recordGroup);
  box(1.5,.09,.87,0,1.06,0,palette.lightWood,recordGroup);
  const records=[
    {title:'午夜频率',subtitle:'MIDNIGHT RADIO',background:'#263c49',accent:'#f0a267'},
    {title:'城市漫游',subtitle:'CITY WALK',background:'#936652',accent:'#f5dfb8'},
    {title:'海岸线',subtitle:'COASTLINE',background:'#527a78',accent:'#eac985'},
    {title:'慢慢来',subtitle:'SLOW DAYS',background:'#756b89',accent:'#f3c5a5'},
    {title:'赤与青',subtitle:'RED & BLUE',background:'#364a65',accent:'#db765e'},
    {title:'日落之后',subtitle:'AFTER SUNSET',background:'#704f4c',accent:'#f1b77c'},
    {title:'微光',subtitle:'GLIMMER',background:'#536454',accent:'#d9ddaa'},
    {title:'远方',subtitle:'FAR AWAY',background:'#546b82',accent:'#d6c3a2'},
    {title:'山间回声',subtitle:'MOUNTAIN ECHO',background:'#4f695d',accent:'#d7b977'},
    {title:'蓝色时刻',subtitle:'BLUE HOUR',background:'#344c6b',accent:'#9fc5d9'},
    {title:'风的来信',subtitle:'WIND LETTERS',background:'#8a765d',accent:'#f3dca6'},
    {title:'静夜',subtitle:'QUIET NIGHT',background:'#3f455c',accent:'#c6b8d3'},
    {title:'温度',subtitle:'WARMTH',background:'#895946',accent:'#efb98b'},
    {title:'飞行日记',subtitle:'FLIGHT LOG',background:'#5b7882',accent:'#ddd5b7'},
    {title:'雨后',subtitle:'AFTER RAIN',background:'#45666b',accent:'#bdd4c4'},
    {title:'橘色夏天',subtitle:'ORANGE SUMMER',background:'#a36348',accent:'#f4d198'},
    {title:'晚风',subtitle:'EVENING BREEZE',background:'#566477',accent:'#d9c9a6'},
    {title:'回声',subtitle:'ECHOES',background:'#6e5b72',accent:'#d5bdd4'},
    {title:'月光列车',subtitle:'MOONLIGHT TRAIN',background:'#3e536b',accent:'#d9ddd2'},
    {title:'森林来信',subtitle:'FOREST LETTER',background:'#52684b',accent:'#d9c994'},
    {title:'旧时光',subtitle:'OLD TIMES',background:'#82665b',accent:'#e5c4a2'},
    {title:'海边散步',subtitle:'SEASIDE WALK',background:'#4e7882',accent:'#e8d7b7'},
    {title:'晨光',subtitle:'MORNING LIGHT',background:'#9a7858',accent:'#f3ddb1'},
    {title:'岛屿',subtitle:'ISLANDS',background:'#507374',accent:'#d3e1cd'},
    {title:'云的方向',subtitle:'CLOUD PATH',background:'#6c7185',accent:'#e2d8d0'},
    {title:'夏日信号',subtitle:'SUMMER SIGNAL',background:'#9a5f52',accent:'#f0c6a2'},
    {title:'夜航',subtitle:'NIGHT FLIGHT',background:'#344b60',accent:'#c7bfa6'},
    {title:'漫长旅程',subtitle:'LONG JOURNEY',background:'#657459',accent:'#e2cf9c'}
  ];
  const recordCovers=[],recordJackets=[],recordHitTargets=[];
  const recordsPerBay=14,recordSpacing=.041;
  records.forEach((record,index)=>{
    const cover=texture((ctx,w,h)=>{
      ctx.fillStyle=record.background;ctx.fillRect(0,0,w,h);
      ctx.fillStyle=record.accent;
      if(index%4===0){ctx.beginPath();ctx.arc(w*.52,h*.43,w*.27,0,Math.PI*2);ctx.fill();ctx.fillStyle=record.background;ctx.beginPath();ctx.arc(w*.52,h*.43,w*.16,0,Math.PI*2);ctx.fill();}
      if(index%4===1){for(let i=0;i<6;i++)ctx.fillRect(50+i*76,95+(i%3)*35,40,250-(i%3)*35);}
      if(index%4===2){for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(w*.5,h*.58+i*42,w*.45+i*35,Math.PI,Math.PI*2);ctx.strokeStyle=record.accent;ctx.lineWidth=16;ctx.stroke();}}
      if(index%4===3){ctx.beginPath();ctx.arc(w*.5,h*.42,w*.25,0,Math.PI*2);ctx.fill();ctx.fillRect(0,h*.43,w,h*.08);}
      ctx.fillStyle='#fff8e9';ctx.font='bold 52px sans-serif';ctx.textAlign='left';ctx.fillText(record.title,32,h-98);
      ctx.font='24px sans-serif';ctx.fillText(record.subtitle,34,h-54);
    });
    const bay=index<recordsPerBay?0:1;
    const slot=index%recordsPerBay;
    const x=(bay? .335:-.335)+(slot-(recordsPerBay-1)/2)*recordSpacing;
    const jacket=new THREE.Group();jacket.position.set(x,.65,.22);jacket.userData.recordIndex=index;recordGroup.add(jacket);
    box(.042,.44,.42,0,0,0,record.background,jacket);
    const coverFace=picture(.405,.415,.0215,0,0,cover,jacket);coverFace.rotation.y=Math.PI/2;
    box(.039,.4,.008,0,0,.214,record.accent,jacket);
    box(.022,.06,.009,0,-.15,.22,palette.paper,jacket);
    const hit=mesh(new THREE.PlaneGeometry(recordSpacing,.45),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false}),recordGroup);
    hit.position.set(x,.65,.453);hit.userData.recordIndex=index;
    hit.castShadow=false;hit.receiveShadow=false;
    recordHitTargets.push(hit);
    recordJackets.push(jacket);
    recordCovers.push(cover.image.toDataURL('image/png'));
  });
  const recordPlayer=new THREE.Group();recordGroup.add(recordPlayer);
  rounded(.97,.09,.66,.025,-.12,1.15,0,palette.dark,recordPlayer);
  cylinder(.265,.265,.024,-.22,1.214,0,'#1b2424',recordPlayer,64);
  const vinyl=new THREE.Group();vinyl.position.set(-.22,1.232,0);recordPlayer.add(vinyl);
  cylinder(.253,.253,.008,0,0,0,material('#252b2b',.28,.15),vinyl,64);
  for(const r of [.12,.15,.18,.21,.24]){const groove=mesh(new THREE.TorusGeometry(r,.002,4,64),'#424847',vinyl);groove.rotation.x=Math.PI/2;}
  cylinder(.083,.083,.009,0,.007,0,palette.terracotta,vinyl);
  box(.009,.005,.09,.025,.014,0,palette.cream,vinyl);
  cylinder(.014,.014,.03,0,.023,0,'#a8b0aa',vinyl);
  const tonearm=new THREE.Group();tonearm.position.set(.23,1.25,-.21);recordPlayer.add(tonearm);
  cylinder(.045,.045,.028,0,-.03,0,'#aab2ab',tonearm);
  rod([0,0,0],[-.06,0,.36],.013,'#c5c8ba',tonearm);
  rod([-.06,0,.36],[-.16,0,.4],.013,'#c5c8ba',tonearm);
  box(.053,.032,.084,-.175,-.01,.39,palette.cream,tonearm);
  cylinder(.019,.019,.012,-.52,1.211,.24,'#d3bc84',recordPlayer);
  const powerLight=material('#544c3b',.45);
  cylinder(.019,.019,.012,.26,1.211,.24,powerLight,recordPlayer);
  const sleeve=texture((ctx,w,h)=>{ctx.fillStyle='#d9ad74';ctx.fillRect(0,0,w,h);ctx.fillStyle='#354b40';ctx.beginPath();ctx.arc(w*.5,h*.51,w*.32,0,7);ctx.fill();ctx.fillStyle='#d9ad74';ctx.beginPath();ctx.arc(w*.5,h*.51,w*.1,0,7);ctx.fill();ctx.font='32px Georgia';ctx.textAlign='center';ctx.fillStyle='#354b40';ctx.font='17px Georgia';});
  box(.49,.53,.03,-.42,1.42,-.34,palette.paper,recordGroup);
  picture(.47,.51,-.42,1.42,-.321,sleeve,recordGroup);
  plant(2.9,.09,-1.1,1.05);
  // The globe rests directly on the desk without a stand.
  const globeX=2.3,globeZ=-1.99,globeRadius=.17,deskSurfaceY=1.43;
  const globe=new THREE.Group();globe.position.set(globeX,deskSurfaceY+globeRadius,globeZ);scene.add(globe);
  // Render the earth-widget palette on the room's sphere so the globe has real depth.
  // Its bundled Miniature Earth runtime is absent, so use the existing local map as a land mask.
  const globeMap=new THREE.TextureLoader().load('images/earth-blue-marble.jpg',loaded=>{
    const canvas=document.createElement('canvas');
    canvas.width=loaded.image.width;canvas.height=loaded.image.height;
    const context=canvas.getContext('2d');
    context.drawImage(loaded.image,0,0);
    const pixels=context.getImageData(0,0,canvas.width,canvas.height);
    for(let i=0;i<pixels.data.length;i+=4){
      const red=pixels.data[i],green=pixels.data[i+1],blue=pixels.data[i+2];
      const ocean=Math.min(1,Math.max(0,(blue-Math.max(red,green)-2)/6));
      const land=56,oceanColor=255;
      pixels.data[i]=land+(oceanColor-land)*ocean;
      pixels.data[i+1]=land+(oceanColor-land)*ocean;
      pixels.data[i+2]=land+(oceanColor-land)*ocean;
      pixels.data[i+3]=255-61*ocean;
    }
    context.putImageData(pixels,0,0);
    loaded.image=canvas;loaded.needsUpdate=true;
  });
  globeMap.colorSpace=THREE.SRGBColorSpace;
  mesh(new THREE.SphereGeometry(globeRadius,64,48),new THREE.MeshBasicMaterial({map:globeMap,transparent:true,toneMapped:false}),globe);

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
    deskBulbMaterial.emissiveIntensity=THREE.MathUtils.lerp(.75,1.8,t);
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
  const recordAudio=document.querySelector('#record-audio');
  const recordStatus=document.querySelector('#record-status');
  let recordPlaying=false;
  function updateRecordState(message){
    recordPlaying=!recordAudio.paused&&!recordAudio.ended&&recordAudio.readyState>=HTMLMediaElement.HAVE_FUTURE_DATA;
    powerLight.color.set(recordPlaying?'#f4a663':'#544c3b');
    powerLight.emissive.set(recordPlaying?'#b74722':'#000000');
    recordStatus.textContent=message||(recordPlaying?'正在播放：赤与青':'唱片机已暂停');
  }
  async function toggleRecord(){
    if(!recordAudio.paused){recordAudio.pause();return;}
    try{await recordAudio.play();}
    catch(error){
      if(error.name==='AbortError')return;
      updateRecordState('音频无法播放，请检查文件或浏览器设置');
      console.error('Record playback failed:',error);
    }
  }
  recordAudio.addEventListener('play',()=>updateRecordState('正在加载：赤与青'));
  recordAudio.addEventListener('playing',()=>updateRecordState());
  recordAudio.addEventListener('waiting',()=>updateRecordState('音频缓冲中'));
  recordAudio.addEventListener('pause',()=>updateRecordState());
  recordAudio.addEventListener('ended',()=>{recordAudio.currentTime=0;updateRecordState('唱片播放结束');});
  recordAudio.addEventListener('error',()=>updateRecordState('音频加载失败'));
  let elapsed = 0, lastTime = 0, frame = null;
  reducedMotion.addEventListener('change',()=>{animated=!reducedMotion.matches;});
  function resetView(){eye.set(.2,1.95,2.35);yaw=targetYaw=-.045;pitch=targetPitch=-.14;controls.update();}
  const raycaster=new THREE.Raycaster();
  raycaster.params.Line.threshold=.01;
  const pointer=new THREE.Vector2();
  const homePreview=document.querySelector('#home-preview');
  const recordPreview=document.querySelector('#record-preview');
  const retirementPreview=document.querySelector('#retirement-preview');
  const retirementDays=retirementPreview.querySelector('#retirement-days');
  const retirementClock=retirementPreview.querySelector('#retirement-clock');
  // 2067-06-22 00:00 in China Standard Time: the 63rd birthday under current policy.
  const retirementAt=new Date('2067-06-22T00:00:00+08:00').getTime();
  let retirementVisible=false,retirementTimer=null;
  function updateRetirementCountdown(){
    let remaining=Math.max(0,retirementAt-Date.now());
    const days=Math.floor(remaining/86400000);remaining%=86400000;
    const hours=Math.floor(remaining/3600000);remaining%=3600000;
    const minutes=Math.floor(remaining/60000);
    const seconds=Math.floor(remaining%60000/1000);
    retirementDays.textContent=days.toLocaleString('zh-CN');
    retirementClock.textContent=`${String(hours).padStart(2,'0')} 时 ${String(minutes).padStart(2,'0')} 分 ${String(seconds).padStart(2,'0')} 秒`;
  }
  function setRetirementPreview(visible,event){
    if(visible&&event){
      retirementPreview.style.setProperty('--retirement-x',`${Math.max(12,Math.min(event.clientX+22,innerWidth-312))}px`);
      retirementPreview.style.setProperty('--retirement-y',`${Math.max(12,Math.min(event.clientY+18,innerHeight-215))}px`);
    }
    if(retirementVisible===visible)return;
    retirementVisible=visible;
    retirementPreview.classList.toggle('is-visible',visible);
    retirementPreview.setAttribute('aria-hidden',String(!visible));
    if(visible){updateRetirementCountdown();retirementTimer=setInterval(updateRetirementCountdown,1000);}
    else{clearInterval(retirementTimer);retirementTimer=null;}
  }
  const recordPreviewImage=recordPreview.querySelector('img');
  let previewRecordIndex=-1;
  function setRecordPreview(index,event){
    const visible=index>=0;
    if(visible){
      if(index!==previewRecordIndex){
        recordPreviewImage.src=recordCovers[index];
        recordPreviewImage.alt=`${records[index].title}唱片封面`;
        recordPreview.querySelector('strong').textContent=records[index].title;
        recordPreview.querySelector('small').textContent=records[index].subtitle;
      }
      recordPreview.style.setProperty('--record-preview-x',`${Math.max(12,Math.min(event.clientX+22,innerWidth-202))}px`);
      recordPreview.style.setProperty('--record-preview-y',`${Math.max(12,Math.min(event.clientY+18,innerHeight-258))}px`);
    }
    previewRecordIndex=index;
    recordPreview.classList.toggle('is-visible',visible);
    recordPreview.setAttribute('aria-hidden',String(!visible));
  }
  const previewFrame=homePreview.querySelector('iframe');
  previewFrame.addEventListener('load',()=>{
    const previewDocument=previewFrame.contentDocument;
    previewDocument.documentElement.style.overflow='hidden';
    previewDocument.body.style.overflow='hidden';
  });
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
    laptop.localToWorld(previewAnchor.set(0,.32,-.29));
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
    const spineHit=raycaster.intersectObjects(recordHitTargets,false)[0];
    if(spineHit)return `record-${spineHit.object.userData.recordIndex}`;
    // The nearest visible surface must belong to the laptop.
    let object=raycaster.intersectObjects(scene.children,true)[0]?.object;
    while(object){
      if(Number.isInteger(object.userData.recordIndex))return `record-${object.userData.recordIndex}`;
      if(object===recordPlayer)return 'record-player';
      if(object===notebook)return 'notebook';
      if(object===laptop)return 'computer';
      if(object===bedsideLamp||object===deskLamp)return 'light';
      if(object===bedsideDrawer)return 'bedside-drawer';
      if(object===lowerBedsideDrawer)return 'lower-bedside-drawer';
      if(object===deskDrawer)return 'desk-drawer';
      object=object.parent;
    }
    return null;
  }
  let drag=null;
  host.addEventListener('pointerdown',event=>{
    if(!event.isPrimary || event.button!==0)return;
    setRetirementPreview(false);
    setRecordPreview(-1,event);
    host.focus({preventScroll:true});host.setPointerCapture(event.pointerId);
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,moved:false,target:interactiveTarget(event)};
  });
  host.addEventListener('pointermove',event=>{
    if(!drag){
      const target=interactiveTarget(event);
      host.style.cursor=/^record-\d+$/.test(target)?'zoom-in':target==='notebook'?'help':target?'pointer':'grab';
      setHomePreview(target==='computer');
      setRetirementPreview(target==='notebook',event);
      setRecordPreview(/^record-\d+$/.test(target)?Number(target.slice(7)):-1,event);
      if(previewVisible)updateHomePreview();
      return;
    }
    setHomePreview(false);
    setRetirementPreview(false);
    setRecordPreview(-1,event);
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
    if(activate&&action==='bedside-drawer')slidingDrawers[0].open=!slidingDrawers[0].open;
    if(activate&&action==='lower-bedside-drawer')slidingDrawers[1].open=!slidingDrawers[1].open;
    if(activate&&action==='desk-drawer')slidingDrawers[2].open=!slidingDrawers[2].open;
    if(activate&&/^record-\d+$/.test(action))setRecordPreview(Number(action.slice(7)),event);
    if(activate&&action==='record-player')toggleRecord();
  }
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>host.addEventListener(type,endDrag));
  host.addEventListener('pointerleave',event=>{if(!drag)host.style.cursor='grab';setHomePreview(false);setRetirementPreview(false);setRecordPreview(-1,event);});
  // Floor-plan collision volumes for furniture.
  const obstacles = [
    [-3.24,-1.2,-1.3,1.85], // bed
    [-3.16,-.95,-2.78,-2.17], // bookshelf
    [-.14,2.64,-2.28,-1.08], // desk
    [.64,1.6,-1.08,.05], // chair
    [2.18,3.08,.77,2.29], // record cabinet
    [-1.15,-.49,-1.25,-.6], // bedside table
    [2.67,3.13,-1.33,-.87] // plant
  ];
  const bodyRadius=.16;
  function walkable(x,z){
    if(x < -3.42+bodyRadius || x > 3.42-bodyRadius || z < -2.83+bodyRadius || z > 2.83-bodyRadius)return false;
    const drawerObstacles=[];
    if(Math.max(bedsideDrawer.position.z,lowerBedsideDrawer.position.z)>.02)drawerObstacles.push([-1.12,-.52,-.6,-.62+Math.max(bedsideDrawer.position.z,lowerBedsideDrawer.position.z)]);
    if(deskDrawer.position.z>.13)drawerObstacles.push([1.72,2.4,-1.08,-1.21+deskDrawer.position.z]);
    return ![...obstacles,...drawerObstacles].some(([left,right,back,front])=>{
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
    if(event.code==='KeyR'){event.preventDefault();if(!event.repeat)toggleRecord();return;}
    if(movementKeys.includes(event.code)){event.preventDefault();heldKeys.add(event.code);return;}
    if(event.code==='Space'){event.preventDefault();if(!event.repeat)animated=!animated;return;}
    if(event.key==='Home'){event.preventDefault();heldKeys.clear();resetView();}
  });
  window.addEventListener('keyup',event=>heldKeys.delete(event.code));
  window.addEventListener('blur',()=>{heldKeys.clear();drag=null;host.style.cursor='grab';setRetirementPreview(false);setRecordPreview(-1);});
  host.addEventListener('blur',()=>heldKeys.clear());
  document.addEventListener('visibilitychange',()=>{heldKeys.clear();if(document.hidden)setRetirementPreview(false);});
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
    for(const drawer of slidingDrawers){
      const target=drawer.open?drawer.travel:0;
      drawer.group.position.z=reducedMotion.matches?target:THREE.MathUtils.damp(drawer.group.position.z,target,12,delta);
    }
    recordJackets.forEach((jacket,index)=>{
      const selected=index===previewRecordIndex;
      const z=selected?.62:.22,angle=selected?-Math.PI/2:0;
      jacket.position.z=reducedMotion.matches?z:THREE.MathUtils.damp(jacket.position.z,z,13,delta);
      jacket.rotation.y=reducedMotion.matches?angle:THREE.MathUtils.damp(jacket.rotation.y,angle,13,delta);
    });
    if(recordPlaying&&!reducedMotion.matches)vinyl.rotation.y-=delta*3.49;
    tonearm.rotation.y=reducedMotion.matches?(recordPlaying?-.42:0):THREE.MathUtils.damp(tonearm.rotation.y,recordPlaying?-.42:0,6,delta);
    if(animated){elapsed+=delta;globe.rotation.y=elapsed*.28;}
    renderer.render(scene,camera);frame=requestAnimationFrame(render);
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden){recordAudio.pause();cancelAnimationFrame(frame);frame=null;}else if(frame===null){lastTime=0;frame=requestAnimationFrame(render);}});
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();recordAudio.pause();cancelAnimationFrame(frame);loading.hidden=false;loading.dataset.error='true';loading.setAttribute('aria-label','图形显示已中断，请刷新页面。');});
  renderer.setSize(host.clientWidth,host.clientHeight);camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();resetView();
  renderer.render(scene,camera);loading.hidden=true;frame=requestAnimationFrame(render);
} catch(error) {
  loading.hidden=false;loading.dataset.error='true';loading.setAttribute('aria-label','房间无法加载，请使用支持 WebGL 的浏览器刷新重试。');
  console.error('Room initialization failed:',error);
}

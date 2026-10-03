import * as THREE from './vendor/three.module.min.js';
import { createPortalDoor } from './portal-door.js?v=5';

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
  // A moderate field of view keeps furniture proportions natural near the edges.
  const camera = new THREE.PerspectiveCamera(55, 1, .05, 80);
  // Walk freely inside the room while keeping an upright eye level.
  const eye = new THREE.Vector3(.2, 1.95, 2.35);
  let yaw = 1.25, pitch = -.14, targetYaw = yaw, targetPitch = pitch;
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
  box(7.2,.16,6.04,0,3.76,0,'#091225');
  // Daytime clouds tile seamlessly as they drift across the inner ceiling.
  const dayCeilingSky=texture((ctx,w,h)=>{
    ctx.fillStyle='#68b8ed';ctx.fillRect(0,0,w,h);
    let seed=2047;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<12;i++){
      const centerX=random()*w,centerY=random()*h,size=65+random()*65;
      for(let puff=0;puff<12;puff++){
        const x=centerX+(random()-.5)*size*2.6,y=centerY+(random()-.5)*size*.8;
        const radius=size*(.4+random()*.45);
        for(const dx of [-w,0,w])for(const dy of [-h,0,h]){
          ctx.save();ctx.translate(x+dx,y+dy);ctx.scale(1,.7);
          const glow=ctx.createRadialGradient(0,0,0,0,0,radius);
          glow.addColorStop(0,'#ffffffb8');glow.addColorStop(.55,'#f6fbff80');glow.addColorStop(1,'#ffffff00');
          ctx.fillStyle=glow;ctx.fillRect(-radius,-radius,radius*2,radius*2);ctx.restore();
        }
      }
    }
  },1024,1024);
  dayCeilingSky.wrapS=dayCeilingSky.wrapT=THREE.RepeatWrapping;
  const dayCeiling=mesh(new THREE.PlaneGeometry(7.04,5.88),new THREE.MeshBasicMaterial({map:dayCeilingSky,toneMapped:false}));
  dayCeiling.rotation.x=Math.PI/2;dayCeiling.position.y=3.678;
  dayCeiling.castShadow=false;dayCeiling.receiveShadow=false;
  // The star layer fades in with the room's night theme.
  const ceilingSky=texture((ctx,w,h)=>{
    const background=ctx.createLinearGradient(0,0,w,h);
    background.addColorStop(0,'#070e20');background.addColorStop(.5,'#14233e');background.addColorStop(1,'#080e22');
    ctx.fillStyle=background;ctx.fillRect(0,0,w,h);
    let seed=7319;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    // Soft, overlapping clouds form a diagonal Milky Way without hard edges.
    ctx.globalCompositeOperation='screen';
    for(let i=0;i<32;i++){
      const x=w*(i/31),y=h*(.76-.5*i/31)+(random()-.5)*h*.15;
      const radius=120+random()*190;
      const cloud=ctx.createRadialGradient(x,y,0,x,y,radius);
      cloud.addColorStop(0,i%3===0?'#6a508b12':'#6f9cb515');cloud.addColorStop(1,'#00000000');
      ctx.fillStyle=cloud;ctx.fillRect(x-radius,y-radius,radius*2,radius*2);
    }
    for(let i=0;i<1100;i++){
      const x=random()*w,y=random()*h,bright=random();
      const radius=bright>.985?2.2:bright>.85?1.15:.45+random()*.4;
      ctx.globalAlpha=.3+random()*.7;
      ctx.fillStyle=i%7===0?'#ffe7bd':'#dcecff';
      ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();
      if(bright>.985){
        const glow=ctx.createRadialGradient(x,y,0,x,y,13);
        glow.addColorStop(0,'#c9e5ff80');glow.addColorStop(1,'#c9e5ff00');
        ctx.fillStyle=glow;ctx.fillRect(x-13,y-13,26,26);
        ctx.globalAlpha=.45;ctx.fillStyle='#e9f3ff';
        ctx.fillRect(x-5,y-.4,10,.8);ctx.fillRect(x-.4,y-5,.8,10);
      }
    }
    ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  },2048,1720);
  const starCeiling=mesh(new THREE.PlaneGeometry(7.04,5.88),new THREE.MeshBasicMaterial({map:ceilingSky,toneMapped:false,transparent:true,depthWrite:false}));
  starCeiling.rotation.x=Math.PI/2;starCeiling.position.y=3.676;
  starCeiling.castShadow=false;starCeiling.receiveShadow=false;
  box(.06,.12,5.9,3.4,.13,0,'#e0d3b7');
  box(7,.12,.06,0,.13,2.82,'#c9ceb9');
  for(const x of [-3.4,3.4])box(.1,.13,5.8,x,3.6,0,'#eee4cf');
  for(const z of [-2.82,2.82])box(6.8,.13,.1,0,3.6,z,'#eee4cf');
  // Place the portal on the clear front wall beside the record cabinet.
  const portalDoor=createPortalDoor(THREE);
  portalDoor.group.position.set(1.55,1.39,2.74);
  portalDoor.group.rotation.y=Math.PI;
  portalDoor.group.scale.setScalar(0);
  scene.add(portalDoor.group);
  let portalOpenTarget=0;

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
  // Draw the transparent night view before foreground transparent objects such as the globe.
  nightGlass.renderOrder=-1;
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
  const sideArt = new THREE.Group(); sideArt.position.set(-3.42,2.45,-1.3); sideArt.rotation.y=Math.PI/2;leftWall.add(sideArt);
  const sideMap=new THREE.TextureLoader().load('images/bedside-photo.webp');
  sideMap.colorSpace=THREE.SRGBColorSpace;
  sideMap.anisotropy=renderer.capabilities.getMaxAnisotropy();
  box(1.68,1.28,.07,0,0,0,palette.lightWood,sideArt);
  picture(1.56,1.17,0,0,.04,sideMap,sideArt);

  // Low bookshelf: open cubbies, varied books, a ceramic vase and a plant.
  const bedLengthAdd=.18;
  const shelf = new THREE.Group(); shelf.position.set(-3.07, 0, 1.45+bedLengthAdd); shelf.rotation.y=Math.PI/2; scene.add(shelf);
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
  plant(-.69, 1.82, .07, .7, shelf);
  cylinder(.1,.14,.32,.68,1.98,.04,'#e8d2ae',shelf);
  cylinder(.065,.09,.12,.68,2.19,.04,'#e8d2ae',shelf);

  // Bed, turned-down sage duvet, pillows and timber headboard.
  const bed = new THREE.Group(); bed.position.set(-2.44,0,-1.3); scene.add(bed);
  for(const x of [-.76,.76])for(const z of [-1.25,1.25+bedLengthAdd]) cylinder(.065,.055,.3,x,.22,z,palette.edge,bed);
  rounded(1.96,.2,3.08+bedLengthAdd,.04,0,.4,bedLengthAdd/2,palette.wood,bed);
  rounded(1.92,.94,.13,.035,0,.84,-1.43,palette.lightWood,bed);
  for(let i=0;i<8;i++)box(.028,.73,.025,-.78+i*.223,.88,-1.345,'#ba9264',bed);
  rounded(1.85,.26,2.9+bedLengthAdd,.09,0,.6,bedLengthAdd/2,palette.cream,bed);
  rounded(1.68,.12,1.76+bedLengthAdd,.055,0,.79,.43+bedLengthAdd/2,palette.sage,bed);
  rounded(1.7,.07,.34,.025,0,.865,-.37,'#a5b298',bed);
  rounded(.76,.17,.49,.07,-.46,.84,-.93,'#f7ead3',bed).rotation.y = -.055;
  rounded(.76,.17,.49,.07,.42,.84,-.93,'#eee0c9',bed).rotation.y = .04;
  for(let i=0;i<7;i++)box(.018,.007,1.61+bedLengthAdd,-.69+i*.23,.855,.47+bedLengthAdd/2,'#90a184',bed);
  rounded(.53,.025,1.64+bedLengthAdd,.012,.49,.87,.47+bedLengthAdd/2,'#c28e66',bed);
  for(let i=0;i<5;i++)box(.009,.004,1.6+bedLengthAdd,.29+i*.095,.885,.47+bedLengthAdd/2,'#e0b68c',bed);
  // Drawer boxes slide out of hollow cabinets, rather than through solid blocks.
  const slidingDrawers=[];
  const bedsideCabinet=new THREE.Group();bedsideCabinet.position.set(-1.04,0,-2.52);scene.add(bedsideCabinet);
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
  const bedsideLamp=new THREE.Group();bedsideLamp.position.set(-.22,0,-1.6);scene.add(bedsideLamp);
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
  rounded(.28,.003,.17,.001,0,.016,.187,'#111317',laptop);
  rounded(.275,.003,.165,.001,0,.018,.187,'#303339',laptop);
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

  // A white levitating chair: ceramic shell, soft upholstery and an ion drive.
  const chair = new THREE.Group(); chair.position.set(1.12,0,-.46);scene.add(chair);
  const chairShell=new THREE.MeshStandardMaterial({color:'#f5f8fc',emissive:'#dce6f2',emissiveIntensity:.12,roughness:.26,metalness:.18});
  const chairCushion=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.85});
  const chairMetal=new THREE.MeshStandardMaterial({color:'#bccbd7',roughness:.3,metalness:.8});
  const chairGlow=new THREE.MeshStandardMaterial({color:'#b9f4ff',emissive:'#39cfff',emissiveIntensity:2,roughness:.25});
  rounded(.82,.15,.74,.065,0,.76,-.02,chairShell,chair);
  rounded(.68,.075,.6,.035,0,.867,-.055,chairCushion,chair);
  const chairBack=new THREE.Group();chairBack.position.set(0,.83,.28);chairBack.rotation.x=.12;chair.add(chairBack);
  rounded(.78,.94,.15,.07,0,.43,.05,chairShell,chairBack);
  rounded(.63,.61,.075,.035,0,.34,-.06,chairCushion,chairBack);
  rounded(.44,.17,.08,.035,0,.75,-.055,chairCushion,chairBack);
  // Recessed light strips outline the shell without overpowering its white finish.
  for(const side of [-1,1])rounded(.014,.67,.008,.003,side*.35,.44,-.029,chairGlow,chairBack);
  for(const side of [-1,1])rounded(.012,.54,.008,.003,side*.31,.44,.129,chairGlow,chairBack);
  for(const y of [.2,.29,.38])rounded(.35,.018,.008,.003,0,y,.129,chairMetal,chairBack);
  for(const side of [-1,1]){
    const armCurve=new THREE.CatmullRomCurve3([
      new THREE.Vector3(side*.34,.8,.2),
      new THREE.Vector3(side*.39,.96,.12),
      new THREE.Vector3(side*.39,1.04,-.12),
      new THREE.Vector3(side*.37,1.02,-.31)
    ]);
    mesh(new THREE.TubeGeometry(armCurve,24,.055,12,false),chairShell,chair);
    rounded(.105,.035,.32,.015,side*.39,1.073,-.14,chairCushion,chair);
    rounded(.017,.008,.15,.003,side*.39,1.095,-.19,chairGlow,chair);
  }
  cylinder(.23,.19,.10,0,.645,0,chairMetal,chair,48);
  cylinder(.18,.22,.075,0,.56,0,chairShell,chair,48);
  const chairDrive=new THREE.Group();chairDrive.position.y=.51;chair.add(chairDrive);
  const driveRing=mesh(new THREE.TorusGeometry(.235,.016,12,64),chairGlow,chairDrive);driveRing.rotation.x=Math.PI/2;
  for(let i=0;i<3;i++){
    const arc=mesh(new THREE.TorusGeometry(.275,.012,8,32,Math.PI*.42),chairGlow,chairDrive);
    arc.rotation.set(Math.PI/2,0,i*Math.PI*2/3);arc.position.y=-.06;
  }
  const hoverLight=new THREE.PointLight('#7fe0ff',.3,1.6,2);hoverLight.position.set(0,.43,0);chair.add(hoverLight);
  // A fixed floor glow makes the open space beneath the floating seat readable.
  const hoverPoolMap=texture((ctx,w,h)=>{
    const glow=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);
    glow.addColorStop(0,'#6edfff65');glow.addColorStop(.5,'#50d6ff28');glow.addColorStop(1,'#50d6ff00');
    ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
  },128,128);
  const hoverPool=mesh(new THREE.PlaneGeometry(.95,.95),new THREE.MeshBasicMaterial({map:hoverPoolMap,transparent:true,depthWrite:false,toneMapped:false}));
  hoverPool.rotation.x=-Math.PI/2;hoverPool.position.set(1.12,.087,-.46);hoverPool.castShadow=false;hoverPool.receiveShadow=false;
  // Record cabinet with vertically stored sleeves and a working turntable.
  const recordGroup=new THREE.Group();recordGroup.position.set(2.93,0,1.78);recordGroup.rotation.y=-Math.PI/2;scene.add(recordGroup);
  for(const x of [-.59,.59])for(const z of [-.3,.3])cylinder(.035,.025,.22,x,.18,z,palette.edge,recordGroup);
  box(1.42,.07,.8,0,.33,0,palette.wood,recordGroup);
  box(1.32,.055,.74,0,.4,0,palette.lightWood,recordGroup);
  for(const x of [-.675,.675])box(.07,.7,.8,x,.68,0,palette.wood,recordGroup);
  box(.06,.67,.76,0,.675,0,palette.lightWood,recordGroup);
  for(const y of [.39,.99])box(1.32,.045,.045,0,y,-.36,palette.edge,recordGroup);
  box(1.5,.09,.87,0,1.06,0,palette.lightWood,recordGroup);
  const records=[
    {title:'赤与青',subtitle:'RED & BLUE',background:'#e3211c',accent:'#078cba',cover:'images/red-and-blue-cover.webp',audio:'audio/赤与青.m4a'},
    {title:'鱼仔',subtitle:'卢广仲 · HE-R',background:'#ece7d6',accent:'#292525',cover:'images/fish-cover.webp',audio:'audio/鱼仔.m4a'},
    {title:'我想念',subtitle:'汪苏泷 · 我想念',background:'#253dc2',accent:'#f2eedf',cover:'images/i-miss-you-cover.png',audio:'audio/我想念.m4a'},
    {title:'在深秋',subtitle:'在深秋',background:'#999589',accent:'#fffef0',cover:'images/in-late-autumn-cover.png',audio:'audio/在深秋.m4a'},
    {title:'慢慢来',subtitle:'SLOW DAYS',background:'#756b89',accent:'#f3c5a5'},
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
  const recordCovers=[],recordCoverMaps=[],recordJackets=[],recordHitTargets=[];
  const recordsPerBay=14,recordSpacing=.041;
  records.forEach((record,index)=>{
    const cover=record.cover?new THREE.TextureLoader().load(record.cover):texture((ctx,w,h)=>{
      ctx.fillStyle=record.background;ctx.fillRect(0,0,w,h);
      ctx.fillStyle=record.accent;
      if(index%4===0){ctx.beginPath();ctx.arc(w*.52,h*.43,w*.27,0,Math.PI*2);ctx.fill();ctx.fillStyle=record.background;ctx.beginPath();ctx.arc(w*.52,h*.43,w*.16,0,Math.PI*2);ctx.fill();}
      if(index%4===1){for(let i=0;i<6;i++)ctx.fillRect(50+i*76,95+(i%3)*35,40,250-(i%3)*35);}
      if(index%4===2){for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(w*.5,h*.58+i*42,w*.45+i*35,Math.PI,Math.PI*2);ctx.strokeStyle=record.accent;ctx.lineWidth=16;ctx.stroke();}}
      if(index%4===3){ctx.beginPath();ctx.arc(w*.5,h*.42,w*.25,0,Math.PI*2);ctx.fill();ctx.fillRect(0,h*.43,w,h*.08);}
      ctx.fillStyle='#fff8e9';ctx.font='bold 52px sans-serif';ctx.textAlign='left';ctx.fillText(record.title,32,h-98);
      ctx.font='24px sans-serif';ctx.fillText(record.subtitle,34,h-54);
    });
    if(record.cover){cover.colorSpace=THREE.SRGBColorSpace;cover.anisotropy=renderer.capabilities.getMaxAnisotropy();}
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
    recordCoverMaps.push(cover);
    recordCovers.push(record.cover||cover.image.toDataURL('image/png'));
  });
  // Leave a visible margin around the turntable on the 1.5 by .87 cabinet top.
  const recordPlayer=new THREE.Group();recordPlayer.position.x=-.18;recordPlayer.scale.set(.76,1,.82);recordGroup.add(recordPlayer);
  rounded(.97,.09,.66,.018,-.12,1.15,0,'#293f38',recordPlayer);
  // Seat trim and fittings against the plinth's front (z=.33) and top (y=1.195).
  const playerFront=.33,playerTop=1.195;
  box(.88,.008,.006,-.12,1.17,playerFront,'#a9b8ad',recordPlayer);
  cylinder(.265,.265,.02,-.22,1.204,0,'#1b2424',recordPlayer,64);
  const platterRim=mesh(new THREE.TorusGeometry(.263,.005,8,64),'#a7b4ab',recordPlayer);
  platterRim.rotation.x=Math.PI/2;platterRim.position.set(-.22,1.215,0);
  const vinyl=new THREE.Group();vinyl.position.set(-.22,1.216,0);recordPlayer.add(vinyl);
  cylinder(.253,.253,.008,0,0,0,material('#252b2b',.28,.15),vinyl,64);
  for(const r of [.12,.15,.18,.21,.24]){const groove=mesh(new THREE.TorusGeometry(r,.002,4,64),'#424847',vinyl);groove.rotation.x=Math.PI/2;groove.position.y=.006;}
  cylinder(.083,.083,.009,0,.007,0,palette.terracotta,vinyl);
  box(.009,.005,.09,.025,.014,0,palette.cream,vinyl);
  cylinder(.014,.014,.03,0,.023,0,'#a8b0aa',vinyl);
  cylinder(.049,.049,.024,.23,playerTop+.012,-.21,'#8d9f95',recordPlayer);
  const tonearm=new THREE.Group();tonearm.position.set(.23,1.235,-.21);recordPlayer.add(tonearm);
  cylinder(.045,.045,.028,0,-.03,0,'#aab2ab',tonearm);
  rod([0,0,0],[-.04,0,.25],.013,'#c5c8ba',tonearm);
  rod([-.04,0,.25],[-.14,0,.31],.013,'#c5c8ba',tonearm);
  box(.053,.032,.07,-.16,-.01,.31,palette.cream,tonearm);
  cylinder(.019,.019,.012,-.52,playerTop+.006,.24,'#d3bc84',recordPlayer);
  const powerLight=material('#544c3b',.45);
  cylinder(.019,.019,.012,.26,playerTop+.006,.24,powerLight,recordPlayer);
  const titleTexture=texture(()=>{},512,128);
  function showRecordTitle(index){
    const ctx=titleTexture.image.getContext('2d');
    ctx.fillStyle='#1d302a';ctx.fillRect(0,0,512,128);
    ctx.fillStyle='#f5e9cb';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font=`bold ${records[index].title.length>5?48:68}px sans-serif`;
    ctx.fillText(records[index].title,256,65,470);
    titleTexture.needsUpdate=true;
  }
  picture(.31,.055,.14,1.15,playerFront+.001,titleTexture,recordPlayer);
  showRecordTitle(0);
  // Portal gun floats over the free end of the record cabinet, beside the turntable.
  const portalGun=new THREE.Group();
  const gunHoverBaseY=1.49;
  let gunHoverTime=0;
  portalGun.position.set(2.85,gunHoverBaseY,recordGroup.position.z+.34);
  // The barrel points along local +Z; aim it at the portal on the front wall.
  portalGun.rotation.y=Math.atan2(portalDoor.group.position.x-portalGun.position.x,portalDoor.group.position.z-portalGun.position.z);
  portalGun.rotation.z=-.1;
  portalGun.scale.setScalar(.9);
  portalGun.userData.isPortalGun=true;
  scene.add(portalGun);
  // Pale shell, rear grip, upright energy cell and three-lens muzzle.
  const gunShell=new THREE.MeshStandardMaterial({color:'#dce0dc',roughness:.43,metalness:.18,emissive:'#aeb5ae',emissiveIntensity:.5});
  const gunDark=material('#24282a',.76,.08);
  rounded(.18,.026,.42,.009,0,-.037,.06,gunDark,portalGun); // lower seam
  rounded(.19,.075,.45,.018,0,.015,.06,gunShell,portalGun);
  const gunGrip=rounded(.065,.225,.062,.025,0,-.145,-.112,gunShell,portalGun);
  gunGrip.rotation.x=.45;
  sphere(0,-.09,-.106,.02,gunDark,portalGun,[1,.8,1]);
  const canisterBase=material('#95a99b',.35,.32);
  const canisterZ=.15;
  cylinder(.052,.055,.018,0,.075,canisterZ,canisterBase,portalGun,24);
  const canisterGlass=new THREE.MeshBasicMaterial({color:'#10c82d',transparent:true,opacity:.86,depthWrite:false,toneMapped:false});
  cylinder(.034,.038,.10,0,.131,canisterZ,canisterGlass,portalGun,28);
  sphere(0,.186,canisterZ,.034,canisterGlass,portalGun,[1,.55,1]);
  cylinder(.018,.022,.072,0,.131,canisterZ,new THREE.MeshBasicMaterial({color:'#48ff4c',transparent:true,opacity:.72,depthWrite:false,toneMapped:false}),portalGun,20);
  // Recessed red readout and the small button behind it.
  const gunReadout=texture((ctx,w,h)=>{
    ctx.fillStyle='#151b1b';ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='#697171';ctx.lineWidth=18;ctx.strokeRect(12,12,w-24,h-24);
    ctx.fillStyle='#4a1516';ctx.fillRect(35,35,w-70,h-70);
    ctx.font='bold 86px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle='#ef4038';ctx.fillText('Maroesl',w/2,h/2+10,w-90);
  },512,256);
  const readout=mesh(new THREE.PlaneGeometry(.10,.055),new THREE.MeshBasicMaterial({map:gunReadout,side:THREE.DoubleSide}),portalGun);
  readout.rotation.x=-Math.PI/2;readout.position.set(0,.076,-.025);
  cylinder(.026,.026,.012,0,.076,-.105,'#343a3a',portalGun,24);
  cylinder(.008,.008,.003,0,.084,-.105,'#222626',portalGun,16);
  // Dark front plate with three green emitter lenses.
  rounded(.18,.065,.012,.005,0,.014,.288,gunDark,portalGun);
  const lensRim=new THREE.MeshBasicMaterial({color:'#111819'});
  const lensGlow=new THREE.MeshBasicMaterial({color:'#25e939',toneMapped:false});
  for(const x of [-.055,0,.055]){
    const rim=mesh(new THREE.CircleGeometry(.019,24),lensRim,portalGun);
    rim.position.set(x,.014,.296);
    const lens=mesh(new THREE.CircleGeometry(.012,24),lensGlow,portalGun);
    lens.position.set(x,.014,.297);
  }
  // Invisible hit box for raycasting
  const gunHitBox=mesh(new THREE.BoxGeometry(.24,.51,.49),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false}),portalGun);
  gunHitBox.position.set(0,-.035,.065);gunHitBox.castShadow=false;gunHitBox.receiveShadow=false;
  // Bright green glow so it's easy to spot from across the room
  const gunPointLight=new THREE.PointLight('#43ff58',.65,.9,2);
  portalGun.add(gunPointLight);gunPointLight.position.set(0,.16,canisterZ);
  box(.49,.53,.03,-.42,1.42,-.34,palette.paper,recordGroup);
  const displayedSleeve=picture(.47,.51,-.42,1.42,-.321,recordCoverMaps[0],recordGroup);
  plant(2.9,.09,-1.1,1.05);
  // The globe hovers slightly above the desk without a stand.
  const globeX=2.2,globeZ=-1.47,globeRadius=.17,deskSurfaceY=1.43,globeHover=.07;
  const globe=new THREE.Group();globe.position.set(globeX,deskSurfaceY+globeRadius+globeHover,globeZ);scene.add(globe);
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
      const land=56;
      pixels.data[i]=land+(255-land)*ocean;
      pixels.data[i+1]=land+(255-land)*ocean;
      pixels.data[i+2]=land+(255-land)*ocean;
      pixels.data[i+3]=255-155*ocean;
    }
    context.putImageData(pixels,0,0);
    loaded.image=canvas;loaded.needsUpdate=true;
  });
  globeMap.colorSpace=THREE.SRGBColorSpace;
  mesh(new THREE.SphereGeometry(globeRadius,64,48),new THREE.MeshBasicMaterial({map:globeMap,transparent:true,depthWrite:false,toneMapped:false}),globe);

  let themeBlend=window.roomTheme.value==='dark'?1:0;
  let themeTarget=themeBlend;
  let themeFrom=themeBlend,themeTransitionStart=0;
  const themeTransitionDuration=1200;
  const darkAmbient=new THREE.Color('#9badcd');
  const darkGround=new THREE.Color('#303c52');
  const darkFill=new THREE.Color('#829ed5');
  function updateRoomTheme(t){
    ambient.intensity=THREE.MathUtils.lerp(2.5,.65,t);
    ambient.color.set('#fff1d7').lerp(darkAmbient,t);
    ambient.groundColor.set('#7c8773').lerp(darkGround,t);
    sun.intensity=THREE.MathUtils.lerp(4.2,.25,t);
    fill.intensity=THREE.MathUtils.lerp(1.4,.45,t);
    fill.color.set('#d5e7ee').lerp(darkFill,t);
    lampLight.intensity=THREE.MathUtils.lerp(.6,1.2,t);
    deskBulbMaterial.emissiveIntensity=THREE.MathUtils.lerp(.75,1.8,t);
    nightGlass.material.opacity=t;
    dayCeiling.visible=t<1;
    starCeiling.visible=t>0;
    starCeiling.material.opacity=t;
    renderer.toneMappingExposure=THREE.MathUtils.lerp(1.12,.95,t);
  }
  function applyRoomTheme(){
    const nextTheme=window.roomTheme.value==='dark'?1:0;
    if(nextTheme!==themeTarget){
      themeFrom=themeBlend;
      themeTarget=nextTheme;
      themeTransitionStart=performance.now();
    }
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
  let selectedRecordIndex=0;
  function updateRecordState(message){
    recordPlaying=!recordAudio.paused&&!recordAudio.ended&&recordAudio.readyState>=HTMLMediaElement.HAVE_FUTURE_DATA;
    powerLight.color.set(recordPlaying?'#f4a663':'#544c3b');
    powerLight.emissive.set(recordPlaying?'#b74722':'#000000');
    recordStatus.textContent=message||(recordPlaying?`正在播放：${records[selectedRecordIndex].title}`:'唱片机已暂停');
  }
  async function startRecord(){
    try{await recordAudio.play();}
    catch(error){
      if(error.name==='AbortError')return;
      updateRecordState('音频无法播放，请检查文件或浏览器设置');
      console.error('Record playback failed:',error);
    }
  }
  function toggleRecord(){
    if(!recordAudio.paused){recordAudio.pause();return;}
    if(!records[selectedRecordIndex].audio){updateRecordState(`已选择：${records[selectedRecordIndex].title}（暂无音源）`);return;}
    startRecord();
  }
  function playRecord(index){
    selectedRecordIndex=index;
    displayedSleeve.material.map=recordCoverMaps[index];
    displayedSleeve.material.needsUpdate=true;
    showRecordTitle(index);
    const audio=records[index].audio;
    if(!audio){recordAudio.pause();updateRecordState(`已选择：${records[index].title}（暂无音源）`);return;}
    if(recordAudio.getAttribute('src')!==audio)recordAudio.src=audio;
    recordAudio.currentTime=0;
    startRecord();
  }
  recordAudio.addEventListener('play',()=>updateRecordState(`正在加载：${records[selectedRecordIndex].title}`));
  recordAudio.addEventListener('playing',()=>updateRecordState());
  recordAudio.addEventListener('waiting',()=>updateRecordState('音频缓冲中'));
  recordAudio.addEventListener('pause',()=>updateRecordState());
  recordAudio.addEventListener('ended',()=>{recordAudio.currentTime=0;updateRecordState('唱片播放结束');});
  recordAudio.addEventListener('error',()=>updateRecordState('音频加载失败'));
  let elapsed = 0, lastTime = 0, frame = null;
  reducedMotion.addEventListener('change',()=>{animated=!reducedMotion.matches;});
  function resetView(){eye.set(.2,1.95,2.35);yaw=targetYaw=1.25;pitch=targetPitch=-.14;controls.update();}
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
        recordPreview.querySelector('small').textContent=`${records[index].subtitle} · ${records[index].audio?'点击播放':'暂无音源'}`;
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
    if(raycaster.intersectObject(gunHitBox,false).length)return 'portal-gun';
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
      if(object.userData.isPortalGun||object.parent?.userData.isPortalGun)return 'portal-gun';
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
    if(activate&&/^record-\d+$/.test(action)){
      const index=Number(action.slice(7));
      setRecordPreview(index,event);
      playRecord(index);
    }
    if(activate&&action==='record-player')toggleRecord();
    if(activate&&action==='portal-gun'){portalOpenTarget=portalOpenTarget>0.5?0:1;}
  }
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>host.addEventListener(type,endDrag));
  host.addEventListener('pointerleave',event=>{if(!drag)host.style.cursor='grab';setHomePreview(false);setRetirementPreview(false);setRecordPreview(-1,event);});
  // Floor-plan collision volumes for furniture.
  const obstacles = [
    [-3.42,-1.46,-2.84,.24+bedLengthAdd], // bed
    [-3.36,-2.78,.35+bedLengthAdd,2.55+bedLengthAdd], // bookshelf against the left wall at the foot of the bed
    [-.14,2.64,-2.28,-1.08], // desk
    [.64,1.6,-1.08,.2], // chair, including its reclined back
    [2.49,3.37,1.02,2.54], // record cabinet against the right wall
    [-1.36,-.72,-2.84,-2.2], // bedside table
    [2.67,3.13,-1.33,-.87] // plant
  ];
  const bodyRadius=.16;
  function walkable(x,z){
    if(x < -3.42+bodyRadius || x > 3.42-bodyRadius || z < -2.83+bodyRadius || z > 2.83-bodyRadius)return false;
    const drawerObstacles=[];
    if(Math.max(bedsideDrawer.position.z,lowerBedsideDrawer.position.z)>.02)drawerObstacles.push([-1.34,-.74,-2.21,-2.23+Math.max(bedsideDrawer.position.z,lowerBedsideDrawer.position.z)]);
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
    if(themeBlend!==themeTarget){
      const progress=reducedMotion.matches?1:THREE.MathUtils.clamp((time-themeTransitionStart)/themeTransitionDuration,0,1);
      // Ease gently at both ends, and finish exactly at the target theme.
      const eased=progress*progress*progress*(progress*(progress*6-15)+10);
      themeBlend=progress===1?themeTarget:THREE.MathUtils.lerp(themeFrom,themeTarget,eased);
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
    const armTarget=recordPlaying?-.42:0;
    tonearm.rotation.y=reducedMotion.matches?armTarget:THREE.MathUtils.damp(tonearm.rotation.y,armTarget,6,delta);
    if(animated){elapsed+=delta;globe.rotation.y=elapsed*.28;}
    if(animated&&!reducedMotion.matches&&dayCeiling.visible){
      dayCeilingSky.offset.x=(dayCeilingSky.offset.x+delta*.008)%1;
      dayCeilingSky.offset.y=(dayCeilingSky.offset.y+delta*.002)%1;
    }
    if(animated&&!reducedMotion.matches)gunHoverTime+=delta;
    chair.position.y=reducedMotion.matches?0:Math.sin(gunHoverTime*1.5)*.025;
    chairDrive.rotation.y=gunHoverTime*.35;
    portalGun.position.y=gunHoverBaseY+(reducedMotion.matches?0:Math.sin(gunHoverTime*2.1)*.035);
    portalDoor.uniforms.uTime.value=elapsed;
    // Fade the portal light with its opening so a closed portal cannot tint the wall.
    const portalScaleCurrent=portalDoor.group.scale.x;
    const portalScaleTarget=portalOpenTarget;
    const portalScale=reducedMotion.matches||Math.abs(portalScaleCurrent-portalScaleTarget)<.001
      ?portalScaleTarget:THREE.MathUtils.damp(portalScaleCurrent,portalScaleTarget,8,delta);
    portalDoor.group.scale.setScalar(portalScale);
    portalDoor.light.intensity=THREE.MathUtils.lerp(1.8,2.8,themeBlend)*portalScale;
    gunPointLight.intensity=.65*portalScale;
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

/* Local, procedural Three.js scenes. No models, textures or fonts are fetched. */
'use strict';
(() => {
  const T = window.THREE, CFG=window.SAILING;
  const api = { supported: false, mode: 'world', setScene(mode, options={}) { this.mode=mode;document.body.dataset.scene=mode;document.body.dataset.speaker=options.speaker||'hero'; }, render() {}, screenToWorld() { return null; } };
  window.Voyage3D = api;
  if (!T) { document.body.classList.add('no-webgl'); return; }
  let renderer;
  try {
    renderer = new T.WebGLRenderer({ canvas: document.querySelector('#world3d'), antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch { document.body.classList.add('no-webgl'); return; }
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .95;
  renderer.shadowMap.enabled = innerWidth > 740;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
  api.supported = true;
  document.body.classList.add('has-webgl');
  const materials = new Map();
  function mat(color, roughness = .75, extra = {}) {
    const key = color + ':' + roughness + JSON.stringify(extra);
    if (!materials.has(key)) { const opts={...extra}; delete opts.metalness; const m = new T.MeshLambertMaterial({ color, ...opts }); m.color.convertSRGBToLinear(); materials.set(key, m); }
    return materials.get(key);
  }
  function mesh(parent, geo, color, pos = [0, 0, 0], scale = [1, 1, 1], material) {
    const m = new T.Mesh(geo, material || mat(color));
    m.position.set(...pos); m.scale.set(...scale); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  const sphere = new T.SphereGeometry(1, 18, 12);
  const cube = new T.BoxGeometry(1, 1, 1);
  function ball(p, color, pos, scale) { return mesh(p, sphere, color, pos, scale); }
  function box(p, color, pos, scale) { return mesh(p, cube, color, pos, scale); }
  function cyl(p, color, pos, rt, rb, height, segments = 24) { return mesh(p, new T.CylinderGeometry(rt, rb, height, segments), color, pos); }
  function tube(p, points, radius, color) {
    return mesh(p, new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v => new T.Vector3(...v))), 18, radius, 8, false), color);
  }
  function lighting(scene, warm = false) {
    scene.add(new T.HemisphereLight(warm ? 0xffeadc : 0xcdefff, warm ? 0x917a89 : 0x4b8e87, .7));
    const sun = new T.DirectionalLight(warm ? 0xffe2bf : 0xfff1d4, warm ? 1.9 : 1.1);
    sun.position.set(warm ? -8 : -500, warm ? 12 : 1000, warm ? 10 : 400);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = sun.shadow.camera.bottom = warm ? -12 : -1500;
    sun.shadow.camera.right = sun.shadow.camera.top = warm ? 12 : 1500;
    sun.shadow.camera.far = warm ? 60 : 3000;
    sun.shadow.bias = -.0004;
    scene.add(sun);
    scene.add(new T.DirectionalLight(warm ? 0xe9c7ff : 0x84bcec, .35));
  }
  function roof(parent, x, y, z, width, color) {
    const shape = new T.Shape();
    shape.moveTo(-width / 2, 0); shape.lineTo(0, width * .55); shape.lineTo(width / 2, 0); shape.closePath();
    const geo = new T.ExtrudeGeometry(shape, { depth: width * .9, bevelEnabled: false });
    const m = mesh(parent, geo, color, [x, y, z - width * .45]); return m;
  }
  function house(parent, x, z, s = 1, color = '#f9e5be', roofColor = '#d88469', y = 22) {
    const h = new T.Group(); parent.add(h); h.position.set(x, y, z); h.scale.setScalar(s);
    box(h, color, [0, 17, 0], [42, 34, 37]); roof(h, 0, 35, 0, 51, roofColor);
    box(h, '#548f98', [0, 12, 18.8], [10, 24, 1.5]);
    for (const xx of [-13, 13]) box(h, '#b4e0d7', [xx, 23, 19], [8, 8, 1.6]);
    box(h, '#deceaa', [0, 1, 0], [48, 3, 43]); return h;
  }
  function palm(parent, x, z, s = 1, y = 22) {
    const g = new T.Group(); parent.add(g); g.position.set(x, y, z); g.scale.setScalar(s);
    const trunk = cyl(g, '#ae8a57', [0, 24, 0], 3, 5, 48, 8); trunk.rotation.z = -.12;
    for (let i = 0; i < 7; i++) {
      const leaf = new T.Group(); leaf.rotation.y = i * Math.PI * 2 / 7; leaf.position.set(3, 48, 0); g.add(leaf);
      const blade = ball(leaf, i % 2 ? '#388d57' : '#68a65e', [13, -1, 0], [22, 2, 5]); blade.rotation.z = -.18;
    }
    for (let i = 0; i < 3; i++) ball(g, '#a97a40', [3 + Math.cos(i * 2) * 4, 45, Math.sin(i * 2) * 4], [3, 3.6, 3]);
  }
  function pine(parent, x, z, s = 1, y = 22) {
    const g = new T.Group();g.position.set(x,y,z);g.scale.setScalar(s);parent.add(g);
    cyl(g, '#96704c', [0, 9, 0], 3, 4, 18, 8);
    for(let i=0;i<3;i++) mesh(g,new T.ConeGeometry(20-i*4,30,9),'#4d8e69',[0,22+i*12,0]);
  }
  function lantern(parent, x, z) {
    cyl(parent, '#816e55', [x, .7, z], .05, .07, 1.4, 8);
    box(parent, '#fff1bd', [x, 1.52, z], [.28,.38,.28]);
    const cap = cyl(parent, '#495b62', [x,1.76,z], 0, .27, .16, 4);cap.rotation.y=Math.PI/4;
  }
  // Small matte sailor model for the ship and the asset-failure fallback.
  // Conversation scenes use the painted sailor cast to keep one storybook style.
  function character({ elder = false, color = '#486780', variant = 0 } = {}) {
    const root=new T.Group(),body=new T.Group();root.add(body);
    const skin='#f5c8a5',navy=elder?'#364f68':'#375774';
    for(const side of [-1,1]){
      ball(body,'#78533b',[side*.2,.12,.08],[.2,.12,.29]);
      cyl(body,elder?'#e8ddc5':skin,[side*.2,.43,0],.135,.15,.54,18);
      cyl(body,elder?'#e8ddc5':navy,[side*.2,.7,0],.19,.21,.38,20);
    }
    ball(body,elder?navy:'#fff1d8',[0,1.18,0],[.44,.51,.28]);
    if(elder){
      for(const side of [-1,1]){
        ball(body,navy,[side*.28,1.08,.02],[.19,.55,.28]);
        for(let j=0;j<3;j++)ball(body,'#d9b66c',[side*.15,1.36-j*.16,.282],[.035,.035,.018]);
      }
    }else{
      box(body,navy,[0,1.52,-.13],[.64,.22,.32]);
      tube(body,[[-.32,1.55,.2],[0,1.25,.31],[.32,1.55,.2]],.064,navy);
      tube(body,[[-.32,1.57,.25],[0,1.3,.36],[.32,1.57,.25]],.013,'#fff3dd');
      ball(body,'#c66f54',[0,1.26,.36],[.08,.07,.045]);
      const scarf=box(body,'#c66f54',[.035,1.08,.31],[.1,.32,.05]);scarf.rotation.z=.15;
      tube(body,[[-.35,1.55,.27],[.29,.82,.29]],.034,'#9e754e');
      const bag=ball(body,'#ac8156',[.39,.86,.06],[.17,.22,.13]);
      ball(body,'#dbbc78',[.4,.9,.188],[.035,.04,.02]);
    }
    const arms=[];
    for(const side of [-1,1]){
      const arm=new T.Group();arm.position.set(side*.4,1.5,0);arm.rotation.z=side*.2;body.add(arm);arms.push(arm);
      ball(arm,elder?navy:'#fff1d8',[side*.04,-.2,0],[.19,.3,.21]);
      cyl(arm,navy,[side*.04,-.37,0],.18,.18,.07,16);
      ball(arm,skin,[side*.04,-.47,.02],[.12,.15,.12]);
    }
    const head=new T.Group();head.position.y=2.03;body.add(head);
    ball(head,skin,[0,0,0],[.58,.55,.49]);
    for(const side of [-1,1]){
      ball(head,skin,[side*.56,-.07,0],[.11,.15,.1]);
      ball(head,'#f6af99',[side*.36,-.17,.38],[.105,.045,.012]);
      if(elder){
        tube(head,[[side*.35,.04,.43],[side*.24,.09,.47],[side*.13,.04,.47]],.022,'#4b3c31');
      }else{
        ball(head,'#fff8e9',[side*.22,.025,.445],[.13,.16,.02]);
        ball(head,'#644534',[side*.21,.018,.466],[.087,.115,.013]);
        ball(head,'#322b29',[side*.21,.02,.479],[.05,.083,.007]);
        ball(head,'#fff9ed',[side*.21-.025,.064,.488],[.023,.027,.004]);
      }
      tube(head,[[side*.35,.23,.38],[side*.24,.27,.43],[side*.12,.22,.44]],.025,elder?'#efe2c6':'#634634');
    }
    ball(head,'#eab697',[0,-.07,.48],[.05,.065,.035]);
    tube(head,[[-.12,-.22,.435],[0,-.255,.46],[.12,-.22,.435]],.014,'#9d5e4b');
    const hair=elder?'#e4d9c0':'#644634';
    ball(head,hair,[0,.27,-.13],[.59,.31,.44]);
    for(let i=0;i<4;i++){
      const lock=ball(head,hair,[-.37+i*.23,.29,.32],[.16,.2,.13]);lock.rotation.z=.55-i*.17;
    }
    if(elder){
      ball(head,'#f4ead3',[0,-.35,.27],[.32,.18,.18]);
      for(const side of [-1,1]){const m=ball(head,'#f6eddc',[side*.13,-.18,.45],[.17,.035,.04]);m.rotation.z=side*.15;}
    }
    // White/navy seafarer's cap and little brass badge, never a gat or hanbok.
    cyl(head,navy,[0,.48,0],.57,.56,.1,36);
    ball(head,elder?'#eee2ca':'#fff3dc',[0,.61,-.03],[.64,.16,.54]);
    ball(head,navy,[0,.44,.45],[.44,.035,.24]);
    ball(head,navy,[0,.58,.45],[.13,.105,.018]);
    tube(head,[[0,.64,.474],[0,.52,.474]],.009,'#d5b66c');
    tube(head,[[-.06,.56,.474],[-.04,.52,.474],[0,.51,.474],[.04,.52,.474],[.06,.56,.474]],.009,'#d5b66c');
    ball(head,'#d5b66c',[0,.65,.474],[.019,.019,.006]);
    root.userData={body,head,arms,phase:variant*1.3,elder};return root;
  }

  const world = new T.Scene(); world.background=new T.Color('#8ecbd1');world.fog=new T.Fog('#8ecbd1',4000,9000);lighting(world);
  const worldCam=new T.OrthographicCamera(-800,800,500,-500,1,4500);
  const waterGeo=new T.PlaneGeometry(7000,7000,64,64);waterGeo.rotateX(-Math.PI/2);
  const waterMat=new T.MeshPhongMaterial({color:'#278eaa',specular:'#174a5c',shininess:22});waterMat.color.convertSRGBToLinear();
  const water=mesh(world,waterGeo,'#39b4bd',[CFG.width/2,-2,CFG.height/2],[1,1,1],waterMat);water.receiveShadow=true;
  const baseWater=Float32Array.from(waterGeo.attributes.position.array);
  const islandGroups=[],rings=[],labelSprites=[];
  function island(l,i){
    const g=new T.Group();g.position.set(l.x,0,l.y);world.add(g);islandGroups.push(g);
    const r=l.r/l.visualScale;g.scale.setScalar(l.visualScale);
    const base=mesh(g,new T.CylinderGeometry(r*.96,r*1.04,42,48),'#a5977b',[0,-11,0]);
    const sand=mesh(g,new T.CylinderGeometry(r*.94,r,18,64),'#f3dca0',[0,13,0]);
    const grass=mesh(g,new T.CylinderGeometry(r*.82,r*.91,12,64),l.color,[0,23,0]);
    // Low-poly shoreline faceting stays inside the physical collision radius.
    for(const shape of [base,sand,grass]){const p=shape.geometry.attributes.position;for(let k=0;k<p.count;k++){const x=p.getX(k),z=p.getZ(k),a=Math.atan2(z,x),factor=1+.025*Math.sin(a*5+i);p.setX(k,x*factor);p.setZ(k,z*factor);}shape.geometry.computeVertexNormals();}
    const shallow=new T.Mesh(new T.CircleGeometry(r+38,48),new T.MeshBasicMaterial({color:'#7cdbca',transparent:true,opacity:.29,depthWrite:false}));shallow.rotation.x=-Math.PI/2;shallow.position.y=-.5;g.add(shallow);
    box(g,'#b88857',[0,12,r+22],[48,9,100]);
    for(let z=r-22;z<r+73;z+=11)box(g,'#e2b77e',[0,17,z],[50,2,8]);
    for(const x of [-24,24])for(const z of [r-13,r+63])cyl(g,'#986e48',[x,8,z],4,4,32,10);
    const ring=new T.Mesh(new T.TorusGeometry(47,1.6,5,64),new T.MeshBasicMaterial({color:'#fff1b4',transparent:true,opacity:.8}));ring.rotation.x=-Math.PI/2;ring.position.set(0,1,r+90);g.add(ring);rings.push(ring);
    if(i===0){house(g,-25,0,1.2);house(g,47,-45,.7,'#f3e6c6','#78a4aa');palm(g,-82,-17,1.3);palm(g,69,31,1);palm(g,10,-83,.85);}
    if(i===1){house(g,-48,4,1.2,'#f5dfb6','#c57c6b');house(g,38,-39,.9,'#ede2c8','#729eaf');box(g,'#d6aa73',[-84,28,57],[35,22,27]);box(g,'#be8f56',[-73,48,50],[25,19,23]);cyl(g,'#e1b65d',[85,77,13],4,5,110,8);box(g,'#e1b65d',[69,131,13],[95,6,8]);cyl(g,'#6d8380',[35,104,13],.8,.8,53,6);box(g,'#d9b16d',[35,74,13],[15,7,16]);palm(g,-94,-58,.75);}
    if(i===2){for(const [x,z,s] of [[-57,-25,1],[32,-45,.8]]){mesh(g,new T.ConeGeometry(67*s,120*s,6),'#839c8b',[x,65*s,z]);mesh(g,new T.ConeGeometry(22*s,38*s,6),'#e4e5d1',[x,106*s,z]);}house(g,47,56,.85);house(g,-50,60,.65,'#f5e5c8','#71929a');pine(g,-100,30,.7);}
    if(i===3){house(g,-49,12,1.15,'#f5dfb5','#ac7668');house(g,33,-45,1.1,'#f9e6c6','#6b9ba8');house(g,70,55,.65);palm(g,-100,46,.9);const pole=cyl(g,'#e2c887',[3,48,40],3,4,45);ball(g,'#6bbcb8',[3,80,40],[16,16,16]);}
    if(i===4){house(g,-56,18,1.05,'#e9dfc4','#9a9583');house(g,35,0,1.1,'#ece2ce','#a98770');cyl(g,'#c5c3ac',[37,90,-15],10,12,93,12);for(let k=0;k<3;k++)ball(g,'#ecf0de',[37+k*15,150+k*17,-15],[14+k*3,9+k*2,12+k*3]);palm(g,-103,-35,.8);}
    if(i===5){box(g,'#f2dfb1',[0,31,0],[140,10,94]);for(const x of [-51,-17,17,51]){cyl(g,'#fff0cb',[x,66,23],6,8,66,16);cyl(g,'#e4cd99',[x,99,23],10,10,5,16);}roof(g,0,102,0,165,'#dbab5c');for(const x of [-65,-35,0,35,65])box(g,'#e2cea3',[x,29,55],[31,5,19]);palm(g,-106,22,.9);palm(g,104,12,.9);}
    for(let j=0;j<8;j++){const a=j*2.4+i,rr=r*(.55+(j%3)*.08),x=Math.cos(a)*rr,z=Math.sin(a)*rr;ball(g,j%2?'#f1d38d':'#edd5b8',[x,31,z],[2.6,2.1,2.6]);}
    if(i===0||i===3){const x=r-30,z=66;cyl(g,'#fff0d3',[x,60,z],12,17,80);cyl(g,'#db7e67',[x,65,z],13,14,18);cyl(g,'#557d89',[x,105,z],16,16,15);mesh(g,new T.ConeGeometry(22,20,12),'#d78b68',[x,122,z]);ball(g,'#fff0b0',[x,105,z],[10,5,10]);}
    // Labels are texture sprites generated locally with the browser canvas.
    const c=document.createElement('canvas');c.width=768;c.height=160;
    const texture=new T.CanvasTexture(c),c2=c.getContext('2d');
    function drawLabel(){
      c2.clearRect(0,0,768,160);c2.fillStyle='#214c5ce8';c2.beginPath();c2.moveTo(28,4);c2.lineTo(740,4);c2.quadraticCurveTo(764,4,764,28);c2.lineTo(764,132);c2.quadraticCurveTo(764,156,740,156);c2.lineTo(28,156);c2.quadraticCurveTo(4,156,4,132);c2.lineTo(4,28);c2.quadraticCurveTo(4,4,28,4);c2.fill();
      c2.textAlign='center';c2.fillStyle='#fff8df';c2.font='44px Jua, sans-serif';c2.fillText('0'+(i+1)+' '+l.name,384,68);c2.font='30px "Gowun Dodum", sans-serif';c2.fillText(i===5?'상생의 항로':l.reward+' 무역 코인',384,119);texture.needsUpdate=true;
    }
    drawLabel();document.fonts.ready.then(drawLabel);
    const sprite=new T.Sprite(new T.SpriteMaterial({map:texture,transparent:true,depthTest:false}));sprite.position.set(0,70,-r*.35);sprite.scale.set(440/l.visualScale,92/l.visualScale,1);g.add(sprite);labelSprites.push(sprite);
  }
  window.LESSONS.forEach(island);
  const ship=new T.Group();ship.scale.setScalar(CFG.boatScale);world.add(ship);
  const hull=ball(ship,'#9c633d',[0,8,0],[21,13,40]);
  const deck=ball(ship,'#ddb57d',[0,16,0],[18,4,35]);
  for(const x of [-17,17])box(ship,'#b9854e',[x,19,2],[3,9,52]);
  cyl(ship,'#886541',[0,48,0],1.8,2.5,72,10);
  const sailShape=new T.Shape();sailShape.moveTo(-26,25);sailShape.quadraticCurveTo(-20,63,0,80);sailShape.quadraticCurveTo(22,60,27,28);sailShape.quadraticCurveTo(0,17,-26,25);
  const sail=mesh(ship,new T.ShapeGeometry(sailShape,16),'#fff3d1',[0,0,0],[1,1,1],mat('#fff3d1',.8,{side:T.DoubleSide}));
  box(ship,'#92724c',[0,28,0],[58,2,2]);
  const flag=mesh(ship,new T.PlaneGeometry(16,9),'#e68b6e',[8,88,0],[1,1,1],mat('#e68b6e',.7,{side:T.DoubleSide}));flag.visible=false;
  const captain=character({color:'#69a8c5'});captain.scale.setScalar(9);captain.position.set(0,19,21);captain.rotation.y=Math.PI;ship.add(captain);
  const wake=Array.from({length:24},()=>{const m=new T.Mesh(new T.TorusGeometry(10,.65,4,24),new T.MeshBasicMaterial({color:'#effff4',transparent:true,opacity:0,depthWrite:false}));m.rotation.x=-Math.PI/2;world.add(m);return m;});
  const wavelets=[];
  for(let i=0;i<105;i++){
    const x=(i*719+83)%CFG.width,z=(i*431+67)%CFG.height;
    if(window.LESSONS.some(l=>Math.hypot(x-l.x,z-l.y)<l.r+28))continue;
    const points=[];for(let k=0;k<9;k++)points.push(new T.Vector3(k*4-16,1.5,z*0+Math.sin(k/8*Math.PI)*3));
    const line=new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:'#dcfff0',transparent:true,opacity:.24}));line.position.set(x,0,z);world.add(line);wavelets.push(line);
  }
  const chestObjects=[];
  const seabirds=[];
  for(let i=0;i<7;i++){const g=new T.Group();for(const side of [-1,1]){const wing=box(g,'#fff7e9',[side*6,0,0],[12,1,4]);wing.rotation.z=side*.22;}world.add(g);seabirds.push(g);}

  const theatre=new T.Scene();theatre.background=new T.Color('#dbc5ae');theatre.fog=new T.Fog('#e7b09b',20,65);lighting(theatre,true);
  const stageCam=new T.PerspectiveCamera(36,1,.1,100);
  const floor=mesh(theatre,new T.CylinderGeometry(18,18,1,64),'#c5b39c',[0,-.55,0]);
  const stoneGeo=new T.CylinderGeometry(.44,.49,.04,6);
  for(let parity=0;parity<2;parity++){
    const count=parity===0?33:32,tiles=new T.InstancedMesh(stoneGeo,mat(parity?'#d9c8ac':'#d1bea3'),count),dummy=new T.Object3D();
    for(let j=0;j<count;j++){const i=j*2+parity,a=i*2.4,r=2+Math.sqrt(i)*1.05;dummy.position.set(Math.cos(a)*r,.01,Math.sin(a)*r);dummy.rotation.y=i;dummy.updateMatrix();tiles.setMatrixAt(j,dummy.matrix);}
    tiles.receiveShadow=true;theatre.add(tiles);
  }
  const oceanBackdrop=mesh(theatre,new T.PlaneGeometry(150,90),'#7aa6b0',[0,-1,-23]);oceanBackdrop.rotation.x=-Math.PI/2;
  const sun=ball(theatre,'#ffdfaa',[-7,6,-28],[5,5,1]);sun.material=new T.MeshBasicMaterial({color:'#ffdfa9'});
  for(let i=0;i<7;i++){const mountain=mesh(theatre,new T.ConeGeometry(8+i%3,12+i%4,5),i%2?'#c29da6':'#d8b0ac',[-28+i*10,1,-34-i%2*3]);mountain.rotation.y=i;}
  for(const [x,z] of [[-6,-7],[6,-8]]){const h=house(theatre,x,z,.065,'#f4d7ae','#536d7b',-.08);}
  // Wooden quay, pennants and lamps frame the storybook harbour.
  for(let i=0;i<14;i++)box(theatre,'#9c7761',[-8+i*1.2,.06,-5],[1.16,.12,3]);
  for(const x of [-6,6]){cyl(theatre,'#775e4e',[x,1,-5],.08,.12,2,10);tube(theatre,[[x,2,-5],[x,2.4,-5],[x+.8,2.4,-5]],.03,'#6c6255');}
  lantern(theatre,-4,-1.2);lantern(theatre,4,-1.2);
  const festive=new T.Group();theatre.add(festive);
  tube(festive,[[-8,5,-5],[0,4,-5],[8,5,-5]],.025,'#f1d6ba');
  for(let i=0;i<16;i++){const sh=new T.Shape();sh.moveTo(-.2,0);sh.lineTo(.2,0);sh.lineTo(0,-.4);sh.closePath();mesh(festive,new T.ShapeGeometry(sh),['#e6a56c','#6fa8a7','#d7b1bb'][i%3],[-7.5+i,4+Math.abs(-7.5+i)*.12,-5],[1,1,1],mat(['#e6a56c','#6fa8a7','#d7b1bb'][i%3],.8,{side:T.DoubleSide}));}
  const pair=new T.Group();theatre.add(pair);
  const hero=character({color:'#79b9d7'});hero.position.x=-1.05;hero.rotation.y=.1;pair.add(hero);
  let companion=character({elder:true});companion.position.x=1.05;companion.rotation.y=-.13;pair.add(companion);
  const floating=[];for(let i=0;i<25;i++){const p=ball(theatre,'#ffedc8',[(i*1.37%16)-8,1+(i*1.73%5),-7+(i%7)],[.025,.025,.025]);p.material=new T.MeshBasicMaterial({color:'#fff1ce',transparent:true,opacity:.65});floating.push(p);}
  const ray=new T.Raycaster(),plane=new T.Plane(new T.Vector3(0,1,0),0),hit=new T.Vector3();
  let slowFrames=0,quality=1,lastRender=performance.now(),shadowTick=0,width=0,height=0,lastNPC=-1,speaker='hero',reaction='neutral';
  function disposeCharacter(g){g.traverse(o=>{if(o.isMesh&&o.geometry!==sphere&&o.geometry!==cube)o.geometry.dispose();});}
  api.setScene=(mode,options={})=>{
    renderer.shadowMap.needsUpdate=true;api.mode=mode;speaker=options.speaker||'hero';reaction=options.reaction||'neutral';document.body.dataset.speaker=speaker;document.body.dataset.reaction=reaction;
    const npc=options.npcIndex??-1;
    if(npc!==lastNPC){pair.remove(companion);disposeCharacter(companion);lastNPC=npc;const elder=npc<0||npc===0||npc===5;companion=character({elder,color:['#8ebc9c','#ba99c7','#b9b995','#e0ac78','#a5bdb0','#e9d49b'][Math.max(0,npc)],variant:Math.max(0,npc)});companion.position.x=1.05;companion.rotation.y=-.13;pair.add(companion);}
    document.body.dataset.scene=mode;
  };
  api.react=value=>{reaction=value;document.body.dataset.reaction=value;};
  api.screenToWorld=(x,y)=>{ray.setFromCamera(new T.Vector2(x/innerWidth*2-1,-y/innerHeight*2+1),worldCam);if(ray.ray.intersectPlane(plane,hit))return{x:hit.x,y:hit.z};return null;};
  function animateCharacter(g,t,active){const d=g.userData;d.body.position.y=Math.sin(t*2+d.phase)*.022;d.head.rotation.y=Math.sin(t*.8+d.phase)*.045;d.head.rotation.z=active?Math.sin(t*2.1)*.035:0;d.arms[1].rotation.z=.3+(active?Math.sin(t*2.5)*.12-.35:0);d.arms[1].rotation.x=active?-.55:0;if(reaction==='happy'){d.body.position.y+=Math.abs(Math.sin(t*5))*.07;d.arms[1].rotation.z=-.9;}if(reaction==='hint')d.head.rotation.z=.13;}
  api.render=({boat,cam,state,time,trail,treasures,near,zoom})=>{
    const frameCost=performance.now()-lastRender;lastRender=performance.now();if(frameCost>90)slowFrames++;else slowFrames=Math.max(0,slowFrames-1);if(slowFrames>15&&quality===1){quality=.7;width=0;renderer.shadowMap.enabled=false;}
    if(width!==innerWidth||height!==innerHeight){width=innerWidth;height=innerHeight;renderer.setPixelRatio(Math.min(devicePixelRatio||1,width<740?1.4:1.7)*quality);renderer.setSize(width,height,false);stageCam.aspect=width/height;stageCam.updateProjectionMatrix();}
    if(++shadowTick%90===0)renderer.shadowMap.needsUpdate=true;
    if(api.mode==='world'){
      const halfW=width/zoom/2,halfH=height/zoom/2;worldCam.left=-halfW;worldCam.right=halfW;worldCam.top=halfH;worldCam.bottom=-halfH;worldCam.updateProjectionMatrix();
      const off=height*.15/zoom/.74;worldCam.position.set(cam.x,720,cam.y+650-off);worldCam.lookAt(cam.x,0,cam.y-off);worldCam.updateMatrixWorld();
      const p=waterGeo.attributes.position;for(let k=0;k<p.count;k++){p.setY(k,baseWater[k*3+1]+Math.sin(baseWater[k*3]*.018+time)*.8+Math.cos(baseWater[k*3+2]*.016+time*1.2)*.6);}p.needsUpdate=true;
      ship.position.set(boat.x,Math.sin(time*2)*1.4,boat.y);ship.rotation.y=-boat.angle-Math.PI/2;ship.rotation.z=Math.sin(time*2)*.025;
      hull.material=mat(state.done.includes(5)?'#dcb958':state.upgrades.includes('hull')?'#468d95':'#9c633d');
      sail.material=mat(state.done.includes(5)?'#ffe5a0':state.upgrades.includes('sail')?'#ee9b78':'#fff3d1',.8,{side:T.DoubleSide});flag.visible=state.upgrades.includes('flag')||state.done.includes(5);
      rings.forEach((r,i)=>{r.material.opacity=near===i?.75+Math.sin(time*3)*.2:.35;r.scale.setScalar(1+Math.sin(time*2+i)*.04);});
      while(chestObjects.length<treasures.length){const c=new T.Group();box(c,'#ae7d45',[0,5,0],[24,14,17]);const lid=cyl(c,'#d3a465',[0,13,0],12,12,18,8);lid.rotation.z=Math.PI/2;box(c,'#f7d67e',[0,11,9],[4,8,2]);world.add(c);chestObjects.push(c);}
      chestObjects.forEach((c,i)=>{c.visible=!state.treasures.includes(i);c.position.set(treasures[i].x,Math.sin(time*2+i)*2,treasures[i].y);c.rotation.z=Math.sin(time+i)*.08;});
      wake.forEach((w,i)=>{const p=trail[trail.length-1-i*2];w.visible=!!p;if(p){w.position.set(p.x,1,p.y);w.scale.setScalar(CFG.boatScale*(1+(1-p.life)*2.8));w.material.opacity=p.life*.35;}});
      seabirds.forEach((g,i)=>{g.position.set((time*22+i*763)%CFG.width,110+Math.sin(time+i)*12,(180+i*743)%CFG.height);g.children.forEach((w,k)=>w.rotation.z=(k?1:-1)*(.15+Math.sin(time*4+i)*.35));});
      wavelets.forEach((w,i)=>{w.position.y=Math.sin(time+i)*.5;w.material.opacity=.18+Math.sin(time*.7+i)*.09;});animateCharacter(captain,time,false);renderer.render(world,worldCam);
    }else{
      if(!document.body.classList.contains('art-fallback'))return;
      const mobile=(width<740&&height>550)||width/height<1.1,encounter=api.mode==='encounter',title=api.mode==='title';
      pair.position.x=mobile?0:encounter?-2.3:title?2.5:0;
      pair.position.y=mobile&&encounter?.4:0;
      pair.scale.setScalar(mobile?.85:1.12);
      if(mobile){stageCam.position.set(0,3.5,11.8);stageCam.lookAt(0,encounter?1.1:title?1.4:1.25,0);}else{stageCam.position.set(0,3.5,11.2);stageCam.lookAt(0,1.6,0);}
      hero.rotation.y=speaker==='hero'?.16:.32;companion.rotation.y=speaker==='npc'?-.2:-.32;
      animateCharacter(hero,time,speaker==='hero');animateCharacter(companion,time+.6,speaker==='npc');
      floating.forEach((p,i)=>{p.position.y+=Math.sin(time*.7+i)*.0015;});renderer.render(theatre,stageCam);
    }
  };
  api.getDiagnostics=()=>({supported:true,scene:api.mode,renderCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,characters:2,islands:islandGroups.length,boatScale:ship.scale.x,islandScale:CFG.islandScale});
})();

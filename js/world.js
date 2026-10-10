/* world.js — la stanza in 3D: scrivania, monitor, luce fioca, finestra sul vicinato */
(function(root){
var TV = root.TV = root.TV || {};
var U = TV.U;
var W = TV.World = { pronto:false, tempo:0 };

var scene, cam, ren, rig;
var lampLight, lampBulb, screenLight, ceil, screenMat, screenCanvas, screenCtx, screenTex;
var vicinato, figura, figuraT=0, pioggia, polvere, sedia, cornice, bagliore;
var tasti=[], tastoT=[];
var scrQuad, scrW=0.56, scrH=0.35;
var mouse={x:0,y:0}, yaw=0, pitch=0, targetYaw=0, targetPitch=0;
var zoom=0, zoomTarget=0;          // 0 = stanza, 1 = faccia allo schermo
var shake=0, flickerT=0, glitchT=0, sangueMat=null;
var scritte=[];

/* ---------- texture procedurali ---------- */
function tex(w,h,draw,rep){
  var c=document.createElement('canvas'); c.width=w; c.height=h;
  draw(c.getContext('2d'),w,h);
  var t=new THREE.CanvasTexture(c);
  if(rep){ t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(rep[0],rep[1]); }
  return t;
}
function noise(ctx,w,h,base,amt){
  ctx.fillStyle=base; ctx.fillRect(0,0,w,h);
  var img=ctx.getImageData(0,0,w,h), d=img.data;
  for(var i=0;i<d.length;i+=4){
    var n=(Math.random()-0.5)*amt;
    d[i]=U.clamp(d[i]+n,0,255); d[i+1]=U.clamp(d[i+1]+n,0,255); d[i+2]=U.clamp(d[i+2]+n,0,255);
  }
  ctx.putImageData(img,0,0);
}

function texMuro(){
  return tex(256,256,function(c,w,h){
    noise(c,w,h,'#2a2724',34);
    c.globalAlpha=0.22;
    for(var i=0;i<60;i++){
      c.strokeStyle=U.chance(0.5)?'#201e1c':'#363230'; c.lineWidth=U.rnd(0.4,2.2);
      c.beginPath(); c.moveTo(U.rnd(0,w),U.rnd(0,h));
      c.lineTo(U.rnd(0,w),U.rnd(0,h)); c.stroke();
    }
    c.globalAlpha=1;
    // macchie di umidità
    for(var k=0;k<7;k++){
      var g=c.createRadialGradient(U.rnd(0,w),U.rnd(0,h),2,U.rnd(0,w),U.rnd(0,h),U.rnd(20,70));
      g.addColorStop(0,'rgba(24,22,20,.5)'); g.addColorStop(1,'rgba(24,22,20,0)');
      c.fillStyle=g; c.fillRect(0,0,w,h);
    }
  },[2,2]);
}
function texParquet(){
  return tex(256,256,function(c,w,h){
    noise(c,w,h,'#3b2a1d',22);
    for(var y=0;y<h;y+=32){
      c.strokeStyle='rgba(0,0,0,.45)'; c.lineWidth=1.4;
      c.beginPath(); c.moveTo(0,y); c.lineTo(w,y); c.stroke();
      var off=(y/32)%2? 48:0;
      for(var x=off;x<w;x+=96){
        c.beginPath(); c.moveTo(x,y); c.lineTo(x,y+32); c.stroke();
      }
    }
  },[3,3]);
}
/* il vicinato, dipinto in coordinate di mondo cosi' le finestre 3D combaciano */
var VIC={ pw:5.6, ph:3.1, cy:1.42, fz:0, fwz:0, passo:0.62, righe:[1.20,2.08],
  // la finestra di fronte, centrata nel cono visibile attraverso il vano
  fwy:1.60, fww:1.00, fwh:1.20,
  dentroGrande:function(z,y){
    return Math.abs(z-VIC.fwz) < VIC.fww*0.78 && Math.abs(y-VIC.fwy) < VIC.fwh*0.72;
  }};
function texVicinato(fz,fwz){
  VIC.fz=fz; VIC.fwz=fwz;
  return tex(1400,780,function(c,W,H){
    function uv(z,y){ return [ (0.5-(z-fz)/VIC.pw)*W, (1-((y-(VIC.cy-VIC.ph/2))/VIC.ph))*H ]; }
    // cielo di pioggia
    var g=c.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#070a10'); g.addColorStop(0.35,'#0d131d'); g.addColorStop(1,'#060810');
    c.fillStyle=g; c.fillRect(0,0,W,H);

    // facciata della palazzina di fronte
    var pTop=uv(0,2.62)[1], pBot=uv(0,0.18)[1];
    var fg=c.createLinearGradient(0,pTop,0,pBot);
    fg.addColorStop(0,'#191b21'); fg.addColorStop(0.5,'#14161b'); fg.addColorStop(1,'#0e1014');
    c.fillStyle=fg; c.fillRect(0,pTop,W,pBot-pTop);
    // intonaco scrostato
    for(var i=0;i<150;i++){
      c.fillStyle=U.chance(0.5)?'rgba(255,255,255,.012)':'rgba(0,0,0,.09)';
      c.fillRect(U.rnd(0,W),U.rnd(pTop,pBot),U.rnd(6,70),U.rnd(3,26));
    }
    // cornicione e marcapiano
    c.fillStyle='#22252c'; c.fillRect(0,pTop,W,10);
    c.fillStyle='#1b1e24'; c.fillRect(0,uv(0,1.68)[1],W,6);
    // pluviale
    var px=uv(-2.05,0)[0];
    c.fillStyle='#0b0d11'; c.fillRect(px,pTop,7,pBot-pTop);

    // le finestre: buche scure sulla griglia (le accese sono piani 3D davanti)
    function vano(z,y,wz,wy,col){
      var a=uv(z-wz/2, y+wy/2), b=uv(z+wz/2, y-wy/2);
      var x0=Math.min(a[0],b[0]), y0=Math.min(a[1],b[1]);
      c.fillStyle=col||'#05060a'; c.fillRect(x0,y0,Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]));
      c.strokeStyle='#272a31'; c.lineWidth=4;
      c.strokeRect(x0,y0,Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]));
    }
    for(var k=-5;k<=5;k++){
      var zz=fz+k*VIC.passo;
      VIC.righe.forEach(function(ry){
        if(VIC.dentroGrande(zz,ry)) return;     // li' c'e' la finestra grande
        vano(zz, ry, 0.26, 0.34);
      });
    }
    // il vano della finestra di fronte: nero, perche' davanti ci va il piano illuminato
    vano(fwz, VIC.fwy, VIC.fww+0.14, VIC.fwh+0.14, '#000');

    // cortile e asfalto bagnato
    var aT=uv(0,0.18)[1];
    var ag=c.createLinearGradient(0,aT,0,H);
    ag.addColorStop(0,'#0a0c10'); ag.addColorStop(1,'#101520');
    c.fillStyle=ag; c.fillRect(0,aT,W,H-aT);
    // riflessi sull'asfalto
    for(var r=0;r<26;r++){
      var rx=U.rnd(0,W), rw=U.rnd(10,90);
      c.fillStyle='rgba(150,180,210,'+U.rnd(0.02,0.09).toFixed(3)+')';
      c.fillRect(rx,U.rnd(aT,H),rw,U.rnd(2,7));
    }
    // lampione, con il suo alone
    var lp=uv(1.35,0.2), lh=uv(1.35,1.95);
    c.fillStyle='#12151b'; c.fillRect(lp[0]-4,lh[1],8,lp[1]-lh[1]);
    var al=c.createRadialGradient(lp[0],lh[1],4,lp[0],lh[1],150);
    al.addColorStop(0,'rgba(255,206,138,.55)'); al.addColorStop(0.4,'rgba(255,206,138,.14)');
    al.addColorStop(1,'rgba(255,206,138,0)');
    c.fillStyle=al; c.beginPath(); c.arc(lp[0],lh[1],150,0,7); c.fill();
    c.fillStyle='#ffdca8'; c.beginPath(); c.arc(lp[0],lh[1],9,0,7); c.fill();

    // velo di pioggia
    c.strokeStyle='rgba(170,195,215,.05)'; c.lineWidth=1;
    for(var q=0;q<420;q++){
      var qx=U.rnd(0,W), qy=U.rnd(0,H);
      c.beginPath(); c.moveTo(qx,qy); c.lineTo(qx-3,qy+16); c.stroke();
    }
  });
}
function texFoto(){
  return tex(256,200,function(c,w,h){
    c.fillStyle='#b9b2a2'; c.fillRect(0,0,w,h);
    c.fillStyle='#6f7a6a'; c.fillRect(10,10,w-20,h-20);
    // due figure sfocate
    c.filter='blur(2px)';
    [[90,130],[160,135]].forEach(function(p,i){
      c.fillStyle= i? '#2f3a44':'#394554';
      c.beginPath(); c.arc(p[0],p[1]-44,18,0,7); c.fill();
      c.fillRect(p[0]-22,p[1]-26,44,80);
    });
    c.filter='none';
    c.fillStyle='rgba(0,0,0,.25)'; c.fillRect(10,h-34,w-20,24);
  });
}

/* ---------- schermo visto dalla stanza ---------- */
function makeScreenCanvas(){
  screenCanvas=document.createElement('canvas'); screenCanvas.width=320; screenCanvas.height=200;
  screenCtx=screenCanvas.getContext('2d');
  screenTex=new THREE.CanvasTexture(screenCanvas);
}
W.drawScreen=function(){
  if(!screenCtx) return;
  var c=screenCtx, w=320, h=200, f=TV.state.paura;
  var bg = TV.state.booted? (f>0.66?'#160c0c':(f>0.33?'#131212':'#0b1018')) : '#05070a';
  c.fillStyle=bg; c.fillRect(0,0,w,h);
  if(TV.state.booted){
    var acc = f>0.66? '#7a2a2a' : (f>0.33? '#6e5a2c':'#1d4a52');
    // barra in basso
    c.fillStyle='#0a111b'; c.fillRect(0,h-14,w,14);
    c.fillStyle=acc; c.fillRect(4,h-11,26,8);
    // finestre aperte, in astratto
    var ws = TV.OS? TV.OS.rects():[];
    ws.forEach(function(r){
      c.fillStyle='#121a26'; c.fillRect(r.x*w,r.y*h,r.w*w,r.h*h);
      c.fillStyle=acc; c.fillRect(r.x*w,r.y*h,r.w*w,3);
      c.fillStyle='rgba(200,214,229,.16)';
      for(var i=0;i<6;i++) c.fillRect(r.x*w+5,r.y*h+9+i*6,U.rnd(8,r.w*w-10),2);
    });
    // icone
    c.fillStyle='rgba(200,214,229,.25)';
    for(var i=0;i<3;i++) c.fillRect(6,8+i*16,10,10);
  }
  if(glitchT>0){
    for(var k=0;k<7;k++){
      var y=U.rnd(0,h), hh=U.rnd(2,12);
      c.drawImage(screenCanvas, 0,y, w,hh, U.rnd(-12,12),y, w,hh);
    }
  }
  screenTex.needsUpdate=true;
};

/* ---------- costruzione ---------- */
W.init=function(canvas){
  if(!root.THREE){ console.error('three.js non caricato'); return false; }
  var MOB = TV.Mob && TV.Mob.on;
  ren=new THREE.WebGLRenderer({canvas:canvas, antialias:!MOB});
  ren.setPixelRatio(Math.min(root.devicePixelRatio||1, MOB?1.3:1.8));
  ren.setSize(root.innerWidth, root.innerHeight);
  ren.shadowMap.enabled=!MOB; ren.shadowMap.type=THREE.PCFSoftShadowMap;
  if(THREE.sRGBEncoding) ren.outputEncoding=THREE.sRGBEncoding;

  scene=new THREE.Scene();
  scene.background=new THREE.Color(0x05060a);
  scene.fog=new THREE.FogExp2(0x05060a, 0.09);

  cam=new THREE.PerspectiveCamera(58, root.innerWidth/root.innerHeight, 0.02, 60);
  rig=new THREE.Object3D(); rig.position.set(0,1.17,0.92); rig.add(cam); scene.add(rig);

  var RW=4.0, RD=4.2, RH=2.6;
  var muro=new THREE.MeshStandardMaterial({map:texMuro(), roughness:0.95, metalness:0});
  var pav =new THREE.MeshStandardMaterial({map:texParquet(), roughness:0.8, metalness:0.05});

  function piano(w,h,mat,pos,rot){
    var m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);
    m.position.set(pos[0],pos[1],pos[2]);
    if(rot) m.rotation.set(rot[0],rot[1],rot[2]);
    m.receiveShadow=true; scene.add(m); return m;
  }
  piano(RW,RD,pav,[0,0,0],[-Math.PI/2,0,0]);                         // pavimento
  piano(RW,RD,new THREE.MeshStandardMaterial({color:0x1a1816,roughness:1}),[0,RH,0],[Math.PI/2,0,0]); // soffitto
  piano(RW,RH,muro,[0,RH/2,-RD/2],[0,0,0]);                          // parete davanti
  piano(RW,RH,muro,[0,RH/2,RD/2],[0,Math.PI,0]);                     // dietro
  /* parete sinistra: a pezzi, per lasciare davvero il vano della finestra */
  var FW=1.40, FH=1.20, FY=1.45, FZ=-0.55, WX=-RW/2;
  var z0=FZ-FW/2, z1=FZ+FW/2, y0=FY-FH/2, y1=FY+FH/2;
  piano(RD, y0,      muro, [WX, y0/2, 0],                  [0,Math.PI/2,0]);  // sotto il vano
  piano(RD, RH-y1,   muro, [WX, (RH+y1)/2, 0],             [0,Math.PI/2,0]);  // sopra il vano
  piano(z0+RD/2, FH, muro, [WX, FY, (-RD/2+z0)/2],         [0,Math.PI/2,0]);  // a lato
  piano(RD/2-z1, FH, muro, [WX, FY, (z1+RD/2)/2],          [0,Math.PI/2,0]);  // all'altro lato
  piano(RD,RH,muro,[RW/2,RH/2,0],[0,-Math.PI/2,0]);                  // destra

  /* --- scrivania --- */
  var legno=new THREE.MeshStandardMaterial({color:0x3a2a1e,roughness:0.75});
  function box(w,h,d,x,y,z,mat,rotY){
    var m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat||legno);
    m.position.set(x,y,z); if(rotY) m.rotation.y=rotY;
    m.castShadow=true; m.receiveShadow=true; scene.add(m); return m;
  }
  box(1.75,0.045,0.76, 0,0.735,-0.12);                 // piano
  [[-0.82,-0.44],[0.82,-0.44],[-0.82,0.22],[0.82,0.22]].forEach(function(p){
    box(0.06,0.73,0.06,p[0],0.365,p[1]);
  });
  box(1.70,0.30,0.04, 0,0.55,-0.47);                   // fondale

  /* --- monitor --- */
  var plastica=new THREE.MeshStandardMaterial({color:0x14151a,roughness:0.55,metalness:0.2});
  box(0.22,0.025,0.16, 0,0.772,-0.26, plastica);       // base
  box(0.05,0.17,0.05, 0,0.86,-0.26, plastica);         // collo
  var bezel=box(0.66,0.44,0.045, 0,1.12,-0.28, plastica);
  screenMat=new THREE.MeshBasicMaterial({map:screenTex, toneMapped:false});
  makeScreenCanvas(); screenMat.map=screenTex;
  scrQuad=new THREE.Mesh(new THREE.PlaneGeometry(scrW,scrH), screenMat);
  scrQuad.position.set(0,1.125,-0.2545); scene.add(scrQuad);
  W.scrQuad=scrQuad;
  bagliore=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.0),
    new THREE.MeshBasicMaterial({color:0x2a4a66, transparent:true, opacity:0.0, blending:THREE.AdditiveBlending, depthWrite:false}));
  bagliore.position.set(0,1.13,-0.33); scene.add(bagliore);

  /* --- tastiera con i tasti --- */
  box(0.46,0.018,0.15, 0,0.766,0.04, plastica);
  var tastoMat=new THREE.MeshStandardMaterial({color:0x22242a,roughness:0.6,emissive:0x000000});
  for(var r=0;r<4;r++) for(var k=0;k<14;k++){
    var t=new THREE.Mesh(new THREE.BoxGeometry(0.026,0.008,0.026), tastoMat.clone());
    t.position.set(-0.215+k*0.0325, 0.777, -0.005+r*0.0315);
    scene.add(t); tasti.push(t); tastoT.push(0);
  }
  box(0.065,0.028,0.10, 0.33,0.771,0.03, plastica);    // mouse

  /* --- oggetti sul tavolo --- */
  var tazza=new THREE.Mesh(new THREE.CylinderGeometry(0.042,0.036,0.09,16),
    new THREE.MeshStandardMaterial({color:0x7d7268,roughness:0.9}));
  tazza.position.set(-0.52,0.80,-0.05); tazza.castShadow=true; scene.add(tazza);
  var fogli=box(0.2,0.004,0.28,-0.66,0.738,0.06,new THREE.MeshStandardMaterial({color:0x9c9484,roughness:1}));
  fogli.rotation.y=0.3;
  cornice=box(0.14,0.18,0.012, 0.52,0.825,-0.34, new THREE.MeshStandardMaterial({color:0x2b2520,roughness:0.8}));
  var fotoM=new THREE.Mesh(new THREE.PlaneGeometry(0.11,0.145),
    new THREE.MeshBasicMaterial({map:texFoto()}));
  fotoM.position.set(0.52,0.825,-0.333); scene.add(fotoM); W.foto=fotoM;

  /* --- lampada da tavolo: la luce fioca --- */
  var lampBase=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.09,0.02,14), plastica);
  lampBase.position.set(-0.76,0.767,-0.3); scene.add(lampBase);
  var stelo=new THREE.Mesh(new THREE.CylinderGeometry(0.008,0.008,0.42,8), plastica);
  stelo.position.set(-0.76,0.98,-0.3); stelo.rotation.z=0.12; scene.add(stelo);
  var cappello=new THREE.Mesh(new THREE.ConeGeometry(0.11,0.13,18,1,true),
    new THREE.MeshStandardMaterial({color:0x4a3b2c,roughness:0.8,side:THREE.DoubleSide}));
  cappello.position.set(-0.72,1.20,-0.3); cappello.rotation.x=Math.PI; scene.add(cappello);
  lampBulb=new THREE.Mesh(new THREE.SphereGeometry(0.025,10,8),
    new THREE.MeshBasicMaterial({color:0xffd9a0}));
  lampBulb.position.set(-0.72,1.16,-0.3); scene.add(lampBulb);

  lampLight=new THREE.PointLight(0xffb871, 1.25, 4.2, 2);
  lampLight.position.set(-0.72,1.14,-0.3);
  lampLight.castShadow=!MOB; lampLight.shadow.mapSize.set(512,512);
  lampLight.shadow.bias=-0.004;
  scene.add(lampLight);

  screenLight=new THREE.PointLight(0x5fa8d8, 0.0, 2.6, 2);
  screenLight.position.set(0,1.13,-0.1); scene.add(screenLight);

  ceil=new THREE.AmbientLight(0x2a3340, 0.22); scene.add(ceil);
  var hemi=new THREE.HemisphereLight(0x223044,0x120f0c,0.18); scene.add(hemi);

  /* --- la finestra: telaio, vetro, e il vicinato che adesso si vede --- */
  var telaio=new THREE.MeshStandardMaterial({color:0x29231d,roughness:0.9});
  function tel(w,h,d,x,y,z){ var m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),telaio);
    m.position.set(x,y,z); m.castShadow=true; scene.add(m); return m; }
  var TX=WX+0.05;
  tel(0.11,FH+0.22,0.10, TX, FY, z0-0.05);              // montante davanti
  tel(0.11,FH+0.22,0.10, TX, FY, z1+0.05);              // montante dietro
  tel(0.11,0.10,FW+0.22, TX, y1+0.05, FZ);              // traversa alta
  tel(0.11,0.10,FW+0.22, TX, y0-0.05, FZ);              // traversa bassa
  tel(0.07,FH,0.055,     TX, FY, FZ);                   // montante centrale
  tel(0.07,0.05,FW,      TX, FY, FZ);                   // traversa centrale
  tel(0.20,0.055,FW+0.34,WX+0.12, y0-0.10, FZ);         // davanzale

  var FWZ=-1.25;                 // dove si vede davvero, calcolato sul cono del vano
  // la palazzina di fronte
  vicinato=new THREE.Mesh(new THREE.PlaneGeometry(5.6,3.1),
    new THREE.MeshBasicMaterial({map:texVicinato(FZ, FWZ)}));
  vicinato.position.set(WX-1.18, 1.42, FZ); vicinato.rotation.y=Math.PI/2; scene.add(vicinato);

  // finestre accese che si spengono e si accendono
  W.luci=[];
  for(var kk=-4;kk<=4;kk++){
    for(var rr=0;rr<VIC.righe.length;rr++){
      var cz=FZ+kk*VIC.passo, cy2=VIC.righe[rr];
      if(VIC.dentroGrande(cz,cy2)) continue;
      if(!U.chance(0.55)) continue;              // non tutte hanno un piano davanti
      var m=new THREE.Mesh(new THREE.PlaneGeometry(0.24,0.32),
        new THREE.MeshBasicMaterial({color:U.pick([0xd9c187,0xc8b277,0xe0cf9a]), transparent:true,
          opacity:U.chance(0.34)?0.92:0.0}));
      m.position.set(WX-1.155, cy2, cz); m.rotation.y=Math.PI/2; scene.add(m);
      W.luci.push({m:m, t:U.rnd(5,45)});
    }
  }

  // la finestra di fronte: grande, accesa, vuota
  var frontaleTex=tex(128,160,function(c,w,hh){
    var g=c.createLinearGradient(0,0,0,hh);
    g.addColorStop(0,'#c8ad6e'); g.addColorStop(1,'#8a7342');
    c.fillStyle=g; c.fillRect(0,0,w,hh);
    c.fillStyle='rgba(60,46,22,.55)'; c.fillRect(0,hh*0.62,w,hh*0.38);   // mobile scuro
    c.fillStyle='rgba(30,22,10,.35)'; c.fillRect(w*0.1,hh*0.1,w*0.25,hh*0.4);
  });
  var frontale=new THREE.Mesh(new THREE.PlaneGeometry(VIC.fww,VIC.fwh),
    new THREE.MeshBasicMaterial({map:frontaleTex}));
  frontale.position.set(WX-1.15, VIC.fwy, FWZ); frontale.rotation.y=Math.PI/2; scene.add(frontale);
  W.frontale=frontale;
  var cornici=new THREE.Mesh(new THREE.PlaneGeometry(VIC.fww+0.14,VIC.fwh+0.14),
    new THREE.MeshBasicMaterial({color:0x0b0b0e}));
  cornici.position.set(WX-1.168, VIC.fwy, FWZ); cornici.rotation.y=Math.PI/2; scene.add(cornici);

  // chi sta dentro quella finestra
  figura=new THREE.Mesh(new THREE.PlaneGeometry(0.38,1.04),
    new THREE.MeshBasicMaterial({color:0x06060a, transparent:true, opacity:0}));
  figura.position.set(WX-1.12, VIC.fwy-0.06, FWZ+0.04); figura.rotation.y=Math.PI/2; scene.add(figura);
  W.figY=VIC.fwy-0.06;

  // il vetro, con il suo riflesso
  var vetro=new THREE.Mesh(new THREE.PlaneGeometry(FW,FH),
    new THREE.MeshPhysicalMaterial({color:0x9fb6c8, transparent:true, opacity:0.07,
      roughness:0.2, metalness:0, side:THREE.DoubleSide}));
  vetro.position.set(WX+0.02, FY, FZ); vetro.rotation.y=Math.PI/2; scene.add(vetro);
  W.vetro=vetro;

  // la luce che entra da fuori: fredda, bassa, ma c'è
  var fuoriLuce=new THREE.PointLight(0x7ea6c8, 0.42, 5.5, 2);
  fuoriLuce.position.set(WX-0.45, 1.85, FZ); scene.add(fuoriLuce);
  W.fuoriLuce=fuoriLuce;
  var lampione=new THREE.PointLight(0xffce8a, 0.30, 4.0, 2);
  lampione.position.set(WX-1.0, 0.95, FZ+1.35); scene.add(lampione);

  // pioggia, davanti al vetro e dentro il cono visibile
  var rp=[], NP=MOB?300:800;
  for(var i=0;i<NP;i++) rp.push(WX-U.rnd(0.03,1.10), U.rnd(0.2,2.95), FZ+U.rnd(-1.0,0.9));
  var rg=new THREE.BufferGeometry();
  rg.setAttribute('position', new THREE.Float32BufferAttribute(rp,3));
  pioggia=new THREE.Points(rg, new THREE.PointsMaterial({color:0xa8c2d6, size:0.016, transparent:true, opacity:0.42}));
  scene.add(pioggia);

  /* --- porta dietro --- */
  var porta=box(0.9,2.05,0.06, 1.05,1.025,RD/2-0.04, new THREE.MeshStandardMaterial({color:0x33281f,roughness:0.9}));
  W.porta=porta;
  box(0.05,0.05,0.05, 0.66,1.0,RD/2-0.09, new THREE.MeshStandardMaterial({color:0x8a7a52,metalness:0.7,roughness:0.4}));

  /* luce che entra dalla porta quando si apre (la porta è alle tue spalle) */
  W.luceporta=new THREE.PointLight(0xffd0a0, 0, 4.5, 2);
  W.luceporta.position.set(0.95,1.75,1.80); scene.add(W.luceporta);

  /* --- sedia (dietro di te) --- */
  sedia=new THREE.Object3D();
  var sm=new THREE.MeshStandardMaterial({color:0x1e1c1a,roughness:0.9});
  var sed=new THREE.Mesh(new THREE.BoxGeometry(0.46,0.07,0.46),sm); sed.position.y=0.46; sedia.add(sed);
  var sp=new THREE.Mesh(new THREE.BoxGeometry(0.46,0.55,0.06),sm); sp.position.set(0,0.78,0.21); sedia.add(sp);
  var pal=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,0.44,8),sm); pal.position.y=0.22; sedia.add(pal);
  sedia.position.set(0.05,0,1.25); sedia.rotation.y=0.25; scene.add(sedia);

  /* --- polvere --- */
  var pp=[];
  for(var j=0;j<(MOB?110:260);j++) pp.push(U.rnd(-1.8,1.8),U.rnd(0.3,2.4),U.rnd(-1.9,1.9));
  var pg=new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.Float32BufferAttribute(pp,3));
  polvere=new THREE.Points(pg,new THREE.PointsMaterial({color:0xbfae92,size:0.008,transparent:true,opacity:0.3}));
  scene.add(polvere);

  /* --- sangue sul muro (nascosto, per i finali) --- */
  sangueMat=new THREE.MeshBasicMaterial({color:0x5a0c0c, transparent:true, opacity:0});
  var sangue=new THREE.Mesh(new THREE.PlaneGeometry(1.4,1.8), sangueMat);
  sangue.position.set(1.2,1.5,-RD/2+0.02); scene.add(sangue);

  /* --- input --- */
  root.addEventListener('mousemove', function(e){
    if(TV.Mob && TV.Mob.on) return;          // sul telefono lo sguardo si trascina
    mouse.x=(e.clientX/root.innerWidth)*2-1;
    mouse.y=(e.clientY/root.innerHeight)*2-1;
  });
  root.addEventListener('resize', W.resize);
  W.scene=scene; W.cam=cam; W.rig=rig;   // utili per diagnosticare
  W.pronto=true;
  W.drawScreen();
  return true;
};

W.resize=function(){
  if(!ren) return;
  cam.aspect=root.innerWidth/root.innerHeight; cam.updateProjectionMatrix();
  ren.setSize(root.innerWidth, root.innerHeight);
};

/* ---------- camera ---------- */
W.guarda=function(v){ zoomTarget = v?1:0; };
/* lo sguardo come valore, da -1 a 1: è così che il dito muove la testa */
W.look=function(x,y){ mouse.x=U.clamp(x,-1,1); mouse.y=U.clamp(y,-1,1); };
W.lookDelta=function(dx,dy){ W.look(mouse.x+dx, mouse.y+dy); };
W.lookVal=function(){ return {x:mouse.x, y:mouse.y}; };
/* punta lo sguardo verso una direzione nota (finestra, porta, scrivania) */
W.guardaVerso=function(nome){
  var v=W.VERSO[nome]; if(!v) return;
  W.look(-v[0]/0.95, -v[1]/0.30);
};
/* la regia dei finali prende il controllo dello sguardo */
W.sguardo=function(y,p,vel){ W.forzato={y:y, p:p, v:vel||1.0}; };
W.liberaSguardo=function(){ W.forzato=null; };
/* direzioni utili, calcolate sulla stanza */
W.VERSO={ finestra:[0.94,0.10], schermo:[0,0], scrivania:[-0.36,-0.30], avanti:[-0.05,-0.04], porta:[-0.82,0.02] };
W.zoomVal=function(){ return zoom; };

/* proietta lo schermo 3D in pixel, per allineare l'interfaccia DOM */
W.screenRect=function(){
  if(!scrQuad||!cam) return null;
  var hw=scrW/2, hh=scrH/2, p=scrQuad.position;
  var ang=[[-hw,hh],[hw,hh],[-hw,-hh],[hw,-hh]];
  var minx=1e9,maxx=-1e9,miny=1e9,maxy=-1e9, dietro=false;
  for(var i=0;i<4;i++){
    var v=new THREE.Vector3(p.x+ang[i][0], p.y+ang[i][1], p.z);
    v.project(cam);
    if(v.z>1) dietro=true;
    var sx=(v.x*0.5+0.5)*root.innerWidth, sy=(-v.y*0.5+0.5)*root.innerHeight;
    minx=Math.min(minx,sx); maxx=Math.max(maxx,sx);
    miny=Math.min(miny,sy); maxy=Math.max(maxy,sy);
  }
  if(dietro) return null;
  return {x:minx, y:miny, w:maxx-minx, h:maxy-miny};
};

/* lo schermo è sotto un punto qualunque (un dito, per esempio)? */
W.inSchermo=function(px,py){
  var r=W.screenRect(); if(!r) return false;
  var pad=Math.max(26, r.w*0.12);
  return px>r.x-pad && px<r.x+r.w+pad && py>r.y-pad && py<r.y+r.h+pad;
};

/* lo schermo è sotto il puntatore? */
W.puntaSchermo=function(){
  var r=W.screenRect(); if(!r) return false;
  var px=(mouse.x*0.5+0.5)*root.innerWidth, py=(mouse.y*0.5+0.5)*root.innerHeight;
  var pad=Math.max(18, r.w*0.06);
  return px>r.x-pad && px<r.x+r.w+pad && py>r.y-pad && py<r.y+r.h+pad;
};

/* ---------- eventi ---------- */
W.evento=function(nome,opt){
  opt=opt||{};
  switch(nome){
    case 'flicker': flickerT=opt.t||U.rnd(0.5,1.6); break;
    case 'glitch':  glitchT=opt.t||U.rnd(0.3,1.0); TV.Audio.sfx('glitch'); break;
    case 'shake':   shake=Math.max(shake,opt.f||0.5); break;
    case 'figura':
      figuraT=opt.t||U.rnd(5,11);
      TV.Audio.sfx('breath');
      break;
    case 'sediaGira':
      W.sediaGira=2.2; TV.Audio.sfx('knock'); break;
    case 'knock': TV.Audio.sfx('knock'); shake=Math.max(shake,0.18); break;
    case 'sangue':
      if(sangueMat) W.sangueT=opt.v!=null?opt.v:0.75;
      break;
    case 'portaApri':
      W.portaApri=1; W.luceportaT=opt.luce!=null?opt.luce:0.85; break;
    case 'fiori':
      W.fiori=W.fiori||mkFiori(); W.fiori.visible=true; W.fioriDrop=1; TV.Audio.sfx('click'); break;
    case 'sirenaFuori':
      W.sirena=opt.on===false?false:true; break;
    case 'scritta':
      mkScritta(opt.txt||'TUTTO È VERO'); break;
    case 'buioTotale':
      W.blackout=opt.t||3; break;
  }
};

function mkFiori(){
  var g=new THREE.Object3D();
  var carta=new THREE.Mesh(new THREE.ConeGeometry(0.1,0.22,8,1,true),
    new THREE.MeshStandardMaterial({color:0xcfc6b2,roughness:1,side:THREE.DoubleSide}));
  carta.rotation.x=Math.PI; carta.position.y=0.11; g.add(carta);
  for(var i=0;i<9;i++){
    var f=new THREE.Mesh(new THREE.SphereGeometry(0.028,8,6),
      new THREE.MeshStandardMaterial({color:U.pick([0xb8324a,0xc94a60,0x8e2236]),roughness:0.8}));
    f.position.set(U.rnd(-0.07,0.07),0.22+U.rnd(0,0.05),U.rnd(-0.07,0.07)); g.add(f);
  }
  g.position.set(0.40,0.78,-0.14); g.rotation.z=0.34; g.rotation.y=-0.3; scene.add(g);
  return g;
}

function mkScritta(txt){
  var t=tex(512,128,function(c,w,h){
    c.clearRect(0,0,w,h);
    c.font='bold 72px monospace'; c.textAlign='center'; c.textBaseline='middle';
    c.fillStyle='rgba(120,10,10,0.9)';
    c.fillText(txt,w/2,h/2);
  });
  var m=new THREE.Mesh(new THREE.PlaneGeometry(1.6,0.4),
    new THREE.MeshBasicMaterial({map:t,transparent:true,opacity:0}));
  m.position.set(0.2,1.75,-2.07); scene.add(m);
  scritte.push({m:m,v:0,up:true});
}

/* ---------- premuto un tasto: la tastiera reagisce ---------- */
W.figuraVista=function(){ return figura? figura.material.opacity : 0; };

W.tasto=function(){
  if(!tasti.length) return;
  var i=U.ri(0,tasti.length-1); tastoT[i]=0.12;
};

/* ---------- loop ---------- */
W.update=function(dt){
  if(!W.pronto) return;
  W.tempo+=dt;
  var s=TV.state, f=s.paura;

  /* camera: guarda il mouse, con limiti da persona seduta */
  var intensita = 1-zoom*0.86;
  if(W.forzato){
    targetYaw=W.forzato.y; targetPitch=W.forzato.p;
    var k=1-Math.pow(0.02, dt*W.forzato.v);
    yaw=U.lerp(yaw,targetYaw,k); pitch=U.lerp(pitch,targetPitch,k);
  } else {
    targetYaw   = -mouse.x*0.95*intensita;
    targetPitch = -mouse.y*0.30*intensita;
    if(zoom>0.5){ targetYaw*=0.08; targetPitch*=0.08; }
    yaw   = U.lerp(yaw,   targetYaw,   1-Math.pow(0.001,dt));
    pitch = U.lerp(pitch, targetPitch, 1-Math.pow(0.001,dt));
  }

  zoom = U.lerp(zoom, zoomTarget, 1-Math.pow(0.0005,dt));
  var zz = zoom*zoom*(3-2*zoom);                    // smoothstep
  rig.position.set(0, U.lerp(1.17,1.126,zz), U.lerp(0.92,0.33,zz));
  cam.rotation.set(pitch + U.lerp(-0.045,0,zz), yaw, 0);
  cam.fov = U.lerp(58, 38, zz); cam.updateProjectionMatrix();

  /* respiro + tremore */
  var resp=Math.sin(W.tempo*1.25)*0.0045 + Math.sin(W.tempo*2.7)*0.0016;
  rig.position.y += resp*(1+f);
  if(shake>0.001){
    rig.position.x += U.rnd(-shake,shake)*0.035;
    rig.position.y += U.rnd(-shake,shake)*0.03;
    shake*=Math.pow(0.12,dt);
  }

  /* lampada: fioca, e più la paura cresce più tradisce */
  var base = 1.18 - f*0.42;
  var flick=1;
  if(flickerT>0){ flickerT-=dt; flick = U.chance(0.5)? U.rnd(0.05,0.35) : U.rnd(0.8,1.15); }
  else if(U.chance(dt*(0.07+f*0.9))){ flickerT=U.rnd(0.12,0.5); }
  else flick = 1 + Math.sin(W.tempo*7.3)*0.018 + Math.sin(W.tempo*21)*0.008;
  if(W.blackout>0){ W.blackout-=dt; flick=0.02; }
  lampLight.intensity = base*flick;
  lampBulb.material.color.setRGB(1, 0.85*flick, 0.63*flick);
  ceil.intensity = 0.22 - f*0.10;

  /* luce dello schermo sulla stanza */
  var acceso = s.booted?1:0;
  var col = f>0.66? 0xd05a4a : (f>0.33? 0xc8a24a : 0x5fa8d8);
  screenLight.color.setHex(col); screenLight.intensity = acceso*(0.55+zz*0.5);
  bagliore.material.opacity = acceso*(0.05+zz*0.05);
  bagliore.material.color.setHex(col);

  /* disegno dello schermo a bassa frequenza */
  W.scrAcc=(W.scrAcc||0)+dt;
  if(W.scrAcc>0.1){ W.scrAcc=0; W.drawScreen(); }
  if(glitchT>0){ glitchT-=dt; scrQuad.position.x = U.rnd(-0.004,0.004); }
  else scrQuad.position.x=0;

  /* pioggia che scende */
  var pa=pioggia.geometry.attributes.position, ar=pa.array;
  for(var i=1;i<ar.length;i+=3){
    ar[i]-=dt*(1.7+(i%7)*0.26);
    if(ar[i]<0.15) ar[i]=2.95;
  }
  pa.needsUpdate=true;

  /* polvere che galleggia */
  var da=polvere.geometry.attributes.position, da2=da.array;
  for(var j=0;j<da2.length;j+=3){
    da2[j]   += Math.sin(W.tempo*0.4+j)*0.0004;
    da2[j+1] += Math.cos(W.tempo*0.3+j)*0.0004;
    if(da2[j+1]>2.45) da2[j+1]=0.3;
  }
  da.needsUpdate=true;

  /* le finestre di fronte vivono di vita loro */
  if(W.luci) for(var li=0;li<W.luci.length;li++){
    var L=W.luci[li]; L.t-=dt;
    if(L.t<=0){
      L.t=U.rnd(9,55);
      var acc=L.m.material.opacity>0.5;
      L.m.material.opacity = acc?0.0:0.95;
      if(!acc && f>0.5 && U.chance(0.30)) TV.Audio.sfx('glitch',{r:1.2});
    }
  }

  /* la figura alla finestra */
  if(figuraT>0){
    figuraT-=dt;
    figura.material.opacity = U.clamp(figura.material.opacity+dt*1.6, 0, 0.96);
    // respira appena: si sposta di pochi millimetri
    figura.position.y = W.figY + Math.sin(W.tempo*0.55)*0.006;
  } else {
    figura.material.opacity = Math.max(0, figura.material.opacity-dt*0.7);
  }
  // più paura, più spesso compare da sola
  if(figuraT<=0 && U.chance(dt*f*f*0.12)){ W.evento('figura',{t:U.rnd(3,8)}); }

  /* sedia che gira */
  if(W.sediaGira>0){ W.sediaGira-=dt; sedia.rotation.y += dt*0.9; }

  /* porta che si apre */
  if(W.portaApri>0 && W.porta.rotation.y>-1.1){
    W.porta.rotation.y -= dt*0.35;
    W.porta.position.x = 1.05 - (1-Math.cos(W.porta.rotation.y))*0.45;
  }

  /* i fiori che arrivano sulla scrivania */
  if(W.fiori && W.fioriDrop>0){
    W.fioriDrop=Math.max(0, W.fioriDrop-dt*1.5);
    var e3=W.fioriDrop*W.fioriDrop;
    W.fiori.position.y = 0.78 + e3*0.40;
    W.fiori.rotation.z = 0.34 + W.fioriDrop*0.5;
  }

  /* la luce dalla porta aperta */
  if(W.luceporta){
    var obT=W.luceportaT||0;
    W.luceporta.intensity = U.lerp(W.luceporta.intensity, obT, 1-Math.pow(0.1,dt));
  }

  /* lampeggianti della polizia, filtrati dalla finestra */
  if(W.sirena && W.fuoriLuce){
    var fase=Math.floor(W.tempo*1.7)%2;
    W.fuoriLuce.color.setHex(fase?0x3050ff:0xff3030);
    W.fuoriLuce.intensity=2.6+Math.sin(W.tempo*18)*0.6;
    if(W.frontale) W.frontale.material.color.setHex(fase?0x8899ff:0xff9999);
  } else if(W.fuoriLuce && W.sirenaSpenta!==true){
    // torna alla luce fredda di prima
    W.fuoriLuce.color.setHex(0x7ea6c8);
    W.fuoriLuce.intensity=U.lerp(W.fuoriLuce.intensity,0.42,1-Math.pow(0.2,dt));
  }

  /* sangue che cola */
  if(W.sangueT>0 && sangueMat.opacity<W.sangueT) sangueMat.opacity=Math.min(W.sangueT, sangueMat.opacity+dt*0.22);

  /* scritte sul muro */
  for(var k=scritte.length-1;k>=0;k--){
    var sc=scritte[k];
    if(sc.up){ sc.v+=dt*0.5; if(sc.v>=0.85){sc.v=0.85; sc.up=false; sc.hold=4;} }
    else if(sc.hold>0){ sc.hold-=dt; }
    else { sc.v-=dt*0.35; if(sc.v<=0){ scene.remove(sc.m); scritte.splice(k,1); continue; } }
    sc.m.material.opacity=sc.v;
  }

  /* tasti illuminati mentre scrivi */
  for(var q=0;q<tasti.length;q++){
    if(tastoT[q]>0){
      tastoT[q]-=dt;
      tasti[q].material.emissive.setHex(0x203040);
      tasti[q].position.y=0.7755;
    } else { tasti[q].material.emissive.setHex(0x000000); tasti[q].position.y=0.777; }
  }

  /* nebbia e audio seguono la paura */
  scene.fog.density = 0.075 + f*0.085;
  TV.Audio.setFear(f);

  ren.render(scene,cam);
};
})(typeof window!=='undefined'?window:globalThis);

/* mobile.js — il gioco con le dita.
   Trascini per guardarti attorno, tocchi per avvicinarti al computer,
   e quando sei al monitor l'interfaccia prende tutto lo schermo del telefono. */
(function(root){
var TV = root.TV = root.TV || {};
var U = TV.U;
var Mob = TV.Mob = TV.Mob || {on:false, touch:false};

/* ---------- i suggerimenti, detti a chi non ha un mouse ---------- */
Mob.testo=function(txt){
  if(!Mob.on || !txt) return txt;
  return String(txt)
    .replace(/ESC — o un clic sulla stanza — per/g,'Tocca «stanza» in alto per')
    .replace(/ESC/g,'«stanza»')
    .replace(/Muovi il mouse/g,'Trascina il dito')
    .replace(/muovi il mouse/g,'trascina il dito')
    .replace(/col mouse/g,'col dito')
    .replace(/Clicca lo schermo/g,'Tocca il monitor')
    .replace(/Clicca/g,'Tocca')
    .replace(/clicca/g,'tocca')
    .replace(/un clic/g,'un tocco');
};

/* ---------- la barra dei comandi ---------- */
function comandi(){
  var pc=document.getElementById('mobPc'),
      fin=document.getElementById('mobFin'),
      back=document.getElementById('mobBack');

  if(pc) pc.onclick=function(e){
    e.stopPropagation();
    if(TV.Game && TV.Game.avviato() && !TV.state.ended) TV.Game.modo(true);
  };
  /* un'occhiata alla finestra senza dover indovinare il trascinamento */
  if(fin) fin.onclick=function(e){
    e.stopPropagation();
    if(!TV.Game || !TV.Game.avviato() || TV.state.ended) return;
    if(TV.state.mode==='screen') TV.Game.modo(false);
    TV.World.guardaVerso(fin.dataset.verso==='avanti'?'avanti':'finestra');
    var vaiAvanti = fin.dataset.verso!=='avanti';
    fin.dataset.verso = vaiAvanti?'avanti':'';
    fin.textContent  = vaiAvanti?'avanti':'finestra';
  };
  if(back) back.onclick=function(e){
    e.stopPropagation();
    if(TV.Game && !TV.state.ended) TV.Game.modo(false);
  };
}

/* ---------- le dita ---------- */
function gesti(){
  var app=document.getElementById('app');
  if(!app) return;
  var id=null, t0=0, lx=0, ly=0, mosso=0, dentro=false;

  function trova(lista,k){
    for(var i=0;i<lista.length;i++) if(lista[i].identifier===k) return lista[i];
    return null;
  }
  function suInterfaccia(el){
    if(!el || !el.closest) return false;
    return !!(el.closest('#screen.live') || el.closest('#mobBar') ||
              el.closest('#mobBack') || el.closest('#boot') || el.closest('#endcard'));
  }

  app.addEventListener('touchstart', function(e){
    dentro = suInterfaccia(e.target);
    if(dentro || id!==null) return;
    var tc=e.changedTouches[0];
    id=tc.identifier; t0=Date.now(); lx=tc.clientX; ly=tc.clientY; mosso=0;
  }, {passive:true});

  app.addEventListener('touchmove', function(e){
    if(dentro || id===null) return;
    var tc=trova(e.changedTouches,id); if(!tc) return;
    var dx=tc.clientX-lx, dy=tc.clientY-ly;
    lx=tc.clientX; ly=tc.clientY;
    mosso += Math.abs(dx)+Math.abs(dy);
    var w=root.innerWidth||360, h=root.innerHeight||640;
    // il dito tira lo sguardo: a destra guardi a destra
    TV.World.lookDelta(-dx/(w*0.42), -dy/(h*0.80));
    if(e.cancelable) e.preventDefault();         // niente scroll della pagina
  }, {passive:false});

  function fine(e){
    if(dentro){ dentro=false; return; }
    if(id===null) return;
    var tc=trova(e.changedTouches,id);
    id=null;
    if(!tc) return;
    if(mosso<16 && (Date.now()-t0)<450) tocco(tc.clientX, tc.clientY);
  }
  app.addEventListener('touchend', fine, {passive:true});
  app.addEventListener('touchcancel', function(){ id=null; dentro=false; }, {passive:true});
}

/* un tocco nella stanza: ti siedi al computer. Al computer: torni alla stanza. */
function tocco(px,py){
  if(!TV.Game || !TV.Game.avviato() || TV.state.ended) return;
  if(TV.state.mode==='screen'){ TV.Game.modo(false); return; }
  TV.Game.modo(true);
}

/* ---------- la tastiera di sistema non deve coprire quello che scrivi ---------- */
function tastiera(){
  var vv=root.visualViewport;
  function altezza(){
    var h=vv? vv.height : root.innerHeight;
    document.documentElement.style.setProperty('--vvh', Math.round(h)+'px');
  }
  if(vv){
    vv.addEventListener('resize', altezza);
    vv.addEventListener('scroll', altezza);
  }
  root.addEventListener('resize', altezza);
  root.addEventListener('orientationchange', function(){ setTimeout(altezza,260); });
  altezza();

  /* quando tocchi un campo di testo, la riga deve restare in vista */
  document.addEventListener('focusin', function(e){
    var t=e.target;
    if(!t || (t.tagName!=='INPUT' && t.tagName!=='TEXTAREA')) return;
    setTimeout(function(){
      try{ t.scrollIntoView({block:'center', behavior:'smooth'}); }catch(err){}
      root.scrollTo(0,0);
    }, 300);
  });
  document.addEventListener('focusout', function(){ root.scrollTo(0,0); });
}

/* ---------- avvio ---------- */
Mob.attiva=function(){
  if(!Mob.on) return false;
  document.body.classList.add('mob');

  /* le istruzioni iniziali parlano di mouse e di ESC: qui non servono */
  var cm=document.querySelector('#boot .cmds');
  if(cm) cm.innerHTML =
    '<li><b>trascina</b> — ti guardi attorno</li>'+
    '<li><b>tocca</b> — ti avvicini al computer</li>'+
    '<li><b>stanza</b> — stacchi gli occhi dal monitor</li>';
  var warn=document.querySelector('#boot .warn');
  if(warn) warn.textContent='cuffie consigliate · luci spente';

  comandi(); gesti(); tastiera();
  TV.World.look(0,0);
  return true;
};
})(typeof window!=='undefined'?window:globalThis);

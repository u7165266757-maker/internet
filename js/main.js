/* main.js — avvio, input, ciclo di gioco */
(function(root){
var TV = root.TV = root.TV || {};
var U=TV.U;
var elScreen, elOS, elRifl, last=0, avviato=false, curSopra=false, riflOn=false;

function allineaSchermo(){
  var r=TV.World.screenRect();
  if(!r || r.w<4){ elScreen.style.opacity='0'; return; }
  var sc=r.w/1000;
  elScreen.style.transform='translate('+r.x.toFixed(1)+'px,'+r.y.toFixed(1)+'px) scale('+sc.toFixed(4)+')';
  elScreen.style.opacity = TV.state.booted? '1':'0';
  TV.OS.scala=sc;
}

function loop(ts){
  var dt=Math.min(0.05, (ts-last)/1000 || 0.016); last=ts;
  if(avviato && !TV.state.ended) TV.state.t += dt;
  else if(avviato) TV.state.t += dt*0.2;
  TV.tickTimers(TV.state.t);
  TV.updateFear();
  TV.World.update(dt);
  allineaSchermo();
  // il cursore diventa una mano quando sei sopra il monitor
  if(avviato && TV.state.mode==='room' && !TV.state.ended){
    var sopra=TV.World.puntaSchermo();
    if(sopra!==curSopra){ curSopra=sopra; document.body.style.cursor=sopra?'pointer':'default'; }
  } else if(curSopra){ curSopra=false; document.body.style.cursor='default'; }
  // il riflesso della finestra sul monitor: la figura si vede senza voltarsi
  if(elRifl){
    var vista=TV.World.figuraVista()>0.35;
    if(vista!==riflOn){ riflOn=vista; elRifl.classList[vista?'add':'remove']('visto'); }
  }
  TV.Director.hintTick(dt);
  requestAnimationFrame(loop);
}

function modo(screen){
  TV.state.mode = screen?'screen':'room';
  TV.World.guarda(screen);
  elScreen.classList[screen?'add':'remove']('live');
  if(screen) TV.Director.hint('ESC — o un clic sulla stanza — per staccare gli occhi dallo schermo.',5);
  else TV.Director.hint('Clicca per tornare al computer.',5);
}

function boot(){
  if(avviato) return;
  avviato=true;
  TV.Audio.init(); TV.Audio.resume();
  TV.emit('boot');

  var b=document.getElementById('boot');
  b.classList.add('gone');
  setTimeout(function(){ b.style.display='none'; },900);

  // il monitor si accende
  setTimeout(function(){
    TV.state.booted=true;
    TV.OS.accendi();
    TV.Audio.monitorOn();
    TV.Audio.sfx('glitch');
    TV.World.evento('flicker',{t:1.2});
    TV.Director.hint('Muovi il mouse per guardarti attorno. Clicca lo schermo per usare il computer.',8);
  }, 1200);

  setTimeout(function(){ modo(true); }, 2600);
  TV.Director.start();
}

root.addEventListener('DOMContentLoaded', function(){
  elScreen=document.getElementById('screen');
  elOS=document.getElementById('os');
  elRifl=document.getElementById('riflesso');

  if(!TV.World.init(document.getElementById('gl'))){
    document.getElementById('boot').innerHTML=
      '<div class="boot-in"><h1>ERRORE</h1><p class="sub">three.js non è stato caricato: serve una connessione a internet al primo avvio.</p></div>';
    return;
  }
  TV.OS.init();
  TV.OS.tick();

  document.getElementById('bootBtn').onclick=boot;

  /* un clic nella stanza ti porta al computer; un clic fuori dall'interfaccia ti stacca */
  root.addEventListener('mousedown', function(e){
    if(!avviato || TV.state.ended) return;
    if(e.target.closest && e.target.closest('#screen.live')) return;   // clic dentro l'interfaccia
    if(TV.state.mode==='screen') modo(false);
    else modo(true);
  });

  /* ESC: si torna a guardare la stanza */
  root.addEventListener('keydown', function(e){
    if(TV.state.ended){
      if(e.key==='Enter') root.location.reload();
      return;
    }
    if(e.key==='Escape'){ modo(false); return; }
    if(!avviato) return;
    // la tastiera in 3D reagisce a quello che scrivi
    if(e.key.length===1 || e.key==='Backspace' || e.key==='Enter'){
      TV.World.tasto();
      if(TV.state.mode==='screen') TV.Audio.sfx('key');
    }
  });

  /* prova dei finali: CTRL+ALT+1 / 2 / 3 (serve ad autore e collaudo) */
  root.addEventListener('keydown', function(e){
    if(!avviato || !e.ctrlKey || !e.altKey || TV.state.ended) return;
    if(e.key==='1'){ TV.Endings.fuorilegge(); }
    if(e.key==='2'){ TV.Endings.fiori('amore'); }
    if(e.key==='3'){ TV.Endings.silenzio(); }
  });

  root.addEventListener('visibilitychange', function(){ TV.Audio.resume(); });
  requestAnimationFrame(loop);
});
})(typeof window!=='undefined'?window:globalThis);

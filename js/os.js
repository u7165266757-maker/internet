/* os.js — il sistema operativo dentro il monitor */
(function(root){
var TV = root.TV = root.TV || {};
var U = TV.U;
var OS = TV.OS = { apps:{}, ordine:[], aperte:{}, z:10, _coda:[] };

var elOS, elIcons, elWins, elTasks, elNotes, elClock, elNet;

OS.init=function(){
  elOS=document.getElementById('os');
  elIcons=document.getElementById('icons');
  elWins=document.getElementById('windows');
  elTasks=document.getElementById('tbTasks');
  elNotes=document.getElementById('notes');
  elClock=document.getElementById('trayClock');
  elNet=document.getElementById('trayNet');
  document.getElementById('tbStart').onclick=function(){ OS.notify({t:'VALDINA OS',x:'Nessun aggiornamento disponibile. Ultimo backup: mai.'}); };
  // le app registrate prima che il desktop esistesse ottengono ora la loro icona
  OS._coda.forEach(icona); OS._coda.length=0;
  TV.every(1,OS.tick,'osclock');
};

OS.app=function(def){
  OS.apps[def.id]=def; OS.ordine.push(def.id);
  if(elIcons) icona(def); else OS._coda.push(def);
  return def;
};

function icona(def){
  var ic=U.el('div','icon'+(def.locked?' locked':''));
  ic.innerHTML='<span class="gl">'+def.icona+'</span><span class="nm">'+U.esc(def.titolo)+'</span>';
  ic.onclick=function(){
    var d=OS.apps[def.id];
    if(d.locked){ TV.Audio.sfx('bad'); OS.notify({t:'ACCESSO NEGATO',x:d.msgBlocco||'Risorsa non disponibile.',bad:true}); return; }
    OS.open(def.id);
  };
  def.el=ic; elIcons.appendChild(ic);
  return def;
}

OS.sblocca=function(id,nota){
  var d=OS.apps[id]; if(!d||!d.locked) return;
  d.locked=false;
  if(d.el){ d.el.classList.remove('locked'); d.el.classList.add('alert'); }
  TV.Audio.sfx('mail');
  if(nota) OS.notify(nota);
};
OS.allerta=function(id,on){
  var d=OS.apps[id]; if(!d||!d.el) return;
  d.el.classList[on?'add':'remove']('alert');
};

/* ---------- finestre ---------- */
OS.open=function(id,arg){
  var d=OS.apps[id]; if(!d) return null;
  if(OS.aperte[id]){ OS.focus(id); if(d.rifocus) d.rifocus(OS.aperte[id],arg); return OS.aperte[id]; }
  var w=U.el('div','win');
  var W=d.w||560, H=d.h||380;
  var x=d.x!=null?d.x:U.ri(60,Math.max(60,1000-W-40));
  var y=d.y!=null?d.y:U.ri(26,Math.max(26,595-H-30));
  w.style.width=W+'px'; w.style.height=H+'px'; w.style.left=x+'px'; w.style.top=y+'px';
  w.innerHTML='<div class="win-bar"><b>'+U.esc(d.titolo)+'</b><span class="sp"></span><span class="win-x">✕</span></div>'+
              '<div class="win-body"></div>';
  elWins.appendChild(w);
  var body=w.querySelector('.win-body');
  var obj={id:id, el:w, body:body, def:d};
  OS.aperte[id]=obj;

  w.querySelector('.win-x').onclick=function(e){ e.stopPropagation(); OS.close(id); };
  w.addEventListener('mousedown',function(){ OS.focus(id); });
  drag(w, w.querySelector('.win-bar'));

  var t=U.el('div','tb-task',U.esc(d.titolo));
  t.onclick=function(){ OS.focus(id); };
  elTasks.appendChild(t); obj.task=t;

  OS.allerta(id,false);
  OS.focus(id);
  TV.Audio.sfx('click');
  try{ d.build(body,obj,arg); }catch(e){ console.error('app '+id,e); body.innerHTML='<div class="pad">Errore interno.</div>'; }
  TV.emit('app:open',id);
  return obj;
};

OS.close=function(id){
  var o=OS.aperte[id]; if(!o) return;
  if(o.def.onClose) try{o.def.onClose(o);}catch(e){}
  o.el.remove(); if(o.task) o.task.remove();
  delete OS.aperte[id];
  TV.Audio.sfx('click');
  TV.emit('app:close',id);
};

OS.focus=function(id){
  var o=OS.aperte[id]; if(!o) return;
  for(var k in OS.aperte){
    OS.aperte[k].el.classList.remove('focus');
    if(OS.aperte[k].task) OS.aperte[k].task.classList.remove('on');
  }
  o.el.style.zIndex=++OS.z;
  o.el.classList.add('focus');
  if(o.task) o.task.classList.add('on');
  OS.attiva=id;
};

function drag(win,handle){
  var sx,sy,ox,oy,on=false;
  handle.addEventListener('mousedown',function(e){
    if(e.target.classList.contains('win-x')) return;
    on=true; sx=e.clientX; sy=e.clientY;
    ox=parseFloat(win.style.left); oy=parseFloat(win.style.top);
    e.preventDefault();
  });
  function mv(e){
    if(!on) return;
    var sc=OS.scala||1;
    var nx=ox+(e.clientX-sx)/sc, ny=oy+(e.clientY-sy)/sc;
    win.style.left=U.clamp(nx,-40,1000-80)+'px';
    win.style.top=U.clamp(ny,0,595-28)+'px';
  }
  function up(){ on=false; }
  root.addEventListener('mousemove',mv); root.addEventListener('mouseup',up);
}

/* rettangoli normalizzati, per ridisegnare lo schermo in 3D */
OS.rects=function(){
  var out=[];
  for(var k in OS.aperte){
    var e=OS.aperte[k].el;
    out.push({x:parseFloat(e.style.left)/1000, y:parseFloat(e.style.top)/625,
              w:parseFloat(e.style.width)/1000, h:parseFloat(e.style.height)/625});
  }
  return out;
};

/* ---------- notifiche ---------- */
OS.notify=function(o){
  if(!elNotes) return;
  var n=U.el('div','note'+(o.bad?' bad':''),'<b>'+U.esc(o.t||'SISTEMA')+'</b>'+U.esc(o.x||''));
  n.onclick=function(){ if(o.go) OS.open(o.go); n.remove(); };
  elNotes.appendChild(n);
  TV.Audio.sfx(o.bad?'bad':'msg');
  setTimeout(function(){
    n.style.transition='opacity .6s'; n.style.opacity='0';
    setTimeout(function(){n.remove();},620);
  }, o.ms||6500);
  while(elNotes.children.length>4) elNotes.firstChild.remove();
};

/* ---------- stato visivo ---------- */
OS.tick=function(){
  if(elClock) elClock.textContent=U.clock(TV.state.t);
  var f=TV.state.paura;
  if(!elOS) return;
  elOS.classList.remove('f1','f2','f3');
  if(f>0.66) elOS.classList.add('f3');
  else if(f>0.36) elOS.classList.add('f2');
  else if(f>0.14) elOS.classList.add('f1');
  var net=TV.state.net;
  if(elNet){
    elNet.className = net.dark?'tray-dark':(net.sbloccata?'tray-on':'tray-off');
    elNet.textContent = net.dark?'rete: NX7 attiva':(net.sbloccata?'rete: connessa':'rete: assente');
  }
};
OS.glitch=function(sec){
  if(!elOS) return;
  elOS.classList.add('glitch');
  TV.Audio.sfx('glitch');
  setTimeout(function(){ elOS.classList.remove('glitch'); }, (sec||0.5)*1000);
};
OS.shake=function(on){
  if(!elOS) return;
  elOS.classList[on?'add':'remove']('shake');
};
OS.accendi=function(){
  if(elOS) elOS.classList.remove('off');
};

/* helper condivisi dalle app */
OS.lista=function(items, onPick){
  var box=U.el('div','list');
  items.forEach(function(it,i){
    var r=U.el('div','row'+(it.unread?' unread':''),
      '<div class="t"><span class="n">'+U.esc(it.n)+'</span><span class="muted tiny">'+U.esc(it.d||'')+'</span></div>'+
      (it.p?'<div class="p">'+U.esc(it.p)+'</div>':''));
    r.onclick=function(){
      box.querySelectorAll('.row').forEach(function(x){x.classList.remove('on');});
      r.classList.add('on'); r.classList.remove('unread');
      onPick(it,i,r);
    };
    it.el=r; box.appendChild(r);
  });
  return box;
};
})(typeof window!=='undefined'?window:globalThis);

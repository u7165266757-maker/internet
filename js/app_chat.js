/* app_chat.js — la chat con i parenti (e con chi non risponde) */
(function(root){
var TV = root.TV = root.TV || {};
var U=TV.U, OS=TV.OS;
var CH = TV.Chat = { storia:{}, attivo:null, scrive:{} };

function st(id){ return CH.storia[id] = CH.storia[id] || []; }

CH.push=function(id,chi,testo,extra){
  var m={chi:chi, t:testo, ora:U.clock(TV.state.t)};
  if(extra) for(var k in extra) m[k]=extra[k];
  st(id).push(m);
  if(CH.attivo===id && CH.render) CH.render();
  else if(chi==='them'){
    var p=TV.People.get(id);
    OS.allerta('chat',true);
    OS.notify({t:(p?p.nome:id).toUpperCase(), x:testo.length>70?testo.slice(0,70)+'…':testo, go:'chat'});
  }
  return m;
};

CH.scrivi=function(id,on){
  CH.scrive[id]=on;
  if(CH.attivo===id && CH.render) CH.render();
};

/* consegna una risposta con i tempi di battitura */
CH.consegna=function(id,msgs){
  if(!msgs||!msgs.length) return;
  msgs.forEach(function(m,i){
    var tScrive=Math.max(0.25, m.d-Math.min(2.4, 0.35+m.t.length*0.03));
    TV.after(tScrive, function(){ CH.scrivi(id,true); }, 'chat');
    TV.after(m.d, function(){
      CH.scrivi(id,false);
      CH.push(id,'them',m.t);
      TV.Audio.sfx('msg');
    }, 'chat');
  });
};

CH.invia=function(id,testo){
  if(!testo||!testo.trim()) return;
  var p=TV.People.get(id); if(!p) return;
  CH.push(id,'me',testo.trim());
  TV.Audio.sfx('click');
  // la polizia gestisce la propria conversazione (persuasione)
  var r=(TV.Police && TV.Police.intercetta && TV.Police.intercetta(id,testo)) || TV.People.respond(id,testo);
  if(r.letto) TV.after(U.rnd(1.2,3.4), function(){
    var h=st(id);
    // la spunta di lettura si attacca all'ultimo messaggio inviato
    for(var i=h.length-1;i>=0;i--){ if(h[i].chi==='me'){ h[i].letto=r.letto; break; } }
    if(CH.attivo===id && CH.render) CH.render();
  }, 'chat');
  CH.consegna(id,r.msgs);
  TV.emit('chat:inviato',{id:id, testo:testo, analisi:r.analisi});
  return r;
};

CH.apri=function(id){
  var w=OS.open('chat');
  if(w && CH.seleziona) CH.seleziona(id);
};

OS.app({
  id:'chat', titolo:'Messaggi', icona:'✉', w:660, h:430, x:260, y:70,
  build:function(body,win){
    body.innerHTML='';
    var side=U.el('div','side'), col=U.el('div','col');
    var head=U.el('div','chat-head','<span class="dot"></span><b class="nm">Nessuna conversazione</b><span class="sp"></span><span class="muted tiny stt"></span>');
    var msgs=U.el('div','msgs');
    var comp=U.el('div','compose');
    comp.innerHTML='<input type="text" placeholder="Scrivi un messaggio…" disabled><button disabled>invia</button>';
    var inp=comp.querySelector('input'), btn=comp.querySelector('button');
    col.appendChild(head); col.appendChild(msgs); col.appendChild(comp);
    body.appendChild(side); body.appendChild(col);

    var listaEl=null;
    function rebuildSide(){
      if(listaEl) listaEl.remove();
      var items=TV.People.lista().filter(function(p){
        if(p.id==='ispettore') return TV.flag('poliziaAperta');
        if(p.id==='sconosciuto') return TV.flag('sconosciutoVisto');
        return true;
      }).map(function(p){
        var h=st(p.id), last=h.length?h[h.length-1]:null;
        var nonLetti=h.filter(function(m){return m.chi==='them'&&!m.visto;}).length;
        return {n:p.nome, d:last?last.ora:'', p:last?(last.chi==='me'?'tu: ':'')+last.t.slice(0,34):p.label,
                unread:nonLetti>0, ref:p};
      });
      listaEl=OS.lista(items,function(it){ scegli(it.ref.id); });
      side.appendChild(listaEl);
    }

    function scegli(id){
      CH.attivo=id;
      var p=TV.People.get(id);
      head.querySelector('.nm').textContent=p.nome;
      head.querySelector('.dot').className='dot'+(p.muto?'':' on');
      head.querySelector('.stt').textContent=p.label||'';
      st(id).forEach(function(m){ m.visto=true; });
      inp.disabled=false; btn.disabled=false; inp.focus();
      CH.render();
      rebuildSide();
      var c=0; for(var k in CH.storia) c+=CH.storia[k].filter(function(m){return m.chi==='them'&&!m.visto;}).length;
      if(!c) OS.allerta('chat',false);
    }
    CH.seleziona=scegli;

    CH.render=function(){
      if(!CH.attivo) return;
      var id=CH.attivo, h=st(id);
      msgs.innerHTML='';
      if(!h.length){
        var p=TV.People.get(id);
        msgs.appendChild(U.el('div','bub sys', U.esc(p.muto?'Nessun messaggio. Ultimo accesso: sconosciuto.':'Nessun messaggio.')));
      }
      h.forEach(function(m){
        if(m.chi==='sys'){ msgs.appendChild(U.el('div','bub sys',U.esc(m.t))); return; }
        var b=U.el('div','bub '+(m.chi==='me'?'me':'them'),
          U.esc(m.t)+'<span class="ts">'+U.esc(m.ora)+'</span>');
        msgs.appendChild(b);
        if(m.letto) msgs.appendChild(U.el('div','seen',U.esc(m.letto)));
        m.visto=true;
      });
      if(CH.scrive[id]){
        var p2=TV.People.get(id);
        msgs.appendChild(U.el('div','typing',U.esc(p2.nome)+' sta scrivendo…'));
      }
      msgs.scrollTop=msgs.scrollHeight;
    };

    function manda(){
      var v=inp.value; if(!v.trim()||!CH.attivo) return;
      inp.value='';
      CH.invia(CH.attivo,v);
      rebuildSide();
    }
    btn.onclick=manda;
    inp.onkeydown=function(e){ if(e.key==='Enter'){ manda(); e.preventDefault(); } };

    rebuildSide();
    if(CH.attivo) scegli(CH.attivo);
    win.rebuild=rebuildSide;
  },
  rifocus:function(win,arg){ if(arg&&CH.seleziona) CH.seleziona(arg); },
  onClose:function(){ CH.render=null; CH.seleziona=null; CH.attivo=null; }
});

/* messaggio spontaneo da un personaggio */
CH.spontaneo=function(id,kind){
  var r=TV.People.spontaneo(id,kind);
  if(!r) return false;
  CH.scrivi(id,true);
  TV.after(U.rnd(1.4,3.2), function(){
    CH.scrivi(id,false);
    r.msgs.forEach(function(m){ CH.push(id,'them',m.t); });
    TV.Audio.sfx('msg');
  }, 'chat');
  return true;
};
})(typeof window!=='undefined'?window:globalThis);

/* app_mail.js — la posta */
(function(root){
var TV = root.TV = root.TV || {};
var U=TV.U, OS=TV.OS;
var M = TV.Mail = { msgs:[] };

M.arriva=function(m){
  m.id = m.id || ('m'+(M.msgs.length+1));
  m.ora = m.ora || U.clock(TV.state.t);
  m.nuova = true;
  M.msgs.unshift(m);
  OS.allerta('mail',true);
  if(M.render) M.render();
  OS.notify({t:'NUOVA POSTA', x:(m.da||'—')+' — '+(m.ogg||'(nessun oggetto)'), bad:!!m.bad, go:'mail'});
  TV.emit('mail',m);
  return m;
};
M.nonLette=function(){ return M.msgs.filter(function(m){return m.nuova;}).length; };

OS.app({
  id:'mail', titolo:'Posta', icona:'✉', w:620, h:400, x:170, y:40,
  build:function(body,win){
    body.innerHTML='';
    var side=U.el('div','side'); var cont=U.el('div','col');
    var pad=U.el('div','pad','<p class="muted">Seleziona un messaggio.</p>');
    cont.appendChild(pad);
    body.appendChild(side); body.appendChild(cont);

    M.render=function(){
      side.innerHTML='';
      var items=M.msgs.map(function(m){
        return {n:m.da||'—', d:m.ora, p:m.ogg||'(nessun oggetto)', unread:m.nuova, ref:m};
      });
      side.appendChild(OS.lista(items,function(it){
        var m=it.ref; m.nuova=false;
        if(!TV.state.mailLette[m.id]){ TV.state.mailLette[m.id]=1; TV.emit('mail:letta',m); }
        pad.innerHTML='<h2>'+U.esc(m.ogg||'(nessun oggetto)')+'</h2>'+
          '<p class="muted tiny">Da: '+U.esc(m.da||'—')+' &nbsp;·&nbsp; '+U.esc(m.ora)+
          (m.a?' &nbsp;·&nbsp; A: '+U.esc(m.a):'')+'</p>'+
          '<div>'+m.corpo+'</div>';
        if(M.nonLette()===0) OS.allerta('mail',false);
        M.render();
      }));
    };
    M.render();
  },
  onClose:function(){ M.render=null; }
});

/* la prima mail: quella che non dovevi aprire */
M.apertura=function(){
  M.arriva({
    da:'—', ogg:'(nessun oggetto)', bad:true,
    corpo:'<p style="font-size:26px;letter-spacing:4px;color:#e8e2d8">TUTTO È VERO</p>'+
          '<p class="muted tiny">Intestazioni: mittente non verificabile. Percorso: 0 nodi. '+
          'Questo messaggio non è transitato in rete.</p>'
  });
};
})(typeof window!=='undefined'?window:globalThis);

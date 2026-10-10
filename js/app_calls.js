/* app_calls.js — il telefono: nessuno risponde */
(function(root){
var TV = root.TV = root.TV || {};
var U=TV.U, OS=TV.OS;
var C = TV.Calls = {};

var RUBRICA=[
  {id:'mamma',   n:'Mamma',           num:'334 118 20 76'},
  {id:'papa',    n:'Papà',            num:'335 907 41 12'},
  {id:'chiara',  n:'Chiara',          num:'347 442 88 05'},
  {id:'zia',     n:'Zia Lidia',       num:'0426 55 12 09'},
  {id:'nonna',   n:'Nonna Pina',      num:'0426 55 78 31'},
  {id:'giulia',  n:'Giulia Ferri',    num:'340 221 63 47'},
  {id:'matteo',  n:'Matteo',          num:'339 676 15 88'},
  {id:'luca',    n:'Luca',            num:'348 775 20 11'},
  {id:'bevilacqua',n:'Bevilacqua (fronte)',num:'0426 55 04 90'},
  {id:'emergenza',n:'112 — Emergenze',num:'112'}
];

var ESITI={
  nessuno:['Nessuna risposta.','Libero — nessuno ha risposto.','Dopo 14 squilli la linea cade.'],
  segreteria:['Segreteria: «Il numero chiamato non è al momento raggiungibile.»',
              'Segreteria: due secondi di silenzio, poi il bip.',
              'Risponde la segreteria. Il messaggio è la tua voce.'],
  morto:['La linea è muta. Nemmeno il tono di libero.','Clic. Poi niente.'],
  respiro:['Qualcuno solleva. Non parla. Respira.','Risponde al primo squillo. Sento una sedia che si sposta.','Risposta. In sottofondo, la tua tastiera.']
};

C.chiama=function(c,win){
  var out=win.out, stato=win.stato, s=TV.state;
  if(win.inCorso) return;
  win.inCorso=true;
  stato.textContent='Chiamata in corso — '+c.n+' ('+c.num+')';
  TV.Audio.sfx('ring');
  var riga=U.el('div','card','<b>'+U.esc(c.n)+'</b> <span class="muted tiny">'+U.clock(s.t)+'</span>'+
    '<div class="bar"><i style="width:0%"></i></div><div class="tiny muted esito">squilla…</div>');
  out.insertBefore(riga,out.firstChild);
  var bar=riga.querySelector('.bar i'), es=riga.querySelector('.esito');

  var n=0, tot=U.ri(7,14);
  var iv=setInterval(function(){
    n++; bar.style.width=Math.round(n/tot*100)+'%';
    if(n%2===0) TV.Audio.sfx('ring');
    if(n>=tot){
      clearInterval(iv);
      var tipo='nessuno';
      if(c.id==='emergenza'){
        if(TV.flag('poliziaAperta')||s.sospetto>35){
          es.textContent='Risponde un operatore: «Risulta già una segnalazione a questo indirizzo. Resti in linea.» La linea cade.';
          TV.add('sospetto',6);
        } else {
          es.textContent='«Qual è l\'emergenza?» … Non sai cosa dire. Riagganci tu.';
          TV.add('luce',1);
        }
      } else {
        var paura=TV.updateFear();
        if(c.id==='matteo'){
          tipo = paura>0.45 ? 'respiro' : 'morto';
          if(tipo==='respiro'){ TV.add('buio',4); TV.World.evento('glitch'); TV.flag('mattoRisponde',true); }
        } else if(paura>0.72 && U.chance(0.42)){ tipo='respiro'; TV.add('buio',2.5); }
        else tipo = U.chance(0.55)?'segreteria':'nessuno';
        es.textContent=U.pick(ESITI[tipo]);
        if(tipo==='respiro'){ TV.Audio.sfx('breath'); TV.World.evento('figura',{t:6}); }
        else TV.Audio.sfx('static',{dur:1.6});
      }
      stato.textContent='Pronto.';
      win.inCorso=false;
      s.chiamate.push({id:c.id,t:s.t,tipo:tipo});
      if(s.chiamate.length===3 && !TV.flag('nessunoRisponde')){
        TV.flag('nessunoRisponde',true);
        OS.notify({t:'TELEFONIA',x:'Nessuno dei contatti chiamati ha risposto. Verificare la linea.',bad:true});
        TV.add('buio',2);
      }
    }
  },700);
};

OS.app({
  id:'calls', titolo:'Chiamate', icona:'☎', w:520, h:360, x:40, y:70,
  build:function(body,win){
    body.innerHTML='';
    var side=U.el('div','side'), col=U.el('div','col');
    var stato=U.el('div','chat-head','<span class="dot"></span><span>Pronto.</span>');
    var out=U.el('div','pad');
    col.appendChild(stato); col.appendChild(out);
    body.appendChild(side); body.appendChild(col);
    win.stato=stato.querySelector('span:last-child'); win.out=out;
    out.innerHTML='<p class="muted tiny">Nessuna chiamata effettuata. Linea fissa: assente. Dati: assenti.</p>';
    side.appendChild(OS.lista(RUBRICA.map(function(c){
      return {n:c.n, d:'', p:c.num, ref:c};
    }),function(it){ C.chiama(it.ref,win); }));
  }
});
})(typeof window!=='undefined'?window:globalThis);

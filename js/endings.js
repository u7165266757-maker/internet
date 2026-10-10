/* endings.js — i finali, con la loro regia:
   la telecamera smette di seguire il mouse e guarda dove deve guardare. */
(function(root){
var TV = root.TV = root.TV || {};
var U=TV.U, OS=TV.OS;
var E = TV.Endings = {};

function subs(txt,dur){
  var el=document.getElementById('subs');
  if(!el) return;
  el.textContent=txt; el.classList.add('on');
  if(dur) setTimeout(function(){ el.classList.remove('on'); }, dur*1000);
}
function flash(col,op,dur){
  var el=document.getElementById('flash');
  if(!el) return;
  el.style.background=col||'#fff';
  el.style.transition='none'; el.style.opacity=op==null?0.9:op;
  setTimeout(function(){ el.style.transition='opacity '+(dur||0.6)+'s'; el.style.opacity='0'; },30);
}
function seq(steps){
  var t=0;
  steps.forEach(function(s){ t+=s[0]; setTimeout(s[1], t*1000); });
}
/* dove guardare: nomi invece di numeri */
function verso(nome,vel){
  var v=TV.World.VERSO[nome]; if(!v) return;
  TV.World.sguardo(v[0], v[1], vel||1.0);
}
function indietro(){ TV.World.guarda(false); }   // ti stacchi dal monitor
function avanti(){ TV.World.guarda(true); }      // ti riavvicini

function chiudi(){
  TV.state.ended=TV.state.ended||'?';
  var sc=document.getElementById('screen');
  if(sc) sc.classList.remove('live');
  document.body.style.cursor='default';
  var hint=document.getElementById('hint'); if(hint) hint.classList.remove('on');
  TV.cancelTag('dir'); TV.cancelTag('chat'); TV.cancelTag('polizia'); TV.cancelTag('nx7');
}
function card(titolo,testo){
  document.getElementById('endTitle').textContent=titolo;
  document.getElementById('endText').textContent=testo;
  document.getElementById('endcard').classList.add('on');
}

/* ---------------- 1. FUORILEGGE ---------------- */
E.fuorilegge=function(){
  if(TV.state.ended) return;
  TV.state.ended='fuorilegge';
  chiudi();

  seq([
   [0.1, function(){
      indietro(); verso('finestra',0.8);               // ti stacchi e guardi fuori
      TV.World.evento('sirenaFuori',{on:true});
      TV.Audio.sfx('siren',{dur:16});
      TV.World.evento('flicker',{t:3});
      subs('Due sirene. Poi tre. La luce blu entra dalla finestra.',4);
   }],
   [4.0, function(){
      TV.Audio.sfx('knock'); flash('#2a4bd0',0.30,1.1);
      TV.World.evento('shake',{f:0.8});
      subs('«POLIZIA! APRA LA PORTA!»',3.2);
      TV.World.evento('portaApri',{luce:0.6});          // la luce del pianerottolo davanti a te
   }],
   [3.0, function(){
      TV.Audio.sfx('knock'); flash('#d02a2a',0.30,1.1);
      verso('avanti',1.0); OS.glitch(2); TV.World.evento('glitch',{t:2});
      subs('Non ti alzi dalla sedia.',3);
   }],
   [3.0, function(){
      verso('finestra',1.8);
      TV.Audio.sfx('glass'); flash('#fff',0.45,0.5);
      TV.World.evento('shake',{f:1.0});
      subs('Il vetro della finestra entra in casa.',2.4);
   }],
   [2.4, function(){ avanti(); verso('schermo',2.4); }], // scatti verso il monitor
   [1.1, function(){
      TV.Audio.sfx('gun');
      flash('#fff',1,0.9);
      var b=document.getElementById('bullet');
      b.innerHTML='<div class="blood"></div><div class="hole"></div><div class="word">FUORILEGGE</div>';
      b.classList.add('on');
      TV.World.evento('sangue',{v:0.85});
      TV.World.evento('buioTotale',{t:40});
      TV.World.evento('shake',{f:1.2});
      TV.World.evento('sirenaFuori',{on:false});
      var os=document.getElementById('os');
      if(os) os.style.filter='grayscale(1) contrast(1.4) brightness(0.45)';
   }],
   [4.5, function(){ TV.Audio.sfx('flat'); }],
   [3.2, function(){
      var n=TV.state.crimini.length, g=Math.round(TV.gravita());
      card('FUORILEGGE',
        'Ti hanno trovato dove eri rimasto tutta la notte: davanti allo schermo.\n\n'+
        'Reati contestati: '+n+' · gravità '+g+'/100\n'+
        'Ultimo messaggio inviato: ore '+U.clock(TV.state.t)+'\n\n'+
        'Il foro nel monitor è a undici centimetri dalla webcam.\n'+
        'Qualcuno, dall\'altra parte, ha continuato a guardare.');
   }]
  ]);
};

/* ---------------- 2. I FIORI ---------------- */
E.fiori=function(motivo){
  if(TV.state.ended) return;
  TV.state.ended='fiori';
  chiudi();

  seq([
   [0.2, function(){
      indietro(); verso('avanti',0.9);
      TV.Audio.sfx('bell');
      subs('Hanno suonato al citofono.',3.2);
   }],
   [3.4, function(){
      TV.Audio.sfx('bell'); verso('finestra',1.0);
      subs('Suonano di nuovo. Guardi fuori: c\'è qualcuno sotto la pioggia.',3.6);
   }],
   [3.6, function(){
      TV.World.evento('portaApri',{luce:1.1});          // la stanza si scalda alle tue spalle
      TV.Audio.sfx('knock'); verso('avanti',1.1);
      subs(motivo==='amore'
        ? '«Ho preso la macchina. Ho pensato che non dovevi stare solo.»'
        : '«Consegna per lei. Qualcuno l\'ha pagata in contanti.»', 4.4);
   }],
   [4.4, function(){
      verso('scrivania',1.3);
      TV.World.evento('fiori');                          // cadono sulla scrivania, in vista
      subs('Fiori rossi. Bagnati di pioggia. Li appoggia sulla scrivania.',4.2);
   }],
   [4.4, function(){
      TV.Mail.arriva({da:'Centro Oncologico Valdina', ogg:'Referto — consegna a mano non andata a buon fine', bad:true,
        corpo:'<p>Gentile paziente, risultano <b>tre</b> tentativi di consegna del referto del 14/09.</p>'+
              '<p><b>Esito:</b> carcinoma polmonare, stadio IV. Presa in carico immediata necessaria.</p>'+
              '<p>Abbiamo provato a chiamarla sette volte. Il suo telefono risulta sempre occupato nelle ore notturne.</p>'+
              '<p class="muted tiny">Firmato: dott.ssa E. Favaro</p>'});
      avanti(); verso('schermo',1.5);
      subs('La posta fa un suono. Guardi lo schermo un\'ultima volta.',4.4);
   }],
   [4.6, function(){
      TV.Audio.sfx('heart'); TV.World.evento('flicker',{t:2});
      subs('Senti il cuore in gola. Poi nel collo. Poi da nessuna parte.',4);
   }],
   [3.0, function(){ TV.Audio.sfx('heart'); flash('#000',0.55,2.2); }],
   [2.6, function(){ TV.Audio.sfx('heart'); TV.World.evento('buioTotale',{t:40}); indietro(); }],
   [2.4, function(){ TV.Audio.sfx('flat'); flash('#fff',0.9,3.5); }],
   [3.6, function(){
      card('I FIORI',
        (motivo==='amore'
          ? 'Giulia è arrivata alle 00:'+U.pad(U.ri(10,52))+'. Ti ha trovato ancora caldo, davanti al computer.\n\n'
          : 'Il corriere ha lasciato i fiori e se ne è andato. Nessuno ha pagato il mittente.\n\n')+
        'Patrimonio alla fine della notte: '+U.money(TV.state.soldi)+'\n'+
        'Persone che ti hanno voluto bene stanotte: '+(function(){
           var n=0; for(var k in TV.state.persone) if(TV.state.persone[k].affinita>=40) n++; return n; })()+'\n\n'+
        'Il referto era arrivato in buca il 14 settembre.\n'+
        'Non lo hai mai aperto: quella settimana guardavi la finestra.\n\n'+
        'Nessuno ha mai saputo chi aveva mandato la mail.');
   }]
  ]);
};

/* ---------------- 3. IL SILENZIO ---------------- */
E.silenzio=function(){
  if(TV.state.ended) return;
  TV.state.ended='silenzio';
  chiudi();

  seq([
   [0.2, function(){
      indietro(); verso('avanti',0.9);
      TV.World.evento('buioTotale',{t:60}); TV.Audio.sfx('breath');
      subs('La lampada si spegne. Resta solo il monitor.',4);
   }],
   [4.2, function(){
      verso('finestra',0.9); TV.Audio.sfx('whisper');
      subs('La finestra di fronte è vuota, come sempre.',3.4);
   }],
   [3.6, function(){
      TV.World.evento('figura',{t:60});
      subs('Adesso no.',3.0);
   }],
   [3.2, function(){
      TV.World.evento('sediaGira'); TV.Audio.sfx('knock');
      subs('La sedia alle tue spalle si gira da sola.',3.4);
   }],
   [3.6, function(){
      avanti(); verso('schermo',1.6);
      OS.glitch(3); TV.World.evento('scritta',{txt:'SONO QUI'}); TV.Audio.sfx('breath');
      subs('Non respira come un uomo. Respira come una casa.',4);
   }],
   [4.2, function(){ flash('#000',0.95,3); TV.Audio.sfx('glitch',{r:0.6}); }],
   [3.4, function(){
      card('IL SILENZIO',
        'Hai passato la notte a guardare uno schermo e nessuno ti ha risposto.\n\n'+
        'Minuti di silenzio: '+Math.floor(TV.state.t/60)+'\n'+
        'Chiamate senza risposta: '+TV.state.chiamate.length+'\n\n'+
        'Nel 1961, nel 1983, nel 1998 e due anni fa è finita così.\n'+
        'Non si prende chi fa rumore.\nPrende chi sta zitto e guarda.');
   }]
  ]);
};

/* bottone di fine */
TV.on('boot',function(){
  var b=document.getElementById('endBtn');
  if(b) b.onclick=function(){ root.location.reload(); };
});
})(typeof window!=='undefined'?window:globalThis);

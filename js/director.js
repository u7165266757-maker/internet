/* director.js — la regia della notte: tempi, escalation, finali */
(function(root){
var TV = root.TV = root.TV || {};
var U=TV.U, OS=TV.OS;
var D = TV.Director = {};

function msgInviati(){
  var n=0; for(var k in TV.Chat.storia) n+=TV.Chat.storia[k].filter(function(m){return m.chi==='me';}).length;
  return n;
}
function refreshChat(){ if(OS.aperte.chat && OS.aperte.chat.rebuild) OS.aperte.chat.rebuild(); }
TV.on('flag',function(k){ if(k==='sconosciutoVisto'||k==='poliziaAperta') refreshChat(); });

D.start=function(){
  var s=TV.state;

  /* --- apertura: la mail --- */
  TV.after(2.0, function(){
    TV.Mail.apertura();
    OS.allerta('mail',true);
    D.hint('Hai ricevuto un messaggio. Apri la Posta.');
  },'dir');

  /* --- lo sconosciuto entra in rubrica --- */
  TV.on('mail:letta',function(m){
    if(m.da==='—' && !TV.flag('sconosciutoVisto')){
      TV.flag('sconosciutoVisto',true);
      TV.add('buio',3);
      TV.World.evento('glitch',{t:0.7});
      TV.after(6, function(){
        TV.Chat.push('sconosciuto','them','Ora che l\'hai letta, conta anche per te.');
        TV.after(5,function(){ TV.Chat.push('sconosciuto','them','Hai due ore. Come lui.'); },'dir');
      },'dir');
      D.hint('Qualcuno ti ha scritto anche nei Messaggi.');
    }
  });

  /* --- i parenti si fanno vivi --- */
  TV.after(26, function(){ TV.Chat.spontaneo('mamma','apri'); },'dir');
  TV.after(62, function(){ TV.Chat.spontaneo(U.pick(['chiara','zia']),'apri'); },'dir');
  TV.after(118,function(){ TV.Chat.spontaneo('giulia','apri'); },'dir');
  TV.after(190,function(){ TV.Chat.spontaneo(U.pick(['papa','nonna']),'apri'); },'dir');

  /* --- internet si sblocca col tempo --- */
  TV.after(95, function(){
    TV.Net.sblocca();
    TV.Mail.arriva({da:'Modem VLD-220', ogg:'Connessione ripristinata',
      corpo:'<p>La linea è tornata disponibile alle '+U.clock(TV.state.t)+'.</p>'+
            '<p class="muted tiny">Nota: durante l\'assenza di linea sono stati inviati 1.411 pacchetti '+
            'dall\'interfaccia locale. Destinazione non registrata.</p>'});
    D.hint('Internet è tornato. Prova con cerca.it');
  },'dir');

  /* --- la finestra: che si sappia che c'è --- */
  TV.after(16, function(){ D.hint('Alla tua sinistra c\'è la finestra. Muovi il mouse per guardarla.',7); },'dir');

  /* --- qualcuno cerca cose da questo computer --- */
  TV.after(150, function(){
    if(TV.state.net.sbloccata) TV.Net.ricercaFantasma();
  },'dir');
  TV.every(70, function(){
    if(!TV.state.net.sbloccata || TV.state.ended) return;
    if(U.chance(0.35+TV.state.paura*0.45)) TV.Net.ricercaFantasma();
  },'dir');

  /* --- battito della notte --- */
  TV.every(3.2, D.battito, 'dir');
  TV.every(12,  TV.Police.tick, 'dir');
  TV.every(30,  D.spontanei, 'dir');
  TV.every(9,   D.finali, 'dir');
};

/* eventi d'atmosfera, dosati sulla paura */
D.battito=function(){
  var s=TV.state; if(s.ended) return;
  var f=TV.updateFear();
  TV.Audio.monitorOn();

  if(U.chance(0.05+f*0.22)) TV.World.evento('flicker');
  if(U.chance(0.015+f*0.10)) { TV.Audio.sfx(U.pick(['whisper','breath'])); }
  if(U.chance(f*0.05)) TV.World.evento('glitch',{t:U.rnd(0.2,0.7)});
  if(U.chance(f*0.03)) { TV.World.evento('knock'); }
  if(U.chance(f*f*0.05)) { TV.World.evento('sediaGira'); }
  if(f>0.55 && U.chance(0.02)) OS.glitch(U.rnd(0.3,1.1));
  if(f>0.72 && U.chance(0.015)) TV.World.evento('scritta',{txt:U.pick(['TUTTO È VERO','NON GIRARTI','SEI IL QUINTO'])});
  if(f>0.4 && U.chance(0.012)){
    OS.notify({t:'WEBCAM', x:'Un\'applicazione sconosciuta ha richiesto l\'accesso alla webcam.', bad:true});
    TV.add('buio',1);
  }

  /* se non parli con nessuno, il silenzio ti si siede addosso */
  if(msgInviati()===0 && s.t>90){
    TV.add('buio', 0.75);
    if(U.chance(0.10)) TV.Audio.sfx(U.pick(['whisper','breath','knock']));
    if(s.t>200 && U.chance(0.08)) TV.World.evento('figura',{t:U.rnd(4,9)});
  }

  /* la rete nera arriva da sola quando i crimini sono gravi */
  if(TV.gravita()>=30 && !s.net.dark) TV.Net.sbloccaDark();

  /* i soldi aprono il finale dei fiori */
  if(s.soldi>=3000) TV.flag('ricco',true);
};

/* messaggi non richiesti: chi ti vuole bene, e chi no */
D.spontanei=function(){
  var s=TV.state; if(s.ended) return;
  var f=s.paura;
  var cand=['mamma','papa','chiara','zia','nonna','giulia'].filter(function(id){
    var m=TV.state.persone[id];
    return m && !m.bloccato && m.turni>0 && (TV.state.t-m.ultimoT)>45;
  });
  if(cand.length && U.chance(0.5)) TV.Chat.spontaneo(U.pick(cand), f>0.5?'inquieto':'apri');

  if(TV.flag('sconosciutoVisto') && U.chance(0.25+f*0.3)){
    var righe=['Stai ancora scrivendo.','Anche lui scriveva a sua madre.','La finestra di fronte è la tua, visto da qui.',
               'Sei a '+U.ri(20,80)+' minuti.','Non spegnere. Non serve.'];
    TV.Chat.push('sconosciuto','them',U.pick(righe));
    TV.add('buio',1.4);
  }
};

/* condizioni dei finali */
D.finali=function(){
  var s=TV.state; if(s.ended) return;

  /* amore: Giulia ha chiesto di venire e tu hai detto sì */
  if(TV.flag('fidanzato') && !TV.flag('finaleAvviato')){
    TV.flag('finaleAvviato',true);
    TV.Chat.push('giulia','them','Sono già in macchina. Dieci minuti.');
    TV.after(U.rnd(18,26), function(){ TV.Endings.fiori('amore'); },'dir');
    return;
  }
  /* soldi */
  if(TV.flag('ricco') && !TV.flag('finaleAvviato')){
    TV.flag('finaleAvviato',true);
    OS.notify({t:'CONSEGNA',x:'Un fattorino è stato autorizzato al portone.'});
    TV.after(U.rnd(20,30), function(){ TV.Endings.fiori('soldi'); },'dir');
    return;
  }
  /* silenzio: non hai parlato con nessuno e la notte si è accorta di te */
  if(!TV.flag('finaleAvviato') && s.t>320 && msgInviati()===0 && s.paura>0.35){
    TV.flag('finaleAvviato',true);
    TV.Endings.silenzio();
  }
};

/* "sì" a Giulia dopo la sua ultima richiesta */
TV.on('chat:inviato',function(e){
  if(e.id!=='giulia' || TV.flag('fidanzato')) return;
  var m=TV.mem('giulia'), a=e.analisi;
  if(m.segreti>=4 && (a.conferma || a.intents.amore || a.intents.invito || a.intents.flirt)){
    TV.flag('fidanzato',true);
    TV.add('luce',12);
  }
});

/* suggerimenti nella stanza */
var hintT=0;
D.hint=function(txt,sec){
  var el=document.getElementById('hint');
  if(!el) return;
  if(TV.Mob && TV.Mob.testo) txt=TV.Mob.testo(txt);   // niente mouse sui telefoni
  el.textContent=txt; el.classList.add('on');
  hintT=(sec||6);
};
D.hintTick=function(dt){
  if(hintT>0){
    hintT-=dt;
    if(hintT<=0) document.getElementById('hint').classList.remove('on');
  }
};
})(typeof window!=='undefined'?window:globalThis);

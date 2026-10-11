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
  if(s.soldi>=TV.SOGLIA_RICCO) TV.flag('ricco',true);
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

/* ---------- condizioni dei finali ----------
   L'ordine conta: chi ha la priorità più alta chiude la notte prima. */
D.finali=function(){
  var s=TV.state;
  if(s.ended || TV.flag('finaleAvviato')) return;

  /* 1. LA MADRE — l'hai spaventata fino in fondo, e lei non regge */
  var mm=s.persone.mamma;
  if(mm && (mm.spaventato>=85 || mm.bloccato) && (mm.confessioni||0)>=1){
    TV.flag('finaleAvviato',true);
    TV.Chat.push('chiara','them','mamma non risponde. papà è andato a vedere');
    TV.after(U.rnd(13,20), function(){ TV.Endings.madre(); },'dir');
    return;
  }

  /* 2. IL BANCO — hai preso il credito del casinò e sei di nuovo a zero */
  if(TV.flag('debito') && s.soldi<10){
    TV.flag('finaleAvviato',true);
    OS.notify({t:'CREDITO VERDE',x:'Scadenza: questa notte. Pratica trasferita.',bad:true});
    TV.after(U.rnd(15,24), function(){ TV.Endings.banco(); },'dir');
    return;
  }

  /* 3. I FIORI, per amore — dieci complimenti a Giulia */
  if(TV.flag('fidanzato')){
    TV.flag('finaleAvviato',true);
    TV.Chat.push('giulia','them','Sono già in macchina. Dieci minuti.');
    TV.after(U.rnd(18,26), function(){ TV.Endings.fiori('amore'); },'dir');
    return;
  }

  /* 4. I FIORI, per i soldi */
  if(TV.flag('ricco')){
    TV.flag('finaleAvviato',true);
    OS.notify({t:'CONSEGNA',x:'Un fattorino è stato autorizzato al portone.'});
    TV.after(U.rnd(20,30), function(){ TV.Endings.fiori('soldi'); },'dir');
    return;
  }

  /* 5. IL SONNO — la notte gentile: ti convincono a spegnere */
  if(s.t>700 && s.luce>=55 && s.buio<=18 && msgInviati()>=6){
    TV.flag('finaleAvviato',true);
    var chi=['mamma','chiara','giulia','zia'].filter(function(id){
      var m=s.persone[id]; return m && m.affinita>=35;
    });
    TV.Chat.push(chi.length?U.pick(chi):'mamma','them',
      U.pick(['Spegni quel computer e vai a dormire. Te lo chiedo per favore.',
              'Basta per stanotte. Vai a letto, ci sentiamo domani.',
              'Chiudi tutto e dormi. Domani ti chiamo io.']));
    TV.after(U.rnd(14,21), function(){ TV.Endings.sonno('gentile'); },'dir');
    return;
  }

  /* 6. IL SILENZIO — quattro minuti senza fare niente con nessuno */
  var fermo = s.t - (s.ultimaAzione||0);
  if(s.t>TV.SILENZIO && fermo>TV.SILENZIO){
    TV.flag('finaleAvviato',true);
    if(s.paura>0.45) TV.Endings.silenzio();      // la notte si è accorta di te
    else TV.Endings.sonno('silenzio');           // ti sei solo addormentato
    return;
  }

  /* 7. L'ALBA — la notte finisce da sola */
  if(s.t>=TV.DURATA_NOTTE){
    TV.flag('finaleAvviato',true);
    TV.Endings.alba();
    return;
  }
};

/* qualunque cosa fatta con qualcuno rimanda indietro il silenzio */
function azione(){ TV.state.ultimaAzione=TV.state.t; }
TV.on('chat:inviato',azione);
TV.on('gig',azione);
TV.on('azzardo',azione);

/* i complimenti a Giulia: al decimo prende la macchina e viene */
TV.on('chat:inviato',function(e){
  if(e.id!=='giulia' || TV.flag('fidanzato')) return;
  var m=TV.mem('giulia'), a=e.analisi;
  if(!a) return;
  var complimento = (a.intents.amore||0)>0.8 || (a.intents.flirt||0)>0.7 ||
                    a.affetto>0.9 || !!a.fatti.dichiarazione;
  if(!complimento) return;
  if(m.ultimoComplimento===a.norm) return;      // ripetere la stessa frase non conta
  m.ultimoComplimento=a.norm;
  m.complimenti=(m.complimenti||0)+1;
  TV.add('luce',1.2);
  if(m.complimenti===5) D.hint('Giulia ha cambiato il modo di scriverti.',6);
  if(m.complimenti===8) D.hint('Giulia ha scritto e cancellato tre volte.',6);
  if(m.complimenti>=TV.COMPLIMENTI){
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

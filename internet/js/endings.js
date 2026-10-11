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
  palpebre('');
  var sc=document.getElementById('screen');
  if(sc) sc.classList.remove('live');
  document.body.style.cursor='default';
  var hint=document.getElementById('hint'); if(hint) hint.classList.remove('on');
  TV.cancelTag('dir'); TV.cancelTag('chat'); TV.cancelTag('polizia'); TV.cancelTag('nx7');
  TV.cancelTag('denuncia'); TV.cancelTag('dark');     // l'alba sposta l'orologio: niente code
}
/* le palpebre: 'sbatte' un battito di ciglia, 'socchiusa', 'chiusa', 'colpo' di scatto */
function palpebre(stato){
  var el=document.getElementById('palpebre');
  if(!el) return;
  el.className='';
  if(stato) el.classList.add(stato);
  if(stato==='sbatte') setTimeout(function(){ el.className=''; }, 700);
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
      verso('porta',1.2); TV.World.sagoma(true);        // qualcuno in piedi nel vano
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
      /* i fiori arrivano nelle tue mani. Lei resta fuori dall'inquadratura. */
      TV.World.fioriInMano(2.2);
      verso('avanti',1.0);
      TV.Audio.sfx('click');
      subs(motivo==='amore'
        ? 'Te li mette in mano. Non la guardi: non ci riesci.'
        : 'Firmi senza leggere. Te li mette in mano e se ne va.', 4.2);
   }],
   [4.4, function(){
      subs(motivo==='amore'
        ? 'Dodici rose bagnate di pioggia. Una è rotta nel mezzo.'
        : 'Dodici rose bagnate di pioggia. Nessun biglietto.', 3.8);
   }],
   [4.0, function(){
      TV.World.posaFiori();                              // le posi: restano sulla scrivania
      verso('scrivania',1.2);
      subs('Le appoggi sulla scrivania, accanto alla tastiera.',3.8);
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
      palpebre('sbatte');
      subs('Senti il cuore in gola. Poi nel collo. Poi da nessuna parte.',4);
   }],
   [3.0, function(){
      TV.Audio.sfx('heart'); flash('#000',0.55,2.2);
      palpebre('socchiusa');
      TV.World.crolla(7);                                // la testa si piega sulla spalla
   }],
   [2.6, function(){ TV.Audio.sfx('heart'); TV.World.evento('buioTotale',{t:40}); indietro(); }],
   [2.4, function(){ TV.Audio.sfx('flat'); palpebre('chiusa'); flash('#fff',0.9,3.5); }],
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
      verso('porta',1.0);
      TV.World.evento('portaApri',{luce:0.32});          // controluce dal corridoio
      TV.World.sagoma(true);                             // non è più alla finestra
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

/* ---------------- 4. L'ALBA ----------------
   La notte finisce da sola. Quello che hai fatto decide solo le parole:
   il referto arriva comunque, perché era arrivato il 14 settembre. */
E.alba=function(){
  if(TV.state.ended) return;
  TV.state.ended='alba';
  var s=TV.state;
  s.tReale=s.t;                                  // i minuti veri, prima della corsa dell'orologio
  var buona = s.luce>=45 && s.buio<=25;
  var brutta = s.buio>=55 || TV.gravita()>=30;
  chiudi();

  /* l'orologio corre: dalle una alle cinque e quaranta in pochi secondi */
  var meta=21540;                                 // 05:41
  var da=s.t, lapse=0;
  var corsa=setInterval(function(){
    lapse+=0.1;
    s.t = U.lerp(da, meta, Math.min(1, lapse/7));
    if(TV.OS && TV.OS.tick) TV.OS.tick();
    if(lapse>=7.1) clearInterval(corsa);
  }, 100);

  seq([
   [0.2, function(){
      indietro(); verso('finestra',0.7);
      TV.World.evento('alba',{t:22});
      subs('Smette di piovere. È la prima cosa che senti.',4);
   }],
   [4.4, function(){
      subs(buona
        ? 'Il cortile si schiarisce. La finestra di fronte è una finestra come le altre.'
        : (brutta
           ? 'Il cortile si schiarisce. La finestra di fronte è aperta, e dentro non c\'è niente da vedere.'
           : 'Il cortile si schiarisce. Hai guardato quella finestra per tutta la notte.'), 4.6);
   }],
   [4.8, function(){
      verso('scrivania',1.0);
      subs('La lampada è ancora accesa e non serve più a niente.',4);
   }],
   [4.2, function(){
      avanti(); verso('schermo',1.2);
      TV.Mail.arriva({da:'Centro Oncologico Valdina', ogg:'Referto — sollecito finale', bad:true,
        corpo:'<p>Risultano <b>quattro</b> tentativi di consegna del referto del 14/09.</p>'+
              '<p><b>Esito:</b> carcinoma polmonare, stadio IV.</p>'+
              '<p>Le abbiamo telefonato nove volte. Di notte il suo numero risulta sempre occupato.</p>'+
              '<p class="muted tiny">Firmato: dott.ssa E. Favaro</p>'});
      TV.Audio.sfx('mail');
      subs('La posta fa un suono. Alle sei del mattino.',4.2);
   }],
   [4.4, function(){
      TV.Audio.sfx('heart'); palpebre('sbatte');
      subs('Il petto ti fa male da tre settimane. Stanotte non ci hai pensato mai.',4.2);
   }],
   [4.4, function(){
      TV.Audio.sfx('heart'); TV.World.evento('flicker',{t:1.6});
      palpebre('socchiusa'); TV.World.crolla(8);         // la testa scende verso la tastiera
      subs('Appoggi la testa. Fuori c\'è luce, e la luce stanca.',4);
   }],
   [4.2, function(){ TV.Audio.sfx('heart'); flash('#dfe6ee',0.45,3.2); palpebre('chiusa'); }],
   [3.2, function(){ TV.Audio.sfx('flat'); flash('#fff',0.95,4); }],
   [4.0, function(){
      var min=Math.floor((s.tReale||0)/60);
      card('L\'ALBA',
        (buona
          ? 'Hai passato la notte a tenere compagnia a delle persone che ti vogliono bene.\n\n'
          : (brutta
             ? 'Hai passato la notte a fare del male da dietro una tastiera.\n\n'
             : 'Hai passato la notte davanti a uno schermo, come tutte le altre.\n\n'))+
        'Durata della notte: '+min+' minuti\n'+
        'Luce '+Math.round(s.luce)+' · buio '+Math.round(s.buio)+'\n'+
        'Persone che ti hanno voluto bene: '+(function(){
           var n=0; for(var k in s.persone) if(s.persone[k].affinita>=40) n++; return n; })()+'\n\n'+
        'Il referto era in buca dal 14 settembre.\n'+
        'Quella settimana guardavi la finestra.');
   }]
  ]);
};

/* ---------------- 5. IL SONNO ----------------
   Non muore nessuno. Ti addormenti, e basta. */
E.sonno=function(modo){
  if(TV.state.ended) return;
  TV.state.ended='sonno';
  chiudi();
  var s=TV.state;

  seq([
   [0.2, function(){
      indietro(); verso('avanti',0.8);
      subs(modo==='gentile'
        ? 'Ti hanno scritto di spegnere e andare a letto. Per una volta lo fai.'
        : 'Non scrivi più da un po\'. Nessuno ti scrive. Va bene così.', 4.4);
   }],
   [4.6, function(){
      verso('finestra',0.8);
      subs('Fuori piove ancora. La finestra di fronte è spenta.',4);
   }],
   [4.2, function(){
      verso('scrivania',1.0);
      TV.Audio.sfx('click');
      subs('Allunghi la mano e spegni la lampada.',3.6);
      TV.World.evento('buioTotale',{t:50});
   }],
   [3.8, function(){
      TV.Audio.sfx('breath'); palpebre('sbatte');
      subs('Gli occhi si chiudono da soli, senza chiedere il permesso.',4);
   }],
   [1.4, function(){ palpebre('sbatte'); }],
   [1.6, function(){ palpebre('socchiusa'); TV.World.crolla(9); }],
   [1.2, function(){ palpebre('chiusa'); flash('#000',0.9,4.5); }],
   [4.0, function(){
      card('IL SONNO',
        (modo==='gentile'
          ? 'Ti sei addormentato con il telefono in mano e tre conversazioni aperte.\n\n'
          : 'Ti sei addormentato davanti allo schermo, senza accorgerti.\n\n')+
        'Minuti di veglia: '+Math.floor(s.t/60)+'\n'+
        'Luce '+Math.round(s.luce)+' · buio '+Math.round(s.buio)+'\n\n'+
        'Il referto è ancora in buca.\n'+
        'Domani forse apri la posta.\n\n'+
        'La finestra di fronte è rimasta vuota tutta la notte.');
   }]
  ]);
};

/* ---------------- 6. LA MADRE ----------------
   L'hai spaventata fino in fondo. Quello che succede dopo lo scopri da terzi. */
E.madre=function(){
  if(TV.state.ended) return;
  TV.state.ended='madre';
  chiudi();
  var s=TV.state;

  seq([
   [0.2, function(){
      avanti(); verso('schermo',1.0);
      TV.Audio.sfx('msg');
      TV.Chat.push('chiara','them','mamma non risponde al telefono');
      subs('Chiara scrive. Poi riscrive subito, senza aspettare.',3.8);
   }],
   [3.8, function(){
      TV.Audio.sfx('msg');
      TV.Chat.push('chiara','them','papà ha sfondato la porta del bagno. era chiusa dall interno');
      TV.World.evento('glitch',{t:0.6});
      subs('',0.1);
   }],
   [3.6, function(){
      TV.Audio.sfx('bad');
      TV.Chat.push('chiara','them','cosa le hai scritto stanotte. COSA LE HAI SCRITTO');
      TV.Mail.arriva({da:'Carabinieri — Stazione di Valdina', ogg:'Comunicazione urgente ai familiari', bad:true,
        corpo:'<p>Si richiede la presenza di un familiare presso l\'abitazione di via Mandria 8.</p>'+
              '<p>Intervento effettuato alle ore 02:'+U.pad(U.ri(10,52))+' su segnalazione del coniuge.</p>'+
              '<p class="muted tiny">Non è necessario portare documenti.</p>'});
      subs('Tua madre ti aveva chiesto se avevi mangiato.',4.4);
   }],
   [4.6, function(){
      indietro(); verso('porta',1.0);
      TV.World.evento('flicker',{t:2.4});
      TV.Audio.sfx('breath');
      subs('Rileggi la chat dall\'inizio. Riga per riga. C\'è tutto.',4.4);
   }],
   [4.6, function(){
      verso('scrivania',1.2);
      TV.Audio.sfx('knock');
      subs('Apri il cassetto di destra. Dentro c\'è una cosa di tuo padre.',4.2);
   }],
   [4.4, function(){
      verso('scrivania',1.0);
      TV.World.pistola('mano',2.6);          // la mano entra nell'inquadratura
      TV.Audio.sfx('click');
      subs('Pesa più di quanto pensavi.',3.6);
   }],
   [3.8, function(){
      avanti(); verso('schermo',1.4);
      TV.World.evento('shake',{f:0.4});
      subs('Non scrivi niente a nessuno. Questa è l\'ultima cosa gentile che fai.',4);
   }],
   [4.2, function(){
      /* la pistola sale all'altezza della testa e si gira verso di te */
      TV.World.puntaPistola('tempia',1.3,true);
      TV.World.evento('flicker',{t:1.2});
      subs('La appoggi alla tempia. La mano ha smesso di tremare.',3.4);
   }],
   [3.4, function(){
      palpebre('socchiusa');
      subs('Chiudi gli occhi. Non per paura: per non vedere lo schermo.',3.2);
   }],
   [3.2, function(){
      TV.Audio.sfx('gun');
      TV.World.sparo({f:1.3, x:-0.75, z:0.95});   // la testa scatta di lato
      TV.World.cadePistola();                      // la mano si apre, la pistola cade
      TV.World.crolla(2.2);                         // il corpo scivola sulla scrivania
      flash('#fff',1,1);
      var b=document.getElementById('bullet');
      /* il colpo non è venuto da fuori: il monitor non si fora, si sporca */
      b.innerHTML='<div class="blood"></div><div class="word">LA MADRE</div>';
      b.classList.add('on');
      TV.World.evento('sangue',{v:0.9});
      TV.World.evento('buioTotale',{t:40});
      var os=document.getElementById('os');
      if(os) os.style.filter='grayscale(1) contrast(1.3) brightness(0.4)';
   }],
   [4.6, function(){ TV.Audio.sfx('flat'); palpebre('chiusa'); }],
   [3.4, function(){
      var m=s.persone.mamma||{};
      card('LA MADRE',
        'Rosa aveva sessantuno anni e dormiva con la luce accesa da due.\n\n'+
        'Messaggi che le hai scritto stanotte: '+(function(){
           var h=(TV.Chat.storia.mamma||[]); return h.filter(function(x){return x.chi==='me';}).length; })()+'\n'+
        'Quanto l\'hai spaventata: '+Math.round(m.spaventato||0)+'/100\n'+
        'Confessioni che le hai fatto: '+((m.confessioni||0))+'\n\n'+
        'Non è stato un uomo alla finestra.\n'+
        'Sei stato tu, da una tastiera, in una stanza chiusa.');
   }]
  ]);
};

/* ---------------- 7. IL BANCO ----------------
   Hai firmato un contratto che non ti hanno mostrato. */
E.banco=function(){
  if(TV.state.ended) return;
  TV.state.ended='banco';
  chiudi();
  var s=TV.state;

  seq([
   [0.2, function(){
      avanti(); verso('schermo',1.0);
      TV.Audio.sfx('msg');
      OS.notify({t:'CREDITO VERDE',x:'Pratica 4411 — passata al recupero locale.',bad:true});
      subs('Una notifica dal casinò. Alle due e mezza di notte.',3.6);
   }],
   [3.8, function(){
      TV.Audio.sfx('bell');
      indietro(); verso('porta',0.9);
      subs('Suonano al citofono. Una volta sola, corta.',3.6);
   }],
   [3.8, function(){
      TV.Audio.sfx('knock'); TV.World.evento('shake',{f:0.6});
      subs('Il portone di sotto si apre. Nessuno ha citofonato a nessuno.',3.8);
   }],
   [3.8, function(){
      TV.World.evento('portaApri',{luce:0.5});
      TV.Audio.sfx('breath');
      verso('porta',1.1); TV.World.sagoma(true);        // due sagome nel vano della porta
      subs('«Buonasera. Veniamo per il contratto 4411.»',4);
   }],
   [4.2, function(){
      verso('scrivania',1.2);
      subs('«Sono duecento euro. Lo sappiamo. Non è per i duecento euro.»',4.2);
   }],
   [4.4, function(){
      avanti(); verso('schermo',2.0);
      OS.glitch(2);
      subs('Ti rimettono a sedere davanti al computer. Gentilmente.',3.8);
   }],
   [3.8, function(){
      TV.World.pistola('dietro',1.9);        // entra da sopra la spalla destra
      TV.Audio.sfx('click');
      subs('Qualcosa di freddo ti passa accanto all\'orecchio.',3.4);
   }],
   [3.4, function(){
      TV.Audio.sfx('gun');
      TV.World.sparo();
      flash('#fff',1,0.9);
      TV.Audio.sfx('glass');
      var b=document.getElementById('bullet');
      b.innerHTML='<div class="blood"></div><div class="hole"></div><div class="word">IL BANCO</div>';
      b.classList.add('on');
      TV.World.evento('sangue',{v:0.85});
      TV.World.evento('buioTotale',{t:40});
      TV.World.evento('shake',{f:1.3});
      var os=document.getElementById('os');
      if(os) os.style.filter='grayscale(1) contrast(1.5) brightness(0.3)';
   }],
   [4.6, function(){ TV.Audio.sfx('flat'); palpebre('chiusa'); }],
   [3.4, function(){
      var c=(s.net&&s.net.casino)||{};
      card('IL BANCO',
        'Il monitor è rotto al centro. Lo schermo ha smesso di funzionare prima di te.\n\n'+
        'Mani giocate: '+(c.mani||0)+'\n'+
        'Vinto: '+U.money(c.vinto||0)+' · perso: '+U.money(c.perso||0)+'\n'+
        'Saldo finale: '+U.money(s.soldi)+'\n\n'+
        'Il ragazzo di due anni fa aveva perso 2.340 euro sullo stesso sito.\n'+
        'Nessuno è mai venuto a chiedergli niente.\n'+
        'Lui aveva pagato.');
   }]
  ]);
};

/* bottone di fine */
TV.on('boot',function(){
  var b=document.getElementById('endBtn');
  if(b) b.onclick=function(){ root.location.reload(); };
});
})(typeof window!=='undefined'?window:globalThis);

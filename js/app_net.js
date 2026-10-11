/* app_net.js — internet: si sblocca col tempo, e se delinqui si sblocca l'altra rete */
(function(root){
var TV = root.TV = root.TV || {};
var U=TV.U, OS=TV.OS, N=TV.NLU;
var NET = TV.Net = { siti:{}, storia:[], win:null };

function sito(url,def){ def.url=url; NET.siti[url]=def; return def; }
NET.sito=sito;      // i siti si possono aggiungere da altri file (vedi casino.js)
function h(s){ return U.esc(s); }

NET.vai=function(url){
  var w=NET.win; if(!w) { OS.open('net'); return; }
  url=String(url||'').trim().replace(/^https?:\/\//,'').replace(/\/$/,'');
  var d=NET.siti[url];
  /* se ricarichi la pagina su cui sei già (dopo un lavoretto, per esempio)
     resti dove stavi guardando invece di tornare in cima */
  var stessa = NET.storia.length && NET.storia[NET.storia.length-1]===url;
  var dove = stessa? w.pad.scrollTop : 0;
  w.bar.value=url;
  TV.state.net.visitate[url]=(TV.state.net.visitate[url]||0)+1;
  NET.storia.push(url);
  w.pad.className='page';
  w.pad.innerHTML='';
  TV.Audio.sfx('click');
  if(!d){
    w.pad.innerHTML='<h2 class="muted">Impossibile raggiungere il sito</h2>'+
      '<p class="muted tiny">'+h(url)+' — DNS_PROBE_FINISHED_NXDOMAIN</p>'+
      '<p class="tiny muted">Prova con <b>cerca.it</b></p>';
    return;
  }
  if(d.cls) w.pad.className='page '+d.cls;
  try{ d.render(w.pad,w); }catch(e){ console.error('sito '+url,e); w.pad.innerHTML='<p class="muted">Errore di rendering.</p>'; }
  w.pad.scrollTop = dove;
  if(d.onVisita) d.onVisita();
};

function link(pad,url,txt){
  var a=U.el('span','',h(txt||url)); a.style.cssText='color:#8ab4ff;cursor:pointer;text-decoration:underline';
  a.onclick=function(){ NET.vai(url); };
  pad.appendChild(a); return a;
}

/* ---------------- motore di ricerca ---------------- */
var INDICE=[
 {u:'gazzettino-valdina.it', t:'Il Gazzettino di Valdina — cronaca locale', d:'Edizione notturna. Cronaca, necrologi, avvisi.', k:'notizie giornale cronaca valdina morto omicidio polizia indagine'},
 {u:'forumvaldina.net', t:'Forum di Valdina — la bacheca del quartiere', d:'Discussioni: 11.402. Utenti online: 3.', k:'forum uomo finestra fantasma quartiere matteo vicino bevilacqua testimoni'},
 {u:'bancapiccola.it', t:'Banca Piccola — area clienti', d:'Saldo, bonifici, movimenti.', k:'banca soldi conto saldo bonifico stipendio'},
 {u:'lavoretti.it', t:'Lavoretti — microincarichi pagati subito', d:'Scrivi, traduci, correggi. Pagamento immediato.', k:'lavoro soldi guadagnare lavoretti gig pagamento'},
 {u:'tuttoevero', t:'tuttoevero', d:'(nessuna descrizione)', k:'tutto e vero tuttoevero mail sconosciuto'},
 {u:'cerca.it', t:'Cerca.it', d:'Il motore di ricerca.', k:'cerca ricerca'},
 {u:'wikivaldina.org', t:'Valdina — enciclopedia libera', d:'Comune di 4.112 abitanti. Storia, cronologia, note.', k:'valdina storia comune enciclopedia cortile case'},
 {u:'oncologia-valdina.it', t:'Centro Oncologico Valdina', d:'Prenotazioni, referti online.', k:'ospedale medico analisi referto esami cancro tumore salute'},
 {u:'casinoverde.it', t:'Casinò Verde — tavoli sempre aperti', d:'Blackjack e poker. Vincite accreditate subito.', k:'casino casino azzardo scommesse gioco poker blackjack carte soldi guadagnare puntare vincere giocare tavolo'}
];
/* ---- ricerche recenti: quelle tue, e quelle di chi c'era prima ---- */
NET.ricerche=function(){
  var n=TV.state.net;
  if(!n.ricerche){
    n.ricerche=[
      {q:'uomo immobile alla finestra di fronte', d:'2 anni fa', altro:true},
      {q:'si puo vedere una persona che non c e', d:'2 anni fa', altro:true},
      {q:'perche sempre alle 3:14',             d:'2 anni fa', altro:true},
      {q:'cortile vecchio valdina 1961 1983 1998', d:'2 anni fa', altro:true},
      {q:'come si mura una finestra',            d:'2 anni fa', altro:true},
      {q:'tuttoevero',                           d:'2 anni fa', altro:true},
      {q:'come recuperare i soldi persi al blackjack', d:'2 anni fa', altro:true},
      {q:'quanto tempo ho',                      d:'2 anni fa', altro:true}
    ];
  }
  return n.ricerche;
};
NET.addRicerca=function(q,quando,altro){
  q=String(q||'').trim(); if(!q) return;
  var l=NET.ricerche();
  for(var i=0;i<l.length;i++) if(l[i].q===q && !!l[i].altro===!!altro){ l.splice(i,1); break; }
  l.unshift({q:q, d:quando||'ora', altro:!!altro});
  if(l.length>16) l.length=16;
};
/* una ricerca che tu non hai fatto */
var FANTASMI=[
 'il quinto chi e il quinto','si muore di paura','quante ore restano','non spegnere lo schermo',
 'la finestra guarda dentro','chi abita al civico 14','numeri che chiamano e non parlano',
 'perche la mia voce era in casa','come si fa a non essere il prossimo'
];
NET.ricercaFantasma=function(){
  var q=null;
  // a volte la cronologia cerca le TUE parole
  if(U.chance(0.45) && TV.Chat && TV.Chat.storia){
    var mie=[];
    for(var k in TV.Chat.storia)
      TV.Chat.storia[k].forEach(function(m){ if(m.chi==='me' && m.t.length>12) mie.push(m.t); });
    if(mie.length){
      q=N.norm(U.pick(mie)).replace(/[#?!]/g,' ').replace(/\s+/g,' ').trim().split(' ').slice(0,7).join(' ');
    }
  }
  if(!q) q=U.pick(FANTASMI);
  NET.addRicerca(q, U.pick(['ora','1 minuto fa','2 minuti fa']), true);
  TV.add('buio',1.2);
  if(TV.state.paura>0.35) OS.notify({t:'CRONOLOGIA',x:'Aggiunta una ricerca recente.',bad:true});
  if(NET.win && NET.storia[NET.storia.length-1]==='cerca.it') NET.vai('cerca.it');
  return q;
};

/* risposte dirette del motore a certe domande.
   N.norm trasforma la punteggiatura in '#': qui la si toglie, cosi' "3:14" resta "3 14". */
function qpulita(q){ return String(q||'').replace(/[#?!]+/g,' ').replace(/\s+/g,' ').trim(); }
function rispostaDiretta(qr){
  var q=qpulita(qr);
  if(/uomo (immobile|alla finestra)|figura alla finestra|chi.*finestra di fronte/.test(q))
    return {bad:true, h:'1 risultato rimosso su richiesta dell\'autore.',
      t:'La pagina rimossa era: <b>forumvaldina.net/thread/civico-14</b>. La copia nella cache è stata cancellata 4 minuti fa.'};
  if(/\b3\s*[:.]?\s*14\b|tre e quattordici/.test(q))
    return {bad:true, h:'Tendenza locale',
      t:'<b>7 utenti</b> hanno cercato questo nell\'ultima ora. Tutti entro 120 metri da qui.'};
  if(/quanto tempo (ho|resta|mi resta)|quante ore/.test(q))
    return {bad:true, h:'Nessun risultato',
      t:'Questo servizio non risponde a questa domanda. L\'ultima volta che è stata cercata da questo dispositivo: <b>2 anni fa, 3:14</b>.'};
  if(/\b(matteo|mio fratello)\b/.test(q))
    return {h:'Risultati limitati', t:'Alcuni risultati sono stati rimossi per rispetto della privacy. Resta disponibile l\'archivio del <b>Gazzettino</b>.'};
  if(/cancro|tumore|referto|analisi|esami del sangue/.test(q))
    return {h:'Centro Oncologico Valdina',
      t:'Risulta <b>1 referto non ritirato</b> associato a questo indirizzo. Consegna prevista a mano.'};
  if(/si muore di paura|morire di paura/.test(q))
    return {bad:true, h:'Sì', t:'Arresto cardiaco da scarica adrenergica. È raro. Succede.'};
  if(/\b(il quinto|quinto)\b/.test(q))
    return {bad:true, h:'Nessun risultato', t:'Hai cercato una cosa che non hai letto da nessuna parte.'};
  return null;
}

sito('cerca.it',{titolo:'Cerca.it', render:function(pad){
  var box=U.el('div','srch');
  box.innerHTML='<div class="logo">CERCA</div>';
  var row=U.el('div','sugg'); row.style.cssText='display:flex;gap:6px;width:80%;position:relative';
  var i=U.el('input'); i.placeholder='cerca qualcosa';
  var b=U.el('button','','cerca');
  var sg=U.el('div','sugg-box'); sg.style.display='none';
  row.appendChild(i); row.appendChild(b); row.appendChild(sg); box.appendChild(row);
  var ris=U.el('div',''); ris.style.cssText='width:88%;display:flex;flex-direction:column;align-items:center';
  var res=U.el('div',''); res.style.cssText='width:88%;margin-top:10px';
  box.appendChild(ris); box.appendChild(res);

  /* ---- ricerche recenti ---- */
  var rec=U.el('div','rec');
  function disegnaRec(){
    var l=NET.ricerche();
    rec.innerHTML='<h4>RICERCHE RECENTI <span>salvate su questo dispositivo</span></h4>';
    var chips=U.el('div','chips');
    l.forEach(function(r){
      var c=U.el('div','chip'+(r.altro?' altro':''),'<b>'+h(r.q)+'</b><i>'+h(r.d)+'</i>');
      c.onclick=function(){ i.value=r.q; go(); };
      chips.appendChild(c);
    });
    rec.appendChild(chips);
  }
  box.appendChild(rec);
  pad.appendChild(box);

  /* ---- suggerimenti mentre scrivi ---- */
  function suggerisci(){
    var q=N.norm(i.value);
    sg.innerHTML=''; 
    if(q.length<2){ sg.style.display='none'; return; }
    var pool=NET.ricerche().map(function(r){ return {q:r.q, d:r.d, altro:r.altro}; })
      .concat(INDICE.map(function(s2){ return {q:s2.u, d:'sito'}; }));
    var hit=pool.filter(function(x){ return N.norm(x.q).indexOf(q)>=0; }).slice(0,6);
    if(!hit.length){ sg.style.display='none'; return; }
    hit.forEach(function(x){
      var d=U.el('div','', h(x.q)+'<i>'+h(x.d)+'</i>');
      if(x.altro) d.style.color='#b7a3ae';
      d.onmousedown=function(){ i.value=x.q; sg.style.display='none'; go(); };
      sg.appendChild(d);
    });
    sg.style.display='block';
  }

  function go(){
    var raw=i.value, q=N.norm(raw);
    sg.style.display='none';
    res.innerHTML=''; ris.innerHTML='';
    if(!q) return;
    NET.addRicerca(raw.trim(),'ora',false);
    disegnaRec();

    var rd=rispostaDiretta(q);
    if(rd){
      var rbox=U.el('div','risposta'+(rd.bad?' bad':''),'<b>'+h(rd.h)+'</b><div>'+rd.t+'</div>');
      ris.appendChild(rbox);
      if(rd.bad){ TV.add('buio',1.6); TV.World.evento('glitch',{t:0.4}); }
    }

    var found=INDICE.map(function(s2){
      var sc=0;
      N.tok(q).forEach(function(w){
        if(w.length<3) return;
        if((s2.k+' '+s2.t).indexOf(w)>=0) sc+=2;
        if(s2.u.indexOf(w)>=0) sc+=3;
      });
      return {s:s2,sc:sc};
    }).filter(function(x){return x.sc>0;}).sort(function(a,b2){return b2.sc-a.sc;});

    if(/prove|cancellare|sparire|hacker|falso|alibi|insabbiare|corrompere/.test(q) && TV.state.net.dark){
      found.unshift({s:{u:'nx7q4w2.onion', t:'nx7 — servizi', d:'non indicizzato', k:''},sc:99});
    }
    if(!found.length && !rd){ res.innerHTML='<p class="muted">Nessun risultato.</p>'; }
    found.slice(0,7).forEach(function(x){
      var r=U.el('div','sres','<b>'+h(x.s.t)+'</b><div class="u">'+h(x.s.u)+'</div><div class="d">'+h(x.s.d)+'</div>');
      r.onclick=function(){ NET.vai(x.s.u); };
      res.appendChild(r);
    });
    if(/uomo alla finestra|uomo immobile|figura finestra/.test(q)) TV.add('buio',1);
  }

  b.onclick=go;
  i.oninput=suggerisci;
  i.onkeydown=function(e){ if(e.key==='Enter'){ go(); } if(e.key==='Escape'){ sg.style.display='none'; } };
  i.onblur=function(){ setTimeout(function(){ sg.style.display='none'; },140); };
  disegnaRec();
  setTimeout(function(){ i.focus(); },30);
}});

/* ---------------- il giornale ---------------- */
function articoli(){
  var s=TV.state, g=TV.gravita(), art=[];
  art.push({t:'Pioggia e vento: allerta arancione fino all\'alba',
    c:'<p>La perturbazione resterà sulla valle per tutta la notte. Il sindaco invita a non uscire se non necessario.</p>'});
  art.push({t:'Due anni dalla morte di Matteo B., 29 anni',
    c:'<p>Il caso fu archiviato come autolesione. La famiglia ha chiesto per due volte la riapertura del fascicolo. '+
      'Il legale: «Nessuno ha mai spiegato le fotografie trovate nel suo telefono».</p>'+
      '<p>Il giovane, nelle settimane precedenti, aveva segnalato ai carabinieri la presenza di un uomo '+
      'immobile alla finestra dell\'edificio di fronte alla sua abitazione. Il sopralluogo non rilevò nulla: '+
      'l\'appartamento risultava disabitato dal 1998.</p>'});
  if(s.crimini.length>0 && g>=18){
    art.push({t:'Segnalazioni notturne nella zona del cortile vecchio', bad:true,
      c:'<p>Diversi residenti hanno riferito urla provenienti dalle palazzine di via Cengio. '+
        'Una pattuglia ha effettuato un controllo senza riscontri.</p>'});
  }
  if(g>=40){
    art.push({t:'Trovato un uomo senza vita in via Cengio', bad:true,
      c:'<p>Il corpo è stato rinvenuto poco dopo le 23 da un passante. Sul posto la scientifica. '+
        'La vittima sarebbe un uomo di 61 anni residente nella stessa via.</p>'+
        '<p><b>Fatti accertati:</b> decesso tra le <b>22:40 e le 23:20</b>; la vittima era in casa; '+
        'un testimone riferisce di una <b>luce accesa al terzo piano del civico 14</b> in quegli istanti.</p>'});
  }
  if(s.sospetto>=45){
    art.push({t:'Indagini: «Cerchiamo una persona del quartiere»', bad:true,
      c:'<p>L\'ispettore Grandi: «Sappiamo che chi cerchiamo era a poche decine di metri. '+
        'Ha usato un computer quella notte. I tabulati parlano.»</p>'});
  }
  if(s.soldi>=2500) art.push({t:'Boom di microincarichi: «Si guadagna di notte»',
    c:'<p>Cresce il numero di residenti che lavora online nelle ore notturne.</p>'});
  return art;
}
sito('gazzettino-valdina.it',{titolo:'Il Gazzettino', cls:'news', render:function(pad){
  pad.innerHTML='<h1>Il Gazzettino di Valdina</h1><p style="font-size:11px">Edizione notturna · '+h(U.clock(TV.state.t))+'</p>';
  articoli().forEach(function(a){
    var d=U.el('div','art','<h2>'+h(a.t)+'</h2>');
    var c=U.el('div','',a.c); c.style.display='none';
    d.querySelector('h2').onclick=function(){ c.style.display = c.style.display==='none'?'block':'none'; };
    d.appendChild(c); pad.appendChild(d);
  });
  if(TV.state.sospetto>=45) TV.add('buio',0.4);
}});

/* ---------------- il forum ---------------- */
sito('forumvaldina.net',{titolo:'Forum di Valdina', cls:'forum', render:function(pad){
  var th=[
   {t:'[SERIO] Chi è l\'uomo alla finestra del civico 14?', r:218, p:[
     '<b>pescatore61</b>: Lo vedo da quando sono bambino. Non invecchia. Non vi sto prendendo in giro.',
     '<b>mod_valdina</b>: Thread già chiuso tre volte. Ultimo avviso.',
     '<b>anna_c</b>: Mia madre diceva che se lo guardi per primo, poi lui guarda te. Io non ci credo. Però ho messo le tende.'
   ]},
   {t:'Il ragazzo del cortile — due anni oggi', r:94, p:[
     '<b>giuls</b>: Era lucido. Più lucido di tutti noi. Basta chiamarlo matto.',
     '<b>pescatore61</b>: Prima di lui ce ne sono stati altri tre. 1998, 1983, 1961. Guardate le date sui necrologi.',
     '<b>anon</b>: Ogni volta uno della casa che guarda il cortile. Ogni volta d\'autunno.'
   ]},
   {t:'Ricevute mail con tre parole: anche a voi?', r:51, p:[
     '<b>anna_c</b>: TUTTO È VERO. Senza mittente. Ho chiamato la polizia postale, hanno riso.',
     '<b>mod_valdina</b>: Se vi arriva, non rispondete e non guardate fuori. Punto.',
     '<b>pescatore61</b>: Io ho risposto. Ho scritto "chi sei". Non fatelo.'
   ]}
  ];
  if(TV.gravita()>=40) th.unshift({t:'STANOTTE IN VIA CENGIO — c\'è la scientifica', r:7, p:[
     '<b>anna_c</b>: Tre volanti sotto casa. Qualcuno sa niente?',
     '<b>pescatore61</b>: Hanno portato via qualcosa in un sacco.',
     '<b>mod_valdina</b>: Chiudo. Niente speculazioni.'
  ]});
  pad.innerHTML='<h2 style="margin-bottom:8px">Forum di Valdina · bacheca</h2>';
  th.forEach(function(x){
    var d=U.el('div','th','<b>'+h(x.t)+'</b> <span style="color:#666">· '+x.r+' risposte</span>');
    var c=U.el('div',''); c.style.cssText='display:none;margin-top:7px;border-top:1px solid #d3dbe2;padding-top:7px';
    x.p.forEach(function(p){ var m=U.el('div','',p); m.style.marginBottom='6px'; c.appendChild(m); });
    d.querySelector('b').onclick=function(){ c.style.display=c.style.display==='none'?'block':'none'; TV.add('buio',0.5); };
    d.appendChild(c); pad.appendChild(d);
  });
}});

sito('wikivaldina.org',{titolo:'Valdina', render:function(pad){
  pad.innerHTML='<h2>Valdina</h2><p class="muted tiny">Da Wikivaldina, l\'enciclopedia libera.</p>'+
   '<p>Comune italiano di 4.112 abitanti. Il nucleo storico è organizzato intorno a un cortile chiuso '+
   '(detto <i>cortile vecchio</i>) edificato nel 1878 su un\'area precedentemente occupata da un lazzaretto.</p>'+
   '<h3>Cronologia dei decessi nel cortile vecchio</h3>'+
   '<p>1961 — G. Serafin, 31 anni.<br>1983 — L. Muraro, 24 anni.<br>1998 — R. Bevilacqua, 19 anni.<br>'+
   '2024 — M. B., 29 anni.</p>'+
   '<p class="muted tiny">Questa sezione è stata modificata 46 volte nelle ultime 24 ore. '+
   'Ultima modifica da un utente non registrato.</p>';
  TV.add('buio',0.8); TV.flag('cronologia',true);
}});

/* ---------------- banca + lavoretti ---------------- */
sito('bancapiccola.it',{titolo:'Banca Piccola', cls:'bank', render:function(pad){
  var s=TV.state;
  pad.innerHTML='<h2>Banca Piccola · area clienti</h2>'+
    '<p style="font-size:12px;color:#5a6b7a">Conto corrente ****2210</p>'+
    '<div class="bal">'+h(U.money(s.soldi))+'</div>'+
    '<p style="font-size:12px;color:#5a6b7a">Movimenti recenti</p>';
  var mov=(s.movimenti||[]).slice(0,10);
  if(!mov.length) pad.innerHTML+='<p style="font-size:12px">Nessun movimento negli ultimi 30 giorni.</p>';
  mov.forEach(function(m){
    pad.innerHTML+='<div style="display:flex;justify-content:space-between;border-bottom:1px solid #e3e8ee;padding:5px 0;font-size:12px">'+
      '<span>'+h(m.d)+'</span><span style="color:'+(m.v>0?'#0a6b3d':'#9b2226')+'">'+(m.v>0?'+':'')+h(U.money(Math.abs(m.v)))+'</span></div>';
  });
  if(s.soldi>=TV.SOGLIA_RICCO && !TV.flag('ricco')) TV.flag('ricco',true);
}});

function movimento(d,v){
  var s=TV.state; s.movimenti=s.movimenti||[];
  s.movimenti.unshift({d:d,v:v}); TV.add('soldi',v);
}
NET.movimento=movimento;

var GIGS=[
 {l:0, t:'Recensione di un ristorante (40 parole)', p:[45,85], q:'Scrivi una recensione credibile della Trattoria al Ponte.',
  ok:function(a){ return a.len>=12; }},
 {l:0, t:'Descrizione prodotto — torcia tattica', p:[50,95], q:'Descrivi il prodotto in modo convincente.',
  ok:function(a){ return a.len>=12; }},
 {l:1, t:'Lettera di sollecito per uno studio legale', p:[150,260], q:'Tono formale, nessun insulto, almeno 20 parole.',
  ok:function(a){ return a.len>=20 && a.aggressione<0.5; }},
 {l:1, t:'Testo per sito di pompe funebri', p:[130,240], q:'Delicato. Niente parole volgari.',
  ok:function(a){ return a.len>=18 && a.aggressione<0.3; }},
 {l:2, t:'Copy pubblicitario per catena di supermercati', p:[420,780], q:'Serve entusiasmo e almeno 25 parole.',
  ok:function(a){ return a.len>=25 && a.sentiment>=0; }},
 {l:2, t:'Discorso per un sindaco (bozza)', p:[500,900], q:'Formale, positivo, almeno 30 parole.',
  ok:function(a){ return a.len>=30 && a.aggressione<0.3; }}
];
sito('lavoretti.it',{titolo:'Lavoretti', render:function(pad){
  var s=TV.state;
  pad.innerHTML='<h2>Lavoretti</h2><p class="muted tiny">Incarichi completati: '+s.net.gigFatti+
    ' · livello '+s.net.gigLivello+' · saldo '+h(U.money(s.soldi))+'</p>';
  var disp=GIGS.filter(function(g){ return g.l<=s.net.gigLivello; });
  disp.forEach(function(g){
    if(s.net['gig_'+g.t]) return;
    var c=U.el('div','card','<b>'+h(g.t)+'</b><span class="pay">'+h(U.money(g.p[0]))+'–'+h(U.money(g.p[1]))+'</span>'+
      '<div class="tiny muted" style="margin:6px 0">'+h(g.q)+'</div>');
    var ta=U.el('textarea'); ta.rows=3; ta.placeholder='Scrivi qui il testo…';
    var b=U.el('button','','consegna');
    b.onclick=function(){
      var a=N.analyze(ta.value);
      if(N.sensato(a)<0.3 || !g.ok(a)){
        OS.notify({t:'LAVORETTI',x:'Consegna rifiutata dal committente.',bad:true});
        TV.Audio.sfx('bad'); return;
      }
      var pay=U.rnd(g.p[0],g.p[1]);
      s.net['gig_'+g.t]=1; s.net.gigFatti++;
      if(s.net.gigFatti>=2 && s.net.gigLivello<1) s.net.gigLivello=1;
      if(s.net.gigFatti>=4 && s.net.gigLivello<2) s.net.gigLivello=2;
      movimento('Lavoretti — '+g.t, pay);
      TV.add('luce',1.5);
      OS.notify({t:'PAGAMENTO RICEVUTO',x:U.money(pay)+' accreditati.'});
      TV.Audio.sfx('mail');
      TV.emit('gig',{pay:pay});
      NET.vai('lavoretti.it');
    };
    c.appendChild(ta); c.appendChild(b); pad.appendChild(c);
  });
  /* l'offerta che non è un lavoretto */
  if(s.net.gigFatti>=3 && !s.net.gig_sporco){
    var c2=U.el('div','card','<b>Incarico riservato — trasferimento fondi</b><span class="pay">'+h(U.money(2500))+'</span>'+
      '<div class="tiny muted" style="margin:6px 0">Ricevi su conto tuo, rigiri su altro conto. Non chiedere di chi sono. '+
      'Committente verificato: no.</div>');
    c2.style.borderColor='#b58b2a';
    var b2=U.el('button','','accetta');
    b2.onclick=function(){
      s.net.gig_sporco=1;
      movimento('Bonifico in entrata — causale assente', 2500);
      TV.crimine('frode',3,'riciclaggio tramite lavoretti.it');
      OS.notify({t:'ACCREDITO',x:'€ 2.500,00 — causale assente.',bad:true});
      TV.World.evento('glitch');
      NET.vai('lavoretti.it');
    };
    c2.appendChild(b2); pad.appendChild(c2);
  }
}});

/* ---------------- oncologia: il seme del finale ---------------- */
sito('oncologia-valdina.it',{titolo:'Centro Oncologico Valdina', render:function(pad){
  pad.innerHTML='<h2>Centro Oncologico Valdina</h2>'+
   '<h3>Area referti</h3>'+
   '<p class="muted tiny">Accesso con tessera sanitaria.</p>';
  var i=U.el('input'); i.placeholder='numero tessera';
  var b=U.el('button','','accedi');
  b.onclick=function(){
    pad.innerHTML+='<p class="muted tiny" style="margin-top:10px">Referto presente: 1. '+
      'Consegna prevista: <b>a mano, dal personale</b>. Non visualizzabile online.</p>';
    TV.flag('referto',true);
    TV.Audio.sfx('bad');
  };
  pad.appendChild(i); pad.appendChild(b);
}});

/* ---------------- il sito che ti guarda ---------------- */
sito('tuttoevero',{titolo:'tuttoevero', cls:'feed', render:function(pad){
  var s=TV.state, f=TV.updateFear();
  var righe=[
   '> CANALE 1 — ATTIVO',
   '> soggetto: seduto. distanza dallo schermo: '+U.ri(38,54)+' cm',
   '> lampada: '+(f>0.4?'instabile':'accesa'),
   '> finestra: '+(f>0.5?'osservata da 2 punti':'chiusa'),
   '> porta: '+(TV.World.portaApri?'aperta':'chiusa'),
   '> tempo trascorso dall\'apertura della mail: '+Math.floor(s.t/60)+' min '+Math.floor(s.t%60)+' s',
   '> messaggi inviati stanotte: '+(function(){var n=0;for(var k in TV.Chat.storia) n+=TV.Chat.storia[k].filter(function(m){return m.chi==='me';}).length; return n;})(),
   '> parole chiave rilevate: '+(s.crimini.length?s.crimini.map(function(c){return c.tipo;}).join(', '):'nessuna'),
   '> ',
   '> NON SEI IL PRIMO. SEI IL QUINTO.'
  ];
  pad.innerHTML='<pre style="white-space:pre-wrap;line-height:1.7">'+h(righe.join('\n'))+'</pre>';
  TV.add('buio',3);
  TV.World.evento('glitch',{t:0.8});
  TV.World.evento('figura',{t:7});
  TV.flag('vistoSito',true);
}});

/* ---------------- la rete nera ---------------- */
sito('nx7q4w2.onion',{titolo:'nx7', cls:'dark', render:function(pad){
  var s=TV.state, pr=TV.Police.prove();
  pad.innerHTML='<h1>NX7 · SERVIZI</h1>'+
    '<p>sospetto rilevato su di te: <b>'+Math.round(s.sospetto)+'%</b> · credito: <b>'+h(U.money(s.soldi))+'</b></p>';

  function svc(tit,desc,costo,azione,fatta){
    var c=U.el('div','svc','<b>'+h(tit)+'</b><div style="font-size:12px;margin:5px 0">'+h(desc)+'</div>'+
      '<div style="font-size:11px;color:#6a8a6a">costo: '+(costo?h(U.money(costo)):'gratis')+'</div>');
    var b=U.el('button','',fatta?'eseguito':'esegui');
    if(fatta) b.disabled=true;
    b.onclick=function(){
      if(costo && s.soldi<costo){ OS.notify({t:'NX7',x:'Credito insufficiente.',bad:true}); TV.Audio.sfx('bad'); return; }
      if(costo) movimento('NX7 — servizio', -costo);
      azione(); NET.vai('nx7q4w2.onion');
    };
    c.appendChild(b); pad.appendChild(c);
  }

  /* 1. profilo dell'ispettore */
  svc('PROFILO — Isp. Grandi','Estrae il profilo psicologico dal fascicolo interno. Serve per parlargli.',0,function(){
    pr.profiloVisto=true;
    TV.flag('poliziaAperta',true);
    OS.notify({t:'NX7',x:'Profilo estratto. Apri Messaggi.'});
    TV.add('buio',2);
  }, pr.profiloVisto);
  if(pr.profiloVisto){
    pad.innerHTML+='<div class="svc" style="border-color:#4a3a1a"><b>PROFILO ESTRATTO</b>'+
      '<div style="font-size:12px;line-height:1.7">'+
      'orgoglio: '+'█'.repeat(Math.round(pr.profilo.orgoglio*5))+'<br>'+
      'stanchezza: '+'█'.repeat(Math.round(pr.profilo.stanchezza*5))+'<br>'+
      'propensione al dubbio: '+'█'.repeat(Math.round(pr.profilo.dubbio*5))+'<br>'+
      '</div><div style="font-size:11px;color:#8a8" >Leve efficaci: '+h(pr.leveUtili().join(', '))+
      '. Minacce, soldi e confessioni: controproducenti.</div></div>';
  }

  /* 2. cancellazione prove */
  pad.innerHTML+='<h1 style="font-size:14px;margin-top:14px">PROVE A TUO CARICO</h1>';
  if(!pr.items.length) pad.innerHTML+='<p style="font-size:12px">Nessun elemento a tuo carico. Per ora.</p>';
  pr.items.forEach(function(it){
    svc((it.sparita?'[RIMOSSA] ':'')+it.nome, it.desc+' · peso '+it.peso,
      it.costo, function(){
        if(it.tipo==='testimone'){
          TV.crimine('minacce',3,'pressione su testimone');
          TV.add('buio',4);
        }
        it.sparita=true;
        TV.add('sospetto',-it.peso);
        TV.crimine('insabbiamento',3,'rimozione prova: '+it.nome);
        OS.notify({t:'NX7',x:it.nome+' — rimossa.'});
        TV.World.evento('glitch');
      }, it.sparita);
  });

  /* 3. alibi */
  pad.innerHTML+='<h1 style="font-size:14px;margin-top:14px">ALIBI SU MISURA</h1>';
  if(pr.alibi){
    pad.innerHTML+='<p style="font-size:12px">Alibi depositato: '+h(pr.alibi.testo)+' — '+
      (pr.alibi.buono?'coerente':'INCOERENTE con gli atti')+'</p>';
  } else {
    var box=U.el('div','svc','<b>COSTRUISCI UN ALIBI</b>'+
      '<div style="font-size:11px;margin-bottom:6px">Deve combaciare con quello che è già scritto nei verbali. '+
      'Leggi il giornale prima di scegliere.</div>');
    var selO=U.el('select'), selL=U.el('select'), selT=U.el('select');
    [['22:40 – 23:20','ok'],['19:00 – 20:00','no'],['01:00 – 02:00','no']].forEach(function(o){
      var e=U.el('option','',o[0]); e.value=o[1]; selO.appendChild(e); });
    [['in casa, al computer','ok'],['al bar della stazione','no'],['in auto fuori città','no']].forEach(function(o){
      var e=U.el('option','',o[0]); e.value=o[1]; selL.appendChild(e); });
    [['nessuno, ero solo','ok'],['mia madre','no'],['un collega','no']].forEach(function(o){
      var e=U.el('option','',o[0]); e.value=o[1]; selT.appendChild(e); });
    [selO,selL,selT].forEach(function(s2){ s2.style.cssText='display:block;margin:4px 0;width:100%;background:#0a0f0a;color:#9ad1a0;border:1px solid #1d3a22;padding:5px'; box.appendChild(s2); });
    var b=U.el('button','','deposita (€ 400,00)');
    b.onclick=function(){
      if(TV.state.soldi<400){ OS.notify({t:'NX7',x:'Credito insufficiente.',bad:true}); return; }
      movimento('NX7 — alibi', -400);
      var buono = selO.value==='ok' && selL.value==='ok' && selT.value==='ok';
      pr.alibi={testo:selO.options[selO.selectedIndex].text+', '+selL.options[selL.selectedIndex].text+', '+selT.options[selT.selectedIndex].text, buono:buono};
      if(buono){ TV.add('sospetto',-18); OS.notify({t:'NX7',x:'Alibi coerente. Depositato.'}); }
      else { TV.add('sospetto',22); OS.notify({t:'NX7',x:'Alibi incoerente. Hanno notato.',bad:true}); TV.Audio.sfx('bad'); }
      TV.crimine('insabbiamento',3,'alibi falso');
      NET.vai('nx7q4w2.onion');
    };
    box.appendChild(b); pad.appendChild(box);
  }

  /* 4. corruzione diretta */
  svc('BUSTA','Un agente del nucleo accetta. Poi però sa di te.',1800,function(){
    TV.add('sospetto',-14); TV.crimine('corruzione',3,'pagamento a pubblico ufficiale');
    if(U.chance(0.4)){ TV.after(40,function(){ TV.add('sospetto',26);
      OS.notify({t:'NX7',x:'L\'agente ha parlato. Il sospetto è salito.',bad:true}); },'nx7'); }
  }, false);
}});

/* ---------------- la finestra del browser ---------------- */
OS.app({
  id:'net', titolo:'Internet', icona:'⌘', w:700, h:470, x:150, y:30, locked:true,
  msgBlocco:'Nessuna rete rilevata. Il modem non risponde.',
  build:function(body,win){
    body.innerHTML='';
    var col=U.el('div','col');
    var bar=U.el('div','urlbar');
    bar.innerHTML='<button class="back">◀</button><input type="text" value="cerca.it"><button class="go">vai</button>';
    var pad=U.el('div','page');
    col.appendChild(bar); col.appendChild(pad); body.appendChild(col);
    win.bar=bar.querySelector('input'); win.pad=pad;
    NET.win=win;
    bar.querySelector('.go').onclick=function(){ NET.vai(win.bar.value); };
    win.bar.onkeydown=function(e){ if(e.key==='Enter') NET.vai(win.bar.value); };
    bar.querySelector('.back').onclick=function(){
      NET.storia.pop(); var u=NET.storia.pop();
      NET.vai(u||'cerca.it');
    };
    NET.vai(NET.storia.length?NET.storia[NET.storia.length-1]:'cerca.it');
  },
  onClose:function(){ NET.win=null; }
});

NET.sblocca=function(){
  TV.state.net.sbloccata=true;
  OS.sblocca('net',{t:'RETE',x:'Connessione ripristinata. Internet disponibile.'});
};
NET.sbloccaDark=function(){
  if(TV.state.net.dark) return;
  TV.state.net.dark=true;
  TV.Mail.arriva({da:'nx7', ogg:'hai bisogno di noi', bad:true,
    corpo:'<p>Abbiamo letto quello che hai scritto ai tuoi parenti. Lo ha letto anche altra gente.</p>'+
          '<p>Indirizzo: <b>nx7q4w2.onion</b></p><p class="muted tiny">Non cercarci. Ti abbiamo trovato noi.</p>'});
  OS.notify({t:'RETE NX7',x:'Nodo non indicizzato raggiungibile.',bad:true});
  TV.World.evento('glitch',{t:1.2});
};
})(typeof window!=='undefined'?window:globalThis);

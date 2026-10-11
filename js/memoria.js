/* memoria.js — la memoria delle conversazioni.
   Tiene il filo di quello che hai scritto: i fatti, le contraddizioni,
   le domande lasciate cadere, gli argomenti su cui stai girando intorno.
   Non c'è nessun server: è tutto ricordo locale, usato per rispondere. */
(function(root){
var TV = root.TV = root.TV || {};
var U = TV.U, N = TV.NLU;
var M = TV.Mem = {};

/* ============ quanto tempo è passato, detto a parole ============ */
M.fa=function(quando){
  var d=Math.max(0, TV.state.t - quando);
  if(d<70) return 'un minuto fa';
  var m=Math.round(d/60);
  if(m<4)  return m+' minuti fa';
  if(m<9)  return 'poco fa';
  if(m<20) return 'un quarto d\'ora fa';
  return 'prima, stanotte';
};

/* ============ i fatti, tradotti in italiano ============
   serve per poterti ricordare una cosa che hai scritto tu */
/* una parola sola suona male senza articolo: "hai ucciso vicino" */
function art(v){
  v=String(v||'').trim();
  if(!v || v.indexOf(' ')>=0) return v;
  if(/^(mio|mia|tuo|tua|suo|sua|un|una|il|lo|la|gli|le|dei|delle)$/.test(v)) return v;
  if(/a$/.test(v))  return 'la '+v;
  if(/[oe]$/.test(v)) return 'il '+v;
  return v;
}

var FATTO={
  nome:         function(v){ return 'ti chiami '+String(v).charAt(0).toUpperCase()+String(v).slice(1); },
  eta:          function(v){ return 'hai '+v+' anni'; },
  insonnia:     function(){ return 'non riesci a dormire'; },
  malato:       function(){ return 'stai male'; },
  solitudine:   function(){ return 'ti senti solo'; },
  stato:        function(v){ return 'stavi '+v; },
  paura_di:     function(v){ return 'hai paura di '+v; },
  visto:        function(){ return 'hai visto qualcuno'; },
  vittima:      function(v){ return 'hai ucciso '+art(v); },
  rubato:       function(v){ return 'hai rubato '+art(v); },
  nascosto:     function(v){ return 'hai nascosto '+art(v); },
  lavoro:       function(v){ return 'lavori '+v; },
  luogo:        function(v){ return 'sei '+v; },
  promessa:     function(){ return 'me lo avevi promesso'; },
  dichiarazione:function(){ return 'tieni a me'; },
  r_cibo:       function(v){ return v==='si'?'avevi mangiato':'non avevi mangiato'; },
  r_solo:       function(v){ return v==='si'?'eri solo in casa':'non eri solo'; },
  r_porta:      function(v){ return v==='si'?'avevi chiuso la porta':'non avevi chiuso la porta'; },
  r_tende:      function(v){ return v==='si'?'avevi chiuso le tende':'avevi le tende aperte'; },
  r_sonno:      function(v){ return v==='si'?'volevi dormire':'non avresti dormito'; },
  r_stato:      function(v){ return v==='si'?'stavi bene':'non stavi bene'; }
};
M.inParole=function(k,v){ return FATTO[k]? FATTO[k](v) : null; };

/* fatti che, se cambiano, sono una contraddizione e non un aggiornamento */
var FISSI={nome:1, eta:1, lavoro:1, stato:1, r_solo:1, r_cibo:1, r_porta:1, r_tende:1, r_stato:1};

/* ============ di che cosa ti ha chiesto ============
   le domande dei personaggi sono scritte in italiano: qui si capisce
   a quale argomento appartengono, così la tua risposta viene archiviata. */
var QK=[
  [/mangiat|mangi|cena|caldo|fame/, 'cibo'],
  [/sol[oa]\b|chi c e con te|chi c è|chi c\'è|qualcuno con te/, 'solo'],
  [/chiave|la porta/, 'porta'],
  [/tend|tapparell|finestr/, 'tende'],
  [/dorm|sonno|stanotte/, 'sonno'],
  [/ti chiamo|chiamarti|telefon/, 'chiamata'],
  [/veng[oa]|vieni|passo da te/, 'visita'],
  [/dove sei|dove ti trovi|adesso sei/, 'luogo'],
  [/stai bene|come stai|bene bene/, 'stato'],
  [/soldi|bisogno di soldi/, 'soldi'],
  [/felpa|foto|telefono di matteo/, 'oggetto'],
  [/dov era|dove era|fra le|confermarlo|conferma/, 'alibi'],
  [/bevilacqua|conosce il/, 'vicino'],
  [/mamma|a tua madre|lo dico a/, 'avvisare']
];
M.chiaveDomanda=function(txt){
  var n=N.norm(txt||'');
  for(var i=0;i<QK.length;i++) if(QK[i][0].test(n)) return QK[i][1];
  return null;
};

/* ============ la reazione a una risposta secca ============
   due toni: chi ti vuole bene insiste, chi è asciutto chiude. */
var RISP={
 cibo:{
   si:{c:["Bene. Almeno quello.|Meno male. Mi levo un peso.|Bravo. Era l'unica cosa che volevo sapere."],
       f:["Bene.|Almeno quello.|Ok."]},
   no:{c:["Allora alzati e mangia qualcosa adesso, mentre ti scrivo.|Lo sapevo. Non mangi mai quando stai così.|Vai in cucina. Anche solo del pane. Poi mi dici."],
       f:["Mangia qualcosa.|Male. Vai a mangiare.|Devi mangiare."]}
 },
 solo:{
   si:{c:["Non mi piace che stai da solo stanotte.|E se ti dicessi di venire qui? Ci pensi almeno?|Da solo in quella casa. Con quella finestra."],
       f:["Tieni la porta chiusa.|Allora chiuditi dentro."]},
   no:{c:["E chi c'è con te? Dimmi il nome.|Non eri solo? Prima avevo capito un'altra cosa.|Chi c'è lì con te. Rispondi a questa."],
       f:["Chi c'è con te.|Chi.|Dimmi chi è."]}
 },
 porta:{
   si:{c:["Brava persona. Lasciala chiusa fino a domani.|Bene. Non aprire a nessuno, nemmeno se senti la voce di uno che conosci."],
       f:["Bene.|Lasciala così."]},
   no:{c:["Vai a chiuderla. Adesso. Ti aspetto qui con il telefono in mano.|Chiudila ti prego. Poi torni e mi scrivi che l'hai fatto."],
       f:["Chiudila.|Chiudi quella porta."]}
 },
 tende:{
   si:{c:["Bene. Non guardare più fuori stanotte.|Tienile chiuse. Non è superstizione, è solo che fa meno paura."],
       f:["Bene.|Tienile chiuse."]},
   no:{c:["Chiudile. Non voglio che tu stia lì con quella finestra aperta davanti.|Chiudile, e non controllare se c'è qualcuno. Chiudile e basta."],
       f:["Chiudile.|Male."]}
 },
 sonno:{
   si:{c:["Allora spegni tutto e vai. Davvero.|Bene. Scrivimi domattina che ti sei svegliato."],
       f:["Vai a dormire.|Bene."]},
   no:{c:["Lo so. Nemmeno io dormo da due anni.|Allora restiamo svegli insieme. Io il telefono non lo spengo."],
       f:["Nemmeno io.|Eh."]}
 },
 chiamata:{
   si:{c:["Ti chiamo. Rispondi al primo squillo, non farmi aspettare.|Ok. Allora adesso senti il telefono che suona."],
       f:["Ti chiamo.|Ok."]},
   no:{c:["Va bene. Allora scrivimi tu quando vuoi, anche alle quattro.|Come preferisci. Ma resto sveglia."],
       f:["Come vuoi.|Ok."]}
 },
 visita:{
   si:{c:["Allora vengo. Dammi il tempo di vestirmi.|Vengo. Non muoverti da lì e tieni il telefono in mano."],
       f:["Arrivo.|Vengo."]},
   no:{c:["Va bene. Ma se cambi idea mi scrivi, a qualunque ora.|Come vuoi. Però io resto sveglia finché non mi dici che dormi."],
       f:["Come vuoi.|Ok. Resto qui."]}
 },
 stato:{
   si:{c:["Non ti credo, ma va bene.|Lo dici con la stessa faccia di tuo fratello. Anche lui stava sempre bene."],
       f:["Mmh.|Se lo dici tu."]},
   no:{c:["Lo sapevo. Parliamone adesso, non domani.|Allora dimmi cosa c'è. Una cosa per volta."],
       f:["Lo immaginavo.|Dimmi cosa c'è."]}
 },
 soldi:{
   si:{c:["Quanto ti serve. Non voglio sapere perché.|Domani appena apre la banca te li mando."],
       f:["Quanto.|Ti faccio il bonifico."]},
   no:{c:["Meno male. Ma se servono si chiedono, eh.|Bene. Però non fare come tuo fratello che non diceva niente."],
       f:["Bene.|Ok."]}
 },
 avvisare:{
   si:{c:["Allora glielo dico. Ma lo faccio con calma, non la spavento.|Glielo dico domani. Stanotte la lascio dormire."],
       f:["Glielo dico.|Va bene."]},
   no:{c:["Non glielo dico. Però questo peso lo porto io adesso, ricordatelo.|Non glielo dico. Ma non mettermi in mezzo un'altra volta."],
       f:["Non glielo dico.|Come vuoi."]}
 },
 vicino:{
   si:{c:["Allora stai lontano da quella casa.|Lo sapevo. Quello non è normale, lo dice tutto il cortile."],
       f:["Stai lontano da quello.|Mmh."]},
   no:{c:["Meglio così. Non andarci a parlare, per nessun motivo.|Bene. Lascialo stare."],
       f:["Meglio.|Bene."]}
 },
 alibi:{
   si:{c:["Bene. Allora lo mettiamo a verbale e lo verifichiamo."],
       f:["Lo verifico. Se è vero, è un punto per lei.|Bene. Controlliamo."]},
   no:{c:["Allora abbiamo un problema, lei e io."],
       f:["Questo è un problema.|Male. Molto male."]}
 },
 luogo:{
   si:{c:["Resta lì. Non uscire per nessun motivo.|Ok. Allora so dove sei. Mi basta."],
       f:["Resti lì.|Bene."]},
   no:{c:["Allora dimmi dove sei. Esattamente dove.|Non capisco dove sei. Dimmelo chiaro."],
       f:["Dove sei.|Mi dica dove si trova."]}
 },
 oggetto:{
   si:{c:["Ce l'hai ancora. Non buttarla via.|Tienila. È l'unica cosa che è rimasta."],
       f:["Tienila.|Bene."]},
   no:{c:["Peccato. Pensavo che l'avessi tenuta.|Mi dispiace. Era l'ultima cosa sua."],
       f:["Peccato.|Eh."]}
 }
};

/* ============ banchi dei richiami ============ */
var CB={
  contraddizione:{
    c:["Aspetta. Prima mi avevi scritto che {pre}. Adesso mi dici un'altra cosa. Quale delle due è vera?",
       "Non torna. {Pre}, lo hai scritto tu {fa}. Perché mi stai cambiando le carte?",
       "Mi hai detto che {pre}. Me lo ricordo perché me lo sono riletto due volte."],
    f:["{Pre}. Lo hai scritto tu, {fa}. Adesso dici il contrario.",
       "Si decida: o {pre}, o quello che mi ha scritto adesso.",
       "Le due cose non stanno insieme."]
  },
  ignorata:{
    c:["Comunque non mi hai risposto: {dom}",
       "Non mi hai risposto. Te la rifaccio: {dom}",
       "Prima di tutto il resto: {dom}"],
    f:["Non ha risposto. {dom}",
       "Resta la domanda: {dom}",
       "{Dom} Questa prima."]
  },
  rinuncia:{
    c:["Niente. Lascia stare, non me lo dire.|Va bene, non rispondere. Me lo tengo.|Ho capito che non me lo vuoi dire."],
    f:["Lasci stare.|Va bene. Non risponda.|Ho capito."]
  },
  ripetuto:{
    c:["Me lo hai già chiesto {fa}.",
       "È la seconda volta che me lo chiedi stanotte. Ti sei dimenticato cosa ti ho risposto?",
       "Questa domanda me l'hai già fatta. Non è che non vuoi la mia risposta, vuoi un'altra risposta."],
    f:["Già chiesto.|Me lo ha già chiesto.",
       "Le ripeto quello che le ho detto prima.",
       "Ancora questa."]
  },
  richiamo:{
    c:["Mi hai detto che {fatto}, {fa}. Non me lo sono dimenticata.",
       "Stavo pensando a una cosa che mi hai scritto: {fatto}.",
       "Prima mi hai scritto che {fatto}. È per quello che non riesco a stare tranquilla."],
    f:["Mi avevi detto che {fatto}.",
       "{Fatto}. Lo ha scritto lei, {fa}.",
       "Prima dicevi che {fatto}."]
  },
  eco:{
    c:["\"{eco}\". Hai scritto questo {fa}. Lo sto ancora guardando.",
       "Ho riletto quello che mi hai mandato: \"{eco}\".",
       "Continuo a rileggere \"{eco}\" e non mi piace."],
    f:["\"{eco}\". Le sue parole.",
       "Ho qui scritto: \"{eco}\".",
       "\"{eco}\". Questo l'ha scritto lei."]
  },
  filo:{
    c:["Stiamo girando intorno alla stessa cosa da un po'.",
       "Sempre lì torniamo, vero.",
       "Tu vuoi parlare solo di questo stanotte."],
    f:["Sempre lo stesso argomento.",
       "Gira sempre intorno a questo.",
       "Torniamo sempre lì."]
  },
  nome:{
    c:["{nome}. Ti chiamo per nome perché voglio che mi ascolti.",
       "{nome}, guardami mentre scrivi.",
       "{nome}. Fermati un secondo."],
    f:["{nome}.","{nome}, mi ascolti."]
  },
  gossip:{
    c:["Ho parlato con {chi}. Mi ha detto che le hai scritto delle cose brutte.",
       "{chi} mi ha chiamata piangendo per quello che le hai scritto.",
       "Lo sa anche {chi}, ormai. Me lo ha detto stanotte."],
    f:["{chi} mi ha detto cosa le hai scritto.",
       "Girano già. {chi} ha parlato."]
  },
  conteggio:{
    c:["È la {n}ª volta stanotte che mi parli di questo.",
       "Tre volte. Hai tirato fuori questa cosa tre volte."],
    f:["Terza volta.","Ancora."]
  }
};

function tono(c){ return (c.tratti && c.tratti.calore>0.55) ? 'c' : 'f'; }
function maiusc(s){ return s? s.charAt(0).toUpperCase()+s.slice(1) : s; }

/* ============ registrazione di un turno ============ */
M.registra=function(c,m,a){
  var s=TV.state;

  /* --- il diario di quello che hai scritto --- */
  m.log.push({
    t:s.t, testo:a.raw, top:a.top||null,
    arg:(a.argomenti||[]).slice(0,2), sent:a.sentiment, dom:!!a.domanda
  });
  if(m.log.length>16) m.log.shift();

  /* --- i fatti: nuovi, aggiornati, o in contraddizione --- */
  m.nuovi=[]; m.contraddetto=null;
  for(var k in a.fatti){
    var v=a.fatti[k], pre=m.fatti[k];
    if(pre===undefined){
      m.fatti[k]=v; m.quando=m.quando||{}; m.quando[k]=s.t; m.nuovi.push(k);
    } else if(String(pre)!==String(v)){
      if(FISSI[k] && !m.contraddetto){
        m.contraddizioni++;
        m.contraddetto={k:k, pre:pre, ora:v, t:(m.quando&&m.quando[k])||s.t};
      }
      m.fatti[k]=v; m.quando=m.quando||{}; m.quando[k]=s.t;
    }
  }

  /* --- il filo del discorso: su cosa stiamo insistendo --- */
  (a.argomenti||[]).forEach(function(x){ m.visti[x]=(m.visti[x]||0)+1; });
  var arg=(a.argomenti&&a.argomenti[0])||null;
  if(arg){
    if(m.filo && m.filo.arg===arg) m.filo.n++;
    else m.filo={arg:arg, n:1};
  } else if(a.follow && m.filo){
    m.filo.n++;
  } else if(m.filo){
    m.filo.n--; if(m.filo.n<=0) m.filo=null;
  }
  return m;
};

/* ============ me lo hai già chiesto? ============ */
M.giaChiesto=function(m,a){
  if(!a.domanda || !a.top) return null;
  for(var i=m.log.length-2;i>=0;i--){
    var L=m.log[i];
    if(L.dom && L.top===a.top && (TV.state.t-L.t)>12) return L;
  }
  return null;
};

/* ============ una frase tua, da rimandarti indietro ============ */
function ecoDa(m){
  for(var i=m.log.length-2;i>=0;i--){
    var L=m.log[i], t=String(L.testo||'').trim();
    if(t.length>=12 && t.length<=58 && (TV.state.t-L.t)>25) return L;
  }
  return null;
}

/* ============ un fatto che vale la pena ricordarti ============ */
function fattoDa(m){
  var ok=[];
  for(var k in m.fatti){
    if(!FATTO[k]) continue;
    var q=(m.quando&&m.quando[k])||0;
    if(TV.state.t-q < 20) continue;            // non quello appena detto
    if(m.ricordati && m.ricordati[k]) continue; // non due volte
    ok.push(k);
  }
  if(!ok.length) return null;
  var key=U.pick(ok);
  return {k:key, v:m.fatti[key], t:(m.quando&&m.quando[key])||0};
}

/* ============ il richiamo ============
   restituisce una riga che dimostra di ricordarsi di te, o niente. */
M.callback=function(c,m,a){
  var tn=tono(c), s=TV.state;
  function riga(kind,ctx){
    var bank=CB[kind]; if(!bank) return null;
    var gruppo=U.pick(bank[tn]||bank.c||[]);
    if(!gruppo) return null;
    return U.fill(U.v(gruppo), ctx||{});
  }

  /* 1. ti ho beccato in contraddizione */
  if(m.contraddetto && m.turni>1){
    var cd=m.contraddetto, pre=M.inParole(cd.k, cd.pre);
    m.contraddetto=null;
    if(pre) return {t:riga('contraddizione',{pre:pre, Pre:maiusc(pre), fa:M.fa(cd.t)}), peso:3};
  }

  /* 2. mi hai lasciato cadere una domanda: insiste due volte, poi rinuncia */
  if(m.domandaAperta && m.insistenze>=1 && !a.conferma && !a.diniego &&
     (m.turni-(m.ultimaInsistenza||-9))>=2){
    var dom=String(m.domandaAperta);
    var domL=dom.charAt(0).toLowerCase()+dom.slice(1);
    m.insistenze=0; m.ultimaInsistenza=m.turni;
    if((m.insistito||0)>=2){
      m.insistito=0; m.domandaAperta=null; m.domandaKey=null;
      return {t:riga('rinuncia',{}), peso:2};
    }
    m.insistito=(m.insistito||0)+1;
    return {t:riga('ignorata',{dom:domL, Dom:dom}), peso:3, tieni:true};
  }

  /* 3. me lo hai già chiesto */
  var gc=M.giaChiesto(m,a);
  if(gc && U.chance(0.75)) return {t:riga('ripetuto',{fa:M.fa(gc.t)}), peso:2};

  /* 4. una tua parola che mi è rimasta addosso (più la notte peggiora, più capita) */
  if(m.turni>3 && U.chance(0.10+s.paura*0.30)){
    var e=ecoDa(m);
    if(e) return {t:riga('eco',{eco:String(e.testo).replace(/"/g,'').trim(), fa:M.fa(e.t)}), peso:2};
  }

  /* 5. un fatto che mi hai raccontato prima */
  if(m.turni>2 && U.chance(0.26)){
    var f=fattoDa(m);
    if(f){
      var txt=M.inParole(f.k,f.v);
      if(txt){
        m.ricordati=m.ricordati||{}; m.ricordati[f.k]=1;
        return {t:riga('richiamo',{fatto:txt, Fatto:maiusc(txt), fa:M.fa(f.t)}), peso:2};
      }
    }
  }

  /* 6. quello che gira in famiglia */
  if(s.gossip && s.gossip.length && (c.tratti.moralita||0)>0.5 && U.chance(0.18)){
    for(var i=s.gossip.length-1;i>=0;i--){
      var g=s.gossip[i];
      if(g.da===c.id || (m.sentito&&m.sentito[g.da])) continue;
      if(s.t-g.t < 25) continue;
      var altro=TV.People && TV.People.get? TV.People.get(g.da):null;
      m.sentito=m.sentito||{}; m.sentito[g.da]=1;
      if(altro) return {t:riga('gossip',{chi:altro.nome}), peso:3};
    }
  }

  /* 7. stiamo girando intorno alla stessa cosa */
  if(m.filo && m.filo.n>=4 && U.chance(0.4)){
    m.filo.n=1;
    return {t:riga('filo',{}), peso:1};
  }

  /* 8. il tuo nome, quando serve farsi ascoltare */
  if(m.fatti.nome && !m.nomeUsato && m.turni>2 && (a.intents.insulto||a.intents.minaccia||a.crimine.sev>=3)){
    m.nomeUsato=1;
    return {t:riga('nome',{nome:maiusc(m.fatti.nome)}), peso:3};
  }
  return null;
};

/* ============ hai risposto alla mia domanda ============ */
M.rispostaChiusa=function(c,m,a){
  var key=m.domandaKey, si=a.conferma && !a.diniego;
  /* se nel testo hai risposto a un'altra cosa, vale quella:
     "no, non ho mangiato" parla di cibo anche se la domanda era sulla porta */
  for(var fk in a.fatti){
    if(fk.indexOf('r_')!==0) continue;
    key=fk.slice(2); si=(a.fatti[fk]==='si');
    break;
  }
  m.domandaAperta=null; m.domandaKey=null; m.qAttesa=0; m.insistenze=0;
  if(key){
    m.fatti['r_'+key]=si?'si':'no';
    m.quando=m.quando||{}; m.quando['r_'+key]=TV.state.t;
    var b=RISP[key];
    if(b){
      var ramo=b[si?'si':'no']; if(ramo){
        var g=ramo[tono(c)]||ramo.c;
        if(g && g.length) return U.pick(g);
      }
    }
  }
  return null;
};

/* ============ una cosa detta da te gira in famiglia ============ */
M.diffondi=function(id,tipo){
  var s=TV.state;
  s.gossip=s.gossip||[];
  s.gossip.push({da:id, tipo:tipo, t:s.t});
  if(s.gossip.length>6) s.gossip.shift();
};

/* ============ sommario, per i finali e per il debug ============ */
M.sommario=function(id){
  var m=TV.state.persone[id]; if(!m) return null;
  var f=[]; for(var k in m.fatti){ var p=M.inParole(k,m.fatti[k]); if(p) f.push(p); }
  return {turni:m.turni, affinita:Math.round(m.affinita), umore:m.umore,
          contraddizioni:m.contraddizioni, fatti:f, filo:m.filo? m.filo.arg:null};
};
})(typeof window!=='undefined'?window:globalThis);

/* nlu.js — comprensione del testo italiano scritto dal giocatore.
   Niente server: lessici pesati, prefissi, negazioni, ipotetiche, estrazione fatti. */
(function(root){
var TV = root.TV = root.TV || {};
var N = TV.NLU = {};

var ACC={'à':'a','á':'a','â':'a','è':'e','é':'e','ê':'e','ì':'i','í':'i','î':'i',
         'ò':'o','ó':'o','ô':'o','ù':'u','ú':'u','û':'u','ç':'c','ñ':'n'};

N.norm=function(s){
  s=String(s==null?'':s).toLowerCase();
  s=s.replace(/[àáâèéêìíîòóôùúûçñ]/g,function(c){return ACC[c]||c;});
  s=s.replace(/['`’]/g,' ');                 // l'ho -> l ho
  s=s.replace(/[,;:.]+/g,' # ');               // confine di frase
  s=s.replace(/[^a-z0-9?!# ]+/g,' ');
  s=s.replace(/([?!]+)/g,' $1 ');              // la punteggiatura non si incolla alle parole
  return s.replace(/\s+/g,' ').trim();
};
N.tok=function(n){ return n? n.split(' ').filter(Boolean):[]; };

/* ---------- costruzione lessico ----------
   "parola:3 pref*:2 altra"  → peso 1 se non indicato, * = prefisso           */
function L(words,phrases){
  var o={w:{},p:[],ph:[]};
  (words||'').split(/\s+/).filter(Boolean).forEach(function(tk){
    var m=tk.split(':'), t=m[0], wt=m[1]?parseFloat(m[1]):1;
    if(t.slice(-1)==='*') o.p.push([t.slice(0,-1),wt]);
    else o.w[t]=wt;
  });
  (phrases||[]).forEach(function(p){
    if(typeof p==='string') o.ph.push([N.norm(p),1.6]);
    else o.ph.push([N.norm(p[0]),p[1]]);
  });
  return o;
}

/* match con posizioni, per gestire negazione */
function match(toks,norm,lex){
  var hits=[],i,j;
  for(i=0;i<toks.length;i++){
    var t=toks[i];
    if(lex.w[t]!=null){ hits.push({t:t,i:i,w:lex.w[t]}); continue; }
    for(j=0;j<lex.p.length;j++){
      if(t.length>=lex.p[j][0].length && t.indexOf(lex.p[j][0])===0){
        hits.push({t:t,i:i,w:lex.p[j][1]}); break;
      }
    }
  }
  var padded=' '+norm+' ';
  for(i=0;i<lex.ph.length;i++){
    var ph=lex.ph[i][0]; if(!ph) continue;
    var pos=padded.indexOf(' '+ph+' ');
    if(pos<0){ pos=norm.indexOf(ph); if(pos<0) continue; }
    var ti=(norm.slice(0,pos).match(/ /g)||[]).length;   // indice del token iniziale
    hits.push({t:ph,i:ti,w:lex.ph[i][1],phrase:true});
  }
  return hits;
}
var NEG={'non':3,'mai':3,'senza':3,'nemmeno':2,'neanche':2,'nessuno':1,'nessun':1,'niente':1,'nulla':1};
function negatedAt(toks,i){
  if(i<0) return false;
  for(var k=i-1;k>=Math.max(0,i-3);k--){
    var tk=toks[k];
    if(tk==='#'||tk.charAt(0)==='?'||tk.charAt(0)==='!') return false;  // ne' la virgola ne' il punto
    var w=NEG[toks[k]];
    if(w && (i-k)<=w) return true;
  }
  return false;
}
function sum(hits){var s=0;for(var i=0;i<hits.length;i++)s+=hits[i].w;return s;}

/* ---------- lessici degli intenti ---------- */
var IN={
saluto:L('ciao salve buongiorno buonasera buondi ehi hey pronto',
  ['ci sei','sei li','sei sveglio','sei sveglia','mi senti']),
addio:L('addio arrivederci buonanotte notte ciao:0.3 dormo:1.4',
  ['ci vediamo','vado a dormire','devo andare','a domani','ti saluto','spengo tutto','vado via']),
come_stai:L('',['come stai','come state','come va','tutto bene','stai bene','state bene','come ti senti','che fai','cosa fai','come butta']),
stato_mio:L('stanco stanca sveglio insonnia sto:0.6 sento:0.6 male:0.8 solo:1 soletto',
  ['sto bene','sto male','non sto bene','non riesco a dormire','non dormo','sono stanco','sono stanca','mi sento strano','mi sento male','mi sento solo','sono solo','non ce la faccio','sto impazzendo','sto perdendo la testa']),
aiuto:L('aiuto aiutami aiutatemi soccorso',
  ['ho bisogno di te','ho bisogno di aiuto','non so cosa fare','puoi aiutarmi','mi aiuti','vieni a prendermi','vieni qui','portami via','chiama qualcuno','chiama la polizia']),
chiedi_soldi:L('prestami prestami soldi:0.5 euro:0.5',
  ['mi presti','mi servono soldi','mi puoi mandare','mi mandi dei soldi','fammi un bonifico','non ho una lira','sono senza soldi']),
offri_soldi:L('',['ti mando dei soldi','ti presto','ti do dei soldi','ti aiuto io','pago io','ti faccio un bonifico','ho fatto soldi','ho guadagnato']),
amore:L('abbraccio abbraccio* bacio baci voglio:0.4 bene:0.4',
  ['ti voglio bene','vi voglio bene','ti amo','mi manchi','ti penso','sei importante','grazie di esistere',
   'ti abbraccio','mi manchi tanto','mi vuoi bene','vuoi bene','ci tengo a te','tengo a te','importante per me',
   'mi sei mancato','mi sei mancata','sei tutto','non ti lascio']),
flirt:L('carina bella bellissima simpatica',
  ['mi piaci','sei carina','sei bella','usciamo','ti va un caffe','andiamo a cena','ci vediamo domani','un appuntamento','bere qualcosa','ti porto fuori','possiamo vederci']),
insulto:L('stupid* idiot* cretin* scem* imbecill* vaffa vaffanculo merda stronz* bastard* coglion* schifos* zitt* taci muori crepa odio:1.4',
  ['stai zitto','stai zitta','non vali niente','ti odio','fai schifo','non me ne frega','non mi interessi','chi se ne frega']),
minaccia:L('',['ti ammazzo','ti uccido','ti vengo a prendere','ti faccio male','sai dove abiti','ti spacco','ti brucio','stai attento','state attenti','ti faccio pentire','ti rovino','la pagherai','so dove vivi']),
scusa:L('scusa scusami scusatemi perdonami perdono',
  ['mi dispiace','ho sbagliato','non volevo','non intendevo','perdonami','chiedo scusa']),
ringrazia:L('grazie ringrazio',['ti ringrazio','sei gentile','grazie mille','meno male']),
nega:L('',['non e vero','non ho fatto niente','non sono stato io','ti sbagli','non c entro','non so di cosa parli','non ho fatto nulla','stai scherzando','e una bugia','non e come pensi']),
verita:L('giuro confesso davvero',['e tutto vero','ti dico la verita','sul serio','e la verita','sono stato io','l ho fatto io','ti devo dire una cosa']),
domanda_fratello:L('matteo',['mio fratello','tuo fratello','di matteo','cosa gli e successo','com e morto','dov e matteo','ti ricordi matteo','parlami di matteo','conoscevi matteo']),
domanda_mail:L('mail email messaggio sconosciuto',
  ['tutto e vero','chi mi scrive','numero sconosciuto','ho ricevuto una mail','mi ha scritto uno','non so chi sia','che significa']),
paura:L('paura spavent* terror* incubo incubi',
  ['ho paura','mi fa paura','c e qualcuno','qualcuno mi guarda','sento dei rumori','sento dei passi','alla finestra','fuori dalla finestra','mi sta guardando','ho visto qualcuno','non sono solo in casa','ho visto una faccia','ho visto un uomo']),
invito:L('',['vieni qui','passa da me','vieni a casa','posso venire','vieni a trovarmi','dormi qui','resta con me']),
domanda_generica:L('chi cosa come quando dove perche quanto quale sai hai puoi vuoi',[]),
/* leve di persuasione, usate con l ispettore */
lusinga:L('bravo capace onesto giusto professionale rispetto stimo intelligente',
  ['lei e un uomo giusto','lei capisce','mi fido di lei','ha ragione','e il migliore','so che e onesto','lei non e come gli altri']),
dubbio:L('',['nessuno ha visto','non ci sono prove','le prove sono deboli','e solo un sospetto','potrebbe essere stato','siete sicuri','e un caso','state sbagliando persona','puo essere chiunque','non avete niente']),
empatia:L('',['capisco il suo lavoro','dev essere difficile','anche lei ha una famiglia','so che e stanco','non le invidio','lo capisco','deve essere duro','mi dispiace per lei','anche lei ha dei figli']),
colpa:L('innocente',['sta sbagliando','rovinera un innocente','errore giudiziario','vuole distruggermi','non ho fatto niente di male','pensi a mia madre','e colpa vostra']),
corrompi:L('busta tangente',['quanto vuole','posso pagare','ci mettiamo d accordo','facciamo un accordo','le conviene','ho dei soldi per lei','nessuno lo sapra']),
confessa_tutto:L('',['confesso tutto','mi arrendo','vengo io','dico tutto','mi consegno','sono colpevole'])
};

/* ---------- argomenti ---------- */
var TOP={
fratello:L('matteo fratello',[]),
madre:L('mamma madre',[]),
padre:L('papa padre babbo',[]),
sorella:L('chiara sorella',[]),
nonna:L('nonna pina',[]),
finestra:L('finestra finestre vetro tenda tende',['di fronte','dall altra parte']),
vicino:L('vicino vicini bevilacqua palazzina citofono',[]),
polizia:L('polizia carabinieri poliziotti ispettore agente denuncia volante sirene',[]),
soldi:L('soldi euro stipendio affitto bolletta debito debiti banca bonifico lavoro:0.5',[]),
lavoro:L('lavoro ufficio capo turno licenziat* disoccupat*',[]),
salute:L('malato malata dottore medico ospedale analisi esami sangue:0.4 cancro tumore dolore cura',[]),
sonno:L('dormire sonno insonnia sveglio notte incubo letto',[]),
cibo:L('mangiato mangiare cena fame pasta pane frigo',[]),
fede:L('dio madonna chiesa preghiera pregat* santo anima inferno purgatorio',[]),
morte:L('morto morta morte funerale cimitero tomba lapide',[]),
passato:L('ricordo ricordi ricordate bambini estate fotografia foto allora',[]),
casa:L('casa stanza camera porta corridoio scale cantina soffitta',[]),
internet:L('internet rete sito forum computer schermo pc tastiera',[]),
pioggia:L('pioggia piove temporale vento freddo buio luce lampadina',[])
};

/* ---------- crimini ---------- */
var CRIME=[
 {kind:'omicidio',sev:5,lex:L('uccis* uccid* ammazz* omicidi* strangol* accoltell* soffocat*',
   ['ho sparato','l ho fatto a pezzi','non respirava piu','era morto quando','ho ucciso','e morto per colpa mia','l ho ammazzato'])},
 {kind:'occultamento',sev:5,lex:L('cadaver* seppellit* seppellir* sotterrat* sotterrar*',
   ['il corpo','ho nascosto il corpo','in cantina','nel bosco','sotto il pavimento','nel congelatore','ho pulito il sangue'])},
 {kind:'arma',sev:4,lex:L('pistola fucile coltello lama arma armi proiettil* munizion*',['ho una pistola','ho un coltello','ho preso l arma'])},
 {kind:'violenza',sev:4,lex:L('picchiat* pestat* massacrat* violent* stupr*',['l ho picchiato','l ho menato','gli ho spaccato'])},
 {kind:'estorsione',sev:4,lex:L('ricatt* estors* sequestrat* rapit*',['lo ricatto','gli ho chiesto soldi per','tengo chiuso','l ho legato'])},
 {kind:'incendio',sev:4,lex:L('incendi* bruciat* benzina',['ho dato fuoco','ho bruciato tutto'])},
 {kind:'furto',sev:3,lex:L('rubat* rubare furt* svaligiat* scassinat* borseggi*',['ho rubato','ho svuotato la cassa','ho preso i soldi di'])},
 {kind:'droga',sev:3,lex:L('droga spacci* spacciar* cocaina eroina pasticche hashish',['vendo roba','giro la roba'])},
 {kind:'frode',sev:3,lex:L('truffa* truffat* riciclagg* ricicl* clonat* falsificat* evasion*',['ho truffato','soldi sporchi','conti falsi','fatture false'])},
 {kind:'corruzione',sev:3,lex:L('corromp* corrott* tangent*',['ho pagato un agente','gli ho dato una busta','comprare il giudice'])},
 {kind:'insabbiamento',sev:3,lex:L('alibi',
   ['far sparire le prove','cancellare le prove','ho bruciato le prove','ho cancellato tutto','ho pulito tutto','il testimone deve sparire','nessuno deve sapere','ho nascosto le prove','devo farla sparire'])},
 {kind:'minacce',sev:2,lex:L('pedinat* spiat* seguit*',['lo seguo','so dove abita','gli ho fatto paura'])}
];

var POS=L('bene bello bella felice contento serena sereno tranquillo meglio speranza speriamo grazie amore sole dolce calma salvo bravo',[]);
var NEG_=L('male brutto brutta paura morto sangue triste solo buio freddo odio sbagliato perso rotto vuoto urlo dolore marcio schifo disperato',[]);
var POL=L('favore grazie scusa gentile prego cortesia',['per favore','ti prego','per piacere','se puoi']);
var HYP=L('scherzo ipotesi immagina immaginiamo finta',['per scherzo','sto scherzando','era una battuta','facciamo finta','e un ipotesi','nel film','in un film','in un gioco','e un sogno','ho sognato']);

/* ---------- estrazione fatti ---------- */
function facts(n){
  var f={},m;
  if((m=n.match(/\bmi chiamo ([a-z]{2,16})\b/))) f.nome=m[1];
  if((m=n.match(/\bho paura (?:di|del|della|dei|delle|dello) ([a-z ]{2,28})/))) f.paura_di=m[1].trim();
  var STOP={'#':1,nessuno:1,niente:1,nulla:1,mai:1,e:1,ed:1,ma:1,poi:1,che:1,perche:1,quando:1,se:1,ho:1,io:1,
            in:1,a:1,al:1,su:1,sul:1,con:1,per:1,sotto:1,dentro:1,nel:1,nella:1,dal:1,da:1,di:1,non:1,gli:1,le:1};
  function obj(re){
    var mm=n.match(re); if(!mm) return null;
    var w=mm[1].trim().split(' '), out=[];
    for(var i=0;i<w.length && out.length<2;i++){ if(!w[i]||STOP[w[i]]) break; out.push(w[i]); }
    return out.length?out.join(' '):null;
  }
  if(!/\bnon ho (?:ucciso|ammazzato)/.test(n)) f.vittima=obj(/\bho (?:ucciso|ammazzato|uccisa) (?:il |lo |la |un |una |l )?([a-z ]{2,24})/)||undefined;
  if(!/\bnon ho (?:rubato|preso)/.test(n)) f.rubato=obj(/\bho (?:rubato|preso) (?:il |lo |la |dei |delle |un |una |l )?([a-z ]{2,24})/)||undefined;
  if(!/\bnon ho nascosto/.test(n)) f.nascosto=obj(/\bho nascosto (?:il |lo |la |un |una |l )?([a-z ]{2,24})/)||undefined;
  if(f.vittima===undefined) delete f.vittima;
  if(f.rubato===undefined) delete f.rubato;
  if(f.nascosto===undefined) delete f.nascosto;
  if((m=n.match(/\bsto (bene|male|peggio|meglio)\b/))) f.stato=m[1];
  if(/\bnon riesco a dormire\b|\bnon dormo\b|\binsonnia\b/.test(n)) f.insonnia=true;
  if(/\bsono malat[oa]\b|\bsto morendo\b/.test(n)) f.malato=true;
  if(/\bsono solo\b|\bmi sento solo\b/.test(n)) f.solitudine=true;
  if(/\bti amo\b|\bmi piaci\b/.test(n)) f.dichiarazione=true;
  if(/\bho visto (?:un uomo|una faccia|qualcuno|un ombra)\b/.test(n)) f.visto=true;
  return f;
}

/* ---------- analisi ---------- */
N.analyze=function(raw){
  var r=String(raw==null?'':raw);
  var n=N.norm(r), t=N.tok(n);
  var a={
    raw:r, norm:n, toks:t, len:t.length,
    vuoto:!n,
    domanda:/\?/.test(r)||/^(chi |cosa |che cosa|come |quando |dove |perche |quanto |quale |sei |hai |stai |puoi |vuoi |mi aiut|ci sei)/.test(n),
    urlo:(r.replace(/[^A-Z]/g,'').length>4 && r.replace(/[^A-Za-z]/g,'').length>0 &&
          r.replace(/[^A-Z]/g,'').length/Math.max(1,r.replace(/[^A-Za-z]/g,'').length)>0.6) || /!{2,}/.test(r),
    intents:{}, top:null, topScore:0, argomenti:[], fatti:facts(n)
  };

  var dampen = 1/(1+0.06*Math.max(0,t.length-7));
  for(var k in IN){
    var h=match(t,n,IN[k]), s=0;
    for(var i=0;i<h.length;i++){
      var neg=negatedAt(t,h[i].i);
      s += neg ? -h[i].w*0.6 : h[i].w;
    }
    s*=dampen;
    if(k==='domanda_generica') s*=0.35;
    if(s>0.35){ a.intents[k]=Math.round(s*100)/100; if(s>a.topScore){a.topScore=s;a.top=k;} }
  }

  var sp=sum(match(t,n,POS)), sn=sum(match(t,n,NEG_));
  a.sentiment=TV.U.clamp((sp-sn)/Math.max(2,(sp+sn)),-1,1);
  if(sp+sn===0) a.sentiment=0;
  a.cortesia=sum(match(t,n,POL));
  a.ipotetico=sum(match(t,n,HYP))>0;
  a.affetto=(a.intents.amore||0)+(a.intents.flirt||0)*0.7;
  a.aggressione=(a.intents.insulto||0)*1.2+(a.intents.minaccia||0)*2.2+(a.urlo?0.6:0);

  for(var tk in TOP){
    var th=match(t,n,TOP[tk]);
    if(sum(th)>0.5) a.argomenti.push(tk);
  }

  /* crimini */
  var cr={sev:0,kinds:[],hits:0,negato:false,confessato:false};
  for(var c=0;c<CRIME.length;c++){
    var ch=match(t,n,CRIME[c].lex);
    if(!ch.length) continue;
    var anyPos=false,anyNeg=false;
    for(var q=0;q<ch.length;q++){ if(negatedAt(t,ch[q].i)) anyNeg=true; else anyPos=true; }
    if(anyPos){
      cr.hits++; cr.kinds.push(CRIME[c].kind);
      cr.sev=Math.max(cr.sev,CRIME[c].sev);
    } else if(anyNeg){ cr.negato=true; }
  }
  var passato=/\b(ho|l ho|le ho|li ho|gli ho|abbiamo|avevo|sono stato|sono stata|e stato colpa mia)\b/.test(n)
             && !/\bnon (ho|l ho|abbiamo|sono stato|sono stata)\b/.test(n);
  cr.confessato = (cr.hits>0 && passato && !a.domanda && !a.ipotetico)
    || /(^|[.,; ])(sono stato io|l ho fatto io|l ho fatta io|confesso|sono colpevole|mi consegno)\b/.test(n);
  // "ti ammazzo" e' una minaccia, non un cadavere in cantina
  if(cr.hits>0 && !passato && (a.intents.minaccia>0.5 || /\b(ti|vi|lo|la|li|le) (ammazz|uccid|spacc|brucio|rovino)/.test(n))){
    cr.sev=Math.min(cr.sev,2); cr.kinds=['minacce']; cr.confessato=false; cr.futuro=true;
  }
  if(a.domanda) cr.sev*=0.5;
  if(a.ipotetico) cr.sev*=0.35;
  if(cr.negato && cr.hits===0) cr.sev=0;
  cr.sev=Math.round(cr.sev*100)/100;
  a.crimine=cr;

  a.conferma=/^(si|sisi|certo|ok|okay|va bene|gia|esatto|vero|confermo|assolutamente|credo di si)\b/.test(n)
            || /\b(si ho|ho mangiato|ho chiuso|le ho chiuse|l ho chiusa|ho dormito|sono solo|sono in casa|sono qui)\b/.test(n);
  a.diniego=/^(no|nope|nemmeno|neanche|per niente|non ancora|mai)\b/.test(n)
            || /\b(non ho mangiato|non ho chiuso|non ho dormito|non sono solo|non ancora)\b/.test(n);

  /* leve di persuasione normalizzate */
  a.leve={
    lusinga:a.intents.lusinga||0, dubbio:a.intents.dubbio||0, empatia:a.intents.empatia||0,
    colpa:a.intents.colpa||0, corrompi:a.intents.corrompi||0,
    minaccia:a.intents.minaccia||0, confessa:a.intents.confessa_tutto||0
  };
  return a;
};

/* quanto il testo somiglia a una risposta sensata (anti-tastiera a caso) */
N.sensato=function(a){
  if(a.vuoto) return 0;
  if(a.len===1 && a.toks[0].length>14) return 0;
  var voc=(a.norm.match(/[aeiou]/g)||[]).length/Math.max(1,a.norm.replace(/ /g,'').length);
  if(voc<0.18) return 0.1;
  return a.top?1:0.6;
};
})(typeof window!=='undefined'?window:globalThis);

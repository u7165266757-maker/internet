/* police.js — l'indagine, le prove, l'ispettore e la manipolazione */
(function(root){
var TV = root.TV = root.TV || {};
var U=TV.U, OS=TV.OS, N=TV.NLU;
var PL = TV.Police = {};

var CATALOGO={
 omicidio:[
  {nome:'Tracce biologiche sul corpo', desc:'Repertate dalla scientifica.', peso:22, costo:1400, tipo:'dna'},
  {nome:'Telecamera del civico 12', desc:'Inquadra il portone dalle 22:10.', peso:16, costo:900, tipo:'video'}],
 occultamento:[
  {nome:'Terra e calce sulle scarpe', desc:'Sequestrate in casa tua.', peso:14, costo:600, tipo:'oggetto'},
  {nome:'Segnalazione di rumori in cantina', desc:'Due condomini, verbalizzata.', peso:10, costo:500, tipo:'verbale'}],
 arma:[{nome:'Arma non rinvenuta', desc:'Risulta però l\'acquisto a tuo nome.', peso:12, costo:700, tipo:'oggetto'}],
 furto:[{nome:'Refurtiva tracciata', desc:'Numero di serie registrato.', peso:9, costo:400, tipo:'oggetto'}],
 droga:[{nome:'Intercettazione ambientale', desc:'Due minuti, voce compatibile.', peso:11, costo:800, tipo:'audio'}],
 frode:[{nome:'Movimento bancario senza causale', desc:'€ 2.500 in entrata alle 00:14.', peso:13, costo:1100, tipo:'banca'}],
 estorsione:[{nome:'Messaggi di richiesta denaro', desc:'Estratti dal server.', peso:12, costo:900, tipo:'chat'}],
 violenza:[{nome:'Referto del pronto soccorso', desc:'Compatibile con la dinamica.', peso:14, costo:900, tipo:'referto'}],
 incendio:[{nome:'Residui di accelerante', desc:'Analisi in corso.', peso:15, costo:1000, tipo:'dna'}],
 corruzione:[{nome:'Agente che ti ha incontrato', desc:'Ora è indagato anche lui.', peso:12, costo:1500, tipo:'testimone'}],
 minacce:[{nome:'Messaggi minatori ai familiari', desc:'Acquisiti dal gestore.', peso:8, costo:500, tipo:'chat'}],
 insabbiamento:[{nome:'Accessi a nodi non indicizzati', desc:'Log del provider, 00:0X.', peso:10, costo:1200, tipo:'log'}]
};

PL.prove=function(){
  var s=TV.state;
  if(!s.prove){
    s.prove={
      items:[], profiloVisto:false, alibi:null, successi:0, tentativi:0, ultimaLeva:null,
      profilo:{ orgoglio:U.rnd(0.6,1.0), stanchezza:U.rnd(0.7,1.0), dubbio:U.rnd(0.5,0.9) },
      leveUtili:function(){
        var p=s.prove.profilo, out=[];
        if(p.stanchezza>0.75) out.push('empatia');
        if(p.orgoglio>0.75) out.push('lusinga');
        if(p.dubbio>0.65) out.push('dubbio sulle prove');
        if(!out.length) out.push('empatia');
        return out;
      }
    };
  }
  return s.prove;
};

/* ogni crimine lascia qualcosa dietro */
TV.on('crimine',function(c){
  var pr=PL.prove(), lista=CATALOGO[c.tipo]||[];
  lista.forEach(function(x){
    if(pr.items.some(function(i){return i.nome===x.nome;})) return;
    if(U.chance(0.8)) pr.items.push({nome:x.nome,desc:x.desc,peso:x.peso,costo:x.costo,tipo:x.tipo,sparita:false});
  });
  TV.add('sospetto', 3+c.sev*1.6);
  if(c.sev>=3 && !TV.state.net.dark) TV.after(U.rnd(8,20), TV.Net.sbloccaDark, 'dark');
});

/* qualcuno ti ha denunciato */
TV.on('denuncia',function(d){
  TV.add('sospetto',20);
  OS.notify({t:'CHIAMATA IN USCITA RILEVATA', x:d.nome+' ha chiamato un numero di emergenza.', bad:true});
  TV.Mail.arriva({da:'Polizia di Stato — Valdina', ogg:'Convocazione urgente', bad:true,
    corpo:'<p>È tenuto a presentarsi domani alle ore 9:00 presso il Commissariato di Valdina.</p>'+
          '<p>Oggetto: dichiarazioni rese da un familiare in data odierna.</p>'});
  TV.World.evento('knock');
});

/* l'indagine cammina da sola */
PL.tick=function(){
  var s=TV.state;
  if(s.ended) return;
  var g=TV.gravita();
  if(g<=0) return;
  var pr=PL.prove();
  var attive=pr.items.filter(function(i){return !i.sparita;});
  var spinta = 0.5 + g*0.012 + attive.length*0.5;
  if(pr.alibi && pr.alibi.buono) spinta*=0.55;
  if(TV.flag('archiviata')) spinta=0;
  TV.add('sospetto', spinta);
  PL.soglie();
};

PL.soglie=function(){
  var s=TV.state;
  if(s.sospetto>=30 && !TV.flag('poliziaAperta')){
    TV.flag('poliziaAperta',true);
    TV.Chat.push('ispettore','them','Buonasera. Ispettore Grandi, Polizia di Stato. Abbiamo bisogno di parlare, e preferirei farlo adesso che a casa sua.');
    OS.notify({t:'NUOVO MESSAGGIO',x:'Isp. Grandi — Polizia di Stato',bad:true,go:'chat'});
    TV.Audio.sfx('bad');
  }
  if(s.sospetto>=58 && !TV.flag('sirene1')){
    TV.flag('sirene1',true);
    TV.Audio.sfx('siren',{dur:10});
    TV.World.evento('flicker');
    OS.notify({t:'FUORI',x:'Una sirena, lontana. Poi si spegne.',bad:true});
  }
  if(s.sospetto>=80 && !TV.flag('ultimatum')){
    TV.flag('ultimatum',true);
    TV.Chat.push('ispettore','them','Ultima volta che le scrivo da una tastiera. Resti dove è.');
    TV.World.evento('knock');
    OS.notify({t:'PORTA',x:'Hanno suonato al piano di sotto.',bad:true});
  }
  if(s.sospetto>=100 && !s.ended){
    TV.Endings.fuorilegge();
  }
};

/* ---------- la conversazione con l'ispettore ---------- */
var RISP={
 bene:[ "Mmh. Continui.|La ascolto.|Questo lo metto a verbale come collaborazione.",
        "Lei parla bene. Troppo bene, forse.|Va bene. Prendo nota.|Ha ragione su una cosa, almeno.",
        "Sono ventidue anni che faccio questo lavoro e stanotte sono stanco. Questo lo ha capito.",
        "Non le prometto niente. Ma non mando nessuno, per ora." ],
 male:[ "Non mi serve questo.|Ha appena peggiorato la sua posizione.|Attento a cosa scrive.",
        "Ogni parola che mi manda finisce negli atti.|Questo lo chiamiamo tentativo. E si aggrava.",
        "Si rende conto di cosa ha appena scritto?" ],
 neutro:[ "Dove si trovava fra le 22:40 e le 23:20?|Chi può confermarlo?|Mi risponda con precisione.",
          "Non mi interessa come si sente. Mi interessa dove era.|Continui." ],
 vinto:[ "Ho riletto gli atti. Ci sono due buchi grossi come una casa.|Ho chiesto l'archiviazione.",
         "Il fascicolo passa a Padova. Io vado a dormire.|Non si faccia trovare di nuovo sulla mia strada." ],
 perso:[ "Basta.|Abbiamo finito di scrivere." ]
};

PL.intercetta=function(id,testo){
  if(id!=='ispettore') return null;
  if(!TV.flag('poliziaAperta')) return {msgs:[], letto:'consegnato'};
  var pr=PL.prove(), a=N.analyze(testo), p=TV.People.persuasione(a);
  pr.tentativi++;
  var msgs=[], bank, acc=U.rnd(1.6,3.2);

  if(TV.flag('archiviata')){
    bank=U.pick(["Il caso è chiuso. Non mi scriva più.|Buonanotte."]);
  } else if(p.score>=2.2){
    pr.successi++;
    TV.add('sospetto', -(7+p.score*1.6));
    bank=U.pick(RISP.bene);
    if(!pr.profiloVisto) TV.add('sospetto',2);     // senza profilo, colpisci al buio
  } else if(p.score<=-3){
    TV.add('sospetto', 9+Math.abs(p.score)*1.1);
    bank=U.pick(RISP.male);
    if(a.leve.corrompi>0) TV.crimine('corruzione',3,'tentata corruzione via chat');
    if(a.leve.minaccia>0) TV.crimine('minacce',3,'minacce a pubblico ufficiale');
    if(a.leve.confessa>0 || (a.crimine.confessato&&a.crimine.sev>=3)){
      TV.add('sospetto',40);
      bank="Ho qui la sua confessione. Resti dove è.";
    }
  } else {
    TV.add('sospetto', 1.2);
    bank=U.pick(RISP.neutro);
  }

  if(pr.successi>=3 && !TV.flag('archiviata')){
    TV.flag('archiviata',true);
    TV.state.sospetto=Math.min(TV.state.sospetto, 14);
    bank=U.pick(RISP.vinto);
    TV.add('luce',4);
    OS.notify({t:'INDAGINE',x:'Richiesta di archiviazione depositata.'});
  }

  String(bank).split('|').filter(Boolean).slice(0,2).forEach(function(L){
    msgs.push({t:L, d:acc}); acc += 1.2+L.length*0.035;
  });
  PL.soglie();
  return {msgs:msgs, analisi:a, persuasione:p};
};
})(typeof window!=='undefined'?window:globalThis);

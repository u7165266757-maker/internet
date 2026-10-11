/* state.js — stato del gioco, contatori morali, bandierine */
(function(root){
var TV = root.TV = root.TV || {};
var U = TV.U;

function fresh(){
  return {
    t:0,                 // secondi di gioco
    mode:'room',         // 'room' | 'screen'
    booted:false,
    ended:null,

    luce:0,              // empatia / onestà / affetto
    buio:0,              // minacce, confessioni, crimini
    sospetto:0,          // quanto la polizia ti sta addosso
    soldi:180.00,

    crimini:[],          // {tipo, sev, testo, t}
    prove:null,          // creato da police.js quando nasce l'indagine
    flags:{},
    persone:{},          // memoria per personaggio
    mailLette:{},
    net:{ sbloccata:false, dark:false, visitate:{}, gigFatti:0, gigLivello:0 },
    chiamate:[],         // log tentativi
    gossip:[],           // cose tue che girano di bocca in bocca
    ultimoEvento:0,
    ultimaAzione:0,      // l'ultima volta che hai fatto qualcosa con qualcuno
    paura:0              // 0..1 derivato
  };
}

/* quanti soldi fanno finire la notte col finale dei soldi */
TV.SOGLIA_RICCO = 1000;
/* quanto dura la notte prima che arrivi l'alba (secondi di gioco) */
TV.DURATA_NOTTE = 1320;          // 22 minuti
/* quanto silenzio serve per il finale del silenzio */
TV.SILENZIO = 240;               // 4 minuti senza fare niente con nessuno
/* quanti complimenti a Giulia prima che prenda la macchina */
TV.COMPLIMENTI = 10;

TV.state = fresh();
TV.reset = function(){ TV.state = fresh(); };

TV.flag = function(k,v){
  var s=TV.state;
  if(v===undefined) return !!s.flags[k];
  var pre = s.flags[k];
  s.flags[k]=v;
  if(!pre && v) TV.emit('flag',k);
  return v;
};

TV.add = function(k,n){
  var s=TV.state;
  if(k==='soldi'){ s.soldi = Math.max(0, s.soldi+n); TV.emit('soldi',s.soldi); return s.soldi; }
  s[k] = U.clamp((s[k]||0)+n, 0, 100);
  TV.emit('meter',{k:k,v:s[k],d:n});
  return s[k];
};

TV.crimine = function(tipo,sev,testo){
  var s=TV.state;
  s.crimini.push({tipo:tipo,sev:sev,testo:testo||'',t:s.t});
  TV.add('buio', 4+sev*3.2);
  TV.emit('crimine',{tipo:tipo,sev:sev,testo:testo});
  return s.crimini.length;
};

TV.hasCrimine = function(tipo){
  return TV.state.crimini.some(function(c){return c.tipo===tipo;});
};
TV.gravita = function(){ // 0..100, la peggiore cosa fatta pesa più della quantità
  var s=TV.state, max=0, sum=0;
  s.crimini.forEach(function(c){ max=Math.max(max,c.sev); sum+=c.sev; });
  return U.clamp(max*14 + sum*2.5, 0, 100);
};

/* paura percepita: guida luci, suoni, glitch */
TV.updateFear = function(){
  var s=TV.state;
  var f = (s.buio*0.80 + s.sospetto*0.55 + TV.gravita()*0.35 - s.luce*0.40)/100;
  // la notte avanza: un po' di inquietudine arriva comunque
  f += Math.min(0.22, s.t/1400);
  if(s.flags.vistoVolto) f += 0.08;
  s.paura = U.clamp(f,0,1);
  return s.paura;
};

/* memoria di un personaggio */
TV.mem = function(id){
  var s=TV.state;
  if(!s.persone[id]){
    s.persone[id] = {
      id:id, affinita:0, umore:'calmo', turni:0, bloccato:false, spaventato:0,
      visti:{},            // argomenti già trattati, col conteggio
      fatti:{},            // cose che hai detto di te
      quando:{},           // quando le hai dette
      log:[],              // il diario degli ultimi scambi
      segreti:0,           // quanti segreti ti ha rivelato
      domandaAperta:null,  // ultima domanda che ti ha fatto
      domandaKey:null,     // di che cosa parlava quella domanda
      qAttesa:0, insistenze:0,
      filo:null,           // {arg,n} l'argomento su cui stiamo insistendo
      usate:{},            // righe già dette, per non ripetersi
      ordini:{}, cursori:{}, esauriti:{},
      nuovi:[], contraddetto:null, contraddizioni:0,
      ricordati:{}, sentito:{}, nomeUsato:0, ultimoBanco:null,
      ultimoIntento:null, ripetizioni:0, ultimoT:-999, scritto:false, haRisposto:0
    };
  }
  return s.persone[id];
};
})(typeof window!=='undefined'?window:globalThis);

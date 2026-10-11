/* casino.js — casinoverde.it: blackjack e poker a cinque carte.
   Si gioca coi soldi del conto. Il banco non bara, ma la notte prende comunque
   qualcosa: ogni mano aggiunge un po' di buio, vinta o persa. */
(function(root){
var TV = root.TV = root.TV || {};
var U=TV.U, OS=TV.OS, NET=TV.Net;
if(!NET || !NET.sito){ console.warn('casino: internet non pronto'); return; }
function h(s){ return U.esc(s); }

/* ---------------- carte ---------------- */
var SEMI=['♠','♥','♦','♣'];          // picche cuori quadri fiori
var NOMI={1:'A',11:'J',12:'Q',13:'K'};

function mazzo(){
  var d=[],s,v;
  for(s=0;s<4;s++) for(v=1;v<=13;v++) d.push({v:v,s:s});
  return U.shuffle(d);
}
function nome(c){ return (NOMI[c.v]||c.v)+SEMI[c.s]; }
function rossa(c){ return c.s===1 || c.s===2; }

function carta(c,opt){
  opt=opt||{};
  var cls='csn-c', st='';
  if(opt.anim){ cls+=' vieni'; st=' style="animation-delay:'+(opt.ritardo||0)+'ms"'; }
  if(opt.coperta) return '<span class="'+cls+' cop"'+st+'>⬛</span>';
  return '<span class="'+cls+(rossa(c)?' rossa':'')+(opt.tenuta?' tenuta':'')+'"'+
         (opt.idx!=null?' data-i="'+opt.idx+'"':'')+st+'>'+nome(c)+'</span>';
}
/* anima solo quello che è cambiato: tutta la fila su una mano nuova,
   la singola carta su una pescata. Così ridisegnare non rifà partire tutto. */
function fila(mano,opt){
  opt=opt||{};
  var a=opt.anima;
  return mano.map(function(c,i){
    var anim = a==='tutte' ||
               (a==='ultima' && i===mano.length-1) ||
               (a && a.indexOf && a!=='tutte' && a!=='ultima' && a.indexOf(i)>=0);
    return carta(c,{coperta:opt.copri&&i>=opt.copri, tenuta:opt.tenute&&opt.tenute[i], idx:i,
                    anim:anim, ritardo: a==='tutte'? i*95 : 0});
  }).join('');
}

/* ---------------- blackjack ---------------- */
function punti(mano){
  var tot=0, assi=0;
  mano.forEach(function(c){
    if(c.v===1){ assi++; tot+=11; }
    else tot += c.v>10? 10 : c.v;
  });
  while(tot>21 && assi>0){ tot-=10; assi--; }
  return tot;
}
function blackjack(mano){ return mano.length===2 && punti(mano)===21; }

/* ---------------- poker: cinque carte, una cambiata ---------------- */
var PREMI=[
  {n:'scala reale',   k:250},
  {n:'scala colore',  k:50},
  {n:'poker',         k:25},
  {n:'full',          k:9},
  {n:'colore',        k:6},
  {n:'scala',         k:4},
  {n:'tris',          k:3},
  {n:'doppia coppia', k:2},
  {n:'coppia alta',   k:1}
];
function valuta(mano){
  var semi=mano.map(function(c){return c.s;});
  var colore=semi.every(function(x){ return x===semi[0]; });
  var cont={}; mano.forEach(function(c){ cont[c.v]=(cont[c.v]||0)+1; });
  var chiavi=Object.keys(cont).map(Number).sort(function(a,b){return a-b;});
  var gruppi=chiavi.map(function(k){return cont[k];}).sort(function(a,b){return b-a;});
  var cinque=chiavi.length===5;
  var scala  = cinque && (chiavi[4]-chiavi[0]===4);
  var reale  = cinque && chiavi[0]===1 && chiavi[1]===10 && chiavi[4]===13;  // A 10 J Q K
  if(reale) scala=true;
  var coppiaAlta=false;
  chiavi.forEach(function(k){ if(cont[k]===2 && (k===1 || k>=11)) coppiaAlta=true; });

  if(colore && reale)            return PREMI[0];
  if(colore && scala)            return PREMI[1];
  if(gruppi[0]===4)              return PREMI[2];
  if(gruppi[0]===3&&gruppi[1]===2) return PREMI[3];
  if(colore)                     return PREMI[4];
  if(scala)                      return PREMI[5];
  if(gruppi[0]===3)              return PREMI[6];
  if(gruppi[0]===2&&gruppi[1]===2) return PREMI[7];
  if(coppiaAlta)                 return PREMI[8];
  return {n:'niente', k:0};
}
/* ---------------- roulette ----------------
   Ruota europea: un solo zero, trentasette caselle. Il vantaggio del banco
   è tutto lì dentro, nello zero: 2,7%. Niente doppio zero da casinò americano. */
var ROSSI=[1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
function colore(n){ return n===0? 'verde' : (ROSSI.indexOf(n)>=0? 'rosso':'nero'); }

var PUNTATE=[
  {id:'rosso',   et:'rosso',        k:1,  vince:function(n){ return colore(n)==='rosso'; }},
  {id:'nero',    et:'nero',         k:1,  vince:function(n){ return colore(n)==='nero'; }},
  {id:'pari',    et:'pari',         k:1,  vince:function(n){ return n!==0 && n%2===0; }},
  {id:'dispari', et:'dispari',      k:1,  vince:function(n){ return n%2===1; }},
  {id:'basso',   et:'1-18',         k:1,  vince:function(n){ return n>=1 && n<=18; }},
  {id:'alto',    et:'19-36',        k:1,  vince:function(n){ return n>=19 && n<=36; }},
  {id:'doz1',    et:'1ª dozzina',   k:2,  vince:function(n){ return n>=1 && n<=12; }},
  {id:'doz2',    et:'2ª dozzina',   k:2,  vince:function(n){ return n>=13 && n<=24; }},
  {id:'doz3',    et:'3ª dozzina',   k:2,  vince:function(n){ return n>=25 && n<=36; }},
  {id:'pieno',   et:'numero pieno', k:35, vince:function(n,sc){ return n===sc; }}
];
function tipoPuntata(id){
  for(var i=0;i<PUNTATE.length;i++) if(PUNTATE[i].id===id) return PUNTATE[i];
  return PUNTATE[0];
}
/* quanto si vince o si perde: lo zero porta via tutte le puntate esterne */
function vincitaRl(n, id, numero, puntata){
  var t=tipoPuntata(id);
  var ok = t.vince(n, numero);
  return Math.round((ok? puntata*t.k : -puntata)*100)/100;
}
function gira(){ return U.ri(0,36); }

/* ---------------- la mano di benvenuto ----------------
   Le prime due mani di ogni tavolo sono truccate a tuo favore: è quello che
   fanno le case vere, ti lasciano vincere perché poi resti. Dalla terza mano
   in avanti il mazzo è onesto e la matematica fa il suo lavoro. */
var BENVENUTO=2;
var MAX_BENVENUTO=50;      // oltre questa puntata il mazzo è onesto: la casa non regala grosso
function mazzoFortunato(){
  var m=mazzo(), i,j;
  for(i=m.length-1;i>=0;i--){
    for(j=i-1;j>=0;j--){
      var t=punti([m[i],m[j]]);
      if(t>=19 && t<=21){
        var a=m.splice(i,1)[0], b=m.splice(j,1)[0];
        m.push(a); m.push(b);           // le ultime due sono le tue
        return m;
      }
    }
  }
  return m;
}
function mazzoFortunatoPoker(){
  /* un tris servito: una coppia alta restituirebbe solo la puntata */
  var m=mazzo(), cont={}, i, scelto=null;
  for(i=0;i<m.length;i++){ cont[m[i].v]=(cont[m[i].v]||0)+1; }
  for(var v in cont) if(cont[v]>=3){ scelto=+v; break; }
  if(scelto===null) return m;
  var presi=[], resto=[], avanzo=null;
  for(i=0;i<m.length;i++){
    if(m[i].v===scelto){
      if(presi.length<3) presi.push(m[i]);
      else avanzo=m[i];                // la quarta uguale: lontana dalle tue mani
    } else resto.push(m[i]);
  }
  if(avanzo) resto.unshift(avanzo);    // in fondo al mazzo, non la peschi
  return resto.concat(presi);          // le ultime tre sono tue
}
TV.Casino=TV.Casino||{};

/* ---------------- le regole, separate dall'interfaccia ----------------
   così si possono collaudare senza aprire il gioco. */

/* blackjack: pesca per il banco e dice chi ha vinto */
function risolviBj(tu,banco,mazzo,puntata){
  var mio=punti(tu), netto, esito;
  if(mio>21) return {netto:-puntata, esito:'Sballato con '+mio+'. Perdi '+U.money(puntata)+'.'};
  while(punti(banco)<17) banco.push(mazzo.pop());
  var suo=punti(banco), bjMio=blackjack(tu), bjSuo=blackjack(banco);
  if(bjMio && !bjSuo){ netto=puntata*1.5; esito='BLACKJACK. Vinci '+U.money(netto)+'.'; }
  else if(bjSuo && !bjMio){ netto=-puntata; esito='Blackjack del banco. Perdi '+U.money(puntata)+'.'; }
  else if(suo>21){ netto=puntata; esito='Il banco sballa con '+suo+'. Vinci '+U.money(netto)+'.'; }
  else if(mio>suo){ netto=puntata; esito=mio+' contro '+suo+'. Vinci '+U.money(netto)+'.'; }
  else if(mio<suo){ netto=-puntata; esito=mio+' contro '+suo+'. Perdi '+U.money(puntata)+'.'; }
  else { netto=0; esito='Pari e patta a '+mio+'. Puntata restituita.'; }
  return {netto:Math.round(netto*100)/100, esito:esito};
}

/* poker: quanto paga la mano. La coppia alta restituisce la puntata. */
function premio(mano,puntata){
  var pr=valuta(mano);
  var netto = pr.k>0 ? puntata*pr.k - puntata : -puntata;
  if(pr.k===1) netto=0;
  return {nome:pr.n, k:pr.k, netto:Math.round(netto*100)/100};
}

/* servono ai collaudi */
TV.Casino={ punti:punti, valuta:valuta, mazzo:mazzo, PREMI:PREMI,
            risolviBj:risolviBj, premio:premio, blackjack:blackjack,
            mazzoFortunato:mazzoFortunato, mazzoFortunatoPoker:mazzoFortunatoPoker,
            BENVENUTO:BENVENUTO,
            colore:colore, PUNTATE:PUNTATE, vincitaRl:vincitaRl, gira:gira };

/* ---------------- stato del tavolo ---------------- */
function stato(){
  var n=TV.state.net;
  if(!n.casino) n.casino={
    puntata:25, mani:0, vinto:0, perso:0, filaPerse:0, credito:false,
    bj:{fase:'pronto'}, pk:{fase:'pronto'},
    rl:{tipo:'rosso', numero:7, ultimo:null, girando:false, storia:[]},
    msgBj:'', msgPk:'', msgRl:''
  };
  return n.casino;
}
function saldo(){ return TV.state.soldi; }

/* un solo movimento per mano: il conto resta leggibile */
function incassa(gioco,netto,g){
  NET.movimento('Casinò Verde — '+gioco, netto);
  g.mani++;
  TV.emit('azzardo',{gioco:gioco, netto:netto});   // giocare conta come stare sveglio
  if(netto>0){ g.vinto+=netto; g.filaPerse=0; TV.add('buio',0.2); }
  else if(netto<0){ g.perso+=-netto; g.filaPerse++; TV.add('buio',0.45); }
  if(netto>=400) vinciaGrosso(netto);
  if(g.filaPerse===4) OS.notify({t:'CASINÒ VERDE',x:'Il tavolo 7 ha una poltrona vuota. Si è liberata due anni fa.',bad:true});
  if(saldo()<=0.009) rovinato(g);
}
function vinciaGrosso(n){
  OS.notify({t:'VINCITA',x:U.money(n)+' accreditati sul conto.'});
  TV.Audio.sfx('mail');
  if(TV.flag('sconosciutoVisto') && U.chance(0.5))
    TV.after(U.rnd(8,16), function(){
      TV.Chat.push('sconosciuto','them',U.pick(['Hai vinto. Non con i tuoi soldi.',
        'Quei soldi erano già di qualcuno.','Anche lui vinse, la prima notte.']));
    },'dir');
}
function rovinato(g){
  if(TV.flag('rovinato')) return;
  TV.flag('rovinato',true);
  TV.add('buio',5);
  TV.World.evento('flicker',{t:1.4});
  OS.notify({t:'SALDO ESAURITO',x:'Conto a zero alle '+U.clock(TV.state.t)+'.',bad:true});
}

/* ---------------- la pagina ---------------- */
NET.sito('casinoverde.it',{titolo:'Casinò Verde', cls:'casino', render:function(pad){
  var g=stato();
  g.rl.girando=false;        // se hai cambiato pagina mentre girava, la ruota si ferma

  if(!TV.flag('casinoVisto')){
    TV.flag('casinoVisto',true);
    TV.add('buio',0.6);
  }

  pad.innerHTML=
    '<h1>CASINÒ VERDE</h1>'+
    '<p class="csn-sub">tavoli sempre aperti · giocatori collegati: '+U.ri(2,4)+
    ' · licenza in rinnovo</p>'+
    '<div class="csn-vecchio">Sessione precedente da questo dispositivo: 2 anni fa · '+
    'ultima mano alle 3:14 · perdita totale <b>'+h(U.money(2340))+'</b></div>';

  /* --- saldo e puntata --- */
  var testa=U.el('div','csn-testa');
  pad.appendChild(testa);
  var tavoli=U.el('div','csn-tavoli');
  pad.appendChild(tavoli);

  function disegnaTesta(){
    var sl=saldo(), verso='';
    if(g.saldoPrec!=null && Math.abs(sl-g.saldoPrec)>0.001) verso = sl>g.saldoPrec? ' su':' giu';
    g.saldoPrec=sl;
    testa.innerHTML='<div class="csn-saldo">saldo <b class="'+verso.trim()+'">'+h(U.money(sl))+'</b></div>'+
      '<div class="csn-stat">mani giocate '+g.mani+' · vinto '+h(U.money(g.vinto))+
      ' · perso '+h(U.money(g.perso))+'</div>';
    var righe=U.el('div','csn-chips');
    [10,25,50,100,250,500].forEach(function(v){
      var b=U.el('button','csn-chip'+(g.puntata===v?' on':''), h(U.money(v)));
      if(v>saldo()) b.disabled=true;
      b.onclick=function(){ g.puntata=v; disegna(); };
      righe.appendChild(b);
    });
    var tutto=U.el('button','csn-chip'+(g.puntata==='tutto'?' on':''),'tutto');
    tutto.disabled = saldo()<1;
    tutto.onclick=function(){ g.puntata='tutto'; disegna(); };
    righe.appendChild(tutto);
    testa.appendChild(U.el('div','csn-et','PUNTATA'));
    testa.appendChild(righe);

    /* il credito: una volta sola, e si paga in un altro modo */
    if(saldo()<10 && !g.credito){
      var c=U.el('div','csn-credito',
        '<b>Credito immediato — '+h(U.money(200))+'</b>'+
        '<div class="csn-pic">Nessun documento. Nessun interesse dichiarato. '+
        'Il rimborso verrà concordato.</div>');
      var b2=U.el('button','csn-go','accetta il credito');
      b2.onclick=function(){
        g.credito=true;
        NET.movimento('Credito Verde — erogazione', 200);
        TV.flag('debito',true);
        TV.add('buio',6);
        TV.Audio.sfx('bad');
        OS.notify({t:'CREDITO VERDE',x:h(U.money(200))+' erogati. Il contratto non è stato mostrato.',bad:true});
        TV.Mail.arriva({da:'Credito Verde', ogg:'Contratto n. 4411 — accettato', bad:true,
          corpo:'<p>Importo erogato: <b>€ 200,00</b>. Scadenza: <b>questa notte</b>.</p>'+
                '<p>Il recupero è affidato a personale locale. Non è necessario che apra la porta: '+
                'ci risulta che lei sia in casa.</p>'+
                '<p class="muted tiny">Pratica trattata 2 anni fa con lo stesso indirizzo.</p>'});
        disegna();
      };
      c.appendChild(b2);
      testa.appendChild(c);
    }
  }
  function quanto(){
    var p = g.puntata==='tutto'? Math.floor(saldo()*100)/100 : g.puntata;
    return Math.min(p, Math.floor(saldo()*100)/100);
  }

  /* --- tavolo della roulette --- */
  function disegnaRl(){
    var r=g.rl, box=U.el('div','csn-tav'), p=quanto();
    box.innerHTML='<h2>ROULETTE</h2><div class="csn-reg">Ruota europea, un solo zero. '+
      'Rosso, nero, pari, dispari, 1-18 e 19-36 pagano 1 a 1. Le dozzine 2 a 1. '+
      'Il numero pieno 35 a 1. Sullo zero le puntate esterne perdono.</div>';

    /* l'ultimo numero uscito, e quelli di prima */
    var tab=U.el('div','csn-ruota');
    if(r.ultimo===null){
      tab.innerHTML='<div class="csn-num vuoto">—</div><div class="csn-numinfo">La ruota è ferma.</div>';
    } else if(r.girando){
      tab.innerHTML='<div class="csn-num gira">'+U.ri(0,36)+'</div><div class="csn-numinfo">La ruota gira…</div>';
    } else {
      var col=colore(r.ultimo);
      tab.innerHTML='<div class="csn-num '+col+(r.appena?' atterra':'')+'">'+r.ultimo+'</div>'+
        '<div class="csn-numinfo">'+col+(r.ultimo===0?'':(r.ultimo%2===0?' · pari':' · dispari'))+'</div>';
    }
    if(r.storia.length){
      var st=U.el('div','csn-storia','<span class="csn-et">ULTIMI NUMERI</span>');
      r.storia.slice(0,12).forEach(function(n,i){
        st.appendChild(U.el('span','csn-mini '+colore(n)+((r.appena&&i===0)?' nuovo':''), String(n)));
      });
      tab.appendChild(st);
    }
    box.appendChild(tab);

    /* le puntate */
    var sc=U.el('div','csn-scomm');
    PUNTATE.forEach(function(t){
      var b=U.el('button','csn-sc'+(r.tipo===t.id?' on':'')+(t.id==='rosso'?' rosso':'')+(t.id==='nero'?' nero':''),
        h(t.et)+'<i>'+t.k+' a 1</i>');
      b.disabled=r.girando;
      b.onclick=function(){ r.tipo=t.id; disegna(); };
      sc.appendChild(b);
    });
    box.appendChild(sc);

    if(r.tipo==='pieno'){
      var rigaN=U.el('div','csn-pieno','<span class="csn-et">NUMERO (0-36)</span>');
      var inp=U.el('input'); inp.type='number'; inp.min=0; inp.max=36; inp.value=r.numero;
      inp.onchange=inp.oninput=function(){
        var v=parseInt(inp.value,10);
        r.numero = (isNaN(v)||v<0)?0:(v>36?36:v);
      };
      rigaN.appendChild(inp);
      box.appendChild(rigaN);
    }

    box.appendChild(U.el('div','csn-gioco','in gioco '+h(U.money(p))+' su '+h(tipoPuntata(r.tipo).et)+
      (r.tipo==='pieno'? ' ('+r.numero+')':'')));

    var az=U.el('div','csn-az');
    var go=U.el('button','csn-go', r.girando?'la ruota gira…':'gira la ruota');
    go.disabled = r.girando || p<1;
    go.onclick=function(){
      var puntata=p, tipo=r.tipo, numero=r.numero;
      var n=gira();
      r.girando=true; g.msgRl='';
      disegna();
      /* la ruota rallenta: i tempi fra un numero e l'altro si allungano */
      var TEMPI=[70,80,95,115,140,170,210,260,320,400,500];
      var passo=0;
      function giroDopo(){
        if(!document.body.contains(tavoli)){ conclude(); return; }
        passo++;
        if(passo>=TEMPI.length){ conclude(); return; }
        disegna();
        setTimeout(giroDopo, TEMPI[passo]);
      }
      setTimeout(giroDopo, TEMPI[0]);
      function conclude(){
        var netto=vincitaRl(n, tipo, numero, puntata);
        r.girando=false; r.ultimo=n; r.appena=true;
        r.storia.unshift(n); if(r.storia.length>16) r.storia.pop();
        g.msgRl = (netto>0? 'Esce il '+n+' '+colore(n)+'. Vinci '+U.money(netto)+'.'
                          : 'Esce il '+n+' '+colore(n)+'. Perdi '+U.money(puntata)+'.');
        g.esitoRl = netto>0?' vinta':' persa';
        incassa('roulette', netto, g);
        TV.Audio.sfx(netto>0?'mail':'bad');
        if(document.body.contains(tavoli)) disegna();
      }
    };
    az.appendChild(go);
    box.appendChild(az);

    if(g.msgRl) box.appendChild(U.el('div','csn-esito'+(g.esitoRl||''),h(g.msgRl)));
    tavoli.appendChild(box);
  }

  /* --- tavolo del blackjack --- */
  function disegnaBj(){
    var b=g.bj, box=U.el('div','csn-tav');
    var p=quanto();
    box.innerHTML='<h2>BLACKJACK</h2><div class="csn-reg">Il banco si ferma a 17. '+
      'Blackjack paga 3 a 2. Pari e patta: puntata restituita.</div>';

    if(b.fase==='pronto'){
      box.innerHTML+='<div class="csn-vuoto">Tavolo libero.</div>';
      var d=U.el('button','csn-go','distribuisci '+U.money(p));
      d.disabled = p<1;
      d.onclick=function(){
        var m = (g.mani<BENVENUTO && p<=MAX_BENVENUTO) ? mazzoFortunato() : mazzo();
        b.mazzo=m; b.tu=[m.pop(),m.pop()]; b.banco=[m.pop(),m.pop()];
        b.puntata=p; b.fase='gioco'; b.doppia=false; g.msgBj='';
        g.animaBj='deal';
        if(blackjack(b.tu)) chiudiBj();
        else disegna();
      };
      box.appendChild(d);
    } else {
      var mostraTutto = b.fase==='fine';
      var aB = g.animaBj, animaBanco = (aB==='deal'||aB==='banco')?'tutte':null;
      var animaTu = aB==='deal'? 'tutte' : (aB==='pesca'? 'ultima' : null);
      box.innerHTML+=
        '<div class="csn-riga"><span class="csn-et2">banco</span>'+
          fila(b.banco,{copri:mostraTutto?99:1, anima:animaBanco})+
          '<span class="csn-pt">'+(mostraTutto?punti(b.banco):'?')+'</span></div>'+
        '<div class="csn-riga"><span class="csn-et2">tu</span>'+
          fila(b.tu,{anima:animaTu})+'<span class="csn-pt">'+punti(b.tu)+'</span></div>'+
        '<div class="csn-gioco">in gioco '+h(U.money(b.puntata))+'</div>';

      if(b.fase==='gioco'){
        var c1=U.el('button','csn-go','carta');
        c1.onclick=function(){
          b.tu.push(b.mazzo.pop());
          g.animaBj='pesca';
          if(punti(b.tu)>=21) chiudiBj(); else disegna();
        };
        var c2=U.el('button','csn-go','stai');
        c2.onclick=chiudiBj;
        var c3=U.el('button','csn-go2','raddoppia');
        c3.disabled = b.tu.length!==2 || saldo() < b.puntata*2;   // non si raddoppia a credito
        c3.onclick=function(){
          b.puntata*=2; b.doppia=true;
          b.tu.push(b.mazzo.pop());
          g.animaBj='pesca';
          chiudiBj();
        };
        var az=U.el('div','csn-az');
        az.appendChild(c1); az.appendChild(c2); az.appendChild(c3);
        box.appendChild(az);
      } else {
        var n=U.el('button','csn-go','nuova mano');
        n.onclick=function(){ b.fase='pronto'; disegna(); };
        box.appendChild(n);
      }
    }
    if(g.msgBj) box.appendChild(U.el('div','csn-esito'+(g.esitoBj||''),h(g.msgBj)));
    tavoli.appendChild(box);
  }

  function chiudiBj(){
    var b=g.bj, prima=b.banco.length;
    var r=risolviBj(b.tu, b.banco, b.mazzo, b.puntata);
    if(b.banco.length>prima || g.animaBj!=='pesca') g.animaBj='banco';
    b.fase='fine';
    g.msgBj=r.esito;
    g.esitoBj = r.netto>0? ' vinta' : (r.netto<0? ' persa':'');
    if(r.netto!==0) incassa('blackjack', r.netto, g);
    else { g.mani++; TV.add('buio',0.1); }
    TV.Audio.sfx(r.netto>0?'mail':(r.netto<0?'bad':'click'));
    disegna();
  }

  /* --- tavolo del poker --- */
  function disegnaPk(){
    var k=g.pk, box=U.el('div','csn-tav');
    var p=quanto();
    box.innerHTML='<h2>POKER · CINQUE CARTE</h2>'+
      '<div class="csn-reg">Tieni le carte che vuoi, cambi le altre una volta sola. '+
      'Si paga da una coppia di J.</div>';

    if(k.fase==='pronto'){
      box.innerHTML+='<div class="csn-vuoto">Nessuna mano in tavolo.</div>';
      var d=U.el('button','csn-go','gioca '+U.money(p));
      d.disabled = p<1;
      d.onclick=function(){
        var m = (g.mani<BENVENUTO && p<=MAX_BENVENUTO) ? mazzoFortunatoPoker() : mazzo();
        k.mazzo=m; k.mano=[m.pop(),m.pop(),m.pop(),m.pop(),m.pop()];
        k.tenute=[false,false,false,false,false];
        k.puntata=p; k.fase='scelta'; g.msgPk='Tocca le carte che vuoi tenere.';
        g.esitoPk=''; g.animaPk='tutte';
        disegna();
      };
      box.appendChild(d);
    } else {
      var r=U.el('div','csn-riga mano');
      r.innerHTML=fila(k.mano,{tenute:k.tenute, anima:g.animaPk});
      if(k.fase==='scelta'){
        r.querySelectorAll('.csn-c').forEach(function(el){
          el.onclick=function(){
            var i=+el.dataset.i;
            k.tenute[i]=!k.tenute[i];
            disegna();
          };
        });
      }
      box.appendChild(r);
      box.appendChild(U.el('div','csn-gioco','in gioco '+h(U.money(k.puntata))));

      var az=U.el('div','csn-az');
      if(k.fase==='scelta'){
        var cam=U.el('button','csn-go','cambia le altre');
        cam.onclick=function(){
          var cambiate=[];
          for(var i=0;i<5;i++) if(!k.tenute[i]){ k.mano[i]=k.mazzo.pop(); cambiate.push(i); }
          g.animaPk=cambiate;
          var pr=premio(k.mano, k.puntata), netto=pr.netto;
          k.fase='fine';
          g.msgPk = pr.k>0
            ? pr.nome.toUpperCase()+' — '+(netto>0?'vinci '+U.money(netto):'puntata restituita')
            : 'Niente. Perdi '+U.money(k.puntata)+'.';
          g.esitoPk = netto>0?' vinta':(netto<0?' persa':'');
          if(netto!==0) incassa('poker', netto, g);
          else { g.mani++; TV.add('buio',0.1); }
          TV.Audio.sfx(netto>0?'mail':(netto<0?'bad':'click'));
          disegna();
        };
        az.appendChild(cam);
        var st=U.el('button','csn-go2','tengo tutto');
        st.onclick=function(){ k.tenute=[true,true,true,true,true]; cam.onclick(); };
        az.appendChild(st);
      } else {
        var nu=U.el('button','csn-go','nuova mano');
        nu.onclick=function(){ k.fase='pronto'; disegna(); };
        az.appendChild(nu);
      }
      box.appendChild(az);
    }
    if(g.msgPk) box.appendChild(U.el('div','csn-esito'+(g.esitoPk||''),h(g.msgPk)));

    var tab=U.el('div','csn-premi');
    tab.innerHTML='<div class="csn-et">TABELLA DEI PREMI</div>'+
      PREMI.map(function(x){
        return '<div class="csn-pr"><span>'+h(x.n)+'</span><b>'+x.k+'×</b></div>';
      }).join('');
    box.appendChild(tab);
    tavoli.appendChild(box);
  }

  function disegna(){
    /* ricostruire il contenuto farebbe saltare la pagina in cima:
       il punto in cui stavi guardando si tiene da parte e si rimette. */
    var dove = pad.scrollTop;
    testa.innerHTML=''; tavoli.innerHTML='';
    disegnaTesta();
    disegnaRl();
    disegnaBj();
    disegnaPk();
    pad.scrollTop = dove;
    /* le animazioni valgono per un disegno solo */
    g.animaBj=null; g.animaPk=null; g.rl.appena=false;
    if(TV.state.soldi>=TV.SOGLIA_RICCO && !TV.flag('ricco')) TV.flag('ricco',true);
  }
  disegna();
}});
})(typeof window!=='undefined'?window:globalThis);

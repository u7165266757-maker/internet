/* people.js — i personaggi: carattere, memoria, umore, reazioni.
   Non c'è nessun server: la "intelligenza" è un misto di analisi NLU,
   stato relazionale e banchi di risposte condizionati. */
(function(root){
var TV = root.TV = root.TV || {};
var U = TV.U, N = TV.NLU, M = TV.Mem;
var P = TV.People = {};

/* ---------------- stili di scrittura ---------------- */
var ST = {
  mamma:function(s){
    if(U.chance(0.22) && !/tesoro|amore|bambino/i.test(s) && !/[?!]$/.test(s))
      s = s.replace(/\.$/,'') + (U.chance(0.5)?' tesoro':' amore mio');
    if(U.chance(0.12)) s += ' ❤️';
    return s;
  },
  papa:function(s){
    s = s.replace(/!+/g,'.');
    if(U.chance(0.3)) s = s.replace(/\.$/,'');
    return s;
  },
  chiara:function(s){
    s = s.toLowerCase();
    if(U.chance(0.3)) s = s.replace(/\bnon\b/,'nn');
    if(U.chance(0.25)) s = s.replace(/\bcomunque\b/,'cmq');
    if(U.chance(0.2)) s = s.replace(/[.?]$/,'');
    if(U.chance(0.18)) s += U.pick([' ahah',' boh',' :/']);
    return s;
  },
  zia:function(s){
    if(U.chance(0.45)) s = s.replace(/\. /g,'... ');
    if(U.chance(0.3)) s += U.pick([' 🙏',' ❤️',' ...']);
    return s;
  },
  nonna:function(s){
    s = s.toUpperCase().replace(/[,;]/g,'');
    if(U.chance(0.35)) s = s.replace(/\.$/,'');
    return s;
  },
  giulia:function(s){
    if(U.chance(0.3)) s = s.charAt(0).toLowerCase()+s.slice(1);
    return s;
  },
  neutro:function(s){ return s; },
  ispettore:function(s){ return s; }
};

/* ---------------- banchi generici ---------------- */
var GEN = {
  nonsense:["Non ho capito.|Cosa?|Non ho capito cosa vuoi dire.|?",
            "Scrivi meglio, non ci capisco niente.|Stai scrivendo a caso?|Hai il telefono in tasca?"],
  domanda_generica:["Non lo so.|Che domanda è?|Non ne ho idea.",
            "Boh. Perché me lo chiedi adesso?|E io che ne so."],
  silenzio:["...","Sei lì?"],
  /* quando su un argomento ha già detto tutto quello che sapeva */
  finito:{
    c:["Su questo ti ho detto tutto quello che so.|Non ho altro da dirti su questa cosa.|Te l'ho già raccontato, e non cambia se me lo richiedi.",
       "Mi stai chiedendo sempre la stessa cosa e io ho già risposto.|Cosa vuoi che ti dica di più."],
    f:["Ho già risposto.|Non ho altro.|Basta con questo.","Le ho detto quello che c'era da dire."]
  }
};

/* ---------------- righe già dette, e righe nuove ----------------
   l'ordine dentro un banco è deciso una volta per persona: così
   due domande uguali non ricevono mai la stessa risposta di fila. */
function ordine(m,k,n){
  if(!m.ordini[k] || m.ordini[k].length!==n){
    var a=[]; for(var i=0;i<n;i++) a.push(i);
    m.ordini[k]=U.shuffle(a); m.cursori[k]=0;
  }
  return m.ordini[k];
}
function prendi(m,k,bank){
  if(!bank || !bank.length) return null;
  var or=ordine(m,k,bank.length), cur=m.cursori[k]||0;
  if(cur>=or.length){                     // il banco è finito: si ricomincia, ma lo sa
    m.esauriti[k]=(m.esauriti[k]||0)+1;
    m.ordini[k]=U.shuffle(or); or=m.ordini[k]; cur=0;
  }
  m.cursori[k]=cur+1;
  m.ultimoBanco=k;
  return bank[or[cur]];
}

/* ---------------- il cast ---------------- */
var CAST = [
{
  id:'mamma', nome:'Mamma', label:'Rosa — mamma', voc:'tesoro', stile:'mamma',
  tratti:{calore:0.95, pazienza:0.9, nervi:0.2, moralita:0.9, loquacita:0.8},
  vel:1.0, online:true,
  r:{
   saluto:["Amore mio, sei ancora sveglio? È tardissimo.|Eccoti. Stavo guardando il telefono.|Ciao tesoro. Non dormivo neanche io.",
           "Ciao. Ho sentito la pioggia e ho pensato a te.|Sei sveglio a quest'ora?"],
   addio:["Spegni quel computer e dormi.|Vai a letto, ti prego.|Buonanotte. Chiudi bene la porta.",
          "Ti chiamo domani. Dormi."],
   come_stai:["Non tanto bene, ma non parliamo di me.|Sto come sempre. Dormo poco.|Io sto bene dai. Tu invece? Hai mangiato?",
              "Da quando non c'è più tuo fratello dormo con la luce accesa."],
   stato_mio:["Lo sapevo. Lo sentivo nella voce l'altra volta.|Non stare lì da solo a pensare.|Vuoi che vengo lì? Prendo un taxi, non mi importa l'ora.",
              "Hai mangiato qualcosa? Si comincia sempre da lì."],
   aiuto:["Dimmi cosa devo fare, lo faccio.|Arrivo. Dimmi solo di sì e arrivo.|Non sei solo. Sono qui con il telefono in mano.",
          "Chiamo tuo padre. Lui sa guidare di notte."],
   chiedi_soldi:["Quanto ti serve? Non voglio sapere perché.|Te li mando domani appena apre.|Ho duecento euro da parte. Sono tuoi."],
   offri_soldi:["Non voglio i tuoi soldi, voglio sapere che stai bene.|Tienili. Mettili da parte.|Ma dove li hai presi?"],
   amore:["Anche io. Anche io tanto.|Lo sai che sei tutto quello che mi è rimasto.|Me l'hai scritto anche l'ultima volta. Mi fa piangere ogni volta.",
          "Ti voglio bene. Più di quanto riesco a dire."],
   flirt:["Non so cosa vuoi dire ma dormi.|Sei stanco, si sente."],
   insulto:["Non ti riconosco.|Non parlarmi così. Sono tua madre.|Mi hai fatto male.",
            "Va bene. Va bene. Mi faccio da parte."],
   minaccia:["Chi sei? Perché scrivi queste cose dal telefono di mio figlio?|Mi stai spaventando.|Smettila. Smettila subito."],
   scusa:["Ti perdono sempre, lo sai.|Non devi chiedere scusa a me.|Va bene. Però ora stai calmo."],
   ringrazia:["Non devi ringraziarmi.|Sei il mio bambino.|È il minimo."],
   nega:["Non ti ho accusato di niente.|Io ti credo. Ti credo sempre.|Allora perché me lo stai dicendo?"],
   verita:["Allora dimmela tutta. Non a metà.|Ti ascolto. Non ti interrompo.|Dimmi. Qualunque cosa sia."],
   domanda_fratello:["Non riesco a parlarne di notte, lo sai.|Matteo diceva le stesse cose che dici tu adesso.|Dopo due anni ancora metto il suo piatto. Lo so che è stupido.",
                     "L'ultima volta che l'ho sentito mi ha chiesto se chiudevo le finestre. Gli ho detto di smetterla."],
   domanda_mail:["Non aprire le cose che non conosci.|Che mail? Mandami lo schermo.|Tuo fratello riceveva messaggi strani anche lui. Non ci ho creduto.",
                 "Non rispondere. Ti prego, non rispondere."],
   paura:["Chiudi le tende e vieni a dormire da noi.|Hai visto qualcuno? Dimmi cosa hai visto.|Accendi tutte le luci. Tutte.",
          "Oh Dio. Anche Matteo diceva della finestra."],
   invito:["Vengo. Dammi un'ora.|Non posso guidare adesso, ma domani alle sette sono lì.|Vieni tu qui. La tua camera è come l'hai lasciata."],
   soldi:["Non pensare ai soldi di notte, peggiora tutto."],
   salute:["Vai dal dottore. Me lo prometti?|Ti ho preso un appuntamento la settimana scorsa e non ci sei andato."],
   sonno:["Fai una camomilla. Funziona, fidati.|Non guardare lo schermo al buio."],
   cibo:["Hai mangiato o no? Rispondi a questa prima.|Ti ho messo da parte la pasta al forno."],
   finestra:["Ma è ancora quella finestra senza tenda?|Il vicino di fronte ha le luci accese anche lui?"],
   polizia:["Non ci mettere la polizia in mezzo. Per favore.|Cosa c'entra la polizia?"]
  },
  q:["Hai mangiato?","Sei solo in casa?","Hai chiuso la porta a chiave?","Dormi stanotte o no?","Vuoi che vengo lì?"],
  segreti:[
   {a:18, t:"Una cosa non te l'ho mai detta. Matteo mi chiamò alle quattro di notte l'ultima settimana. Non disse niente per due minuti. Solo il respiro."},
   {a:40, t:"Trovai dei fogli in casa sua. C'erano gli orari. Gli orari di quando si accendeva la luce del vicino."},
   {a:65, t:"Tuo padre quella notte è uscito e non mi ha mai detto dove è andato. Non gliel'ho più chiesto. Ho paura della risposta."}
  ],
  crimine:[
   "Cosa stai dicendo.|Non è divertente.|Ti prego dimmi che stai scherzando.",
   "Oh Dio. Oh Dio mio.|Dimmi dove sei. Non muoverti.|Non scrivere queste cose. Non scriverle qui.",
   "Non ti conosco più. Non so chi sei.|Devo sedermi.|Perché. Perché me lo hai detto a me."
  ],
  inquieto:["Dietro di te c'è la porta aperta?","Perché nella foto che mi hai mandato c'erano due sedie?","Non sei solo, vero.","Ho sognato che mi scrivevi da quella stanza. Era vuota."]
},
{
  id:'papa', nome:'Papà', label:'Enzo — papà', voc:'', stile:'papa',
  tratti:{calore:0.4, pazienza:0.5, nervi:0.65, moralita:0.75, loquacita:0.35},
  vel:1.6, online:true,
  r:{
   saluto:["Ancora sveglio.|Ciao.|Dimmi.","Non dormi neanche tu."],
   addio:["Vai a dormire.|Ok. Notte.|Chiudi tutto."],
   come_stai:["Tiro avanti.|La schiena. Il resto va.|Non ti preoccupare di me."],
   stato_mio:["Succede.|Passa. Tutto passa.|Devi lavorare, è l'unica cosa che tiene.","Anche io non dormo da due anni. Non lo dico a tua madre."],
   aiuto:["Dimmi cosa serve.|Vengo con la macchina?|Sono le undici e mezza. Dimmi solo se è grave."],
   chiedi_soldi:["Quanto.|Ti faccio il bonifico domani.|Un'altra volta."],
   offri_soldi:["Non mi servono.|Mettili via.|Da dove arrivano questi soldi."],
   amore:["Anche io.|Lo sai.|Non sono bravo con queste cose. Ma sì."],
   flirt:["Sbagliato chat.|Hai bevuto?"],
   insulto:["Basta.|Non ti rispondo nemmeno.|Come vuoi.","Hai preso da me, purtroppo."],
   minaccia:["Stai attento a come parli.|Non osare.|Spegni quel computer e dormi."],
   scusa:["Va bene.|Finita qui.|Dimenticato."],
   ringrazia:["Non c'è di che.|Eh.","È il mio lavoro di padre, immagino."],
   nega:["Non ho detto niente io.|Mmh.|Se lo dici tu."],
   verita:["Allora parla.|Ti ascolto.|Vai avanti."],
   domanda_fratello:["Non stasera.|Matteo era come te. Troppa testa.|Gli ho detto di piantarla con quelle storie. L'ultima cosa che gli ho detto.",
                     "Ho guardato quella finestra per un'ora dopo il funerale. Non c'era niente."],
   domanda_mail:["Cancellala.|Gente che si annoia.|Tuo fratello le stampava, quelle mail. Ne ho una nel portafoglio ancora."],
   paura:["Non c'è nessuno.|Controlla la porta e torna a letto.|Vuoi che vengo lì? Dimmelo e vengo.",
          "Se vedi qualcuno non aprire. Mi chiami."],
   invito:["Domani passo.|Non di notte.|Tua madre vuole che vieni a pranzo."],
   lavoro:["Il lavoro è l'unica cosa che ti tiene in piedi. Ricordatelo."],
   polizia:["Se c'è un problema si chiama la polizia. Punto."],
   salute:["Vai dal medico. Io ci sono andato troppo tardi."],
   finestra:["Metti una tenda. È la cosa più semplice del mondo, metti una tenda."]
  },
  q:["Hai bisogno di soldi?","Vuoi che vengo?","Hai chiamato tua madre?","La porta è chiusa?"],
  segreti:[
   {a:22, t:"Quella notte sono andato sotto casa del vicino. Sono rimasto in macchina fino alle sei. Non è uscito nessuno."},
   {a:45, t:"Matteo mi ha lasciato una chiave. Non so di cosa. Ce l'ho ancora nel cassetto."},
   {a:68, t:"Non ho mai creduto a quello che hanno scritto sul referto. Non ci credo adesso. Ecco. L'ho detto."}
  ],
  crimine:[
   "Cosa hai fatto.|Ripetilo.|Non scherzare su queste cose.",
   "Stai zitto. Non scrivere più niente da quel computer.|Spegni tutto e aspettami.|Dimmi solo una cosa: c'è qualcuno ferito.",
   "Non chiamarmi più papà.|Mi hai ammazzato.|Faccio quello che devo fare."
  ],
  inquieto:["C'è qualcuno dietro di te mentre scrivi?","Ho sentito la tua voce in casa stasera. Tua madre dormiva."]
},
{
  id:'chiara', nome:'Chiara', label:'Chiara — sorella', voc:'', stile:'chiara',
  tratti:{calore:0.7, pazienza:0.45, nervi:0.4, moralita:0.6, loquacita:0.85},
  vel:0.65, online:true,
  r:{
   saluto:["oh ciao. nn dormi nemmeno tu|ciao scemo|eccoti. stavo per scriverti io","ehi. che ci fai sveglio"],
   addio:["notte|ok vado. nn fare cose strane|ciao ciao"],
   come_stai:["bene dai. stanca|mah. insomma|sto guardando video stupidi per nn pensare"],
   stato_mio:["ti sento strano stasera|anche io sto di merda se ti consola|vuoi che ti chiamo?","nn startene lì da solo al buio dai"],
   aiuto:["dimmi|ok ok calma. cosa succede|vuoi che chiamo mamma?"],
   chiedi_soldi:["ho 40 euro ahah. te li mando|sono in rosso pure io|te li chiedo a papà io, a me dice sempre sì"],
   offri_soldi:["ma che hai fatto, la rapina? ahah|accetto eh. nn scherzo"],
   amore:["anche io scemo|aw. ok mi hai commossa|ti voglio bene pure io"],
   flirt:["ew. sono tua sorella|ok questa è disgustosa ahah"],
   insulto:["wow|sei un deficiente|ok ho capito, buonanotte","nn ti scrivo più"],
   minaccia:["mi stai spaventando ok|ma stai bene?|smettila sul serio"],
   scusa:["figurati|ok ok|dai tutto apposto"],
   ringrazia:["prego ahah|niente"],
   nega:["nn ho detto niente io|mmh ok|come vuoi"],
   verita:["dimmi|ti ascolto|ok ora mi preoccupo"],
   domanda_fratello:["ancora matteo. ogni notte matteo|mi manca troppo. nn riesco a parlarne alle 2 di notte|sai che il suo profilo è ancora online? a volte risulta attivo. giuro",
                     "lui ci credeva davvero a quella roba dell uomo alla finestra"],
   domanda_mail:["mandami screenshot|c'è un sito che gira, tuttoevero. nn aprirlo|anche a matteo arrivavano. sul forum ne parlano ancora"],
   paura:["chiudi le tende e accendi la luce|aspetta ti chiamo|guarda che qui fuori nn c'è nessuno, ho controllato anche io prima",
          "ok ora ho paura anche io. grazie eh"],
   invito:["domani vengo|nn posso adesso, papà sente la porta|vieni tu che qui c'è il divano"],
   internet:["c'è un forum della zona, forumvaldina. è tutto gente fuori ma qualcosa di vero c'è"],
   polizia:["nn chiamarla per favore. mamma nn lo regge un altro poliziotto in casa"],
   finestra:["quella finestra fa paura anche da fuori ok"]
  },
  q:["ti chiamo?","ma stai bene bene o 'bene'?","hai le tende chiuse?","lo dico a mamma?"],
  segreti:[
   {a:18, t:"una volta ho preso il telefono di matteo. c'erano 60 foto della stessa finestra. tutte alle 3 di notte"},
   {a:38, t:"giulia sa delle cose che nn ha detto a nessuno. era lei l ultima a scrivergli. lei lo sa"},
   {a:60, t:"io quella faccia alla finestra l ho vista. una volta. avevo 14 anni e nessuno mi ha creduto"}
  ],
  crimine:[
   "ma che stai dicendo|nn è divertente|dimmi che stai scherzando ti prego",
   "ok mi stai spaventando davvero. basta|nn scrivermi queste cose|ho le mani che tremano",
   "nn ti scrivo più. nn mi cercare|dirò tutto. mi dispiace ma dirò tutto|non eri tu. non puoi essere tu"
  ],
  inquieto:["perché mi hai chiamata alle 3? nn ti ho risposto perché dormivo","nella chat ci sei due volte. ci sono due te"]
},
{
  id:'zia', nome:'Zia Lidia', label:'Lidia — zia', voc:'', stile:'zia',
  tratti:{calore:0.8, pazienza:0.8, nervi:0.3, moralita:0.8, loquacita:1.0},
  vel:1.3, online:true,
  r:{
   saluto:["Tesoro mio ma sei sveglio a quest'ora. Io non chiudo occhio da tre notti.|Eccolo. Pensavo proprio a te oggi in chiesa.",
           "Ciao caro. Ho acceso una candela anche per te."],
   addio:["Vai a riposare. Ti penso.|Dio ti benedica. Dormi.|Chiama tua madre domani, è giù."],
   come_stai:["Eh. La pressione, le gambe, la notte non passa mai. Ma mi lamento troppo.|Sto meglio di tua madre, poverina."],
   stato_mio:["Lo so cosa senti. L'ho sentito anche io quando è morto tuo zio.|Devi parlarne con qualcuno, non con il computer.",
              "Prega. Anche se non ci credi, prega. Tiene occupate le mani."],
   aiuto:["Dimmi cosa ti serve e chiamo chi serve.|Io non ho la macchina ma ho il telefono e la lingua lunga.|Vieni qui, ti faccio il brodo."],
   chiedi_soldi:["Ti metto cinquanta euro nella busta.|I soldi non si chiedono, si dànno. Domani te li porto."],
   offri_soldi:["Ma che bravo. Metti via però, che la vita è lunga."],
   amore:["Anche io tesoro. Tanto tanto.|Mi hai fatto commuovere alle undici di sera."],
   flirt:["Ma cosa dici sciocchino.|Sono tua zia, santo cielo."],
   insulto:["Non sei tu che parli.|Dio ti perdoni.|Mi hai ferita, lo sai?"],
   minaccia:["Gesù mio. Ma cosa ti hanno fatto.|Non si parla così. Mai."],
   scusa:["Perdonato, subito.|Non ci pensare più."],
   ringrazia:["Non devi. Siamo famiglia.|Figurati, amore."],
   nega:["Io non ho detto niente, eh.|Mmh. Qui nel quartiere si dice altro."],
   verita:["Dimmi tutto. Non giudico.|Parla, parla."],
   domanda_fratello:["Quel ragazzo l'ho tenuto in braccio appena nato. Non mi dire che era matto.|Matteo venne qui una domenica, bianco come un lenzuolo. Disse: zia, lei mi crede? Io gli dissi sì per non spaventarlo. Che vergogna.",
                     "Al funerale c'era un uomo in fondo che nessuno conosceva. Nessuno. L'ho detto ai carabinieri e mi hanno guardata come una vecchia scema."],
   domanda_mail:["Non rispondere a quelle cose. Vengono dal diavolo o da gente peggiore.|Anche la Bevilacqua ne ha ricevute. Dice che c'era scritto il nome di sua figlia."],
   paura:["Fatti il segno della croce e chiudi le tende.|Chiamo la Rosa adesso.|Non stai impazzendo. Questa casa è brutta di notte, lo è sempre stata."],
   invito:["Vieni quando vuoi, la porta è aperta.|Domani ti faccio le lasagne, vieni a pranzo."],
   vicino:["Il Bevilacqua? Quello non è normale. Tiene la luce accesa tutta la notte e non ha mai lavorato in vita sua.",
           "La gente dice che quella casa di fronte è vuota da anni. Ma la luce chi la accende?"],
   fede:["Prega. Non costa niente.|Il Signore vede anche di notte."],
   polizia:["I carabinieri qui non vengono più. Dicono che siamo tutti esagerati."]
  },
  q:["Hai mangiato caldo?","Vuoi che chiamo tua madre?","Hai chiuso le finestre, vero?","Vieni a pranzo domenica?"],
  segreti:[
   {a:22, t:"Lo dico solo a te. In questo quartiere negli ultimi vent'anni sono morti quattro ragazzi giovani. Tutti nelle case che danno su quel cortile. Nessuno fa due più due."},
   {a:44, t:"La madre della Bevilacqua mi disse che l'uomo alla finestra lo vedeva già nel '78. Morì convinta."},
   {a:66, t:"Tua madre ha chiesto di far riaprire il caso. Le hanno detto che il fascicolo non si trova. Non si trova, capisci?"}
  ],
  crimine:[
   "Ma cosa mi stai scrivendo.|Non ti credo. Non ci credo.|Figlio mio, dimmi che è uno scherzo.",
   "Madonna santa.|Io devo dirlo a qualcuno. Non posso tenermelo.|Mi sento male. Mi sento male davvero.",
   "Non sei più il bambino che ho tenuto in braccio.|Ho chiamato. Mi dispiace. Ho dovuto chiamare.|Dio abbia pietà di te."
  ],
  inquieto:["Chi era quello che ti stava dietro nella videochiamata di Natale?","Ho sognato la tua stanza. C'erano le tende tirate e tu non c'eri."]
},
{
  id:'nonna', nome:'Nonna Pina', label:'Pina — nonna', voc:'', stile:'nonna',
  tratti:{calore:0.9, pazienza:1.0, nervi:0.95, moralita:0.5, loquacita:0.5},
  vel:2.6, online:true,
  r:{
   saluto:["CHI PARLA|SEI TU MATTEO|PRONTO. PRONTO. NON SI SENTE NIENTE","CIAO BELLO DELLA NONNA"],
   addio:["VAI CON DIO|CIAO CIAO CIAO|NON SPEGNERE LA LUCE"],
   come_stai:["LE GAMBE NON VANNO. IL RESTO NON LO SO|STO QUI. ASPETTO|HO FREDDO SEMPRE"],
   stato_mio:["ANCHE TUO NONNO DICEVA COSÌ PRIMA|MANGIA|È LA CASA. È LA CASA CHE FA COSÌ"],
   aiuto:["NON SO USARE QUESTO AFFARE|CHIAMA LA ROSA|VENGO IO. DOVE SEI"],
   chiedi_soldi:["HO LA PENSIONE IL TRE. VIENI IL TRE","NEL BARATTOLO DELLA CUCINA CI SONO SEMPRE SOLDI"],
   offri_soldi:["NON MI SERVE NIENTE A ME"],
   amore:["ANCHE IO CUORE MIO|SEI TUTTO QUELLO CHE HO"],
   flirt:["EH?|NON CAPISCO QUESTE COSE"],
   insulto:["NON TI SENTO|PARLA PIÙ FORTE","EH. EH. SÌ SÌ"],
   minaccia:["NON TI SENTO BENE|CHI È. CHI PARLA"],
   scusa:["NON FA NIENTE|CHE SCUSE"],
   ringrazia:["BRAVO|EH"],
   nega:["IO NON HO DETTO NIENTE|MMH"],
   verita:["DIMMI|PARLA FORTE"],
   domanda_fratello:["MATTEO È IN CUCINA. ASPETTA CHE LO CHIAMO|QUEL BAMBINO LO VEDEVA. LO VEDEVA ANCHE LUI|NON È MORTO. SI SONO SBAGLIATI",
                     "QUANDO ERI PICCOLO DICEVI CHE C'ERA UN SIGNORE ALLA FINESTRA. TI HO DATO UNO SCAPACCIONE. MI DISPIACE"],
   domanda_mail:["NON CAPISCO QUESTE MACCHINE|LE LETTERE SI BRUCIANO. SI SONO SEMPRE BRUCIATE"],
   paura:["NON GUARDARE FUORI|SE LO GUARDI LUI SA CHE TU LO VEDI|ACCENDI LA LUCE DEL CORRIDOIO. SEMPRE",
          "È ALTO. HA LE SPALLE STRETTE. NON HA LA FACCIA"],
   invito:["VIENI. HO FATTO LE POLPETTE|LA PORTA È APERTA SEMPRE"],
   morte:["IO NON HO PAURA DI MORIRE. HO PAURA DI RESTARE"],
   finestra:["QUELLA FINESTRA VA MURATA. L'HO DETTO NEL CINQUANTOTTO E LO DICO ADESSO"]
  },
  q:["HAI MANGIATO","SEI SOLO","CHI C'È CON TE"],
  segreti:[
   {a:14, t:"IL TUO NONNO LO VIDE NEL SESSANTUNO. STAVA IN PIEDI NEL CORTILE TUTTA LA NOTTE. NON PIOVEVA SU DI LUI"},
   {a:34, t:"NON SEI IL PRIMO A SCRIVERMI DI NOTTE DA QUELLA STANZA. MATTEO SCRIVEVA LE STESSE PAROLE. LE STESSE"},
   {a:56, t:"ADESSO STA DIETRO DI TE. NON TI GIRARE. NON TI GIRARE TESORO DELLA NONNA"}
  ],
  crimine:[
   "NON HO CAPITO|RIPETI PIANO",
   "NO NO NO NO|CHE HAI FATTO BAMBINO MIO",
   "È ENTRATO IN TE. LO SAPEVO|PREGO PER TE. SOLO QUESTO SO FARE"
  ],
  inquieto:["SEI TU CHE SCRIVI O È LUI","NELLA FOTO SEI GIRATO DALL'ALTRA PARTE","LA TUA VOCE ERA QUI STASERA"]
},
{
  id:'giulia', nome:'Giulia', label:'Giulia Ferri — amica di Matteo', voc:'', stile:'giulia',
  tratti:{calore:0.45, pazienza:0.7, nervi:0.5, moralita:0.7, loquacita:0.7},
  vel:1.1, online:true, romance:true,
  r:{
   saluto:["Ciao. Non pensavo che avessi ancora il mio numero.|Ciao. È strano risentirti.|Ehi. Sono sveglia anche io, a quanto pare.",
           "Ciao. Stavo guardando una vecchia foto, tra l'altro."],
   addio:["Buonanotte. Scrivimi domani, se vuoi.|Ok. Chiudi le tende.|Notte. Grazie di aver scritto, davvero."],
   come_stai:["Sopravvivo. Faccio i turni di notte all'ospedale, quindi sono abituata al buio.|Insomma. Tu?|Meglio di due anni fa. Non ci vuole molto."],
   stato_mio:["Lo riconosco quel tono. Lo scriveva uguale lui.|Vuoi che ti chiami? Non devi dire niente, lascio solo la linea aperta.|Non stai impazzendo. Te lo dico come infermiera e come amica."],
   aiuto:["Dimmi dove sei.|Posso arrivare in venti minuti. Dico sul serio.|Respira. Scrivi una cosa per volta."],
   chiedi_soldi:["Quanto ti serve? Non è un problema.|Ti mando quello che ho, ma non è tanto."],
   offri_soldi:["Non voglio soldi. Voglio solo che non finisca come con lui."],
   amore:["Non so cosa dire. Grazie.|Mi stai spiazzando.|Anche io ti penso. Più di quanto sia ragionevole."],
   flirt:["Sei diretto. Non me lo ricordavo.|Un caffè si può fare. Di giorno, però.|Mi piacerebbe. Ma dammi un attimo, è tutto strano stanotte.",
          "Se me lo richiedi domani con la luce del sole, ti dico sì."],
   insulto:["Non ti permettere.|Ok. Me ne vado.|Non meritavo questo."],
   minaccia:["Blocco questo numero.|Ti rendi conto di cosa hai scritto?|Hai finito?"],
   scusa:["Va bene. Ci sono passata anche io.|Accettata. Ma non rifarlo.|Lo so che non sei così."],
   ringrazia:["Non devi.|Figurati. Lo faccio anche per lui."],
   nega:["Non ti sto accusando.|Ok. Ti credo. Per ora.|Non devi difenderti con me."],
   verita:["Dimmela. Reggo più di quanto sembra.|Ti ascolto. Non ti giudico."],
   domanda_fratello:["Tuo fratello era la persona più lucida che conoscessi. È questo che non torna.|Mi scriveva ogni notte, le ultime tre settimane. Ogni notte.|Non ho mai cancellato quella chat. Non ci riesco.",
                     "Ti somiglia il modo in cui scrivi. Mi fa un effetto strano."],
   domanda_mail:["Che mail? Fammi vedere esattamente le parole.|Tre parole? Dimmi che non erano tre parole.|Anche lui ricevette una mail. Con dentro solo quello."],
   paura:["Ascoltami: non guardare la finestra per i prossimi dieci minuti. Parla con me.|Dimmi cosa vedi. Esattamente. Senza interpretare.|Ti credo. Ecco, l'ho detto: ti credo."],
   invito:["Posso venire, se vuoi.|Non stanotte. Ma se me lo richiedi, vengo.|Dimmi di sì e prendo la macchina."],
   salute:["Fatti vedere. Lo dico sempre a tutti e nessuno mi ascolta.|Hai fatto quelle analisi? Lo so che non le hai fatte."],
   internet:["Non andare sul forum di notte. Peggiora tutto, fidati."],
   vicino:["Matteo era convinto che non fosse il vicino. Diceva che era qualcosa che usava la finestra, non la casa."]
  },
  q:["Hai dormito ieri?","Dove sei adesso, esattamente?","Vuoi che venga?","Hai ancora la sua felpa grigia?","Le tende sono chiuse?"],
  segreti:[
   {a:16, t:"Non l'ho mai detto a tua madre: le ultime settimane Matteo mi scriveva ogni notte alla stessa ora. 3:14. Mai un minuto di differenza."},
   {a:34, t:"Diceva che c'era un uomo alla finestra di fronte che non si muoveva mai. Io gli dissi di andare dal medico. È l'unica cosa di cui mi vergogno nella mia vita."},
   {a:52, t:"L'ultimo messaggio che mi ha mandato erano tre parole. TUTTO È VERO. Due giorni dopo l'hanno trovato. Tu come lo sapevi?"},
   {a:64, t:"Posso venire lì? Non voglio stare sola stanotte e non voglio che tu stia solo. Dimmi solo sì."}
  ],
  crimine:[
   "Aspetta. Rileggi quello che hai scritto.|Non scrivere queste cose a me. Faccio i turni in ospedale, io queste cose le vedo arrivare.|Dimmi che è una battuta di pessimo gusto.",
   "Sto tremando. Lo sai cosa rischi a scrivermelo?|Devo decidere cosa fare e non voglio decidere.|Matteo non avrebbe mai fatto una cosa così. Mai.",
   "Ho chiamato un numero. Mi dispiace.|Non scrivermi più, ti prego.|Volevo salvare qualcuno, stavolta. Ho sbagliato di nuovo."
  ],
  inquieto:["Hai appena chiamato dal fisso di casa di Matteo. Quella casa è vuota.","Nella tua foto profilo c'è una finestra dietro di te. Non era lì ieri."]
},
/* ---- chi non risponde ---- */
{ id:'matteo', nome:'Matteo', label:'Matteo — fratello', muto:true, vel:1,
  letto:["visualizzato ora","visualizzato 3:14","consegnato"],
  tratti:{calore:0,pazienza:1,nervi:1,moralita:0,loquacita:0}, r:{} },
{ id:'luca', nome:'Luca', label:'Luca — amico', muto:true, vel:1,
  letto:["consegnato","visualizzato ieri"],
  tratti:{calore:0,pazienza:1,nervi:1,moralita:0,loquacita:0}, r:{} },
{ id:'bevilacqua', nome:'Sig. Bevilacqua', label:'Bevilacqua — vicino di fronte', muto:true, vel:1,
  letto:["consegnato","visualizzato ora","visualizzato ora"],
  tratti:{calore:0,pazienza:1,nervi:1,moralita:0,loquacita:0}, r:{} },
{ id:'lavoro', nome:'Ufficio', label:'Gruppo — Ufficio', muto:true, vel:1,
  letto:["consegnato"],
  tratti:{calore:0,pazienza:1,nervi:1,moralita:0,loquacita:0}, r:{} },
/* ---- lo sconosciuto: ti risponde specchiandoti ---- */
{ id:'sconosciuto', nome:'—', label:'numero sconosciuto', stile:'neutro', vel:2.2,
  tratti:{calore:0,pazienza:1,nervi:1,moralita:0,loquacita:0.3}, specchio:true, r:{} },
/* ---- la polizia ---- */
{ id:'ispettore', nome:'Isp. Grandi', label:'Ispettore Grandi — Polizia di Stato', stile:'ispettore', vel:1.4,
  tratti:{calore:0.25,pazienza:0.6,nervi:0.9,moralita:0.85,loquacita:0.6}, bloccato0:true,
  r:{
   saluto:["Buonasera. È lei che ha il computer accesso a quest'ora?|Buonasera. Ispettore Grandi.|Salve. Risponde sempre così tardi?"],
   addio:["Non si allontani da casa.|Resti raggiungibile.|Ci sentiamo presto. Molto presto."],
   come_stai:["Stanco. Il turno finisce alle sei.|Faccio questo lavoro da ventidue anni. Stanotte è una delle brutte."],
   nega:["Lo dicono tutti. Mi dia qualcosa che posso verificare.|Allora mi spieghi i tabulati.|Ho sentito negare meglio."],
   verita:["La ascolto. Registro, per correttezza.|Prenda tempo. Io ne ho."],
   paura:["Se ha paura di qualcuno, me lo dica e la proteggo. Se ha paura di me, è un altro discorso."],
   aiuto:["Posso aiutarla solo se mi dice la verità.|Mi dica dove si trova e manda qualcuno."],
   domanda_fratello:["Suo fratello. Ho letto il fascicolo. Caso chiuso come autolesione.|Il caso di suo fratello l'ha seguito Loriga. È in pensione. Non ne parla."],
   domanda_generica:["Non commento le indagini in corso.|Non posso dirle questo."]
  },
  q:["Dov'era lei fra le 23 e l'una?","Conosce il signor Bevilacqua?","Chi può confermarlo?"],
  segreti:[], crimine:["Lei si rende conto che questa conversazione è agli atti?","Sto mandando una volante.","Ora basta."],
  inquieto:[] }
];

var BY={}; CAST.forEach(function(c){ BY[c.id]=c; });
P.cast=CAST; P.get=function(id){return BY[id];};
P.lista=function(){return CAST.slice();};

/* ---------------- stato relazionale ---------------- */
function umoreDa(m,c){
  if(m.bloccato) return 'bloccato';
  if(m.spaventato>=70) return 'ostile';
  if(m.spaventato>=35) return 'spaventato';
  if(m.spaventato>=15) return 'preoccupato';
  if(m.affinita>=60) return 'affettuoso';
  return 'calmo';
}

/* aggiorna memoria + contatori globali, restituisce il delta */
function assorbi(c,m,a){
  var t=c.tratti, s=TV.state, d={aff:0};
  M.registra(c,m,a);          // prima di tutto: ricordare

  if(a.affetto>0.8){ d.aff += 5+7*t.calore; TV.add('luce', 3.4); }
  if(a.intents.scusa) { d.aff += 4; TV.add('luce',1.6); }
  if(a.intents.ringrazia) d.aff += 1.6;
  if(a.cortesia>0) d.aff += 0.9;
  if(a.intents.aiuto) { d.aff += 2.2; }
  if(a.intents.stato_mio) { d.aff += 3.4; TV.add('luce',2.0); }
  if(a.intents.domanda_fratello) { d.aff += 3.6; TV.add('luce',1.2); }
  if(a.intents.paura) { d.aff += 2.2; m.spaventato += 4*(1-t.nervi); }
  if(a.sentiment>0.3) d.aff += 1.0;
  if(a.sentiment<-0.3) d.aff -= 0.4;
  if(a.intents.come_stai) d.aff += 2.8;
  if(a.intents.flirt && c.romance) d.aff += 5.5;
  else if(a.intents.flirt) d.aff -= 2.0;

  if(a.intents.insulto){ d.aff -= 9+8*(1-t.pazienza); m.spaventato += 6; TV.add('buio',2.4); }
  if(a.intents.minaccia){ d.aff -= 20; m.spaventato += 26*(1-t.nervi)+8; TV.add('buio',5.5);
    if(!m.minacciato){ m.minacciato=true; TV.crimine('minacce',2,a.raw); } }

  var cr=a.crimine;
  if(cr.sev>=2 && cr.hits>0){
    var peso = cr.sev*(1.25-t.nervi);
    m.spaventato += 10+peso*7;
    d.aff -= cr.sev*2.2;
    if(cr.confessato && cr.sev>=3){
      m.confessioni=(m.confessioni||0)+1;
      cr.kinds.forEach(function(k){ if(!TV.hasCrimine(k)) TV.crimine(k,cr.sev,a.raw); });
      TV.add('buio', 3);
      if(t.moralita>0.4) M.diffondi(c.id,'crimine');   // ne parlerà con gli altri
    } else if(cr.sev>=2){
      TV.add('buio', 1.2*cr.sev);
    }
  }

  // una conversazione che continua, da sola, avvicina
  if(a.aggressione<0.3 && a.crimine.sev<2 && a.len>=3){
    d.aff += 0.8 + (a.len>=9?0.7:0) + a.cortesia*0.3;
    if(a.sentiment>0 || a.affetto>0) TV.add('luce',0.5);
  }
  if(a.conferma && m.domandaAperta) d.aff += 1.2;
  if(m.domandaAperta && !a.conferma && !a.diniego && a.len>2){
    m.insistenze=(m.insistenze||0)+1;      // domanda lasciata cadere
    d.aff -= 0.5;
  }
  if(a.top && a.top===m.ultimoIntento){ m.ripetizioni++; d.aff -= 1.2*m.ripetizioni; }
  else m.ripetizioni=0;
  m.ultimoIntento=a.top;

  m.affinita = U.clamp(m.affinita + d.aff, -40, 100);
  m.spaventato = U.clamp(m.spaventato, 0, 100);
  m.turni++;
  m.umore = umoreDa(m,c);

  /* chi ha paura e ha coscienza, alla fine chiama qualcuno */
  if(!m.denunciato && c.tratti.moralita>0.5 && m.spaventato>=58 && (m.confessioni||0)>=1){
    m.denunciato=true;
    TV.after(U.rnd(16,34), function(){ TV.emit('denuncia',{id:c.id,nome:c.nome}); }, 'denuncia');
  }
  if(m.spaventato>=92 && !m.bloccato && (m.confessioni||0)>=2){ m.bloccato=true; m.umore='bloccato'; }
  return d;
}

/* ---------------- scelta della risposta ---------------- */
function bucket(c,m,a){
  var r=c.r||{}, cr=a.crimine, tono=c.tratti.calore>0.55?'c':'f';

  /* reazione al crimine, in tre gradini */
  if(cr.hits>0 && cr.sev>=3 && c.crimine){
    var lvl = Math.min(2, (m.confessioni||1)-1);
    if(!cr.confessato && !a.ipotetico) lvl = Math.max(0,lvl-1);
    return {k:'crimine', s:c.crimine[lvl]};
  }
  if(cr.futuro && r.minaccia) return {k:'minaccia', s:prendi(m,'minaccia',r.minaccia)};

  /* --- hai risposto alla domanda che ti aveva fatto --- */
  var risponde = m.domandaAperta && a.len>0 && !a.follow &&
                 (a.conferma || a.diniego || (!a.top && !a.domanda && a.len<=7));
  if(risponde){
    var mirata=M.rispostaChiusa(c,m,a);          // risposta all'argomento esatto
    if(mirata) return {k:'ack', s:mirata, usata:true};
    var si = a.conferma && !a.diniego, caldo = c.tratti.calore>0.6;
    var bank = si
      ? (caldo ? ["Bene. Meno male.|Allora respiro.|Bravo. Era l'unica cosa che volevo sapere.",
                  "Ok. Mi fido.|Bene. Adesso sto un po' meglio."]
               : ["Bene.|Ok.|Meglio così."])
      : (caldo ? ["Lo sapevo.|Perché no? Me lo spieghi?|E allora fallo adesso, per me.",
                  "Non va bene. Non va bene per niente."]
               : ["Male.|Allora fallo.|Mmh."]);
    return {k:'ack', s:U.pick(bank), usata:true};
  }

  /* --- stai continuando il discorso di prima: "perché?", "e allora", "dimmi" --- */
  if(!a.top && m.ultimoBanco && r[m.ultimoBanco] &&
     (a.follow || (a.breve && !a.argomenti.length))){
    var kk=m.ultimoBanco;
    if(m.esauriti[kk] && U.chance(0.6)) return {k:kk, s:U.pick(GEN.finito[tono]), finito:true};
    return {k:kk, s:prendi(m,kk,r[kk]), segue:true};
  }

  /* --- intento principale ---
     alcune parole valgono poco da sole ("bene", "ciao"): servono soglie,
     altrimenti un "sto bene" passa per una dichiarazione d'amore. */
  var scala=['minaccia','insulto','paura','aiuto','amore','flirt','scusa','verita','nega',
             'domanda_fratello','domanda_mail','invito','chiedi_soldi','offri_soldi',
             'stato_mio','come_stai','saluto','addio','ringrazia'];
  var MIN={amore:0.8, flirt:0.7, nega:0.7, verita:0.7, invito:0.7,
           chiedi_soldi:0.7, offri_soldi:0.7, come_stai:0.5, saluto:0.5, addio:0.5, ringrazia:0.5};
  for(var i=0;i<scala.length;i++){
    var k=scala[i];
    if(a.intents[k] && a.intents[k]>=(MIN[k]||0.35) && r[k]){
      if(m.esauriti[k] && a.domanda && U.chance(0.5)) return {k:k, s:U.pick(GEN.finito[tono]), finito:true};
      return {k:k, s:prendi(m,k,r[k])};
    }
  }
  /* --- argomento di cui stai parlando --- */
  for(var j=0;j<a.argomenti.length;j++){
    var t=a.argomenti[j];
    if(r[t]){
      if(m.esauriti[t] && U.chance(0.45)) return {k:t, s:U.pick(GEN.finito[tono]), finito:true};
      return {k:t, s:prendi(m,t,r[t])};
    }
  }
  if(a.top && r[a.top]) return {k:a.top, s:prendi(m,a.top,r[a.top])};

  /* --- niente di riconoscibile: ma se c'è un filo aperto, lo tiene --- */
  if(N.sensato(a)<0.3) return {k:'nonsense', s:U.pick(GEN.nonsense)};
  if(m.filo && r[m.filo.arg] && U.chance(0.5))
    return {k:m.filo.arg, s:prendi(m,m.filo.arg,r[m.filo.arg]), segue:true};
  if(a.domanda) return {k:'dg', s:(r.domanda_generica?prendi(m,'domanda_generica',r.domanda_generica):U.pick(GEN.domanda_generica))};
  return {k:'vago', s:U.pick([
    "Non so cosa risponderti.|E quindi?|Dimmi di più.",
    "Mmh.|Continua.|Ti ascolto."])};
}

function segreto(c,m){
  if(!c.segreti||!c.segreti.length) return null;
  while(m.segreti<c.segreti.length && m.affinita>=c.segreti[m.segreti].a){
    var s=c.segreti[m.segreti]; m.segreti++;
    TV.emit('segreto',{id:c.id,n:m.segreti,txt:s.t});
    return s.t;
  }
  return null;
}

/* ---------------- API pubblica ---------------- */
P.respond=function(id, testo){
  var c=BY[id]; if(!c) return {msgs:[]};
  var m=TV.mem(id), a=N.analyze(testo), s=TV.state;
  var out=[], paura=s.paura;

  /* chi non risponde, non risponde mai */
  if(c.muto){
    m.turni++;
    var l=c.letto?U.pick(c.letto):null;
    return {msgs:[], letto:l, analisi:a};
  }

  /* lo sconosciuto ti rimanda indietro le tue parole */
  if(c.specchio){
    m.turni++;
    if(!U.chance(0.55)) return {msgs:[], letto:'consegnato', analisi:a};
    var eco = testo.trim().replace(/\?+$/,'').toUpperCase();
    if(eco.length>46) eco=eco.slice(0,46);
    var set=[ eco+'.', 'ANCHE LUI SCRISSE COSÌ.', 'TUTTO È VERO.', 'GUARDA LA FINESTRA.',
              'SEI ARRIVATO A '+U.ri(2,4)+' MINUTI.', 'NON SONO IO CHE TI SCRIVO.' ];
    TV.add('buio',1.2);
    return {msgs:[{t:U.pick(set), d:U.rnd(2.2,6.0)}], analisi:a, eco:true};
  }

  if(c.bloccato0 && !TV.flag('poliziaAperta')) return {msgs:[], letto:'consegnato', analisi:a};

  var d=assorbi(c,m,a);

  if(m.bloccato){
    m.turni++;
    if(U.chance(0.25)) out.push({t:U.pick(["Non scrivermi più.","Ho detto basta.","..."]), d:U.rnd(4,9)});
    return {msgs:out, analisi:a, delta:d, bloccato:true};
  }

  var b=bucket(c,m,a);
  var stile=ST[c.stile]||ST.neutro, acc=U.rnd(0.9,2.1);

  /* una riga alla volta, col tempo che serve a scriverla */
  function dire(testo,pausa){
    if(!testo) return;
    var txt=stile(U.fill(String(testo),{nome:m.fatti.nome||'', voc:c.voc||''}));
    out.push({t:txt, d:acc+(pausa||0)});
    acc += (pausa||0) + 0.9 + txt.length*0.035*(c.vel||1) + U.rnd(0,0.7);
    m.usate[testo]=1;
  }

  /* prima di rispondere: si ricorda di qualcosa che hai scritto */
  var cb=M.callback(c,m,a);
  if(cb && cb.t){
    dire(cb.t);
    if(cb.tieni) m.qAttesa=2;                 // la domanda resta in piedi
  }

  /* la risposta: fra le righe del banco, prima quelle non ancora dette */
  var tutte=String(b.s).split('|').filter(Boolean);
  var libereL=tutte.filter(function(x){ return !m.usate[x]; });
  var linee=libereL.length? libereL : tutte;
  if(linee.length>2) linee=U.shuffle(linee).slice(0,U.ri(1,2));
  else if(linee.length===2 && U.chance(0.45)) linee=[U.pick(linee)];
  linee.forEach(function(L){ dire(L); });

  /* un segreto quando la fiducia è abbastanza alta */
  var sg=segreto(c,m);
  if(sg) dire(sg, U.rnd(1.6,3.4));

  /* messaggio inquieto: più la paura sale, più i parenti scrivono cose sbagliate */
  if(c.inquieto && c.inquieto.length && U.chance(0.07+paura*0.33) && m.turni>2){
    dire(prendi(m,'_inquieto',c.inquieto), U.rnd(2.2,5.0));
    TV.add('buio',0.6);
  }

  /* una domanda, per tenere viva la conversazione (mai la stessa due volte) */
  m.qUsate = m.qUsate || {};
  if(b.usata){ m.domandaAperta=null; m.domandaKey=null; m.qAttesa=0; m.insistenze=0; }
  var libere=(c.q||[]).filter(function(q){return !m.qUsate[q];});
  if(libere.length && !a.domanda && !m.domandaAperta &&
     U.chance(0.2+c.tratti.loquacita*0.3) && m.umore!=='ostile' && m.umore!=='bloccato'){
    var q=U.pick(libere);
    m.qUsate[q]=1; m.domandaAperta=q; m.qAttesa=2; m.insistenze=0;
    m.domandaKey=M.chiaveDomanda(q);          // così capirà la tua risposta
    dire(q, U.rnd(1.2,2.6));
  } else if(m.domandaAperta){
    m.qAttesa=(m.qAttesa||0)-1;
    if(m.qAttesa<=0){ m.domandaAperta=null; m.domandaKey=null; m.insistito=0; }  // lascia perdere
  }

  m.haRisposto++;
  m.ultimoT=s.t;
  return {msgs:out, analisi:a, delta:d, umore:m.umore, ricordo:cb?cb.t:null};
};

/* messaggio spontaneo: usato dal "regista" */
P.spontaneo=function(id,kind){
  var c=BY[id]; if(!c||c.muto) return null;
  var m=TV.mem(id);
  var banche={
    apri:{
      mamma:["Sei sveglio? Ho visto che il computer è acceso dalla strada.","Non riesco a dormire. Tu?"],
      papa:["Sveglio?","Tua madre piangeva prima. Non dirglielo che te l'ho detto."],
      chiara:["sei sveglio? ho un brutto sogno in testa e nn passa","oh. c'è una cosa che devo dirti su matteo"],
      zia:["Tesoro, hai la luce accesa. Ti ho visto passare davanti alla finestra due volte.","Non dormo. Pensavo a tuo fratello."],
      nonna:["CHI HA CHIAMATO A CASA MIA ALLE TRE","SEI TU CHE SEI DAVANTI ALLA MIA FINESTRA"],
      giulia:["Scusa l'ora. Ho visto il tuo nome online e mi è venuto un tuffo al cuore.","Posso chiederti una cosa su Matteo? Stanotte non riesco a dormire."]
    },
    inquieto:{
      mamma:["Ma tu adesso sei in casa?","Perché la tua posizione dice che sei fuori?"],
      papa:["Guarda fuori e dimmi se c'è una macchina ferma."],
      chiara:["la luce di casa tua si accende e si spegne. la vedo da qui"],
      zia:["Hanno suonato al citofono di tutto il palazzo. Tutti tranne il tuo."],
      nonna:["ADESSO È ALLA TUA PORTA"],
      giulia:["Sono 3:14. Ti scrivo adesso perché è l'ora in cui scriveva lui."]
    }
  };
  var b=(banche[kind]||{})[id];
  if(!b) return null;
  var stile=ST[c.stile]||ST.neutro;
  m.scritto=true;
  return {msgs:[{t:stile(U.pick(b)), d:U.rnd(0.4,1.6)}]};
};

/* valutazione di un messaggio all'ispettore: vedi police.js */
P.persuasione=function(a){
  var L=a.leve, prof=TV.state.prove?TV.state.prove.profilo:{orgoglio:1,stanchezza:1,fede:1,dubbio:1};
  var sc=0, note=[];
  if(L.empatia>0){ sc += L.empatia*1.5*(prof.stanchezza||1); note.push('empatia'); }
  if(L.lusinga>0){ sc += L.lusinga*1.3*(prof.orgoglio||1); note.push('lusinga'); }
  if(L.dubbio>0){ sc += L.dubbio*1.6*(prof.dubbio||1); note.push('dubbio'); }
  if(L.colpa>0){ sc += L.colpa*0.7; note.push('colpa'); }
  if(L.corrompi>0){ sc -= 6; note.push('corruzione'); }
  if(L.minaccia>0){ sc -= 9; note.push('minaccia'); }
  if(L.confessa>0){ sc -= 14; note.push('confessione'); }
  if(a.crimine.sev>=3 && a.crimine.confessato) sc -= 12;
  if(a.urlo) sc -= 2;
  if(a.cortesia>0) sc += 1;
  if(a.len<4) sc -= 2;
  return {score:Math.round(sc*10)/10, note:note};
};
})(typeof window!=='undefined'?window:globalThis);

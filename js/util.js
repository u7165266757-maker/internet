/* util.js — base comune */
(function(root){
var TV = root.TV = root.TV || {};

var U = TV.U = {
  clamp:function(v,a,b){return v<a?a:(v>b?b:v);},
  lerp:function(a,b,t){return a+(b-a)*t;},
  rnd:function(a,b){return a+Math.random()*(b-a);},
  ri:function(a,b){return Math.floor(a+Math.random()*(b-a+1));},
  pick:function(arr){return arr[Math.floor(Math.random()*arr.length)];},
  chance:function(p){return Math.random()<p;},
  shuffle:function(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;},
  // "a|b|c" -> variante casuale
  v:function(s){ return s.indexOf('|')<0 ? s : U.pick(s.split('|')); },
  esc:function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});},
  pad:function(n){return (n<10?'0':'')+n;},
  // orologio di gioco: si parte alle 23:41
  clock:function(sec){
    var t = 23*3600+41*60 + Math.floor(sec);
    var h = Math.floor(t/3600)%24, m = Math.floor(t/60)%60;
    return U.pad(h)+':'+U.pad(m);
  },
  money:function(n){
    return '€ '+ (Math.round(n*100)/100).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  },
  el:function(tag,cls,html){
    var e=document.createElement(tag);
    if(cls)e.className=cls;
    if(html!=null)e.innerHTML=html;
    return e;
  },
  // sostituisce {nome} con i valori del contesto
  fill:function(s,ctx){
    return String(s).replace(/\{(\w+)\}/g,function(m,k){ return ctx && ctx[k]!=null ? ctx[k] : ''; });
  }
};

/* mini event bus */
var subs={};
TV.on=function(ev,fn){(subs[ev]=subs[ev]||[]).push(fn);return fn;};
TV.off=function(ev,fn){var a=subs[ev];if(!a)return;var i=a.indexOf(fn);if(i>=0)a.splice(i,1);};
TV.emit=function(ev,data){
  var a=subs[ev];if(!a)return;
  for(var i=0;i<a.length;i++){ try{a[i](data);}catch(e){ console.warn('[bus]',ev,e); } }
};

/* timer di gioco: sicuri anche se un callback aggiunge o annulla altri timer */
var timers=[];
TV.after=function(sec,fn,tag){
  var t={at:(TV.state?TV.state.t:0)+sec, fn:fn, tag:tag||''};
  timers.push(t); return t;
};
TV.every=function(sec,fn,tag){
  var t={at:(TV.state?TV.state.t:0)+sec, fn:fn, rep:sec, tag:tag||''};
  timers.push(t); return t;
};
TV.cancel=function(t){ if(t) t.dead=true; };
TV.cancelTag=function(tag){ for(var i=0;i<timers.length;i++) if(timers[i].tag===tag) timers[i].dead=true; };
TV.tickTimers=function(now){
  var pronti=[], i, t;
  for(i=0;i<timers.length;i++){
    t=timers[i];
    if(!t.dead && now>=t.at) pronti.push(t);
  }
  // via i morti e i non ripetuti che stanno per scattare
  timers=timers.filter(function(x){
    if(x.dead) return false;
    return !(x.rep===undefined && pronti.indexOf(x)>=0);
  });
  for(i=0;i<pronti.length;i++){
    t=pronti[i];
    if(t.dead) continue;
    if(t.rep) t.at=now+t.rep;
    try{ t.fn(); }catch(e){ console.warn('[timer]',t.tag,e); }
  }
};
})(typeof window!=='undefined'?window:globalThis);

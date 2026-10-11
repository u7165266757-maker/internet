/* audio.js — tutto sintetizzato in WebAudio, zero file esterni */
(function(root){
var TV = root.TV = root.TV || {};
var A = TV.Audio = { ready:false, ctx:null, master:null, muted:false };

function noiseBuf(ctx,sec){
  var n=Math.floor(ctx.sampleRate*sec), b=ctx.createBuffer(1,n,ctx.sampleRate), d=b.getChannelData(0);
  for(var i=0;i<n;i++) d[i]=Math.random()*2-1;
  return b;
}

A.init=function(){
  if(A.ready) return;
  var Ctx = root.AudioContext || root.webkitAudioContext;
  if(!Ctx) return;
  try{ A.ctx = new Ctx(); }catch(e){ console.warn('audio non disponibile',e); return; }
  var ctx = A.ctx;
  var m = A.master = ctx.createGain(); m.gain.value=0.9; m.connect(ctx.destination);

  A.nb = noiseBuf(ctx,2.2);

  // --- pioggia fuori dalla finestra (rumore filtrato in loop) ---
  var rain = ctx.createBufferSource(); rain.buffer=A.nb; rain.loop=true;
  var rf = ctx.createBiquadFilter(); rf.type='bandpass'; rf.frequency.value=1900; rf.Q.value=0.6;
  var rg = A.rainGain = ctx.createGain(); rg.gain.value=0.045;
  rain.connect(rf); rf.connect(rg); rg.connect(m); rain.start();

  // --- ronzio del monitor / frigorifero ---
  var hum = ctx.createOscillator(); hum.type='sawtooth'; hum.frequency.value=50;
  var hf = ctx.createBiquadFilter(); hf.type='lowpass'; hf.frequency.value=160;
  var hg = A.humGain = ctx.createGain(); hg.gain.value=0.0;
  hum.connect(hf); hf.connect(hg); hg.connect(m); hum.start();

  // --- drone di tensione (sale con la paura) ---
  var d1=ctx.createOscillator(); d1.type='sine'; d1.frequency.value=58;
  var d2=ctx.createOscillator(); d2.type='sine'; d2.frequency.value=58.7;
  var dg=A.droneGain=ctx.createGain(); dg.gain.value=0;
  d1.connect(dg); d2.connect(dg); dg.connect(m); d1.start(); d2.start();
  A.drone=[d1,d2];

  A.ready=true;
};

A.resume=function(){ if(A.ctx && A.ctx.state==='suspended') A.ctx.resume(); };
A.monitorOn=function(){ if(A.ready) A.humGain.gain.setTargetAtTime(0.035,A.ctx.currentTime,0.4); };
A.setFear=function(f){ // 0..1
  if(!A.ready) return;
  var t=A.ctx.currentTime;
  A.droneGain.gain.setTargetAtTime(0.012+f*0.075,t,1.2);
  A.drone[0].frequency.setTargetAtTime(58-f*14,t,2.0);
  A.drone[1].frequency.setTargetAtTime(58.7-f*13.2,t,2.0);
  A.rainGain.gain.setTargetAtTime(0.045+f*0.05,t,2.0);
};

function env(g,t,a,p,r,peak){
  g.gain.setValueAtTime(0,t);
  g.gain.linearRampToValueAtTime(peak,t+a);
  g.gain.setValueAtTime(peak,t+a+p);
  g.gain.exponentialRampToValueAtTime(0.0001,t+a+p+r);
}

A.sfx=function(name,opt){
  if(!A.ready || A.muted) return;
  var ctx=A.ctx, t=ctx.currentTime, g, o, f, s; opt=opt||{};
  switch(name){
    case 'key':
      s=ctx.createBufferSource(); s.buffer=A.nb; s.playbackRate.value=2.4;
      f=ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=2600+Math.random()*1400; f.Q.value=3;
      g=ctx.createGain(); env(g,t,0.001,0.004,0.035,0.085);
      s.connect(f); f.connect(g); g.connect(A.master); s.start(t); s.stop(t+0.07);
      break;
    case 'click':
      s=ctx.createBufferSource(); s.buffer=A.nb; s.playbackRate.value=1.6;
      f=ctx.createBiquadFilter(); f.type='highpass'; f.frequency.value=1200;
      g=ctx.createGain(); env(g,t,0.001,0.003,0.03,0.07);
      s.connect(f); f.connect(g); g.connect(A.master); s.start(t); s.stop(t+0.06);
      break;
    case 'msg':
      o=ctx.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(880,t);
      o.frequency.exponentialRampToValueAtTime(1320,t+0.09);
      g=ctx.createGain(); env(g,t,0.004,0.03,0.18,0.085);
      o.connect(g); g.connect(A.master); o.start(t); o.stop(t+0.35);
      break;
    case 'mail':
      [660,990].forEach(function(fr,i){
        o=ctx.createOscillator(); o.type='triangle'; o.frequency.value=fr;
        g=ctx.createGain(); env(g,t+i*0.11,0.006,0.04,0.2,0.07);
        o.connect(g); g.connect(A.master); o.start(t+i*0.11); o.stop(t+i*0.11+0.3);
      });
      break;
    case 'bad':
      o=ctx.createOscillator(); o.type='sawtooth'; o.frequency.setValueAtTime(220,t);
      o.frequency.exponentialRampToValueAtTime(70,t+0.5);
      f=ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=900;
      g=ctx.createGain(); env(g,t,0.01,0.1,0.5,0.11);
      o.connect(f); f.connect(g); g.connect(A.master); o.start(t); o.stop(t+0.7);
      break;
    case 'ring': // telefono che squilla, 2 tocchi
      for(var k=0;k<2;k++){
        (function(k){
          var tt=t+k*0.5;
          var oo=ctx.createOscillator(); oo.type='sine'; oo.frequency.value=440;
          var mo=ctx.createOscillator(); mo.type='sine'; mo.frequency.value=22;
          var mg=ctx.createGain(); mg.gain.value=90;
          mo.connect(mg); mg.connect(oo.frequency);
          var gg=ctx.createGain(); env(gg,tt,0.02,0.33,0.12,0.075);
          oo.connect(gg); gg.connect(A.master); oo.start(tt); oo.stop(tt+0.5); mo.start(tt); mo.stop(tt+0.5);
        })(k);
      }
      break;
    case 'static':
      s=ctx.createBufferSource(); s.buffer=A.nb; s.loop=true;
      f=ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=1200; f.Q.value=0.8;
      g=ctx.createGain(); g.gain.value=0; g.gain.linearRampToValueAtTime(0.06,t+0.2);
      var dur=opt.dur||2.5;
      g.gain.setValueAtTime(0.06,t+dur-0.3); g.gain.linearRampToValueAtTime(0,t+dur);
      s.connect(f); f.connect(g); g.connect(A.master); s.start(t); s.stop(t+dur);
      break;
    case 'breath':
      s=ctx.createBufferSource(); s.buffer=A.nb; s.playbackRate.value=0.35;
      f=ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=480; f.Q.value=1.4;
      g=ctx.createGain(); env(g,t,0.5,0.3,0.9,0.1);
      s.connect(f); f.connect(g); g.connect(A.master); s.start(t); s.stop(t+2.0);
      break;
    case 'whisper':
      s=ctx.createBufferSource(); s.buffer=A.nb; s.playbackRate.value=0.7;
      f=ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=1500; f.Q.value=5;
      var lfo=ctx.createOscillator(); lfo.type='sine'; lfo.frequency.value=5.5;
      var lg=ctx.createGain(); lg.gain.value=700; lfo.connect(lg); lg.connect(f.frequency);
      g=ctx.createGain(); env(g,t,0.3,0.6,1.1,0.055);
      s.connect(f); f.connect(g); g.connect(A.master);
      s.start(t); s.stop(t+2.1); lfo.start(t); lfo.stop(t+2.1);
      break;
    case 'knock':
      for(var i=0;i<3;i++){
        (function(i){
          var tt=t+i*0.26;
          var ss=ctx.createBufferSource(); ss.buffer=A.nb; ss.playbackRate.value=0.5;
          var ff=ctx.createBiquadFilter(); ff.type='lowpass'; ff.frequency.value=330;
          var gg=ctx.createGain(); env(gg,tt,0.004,0.01,0.14,0.3);
          ss.connect(ff); ff.connect(gg); gg.connect(A.master); ss.start(tt); ss.stop(tt+0.2);
        })(i);
      }
      break;
    case 'bell': // campanello
      [784,587].forEach(function(fr,i){
        var tt=t+i*0.45;
        o=ctx.createOscillator(); o.type='sine'; o.frequency.value=fr;
        g=ctx.createGain(); env(g,tt,0.01,0.1,0.9,0.1);
        o.connect(g); g.connect(A.master); o.start(tt); o.stop(tt+1.1);
      });
      break;
    case 'heart':
      [0,0.22].forEach(function(off,i){
        o=ctx.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(70,t+off);
        o.frequency.exponentialRampToValueAtTime(38,t+off+0.16);
        g=ctx.createGain(); env(g,t+off,0.008,0.02,0.16,i?0.14:0.2);
        o.connect(g); g.connect(A.master); o.start(t+off); o.stop(t+off+0.3);
      });
      break;
    case 'glitch':
      s=ctx.createBufferSource(); s.buffer=A.nb; s.playbackRate.value=opt.r||3.2;
      f=ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=3000; f.Q.value=0.7;
      g=ctx.createGain(); env(g,t,0.002,0.05,0.09,0.1);
      s.connect(f); f.connect(g); g.connect(A.master); s.start(t); s.stop(t+0.2);
      break;
    case 'gun':
      s=ctx.createBufferSource(); s.buffer=A.nb;
      f=ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.setValueAtTime(5200,t);
      f.frequency.exponentialRampToValueAtTime(300,t+0.35);
      g=ctx.createGain(); env(g,t,0.001,0.02,0.55,0.95);
      s.connect(f); f.connect(g); g.connect(A.master); s.start(t); s.stop(t+0.8);
      o=ctx.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(90,t);
      o.frequency.exponentialRampToValueAtTime(26,t+0.5);
      var g2=ctx.createGain(); env(g2,t,0.002,0.03,0.6,0.7);
      o.connect(g2); g2.connect(A.master); o.start(t); o.stop(t+0.9);
      break;
    case 'glass':
      for(var q=0;q<9;q++){
        (function(q){
          var tt=t+Math.random()*0.35;
          var oo=ctx.createOscillator(); oo.type='triangle'; oo.frequency.value=1600+Math.random()*3200;
          var gg=ctx.createGain(); env(gg,tt,0.002,0.01,0.2+Math.random()*0.3,0.045);
          oo.connect(gg); gg.connect(A.master); oo.start(tt); oo.stop(tt+0.6);
        })(q);
      }
      break;
    case 'siren':
      o=ctx.createOscillator(); o.type='square'; o.frequency.value=620;
      var sl=ctx.createOscillator(); sl.type='sine'; sl.frequency.value=0.7;
      var slg=ctx.createGain(); slg.gain.value=180; sl.connect(slg); slg.connect(o.frequency);
      g=ctx.createGain(); g.gain.value=0; g.gain.linearRampToValueAtTime(0.045,t+1);
      var D=opt.dur||9; g.gain.setValueAtTime(0.045,t+D-1.5); g.gain.linearRampToValueAtTime(0,t+D);
      f=ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=1100;
      o.connect(f); f.connect(g); g.connect(A.master);
      o.start(t); o.stop(t+D); sl.start(t); sl.stop(t+D);
      break;
    case 'flat': // elettrocardiogramma piatto
      o=ctx.createOscillator(); o.type='sine'; o.frequency.value=1000;
      g=ctx.createGain(); g.gain.value=0; g.gain.linearRampToValueAtTime(0.05,t+0.1);
      g.gain.setValueAtTime(0.05,t+4.5); g.gain.linearRampToValueAtTime(0,t+6.5);
      o.connect(g); g.connect(A.master); o.start(t); o.stop(t+6.6);
      break;
  }
};
})(typeof window!=='undefined'?window:globalThis);

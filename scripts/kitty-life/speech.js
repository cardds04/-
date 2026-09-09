(function(root){'use strict';const synth=root.speechSynthesis;let voices=[],active=null,settle=null,request=0;
const bad=/Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Deranged|Good News|Hysterical|Jester|Junior|Organ|Ralph|Trinoids|Whisper|Zarvox|Wobble|Superstar|\bFred\b|\bKathy\b/i;
const quality=v=>{const n=v.name+' '+v.voiceURI;return (/^en[-_]US$/i.test(v.lang)?100:0)+(/Premium|Neural|Natural|Online/i.test(n)?80:0)+(/Enhanced/i.test(n)?65:0)+(/Google US English/i.test(n)?60:0)+(/Samantha|Ava|Allison|Nicky|Susan|Zoe/i.test(n)?30:0)+(/compact/i.test(n)?-20:0);};
const refresh=()=>{voices=synth?synth.getVoices().filter(v=>/^en(?:[-_]|$)/i.test(v.lang)&&!bad.test(v.name)).sort((a,b)=>quality(b)-quality(a)):[];return voices;};
const preferred=id=>{refresh();return voices.find(v=>v.voiceURI===id)||voices[0]||null;};
function stop(){request++;if(settle)settle('cancelled');if(synth)synth.cancel();active=null;}
function speak(text,{enabled=true,voice=''}={}){stop();const id=request;if(!synth||!enabled)return Promise.resolve('unavailable');return new Promise(resolve=>{let finished=false,timer=null;const cleanup=()=>{if(timer!==null)root.clearTimeout(timer);synth.removeEventListener?.('voiceschanged',tryStart);};const done=status=>{if(finished)return;finished=true;cleanup();if(settle===done){active=null;settle=null;}resolve(status);};settle=done;
function tryStart(){if(finished||id!==request)return;const selected=preferred(voice);if(!selected)return;cleanup();const u=new root.SpeechSynthesisUtterance(String(text).replace(/[♡✦]/g,'').replace(/[’‘]/g,"'"));u.voice=selected;u.lang=selected.lang;u.rate=1;u.pitch=1;u.volume=1;active=u;u.onend=()=>done('ended');u.onerror=()=>done('error');try{if(synth.paused)synth.resume();synth.speak(u);}catch{done('error')}}
if(preferred(voice)){tryStart();}else{synth.addEventListener?.('voiceschanged',tryStart);timer=root.setTimeout(()=>{if(!active)done('unavailable');},1800);}
});}
let audio=null;
function wrong(enabled=true){if(!enabled)return;try{const AC=root.AudioContext||root.webkitAudioContext;if(!AC)return;audio=audio||new AC();audio.resume().catch(()=>{});for(let i=0;i<2;i++){const t=audio.currentTime+i*.18,o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=440;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.12,t+.015);g.gain.linearRampToValueAtTime(0,t+.13);o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+.14);o.onended=()=>{o.disconnect();g.disconnect()}}}catch{}}

if(synth){refresh();synth.addEventListener?.('voiceschanged',refresh);}
root.KittySpeech={speak,stop,wrong,voices:refresh,preferred};
})(typeof globalThis!=='undefined'?globalThis:this);

(function(root){'use strict';const synth=root.speechSynthesis;let voices=[],active=null,settle=null;const bad=/Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Deranged|Good News|Hysterical|Jester|Junior|Organ|Ralph|Trinoids|Whisper|Zarvox|Wobble/i;
const refresh=()=>{voices=synth?synth.getVoices().filter(v=>/^en[-_]/i.test(v.lang)&&!bad.test(v.name)):[];return voices;};
const preferred=id=>{refresh();return voices.find(v=>v.voiceURI===id)||voices.find(v=>/Samantha/i.test(v.name)&&/^en[-_]US$/i.test(v.lang))||voices.find(v=>/Google US English|Natural|Premium|Enhanced/i.test(v.name)&&/^en[-_]US$/i.test(v.lang))||voices.find(v=>/^en[-_]US$/i.test(v.lang))||voices[0]||null;};
function stop(){if(settle)settle("cancelled");if(synth)synth.cancel();active=null;}
function speak(text,{enabled=true,voice=''}={}){stop();if(!synth||!enabled)return Promise.resolve('unavailable');return new Promise(resolve=>{const u=new root.SpeechSynthesisUtterance(String(text).replace(/[♡✦]/g,'').replace(/[’‘]/g,"'"));const selected=preferred(voice);if(selected)u.voice=selected;u.lang=selected?.lang||'en-US';u.rate=1;u.pitch=1;u.volume=.9;active=u;const done=status=>{if(active===u){active=null;settle=null;}resolve(status)};settle=done;u.onend=()=>done('ended');u.onerror=()=>done('error');try{if(synth.paused)synth.resume();synth.speak(u);}catch{done('error')}});}
let audio=null;
function wrong(enabled=true){if(!enabled)return;try{const AC=root.AudioContext||root.webkitAudioContext;if(!AC)return;audio=audio||new AC();audio.resume().catch(()=>{});for(let i=0;i<2;i++){const t=audio.currentTime+i*.18,o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=440;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.12,t+.015);g.gain.linearRampToValueAtTime(0,t+.13);o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+.14);o.onended=()=>{o.disconnect();g.disconnect()}}}catch{}}

if(synth){refresh();synth.addEventListener?.('voiceschanged',refresh);}
root.KittySpeech={speak,stop,wrong,voices:refresh,preferred};
})(typeof globalThis!=='undefined'?globalThis:this);

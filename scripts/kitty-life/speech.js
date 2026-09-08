(function(root){'use strict';const synth=root.speechSynthesis;let voices=[],active=null;const bad=/Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Deranged|Good News|Hysterical|Jester|Junior|Organ|Ralph|Trinoids|Whisper|Zarvox|Wobble/i;
const refresh=()=>{voices=synth?synth.getVoices().filter(v=>/^en[-_]/i.test(v.lang)&&!bad.test(v.name)):[];return voices;};
const preferred=id=>{refresh();return voices.find(v=>v.voiceURI===id)||voices.find(v=>/Samantha/i.test(v.name)&&/^en[-_]US$/i.test(v.lang))||voices.find(v=>/Google US English|Natural|Premium|Enhanced/i.test(v.name)&&/^en[-_]US$/i.test(v.lang))||voices.find(v=>/^en[-_]US$/i.test(v.lang))||voices[0]||null;};
function stop(){if(synth)synth.cancel();active=null;}
function speak(text,{enabled=true,voice=''}={}){if(!synth||!enabled)return;stop();const u=new root.SpeechSynthesisUtterance(String(text).replace(/[♡✦]/g,'').replace(/[’‘]/g,"'"));const selected=preferred(voice);if(selected)u.voice=selected;u.lang=selected?.lang||'en-US';u.rate=1;u.pitch=1;u.volume=.9;active=u;u.onend=()=>{if(active===u)active=null};u.onerror=()=>{if(active===u)active=null};if(synth.paused)synth.resume();synth.speak(u);}
if(synth){refresh();synth.addEventListener?.('voiceschanged',refresh);}
root.KittySpeech={speak,stop,voices:refresh,preferred};
})(typeof globalThis!=='undefined'?globalThis:this);

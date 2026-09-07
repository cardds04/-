// One English utterance at a time; canceled turns must never affect the next one.
class EnglishSpeaker {
 constructor({synth,Utterance,onState=()=>{},onError=()=>{}}={}) {
  Object.assign(this,{synth,Utterance,onState,onError});this.current=null;this.serial=0;
 }
 stop(){this.serial++;this.current=null;try{this.synth?.cancel()}catch{}this.onState(null,'idle');}
 speak(text,owner=null){
  this.stop();if(!text?.trim())return false;
  if(!this.synth||!this.Utterance){this.onError('unavailable',owner);return false;}
  const serial=this.serial;
  try{
   const u=new this.Utterance(text.trim()),voices=this.synth.getVoices();
   u.lang='en-US';u.rate=.82;u.pitch=1;u.volume=1;
   const voice=voices.find(v=>/^en[-_]US$/i.test(v.lang))||voices.find(v=>/^en\b/i.test(v.lang));
   if(voice)u.voice=voice;
   this.current={utterance:u,owner,text:u.text};this.onState(owner,'pending');
   u.onstart=()=>{if(serial===this.serial)this.onState(owner,'speaking')};
   u.onend=()=>{if(serial===this.serial){this.current=null;this.onState(null,'idle')}};
   u.onerror=e=>{if(serial!==this.serial)return;this.current=null;this.onState(null,'idle');if(!['canceled','interrupted'].includes(e.error))this.onError(e.error,owner)};
   if(this.synth.paused)this.synth.resume();
   this.synth.speak(u);return true;
  }catch{this.current=null;this.onState(null,'idle');this.onError('unavailable',owner);return false;}
 }
}
module.exports={EnglishSpeaker};

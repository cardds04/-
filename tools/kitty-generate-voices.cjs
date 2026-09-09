/* Run with OPENAI_API_KEY in the environment. Existing clips are reused. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),{generate,normalize}=require('../lib/kitty-natural-tts.cjs');
const lines=[...new Set(require('../lib/kitty-speech-lines.json').filter(t=>!t.includes('{')).map(normalize))];
const dir=path.join(root,'assets/animal-town/voices');fs.mkdirSync(dir,{recursive:true});let index=0;const manifest={};
async function worker(){while(index<lines.length){const text=lines[index++],id=crypto.createHash('sha256').update(text).digest('hex').slice(0,20),file='assets/animal-town/voices/'+id+'.mp3';if(!fs.existsSync(path.join(root,file)))fs.writeFileSync(path.join(root,file),await generate(text));manifest[text]=file;}}
Promise.all([worker(),worker(),worker()]).then(()=>{fs.writeFileSync(path.join(dir,'manifest.js'),'window.KittyVoiceFiles='+JSON.stringify(manifest)+';');console.log(Object.keys(manifest).length+' English clips ready')}).catch(e=>{console.error(e.message);process.exitCode=1});

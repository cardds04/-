const { regions } = require('./village-lessons.json');
const REPEATS = 3;
const allStops = regions.flatMap(region => region.stops);
const allAnswers = [...new Set(allStops.flatMap(stop => stop.lesson.map(line => line[2])))];
const normalize = text => String(text || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
function matchesAnswer(heard, target) {
  const a = normalize(heard), b = normalize(target);
  if (!a || !b) return false;
  const aliases = { 'im good':'i am good', 'yes im':'yes i am', 'thankyou':'thank you', 'to sunny village':'to sunny village' };
  return (aliases[a] || a) === (aliases[b] || b);
}
function newProgress() { return { version:2, avatar:'female-a', region:'village', completed:[], visits:['village'], repetitions:{}, lessonProgress:{}, journeys:0, coins:0, sound:true }; }
function sanitizeProgress(raw) {
  const p=newProgress();if (!raw || typeof raw!=='object') return p;
  p.avatar=['female-a','male-a'].includes(raw.avatar)?raw.avatar:p.avatar;
  p.region=regions.some(r=>r.id===raw.region)?raw.region:p.region;
  p.completed=[...new Set((Array.isArray(raw.completed)?raw.completed:[]).filter(id=>allStops.some(s=>s.id===id)))];
  p.visits=[...new Set(['village',...(Array.isArray(raw.visits)?raw.visits:[]).filter(id=>regions.some(r=>r.id===id))])];
  p.journeys=Math.max(0,Math.min(99999,Math.floor(Number(raw.journeys)||0)));p.coins=Math.max(0,Math.min(999999,Math.floor(Number(raw.coins)||0)));p.sound=raw.sound!==false;
  for(const answer of allAnswers)p.repetitions[answer]=Math.max(0,Math.min(99999,Math.floor(Number(raw.repetitions?.[answer])||0)));
  for(const stop of allStops){const entry=raw.lessonProgress?.[stop.id];if(entry && Array.isArray(entry.counts))p.lessonProgress[stop.id]={counts:stop.lesson.map((_,i)=>Math.max(0,Math.min(REPEATS,Math.floor(Number(entry.counts[i])||0))))};}
  return p;
}
function recordRepeat(progress, stopId, phraseIndex) {
  const stop=allStops.find(s=>s.id===stopId);if(!stop || !Number.isInteger(phraseIndex)||!stop.lesson[phraseIndex])return false;
  const entry=progress.lessonProgress[stopId] ||= { counts:stop.lesson.map(()=>0) };
  if(entry.counts[phraseIndex]>=REPEATS)return false;
  if(phraseIndex>0 && entry.counts.slice(0,phraseIndex).some(n=>n<REPEATS))return false;
  entry.counts[phraseIndex]++;const answer=stop.lesson[phraseIndex][2];progress.repetitions[answer]=(progress.repetitions[answer]||0)+1;return true;
}
function finishLesson(progress, stopId) {
  const stop=allStops.find(s=>s.id===stopId);const e=progress.lessonProgress[stopId];
  if(!stop || !e || e.counts.length!==stop.lesson.length || e.counts.some(n=>n<REPEATS))return null;
  const first=!progress.completed.includes(stopId);if(first)progress.completed.push(stopId);
  const coins=first?20:5;progress.coins+=coins;delete progress.lessonProgress[stopId];return {first,coins};
}
function isBlocked(x,z,obstacles,radius=.32) {
  return Math.abs(x)>24 || Math.abs(z)>24 || obstacles.some(o=>x>o.minX-radius && x<o.maxX+radius && z>o.minZ-radius && z<o.maxZ+radius);
}
// Grid A*: prevents paths through buildings and diagonal corner cutting.
function findPath(start,end,obstacles,step=1) {
  const key=(x,z)=>`${x},${z}`,snap=v=>Math.round(v/step),sx=snap(start.x),sz=snap(start.z),ex=snap(end.x),ez=snap(end.z);
  const blocked=(x,z)=>isBlocked(x*step,z*step,obstacles,.4);
  if(blocked(ex,ez))return [];
  const initial={x:sx,z:sz,g:0,f:0,parent:null};let open=[initial],best=new Map([[key(sx,sz),0]]),closed=new Set();let count=0;
  while(open.length&&count++<12000){open.sort((a,b)=>a.f-b.f);const n=open.shift(),nk=key(n.x,n.z);if(closed.has(nk))continue;closed.add(nk);
    if(n.x===ex&&n.z===ez){const path=[];let p=n;while(p.parent){path.push({x:p.x*step,z:p.z*step});p=p.parent}path.reverse();if(!isBlocked(end.x,end.z,obstacles,.4))path.push({x:end.x,z:end.z});return path;}
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const x=n.x+dx,z=n.z+dz,k=key(x,z);if(closed.has(k)||blocked(x,z)||(dx&&dz&&(blocked(n.x+dx,n.z)||blocked(n.x,n.z+dz))))continue;
      const g=n.g+Math.hypot(dx,dz);if(g>=(best.get(k)??Infinity))continue;best.set(k,g);open.push({x,z,g,f:g+Math.hypot(ex-x,ez-z),parent:n});}
  }return [];
}
module.exports={regions,allStops,allAnswers,REPEATS,normalize,matchesAnswer,newProgress,sanitizeProgress,recordRepeat,finishLesson,isBlocked,findPath};

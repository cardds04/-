const {items,quests,questions,monsters}=require('./data.cjs');
const thresholds=[0,50,130,240,380,560,800,1100,1500,2000];
const integer=(v,max=999999)=>Number.isFinite(Number(v))?Math.max(0,Math.min(max,Math.floor(Number(v)))):0;
const level=p=>thresholds.filter(n=>p.xp>=n).length;
const stats=p=>({level:level(p),maxHp:90+(level(p)-1)*12,attack:19+(level(p)-1)*4+(items.find(i=>i.id===p.weapon)?.atk||0),defense:items.find(i=>i.id===p.outfit)?.def||0});
function fresh(){return {version:1,avatar:'mina',map:'village',gold:0,xp:0,hp:90,step:0,owned:['traveler','wood'],outfit:'traveler',weapon:'wood',kills:[],unlocked:['village','forest'],stars:[],key:false,festival:false,choices:{},learned:{},mistakes:{},sound:true,battles:0};}
function sanitize(raw,legacy){const p=fresh();if(!raw||typeof raw!=='object'){if(legacy){p.avatar=legacy.avatar==='male-a'?'jun':'mina';p.sound=legacy.sound!==false;}return p;}
 p.gold=integer(raw.gold);p.xp=integer(raw.xp,100000);p.step=integer(raw.step,quests.length);p.avatar=raw.avatar==='jun'?'jun':'mina';p.sound=raw.sound!==false;
 p.owned=[...new Set([...p.owned,...(Array.isArray(raw.owned)?raw.owned:[]).filter(id=>items.some(i=>i.id===id))])];for(const slot of ['outfit','weapon'])if(p.owned.includes(raw[slot])&&items.some(i=>i.id===raw[slot]&&i.slot===slot))p[slot]=raw[slot];
 p.hp=Math.min(stats(p).maxHp,integer(raw.hp,stats(p).maxHp));p.kills=[...new Set((Array.isArray(raw.kills)?raw.kills:[]).filter(id=>monsters[id]))];p.battles=integer(raw.battles);if(raw.choices?.['forest-chest']===true)p.choices['forest-chest']=true;
 // Story gates are derived from completed milestones, never from legacy lesson badges.
 if(p.step>=4)p.unlocked.push('coast');if(p.step>=7)p.unlocked.push('mountain');p.key=p.step>=9;p.festival=p.step>=11;
 if(p.step>=3)p.stars.push('sun');if(p.step>=6)p.stars.push('sea');if(p.step>=10)p.stars.push('moon');
 p.map=canEnter(p,raw.map)?raw.map:'village';for(const q of questions){p.learned[q.id]=integer(raw.learned?.[q.id],99999);p.mistakes[q.id]=integer(raw.mistakes?.[q.id],99999);}return p;
}
function currentQuest(p){return quests[p.step]||null;}
function canEnter(p,id){if(['village','forest','smith','tailor','home'].includes(id))return true;if(['coast','inn'].includes(id))return p.unlocked.includes('coast');if(['mountain','lodge'].includes(id))return p.unlocked.includes('mountain');if(id==='ruins')return p.key&&p.unlocked.includes('mountain');return false;}
function reward(p,gold,xp){const before=level(p);p.gold+=gold;p.xp+=xp;const after=level(p);if(after>before)p.hp=stats(p).maxHp;return {gold,xp,levelUp:after>before,level:after};}
function finishQuest(p,event){const q=currentQuest(p);if(!q)return null;let valid=false;
 if(q.type==='talk')valid=event.type==='talk'&&event.target===q.target&&event.quest===q.id;
 if(q.type==='buy')valid=event.type==='buy'&&items.some(i=>i.id===event.item&&i.slot==='weapon'&&i.price>0)&&p.owned.includes(event.item);
 if(q.type==='kills')valid=event.type==='kill'&&q.needs.every(id=>p.kills.includes(id));
 if(q.type==='interact')valid=event.type==='interact'&&event.target===q.target&&(q.id!=='beacon'||p.stars.length===3);
 if(!valid||p.map!==q.map)return null;p.step++;if(q.star&&!p.stars.includes(q.star))p.stars.push(q.star);if(q.unlock&&!p.unlocked.includes(q.unlock))p.unlocked.push(q.unlock);if(q.id==='key')p.key=true;if(q.festival)p.festival=true;
 return {...reward(p,q.gold,q.xp),quest:q};
}
function purchase(p,id,shop){const i=items.find(i=>i.id===id);if(!i||i.slot!==shop||i.price<=0)return {ok:false,reason:'이 상점에서 살 수 없어요.'};if((shop==='weapon'&&p.map!=='smith')||(shop==='outfit'&&p.map!=='tailor'))return {ok:false,reason:'상점 안에서 구입해요.'};if(p.owned.includes(id))return {ok:false,reason:'이미 가지고 있어요.'};if(i.festival&&!p.festival)return {ok:false,reason:'별빛 축제를 되찾으면 열려요.'};if(p.gold<i.price)return {ok:false,reason:'골드가 부족해요.'};p.gold-=i.price;p.owned.push(id);p[i.slot]=id;return {ok:true,item:i,quest:finishQuest(p,{type:'buy',item:id})};}
function equip(p,id){const i=items.find(i=>i.id===id);if(!i||!p.owned.includes(id))return false;p[i.slot]=id;return true;}
function pool(p){const tier=Math.min(10,level(p));return questions.filter(q=>q.tier===tier||q.tier===Math.max(1,tier-1));}
function nextQuestion(p,used=[],rng=Math.random){let candidates=pool(p).filter(q=>!used.includes(q.id));if(!candidates.length)candidates=pool(p);const retry=candidates.filter(q=>(p.mistakes[q.id]||0)>(p.learned[q.id]||0));const source=retry.length?retry:candidates;return source[Math.floor(rng()*source.length)%source.length];}
function beginBattle(p,id,rng=Math.random){const m=monsters[id];if(!m||m.map!==p.map||!canEnter(p,p.map)||p.hp<=0)return null;const maxHp=m.hp+Math.max(0,level(p)-3)*9;return {id,hp:maxHp,maxHp,round:0,combo:0,status:'active',used:[],question:nextQuestion(p,[],rng).id};}
function answerBattle(p,b,answer){if(!b||b.status!=='active'||b.awaitingNext)return null;const q=questions.find(x=>x.id===b.question);if(!q||![q.answer,...q.wrong].includes(answer))return null;const correct=answer===q.answer;b.awaitingNext=true;b.round++;b.used.push(q.id);
 if(correct){p.learned[q.id]=(p.learned[q.id]||0)+1;b.combo++;const damage=stats(p).attack+Math.min(3,b.combo-1)*4;b.hp=Math.max(0,b.hp-damage);if(b.hp===0){b.status='won';if(!p.kills.includes(b.id))p.kills.push(b.id);p.battles++;const m=monsters[b.id],earned=reward(p,m.gold,m.xp),quest=finishQuest(p,{type:'kill',target:b.id});return {correct,damage,won:true,...earned,quest};}return {correct,damage};}
 p.mistakes[q.id]=(p.mistakes[q.id]||0)+1;b.combo=0;const damage=Math.max(3,monsters[b.id].attack-stats(p).defense);p.hp=Math.max(0,p.hp-damage);if(!p.hp)b.status='lost';return {correct,damage,lost:!p.hp,answer:q.answer};
}
function advanceBattle(p,b,rng=Math.random){if(!b||b.status!=='active'||!b.awaitingNext)return null;b.awaitingNext=false;b.question=nextQuestion(p,b.used,rng).id;return b.question;}
function rest(p){p.hp=stats(p).maxHp;return p.hp;}
module.exports={items,quests,questions,monsters,thresholds,fresh,sanitize,level,stats,currentQuest,canEnter,reward,finishQuest,purchase,equip,pool,nextQuestion,beginBattle,answerBattle,advanceBattle,rest};

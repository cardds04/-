const test=require('node:test'),assert=require('node:assert/strict');
const L=require('../scripts/english-travel/village-logic.cjs');
test('every destination has three very short, answer-first lessons',()=>{
 assert.equal(L.regions.length,3);assert.equal(L.allStops.length,9);
 for(const s of L.allStops){assert.equal(s.lesson.length,3);for(const l of s.lesson){assert.equal(l.length,4);assert.ok(l.every(Boolean));assert.ok(L.normalize(l[2]).split(' ').length<=5,l[2]);}}
});
test('recognition accepts punctuation/case and useful contraction, rejects unrelated and empty speech',()=>{
 assert.ok(L.matchesAnswer(' water please! ','Water, please.'));assert.ok(L.matchesAnswer("I'm good.",'I am good.'));
 assert.equal(L.matchesAnswer('water','Water, please.'),false);assert.equal(L.matchesAnswer('I want pizza','Water, please.'),false);assert.equal(L.matchesAnswer('','Hi!'),false);
});
test('three repeats per phrase, ordered completion, and no duplicate reward',()=>{
 const p=L.newProgress(),s=L.allStops[0];assert.equal(L.recordRepeat(p,s.id,2),false);assert.equal(L.finishLesson(p,s.id),null);
 for(let i=0;i<3;i++){for(let n=0;n<3;n++)assert.ok(L.recordRepeat(p,s.id,i));assert.equal(L.recordRepeat(p,s.id,i),false);}
 assert.deepEqual(L.finishLesson(p,s.id),{first:true,coins:20});assert.equal(L.finishLesson(p,s.id),null);assert.equal(p.coins,20);assert.equal(p.repetitions['Water, please.'],3);
});
test('saved partial practice resumes; malformed and legacy values cannot inflate completion',()=>{
 const p=L.newProgress();L.recordRepeat(p,'village-cafe',0);const restored=L.sanitizeProgress(JSON.parse(JSON.stringify(p)));assert.equal(restored.lessonProgress['village-cafe'].counts[0],1);
 const dirty=L.sanitizeProgress({completed:['wrong','village-cafe','village-cafe'],region:'nope',coins:-5,lessonProgress:{'village-cafe':{counts:[99,-1,'oops']}}});assert.equal(dirty.region,'village');assert.deepEqual(dirty.completed,['village-cafe']);assert.deepEqual(dirty.lessonProgress['village-cafe'].counts,[3,0,0]);assert.equal(dirty.coins,0);
});
test('walking route goes around walls and never cuts blocked corners',()=>{
 const walls=[{minX:-2,maxX:2,minZ:-4,maxZ:4}];const path=L.findPath({x:-5,z:0},{x:5,z:0},walls);assert.ok(path.length>10);
 for(const p of path)assert.equal(L.isBlocked(p.x,p.z,walls,.4),false);
 assert.deepEqual(L.findPath({x:-5,z:0},{x:0,z:0},walls),[]);assert.deepEqual(L.findPath({x:0,z:0},{x:30,z:0},[]),[]);
});

const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const KEY='little-lives-v3';
async function run(engine,label){
 const b=await engine.launch({headless:true});
 try{const p=await b.newPage({viewport:{width:390,height:844}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(pathToFileURL(path.resolve(__dirname,'../english-travel-3d.html')).href);
 const state=()=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
 await p.locator('[data-cmd=species][data-arg=dog]').click();await p.locator('#adoptName').fill('Biscuit');await p.locator('[data-cmd=starter][data-arg=rain]').click();await p.locator('[data-cmd=adopt]').click();
 assert.equal((await state()).species,'dog');assert.equal((await state()).name,'Biscuit');assert.equal((await state()).outfit,'rain');assert.equal(await p.locator('#episode').isVisible(),false);
 await p.locator('#petHit').click();
 await p.locator('[data-nav=care]').click();await p.locator('#sheetContent [data-cmd=pantry]').click();await p.locator('[data-cmd=feed][data-arg=soup]').click();await p.waitForFunction(()=>document.querySelector('#prop').hidden);
 assert.equal((await state()).pantry.soup,0);
 await p.locator('[data-nav=care]').click();await p.locator('#sheetContent [data-cmd=toys]').click();await p.locator('[data-cmd=play][data-arg=ribbon]').click();for(let i=0;i<5;i++)await p.locator('#toyTarget').click({force:true});
 assert.equal((await state()).playedToday,1);
 await p.locator('[data-nav=out]').click();await p.locator('[data-cmd=place][data-arg=school]').click();await p.locator('[data-cmd=begin][data-arg=school-first]').click();
 await p.locator('[data-cmd=answer][data-arg="1"]').click();assert.equal((await state()).active.index,0);
 await p.locator('#episodeBack').click();await p.locator('#sheetContent [data-cmd=resume]').click();assert.equal((await state()).active.index,0);
 for(let i=0;i<7;i++){await p.locator('[data-cmd=answer][data-arg="0"]').click();await p.locator('#nextLine').click();}
 assert.equal((await state()).memories.length,1);assert.equal((await state()).gold,83);
 await p.locator('[data-cmd=memory]').click();assert.equal(await p.locator('.memory-card').count(),3);assert.equal(await p.locator('video').count(),0);
 await p.locator('[data-cmd=home]').click();await p.locator('[data-nav=shop]').click();await p.locator('[data-cmd=shop][data-arg=food]').click();await p.locator('[data-cmd=buy][data-arg=fish]').click();assert.equal((await state()).pantry.fish,1);assert.equal((await state()).gold,61);
 await p.locator('#sheetClose').click();await p.reload();assert.equal((await state()).name,'Biscuit');assert.equal((await state()).pantry.fish,1);
 await p.screenshot({path:'/tmp/life-'+label+'-home.png'});
 // Seed a separate test fixture for higher-level content and appearance milestones.
 await p.evaluate(k=>{const s=JSON.parse(localStorage.getItem(k));s.xp=300;s.gold=400;s.day=10;localStorage.setItem(k,JSON.stringify(s))},KEY);await p.reload();
 await p.locator('[data-nav=shop]').click();await p.locator('[data-cmd=shop][data-arg=furniture]').click();await p.locator('[data-cmd=buy][data-arg=bed]').click();await p.locator('[data-cmd=equip][data-arg=bed]').click();assert.equal((await state()).decor.bed,'bed');if(await p.locator('#roomLayer').isVisible()){await p.locator('#roomLayer button').filter({hasText:/Done|Back to my pet/}).click();}
 await p.locator('[data-nav=out]').click();await p.locator('[data-cmd=place][data-arg=airport]').click();await p.locator('[data-cmd=begin][data-arg=airport-first]').click();
 for(let i=0;i<8;i++){const arg=i===3||i===4?'1':'0';await p.locator('[data-cmd=answer][data-arg="'+arg+'"]').click();if(i===4)await p.screenshot({path:'/tmp/life-'+label+'-airport.png'});await p.locator('#nextLine').click();}
 const m=(await state()).memories.at(-1);assert.equal(m.choices['air-together'],'separately');assert.equal(m.choices['air-seat'],'aisle');
 await p.locator('[data-cmd=memory]').click();await p.screenshot({path:'/tmp/life-'+label+'-memories.png'});await p.locator('[data-cmd=home]').click();
 await p.locator('#sleep').click();await p.waitForFunction(()=>!document.querySelector('#game').classList.contains('sleeping'));assert.equal((await state()).day,11);assert.equal((await state()).energy,100);
 await p.setViewportSize({width:375,height:667});await p.screenshot({path:'/tmp/life-'+label+'-small.png'});
 assert.deepEqual(errors,[]);
 console.log('PASS '+label+': adoption, dog/name/outfit, care/inventory, play, wrong/retry, pause/resume, episode rewards, three photos/no movie, buy/equip, reload, aging, branching airport, sleep, small-screen. No JS errors.');
 }finally{await b.close()}
}
(async()=>{await run(chromium,'chromium');await run(webkit,'webkit')})().catch(e=>{console.error(e);process.exitCode=1});

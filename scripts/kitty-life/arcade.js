/* Short, touch-friendly arcade rounds. No network or third-party game embeds. */
(()=>{'use strict';let dispose=()=>{};
function stop(){dispose();dispose=()=>{}}
function start(type,mount,api){stop();let alive=true,frame=0,timers=[],started=false,ended=false;
const later=(fn,ms)=>{timers.push(setTimeout(()=>{if(alive)fn()},ms))};
dispose=()=>{alive=false;cancelAnimationFrame(frame);timers.forEach(clearTimeout);window.removeEventListener('keydown',key);};
const titles={plane:'Sky Pilot',bricks:'Word Breaker',pairs:'Word Pairs'};
mount.innerHTML='<div class="arcade-status"><b>'+titles[type]+'</b><span id="arcadeScore">Ready?</span></div><p id="arcadeHint"></p><div id="arcadeBoard"></div><button class="primary" id="arcadeStart">Start game</button><div id="arcadeResult" role="status"></div>';
const find=s=>mount.querySelector(s),board=find('#arcadeBoard'),hint=find('#arcadeHint'),score=find('#arcadeScore');
function finish(won){if(ended||!alive)return;ended=true;cancelAnimationFrame(frame);const paid=api.finish(won);find('#arcadeResult').innerHTML='<h3>'+(won?'You did it!':'Let’s try again!')+'</h3><p>'+(paid?'+15 G · +20 XP · +10 Growth':won?'Great practice! Today’s reward is already collected.':'A little practice makes a better pilot.')+'</p>';const b=find('#arcadeStart');b.hidden=false;b.textContent='Play again';b.onclick=()=>start(type,mount,api);if(api.exit){const back=document.createElement('button');back.className='primary';back.textContent='돌아가기';back.onclick=api.exit;find('#arcadeResult').append(back);}}
let x=180;function key(e){if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();x=Math.max(25,Math.min(335,x+(e.key==='ArrowLeft'?-28:28)));}}window.addEventListener('keydown',key);
if(type==='pairs'){
 hint.textContent='Find 3 pairs: English + Korean.';board.className='pair-board';const pairs=[['Water','물'],['Apple','사과'],['Home','집']],cards=pairs.flatMap((p,id)=>p.map((word,side)=>({word,id,side})));for(let i=cards.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}
 let first=null,locked=false,matches=0;cards.forEach((card,i)=>{const b=document.createElement('button');b.textContent='?';b.className='pair-card';b.setAttribute('aria-label','Card '+(i+1));board.append(b);b.onclick=()=>{if(!started||locked||b.dataset.done||first?.b===b)return;b.textContent=card.word;if(card.side===0)api.speak(card.word);if(!first){first={b,card};return}if(first.card.id===card.id){first.b.dataset.done=b.dataset.done='true';first.b.classList.add('matched');b.classList.add('matched');first=null;matches++;score.textContent=matches+' / 3';if(matches===3)finish(true);}else{locked=true;api.wrong();b.classList.add('miss');first.b.classList.add('miss');later(()=>{b.textContent=first.b.textContent='?';b.classList.remove('miss');first.b.classList.remove('miss');first=null;locked=false},850)}}});
 find('#arcadeStart').onclick=()=>{started=true;find('#arcadeStart').hidden=true;score.textContent='0 / 3';};return;
}
const canvas=document.createElement('canvas');canvas.width=720;canvas.height=800;canvas.setAttribute('aria-label',type==='plane'?'Move your plane with left and right arrows or drag':'Move the paddle with left and right arrows or drag');board.append(canvas);const ctx=canvas.getContext('2d');ctx.scale(2,2);canvas.style.touchAction='none';let dragging=false;
const move=e=>{const r=canvas.getBoundingClientRect();x=Math.max(25,Math.min(335,(e.clientX-r.left)/r.width*360))};canvas.onpointerdown=e=>{dragging=true;canvas.setPointerCapture(e.pointerId);move(e)};canvas.onpointermove=e=>{if(dragging)move(e)};canvas.onpointerup=()=>dragging=false;
let clock=0,last=0,points=0,lives=3,spawn=0,things=[],target=0;const words=['Apple','Water','Home','Milk','Bed'];let ball={x:180,y:300,vx:115,vy:-170};let bricks=Array.from({length:15},(_,i)=>({x:15+i%5*67,y:45+Math.floor(i/5)*34,w:62,h:26,on:true,word:words[i%5]}));
hint.textContent=type==='plane'?'Drag to fly. Catch “Apple”. Avoid the storm clouds. 5 words to win.':'Drag the paddle. Clear 15 word bricks. 3 balls.';
function label(text,x,y,size=17,color='#fff'){ctx.fillStyle=color;ctx.font='800 '+size+'px system-ui';ctx.textAlign='center';ctx.fillText(text,x,y)}
function background(){const g=ctx.createLinearGradient(0,0,0,400);g.addColorStop(0,type==='plane'?'#519bc6':'#253d68');g.addColorStop(1,type==='plane'?'#d8f2eb':'#6479a0');ctx.fillStyle=g;ctx.fillRect(0,0,360,400);for(let i=0;i<8;i++){const y=(i*69+clock*18)%440-20;ctx.fillStyle='#ffffff33';ctx.beginPath();ctx.ellipse((i*87)%360,y,28,8,0,0,7);ctx.fill();}}
function draw(dt){if(!alive||ended)return;clock+=dt;background();
 if(type==='plane'){
  spawn-=dt;if(spawn<=0){spawn=.9;const hazard=Math.random()<.45;things.push({x:35+Math.random()*290,y:-20,word:words[target],hazard});}
  for(const o of things){o.y+=95*dt;ctx.fillStyle=o.hazard?'#46516b':'#fff0b5';ctx.beginPath();ctx.roundRect(o.x-32,o.y-15,64,30,12);ctx.fill();label(o.hazard?'먹구름':o.word,o.x,o.y+5,12,o.hazard?'#fff':'#624a28');if(Math.abs(o.y-337)<25&&Math.abs(o.x-x)<33&&!o.hit){o.hit=true;if(o.hazard){lives--;api.wrong();}else{points++;target=points%words.length;things=things.filter(t=>t.hazard||t===o);hint.textContent='Catch “'+words[target]+'”. Avoid STORM.';api.speak(words[target]);}}}
  things=things.filter(o=>o.y<430&&!o.hit);ctx.save();ctx.translate(x,337);ctx.fillStyle='#fff3d5';ctx.beginPath();ctx.moveTo(0,-26);ctx.lineTo(8,-4);ctx.lineTo(29,11);ctx.lineTo(29,17);ctx.lineTo(7,10);ctx.lineTo(5,24);ctx.lineTo(13,29);ctx.lineTo(-13,29);ctx.lineTo(-5,24);ctx.lineTo(-7,10);ctx.lineTo(-29,17);ctx.lineTo(-29,11);ctx.lineTo(-8,-4);ctx.closePath();ctx.fill();ctx.fillStyle='#ef8d58';ctx.fillRect(-3,-11,6,16);ctx.restore();score.textContent=points+' / 5 · '+lives+' lives';if(points>=5)finish(true);else if(lives<=0)finish(false);
 }else{
  ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;if(ball.x<7){ball.x=7;ball.vx=Math.abs(ball.vx)}if(ball.x>353){ball.x=353;ball.vx=-Math.abs(ball.vx)}if(ball.y<8){ball.y=8;ball.vy=Math.abs(ball.vy)}
  if(ball.vy>0&&ball.y>=350&&ball.y<=368&&Math.abs(ball.x-x)<44){ball.y=350;ball.vy=-Math.abs(ball.vy);ball.vx=(ball.x-x)*4;}
  for(const b of bricks){if(!b.on)continue;ctx.fillStyle=['#f4c978','#ed9c83','#a9d1b9'][Math.floor((b.y-45)/34)];ctx.beginPath();ctx.roundRect(b.x,b.y,b.w,b.h,6);ctx.fill();label(b.word,b.x+b.w/2,b.y+18,12,'#40372f');if(ball.x>b.x-5&&ball.x<b.x+b.w+5&&ball.y>b.y-5&&ball.y<b.y+b.h+5){b.on=false;ball.vy*=-1;points++;api.speak(b.word);break;}}
  ctx.fillStyle='#fff0c7';ctx.beginPath();ctx.roundRect(x-40,359,80,12,6);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(ball.x,ball.y,7,0,7);ctx.fill();if(ball.y>400){lives--;api.wrong();ball={x,y:300,vx:115,vy:-170}}score.textContent=points+' / 15 · '+lives+' lives';if(points>=15)finish(true);else if(lives<=0)finish(false);
 }
}
function loop(t){if(!alive||ended)return;const dt=last?Math.min((t-last)/1000,.035):0;last=t;draw(dt);if(!ended)frame=requestAnimationFrame(loop)}background();label('모험할 준비 됐나요?',180,190,21);
find('#arcadeStart').onclick=()=>{if(started)return;started=true;find('#arcadeStart').hidden=true;if(type==='plane')api.speak('Catch the apple.');frame=requestAnimationFrame(loop)};
}
window.KittyArcade={start,stop};})();

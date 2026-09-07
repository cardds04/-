import {VillageWorld} from './village-world.js';
import logic from './village-logic.cjs';
const {regions,allStops,allAnswers,REPEATS,sanitizeProgress,recordRepeat,finishLesson,matchesAnswer}=logic;
const $=id=>document.getElementById(id);
let storageKey='english_travel_village_v2';try{const kid=localStorage.getItem('family_todos_selected_kid_id');if(kid)storageKey+=':'+kid}catch{}
let state;try{state=sanitizeProgress(JSON.parse(localStorage.getItem(storageKey)||'null'))}catch{state=sanitizeProgress(null)}
let world,started=false,active=null,lessonSerial=0,recognition=null,listening=false,speechTimer,repeatTimer,toastTimer,focusBefore,walkingIntent=null,pendingDestination=null,lastStop=null,lastMoveAt=0,bookTab='review',ready=false;
const phraseMeaning=new Map(allStops.flatMap(s=>s.lesson.map(l=>[l[2],l[3]])));
function save(){try{localStorage.setItem(storageKey,JSON.stringify(state))}catch{toast('저장 공간이 부족해 이번 연습은 저장하지 못했어요.')}}
function region(){return regions.find(r=>r.id===state.region)||regions[0]}
function terminal(){return region().stops.find(s=>s.travel)}
function toast(text){clearTimeout(toastTimer);$('toast').textContent=text;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,3500)}
function setModal(id){
 const open=Boolean(id);if(open&&!document.body.classList.contains('is-modal'))focusBefore=document.activeElement;
 for(const key of ['welcome','lesson','completion','travelPanel','bookPanel'])$(key).hidden=key!==id;
 document.body.classList.toggle('is-modal',open);world?.setEnabled(started&&!open);
 if(open)requestAnimationFrame(()=>$(id).querySelector('button:not([hidden]):not(:disabled)')?.focus());else if(focusBefore?.isConnected)focusBefore.focus({preventScroll:true});
}
function stopSpeech(){clearTimeout(speechTimer);try{speechSynthesis.cancel()}catch{} }
function speak(text,{slow=true,onEnd}={}){
 stopSpeech();if(!state.sound||!('speechSynthesis' in window)){onEnd?.();return}
 const u=new SpeechSynthesisUtterance(text);u.lang='en-US';u.rate=slow?.73:.86;u.pitch=1;const voices=speechSynthesis.getVoices();u.voice=voices.find(v=>/^en-US/i.test(v.lang)&&/Samantha|Google|Natural/i.test(v.name))||voices.find(v=>/^en/i.test(v.lang))||null;
 let ended=false;const finish=()=>{if(ended)return;ended=true;clearTimeout(speechTimer);onEnd?.()};u.onend=finish;u.onerror=finish;speechTimer=setTimeout(finish,12000);speechSynthesis.speak(u);
}
function stopListening(){lessonSerial++;if(recognition){recognition.onresult=null;recognition.onerror=null;recognition.onend=null;try{recognition.abort()}catch{}recognition=null}listening=false;if($('speakButton')){$('speakButton').textContent='🎙 따라 말하기';$('speakButton').setAttribute('aria-pressed','false')}}
function stopLearningAudio(){stopListening();stopSpeech();clearTimeout(repeatTimer)}
function updateHud(){
 const r=region(),done=r.stops.filter(s=>state.completed.includes(s.id)).length,next=r.stops.find(s=>!state.completed.includes(s.id))||r.stops[0];
 $('regionName').textContent=r.name;$('regionIcon').textContent=r.icon;$('journeyTitle').textContent=done===3?'익숙해진 말로, 다음 여행.':'작게 말하고, 멀리 떠나요.';
 $('journeyHint').textContent=done===3?'같은 곳에서 다시 연습하거나 여행을 떠나요.':`${next.name}의 ${next.npc}와 쉬운 세 문장을 연습해요.`;
 $('journeyProgress').style.width=`${done/3*100}%`;$('stopsCount').textContent=`${done} / 3곳 연습`;$('coinCount').textContent=state.coins;
 $('learnedCount').textContent=allAnswers.filter(a=>(state.repetitions[a]||0)>=3).length;$('nextStopButton').textContent=done===3?'✈️ 다음 여행 준비하기 →':`${next.icon} ${next.name}까지 걸어가기 →`;
 $('soundButton').textContent=state.sound?'🔊':'🔇';$('soundButton').setAttribute('aria-pressed',String(state.sound));$('soundButton').setAttribute('aria-label',state.sound?'소리 끄기':'소리 켜기');
 $('stopList').replaceChildren();$('miniMap').querySelectorAll('.map-stop').forEach(b=>b.remove());
 r.stops.forEach(s=>{const b=document.createElement('button');b.innerHTML=`<span>${s.icon} ${s.name}</span><span>${state.completed.includes(s.id)?'✓ 연습함':'걸어가기'}</span>`;b.onclick=()=>walkTo(s.id);$('stopList').append(b);const marker=document.createElement('button');marker.className='map-stop';marker.textContent=s.icon;marker.style.left=`${(s.at[0]+27)/54*100}%`;marker.style.top=`${(s.at[1]+27)/54*100}%`;marker.setAttribute('aria-label',s.name+'까지 걸어가기');marker.onclick=()=>walkTo(s.id);$('miniMap').append(marker)});
}
function walkTo(id,{travel=false}={}){setModal(null);stopLearningAudio();active=null;walkingIntent=travel?'travel':'lesson';if(!world.walkToStop(id)){walkingIntent=null;toast('길을 찾지 못했어요. 가까운 땅을 눌러 조금 이동해 주세요.')}else{const s=allStops.find(s=>s.id===id);$('walkHint').textContent=`${s.name}(으)로 걸어가는 중…`;toast(`${s.name}까지 함께 걸어가요.`)}}
function onArrive(id){$('walkHint').textContent='땅을 눌러도 걸어가요';const intent=walkingIntent;walkingIntent=null;if(intent==='travel'){if(pendingDestination)chooseDestination(pendingDestination);else openTravel()}else openLesson(id)}
function currentLine(){return active?.lines[active.index]}
function currentCounts(){return active?.review?active.counts:(state.lessonProgress[active?.stop.id]?.counts||[0,0,0])}
function feedback(text,error=false){$('speechFeedback').textContent=text;$('speechFeedback').classList.toggle('error',error)}
function openLesson(id){
 const stop=region().stops.find(s=>s.id===id);if(!stop)return;
 if(Math.hypot(world.playerRoot.position.x-stop.at[0],world.playerRoot.position.z-stop.at[1])>3.1){walkTo(id);return}
 stopLearningAudio();const counts=state.lessonProgress[id]?.counts||[0,0,0];let index=counts.findIndex(n=>n<REPEATS);if(index<0)index=2;
 active={stop,index,lines:stop.lesson,review:false};lastStop=id;setModal('lesson');renderLesson();
}
function openReview(answer){stopLearningAudio();active={review:true,index:0,lines:[['Say it with me.','같이 말해요.',answer,phraseMeaning.get(answer)]],counts:[0]};setModal('lesson');renderLesson()}
function renderLesson(){
 if(!active)return;const line=currentLine(),count=currentCounts()[active.index]||0,done=count>=REPEATS;
 $('lessonPlace').textContent=active.review?'MY PHRASEBOOK':active.stop.en.toUpperCase();$('lessonTitle').textContent=active.review?'쉬운 한마디 다시 말하기':`${active.stop.npc}와 따라 말해요`;$('npcName').textContent=active.review?'REVIEW':active.stop.npc.toUpperCase();
 $('npcEnglish').textContent=line[0];$('npcKorean').textContent=line[1];$('answerEnglish').textContent=line[2];$('answerKorean').textContent=line[3];$('phraseNumber').textContent=`문장 ${active.index+1} / ${active.lines.length}`;
 $('lessonSteps').innerHTML=active.lines.map((_,i)=>`<span class="${i<active.index?'done':i===active.index?'active':''}"></span>`).join('');
 $('repeatDots').innerHTML=Array.from({length:3},(_,i)=>`<span class="${i<count?'done':''}">${i<count?'✓':i+1}</span>`).join('');$('repeatLabel').textContent=done?'세 번 연습했어요!':`${count} / 3번 · 같은 답을 따라 말해요`;
 $('nextPhrase').hidden=!done;$('nextPhrase').textContent=active.index===active.lines.length-1?(active.review?'복습 마치기 ✓':'세 문장 연습 완료 ✓'):'다음 문장 →';
 $('speakButton').disabled=done;$('readButton').disabled=done;$('answerForm').querySelector('button').disabled=done;$('typedAnswer').disabled=done;$('typedAnswer').value='';
 feedback(done?'잘했어요. 다음으로 가 볼까요?':'답을 듣고, 보이는 그대로 따라 말해요.');
 $('lesson').dataset.stop=active.review?'review':active.stop.id;$('lesson').dataset.phrase=String(active.index);$('lesson').dataset.repeats=String(count);
}
function acceptRepeat(method){
 if(!active)return;const count=currentCounts()[active.index]||0;if(count>=REPEATS)return;let recorded=false;
 if(active.review){active.counts[0]++;const a=currentLine()[2];state.repetitions[a]=(state.repetitions[a]||0)+1;recorded=true}else recorded=recordRepeat(state,active.stop.id,active.index);
 if(!recorded)return;save();renderLesson();const n=currentCounts()[active.index];feedback(n===3?'세 번 연습했어요! 조금 더 익숙해졌죠?':`${method==='speech'?'보이는 문장과 같게 들렸어요.':method==='type'?'같은 문장을 잘 썼어요.':'소리 내어 읽기 연습을 기록했어요.'} ${3-n}번 더 해 볼까요?`);updateHud();
 // Debounce repeated taps without turning the self-reported practice into a score.
 $('readButton').disabled=true;clearTimeout(repeatTimer);repeatTimer=setTimeout(()=>{if(active&&currentCounts()[active.index]<REPEATS)$('readButton').disabled=false},450);
}
function nextPhrase(){
 if(!active||currentCounts()[active.index]<REPEATS)return;stopLearningAudio();
 if(active.index<active.lines.length-1){active.index++;renderLesson();return}
 const finished=active;let reward;if(active.review){state.coins+=2;reward={coins:2,first:false}}else reward=finishLesson(state,active.stop.id);if(!reward)return;
 save();active=null;updateHud();setModal('completion');$('completeTitle').textContent=finished.review?'한마디를 다시 익혔어요!':'세 문장이 익숙해졌어요!';$('completeDescription').textContent=finished.review?'조금씩 자주 말하면 입에 붙어요.':`${finished.stop.name}에서 각 문장을 세 번씩 연습했어요.`;
 $('completePhrases').replaceChildren();finished.lines.forEach(l=>{const p=document.createElement('p');p.append(document.createTextNode(l[2]));const small=document.createElement('small');small.textContent=l[3];p.append(small);$('completePhrases').append(p)});
 $('completeReward').textContent=`🪙 +${reward.coins} 여행 코인 · ${finished.review?'수첩 복습':reward.first?'첫 방문 도장!':'다시 연습했어요!'}`;
 $('completeTravel').hidden=finished.review||!finished.stop.travel;$('completeTravel').textContent=pendingDestination?`${regions.find(r=>r.id===pendingDestination)?.icon||'✈️'} ${regions.find(r=>r.id===pendingDestination)?.name}로 떠나기`:'✈️ 이제 여행 떠나기';
 $('repeatLesson').onclick=()=>finished.review?openReview(finished.lines[0][2]):openLesson(finished.stop.id);
}
function startRecognition(){
 if(!active||currentCounts()[active.index]>=REPEATS)return;if(listening){try{recognition?.stop()}catch{}return}
 const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Speech){feedback('이 브라우저는 음성 인식을 지원하지 않아요. 답을 소리 내어 읽고 ‘읽었어요’를 눌러 주세요.');return}
 stopSpeech();stopListening();const serial=lessonSerial,expected=currentLine()[2],idx=active.index;let heard=false;let rec;
 try{rec=new Speech();rec.lang='en-US';rec.continuous=false;rec.interimResults=false;rec.maxAlternatives=3;recognition=rec;
  rec.onstart=()=>{if(serial!==lessonSerial)return;listening=true;$('speakButton').textContent='● 듣고 있어요 · 마치기';$('speakButton').setAttribute('aria-pressed','true');feedback('보이는 답을 그대로 말해 주세요.')};
  rec.onresult=e=>{if(serial!==lessonSerial||!active||idx!==active.index)return;const result=e.results[e.resultIndex];if(!result?.isFinal)return;heard=true;const alternatives=Array.from(result).map(r=>r.transcript);if(alternatives.some(t=>matchesAnswer(t,expected)))acceptRepeat('speech');else feedback(`“${alternatives[0]||''}”로 들렸어요. 답을 천천히 한 번 더 말해 볼까요?`,true)};
  rec.onerror=e=>{if(serial!==lessonSerial)return;heard=true;const messages={'not-allowed':'마이크가 허용되지 않았어요. 소리 내어 읽거나 입력해서 연습할 수 있어요.','audio-capture':'마이크를 찾지 못했어요. ‘읽었어요’로 연습을 이어가세요.','network':'음성 연결이 잠시 끊겼어요. 읽기·입력 연습은 계속할 수 있어요.','no-speech':'말소리를 듣지 못했어요. 버튼을 눌러 다시 말해 보세요.'};feedback(messages[e.error]||'음성 인식을 마쳤어요. 필요하면 다시 말해 보세요.',true)};
  rec.onend=()=>{if(serial!==lessonSerial)return;recognition=null;listening=false;$('speakButton').textContent='🎙 따라 말하기';$('speakButton').setAttribute('aria-pressed','false');if(!heard)feedback('말소리를 듣지 못했어요. 읽기 연습으로도 계속할 수 있어요.')};rec.start();
 }catch{stopListening();feedback('마이크를 시작하지 못했어요. 읽기·입력 연습으로 이어가세요.',true)}
}
function openTravel(){stopLearningAudio();active=null;setModal('travelPanel');const t=terminal(),near=Math.hypot(world.playerRoot.position.x-t.at[0],world.playerRoot.position.z-t.at[1])<=3.1;
 $('travelExplanation').textContent=near?(state.completed.includes(t.id)?'어디든 다시 갈 수 있어요. 다음 여행지를 골라요.':'터미널의 쉬운 세 문장을 연습하면 출발해요.'):`${t.name}에서 여행을 떠날 수 있어요. 목적지를 고르면 터미널까지 걸어가요.`;
 $('walkTerminal').hidden=near;$('walkTerminal').textContent=`${t.icon} ${t.name}까지 걸어가기 →`;$('destinationList').replaceChildren();regions.forEach(r=>{const b=document.createElement('button');b.className='destination';b.disabled=r.id===state.region;b.innerHTML=`<span class="emoji">${r.icon}</span><span><b>${r.name}</b><small>${r.en} · 쉬운 대화 3곳</small></span><span class="state">${r.id===state.region?'현재 위치':state.visits.includes(r.id)?'다시 가기 →':'떠나기 →'}</span>`;b.onclick=()=>chooseDestination(r.id);$('destinationList').append(b)});
}
function chooseDestination(id){
 if(id===state.region)return;pendingDestination=id;const t=terminal(),distance=Math.hypot(world.playerRoot.position.x-t.at[0],world.playerRoot.position.z-t.at[1]);
 if(distance>3.1){walkTo(t.id,{travel:true});return}
 if(!state.completed.includes(t.id)){setModal(null);openLesson(t.id);toast('출발 전에 아주 쉬운 세 문장만 연습해요.');return}depart(id);
}
async function depart(id){const destination=regions.find(r=>r.id===id);if(!destination||id===state.region)return;stopLearningAudio();active=null;setModal(null);world.setEnabled(false);$('travelTransition').hidden=false;document.body.classList.add('is-modal');$('tripVehicle').textContent=region().transport;$('tripTitle').textContent=`${destination.name}로 떠나요`;$('tripProgress').style.width='0%';
 await world.flyTo(id);state.region=id;if(!state.visits.includes(id))state.visits.push(id);state.journeys++;pendingDestination=null;save();updateHud();$('travelTransition').hidden=true;setModal(null);toast(`${destination.icon} ${destination.name}에 도착했어요! 새로운 친구를 만나 봐요.`);world.canvas.focus({preventScroll:true});
}
function openBook(){stopLearningAudio();active=null;setModal('bookPanel');renderBook()}
function renderBook(){const learned=allAnswers.filter(a=>(state.repetitions[a]||0)>0),items=bookTab==='all'?allAnswers:[...learned].sort((a,b)=>(state.repetitions[a]||0)-(state.repetitions[b]||0)).slice(0,8);$('bookSummary').textContent=`${state.visits.length}개 마을 · ${state.completed.length}곳 방문 · ${learned.length}개 표현 연습`;$('bookList').replaceChildren();
 if(!items.length){const p=document.createElement('p');p.textContent='아직 연습한 문장이 없어요. 카페에서 첫 인사를 해 보세요.';p.style.cssText='font-size:12px;color:#798671;line-height:1.8';$('bookList').append(p)}
 items.forEach(a=>{const row=document.createElement('div');row.className='book-row';const copy=document.createElement('div'),strong=document.createElement('strong'),small=document.createElement('small'),listen=document.createElement('button'),practice=document.createElement('button');strong.textContent=a;small.textContent=`${phraseMeaning.get(a)} · ${state.repetitions[a]||0}번 연습`;copy.append(strong,small);listen.textContent='🔊';listen.setAttribute('aria-label',a+' 듣기');listen.onclick=()=>speak(a);practice.textContent='연습';practice.setAttribute('aria-label',a+' 다시 연습');practice.onclick=()=>openReview(a);row.append(copy,listen,practice);$('bookList').append(row)});
 document.querySelectorAll('[data-book-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.bookTab===bookTab)));
}
function bind(){
 $('startButton').onclick=()=>{if(!ready)return;started=true;setModal(null);save();world.canvas.focus({preventScroll:true});toast('땅이나 지도에서 장소를 누르면 작은 캐릭터가 걸어가요.')};
 document.querySelectorAll('[data-avatar]').forEach(b=>b.onclick=()=>{state.avatar=b.dataset.avatar;world?.setAvatar(state.avatar);document.querySelectorAll('[data-avatar]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn===b)));save()});
 $('soundButton').onclick=()=>{state.sound=!state.sound;if(!state.sound)stopSpeech();save();updateHud()};$('nextStopButton').onclick=()=>{const next=region().stops.find(s=>!state.completed.includes(s.id));next?walkTo(next.id):openTravel()};$('regionButton').onclick=openTravel;$('bookButton').onclick=openBook;
 $('mapToggle').onclick=()=>{const hidden=!$('mapBody').hidden;$('mapBody').hidden=hidden;$('mapToggle').textContent=hidden?'+':'−';$('mapToggle').setAttribute('aria-expanded',String(!hidden));$('mapToggle').setAttribute('aria-label',hidden?'지도 펼치기':'지도 접기')};
 $('talkButton').onclick=()=>{if(world.near)openLesson(world.near.id)};$('terminalButton').onclick=openTravel;
 $('closeLesson').onclick=()=>{stopLearningAudio();active=null;setModal(null);toast('연습한 횟수는 저장했어요. 나중에 이어서 해요.')};$('answerListen').onclick=()=>{if(active){stopListening();speak(currentLine()[2])}};$('npcListen').onclick=()=>{if(active){stopListening();speak(currentLine()[0],{slow:false})}};
 $('readButton').onclick=()=>{stopListening();acceptRepeat('read')};$('speakButton').onclick=startRecognition;$('nextPhrase').onclick=nextPhrase;$('answerForm').onsubmit=e=>{e.preventDefault();if(!active)return;const value=$('typedAnswer').value.trim();if(matchesAnswer(value,currentLine()[2]))acceptRepeat('type');else feedback('답을 보고 그대로 써 볼까요? 대소문자와 문장부호는 달라도 괜찮아요.',true)};
 $('continueWalk').onclick=()=>{setModal(null);world.canvas.focus({preventScroll:true})};$('completeTravel').onclick=()=>pendingDestination?chooseDestination(pendingDestination):openTravel();$('closeTravel').onclick=()=>setModal(null);$('walkTerminal').onclick=()=>walkTo(terminal().id,{travel:true});$('closeBook').onclick=()=>{stopSpeech();setModal(null)};
 document.querySelectorAll('[data-book-tab]').forEach(b=>b.onclick=()=>{bookTab=b.dataset.bookTab;renderBook()});
 window.addEventListener('keydown',e=>{const modal=document.querySelector('.lesson-layer:not([hidden]),.overlay:not([hidden]),.welcome:not([hidden])');if(!modal)return;
  if(e.key==='Escape'&&modal.id!=='welcome'){e.preventDefault();stopLearningAudio();active=null;setModal(null)}
  if(e.key==='Tab'){const items=[...modal.querySelectorAll('button:not(:disabled),input:not(:disabled),summary,a[href]')].filter(el=>el.getClientRects().length&&!el.closest('[hidden]'));if(!items.length)return;const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}
 });
 const pad=$('joystick'),knob=$('joystickKnob');let pointer=null;const reset=()=>{pointer=null;knob.style.transform='';world?.setJoystick(0,0)};const move=e=>{if(e.pointerId!==pointer)return;const r=pad.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,dist=Math.hypot(dx,dy),scale=dist>27?27/dist:1;knob.style.transform=`translate(${dx*scale}px,${dy*scale}px)`;world.setJoystick(dx*scale/27,dy*scale/27)};
 pad.onpointerdown=e=>{if(!world.enabled)return;pointer=e.pointerId;pad.setPointerCapture(pointer);move(e)};pad.onpointermove=move;pad.onpointerup=reset;pad.onpointercancel=reset;window.addEventListener('blur',reset);document.addEventListener('visibilitychange',()=>{if(document.hidden){reset();stopLearningAudio();save()}});
}
bind();updateHud();
try{world=new VillageWorld($('villageCanvas'),{
 onReady:({failed})=>{ready=true;world.setAvatar(state.avatar);world.setRegion(state.region);$('loading').hidden=true;setModal('welcome');document.querySelectorAll('[data-avatar]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.avatar===state.avatar)));if(failed)toast('일부 3D 소품은 기본 모형으로 표시해요. 산책과 연습은 계속할 수 있어요.');updateHud()},
 onNear:stop=>{$('talkButton').hidden=!stop;$('nearName').hidden=!stop;$('terminalButton').hidden=!stop?.travel;document.body.classList.toggle('is-near',Boolean(stop));if(stop){$('nearName').textContent=stop.npc+' · '+stop.name;$('talkButton').innerHTML=`💬 ${stop.npc}와 연습 <kbd>E</kbd>`;$('terminalButton').textContent=`${region().transport} 여행 떠나기`}},
 onMove:(p,id)=>{if(performance.now()-lastMoveAt<100)return;lastMoveAt=performance.now();$('mapPlayer').style.left=`${(p.x+27)/54*100}%`;$('mapPlayer').style.top=`${(p.z+27)/54*100}%`;$('villageCanvas').dataset.position=`${p.x.toFixed(1)},${p.z.toFixed(1)}`;$('villageCanvas').dataset.region=id;},
 onStop:onArrive,onTravelProgress:t=>$('tripProgress').style.width=`${t*100}%`,onError:()=>{$('loadingNote').textContent='마을을 불러오지 못했어요. 새로고침해서 다시 시도해 주세요.'}
})}catch(error){console.error(error);$('loadingNote').textContent='3D 화면을 시작하지 못했어요. WebGL을 지원하는 브라우저에서 다시 열어 주세요.';$('loading').querySelector('h2').textContent='브라우저의 3D 기능을 확인해 주세요.'}

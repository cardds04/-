import {VillageWorld} from './village-world.js';
import logic from './village-logic.cjs';
const {regions,allStops,allAnswers,REPEATS,sanitizeProgress,recordRepeat,finishLesson,matchesAnswer}=logic;
const $=id=>document.getElementById(id);
let storageKey='english_travel_village_v2';try{const kid=localStorage.getItem('family_todos_selected_kid_id');if(kid)storageKey+=':'+kid}catch{}
let state;try{state=sanitizeProgress(JSON.parse(localStorage.getItem(storageKey)||'null'))}catch{state=sanitizeProgress(null)}
let world,started=false,active=null,lessonSerial=0,recognition=null,listening=false,speechTimer,repeatTimer,toastTimer,focusBefore,walkingIntent=null,pendingDestination=null,lastStop=null,missionStopId=null,lastMoveAt=0,bookTab='review',ready=false;
const phraseMeaning=new Map(allStops.flatMap(s=>s.lesson.map(l=>[l[2],l[3]])));
function save(){try{localStorage.setItem(storageKey,JSON.stringify(state))}catch{toast('저장 공간이 부족해 이번 연습은 저장하지 못했어요.')}}
function region(){return regions.find(r=>r.id===state.region)||regions[0]}
function terminal(){return region().stops.find(s=>s.travel)}
function toast(text){clearTimeout(toastTimer);$('toast').textContent=text;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,3500)}
function setModal(id){
 const open=Boolean(id);if(open&&!document.body.classList.contains('is-modal'))focusBefore=document.activeElement;
 for(const key of ['welcome','lesson','completion','travelPanel','bookPanel'])$(key).hidden=key!==id;
 document.body.classList.toggle('is-modal',open);document.body.dataset.modal=id||'';setMap(false);world?.setEnabled(started&&!open);world?.setConversationFocus(id==='lesson');updateMission();
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
function selectedMission(){return region().stops.find(s=>s.id===missionStopId)||region().stops.find(s=>!state.completed.includes(s.id))}
function updateMission(){
 const next=selectedMission(),learning=active&&!active.review;
 $('missionText').textContent=active?.review?'📒 한 문장 복습':learning?`${active.stop.icon} ${active.stop.npc} · 따라 말하기`:next?`${next.icon} ${next.npc} 만나기`:'✈️ 다음 마을로 여행';
 $('missionProgress').textContent=active?`${active.index+1}/${active.lines.length}`:'→';
 for(const b of $('npcMarkers').children){const current=next?.id===b.dataset.stop;b.classList.toggle('is-mission',current);b.querySelector('.npc-symbol').textContent=current?'!':'💬';b.setAttribute('aria-label',`${b.dataset.name}에게 말 걸기${current?' · 현재 미션':''}`)}
}
function setMap(open){$('mapPanel').hidden=!open;$('mapToggle').setAttribute('aria-expanded',String(open));$('mapToggle').setAttribute('aria-label',open?'장소 지도 닫기':'장소 지도 열기')}
function updateHud(){
 const r=region();$('regionName').textContent=r.name;$('regionIcon').textContent=r.icon;
 $('soundButton').textContent=state.sound?'🔊':'🔇';$('soundButton').setAttribute('aria-pressed',String(state.sound));$('soundButton').setAttribute('aria-label',state.sound?'소리 끄기':'소리 켜기');
 $('stopList').replaceChildren();$('miniMap').querySelectorAll('.map-stop').forEach(b=>b.remove());
 if($('npcMarkers').dataset.region!==r.id){
  $('npcMarkers').replaceChildren();$('npcMarkers').dataset.region=r.id;
  r.stops.forEach(stop=>{const b=document.createElement('button');b.className='npc-marker';b.dataset.stop=stop.id;b.dataset.name=stop.npc;b.hidden=true;b.innerHTML=`<span class="npc-symbol" aria-hidden="true">💬</span><span>${stop.npc}</span>`;b.onclick=()=>openLesson(stop.id);b.title=stop.name;$('npcMarkers').append(b)});
 }
 r.stops.forEach(stop=>{const b=document.createElement('button');b.innerHTML=`<span>${stop.icon} ${stop.name}</span><span>${state.completed.includes(stop.id)?'✓':''}</span>`;b.onclick=()=>walkTo(stop.id);$('stopList').append(b);const marker=document.createElement('button');marker.className='map-stop';marker.textContent=stop.icon;marker.style.left=`${(stop.at[0]+27)/54*100}%`;marker.style.top=`${(stop.at[1]+27)/54*100}%`;marker.setAttribute('aria-label',stop.name+' 이동');marker.onclick=()=>walkTo(stop.id);$('miniMap').append(marker)});
 updateMission();
}
function walkTo(id,{travel=false}={}){stopLearningAudio();active=null;missionStopId=id;setModal(null);walkingIntent=travel?'travel':'lesson';if(!world.walkToStop(id)){walkingIntent=null;toast('가까운 길을 눌러 이동해 주세요.')}}
function onArrive(id){const intent=walkingIntent;walkingIntent=null;if(intent==='travel'){if(pendingDestination)chooseDestination(pendingDestination);else openTravel()}else openLesson(id)}
function currentLine(){return active?.lines[active.index]}
function currentCounts(){return active?.review?active.counts:(state.lessonProgress[active?.stop.id]?.counts||[0,0,0])}
function feedback(text,error=false){$('speechFeedback').hidden=!text;$('speechFeedback').textContent=text;$('speechFeedback').classList.toggle('error',error)}
function openLesson(id){
 const stop=region().stops.find(s=>s.id===id);if(!stop)return;
 if(Math.hypot(world.playerRoot.position.x-stop.at[0],world.playerRoot.position.z-stop.at[1])>3.1){walkTo(id);return}
 stopLearningAudio();const counts=state.lessonProgress[id]?.counts||[0,0,0];let index=counts.findIndex(n=>n<REPEATS);if(index<0)index=2;
 active={stop,index,lines:stop.lesson,review:false};missionStopId=id;lastStop=id;setModal('lesson');renderLesson();
}
function openReview(answer){stopLearningAudio();active={review:true,index:0,lines:[['Say it with me.','같이 말해요.',answer,phraseMeaning.get(answer)]],counts:[0]};setModal('lesson');renderLesson()}
function renderLesson(){
 if(!active)return;const line=currentLine(),count=currentCounts()[active.index]||0,done=count>=REPEATS;
 $('lessonTitle').textContent=active.review?'문장 복습':`${active.stop.npc} · ${active.stop.name}`;
 $('npcEnglish').textContent=line[0];$('npcKorean').textContent=line[1];$('answerEnglish').textContent=line[2];$('answerKorean').textContent=line[3];$('phraseNumber').textContent=`${active.index+1} / ${active.lines.length} 문장`;
 $('repeatDots').innerHTML=Array.from({length:3},(_,i)=>`<span class="${i<count?'done':''}">${i<count?'✓':i+1}</span>`).join('');$('repeatLabel').textContent=`${count} / 3회 연습`;$('repeatDots').setAttribute('aria-label',`${count} / 3회 연습`);
 $('nextPhrase').hidden=!done;$('practiceActions').hidden=done;$('typingPractice').hidden=done;
 $('nextPhrase').textContent=active.index===active.lines.length-1?'완료 ✓':'다음 →';
 $('speakButton').disabled=done;$('readButton').disabled=done;$('answerForm').querySelector('button').disabled=done;$('typedAnswer').disabled=done;$('typedAnswer').value='';feedback('');
 $('lesson').dataset.stop=active.review?'review':active.stop.id;$('lesson').dataset.phrase=String(active.index);$('lesson').dataset.repeats=String(count);updateMission();
}
function acceptRepeat(method){
 if(!active)return;const count=currentCounts()[active.index]||0;if(count>=REPEATS)return;let recorded=false;
 if(active.review){active.counts[0]++;const a=currentLine()[2];state.repetitions[a]=(state.repetitions[a]||0)+1;recorded=true}else recorded=recordRepeat(state,active.stop.id,active.index);
 if(!recorded)return;save();renderLesson();updateHud();
 // Debounce repeated taps without turning the self-reported practice into a score.
 $('readButton').disabled=true;clearTimeout(repeatTimer);repeatTimer=setTimeout(()=>{if(active&&currentCounts()[active.index]<REPEATS)$('readButton').disabled=false},450);
}
function nextPhrase(){
 if(!active||currentCounts()[active.index]<REPEATS)return;stopLearningAudio();
 if(active.index<active.lines.length-1){active.index++;renderLesson();return}
 const finished=active;let reward;if(active.review){state.coins+=2;reward={coins:2,first:false}}else reward=finishLesson(state,active.stop.id);if(!reward)return;
 save();active=null;missionStopId=null;updateHud();setModal('completion');$('completeTitle').textContent=finished.review?'복습 완료 ✓':'연습 완료 ✓';
 $('completeTravel').hidden=finished.review||!finished.stop.travel;$('completeTravel').textContent=pendingDestination?`${regions.find(r=>r.id===pendingDestination)?.icon||'✈️'} ${regions.find(r=>r.id===pendingDestination)?.name}로 떠나기`:'여행 출발 →';
 $('repeatLesson').onclick=()=>finished.review?openReview(finished.lines[0][2]):openLesson(finished.stop.id);
}
function startRecognition(){
 if(!active||currentCounts()[active.index]>=REPEATS)return;if(listening){try{recognition?.stop()}catch{}return}
 const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Speech){feedback('마이크 미지원 · 읽기 또는 입력으로 연습해요.');return}
 stopSpeech();stopListening();const serial=lessonSerial,expected=currentLine()[2],idx=active.index;let heard=false;let rec;
 try{rec=new Speech();rec.lang='en-US';rec.continuous=false;rec.interimResults=false;rec.maxAlternatives=3;recognition=rec;
  rec.onstart=()=>{if(serial!==lessonSerial)return;listening=true;$('speakButton').textContent='● 듣는 중…';$('speakButton').setAttribute('aria-pressed','true');feedback('')};
  rec.onresult=e=>{if(serial!==lessonSerial||!active||idx!==active.index)return;const result=e.results[e.resultIndex];if(!result?.isFinal)return;heard=true;const alternatives=Array.from(result).map(r=>r.transcript);if(alternatives.some(t=>matchesAnswer(t,expected)))acceptRepeat('speech');else feedback(`“${alternatives[0]||''}” · 한 번 더 말해요.`,true)};
  rec.onerror=e=>{if(serial!==lessonSerial)return;heard=true;const messages={'not-allowed':'마이크 권한이 없어요. 읽기·입력으로 연습해요.','audio-capture':'마이크가 없어요. 읽기·입력으로 연습해요.','network':'음성 연결이 끊겼어요. 다시 시도해요.','no-speech':'다시 말해 주세요.'};feedback(messages[e.error]||'다시 말해 주세요.',true)};
  rec.onend=()=>{if(serial!==lessonSerial)return;recognition=null;listening=false;$('speakButton').textContent='🎙 따라 말하기';$('speakButton').setAttribute('aria-pressed','false');if(!heard)feedback('다시 말해 주세요.')};rec.start();
 }catch{stopListening();feedback('마이크 연결 실패 · 읽기·입력으로 연습해요.',true)}
}
function openTravel(){stopLearningAudio();active=null;setModal('travelPanel');const t=terminal(),near=Math.hypot(world.playerRoot.position.x-t.at[0],world.playerRoot.position.z-t.at[1])<=3.1;
 $('travelExplanation').textContent=near?(state.completed.includes(t.id)?'목적지를 선택해요.':'세 문장 연습 후 출발'):`${t.name}에서 출발해요.`;
 $('walkTerminal').hidden=near;$('walkTerminal').textContent=`${t.icon} ${t.name} 이동 →`;$('destinationList').replaceChildren();regions.forEach(r=>{const b=document.createElement('button');b.className='destination';b.disabled=r.id===state.region;b.innerHTML=`<span class="emoji">${r.icon}</span><span><b>${r.name}</b></span><span class="state">${r.id===state.region?'현재':'가기 →'}</span>`;b.onclick=()=>chooseDestination(r.id);$('destinationList').append(b)});
}
function chooseDestination(id){
 if(id===state.region)return;pendingDestination=id;const t=terminal(),distance=Math.hypot(world.playerRoot.position.x-t.at[0],world.playerRoot.position.z-t.at[1]);
 if(distance>3.1){walkTo(t.id,{travel:true});return}
 if(!state.completed.includes(t.id)){setModal(null);openLesson(t.id);return}depart(id);
}
async function depart(id){const destination=regions.find(r=>r.id===id);if(!destination||id===state.region)return;stopLearningAudio();active=null;setModal(null);world.setEnabled(false);$('travelTransition').hidden=false;document.body.classList.add('is-modal');$('tripVehicle').textContent=region().transport;$('tripTitle').textContent=`${destination.name}로 떠나요`;$('tripProgress').style.width='0%';
 await world.flyTo(id);state.region=id;missionStopId=null;if(!state.visits.includes(id))state.visits.push(id);state.journeys++;pendingDestination=null;save();updateHud();$('travelTransition').hidden=true;setModal(null);world.canvas.focus({preventScroll:true});
}
function openBook(){stopLearningAudio();active=null;setModal('bookPanel');renderBook()}
function renderBook(){const learned=allAnswers.filter(a=>(state.repetitions[a]||0)>0),items=bookTab==='all'?allAnswers:[...learned].sort((a,b)=>(state.repetitions[a]||0)-(state.repetitions[b]||0)).slice(0,8);$('bookSummary').textContent=`${learned.length}개 표현`;$('bookList').replaceChildren();
 if(!items.length){const p=document.createElement('p');p.textContent='NPC에게 말을 걸어 보세요.';p.style.cssText='font-size:12px;color:#798671;line-height:1.8';$('bookList').append(p)}
 items.forEach(a=>{const row=document.createElement('div');row.className='book-row';const copy=document.createElement('div'),strong=document.createElement('strong'),small=document.createElement('small'),listen=document.createElement('button'),practice=document.createElement('button');strong.textContent=a;small.textContent=`${phraseMeaning.get(a)} · ${state.repetitions[a]||0}번 연습`;copy.append(strong,small);listen.textContent='🔊';listen.setAttribute('aria-label',a+' 듣기');listen.onclick=()=>speak(a);practice.textContent='연습';practice.setAttribute('aria-label',a+' 다시 연습');practice.onclick=()=>openReview(a);row.append(copy,listen,practice);$('bookList').append(row)});
 document.querySelectorAll('[data-book-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.bookTab===bookTab)));
}
function bind(){
 $('startButton').onclick=()=>{if(!ready)return;started=true;setModal(null);save();world.canvas.focus({preventScroll:true})};
 document.querySelectorAll('[data-avatar]').forEach(b=>b.onclick=()=>{state.avatar=b.dataset.avatar;world?.setAvatar(state.avatar);document.querySelectorAll('[data-avatar]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn===b)));save()});
 $('soundButton').onclick=()=>{state.sound=!state.sound;if(!state.sound)stopSpeech();save();updateHud()};$('nextStopButton').onclick=()=>{const next=selectedMission();next?openLesson(next.id):openTravel()};$('regionButton').onclick=openTravel;$('bookButton').onclick=openBook;
 $('mapToggle').onclick=()=>setMap($('mapPanel').hidden);$('closeMap').onclick=()=>setMap(false);$('villageCanvas').addEventListener('pointerdown',()=>setMap(false));
 $('talkButton').onclick=()=>{if(world.near)openLesson(world.near.id)};$('terminalButton').onclick=openTravel;
 $('closeLesson').onclick=()=>{stopLearningAudio();active=null;setModal(null)};$('answerListen').onclick=()=>{if(active){stopListening();speak(currentLine()[2])}};$('npcListen').onclick=()=>{if(active){stopListening();speak(currentLine()[0],{slow:false})}};
 $('readButton').onclick=()=>{stopListening();acceptRepeat('read')};$('speakButton').onclick=startRecognition;$('nextPhrase').onclick=nextPhrase;$('answerForm').onsubmit=e=>{e.preventDefault();if(!active)return;const value=$('typedAnswer').value.trim();if(matchesAnswer(value,currentLine()[2]))acceptRepeat('type');else feedback('보이는 답을 그대로 입력해요.',true)};
 $('continueWalk').onclick=()=>{setModal(null);world.canvas.focus({preventScroll:true})};$('completeTravel').onclick=()=>pendingDestination?chooseDestination(pendingDestination):openTravel();$('closeTravel').onclick=()=>setModal(null);$('walkTerminal').onclick=()=>walkTo(terminal().id,{travel:true});$('closeBook').onclick=()=>{stopSpeech();setModal(null)};
 document.querySelectorAll('[data-book-tab]').forEach(b=>b.onclick=()=>{bookTab=b.dataset.bookTab;renderBook()});
 window.addEventListener('keydown',e=>{if(e.key==='Escape')setMap(false);const modal=document.querySelector('.lesson-layer:not([hidden]),.overlay:not([hidden]),.welcome:not([hidden])');if(!modal)return;
  if(e.key==='Escape'&&modal.id!=='welcome'){e.preventDefault();stopLearningAudio();active=null;setModal(null)}
  if(e.key==='Tab'){const items=[...modal.querySelectorAll('button:not(:disabled),input:not(:disabled),summary,a[href]')].filter(el=>el.getClientRects().length&&!el.closest('[hidden]'));if(!items.length)return;const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}
 });
 const pad=$('joystick'),knob=$('joystickKnob');let pointer=null;const reset=()=>{pointer=null;knob.style.transform='';world?.setJoystick(0,0)};const move=e=>{if(e.pointerId!==pointer)return;const r=pad.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,dist=Math.hypot(dx,dy),scale=dist>22?22/dist:1;knob.style.transform=`translate(${dx*scale}px,${dy*scale}px)`;world.setJoystick(dx*scale/22,dy*scale/22)};
 pad.onpointerdown=e=>{if(!world.enabled)return;pointer=e.pointerId;pad.setPointerCapture(pointer);move(e)};pad.onpointermove=move;pad.onpointerup=reset;pad.onpointercancel=reset;window.addEventListener('blur',reset);document.addEventListener('visibilitychange',()=>{if(document.hidden){reset();stopLearningAudio();save()}});
}
bind();updateHud();
try{world=new VillageWorld($('villageCanvas'),{
 onReady:({failed})=>{ready=true;world.setAvatar(state.avatar);world.setRegion(state.region);$('loading').hidden=true;setModal('welcome');document.querySelectorAll('[data-avatar]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.avatar===state.avatar)));if(failed)toast('일부 소품은 기본 모형으로 표시해요.');updateHud()},
 onNear:stop=>{$('talkButton').hidden=!stop;$('terminalButton').hidden=!stop?.travel;if(stop){$('talkButton').textContent=`💬 ${stop.npc}`;$('terminalButton').textContent=`${region().transport} 출발`}for(const b of $('npcMarkers').children)b.classList.toggle('is-near',b.dataset.stop===stop?.id)},
 onTarget:id=>{missionStopId=id;updateMission()},
 onMarkers:points=>{for(const point of points){const b=$('npcMarkers').querySelector(`[data-stop="${point.id}"]`);if(!b)continue;b.hidden=!point.visible;b.style.transform=`translate(${point.x}px,${point.y}px) translate(-50%,-100%)`}},
 onMove:(p,id)=>{if(performance.now()-lastMoveAt<100)return;lastMoveAt=performance.now();$('mapPlayer').style.left=`${(p.x+27)/54*100}%`;$('mapPlayer').style.top=`${(p.z+27)/54*100}%`;$('villageCanvas').dataset.position=`${p.x.toFixed(1)},${p.z.toFixed(1)}`;$('villageCanvas').dataset.region=id;},
 onStop:onArrive,onTravelProgress:t=>$('tripProgress').style.width=`${t*100}%`,onError:()=>{$('loadingNote').textContent='마을을 불러오지 못했어요. 새로고침해서 다시 시도해 주세요.'}
})}catch(error){console.error(error);$('loadingNote').textContent='3D 화면을 시작하지 못했어요. WebGL을 지원하는 브라우저에서 다시 열어 주세요.';$('loading').querySelector('h2').textContent='브라우저의 3D 기능을 확인해 주세요.'}

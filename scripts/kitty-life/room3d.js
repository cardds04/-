import * as T from 'three';
import {attachPet} from './pet-model.js';
import './town3d.js';
import './model-preview.js';
import {asset} from './world-assets.js';
import {buildHouseWings,homeRooms} from './house-wings.js';

let shutdown=()=>{},decorate=()=>{},fetchBall=()=>{};
function open(host,{state,save,onClose,main=false,onPlay=()=>{},speak=()=>{},onChange=()=>{},onShop=()=>{},onUse=()=>{}}){
 shutdown();let running=true,raf=0,selection=null,decorating=false,last=0,wander=3;
 host.hidden=false;host.classList.toggle('main-room',main);host.classList.remove('arranging');host.innerHTML='<div class="room-canvas"></div><header class="room-header"><div><b>My 3D Room</b><small>Tap the floor to call your pet</small></div><button class="secondary room-close">Done</button></header><div class="room-tools"><button class="secondary" id="decorateRoom">Arrange furniture</button><button class="secondary" id="turnItem" hidden>Rotate</button></div><div class="room-items" hidden></div><p class="room-message" role="status"></p>';
 const el=s=>host.querySelector(s),message=t=>el('.room-message').textContent=t;
 let renderer;try{renderer=new T.WebGLRenderer({antialias:true,alpha:false});}catch{host.innerHTML='<div class="sheet"><h2>3D is unavailable on this device.</h2><button class="primary">Back to my pet</button></div>';el('button').onclick=()=>{host.hidden=true;onClose()};return false;}
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;el('.room-canvas').append(renderer.domElement);
 const scene=new T.Scene();scene.background=new T.Color('#e9d5b4');const camera=new T.PerspectiveCamera(38,1,.1,180);camera.position.set(8.3,10.5,12.8);camera.lookAt(0,.3,0);
 scene.add(new T.HemisphereLight('#fffaeb','#8e7057',2.3));const sun=new T.DirectionalLight('#fff2ce',4);sun.position.set(-3,9,4);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-18,right:18,top:18,bottom:-18});sun.shadow.normalBias=.03;scene.add(sun);
 const materials=[];const mat=(color,roughness=.85)=>{const m=new T.MeshStandardMaterial({color,roughness});materials.push(m);return m};
 const cream=mat(window.KittyData.houses.find(h=>h.id===state.house)?.wall||(state.house==='villa'?'#f4e8df':state.house==='cottage'?'#cbdac5':'#f7e7c7')),wood=mat('#b77d49'),mint=mat('#83a791'),dark=mat('#3b2921'),pink=mat('#dd9b8a'),fur=mat(state.species==='dog'?'#d69a53':'#a29a8b'),white=mat('#fff1dc');
 function mesh(g,m,x=0,y=0,z=0,parent=scene){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
 const box=(w,h,d,m,x,y,z,p)=>mesh(new T.BoxGeometry(w,h,d),m,x,y,z,p);
 const ball=(w,h,d,m,x,y,z,p)=>{const o=mesh(new T.SphereGeometry(1,24,16),m,x,y,z,p);o.scale.set(w,h,d);return o};
 const floor=box(8,.18,7,wood,0,-.1,0);floor.name='floor';
 for(let z=-3.4;z<3.5;z+=.44)box(7.97,.012,.015,mat('#9f693d'),0,.001,z);
 box(.15,3.6,7,cream,-4,1.7,0);box(8,.17,.1,mint,0,.14,-3.42);box(.1,.17,7,mint,-3.9,.14,0);
 const rug=mesh(new T.CylinderGeometry(1.55,1.55,.025,64),mat('#c8b296'),.2,.025,.4);rug.scale.z=.78;
 // Furnished starter corner using the same real assets as the catalogue.
 const starter=new T.Group();scene.add(starter);
 asset('sideTable',starter,{width:1.15,x:-2.9,z:-2.7,alive:()=>running});
 asset('pottedPlant',starter,{width:.6,x:-2.9,z:-2.7,y:.95,alive:()=>running});
 asset('bookcaseOpenLow',starter,{width:1.5,x:2.6,z:-3,alive:()=>running});
 asset('books',starter,{width:.75,x:2.6,z:-3,y:.7,alive:()=>running});
 asset('lampRoundTable',starter,{width:.4,x:3.1,z:-3,y:.7,alive:()=>running});
 asset('plantSmall3',starter,{width:.7,x:-3.4,z:2.4,alive:()=>running});
 asset('bear',starter,{width:.55,x:3.3,z:2.7,alive:()=>running});
 asset('rugRounded',starter,{width:3.2,x:.2,z:.4,alive:()=>running});rug.visible=false;
 const pet=new T.Group();scene.add(pet);const scale=state.species==='dog'?.9:.85;pet.scale.setScalar(scale*(.9+Math.min((state.day||1)/40,.22)));pet.position.set(.3,0,1.6);
 const body=ball(.48,.53,.75,fur,0,.7,0,pet);ball(.4,.4,.45,white,0,.65,.48,pet);
 const head=new T.Group();head.position.set(0,1.2,.57);pet.add(head);ball(.55,.52,.49,fur,0,0,0,head);ball(.43,.31,.29,white,0,-.15,.34,head);
 for(const side of [-1,1]){const ear=mesh(new T.ConeGeometry(.22,.65,3),fur,side*.37,.54,0,head);ear.rotation.z=-side*.2;const inner=mesh(new T.ConeGeometry(.13,.42,3),pink,side*.37,.56,.095,head);inner.rotation.z=-side*.2;
  ball(.135,.17,.095,dark,side*.215,.05,.43,head);ball(.062,.075,.033,white,side*.19,.105,.52,head);ball(.025,.025,.02,white,side*.265,.005,.525,head);
 }ball(.12,.09,.09,dark,0,-.15,.615,head);ball(.065,.065,.035,pink,0,-.28,.59,head);
 const outfit=state.outfit==='rain'?mat('#eab949'):state.outfit==='princess'?pink:mint;
 const scarf=mesh(new T.TorusGeometry(.32,.075,8,32),outfit,0,1,.52,pet);scarf.rotation.x=Math.PI/2;const bib=box(.32,.27,.035,outfit,0,.83,.81,pet);bib.rotation.x=-.13;
 const legs=[];for(const x of [-.31,.31])for(const z of [-.42,.45])legs.push(ball(.16,.27,.18,white,x,.25,z,pet));
 const tail=new T.Group();tail.position.set(0,.87,-.61);pet.add(tail);const tailmesh=ball(.16,.19,.45,fur,0,.11,-.22,tail);tailmesh.rotation.x=-.4;
 // Instanced tufts add a soft silhouette without a separate mesh per strand.
 const tufts=new T.InstancedMesh(new T.SphereGeometry(1,5,4),fur,220),dummy=new T.Object3D();for(let i=0;i<220;i++){const a=i*2.39996,y=1-2*(i+.5)/220,r=Math.sqrt(1-y*y);dummy.position.set(Math.cos(a)*r*.49,.7+y*.5,Math.sin(a)*r*.72);dummy.scale.set(.018,.027,.018);dummy.updateMatrix();tufts.setMatrixAt(i,dummy.matrix)}tufts.castShadow=true;pet.add(tufts);
 const rig=attachPet(pet,state,()=>running);
 const expansion=Math.min(2,state.homeLevel||0),extra=expansion*1.6;if(extra){box(8,.18,extra,wood,0,-.1,3.5+extra/2).userData.walkFloor=true;for(let z=3.6;z<3.5+extra;z+=.44)box(7.97,.012,.015,wood,0,.002,z);}
 const houseBlocks=buildHouseWings(scene,()=>running);let focusRoom='all',route=[];const homeLook=new T.Vector3(4.5,.3,-3.8);
 const defaults={bed:{x:2.45,z:-1.9,r:0},quilt:{x:-2.3,z:1.4,r:0},ball:{x:1.8,z:1.5,r:0},wand:{x:-1.8,z:-.8,r:0}};
 state.roomLayout=state.roomLayout||{};const placed=new Map();const inventory=window.KittyData.goods.filter(g=>g.model||['bed','quilt','ball','wand'].includes(g.id));const owned=inventory.filter(g=>state.owned.includes(g.id)&&!state.storedItems.includes(g.id)).map(g=>g.id);
 const bounds={bed:[1.65,1.3],quilt:[1.45,1.15],ball:[.5,.5],wand:[.9,.5]};
 for(const g of inventory)if(g.model)bounds[g.id]=[g.width,g.width];
 for(const id of owned){const g=new T.Group();g.userData.item=id;scene.add(g);const def=inventory.find(a=>a.id===id);let pos=state.roomLayout[id]||defaults[id];if(!pos){outer:for(let z=-2.6;z<3+extra;z+=.65)for(let x=-3;x<3.1;x+=.65)if(valid(id,x,z,0)){pos={x,z,r:0};break outer;}}if(!pos){scene.remove(g);if(!state.storedItems.includes(id))state.storedItems.push(id);continue;}state.roomLayout[id]={...pos};g.position.set(pos.x,0,pos.z);g.rotation.y=pos.r||0;
  if(def?.model){asset(def.model,g,{width:def.width,alive:()=>running});if(id==='shelf')asset('books',g,{width:1.2,y:.7,alive:()=>running});if(id==='tv')asset('televisionModern',g,{width:1.2,y:.65,alive:()=>running});}
  if(id==='bed'){box(1.65,.26,1.3,wood,0,.2,0,g);box(1.48,.18,1.1,mint,0,.42,0,g);box(1.65,.63,.13,wood,0,.49,-.6,g);for(const x of [-.75,.75])box(.11,.4,1.3,wood,x,.33,0,g);ball(.48,.13,.25,cream,0,.59,-.25,g);}
  if(id==='quilt'){box(1.45,.08,1.15,pink,0,.08,0,g);for(let i=0;i<12;i++)ball(.055,.017,.065,cream,(i%4-1.5)*.29,.132,(Math.floor(i/4)-1)*.32,g);}
  if(id==='ball'){ball(.25,.25,.25,pink,0,.25,0,g);const stripe=mesh(new T.TorusGeometry(.245,.018,8,24),cream,0,.25,0,g);stripe.rotation.y=.7;}
  if(id==='wand'){const rod=box(.04,.04,.8,wood,0,.06,0,g);rod.rotation.y=.5;ball(.14,.025,.24,mint,.16,.075,.35,g);}
  placed.set(id,g);
 }
 if(state.owned.includes('room')){scene.background.set('#c9dbca');const garland=mat('#94b29a');for(let i=0;i<8;i++)ball(.1,.15,.06,garland,-3+i*.9,3.3,-3.42);}
 const ray=new T.Raycaster(),pointer=new T.Vector2();let target=new T.Vector3(.3,0,1.6),heading=0;
 const ring=mesh(new T.RingGeometry(.3,.36,40),new T.MeshBasicMaterial({color:'#ffe7a1',side:T.DoubleSide}),0,.045,0);ring.rotation.x=-Math.PI/2;ring.visible=false;
 const halo=mesh(new T.RingGeometry(.78,.83,48),new T.MeshBasicMaterial({color:'#ffd76d',side:T.DoubleSide}),0,.045,0);halo.rotation.x=-Math.PI/2;halo.visible=false;
 function isRug(id){return /^rug/.test(inventory.find(g=>g.id===id)?.model||'')}
 function blocked(x,z,skip=null){if(x<-3.7||x>12.7||z< -11.2||z>3.3+extra)return true;if(x<-1.9&&x>-4&&z<-2.05&&z>-3.4)return true;if(houseBlocks.some(b=>Math.abs(x-b.x)<b.w/2+.23&&Math.abs(z-b.z)<b.d/2+.23))return true;for(const [id,g]of placed){if(id===skip||isRug(id))continue;const dims=bounds[id],rot=Math.abs(Math.sin(g.rotation.y))>.7,w=rot?dims[1]:dims[0],d=rot?dims[0]:dims[1];if(Math.abs(x-g.position.x)<w/2+.3&&Math.abs(z-g.position.z)<d/2+.3)return true}return false}
 function valid(id,x,z,r){const dims=bounds[id],rot=Math.abs(Math.sin(r))>.7,w=rot?dims[1]:dims[0],d=rot?dims[0]:dims[1];if(x-w/2< -3.8||x+w/2>12.8||(z+d/2>3.3+extra||z-d/2< -11.2))return false;for(const [other,g]of placed){if(other===id||isRug(id)||isRug(other))continue;const ds=bounds[other],rr=Math.abs(Math.sin(g.rotation.y))>.7;if(Math.abs(x-g.position.x)<(w+(rr?ds[1]:ds[0]))/2+.1&&Math.abs(z-g.position.z)<(d+(rr?ds[0]:ds[1]))/2+.1)return false;}return !(x<-2&&z<-2&&z>-3.4)&&!houseBlocks.some(b=>Math.abs(x-b.x)<(b.w+w)/2+.1&&Math.abs(z-b.z)<(b.d+d)/2+.1);}
 function choose(id){if(!placed.has(id))return;selection=id;halo.visible=true;halo.position.set(placed.get(id).position.x,.045,placed.get(id).position.z);el('#turnItem').hidden=false;el('#storeItem').hidden=false;message('Tap a free floor spot to place your '+id+'.');}
 renderer.domElement.addEventListener('pointerdown',e=>{const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);if(!decorating&&!fetching){for(const h of ray.intersectObjects(scene.children,true)){let o=h.object;while(o){if(o.userData.homeUse){onUse(o.userData.homeUse);return;}o=o.parent;}if(h.object.name==='floor'||h.object.userData.walkFloor)break;}}const hit=ray.intersectObjects(scene.children.filter(o=>o.name==='floor'||o.userData.walkFloor))[0];if(!hit)return;const x=decorating?Math.round(hit.point.x*4)/4:hit.point.x,z=decorating?Math.round(hit.point.z*4)/4:hit.point.z;
  if(fetching){if(!blocked(x,z)&&Math.abs(x)<3.6&&z<3.1+extra&&z> -3.1&&!chasing){toy.position.set(pet.position.x,.5,pet.position.z+.7);toss={from:toy.position.clone(),to:new T.Vector3(x,.22,z),t:0};toy.visible=true;target.set(x,0,z);wander=99;chasing=true;speak('Fetch the ball!');}return;}
  if(decorating){const hits=ray.intersectObjects([...placed.values()],true);if(hits.length){let g=hits[0].object;while(g&&!g.userData.item)g=g.parent;if(g&&g.userData.item!==selection){choose(g.userData.item);return;}}}
  if(decorating&&selection){const g=placed.get(selection);if(!valid(selection,x,z,g.rotation.y)){message('Choose an empty spot inside the room.');return}g.position.set(x,0,z);state.roomLayout[selection]={x,z,r:g.rotation.y};halo.position.set(x,.045,z);save();message('Saved! Tap another spot to move it again.');return;}
  if(decorating){const hits=ray.intersectObjects([...placed.values()],true);if(hits.length){let g=hits[0].object;while(g&&!g.userData.item)g=g.parent;if(g)choose(g.userData.item);}return;}
  if(!decorating){const hits=ray.intersectObjects([...placed.values()],true);if(hits.length){let o=hits[0].object;while(o&&!o.userData.item)o=o.parent;if(o){onUse(o.userData.item);return;}}}
  if(!blocked(x,z)){walkHome(x,z);wander=99;ring.position.set(x,.045,z);ring.visible=true;}
 });
 function walkHome(x,z){const start=[Math.round(pet.position.x*2),Math.round(pet.position.z*2)],end=[Math.round(x*2),Math.round(z*2)],key=(a,b)=>a+','+b,q=[start],prev=new Map([[key(...start),null]]);let found=false;for(let i=0;i<q.length;i++){const[a,b]=q[i];if(a===end[0]&&b===end[1]){found=true;break;}for(const[dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const aa=a+dx,bb=b+dz,k=key(aa,bb);if(prev.has(k)||blocked(aa/2,bb/2))continue;prev.set(k,[a,b]);q.push([aa,bb]);}}if(!found){message('가구 사이의 빈 바닥을 눌러 주세요.');return;}let at=end;route=[];while(at){route.push(new T.Vector3(at[0]/2,0,at[1]/2));at=prev.get(key(...at));}route.reverse();route.shift();if(route.length)target.copy(route.shift());}
 const rooms=document.createElement('nav');rooms.className='home-room-nav';for(const[id,r]of Object.entries(homeRooms)){const b=document.createElement('button');b.textContent=r.name;b.dataset.homeRoom=id;b.onclick=()=>{focusRoom=id;host.dataset.homeRoom=id;if(id!=='all')walkHome(...(r.entry||[r.x,r.z]));wander=99;resize();};rooms.append(b);}host.append(rooms);host.dataset.homeRoom='all';
 decorate=el('#decorateRoom').onclick=()=>{decorating=!decorating;host.classList.toggle('arranging',decorating);el('.room-items').hidden=!decorating;el('#decorateRoom').textContent=decorating?'Done':'Arrange furniture';if(!decorating){selection=null;halo.visible=false;el('#turnItem').hidden=true;el('#storeItem').hidden=true;}grid.visible=decorating;resize();message(decorating?(owned.length?'Select an item, then tap the floor.':'Buy a bed, quilt, or toy in the shop first.'):'Tap the floor to call your pet.');};
 for(const g of inventory)if(g.model)bounds[g.id]=[g.width,g.width];
 for(const id of [...placed.keys()]){const b=document.createElement('button');b.className='secondary';b.textContent=inventory.find(g=>g.id===id)?.name||id;b.onclick=()=>choose(id);el('.room-items').append(b)}
 const grid=new T.GridHelper(8,32,'#ac9b7b','#c7b596');grid.position.y=.015;grid.visible=false;scene.add(grid);
 const storage=document.createElement('button');storage.id='storeItem';storage.className='secondary';storage.textContent='Store';storage.hidden=true;el('.room-tools').append(storage);storage.onclick=()=>{if(!selection)return;state.storedItems.push(selection);save();onChange();};
 const buyMore=document.createElement('button');buyMore.className='secondary';buyMore.textContent='Buy furniture';buyMore.onclick=onShop;el('.room-items').prepend(buyMore);
 for(const id of state.storedItems.filter(id=>inventory.some(g=>g.id===id))){const b=document.createElement('button');b.className='secondary';b.textContent='Place '+inventory.find(g=>g.id===id).name;b.onclick=()=>{state.storedItems=state.storedItems.filter(x=>x!==id);delete state.roomLayout[id];save();onChange();};el('.room-items').append(b);}
 el('#turnItem').onclick=()=>{if(!selection)return;const g=placed.get(selection),r=g.rotation.y+Math.PI/2;if(!valid(selection,g.position.x,g.position.z,r)){message('Move this item to a larger space first.');return}g.rotation.y=r;state.roomLayout[selection].r=r;save();};
 let fetching=false,chasing=false,catches=0,toss=null;const toy=ball(.18,.18,.18,pink,0,.2,0);toy.visible=false;
 const fetchPanel=document.createElement('div');fetchPanel.className='fetch-panel';fetchPanel.hidden=true;fetchPanel.innerHTML='<b>Fetch · <span>0 / 3</span></b><button>Finish</button>';host.append(fetchPanel);fetchPanel.querySelector('button').onclick=()=>{fetching=false;chasing=false;toy.visible=false;host.classList.remove('fetching');fetchPanel.hidden=true;wander=2;};
 fetchBall=()=>{focusRoom='living';route=[];pet.position.set(.3,0,1.6);target.copy(pet.position);fetching=true;chasing=false;catches=0;fetchPanel.querySelector('span').textContent='0 / 3';fetchPanel.hidden=false;host.classList.add('fetching');message('Tap an empty floor spot to throw the ball.');speak('Let’s play fetch!');};
 const resize=()=>{const r=host.getBoundingClientRect();renderer.setSize(r.width,r.height);camera.aspect=r.width/r.height;camera.position.set(8.3,10.5,camera.aspect<.65?15.8:12.8);camera.lookAt(0,.3,extra*.5);camera.position.z+=extra*.55;camera.zoom=decorating?.95:1.05;camera.updateProjectionMatrix()};const observer=new ResizeObserver(resize);observer.observe(host);resize();
 function animate(t){if(!running)return;if(host.hidden||document.hidden){last=0;raf=requestAnimationFrame(animate);return;}const dt=last?Math.min((t-last)/1000,.04):0;last=t;wander-=dt;
  if(wander<0&&!decorating&&!fetching&&!route.length&&focusRoom==='living'){for(let i=0;i<20;i++){const x=(Math.random()-.5)*6,z=(Math.random()-.5)*5;if(!blocked(x,z)){target.set(x,0,z);break}}wander=4+Math.random()*3;}
  const delta=target.clone().sub(pet.position),distance=delta.length(),moving=distance>.12&&!decorating;
  if(moving){delta.normalize();let nx=pet.position.x+delta.x*dt*(chasing?2.7:1.25),nz=pet.position.z+delta.z*dt*(chasing?2.7:1.25);if(blocked(nx,nz)){nx=pet.position.x+delta.z*dt*1.3;nz=pet.position.z-delta.x*dt*1.3;if(blocked(nx,nz)||nx< -3.7||nx>12.7||(nz>3.1+extra||nz< -11.2)){target.copy(pet.position);wander=.2;nx=pet.position.x;nz=pet.position.z;}}heading=Math.atan2(nx-pet.position.x,nz-pet.position.z);pet.position.set(nx,Math.abs(Math.sin(t*.012))*.045,nz);pet.rotation.y+=Math.atan2(Math.sin(heading-pet.rotation.y),Math.cos(heading-pet.rotation.y))*Math.min(1,dt*9);}else{pet.position.y=0;ring.visible=false;if(route.length)target.copy(route.shift());}
  if(chasing){if(toss&&toss.t<1){toss.t=Math.min(1,toss.t+dt*1.5);toy.position.lerpVectors(toss.from,toss.to,toss.t);toy.position.y+=Math.sin(toss.t*Math.PI)*1.3;}else toy.position.y=.22;toy.rotation.x+=dt*4;if(distance<.32&&(!toss||toss.t>=1)){chasing=false;toy.visible=false;catches++;fetchPanel.querySelector('span').textContent=catches+' / 3';if(catches>=3){fetching=false;host.classList.remove('fetching');fetchPanel.hidden=true;onPlay();message('Great catch!');}else message('Good catch! Throw again.');}}
  rig.update(dt,moving,chasing);host.dataset.petAsset=rig.ready?'ready':'loading';
  legs.forEach((leg,i)=>leg.position.y=.25+(moving?Math.sin(t*.013+(i%2)*Math.PI)*.09:0));tail.rotation.y=Math.sin(t*.009)*.4;head.rotation.z=Math.sin(t*.0014)*.045;const focus=homeRooms[focusRoom];homeLook.lerp(new T.Vector3(focus.x,.3,focus.z),Math.min(1,dt*5));const offset=focusRoom==='all'?new T.Vector3(22,28,32).multiplyScalar(Math.max(1,.65/camera.aspect)):new T.Vector3(8.3,10.5,14);camera.position.lerp(new T.Vector3(focus.x,0,focus.z).add(offset),Math.min(1,dt*5));camera.lookAt(homeLook);host.dataset.petX=pet.position.x.toFixed(1);host.dataset.petZ=pet.position.z.toFixed(1);renderer.render(scene,camera);raf=requestAnimationFrame(animate);
 }
 shutdown=()=>{running=false;cancelAnimationFrame(raf);observer.disconnect();scene.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of [].concat(o.material))m.dispose();}});renderer.dispose();renderer.forceContextLoss();host.hidden=true;};
 el('.room-close').onclick=()=>{shutdown();onClose()};message('Your pet can run around. Tap the floor to call them.');raf=requestAnimationFrame(animate);save();return true;
}
window.KittyRoom={open,close:()=>shutdown(),decorate:()=>decorate(),fetchBall:()=>fetchBall()};

import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import logic from './village-logic.cjs';
const {regions,findPath,isBlocked}=logic;
const ROOT='assets/english-travel-3d/models/';
const asset=(group,name)=>`${ROOT}${group}/${name}.glb`;
const CHAR_HEIGHT=1.5;
export class VillageWorld {
 constructor(canvas,{onReady,onNear,onMove,onStop,onTarget,onMarkers,onTravelProgress,onError}){
  Object.assign(this,{canvas,onReady,onNear,onMove,onStop,onTarget,onMarkers,onTravelProgress,onError});this.cache=new Map();this.mixers=[];this.obstacles=[];this.keys=new Set();this.joy={x:0,y:0};this.route=[];this.enabled=false;this.yaw=.35;this.zoom=29;this.near=null;this.lastFrame=performance.now();this.elapsed=0;this.ray=new T.Raycaster();this.ndc=new T.Vector2();this.target=new T.Vector3();this.pointer=null;this.npcs=new Map();this.faded=[];this.conversationFocus=false;this.focusShift=0;this.screenPoint=new T.Vector3();
  this.scene=new T.Scene();this.scene.background=new T.Color('#d4e9ec');this.scene.fog=new T.Fog('#d4e9ec',65,155);
  this.camera=new T.OrthographicCamera(-20,20,15,-15,.1,220);
  this.renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,matchMedia('(pointer: coarse)').matches?1.5:2));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFShadowMap;this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.14;
  this.scene.add(new T.HemisphereLight(0xf5fbff,0x617544,2.4));this.sun=new T.DirectionalLight(0xfff2d1,3);this.sun.position.set(-24,40,18);this.sun.castShadow=true;this.sun.shadow.mapSize.set(1536,1536);Object.assign(this.sun.shadow.camera,{left:-42,right:42,top:42,bottom:-42,near:1,far:100});this.sun.shadow.normalBias=.07;this.scene.add(this.sun);
  this.ocean=this.mesh(new T.PlaneGeometry(400,400),0x86c6ce,{roughness:.48});this.ocean.rotation.x=-Math.PI/2;this.ocean.position.y=-.45;this.scene.add(this.ocean);
  this.world=new T.Group();this.scene.add(this.world);this.playerRoot=new T.Group();this.playerRoot.position.set(0,0,8);this.scene.add(this.playerRoot);
  this.playerRing=this.mesh(new T.RingGeometry(.56,.67,32),0xfac756,{roughness:.8});this.playerRing.rotation.x=-Math.PI/2;this.playerRing.position.y=.035;this.playerRoot.add(this.playerRing);
  this.pathLine=new T.Line(new T.BufferGeometry(),new T.LineDashedMaterial({color:0xf5b856,dashSize:.25,gapSize:.2}));this.scene.add(this.pathLine);
  this.clouds=new T.Group();this.scene.add(this.clouds);for(let i=0;i<10;i++){const cloud=new T.Group();for(let j=0;j<3;j++){const m=this.mesh(new T.SphereGeometry(1.3+j*.2,8,6),0xffffff,{roughness:1});m.position.x=j*1.2;cloud.add(m)}cloud.position.set(-55+i*12,16+(i%3)*4,-34-(i%4)*10);cloud.scale.set(1.6,.5,1);this.clouds.add(cloud)}
  this.resize();new ResizeObserver(()=>this.resize()).observe(canvas);this.bind();this.renderer.setAnimationLoop(()=>this.frame());this.load().catch(error=>{console.error(error);this.onError?.(error)});
 }
 mesh(geometry,color,props={}){const m=new T.Mesh(geometry,new T.MeshStandardMaterial({color,...props}));m.castShadow=true;m.receiveShadow=true;m.userData.procedural=true;return m}
 box(name,x,y,z,w,h,d,color,parent=this.world){const m=this.mesh(new T.BoxGeometry(w,h,d),color);m.position.set(x,y,z);m.name=name;parent.add(m);return m}
 async load(){
  const urls=new Set();regions.forEach(r=>r.stops.forEach(s=>{urls.add(asset('city',s.building));urls.add(asset('characters',s.model))}));['character-female-a','character-male-a'].forEach(n=>urls.add(asset('characters',n)));['tree_oak','tree_default','tree_palm','flower_yellowA','plant_bush','rock_largeA'].forEach(n=>urls.add(asset('nature',n)));urls.add(asset('furniture','bench'));urls.add(asset('city','detail-parasol-a'));
  let done=0,failed=0;const loader=new GLTFLoader();await Promise.all([...urls].map(async url=>{try{this.cache.set(url,await loader.loadAsync(url))}catch{failed++;this.cache.set(url,null)}done++;document.querySelector('#loadProgress').style.width=`${done/urls.size*100}%`}));
  this.setAvatar('female-a');this.setRegion('village');this.onReady?.({failed});
 }
 model(group,name,{height=4,footprint,actor=false}={}){
  const gltf=this.cache.get(asset(group,name));const source=gltf?.scene?(actor?cloneSkeleton(gltf.scene):gltf.scene.clone(true)):null;const wrapper=new T.Group();
  if(source){source.updateMatrixWorld(true);const bb=new T.Box3().setFromObject(source),sz=bb.getSize(new T.Vector3());const scale=footprint?footprint/Math.max(sz.x,sz.z):height/Math.max(sz.y,.001);source.scale.multiplyScalar(scale);source.updateMatrixWorld(true);bb.setFromObject(source);const center=bb.getCenter(new T.Vector3());source.position.sub(new T.Vector3(center.x,bb.min.y,center.z));source.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone()}});wrapper.add(source);
   if(actor&&gltf.animations?.length){const mixer=new T.AnimationMixer(source),actions=new Map(gltf.animations.map(c=>[c.name,mixer.clipAction(c)]));wrapper.userData.mixer=mixer;wrapper.userData.actions=actions;this.mixers.push(mixer);this.animateActor(wrapper,'idle')}
  }else if(actor){const body=this.mesh(new T.CapsuleGeometry(.15,.38,3,8),0xe78e74);body.position.y=.45;wrapper.add(body);const head=this.mesh(new T.SphereGeometry(.16,10,8),0xf3c7a0);head.position.y=.83;wrapper.add(head)}
  else{this.box('Fallback house',0,1.8,0,4,3.6,3,0xe4c3a0,wrapper);const roof=this.mesh(new T.ConeGeometry(3,1.8,4),0xa96557);roof.rotation.y=Math.PI/4;roof.position.y=4.3;wrapper.add(roof)}return wrapper;
 }
 animateActor(actor,action){const actions=actor?.userData.actions;if(!actions)return;const next=actions.get(action)||actions.get('idle');if(!next||actor.userData.current===next)return;actor.userData.current?.fadeOut(.18);next.reset().fadeIn(.18).play();actor.userData.current=next}
 setAvatar(id){if(this.actor){this.playerRoot.remove(this.actor);this.mixers=this.mixers.filter(m=>m!==this.actor.userData.mixer)}this.actor=this.model('characters','character-'+id,{height:CHAR_HEIGHT,actor:true});this.playerRoot.add(this.actor)}
 clearRegion(){this.world.traverse(o=>{if(o.isMesh){if(o.userData.procedural)o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.dispose())}if(o.isSprite){o.material.map?.dispose();o.material.dispose()}});this.world.clear();this.mixers=this.mixers.filter(m=>m===this.actor?.userData.mixer);this.npcs.clear();this.obstacles=[];this.route=[];this.routeTarget=null;this.faded=[];this.near=null}
 setRegion(id){
  const region=regions.find(r=>r.id===id)||regions[0];this.clearRegion();this.region=region;this.scene.background.set(region.sky);this.scene.fog.color.set(region.sky);this.ocean.material.color.set(region.id==='mountain'?0xa8c5cb:0x80c6d0);
  const land=this.mesh(new T.CylinderGeometry(30,30.7,.7,96),region.ground);land.position.y=-.4;land.userData.procedural=true;this.world.add(land);
  const pathColor=region.id==='beach'?0xf6e8c9:0xeee4c8;
  this.box('Main village walk',0,-.015,0,4,.045,49,pathColor);this.box('Garden walk',0,-.012,3,47,.045,3.8,pathColor);
  const plaza=this.mesh(new T.CylinderGeometry(4.4,4.4,.04,48),0xf5eddb);plaza.position.set(0,.017,3);this.world.add(plaza);
  const fountain=this.mesh(new T.CylinderGeometry(1.25,1.45,.32,28),0xc7c9bb);fountain.position.set(0,.18,3);this.world.add(fountain);const water=this.mesh(new T.CylinderGeometry(1.14,1.14,.035,28),0x80c5d0,{roughness:.25});water.position.set(0,.37,3);this.world.add(water);this.obstacles.push({minX:-1.5,maxX:1.5,minZ:1.5,maxZ:4.5});
  region.stops.forEach((stop,i)=>{
   const [x,z]=stop.at;this.box('Path to '+stop.id,x/2,.001,z,Math.abs(x)+3,.045,2.6,pathColor);
   const platform=this.box('Shop forecourt',x,.018,z-1.4,8,.05,4.5,0xf4ecdc);platform.userData.stopId=stop.id;
   const building=this.model('city',stop.building,{height:stop.travel?5.6:6.2});building.position.set(x,0,z-5);building.rotation.y=Math.PI;building.userData.stopId=stop.id;this.world.add(building);building.updateMatrixWorld(true);const bb=new T.Box3().setFromObject(building);this.obstacles.push({minX:bb.min.x,maxX:bb.max.x,minZ:bb.min.z,maxZ:bb.max.z});building.userData.occluder=true;
   const npc=this.model('characters',stop.model,{height:1.42,actor:true});npc.position.set(x,.02,z);npc.userData.stopId=stop.id;this.world.add(npc);this.npcs.set(stop.id,npc);
   const ring=this.mesh(new T.RingGeometry(.64,.77,32),0xf6bd58);ring.rotation.x=-Math.PI/2;ring.position.set(x,.049,z);this.world.add(ring);
   const bench=this.model('furniture','bench',{height:.65});bench.position.set(x+3.0,0,z+.25);this.world.add(bench);
   if(!stop.travel){const shade=this.model('city','detail-parasol-a',{height:2.9});shade.position.set(x-3,0,z-.2);this.world.add(shade)}
  });
  let seed=428;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  for(let i=0;i<50;i++){const angle=rand()*Math.PI*2,r=18+rand()*10,x=Math.sin(angle)*r,z=Math.cos(angle)*r;if(Math.abs(x)<3||Math.abs(z-3)<3||isBlocked(x,z,this.obstacles,1.9))continue;const tree=this.model('nature',region.id==='beach'?'tree_palm':i%3?'tree_default':'tree_oak',{height:3+rand()*2.7});tree.position.set(x,0,z);tree.rotation.y=rand()*6.28;this.world.add(tree)}
  for(let i=0;i<28;i++){const x=(rand()-.5)*48,z=(rand()-.5)*48;if(Math.abs(x)<3||Math.abs(z-3)<3||isBlocked(x,z,this.obstacles,1.8))continue;const plant=this.model('nature',i%3?'plant_bush':'flower_yellowA',{height:.25+rand()*.4});plant.position.set(x,.02,z);this.world.add(plant)}
  if(region.id==='mountain')for(let i=0;i<9;i++){const h=9+(i%3)*3;const mountain=this.mesh(new T.ConeGeometry(8,h,5),i%2?0x81958f:0x93a5a1);mountain.position.set(-39+i*10,h/2-1,-40-(i%2)*5);this.world.add(mountain);const snow=this.mesh(new T.ConeGeometry(2.35,h*.29,5),0xf6f7ee);snow.position.set(mountain.position.x,h-h*.145-1,mountain.position.z);this.world.add(snow)}
  if(region.id==='beach'){this.box('Pier',18,.15,20,4,.3,12,0xd9b689);const sail=this.mesh(new T.ConeGeometry(2.8,4,3),0xf9eedb);sail.position.set(25,3,22);sail.rotation.z=.15;this.world.add(sail);this.box('Boat',25,.0,22,4,.8,2,0xa76050)}
  this.playerRoot.position.set(0,0,9);this.target.copy(this.playerRoot.position);this.yaw=.35;this.updateCamera(1);this.updateRouteLine();this.onMove?.(this.playerRoot.position,region.id);this.onNear?.(null);
 }
 setConversationFocus(value){this.conversationFocus=value}
 setEnabled(enabled){this.enabled=enabled;if(!enabled){this.keys.clear();this.joy={x:0,y:0};this.animateActor(this.actor,'idle')}}
 setJoystick(x,y){this.joy={x,y};this.route=[];this.routeTarget=null;this.updateRouteLine()}
 walkToStop(id){const stop=this.region.stops.find(s=>s.id===id);if(!stop)return false;const ok=this.walkTo({x:stop.at[0],z:stop.at[1]+1.5});if(ok){this.routeTarget=id;this.onTarget?.(id)}return ok}
 walkTo(point){if(!this.enabled)return false;this.route=findPath(this.playerRoot.position,point,this.obstacles);this.routeTarget=null;this.updateRouteLine();return this.route.length>0}
 updateRouteLine(){const points=[this.playerRoot.position.clone().setY(.07),...this.route.map(p=>new T.Vector3(p.x,.07,p.z))];this.pathLine.geometry.dispose();this.pathLine.geometry=new T.BufferGeometry().setFromPoints(points);this.pathLine.computeLineDistances();this.pathLine.visible=points.length>1}
 bind(){
  window.addEventListener('keydown',e=>{if(/INPUT|TEXTAREA/.test(e.target.tagName)||!this.enabled)return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(e.code)){e.preventDefault();this.keys.add(e.code);this.route=[];this.routeTarget=null;this.updateRouteLine()}if(e.code==='KeyE'&&this.near)this.onStop?.(this.near.id)});window.addEventListener('keyup',e=>this.keys.delete(e.code));window.addEventListener('blur',()=>{this.keys.clear();this.joy={x:0,y:0}});
  this.canvas.addEventListener('pointerdown',e=>{if(!this.enabled)return;this.pointer={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:this.yaw,moved:false};this.canvas.setPointerCapture(e.pointerId)});
  this.canvas.addEventListener('pointermove',e=>{if(!this.pointer)return;const dx=e.clientX-this.pointer.x,dy=e.clientY-this.pointer.y;if(Math.hypot(dx,dy)>8){this.pointer.moved=true;this.yaw=this.pointer.yaw-dx*.006}});
  this.canvas.addEventListener('pointerup',e=>{const p=this.pointer;this.pointer=null;if(!p||p.moved||!this.enabled)return;const rect=this.canvas.getBoundingClientRect();this.ndc.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);this.ray.setFromCamera(this.ndc,this.camera);const hits=this.ray.intersectObjects(this.world.children,true);for(const hit of hits){let o=hit.object;while(o){if(o.userData.stopId){this.walkToStop(o.userData.stopId);return}o=o.parent}}
   const plane=new T.Plane(new T.Vector3(0,1,0),0),pt=new T.Vector3();if(this.ray.ray.intersectPlane(plane,pt))this.walkTo(pt);
  });this.canvas.addEventListener('pointercancel',()=>this.pointer=null);
  this.canvas.addEventListener('wheel',e=>{e.preventDefault();this.zoom=T.MathUtils.clamp(this.zoom+e.deltaY*.012,22,40);this.resize()},{passive:false});
 }
 resize(){const r=this.canvas.getBoundingClientRect(),w=r.width||innerWidth,h=r.height||innerHeight;this.renderer.setSize(w,h,false);const aspect=w/h,span=this.zoom*(aspect<.85?1.28:1);this.camera.left=-span*aspect/2;this.camera.right=span*aspect/2;this.camera.top=span/2;this.camera.bottom=-span/2;this.camera.updateProjectionMatrix()}
 updateCamera(dt){this.focusShift=T.MathUtils.lerp(this.focusShift,this.conversationFocus?4:0,1-Math.exp(-dt*5));const aimPoint=this.playerRoot.position.clone().add(new T.Vector3(Math.sin(this.yaw)*this.focusShift,0,Math.cos(this.yaw)*this.focusShift));this.target.lerp(aimPoint,1-Math.exp(-dt*4));this.camera.position.set(this.target.x+Math.sin(this.yaw)*27,27,this.target.z+Math.cos(this.yaw)*27);this.camera.lookAt(this.target.x,.0,this.target.z);this.camera.updateMatrixWorld();
  this.faded.forEach(o=>{o.material.opacity=1;o.material.transparent=false;o.material.depthWrite=true});this.faded=[];
  const aim=this.playerRoot.position.clone().add(new T.Vector3(0,.6,0)),dir=aim.clone().sub(this.camera.position).normalize();this.ray.set(this.camera.position,dir);this.ray.far=this.camera.position.distanceTo(aim)-.5;
  for(const hit of this.ray.intersectObjects(this.world.children.filter(o=>o.userData.occluder),true)){let root=hit.object;while(root.parent&&root.parent!==this.world)root=root.parent;if(!root.userData.occluder)continue;root.traverse(o=>{if(o.isMesh&&!Array.isArray(o.material)){o.material.transparent=true;o.material.opacity=.24;o.material.depthWrite=false;this.faded.push(o)}})}this.ray.far=Infinity;
 }
 frame(){const now=performance.now(),dt=Math.min((now-this.lastFrame)/1000,.05),time=(this.elapsed+=dt);this.lastFrame=now;this.mixers.forEach(m=>m.update(dt));let walking=false;
  if(this.enabled){let x=this.joy.x,z=this.joy.y;if(this.keys.has('KeyW')||this.keys.has('ArrowUp'))z--;if(this.keys.has('KeyS')||this.keys.has('ArrowDown'))z++;if(this.keys.has('KeyA')||this.keys.has('ArrowLeft'))x--;if(this.keys.has('KeyD')||this.keys.has('ArrowRight'))x++;
   let move=new T.Vector3(Math.cos(this.yaw)*x+Math.sin(this.yaw)*z,0,-Math.sin(this.yaw)*x+Math.cos(this.yaw)*z),speed=this.keys.has('ShiftLeft')||this.keys.has('ShiftRight')?6.5:4.4;
   if(move.lengthSq()<.01&&this.route.length){const next=this.route[0];move.set(next.x-this.playerRoot.position.x,0,next.z-this.playerRoot.position.z);if(move.length()<.16){this.route.shift();this.updateRouteLine();if(!this.route.length&&this.routeTarget){const id=this.routeTarget;this.routeTarget=null;this.onStop?.(id)}move.set(0,0,0)}else speed=Math.min(speed,move.length()/Math.max(dt,.001))}
   if(move.lengthSq()>.005){move.normalize();const p=this.playerRoot.position,nx=p.x+move.x*speed*dt,nz=p.z+move.z*speed*dt;const ox=p.x,oz=p.z;if(!isBlocked(nx,p.z,this.obstacles))p.x=nx;if(!isBlocked(p.x,nz,this.obstacles))p.z=nz;walking=Math.hypot(p.x-ox,p.z-oz)>.0001;if(this.actor&&walking){const angle=Math.atan2(move.x,move.z),diff=Math.atan2(Math.sin(angle-this.actor.rotation.y),Math.cos(angle-this.actor.rotation.y));this.actor.rotation.y+=diff*Math.min(1,dt*12)}this.onMove?.(p,this.region?.id)}
  }
  this.animateActor(this.actor,walking?'walk':'idle');if(this.actor&&!this.actor.userData.mixer)this.actor.position.y=walking?Math.sin(time*13)*.05:0;
  if(this.region){let nearest=null,dist=2.7;for(const s of this.region.stops){const d=Math.hypot(s.at[0]-this.playerRoot.position.x,s.at[1]-this.playerRoot.position.z);if(d<dist){dist=d;nearest=s}}if(nearest?.id!==this.near?.id){this.near=nearest;this.onNear?.(nearest)}}
  if(this.flight){const t=Math.min(1,(performance.now()-this.flight.start)/2700);this.flight.group.position.set(-30+t*65,7+Math.sin(t*Math.PI)*9,this.target.z-2);this.flight.group.rotation.z=-.12*Math.sin(t*Math.PI);this.onTravelProgress?.(t);if(t>=1){this.scene.remove(this.flight.group);this.flight.group.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose()}});const {id,resolve}=this.flight;this.flight=null;this.setRegion(id);resolve()}}
  if(this.playerRoot)this.updateCamera(dt);this.clouds.children.forEach((c,i)=>{c.position.x+=dt*(.12+i*.014);if(c.position.x>70)c.position.x=-70});this.renderer.render(this.scene,this.camera);
  if(this.region&&this.onMarkers){const w=this.canvas.clientWidth,h=this.canvas.clientHeight;this.onMarkers(this.region.stops.map(stop=>{this.screenPoint.set(stop.at[0],1.9,stop.at[1]).project(this.camera);const x=(this.screenPoint.x+1)*w/2,y=(1-this.screenPoint.y)*h/2;return {id:stop.id,x,y,visible:this.screenPoint.z>-1&&this.screenPoint.z<1&&x>30&&x<w-30&&y>105&&y<h-55}}))}
 }
 async flyTo(id){if(this.flight)return;this.setEnabled(false);this.route=[];this.updateRouteLine();if(matchMedia('(prefers-reduced-motion: reduce)').matches){this.setRegion(id);return}return new Promise(resolve=>{const group=new T.Group();const body=this.mesh(new T.SphereGeometry(1,16,12),0xfff9ea);body.scale.set(2.7,.6,.65);group.add(body);this.box('Plane wings',-.1,0,0,1.4,.13,5.8,0xe29b73,group);this.box('Plane tail',-2,.35,0,.65,1.2,.15,0x638797,group);this.scene.add(group);this.flight={group,id,resolve,start:performance.now()}})}
}

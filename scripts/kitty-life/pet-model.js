import * as T from 'three';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
export function attachPet(parent,state,alive=()=>true){
 let mixer=null,current=null,actions={},ready=false,head=null,headScale=null;
 const breed=state.species==='cat'?'cat':(state.breed||'corgi');
 const source=window.KittyPetModels?.[breed];
 if(source)new GLTFLoader().parse(JSON.stringify(source),'',g=>{
  if(!alive())return;const model=g.scene;model.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
  const wrapper=new T.Group(),s=(state.species==='dog'?2.15:2.35)/size.y;model.scale.setScalar(s);model.position.set(-center.x*s,-bounds.min.y*s,-center.z*s);wrapper.add(model);
  model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(['shiba','husky','fox'].includes(breed)){o.geometry.deleteAttribute('normal');o.geometry=mergeVertices(o.geometry);o.geometry.computeVertexNormals();}}});
  parent.children.forEach(c=>c.visible=false);parent.add(wrapper);
  const scarf=new T.Mesh(new T.TorusGeometry(.25,.055,8,32),new T.MeshStandardMaterial({color:state.outfit==='rain'?'#e9bb4c':state.outfit==='princess'?'#e59fb5':'#5baca0'}));scarf.rotation.x=Math.PI/2;scarf.position.set(0,.95,.35);if(state.breed!=='walker')wrapper.add(scarf);
  head=model.getObjectByName('Head');headScale=head?.scale.clone();mixer=new T.AnimationMixer(model);if(['corgi','duck'].includes(breed)&&g.animations.length===1&&g.animations[0].name==='clip'){const clip=g.animations[0];g.animations=[T.AnimationUtils.subclip(clip,'Idle',0,30,24),T.AnimationUtils.subclip(clip,'Walk',90,120,24),T.AnimationUtils.subclip(clip,'Run',90,120,24)];}g.animations.filter(c=>['Idle','Walk','Run','Gallop'].includes(c.name)).forEach(c=>actions[c.name]=mixer.clipAction(c));ready=true;parent.userData.assetReady=true;parent.userData.clips=Object.keys(actions);
 },error=>{parent.userData.assetError=true;console.warn('Pet model unavailable',error);});
 return {update(dt,moving,fast=false){if(!ready)return;const next=actions[moving?(fast?'Gallop':'Walk'):'Idle']||actions[moving?'Run':'Idle']||actions.Idle;if(next&&next!==current){current?.fadeOut(.2);next.reset().fadeIn(.2).play();current=next;}mixer.update(dt);if(head&&headScale)head.scale.copy(headScale).multiplyScalar(breed==='walker'?.72:['corgi','duck'].includes(breed)?1:breed==='fox'?1.08:state.species==='dog'?1.18:1.5);},get ready(){return ready;}};
}

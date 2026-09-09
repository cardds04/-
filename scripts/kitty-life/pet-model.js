import * as T from 'three';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
export function attachPet(parent,state,alive=()=>true){
 let mixer=null,current=null,actions={},ready=false,head=null,headScale=null;
 const source=window.KittyPetModels?.[state.species==='dog'?'shiba':'cat'];
 if(source)new GLTFLoader().parse(JSON.stringify(source),'',g=>{
  if(!alive())return;const model=g.scene;model.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
  const wrapper=new T.Group(),s=(state.species==='dog'?2.15:2.35)/size.y;model.scale.setScalar(s);model.position.set(-center.x*s,-bounds.min.y*s,-center.z*s);wrapper.add(model);
  model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(state.species==='dog'){o.geometry.deleteAttribute('normal');o.geometry=mergeVertices(o.geometry);o.geometry.computeVertexNormals();}}});
  parent.children.forEach(c=>c.visible=false);parent.add(wrapper);
  const scarf=new T.Mesh(new T.TorusGeometry(.25,.055,8,32),new T.MeshStandardMaterial({color:state.outfit==='rain'?'#e9bb4c':state.outfit==='princess'?'#e59fb5':'#5baca0'}));scarf.rotation.x=Math.PI/2;scarf.position.set(0,.95,.35);wrapper.add(scarf);
  head=model.getObjectByName('Head');headScale=head?.scale.clone();mixer=new T.AnimationMixer(model);g.animations.forEach(c=>actions[c.name]=mixer.clipAction(c));ready=true;parent.userData.assetReady=true;parent.userData.clips=Object.keys(actions);
 },()=>{parent.userData.assetError=true});
 return {update(dt,moving,fast=false){if(!ready)return;const next=actions[moving?(fast?'Gallop':'Walk'):'Idle']||actions[moving?'Run':'Idle']||Object.values(actions)[0];if(next&&next!==current){current?.fadeOut(.2);next.reset().fadeIn(.2).play();current=next;}mixer.update(dt);if(head&&headScale)head.scale.copy(headScale).multiplyScalar(state.species==='dog'?1.4:1.5);},get ready(){return ready;}};
}

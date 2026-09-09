import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const cache=new Map();
export function asset(id,parent,{width=1,x=0,y=0,z=0,rotation=0,alive=()=>true,onReady=()=>{}}={}){
 let root=parent;while(root.parent)root=root.parent;const spread=root.isScene?root.scale.x:1;
 const holder=new T.Group();holder.position.set(x,y,z);holder.rotation.y=rotation;parent.add(holder);const source=window.KittyWorldModels?.[id];if(!source)return holder;
 if(!cache.has(id))cache.set(id,new Promise((resolve,reject)=>new GLTFLoader().parse(JSON.stringify(source),'',g=>resolve(g.scene),reject)));
 cache.get(id).then(base=>{if(!alive())return;const model=base.clone(true);model.updateMatrixWorld(true);const b=new T.Box3().setFromObject(model),s=b.getSize(new T.Vector3()),c=b.getCenter(new T.Vector3());const k=width/Math.max(s.x,s.z);model.scale.set(k/spread,k,k/spread);model.position.set(-c.x*k/spread,-b.min.y*k,-c.z*k/spread);model.traverse(o=>{if(o.isMesh){o.geometry=o.geometry.clone();o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();[].concat(o.material).forEach(m=>{m.metalness=0;m.roughness=.85;});o.castShadow=o.receiveShadow=true;}});holder.add(model);holder.userData.asset=id;holder.userData.dimensions=[s.x*k,s.z*k];onReady(holder);}).catch(()=>{holder.userData.assetError=true});return holder;
}

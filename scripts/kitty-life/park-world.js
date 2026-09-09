import * as T from 'three';
import {asset} from './world-assets.js';
export const villagePlaces=[
{id:'home',name:'우리 집',x:-25,z:23,model:'building-type-f'},
{id:'school',name:'유치원',x:-25,z:-10,model:'building-type-b'},
{id:'library',name:'도서관',x:-25,z:-29,model:'building-e'},
{id:'hotel',name:'달빛 호텔',x:0,z:-32,model:'building-type-q'},
{id:'airport',name:'공항',x:26,z:-31,model:'building-j'},
{id:'clinic',name:'동물병원',x:26,z:-11,model:'building-type-c'},
{id:'cafe',name:'발바닥 카페',x:26,z:12,model:'building-b'},
{id:'shop',name:'상점',x:8,z:29,model:'building-a'},
{id:'forest',name:'숲속 산책길',x:-12,z:-36,model:null},
{id:'park',name:'중앙 공원',x:-8,z:5,model:null}
];
const riverX=z=>4+Math.sin(z/12)*2;
export function waterBlocked(x,z){const bridge=[-16,16].some(b=>Math.abs(z-b)<1.5);return (!bridge&&Math.abs(x-riverX(z))<1.65&&z>-37&&z<34)||((x-12)**2/49+(z+2)**2/36<1);}
export function buildPark(parent,{places,state,label,alive}){
 const mat=c=>new T.MeshStandardMaterial({color:c,roughness:.9});
 const box=(w,h,d,c,x,y,z)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat(c));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
 function ribbon(points,width,color){const curve=new T.CatmullRomCurve3(points.map(([x,z])=>new T.Vector3(x,.02,z))),positions=[],p=curve.getPoints(100);for(let i=0;i<p.length-1;i++){const a=p[i],b=p[i+1],side=new T.Vector3().subVectors(b,a).normalize().cross(new T.Vector3(0,1,0)).multiplyScalar(width/2);for(const v of [a.clone().add(side),b.clone().add(side),a.clone().sub(side),a.clone().sub(side),b.clone().add(side),b.clone().sub(side)])positions.push(v.x,v.y,v.z);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.computeVertexNormals();const m=new T.Mesh(g,mat(color));m.material.side=T.DoubleSide;m.receiveShadow=true;parent.add(m);return m;}
 const ground=box(80,.18,84,'#a9c789',0,-.13,-3);ground.userData.ground=true;
 ribbon([[-18,25],[-20,8],[-18,-16],[-10,-25],[7,-25],[20,-18],[21,8],[18,24],[0,26],[-18,25]],2.8,'#e1c99e');
 ribbon([[-21,-16],[-6,-16],[5,-16],[21,-16]],2.6,'#e1c99e');ribbon([[-21,16],[-8,16],[5,16],[21,16]],2.6,'#e1c99e');
 ribbon([[-8,23],[-11,9],[-8,-1],[-10,-12],[-8,-24]],1.7,'#e7d7b5');
 const river=ribbon(Array.from({length:15},(_,i)=>{const z=-38+i*5.2;return[riverX(z),z]}),3.5,'#71bcc4');river.position.y=.015;
 const pond=new T.Mesh(new T.CircleGeometry(1,60),new T.MeshStandardMaterial({color:'#75bec5',roughness:.28,metalness:.15}));pond.rotation.x=-Math.PI/2;pond.scale.set(7.2,6.2,1);pond.position.set(12,.045,-2);parent.add(pond);
 for(const z of [-16,16]){const x=riverX(z);box(5,.18,2.6,'#b5824c',x,.08,z);for(let a=-2.4;a<=2.4;a+=.4)box(.08,.02,2.6,'#ddbc86',x+a,.18,z);for(const s of [-1,1]){box(5,.1,.08,'#d3a46c',x,.9,z+s*1.2);for(let a=-2;a<=2;a+=1)box(.1,.9,.1,'#a67545',x+a,.5,z+s*1.2);}}
 for(const p of places){p.door={x:p.x,z:p.z+(p.model?3.9:2)};if(p.model){const g=new T.Group();g.position.set(p.x,0,p.z);g.userData.place=p.id;parent.add(g);const model=p.id==='home'?(window.KittyData.houses.find(h=>h.id===state.house)?.model||p.model):p.model;asset(model,g,{width:p.id==='hotel'?8:6.7,alive,onReady:h=>{const top=new T.Box3().setFromObject(h).max.y;label(p.name,0,top+.65,0,g);}});ribbon([[p.x,p.door.z],[p.x*.8,p.door.z+1.2],[p.x*.7,p.door.z+2.5]],2.2,'#e1c99e');for(const dx of [-4,4]){asset('pottedPlant',parent,{width:.8,x:p.x+dx,z:p.z+3,alive});asset('bench',parent,{width:1.8,x:p.x+dx,z:p.z,rotation:Math.PI/2,alive});}}
 else{const g=new T.Group();g.position.set(p.x,0,p.z);g.userData.place=p.id;parent.add(g);asset(p.id==='forest'?'tent_smallOpen':'bench',g,{width:2.4,alive});label(p.name,0,2.7,0,g);}}
 // Landscaped perimeter preserves a broad, uncluttered center lawn.
 for(let i=0;i<70;i++){const side=i%4,x=side<2?(side===0?-34:34):(-32+(i%18)*3.8),z=side<2?(-37+(i%18)*4):side===2?-40:34;if(places.some(p=>Math.hypot(p.x-x,p.z-z)<6))continue;asset(i%3?'tree_oak':'tree_pineSmallA',parent,{width:2.6+i%3*.35,x,z,alive});}
 for(const[x,z]of [[-14,2],[-2,-7],[-14,18],[0,21],[21,3],[-19,-23],[20,-23]]){asset('tree_oak',parent,{width:3.2,x,z,alive});asset('bench',parent,{width:1.9,x:x+2.1,z:z+1,rotation:-Math.PI/2,alive});for(let i=0;i<3;i++)asset('flower_purpleA',parent,{width:.55,x:x-1+i*.6,z:z+1.8,alive});}
 for(let i=0;i<18;i++){const a=i/18*Math.PI*2;asset('rock_smallB',parent,{width:.7,x:12+Math.cos(a)*7.5,z:-2+Math.sin(a)*6.6,alive});}
 for(const[x,z]of [[-13,6],[-3,10],[-12,-8]]){asset('rugRectangle',parent,{width:2,x,z,alive});asset('apple',parent,{width:.35,x:x+.3,z,alive});}
 // Agility play corner and a tiny regional airstrip.
 for(const x of [-15,-12,-9]){box(.12,.8,.12,'#d6ac6a',x,.4,-3);box(.12,.8,.12,'#d6ac6a',x,.4,-1);box(.12,.12,2,'#f5d48b',x,.8,-2);}box(10,.02,2,'#b6b5ad',25,.01,-37);asset('fence-low',parent,{width:2.5,x:20,z:-35,alive});
}

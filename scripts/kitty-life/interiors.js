import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {asset} from './world-assets.js';
export function buildInterior(group,id,alive){
 const blocks=[];const palette={cafe:'#94b4a0',hotel:'#4d8279',clinic:'#a6cdd5',school:'#ecc582',library:'#8ca387',shop:'#d5a194',airport:'#9eb8ce'};
 const trim=palette[id]||'#8dae88',outdoor=['park','forest'].includes(id);
 function box(w,h,d,color,x,y,z){const m=new T.Mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(.035,w/10,h/10,d/10)),new T.MeshStandardMaterial({color,roughness:.9}));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;group.add(m);return m;}
 function put(model,width,x,z,{y=0,r=0,action,solid=true}={}){const h=asset(model,group,{width,x,z,y,rotation:r,alive,onReady:root=>root.traverse(o=>{if(!o.isMesh)return;for(const m of [].concat(o.material)){if(m.name==='wood')m.color.set('#b9814e');if(m.name==='plant')m.color.set('#57916c');if(m.name==='carpet')m.color.set(({clinic:'#92bccc',library:'#86a68a',hotel:'#c5a887',school:'#dbb163'})[id]||'#d08c7c');}})});if(action!==undefined)h.userData.action=action;if(solid&&y===0&&!model.startsWith('rug'))blocks.push({x,z,w:width*.85,d:width*.65});return h;}
 function table(x,z){put('tableRound',1.5,x,z,{action:0});put('chairCushion',.7,x-.95,z,{r:Math.PI/2});put('chairCushion',.7,x+.95,z,{r:-Math.PI/2});put('mug',.2,x-.25,z,{y:.83});put('croissant',.3,x+.25,z,{y:.82});put('plantSmall1',.27,x,z-.2,{y:.83});}
 function shelf(x,z,width=1.7,r=0){put('bookcaseClosedWide',width,x,z,{r,action:0});put('books',width*.66,x,z,{y:.65,r});put('plantSmall2',.45,x,z,{y:1.8});}
 function counter(){box(3,1.05,.75,trim,0,.52,-2.55);box(3.12,.12,.87,'#f0dfbd',0,1.1,-2.55);blocks.push({x:0,z:-2.55,w:3.1,d:.9});for(const x of [-1,0,1])box(.85,.65,.035,'#e1d1ae',x,.55,-2.15);put('computerScreen',.5,.75,-2.55,{y:1.17,action:2});put('plantSmall1',.35,-1.1,-2.55,{y:1.17});}
 const floor=box(12,.16,10,outdoor?'#a7c98b':'#cfaa77',0,-.1,0);floor.userData.ground=true;
 if(outdoor){box(2.6,.025,9,'#e0cca0',0,0,0);for(const x of [-5,5])for(const z of [-4,-.5,3.5]){put(id==='forest'?'tree_pineSmallA':'tree_oak',2.3,x,z);put('flower_yellowA',.6,x*.85,z,{solid:false});}for(const x of [-4,-2,0,2,4])put('fence-low',1.9,x,-4.6,{solid:false});put('bench',1.8,-3,0,{r:Math.PI/2,action:1});put('tent_smallOpen',2.1,3,-3);put('table',1.5,3,1,{action:1});put('apple',.25,3,1,{y:.85});put('bear',.5,-3,2.5,{action:0});put('planter',1.2,3,3.5,{action:2});return blocks;}
 // Recessed panels, large windows and low entrance walls frame the whole room.
 box(12,3.8,.13,'#f0e6d3',0,1.82,-5);box(.13,3.8,10,'#f0e6d3',-6,1.82,0);
 box(12,1.1,.07,trim,0,.55,-4.9);box(.07,1.1,10,trim,-5.9,.55,0);box(12,.08,.1,'#e5cfac',0,1.13,-4.85);
 for(let z=-4.6;z<5;z+=.5)box(11.9,.009,.015,'#b89060',0,-.006,z);
 for(const z of [-2,1.7]){box(.08,1.8,2.7,'#e8ce9e',-5.86,2.2,z);const pane=box(.08,1.58,2.45,'#b7e0e7',-5.78,2.2,z);pane.material.emissive.set('#b8dfe0');pane.material.emissiveIntensity=.15;box(.12,.07,2.5,'#fff7e5',-5.7,2.2,z);box(.12,1.6,.07,'#fff7e5',-5.7,2.2,z);}
 for(const x of [-3.7,3.7])box(4.4,.55,.15,trim,x,.22,4.9);put('rugRectangle',1.8,0,4.1,{solid:false});
 for(const x of [-5.25,5.15])put('pottedPlant',.75,x,3.9);put('coatRackStanding',.7,-5.2,-4.3);
 for(const x of [-3,3]){box(.04,.65,.04,'#a8814d',x,3.5,-1.7);const lamp=box(.42,.38,.42,'#ffe1aa',x,3,-1.7);lamp.material.emissive.set('#ffd89a');lamp.material.emissiveIntensity=.5;}
 counter();
 if(id==='cafe'){
  for(const x of [-2.5,0,2.5])put('kitchenCabinetDrawer',2,x,-4.35);put('kitchenCoffeeMachine',.6,-1,-4.35,{y:.95});put('toaster',.5,1,-4.35,{y:.95});put('kitchenFridgeLarge',1,4.8,-4.1);put('kitchenSink',1.3,-4.2,-4.25);
  table(-3.8,-.4);table(-3.8,2.5);table(3.8,1.7);put('kitchenCabinet',1.2,3.8,-1.3,{action:0});for(const x of [3.5,3.9,4.2])put('croissant',.28,x,-1.3,{y:1});
 }else if(id==='hotel'){
  put('rugRounded',3.6,-3.7,1.6,{solid:false});put('loungeSofaLong',2.4,-4.9,.9,{r:Math.PI/2});put('loungeChairRelax',1.2,-3.2,3);put('tableCoffeeGlass',1.5,-3.4,1.35);put('plantSmall1',.35,-3.4,1.35,{y:.55});
  // A corridor door, rather than a bed in the lobby.
  box(2.1,3.15,.08,'#826348',3.9,1.5,-4.84);box(1.8,2.9,.06,'#bc9f70',3.9,1.4,-4.77);box(.06,2.8,.08,'#e6cd93',3.9,1.4,-4.7);
  box(3,1.6,.18,'#846241',-.6,2.65,-4.78);for(let x=-2.05;x<1;x+=.6)box(.05,1.6,.22,'#dfba78',x,2.65,-4.64);for(const y of [1.85,2.4,2.95,3.45])box(3,.055,.22,'#dfba78',-.6,y,-4.64);
  put('cabinetBedDrawer',1.1,4.7,1.5);put('lampRoundFloor',.55,4.9,3);put('lampRoundTable',.45,-.8,-2.55,{y:1.17});
 }else if(id==='clinic'){
  for(const z of [-1.8,0,1.8])put('chairModernCushion',.9,-4.8,z,{r:Math.PI/2});put('tableCoffee',1,-4.8,3.2);put('books',.5,-4.8,3.2,{y:.6});
  box(.12,1.1,4.7,'#c9dfe0',1.95,.55,-.7);blocks.push({x:1.95,z:-.7,w:.2,d:4.7});put('bedSingle',2.3,3.8,-.2,{r:Math.PI/2,action:0});put('bathroomSink',1.1,4.7,-4.1);put('cabinetBedDrawer',1.2,3.2,-4.1);put('stoolBar',.6,3.8,1.9);
 }else if(id==='school'){
  for(const x of [-3.9,3.9]){put('bookcaseOpenLow',2.2,x,3.8);put('bear',.4,x,3.8,{y:.7});}
  put('tableRound',2.2,-3.6,-.1,{action:2});for(const z of [-1.35,1.2])put('chairRounded',.75,-3.6,z,{r:z<0?0:Math.PI});put('books',.5,-3.6,-.1,{y:.8});
  put('rugRound',3,3.6,.2,{solid:false});put('bear',.9,4.5,-.8);put('pillowBlue',.7,3,.7,{solid:false});put('pillowLong',.8,4.3,1.2,{solid:false});shelf(3.8,-4.15,2);
 }else if(id==='library'){
  for(const x of [-3.8,-1.8,.2,2.2,4.2])shelf(x,-4.3,1.75);
  for(const z of [-.5,2]){put('desk',1.4,-4.7,z,{action:2});put('chairRounded',.7,-3.8,z,{r:-Math.PI/2});put('books',.45,-4.7,z,{y:.85});}
  put('rugRounded',3.1,3.5,1,{solid:false});put('loungeChairRelax',1.1,4.5,0,{r:-Math.PI/2});put('loungeChairRelax',1.1,3.3,2.3,{r:Math.PI});put('tableCoffee',1.2,3.3,.7);put('books',.5,3.3,.7,{y:.6});
 }else if(id==='shop'){
  for(const x of [-4.8,4.8])for(const z of [-3,-.6,1.8])shelf(x,z,1.5,x<0?Math.PI/2:-Math.PI/2);
  for(const x of [-2.8,2.8]){put('kitchenCabinetDrawer',1.7,x,.4,{action:0});for(const [i,model]of ['apple','carrot','broccoli'].entries())put(model,.3,x-.5+i*.5,.4,{y:.9});}
 }else if(id==='airport'){
  for(const x of [-3.7,3.7])for(const z of [-.8,2])put('loungeSofaLong',2,x,z);put('computerScreen',.55,0,-2.55,{y:1.17,action:2});put('desk',1.2,4.3,-3.7,{action:2});
 }
 return blocks;
}

import * as T from 'three';
import {asset} from './world-assets.js';
export const homeRooms={follow:{name:'따라보기',x:0,z:0},all:{name:'집 전체',x:4.5,z:-3.8},living:{name:'거실',x:0,z:0},kitchen:{name:'주방·식탁',x:9,z:0,entry:[6,0]},bedroom:{name:'안방',x:0,z:-7.5,entry:[0,-5]},bathroom:{name:'욕실',x:9,z:-7.5,entry:[9,-5]}};
export function buildHouseWings(scene,alive){const blocks=[];function box(w,h,d,c,x,y,z,solid=false){const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color:c,roughness:.88}));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;scene.add(m);if(solid)blocks.push({x,z,w,d});return m;}
 function put(model,width,x,z,{y=0,r=0,use,solid=true}={}){const h=asset(model,scene,{width,x,z,y,rotation:r,alive,onReady:root=>root.traverse(o=>{if(o.isMesh)for(const m of [].concat(o.material)){if(m.name==='wood')m.color.set('#b9814e');if(m.name==='plant')m.color.set('#57916c');}})});if(use)h.userData.homeUse=use;if(y===0&&solid&&!model.startsWith('rug'))blocks.push({x,z,w:width*.8,d:width*.7});}
 for(const[x,z,w,d,c]of [[9,0,8,7,'#ceae83'],[0,-7.5,8,8,'#d3b28c'],[9,-7.5,8,8,'#c9d8d2'],[4.5,-3.7,1,15,'#d8bd99'],[4.5,-3.75,17,.5,'#d8bd99']]){const f=box(w,.18,d,c,x,-.1,z);f.userData.walkFloor=true;}
 // Plank seams and bathroom grout keep the large floor from looking like a flat slab.
 for(const [cx,cz,w,d]of [[9,0,8,7],[0,-7.5,8,8]])for(let z=cz-d/2+.35;z<cz+d/2;z+=.45){box(w,.006,.014,'#b1916f',cx,.002,z);for(let x=cx-w/2+1;x<cx+w/2;x+=1.8)box(.012,.006,.44,'#b1916f',x+((Math.round(z/.45)%2)*.35),.003,z-.22);}
 for(let x=5;x<=13;x+=.8)box(.014,.006,8,'#eef3eb',x,.003,-7.5);for(let z=-11.5;z<=-3.5;z+=.8)box(8,.006,.014,'#eef3eb',9,.003,z);
 put('loungeSofa',2.1,-2.7,0,{r:Math.PI/2});
 box(17,3.6,.12,'#ede2ce',4.5,1.7,-11.55,true);box(.12,3.6,8,'#ede2ce',-4.05,1.7,-7.5,true);box(17,.22,.15,'#7f9f8c',4.5,.15,-11.43);
 // Door openings through the low cutaway room dividers.
 for(const x of [-2.55,2.55,6.45,11.55])box(2.9,1,.12,'#dfd1b6',x,.4,-3.65,true);
 for(const z of [-9.6,-5.3,-2.3,2.3])box(.12,1,2.5,'#dfd1b6',4.45,.4,z,true);
 for(const x of [-2,9]){box(2.3,1.8,.08,'#f1ce9f',x,2.3,-11.42);box(2.1,1.6,.08,'#b7dfe6',x,2.3,-11.33);box(.09,1.6,.1,'#fff5df',x,2.3,-11.25);}
 put('rugRectangle',3.8,0,-7.8,{solid:false});put('bedDouble',2.8,0,-9,{use:'bed'});for(const x of [-2,2]){put('cabinetBedDrawer',.8,x,-9.4);put('lampRoundTable',.35,x,-9.4,{y:.75});}put('bookcaseClosedWide',1.2,-3,-9.7);put('pottedPlant',.7,3,-10);put('pillowBlue',.65,2.7,-6.4,{solid:false});
 for(const x of [6.5,8.2,9.9])put('kitchenCabinetDrawer',1.5,x,-2.85);put('kitchenSink',1.2,6.5,-2.85,{use:'fridge'});put('kitchenCoffeeMachine',.45,8.2,-2.85,{y:.95});put('kitchenFridgeLarge',1.1,12,-2.6,{use:'fridge'});put('tableRound',2.1,9,1,{use:'fridge'});for(const[x,z,r]of [[7.6,1,Math.PI/2],[10.4,1,-Math.PI/2],[9,-.3,0],[9,2.3,Math.PI]])put('chairCushion',.7,x,z,{r});put('plate',.38,9,1,{y:.87});put('apple',.25,9.4,1,{y:.87});put('plantSmall2',.7,12,2.7);
 put('bathtub',2.1,6.8,-9.5,{use:'bath'});put('showerRound',1.6,11.7,-9.6,{use:'bath'});put('bathroomSink',1,9.2,-10.6,{use:'bath'});put('washer',1.1,11.8,-6);put('cabinetBedDrawer',1.1,6.4,-5.2);put('rugRound',1.6,9,-7,{solid:false});put('pottedPlant',.65,6,-10.7);
 return blocks;
}

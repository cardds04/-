// Tile-space rules stay independent of the screen's 2:1 isometric projection.
const HALF_W=32, HALF_H=16;
function toIso(x,y){return{x:(x-y)*HALF_W,y:(x+y)*HALF_H};}
function fromIso(x,y){return{x:(x/HALF_W+y/HALF_H)/2,y:(y/HALF_H-x/HALF_W)/2};}
function screenMovement(x,y){const len=Math.hypot(x,y);if(len>1){x/=len;y/=len}return{x:.72*x+1.44*y,y:-.72*x+1.44*y};}
function screenDirection(dx,dy){const p=toIso(dx,dy);if(Math.abs(p.y)<1e-6)return p.x>0?'right':'left';if(Math.abs(p.x)<1e-6)return p.y>0?'down':'up';return `${p.y>0?'down':'up'}-${p.x>0?'right':'left'}`;}
module.exports={HALF_W,HALF_H,toIso,fromIso,screenMovement,screenDirection};

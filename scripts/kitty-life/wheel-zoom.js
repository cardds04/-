// Dolly the follow camera; wheel input stays on the 3D surface, not UI panels.
export function wheelZoom(canvas,host){
 let distance=1;
 const wheel=e=>{e.preventDefault();const pixels=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?canvas.clientHeight:1);distance=Math.max(.6,Math.min(1.8,distance*Math.exp(Math.max(-240,Math.min(240,pixels))*.0018)));host.dataset.zoomDistance=distance.toFixed(3);};
 canvas.addEventListener('wheel',wheel,{passive:false});canvas.title='휠 위로: 가까이 · 휠 아래로: 멀리';host.dataset.zoomDistance='1.000';
 return {get distance(){return distance;},dispose(){canvas.removeEventListener('wheel',wheel);}};
}

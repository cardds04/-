// A short press walks. Holding the floor for 350ms runs until release.
export const SPACE=Math.SQRT2; // twice the walkable floor area, with life-size props
export function pointerTravel(canvas,host,allowed=()=>true){
 let timer=0,held=null,running=false;
 const clear=()=>{clearTimeout(timer);timer=0;held=null;running=false;host.dataset.running='false';};
 const down=e=>{if(e.button!==0||!allowed())return;clear();held=e.pointerId;canvas.setPointerCapture?.(e.pointerId);timer=setTimeout(()=>{if(held===e.pointerId&&allowed()){running=true;host.dataset.running='true';}},350);};
 const up=e=>{if(held===e.pointerId)clear();};
 canvas.style.touchAction='none';canvas.setAttribute('aria-label','바닥을 짧게 누르면 걷기, 길게 누르면 달리기');canvas.addEventListener('pointerdown',down);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);canvas.addEventListener('lostpointercapture',clear);window.addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
 return {get running(){return running&&allowed();},dispose(){clear();canvas.removeEventListener('pointerdown',down);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);canvas.removeEventListener('lostpointercapture',clear);window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',clear);}};
}

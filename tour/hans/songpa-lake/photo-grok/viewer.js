(() => {
  'use strict';
  const cfg = window.ROOM;
  const by = id => document.getElementById(id);
  const stage = by('stage'), native = by('native'), bridge = by('bridge'), original = by('original');
  const modeButton = by('mode'), playButton = by('play'), slider = by('scrub');
  const context = bridge.getContext('2d', {alpha:false});
  const pics = new Map(cfg.photos.map(p => [p.id, p]));
  let total = 0;
  const sections = cfg.sections.map(item => {
    const entry = {...item, begin:total}; total += item.duration; entry.end = total; return entry;
  });
  const entries = new Map(), imageCache = new Map();
  let position = 0, selected = cfg.startPhoto, gallery = false, playing = false, raf = 0, time = 0;
  let current = null, lastSheet = '', playEpoch = 0, gesture, drawQueued = false;
  const clamp = (x, low, high) => Math.min(high, Math.max(low, x));
  const movement = (x, delta) => cfg.loop ? (x + delta + total) % total : clamp(x + delta, 0, total);
  const degrees = Math.PI/180;
  function queueDraw() {
    if (!drawQueued) {
      drawQueued = true;
      requestAnimationFrame(() => {drawQueued=false; draw();});
    }
  }
  function fetchImage(src, persistent=false) {
    if (!imageCache.has(src)) {
      const im = new Image(); im.decoding='async';
      const cell={image:im, ready:false, failed:false, persistent, used:performance.now()}; imageCache.set(src,cell);
      im.onload=()=>{cell.ready=true; queueDraw();}; im.onerror=()=>{cell.failed=true; queueDraw();}; im.src=src;
    }
    const item=imageCache.get(src);item.used=performance.now();return item;
  }
  function prune() {
    const disposable=[...imageCache.entries()].filter(k=>!k[1].persistent && k[1].ready && k[0]!==lastSheet);
    if(disposable.length<=4)return;
    disposable.sort((a,b)=>a[1].used-b[1].used);
    for(const [url] of disposable.slice(0,disposable.length-4))imageCache.delete(url);
  }
  function imageNodes() {
    for(const p of pics.values()){
      const img = document.createElement('img');img.src=p.src;img.alt='';img.draggable=false;img.style.zIndex='0';
      native.appendChild(img);entries.set(p.id,img);
      const b=document.createElement('button'); b.type='button';b.className='thumb';b.dataset.photo=p.id;
      b.setAttribute('aria-label',p.label+' 원본 사진 보기');
      const t=document.createElement('img');t.src=p.thumb;t.alt='';t.width=150;t.height=100;
      const name=document.createElement('span');name.textContent=p.label;b.append(t,name);b.onclick=()=>showPhoto(p.id);by('thumbs').appendChild(b);
    }
  }
  function inverse(m) {
    const [a,b,c,d,e,f,g,h,i]=m;
    const v=[e*i-f*h,c*h-b*i,b*f-c*e,f*g-d*i,a*i-c*g,c*d-a*f,d*h-e*g,b*g-a*h,a*e-b*d];
    const s=v[8];return v.map(n=>n/s);
  }
  // Exact projective mapping from a rectilinear camera photograph onto the portrait view.
  function originalWarp(p, yaw, field, width, height) {
    const lens=Math.tan(field*degrees/2), a=(yaw-cfg.offset)*degrees, cs=Math.cos(a), sn=Math.sin(a);
    const R=p.rotation, c=p.center, f=p.focal;
    function project(x,y) {
      const xx=(2*x/width-1)*lens, yy=(1-2*y/height)*lens*height/width;
      const w=[xx*cs+sn,yy,cs-xx*sn];
      const q=[0,1,2].map(k=>w[0]*R[0][k]+w[1]*R[1][k]+w[2]*R[2][k]);
      return [c[0]*q[2]+f*q[0],c[1]*q[2]+f*q[1],q[2]];
    }
    const z=project(0,0), x=project(width,0), y=project(0,height);
    const m=[];
    for(let k=0;k<3;k++)m.push((x[k]-z[k])/width,(y[k]-z[k])/height,z[k]);
    const h=inverse(m);
    return 'matrix3d('+[h[0],h[3],0,h[6],h[1],h[4],0,h[7],0,0,1,0,h[2],h[5],0,h[8]].join(',')+')';
  }
  function showNative(seg,t) {
    const p=pics.get(seg.photo),img=entries.get(seg.photo);
    const from=seg.yaw[0],to=seg.yaw[1], yaw=from+(to-from)*t;
    const fields=Array.isArray(seg.field)?seg.field:[seg.field,seg.field];
    img.style.transform=originalWarp(p,yaw,fields[0]+(fields[1]-fields[0])*t,stage.clientWidth,stage.clientHeight);
    for(const [key,n] of entries)n.style.zIndex=key===seg.photo?'2':'0';
    bridge.hidden=true;by('feedback').hidden=true;stage.dataset.photo=seg.photo;
  }
  function frameFrom(img,n,cols,w,h) {
    const scale=Math.min(devicePixelRatio||1,2);
    const width=Math.min(w,Math.max(1,Math.round(stage.clientWidth*scale))),height=Math.round(width*1.5);
    if(bridge.width!==width || bridge.height!==height){bridge.width=width;bridge.height=height;}
    context.drawImage(img,n%cols*w,Math.floor(n/cols)*h,w,h,0,0,width,height);
    bridge.hidden=false;
  }
  function showSequence(seg,t) {
    const m=cfg.sequences[seg.sequence],index=clamp(Math.round(t*(m.count-1)),0,m.count-1);
    if(m.photographicFrames){
      const caption=m.photographicFrames.includes(index)?'현장 사진':seg.source;
      if(by('source').textContent!==caption){by('source').textContent=caption;by('mobile-source').textContent=caption;}
    }
    const page=Math.floor(index/m.per), offset=index-page*m.per, sheet=m.sheets[page];lastSheet=sheet;
    const currentSheet=fetchImage(sheet), fb=fetchImage(m.preview,true);
    if(currentSheet.ready){frameFrom(currentSheet.image,offset,m.cols,m.width,m.height);by('feedback').hidden=true;}
    else if(fb.ready){
      frameFrom(fb.image,Math.round(t*(m.previewCount-1)),m.previewCols,m.previewWidth,m.previewHeight);
      by('feedback').hidden=true;
    } else {by('feedback').textContent=fb.failed&&currentSheet.failed?'사진을 불러올 수 없습니다':'불러오는 중';by('feedback').hidden=false;}
    const neighbor=page+(offset>m.per/2?1:-1);
    if(m.sheets[neighbor])fetchImage(m.sheets[neighbor]);
    prune();stage.dataset.photo='';
  }
  function label(seg) {
    by('source').textContent=seg.source;by('mobile-source').textContent=seg.source;
    by('scene').textContent=seg.label;
    slider.setAttribute('aria-valuetext',seg.label);
    stage.dataset.kind=seg.kind;
    for(const b of by('thumbs').children)b.removeAttribute('aria-current');
  }
  function draw() {
    if(gallery)return;
    const v=clamp(position,0,total);
    const seg=sections.find(s=>v<s.end-1e-9)||sections[sections.length-1];
    const t=clamp((v-seg.begin)/seg.duration,0,1);
    if(current!==seg){label(seg);current=seg;}
    if(seg.kind==='photo')showNative(seg,t);else showSequence(seg,t);
    slider.value=Math.round(v/total*1000);slider.style.setProperty('--progress',v/total*100+'%');stage.dataset.progress=(v/total).toFixed(5);
    if(!cfg.loop){by('previous').disabled=v<.00001;by('next').disabled=v>=total-.00001;}
  }
  function jump(v){position=clamp(v,0,total);draw();}
  function setPlaying(on) {
    playing=on;time=0;playEpoch++;cancelAnimationFrame(raf);raf=0;
    by('playlabel').textContent=on?'일시 정지':'자동 재생';playButton.setAttribute('aria-label',on?'일시 정지':'자동 재생');playButton.setAttribute('aria-pressed',String(on));
    if(on){const epoch=playEpoch;raf=requestAnimationFrame(t=>tick(t,epoch));}
  }
  function tick(t,epoch) {
    if(!playing || epoch!==playEpoch)return;
    if(time)position=movement(position,Math.min(100,t-time)/1000);
    time=t;draw();
    if(!cfg.loop&&position>=total){setPlaying(false);return;}
    raf=requestAnimationFrame(next=>tick(next,epoch));
  }
  const names=[...pics.keys()];
  function pick(id){const p=pics.get(id);selected=id;original.src=p.src;original.alt=p.label;by('photo-counter').textContent=(names.indexOf(id)+1)+' / '+names.length;by('source').textContent='현장 원본';by('mobile-source').textContent='현장 원본';by('scene').textContent=p.label;
    for(const b of by('thumbs').children)b.setAttribute('aria-current',String(+b.dataset.photo===id));
  }
  function showPhoto(id) {
    setPlaying(false);gallery=true;current=null;stage.dataset.mode='original';stage.setAttribute('aria-label','원본 사진');
    bridge.hidden=true;original.hidden=false;by('feedback').hidden=true;by('controls').hidden=true;by('photo-nav').hidden=false;
    modeButton.innerHTML='둘러보기 <span aria-hidden="true">↗</span>';modeButton.setAttribute('aria-pressed','true');pick(id);
  }
  function changePhoto(byStep){pick(names[(names.indexOf(selected)+byStep+names.length)%names.length]);}
  function returnTour() {
    gallery=false;stage.dataset.mode='tour';stage.setAttribute('aria-label','좌우로 끌어 공간 둘러보기');
    by('controls').hidden=false;by('photo-nav').hidden=true;original.hidden=true;modeButton.innerHTML='원본 보기 <span aria-hidden="true">↗</span>';modeButton.setAttribute('aria-pressed','false');draw();
  }
  function anchor(id){
    const where=cfg.anchors[String(id)];if(!where)return;
    const section=sections[where[0]];if(!section)return;
    position=section.begin+section.duration*where[1];draw();
  }
  imageNodes();returnTour();
  const query=new URLSearchParams(location.search);
  anchor(cfg.links[query.get('view')]||cfg.startPhoto);
  modeButton.onclick=()=>gallery?returnTour():showPhoto(current?.photo || cfg.startPhoto);
  by('photo-prev').onclick=()=>changePhoto(-1);by('photo-next').onclick=()=>changePhoto(1);
  by('previous').onclick=()=>{setPlaying(false);jump(movement(position,-.75));};
  by('next').onclick=()=>{setPlaying(false);jump(movement(position,.75));};
  playButton.onclick=()=>{if(!playing&&!cfg.loop&&position>=total)jump(0);setPlaying(!playing);};
  slider.oninput=()=>{setPlaying(false);jump(Number(slider.value)/1000*total);};
  stage.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;setPlaying(false);gesture={id:e.pointerId,x:e.clientX,y:e.clientY,start:position,mode:null};
  });
  stage.addEventListener('pointermove',e=>{
    if(!gesture||e.pointerId!==gesture.id)return;
    const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
    if(!gesture.mode && Math.max(Math.abs(dx),Math.abs(dy))>5){
      gesture.mode=Math.abs(dx)>Math.abs(dy)?'h':'v';
      if(gesture.mode==='h')stage.setPointerCapture(e.pointerId);
    }
    if(gesture.mode==='h'&&!gallery)jump(movement(gesture.start,-dx/stage.clientWidth*total*.23));
  });
  stage.addEventListener('pointerup',e=>{
    if(gesture&&gallery&&gesture.mode==='h'&&Math.abs(e.clientX-gesture.x)>35)changePhoto(e.clientX<gesture.x?1:-1);
    gesture=null;
  });
  stage.addEventListener('pointercancel',()=>gesture=null);
  stage.addEventListener('keydown',e=>{
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();setPlaying(false);const direction=e.key==='ArrowLeft'?-1:1;if(gallery)changePhoto(direction);else jump(movement(position,direction*.5));}
    if(e.code==='Space'&&!gallery){e.preventDefault();playButton.click();}
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)setPlaying(false);});
  window.addEventListener('resize',queueDraw);
  for(const seq of Object.values(cfg.sequences))fetchImage(seq.preview,true);
})();

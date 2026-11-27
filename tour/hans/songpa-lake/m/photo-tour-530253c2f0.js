/* Render a calibrated photo tour into the room pane. The host owns all navigation. */
window.createPhotoTour = function createPhotoTour(config, originalCanvas, update) {
  'use strict';
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const wrap = (value, span) => ((value % span) + span) % span;
  const radians = Math.PI / 180;
  const photos = new Map(config.photos.map(photo => [photo.id, photo]));
  let duration = 0;
  const sections = config.sections.map((section, index, list) => {
    const previous = list[(index - 1 + list.length) % list.length];
    const next = list[(index + 1) % list.length];
    const startYaw = section.yaw?.[0] ?? previous.yaw[1];
    const endYaw = section.yaw?.[1] ?? next.yaw[0];
    const result = {...section, startYaw, sweep:wrap(endYaw - startYaw, 360), startTime:duration};
    duration += section.duration;
    result.endTime = duration;
    result.firstPhoto = section.photo ?? previous.photo;
    result.lastPhoto = section.photo ?? next.photo;
    return result;
  });

  function locate(angle) {
    const yaw = wrap(angle, 360);
    // Angles name the original cameras. Intervening images follow the timed photo path.
    for (const section of sections) {
      const distance = wrap(yaw - section.startYaw, 360);
      if (distance < section.sweep - 1e-7 || distance < 1e-7) {
        return {section, t:distance / section.sweep};
      }
    }
    return {section:sections[0], t:0};
  }
  function timeAtYaw(yaw) {
    const {section, t} = locate(yaw);
    return section.startTime + t * section.duration;
  }
  function yawAtTime(position) {
    const time = wrap(position, duration);
    const section = sections.find(item => time < item.endTime) || sections[0];
    return wrap(section.startYaw + section.sweep * (time - section.startTime) / section.duration, 360);
  }

  const canvas = originalCanvas.cloneNode(false);
  const context = canvas.getContext('2d', {alpha:false});
  if (!context) throw new Error('Photo tour requires a 2D canvas');
  originalCanvas.replaceWith(canvas);
  const cache = new Map();
  let redraw = 0;
  let disposed = false;
  let output = null;
  let lastPaint = '';
  function schedule() {
    if (disposed || redraw) return;
    redraw = requestAnimationFrame(() => {
      redraw = 0;
      if (!disposed) update();
    });
  }
  function load(path, persistent = false) {
    if (!cache.has(path)) {
      const image = new Image();
      image.decoding = 'async';
      const entry = {image, persistent, ready:false, failed:false, used:0};
      cache.set(path, entry);
      image.onload = () => {entry.ready = true; schedule();};
      image.onerror = () => {entry.failed = true; schedule();};
      image.src = config.base + path;
    }
    const entry = cache.get(path);
    entry.used = performance.now();
    return entry;
  }
  function prune(current) {
    const spare = [...cache.entries()].filter(([path, entry]) => path !== current && !entry.persistent && entry.ready);
    if (spare.length <= 4) return;
    spare.sort((a,b) => a[1].used - b[1].used);
    for (const [path] of spare.slice(0, -4)) cache.delete(path);
  }
  function cameraPixels(entry) {
    if (entry.pixels) return entry.pixels;
    const image = entry.image;
    const scale = Math.min(1, 2048 / image.naturalWidth);
    const raster = document.createElement('canvas');
    raster.width = Math.round(image.naturalWidth * scale);
    raster.height = Math.round(image.naturalHeight * scale);
    const pixels = raster.getContext('2d', {willReadFrequently:true});
    pixels.drawImage(image, 0, 0, raster.width, raster.height);
    entry.pixels = {w:raster.width, h:raster.height, data:pixels.getImageData(0, 0, raster.width, raster.height).data};
    return entry.pixels;
  }
  function size(limit) {
    const width = Math.min(limit, Math.max(1, Math.round(canvas.clientWidth * Math.min(devicePixelRatio || 1, 2))));
    const height = Math.round(width * 1.5);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      lastPaint = '';
    }
    return width;
  }
  function paintCamera(section, t, photo, entry) {
    const w = size(620), h = canvas.height;
    const key = section.startYaw + ':' + t + ':' + entry.image.currentSrc;
    if (key === lastPaint) return;
    const {w:sw, h:sh, data} = cameraPixels(entry);
    const factor = sw / 900;
    const field = section.field;
    const half = Math.tan((field[0] + t * (field[1] - field[0])) * radians / 2);
    const angle = (section.startYaw + t * section.sweep - config.offset) * radians;
    const co = Math.cos(angle), si = Math.sin(angle), R = photo.rotation;
    const u = [0,1,2].map(k => (co * R[0][k] - si * R[2][k]) * (2 * half / w));
    const v = [0,1,2].map(k => -R[1][k] * (2 * half / w));
    const dx = (1 / w - 1) * half, dy = (h - 1) * half / w;
    const z = [0,1,2].map(k => (dx*co + si)*R[0][k] + dy*R[1][k] + (co - dx*si)*R[2][k]);
    if (!output || output.width !== w || output.height !== h) output = context.createImageData(w,h);
    const dst = output.data;
    const [cx,cy] = photo.center;
    for (let y=0, i=0; y<h; y++) {
      let qx=z[0]+y*v[0], qy=z[1]+y*v[1], qz=z[2]+y*v[2];
      for (let x=0; x<w; x++, i+=4, qx+=u[0], qy+=u[1], qz+=u[2]) {
        const inv = photo.focal/qz;
        const sx=clamp((cx+qx*inv)*factor-.5,0,sw-1.001), sy=clamp((cy+qy*inv)*factor-.5,0,sh-1.001);
        const ix=sx|0, iy=sy|0, wx=sx-ix, wy=sy-iy, a=(iy*sw+ix)*4, b=a+sw*4;
        for (let channel=0; channel<3; channel++) {
          const top=data[a+channel]+(data[a+4+channel]-data[a+channel])*wx;
          const bottom=data[b+channel]+(data[b+4+channel]-data[b+channel])*wx;
          dst[i+channel]=top+(bottom-top)*wy;
        }
        dst[i+3]=255;
      }
    }
    context.putImageData(output,0,0);
    lastPaint = key;
  }
  function paintFrame(entry, index, cols, width, height) {
    size(width);
    const key = entry.image.currentSrc + ':' + index;
    if (key === lastPaint) return;
    context.drawImage(entry.image, index%cols*width, Math.floor(index/cols)*height, width, height, 0, 0, canvas.width, canvas.height);
    lastPaint = key;
  }
  function draw(yaw) {
    const {section, t} = locate(yaw);
    const state = {source:section.source, label:section.label, photo:section.photo || '',
      nearest:t<.5 ? section.firstPhoto : section.lastPhoto, progress:(section.startTime + t*section.duration)/duration,
      ready:false, failed:false};
    if (section.kind === 'photo') {
      const photo = photos.get(section.photo);
      const full = load(photo.src, true), thumb = load(photo.thumb, true);
      state.ready = full.ready || thumb.ready;
      state.failed = full.failed && thumb.failed;
      if (state.ready) paintCamera(section,t,photo,full.ready ? full : thumb);
    } else {
      const sequence = config.sequences[section.sequence];
      const frame = clamp(Math.round(t*(sequence.count-1)),0,sequence.count-1);
      const page = Math.floor(frame/sequence.per), index = frame % sequence.per;
      const path = sequence.sheets[page], sheet = load(path), preview = load(sequence.preview,true);
      state.ready = sheet.ready || preview.ready;
      state.failed = sheet.failed && preview.failed;
      if (sequence.photographicFrames?.includes(frame)) state.source = '현장 사진';
      if (sheet.ready) paintFrame(sheet,index,sequence.cols,sequence.width,sequence.height);
      else if (preview.ready) paintFrame(preview,Math.round(t*(sequence.previewCount-1)),sequence.previewCols,sequence.previewWidth,sequence.previewHeight);
      const neighbor = sequence.sheets[page + (index>sequence.per/2 ? 1 : -1)];
      if (neighbor) load(neighbor);
      prune(path);
    }
    return state;
  }
  for (const sequence of Object.values(config.sequences)) load(sequence.preview,true);
  // The opposite camera is already decoded when an autoplay transition reaches it.
  for (const photo of photos.values()) {load(photo.thumb,true);load(photo.src,true);}
  return {
    draw,
    advance:(yaw, seconds) => yawAtTime(timeAtYaw(yaw) + seconds),
    shiftFraction:(yaw, fraction) => yawAtTime(timeAtYaw(yaw) + fraction * duration),
    fromProgress:fraction => yawAtTime(fraction * duration),
    dispose() {
      disposed = true;
      cancelAnimationFrame(redraw);
      for (const entry of cache.values()) {entry.image.onload = null; entry.image.onerror = null;}
      cache.clear();
      output = null;
      canvas.replaceWith(originalCanvas);
    }
  };
};

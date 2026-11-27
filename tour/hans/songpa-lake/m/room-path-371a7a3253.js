/* Render a moving eye from calibrated room surfaces and neighbouring photographic views. */
(() => {
  'use strict';
  const rad = Math.PI / 180;
  const modulo = (v, n) => (v % n + n) % n;
  const clamp = (v, low, high) => Math.min(high, Math.max(low, v));
  function bracket(stations, yaw) {
    const next = stations.findIndex(s => s.yaw > yaw);
    const b = Math.max(0, next), a = modulo(b - 1, stations.length);
    const span = modulo(stations[b].yaw - stations[a].yaw, 360);
    return {a, b, t: modulo(yaw - stations[a].yaw, 360) / span, span};
  }
  function eyeAt(stations, pair) {
    const {a, b, t, span} = pair, last = stations.length;
    const p = stations[modulo(a - 1, last)], q = stations[a], r = stations[b], s = stations[(b + 1) % last];
    function tangent(a, b) { return a * b > 0 ? 2 * a * b / (a + b) : 0; }
    return q.eye.map((v, k) => {
      const delta = (r.eye[k] - v) / span;
      const m0 = span * tangent((v - p.eye[k]) / modulo(q.yaw - p.yaw, 360), delta);
      const m1 = span * tangent(delta, (s.eye[k] - r.eye[k]) / modulo(s.yaw - r.yaw, 360));
      return v + t * (m0 + t * (3 * (r.eye[k] - v) - 2 * m0 - m1 + t * (m0 + m1 - 2 * (r.eye[k] - v))));
    });
  }
  function meshVertices(boxes) {
    const vertices = [];
    for (const box of boxes) {
      const p = Array.from({length: 8}, (_, i) => box.lo.map((v, k) => (i & (1 << k)) ? box.hi[k] : v));
      for (const face of [[0,1,3,2],[4,5,7,6],[0,1,5,4],[2,3,7,6],[0,2,6,4],[1,3,7,5]]) {
        for (const k of [0,1,2,0,2,3]) vertices.push(...p[face[k]]);
      }
    }
    return new Float32Array(vertices);
  }
  const vertex = `
    attribute vec3 pos; varying highp vec3 point;
    uniform vec3 eye; uniform vec4 orient; uniform vec2 lens;
    void main(){
      point=pos;
      vec3 v=pos-eye;
      float x=v.x*orient.y-v.z*orient.x;
      float z=v.x*orient.x+v.z*orient.y;
      float y=v.y*orient.w-z*orient.z;
      float depth=v.y*orient.z+z*orient.w;
      gl_Position=vec4(x/lens.x,y*lens.y/lens.x,1.004008*depth-0.040080,depth);
    }`;
  const fragment = `
    precision highp float; varying vec3 point;
    uniform sampler2D colorA,colorB,depthA,depthB;
    uniform vec3 eyeA,eyeB; uniform vec2 bearingA,bearingB,field; uniform float metric,fraction;
    vec2 project(vec3 v,vec2 bearing){
      return vec2(.5+atan(dot(v.xz,vec2(bearing.y,-bearing.x)),dot(v.xz,bearing))/field.x,
                  .5-atan(v.y,length(v.xz))/field.y);
    }
    float confidence(vec2 uv,float difference){
      float inside=min(min(uv.x,1.-uv.x),min(uv.y,1.-uv.y));
      return smoothstep(0.,.018,inside)*mix(1.,.012,smoothstep(.035,.13,difference));
    }
    void main(){
      vec3 a=point-eyeA,b=point-eyeB;
      vec2 u=project(a,bearingA),v=project(b,bearingB);
      float wa=(1.-fraction)*confidence(u,length(a)-texture2D(depthA,u).r*metric);
      float wb=fraction*confidence(v,length(b)-texture2D(depthB,v).r*metric);
      float blend=(wa+wb>.00001)?wb/(wa+wb):fraction;
      gl_FragColor=vec4(mix(texture2D(colorA,u).rgb,texture2D(colorB,v).rgb,blend),1.);
    }`;
  function gpuRenderer(gl, vertices, spec) {
    function compile(type, source) {
      const s=gl.createShader(type); gl.shaderSource(s,source); gl.compileShader(s);
      if (!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s));
      return s;
    }
    const program=gl.createProgram();
    for (const [type,code] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]) {
      const s=compile(type,code); gl.attachShader(program,s); gl.deleteShader(s);
    }
    gl.bindAttribLocation(program,0,'pos'); gl.linkProgram(program);
    if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
    const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);
    const loc=Object.fromEntries(['eye','orient','lens','eyeA','eyeB','bearingA','bearingB','fraction','field','metric','colorA','depthA','colorB','depthB'].map(key=>[key,gl.getUniformLocation(program,key)]));
    function texture(image, filtering) {
      const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
      for(const p of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,p,filtering);
      for(const p of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,p,gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,image);
      return tex;
    }
    return {
      draw(frame, a, b, mix){
        gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);
        gl.viewport(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight);
        gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clear(gl.DEPTH_BUFFER_BIT);
        gl.uniform3fv(loc.eye,frame.eye);gl.uniform4fv(loc.orient,frame.orient);gl.uniform2f(loc.lens,frame.half,frame.aspect);
        gl.uniform2f(loc.field,spec.horizontal*rad,spec.vertical*rad);gl.uniform1f(loc.metric,spec.depthMax);gl.uniform1f(loc.fraction,mix);
        [a,b].forEach((rec,i)=>{
          const suffix=i?'B':'A',j=i*2;
          gl.activeTexture(gl.TEXTURE0+j);
          if(!rec.colorTex)rec.colorTex=texture(rec.colorImg,gl.LINEAR);
          gl.bindTexture(gl.TEXTURE_2D,rec.colorTex);gl.uniform1i(loc['color'+suffix],j);
          gl.activeTexture(gl.TEXTURE0+j+1);
          if(!rec.depthTex)rec.depthTex=texture(rec.depthImg,gl.NEAREST);
          gl.bindTexture(gl.TEXTURE_2D,rec.depthTex);gl.uniform1i(loc['depth'+suffix],j+1);
          gl.uniform3fv(loc['eye'+suffix],rec.station.eye);gl.uniform2fv(loc['bearing'+suffix],rec.bearing);
        });
        gl.drawArrays(gl.TRIANGLES,0,vertices.length/3);gl.disable(gl.DEPTH_TEST);gl.activeTexture(gl.TEXTURE0);
      },
      release(rec){if(rec.colorTex)gl.deleteTexture(rec.colorTex);if(rec.depthTex)gl.deleteTexture(rec.depthTex);rec.colorTex=rec.depthTex=null;},
      dispose(){gl.deleteBuffer(buf);gl.deleteProgram(program);}
    };
  }
  // With WebGL unavailable use the same calibrated photographs and camera path.
  // For each output ray, its reference depth locates a 3D point to reproject.
  function software(ctx, f, a, b, fraction, spec){
    const max=355, canvas=ctx.canvas;
    const h=Math.min(max,canvas.height),w=Math.max(1,Math.round(h*f.aspect));
    if(!f.cache.surface){f.cache.surface=document.createElement('canvas');}
    const surface=f.cache.surface;
    if(surface.width!==w||surface.height!==h||!f.cache.frame){
      surface.width=w;surface.height=h;f.cache.frame=surface.getContext('2d').createImageData(w,h);
    }
    function raster(img,limit){
      const c=document.createElement('canvas'), k=Math.min(1,limit/img.width);c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);
      const cx=c.getContext('2d',{willReadFrequently:true});cx.drawImage(img,0,0,c.width,c.height);
      return {w:c.width,h:c.height,data:cx.getImageData(0,0,c.width,c.height).data};
    }
    function prep(rec){
      if(!rec.rgb){rec.rgb=raster(rec.colorImg,640);rec.depth=raster(rec.depthImg,640);}
      const eye=rec.station.eye;
      return {rec,dx:f.eye[0]-eye[0],dy:f.eye[1]-eye[1],dz:f.eye[2]-eye[2]};
    }
    const one=prep(a),two=prep(b);
    const same=a===b || fraction<1.e-6;
    const frame=f.cache.frame, out=frame.data, [s,c,sp,cp]=f.orient;
    const fh=1/(spec.horizontal*rad),fv=1/(spec.vertical*rad);
    function fetchPixel(v,x,y,z){
      const rec=v.rec,br=rec.bearing, dep=rec.depth,rgb=rec.rgb;
      let t=2,u=0,vv=0,px,py,pz;
      const iterations=(v.dx*v.dx+v.dy*v.dy+v.dz*v.dz)<1.e-9 ? 1 : 3;
      for(let step=0;step<iterations;step++){
        px=x*t+v.dx;py=y*t+v.dy;pz=z*t+v.dz;
        u=clamp(.5+Math.atan2(px*br[1]-pz*br[0],px*br[0]+pz*br[1])*fh,0,.999999);
        vv=clamp(.5-Math.atan2(py,Math.sqrt(px*px+pz*pz))*fv,0,.999999);
        if(step+1<iterations){const d=dep.data[((vv*dep.h|0)*dep.w+(u*dep.w|0))*4]*spec.depthMax/255;
          t=Math.max(.03,t+d-Math.sqrt(px*px+py*py+pz*pz));}
      }
      return ((vv*rgb.h|0)*rgb.w+(u*rgb.w|0))*4;
    }
    const dataA=a.rgb.data,dataB=b.rgb.data;
    for(let j=0,i=0;j<h;j++){
      const dy=(1-2*(j+.5)/h)*f.half/f.aspect,yy=dy*cp+sp,zz=cp-dy*sp;
      for(let k=0;k<w;k++,i+=4){
        const xx=(2*(k+.5)/w-1)*f.half, n=1/Math.sqrt(xx*xx+yy*yy+zz*zz);
        const x=(c*xx+s*zz)*n,y=yy*n,z=(c*zz-s*xx)*n;
        const ia=fetchPixel(one,x,y,z);
        if(same){out[i]=dataA[ia];out[i+1]=dataA[ia+1];out[i+2]=dataA[ia+2];}
        else {
          const ib=fetchPixel(two,x,y,z);
          for(let ch=0;ch<3;ch++)out[i+ch]=dataA[ia+ch]+fraction*(dataB[ib+ch]-dataA[ia+ch]);
        }
        out[i+3]=255;
      }
    }
    surface.getContext('2d').putImageData(frame,0,0);ctx.drawImage(surface,0,0,canvas.width,canvas.height);
  }
  window.createRoomPath=function(spec, redraw){
    const stations=spec.stations, pool=new Map(), vertices=meshVertices(spec.boxes), cache={};
    let glRef=null, renderer=null, unsupported=false, disposed=false, generation=0;
    function loadImage(url){
      return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=spec.base+url;});
    }
    function load(i){
      if(pool.has(i))return pool.get(i);
      const station=stations[i], ang=(station.yaw-spec.offset)*rad;
      const rec={station,bearing:[Math.sin(ang),Math.cos(ang)],touched:generation};pool.set(i,rec);
      Promise.all([loadImage(station.color),loadImage(station.depth)]).then(([color,depth])=>{
        if(disposed||pool.get(i)!==rec)return;
        rec.colorImg=color;rec.depthImg=depth;redraw();
      }).catch(()=>{rec.failed=performance.now();});
      return rec;
    }
    return {
      paint(gl,ctx,yaw,pitch,half,aspect){
        generation++;
        const {a,b,t,span}=bracket(stations,yaw),n=stations.length;
        const ra=load(a),rb=load(b);ra.touched=rb.touched=generation;
        const near=t<.5?ra:rb;
        if(near.colorImg){
          for(const i of [modulo(a-1,n),(b+1)%n])load(i).touched=generation;
        }
        for(const [i,r] of pool){
          if((r.failed&&performance.now()-r.failed>5000)||(pool.size>8&&r.touched<generation-2)){
            if(renderer)renderer.release(r);pool.delete(i);
          }
        }
        if(!ra.colorImg&&!rb.colorImg)return false;
        const first=ra.colorImg?ra:rb,second=rb.colorImg?rb:ra,mix=first===second?0:t;
        const frame={eye:eyeAt(stations,{a,b,t,span}),half,aspect,cache};
        const angle=(yaw-spec.offset)*rad;
        frame.orient=[Math.sin(angle),Math.cos(angle),Math.sin(pitch),Math.cos(pitch)];
        if(gl&&!unsupported){
          try{
            if(glRef!==gl){glRef=gl;renderer=gpuRenderer(gl,vertices,spec);}
            renderer.draw(frame,first,second,mix);
          }catch(e){unsupported=true;console.warn('Room path renderer:',e.message);return false;}
        }else if(ctx){software(ctx,frame,first,second,mix,spec);}
        else return false;
        return true;
      },
      get needsSoftware(){return unsupported;},
      dispose(){disposed=true;if(renderer){for(const r of pool.values())renderer.release(r);renderer.dispose();}pool.clear();}
    };
  };
})();

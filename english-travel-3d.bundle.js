(()=>{var xf=0,Ru=1,_f=2;var Yo=1,wl=2,kr=3,kn=0,on=1,An=2,ci=0,ws=1,Iu=2,Pu=3,Lu=4,yf=5;var Zi=100,vf=101,bf=102,Mf=103,Sf=104,wf=200,Tf=201,Ef=202,Af=203,$a=204,Za=205,Cf=206,Rf=207,If=208,Pf=209,Lf=210,Nf=211,Df=212,Uf=213,Ff=214,Ja=0,ja=1,Qa=2,Ts=3,el=4,tl=5,nl=6,il=7,Nu=0,Of=1,Bf=2,Hn=0,Du=1,Uu=2,Fu=3,$o=4,Ou=5,Bu=6,ku=7,vu="attached",kf="detached",zu=300,ns=301,Fs=302,Tl=303,El=304,Zo=306,Ji=1e3,En=1001,Sr=1002,wt=1003,Al=1004;var Os=1005;var Tt=1006,zr=1007;var Vn=1008;var fn=1009,Hu=1010,Vu=1011,Hr=1012,Cl=1013,Gn=1014,bn=1015,ui=1016,Rl=1017,Il=1018,Vr=1020,Gu=35902,Wu=35899,Ku=1021,Xu=1022,Mn=1023,ti=1026,is=1027,Pl=1028,Ll=1029,Bs=1030,Nl=1031;var Dl=1033,Jo=33776,jo=33777,Qo=33778,ea=33779,Ul=35840,Fl=35841,Ol=35842,Bl=35843,kl=36196,zl=37492,Hl=37496,Vl=37488,Gl=37489,Wl=37490,Kl=37491,Xl=37808,ql=37809,Yl=37810,$l=37811,Zl=37812,Jl=37813,jl=37814,Ql=37815,ec=37816,tc=37817,nc=37818,ic=37819,sc=37820,rc=37821,oc=36492,ac=36494,lc=36495,cc=36283,uc=36284,hc=36285,dc=36286,fc=2200,pc=2201,zf=2202,Es=2300,As=2301,Ya=2302,bu=2303,Ms=2400,Ss=2401,xo=2402,mc=2500,Hf=2501,qu=0,ta=1,Gr=2,Vf=3200;var Yu=0,Gf=1,Ni="",_t="srgb",Xt="srgb-linear",_o="linear",tt="srgb";var bs=7680;var Mu=519,Wf=512,Kf=513,Xf=514,gc=515,qf=516,Yf=517,xc=518,$f=519,sl=35044;var $u="300 es",On=2e3,wr=2001;function Im(i){for(let e=i.length-1;e>=0;--e)if(i[e]>=65535)return!0;return!1}function Pm(i){return ArrayBuffer.isView(i)&&!(i instanceof DataView)}function Tr(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function Zf(){let i=Tr("canvas");return i.style.display="block",i}var Ld={},Er=null;function yo(...i){let e="THREE."+i.shift();Er?Er("log",e,...i):console.log(e,...i)}function Jf(i){let e=i[0];if(typeof e=="string"&&e.startsWith("TSL:")){let t=i[1];t&&t.isStackTrace?i[0]+=" "+t.getLocation():i[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return i}function Ee(...i){i=Jf(i);let e="THREE."+i.shift();if(Er)Er("warn",e,...i);else{let t=i[0];t&&t.isStackTrace?console.warn(t.getError(e)):console.warn(e,...i)}}function Ne(...i){i=Jf(i);let e="THREE."+i.shift();if(Er)Er("error",e,...i);else{let t=i[0];t&&t.isStackTrace?console.error(t.getError(e)):console.error(e,...i)}}function vo(...i){let e=i.join(" ");e in Ld||(Ld[e]=!0,Ee(...i))}function jf(i,e,t){return new Promise(function(n,s){function r(){switch(i.clientWaitSync(e,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:s();break;case i.TIMEOUT_EXPIRED:setTimeout(r,t);break;default:n()}}setTimeout(r,t)})}var Qf={[Ja]:ja,[Qa]:nl,[el]:il,[Ts]:tl,[ja]:Ja,[nl]:Qa,[il]:el,[tl]:Ts},ni=class{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){let n=this._listeners;return n===void 0?!1:n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){let n=this._listeners;if(n===void 0)return;let s=n[e];if(s!==void 0){let r=s.indexOf(t);r!==-1&&s.splice(r,1)}}dispatchEvent(e){let t=this._listeners;if(t===void 0)return;let n=t[e.type];if(n!==void 0){e.target=this;let s=n.slice(0);for(let r=0,o=s.length;r<o;r++)s[r].call(this,e);e.target=null}}},Zt=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Nd=1234567,mo=Math.PI/180,Cs=180/Math.PI;function Bn(){let i=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(Zt[i&255]+Zt[i>>8&255]+Zt[i>>16&255]+Zt[i>>24&255]+"-"+Zt[e&255]+Zt[e>>8&255]+"-"+Zt[e>>16&15|64]+Zt[e>>24&255]+"-"+Zt[t&63|128]+Zt[t>>8&255]+"-"+Zt[t>>16&255]+Zt[t>>24&255]+Zt[n&255]+Zt[n>>8&255]+Zt[n>>16&255]+Zt[n>>24&255]).toLowerCase()}function Ze(i,e,t){return Math.max(e,Math.min(t,i))}function Zu(i,e){return(i%e+e)%e}function Lm(i,e,t,n,s){return n+(i-e)*(s-n)/(t-e)}function Nm(i,e,t){return i!==e?(t-i)/(e-i):0}function go(i,e,t){return(1-t)*i+t*e}function Dm(i,e,t,n){return go(i,e,1-Math.exp(-t*n))}function Um(i,e=1){return e-Math.abs(Zu(i,e*2)-e)}function Fm(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*(3-2*i))}function Om(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*i*(i*(i*6-15)+10))}function Bm(i,e){return i+Math.floor(Math.random()*(e-i+1))}function km(i,e){return i+Math.random()*(e-i)}function zm(i){return i*(.5-Math.random())}function Hm(i){i!==void 0&&(Nd=i);let e=Nd+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function Vm(i){return i*mo}function Gm(i){return i*Cs}function Wm(i){return(i&i-1)===0&&i!==0}function Km(i){return Math.pow(2,Math.ceil(Math.log(i)/Math.LN2))}function Xm(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))}function qm(i,e,t,n,s){let r=Math.cos,o=Math.sin,a=r(t/2),l=o(t/2),c=r((e+n)/2),u=o((e+n)/2),h=r((e-n)/2),d=o((e-n)/2),f=r((n-e)/2),g=o((n-e)/2);switch(s){case"XYX":i.set(a*u,l*h,l*d,a*c);break;case"YZY":i.set(l*d,a*u,l*h,a*c);break;case"ZXZ":i.set(l*h,l*d,a*u,a*c);break;case"XZX":i.set(a*u,l*g,l*f,a*c);break;case"YXY":i.set(l*f,a*u,l*g,a*c);break;case"ZYZ":i.set(l*g,l*f,a*u,a*c);break;default:Ee("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+s)}}function Fn(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("Invalid component type.")}}function rt(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("Invalid component type.")}}var Lt={DEG2RAD:mo,RAD2DEG:Cs,generateUUID:Bn,clamp:Ze,euclideanModulo:Zu,mapLinear:Lm,inverseLerp:Nm,lerp:go,damp:Dm,pingpong:Um,smoothstep:Fm,smootherstep:Om,randInt:Bm,randFloat:km,randFloatSpread:zm,seededRandom:Hm,degToRad:Vm,radToDeg:Gm,isPowerOfTwo:Wm,ceilPowerOfTwo:Km,floorPowerOfTwo:Xm,setQuaternionFromProperEuler:qm,normalize:rt,denormalize:Fn},Ie=class i{constructor(e=0,t=0){i.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){let t=this.x,n=this.y,s=e.elements;return this.x=s[0]*t+s[3]*n+s[6],this.y=s[1]*t+s[4]*n+s[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Ze(this.x,e.x,t.x),this.y=Ze(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=Ze(this.x,e,t),this.y=Ze(this.y,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Ze(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(Ze(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){let n=Math.cos(t),s=Math.sin(t),r=this.x-e.x,o=this.y-e.y;return this.x=r*n-o*s+e.x,this.y=r*s+o*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},jt=class{constructor(e=0,t=0,n=0,s=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=s}static slerpFlat(e,t,n,s,r,o,a){let l=n[s+0],c=n[s+1],u=n[s+2],h=n[s+3],d=r[o+0],f=r[o+1],g=r[o+2],y=r[o+3];if(h!==y||l!==d||c!==f||u!==g){let m=l*d+c*f+u*g+h*y;m<0&&(d=-d,f=-f,g=-g,y=-y,m=-m);let p=1-a;if(m<.9995){let M=Math.acos(m),w=Math.sin(M);p=Math.sin(p*M)/w,a=Math.sin(a*M)/w,l=l*p+d*a,c=c*p+f*a,u=u*p+g*a,h=h*p+y*a}else{l=l*p+d*a,c=c*p+f*a,u=u*p+g*a,h=h*p+y*a;let M=1/Math.sqrt(l*l+c*c+u*u+h*h);l*=M,c*=M,u*=M,h*=M}}e[t]=l,e[t+1]=c,e[t+2]=u,e[t+3]=h}static multiplyQuaternionsFlat(e,t,n,s,r,o){let a=n[s],l=n[s+1],c=n[s+2],u=n[s+3],h=r[o],d=r[o+1],f=r[o+2],g=r[o+3];return e[t]=a*g+u*h+l*f-c*d,e[t+1]=l*g+u*d+c*h-a*f,e[t+2]=c*g+u*f+a*d-l*h,e[t+3]=u*g-a*h-l*d-c*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,s){return this._x=e,this._y=t,this._z=n,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){let n=e._x,s=e._y,r=e._z,o=e._order,a=Math.cos,l=Math.sin,c=a(n/2),u=a(s/2),h=a(r/2),d=l(n/2),f=l(s/2),g=l(r/2);switch(o){case"XYZ":this._x=d*u*h+c*f*g,this._y=c*f*h-d*u*g,this._z=c*u*g+d*f*h,this._w=c*u*h-d*f*g;break;case"YXZ":this._x=d*u*h+c*f*g,this._y=c*f*h-d*u*g,this._z=c*u*g-d*f*h,this._w=c*u*h+d*f*g;break;case"ZXY":this._x=d*u*h-c*f*g,this._y=c*f*h+d*u*g,this._z=c*u*g+d*f*h,this._w=c*u*h-d*f*g;break;case"ZYX":this._x=d*u*h-c*f*g,this._y=c*f*h+d*u*g,this._z=c*u*g-d*f*h,this._w=c*u*h+d*f*g;break;case"YZX":this._x=d*u*h+c*f*g,this._y=c*f*h+d*u*g,this._z=c*u*g-d*f*h,this._w=c*u*h-d*f*g;break;case"XZY":this._x=d*u*h-c*f*g,this._y=c*f*h-d*u*g,this._z=c*u*g+d*f*h,this._w=c*u*h+d*f*g;break;default:Ee("Quaternion: .setFromEuler() encountered an unknown order: "+o)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){let n=t/2,s=Math.sin(n);return this._x=e.x*s,this._y=e.y*s,this._z=e.z*s,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){let t=e.elements,n=t[0],s=t[4],r=t[8],o=t[1],a=t[5],l=t[9],c=t[2],u=t[6],h=t[10],d=n+a+h;if(d>0){let f=.5/Math.sqrt(d+1);this._w=.25/f,this._x=(u-l)*f,this._y=(r-c)*f,this._z=(o-s)*f}else if(n>a&&n>h){let f=2*Math.sqrt(1+n-a-h);this._w=(u-l)/f,this._x=.25*f,this._y=(s+o)/f,this._z=(r+c)/f}else if(a>h){let f=2*Math.sqrt(1+a-n-h);this._w=(r-c)/f,this._x=(s+o)/f,this._y=.25*f,this._z=(l+u)/f}else{let f=2*Math.sqrt(1+h-n-a);this._w=(o-s)/f,this._x=(r+c)/f,this._y=(l+u)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Ze(this.dot(e),-1,1)))}rotateTowards(e,t){let n=this.angleTo(e);if(n===0)return this;let s=Math.min(1,t/n);return this.slerp(e,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){let n=e._x,s=e._y,r=e._z,o=e._w,a=t._x,l=t._y,c=t._z,u=t._w;return this._x=n*u+o*a+s*c-r*l,this._y=s*u+o*l+r*a-n*c,this._z=r*u+o*c+n*l-s*a,this._w=o*u-n*a-s*l-r*c,this._onChangeCallback(),this}slerp(e,t){let n=e._x,s=e._y,r=e._z,o=e._w,a=this.dot(e);a<0&&(n=-n,s=-s,r=-r,o=-o,a=-a);let l=1-t;if(a<.9995){let c=Math.acos(a),u=Math.sin(c);l=Math.sin(l*c)/u,t=Math.sin(t*c)/u,this._x=this._x*l+n*t,this._y=this._y*l+s*t,this._z=this._z*l+r*t,this._w=this._w*l+o*t,this._onChangeCallback()}else this._x=this._x*l+n*t,this._y=this._y*l+s*t,this._z=this._z*l+r*t,this._w=this._w*l+o*t,this.normalize();return this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){let e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),s=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(s*Math.sin(e),s*Math.cos(e),r*Math.sin(t),r*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},L=class i{constructor(e=0,t=0,n=0){i.prototype.isVector3=!0,this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Dd.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Dd.setFromAxisAngle(e,t))}applyMatrix3(e){let t=this.x,n=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6]*s,this.y=r[1]*t+r[4]*n+r[7]*s,this.z=r[2]*t+r[5]*n+r[8]*s,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){let t=this.x,n=this.y,s=this.z,r=e.elements,o=1/(r[3]*t+r[7]*n+r[11]*s+r[15]);return this.x=(r[0]*t+r[4]*n+r[8]*s+r[12])*o,this.y=(r[1]*t+r[5]*n+r[9]*s+r[13])*o,this.z=(r[2]*t+r[6]*n+r[10]*s+r[14])*o,this}applyQuaternion(e){let t=this.x,n=this.y,s=this.z,r=e.x,o=e.y,a=e.z,l=e.w,c=2*(o*s-a*n),u=2*(a*t-r*s),h=2*(r*n-o*t);return this.x=t+l*c+o*h-a*u,this.y=n+l*u+a*c-r*h,this.z=s+l*h+r*u-o*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){let t=this.x,n=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[4]*n+r[8]*s,this.y=r[1]*t+r[5]*n+r[9]*s,this.z=r[2]*t+r[6]*n+r[10]*s,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Ze(this.x,e.x,t.x),this.y=Ze(this.y,e.y,t.y),this.z=Ze(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=Ze(this.x,e,t),this.y=Ze(this.y,e,t),this.z=Ze(this.z,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Ze(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){let n=e.x,s=e.y,r=e.z,o=t.x,a=t.y,l=t.z;return this.x=s*l-r*a,this.y=r*o-n*l,this.z=n*a-s*o,this}projectOnVector(e){let t=e.lengthSq();if(t===0)return this.set(0,0,0);let n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return qc.copy(this).projectOnVector(e),this.sub(qc)}reflect(e){return this.sub(qc.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(Ze(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y,s=this.z-e.z;return t*t+n*n+s*s}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){let s=Math.sin(t)*e;return this.x=s*Math.sin(n),this.y=Math.cos(t)*e,this.z=s*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){let t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),s=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=s,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},qc=new L,Dd=new jt,He=class i{constructor(e,t,n,s,r,o,a,l,c){i.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,s,r,o,a,l,c)}set(e,t,n,s,r,o,a,l,c){let u=this.elements;return u[0]=e,u[1]=s,u[2]=a,u[3]=t,u[4]=r,u[5]=l,u[6]=n,u[7]=o,u[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){let t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,s=t.elements,r=this.elements,o=n[0],a=n[3],l=n[6],c=n[1],u=n[4],h=n[7],d=n[2],f=n[5],g=n[8],y=s[0],m=s[3],p=s[6],M=s[1],w=s[4],S=s[7],C=s[2],A=s[5],R=s[8];return r[0]=o*y+a*M+l*C,r[3]=o*m+a*w+l*A,r[6]=o*p+a*S+l*R,r[1]=c*y+u*M+h*C,r[4]=c*m+u*w+h*A,r[7]=c*p+u*S+h*R,r[2]=d*y+f*M+g*C,r[5]=d*m+f*w+g*A,r[8]=d*p+f*S+g*R,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],o=e[4],a=e[5],l=e[6],c=e[7],u=e[8];return t*o*u-t*a*c-n*r*u+n*a*l+s*r*c-s*o*l}invert(){let e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],o=e[4],a=e[5],l=e[6],c=e[7],u=e[8],h=u*o-a*c,d=a*l-u*r,f=c*r-o*l,g=t*h+n*d+s*f;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);let y=1/g;return e[0]=h*y,e[1]=(s*c-u*n)*y,e[2]=(a*n-s*o)*y,e[3]=d*y,e[4]=(u*t-s*l)*y,e[5]=(s*r-a*t)*y,e[6]=f*y,e[7]=(n*l-c*t)*y,e[8]=(o*t-n*r)*y,this}transpose(){let e,t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){let t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,s,r,o,a){let l=Math.cos(r),c=Math.sin(r);return this.set(n*l,n*c,-n*(l*o+c*a)+o+e,-s*c,s*l,-s*(-c*o+l*a)+a+t,0,0,1),this}scale(e,t){return this.premultiply(Yc.makeScale(e,t)),this}rotate(e){return this.premultiply(Yc.makeRotation(-e)),this}translate(e,t){return this.premultiply(Yc.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){let t=this.elements,n=e.elements;for(let s=0;s<9;s++)if(t[s]!==n[s])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}},Yc=new He,Ud=new He().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Fd=new He().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Ym(){let i={enabled:!0,workingColorSpace:Xt,spaces:{},convert:function(s,r,o){return this.enabled===!1||r===o||!r||!o||(this.spaces[r].transfer===tt&&(s.r=Ci(s.r),s.g=Ci(s.g),s.b=Ci(s.b)),this.spaces[r].primaries!==this.spaces[o].primaries&&(s.applyMatrix3(this.spaces[r].toXYZ),s.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===tt&&(s.r=Mr(s.r),s.g=Mr(s.g),s.b=Mr(s.b))),s},workingToColorSpace:function(s,r){return this.convert(s,this.workingColorSpace,r)},colorSpaceToWorking:function(s,r){return this.convert(s,r,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===Ni?_o:this.spaces[s].transfer},getToneMappingMode:function(s){return this.spaces[s].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(s,r=this.workingColorSpace){return s.fromArray(this.spaces[r].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,r,o){return s.copy(this.spaces[r].toXYZ).multiply(this.spaces[o].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(s,r){return vo("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(s,r)},toWorkingColorSpace:function(s,r){return vo("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(s,r)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],n=[.3127,.329];return i.define({[Xt]:{primaries:e,whitePoint:n,transfer:_o,toXYZ:Ud,fromXYZ:Fd,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:_t},outputColorSpaceConfig:{drawingBufferColorSpace:_t}},[_t]:{primaries:e,whitePoint:n,transfer:tt,toXYZ:Ud,fromXYZ:Fd,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:_t}}}),i}var $e=Ym();function Ci(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function Mr(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}var sr,rl=class{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{sr===void 0&&(sr=Tr("canvas")),sr.width=e.width,sr.height=e.height;let s=sr.getContext("2d");e instanceof ImageData?s.putImageData(e,0,0):s.drawImage(e,0,0,e.width,e.height),n=sr}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){let t=Tr("canvas");t.width=e.width,t.height=e.height;let n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);let s=n.getImageData(0,0,e.width,e.height),r=s.data;for(let o=0;o<r.length;o++)r[o]=Ci(r[o]/255)*255;return n.putImageData(s,0,0),t}else if(e.data){let t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(Ci(t[n]/255)*255):t[n]=Ci(t[n]);return{data:t,width:e.width,height:e.height}}else return Ee("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}},$m=0,Ar=class{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:$m++}),this.uuid=Bn(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){let t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<"u"&&t instanceof VideoFrame?e.set(t.displayHeight,t.displayWidth,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];let n={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let o=0,a=s.length;o<a;o++)s[o].isDataTexture?r.push($c(s[o].image)):r.push($c(s[o]))}else r=$c(s);n.url=r}return t||(e.images[this.uuid]=n),n}};function $c(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?rl.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(Ee("Texture: Unable to serialize Texture."),{})}var Zm=0,Zc=new L,Ut=class i extends ni{constructor(e=i.DEFAULT_IMAGE,t=i.DEFAULT_MAPPING,n=En,s=En,r=Tt,o=Vn,a=Mn,l=fn,c=i.DEFAULT_ANISOTROPY,u=Ni){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Zm++}),this.uuid=Bn(),this.name="",this.source=new Ar(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=s,this.magFilter=r,this.minFilter=o,this.anisotropy=c,this.format=a,this.internalFormat=null,this.type=l,this.offset=new Ie(0,0),this.repeat=new Ie(1,1),this.center=new Ie(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new He,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=u,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0}get width(){return this.source.getSize(Zc).x}get height(){return this.source.getSize(Zc).y}get depth(){return this.source.getSize(Zc).z}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(let t in e){let n=e[t];if(n===void 0){Ee(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}let s=this[t];if(s===void 0){Ee(`Texture.setValues(): property '${t}' does not exist.`);continue}s&&n&&s.isVector2&&n.isVector2||s&&n&&s.isVector3&&n.isVector3||s&&n&&s.isMatrix3&&n.isMatrix3?s.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];let n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==zu)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case Ji:e.x=e.x-Math.floor(e.x);break;case En:e.x=e.x<0?0:1;break;case Sr:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case Ji:e.y=e.y-Math.floor(e.y);break;case En:e.y=e.y<0?0:1;break;case Sr:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}};Ut.DEFAULT_IMAGE=null;Ut.DEFAULT_MAPPING=zu;Ut.DEFAULT_ANISOTROPY=1;var pt=class i{constructor(e=0,t=0,n=0,s=1){i.prototype.isVector4=!0,this.x=e,this.y=t,this.z=n,this.w=s}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,s){return this.x=e,this.y=t,this.z=n,this.w=s,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){let t=this.x,n=this.y,s=this.z,r=this.w,o=e.elements;return this.x=o[0]*t+o[4]*n+o[8]*s+o[12]*r,this.y=o[1]*t+o[5]*n+o[9]*s+o[13]*r,this.z=o[2]*t+o[6]*n+o[10]*s+o[14]*r,this.w=o[3]*t+o[7]*n+o[11]*s+o[15]*r,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);let t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,s,r,l=e.elements,c=l[0],u=l[4],h=l[8],d=l[1],f=l[5],g=l[9],y=l[2],m=l[6],p=l[10];if(Math.abs(u-d)<.01&&Math.abs(h-y)<.01&&Math.abs(g-m)<.01){if(Math.abs(u+d)<.1&&Math.abs(h+y)<.1&&Math.abs(g+m)<.1&&Math.abs(c+f+p-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;let w=(c+1)/2,S=(f+1)/2,C=(p+1)/2,A=(u+d)/4,R=(h+y)/4,v=(g+m)/4;return w>S&&w>C?w<.01?(n=0,s=.707106781,r=.707106781):(n=Math.sqrt(w),s=A/n,r=R/n):S>C?S<.01?(n=.707106781,s=0,r=.707106781):(s=Math.sqrt(S),n=A/s,r=v/s):C<.01?(n=.707106781,s=.707106781,r=0):(r=Math.sqrt(C),n=R/r,s=v/r),this.set(n,s,r,t),this}let M=Math.sqrt((m-g)*(m-g)+(h-y)*(h-y)+(d-u)*(d-u));return Math.abs(M)<.001&&(M=1),this.x=(m-g)/M,this.y=(h-y)/M,this.z=(d-u)/M,this.w=Math.acos((c+f+p-1)/2),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Ze(this.x,e.x,t.x),this.y=Ze(this.y,e.y,t.y),this.z=Ze(this.z,e.z,t.z),this.w=Ze(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=Ze(this.x,e,t),this.y=Ze(this.y,e,t),this.z=Ze(this.z,e,t),this.w=Ze(this.w,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Ze(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}},ol=class extends ni{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Tt,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new pt(0,0,e,t),this.scissorTest=!1,this.viewport=new pt(0,0,e,t),this.textures=[];let s={width:e,height:t,depth:n.depth},r=new Ut(s),o=n.count;for(let a=0;a<o;a++)this.textures[a]=r.clone(),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview}_setTextureOptions(e={}){let t={minFilter:Tt,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=e,this.textures[s].image.height=t,this.textures[s].image.depth=n,this.textures[s].isData3DTexture!==!0&&(this.textures[s].isArrayTexture=this.textures[s].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;let s=Object.assign({},e.textures[t].image);this.textures[t].source=new Ar(s)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}},_n=class extends ol{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}},bo=class extends Ut{constructor(e=null,t=1,n=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:s},this.magFilter=wt,this.minFilter=wt,this.wrapR=En,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}};var al=class extends Ut{constructor(e=null,t=1,n=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:s},this.magFilter=wt,this.minFilter=wt,this.wrapR=En,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var ze=class i{constructor(e,t,n,s,r,o,a,l,c,u,h,d,f,g,y,m){i.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,s,r,o,a,l,c,u,h,d,f,g,y,m)}set(e,t,n,s,r,o,a,l,c,u,h,d,f,g,y,m){let p=this.elements;return p[0]=e,p[4]=t,p[8]=n,p[12]=s,p[1]=r,p[5]=o,p[9]=a,p[13]=l,p[2]=c,p[6]=u,p[10]=h,p[14]=d,p[3]=f,p[7]=g,p[11]=y,p[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new i().fromArray(this.elements)}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){let t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){let t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return this.determinant()===0?(e.set(1,0,0),t.set(0,1,0),n.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){if(e.determinant()===0)return this.identity();let t=this.elements,n=e.elements,s=1/rr.setFromMatrixColumn(e,0).length(),r=1/rr.setFromMatrixColumn(e,1).length(),o=1/rr.setFromMatrixColumn(e,2).length();return t[0]=n[0]*s,t[1]=n[1]*s,t[2]=n[2]*s,t[3]=0,t[4]=n[4]*r,t[5]=n[5]*r,t[6]=n[6]*r,t[7]=0,t[8]=n[8]*o,t[9]=n[9]*o,t[10]=n[10]*o,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){let t=this.elements,n=e.x,s=e.y,r=e.z,o=Math.cos(n),a=Math.sin(n),l=Math.cos(s),c=Math.sin(s),u=Math.cos(r),h=Math.sin(r);if(e.order==="XYZ"){let d=o*u,f=o*h,g=a*u,y=a*h;t[0]=l*u,t[4]=-l*h,t[8]=c,t[1]=f+g*c,t[5]=d-y*c,t[9]=-a*l,t[2]=y-d*c,t[6]=g+f*c,t[10]=o*l}else if(e.order==="YXZ"){let d=l*u,f=l*h,g=c*u,y=c*h;t[0]=d+y*a,t[4]=g*a-f,t[8]=o*c,t[1]=o*h,t[5]=o*u,t[9]=-a,t[2]=f*a-g,t[6]=y+d*a,t[10]=o*l}else if(e.order==="ZXY"){let d=l*u,f=l*h,g=c*u,y=c*h;t[0]=d-y*a,t[4]=-o*h,t[8]=g+f*a,t[1]=f+g*a,t[5]=o*u,t[9]=y-d*a,t[2]=-o*c,t[6]=a,t[10]=o*l}else if(e.order==="ZYX"){let d=o*u,f=o*h,g=a*u,y=a*h;t[0]=l*u,t[4]=g*c-f,t[8]=d*c+y,t[1]=l*h,t[5]=y*c+d,t[9]=f*c-g,t[2]=-c,t[6]=a*l,t[10]=o*l}else if(e.order==="YZX"){let d=o*l,f=o*c,g=a*l,y=a*c;t[0]=l*u,t[4]=y-d*h,t[8]=g*h+f,t[1]=h,t[5]=o*u,t[9]=-a*u,t[2]=-c*u,t[6]=f*h+g,t[10]=d-y*h}else if(e.order==="XZY"){let d=o*l,f=o*c,g=a*l,y=a*c;t[0]=l*u,t[4]=-h,t[8]=c*u,t[1]=d*h+y,t[5]=o*u,t[9]=f*h-g,t[2]=g*h-f,t[6]=a*u,t[10]=y*h+d}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(Jm,e,jm)}lookAt(e,t,n){let s=this.elements;return gn.subVectors(e,t),gn.lengthSq()===0&&(gn.z=1),gn.normalize(),Wi.crossVectors(n,gn),Wi.lengthSq()===0&&(Math.abs(n.z)===1?gn.x+=1e-4:gn.z+=1e-4,gn.normalize(),Wi.crossVectors(n,gn)),Wi.normalize(),ya.crossVectors(gn,Wi),s[0]=Wi.x,s[4]=ya.x,s[8]=gn.x,s[1]=Wi.y,s[5]=ya.y,s[9]=gn.y,s[2]=Wi.z,s[6]=ya.z,s[10]=gn.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,s=t.elements,r=this.elements,o=n[0],a=n[4],l=n[8],c=n[12],u=n[1],h=n[5],d=n[9],f=n[13],g=n[2],y=n[6],m=n[10],p=n[14],M=n[3],w=n[7],S=n[11],C=n[15],A=s[0],R=s[4],v=s[8],T=s[12],K=s[1],I=s[5],F=s[9],O=s[13],V=s[2],G=s[6],k=s[10],H=s[14],ne=s[3],j=s[7],de=s[11],xe=s[15];return r[0]=o*A+a*K+l*V+c*ne,r[4]=o*R+a*I+l*G+c*j,r[8]=o*v+a*F+l*k+c*de,r[12]=o*T+a*O+l*H+c*xe,r[1]=u*A+h*K+d*V+f*ne,r[5]=u*R+h*I+d*G+f*j,r[9]=u*v+h*F+d*k+f*de,r[13]=u*T+h*O+d*H+f*xe,r[2]=g*A+y*K+m*V+p*ne,r[6]=g*R+y*I+m*G+p*j,r[10]=g*v+y*F+m*k+p*de,r[14]=g*T+y*O+m*H+p*xe,r[3]=M*A+w*K+S*V+C*ne,r[7]=M*R+w*I+S*G+C*j,r[11]=M*v+w*F+S*k+C*de,r[15]=M*T+w*O+S*H+C*xe,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[4],s=e[8],r=e[12],o=e[1],a=e[5],l=e[9],c=e[13],u=e[2],h=e[6],d=e[10],f=e[14],g=e[3],y=e[7],m=e[11],p=e[15],M=l*f-c*d,w=a*f-c*h,S=a*d-l*h,C=o*f-c*u,A=o*d-l*u,R=o*h-a*u;return t*(y*M-m*w+p*S)-n*(g*M-m*C+p*A)+s*(g*w-y*C+p*R)-r*(g*S-y*A+m*R)}transpose(){let e=this.elements,t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){let s=this.elements;return e.isVector3?(s[12]=e.x,s[13]=e.y,s[14]=e.z):(s[12]=e,s[13]=t,s[14]=n),this}invert(){let e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],o=e[4],a=e[5],l=e[6],c=e[7],u=e[8],h=e[9],d=e[10],f=e[11],g=e[12],y=e[13],m=e[14],p=e[15],M=t*a-n*o,w=t*l-s*o,S=t*c-r*o,C=n*l-s*a,A=n*c-r*a,R=s*c-r*l,v=u*y-h*g,T=u*m-d*g,K=u*p-f*g,I=h*m-d*y,F=h*p-f*y,O=d*p-f*m,V=M*O-w*F+S*I+C*K-A*T+R*v;if(V===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let G=1/V;return e[0]=(a*O-l*F+c*I)*G,e[1]=(s*F-n*O-r*I)*G,e[2]=(y*R-m*A+p*C)*G,e[3]=(d*A-h*R-f*C)*G,e[4]=(l*K-o*O-c*T)*G,e[5]=(t*O-s*K+r*T)*G,e[6]=(m*S-g*R-p*w)*G,e[7]=(u*R-d*S+f*w)*G,e[8]=(o*F-a*K+c*v)*G,e[9]=(n*K-t*F-r*v)*G,e[10]=(g*A-y*S+p*M)*G,e[11]=(h*S-u*A-f*M)*G,e[12]=(a*T-o*I-l*v)*G,e[13]=(t*I-n*T+s*v)*G,e[14]=(y*w-g*C-m*M)*G,e[15]=(u*C-h*w+d*M)*G,this}scale(e){let t=this.elements,n=e.x,s=e.y,r=e.z;return t[0]*=n,t[4]*=s,t[8]*=r,t[1]*=n,t[5]*=s,t[9]*=r,t[2]*=n,t[6]*=s,t[10]*=r,t[3]*=n,t[7]*=s,t[11]*=r,this}getMaxScaleOnAxis(){let e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],s=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,s))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){let t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){let n=Math.cos(t),s=Math.sin(t),r=1-n,o=e.x,a=e.y,l=e.z,c=r*o,u=r*a;return this.set(c*o+n,c*a-s*l,c*l+s*a,0,c*a+s*l,u*a+n,u*l-s*o,0,c*l-s*a,u*l+s*o,r*l*l+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,s,r,o){return this.set(1,n,r,0,e,1,o,0,t,s,1,0,0,0,0,1),this}compose(e,t,n){let s=this.elements,r=t._x,o=t._y,a=t._z,l=t._w,c=r+r,u=o+o,h=a+a,d=r*c,f=r*u,g=r*h,y=o*u,m=o*h,p=a*h,M=l*c,w=l*u,S=l*h,C=n.x,A=n.y,R=n.z;return s[0]=(1-(y+p))*C,s[1]=(f+S)*C,s[2]=(g-w)*C,s[3]=0,s[4]=(f-S)*A,s[5]=(1-(d+p))*A,s[6]=(m+M)*A,s[7]=0,s[8]=(g+w)*R,s[9]=(m-M)*R,s[10]=(1-(d+y))*R,s[11]=0,s[12]=e.x,s[13]=e.y,s[14]=e.z,s[15]=1,this}decompose(e,t,n){let s=this.elements;e.x=s[12],e.y=s[13],e.z=s[14];let r=this.determinant();if(r===0)return n.set(1,1,1),t.identity(),this;let o=rr.set(s[0],s[1],s[2]).length(),a=rr.set(s[4],s[5],s[6]).length(),l=rr.set(s[8],s[9],s[10]).length();r<0&&(o=-o),Nn.copy(this);let c=1/o,u=1/a,h=1/l;return Nn.elements[0]*=c,Nn.elements[1]*=c,Nn.elements[2]*=c,Nn.elements[4]*=u,Nn.elements[5]*=u,Nn.elements[6]*=u,Nn.elements[8]*=h,Nn.elements[9]*=h,Nn.elements[10]*=h,t.setFromRotationMatrix(Nn),n.x=o,n.y=a,n.z=l,this}makePerspective(e,t,n,s,r,o,a=On,l=!1){let c=this.elements,u=2*r/(t-e),h=2*r/(n-s),d=(t+e)/(t-e),f=(n+s)/(n-s),g,y;if(l)g=r/(o-r),y=o*r/(o-r);else if(a===On)g=-(o+r)/(o-r),y=-2*o*r/(o-r);else if(a===wr)g=-o/(o-r),y=-o*r/(o-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return c[0]=u,c[4]=0,c[8]=d,c[12]=0,c[1]=0,c[5]=h,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=g,c[14]=y,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,n,s,r,o,a=On,l=!1){let c=this.elements,u=2/(t-e),h=2/(n-s),d=-(t+e)/(t-e),f=-(n+s)/(n-s),g,y;if(l)g=1/(o-r),y=o/(o-r);else if(a===On)g=-2/(o-r),y=-(o+r)/(o-r);else if(a===wr)g=-1/(o-r),y=-r/(o-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return c[0]=u,c[4]=0,c[8]=0,c[12]=d,c[1]=0,c[5]=h,c[9]=0,c[13]=f,c[2]=0,c[6]=0,c[10]=g,c[14]=y,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){let t=this.elements,n=e.elements;for(let s=0;s<16;s++)if(t[s]!==n[s])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}},rr=new L,Nn=new ze,Jm=new L(0,0,0),jm=new L(1,1,1),Wi=new L,ya=new L,gn=new L,Od=new ze,Bd=new jt,zn=class i{constructor(e=0,t=0,n=0,s=i.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=s}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,s=this._order){return this._x=e,this._y=t,this._z=n,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){let s=e.elements,r=s[0],o=s[4],a=s[8],l=s[1],c=s[5],u=s[9],h=s[2],d=s[6],f=s[10];switch(t){case"XYZ":this._y=Math.asin(Ze(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-u,f),this._z=Math.atan2(-o,r)):(this._x=Math.atan2(d,c),this._z=0);break;case"YXZ":this._x=Math.asin(-Ze(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(a,f),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-h,r),this._z=0);break;case"ZXY":this._x=Math.asin(Ze(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-h,f),this._z=Math.atan2(-o,c)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-Ze(h,-1,1)),Math.abs(h)<.9999999?(this._x=Math.atan2(d,f),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-o,c));break;case"YZX":this._z=Math.asin(Ze(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-u,c),this._y=Math.atan2(-h,r)):(this._x=0,this._y=Math.atan2(a,f));break;case"XZY":this._z=Math.asin(-Ze(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(d,c),this._y=Math.atan2(a,r)):(this._x=Math.atan2(-u,f),this._y=0);break;default:Ee("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return Od.makeRotationFromQuaternion(e),this.setFromRotationMatrix(Od,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return Bd.setFromEuler(this),this.setFromQuaternion(Bd,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};zn.DEFAULT_ORDER="XYZ";var Mo=class{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}},Qm=0,kd=new L,or=new jt,bi=new ze,va=new L,so=new L,eg=new L,tg=new jt,zd=new L(1,0,0),Hd=new L(0,1,0),Vd=new L(0,0,1),Gd={type:"added"},ng={type:"removed"},ar={type:"childadded",child:null},Jc={type:"childremoved",child:null},gt=class i extends ni{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Qm++}),this.uuid=Bn(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=i.DEFAULT_UP.clone();let e=new L,t=new zn,n=new jt,s=new L(1,1,1);function r(){n.setFromEuler(t,!1)}function o(){t.setFromQuaternion(n,void 0,!1)}t._onChange(r),n._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new ze},normalMatrix:{value:new He}}),this.matrix=new ze,this.matrixWorld=new ze,this.matrixAutoUpdate=i.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=i.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Mo,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return or.setFromAxisAngle(e,t),this.quaternion.multiply(or),this}rotateOnWorldAxis(e,t){return or.setFromAxisAngle(e,t),this.quaternion.premultiply(or),this}rotateX(e){return this.rotateOnAxis(zd,e)}rotateY(e){return this.rotateOnAxis(Hd,e)}rotateZ(e){return this.rotateOnAxis(Vd,e)}translateOnAxis(e,t){return kd.copy(e).applyQuaternion(this.quaternion),this.position.add(kd.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(zd,e)}translateY(e){return this.translateOnAxis(Hd,e)}translateZ(e){return this.translateOnAxis(Vd,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(bi.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?va.copy(e):va.set(e,t,n);let s=this.parent;this.updateWorldMatrix(!0,!1),so.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?bi.lookAt(so,va,this.up):bi.lookAt(va,so,this.up),this.quaternion.setFromRotationMatrix(bi),s&&(bi.extractRotation(s.matrixWorld),or.setFromRotationMatrix(bi),this.quaternion.premultiply(or.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(Ne("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(Gd),ar.child=e,this.dispatchEvent(ar),ar.child=null):Ne("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}let t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(ng),Jc.child=e,this.dispatchEvent(Jc),Jc.child=null),this}removeFromParent(){let e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),bi.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),bi.multiply(e.parent.matrixWorld)),e.applyMatrix4(bi),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(Gd),ar.child=e,this.dispatchEvent(ar),ar.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,s=this.children.length;n<s;n++){let o=this.children[n].getObjectByProperty(e,t);if(o!==void 0)return o}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);let s=this.children;for(let r=0,o=s.length;r<o;r++)s[r].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(so,e,eg),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(so,tg,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);let t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);let t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);let t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].traverseVisible(e)}traverseAncestors(e){let t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let e=this.pivot;if(e!==null){let t=e.x,n=e.y,s=e.z,r=this.matrix.elements;r[12]+=t-r[0]*t-r[4]*n-r[8]*s,r[13]+=n-r[1]*t-r[5]*n-r[9]*s,r[14]+=s-r[2]*t-r[6]*n-r[10]*s}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);let t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t){let n=this.parent;if(e===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),t===!0){let s=this.children;for(let r=0,o=s.length;r<o;r++)s[r].updateWorldMatrix(!1,!0)}}toJSON(e){let t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});let s={};s.uuid=this.uuid,s.type=this.type,this.name!==""&&(s.name=this.name),this.castShadow===!0&&(s.castShadow=!0),this.receiveShadow===!0&&(s.receiveShadow=!0),this.visible===!1&&(s.visible=!1),this.frustumCulled===!1&&(s.frustumCulled=!1),this.renderOrder!==0&&(s.renderOrder=this.renderOrder),this.static!==!1&&(s.static=this.static),Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.pivot!==null&&(s.pivot=this.pivot.toArray()),this.matrixAutoUpdate===!1&&(s.matrixAutoUpdate=!1),this.morphTargetDictionary!==void 0&&(s.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(s.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.geometryInfo=this._geometryInfo.map(a=>({...a,boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),s.instanceInfo=this._instanceInfo.map(a=>({...a})),s.availableInstanceIds=this._availableInstanceIds.slice(),s.availableGeometryIds=this._availableGeometryIds.slice(),s.nextIndexStart=this._nextIndexStart,s.nextVertexStart=this._nextVertexStart,s.geometryCount=this._geometryCount,s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.matricesTexture=this._matricesTexture.toJSON(e),s.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(s.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(s.boundingBox=this.boundingBox.toJSON()));function r(a,l){return a[l.uuid]===void 0&&(a[l.uuid]=l.toJSON(e)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(e.geometries,this.geometry);let a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){let l=a.shapes;if(Array.isArray(l))for(let c=0,u=l.length;c<u;c++){let h=l[c];r(e.shapes,h)}else r(e.shapes,l)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(e.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let a=[];for(let l=0,c=this.material.length;l<c;l++)a.push(r(e.materials,this.material[l]));s.material=a}else s.material=r(e.materials,this.material);if(this.children.length>0){s.children=[];for(let a=0;a<this.children.length;a++)s.children.push(this.children[a].toJSON(e).object)}if(this.animations.length>0){s.animations=[];for(let a=0;a<this.animations.length;a++){let l=this.animations[a];s.animations.push(r(e.animations,l))}}if(t){let a=o(e.geometries),l=o(e.materials),c=o(e.textures),u=o(e.images),h=o(e.shapes),d=o(e.skeletons),f=o(e.animations),g=o(e.nodes);a.length>0&&(n.geometries=a),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),u.length>0&&(n.images=u),h.length>0&&(n.shapes=h),d.length>0&&(n.skeletons=d),f.length>0&&(n.animations=f),g.length>0&&(n.nodes=g)}return n.object=s,n;function o(a){let l=[];for(let c in a){let u=a[c];delete u.metadata,l.push(u)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),e.pivot!==null&&(this.pivot=e.pivot.clone()),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){let s=e.children[n];this.add(s.clone())}return this}};gt.DEFAULT_UP=new L(0,1,0);gt.DEFAULT_MATRIX_AUTO_UPDATE=!0;gt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var Gt=class extends gt{constructor(){super(),this.isGroup=!0,this.type="Group"}},ig={type:"move"},Cr=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Gt,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Gt,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new L,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new L),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Gt,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new L,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new L),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){let t=this._hand;if(t)for(let n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let s=null,r=null,o=null,a=this._targetRay,l=this._grip,c=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(c&&e.hand){o=!0;for(let y of e.hand.values()){let m=t.getJointPose(y,n),p=this._getHandJoint(c,y);m!==null&&(p.matrix.fromArray(m.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=m.radius),p.visible=m!==null}let u=c.joints["index-finger-tip"],h=c.joints["thumb-tip"],d=u.position.distanceTo(h.position),f=.02,g=.005;c.inputState.pinching&&d>f+g?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!c.inputState.pinching&&d<=f-g&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(r=t.getPose(e.gripSpace,n),r!==null&&(l.matrix.fromArray(r.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,r.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(r.linearVelocity)):l.hasLinearVelocity=!1,r.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(r.angularVelocity)):l.hasAngularVelocity=!1));a!==null&&(s=t.getPose(e.targetRaySpace,n),s===null&&r!==null&&(s=r),s!==null&&(a.matrix.fromArray(s.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,s.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(s.linearVelocity)):a.hasLinearVelocity=!1,s.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(s.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(ig)))}return a!==null&&(a.visible=s!==null),l!==null&&(l.visible=r!==null),c!==null&&(c.visible=o!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){let n=new Gt;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}},ep={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Ki={h:0,s:0,l:0},ba={h:0,s:0,l:0};function jc(i,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?i+(e-i)*6*t:t<1/2?e:t<2/3?i+(e-i)*6*(2/3-t):i}var Pe=class{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){let s=e;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=_t){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,$e.colorSpaceToWorking(this,t),this}setRGB(e,t,n,s=$e.workingColorSpace){return this.r=e,this.g=t,this.b=n,$e.colorSpaceToWorking(this,s),this}setHSL(e,t,n,s=$e.workingColorSpace){if(e=Zu(e,1),t=Ze(t,0,1),n=Ze(n,0,1),t===0)this.r=this.g=this.b=n;else{let r=n<=.5?n*(1+t):n+t-n*t,o=2*n-r;this.r=jc(o,r,e+1/3),this.g=jc(o,r,e),this.b=jc(o,r,e-1/3)}return $e.colorSpaceToWorking(this,s),this}setStyle(e,t=_t){function n(r){r!==void 0&&parseFloat(r)<1&&Ee("Color: Alpha component of "+e+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(e)){let r,o=s[1],a=s[2];switch(o){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,t);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,t);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,t);break;default:Ee("Color: Unknown color model "+e)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(e)){let r=s[1],o=r.length;if(o===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,t);if(o===6)return this.setHex(parseInt(r,16),t);Ee("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=_t){let n=ep[e.toLowerCase()];return n!==void 0?this.setHex(n,t):Ee("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=Ci(e.r),this.g=Ci(e.g),this.b=Ci(e.b),this}copyLinearToSRGB(e){return this.r=Mr(e.r),this.g=Mr(e.g),this.b=Mr(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=_t){return $e.workingToColorSpace(Jt.copy(this),e),Math.round(Ze(Jt.r*255,0,255))*65536+Math.round(Ze(Jt.g*255,0,255))*256+Math.round(Ze(Jt.b*255,0,255))}getHexString(e=_t){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=$e.workingColorSpace){$e.workingToColorSpace(Jt.copy(this),t);let n=Jt.r,s=Jt.g,r=Jt.b,o=Math.max(n,s,r),a=Math.min(n,s,r),l,c,u=(a+o)/2;if(a===o)l=0,c=0;else{let h=o-a;switch(c=u<=.5?h/(o+a):h/(2-o-a),o){case n:l=(s-r)/h+(s<r?6:0);break;case s:l=(r-n)/h+2;break;case r:l=(n-s)/h+4;break}l/=6}return e.h=l,e.s=c,e.l=u,e}getRGB(e,t=$e.workingColorSpace){return $e.workingToColorSpace(Jt.copy(this),t),e.r=Jt.r,e.g=Jt.g,e.b=Jt.b,e}getStyle(e=_t){$e.workingToColorSpace(Jt.copy(this),e);let t=Jt.r,n=Jt.g,s=Jt.b;return e!==_t?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(s*255)})`}offsetHSL(e,t,n){return this.getHSL(Ki),this.setHSL(Ki.h+e,Ki.s+t,Ki.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(Ki),e.getHSL(ba);let n=go(Ki.h,ba.h,t),s=go(Ki.s,ba.s,t),r=go(Ki.l,ba.l,t);return this.setHSL(n,s,r),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){let t=this.r,n=this.g,s=this.b,r=e.elements;return this.r=r[0]*t+r[3]*n+r[6]*s,this.g=r[1]*t+r[4]*n+r[7]*s,this.b=r[2]*t+r[5]*n+r[8]*s,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},Jt=new Pe;Pe.NAMES=ep;var So=class i{constructor(e,t=1,n=1e3){this.isFog=!0,this.name="",this.color=new Pe(e),this.near=t,this.far=n}clone(){return new i(this.color,this.near,this.far)}toJSON(){return{type:"Fog",name:this.name,color:this.color.getHex(),near:this.near,far:this.far}}},wo=class extends gt{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new zn,this.environmentIntensity=1,this.environmentRotation=new zn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){let t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}},Dn=new L,Mi=new L,Qc=new L,Si=new L,lr=new L,cr=new L,Wd=new L,eu=new L,tu=new L,nu=new L,iu=new pt,su=new pt,ru=new pt,Ai=class i{constructor(e=new L,t=new L,n=new L){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,s){s.subVectors(n,t),Dn.subVectors(e,t),s.cross(Dn);let r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(e,t,n,s,r){Dn.subVectors(s,t),Mi.subVectors(n,t),Qc.subVectors(e,t);let o=Dn.dot(Dn),a=Dn.dot(Mi),l=Dn.dot(Qc),c=Mi.dot(Mi),u=Mi.dot(Qc),h=o*c-a*a;if(h===0)return r.set(0,0,0),null;let d=1/h,f=(c*l-a*u)*d,g=(o*u-a*l)*d;return r.set(1-f-g,g,f)}static containsPoint(e,t,n,s){return this.getBarycoord(e,t,n,s,Si)===null?!1:Si.x>=0&&Si.y>=0&&Si.x+Si.y<=1}static getInterpolation(e,t,n,s,r,o,a,l){return this.getBarycoord(e,t,n,s,Si)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(r,Si.x),l.addScaledVector(o,Si.y),l.addScaledVector(a,Si.z),l)}static getInterpolatedAttribute(e,t,n,s,r,o){return iu.setScalar(0),su.setScalar(0),ru.setScalar(0),iu.fromBufferAttribute(e,t),su.fromBufferAttribute(e,n),ru.fromBufferAttribute(e,s),o.setScalar(0),o.addScaledVector(iu,r.x),o.addScaledVector(su,r.y),o.addScaledVector(ru,r.z),o}static isFrontFacing(e,t,n,s){return Dn.subVectors(n,t),Mi.subVectors(e,t),Dn.cross(Mi).dot(s)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,s){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[s]),this}setFromAttributeAndIndices(e,t,n,s){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,s),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Dn.subVectors(this.c,this.b),Mi.subVectors(this.a,this.b),Dn.cross(Mi).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return i.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return i.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,n,s,r){return i.getInterpolation(e,this.a,this.b,this.c,t,n,s,r)}containsPoint(e){return i.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return i.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){let n=this.a,s=this.b,r=this.c,o,a;lr.subVectors(s,n),cr.subVectors(r,n),eu.subVectors(e,n);let l=lr.dot(eu),c=cr.dot(eu);if(l<=0&&c<=0)return t.copy(n);tu.subVectors(e,s);let u=lr.dot(tu),h=cr.dot(tu);if(u>=0&&h<=u)return t.copy(s);let d=l*h-u*c;if(d<=0&&l>=0&&u<=0)return o=l/(l-u),t.copy(n).addScaledVector(lr,o);nu.subVectors(e,r);let f=lr.dot(nu),g=cr.dot(nu);if(g>=0&&f<=g)return t.copy(r);let y=f*c-l*g;if(y<=0&&c>=0&&g<=0)return a=c/(c-g),t.copy(n).addScaledVector(cr,a);let m=u*g-f*h;if(m<=0&&h-u>=0&&f-g>=0)return Wd.subVectors(r,s),a=(h-u)/(h-u+(f-g)),t.copy(s).addScaledVector(Wd,a);let p=1/(m+y+d);return o=y*p,a=d*p,t.copy(n).addScaledVector(lr,o).addScaledVector(cr,a)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}},Qt=class{constructor(e=new L(1/0,1/0,1/0),t=new L(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(Un.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(Un.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){let n=Un.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);let n=e.geometry;if(n!==void 0){let r=n.getAttribute("position");if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0)for(let o=0,a=r.count;o<a;o++)e.isMesh===!0?e.getVertexPosition(o,Un):Un.fromBufferAttribute(r,o),Un.applyMatrix4(e.matrixWorld),this.expandByPoint(Un);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),Ma.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),Ma.copy(n.boundingBox)),Ma.applyMatrix4(e.matrixWorld),this.union(Ma)}let s=e.children;for(let r=0,o=s.length;r<o;r++)this.expandByObject(s[r],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,Un),Un.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(ro),Sa.subVectors(this.max,ro),ur.subVectors(e.a,ro),hr.subVectors(e.b,ro),dr.subVectors(e.c,ro),Xi.subVectors(hr,ur),qi.subVectors(dr,hr),xs.subVectors(ur,dr);let t=[0,-Xi.z,Xi.y,0,-qi.z,qi.y,0,-xs.z,xs.y,Xi.z,0,-Xi.x,qi.z,0,-qi.x,xs.z,0,-xs.x,-Xi.y,Xi.x,0,-qi.y,qi.x,0,-xs.y,xs.x,0];return!ou(t,ur,hr,dr,Sa)||(t=[1,0,0,0,1,0,0,0,1],!ou(t,ur,hr,dr,Sa))?!1:(wa.crossVectors(Xi,qi),t=[wa.x,wa.y,wa.z],ou(t,ur,hr,dr,Sa))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Un).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Un).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(wi[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),wi[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),wi[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),wi[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),wi[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),wi[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),wi[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),wi[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(wi),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}},wi=[new L,new L,new L,new L,new L,new L,new L,new L],Un=new L,Ma=new Qt,ur=new L,hr=new L,dr=new L,Xi=new L,qi=new L,xs=new L,ro=new L,Sa=new L,wa=new L,_s=new L;function ou(i,e,t,n,s){for(let r=0,o=i.length-3;r<=o;r+=3){_s.fromArray(i,r);let a=s.x*Math.abs(_s.x)+s.y*Math.abs(_s.y)+s.z*Math.abs(_s.z),l=e.dot(_s),c=t.dot(_s),u=n.dot(_s);if(Math.max(-Math.max(l,c,u),Math.min(l,c,u))>a)return!1}return!0}var Ct=new L,Ta=new Ie,sg=0,It=class{constructor(e,t,n=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:sg++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=sl,this.updateRanges=[],this.gpuType=bn,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[e+s]=t.array[n+s];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)Ta.fromBufferAttribute(this,t),Ta.applyMatrix3(e),this.setXY(t,Ta.x,Ta.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)Ct.fromBufferAttribute(this,t),Ct.applyMatrix3(e),this.setXYZ(t,Ct.x,Ct.y,Ct.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)Ct.fromBufferAttribute(this,t),Ct.applyMatrix4(e),this.setXYZ(t,Ct.x,Ct.y,Ct.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)Ct.fromBufferAttribute(this,t),Ct.applyNormalMatrix(e),this.setXYZ(t,Ct.x,Ct.y,Ct.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)Ct.fromBufferAttribute(this,t),Ct.transformDirection(e),this.setXYZ(t,Ct.x,Ct.y,Ct.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=Fn(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=rt(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=Fn(t,this.array)),t}setX(e,t){return this.normalized&&(t=rt(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=Fn(t,this.array)),t}setY(e,t){return this.normalized&&(t=rt(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=Fn(t,this.array)),t}setZ(e,t){return this.normalized&&(t=rt(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=Fn(t,this.array)),t}setW(e,t){return this.normalized&&(t=rt(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=rt(t,this.array),n=rt(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,s){return e*=this.itemSize,this.normalized&&(t=rt(t,this.array),n=rt(n,this.array),s=rt(s,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=s,this}setXYZW(e,t,n,s,r){return e*=this.itemSize,this.normalized&&(t=rt(t,this.array),n=rt(n,this.array),s=rt(s,this.array),r=rt(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=s,this.array[e+3]=r,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==sl&&(e.usage=this.usage),e}};var To=class extends It{constructor(e,t,n){super(new Uint16Array(e),t,n)}};var Eo=class extends It{constructor(e,t,n){super(new Uint32Array(e),t,n)}};var ht=class extends It{constructor(e,t,n){super(new Float32Array(e),t,n)}},rg=new Qt,oo=new L,au=new L,un=class{constructor(e=new L,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){let n=this.center;t!==void 0?n.copy(t):rg.setFromPoints(e).getCenter(n);let s=0;for(let r=0,o=e.length;r<o;r++)s=Math.max(s,n.distanceToSquared(e[r]));return this.radius=Math.sqrt(s),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){let t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){let n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;oo.subVectors(e,this.center);let t=oo.lengthSq();if(t>this.radius*this.radius){let n=Math.sqrt(t),s=(n-this.radius)*.5;this.center.addScaledVector(oo,s/n),this.radius+=s}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(au.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(oo.copy(e.center).add(au)),this.expandByPoint(oo.copy(e.center).sub(au))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}},og=0,Tn=new ze,lu=new gt,fr=new L,xn=new Qt,ao=new Qt,Vt=new L,Pt=class i extends ni{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:og++}),this.uuid=Bn(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(Im(e)?Eo:To)(e,1):this.index=e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){let t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let r=new He().getNormalMatrix(e);n.applyNormalMatrix(r),n.needsUpdate=!0}let s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(e),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return Tn.makeRotationFromQuaternion(e),this.applyMatrix4(Tn),this}rotateX(e){return Tn.makeRotationX(e),this.applyMatrix4(Tn),this}rotateY(e){return Tn.makeRotationY(e),this.applyMatrix4(Tn),this}rotateZ(e){return Tn.makeRotationZ(e),this.applyMatrix4(Tn),this}translate(e,t,n){return Tn.makeTranslation(e,t,n),this.applyMatrix4(Tn),this}scale(e,t,n){return Tn.makeScale(e,t,n),this.applyMatrix4(Tn),this}lookAt(e){return lu.lookAt(e),lu.updateMatrix(),this.applyMatrix4(lu.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(fr).negate(),this.translate(fr.x,fr.y,fr.z),this}setFromPoints(e){let t=this.getAttribute("position");if(t===void 0){let n=[];for(let s=0,r=e.length;s<r;s++){let o=e[s];n.push(o.x,o.y,o.z||0)}this.setAttribute("position",new ht(n,3))}else{let n=Math.min(e.length,t.count);for(let s=0;s<n;s++){let r=e[s];t.setXYZ(s,r.x,r.y,r.z||0)}e.length>t.count&&Ee("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Qt);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Ne("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new L(-1/0,-1/0,-1/0),new L(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,s=t.length;n<s;n++){let r=t[n];xn.setFromBufferAttribute(r),this.morphTargetsRelative?(Vt.addVectors(this.boundingBox.min,xn.min),this.boundingBox.expandByPoint(Vt),Vt.addVectors(this.boundingBox.max,xn.max),this.boundingBox.expandByPoint(Vt)):(this.boundingBox.expandByPoint(xn.min),this.boundingBox.expandByPoint(xn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Ne('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new un);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Ne("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new L,1/0);return}if(e){let n=this.boundingSphere.center;if(xn.setFromBufferAttribute(e),t)for(let r=0,o=t.length;r<o;r++){let a=t[r];ao.setFromBufferAttribute(a),this.morphTargetsRelative?(Vt.addVectors(xn.min,ao.min),xn.expandByPoint(Vt),Vt.addVectors(xn.max,ao.max),xn.expandByPoint(Vt)):(xn.expandByPoint(ao.min),xn.expandByPoint(ao.max))}xn.getCenter(n);let s=0;for(let r=0,o=e.count;r<o;r++)Vt.fromBufferAttribute(e,r),s=Math.max(s,n.distanceToSquared(Vt));if(t)for(let r=0,o=t.length;r<o;r++){let a=t[r],l=this.morphTargetsRelative;for(let c=0,u=a.count;c<u;c++)Vt.fromBufferAttribute(a,c),l&&(fr.fromBufferAttribute(e,c),Vt.add(fr)),s=Math.max(s,n.distanceToSquared(Vt))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&Ne('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){Ne("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let n=t.position,s=t.normal,r=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new It(new Float32Array(4*n.count),4));let o=this.getAttribute("tangent"),a=[],l=[];for(let v=0;v<n.count;v++)a[v]=new L,l[v]=new L;let c=new L,u=new L,h=new L,d=new Ie,f=new Ie,g=new Ie,y=new L,m=new L;function p(v,T,K){c.fromBufferAttribute(n,v),u.fromBufferAttribute(n,T),h.fromBufferAttribute(n,K),d.fromBufferAttribute(r,v),f.fromBufferAttribute(r,T),g.fromBufferAttribute(r,K),u.sub(c),h.sub(c),f.sub(d),g.sub(d);let I=1/(f.x*g.y-g.x*f.y);isFinite(I)&&(y.copy(u).multiplyScalar(g.y).addScaledVector(h,-f.y).multiplyScalar(I),m.copy(h).multiplyScalar(f.x).addScaledVector(u,-g.x).multiplyScalar(I),a[v].add(y),a[T].add(y),a[K].add(y),l[v].add(m),l[T].add(m),l[K].add(m))}let M=this.groups;M.length===0&&(M=[{start:0,count:e.count}]);for(let v=0,T=M.length;v<T;++v){let K=M[v],I=K.start,F=K.count;for(let O=I,V=I+F;O<V;O+=3)p(e.getX(O+0),e.getX(O+1),e.getX(O+2))}let w=new L,S=new L,C=new L,A=new L;function R(v){C.fromBufferAttribute(s,v),A.copy(C);let T=a[v];w.copy(T),w.sub(C.multiplyScalar(C.dot(T))).normalize(),S.crossVectors(A,T);let I=S.dot(l[v])<0?-1:1;o.setXYZW(v,w.x,w.y,w.z,I)}for(let v=0,T=M.length;v<T;++v){let K=M[v],I=K.start,F=K.count;for(let O=I,V=I+F;O<V;O+=3)R(e.getX(O+0)),R(e.getX(O+1)),R(e.getX(O+2))}}computeVertexNormals(){let e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new It(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let d=0,f=n.count;d<f;d++)n.setXYZ(d,0,0,0);let s=new L,r=new L,o=new L,a=new L,l=new L,c=new L,u=new L,h=new L;if(e)for(let d=0,f=e.count;d<f;d+=3){let g=e.getX(d+0),y=e.getX(d+1),m=e.getX(d+2);s.fromBufferAttribute(t,g),r.fromBufferAttribute(t,y),o.fromBufferAttribute(t,m),u.subVectors(o,r),h.subVectors(s,r),u.cross(h),a.fromBufferAttribute(n,g),l.fromBufferAttribute(n,y),c.fromBufferAttribute(n,m),a.add(u),l.add(u),c.add(u),n.setXYZ(g,a.x,a.y,a.z),n.setXYZ(y,l.x,l.y,l.z),n.setXYZ(m,c.x,c.y,c.z)}else for(let d=0,f=t.count;d<f;d+=3)s.fromBufferAttribute(t,d+0),r.fromBufferAttribute(t,d+1),o.fromBufferAttribute(t,d+2),u.subVectors(o,r),h.subVectors(s,r),u.cross(h),n.setXYZ(d+0,u.x,u.y,u.z),n.setXYZ(d+1,u.x,u.y,u.z),n.setXYZ(d+2,u.x,u.y,u.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)Vt.fromBufferAttribute(e,t),Vt.normalize(),e.setXYZ(t,Vt.x,Vt.y,Vt.z)}toNonIndexed(){function e(a,l){let c=a.array,u=a.itemSize,h=a.normalized,d=new c.constructor(l.length*u),f=0,g=0;for(let y=0,m=l.length;y<m;y++){a.isInterleavedBufferAttribute?f=l[y]*a.data.stride+a.offset:f=l[y]*u;for(let p=0;p<u;p++)d[g++]=c[f++]}return new It(d,u,h)}if(this.index===null)return Ee("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let t=new i,n=this.index.array,s=this.attributes;for(let a in s){let l=s[a],c=e(l,n);t.setAttribute(a,c)}let r=this.morphAttributes;for(let a in r){let l=[],c=r[a];for(let u=0,h=c.length;u<h;u++){let d=c[u],f=e(d,n);l.push(f)}t.morphAttributes[a]=l}t.morphTargetsRelative=this.morphTargetsRelative;let o=this.groups;for(let a=0,l=o.length;a<l;a++){let c=o[a];t.addGroup(c.start,c.count,c.materialIndex)}return t}toJSON(){let e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){let l=this.parameters;for(let c in l)l[c]!==void 0&&(e[c]=l[c]);return e}e.data={attributes:{}};let t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});let n=this.attributes;for(let l in n){let c=n[l];e.data.attributes[l]=c.toJSON(e.data)}let s={},r=!1;for(let l in this.morphAttributes){let c=this.morphAttributes[l],u=[];for(let h=0,d=c.length;h<d;h++){let f=c[h];u.push(f.toJSON(e.data))}u.length>0&&(s[l]=u,r=!0)}r&&(e.data.morphAttributes=s,e.data.morphTargetsRelative=this.morphTargetsRelative);let o=this.groups;o.length>0&&(e.data.groups=JSON.parse(JSON.stringify(o)));let a=this.boundingSphere;return a!==null&&(e.data.boundingSphere=a.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let t={};this.name=e.name;let n=e.index;n!==null&&this.setIndex(n.clone());let s=e.attributes;for(let c in s){let u=s[c];this.setAttribute(c,u.clone(t))}let r=e.morphAttributes;for(let c in r){let u=[],h=r[c];for(let d=0,f=h.length;d<f;d++)u.push(h[d].clone(t));this.morphAttributes[c]=u}this.morphTargetsRelative=e.morphTargetsRelative;let o=e.groups;for(let c=0,u=o.length;c<u;c++){let h=o[c];this.addGroup(h.start,h.count,h.materialIndex)}let a=e.boundingBox;a!==null&&(this.boundingBox=a.clone());let l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}},Rs=class{constructor(e,t){this.isInterleavedBuffer=!0,this.array=e,this.stride=t,this.count=e!==void 0?e.length/t:0,this.usage=sl,this.updateRanges=[],this.version=0,this.uuid=Bn()}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,n){e*=this.stride,n*=t.stride;for(let s=0,r=this.stride;s<r;s++)this.array[e+s]=t.array[n+s];return this}set(e,t=0){return this.array.set(e,t),this}clone(e){e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Bn()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);let t=new this.array.constructor(e.arrayBuffers[this.array.buffer._uuid]),n=new this.constructor(t,this.stride);return n.setUsage(this.usage),n}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){return e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Bn()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer))),{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}},sn=new L,ji=class i{constructor(e,t,n,s=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=e,this.itemSize=t,this.offset=n,this.normalized=s}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let t=0,n=this.data.count;t<n;t++)sn.fromBufferAttribute(this,t),sn.applyMatrix4(e),this.setXYZ(t,sn.x,sn.y,sn.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)sn.fromBufferAttribute(this,t),sn.applyNormalMatrix(e),this.setXYZ(t,sn.x,sn.y,sn.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)sn.fromBufferAttribute(this,t),sn.transformDirection(e),this.setXYZ(t,sn.x,sn.y,sn.z);return this}getComponent(e,t){let n=this.array[e*this.data.stride+this.offset+t];return this.normalized&&(n=Fn(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=rt(n,this.array)),this.data.array[e*this.data.stride+this.offset+t]=n,this}setX(e,t){return this.normalized&&(t=rt(t,this.array)),this.data.array[e*this.data.stride+this.offset]=t,this}setY(e,t){return this.normalized&&(t=rt(t,this.array)),this.data.array[e*this.data.stride+this.offset+1]=t,this}setZ(e,t){return this.normalized&&(t=rt(t,this.array)),this.data.array[e*this.data.stride+this.offset+2]=t,this}setW(e,t){return this.normalized&&(t=rt(t,this.array)),this.data.array[e*this.data.stride+this.offset+3]=t,this}getX(e){let t=this.data.array[e*this.data.stride+this.offset];return this.normalized&&(t=Fn(t,this.array)),t}getY(e){let t=this.data.array[e*this.data.stride+this.offset+1];return this.normalized&&(t=Fn(t,this.array)),t}getZ(e){let t=this.data.array[e*this.data.stride+this.offset+2];return this.normalized&&(t=Fn(t,this.array)),t}getW(e){let t=this.data.array[e*this.data.stride+this.offset+3];return this.normalized&&(t=Fn(t,this.array)),t}setXY(e,t,n){return e=e*this.data.stride+this.offset,this.normalized&&(t=rt(t,this.array),n=rt(n,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this}setXYZ(e,t,n,s){return e=e*this.data.stride+this.offset,this.normalized&&(t=rt(t,this.array),n=rt(n,this.array),s=rt(s,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=s,this}setXYZW(e,t,n,s,r){return e=e*this.data.stride+this.offset,this.normalized&&(t=rt(t,this.array),n=rt(n,this.array),s=rt(s,this.array),r=rt(r,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=s,this.data.array[e+3]=r,this}clone(e){if(e===void 0){yo("InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");let t=[];for(let n=0;n<this.count;n++){let s=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)t.push(this.data.array[s+r])}return new It(new this.array.constructor(t),this.itemSize,this.normalized)}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.clone(e)),new i(e.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(e){if(e===void 0){yo("InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");let t=[];for(let n=0;n<this.count;n++){let s=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)t.push(this.data.array[s+r])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:t,normalized:this.normalized}}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}},ag=0,rn=class extends ni{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:ag++}),this.uuid=Bn(),this.name="",this.type="Material",this.blending=ws,this.side=kn,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=$a,this.blendDst=Za,this.blendEquation=Zi,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Pe(0,0,0),this.blendAlpha=0,this.depthFunc=Ts,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Mu,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=bs,this.stencilZFail=bs,this.stencilZPass=bs,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(let t in e){let n=e[t];if(n===void 0){Ee(`Material: parameter '${t}' has value of undefined.`);continue}let s=this[t];if(s===void 0){Ee(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(n):s&&s.isVector3&&n&&n.isVector3?s.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});let n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==ws&&(n.blending=this.blending),this.side!==kn&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==$a&&(n.blendSrc=this.blendSrc),this.blendDst!==Za&&(n.blendDst=this.blendDst),this.blendEquation!==Zi&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==Ts&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Mu&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==bs&&(n.stencilFail=this.stencilFail),this.stencilZFail!==bs&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==bs&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.allowOverride===!1&&(n.allowOverride=!1),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function s(r){let o=[];for(let a in r){let l=r[a];delete l.metadata,o.push(l)}return o}if(t){let r=s(e.textures),o=s(e.images);r.length>0&&(n.textures=r),o.length>0&&(n.images=o)}return n}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;let t=e.clippingPlanes,n=null;if(t!==null){let s=t.length;n=new Array(s);for(let r=0;r!==s;++r)n[r]=t[r].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}},Is=class extends rn{constructor(e){super(),this.isSpriteMaterial=!0,this.type="SpriteMaterial",this.color=new Pe(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.rotation=e.rotation,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}},pr,lo=new L,mr=new L,gr=new L,xr=new Ie,co=new Ie,tp=new ze,Ea=new L,uo=new L,Aa=new L,Kd=new Ie,cu=new Ie,Xd=new Ie,Rr=class extends gt{constructor(e=new Is){if(super(),this.isSprite=!0,this.type="Sprite",pr===void 0){pr=new Pt;let t=new Float32Array([-.5,-.5,0,0,0,.5,-.5,0,1,0,.5,.5,0,1,1,-.5,.5,0,0,1]),n=new Rs(t,5);pr.setIndex([0,1,2,0,2,3]),pr.setAttribute("position",new ji(n,3,0,!1)),pr.setAttribute("uv",new ji(n,2,3,!1))}this.geometry=pr,this.material=e,this.center=new Ie(.5,.5),this.count=1}raycast(e,t){e.camera===null&&Ne('Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.'),mr.setFromMatrixScale(this.matrixWorld),tp.copy(e.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(e.camera.matrixWorldInverse,this.matrixWorld),gr.setFromMatrixPosition(this.modelViewMatrix),e.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1&&mr.multiplyScalar(-gr.z);let n=this.material.rotation,s,r;n!==0&&(r=Math.cos(n),s=Math.sin(n));let o=this.center;Ca(Ea.set(-.5,-.5,0),gr,o,mr,s,r),Ca(uo.set(.5,-.5,0),gr,o,mr,s,r),Ca(Aa.set(.5,.5,0),gr,o,mr,s,r),Kd.set(0,0),cu.set(1,0),Xd.set(1,1);let a=e.ray.intersectTriangle(Ea,uo,Aa,!1,lo);if(a===null&&(Ca(uo.set(-.5,.5,0),gr,o,mr,s,r),cu.set(0,1),a=e.ray.intersectTriangle(Ea,Aa,uo,!1,lo),a===null))return;let l=e.ray.origin.distanceTo(lo);l<e.near||l>e.far||t.push({distance:l,point:lo.clone(),uv:Ai.getInterpolation(lo,Ea,uo,Aa,Kd,cu,Xd,new Ie),face:null,object:this})}copy(e,t){return super.copy(e,t),e.center!==void 0&&this.center.copy(e.center),this.material=e.material,this}};function Ca(i,e,t,n,s,r){xr.subVectors(i,t).addScalar(.5).multiply(n),s!==void 0?(co.x=r*xr.x-s*xr.y,co.y=s*xr.x+r*xr.y):co.copy(xr),i.copy(e),i.x+=co.x,i.y+=co.y,i.applyMatrix4(tp)}var Ti=new L,uu=new L,Ra=new L,Yi=new L,hu=new L,Ia=new L,du=new L,Ps=class{constructor(e=new L,t=new L(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Ti)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);let n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){let t=Ti.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Ti.copy(this.origin).addScaledVector(this.direction,t),Ti.distanceToSquared(e))}distanceSqToSegment(e,t,n,s){uu.copy(e).add(t).multiplyScalar(.5),Ra.copy(t).sub(e).normalize(),Yi.copy(this.origin).sub(uu);let r=e.distanceTo(t)*.5,o=-this.direction.dot(Ra),a=Yi.dot(this.direction),l=-Yi.dot(Ra),c=Yi.lengthSq(),u=Math.abs(1-o*o),h,d,f,g;if(u>0)if(h=o*l-a,d=o*a-l,g=r*u,h>=0)if(d>=-g)if(d<=g){let y=1/u;h*=y,d*=y,f=h*(h+o*d+2*a)+d*(o*h+d+2*l)+c}else d=r,h=Math.max(0,-(o*d+a)),f=-h*h+d*(d+2*l)+c;else d=-r,h=Math.max(0,-(o*d+a)),f=-h*h+d*(d+2*l)+c;else d<=-g?(h=Math.max(0,-(-o*r+a)),d=h>0?-r:Math.min(Math.max(-r,-l),r),f=-h*h+d*(d+2*l)+c):d<=g?(h=0,d=Math.min(Math.max(-r,-l),r),f=d*(d+2*l)+c):(h=Math.max(0,-(o*r+a)),d=h>0?r:Math.min(Math.max(-r,-l),r),f=-h*h+d*(d+2*l)+c);else d=o>0?-r:r,h=Math.max(0,-(o*d+a)),f=-h*h+d*(d+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,h),s&&s.copy(uu).addScaledVector(Ra,d),f}intersectSphere(e,t){Ti.subVectors(e.center,this.origin);let n=Ti.dot(this.direction),s=Ti.dot(Ti)-n*n,r=e.radius*e.radius;if(s>r)return null;let o=Math.sqrt(r-s),a=n-o,l=n+o;return l<0?null:a<0?this.at(l,t):this.at(a,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){let t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){let n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){let t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,s,r,o,a,l,c=1/this.direction.x,u=1/this.direction.y,h=1/this.direction.z,d=this.origin;return c>=0?(n=(e.min.x-d.x)*c,s=(e.max.x-d.x)*c):(n=(e.max.x-d.x)*c,s=(e.min.x-d.x)*c),u>=0?(r=(e.min.y-d.y)*u,o=(e.max.y-d.y)*u):(r=(e.max.y-d.y)*u,o=(e.min.y-d.y)*u),n>o||r>s||((r>n||isNaN(n))&&(n=r),(o<s||isNaN(s))&&(s=o),h>=0?(a=(e.min.z-d.z)*h,l=(e.max.z-d.z)*h):(a=(e.max.z-d.z)*h,l=(e.min.z-d.z)*h),n>l||a>s)||((a>n||n!==n)&&(n=a),(l<s||s!==s)&&(s=l),s<0)?null:this.at(n>=0?n:s,t)}intersectsBox(e){return this.intersectBox(e,Ti)!==null}intersectTriangle(e,t,n,s,r){hu.subVectors(t,e),Ia.subVectors(n,e),du.crossVectors(hu,Ia);let o=this.direction.dot(du),a;if(o>0){if(s)return null;a=1}else if(o<0)a=-1,o=-o;else return null;Yi.subVectors(this.origin,e);let l=a*this.direction.dot(Ia.crossVectors(Yi,Ia));if(l<0)return null;let c=a*this.direction.dot(hu.cross(Yi));if(c<0||l+c>o)return null;let u=-a*Yi.dot(du);return u<0?null:this.at(u/o,r)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},yn=class extends rn{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Pe(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new zn,this.combine=Nu,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}},qd=new ze,ys=new Ps,Pa=new un,Yd=new L,La=new L,Na=new L,Da=new L,fu=new L,Ua=new L,$d=new L,Fa=new L,nt=class extends gt{constructor(e=new Pt,t=new yn){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){let t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){let s=t[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){let a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}getVertexPosition(e,t){let n=this.geometry,s=n.attributes.position,r=n.morphAttributes.position,o=n.morphTargetsRelative;t.fromBufferAttribute(s,e);let a=this.morphTargetInfluences;if(r&&a){Ua.set(0,0,0);for(let l=0,c=r.length;l<c;l++){let u=a[l],h=r[l];u!==0&&(fu.fromBufferAttribute(h,e),o?Ua.addScaledVector(fu,u):Ua.addScaledVector(fu.sub(t),u))}t.add(Ua)}return t}raycast(e,t){let n=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),Pa.copy(n.boundingSphere),Pa.applyMatrix4(r),ys.copy(e.ray).recast(e.near),!(Pa.containsPoint(ys.origin)===!1&&(ys.intersectSphere(Pa,Yd)===null||ys.origin.distanceToSquared(Yd)>(e.far-e.near)**2))&&(qd.copy(r).invert(),ys.copy(e.ray).applyMatrix4(qd),!(n.boundingBox!==null&&ys.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,ys)))}_computeIntersections(e,t,n){let s,r=this.geometry,o=this.material,a=r.index,l=r.attributes.position,c=r.attributes.uv,u=r.attributes.uv1,h=r.attributes.normal,d=r.groups,f=r.drawRange;if(a!==null)if(Array.isArray(o))for(let g=0,y=d.length;g<y;g++){let m=d[g],p=o[m.materialIndex],M=Math.max(m.start,f.start),w=Math.min(a.count,Math.min(m.start+m.count,f.start+f.count));for(let S=M,C=w;S<C;S+=3){let A=a.getX(S),R=a.getX(S+1),v=a.getX(S+2);s=Oa(this,p,e,n,c,u,h,A,R,v),s&&(s.faceIndex=Math.floor(S/3),s.face.materialIndex=m.materialIndex,t.push(s))}}else{let g=Math.max(0,f.start),y=Math.min(a.count,f.start+f.count);for(let m=g,p=y;m<p;m+=3){let M=a.getX(m),w=a.getX(m+1),S=a.getX(m+2);s=Oa(this,o,e,n,c,u,h,M,w,S),s&&(s.faceIndex=Math.floor(m/3),t.push(s))}}else if(l!==void 0)if(Array.isArray(o))for(let g=0,y=d.length;g<y;g++){let m=d[g],p=o[m.materialIndex],M=Math.max(m.start,f.start),w=Math.min(l.count,Math.min(m.start+m.count,f.start+f.count));for(let S=M,C=w;S<C;S+=3){let A=S,R=S+1,v=S+2;s=Oa(this,p,e,n,c,u,h,A,R,v),s&&(s.faceIndex=Math.floor(S/3),s.face.materialIndex=m.materialIndex,t.push(s))}}else{let g=Math.max(0,f.start),y=Math.min(l.count,f.start+f.count);for(let m=g,p=y;m<p;m+=3){let M=m,w=m+1,S=m+2;s=Oa(this,o,e,n,c,u,h,M,w,S),s&&(s.faceIndex=Math.floor(m/3),t.push(s))}}}};function lg(i,e,t,n,s,r,o,a){let l;if(e.side===on?l=n.intersectTriangle(o,r,s,!0,a):l=n.intersectTriangle(s,r,o,e.side===kn,a),l===null)return null;Fa.copy(a),Fa.applyMatrix4(i.matrixWorld);let c=t.ray.origin.distanceTo(Fa);return c<t.near||c>t.far?null:{distance:c,point:Fa.clone(),object:i}}function Oa(i,e,t,n,s,r,o,a,l,c){i.getVertexPosition(a,La),i.getVertexPosition(l,Na),i.getVertexPosition(c,Da);let u=lg(i,e,t,n,La,Na,Da,$d);if(u){let h=new L;Ai.getBarycoord($d,La,Na,Da,h),s&&(u.uv=Ai.getInterpolatedAttribute(s,a,l,c,h,new Ie)),r&&(u.uv1=Ai.getInterpolatedAttribute(r,a,l,c,h,new Ie)),o&&(u.normal=Ai.getInterpolatedAttribute(o,a,l,c,h,new L),u.normal.dot(n.direction)>0&&u.normal.multiplyScalar(-1));let d={a,b:l,c,normal:new L,materialIndex:0};Ai.getNormal(La,Na,Da,d.normal),u.face=d,u.barycoord=h}return u}var Zd=new L,Jd=new pt,jd=new pt,cg=new L,Qd=new ze,Ba=new L,pu=new un,ef=new ze,mu=new Ps,Ao=class extends nt{constructor(e,t){super(e,t),this.isSkinnedMesh=!0,this.type="SkinnedMesh",this.bindMode=vu,this.bindMatrix=new ze,this.bindMatrixInverse=new ze,this.boundingBox=null,this.boundingSphere=null}computeBoundingBox(){let e=this.geometry;this.boundingBox===null&&(this.boundingBox=new Qt),this.boundingBox.makeEmpty();let t=e.getAttribute("position");for(let n=0;n<t.count;n++)this.getVertexPosition(n,Ba),this.boundingBox.expandByPoint(Ba)}computeBoundingSphere(){let e=this.geometry;this.boundingSphere===null&&(this.boundingSphere=new un),this.boundingSphere.makeEmpty();let t=e.getAttribute("position");for(let n=0;n<t.count;n++)this.getVertexPosition(n,Ba),this.boundingSphere.expandByPoint(Ba)}copy(e,t){return super.copy(e,t),this.bindMode=e.bindMode,this.bindMatrix.copy(e.bindMatrix),this.bindMatrixInverse.copy(e.bindMatrixInverse),this.skeleton=e.skeleton,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}raycast(e,t){let n=this.material,s=this.matrixWorld;n!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),pu.copy(this.boundingSphere),pu.applyMatrix4(s),e.ray.intersectsSphere(pu)!==!1&&(ef.copy(s).invert(),mu.copy(e.ray).applyMatrix4(ef),!(this.boundingBox!==null&&mu.intersectsBox(this.boundingBox)===!1)&&this._computeIntersections(e,t,mu)))}getVertexPosition(e,t){return super.getVertexPosition(e,t),this.applyBoneTransform(e,t),t}bind(e,t){this.skeleton=e,t===void 0&&(this.updateMatrixWorld(!0),this.skeleton.calculateInverses(),t=this.matrixWorld),this.bindMatrix.copy(t),this.bindMatrixInverse.copy(t).invert()}pose(){this.skeleton.pose()}normalizeSkinWeights(){let e=new pt,t=this.geometry.attributes.skinWeight;for(let n=0,s=t.count;n<s;n++){e.fromBufferAttribute(t,n);let r=1/e.manhattanLength();r!==1/0?e.multiplyScalar(r):e.set(1,0,0,0),t.setXYZW(n,e.x,e.y,e.z,e.w)}}updateMatrixWorld(e){super.updateMatrixWorld(e),this.bindMode===vu?this.bindMatrixInverse.copy(this.matrixWorld).invert():this.bindMode===kf?this.bindMatrixInverse.copy(this.bindMatrix).invert():Ee("SkinnedMesh: Unrecognized bindMode: "+this.bindMode)}applyBoneTransform(e,t){let n=this.skeleton,s=this.geometry;Jd.fromBufferAttribute(s.attributes.skinIndex,e),jd.fromBufferAttribute(s.attributes.skinWeight,e),Zd.copy(t).applyMatrix4(this.bindMatrix),t.set(0,0,0);for(let r=0;r<4;r++){let o=jd.getComponent(r);if(o!==0){let a=Jd.getComponent(r);Qd.multiplyMatrices(n.bones[a].matrixWorld,n.boneInverses[a]),t.addScaledVector(cg.copy(Zd).applyMatrix4(Qd),o)}}return t.applyMatrix4(this.bindMatrixInverse)}},Ir=class extends gt{constructor(){super(),this.isBone=!0,this.type="Bone"}},Pr=class extends Ut{constructor(e=null,t=1,n=1,s,r,o,a,l,c=wt,u=wt,h,d){super(null,o,a,l,c,u,s,r,h,d),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}},tf=new ze,ug=new ze,Co=class i{constructor(e=[],t=[]){this.uuid=Bn(),this.bones=e.slice(0),this.boneInverses=t,this.boneMatrices=null,this.previousBoneMatrices=null,this.boneTexture=null,this.init()}init(){let e=this.bones,t=this.boneInverses;if(this.boneMatrices=new Float32Array(e.length*16),t.length===0)this.calculateInverses();else if(e.length!==t.length){Ee("Skeleton: Number of inverse bone matrices does not match amount of bones."),this.boneInverses=[];for(let n=0,s=this.bones.length;n<s;n++)this.boneInverses.push(new ze)}}calculateInverses(){this.boneInverses.length=0;for(let e=0,t=this.bones.length;e<t;e++){let n=new ze;this.bones[e]&&n.copy(this.bones[e].matrixWorld).invert(),this.boneInverses.push(n)}}pose(){for(let e=0,t=this.bones.length;e<t;e++){let n=this.bones[e];n&&n.matrixWorld.copy(this.boneInverses[e]).invert()}for(let e=0,t=this.bones.length;e<t;e++){let n=this.bones[e];n&&(n.parent&&n.parent.isBone?(n.matrix.copy(n.parent.matrixWorld).invert(),n.matrix.multiply(n.matrixWorld)):n.matrix.copy(n.matrixWorld),n.matrix.decompose(n.position,n.quaternion,n.scale))}}update(){let e=this.bones,t=this.boneInverses,n=this.boneMatrices,s=this.boneTexture;for(let r=0,o=e.length;r<o;r++){let a=e[r]?e[r].matrixWorld:ug;tf.multiplyMatrices(a,t[r]),tf.toArray(n,r*16)}s!==null&&(s.needsUpdate=!0)}clone(){return new i(this.bones,this.boneInverses)}computeBoneTexture(){let e=Math.sqrt(this.bones.length*4);e=Math.ceil(e/4)*4,e=Math.max(e,4);let t=new Float32Array(e*e*4);t.set(this.boneMatrices);let n=new Pr(t,e,e,Mn,bn);return n.needsUpdate=!0,this.boneMatrices=t,this.boneTexture=n,this}getBoneByName(e){for(let t=0,n=this.bones.length;t<n;t++){let s=this.bones[t];if(s.name===e)return s}}dispose(){this.boneTexture!==null&&(this.boneTexture.dispose(),this.boneTexture=null)}fromJSON(e,t){this.uuid=e.uuid;for(let n=0,s=e.bones.length;n<s;n++){let r=e.bones[n],o=t[r];o===void 0&&(Ee("Skeleton: No bone found with UUID:",r),o=new Ir),this.bones.push(o),this.boneInverses.push(new ze().fromArray(e.boneInverses[n]))}return this.init(),this}toJSON(){let e={metadata:{version:4.7,type:"Skeleton",generator:"Skeleton.toJSON"},bones:[],boneInverses:[]};e.uuid=this.uuid;let t=this.bones,n=this.boneInverses;for(let s=0,r=t.length;s<r;s++){let o=t[s];e.bones.push(o.uuid);let a=n[s];e.boneInverses.push(a.toArray())}return e}},Qi=class extends It{constructor(e,t,n,s=1){super(e,t,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=s}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){let e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}},_r=new ze,nf=new ze,ka=[],sf=new Qt,hg=new ze,ho=new nt,fo=new un,Ro=class extends nt{constructor(e,t,n){super(e,t),this.isInstancedMesh=!0,this.instanceMatrix=new Qi(new Float32Array(n*16),16),this.previousInstanceMatrix=null,this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let s=0;s<n;s++)this.setMatrixAt(s,hg)}computeBoundingBox(){let e=this.geometry,t=this.count;this.boundingBox===null&&(this.boundingBox=new Qt),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,_r),sf.copy(e.boundingBox).applyMatrix4(_r),this.boundingBox.union(sf)}computeBoundingSphere(){let e=this.geometry,t=this.count;this.boundingSphere===null&&(this.boundingSphere=new un),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,_r),fo.copy(e.boundingSphere).applyMatrix4(_r),this.boundingSphere.union(fo)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),e.previousInstanceMatrix!==null&&(this.previousInstanceMatrix=e.previousInstanceMatrix.clone()),e.morphTexture!==null&&(this.morphTexture=e.morphTexture.clone()),e.instanceColor!==null&&(this.instanceColor=e.instanceColor.clone()),this.count=e.count,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}getColorAt(e,t){t.fromArray(this.instanceColor.array,e*3)}getMatrixAt(e,t){t.fromArray(this.instanceMatrix.array,e*16)}getMorphAt(e,t){let n=t.morphTargetInfluences,s=this.morphTexture.source.data.data,r=n.length+1,o=e*r+1;for(let a=0;a<n.length;a++)n[a]=s[o+a]}raycast(e,t){let n=this.matrixWorld,s=this.count;if(ho.geometry=this.geometry,ho.material=this.material,ho.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),fo.copy(this.boundingSphere),fo.applyMatrix4(n),e.ray.intersectsSphere(fo)!==!1))for(let r=0;r<s;r++){this.getMatrixAt(r,_r),nf.multiplyMatrices(n,_r),ho.matrixWorld=nf,ho.raycast(e,ka);for(let o=0,a=ka.length;o<a;o++){let l=ka[o];l.instanceId=r,l.object=this,t.push(l)}ka.length=0}}setColorAt(e,t){this.instanceColor===null&&(this.instanceColor=new Qi(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),t.toArray(this.instanceColor.array,e*3)}setMatrixAt(e,t){t.toArray(this.instanceMatrix.array,e*16)}setMorphAt(e,t){let n=t.morphTargetInfluences,s=n.length+1;this.morphTexture===null&&(this.morphTexture=new Pr(new Float32Array(s*this.count),s,this.count,Pl,bn));let r=this.morphTexture.source.data.data,o=0;for(let c=0;c<n.length;c++)o+=n[c];let a=this.geometry.morphTargetsRelative?1:1-o,l=s*e;r[l]=a,r.set(n,l+1)}updateMorphTargets(){}dispose(){this.dispatchEvent({type:"dispose"}),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}},gu=new L,dg=new L,fg=new He,Qn=class{constructor(e=new L(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,s){return this.normal.set(e,t,n),this.constant=s,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){let s=gu.subVectors(n,t).cross(dg.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(s,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){let e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){let n=e.delta(gu),s=this.normal.dot(n);if(s===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;let r=-(e.start.dot(this.normal)+this.constant)/s;return r<0||r>1?null:t.copy(e.start).addScaledVector(n,r)}intersectsLine(e){let t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){let n=t||fg.getNormalMatrix(e),s=this.coplanarPoint(gu).applyMatrix4(e),r=this.normal.applyMatrix3(n).normalize();return this.constant=-s.dot(r),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}},vs=new un,pg=new Ie(.5,.5),za=new L,Lr=class{constructor(e=new Qn,t=new Qn,n=new Qn,s=new Qn,r=new Qn,o=new Qn){this.planes=[e,t,n,s,r,o]}set(e,t,n,s,r,o){let a=this.planes;return a[0].copy(e),a[1].copy(t),a[2].copy(n),a[3].copy(s),a[4].copy(r),a[5].copy(o),this}copy(e){let t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=On,n=!1){let s=this.planes,r=e.elements,o=r[0],a=r[1],l=r[2],c=r[3],u=r[4],h=r[5],d=r[6],f=r[7],g=r[8],y=r[9],m=r[10],p=r[11],M=r[12],w=r[13],S=r[14],C=r[15];if(s[0].setComponents(c-o,f-u,p-g,C-M).normalize(),s[1].setComponents(c+o,f+u,p+g,C+M).normalize(),s[2].setComponents(c+a,f+h,p+y,C+w).normalize(),s[3].setComponents(c-a,f-h,p-y,C-w).normalize(),n)s[4].setComponents(l,d,m,S).normalize(),s[5].setComponents(c-l,f-d,p-m,C-S).normalize();else if(s[4].setComponents(c-l,f-d,p-m,C-S).normalize(),t===On)s[5].setComponents(c+l,f+d,p+m,C+S).normalize();else if(t===wr)s[5].setComponents(l,d,m,S).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),vs.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{let t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),vs.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(vs)}intersectsSprite(e){vs.center.set(0,0,0);let t=pg.distanceTo(e.center);return vs.radius=.7071067811865476+t,vs.applyMatrix4(e.matrixWorld),this.intersectsSphere(vs)}intersectsSphere(e){let t=this.planes,n=e.center,s=-e.radius;for(let r=0;r<6;r++)if(t[r].distanceToPoint(n)<s)return!1;return!0}intersectsBox(e){let t=this.planes;for(let n=0;n<6;n++){let s=t[n];if(za.x=s.normal.x>0?e.max.x:e.min.x,za.y=s.normal.y>0?e.max.y:e.min.y,za.z=s.normal.z>0?e.max.z:e.min.z,s.distanceToPoint(za)<0)return!1}return!0}containsPoint(e){let t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}};var Nr=class extends rn{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new Pe(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}},ll=new L,cl=new L,rf=new ze,po=new Ps,Ha=new un,xu=new L,of=new L,Ls=class extends gt{constructor(e=new Pt,t=new Nr){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,n=[0];for(let s=1,r=t.count;s<r;s++)ll.fromBufferAttribute(t,s-1),cl.fromBufferAttribute(t,s),n[s]=n[s-1],n[s]+=ll.distanceTo(cl);e.setAttribute("lineDistance",new ht(n,1))}else Ee("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){let n=this.geometry,s=this.matrixWorld,r=e.params.Line.threshold,o=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Ha.copy(n.boundingSphere),Ha.applyMatrix4(s),Ha.radius+=r,e.ray.intersectsSphere(Ha)===!1)return;rf.copy(s).invert(),po.copy(e.ray).applyMatrix4(rf);let a=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=this.isLineSegments?2:1,u=n.index,d=n.attributes.position;if(u!==null){let f=Math.max(0,o.start),g=Math.min(u.count,o.start+o.count);for(let y=f,m=g-1;y<m;y+=c){let p=u.getX(y),M=u.getX(y+1),w=Va(this,e,po,l,p,M,y);w&&t.push(w)}if(this.isLineLoop){let y=u.getX(g-1),m=u.getX(f),p=Va(this,e,po,l,y,m,g-1);p&&t.push(p)}}else{let f=Math.max(0,o.start),g=Math.min(d.count,o.start+o.count);for(let y=f,m=g-1;y<m;y+=c){let p=Va(this,e,po,l,y,y+1,y);p&&t.push(p)}if(this.isLineLoop){let y=Va(this,e,po,l,g-1,f,g-1);y&&t.push(y)}}}updateMorphTargets(){let t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){let s=t[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){let a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}};function Va(i,e,t,n,s,r,o){let a=i.geometry.attributes.position;if(ll.fromBufferAttribute(a,s),cl.fromBufferAttribute(a,r),t.distanceSqToSegment(ll,cl,xu,of)>n)return;xu.applyMatrix4(i.matrixWorld);let c=e.ray.origin.distanceTo(xu);if(!(c<e.near||c>e.far))return{distance:c,point:of.clone().applyMatrix4(i.matrixWorld),index:o,face:null,faceIndex:null,barycoord:null,object:i}}var af=new L,lf=new L,Io=class extends Ls{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,n=[];for(let s=0,r=t.count;s<r;s+=2)af.fromBufferAttribute(t,s),lf.fromBufferAttribute(t,s+1),n[s]=s===0?0:n[s-1],n[s+1]=n[s]+af.distanceTo(lf);e.setAttribute("lineDistance",new ht(n,1))}else Ee("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}},Po=class extends Ls{constructor(e,t){super(e,t),this.isLineLoop=!0,this.type="LineLoop"}},Dr=class extends rn{constructor(e){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new Pe(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}},cf=new ze,Su=new Ps,Ga=new un,Wa=new L,Lo=class extends gt{constructor(e=new Pt,t=new Dr){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,t){let n=this.geometry,s=this.matrixWorld,r=e.params.Points.threshold,o=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Ga.copy(n.boundingSphere),Ga.applyMatrix4(s),Ga.radius+=r,e.ray.intersectsSphere(Ga)===!1)return;cf.copy(s).invert(),Su.copy(e.ray).applyMatrix4(cf);let a=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=n.index,h=n.attributes.position;if(c!==null){let d=Math.max(0,o.start),f=Math.min(c.count,o.start+o.count);for(let g=d,y=f;g<y;g++){let m=c.getX(g);Wa.fromBufferAttribute(h,m),uf(Wa,m,l,s,e,t,this)}}else{let d=Math.max(0,o.start),f=Math.min(h.count,o.start+o.count);for(let g=d,y=f;g<y;g++)Wa.fromBufferAttribute(h,g),uf(Wa,g,l,s,e,t,this)}}updateMorphTargets(){let t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){let s=t[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){let a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}};function uf(i,e,t,n,s,r,o){let a=Su.distanceSqToPoint(i);if(a<t){let l=new L;Su.closestPointToPoint(i,l),l.applyMatrix4(n);let c=s.ray.origin.distanceTo(l);if(c<s.near||c>s.far)return;r.push({distance:c,distanceToRay:Math.sqrt(a),point:l,index:e,face:null,faceIndex:null,barycoord:null,object:o})}}var No=class extends Ut{constructor(e=[],t=ns,n,s,r,o,a,l,c,u){super(e,t,n,s,r,o,a,l,c,u),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}},Ur=class extends Ut{constructor(e,t,n,s,r,o,a,l,c){super(e,t,n,s,r,o,a,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}},es=class extends Ut{constructor(e,t,n=Gn,s,r,o,a=wt,l=wt,c,u=ti,h=1){if(u!==ti&&u!==is)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let d={width:e,height:t,depth:h};super(d,s,r,o,a,l,u,n,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new Ar(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){let t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}},ul=class extends es{constructor(e,t=Gn,n=ns,s,r,o=wt,a=wt,l,c=ti){let u={width:e,height:e,depth:1},h=[u,u,u,u,u,u];super(e,e,t,n,s,r,o,a,l,c),this.image=h,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}},Do=class extends Ut{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}},ii=class i extends Pt{constructor(e=1,t=1,n=1,s=1,r=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:s,heightSegments:r,depthSegments:o};let a=this;s=Math.floor(s),r=Math.floor(r),o=Math.floor(o);let l=[],c=[],u=[],h=[],d=0,f=0;g("z","y","x",-1,-1,n,t,e,o,r,0),g("z","y","x",1,-1,n,t,-e,o,r,1),g("x","z","y",1,1,e,n,t,s,o,2),g("x","z","y",1,-1,e,n,-t,s,o,3),g("x","y","z",1,-1,e,t,n,s,r,4),g("x","y","z",-1,-1,e,t,-n,s,r,5),this.setIndex(l),this.setAttribute("position",new ht(c,3)),this.setAttribute("normal",new ht(u,3)),this.setAttribute("uv",new ht(h,2));function g(y,m,p,M,w,S,C,A,R,v,T){let K=S/R,I=C/v,F=S/2,O=C/2,V=A/2,G=R+1,k=v+1,H=0,ne=0,j=new L;for(let de=0;de<k;de++){let xe=de*I-O;for(let pe=0;pe<G;pe++){let Ge=pe*K-F;j[y]=Ge*M,j[m]=xe*w,j[p]=V,c.push(j.x,j.y,j.z),j[y]=0,j[m]=0,j[p]=A>0?1:-1,u.push(j.x,j.y,j.z),h.push(pe/R),h.push(1-de/v),H+=1}}for(let de=0;de<v;de++)for(let xe=0;xe<R;xe++){let pe=d+xe+G*de,Ge=d+xe+G*(de+1),xt=d+(xe+1)+G*(de+1),mt=d+(xe+1)+G*de;l.push(pe,Ge,mt),l.push(Ge,xt,mt),ne+=6}a.addGroup(f,ne,T),f+=ne,d+=H}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}};var Fr=class i extends Pt{constructor(e=1,t=32,n=0,s=Math.PI*2){super(),this.type="CircleGeometry",this.parameters={radius:e,segments:t,thetaStart:n,thetaLength:s},t=Math.max(3,t);let r=[],o=[],a=[],l=[],c=new L,u=new Ie;o.push(0,0,0),a.push(0,0,1),l.push(.5,.5);for(let h=0,d=3;h<=t;h++,d+=3){let f=n+h/t*s;c.x=e*Math.cos(f),c.y=e*Math.sin(f),o.push(c.x,c.y,c.z),a.push(0,0,1),u.x=(o[d]/e+1)/2,u.y=(o[d+1]/e+1)/2,l.push(u.x,u.y)}for(let h=1;h<=t;h++)r.push(h,h+1,0);this.setIndex(r),this.setAttribute("position",new ht(o,3)),this.setAttribute("normal",new ht(a,3)),this.setAttribute("uv",new ht(l,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.radius,e.segments,e.thetaStart,e.thetaLength)}},Uo=class i extends Pt{constructor(e=1,t=1,n=1,s=32,r=1,o=!1,a=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:n,radialSegments:s,heightSegments:r,openEnded:o,thetaStart:a,thetaLength:l};let c=this;s=Math.floor(s),r=Math.floor(r);let u=[],h=[],d=[],f=[],g=0,y=[],m=n/2,p=0;M(),o===!1&&(e>0&&w(!0),t>0&&w(!1)),this.setIndex(u),this.setAttribute("position",new ht(h,3)),this.setAttribute("normal",new ht(d,3)),this.setAttribute("uv",new ht(f,2));function M(){let S=new L,C=new L,A=0,R=(t-e)/n;for(let v=0;v<=r;v++){let T=[],K=v/r,I=K*(t-e)+e;for(let F=0;F<=s;F++){let O=F/s,V=O*l+a,G=Math.sin(V),k=Math.cos(V);C.x=I*G,C.y=-K*n+m,C.z=I*k,h.push(C.x,C.y,C.z),S.set(G,R,k).normalize(),d.push(S.x,S.y,S.z),f.push(O,1-K),T.push(g++)}y.push(T)}for(let v=0;v<s;v++)for(let T=0;T<r;T++){let K=y[T][v],I=y[T+1][v],F=y[T+1][v+1],O=y[T][v+1];(e>0||T!==0)&&(u.push(K,I,O),A+=3),(t>0||T!==r-1)&&(u.push(I,F,O),A+=3)}c.addGroup(p,A,0),p+=A}function w(S){let C=g,A=new Ie,R=new L,v=0,T=S===!0?e:t,K=S===!0?1:-1;for(let F=1;F<=s;F++)h.push(0,m*K,0),d.push(0,K,0),f.push(.5,.5),g++;let I=g;for(let F=0;F<=s;F++){let V=F/s*l+a,G=Math.cos(V),k=Math.sin(V);R.x=T*k,R.y=m*K,R.z=T*G,h.push(R.x,R.y,R.z),d.push(0,K,0),A.x=G*.5+.5,A.y=k*.5*K+.5,f.push(A.x,A.y),g++}for(let F=0;F<s;F++){let O=C+F,V=I+F;S===!0?u.push(V,V+1,O):u.push(V+1,V,O),v+=3}c.addGroup(p,v,S===!0?1:2),p+=v}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}};var Ri=class i extends Pt{constructor(e=1,t=1,n=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:s};let r=e/2,o=t/2,a=Math.floor(n),l=Math.floor(s),c=a+1,u=l+1,h=e/a,d=t/l,f=[],g=[],y=[],m=[];for(let p=0;p<u;p++){let M=p*d-o;for(let w=0;w<c;w++){let S=w*h-r;g.push(S,-M,0),y.push(0,0,1),m.push(w/a),m.push(1-p/l)}}for(let p=0;p<l;p++)for(let M=0;M<a;M++){let w=M+c*p,S=M+c*(p+1),C=M+1+c*(p+1),A=M+1+c*p;f.push(w,S,A),f.push(S,C,A)}this.setIndex(f),this.setAttribute("position",new ht(g,3)),this.setAttribute("normal",new ht(y,3)),this.setAttribute("uv",new ht(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.width,e.height,e.widthSegments,e.heightSegments)}},Fo=class i extends Pt{constructor(e=.5,t=1,n=32,s=1,r=0,o=Math.PI*2){super(),this.type="RingGeometry",this.parameters={innerRadius:e,outerRadius:t,thetaSegments:n,phiSegments:s,thetaStart:r,thetaLength:o},n=Math.max(3,n),s=Math.max(1,s);let a=[],l=[],c=[],u=[],h=e,d=(t-e)/s,f=new L,g=new Ie;for(let y=0;y<=s;y++){for(let m=0;m<=n;m++){let p=r+m/n*o;f.x=h*Math.cos(p),f.y=h*Math.sin(p),l.push(f.x,f.y,f.z),c.push(0,0,1),g.x=(f.x/t+1)/2,g.y=(f.y/t+1)/2,u.push(g.x,g.y)}h+=d}for(let y=0;y<s;y++){let m=y*(n+1);for(let p=0;p<n;p++){let M=p+m,w=M,S=M+n+1,C=M+n+2,A=M+1;a.push(w,S,A),a.push(S,C,A)}}this.setIndex(a),this.setAttribute("position",new ht(l,3)),this.setAttribute("normal",new ht(c,3)),this.setAttribute("uv",new ht(u,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.innerRadius,e.outerRadius,e.thetaSegments,e.phiSegments,e.thetaStart,e.thetaLength)}};var Or=class i extends Pt{constructor(e=1,t=.4,n=12,s=48,r=Math.PI*2,o=0,a=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:e,tube:t,radialSegments:n,tubularSegments:s,arc:r,thetaStart:o,thetaLength:a},n=Math.floor(n),s=Math.floor(s);let l=[],c=[],u=[],h=[],d=new L,f=new L,g=new L;for(let y=0;y<=n;y++){let m=o+y/n*a;for(let p=0;p<=s;p++){let M=p/s*r;f.x=(e+t*Math.cos(m))*Math.cos(M),f.y=(e+t*Math.cos(m))*Math.sin(M),f.z=t*Math.sin(m),c.push(f.x,f.y,f.z),d.x=e*Math.cos(M),d.y=e*Math.sin(M),g.subVectors(f,d).normalize(),u.push(g.x,g.y,g.z),h.push(p/s),h.push(y/n)}}for(let y=1;y<=n;y++)for(let m=1;m<=s;m++){let p=(s+1)*y+m-1,M=(s+1)*(y-1)+m-1,w=(s+1)*(y-1)+m,S=(s+1)*y+m;l.push(p,M,S),l.push(M,w,S)}this.setIndex(l),this.setAttribute("position",new ht(c,3)),this.setAttribute("normal",new ht(u,3)),this.setAttribute("uv",new ht(h,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.radius,e.tube,e.radialSegments,e.tubularSegments,e.arc)}};function ks(i){let e={};for(let t in i){e[t]={};for(let n in i[t]){let s=i[t][n];s&&(s.isColor||s.isMatrix3||s.isMatrix4||s.isVector2||s.isVector3||s.isVector4||s.isTexture||s.isQuaternion)?s.isRenderTargetTexture?(Ee("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=s.clone():Array.isArray(s)?e[t][n]=s.slice():e[t][n]=s}}return e}function en(i){let e={};for(let t=0;t<i.length;t++){let n=ks(i[t]);for(let s in n)e[s]=n[s]}return e}function mg(i){let e=[];for(let t=0;t<i.length;t++)e.push(i[t].clone());return e}function Ju(i){let e=i.getRenderTarget();return e===null?i.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:$e.workingColorSpace}var np={clone:ks,merge:en},gg=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,xg=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,vn=class extends rn{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=gg,this.fragmentShader=xg,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=ks(e.uniforms),this.uniformsGroups=mg(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){let t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(let s in this.uniforms){let o=this.uniforms[s].value;o&&o.isTexture?t.uniforms[s]={type:"t",value:o.toJSON(e).uuid}:o&&o.isColor?t.uniforms[s]={type:"c",value:o.getHex()}:o&&o.isVector2?t.uniforms[s]={type:"v2",value:o.toArray()}:o&&o.isVector3?t.uniforms[s]={type:"v3",value:o.toArray()}:o&&o.isVector4?t.uniforms[s]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?t.uniforms[s]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?t.uniforms[s]={type:"m4",value:o.toArray()}:t.uniforms[s]={value:o}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;let n={};for(let s in this.extensions)this.extensions[s]===!0&&(n[s]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}},hl=class extends vn{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}},Wt=class extends rn{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new Pe(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Pe(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Yu,this.normalScale=new Ie(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new zn,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}},hn=class extends Wt{constructor(e){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new Ie(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return Ze(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(t){this.ior=(1+.4*t)/(1-.4*t)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new Pe(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new Pe(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new Pe(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._sheen=0,this._transmission=0,this.setValues(e)}get anisotropy(){return this._anisotropy}set anisotropy(e){this._anisotropy>0!=e>0&&this.version++,this._anisotropy=e}get clearcoat(){return this._clearcoat}set clearcoat(e){this._clearcoat>0!=e>0&&this.version++,this._clearcoat=e}get iridescence(){return this._iridescence}set iridescence(e){this._iridescence>0!=e>0&&this.version++,this._iridescence=e}get dispersion(){return this._dispersion}set dispersion(e){this._dispersion>0!=e>0&&this.version++,this._dispersion=e}get sheen(){return this._sheen}set sheen(e){this._sheen>0!=e>0&&this.version++,this._sheen=e}get transmission(){return this._transmission}set transmission(e){this._transmission>0!=e>0&&this.version++,this._transmission=e}copy(e){return super.copy(e),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=e.anisotropy,this.anisotropyRotation=e.anisotropyRotation,this.anisotropyMap=e.anisotropyMap,this.clearcoat=e.clearcoat,this.clearcoatMap=e.clearcoatMap,this.clearcoatRoughness=e.clearcoatRoughness,this.clearcoatRoughnessMap=e.clearcoatRoughnessMap,this.clearcoatNormalMap=e.clearcoatNormalMap,this.clearcoatNormalScale.copy(e.clearcoatNormalScale),this.dispersion=e.dispersion,this.ior=e.ior,this.iridescence=e.iridescence,this.iridescenceMap=e.iridescenceMap,this.iridescenceIOR=e.iridescenceIOR,this.iridescenceThicknessRange=[...e.iridescenceThicknessRange],this.iridescenceThicknessMap=e.iridescenceThicknessMap,this.sheen=e.sheen,this.sheenColor.copy(e.sheenColor),this.sheenColorMap=e.sheenColorMap,this.sheenRoughness=e.sheenRoughness,this.sheenRoughnessMap=e.sheenRoughnessMap,this.transmission=e.transmission,this.transmissionMap=e.transmissionMap,this.thickness=e.thickness,this.thicknessMap=e.thicknessMap,this.attenuationDistance=e.attenuationDistance,this.attenuationColor.copy(e.attenuationColor),this.specularIntensity=e.specularIntensity,this.specularIntensityMap=e.specularIntensityMap,this.specularColor.copy(e.specularColor),this.specularColorMap=e.specularColorMap,this}};var dl=class extends rn{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Vf,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}},fl=class extends rn{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}};function Ka(i,e){return!i||i.constructor===e?i:typeof e.BYTES_PER_ELEMENT=="number"?new e(i):Array.prototype.slice.call(i)}function _g(i){function e(s,r){return i[s]-i[r]}let t=i.length,n=new Array(t);for(let s=0;s!==t;++s)n[s]=s;return n.sort(e),n}function hf(i,e,t){let n=i.length,s=new i.constructor(n);for(let r=0,o=0;o!==n;++r){let a=t[r]*e;for(let l=0;l!==e;++l)s[o++]=i[a+l]}return s}function ip(i,e,t,n){let s=1,r=i[0];for(;r!==void 0&&r[n]===void 0;)r=i[s++];if(r===void 0)return;let o=r[n];if(o!==void 0)if(Array.isArray(o))do o=r[n],o!==void 0&&(e.push(r.time),t.push(...o)),r=i[s++];while(r!==void 0);else if(o.toArray!==void 0)do o=r[n],o!==void 0&&(e.push(r.time),o.toArray(t,t.length)),r=i[s++];while(r!==void 0);else do o=r[n],o!==void 0&&(e.push(r.time),t.push(o)),r=i[s++];while(r!==void 0)}var si=class{constructor(e,t,n,s){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=s!==void 0?s:new t.constructor(n),this.sampleValues=t,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(e){let t=this.parameterPositions,n=this._cachedIndex,s=t[n],r=t[n-1];e:{t:{let o;n:{i:if(!(e<s)){for(let a=n+2;;){if(s===void 0){if(e<r)break i;return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===a)break;if(r=s,s=t[++n],e<s)break t}o=t.length;break n}if(!(e>=r)){let a=t[1];e<a&&(n=2,r=a);for(let l=n-2;;){if(r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===l)break;if(s=r,r=t[--n-1],e>=r)break t}o=n,n=0;break n}break e}for(;n<o;){let a=n+o>>>1;e<t[a]?o=a:n=a+1}if(s=t[n],r=t[n-1],r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(s===void 0)return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,r,s)}return this.interpolate_(n,r,e,s)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){let t=this.resultBuffer,n=this.sampleValues,s=this.valueSize,r=e*s;for(let o=0;o!==s;++o)t[o]=n[r+o];return t}interpolate_(){throw new Error("call to abstract method")}intervalChanged_(){}},pl=class extends si{constructor(e,t,n,s){super(e,t,n,s),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:Ms,endingEnd:Ms}}intervalChanged_(e,t,n){let s=this.parameterPositions,r=e-2,o=e+1,a=s[r],l=s[o];if(a===void 0)switch(this.getSettings_().endingStart){case Ss:r=e,a=2*t-n;break;case xo:r=s.length-2,a=t+s[r]-s[r+1];break;default:r=e,a=n}if(l===void 0)switch(this.getSettings_().endingEnd){case Ss:o=e,l=2*n-t;break;case xo:o=1,l=n+s[1]-s[0];break;default:o=e-1,l=t}let c=(n-t)*.5,u=this.valueSize;this._weightPrev=c/(t-a),this._weightNext=c/(l-n),this._offsetPrev=r*u,this._offsetNext=o*u}interpolate_(e,t,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=e*a,c=l-a,u=this._offsetPrev,h=this._offsetNext,d=this._weightPrev,f=this._weightNext,g=(n-t)/(s-t),y=g*g,m=y*g,p=-d*m+2*d*y-d*g,M=(1+d)*m+(-1.5-2*d)*y+(-.5+d)*g+1,w=(-1-f)*m+(1.5+f)*y+.5*g,S=f*m-f*y;for(let C=0;C!==a;++C)r[C]=p*o[u+C]+M*o[c+C]+w*o[l+C]+S*o[h+C];return r}},Oo=class extends si{constructor(e,t,n,s){super(e,t,n,s)}interpolate_(e,t,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=e*a,c=l-a,u=(n-t)/(s-t),h=1-u;for(let d=0;d!==a;++d)r[d]=o[c+d]*h+o[l+d]*u;return r}},ml=class extends si{constructor(e,t,n,s){super(e,t,n,s)}interpolate_(e){return this.copySampleValue_(e-1)}},gl=class extends si{interpolate_(e,t,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=e*a,c=l-a,u=this.settings||this.DefaultSettings_,h=u.inTangents,d=u.outTangents;if(!h||!d){let y=(n-t)/(s-t),m=1-y;for(let p=0;p!==a;++p)r[p]=o[c+p]*m+o[l+p]*y;return r}let f=a*2,g=e-1;for(let y=0;y!==a;++y){let m=o[c+y],p=o[l+y],M=g*f+y*2,w=d[M],S=d[M+1],C=e*f+y*2,A=h[C],R=h[C+1],v=(n-t)/(s-t),T,K,I,F,O;for(let V=0;V<8;V++){T=v*v,K=T*v,I=1-v,F=I*I,O=F*I;let k=O*t+3*F*v*w+3*I*T*A+K*s-n;if(Math.abs(k)<1e-10)break;let H=3*F*(w-t)+6*I*v*(A-w)+3*T*(s-A);if(Math.abs(H)<1e-10)break;v=v-k/H,v=Math.max(0,Math.min(1,v))}r[y]=O*m+3*F*v*S+3*I*T*R+K*p}return r}},dn=class{constructor(e,t,n,s){if(e===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(t===void 0||t.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+e);this.name=e,this.times=Ka(t,this.TimeBufferType),this.values=Ka(n,this.ValueBufferType),this.setInterpolation(s||this.DefaultInterpolation)}static toJSON(e){let t=e.constructor,n;if(t.toJSON!==this.toJSON)n=t.toJSON(e);else{n={name:e.name,times:Ka(e.times,Array),values:Ka(e.values,Array)};let s=e.getInterpolation();s!==e.DefaultInterpolation&&(n.interpolation=s)}return n.type=e.ValueTypeName,n}InterpolantFactoryMethodDiscrete(e){return new ml(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new Oo(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new pl(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodBezier(e){let t=new gl(this.times,this.values,this.getValueSize(),e);return this.settings&&(t.settings=this.settings),t}setInterpolation(e){let t;switch(e){case Es:t=this.InterpolantFactoryMethodDiscrete;break;case As:t=this.InterpolantFactoryMethodLinear;break;case Ya:t=this.InterpolantFactoryMethodSmooth;break;case bu:t=this.InterpolantFactoryMethodBezier;break}if(t===void 0){let n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return Ee("KeyframeTrack:",n),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return Es;case this.InterpolantFactoryMethodLinear:return As;case this.InterpolantFactoryMethodSmooth:return Ya;case this.InterpolantFactoryMethodBezier:return bu}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){let t=this.times;for(let n=0,s=t.length;n!==s;++n)t[n]+=e}return this}scale(e){if(e!==1){let t=this.times;for(let n=0,s=t.length;n!==s;++n)t[n]*=e}return this}trim(e,t){let n=this.times,s=n.length,r=0,o=s-1;for(;r!==s&&n[r]<e;)++r;for(;o!==-1&&n[o]>t;)--o;if(++o,r!==0||o!==s){r>=o&&(o=Math.max(o,1),r=o-1);let a=this.getValueSize();this.times=n.slice(r,o),this.values=this.values.slice(r*a,o*a)}return this}validate(){let e=!0,t=this.getValueSize();t-Math.floor(t)!==0&&(Ne("KeyframeTrack: Invalid value size in track.",this),e=!1);let n=this.times,s=this.values,r=n.length;r===0&&(Ne("KeyframeTrack: Track is empty.",this),e=!1);let o=null;for(let a=0;a!==r;a++){let l=n[a];if(typeof l=="number"&&isNaN(l)){Ne("KeyframeTrack: Time is not a valid number.",this,a,l),e=!1;break}if(o!==null&&o>l){Ne("KeyframeTrack: Out of order keys.",this,a,l,o),e=!1;break}o=l}if(s!==void 0&&Pm(s))for(let a=0,l=s.length;a!==l;++a){let c=s[a];if(isNaN(c)){Ne("KeyframeTrack: Value is not a valid number.",this,a,c),e=!1;break}}return e}optimize(){let e=this.times.slice(),t=this.values.slice(),n=this.getValueSize(),s=this.getInterpolation()===Ya,r=e.length-1,o=1;for(let a=1;a<r;++a){let l=!1,c=e[a],u=e[a+1];if(c!==u&&(a!==1||c!==e[0]))if(s)l=!0;else{let h=a*n,d=h-n,f=h+n;for(let g=0;g!==n;++g){let y=t[h+g];if(y!==t[d+g]||y!==t[f+g]){l=!0;break}}}if(l){if(a!==o){e[o]=e[a];let h=a*n,d=o*n;for(let f=0;f!==n;++f)t[d+f]=t[h+f]}++o}}if(r>0){e[o]=e[r];for(let a=r*n,l=o*n,c=0;c!==n;++c)t[l+c]=t[a+c];++o}return o!==e.length?(this.times=e.slice(0,o),this.values=t.slice(0,o*n)):(this.times=e,this.values=t),this}clone(){let e=this.times.slice(),t=this.values.slice(),n=this.constructor,s=new n(this.name,e,t);return s.createInterpolant=this.createInterpolant,s}};dn.prototype.ValueTypeName="";dn.prototype.TimeBufferType=Float32Array;dn.prototype.ValueBufferType=Float32Array;dn.prototype.DefaultInterpolation=As;var Ii=class extends dn{constructor(e,t,n){super(e,t,n)}};Ii.prototype.ValueTypeName="bool";Ii.prototype.ValueBufferType=Array;Ii.prototype.DefaultInterpolation=Es;Ii.prototype.InterpolantFactoryMethodLinear=void 0;Ii.prototype.InterpolantFactoryMethodSmooth=void 0;var Bo=class extends dn{constructor(e,t,n,s){super(e,t,n,s)}};Bo.prototype.ValueTypeName="color";var ri=class extends dn{constructor(e,t,n,s){super(e,t,n,s)}};ri.prototype.ValueTypeName="number";var xl=class extends si{constructor(e,t,n,s){super(e,t,n,s)}interpolate_(e,t,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=(n-t)/(s-t),c=e*a;for(let u=c+a;c!==u;c+=4)jt.slerpFlat(r,0,o,c-a,o,c,l);return r}},oi=class extends dn{constructor(e,t,n,s){super(e,t,n,s)}InterpolantFactoryMethodLinear(e){return new xl(this.times,this.values,this.getValueSize(),e)}};oi.prototype.ValueTypeName="quaternion";oi.prototype.InterpolantFactoryMethodSmooth=void 0;var Pi=class extends dn{constructor(e,t,n){super(e,t,n)}};Pi.prototype.ValueTypeName="string";Pi.prototype.ValueBufferType=Array;Pi.prototype.DefaultInterpolation=Es;Pi.prototype.InterpolantFactoryMethodLinear=void 0;Pi.prototype.InterpolantFactoryMethodSmooth=void 0;var ai=class extends dn{constructor(e,t,n,s){super(e,t,n,s)}};ai.prototype.ValueTypeName="vector";var Ns=class{constructor(e="",t=-1,n=[],s=mc){this.name=e,this.tracks=n,this.duration=t,this.blendMode=s,this.uuid=Bn(),this.userData={},this.duration<0&&this.resetDuration()}static parse(e){let t=[],n=e.tracks,s=1/(e.fps||1);for(let o=0,a=n.length;o!==a;++o)t.push(vg(n[o]).scale(s));let r=new this(e.name,e.duration,t,e.blendMode);return r.uuid=e.uuid,r.userData=JSON.parse(e.userData||"{}"),r}static toJSON(e){let t=[],n=e.tracks,s={name:e.name,duration:e.duration,tracks:t,uuid:e.uuid,blendMode:e.blendMode,userData:JSON.stringify(e.userData)};for(let r=0,o=n.length;r!==o;++r)t.push(dn.toJSON(n[r]));return s}static CreateFromMorphTargetSequence(e,t,n,s){let r=t.length,o=[];for(let a=0;a<r;a++){let l=[],c=[];l.push((a+r-1)%r,a,(a+1)%r),c.push(0,1,0);let u=_g(l);l=hf(l,1,u),c=hf(c,1,u),!s&&l[0]===0&&(l.push(r),c.push(c[0])),o.push(new ri(".morphTargetInfluences["+t[a].name+"]",l,c).scale(1/n))}return new this(e,-1,o)}static findByName(e,t){let n=e;if(!Array.isArray(e)){let s=e;n=s.geometry&&s.geometry.animations||s.animations}for(let s=0;s<n.length;s++)if(n[s].name===t)return n[s];return null}static CreateClipsFromMorphTargetSequences(e,t,n){let s={},r=/^([\w-]*?)([\d]+)$/;for(let a=0,l=e.length;a<l;a++){let c=e[a],u=c.name.match(r);if(u&&u.length>1){let h=u[1],d=s[h];d||(s[h]=d=[]),d.push(c)}}let o=[];for(let a in s)o.push(this.CreateFromMorphTargetSequence(a,s[a],t,n));return o}static parseAnimation(e,t){if(Ee("AnimationClip: parseAnimation() is deprecated and will be removed with r185"),!e)return Ne("AnimationClip: No animation in JSONLoader data."),null;let n=function(h,d,f,g,y){if(f.length!==0){let m=[],p=[];ip(f,m,p,g),m.length!==0&&y.push(new h(d,m,p))}},s=[],r=e.name||"default",o=e.fps||30,a=e.blendMode,l=e.length||-1,c=e.hierarchy||[];for(let h=0;h<c.length;h++){let d=c[h].keys;if(!(!d||d.length===0))if(d[0].morphTargets){let f={},g;for(g=0;g<d.length;g++)if(d[g].morphTargets)for(let y=0;y<d[g].morphTargets.length;y++)f[d[g].morphTargets[y]]=-1;for(let y in f){let m=[],p=[];for(let M=0;M!==d[g].morphTargets.length;++M){let w=d[g];m.push(w.time),p.push(w.morphTarget===y?1:0)}s.push(new ri(".morphTargetInfluence["+y+"]",m,p))}l=f.length*o}else{let f=".bones["+t[h].name+"]";n(ai,f+".position",d,"pos",s),n(oi,f+".quaternion",d,"rot",s),n(ai,f+".scale",d,"scl",s)}}return s.length===0?null:new this(r,l,s,a)}resetDuration(){let e=this.tracks,t=0;for(let n=0,s=e.length;n!==s;++n){let r=this.tracks[n];t=Math.max(t,r.times[r.times.length-1])}return this.duration=t,this}trim(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].trim(0,this.duration);return this}validate(){let e=!0;for(let t=0;t<this.tracks.length;t++)e=e&&this.tracks[t].validate();return e}optimize(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].optimize();return this}clone(){let e=[];for(let n=0;n<this.tracks.length;n++)e.push(this.tracks[n].clone());let t=new this.constructor(this.name,this.duration,e,this.blendMode);return t.userData=JSON.parse(JSON.stringify(this.userData)),t}toJSON(){return this.constructor.toJSON(this)}};function yg(i){switch(i.toLowerCase()){case"scalar":case"double":case"float":case"number":case"integer":return ri;case"vector":case"vector2":case"vector3":case"vector4":return ai;case"color":return Bo;case"quaternion":return oi;case"bool":case"boolean":return Ii;case"string":return Pi}throw new Error("THREE.KeyframeTrack: Unsupported typeName: "+i)}function vg(i){if(i.type===void 0)throw new Error("THREE.KeyframeTrack: track type undefined, can not parse");let e=yg(i.type);if(i.times===void 0){let t=[],n=[];ip(i.keys,t,n,"value"),i.times=t,i.values=n}return e.parse!==void 0?e.parse(i):new e(i.name,i.times,i.values,i.interpolation)}var ei={enabled:!1,files:{},add:function(i,e){this.enabled!==!1&&(df(i)||(this.files[i]=e))},get:function(i){if(this.enabled!==!1&&!df(i))return this.files[i]},remove:function(i){delete this.files[i]},clear:function(){this.files={}}};function df(i){try{let e=i.slice(i.indexOf(":")+1);return new URL(e).protocol==="blob:"}catch{return!1}}var _l=class{constructor(e,t,n){let s=this,r=!1,o=0,a=0,l,c=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this._abortController=null,this.itemStart=function(u){a++,r===!1&&s.onStart!==void 0&&s.onStart(u,o,a),r=!0},this.itemEnd=function(u){o++,s.onProgress!==void 0&&s.onProgress(u,o,a),o===a&&(r=!1,s.onLoad!==void 0&&s.onLoad())},this.itemError=function(u){s.onError!==void 0&&s.onError(u)},this.resolveURL=function(u){return l?l(u):u},this.setURLModifier=function(u){return l=u,this},this.addHandler=function(u,h){return c.push(u,h),this},this.removeHandler=function(u){let h=c.indexOf(u);return h!==-1&&c.splice(h,2),this},this.getHandler=function(u){for(let h=0,d=c.length;h<d;h+=2){let f=c[h],g=c[h+1];if(f.global&&(f.lastIndex=0),f.test(u))return g}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}},sp=new _l,li=class{constructor(e){this.manager=e!==void 0?e:sp,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(e,t){let n=this;return new Promise(function(s,r){n.load(e,s,t,r)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}};li.DEFAULT_MATERIAL_NAME="__DEFAULT";var Ei={},wu=class extends Error{constructor(e,t){super(e),this.response=t}},Br=class extends li{constructor(e){super(e),this.mimeType="",this.responseType="",this._abortController=new AbortController}load(e,t,n,s){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);let r=ei.get(`file:${e}`);if(r!==void 0)return this.manager.itemStart(e),setTimeout(()=>{t&&t(r),this.manager.itemEnd(e)},0),r;if(Ei[e]!==void 0){Ei[e].push({onLoad:t,onProgress:n,onError:s});return}Ei[e]=[],Ei[e].push({onLoad:t,onProgress:n,onError:s});let o=new Request(e,{headers:new Headers(this.requestHeader),credentials:this.withCredentials?"include":"same-origin",signal:typeof AbortSignal.any=="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal}),a=this.mimeType,l=this.responseType;fetch(o).then(c=>{if(c.status===200||c.status===0){if(c.status===0&&Ee("FileLoader: HTTP Status 0 received."),typeof ReadableStream>"u"||c.body===void 0||c.body.getReader===void 0)return c;let u=Ei[e],h=c.body.getReader(),d=c.headers.get("X-File-Size")||c.headers.get("Content-Length"),f=d?parseInt(d):0,g=f!==0,y=0,m=new ReadableStream({start(p){M();function M(){h.read().then(({done:w,value:S})=>{if(w)p.close();else{y+=S.byteLength;let C=new ProgressEvent("progress",{lengthComputable:g,loaded:y,total:f});for(let A=0,R=u.length;A<R;A++){let v=u[A];v.onProgress&&v.onProgress(C)}p.enqueue(S),M()}},w=>{p.error(w)})}}});return new Response(m)}else throw new wu(`fetch for "${c.url}" responded with ${c.status}: ${c.statusText}`,c)}).then(c=>{switch(l){case"arraybuffer":return c.arrayBuffer();case"blob":return c.blob();case"document":return c.text().then(u=>new DOMParser().parseFromString(u,a));case"json":return c.json();default:if(a==="")return c.text();{let h=/charset="?([^;"\s]*)"?/i.exec(a),d=h&&h[1]?h[1].toLowerCase():void 0,f=new TextDecoder(d);return c.arrayBuffer().then(g=>f.decode(g))}}}).then(c=>{ei.add(`file:${e}`,c);let u=Ei[e];delete Ei[e];for(let h=0,d=u.length;h<d;h++){let f=u[h];f.onLoad&&f.onLoad(c)}}).catch(c=>{let u=Ei[e];if(u===void 0)throw this.manager.itemError(e),c;delete Ei[e];for(let h=0,d=u.length;h<d;h++){let f=u[h];f.onError&&f.onError(c)}this.manager.itemError(e)}).finally(()=>{this.manager.itemEnd(e)}),this.manager.itemStart(e)}setResponseType(e){return this.responseType=e,this}setMimeType(e){return this.mimeType=e,this}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}};var yr=new WeakMap,yl=class extends li{constructor(e){super(e)}load(e,t,n,s){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);let r=this,o=ei.get(`image:${e}`);if(o!==void 0){if(o.complete===!0)r.manager.itemStart(e),setTimeout(function(){t&&t(o),r.manager.itemEnd(e)},0);else{let h=yr.get(o);h===void 0&&(h=[],yr.set(o,h)),h.push({onLoad:t,onError:s})}return o}let a=Tr("img");function l(){u(),t&&t(this);let h=yr.get(this)||[];for(let d=0;d<h.length;d++){let f=h[d];f.onLoad&&f.onLoad(this)}yr.delete(this),r.manager.itemEnd(e)}function c(h){u(),s&&s(h),ei.remove(`image:${e}`);let d=yr.get(this)||[];for(let f=0;f<d.length;f++){let g=d[f];g.onError&&g.onError(h)}yr.delete(this),r.manager.itemError(e),r.manager.itemEnd(e)}function u(){a.removeEventListener("load",l,!1),a.removeEventListener("error",c,!1)}return a.addEventListener("load",l,!1),a.addEventListener("error",c,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(a.crossOrigin=this.crossOrigin),ei.add(`image:${e}`,a),r.manager.itemStart(e),a.src=e,a}};var ko=class extends li{constructor(e){super(e)}load(e,t,n,s){let r=new Ut,o=new yl(this.manager);return o.setCrossOrigin(this.crossOrigin),o.setPath(this.path),o.load(e,function(a){r.image=a,r.needsUpdate=!0,t!==void 0&&t(r)},n,s),r}},Ds=class extends gt{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new Pe(e),this.intensity=t}dispose(){this.dispatchEvent({type:"dispose"})}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){let t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,t}},zo=class extends Ds{constructor(e,t,n){super(e,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(gt.DEFAULT_UP),this.updateMatrix(),this.groundColor=new Pe(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}toJSON(e){let t=super.toJSON(e);return t.object.groundColor=this.groundColor.getHex(),t}},_u=new ze,ff=new L,pf=new L,Ho=class{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new Ie(512,512),this.mapType=fn,this.map=null,this.mapPass=null,this.matrix=new ze,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Lr,this._frameExtents=new Ie(1,1),this._viewportCount=1,this._viewports=[new pt(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){let t=this.camera,n=this.matrix;ff.setFromMatrixPosition(e.matrixWorld),t.position.copy(ff),pf.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(pf),t.updateMatrixWorld(),_u.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(_u,t.coordinateSystem,t.reversedDepth),t.coordinateSystem===wr||t.reversedDepth?n.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(_u)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this.biasNode=e.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){let e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}},Xa=new L,qa=new jt,jn=new L,Vo=class extends gt{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new ze,this.projectionMatrix=new ze,this.projectionMatrixInverse=new ze,this.coordinateSystem=On,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(Xa,qa,jn),jn.x===1&&jn.y===1&&jn.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Xa,qa,jn.set(1,1,1)).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorld.decompose(Xa,qa,jn),jn.x===1&&jn.y===1&&jn.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Xa,qa,jn.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}},$i=new L,mf=new Ie,gf=new Ie,Rt=class extends Vo{constructor(e=50,t=1,n=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=s,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){let t=.5*this.getFilmHeight()/e;this.fov=Cs*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){let e=Math.tan(mo*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Cs*2*Math.atan(Math.tan(mo*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){$i.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set($i.x,$i.y).multiplyScalar(-e/$i.z),$i.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set($i.x,$i.y).multiplyScalar(-e/$i.z)}getViewSize(e,t){return this.getViewBounds(e,mf,gf),t.subVectors(gf,mf)}setViewOffset(e,t,n,s,r,o){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=this.near,t=e*Math.tan(mo*.5*this.fov)/this.zoom,n=2*t,s=this.aspect*n,r=-.5*s,o=this.view;if(this.view!==null&&this.view.enabled){let l=o.fullWidth,c=o.fullHeight;r+=o.offsetX*s/l,t-=o.offsetY*n/c,s*=o.width/l,n*=o.height/c}let a=this.filmOffset;a!==0&&(r+=e*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}},Tu=class extends Ho{constructor(){super(new Rt(50,1,.5,500)),this.isSpotLightShadow=!0,this.focus=1,this.aspect=1}updateMatrices(e){let t=this.camera,n=Cs*2*e.angle*this.focus,s=this.mapSize.width/this.mapSize.height*this.aspect,r=e.distance||t.far;(n!==t.fov||s!==t.aspect||r!==t.far)&&(t.fov=n,t.aspect=s,t.far=r,t.updateProjectionMatrix()),super.updateMatrices(e)}copy(e){return super.copy(e),this.focus=e.focus,this}},Go=class extends Ds{constructor(e,t,n=0,s=Math.PI/3,r=0,o=2){super(e,t),this.isSpotLight=!0,this.type="SpotLight",this.position.copy(gt.DEFAULT_UP),this.updateMatrix(),this.target=new gt,this.distance=n,this.angle=s,this.penumbra=r,this.decay=o,this.map=null,this.shadow=new Tu}get power(){return this.intensity*Math.PI}set power(e){this.intensity=e/Math.PI}dispose(){super.dispose(),this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.angle=e.angle,this.penumbra=e.penumbra,this.decay=e.decay,this.target=e.target.clone(),this.map=e.map,this.shadow=e.shadow.clone(),this}toJSON(e){let t=super.toJSON(e);return t.object.distance=this.distance,t.object.angle=this.angle,t.object.decay=this.decay,t.object.penumbra=this.penumbra,t.object.target=this.target.uuid,this.map&&this.map.isTexture&&(t.object.map=this.map.toJSON(e).uuid),t.object.shadow=this.shadow.toJSON(),t}},Eu=class extends Ho{constructor(){super(new Rt(90,1,.5,500)),this.isPointLightShadow=!0}},Wo=class extends Ds{constructor(e,t,n=0,s=2){super(e,t),this.isPointLight=!0,this.type="PointLight",this.distance=n,this.decay=s,this.shadow=new Eu}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){super.dispose(),this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}toJSON(e){let t=super.toJSON(e);return t.object.distance=this.distance,t.object.decay=this.decay,t.object.shadow=this.shadow.toJSON(),t}},ts=class extends Vo{constructor(e=-1,t=1,n=1,s=-1,r=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=s,this.near=r,this.far=o,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,s,r,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,s=(this.top+this.bottom)/2,r=n-e,o=n+e,a=s+t,l=s-t;if(this.view!==null&&this.view.enabled){let c=(this.right-this.left)/this.view.fullWidth/this.zoom,u=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=c*this.view.offsetX,o=r+c*this.view.width,a-=u*this.view.offsetY,l=a-u*this.view.height}this.projectionMatrix.makeOrthographic(r,o,a,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}},Au=class extends Ho{constructor(){super(new ts(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},Us=class extends Ds{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(gt.DEFAULT_UP),this.updateMatrix(),this.target=new gt,this.shadow=new Au}dispose(){super.dispose(),this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}toJSON(e){let t=super.toJSON(e);return t.object.shadow=this.shadow.toJSON(),t.object.target=this.target.uuid,t}};var Li=class{static extractUrlBase(e){let t=e.lastIndexOf("/");return t===-1?"./":e.slice(0,t+1)}static resolveURL(e,t){return typeof e!="string"||e===""?"":(/^https?:\/\//i.test(t)&&/^\//.test(e)&&(t=t.replace(/(^https?:\/\/[^\/]+).*/i,"$1")),/^(https?:)?\/\//i.test(e)||/^data:.*,.*$/i.test(e)||/^blob:.*$/i.test(e)?e:t+e)}};var yu=new WeakMap,Ko=class extends li{constructor(e){super(e),this.isImageBitmapLoader=!0,typeof createImageBitmap>"u"&&Ee("ImageBitmapLoader: createImageBitmap() not supported."),typeof fetch>"u"&&Ee("ImageBitmapLoader: fetch() not supported."),this.options={premultiplyAlpha:"none"},this._abortController=new AbortController}setOptions(e){return this.options=e,this}load(e,t,n,s){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);let r=this,o=ei.get(`image-bitmap:${e}`);if(o!==void 0){if(r.manager.itemStart(e),o.then){o.then(c=>{if(yu.has(o)===!0)s&&s(yu.get(o)),r.manager.itemError(e),r.manager.itemEnd(e);else return t&&t(c),r.manager.itemEnd(e),c});return}return setTimeout(function(){t&&t(o),r.manager.itemEnd(e)},0),o}let a={};a.credentials=this.crossOrigin==="anonymous"?"same-origin":"include",a.headers=this.requestHeader,a.signal=typeof AbortSignal.any=="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal;let l=fetch(e,a).then(function(c){return c.blob()}).then(function(c){return createImageBitmap(c,Object.assign(r.options,{colorSpaceConversion:"none"}))}).then(function(c){return ei.add(`image-bitmap:${e}`,c),t&&t(c),r.manager.itemEnd(e),c}).catch(function(c){s&&s(c),yu.set(l,c),ei.remove(`image-bitmap:${e}`),r.manager.itemError(e),r.manager.itemEnd(e)});ei.add(`image-bitmap:${e}`,l),r.manager.itemStart(e)}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}};var vr=-90,br=1,vl=class extends gt{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let s=new Rt(vr,br,e,t);s.layers=this.layers,this.add(s);let r=new Rt(vr,br,e,t);r.layers=this.layers,this.add(r);let o=new Rt(vr,br,e,t);o.layers=this.layers,this.add(o);let a=new Rt(vr,br,e,t);a.layers=this.layers,this.add(a);let l=new Rt(vr,br,e,t);l.layers=this.layers,this.add(l);let c=new Rt(vr,br,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){let e=this.coordinateSystem,t=this.children.concat(),[n,s,r,o,a,l]=t;for(let c of t)this.remove(c);if(e===On)n.up.set(0,1,0),n.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(e===wr)n.up.set(0,-1,0),n.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(let c of t)this.add(c),c.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:s}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());let[r,o,a,l,c,u]=this.children,h=e.getRenderTarget(),d=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),g=e.xr.enabled;e.xr.enabled=!1;let y=n.texture.generateMipmaps;n.texture.generateMipmaps=!1;let m=!1;e.isWebGLRenderer===!0?m=e.state.buffers.depth.getReversed():m=e.reversedDepthBuffer,e.setRenderTarget(n,0,s),m&&e.autoClear===!1&&e.clearDepth(),e.render(t,r),e.setRenderTarget(n,1,s),m&&e.autoClear===!1&&e.clearDepth(),e.render(t,o),e.setRenderTarget(n,2,s),m&&e.autoClear===!1&&e.clearDepth(),e.render(t,a),e.setRenderTarget(n,3,s),m&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),e.setRenderTarget(n,4,s),m&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),n.texture.generateMipmaps=y,e.setRenderTarget(n,5,s),m&&e.autoClear===!1&&e.clearDepth(),e.render(t,u),e.setRenderTarget(h,d,f),e.xr.enabled=g,n.texture.needsPMREMUpdate=!0}},bl=class extends Rt{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}};var Ml=class{constructor(e,t,n){this.binding=e,this.valueSize=n;let s,r,o;switch(t){case"quaternion":s=this._slerp,r=this._slerpAdditive,o=this._setAdditiveIdentityQuaternion,this.buffer=new Float64Array(n*6),this._workIndex=5;break;case"string":case"bool":s=this._select,r=this._select,o=this._setAdditiveIdentityOther,this.buffer=new Array(n*5);break;default:s=this._lerp,r=this._lerpAdditive,o=this._setAdditiveIdentityNumeric,this.buffer=new Float64Array(n*5)}this._mixBufferRegion=s,this._mixBufferRegionAdditive=r,this._setIdentity=o,this._origIndex=3,this._addIndex=4,this.cumulativeWeight=0,this.cumulativeWeightAdditive=0,this.useCount=0,this.referenceCount=0}accumulate(e,t){let n=this.buffer,s=this.valueSize,r=e*s+s,o=this.cumulativeWeight;if(o===0){for(let a=0;a!==s;++a)n[r+a]=n[a];o=t}else{o+=t;let a=t/o;this._mixBufferRegion(n,r,0,a,s)}this.cumulativeWeight=o}accumulateAdditive(e){let t=this.buffer,n=this.valueSize,s=n*this._addIndex;this.cumulativeWeightAdditive===0&&this._setIdentity(),this._mixBufferRegionAdditive(t,s,0,e,n),this.cumulativeWeightAdditive+=e}apply(e){let t=this.valueSize,n=this.buffer,s=e*t+t,r=this.cumulativeWeight,o=this.cumulativeWeightAdditive,a=this.binding;if(this.cumulativeWeight=0,this.cumulativeWeightAdditive=0,r<1){let l=t*this._origIndex;this._mixBufferRegion(n,s,l,1-r,t)}o>0&&this._mixBufferRegionAdditive(n,s,this._addIndex*t,1,t);for(let l=t,c=t+t;l!==c;++l)if(n[l]!==n[l+t]){a.setValue(n,s);break}}saveOriginalState(){let e=this.binding,t=this.buffer,n=this.valueSize,s=n*this._origIndex;e.getValue(t,s);for(let r=n,o=s;r!==o;++r)t[r]=t[s+r%n];this._setIdentity(),this.cumulativeWeight=0,this.cumulativeWeightAdditive=0}restoreOriginalState(){let e=this.valueSize*3;this.binding.setValue(this.buffer,e)}_setAdditiveIdentityNumeric(){let e=this._addIndex*this.valueSize,t=e+this.valueSize;for(let n=e;n<t;n++)this.buffer[n]=0}_setAdditiveIdentityQuaternion(){this._setAdditiveIdentityNumeric(),this.buffer[this._addIndex*this.valueSize+3]=1}_setAdditiveIdentityOther(){let e=this._origIndex*this.valueSize,t=this._addIndex*this.valueSize;for(let n=0;n<this.valueSize;n++)this.buffer[t+n]=this.buffer[e+n]}_select(e,t,n,s,r){if(s>=.5)for(let o=0;o!==r;++o)e[t+o]=e[n+o]}_slerp(e,t,n,s){jt.slerpFlat(e,t,e,t,e,n,s)}_slerpAdditive(e,t,n,s,r){let o=this._workIndex*r;jt.multiplyQuaternionsFlat(e,o,e,t,e,n),jt.slerpFlat(e,t,e,t,e,o,s)}_lerp(e,t,n,s,r){let o=1-s;for(let a=0;a!==r;++a){let l=t+a;e[l]=e[l]*o+e[n+a]*s}}_lerpAdditive(e,t,n,s,r){for(let o=0;o!==r;++o){let a=t+o;e[a]=e[a]+e[n+o]*s}}},ju="\\[\\]\\.:\\/",bg=new RegExp("["+ju+"]","g"),Qu="[^"+ju+"]",Mg="[^"+ju.replace("\\.","")+"]",Sg=/((?:WC+[\/:])*)/.source.replace("WC",Qu),wg=/(WCOD+)?/.source.replace("WCOD",Mg),Tg=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",Qu),Eg=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",Qu),Ag=new RegExp("^"+Sg+wg+Tg+Eg+"$"),Cg=["material","materials","bones","map"],Cu=class{constructor(e,t,n){let s=n||lt.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,s)}getValue(e,t){this.bind();let n=this._targetGroup.nCachedObjects_,s=this._bindings[n];s!==void 0&&s.getValue(e,t)}setValue(e,t){let n=this._bindings;for(let s=this._targetGroup.nCachedObjects_,r=n.length;s!==r;++s)n[s].setValue(e,t)}bind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].bind()}unbind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].unbind()}},lt=class i{constructor(e,t,n){this.path=t,this.parsedPath=n||i.parseTrackName(t),this.node=i.findNode(e,this.parsedPath.nodeName),this.rootNode=e,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(e,t,n){return e&&e.isAnimationObjectGroup?new i.Composite(e,t,n):new i(e,t,n)}static sanitizeNodeName(e){return e.replace(/\s/g,"_").replace(bg,"")}static parseTrackName(e){let t=Ag.exec(e);if(t===null)throw new Error("PropertyBinding: Cannot parse trackName: "+e);let n={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},s=n.nodeName&&n.nodeName.lastIndexOf(".");if(s!==void 0&&s!==-1){let r=n.nodeName.substring(s+1);Cg.indexOf(r)!==-1&&(n.nodeName=n.nodeName.substring(0,s),n.objectName=r)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("PropertyBinding: can not parse propertyName from trackName: "+e);return n}static findNode(e,t){if(t===void 0||t===""||t==="."||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){let n=e.skeleton.getBoneByName(t);if(n!==void 0)return n}if(e.children){let n=function(r){for(let o=0;o<r.length;o++){let a=r[o];if(a.name===t||a.uuid===t)return a;let l=n(a.children);if(l)return l}return null},s=n(e.children);if(s)return s}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)e[t++]=n[s]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=e[t++]}_setValue_array_setNeedsUpdate(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let e=this.node,t=this.parsedPath,n=t.objectName,s=t.propertyName,r=t.propertyIndex;if(e||(e=i.findNode(this.rootNode,t.nodeName),this.node=e),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!e){Ee("PropertyBinding: No target node found for track: "+this.path+".");return}if(n){let c=t.objectIndex;switch(n){case"materials":if(!e.material){Ne("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.materials){Ne("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}e=e.material.materials;break;case"bones":if(!e.skeleton){Ne("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}e=e.skeleton.bones;for(let u=0;u<e.length;u++)if(e[u].name===c){c=u;break}break;case"map":if("map"in e){e=e.map;break}if(!e.material){Ne("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.map){Ne("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}e=e.material.map;break;default:if(e[n]===void 0){Ne("PropertyBinding: Can not bind to objectName of node undefined.",this);return}e=e[n]}if(c!==void 0){if(e[c]===void 0){Ne("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,e);return}e=e[c]}}let o=e[s];if(o===void 0){let c=t.nodeName;Ne("PropertyBinding: Trying to update property for track: "+c+"."+s+" but it wasn't found.",e);return}let a=this.Versioning.None;this.targetObject=e,e.isMaterial===!0?a=this.Versioning.NeedsUpdate:e.isObject3D===!0&&(a=this.Versioning.MatrixWorldNeedsUpdate);let l=this.BindingType.Direct;if(r!==void 0){if(s==="morphTargetInfluences"){if(!e.geometry){Ne("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!e.geometry.morphAttributes){Ne("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}e.morphTargetDictionary[r]!==void 0&&(r=e.morphTargetDictionary[r])}l=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=r}else o.fromArray!==void 0&&o.toArray!==void 0?(l=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(l=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=s;this.getValue=this.GetterByBindingType[l],this.setValue=this.SetterByBindingTypeAndVersioning[l][a]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};lt.Composite=Cu;lt.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};lt.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};lt.prototype.GetterByBindingType=[lt.prototype._getValue_direct,lt.prototype._getValue_array,lt.prototype._getValue_arrayElement,lt.prototype._getValue_toArray];lt.prototype.SetterByBindingTypeAndVersioning=[[lt.prototype._setValue_direct,lt.prototype._setValue_direct_setNeedsUpdate,lt.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[lt.prototype._setValue_array,lt.prototype._setValue_array_setNeedsUpdate,lt.prototype._setValue_array_setMatrixWorldNeedsUpdate],[lt.prototype._setValue_arrayElement,lt.prototype._setValue_arrayElement_setNeedsUpdate,lt.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[lt.prototype._setValue_fromArray,lt.prototype._setValue_fromArray_setNeedsUpdate,lt.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var Sl=class{constructor(e,t,n=null,s=t.blendMode){this._mixer=e,this._clip=t,this._localRoot=n,this.blendMode=s;let r=t.tracks,o=r.length,a=new Array(o),l={endingStart:Ms,endingEnd:Ms};for(let c=0;c!==o;++c){let u=r[c].createInterpolant(null);a[c]=u,u.settings=l}this._interpolantSettings=l,this._interpolants=a,this._propertyBindings=new Array(o),this._cacheIndex=null,this._byClipCacheIndex=null,this._timeScaleInterpolant=null,this._weightInterpolant=null,this.loop=pc,this._loopCount=-1,this._startTime=null,this.time=0,this.timeScale=1,this._effectiveTimeScale=1,this.weight=1,this._effectiveWeight=1,this.repetitions=1/0,this.paused=!1,this.enabled=!0,this.clampWhenFinished=!1,this.zeroSlopeAtStart=!0,this.zeroSlopeAtEnd=!0}play(){return this._mixer._activateAction(this),this}stop(){return this._mixer._deactivateAction(this),this.reset()}reset(){return this.paused=!1,this.enabled=!0,this.time=0,this._loopCount=-1,this._startTime=null,this.stopFading().stopWarping()}isRunning(){return this.enabled&&!this.paused&&this.timeScale!==0&&this._startTime===null&&this._mixer._isActiveAction(this)}isScheduled(){return this._mixer._isActiveAction(this)}startAt(e){return this._startTime=e,this}setLoop(e,t){return this.loop=e,this.repetitions=t,this}setEffectiveWeight(e){return this.weight=e,this._effectiveWeight=this.enabled?e:0,this.stopFading()}getEffectiveWeight(){return this._effectiveWeight}fadeIn(e){return this._scheduleFading(e,0,1)}fadeOut(e){return this._scheduleFading(e,1,0)}crossFadeFrom(e,t,n=!1){if(e.fadeOut(t),this.fadeIn(t),n===!0){let s=this._clip.duration,r=e._clip.duration,o=r/s,a=s/r;e.warp(1,o,t),this.warp(a,1,t)}return this}crossFadeTo(e,t,n=!1){return e.crossFadeFrom(this,t,n)}stopFading(){let e=this._weightInterpolant;return e!==null&&(this._weightInterpolant=null,this._mixer._takeBackControlInterpolant(e)),this}setEffectiveTimeScale(e){return this.timeScale=e,this._effectiveTimeScale=this.paused?0:e,this.stopWarping()}getEffectiveTimeScale(){return this._effectiveTimeScale}setDuration(e){return this.timeScale=this._clip.duration/e,this.stopWarping()}syncWith(e){return this.time=e.time,this.timeScale=e.timeScale,this.stopWarping()}halt(e){return this.warp(this._effectiveTimeScale,0,e)}warp(e,t,n){let s=this._mixer,r=s.time,o=this.timeScale,a=this._timeScaleInterpolant;a===null&&(a=s._lendControlInterpolant(),this._timeScaleInterpolant=a);let l=a.parameterPositions,c=a.sampleValues;return l[0]=r,l[1]=r+n,c[0]=e/o,c[1]=t/o,this}stopWarping(){let e=this._timeScaleInterpolant;return e!==null&&(this._timeScaleInterpolant=null,this._mixer._takeBackControlInterpolant(e)),this}getMixer(){return this._mixer}getClip(){return this._clip}getRoot(){return this._localRoot||this._mixer._root}_update(e,t,n,s){if(!this.enabled){this._updateWeight(e);return}let r=this._startTime;if(r!==null){let l=(e-r)*n;l<0||n===0?t=0:(this._startTime=null,t=n*l)}t*=this._updateTimeScale(e);let o=this._updateTime(t),a=this._updateWeight(e);if(a>0){let l=this._interpolants,c=this._propertyBindings;switch(this.blendMode){case Hf:for(let u=0,h=l.length;u!==h;++u)l[u].evaluate(o),c[u].accumulateAdditive(a);break;case mc:default:for(let u=0,h=l.length;u!==h;++u)l[u].evaluate(o),c[u].accumulate(s,a)}}}_updateWeight(e){let t=0;if(this.enabled){t=this.weight;let n=this._weightInterpolant;if(n!==null){let s=n.evaluate(e)[0];t*=s,e>n.parameterPositions[1]&&(this.stopFading(),s===0&&(this.enabled=!1))}}return this._effectiveWeight=t,t}_updateTimeScale(e){let t=0;if(!this.paused){t=this.timeScale;let n=this._timeScaleInterpolant;if(n!==null){let s=n.evaluate(e)[0];t*=s,e>n.parameterPositions[1]&&(this.stopWarping(),t===0?this.paused=!0:this.timeScale=t)}}return this._effectiveTimeScale=t,t}_updateTime(e){let t=this._clip.duration,n=this.loop,s=this.time+e,r=this._loopCount,o=n===zf;if(e===0)return r===-1?s:o&&(r&1)===1?t-s:s;if(n===fc){r===-1&&(this._loopCount=0,this._setEndings(!0,!0,!1));e:{if(s>=t)s=t;else if(s<0)s=0;else{this.time=s;break e}this.clampWhenFinished?this.paused=!0:this.enabled=!1,this.time=s,this._mixer.dispatchEvent({type:"finished",action:this,direction:e<0?-1:1})}}else{if(r===-1&&(e>=0?(r=0,this._setEndings(!0,this.repetitions===0,o)):this._setEndings(this.repetitions===0,!0,o)),s>=t||s<0){let a=Math.floor(s/t);s-=t*a,r+=Math.abs(a);let l=this.repetitions-r;if(l<=0)this.clampWhenFinished?this.paused=!0:this.enabled=!1,s=e>0?t:0,this.time=s,this._mixer.dispatchEvent({type:"finished",action:this,direction:e>0?1:-1});else{if(l===1){let c=e<0;this._setEndings(c,!c,o)}else this._setEndings(!1,!1,o);this._loopCount=r,this.time=s,this._mixer.dispatchEvent({type:"loop",action:this,loopDelta:a})}}else this.time=s;if(o&&(r&1)===1)return t-s}return s}_setEndings(e,t,n){let s=this._interpolantSettings;n?(s.endingStart=Ss,s.endingEnd=Ss):(e?s.endingStart=this.zeroSlopeAtStart?Ss:Ms:s.endingStart=xo,t?s.endingEnd=this.zeroSlopeAtEnd?Ss:Ms:s.endingEnd=xo)}_scheduleFading(e,t,n){let s=this._mixer,r=s.time,o=this._weightInterpolant;o===null&&(o=s._lendControlInterpolant(),this._weightInterpolant=o);let a=o.parameterPositions,l=o.sampleValues;return a[0]=r,l[0]=t,a[1]=r+e,l[1]=n,this}},Rg=new Float32Array(1),Xo=class extends ni{constructor(e){super(),this._root=e,this._initMemoryManager(),this._accuIndex=0,this.time=0,this.timeScale=1,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}_bindAction(e,t){let n=e._localRoot||this._root,s=e._clip.tracks,r=s.length,o=e._propertyBindings,a=e._interpolants,l=n.uuid,c=this._bindingsByRootAndName,u=c[l];u===void 0&&(u={},c[l]=u);for(let h=0;h!==r;++h){let d=s[h],f=d.name,g=u[f];if(g!==void 0)++g.referenceCount,o[h]=g;else{if(g=o[h],g!==void 0){g._cacheIndex===null&&(++g.referenceCount,this._addInactiveBinding(g,l,f));continue}let y=t&&t._propertyBindings[h].binding.parsedPath;g=new Ml(lt.create(n,f,y),d.ValueTypeName,d.getValueSize()),++g.referenceCount,this._addInactiveBinding(g,l,f),o[h]=g}a[h].resultBuffer=g.buffer}}_activateAction(e){if(!this._isActiveAction(e)){if(e._cacheIndex===null){let n=(e._localRoot||this._root).uuid,s=e._clip.uuid,r=this._actionsByClip[s];this._bindAction(e,r&&r.knownActions[0]),this._addInactiveAction(e,s,n)}let t=e._propertyBindings;for(let n=0,s=t.length;n!==s;++n){let r=t[n];r.useCount++===0&&(this._lendBinding(r),r.saveOriginalState())}this._lendAction(e)}}_deactivateAction(e){if(this._isActiveAction(e)){let t=e._propertyBindings;for(let n=0,s=t.length;n!==s;++n){let r=t[n];--r.useCount===0&&(r.restoreOriginalState(),this._takeBackBinding(r))}this._takeBackAction(e)}}_initMemoryManager(){this._actions=[],this._nActiveActions=0,this._actionsByClip={},this._bindings=[],this._nActiveBindings=0,this._bindingsByRootAndName={},this._controlInterpolants=[],this._nActiveControlInterpolants=0;let e=this;this.stats={actions:{get total(){return e._actions.length},get inUse(){return e._nActiveActions}},bindings:{get total(){return e._bindings.length},get inUse(){return e._nActiveBindings}},controlInterpolants:{get total(){return e._controlInterpolants.length},get inUse(){return e._nActiveControlInterpolants}}}}_isActiveAction(e){let t=e._cacheIndex;return t!==null&&t<this._nActiveActions}_addInactiveAction(e,t,n){let s=this._actions,r=this._actionsByClip,o=r[t];if(o===void 0)o={knownActions:[e],actionByRoot:{}},e._byClipCacheIndex=0,r[t]=o;else{let a=o.knownActions;e._byClipCacheIndex=a.length,a.push(e)}e._cacheIndex=s.length,s.push(e),o.actionByRoot[n]=e}_removeInactiveAction(e){let t=this._actions,n=t[t.length-1],s=e._cacheIndex;n._cacheIndex=s,t[s]=n,t.pop(),e._cacheIndex=null;let r=e._clip.uuid,o=this._actionsByClip,a=o[r],l=a.knownActions,c=l[l.length-1],u=e._byClipCacheIndex;c._byClipCacheIndex=u,l[u]=c,l.pop(),e._byClipCacheIndex=null;let h=a.actionByRoot,d=(e._localRoot||this._root).uuid;delete h[d],l.length===0&&delete o[r],this._removeInactiveBindingsForAction(e)}_removeInactiveBindingsForAction(e){let t=e._propertyBindings;for(let n=0,s=t.length;n!==s;++n){let r=t[n];--r.referenceCount===0&&this._removeInactiveBinding(r)}}_lendAction(e){let t=this._actions,n=e._cacheIndex,s=this._nActiveActions++,r=t[s];e._cacheIndex=s,t[s]=e,r._cacheIndex=n,t[n]=r}_takeBackAction(e){let t=this._actions,n=e._cacheIndex,s=--this._nActiveActions,r=t[s];e._cacheIndex=s,t[s]=e,r._cacheIndex=n,t[n]=r}_addInactiveBinding(e,t,n){let s=this._bindingsByRootAndName,r=this._bindings,o=s[t];o===void 0&&(o={},s[t]=o),o[n]=e,e._cacheIndex=r.length,r.push(e)}_removeInactiveBinding(e){let t=this._bindings,n=e.binding,s=n.rootNode.uuid,r=n.path,o=this._bindingsByRootAndName,a=o[s],l=t[t.length-1],c=e._cacheIndex;l._cacheIndex=c,t[c]=l,t.pop(),delete a[r],Object.keys(a).length===0&&delete o[s]}_lendBinding(e){let t=this._bindings,n=e._cacheIndex,s=this._nActiveBindings++,r=t[s];e._cacheIndex=s,t[s]=e,r._cacheIndex=n,t[n]=r}_takeBackBinding(e){let t=this._bindings,n=e._cacheIndex,s=--this._nActiveBindings,r=t[s];e._cacheIndex=s,t[s]=e,r._cacheIndex=n,t[n]=r}_lendControlInterpolant(){let e=this._controlInterpolants,t=this._nActiveControlInterpolants++,n=e[t];return n===void 0&&(n=new Oo(new Float32Array(2),new Float32Array(2),1,Rg),n.__cacheIndex=t,e[t]=n),n}_takeBackControlInterpolant(e){let t=this._controlInterpolants,n=e.__cacheIndex,s=--this._nActiveControlInterpolants,r=t[s];e.__cacheIndex=s,t[s]=e,r.__cacheIndex=n,t[n]=r}clipAction(e,t,n){let s=t||this._root,r=s.uuid,o=typeof e=="string"?Ns.findByName(s,e):e,a=o!==null?o.uuid:e,l=this._actionsByClip[a],c=null;if(n===void 0&&(o!==null?n=o.blendMode:n=mc),l!==void 0){let h=l.actionByRoot[r];if(h!==void 0&&h.blendMode===n)return h;c=l.knownActions[0],o===null&&(o=c._clip)}if(o===null)return null;let u=new Sl(this,o,t,n);return this._bindAction(u,c),this._addInactiveAction(u,a,r),u}existingAction(e,t){let n=t||this._root,s=n.uuid,r=typeof e=="string"?Ns.findByName(n,e):e,o=r?r.uuid:e,a=this._actionsByClip[o];return a!==void 0&&a.actionByRoot[s]||null}stopAllAction(){let e=this._actions,t=this._nActiveActions;for(let n=t-1;n>=0;--n)e[n].stop();return this}update(e){e*=this.timeScale;let t=this._actions,n=this._nActiveActions,s=this.time+=e,r=Math.sign(e),o=this._accuIndex^=1;for(let c=0;c!==n;++c)t[c]._update(s,e,r,o);let a=this._bindings,l=this._nActiveBindings;for(let c=0;c!==l;++c)a[c].apply(o);return this}setTime(e){this.time=0;for(let t=0;t<this._actions.length;t++)this._actions[t].time=0;return this.update(e)}getRoot(){return this._root}uncacheClip(e){let t=this._actions,n=e.uuid,s=this._actionsByClip,r=s[n];if(r!==void 0){let o=r.knownActions;for(let a=0,l=o.length;a!==l;++a){let c=o[a];this._deactivateAction(c);let u=c._cacheIndex,h=t[t.length-1];c._cacheIndex=null,c._byClipCacheIndex=null,h._cacheIndex=u,t[u]=h,t.pop(),this._removeInactiveBindingsForAction(c)}delete s[n]}}uncacheRoot(e){let t=e.uuid,n=this._actionsByClip;for(let o in n){let a=n[o].actionByRoot,l=a[t];l!==void 0&&(this._deactivateAction(l),this._removeInactiveAction(l))}let s=this._bindingsByRootAndName,r=s[t];if(r!==void 0)for(let o in r){let a=r[o];a.restoreOriginalState(),this._removeInactiveBinding(a)}}uncacheAction(e,t){let n=this.existingAction(e,t);n!==null&&(this._deactivateAction(n),this._removeInactiveAction(n))}};var qo=class{constructor(e=!0){this.autoStart=e,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1,Ee("THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.")}start(){this.startTime=performance.now(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let e=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){let t=performance.now();e=(t-this.oldTime)/1e3,this.oldTime=t,this.elapsedTime+=e}return e}};function eh(i,e,t,n){let s=Ig(n);switch(t){case Ku:return i*e;case Pl:return i*e/s.components*s.byteLength;case Ll:return i*e/s.components*s.byteLength;case Bs:return i*e*2/s.components*s.byteLength;case Nl:return i*e*2/s.components*s.byteLength;case Xu:return i*e*3/s.components*s.byteLength;case Mn:return i*e*4/s.components*s.byteLength;case Dl:return i*e*4/s.components*s.byteLength;case Jo:case jo:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case Qo:case ea:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Fl:case Bl:return Math.max(i,16)*Math.max(e,8)/4;case Ul:case Ol:return Math.max(i,8)*Math.max(e,8)/2;case kl:case zl:case Vl:case Gl:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case Hl:case Wl:case Kl:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Xl:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case ql:return Math.floor((i+4)/5)*Math.floor((e+3)/4)*16;case Yl:return Math.floor((i+4)/5)*Math.floor((e+4)/5)*16;case $l:return Math.floor((i+5)/6)*Math.floor((e+4)/5)*16;case Zl:return Math.floor((i+5)/6)*Math.floor((e+5)/6)*16;case Jl:return Math.floor((i+7)/8)*Math.floor((e+4)/5)*16;case jl:return Math.floor((i+7)/8)*Math.floor((e+5)/6)*16;case Ql:return Math.floor((i+7)/8)*Math.floor((e+7)/8)*16;case ec:return Math.floor((i+9)/10)*Math.floor((e+4)/5)*16;case tc:return Math.floor((i+9)/10)*Math.floor((e+5)/6)*16;case nc:return Math.floor((i+9)/10)*Math.floor((e+7)/8)*16;case ic:return Math.floor((i+9)/10)*Math.floor((e+9)/10)*16;case sc:return Math.floor((i+11)/12)*Math.floor((e+9)/10)*16;case rc:return Math.floor((i+11)/12)*Math.floor((e+11)/12)*16;case oc:case ac:case lc:return Math.ceil(i/4)*Math.ceil(e/4)*16;case cc:case uc:return Math.ceil(i/4)*Math.ceil(e/4)*8;case hc:case dc:return Math.ceil(i/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function Ig(i){switch(i){case fn:case Hu:return{byteLength:1,components:1};case Hr:case Vu:case ui:return{byteLength:2,components:1};case Rl:case Il:return{byteLength:2,components:4};case Gn:case Cl:case bn:return{byteLength:4,components:1};case Gu:case Wu:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"183"}}));typeof window<"u"&&(window.__THREE__?Ee("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="183");function Ap(){let i=null,e=!1,t=null,n=null;function s(r,o){t(r,o),n=i.requestAnimationFrame(s)}return{start:function(){e!==!0&&t!==null&&(n=i.requestAnimationFrame(s),e=!0)},stop:function(){i.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(r){t=r},setContext:function(r){i=r}}}function Lg(i){let e=new WeakMap;function t(a,l){let c=a.array,u=a.usage,h=c.byteLength,d=i.createBuffer();i.bindBuffer(l,d),i.bufferData(l,c,u),a.onUploadCallback();let f;if(c instanceof Float32Array)f=i.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)f=i.HALF_FLOAT;else if(c instanceof Uint16Array)a.isFloat16BufferAttribute?f=i.HALF_FLOAT:f=i.UNSIGNED_SHORT;else if(c instanceof Int16Array)f=i.SHORT;else if(c instanceof Uint32Array)f=i.UNSIGNED_INT;else if(c instanceof Int32Array)f=i.INT;else if(c instanceof Int8Array)f=i.BYTE;else if(c instanceof Uint8Array)f=i.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)f=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:d,type:f,bytesPerElement:c.BYTES_PER_ELEMENT,version:a.version,size:h}}function n(a,l,c){let u=l.array,h=l.updateRanges;if(i.bindBuffer(c,a),h.length===0)i.bufferSubData(c,0,u);else{h.sort((f,g)=>f.start-g.start);let d=0;for(let f=1;f<h.length;f++){let g=h[d],y=h[f];y.start<=g.start+g.count+1?g.count=Math.max(g.count,y.start+y.count-g.start):(++d,h[d]=y)}h.length=d+1;for(let f=0,g=h.length;f<g;f++){let y=h[f];i.bufferSubData(c,y.start*u.BYTES_PER_ELEMENT,u,y.start,y.count)}l.clearUpdateRanges()}l.onUploadCallback()}function s(a){return a.isInterleavedBufferAttribute&&(a=a.data),e.get(a)}function r(a){a.isInterleavedBufferAttribute&&(a=a.data);let l=e.get(a);l&&(i.deleteBuffer(l.buffer),e.delete(a))}function o(a,l){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){let u=e.get(a);(!u||u.version<a.version)&&e.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}let c=e.get(a);if(c===void 0)e.set(a,t(a,l));else if(c.version<a.version){if(c.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(c.buffer,a,l),c.version=a.version}}return{get:s,remove:r,update:o}}var Ng=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Dg=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,Ug=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Fg=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Og=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Bg=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,kg=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,zg=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Hg=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,Vg=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Gg=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Wg=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Kg=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,Xg=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,qg=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,Yg=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,$g=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Zg=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Jg=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,jg=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,Qg=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,e0=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,t0=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,n0=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,i0=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,s0=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,r0=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,o0=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,a0=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,l0=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,c0="gl_FragColor = linearToOutputTexel( gl_FragColor );",u0=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,h0=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,d0=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,f0=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,p0=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,m0=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,g0=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,x0=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,_0=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,y0=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,v0=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,b0=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,M0=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,S0=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,w0=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,T0=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,E0=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,A0=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,C0=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,R0=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,I0=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,P0=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
		vec3 iridescenceFresnelDielectric;
		vec3 iridescenceFresnelMetallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return v;
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
vec3 BRDF_GGX_Multiscatter( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 singleScatter = BRDF_GGX( lightDir, viewDir, normal, material );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 dfgV = texture2D( dfgLUT, vec2( material.roughness, dotNV ) ).rg;
	vec2 dfgL = texture2D( dfgLUT, vec2( material.roughness, dotNL ) ).rg;
	vec3 FssEss_V = material.specularColorBlended * dfgV.x + material.specularF90 * dfgV.y;
	vec3 FssEss_L = material.specularColorBlended * dfgL.x + material.specularF90 * dfgL.y;
	float Ess_V = dfgV.x + dfgV.y;
	float Ess_L = dfgL.x + dfgL.y;
	float Ems_V = 1.0 - Ess_V;
	float Ems_L = 1.0 - Ess_L;
	vec3 Favg = material.specularColorBlended + ( 1.0 - material.specularColorBlended ) * 0.047619;
	vec3 Fms = FssEss_V * FssEss_L * Favg / ( 1.0 - Ems_V * Ems_L * Favg + EPSILON );
	float compensationFactor = Ems_V * Ems_L;
	vec3 multiScatter = Fms * compensationFactor;
	return singleScatter + multiScatter;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX_Multiscatter( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnelDielectric, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceFresnelMetallic, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,L0=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( material.iridescenceFresnelDielectric, material.iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,N0=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,D0=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,U0=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,F0=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,O0=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,B0=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,k0=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,z0=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,H0=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,V0=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,G0=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,W0=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,K0=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,X0=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,q0=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Y0=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,$0=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Z0=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,J0=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,j0=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Q0=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,ex=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,tx=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,nx=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,ix=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,sx=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,rx=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,ox=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,ax=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,lx=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,cx=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,ux=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,hx=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,dx=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,fx=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,px=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,mx=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,gx=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,xx=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,_x=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,yx=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,vx=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,bx=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,Mx=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Sx=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,wx=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Tx=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,Ex=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,Ax=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,Cx=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Rx=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Ix=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,Px=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,Lx=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Nx=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Dx=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Ux=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Fx=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Ox=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Bx=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,kx=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,zx=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,Hx=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,Vx=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Gx=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Wx=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Kx=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Xx=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,qx=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Yx=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,$x=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Zx=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,Jx=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,jx=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,Qx=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,e_=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,t_=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,n_=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,i_=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,s_=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,r_=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,o_=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,a_=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,l_=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,c_=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,u_=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,h_=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,We={alphahash_fragment:Ng,alphahash_pars_fragment:Dg,alphamap_fragment:Ug,alphamap_pars_fragment:Fg,alphatest_fragment:Og,alphatest_pars_fragment:Bg,aomap_fragment:kg,aomap_pars_fragment:zg,batching_pars_vertex:Hg,batching_vertex:Vg,begin_vertex:Gg,beginnormal_vertex:Wg,bsdfs:Kg,iridescence_fragment:Xg,bumpmap_pars_fragment:qg,clipping_planes_fragment:Yg,clipping_planes_pars_fragment:$g,clipping_planes_pars_vertex:Zg,clipping_planes_vertex:Jg,color_fragment:jg,color_pars_fragment:Qg,color_pars_vertex:e0,color_vertex:t0,common:n0,cube_uv_reflection_fragment:i0,defaultnormal_vertex:s0,displacementmap_pars_vertex:r0,displacementmap_vertex:o0,emissivemap_fragment:a0,emissivemap_pars_fragment:l0,colorspace_fragment:c0,colorspace_pars_fragment:u0,envmap_fragment:h0,envmap_common_pars_fragment:d0,envmap_pars_fragment:f0,envmap_pars_vertex:p0,envmap_physical_pars_fragment:T0,envmap_vertex:m0,fog_vertex:g0,fog_pars_vertex:x0,fog_fragment:_0,fog_pars_fragment:y0,gradientmap_pars_fragment:v0,lightmap_pars_fragment:b0,lights_lambert_fragment:M0,lights_lambert_pars_fragment:S0,lights_pars_begin:w0,lights_toon_fragment:E0,lights_toon_pars_fragment:A0,lights_phong_fragment:C0,lights_phong_pars_fragment:R0,lights_physical_fragment:I0,lights_physical_pars_fragment:P0,lights_fragment_begin:L0,lights_fragment_maps:N0,lights_fragment_end:D0,logdepthbuf_fragment:U0,logdepthbuf_pars_fragment:F0,logdepthbuf_pars_vertex:O0,logdepthbuf_vertex:B0,map_fragment:k0,map_pars_fragment:z0,map_particle_fragment:H0,map_particle_pars_fragment:V0,metalnessmap_fragment:G0,metalnessmap_pars_fragment:W0,morphinstance_vertex:K0,morphcolor_vertex:X0,morphnormal_vertex:q0,morphtarget_pars_vertex:Y0,morphtarget_vertex:$0,normal_fragment_begin:Z0,normal_fragment_maps:J0,normal_pars_fragment:j0,normal_pars_vertex:Q0,normal_vertex:ex,normalmap_pars_fragment:tx,clearcoat_normal_fragment_begin:nx,clearcoat_normal_fragment_maps:ix,clearcoat_pars_fragment:sx,iridescence_pars_fragment:rx,opaque_fragment:ox,packing:ax,premultiplied_alpha_fragment:lx,project_vertex:cx,dithering_fragment:ux,dithering_pars_fragment:hx,roughnessmap_fragment:dx,roughnessmap_pars_fragment:fx,shadowmap_pars_fragment:px,shadowmap_pars_vertex:mx,shadowmap_vertex:gx,shadowmask_pars_fragment:xx,skinbase_vertex:_x,skinning_pars_vertex:yx,skinning_vertex:vx,skinnormal_vertex:bx,specularmap_fragment:Mx,specularmap_pars_fragment:Sx,tonemapping_fragment:wx,tonemapping_pars_fragment:Tx,transmission_fragment:Ex,transmission_pars_fragment:Ax,uv_pars_fragment:Cx,uv_pars_vertex:Rx,uv_vertex:Ix,worldpos_vertex:Px,background_vert:Lx,background_frag:Nx,backgroundCube_vert:Dx,backgroundCube_frag:Ux,cube_vert:Fx,cube_frag:Ox,depth_vert:Bx,depth_frag:kx,distance_vert:zx,distance_frag:Hx,equirect_vert:Vx,equirect_frag:Gx,linedashed_vert:Wx,linedashed_frag:Kx,meshbasic_vert:Xx,meshbasic_frag:qx,meshlambert_vert:Yx,meshlambert_frag:$x,meshmatcap_vert:Zx,meshmatcap_frag:Jx,meshnormal_vert:jx,meshnormal_frag:Qx,meshphong_vert:e_,meshphong_frag:t_,meshphysical_vert:n_,meshphysical_frag:i_,meshtoon_vert:s_,meshtoon_frag:r_,points_vert:o_,points_frag:a_,shadow_vert:l_,shadow_frag:c_,sprite_vert:u_,sprite_frag:h_},ce={common:{diffuse:{value:new Pe(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new He},alphaMap:{value:null},alphaMapTransform:{value:new He},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new He}},envmap:{envMap:{value:null},envMapRotation:{value:new He},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new He}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new He}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new He},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new He},normalScale:{value:new Ie(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new He},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new He}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new He}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new He}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Pe(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Pe(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new He},alphaTest:{value:0},uvTransform:{value:new He}},sprite:{diffuse:{value:new Pe(16777215)},opacity:{value:1},center:{value:new Ie(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new He},alphaMap:{value:null},alphaMapTransform:{value:new He},alphaTest:{value:0}}},di={basic:{uniforms:en([ce.common,ce.specularmap,ce.envmap,ce.aomap,ce.lightmap,ce.fog]),vertexShader:We.meshbasic_vert,fragmentShader:We.meshbasic_frag},lambert:{uniforms:en([ce.common,ce.specularmap,ce.envmap,ce.aomap,ce.lightmap,ce.emissivemap,ce.bumpmap,ce.normalmap,ce.displacementmap,ce.fog,ce.lights,{emissive:{value:new Pe(0)},envMapIntensity:{value:1}}]),vertexShader:We.meshlambert_vert,fragmentShader:We.meshlambert_frag},phong:{uniforms:en([ce.common,ce.specularmap,ce.envmap,ce.aomap,ce.lightmap,ce.emissivemap,ce.bumpmap,ce.normalmap,ce.displacementmap,ce.fog,ce.lights,{emissive:{value:new Pe(0)},specular:{value:new Pe(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:We.meshphong_vert,fragmentShader:We.meshphong_frag},standard:{uniforms:en([ce.common,ce.envmap,ce.aomap,ce.lightmap,ce.emissivemap,ce.bumpmap,ce.normalmap,ce.displacementmap,ce.roughnessmap,ce.metalnessmap,ce.fog,ce.lights,{emissive:{value:new Pe(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:We.meshphysical_vert,fragmentShader:We.meshphysical_frag},toon:{uniforms:en([ce.common,ce.aomap,ce.lightmap,ce.emissivemap,ce.bumpmap,ce.normalmap,ce.displacementmap,ce.gradientmap,ce.fog,ce.lights,{emissive:{value:new Pe(0)}}]),vertexShader:We.meshtoon_vert,fragmentShader:We.meshtoon_frag},matcap:{uniforms:en([ce.common,ce.bumpmap,ce.normalmap,ce.displacementmap,ce.fog,{matcap:{value:null}}]),vertexShader:We.meshmatcap_vert,fragmentShader:We.meshmatcap_frag},points:{uniforms:en([ce.points,ce.fog]),vertexShader:We.points_vert,fragmentShader:We.points_frag},dashed:{uniforms:en([ce.common,ce.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:We.linedashed_vert,fragmentShader:We.linedashed_frag},depth:{uniforms:en([ce.common,ce.displacementmap]),vertexShader:We.depth_vert,fragmentShader:We.depth_frag},normal:{uniforms:en([ce.common,ce.bumpmap,ce.normalmap,ce.displacementmap,{opacity:{value:1}}]),vertexShader:We.meshnormal_vert,fragmentShader:We.meshnormal_frag},sprite:{uniforms:en([ce.sprite,ce.fog]),vertexShader:We.sprite_vert,fragmentShader:We.sprite_frag},background:{uniforms:{uvTransform:{value:new He},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:We.background_vert,fragmentShader:We.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new He}},vertexShader:We.backgroundCube_vert,fragmentShader:We.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:We.cube_vert,fragmentShader:We.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:We.equirect_vert,fragmentShader:We.equirect_frag},distance:{uniforms:en([ce.common,ce.displacementmap,{referencePosition:{value:new L},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:We.distance_vert,fragmentShader:We.distance_frag},shadow:{uniforms:en([ce.lights,ce.fog,{color:{value:new Pe(0)},opacity:{value:1}}]),vertexShader:We.shadow_vert,fragmentShader:We.shadow_frag}};di.physical={uniforms:en([di.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new He},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new He},clearcoatNormalScale:{value:new Ie(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new He},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new He},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new He},sheen:{value:0},sheenColor:{value:new Pe(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new He},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new He},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new He},transmissionSamplerSize:{value:new Ie},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new He},attenuationDistance:{value:0},attenuationColor:{value:new Pe(0)},specularColor:{value:new Pe(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new He},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new He},anisotropyVector:{value:new Ie},anisotropyMap:{value:null},anisotropyMapTransform:{value:new He}}]),vertexShader:We.meshphysical_vert,fragmentShader:We.meshphysical_frag};var _c={r:0,b:0,g:0},zs=new zn,d_=new ze;function f_(i,e,t,n,s,r){let o=new Pe(0),a=s===!0?0:1,l,c,u=null,h=0,d=null;function f(M){let w=M.isScene===!0?M.background:null;if(w&&w.isTexture){let S=M.backgroundBlurriness>0;w=e.get(w,S)}return w}function g(M){let w=!1,S=f(M);S===null?m(o,a):S&&S.isColor&&(m(S,1),w=!0);let C=i.xr.getEnvironmentBlendMode();C==="additive"?t.buffers.color.setClear(0,0,0,1,r):C==="alpha-blend"&&t.buffers.color.setClear(0,0,0,0,r),(i.autoClear||w)&&(t.buffers.depth.setTest(!0),t.buffers.depth.setMask(!0),t.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function y(M,w){let S=f(w);S&&(S.isCubeTexture||S.mapping===Zo)?(c===void 0&&(c=new nt(new ii(1,1,1),new vn({name:"BackgroundCubeMaterial",uniforms:ks(di.backgroundCube.uniforms),vertexShader:di.backgroundCube.vertexShader,fragmentShader:di.backgroundCube.fragmentShader,side:on,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),c.geometry.deleteAttribute("uv"),c.onBeforeRender=function(C,A,R){this.matrixWorld.copyPosition(R.matrixWorld)},Object.defineProperty(c.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),n.update(c)),zs.copy(w.backgroundRotation),zs.x*=-1,zs.y*=-1,zs.z*=-1,S.isCubeTexture&&S.isRenderTargetTexture===!1&&(zs.y*=-1,zs.z*=-1),c.material.uniforms.envMap.value=S,c.material.uniforms.flipEnvMap.value=S.isCubeTexture&&S.isRenderTargetTexture===!1?-1:1,c.material.uniforms.backgroundBlurriness.value=w.backgroundBlurriness,c.material.uniforms.backgroundIntensity.value=w.backgroundIntensity,c.material.uniforms.backgroundRotation.value.setFromMatrix4(d_.makeRotationFromEuler(zs)),c.material.toneMapped=$e.getTransfer(S.colorSpace)!==tt,(u!==S||h!==S.version||d!==i.toneMapping)&&(c.material.needsUpdate=!0,u=S,h=S.version,d=i.toneMapping),c.layers.enableAll(),M.unshift(c,c.geometry,c.material,0,0,null)):S&&S.isTexture&&(l===void 0&&(l=new nt(new Ri(2,2),new vn({name:"BackgroundMaterial",uniforms:ks(di.background.uniforms),vertexShader:di.background.vertexShader,fragmentShader:di.background.fragmentShader,side:kn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),n.update(l)),l.material.uniforms.t2D.value=S,l.material.uniforms.backgroundIntensity.value=w.backgroundIntensity,l.material.toneMapped=$e.getTransfer(S.colorSpace)!==tt,S.matrixAutoUpdate===!0&&S.updateMatrix(),l.material.uniforms.uvTransform.value.copy(S.matrix),(u!==S||h!==S.version||d!==i.toneMapping)&&(l.material.needsUpdate=!0,u=S,h=S.version,d=i.toneMapping),l.layers.enableAll(),M.unshift(l,l.geometry,l.material,0,0,null))}function m(M,w){M.getRGB(_c,Ju(i)),t.buffers.color.setClear(_c.r,_c.g,_c.b,w,r)}function p(){c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return o},setClearColor:function(M,w=1){o.set(M),a=w,m(o,a)},getClearAlpha:function(){return a},setClearAlpha:function(M){a=M,m(o,a)},render:g,addToRenderList:y,dispose:p}}function p_(i,e){let t=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},s=d(null),r=s,o=!1;function a(I,F,O,V,G){let k=!1,H=h(I,V,O,F);r!==H&&(r=H,c(r.object)),k=f(I,V,O,G),k&&g(I,V,O,G),G!==null&&e.update(G,i.ELEMENT_ARRAY_BUFFER),(k||o)&&(o=!1,S(I,F,O,V),G!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,e.get(G).buffer))}function l(){return i.createVertexArray()}function c(I){return i.bindVertexArray(I)}function u(I){return i.deleteVertexArray(I)}function h(I,F,O,V){let G=V.wireframe===!0,k=n[F.id];k===void 0&&(k={},n[F.id]=k);let H=I.isInstancedMesh===!0?I.id:0,ne=k[H];ne===void 0&&(ne={},k[H]=ne);let j=ne[O.id];j===void 0&&(j={},ne[O.id]=j);let de=j[G];return de===void 0&&(de=d(l()),j[G]=de),de}function d(I){let F=[],O=[],V=[];for(let G=0;G<t;G++)F[G]=0,O[G]=0,V[G]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:F,enabledAttributes:O,attributeDivisors:V,object:I,attributes:{},index:null}}function f(I,F,O,V){let G=r.attributes,k=F.attributes,H=0,ne=O.getAttributes();for(let j in ne)if(ne[j].location>=0){let xe=G[j],pe=k[j];if(pe===void 0&&(j==="instanceMatrix"&&I.instanceMatrix&&(pe=I.instanceMatrix),j==="instanceColor"&&I.instanceColor&&(pe=I.instanceColor)),xe===void 0||xe.attribute!==pe||pe&&xe.data!==pe.data)return!0;H++}return r.attributesNum!==H||r.index!==V}function g(I,F,O,V){let G={},k=F.attributes,H=0,ne=O.getAttributes();for(let j in ne)if(ne[j].location>=0){let xe=k[j];xe===void 0&&(j==="instanceMatrix"&&I.instanceMatrix&&(xe=I.instanceMatrix),j==="instanceColor"&&I.instanceColor&&(xe=I.instanceColor));let pe={};pe.attribute=xe,xe&&xe.data&&(pe.data=xe.data),G[j]=pe,H++}r.attributes=G,r.attributesNum=H,r.index=V}function y(){let I=r.newAttributes;for(let F=0,O=I.length;F<O;F++)I[F]=0}function m(I){p(I,0)}function p(I,F){let O=r.newAttributes,V=r.enabledAttributes,G=r.attributeDivisors;O[I]=1,V[I]===0&&(i.enableVertexAttribArray(I),V[I]=1),G[I]!==F&&(i.vertexAttribDivisor(I,F),G[I]=F)}function M(){let I=r.newAttributes,F=r.enabledAttributes;for(let O=0,V=F.length;O<V;O++)F[O]!==I[O]&&(i.disableVertexAttribArray(O),F[O]=0)}function w(I,F,O,V,G,k,H){H===!0?i.vertexAttribIPointer(I,F,O,G,k):i.vertexAttribPointer(I,F,O,V,G,k)}function S(I,F,O,V){y();let G=V.attributes,k=O.getAttributes(),H=F.defaultAttributeValues;for(let ne in k){let j=k[ne];if(j.location>=0){let de=G[ne];if(de===void 0&&(ne==="instanceMatrix"&&I.instanceMatrix&&(de=I.instanceMatrix),ne==="instanceColor"&&I.instanceColor&&(de=I.instanceColor)),de!==void 0){let xe=de.normalized,pe=de.itemSize,Ge=e.get(de);if(Ge===void 0)continue;let xt=Ge.buffer,mt=Ge.type,Z=Ge.bytesPerElement,re=mt===i.INT||mt===i.UNSIGNED_INT||de.gpuType===Cl;if(de.isInterleavedBufferAttribute){let le=de.data,Ve=le.stride,De=de.offset;if(le.isInstancedInterleavedBuffer){for(let Fe=0;Fe<j.locationSize;Fe++)p(j.location+Fe,le.meshPerAttribute);I.isInstancedMesh!==!0&&V._maxInstanceCount===void 0&&(V._maxInstanceCount=le.meshPerAttribute*le.count)}else for(let Fe=0;Fe<j.locationSize;Fe++)m(j.location+Fe);i.bindBuffer(i.ARRAY_BUFFER,xt);for(let Fe=0;Fe<j.locationSize;Fe++)w(j.location+Fe,pe/j.locationSize,mt,xe,Ve*Z,(De+pe/j.locationSize*Fe)*Z,re)}else{if(de.isInstancedBufferAttribute){for(let le=0;le<j.locationSize;le++)p(j.location+le,de.meshPerAttribute);I.isInstancedMesh!==!0&&V._maxInstanceCount===void 0&&(V._maxInstanceCount=de.meshPerAttribute*de.count)}else for(let le=0;le<j.locationSize;le++)m(j.location+le);i.bindBuffer(i.ARRAY_BUFFER,xt);for(let le=0;le<j.locationSize;le++)w(j.location+le,pe/j.locationSize,mt,xe,pe*Z,pe/j.locationSize*le*Z,re)}}else if(H!==void 0){let xe=H[ne];if(xe!==void 0)switch(xe.length){case 2:i.vertexAttrib2fv(j.location,xe);break;case 3:i.vertexAttrib3fv(j.location,xe);break;case 4:i.vertexAttrib4fv(j.location,xe);break;default:i.vertexAttrib1fv(j.location,xe)}}}}M()}function C(){T();for(let I in n){let F=n[I];for(let O in F){let V=F[O];for(let G in V){let k=V[G];for(let H in k)u(k[H].object),delete k[H];delete V[G]}}delete n[I]}}function A(I){if(n[I.id]===void 0)return;let F=n[I.id];for(let O in F){let V=F[O];for(let G in V){let k=V[G];for(let H in k)u(k[H].object),delete k[H];delete V[G]}}delete n[I.id]}function R(I){for(let F in n){let O=n[F];for(let V in O){let G=O[V];if(G[I.id]===void 0)continue;let k=G[I.id];for(let H in k)u(k[H].object),delete k[H];delete G[I.id]}}}function v(I){for(let F in n){let O=n[F],V=I.isInstancedMesh===!0?I.id:0,G=O[V];if(G!==void 0){for(let k in G){let H=G[k];for(let ne in H)u(H[ne].object),delete H[ne];delete G[k]}delete O[V],Object.keys(O).length===0&&delete n[F]}}}function T(){K(),o=!0,r!==s&&(r=s,c(r.object))}function K(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:a,reset:T,resetDefaultState:K,dispose:C,releaseStatesOfGeometry:A,releaseStatesOfObject:v,releaseStatesOfProgram:R,initAttributes:y,enableAttribute:m,disableUnusedAttributes:M}}function m_(i,e,t){let n;function s(c){n=c}function r(c,u){i.drawArrays(n,c,u),t.update(u,n,1)}function o(c,u,h){h!==0&&(i.drawArraysInstanced(n,c,u,h),t.update(u,n,h))}function a(c,u,h){if(h===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,c,0,u,0,h);let f=0;for(let g=0;g<h;g++)f+=u[g];t.update(f,n,1)}function l(c,u,h,d){if(h===0)return;let f=e.get("WEBGL_multi_draw");if(f===null)for(let g=0;g<c.length;g++)o(c[g],u[g],d[g]);else{f.multiDrawArraysInstancedWEBGL(n,c,0,u,0,d,0,h);let g=0;for(let y=0;y<h;y++)g+=u[y]*d[y];t.update(g,n,1)}}this.setMode=s,this.render=r,this.renderInstances=o,this.renderMultiDraw=a,this.renderMultiDrawInstances=l}function g_(i,e,t,n){let s;function r(){if(s!==void 0)return s;if(e.has("EXT_texture_filter_anisotropic")===!0){let R=e.get("EXT_texture_filter_anisotropic");s=i.getParameter(R.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function o(R){return!(R!==Mn&&n.convert(R)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(R){let v=R===ui&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(R!==fn&&n.convert(R)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&R!==bn&&!v)}function l(R){if(R==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";R="mediump"}return R==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=t.precision!==void 0?t.precision:"highp",u=l(c);u!==c&&(Ee("WebGLRenderer:",c,"not supported, using",u,"instead."),c=u);let h=t.logarithmicDepthBuffer===!0,d=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control"),f=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),g=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),y=i.getParameter(i.MAX_TEXTURE_SIZE),m=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),p=i.getParameter(i.MAX_VERTEX_ATTRIBS),M=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),w=i.getParameter(i.MAX_VARYING_VECTORS),S=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),C=i.getParameter(i.MAX_SAMPLES),A=i.getParameter(i.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:o,textureTypeReadable:a,precision:c,logarithmicDepthBuffer:h,reversedDepthBuffer:d,maxTextures:f,maxVertexTextures:g,maxTextureSize:y,maxCubemapSize:m,maxAttributes:p,maxVertexUniforms:M,maxVaryings:w,maxFragmentUniforms:S,maxSamples:C,samples:A}}function x_(i){let e=this,t=null,n=0,s=!1,r=!1,o=new Qn,a=new He,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(h,d){let f=h.length!==0||d||n!==0||s;return s=d,n=h.length,f},this.beginShadows=function(){r=!0,u(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(h,d){t=u(h,d,0)},this.setState=function(h,d,f){let g=h.clippingPlanes,y=h.clipIntersection,m=h.clipShadows,p=i.get(h);if(!s||g===null||g.length===0||r&&!m)r?u(null):c();else{let M=r?0:n,w=M*4,S=p.clippingState||null;l.value=S,S=u(g,d,w,f);for(let C=0;C!==w;++C)S[C]=t[C];p.clippingState=S,this.numIntersection=y?this.numPlanes:0,this.numPlanes+=M}};function c(){l.value!==t&&(l.value=t,l.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function u(h,d,f,g){let y=h!==null?h.length:0,m=null;if(y!==0){if(m=l.value,g!==!0||m===null){let p=f+y*4,M=d.matrixWorldInverse;a.getNormalMatrix(M),(m===null||m.length<p)&&(m=new Float32Array(p));for(let w=0,S=f;w!==y;++w,S+=4)o.copy(h[w]).applyMatrix4(M,a),o.normal.toArray(m,S),m[S+3]=o.constant}l.value=m,l.needsUpdate=!0}return e.numPlanes=y,e.numIntersection=0,m}}var ss=4,rp=[.125,.215,.35,.446,.526,.582],Vs=20,__=256,na=new ts,op=new Pe,th=null,nh=0,ih=0,sh=!1,y_=new L,vc=class{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,n=.1,s=100,r={}){let{size:o=256,position:a=y_}=r;th=this._renderer.getRenderTarget(),nh=this._renderer.getActiveCubeFace(),ih=this._renderer.getActiveMipmapLevel(),sh=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(o);let l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(e,n,s,l,a),t>0&&this._blur(l,0,0,t),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=cp(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=lp(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(th,nh,ih),this._renderer.xr.enabled=sh,e.scissorTest=!1,Wr(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===ns||e.mapping===Fs?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),th=this._renderer.getRenderTarget(),nh=this._renderer.getActiveCubeFace(),ih=this._renderer.getActiveMipmapLevel(),sh=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){let e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:Tt,minFilter:Tt,generateMipmaps:!1,type:ui,format:Mn,colorSpace:Xt,depthBuffer:!1},s=ap(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=ap(e,t,n);let{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=v_(r)),this._blurMaterial=M_(r,e,t),this._ggxMaterial=b_(r,e,t)}return s}_compileMaterial(e){let t=new nt(new Pt,e);this._renderer.compile(t,na)}_sceneToCubeUV(e,t,n,s,r){let l=new Rt(90,1,t,n),c=[1,-1,1,1,1,1],u=[1,1,1,-1,-1,-1],h=this._renderer,d=h.autoClear,f=h.toneMapping;h.getClearColor(op),h.toneMapping=Hn,h.autoClear=!1,h.state.buffers.depth.getReversed()&&(h.setRenderTarget(s),h.clearDepth(),h.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new nt(new ii,new yn({name:"PMREM.Background",side:on,depthWrite:!1,depthTest:!1})));let y=this._backgroundBox,m=y.material,p=!1,M=e.background;M?M.isColor&&(m.color.copy(M),e.background=null,p=!0):(m.color.copy(op),p=!0);for(let w=0;w<6;w++){let S=w%3;S===0?(l.up.set(0,c[w],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x+u[w],r.y,r.z)):S===1?(l.up.set(0,0,c[w]),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y+u[w],r.z)):(l.up.set(0,c[w],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y,r.z+u[w]));let C=this._cubeSize;Wr(s,S*C,w>2?C:0,C,C),h.setRenderTarget(s),p&&h.render(y,l),h.render(e,l)}h.toneMapping=f,h.autoClear=d,e.background=M}_textureToCubeUV(e,t){let n=this._renderer,s=e.mapping===ns||e.mapping===Fs;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=cp()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=lp());let r=s?this._cubemapMaterial:this._equirectMaterial,o=this._lodMeshes[0];o.material=r;let a=r.uniforms;a.envMap.value=e;let l=this._cubeSize;Wr(t,0,0,3*l,2*l),n.setRenderTarget(t),n.render(o,na)}_applyPMREM(e){let t=this._renderer,n=t.autoClear;t.autoClear=!1;let s=this._lodMeshes.length;for(let r=1;r<s;r++)this._applyGGXFilter(e,r-1,r);t.autoClear=n}_applyGGXFilter(e,t,n){let s=this._renderer,r=this._pingPongRenderTarget,o=this._ggxMaterial,a=this._lodMeshes[n];a.material=o;let l=o.uniforms,c=n/(this._lodMeshes.length-1),u=t/(this._lodMeshes.length-1),h=Math.sqrt(c*c-u*u),d=0+c*1.25,f=h*d,{_lodMax:g}=this,y=this._sizeLods[n],m=3*y*(n>g-ss?n-g+ss:0),p=4*(this._cubeSize-y);l.envMap.value=e.texture,l.roughness.value=f,l.mipInt.value=g-t,Wr(r,m,p,3*y,2*y),s.setRenderTarget(r),s.render(a,na),l.envMap.value=r.texture,l.roughness.value=0,l.mipInt.value=g-n,Wr(e,m,p,3*y,2*y),s.setRenderTarget(e),s.render(a,na)}_blur(e,t,n,s,r){let o=this._pingPongRenderTarget;this._halfBlur(e,o,t,n,s,"latitudinal",r),this._halfBlur(o,e,n,n,s,"longitudinal",r)}_halfBlur(e,t,n,s,r,o,a){let l=this._renderer,c=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&Ne("blur direction must be either latitudinal or longitudinal!");let u=3,h=this._lodMeshes[s];h.material=c;let d=c.uniforms,f=this._sizeLods[n]-1,g=isFinite(r)?Math.PI/(2*f):2*Math.PI/(2*Vs-1),y=r/g,m=isFinite(r)?1+Math.floor(u*y):Vs;m>Vs&&Ee(`sigmaRadians, ${r}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${Vs}`);let p=[],M=0;for(let R=0;R<Vs;++R){let v=R/y,T=Math.exp(-v*v/2);p.push(T),R===0?M+=T:R<m&&(M+=2*T)}for(let R=0;R<p.length;R++)p[R]=p[R]/M;d.envMap.value=e.texture,d.samples.value=m,d.weights.value=p,d.latitudinal.value=o==="latitudinal",a&&(d.poleAxis.value=a);let{_lodMax:w}=this;d.dTheta.value=g,d.mipInt.value=w-n;let S=this._sizeLods[s],C=3*S*(s>w-ss?s-w+ss:0),A=4*(this._cubeSize-S);Wr(t,C,A,3*S,2*S),l.setRenderTarget(t),l.render(h,na)}};function v_(i){let e=[],t=[],n=[],s=i,r=i-ss+1+rp.length;for(let o=0;o<r;o++){let a=Math.pow(2,s);e.push(a);let l=1/a;o>i-ss?l=rp[o-i+ss-1]:o===0&&(l=0),t.push(l);let c=1/(a-2),u=-c,h=1+c,d=[u,u,h,u,h,h,u,u,h,h,u,h],f=6,g=6,y=3,m=2,p=1,M=new Float32Array(y*g*f),w=new Float32Array(m*g*f),S=new Float32Array(p*g*f);for(let A=0;A<f;A++){let R=A%3*2/3-1,v=A>2?0:-1,T=[R,v,0,R+2/3,v,0,R+2/3,v+1,0,R,v,0,R+2/3,v+1,0,R,v+1,0];M.set(T,y*g*A),w.set(d,m*g*A);let K=[A,A,A,A,A,A];S.set(K,p*g*A)}let C=new Pt;C.setAttribute("position",new It(M,y)),C.setAttribute("uv",new It(w,m)),C.setAttribute("faceIndex",new It(S,p)),n.push(new nt(C,null)),s>ss&&s--}return{lodMeshes:n,sizeLods:e,sigmas:t}}function ap(i,e,t){let n=new _n(i,e,t);return n.texture.mapping=Zo,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function Wr(i,e,t,n,s){i.viewport.set(e,t,n,s),i.scissor.set(e,t,n,s)}function b_(i,e,t){return new vn({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:__,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:Sc(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:ci,depthTest:!1,depthWrite:!1})}function M_(i,e,t){let n=new Float32Array(Vs),s=new L(0,1,0);return new vn({name:"SphericalGaussianBlur",defines:{n:Vs,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:s}},vertexShader:Sc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:ci,depthTest:!1,depthWrite:!1})}function lp(){return new vn({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Sc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:ci,depthTest:!1,depthWrite:!1})}function cp(){return new vn({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Sc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:ci,depthTest:!1,depthWrite:!1})}function Sc(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}var bc=class extends _n{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;let n={width:e,height:e,depth:1},s=[n,n,n,n,n,n];this.texture=new No(s),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},s=new ii(5,5,5),r=new vn({name:"CubemapFromEquirect",uniforms:ks(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:on,blending:ci});r.uniforms.tEquirect.value=t;let o=new nt(s,r),a=t.minFilter;return t.minFilter===Vn&&(t.minFilter=Tt),new vl(1,10,this).update(e,o),t.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(e,t=!0,n=!0,s=!0){let r=e.getRenderTarget();for(let o=0;o<6;o++)e.setRenderTarget(this,o),e.clear(t,n,s);e.setRenderTarget(r)}};function S_(i){let e=new WeakMap,t=new WeakMap,n=null;function s(d,f=!1){return d==null?null:f?o(d):r(d)}function r(d){if(d&&d.isTexture){let f=d.mapping;if(f===Tl||f===El)if(e.has(d)){let g=e.get(d).texture;return a(g,d.mapping)}else{let g=d.image;if(g&&g.height>0){let y=new bc(g.height);return y.fromEquirectangularTexture(i,d),e.set(d,y),d.addEventListener("dispose",c),a(y.texture,d.mapping)}else return null}}return d}function o(d){if(d&&d.isTexture){let f=d.mapping,g=f===Tl||f===El,y=f===ns||f===Fs;if(g||y){let m=t.get(d),p=m!==void 0?m.texture.pmremVersion:0;if(d.isRenderTargetTexture&&d.pmremVersion!==p)return n===null&&(n=new vc(i)),m=g?n.fromEquirectangular(d,m):n.fromCubemap(d,m),m.texture.pmremVersion=d.pmremVersion,t.set(d,m),m.texture;if(m!==void 0)return m.texture;{let M=d.image;return g&&M&&M.height>0||y&&M&&l(M)?(n===null&&(n=new vc(i)),m=g?n.fromEquirectangular(d):n.fromCubemap(d),m.texture.pmremVersion=d.pmremVersion,t.set(d,m),d.addEventListener("dispose",u),m.texture):null}}}return d}function a(d,f){return f===Tl?d.mapping=ns:f===El&&(d.mapping=Fs),d}function l(d){let f=0,g=6;for(let y=0;y<g;y++)d[y]!==void 0&&f++;return f===g}function c(d){let f=d.target;f.removeEventListener("dispose",c);let g=e.get(f);g!==void 0&&(e.delete(f),g.dispose())}function u(d){let f=d.target;f.removeEventListener("dispose",u);let g=t.get(f);g!==void 0&&(t.delete(f),g.dispose())}function h(){e=new WeakMap,t=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:s,dispose:h}}function w_(i){let e={};function t(n){if(e[n]!==void 0)return e[n];let s=i.getExtension(n);return e[n]=s,s}return{has:function(n){return t(n)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(n){let s=t(n);return s===null&&vo("WebGLRenderer: "+n+" extension not supported."),s}}}function T_(i,e,t,n){let s={},r=new WeakMap;function o(h){let d=h.target;d.index!==null&&e.remove(d.index);for(let g in d.attributes)e.remove(d.attributes[g]);d.removeEventListener("dispose",o),delete s[d.id];let f=r.get(d);f&&(e.remove(f),r.delete(d)),n.releaseStatesOfGeometry(d),d.isInstancedBufferGeometry===!0&&delete d._maxInstanceCount,t.memory.geometries--}function a(h,d){return s[d.id]===!0||(d.addEventListener("dispose",o),s[d.id]=!0,t.memory.geometries++),d}function l(h){let d=h.attributes;for(let f in d)e.update(d[f],i.ARRAY_BUFFER)}function c(h){let d=[],f=h.index,g=h.attributes.position,y=0;if(g===void 0)return;if(f!==null){let M=f.array;y=f.version;for(let w=0,S=M.length;w<S;w+=3){let C=M[w+0],A=M[w+1],R=M[w+2];d.push(C,A,A,R,R,C)}}else{let M=g.array;y=g.version;for(let w=0,S=M.length/3-1;w<S;w+=3){let C=w+0,A=w+1,R=w+2;d.push(C,A,A,R,R,C)}}let m=new(g.count>=65535?Eo:To)(d,1);m.version=y;let p=r.get(h);p&&e.remove(p),r.set(h,m)}function u(h){let d=r.get(h);if(d){let f=h.index;f!==null&&d.version<f.version&&c(h)}else c(h);return r.get(h)}return{get:a,update:l,getWireframeAttribute:u}}function E_(i,e,t){let n;function s(d){n=d}let r,o;function a(d){r=d.type,o=d.bytesPerElement}function l(d,f){i.drawElements(n,f,r,d*o),t.update(f,n,1)}function c(d,f,g){g!==0&&(i.drawElementsInstanced(n,f,r,d*o,g),t.update(f,n,g))}function u(d,f,g){if(g===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,f,0,r,d,0,g);let m=0;for(let p=0;p<g;p++)m+=f[p];t.update(m,n,1)}function h(d,f,g,y){if(g===0)return;let m=e.get("WEBGL_multi_draw");if(m===null)for(let p=0;p<d.length;p++)c(d[p]/o,f[p],y[p]);else{m.multiDrawElementsInstancedWEBGL(n,f,0,r,d,0,y,0,g);let p=0;for(let M=0;M<g;M++)p+=f[M]*y[M];t.update(p,n,1)}}this.setMode=s,this.setIndex=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=u,this.renderMultiDrawInstances=h}function A_(i){let e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,o,a){switch(t.calls++,o){case i.TRIANGLES:t.triangles+=a*(r/3);break;case i.LINES:t.lines+=a*(r/2);break;case i.LINE_STRIP:t.lines+=a*(r-1);break;case i.LINE_LOOP:t.lines+=a*r;break;case i.POINTS:t.points+=a*r;break;default:Ne("WebGLInfo: Unknown draw mode:",o);break}}function s(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:s,update:n}}function C_(i,e,t){let n=new WeakMap,s=new pt;function r(o,a,l){let c=o.morphTargetInfluences,u=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,h=u!==void 0?u.length:0,d=n.get(a);if(d===void 0||d.count!==h){let T=function(){R.dispose(),n.delete(a),a.removeEventListener("dispose",T)};d!==void 0&&d.texture.dispose();let f=a.morphAttributes.position!==void 0,g=a.morphAttributes.normal!==void 0,y=a.morphAttributes.color!==void 0,m=a.morphAttributes.position||[],p=a.morphAttributes.normal||[],M=a.morphAttributes.color||[],w=0;f===!0&&(w=1),g===!0&&(w=2),y===!0&&(w=3);let S=a.attributes.position.count*w,C=1;S>e.maxTextureSize&&(C=Math.ceil(S/e.maxTextureSize),S=e.maxTextureSize);let A=new Float32Array(S*C*4*h),R=new bo(A,S,C,h);R.type=bn,R.needsUpdate=!0;let v=w*4;for(let K=0;K<h;K++){let I=m[K],F=p[K],O=M[K],V=S*C*4*K;for(let G=0;G<I.count;G++){let k=G*v;f===!0&&(s.fromBufferAttribute(I,G),A[V+k+0]=s.x,A[V+k+1]=s.y,A[V+k+2]=s.z,A[V+k+3]=0),g===!0&&(s.fromBufferAttribute(F,G),A[V+k+4]=s.x,A[V+k+5]=s.y,A[V+k+6]=s.z,A[V+k+7]=0),y===!0&&(s.fromBufferAttribute(O,G),A[V+k+8]=s.x,A[V+k+9]=s.y,A[V+k+10]=s.z,A[V+k+11]=O.itemSize===4?s.w:1)}}d={count:h,texture:R,size:new Ie(S,C)},n.set(a,d),a.addEventListener("dispose",T)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)l.getUniforms().setValue(i,"morphTexture",o.morphTexture,t);else{let f=0;for(let y=0;y<c.length;y++)f+=c[y];let g=a.morphTargetsRelative?1:1-f;l.getUniforms().setValue(i,"morphTargetBaseInfluence",g),l.getUniforms().setValue(i,"morphTargetInfluences",c)}l.getUniforms().setValue(i,"morphTargetsTexture",d.texture,t),l.getUniforms().setValue(i,"morphTargetsTextureSize",d.size)}return{update:r}}function R_(i,e,t,n,s){let r=new WeakMap;function o(c){let u=s.render.frame,h=c.geometry,d=e.get(c,h);if(r.get(d)!==u&&(e.update(d),r.set(d,u)),c.isInstancedMesh&&(c.hasEventListener("dispose",l)===!1&&c.addEventListener("dispose",l),r.get(c)!==u&&(t.update(c.instanceMatrix,i.ARRAY_BUFFER),c.instanceColor!==null&&t.update(c.instanceColor,i.ARRAY_BUFFER),r.set(c,u))),c.isSkinnedMesh){let f=c.skeleton;r.get(f)!==u&&(f.update(),r.set(f,u))}return d}function a(){r=new WeakMap}function l(c){let u=c.target;u.removeEventListener("dispose",l),n.releaseStatesOfObject(u),t.remove(u.instanceMatrix),u.instanceColor!==null&&t.remove(u.instanceColor)}return{update:o,dispose:a}}var I_={[Du]:"LINEAR_TONE_MAPPING",[Uu]:"REINHARD_TONE_MAPPING",[Fu]:"CINEON_TONE_MAPPING",[$o]:"ACES_FILMIC_TONE_MAPPING",[Bu]:"AGX_TONE_MAPPING",[ku]:"NEUTRAL_TONE_MAPPING",[Ou]:"CUSTOM_TONE_MAPPING"};function P_(i,e,t,n,s){let r=new _n(e,t,{type:i,depthBuffer:n,stencilBuffer:s}),o=new _n(e,t,{type:ui,depthBuffer:!1,stencilBuffer:!1}),a=new Pt;a.setAttribute("position",new ht([-1,3,0,-1,-1,0,3,-1,0],3)),a.setAttribute("uv",new ht([0,2,0,0,2,0],2));let l=new hl({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),c=new nt(a,l),u=new ts(-1,1,1,-1,0,1),h=null,d=null,f=!1,g,y=null,m=[],p=!1;this.setSize=function(M,w){r.setSize(M,w),o.setSize(M,w);for(let S=0;S<m.length;S++){let C=m[S];C.setSize&&C.setSize(M,w)}},this.setEffects=function(M){m=M,p=m.length>0&&m[0].isRenderPass===!0;let w=r.width,S=r.height;for(let C=0;C<m.length;C++){let A=m[C];A.setSize&&A.setSize(w,S)}},this.begin=function(M,w){if(f||M.toneMapping===Hn&&m.length===0)return!1;if(y=w,w!==null){let S=w.width,C=w.height;(r.width!==S||r.height!==C)&&this.setSize(S,C)}return p===!1&&M.setRenderTarget(r),g=M.toneMapping,M.toneMapping=Hn,!0},this.hasRenderPass=function(){return p},this.end=function(M,w){M.toneMapping=g,f=!0;let S=r,C=o;for(let A=0;A<m.length;A++){let R=m[A];if(R.enabled!==!1&&(R.render(M,C,S,w),R.needsSwap!==!1)){let v=S;S=C,C=v}}if(h!==M.outputColorSpace||d!==M.toneMapping){h=M.outputColorSpace,d=M.toneMapping,l.defines={},$e.getTransfer(h)===tt&&(l.defines.SRGB_TRANSFER="");let A=I_[d];A&&(l.defines[A]=""),l.needsUpdate=!0}l.uniforms.tDiffuse.value=S.texture,M.setRenderTarget(y),M.render(c,u),y=null,f=!1},this.isCompositing=function(){return f},this.dispose=function(){r.dispose(),o.dispose(),a.dispose(),l.dispose()}}var Cp=new Ut,ah=new es(1,1),Rp=new bo,Ip=new al,Pp=new No,up=[],hp=[],dp=new Float32Array(16),fp=new Float32Array(9),pp=new Float32Array(4);function Xr(i,e,t){let n=i[0];if(n<=0||n>0)return i;let s=e*t,r=up[s];if(r===void 0&&(r=new Float32Array(s),up[s]=r),e!==0){n.toArray(r,0);for(let o=1,a=0;o!==e;++o)a+=t,i[o].toArray(r,a)}return r}function Ft(i,e){if(i.length!==e.length)return!1;for(let t=0,n=i.length;t<n;t++)if(i[t]!==e[t])return!1;return!0}function Ot(i,e){for(let t=0,n=e.length;t<n;t++)i[t]=e[t]}function wc(i,e){let t=hp[e];t===void 0&&(t=new Int32Array(e),hp[e]=t);for(let n=0;n!==e;++n)t[n]=i.allocateTextureUnit();return t}function L_(i,e){let t=this.cache;t[0]!==e&&(i.uniform1f(this.addr,e),t[0]=e)}function N_(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Ft(t,e))return;i.uniform2fv(this.addr,e),Ot(t,e)}}function D_(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(i.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(Ft(t,e))return;i.uniform3fv(this.addr,e),Ot(t,e)}}function U_(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Ft(t,e))return;i.uniform4fv(this.addr,e),Ot(t,e)}}function F_(i,e){let t=this.cache,n=e.elements;if(n===void 0){if(Ft(t,e))return;i.uniformMatrix2fv(this.addr,!1,e),Ot(t,e)}else{if(Ft(t,n))return;pp.set(n),i.uniformMatrix2fv(this.addr,!1,pp),Ot(t,n)}}function O_(i,e){let t=this.cache,n=e.elements;if(n===void 0){if(Ft(t,e))return;i.uniformMatrix3fv(this.addr,!1,e),Ot(t,e)}else{if(Ft(t,n))return;fp.set(n),i.uniformMatrix3fv(this.addr,!1,fp),Ot(t,n)}}function B_(i,e){let t=this.cache,n=e.elements;if(n===void 0){if(Ft(t,e))return;i.uniformMatrix4fv(this.addr,!1,e),Ot(t,e)}else{if(Ft(t,n))return;dp.set(n),i.uniformMatrix4fv(this.addr,!1,dp),Ot(t,n)}}function k_(i,e){let t=this.cache;t[0]!==e&&(i.uniform1i(this.addr,e),t[0]=e)}function z_(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Ft(t,e))return;i.uniform2iv(this.addr,e),Ot(t,e)}}function H_(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Ft(t,e))return;i.uniform3iv(this.addr,e),Ot(t,e)}}function V_(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Ft(t,e))return;i.uniform4iv(this.addr,e),Ot(t,e)}}function G_(i,e){let t=this.cache;t[0]!==e&&(i.uniform1ui(this.addr,e),t[0]=e)}function W_(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Ft(t,e))return;i.uniform2uiv(this.addr,e),Ot(t,e)}}function K_(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Ft(t,e))return;i.uniform3uiv(this.addr,e),Ot(t,e)}}function X_(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Ft(t,e))return;i.uniform4uiv(this.addr,e),Ot(t,e)}}function q_(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s);let r;this.type===i.SAMPLER_2D_SHADOW?(ah.compareFunction=t.isReversedDepthBuffer()?xc:gc,r=ah):r=Cp,t.setTexture2D(e||r,s)}function Y_(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTexture3D(e||Ip,s)}function $_(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTextureCube(e||Pp,s)}function Z_(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTexture2DArray(e||Rp,s)}function J_(i){switch(i){case 5126:return L_;case 35664:return N_;case 35665:return D_;case 35666:return U_;case 35674:return F_;case 35675:return O_;case 35676:return B_;case 5124:case 35670:return k_;case 35667:case 35671:return z_;case 35668:case 35672:return H_;case 35669:case 35673:return V_;case 5125:return G_;case 36294:return W_;case 36295:return K_;case 36296:return X_;case 35678:case 36198:case 36298:case 36306:case 35682:return q_;case 35679:case 36299:case 36307:return Y_;case 35680:case 36300:case 36308:case 36293:return $_;case 36289:case 36303:case 36311:case 36292:return Z_}}function j_(i,e){i.uniform1fv(this.addr,e)}function Q_(i,e){let t=Xr(e,this.size,2);i.uniform2fv(this.addr,t)}function ey(i,e){let t=Xr(e,this.size,3);i.uniform3fv(this.addr,t)}function ty(i,e){let t=Xr(e,this.size,4);i.uniform4fv(this.addr,t)}function ny(i,e){let t=Xr(e,this.size,4);i.uniformMatrix2fv(this.addr,!1,t)}function iy(i,e){let t=Xr(e,this.size,9);i.uniformMatrix3fv(this.addr,!1,t)}function sy(i,e){let t=Xr(e,this.size,16);i.uniformMatrix4fv(this.addr,!1,t)}function ry(i,e){i.uniform1iv(this.addr,e)}function oy(i,e){i.uniform2iv(this.addr,e)}function ay(i,e){i.uniform3iv(this.addr,e)}function ly(i,e){i.uniform4iv(this.addr,e)}function cy(i,e){i.uniform1uiv(this.addr,e)}function uy(i,e){i.uniform2uiv(this.addr,e)}function hy(i,e){i.uniform3uiv(this.addr,e)}function dy(i,e){i.uniform4uiv(this.addr,e)}function fy(i,e,t){let n=this.cache,s=e.length,r=wc(t,s);Ft(n,r)||(i.uniform1iv(this.addr,r),Ot(n,r));let o;this.type===i.SAMPLER_2D_SHADOW?o=ah:o=Cp;for(let a=0;a!==s;++a)t.setTexture2D(e[a]||o,r[a])}function py(i,e,t){let n=this.cache,s=e.length,r=wc(t,s);Ft(n,r)||(i.uniform1iv(this.addr,r),Ot(n,r));for(let o=0;o!==s;++o)t.setTexture3D(e[o]||Ip,r[o])}function my(i,e,t){let n=this.cache,s=e.length,r=wc(t,s);Ft(n,r)||(i.uniform1iv(this.addr,r),Ot(n,r));for(let o=0;o!==s;++o)t.setTextureCube(e[o]||Pp,r[o])}function gy(i,e,t){let n=this.cache,s=e.length,r=wc(t,s);Ft(n,r)||(i.uniform1iv(this.addr,r),Ot(n,r));for(let o=0;o!==s;++o)t.setTexture2DArray(e[o]||Rp,r[o])}function xy(i){switch(i){case 5126:return j_;case 35664:return Q_;case 35665:return ey;case 35666:return ty;case 35674:return ny;case 35675:return iy;case 35676:return sy;case 5124:case 35670:return ry;case 35667:case 35671:return oy;case 35668:case 35672:return ay;case 35669:case 35673:return ly;case 5125:return cy;case 36294:return uy;case 36295:return hy;case 36296:return dy;case 35678:case 36198:case 36298:case 36306:case 35682:return fy;case 35679:case 36299:case 36307:return py;case 35680:case 36300:case 36308:case 36293:return my;case 36289:case 36303:case 36311:case 36292:return gy}}var lh=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=J_(t.type)}},ch=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=xy(t.type)}},uh=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){let s=this.seq;for(let r=0,o=s.length;r!==o;++r){let a=s[r];a.setValue(e,t[a.id],n)}}},rh=/(\w+)(\])?(\[|\.)?/g;function mp(i,e){i.seq.push(e),i.map[e.id]=e}function _y(i,e,t){let n=i.name,s=n.length;for(rh.lastIndex=0;;){let r=rh.exec(n),o=rh.lastIndex,a=r[1],l=r[2]==="]",c=r[3];if(l&&(a=a|0),c===void 0||c==="["&&o+2===s){mp(t,c===void 0?new lh(a,i,e):new ch(a,i,e));break}else{let h=t.map[a];h===void 0&&(h=new uh(a),mp(t,h)),t=h}}}var Kr=class{constructor(e,t){this.seq=[],this.map={};let n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let o=0;o<n;++o){let a=e.getActiveUniform(t,o),l=e.getUniformLocation(t,a.name);_y(a,l,this)}let s=[],r=[];for(let o of this.seq)o.type===e.SAMPLER_2D_SHADOW||o.type===e.SAMPLER_CUBE_SHADOW||o.type===e.SAMPLER_2D_ARRAY_SHADOW?s.push(o):r.push(o);s.length>0&&(this.seq=s.concat(r))}setValue(e,t,n,s){let r=this.map[t];r!==void 0&&r.setValue(e,n,s)}setOptional(e,t,n){let s=t[n];s!==void 0&&this.setValue(e,n,s)}static upload(e,t,n,s){for(let r=0,o=t.length;r!==o;++r){let a=t[r],l=n[a.id];l.needsUpdate!==!1&&a.setValue(e,l.value,s)}}static seqWithValue(e,t){let n=[];for(let s=0,r=e.length;s!==r;++s){let o=e[s];o.id in t&&n.push(o)}return n}};function gp(i,e,t){let n=i.createShader(e);return i.shaderSource(n,t),i.compileShader(n),n}var yy=37297,vy=0;function by(i,e){let t=i.split(`
`),n=[],s=Math.max(e-6,0),r=Math.min(e+6,t.length);for(let o=s;o<r;o++){let a=o+1;n.push(`${a===e?">":" "} ${a}: ${t[o]}`)}return n.join(`
`)}var xp=new He;function My(i){$e._getMatrix(xp,$e.workingColorSpace,i);let e=`mat3( ${xp.elements.map(t=>t.toFixed(4))} )`;switch($e.getTransfer(i)){case _o:return[e,"LinearTransferOETF"];case tt:return[e,"sRGBTransferOETF"];default:return Ee("WebGLProgram: Unsupported color space: ",i),[e,"LinearTransferOETF"]}}function _p(i,e,t){let n=i.getShaderParameter(e,i.COMPILE_STATUS),r=(i.getShaderInfoLog(e)||"").trim();if(n&&r==="")return"";let o=/ERROR: 0:(\d+)/.exec(r);if(o){let a=parseInt(o[1]);return t.toUpperCase()+`

`+r+`

`+by(i.getShaderSource(e),a)}else return r}function Sy(i,e){let t=My(e);return[`vec4 ${i}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}var wy={[Du]:"Linear",[Uu]:"Reinhard",[Fu]:"Cineon",[$o]:"ACESFilmic",[Bu]:"AgX",[ku]:"Neutral",[Ou]:"Custom"};function Ty(i,e){let t=wy[e];return t===void 0?(Ee("WebGLProgram: Unsupported toneMapping:",e),"vec3 "+i+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+i+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}var yc=new L;function Ey(){$e.getLuminanceCoefficients(yc);let i=yc.x.toFixed(4),e=yc.y.toFixed(4),t=yc.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Ay(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(sa).join(`
`)}function Cy(i){let e=[];for(let t in i){let n=i[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function Ry(i,e){let t={},n=i.getProgramParameter(e,i.ACTIVE_ATTRIBUTES);for(let s=0;s<n;s++){let r=i.getActiveAttrib(e,s),o=r.name,a=1;r.type===i.FLOAT_MAT2&&(a=2),r.type===i.FLOAT_MAT3&&(a=3),r.type===i.FLOAT_MAT4&&(a=4),t[o]={type:r.type,location:i.getAttribLocation(e,o),locationSize:a}}return t}function sa(i){return i!==""}function yp(i,e){let t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function vp(i,e){return i.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}var Iy=/^[ \t]*#include +<([\w\d./]+)>/gm;function hh(i){return i.replace(Iy,Ly)}var Py=new Map;function Ly(i,e){let t=We[e];if(t===void 0){let n=Py.get(e);if(n!==void 0)t=We[n],Ee('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,n);else throw new Error("Can not resolve #include <"+e+">")}return hh(t)}var Ny=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function bp(i){return i.replace(Ny,Dy)}function Dy(i,e,t,n){let s="";for(let r=parseInt(e);r<parseInt(t);r++)s+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function Mp(i){let e=`precision ${i.precision} float;
	precision ${i.precision} int;
	precision ${i.precision} sampler2D;
	precision ${i.precision} samplerCube;
	precision ${i.precision} sampler3D;
	precision ${i.precision} sampler2DArray;
	precision ${i.precision} sampler2DShadow;
	precision ${i.precision} samplerCubeShadow;
	precision ${i.precision} sampler2DArrayShadow;
	precision ${i.precision} isampler2D;
	precision ${i.precision} isampler3D;
	precision ${i.precision} isamplerCube;
	precision ${i.precision} isampler2DArray;
	precision ${i.precision} usampler2D;
	precision ${i.precision} usampler3D;
	precision ${i.precision} usamplerCube;
	precision ${i.precision} usampler2DArray;
	`;return i.precision==="highp"?e+=`
#define HIGH_PRECISION`:i.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:i.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}var Uy={[Yo]:"SHADOWMAP_TYPE_PCF",[kr]:"SHADOWMAP_TYPE_VSM"};function Fy(i){return Uy[i.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}var Oy={[ns]:"ENVMAP_TYPE_CUBE",[Fs]:"ENVMAP_TYPE_CUBE",[Zo]:"ENVMAP_TYPE_CUBE_UV"};function By(i){return i.envMap===!1?"ENVMAP_TYPE_CUBE":Oy[i.envMapMode]||"ENVMAP_TYPE_CUBE"}var ky={[Fs]:"ENVMAP_MODE_REFRACTION"};function zy(i){return i.envMap===!1?"ENVMAP_MODE_REFLECTION":ky[i.envMapMode]||"ENVMAP_MODE_REFLECTION"}var Hy={[Nu]:"ENVMAP_BLENDING_MULTIPLY",[Of]:"ENVMAP_BLENDING_MIX",[Bf]:"ENVMAP_BLENDING_ADD"};function Vy(i){return i.envMap===!1?"ENVMAP_BLENDING_NONE":Hy[i.combine]||"ENVMAP_BLENDING_NONE"}function Gy(i){let e=i.envMapCubeUVHeight;if(e===null)return null;let t=Math.log2(e)-2,n=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:n,maxMip:t}}function Wy(i,e,t,n){let s=i.getContext(),r=t.defines,o=t.vertexShader,a=t.fragmentShader,l=Fy(t),c=By(t),u=zy(t),h=Vy(t),d=Gy(t),f=Ay(t),g=Cy(r),y=s.createProgram(),m,p,M=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(m=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(sa).join(`
`),m.length>0&&(m+=`
`),p=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(sa).join(`
`),p.length>0&&(p+=`
`)):(m=[Mp(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+u:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(sa).join(`
`),p=[Mp(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+c:"",t.envMap?"#define "+u:"",t.envMap?"#define "+h:"",d?"#define CUBEUV_TEXEL_WIDTH "+d.texelWidth:"",d?"#define CUBEUV_TEXEL_HEIGHT "+d.texelHeight:"",d?"#define CUBEUV_MAX_MIP "+d.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas||t.batchingColor?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==Hn?"#define TONE_MAPPING":"",t.toneMapping!==Hn?We.tonemapping_pars_fragment:"",t.toneMapping!==Hn?Ty("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",We.colorspace_pars_fragment,Sy("linearToOutputTexel",t.outputColorSpace),Ey(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(sa).join(`
`)),o=hh(o),o=yp(o,t),o=vp(o,t),a=hh(a),a=yp(a,t),a=vp(a,t),o=bp(o),a=bp(a),t.isRawShaderMaterial!==!0&&(M=`#version 300 es
`,m=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+m,p=["#define varying in",t.glslVersion===$u?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===$u?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);let w=M+m+o,S=M+p+a,C=gp(s,s.VERTEX_SHADER,w),A=gp(s,s.FRAGMENT_SHADER,S);s.attachShader(y,C),s.attachShader(y,A),t.index0AttributeName!==void 0?s.bindAttribLocation(y,0,t.index0AttributeName):t.morphTargets===!0&&s.bindAttribLocation(y,0,"position"),s.linkProgram(y);function R(I){if(i.debug.checkShaderErrors){let F=s.getProgramInfoLog(y)||"",O=s.getShaderInfoLog(C)||"",V=s.getShaderInfoLog(A)||"",G=F.trim(),k=O.trim(),H=V.trim(),ne=!0,j=!0;if(s.getProgramParameter(y,s.LINK_STATUS)===!1)if(ne=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(s,y,C,A);else{let de=_p(s,C,"vertex"),xe=_p(s,A,"fragment");Ne("THREE.WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(y,s.VALIDATE_STATUS)+`

Material Name: `+I.name+`
Material Type: `+I.type+`

Program Info Log: `+G+`
`+de+`
`+xe)}else G!==""?Ee("WebGLProgram: Program Info Log:",G):(k===""||H==="")&&(j=!1);j&&(I.diagnostics={runnable:ne,programLog:G,vertexShader:{log:k,prefix:m},fragmentShader:{log:H,prefix:p}})}s.deleteShader(C),s.deleteShader(A),v=new Kr(s,y),T=Ry(s,y)}let v;this.getUniforms=function(){return v===void 0&&R(this),v};let T;this.getAttributes=function(){return T===void 0&&R(this),T};let K=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return K===!1&&(K=s.getProgramParameter(y,yy)),K},this.destroy=function(){n.releaseStatesOfProgram(this),s.deleteProgram(y),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=vy++,this.cacheKey=e,this.usedTimes=1,this.program=y,this.vertexShader=C,this.fragmentShader=A,this}var Ky=0,dh=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){let t=e.vertexShader,n=e.fragmentShader,s=this._getShaderStage(t),r=this._getShaderStage(n),o=this._getShaderCacheForMaterial(e);return o.has(s)===!1&&(o.add(s),s.usedTimes++),o.has(r)===!1&&(o.add(r),r.usedTimes++),this}remove(e){let t=this.materialCache.get(e);for(let n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let t=this.materialCache,n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){let t=this.shaderCache,n=t.get(e);return n===void 0&&(n=new fh(e),t.set(e,n)),n}},fh=class{constructor(e){this.id=Ky++,this.code=e,this.usedTimes=0}};function Xy(i,e,t,n,s,r){let o=new Mo,a=new dh,l=new Set,c=[],u=new Map,h=n.logarithmicDepthBuffer,d=n.precision,f={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function g(v){return l.add(v),v===0?"uv":`uv${v}`}function y(v,T,K,I,F){let O=I.fog,V=F.geometry,G=v.isMeshStandardMaterial||v.isMeshLambertMaterial||v.isMeshPhongMaterial?I.environment:null,k=v.isMeshStandardMaterial||v.isMeshLambertMaterial&&!v.envMap||v.isMeshPhongMaterial&&!v.envMap,H=e.get(v.envMap||G,k),ne=H&&H.mapping===Zo?H.image.height:null,j=f[v.type];v.precision!==null&&(d=n.getMaxPrecision(v.precision),d!==v.precision&&Ee("WebGLProgram.getParameters:",v.precision,"not supported, using",d,"instead."));let de=V.morphAttributes.position||V.morphAttributes.normal||V.morphAttributes.color,xe=de!==void 0?de.length:0,pe=0;V.morphAttributes.position!==void 0&&(pe=1),V.morphAttributes.normal!==void 0&&(pe=2),V.morphAttributes.color!==void 0&&(pe=3);let Ge,xt,mt,Z;if(j){let st=di[j];Ge=st.vertexShader,xt=st.fragmentShader}else Ge=v.vertexShader,xt=v.fragmentShader,a.update(v),mt=a.getVertexShaderID(v),Z=a.getFragmentShaderID(v);let re=i.getRenderTarget(),le=i.state.buffers.depth.getReversed(),Ve=F.isInstancedMesh===!0,De=F.isBatchedMesh===!0,Fe=!!v.map,zt=!!v.matcap,je=!!H,it=!!v.aoMap,ct=!!v.lightMap,Ke=!!v.bumpMap,Mt=!!v.normalMap,P=!!v.displacementMap,At=!!v.emissiveMap,et=!!v.metalnessMap,dt=!!v.roughnessMap,we=v.anisotropy>0,E=v.clearcoat>0,x=v.dispersion>0,D=v.iridescence>0,$=v.sheen>0,J=v.transmission>0,Y=we&&!!v.anisotropyMap,ye=E&&!!v.clearcoatMap,oe=E&&!!v.clearcoatNormalMap,Re=E&&!!v.clearcoatRoughnessMap,Ue=D&&!!v.iridescenceMap,ee=D&&!!v.iridescenceThicknessMap,ie=$&&!!v.sheenColorMap,ve=$&&!!v.sheenRoughnessMap,Me=!!v.specularMap,fe=!!v.specularColorMap,Xe=!!v.specularIntensityMap,N=J&&!!v.transmissionMap,ae=J&&!!v.thicknessMap,se=!!v.gradientMap,ge=!!v.alphaMap,te=v.alphaTest>0,X=!!v.alphaHash,be=!!v.extensions,Oe=Hn;v.toneMapped&&(re===null||re.isXRRenderTarget===!0)&&(Oe=i.toneMapping);let ft={shaderID:j,shaderType:v.type,shaderName:v.name,vertexShader:Ge,fragmentShader:xt,defines:v.defines,customVertexShaderID:mt,customFragmentShaderID:Z,isRawShaderMaterial:v.isRawShaderMaterial===!0,glslVersion:v.glslVersion,precision:d,batching:De,batchingColor:De&&F._colorsTexture!==null,instancing:Ve,instancingColor:Ve&&F.instanceColor!==null,instancingMorph:Ve&&F.morphTexture!==null,outputColorSpace:re===null?i.outputColorSpace:re.isXRRenderTarget===!0?re.texture.colorSpace:Xt,alphaToCoverage:!!v.alphaToCoverage,map:Fe,matcap:zt,envMap:je,envMapMode:je&&H.mapping,envMapCubeUVHeight:ne,aoMap:it,lightMap:ct,bumpMap:Ke,normalMap:Mt,displacementMap:P,emissiveMap:At,normalMapObjectSpace:Mt&&v.normalMapType===Gf,normalMapTangentSpace:Mt&&v.normalMapType===Yu,metalnessMap:et,roughnessMap:dt,anisotropy:we,anisotropyMap:Y,clearcoat:E,clearcoatMap:ye,clearcoatNormalMap:oe,clearcoatRoughnessMap:Re,dispersion:x,iridescence:D,iridescenceMap:Ue,iridescenceThicknessMap:ee,sheen:$,sheenColorMap:ie,sheenRoughnessMap:ve,specularMap:Me,specularColorMap:fe,specularIntensityMap:Xe,transmission:J,transmissionMap:N,thicknessMap:ae,gradientMap:se,opaque:v.transparent===!1&&v.blending===ws&&v.alphaToCoverage===!1,alphaMap:ge,alphaTest:te,alphaHash:X,combine:v.combine,mapUv:Fe&&g(v.map.channel),aoMapUv:it&&g(v.aoMap.channel),lightMapUv:ct&&g(v.lightMap.channel),bumpMapUv:Ke&&g(v.bumpMap.channel),normalMapUv:Mt&&g(v.normalMap.channel),displacementMapUv:P&&g(v.displacementMap.channel),emissiveMapUv:At&&g(v.emissiveMap.channel),metalnessMapUv:et&&g(v.metalnessMap.channel),roughnessMapUv:dt&&g(v.roughnessMap.channel),anisotropyMapUv:Y&&g(v.anisotropyMap.channel),clearcoatMapUv:ye&&g(v.clearcoatMap.channel),clearcoatNormalMapUv:oe&&g(v.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Re&&g(v.clearcoatRoughnessMap.channel),iridescenceMapUv:Ue&&g(v.iridescenceMap.channel),iridescenceThicknessMapUv:ee&&g(v.iridescenceThicknessMap.channel),sheenColorMapUv:ie&&g(v.sheenColorMap.channel),sheenRoughnessMapUv:ve&&g(v.sheenRoughnessMap.channel),specularMapUv:Me&&g(v.specularMap.channel),specularColorMapUv:fe&&g(v.specularColorMap.channel),specularIntensityMapUv:Xe&&g(v.specularIntensityMap.channel),transmissionMapUv:N&&g(v.transmissionMap.channel),thicknessMapUv:ae&&g(v.thicknessMap.channel),alphaMapUv:ge&&g(v.alphaMap.channel),vertexTangents:!!V.attributes.tangent&&(Mt||we),vertexColors:v.vertexColors,vertexAlphas:v.vertexColors===!0&&!!V.attributes.color&&V.attributes.color.itemSize===4,pointsUvs:F.isPoints===!0&&!!V.attributes.uv&&(Fe||ge),fog:!!O,useFog:v.fog===!0,fogExp2:!!O&&O.isFogExp2,flatShading:v.wireframe===!1&&(v.flatShading===!0||V.attributes.normal===void 0&&Mt===!1&&(v.isMeshLambertMaterial||v.isMeshPhongMaterial||v.isMeshStandardMaterial||v.isMeshPhysicalMaterial)),sizeAttenuation:v.sizeAttenuation===!0,logarithmicDepthBuffer:h,reversedDepthBuffer:le,skinning:F.isSkinnedMesh===!0,morphTargets:V.morphAttributes.position!==void 0,morphNormals:V.morphAttributes.normal!==void 0,morphColors:V.morphAttributes.color!==void 0,morphTargetsCount:xe,morphTextureStride:pe,numDirLights:T.directional.length,numPointLights:T.point.length,numSpotLights:T.spot.length,numSpotLightMaps:T.spotLightMap.length,numRectAreaLights:T.rectArea.length,numHemiLights:T.hemi.length,numDirLightShadows:T.directionalShadowMap.length,numPointLightShadows:T.pointShadowMap.length,numSpotLightShadows:T.spotShadowMap.length,numSpotLightShadowsWithMaps:T.numSpotLightShadowsWithMaps,numLightProbes:T.numLightProbes,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:v.dithering,shadowMapEnabled:i.shadowMap.enabled&&K.length>0,shadowMapType:i.shadowMap.type,toneMapping:Oe,decodeVideoTexture:Fe&&v.map.isVideoTexture===!0&&$e.getTransfer(v.map.colorSpace)===tt,decodeVideoTextureEmissive:At&&v.emissiveMap.isVideoTexture===!0&&$e.getTransfer(v.emissiveMap.colorSpace)===tt,premultipliedAlpha:v.premultipliedAlpha,doubleSided:v.side===An,flipSided:v.side===on,useDepthPacking:v.depthPacking>=0,depthPacking:v.depthPacking||0,index0AttributeName:v.index0AttributeName,extensionClipCullDistance:be&&v.extensions.clipCullDistance===!0&&t.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(be&&v.extensions.multiDraw===!0||De)&&t.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:t.has("KHR_parallel_shader_compile"),customProgramCacheKey:v.customProgramCacheKey()};return ft.vertexUv1s=l.has(1),ft.vertexUv2s=l.has(2),ft.vertexUv3s=l.has(3),l.clear(),ft}function m(v){let T=[];if(v.shaderID?T.push(v.shaderID):(T.push(v.customVertexShaderID),T.push(v.customFragmentShaderID)),v.defines!==void 0)for(let K in v.defines)T.push(K),T.push(v.defines[K]);return v.isRawShaderMaterial===!1&&(p(T,v),M(T,v),T.push(i.outputColorSpace)),T.push(v.customProgramCacheKey),T.join()}function p(v,T){v.push(T.precision),v.push(T.outputColorSpace),v.push(T.envMapMode),v.push(T.envMapCubeUVHeight),v.push(T.mapUv),v.push(T.alphaMapUv),v.push(T.lightMapUv),v.push(T.aoMapUv),v.push(T.bumpMapUv),v.push(T.normalMapUv),v.push(T.displacementMapUv),v.push(T.emissiveMapUv),v.push(T.metalnessMapUv),v.push(T.roughnessMapUv),v.push(T.anisotropyMapUv),v.push(T.clearcoatMapUv),v.push(T.clearcoatNormalMapUv),v.push(T.clearcoatRoughnessMapUv),v.push(T.iridescenceMapUv),v.push(T.iridescenceThicknessMapUv),v.push(T.sheenColorMapUv),v.push(T.sheenRoughnessMapUv),v.push(T.specularMapUv),v.push(T.specularColorMapUv),v.push(T.specularIntensityMapUv),v.push(T.transmissionMapUv),v.push(T.thicknessMapUv),v.push(T.combine),v.push(T.fogExp2),v.push(T.sizeAttenuation),v.push(T.morphTargetsCount),v.push(T.morphAttributeCount),v.push(T.numDirLights),v.push(T.numPointLights),v.push(T.numSpotLights),v.push(T.numSpotLightMaps),v.push(T.numHemiLights),v.push(T.numRectAreaLights),v.push(T.numDirLightShadows),v.push(T.numPointLightShadows),v.push(T.numSpotLightShadows),v.push(T.numSpotLightShadowsWithMaps),v.push(T.numLightProbes),v.push(T.shadowMapType),v.push(T.toneMapping),v.push(T.numClippingPlanes),v.push(T.numClipIntersection),v.push(T.depthPacking)}function M(v,T){o.disableAll(),T.instancing&&o.enable(0),T.instancingColor&&o.enable(1),T.instancingMorph&&o.enable(2),T.matcap&&o.enable(3),T.envMap&&o.enable(4),T.normalMapObjectSpace&&o.enable(5),T.normalMapTangentSpace&&o.enable(6),T.clearcoat&&o.enable(7),T.iridescence&&o.enable(8),T.alphaTest&&o.enable(9),T.vertexColors&&o.enable(10),T.vertexAlphas&&o.enable(11),T.vertexUv1s&&o.enable(12),T.vertexUv2s&&o.enable(13),T.vertexUv3s&&o.enable(14),T.vertexTangents&&o.enable(15),T.anisotropy&&o.enable(16),T.alphaHash&&o.enable(17),T.batching&&o.enable(18),T.dispersion&&o.enable(19),T.batchingColor&&o.enable(20),T.gradientMap&&o.enable(21),v.push(o.mask),o.disableAll(),T.fog&&o.enable(0),T.useFog&&o.enable(1),T.flatShading&&o.enable(2),T.logarithmicDepthBuffer&&o.enable(3),T.reversedDepthBuffer&&o.enable(4),T.skinning&&o.enable(5),T.morphTargets&&o.enable(6),T.morphNormals&&o.enable(7),T.morphColors&&o.enable(8),T.premultipliedAlpha&&o.enable(9),T.shadowMapEnabled&&o.enable(10),T.doubleSided&&o.enable(11),T.flipSided&&o.enable(12),T.useDepthPacking&&o.enable(13),T.dithering&&o.enable(14),T.transmission&&o.enable(15),T.sheen&&o.enable(16),T.opaque&&o.enable(17),T.pointsUvs&&o.enable(18),T.decodeVideoTexture&&o.enable(19),T.decodeVideoTextureEmissive&&o.enable(20),T.alphaToCoverage&&o.enable(21),v.push(o.mask)}function w(v){let T=f[v.type],K;if(T){let I=di[T];K=np.clone(I.uniforms)}else K=v.uniforms;return K}function S(v,T){let K=u.get(T);return K!==void 0?++K.usedTimes:(K=new Wy(i,T,v,s),c.push(K),u.set(T,K)),K}function C(v){if(--v.usedTimes===0){let T=c.indexOf(v);c[T]=c[c.length-1],c.pop(),u.delete(v.cacheKey),v.destroy()}}function A(v){a.remove(v)}function R(){a.dispose()}return{getParameters:y,getProgramCacheKey:m,getUniforms:w,acquireProgram:S,releaseProgram:C,releaseShaderCache:A,programs:c,dispose:R}}function qy(){let i=new WeakMap;function e(o){return i.has(o)}function t(o){let a=i.get(o);return a===void 0&&(a={},i.set(o,a)),a}function n(o){i.delete(o)}function s(o,a,l){i.get(o)[a]=l}function r(){i=new WeakMap}return{has:e,get:t,remove:n,update:s,dispose:r}}function Yy(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.material.id!==e.material.id?i.material.id-e.material.id:i.materialVariant!==e.materialVariant?i.materialVariant-e.materialVariant:i.z!==e.z?i.z-e.z:i.id-e.id}function Sp(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.z!==e.z?e.z-i.z:i.id-e.id}function wp(){let i=[],e=0,t=[],n=[],s=[];function r(){e=0,t.length=0,n.length=0,s.length=0}function o(d){let f=0;return d.isInstancedMesh&&(f+=2),d.isSkinnedMesh&&(f+=1),f}function a(d,f,g,y,m,p){let M=i[e];return M===void 0?(M={id:d.id,object:d,geometry:f,material:g,materialVariant:o(d),groupOrder:y,renderOrder:d.renderOrder,z:m,group:p},i[e]=M):(M.id=d.id,M.object=d,M.geometry=f,M.material=g,M.materialVariant=o(d),M.groupOrder=y,M.renderOrder=d.renderOrder,M.z=m,M.group=p),e++,M}function l(d,f,g,y,m,p){let M=a(d,f,g,y,m,p);g.transmission>0?n.push(M):g.transparent===!0?s.push(M):t.push(M)}function c(d,f,g,y,m,p){let M=a(d,f,g,y,m,p);g.transmission>0?n.unshift(M):g.transparent===!0?s.unshift(M):t.unshift(M)}function u(d,f){t.length>1&&t.sort(d||Yy),n.length>1&&n.sort(f||Sp),s.length>1&&s.sort(f||Sp)}function h(){for(let d=e,f=i.length;d<f;d++){let g=i[d];if(g.id===null)break;g.id=null,g.object=null,g.geometry=null,g.material=null,g.group=null}}return{opaque:t,transmissive:n,transparent:s,init:r,push:l,unshift:c,finish:h,sort:u}}function $y(){let i=new WeakMap;function e(n,s){let r=i.get(n),o;return r===void 0?(o=new wp,i.set(n,[o])):s>=r.length?(o=new wp,r.push(o)):o=r[s],o}function t(){i=new WeakMap}return{get:e,dispose:t}}function Zy(){let i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new L,color:new Pe};break;case"SpotLight":t={position:new L,direction:new L,color:new Pe,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new L,color:new Pe,distance:0,decay:0};break;case"HemisphereLight":t={direction:new L,skyColor:new Pe,groundColor:new Pe};break;case"RectAreaLight":t={color:new Pe,position:new L,halfWidth:new L,halfHeight:new L};break}return i[e.id]=t,t}}}function Jy(){let i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ie};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ie};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ie,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[e.id]=t,t}}}var jy=0;function Qy(i,e){return(e.castShadow?2:0)-(i.castShadow?2:0)+(e.map?1:0)-(i.map?1:0)}function ev(i){let e=new Zy,t=Jy(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)n.probe.push(new L);let s=new L,r=new ze,o=new ze;function a(c){let u=0,h=0,d=0;for(let T=0;T<9;T++)n.probe[T].set(0,0,0);let f=0,g=0,y=0,m=0,p=0,M=0,w=0,S=0,C=0,A=0,R=0;c.sort(Qy);for(let T=0,K=c.length;T<K;T++){let I=c[T],F=I.color,O=I.intensity,V=I.distance,G=null;if(I.shadow&&I.shadow.map&&(I.shadow.map.texture.format===Bs?G=I.shadow.map.texture:G=I.shadow.map.depthTexture||I.shadow.map.texture),I.isAmbientLight)u+=F.r*O,h+=F.g*O,d+=F.b*O;else if(I.isLightProbe){for(let k=0;k<9;k++)n.probe[k].addScaledVector(I.sh.coefficients[k],O);R++}else if(I.isDirectionalLight){let k=e.get(I);if(k.color.copy(I.color).multiplyScalar(I.intensity),I.castShadow){let H=I.shadow,ne=t.get(I);ne.shadowIntensity=H.intensity,ne.shadowBias=H.bias,ne.shadowNormalBias=H.normalBias,ne.shadowRadius=H.radius,ne.shadowMapSize=H.mapSize,n.directionalShadow[f]=ne,n.directionalShadowMap[f]=G,n.directionalShadowMatrix[f]=I.shadow.matrix,M++}n.directional[f]=k,f++}else if(I.isSpotLight){let k=e.get(I);k.position.setFromMatrixPosition(I.matrixWorld),k.color.copy(F).multiplyScalar(O),k.distance=V,k.coneCos=Math.cos(I.angle),k.penumbraCos=Math.cos(I.angle*(1-I.penumbra)),k.decay=I.decay,n.spot[y]=k;let H=I.shadow;if(I.map&&(n.spotLightMap[C]=I.map,C++,H.updateMatrices(I),I.castShadow&&A++),n.spotLightMatrix[y]=H.matrix,I.castShadow){let ne=t.get(I);ne.shadowIntensity=H.intensity,ne.shadowBias=H.bias,ne.shadowNormalBias=H.normalBias,ne.shadowRadius=H.radius,ne.shadowMapSize=H.mapSize,n.spotShadow[y]=ne,n.spotShadowMap[y]=G,S++}y++}else if(I.isRectAreaLight){let k=e.get(I);k.color.copy(F).multiplyScalar(O),k.halfWidth.set(I.width*.5,0,0),k.halfHeight.set(0,I.height*.5,0),n.rectArea[m]=k,m++}else if(I.isPointLight){let k=e.get(I);if(k.color.copy(I.color).multiplyScalar(I.intensity),k.distance=I.distance,k.decay=I.decay,I.castShadow){let H=I.shadow,ne=t.get(I);ne.shadowIntensity=H.intensity,ne.shadowBias=H.bias,ne.shadowNormalBias=H.normalBias,ne.shadowRadius=H.radius,ne.shadowMapSize=H.mapSize,ne.shadowCameraNear=H.camera.near,ne.shadowCameraFar=H.camera.far,n.pointShadow[g]=ne,n.pointShadowMap[g]=G,n.pointShadowMatrix[g]=I.shadow.matrix,w++}n.point[g]=k,g++}else if(I.isHemisphereLight){let k=e.get(I);k.skyColor.copy(I.color).multiplyScalar(O),k.groundColor.copy(I.groundColor).multiplyScalar(O),n.hemi[p]=k,p++}}m>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=ce.LTC_FLOAT_1,n.rectAreaLTC2=ce.LTC_FLOAT_2):(n.rectAreaLTC1=ce.LTC_HALF_1,n.rectAreaLTC2=ce.LTC_HALF_2)),n.ambient[0]=u,n.ambient[1]=h,n.ambient[2]=d;let v=n.hash;(v.directionalLength!==f||v.pointLength!==g||v.spotLength!==y||v.rectAreaLength!==m||v.hemiLength!==p||v.numDirectionalShadows!==M||v.numPointShadows!==w||v.numSpotShadows!==S||v.numSpotMaps!==C||v.numLightProbes!==R)&&(n.directional.length=f,n.spot.length=y,n.rectArea.length=m,n.point.length=g,n.hemi.length=p,n.directionalShadow.length=M,n.directionalShadowMap.length=M,n.pointShadow.length=w,n.pointShadowMap.length=w,n.spotShadow.length=S,n.spotShadowMap.length=S,n.directionalShadowMatrix.length=M,n.pointShadowMatrix.length=w,n.spotLightMatrix.length=S+C-A,n.spotLightMap.length=C,n.numSpotLightShadowsWithMaps=A,n.numLightProbes=R,v.directionalLength=f,v.pointLength=g,v.spotLength=y,v.rectAreaLength=m,v.hemiLength=p,v.numDirectionalShadows=M,v.numPointShadows=w,v.numSpotShadows=S,v.numSpotMaps=C,v.numLightProbes=R,n.version=jy++)}function l(c,u){let h=0,d=0,f=0,g=0,y=0,m=u.matrixWorldInverse;for(let p=0,M=c.length;p<M;p++){let w=c[p];if(w.isDirectionalLight){let S=n.directional[h];S.direction.setFromMatrixPosition(w.matrixWorld),s.setFromMatrixPosition(w.target.matrixWorld),S.direction.sub(s),S.direction.transformDirection(m),h++}else if(w.isSpotLight){let S=n.spot[f];S.position.setFromMatrixPosition(w.matrixWorld),S.position.applyMatrix4(m),S.direction.setFromMatrixPosition(w.matrixWorld),s.setFromMatrixPosition(w.target.matrixWorld),S.direction.sub(s),S.direction.transformDirection(m),f++}else if(w.isRectAreaLight){let S=n.rectArea[g];S.position.setFromMatrixPosition(w.matrixWorld),S.position.applyMatrix4(m),o.identity(),r.copy(w.matrixWorld),r.premultiply(m),o.extractRotation(r),S.halfWidth.set(w.width*.5,0,0),S.halfHeight.set(0,w.height*.5,0),S.halfWidth.applyMatrix4(o),S.halfHeight.applyMatrix4(o),g++}else if(w.isPointLight){let S=n.point[d];S.position.setFromMatrixPosition(w.matrixWorld),S.position.applyMatrix4(m),d++}else if(w.isHemisphereLight){let S=n.hemi[y];S.direction.setFromMatrixPosition(w.matrixWorld),S.direction.transformDirection(m),y++}}}return{setup:a,setupView:l,state:n}}function Tp(i){let e=new ev(i),t=[],n=[];function s(u){c.camera=u,t.length=0,n.length=0}function r(u){t.push(u)}function o(u){n.push(u)}function a(){e.setup(t)}function l(u){e.setupView(t,u)}let c={lightsArray:t,shadowsArray:n,camera:null,lights:e,transmissionRenderTarget:{}};return{init:s,state:c,setupLights:a,setupLightsView:l,pushLight:r,pushShadow:o}}function tv(i){let e=new WeakMap;function t(s,r=0){let o=e.get(s),a;return o===void 0?(a=new Tp(i),e.set(s,[a])):r>=o.length?(a=new Tp(i),o.push(a)):a=o[r],a}function n(){e=new WeakMap}return{get:t,dispose:n}}var nv=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,iv=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,sv=[new L(1,0,0),new L(-1,0,0),new L(0,1,0),new L(0,-1,0),new L(0,0,1),new L(0,0,-1)],rv=[new L(0,-1,0),new L(0,-1,0),new L(0,0,1),new L(0,0,-1),new L(0,-1,0),new L(0,-1,0)],Ep=new ze,ia=new L,oh=new L;function ov(i,e,t){let n=new Lr,s=new Ie,r=new Ie,o=new pt,a=new dl,l=new fl,c={},u=t.maxTextureSize,h={[kn]:on,[on]:kn,[An]:An},d=new vn({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Ie},radius:{value:4}},vertexShader:nv,fragmentShader:iv}),f=d.clone();f.defines.HORIZONTAL_PASS=1;let g=new Pt;g.setAttribute("position",new It(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let y=new nt(g,d),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Yo;let p=this.type;this.render=function(A,R,v){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||A.length===0)return;this.type===wl&&(Ee("WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead."),this.type=Yo);let T=i.getRenderTarget(),K=i.getActiveCubeFace(),I=i.getActiveMipmapLevel(),F=i.state;F.setBlending(ci),F.buffers.depth.getReversed()===!0?F.buffers.color.setClear(0,0,0,0):F.buffers.color.setClear(1,1,1,1),F.buffers.depth.setTest(!0),F.setScissorTest(!1);let O=p!==this.type;O&&R.traverse(function(V){V.material&&(Array.isArray(V.material)?V.material.forEach(G=>G.needsUpdate=!0):V.material.needsUpdate=!0)});for(let V=0,G=A.length;V<G;V++){let k=A[V],H=k.shadow;if(H===void 0){Ee("WebGLShadowMap:",k,"has no shadow.");continue}if(H.autoUpdate===!1&&H.needsUpdate===!1)continue;s.copy(H.mapSize);let ne=H.getFrameExtents();s.multiply(ne),r.copy(H.mapSize),(s.x>u||s.y>u)&&(s.x>u&&(r.x=Math.floor(u/ne.x),s.x=r.x*ne.x,H.mapSize.x=r.x),s.y>u&&(r.y=Math.floor(u/ne.y),s.y=r.y*ne.y,H.mapSize.y=r.y));let j=i.state.buffers.depth.getReversed();if(H.camera._reversedDepth=j,H.map===null||O===!0){if(H.map!==null&&(H.map.depthTexture!==null&&(H.map.depthTexture.dispose(),H.map.depthTexture=null),H.map.dispose()),this.type===kr){if(k.isPointLight){Ee("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}H.map=new _n(s.x,s.y,{format:Bs,type:ui,minFilter:Tt,magFilter:Tt,generateMipmaps:!1}),H.map.texture.name=k.name+".shadowMap",H.map.depthTexture=new es(s.x,s.y,bn),H.map.depthTexture.name=k.name+".shadowMapDepth",H.map.depthTexture.format=ti,H.map.depthTexture.compareFunction=null,H.map.depthTexture.minFilter=wt,H.map.depthTexture.magFilter=wt}else k.isPointLight?(H.map=new bc(s.x),H.map.depthTexture=new ul(s.x,Gn)):(H.map=new _n(s.x,s.y),H.map.depthTexture=new es(s.x,s.y,Gn)),H.map.depthTexture.name=k.name+".shadowMap",H.map.depthTexture.format=ti,this.type===Yo?(H.map.depthTexture.compareFunction=j?xc:gc,H.map.depthTexture.minFilter=Tt,H.map.depthTexture.magFilter=Tt):(H.map.depthTexture.compareFunction=null,H.map.depthTexture.minFilter=wt,H.map.depthTexture.magFilter=wt);H.camera.updateProjectionMatrix()}let de=H.map.isWebGLCubeRenderTarget?6:1;for(let xe=0;xe<de;xe++){if(H.map.isWebGLCubeRenderTarget)i.setRenderTarget(H.map,xe),i.clear();else{xe===0&&(i.setRenderTarget(H.map),i.clear());let pe=H.getViewport(xe);o.set(r.x*pe.x,r.y*pe.y,r.x*pe.z,r.y*pe.w),F.viewport(o)}if(k.isPointLight){let pe=H.camera,Ge=H.matrix,xt=k.distance||pe.far;xt!==pe.far&&(pe.far=xt,pe.updateProjectionMatrix()),ia.setFromMatrixPosition(k.matrixWorld),pe.position.copy(ia),oh.copy(pe.position),oh.add(sv[xe]),pe.up.copy(rv[xe]),pe.lookAt(oh),pe.updateMatrixWorld(),Ge.makeTranslation(-ia.x,-ia.y,-ia.z),Ep.multiplyMatrices(pe.projectionMatrix,pe.matrixWorldInverse),H._frustum.setFromProjectionMatrix(Ep,pe.coordinateSystem,pe.reversedDepth)}else H.updateMatrices(k);n=H.getFrustum(),S(R,v,H.camera,k,this.type)}H.isPointLightShadow!==!0&&this.type===kr&&M(H,v),H.needsUpdate=!1}p=this.type,m.needsUpdate=!1,i.setRenderTarget(T,K,I)};function M(A,R){let v=e.update(y);d.defines.VSM_SAMPLES!==A.blurSamples&&(d.defines.VSM_SAMPLES=A.blurSamples,f.defines.VSM_SAMPLES=A.blurSamples,d.needsUpdate=!0,f.needsUpdate=!0),A.mapPass===null&&(A.mapPass=new _n(s.x,s.y,{format:Bs,type:ui})),d.uniforms.shadow_pass.value=A.map.depthTexture,d.uniforms.resolution.value=A.mapSize,d.uniforms.radius.value=A.radius,i.setRenderTarget(A.mapPass),i.clear(),i.renderBufferDirect(R,null,v,d,y,null),f.uniforms.shadow_pass.value=A.mapPass.texture,f.uniforms.resolution.value=A.mapSize,f.uniforms.radius.value=A.radius,i.setRenderTarget(A.map),i.clear(),i.renderBufferDirect(R,null,v,f,y,null)}function w(A,R,v,T){let K=null,I=v.isPointLight===!0?A.customDistanceMaterial:A.customDepthMaterial;if(I!==void 0)K=I;else if(K=v.isPointLight===!0?l:a,i.localClippingEnabled&&R.clipShadows===!0&&Array.isArray(R.clippingPlanes)&&R.clippingPlanes.length!==0||R.displacementMap&&R.displacementScale!==0||R.alphaMap&&R.alphaTest>0||R.map&&R.alphaTest>0||R.alphaToCoverage===!0){let F=K.uuid,O=R.uuid,V=c[F];V===void 0&&(V={},c[F]=V);let G=V[O];G===void 0&&(G=K.clone(),V[O]=G,R.addEventListener("dispose",C)),K=G}if(K.visible=R.visible,K.wireframe=R.wireframe,T===kr?K.side=R.shadowSide!==null?R.shadowSide:R.side:K.side=R.shadowSide!==null?R.shadowSide:h[R.side],K.alphaMap=R.alphaMap,K.alphaTest=R.alphaToCoverage===!0?.5:R.alphaTest,K.map=R.map,K.clipShadows=R.clipShadows,K.clippingPlanes=R.clippingPlanes,K.clipIntersection=R.clipIntersection,K.displacementMap=R.displacementMap,K.displacementScale=R.displacementScale,K.displacementBias=R.displacementBias,K.wireframeLinewidth=R.wireframeLinewidth,K.linewidth=R.linewidth,v.isPointLight===!0&&K.isMeshDistanceMaterial===!0){let F=i.properties.get(K);F.light=v}return K}function S(A,R,v,T,K){if(A.visible===!1)return;if(A.layers.test(R.layers)&&(A.isMesh||A.isLine||A.isPoints)&&(A.castShadow||A.receiveShadow&&K===kr)&&(!A.frustumCulled||n.intersectsObject(A))){A.modelViewMatrix.multiplyMatrices(v.matrixWorldInverse,A.matrixWorld);let O=e.update(A),V=A.material;if(Array.isArray(V)){let G=O.groups;for(let k=0,H=G.length;k<H;k++){let ne=G[k],j=V[ne.materialIndex];if(j&&j.visible){let de=w(A,j,T,K);A.onBeforeShadow(i,A,R,v,O,de,ne),i.renderBufferDirect(v,null,O,de,A,ne),A.onAfterShadow(i,A,R,v,O,de,ne)}}}else if(V.visible){let G=w(A,V,T,K);A.onBeforeShadow(i,A,R,v,O,G,null),i.renderBufferDirect(v,null,O,G,A,null),A.onAfterShadow(i,A,R,v,O,G,null)}}let F=A.children;for(let O=0,V=F.length;O<V;O++)S(F[O],R,v,T,K)}function C(A){A.target.removeEventListener("dispose",C);for(let v in c){let T=c[v],K=A.target.uuid;K in T&&(T[K].dispose(),delete T[K])}}}function av(i,e){function t(){let N=!1,ae=new pt,se=null,ge=new pt(0,0,0,0);return{setMask:function(te){se!==te&&!N&&(i.colorMask(te,te,te,te),se=te)},setLocked:function(te){N=te},setClear:function(te,X,be,Oe,ft){ft===!0&&(te*=Oe,X*=Oe,be*=Oe),ae.set(te,X,be,Oe),ge.equals(ae)===!1&&(i.clearColor(te,X,be,Oe),ge.copy(ae))},reset:function(){N=!1,se=null,ge.set(-1,0,0,0)}}}function n(){let N=!1,ae=!1,se=null,ge=null,te=null;return{setReversed:function(X){if(ae!==X){let be=e.get("EXT_clip_control");X?be.clipControlEXT(be.LOWER_LEFT_EXT,be.ZERO_TO_ONE_EXT):be.clipControlEXT(be.LOWER_LEFT_EXT,be.NEGATIVE_ONE_TO_ONE_EXT),ae=X;let Oe=te;te=null,this.setClear(Oe)}},getReversed:function(){return ae},setTest:function(X){X?re(i.DEPTH_TEST):le(i.DEPTH_TEST)},setMask:function(X){se!==X&&!N&&(i.depthMask(X),se=X)},setFunc:function(X){if(ae&&(X=Qf[X]),ge!==X){switch(X){case Ja:i.depthFunc(i.NEVER);break;case ja:i.depthFunc(i.ALWAYS);break;case Qa:i.depthFunc(i.LESS);break;case Ts:i.depthFunc(i.LEQUAL);break;case el:i.depthFunc(i.EQUAL);break;case tl:i.depthFunc(i.GEQUAL);break;case nl:i.depthFunc(i.GREATER);break;case il:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}ge=X}},setLocked:function(X){N=X},setClear:function(X){te!==X&&(te=X,ae&&(X=1-X),i.clearDepth(X))},reset:function(){N=!1,se=null,ge=null,te=null,ae=!1}}}function s(){let N=!1,ae=null,se=null,ge=null,te=null,X=null,be=null,Oe=null,ft=null;return{setTest:function(st){N||(st?re(i.STENCIL_TEST):le(i.STENCIL_TEST))},setMask:function(st){ae!==st&&!N&&(i.stencilMask(st),ae=st)},setFunc:function(st,yi,vi){(se!==st||ge!==yi||te!==vi)&&(i.stencilFunc(st,yi,vi),se=st,ge=yi,te=vi)},setOp:function(st,yi,vi){(X!==st||be!==yi||Oe!==vi)&&(i.stencilOp(st,yi,vi),X=st,be=yi,Oe=vi)},setLocked:function(st){N=st},setClear:function(st){ft!==st&&(i.clearStencil(st),ft=st)},reset:function(){N=!1,ae=null,se=null,ge=null,te=null,X=null,be=null,Oe=null,ft=null}}}let r=new t,o=new n,a=new s,l=new WeakMap,c=new WeakMap,u={},h={},d=new WeakMap,f=[],g=null,y=!1,m=null,p=null,M=null,w=null,S=null,C=null,A=null,R=new Pe(0,0,0),v=0,T=!1,K=null,I=null,F=null,O=null,V=null,G=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS),k=!1,H=0,ne=i.getParameter(i.VERSION);ne.indexOf("WebGL")!==-1?(H=parseFloat(/^WebGL (\d)/.exec(ne)[1]),k=H>=1):ne.indexOf("OpenGL ES")!==-1&&(H=parseFloat(/^OpenGL ES (\d)/.exec(ne)[1]),k=H>=2);let j=null,de={},xe=i.getParameter(i.SCISSOR_BOX),pe=i.getParameter(i.VIEWPORT),Ge=new pt().fromArray(xe),xt=new pt().fromArray(pe);function mt(N,ae,se,ge){let te=new Uint8Array(4),X=i.createTexture();i.bindTexture(N,X),i.texParameteri(N,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(N,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let be=0;be<se;be++)N===i.TEXTURE_3D||N===i.TEXTURE_2D_ARRAY?i.texImage3D(ae,0,i.RGBA,1,1,ge,0,i.RGBA,i.UNSIGNED_BYTE,te):i.texImage2D(ae+be,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,te);return X}let Z={};Z[i.TEXTURE_2D]=mt(i.TEXTURE_2D,i.TEXTURE_2D,1),Z[i.TEXTURE_CUBE_MAP]=mt(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),Z[i.TEXTURE_2D_ARRAY]=mt(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),Z[i.TEXTURE_3D]=mt(i.TEXTURE_3D,i.TEXTURE_3D,1,1),r.setClear(0,0,0,1),o.setClear(1),a.setClear(0),re(i.DEPTH_TEST),o.setFunc(Ts),Ke(!1),Mt(Ru),re(i.CULL_FACE),it(ci);function re(N){u[N]!==!0&&(i.enable(N),u[N]=!0)}function le(N){u[N]!==!1&&(i.disable(N),u[N]=!1)}function Ve(N,ae){return h[N]!==ae?(i.bindFramebuffer(N,ae),h[N]=ae,N===i.DRAW_FRAMEBUFFER&&(h[i.FRAMEBUFFER]=ae),N===i.FRAMEBUFFER&&(h[i.DRAW_FRAMEBUFFER]=ae),!0):!1}function De(N,ae){let se=f,ge=!1;if(N){se=d.get(ae),se===void 0&&(se=[],d.set(ae,se));let te=N.textures;if(se.length!==te.length||se[0]!==i.COLOR_ATTACHMENT0){for(let X=0,be=te.length;X<be;X++)se[X]=i.COLOR_ATTACHMENT0+X;se.length=te.length,ge=!0}}else se[0]!==i.BACK&&(se[0]=i.BACK,ge=!0);ge&&i.drawBuffers(se)}function Fe(N){return g!==N?(i.useProgram(N),g=N,!0):!1}let zt={[Zi]:i.FUNC_ADD,[vf]:i.FUNC_SUBTRACT,[bf]:i.FUNC_REVERSE_SUBTRACT};zt[Mf]=i.MIN,zt[Sf]=i.MAX;let je={[wf]:i.ZERO,[Tf]:i.ONE,[Ef]:i.SRC_COLOR,[$a]:i.SRC_ALPHA,[Lf]:i.SRC_ALPHA_SATURATE,[If]:i.DST_COLOR,[Cf]:i.DST_ALPHA,[Af]:i.ONE_MINUS_SRC_COLOR,[Za]:i.ONE_MINUS_SRC_ALPHA,[Pf]:i.ONE_MINUS_DST_COLOR,[Rf]:i.ONE_MINUS_DST_ALPHA,[Nf]:i.CONSTANT_COLOR,[Df]:i.ONE_MINUS_CONSTANT_COLOR,[Uf]:i.CONSTANT_ALPHA,[Ff]:i.ONE_MINUS_CONSTANT_ALPHA};function it(N,ae,se,ge,te,X,be,Oe,ft,st){if(N===ci){y===!0&&(le(i.BLEND),y=!1);return}if(y===!1&&(re(i.BLEND),y=!0),N!==yf){if(N!==m||st!==T){if((p!==Zi||S!==Zi)&&(i.blendEquation(i.FUNC_ADD),p=Zi,S=Zi),st)switch(N){case ws:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Iu:i.blendFunc(i.ONE,i.ONE);break;case Pu:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case Lu:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:Ne("WebGLState: Invalid blending: ",N);break}else switch(N){case ws:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Iu:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case Pu:Ne("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case Lu:Ne("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Ne("WebGLState: Invalid blending: ",N);break}M=null,w=null,C=null,A=null,R.set(0,0,0),v=0,m=N,T=st}return}te=te||ae,X=X||se,be=be||ge,(ae!==p||te!==S)&&(i.blendEquationSeparate(zt[ae],zt[te]),p=ae,S=te),(se!==M||ge!==w||X!==C||be!==A)&&(i.blendFuncSeparate(je[se],je[ge],je[X],je[be]),M=se,w=ge,C=X,A=be),(Oe.equals(R)===!1||ft!==v)&&(i.blendColor(Oe.r,Oe.g,Oe.b,ft),R.copy(Oe),v=ft),m=N,T=!1}function ct(N,ae){N.side===An?le(i.CULL_FACE):re(i.CULL_FACE);let se=N.side===on;ae&&(se=!se),Ke(se),N.blending===ws&&N.transparent===!1?it(ci):it(N.blending,N.blendEquation,N.blendSrc,N.blendDst,N.blendEquationAlpha,N.blendSrcAlpha,N.blendDstAlpha,N.blendColor,N.blendAlpha,N.premultipliedAlpha),o.setFunc(N.depthFunc),o.setTest(N.depthTest),o.setMask(N.depthWrite),r.setMask(N.colorWrite);let ge=N.stencilWrite;a.setTest(ge),ge&&(a.setMask(N.stencilWriteMask),a.setFunc(N.stencilFunc,N.stencilRef,N.stencilFuncMask),a.setOp(N.stencilFail,N.stencilZFail,N.stencilZPass)),At(N.polygonOffset,N.polygonOffsetFactor,N.polygonOffsetUnits),N.alphaToCoverage===!0?re(i.SAMPLE_ALPHA_TO_COVERAGE):le(i.SAMPLE_ALPHA_TO_COVERAGE)}function Ke(N){K!==N&&(N?i.frontFace(i.CW):i.frontFace(i.CCW),K=N)}function Mt(N){N!==xf?(re(i.CULL_FACE),N!==I&&(N===Ru?i.cullFace(i.BACK):N===_f?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):le(i.CULL_FACE),I=N}function P(N){N!==F&&(k&&i.lineWidth(N),F=N)}function At(N,ae,se){N?(re(i.POLYGON_OFFSET_FILL),(O!==ae||V!==se)&&(O=ae,V=se,o.getReversed()&&(ae=-ae),i.polygonOffset(ae,se))):le(i.POLYGON_OFFSET_FILL)}function et(N){N?re(i.SCISSOR_TEST):le(i.SCISSOR_TEST)}function dt(N){N===void 0&&(N=i.TEXTURE0+G-1),j!==N&&(i.activeTexture(N),j=N)}function we(N,ae,se){se===void 0&&(j===null?se=i.TEXTURE0+G-1:se=j);let ge=de[se];ge===void 0&&(ge={type:void 0,texture:void 0},de[se]=ge),(ge.type!==N||ge.texture!==ae)&&(j!==se&&(i.activeTexture(se),j=se),i.bindTexture(N,ae||Z[N]),ge.type=N,ge.texture=ae)}function E(){let N=de[j];N!==void 0&&N.type!==void 0&&(i.bindTexture(N.type,null),N.type=void 0,N.texture=void 0)}function x(){try{i.compressedTexImage2D(...arguments)}catch(N){Ne("WebGLState:",N)}}function D(){try{i.compressedTexImage3D(...arguments)}catch(N){Ne("WebGLState:",N)}}function $(){try{i.texSubImage2D(...arguments)}catch(N){Ne("WebGLState:",N)}}function J(){try{i.texSubImage3D(...arguments)}catch(N){Ne("WebGLState:",N)}}function Y(){try{i.compressedTexSubImage2D(...arguments)}catch(N){Ne("WebGLState:",N)}}function ye(){try{i.compressedTexSubImage3D(...arguments)}catch(N){Ne("WebGLState:",N)}}function oe(){try{i.texStorage2D(...arguments)}catch(N){Ne("WebGLState:",N)}}function Re(){try{i.texStorage3D(...arguments)}catch(N){Ne("WebGLState:",N)}}function Ue(){try{i.texImage2D(...arguments)}catch(N){Ne("WebGLState:",N)}}function ee(){try{i.texImage3D(...arguments)}catch(N){Ne("WebGLState:",N)}}function ie(N){Ge.equals(N)===!1&&(i.scissor(N.x,N.y,N.z,N.w),Ge.copy(N))}function ve(N){xt.equals(N)===!1&&(i.viewport(N.x,N.y,N.z,N.w),xt.copy(N))}function Me(N,ae){let se=c.get(ae);se===void 0&&(se=new WeakMap,c.set(ae,se));let ge=se.get(N);ge===void 0&&(ge=i.getUniformBlockIndex(ae,N.name),se.set(N,ge))}function fe(N,ae){let ge=c.get(ae).get(N);l.get(ae)!==ge&&(i.uniformBlockBinding(ae,ge,N.__bindingPointIndex),l.set(ae,ge))}function Xe(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),o.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),u={},j=null,de={},h={},d=new WeakMap,f=[],g=null,y=!1,m=null,p=null,M=null,w=null,S=null,C=null,A=null,R=new Pe(0,0,0),v=0,T=!1,K=null,I=null,F=null,O=null,V=null,Ge.set(0,0,i.canvas.width,i.canvas.height),xt.set(0,0,i.canvas.width,i.canvas.height),r.reset(),o.reset(),a.reset()}return{buffers:{color:r,depth:o,stencil:a},enable:re,disable:le,bindFramebuffer:Ve,drawBuffers:De,useProgram:Fe,setBlending:it,setMaterial:ct,setFlipSided:Ke,setCullFace:Mt,setLineWidth:P,setPolygonOffset:At,setScissorTest:et,activeTexture:dt,bindTexture:we,unbindTexture:E,compressedTexImage2D:x,compressedTexImage3D:D,texImage2D:Ue,texImage3D:ee,updateUBOMapping:Me,uniformBlockBinding:fe,texStorage2D:oe,texStorage3D:Re,texSubImage2D:$,texSubImage3D:J,compressedTexSubImage2D:Y,compressedTexSubImage3D:ye,scissor:ie,viewport:ve,reset:Xe}}function lv(i,e,t,n,s,r,o){let a=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new Ie,u=new WeakMap,h,d=new WeakMap,f=!1;try{f=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function g(E,x){return f?new OffscreenCanvas(E,x):Tr("canvas")}function y(E,x,D){let $=1,J=we(E);if((J.width>D||J.height>D)&&($=D/Math.max(J.width,J.height)),$<1)if(typeof HTMLImageElement<"u"&&E instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&E instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&E instanceof ImageBitmap||typeof VideoFrame<"u"&&E instanceof VideoFrame){let Y=Math.floor($*J.width),ye=Math.floor($*J.height);h===void 0&&(h=g(Y,ye));let oe=x?g(Y,ye):h;return oe.width=Y,oe.height=ye,oe.getContext("2d").drawImage(E,0,0,Y,ye),Ee("WebGLRenderer: Texture has been resized from ("+J.width+"x"+J.height+") to ("+Y+"x"+ye+")."),oe}else return"data"in E&&Ee("WebGLRenderer: Image in DataTexture is too big ("+J.width+"x"+J.height+")."),E;return E}function m(E){return E.generateMipmaps}function p(E){i.generateMipmap(E)}function M(E){return E.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:E.isWebGL3DRenderTarget?i.TEXTURE_3D:E.isWebGLArrayRenderTarget||E.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function w(E,x,D,$,J=!1){if(E!==null){if(i[E]!==void 0)return i[E];Ee("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+E+"'")}let Y=x;if(x===i.RED&&(D===i.FLOAT&&(Y=i.R32F),D===i.HALF_FLOAT&&(Y=i.R16F),D===i.UNSIGNED_BYTE&&(Y=i.R8)),x===i.RED_INTEGER&&(D===i.UNSIGNED_BYTE&&(Y=i.R8UI),D===i.UNSIGNED_SHORT&&(Y=i.R16UI),D===i.UNSIGNED_INT&&(Y=i.R32UI),D===i.BYTE&&(Y=i.R8I),D===i.SHORT&&(Y=i.R16I),D===i.INT&&(Y=i.R32I)),x===i.RG&&(D===i.FLOAT&&(Y=i.RG32F),D===i.HALF_FLOAT&&(Y=i.RG16F),D===i.UNSIGNED_BYTE&&(Y=i.RG8)),x===i.RG_INTEGER&&(D===i.UNSIGNED_BYTE&&(Y=i.RG8UI),D===i.UNSIGNED_SHORT&&(Y=i.RG16UI),D===i.UNSIGNED_INT&&(Y=i.RG32UI),D===i.BYTE&&(Y=i.RG8I),D===i.SHORT&&(Y=i.RG16I),D===i.INT&&(Y=i.RG32I)),x===i.RGB_INTEGER&&(D===i.UNSIGNED_BYTE&&(Y=i.RGB8UI),D===i.UNSIGNED_SHORT&&(Y=i.RGB16UI),D===i.UNSIGNED_INT&&(Y=i.RGB32UI),D===i.BYTE&&(Y=i.RGB8I),D===i.SHORT&&(Y=i.RGB16I),D===i.INT&&(Y=i.RGB32I)),x===i.RGBA_INTEGER&&(D===i.UNSIGNED_BYTE&&(Y=i.RGBA8UI),D===i.UNSIGNED_SHORT&&(Y=i.RGBA16UI),D===i.UNSIGNED_INT&&(Y=i.RGBA32UI),D===i.BYTE&&(Y=i.RGBA8I),D===i.SHORT&&(Y=i.RGBA16I),D===i.INT&&(Y=i.RGBA32I)),x===i.RGB&&(D===i.UNSIGNED_INT_5_9_9_9_REV&&(Y=i.RGB9_E5),D===i.UNSIGNED_INT_10F_11F_11F_REV&&(Y=i.R11F_G11F_B10F)),x===i.RGBA){let ye=J?_o:$e.getTransfer($);D===i.FLOAT&&(Y=i.RGBA32F),D===i.HALF_FLOAT&&(Y=i.RGBA16F),D===i.UNSIGNED_BYTE&&(Y=ye===tt?i.SRGB8_ALPHA8:i.RGBA8),D===i.UNSIGNED_SHORT_4_4_4_4&&(Y=i.RGBA4),D===i.UNSIGNED_SHORT_5_5_5_1&&(Y=i.RGB5_A1)}return(Y===i.R16F||Y===i.R32F||Y===i.RG16F||Y===i.RG32F||Y===i.RGBA16F||Y===i.RGBA32F)&&e.get("EXT_color_buffer_float"),Y}function S(E,x){let D;return E?x===null||x===Gn||x===Vr?D=i.DEPTH24_STENCIL8:x===bn?D=i.DEPTH32F_STENCIL8:x===Hr&&(D=i.DEPTH24_STENCIL8,Ee("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):x===null||x===Gn||x===Vr?D=i.DEPTH_COMPONENT24:x===bn?D=i.DEPTH_COMPONENT32F:x===Hr&&(D=i.DEPTH_COMPONENT16),D}function C(E,x){return m(E)===!0||E.isFramebufferTexture&&E.minFilter!==wt&&E.minFilter!==Tt?Math.log2(Math.max(x.width,x.height))+1:E.mipmaps!==void 0&&E.mipmaps.length>0?E.mipmaps.length:E.isCompressedTexture&&Array.isArray(E.image)?x.mipmaps.length:1}function A(E){let x=E.target;x.removeEventListener("dispose",A),v(x),x.isVideoTexture&&u.delete(x)}function R(E){let x=E.target;x.removeEventListener("dispose",R),K(x)}function v(E){let x=n.get(E);if(x.__webglInit===void 0)return;let D=E.source,$=d.get(D);if($){let J=$[x.__cacheKey];J.usedTimes--,J.usedTimes===0&&T(E),Object.keys($).length===0&&d.delete(D)}n.remove(E)}function T(E){let x=n.get(E);i.deleteTexture(x.__webglTexture);let D=E.source,$=d.get(D);delete $[x.__cacheKey],o.memory.textures--}function K(E){let x=n.get(E);if(E.depthTexture&&(E.depthTexture.dispose(),n.remove(E.depthTexture)),E.isWebGLCubeRenderTarget)for(let $=0;$<6;$++){if(Array.isArray(x.__webglFramebuffer[$]))for(let J=0;J<x.__webglFramebuffer[$].length;J++)i.deleteFramebuffer(x.__webglFramebuffer[$][J]);else i.deleteFramebuffer(x.__webglFramebuffer[$]);x.__webglDepthbuffer&&i.deleteRenderbuffer(x.__webglDepthbuffer[$])}else{if(Array.isArray(x.__webglFramebuffer))for(let $=0;$<x.__webglFramebuffer.length;$++)i.deleteFramebuffer(x.__webglFramebuffer[$]);else i.deleteFramebuffer(x.__webglFramebuffer);if(x.__webglDepthbuffer&&i.deleteRenderbuffer(x.__webglDepthbuffer),x.__webglMultisampledFramebuffer&&i.deleteFramebuffer(x.__webglMultisampledFramebuffer),x.__webglColorRenderbuffer)for(let $=0;$<x.__webglColorRenderbuffer.length;$++)x.__webglColorRenderbuffer[$]&&i.deleteRenderbuffer(x.__webglColorRenderbuffer[$]);x.__webglDepthRenderbuffer&&i.deleteRenderbuffer(x.__webglDepthRenderbuffer)}let D=E.textures;for(let $=0,J=D.length;$<J;$++){let Y=n.get(D[$]);Y.__webglTexture&&(i.deleteTexture(Y.__webglTexture),o.memory.textures--),n.remove(D[$])}n.remove(E)}let I=0;function F(){I=0}function O(){let E=I;return E>=s.maxTextures&&Ee("WebGLTextures: Trying to use "+E+" texture units while this GPU supports only "+s.maxTextures),I+=1,E}function V(E){let x=[];return x.push(E.wrapS),x.push(E.wrapT),x.push(E.wrapR||0),x.push(E.magFilter),x.push(E.minFilter),x.push(E.anisotropy),x.push(E.internalFormat),x.push(E.format),x.push(E.type),x.push(E.generateMipmaps),x.push(E.premultiplyAlpha),x.push(E.flipY),x.push(E.unpackAlignment),x.push(E.colorSpace),x.join()}function G(E,x){let D=n.get(E);if(E.isVideoTexture&&et(E),E.isRenderTargetTexture===!1&&E.isExternalTexture!==!0&&E.version>0&&D.__version!==E.version){let $=E.image;if($===null)Ee("WebGLRenderer: Texture marked for update but no image data found.");else if($.complete===!1)Ee("WebGLRenderer: Texture marked for update but image is incomplete");else{Z(D,E,x);return}}else E.isExternalTexture&&(D.__webglTexture=E.sourceTexture?E.sourceTexture:null);t.bindTexture(i.TEXTURE_2D,D.__webglTexture,i.TEXTURE0+x)}function k(E,x){let D=n.get(E);if(E.isRenderTargetTexture===!1&&E.version>0&&D.__version!==E.version){Z(D,E,x);return}else E.isExternalTexture&&(D.__webglTexture=E.sourceTexture?E.sourceTexture:null);t.bindTexture(i.TEXTURE_2D_ARRAY,D.__webglTexture,i.TEXTURE0+x)}function H(E,x){let D=n.get(E);if(E.isRenderTargetTexture===!1&&E.version>0&&D.__version!==E.version){Z(D,E,x);return}t.bindTexture(i.TEXTURE_3D,D.__webglTexture,i.TEXTURE0+x)}function ne(E,x){let D=n.get(E);if(E.isCubeDepthTexture!==!0&&E.version>0&&D.__version!==E.version){re(D,E,x);return}t.bindTexture(i.TEXTURE_CUBE_MAP,D.__webglTexture,i.TEXTURE0+x)}let j={[Ji]:i.REPEAT,[En]:i.CLAMP_TO_EDGE,[Sr]:i.MIRRORED_REPEAT},de={[wt]:i.NEAREST,[Al]:i.NEAREST_MIPMAP_NEAREST,[Os]:i.NEAREST_MIPMAP_LINEAR,[Tt]:i.LINEAR,[zr]:i.LINEAR_MIPMAP_NEAREST,[Vn]:i.LINEAR_MIPMAP_LINEAR},xe={[Wf]:i.NEVER,[$f]:i.ALWAYS,[Kf]:i.LESS,[gc]:i.LEQUAL,[Xf]:i.EQUAL,[xc]:i.GEQUAL,[qf]:i.GREATER,[Yf]:i.NOTEQUAL};function pe(E,x){if(x.type===bn&&e.has("OES_texture_float_linear")===!1&&(x.magFilter===Tt||x.magFilter===zr||x.magFilter===Os||x.magFilter===Vn||x.minFilter===Tt||x.minFilter===zr||x.minFilter===Os||x.minFilter===Vn)&&Ee("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(E,i.TEXTURE_WRAP_S,j[x.wrapS]),i.texParameteri(E,i.TEXTURE_WRAP_T,j[x.wrapT]),(E===i.TEXTURE_3D||E===i.TEXTURE_2D_ARRAY)&&i.texParameteri(E,i.TEXTURE_WRAP_R,j[x.wrapR]),i.texParameteri(E,i.TEXTURE_MAG_FILTER,de[x.magFilter]),i.texParameteri(E,i.TEXTURE_MIN_FILTER,de[x.minFilter]),x.compareFunction&&(i.texParameteri(E,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(E,i.TEXTURE_COMPARE_FUNC,xe[x.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(x.magFilter===wt||x.minFilter!==Os&&x.minFilter!==Vn||x.type===bn&&e.has("OES_texture_float_linear")===!1)return;if(x.anisotropy>1||n.get(x).__currentAnisotropy){let D=e.get("EXT_texture_filter_anisotropic");i.texParameterf(E,D.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(x.anisotropy,s.getMaxAnisotropy())),n.get(x).__currentAnisotropy=x.anisotropy}}}function Ge(E,x){let D=!1;E.__webglInit===void 0&&(E.__webglInit=!0,x.addEventListener("dispose",A));let $=x.source,J=d.get($);J===void 0&&(J={},d.set($,J));let Y=V(x);if(Y!==E.__cacheKey){J[Y]===void 0&&(J[Y]={texture:i.createTexture(),usedTimes:0},o.memory.textures++,D=!0),J[Y].usedTimes++;let ye=J[E.__cacheKey];ye!==void 0&&(J[E.__cacheKey].usedTimes--,ye.usedTimes===0&&T(x)),E.__cacheKey=Y,E.__webglTexture=J[Y].texture}return D}function xt(E,x,D){return Math.floor(Math.floor(E/D)/x)}function mt(E,x,D,$){let Y=E.updateRanges;if(Y.length===0)t.texSubImage2D(i.TEXTURE_2D,0,0,0,x.width,x.height,D,$,x.data);else{Y.sort((ee,ie)=>ee.start-ie.start);let ye=0;for(let ee=1;ee<Y.length;ee++){let ie=Y[ye],ve=Y[ee],Me=ie.start+ie.count,fe=xt(ve.start,x.width,4),Xe=xt(ie.start,x.width,4);ve.start<=Me+1&&fe===Xe&&xt(ve.start+ve.count-1,x.width,4)===fe?ie.count=Math.max(ie.count,ve.start+ve.count-ie.start):(++ye,Y[ye]=ve)}Y.length=ye+1;let oe=i.getParameter(i.UNPACK_ROW_LENGTH),Re=i.getParameter(i.UNPACK_SKIP_PIXELS),Ue=i.getParameter(i.UNPACK_SKIP_ROWS);i.pixelStorei(i.UNPACK_ROW_LENGTH,x.width);for(let ee=0,ie=Y.length;ee<ie;ee++){let ve=Y[ee],Me=Math.floor(ve.start/4),fe=Math.ceil(ve.count/4),Xe=Me%x.width,N=Math.floor(Me/x.width),ae=fe,se=1;i.pixelStorei(i.UNPACK_SKIP_PIXELS,Xe),i.pixelStorei(i.UNPACK_SKIP_ROWS,N),t.texSubImage2D(i.TEXTURE_2D,0,Xe,N,ae,se,D,$,x.data)}E.clearUpdateRanges(),i.pixelStorei(i.UNPACK_ROW_LENGTH,oe),i.pixelStorei(i.UNPACK_SKIP_PIXELS,Re),i.pixelStorei(i.UNPACK_SKIP_ROWS,Ue)}}function Z(E,x,D){let $=i.TEXTURE_2D;(x.isDataArrayTexture||x.isCompressedArrayTexture)&&($=i.TEXTURE_2D_ARRAY),x.isData3DTexture&&($=i.TEXTURE_3D);let J=Ge(E,x),Y=x.source;t.bindTexture($,E.__webglTexture,i.TEXTURE0+D);let ye=n.get(Y);if(Y.version!==ye.__version||J===!0){t.activeTexture(i.TEXTURE0+D);let oe=$e.getPrimaries($e.workingColorSpace),Re=x.colorSpace===Ni?null:$e.getPrimaries(x.colorSpace),Ue=x.colorSpace===Ni||oe===Re?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,x.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,x.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,x.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Ue);let ee=y(x.image,!1,s.maxTextureSize);ee=dt(x,ee);let ie=r.convert(x.format,x.colorSpace),ve=r.convert(x.type),Me=w(x.internalFormat,ie,ve,x.colorSpace,x.isVideoTexture);pe($,x);let fe,Xe=x.mipmaps,N=x.isVideoTexture!==!0,ae=ye.__version===void 0||J===!0,se=Y.dataReady,ge=C(x,ee);if(x.isDepthTexture)Me=S(x.format===is,x.type),ae&&(N?t.texStorage2D(i.TEXTURE_2D,1,Me,ee.width,ee.height):t.texImage2D(i.TEXTURE_2D,0,Me,ee.width,ee.height,0,ie,ve,null));else if(x.isDataTexture)if(Xe.length>0){N&&ae&&t.texStorage2D(i.TEXTURE_2D,ge,Me,Xe[0].width,Xe[0].height);for(let te=0,X=Xe.length;te<X;te++)fe=Xe[te],N?se&&t.texSubImage2D(i.TEXTURE_2D,te,0,0,fe.width,fe.height,ie,ve,fe.data):t.texImage2D(i.TEXTURE_2D,te,Me,fe.width,fe.height,0,ie,ve,fe.data);x.generateMipmaps=!1}else N?(ae&&t.texStorage2D(i.TEXTURE_2D,ge,Me,ee.width,ee.height),se&&mt(x,ee,ie,ve)):t.texImage2D(i.TEXTURE_2D,0,Me,ee.width,ee.height,0,ie,ve,ee.data);else if(x.isCompressedTexture)if(x.isCompressedArrayTexture){N&&ae&&t.texStorage3D(i.TEXTURE_2D_ARRAY,ge,Me,Xe[0].width,Xe[0].height,ee.depth);for(let te=0,X=Xe.length;te<X;te++)if(fe=Xe[te],x.format!==Mn)if(ie!==null)if(N){if(se)if(x.layerUpdates.size>0){let be=eh(fe.width,fe.height,x.format,x.type);for(let Oe of x.layerUpdates){let ft=fe.data.subarray(Oe*be/fe.data.BYTES_PER_ELEMENT,(Oe+1)*be/fe.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,te,0,0,Oe,fe.width,fe.height,1,ie,ft)}x.clearLayerUpdates()}else t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,te,0,0,0,fe.width,fe.height,ee.depth,ie,fe.data)}else t.compressedTexImage3D(i.TEXTURE_2D_ARRAY,te,Me,fe.width,fe.height,ee.depth,0,fe.data,0,0);else Ee("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else N?se&&t.texSubImage3D(i.TEXTURE_2D_ARRAY,te,0,0,0,fe.width,fe.height,ee.depth,ie,ve,fe.data):t.texImage3D(i.TEXTURE_2D_ARRAY,te,Me,fe.width,fe.height,ee.depth,0,ie,ve,fe.data)}else{N&&ae&&t.texStorage2D(i.TEXTURE_2D,ge,Me,Xe[0].width,Xe[0].height);for(let te=0,X=Xe.length;te<X;te++)fe=Xe[te],x.format!==Mn?ie!==null?N?se&&t.compressedTexSubImage2D(i.TEXTURE_2D,te,0,0,fe.width,fe.height,ie,fe.data):t.compressedTexImage2D(i.TEXTURE_2D,te,Me,fe.width,fe.height,0,fe.data):Ee("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):N?se&&t.texSubImage2D(i.TEXTURE_2D,te,0,0,fe.width,fe.height,ie,ve,fe.data):t.texImage2D(i.TEXTURE_2D,te,Me,fe.width,fe.height,0,ie,ve,fe.data)}else if(x.isDataArrayTexture)if(N){if(ae&&t.texStorage3D(i.TEXTURE_2D_ARRAY,ge,Me,ee.width,ee.height,ee.depth),se)if(x.layerUpdates.size>0){let te=eh(ee.width,ee.height,x.format,x.type);for(let X of x.layerUpdates){let be=ee.data.subarray(X*te/ee.data.BYTES_PER_ELEMENT,(X+1)*te/ee.data.BYTES_PER_ELEMENT);t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,X,ee.width,ee.height,1,ie,ve,be)}x.clearLayerUpdates()}else t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,ee.width,ee.height,ee.depth,ie,ve,ee.data)}else t.texImage3D(i.TEXTURE_2D_ARRAY,0,Me,ee.width,ee.height,ee.depth,0,ie,ve,ee.data);else if(x.isData3DTexture)N?(ae&&t.texStorage3D(i.TEXTURE_3D,ge,Me,ee.width,ee.height,ee.depth),se&&t.texSubImage3D(i.TEXTURE_3D,0,0,0,0,ee.width,ee.height,ee.depth,ie,ve,ee.data)):t.texImage3D(i.TEXTURE_3D,0,Me,ee.width,ee.height,ee.depth,0,ie,ve,ee.data);else if(x.isFramebufferTexture){if(ae)if(N)t.texStorage2D(i.TEXTURE_2D,ge,Me,ee.width,ee.height);else{let te=ee.width,X=ee.height;for(let be=0;be<ge;be++)t.texImage2D(i.TEXTURE_2D,be,Me,te,X,0,ie,ve,null),te>>=1,X>>=1}}else if(Xe.length>0){if(N&&ae){let te=we(Xe[0]);t.texStorage2D(i.TEXTURE_2D,ge,Me,te.width,te.height)}for(let te=0,X=Xe.length;te<X;te++)fe=Xe[te],N?se&&t.texSubImage2D(i.TEXTURE_2D,te,0,0,ie,ve,fe):t.texImage2D(i.TEXTURE_2D,te,Me,ie,ve,fe);x.generateMipmaps=!1}else if(N){if(ae){let te=we(ee);t.texStorage2D(i.TEXTURE_2D,ge,Me,te.width,te.height)}se&&t.texSubImage2D(i.TEXTURE_2D,0,0,0,ie,ve,ee)}else t.texImage2D(i.TEXTURE_2D,0,Me,ie,ve,ee);m(x)&&p($),ye.__version=Y.version,x.onUpdate&&x.onUpdate(x)}E.__version=x.version}function re(E,x,D){if(x.image.length!==6)return;let $=Ge(E,x),J=x.source;t.bindTexture(i.TEXTURE_CUBE_MAP,E.__webglTexture,i.TEXTURE0+D);let Y=n.get(J);if(J.version!==Y.__version||$===!0){t.activeTexture(i.TEXTURE0+D);let ye=$e.getPrimaries($e.workingColorSpace),oe=x.colorSpace===Ni?null:$e.getPrimaries(x.colorSpace),Re=x.colorSpace===Ni||ye===oe?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,x.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,x.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,x.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Re);let Ue=x.isCompressedTexture||x.image[0].isCompressedTexture,ee=x.image[0]&&x.image[0].isDataTexture,ie=[];for(let X=0;X<6;X++)!Ue&&!ee?ie[X]=y(x.image[X],!0,s.maxCubemapSize):ie[X]=ee?x.image[X].image:x.image[X],ie[X]=dt(x,ie[X]);let ve=ie[0],Me=r.convert(x.format,x.colorSpace),fe=r.convert(x.type),Xe=w(x.internalFormat,Me,fe,x.colorSpace),N=x.isVideoTexture!==!0,ae=Y.__version===void 0||$===!0,se=J.dataReady,ge=C(x,ve);pe(i.TEXTURE_CUBE_MAP,x);let te;if(Ue){N&&ae&&t.texStorage2D(i.TEXTURE_CUBE_MAP,ge,Xe,ve.width,ve.height);for(let X=0;X<6;X++){te=ie[X].mipmaps;for(let be=0;be<te.length;be++){let Oe=te[be];x.format!==Mn?Me!==null?N?se&&t.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+X,be,0,0,Oe.width,Oe.height,Me,Oe.data):t.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+X,be,Xe,Oe.width,Oe.height,0,Oe.data):Ee("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):N?se&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+X,be,0,0,Oe.width,Oe.height,Me,fe,Oe.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+X,be,Xe,Oe.width,Oe.height,0,Me,fe,Oe.data)}}}else{if(te=x.mipmaps,N&&ae){te.length>0&&ge++;let X=we(ie[0]);t.texStorage2D(i.TEXTURE_CUBE_MAP,ge,Xe,X.width,X.height)}for(let X=0;X<6;X++)if(ee){N?se&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+X,0,0,0,ie[X].width,ie[X].height,Me,fe,ie[X].data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+X,0,Xe,ie[X].width,ie[X].height,0,Me,fe,ie[X].data);for(let be=0;be<te.length;be++){let ft=te[be].image[X].image;N?se&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+X,be+1,0,0,ft.width,ft.height,Me,fe,ft.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+X,be+1,Xe,ft.width,ft.height,0,Me,fe,ft.data)}}else{N?se&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+X,0,0,0,Me,fe,ie[X]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+X,0,Xe,Me,fe,ie[X]);for(let be=0;be<te.length;be++){let Oe=te[be];N?se&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+X,be+1,0,0,Me,fe,Oe.image[X]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+X,be+1,Xe,Me,fe,Oe.image[X])}}}m(x)&&p(i.TEXTURE_CUBE_MAP),Y.__version=J.version,x.onUpdate&&x.onUpdate(x)}E.__version=x.version}function le(E,x,D,$,J,Y){let ye=r.convert(D.format,D.colorSpace),oe=r.convert(D.type),Re=w(D.internalFormat,ye,oe,D.colorSpace),Ue=n.get(x),ee=n.get(D);if(ee.__renderTarget=x,!Ue.__hasExternalTextures){let ie=Math.max(1,x.width>>Y),ve=Math.max(1,x.height>>Y);J===i.TEXTURE_3D||J===i.TEXTURE_2D_ARRAY?t.texImage3D(J,Y,Re,ie,ve,x.depth,0,ye,oe,null):t.texImage2D(J,Y,Re,ie,ve,0,ye,oe,null)}t.bindFramebuffer(i.FRAMEBUFFER,E),At(x)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,$,J,ee.__webglTexture,0,P(x)):(J===i.TEXTURE_2D||J>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&J<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,$,J,ee.__webglTexture,Y),t.bindFramebuffer(i.FRAMEBUFFER,null)}function Ve(E,x,D){if(i.bindRenderbuffer(i.RENDERBUFFER,E),x.depthBuffer){let $=x.depthTexture,J=$&&$.isDepthTexture?$.type:null,Y=S(x.stencilBuffer,J),ye=x.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;At(x)?a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,P(x),Y,x.width,x.height):D?i.renderbufferStorageMultisample(i.RENDERBUFFER,P(x),Y,x.width,x.height):i.renderbufferStorage(i.RENDERBUFFER,Y,x.width,x.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,ye,i.RENDERBUFFER,E)}else{let $=x.textures;for(let J=0;J<$.length;J++){let Y=$[J],ye=r.convert(Y.format,Y.colorSpace),oe=r.convert(Y.type),Re=w(Y.internalFormat,ye,oe,Y.colorSpace);At(x)?a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,P(x),Re,x.width,x.height):D?i.renderbufferStorageMultisample(i.RENDERBUFFER,P(x),Re,x.width,x.height):i.renderbufferStorage(i.RENDERBUFFER,Re,x.width,x.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function De(E,x,D){let $=x.isWebGLCubeRenderTarget===!0;if(t.bindFramebuffer(i.FRAMEBUFFER,E),!(x.depthTexture&&x.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");let J=n.get(x.depthTexture);if(J.__renderTarget=x,(!J.__webglTexture||x.depthTexture.image.width!==x.width||x.depthTexture.image.height!==x.height)&&(x.depthTexture.image.width=x.width,x.depthTexture.image.height=x.height,x.depthTexture.needsUpdate=!0),$){if(J.__webglInit===void 0&&(J.__webglInit=!0,x.depthTexture.addEventListener("dispose",A)),J.__webglTexture===void 0){J.__webglTexture=i.createTexture(),t.bindTexture(i.TEXTURE_CUBE_MAP,J.__webglTexture),pe(i.TEXTURE_CUBE_MAP,x.depthTexture);let Ue=r.convert(x.depthTexture.format),ee=r.convert(x.depthTexture.type),ie;x.depthTexture.format===ti?ie=i.DEPTH_COMPONENT24:x.depthTexture.format===is&&(ie=i.DEPTH24_STENCIL8);for(let ve=0;ve<6;ve++)i.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ve,0,ie,x.width,x.height,0,Ue,ee,null)}}else G(x.depthTexture,0);let Y=J.__webglTexture,ye=P(x),oe=$?i.TEXTURE_CUBE_MAP_POSITIVE_X+D:i.TEXTURE_2D,Re=x.depthTexture.format===is?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;if(x.depthTexture.format===ti)At(x)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,Re,oe,Y,0,ye):i.framebufferTexture2D(i.FRAMEBUFFER,Re,oe,Y,0);else if(x.depthTexture.format===is)At(x)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,Re,oe,Y,0,ye):i.framebufferTexture2D(i.FRAMEBUFFER,Re,oe,Y,0);else throw new Error("Unknown depthTexture format")}function Fe(E){let x=n.get(E),D=E.isWebGLCubeRenderTarget===!0;if(x.__boundDepthTexture!==E.depthTexture){let $=E.depthTexture;if(x.__depthDisposeCallback&&x.__depthDisposeCallback(),$){let J=()=>{delete x.__boundDepthTexture,delete x.__depthDisposeCallback,$.removeEventListener("dispose",J)};$.addEventListener("dispose",J),x.__depthDisposeCallback=J}x.__boundDepthTexture=$}if(E.depthTexture&&!x.__autoAllocateDepthBuffer)if(D)for(let $=0;$<6;$++)De(x.__webglFramebuffer[$],E,$);else{let $=E.texture.mipmaps;$&&$.length>0?De(x.__webglFramebuffer[0],E,0):De(x.__webglFramebuffer,E,0)}else if(D){x.__webglDepthbuffer=[];for(let $=0;$<6;$++)if(t.bindFramebuffer(i.FRAMEBUFFER,x.__webglFramebuffer[$]),x.__webglDepthbuffer[$]===void 0)x.__webglDepthbuffer[$]=i.createRenderbuffer(),Ve(x.__webglDepthbuffer[$],E,!1);else{let J=E.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Y=x.__webglDepthbuffer[$];i.bindRenderbuffer(i.RENDERBUFFER,Y),i.framebufferRenderbuffer(i.FRAMEBUFFER,J,i.RENDERBUFFER,Y)}}else{let $=E.texture.mipmaps;if($&&$.length>0?t.bindFramebuffer(i.FRAMEBUFFER,x.__webglFramebuffer[0]):t.bindFramebuffer(i.FRAMEBUFFER,x.__webglFramebuffer),x.__webglDepthbuffer===void 0)x.__webglDepthbuffer=i.createRenderbuffer(),Ve(x.__webglDepthbuffer,E,!1);else{let J=E.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Y=x.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,Y),i.framebufferRenderbuffer(i.FRAMEBUFFER,J,i.RENDERBUFFER,Y)}}t.bindFramebuffer(i.FRAMEBUFFER,null)}function zt(E,x,D){let $=n.get(E);x!==void 0&&le($.__webglFramebuffer,E,E.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),D!==void 0&&Fe(E)}function je(E){let x=E.texture,D=n.get(E),$=n.get(x);E.addEventListener("dispose",R);let J=E.textures,Y=E.isWebGLCubeRenderTarget===!0,ye=J.length>1;if(ye||($.__webglTexture===void 0&&($.__webglTexture=i.createTexture()),$.__version=x.version,o.memory.textures++),Y){D.__webglFramebuffer=[];for(let oe=0;oe<6;oe++)if(x.mipmaps&&x.mipmaps.length>0){D.__webglFramebuffer[oe]=[];for(let Re=0;Re<x.mipmaps.length;Re++)D.__webglFramebuffer[oe][Re]=i.createFramebuffer()}else D.__webglFramebuffer[oe]=i.createFramebuffer()}else{if(x.mipmaps&&x.mipmaps.length>0){D.__webglFramebuffer=[];for(let oe=0;oe<x.mipmaps.length;oe++)D.__webglFramebuffer[oe]=i.createFramebuffer()}else D.__webglFramebuffer=i.createFramebuffer();if(ye)for(let oe=0,Re=J.length;oe<Re;oe++){let Ue=n.get(J[oe]);Ue.__webglTexture===void 0&&(Ue.__webglTexture=i.createTexture(),o.memory.textures++)}if(E.samples>0&&At(E)===!1){D.__webglMultisampledFramebuffer=i.createFramebuffer(),D.__webglColorRenderbuffer=[],t.bindFramebuffer(i.FRAMEBUFFER,D.__webglMultisampledFramebuffer);for(let oe=0;oe<J.length;oe++){let Re=J[oe];D.__webglColorRenderbuffer[oe]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,D.__webglColorRenderbuffer[oe]);let Ue=r.convert(Re.format,Re.colorSpace),ee=r.convert(Re.type),ie=w(Re.internalFormat,Ue,ee,Re.colorSpace,E.isXRRenderTarget===!0),ve=P(E);i.renderbufferStorageMultisample(i.RENDERBUFFER,ve,ie,E.width,E.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+oe,i.RENDERBUFFER,D.__webglColorRenderbuffer[oe])}i.bindRenderbuffer(i.RENDERBUFFER,null),E.depthBuffer&&(D.__webglDepthRenderbuffer=i.createRenderbuffer(),Ve(D.__webglDepthRenderbuffer,E,!0)),t.bindFramebuffer(i.FRAMEBUFFER,null)}}if(Y){t.bindTexture(i.TEXTURE_CUBE_MAP,$.__webglTexture),pe(i.TEXTURE_CUBE_MAP,x);for(let oe=0;oe<6;oe++)if(x.mipmaps&&x.mipmaps.length>0)for(let Re=0;Re<x.mipmaps.length;Re++)le(D.__webglFramebuffer[oe][Re],E,x,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+oe,Re);else le(D.__webglFramebuffer[oe],E,x,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+oe,0);m(x)&&p(i.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(ye){for(let oe=0,Re=J.length;oe<Re;oe++){let Ue=J[oe],ee=n.get(Ue),ie=i.TEXTURE_2D;(E.isWebGL3DRenderTarget||E.isWebGLArrayRenderTarget)&&(ie=E.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(ie,ee.__webglTexture),pe(ie,Ue),le(D.__webglFramebuffer,E,Ue,i.COLOR_ATTACHMENT0+oe,ie,0),m(Ue)&&p(ie)}t.unbindTexture()}else{let oe=i.TEXTURE_2D;if((E.isWebGL3DRenderTarget||E.isWebGLArrayRenderTarget)&&(oe=E.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(oe,$.__webglTexture),pe(oe,x),x.mipmaps&&x.mipmaps.length>0)for(let Re=0;Re<x.mipmaps.length;Re++)le(D.__webglFramebuffer[Re],E,x,i.COLOR_ATTACHMENT0,oe,Re);else le(D.__webglFramebuffer,E,x,i.COLOR_ATTACHMENT0,oe,0);m(x)&&p(oe),t.unbindTexture()}E.depthBuffer&&Fe(E)}function it(E){let x=E.textures;for(let D=0,$=x.length;D<$;D++){let J=x[D];if(m(J)){let Y=M(E),ye=n.get(J).__webglTexture;t.bindTexture(Y,ye),p(Y),t.unbindTexture()}}}let ct=[],Ke=[];function Mt(E){if(E.samples>0){if(At(E)===!1){let x=E.textures,D=E.width,$=E.height,J=i.COLOR_BUFFER_BIT,Y=E.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,ye=n.get(E),oe=x.length>1;if(oe)for(let Ue=0;Ue<x.length;Ue++)t.bindFramebuffer(i.FRAMEBUFFER,ye.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Ue,i.RENDERBUFFER,null),t.bindFramebuffer(i.FRAMEBUFFER,ye.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+Ue,i.TEXTURE_2D,null,0);t.bindFramebuffer(i.READ_FRAMEBUFFER,ye.__webglMultisampledFramebuffer);let Re=E.texture.mipmaps;Re&&Re.length>0?t.bindFramebuffer(i.DRAW_FRAMEBUFFER,ye.__webglFramebuffer[0]):t.bindFramebuffer(i.DRAW_FRAMEBUFFER,ye.__webglFramebuffer);for(let Ue=0;Ue<x.length;Ue++){if(E.resolveDepthBuffer&&(E.depthBuffer&&(J|=i.DEPTH_BUFFER_BIT),E.stencilBuffer&&E.resolveStencilBuffer&&(J|=i.STENCIL_BUFFER_BIT)),oe){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,ye.__webglColorRenderbuffer[Ue]);let ee=n.get(x[Ue]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,ee,0)}i.blitFramebuffer(0,0,D,$,0,0,D,$,J,i.NEAREST),l===!0&&(ct.length=0,Ke.length=0,ct.push(i.COLOR_ATTACHMENT0+Ue),E.depthBuffer&&E.resolveDepthBuffer===!1&&(ct.push(Y),Ke.push(Y),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,Ke)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,ct))}if(t.bindFramebuffer(i.READ_FRAMEBUFFER,null),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),oe)for(let Ue=0;Ue<x.length;Ue++){t.bindFramebuffer(i.FRAMEBUFFER,ye.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Ue,i.RENDERBUFFER,ye.__webglColorRenderbuffer[Ue]);let ee=n.get(x[Ue]).__webglTexture;t.bindFramebuffer(i.FRAMEBUFFER,ye.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+Ue,i.TEXTURE_2D,ee,0)}t.bindFramebuffer(i.DRAW_FRAMEBUFFER,ye.__webglMultisampledFramebuffer)}else if(E.depthBuffer&&E.resolveDepthBuffer===!1&&l){let x=E.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[x])}}}function P(E){return Math.min(s.maxSamples,E.samples)}function At(E){let x=n.get(E);return E.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&x.__useRenderToTexture!==!1}function et(E){let x=o.render.frame;u.get(E)!==x&&(u.set(E,x),E.update())}function dt(E,x){let D=E.colorSpace,$=E.format,J=E.type;return E.isCompressedTexture===!0||E.isVideoTexture===!0||D!==Xt&&D!==Ni&&($e.getTransfer(D)===tt?($!==Mn||J!==fn)&&Ee("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):Ne("WebGLTextures: Unsupported texture color space:",D)),x}function we(E){return typeof HTMLImageElement<"u"&&E instanceof HTMLImageElement?(c.width=E.naturalWidth||E.width,c.height=E.naturalHeight||E.height):typeof VideoFrame<"u"&&E instanceof VideoFrame?(c.width=E.displayWidth,c.height=E.displayHeight):(c.width=E.width,c.height=E.height),c}this.allocateTextureUnit=O,this.resetTextureUnits=F,this.setTexture2D=G,this.setTexture2DArray=k,this.setTexture3D=H,this.setTextureCube=ne,this.rebindTextures=zt,this.setupRenderTarget=je,this.updateRenderTargetMipmap=it,this.updateMultisampleRenderTarget=Mt,this.setupDepthRenderbuffer=Fe,this.setupFrameBufferTexture=le,this.useMultisampledRTT=At,this.isReversedDepthBuffer=function(){return t.buffers.depth.getReversed()}}function cv(i,e){function t(n,s=Ni){let r,o=$e.getTransfer(s);if(n===fn)return i.UNSIGNED_BYTE;if(n===Rl)return i.UNSIGNED_SHORT_4_4_4_4;if(n===Il)return i.UNSIGNED_SHORT_5_5_5_1;if(n===Gu)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===Wu)return i.UNSIGNED_INT_10F_11F_11F_REV;if(n===Hu)return i.BYTE;if(n===Vu)return i.SHORT;if(n===Hr)return i.UNSIGNED_SHORT;if(n===Cl)return i.INT;if(n===Gn)return i.UNSIGNED_INT;if(n===bn)return i.FLOAT;if(n===ui)return i.HALF_FLOAT;if(n===Ku)return i.ALPHA;if(n===Xu)return i.RGB;if(n===Mn)return i.RGBA;if(n===ti)return i.DEPTH_COMPONENT;if(n===is)return i.DEPTH_STENCIL;if(n===Pl)return i.RED;if(n===Ll)return i.RED_INTEGER;if(n===Bs)return i.RG;if(n===Nl)return i.RG_INTEGER;if(n===Dl)return i.RGBA_INTEGER;if(n===Jo||n===jo||n===Qo||n===ea)if(o===tt)if(r=e.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===Jo)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===jo)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===Qo)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===ea)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=e.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===Jo)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===jo)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===Qo)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===ea)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===Ul||n===Fl||n===Ol||n===Bl)if(r=e.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===Ul)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===Fl)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===Ol)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===Bl)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===kl||n===zl||n===Hl||n===Vl||n===Gl||n===Wl||n===Kl)if(r=e.get("WEBGL_compressed_texture_etc"),r!==null){if(n===kl||n===zl)return o===tt?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===Hl)return o===tt?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC;if(n===Vl)return r.COMPRESSED_R11_EAC;if(n===Gl)return r.COMPRESSED_SIGNED_R11_EAC;if(n===Wl)return r.COMPRESSED_RG11_EAC;if(n===Kl)return r.COMPRESSED_SIGNED_RG11_EAC}else return null;if(n===Xl||n===ql||n===Yl||n===$l||n===Zl||n===Jl||n===jl||n===Ql||n===ec||n===tc||n===nc||n===ic||n===sc||n===rc)if(r=e.get("WEBGL_compressed_texture_astc"),r!==null){if(n===Xl)return o===tt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===ql)return o===tt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===Yl)return o===tt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===$l)return o===tt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===Zl)return o===tt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===Jl)return o===tt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===jl)return o===tt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===Ql)return o===tt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===ec)return o===tt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===tc)return o===tt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===nc)return o===tt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===ic)return o===tt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===sc)return o===tt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===rc)return o===tt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===oc||n===ac||n===lc)if(r=e.get("EXT_texture_compression_bptc"),r!==null){if(n===oc)return o===tt?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===ac)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===lc)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===cc||n===uc||n===hc||n===dc)if(r=e.get("EXT_texture_compression_rgtc"),r!==null){if(n===cc)return r.COMPRESSED_RED_RGTC1_EXT;if(n===uc)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===hc)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===dc)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===Vr?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:t}}var uv=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,hv=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,ph=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){let n=new Do(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){let t=e.cameras[0].viewport,n=new vn({vertexShader:uv,fragmentShader:hv,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new nt(new Ri(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},mh=class extends ni{constructor(e,t){super();let n=this,s=null,r=1,o=null,a="local-floor",l=1,c=null,u=null,h=null,d=null,f=null,g=null,y=typeof XRWebGLBinding<"u",m=new ph,p={},M=t.getContextAttributes(),w=null,S=null,C=[],A=[],R=new Ie,v=null,T=new Rt;T.viewport=new pt;let K=new Rt;K.viewport=new pt;let I=[T,K],F=new bl,O=null,V=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(Z){let re=C[Z];return re===void 0&&(re=new Cr,C[Z]=re),re.getTargetRaySpace()},this.getControllerGrip=function(Z){let re=C[Z];return re===void 0&&(re=new Cr,C[Z]=re),re.getGripSpace()},this.getHand=function(Z){let re=C[Z];return re===void 0&&(re=new Cr,C[Z]=re),re.getHandSpace()};function G(Z){let re=A.indexOf(Z.inputSource);if(re===-1)return;let le=C[re];le!==void 0&&(le.update(Z.inputSource,Z.frame,c||o),le.dispatchEvent({type:Z.type,data:Z.inputSource}))}function k(){s.removeEventListener("select",G),s.removeEventListener("selectstart",G),s.removeEventListener("selectend",G),s.removeEventListener("squeeze",G),s.removeEventListener("squeezestart",G),s.removeEventListener("squeezeend",G),s.removeEventListener("end",k),s.removeEventListener("inputsourceschange",H);for(let Z=0;Z<C.length;Z++){let re=A[Z];re!==null&&(A[Z]=null,C[Z].disconnect(re))}O=null,V=null,m.reset();for(let Z in p)delete p[Z];e.setRenderTarget(w),f=null,d=null,h=null,s=null,S=null,mt.stop(),n.isPresenting=!1,e.setPixelRatio(v),e.setSize(R.width,R.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(Z){r=Z,n.isPresenting===!0&&Ee("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(Z){a=Z,n.isPresenting===!0&&Ee("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||o},this.setReferenceSpace=function(Z){c=Z},this.getBaseLayer=function(){return d!==null?d:f},this.getBinding=function(){return h===null&&y&&(h=new XRWebGLBinding(s,t)),h},this.getFrame=function(){return g},this.getSession=function(){return s},this.setSession=async function(Z){if(s=Z,s!==null){if(w=e.getRenderTarget(),s.addEventListener("select",G),s.addEventListener("selectstart",G),s.addEventListener("selectend",G),s.addEventListener("squeeze",G),s.addEventListener("squeezestart",G),s.addEventListener("squeezeend",G),s.addEventListener("end",k),s.addEventListener("inputsourceschange",H),M.xrCompatible!==!0&&await t.makeXRCompatible(),v=e.getPixelRatio(),e.getSize(R),y&&"createProjectionLayer"in XRWebGLBinding.prototype){let le=null,Ve=null,De=null;M.depth&&(De=M.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,le=M.stencil?is:ti,Ve=M.stencil?Vr:Gn);let Fe={colorFormat:t.RGBA8,depthFormat:De,scaleFactor:r};h=this.getBinding(),d=h.createProjectionLayer(Fe),s.updateRenderState({layers:[d]}),e.setPixelRatio(1),e.setSize(d.textureWidth,d.textureHeight,!1),S=new _n(d.textureWidth,d.textureHeight,{format:Mn,type:fn,depthTexture:new es(d.textureWidth,d.textureHeight,Ve,void 0,void 0,void 0,void 0,void 0,void 0,le),stencilBuffer:M.stencil,colorSpace:e.outputColorSpace,samples:M.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1})}else{let le={antialias:M.antialias,alpha:!0,depth:M.depth,stencil:M.stencil,framebufferScaleFactor:r};f=new XRWebGLLayer(s,t,le),s.updateRenderState({baseLayer:f}),e.setPixelRatio(1),e.setSize(f.framebufferWidth,f.framebufferHeight,!1),S=new _n(f.framebufferWidth,f.framebufferHeight,{format:Mn,type:fn,colorSpace:e.outputColorSpace,stencilBuffer:M.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1})}S.isXRRenderTarget=!0,this.setFoveation(l),c=null,o=await s.requestReferenceSpace(a),mt.setContext(s),mt.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return m.getDepthTexture()};function H(Z){for(let re=0;re<Z.removed.length;re++){let le=Z.removed[re],Ve=A.indexOf(le);Ve>=0&&(A[Ve]=null,C[Ve].disconnect(le))}for(let re=0;re<Z.added.length;re++){let le=Z.added[re],Ve=A.indexOf(le);if(Ve===-1){for(let Fe=0;Fe<C.length;Fe++)if(Fe>=A.length){A.push(le),Ve=Fe;break}else if(A[Fe]===null){A[Fe]=le,Ve=Fe;break}if(Ve===-1)break}let De=C[Ve];De&&De.connect(le)}}let ne=new L,j=new L;function de(Z,re,le){ne.setFromMatrixPosition(re.matrixWorld),j.setFromMatrixPosition(le.matrixWorld);let Ve=ne.distanceTo(j),De=re.projectionMatrix.elements,Fe=le.projectionMatrix.elements,zt=De[14]/(De[10]-1),je=De[14]/(De[10]+1),it=(De[9]+1)/De[5],ct=(De[9]-1)/De[5],Ke=(De[8]-1)/De[0],Mt=(Fe[8]+1)/Fe[0],P=zt*Ke,At=zt*Mt,et=Ve/(-Ke+Mt),dt=et*-Ke;if(re.matrixWorld.decompose(Z.position,Z.quaternion,Z.scale),Z.translateX(dt),Z.translateZ(et),Z.matrixWorld.compose(Z.position,Z.quaternion,Z.scale),Z.matrixWorldInverse.copy(Z.matrixWorld).invert(),De[10]===-1)Z.projectionMatrix.copy(re.projectionMatrix),Z.projectionMatrixInverse.copy(re.projectionMatrixInverse);else{let we=zt+et,E=je+et,x=P-dt,D=At+(Ve-dt),$=it*je/E*we,J=ct*je/E*we;Z.projectionMatrix.makePerspective(x,D,$,J,we,E),Z.projectionMatrixInverse.copy(Z.projectionMatrix).invert()}}function xe(Z,re){re===null?Z.matrixWorld.copy(Z.matrix):Z.matrixWorld.multiplyMatrices(re.matrixWorld,Z.matrix),Z.matrixWorldInverse.copy(Z.matrixWorld).invert()}this.updateCamera=function(Z){if(s===null)return;let re=Z.near,le=Z.far;m.texture!==null&&(m.depthNear>0&&(re=m.depthNear),m.depthFar>0&&(le=m.depthFar)),F.near=K.near=T.near=re,F.far=K.far=T.far=le,(O!==F.near||V!==F.far)&&(s.updateRenderState({depthNear:F.near,depthFar:F.far}),O=F.near,V=F.far),F.layers.mask=Z.layers.mask|6,T.layers.mask=F.layers.mask&-5,K.layers.mask=F.layers.mask&-3;let Ve=Z.parent,De=F.cameras;xe(F,Ve);for(let Fe=0;Fe<De.length;Fe++)xe(De[Fe],Ve);De.length===2?de(F,T,K):F.projectionMatrix.copy(T.projectionMatrix),pe(Z,F,Ve)};function pe(Z,re,le){le===null?Z.matrix.copy(re.matrixWorld):(Z.matrix.copy(le.matrixWorld),Z.matrix.invert(),Z.matrix.multiply(re.matrixWorld)),Z.matrix.decompose(Z.position,Z.quaternion,Z.scale),Z.updateMatrixWorld(!0),Z.projectionMatrix.copy(re.projectionMatrix),Z.projectionMatrixInverse.copy(re.projectionMatrixInverse),Z.isPerspectiveCamera&&(Z.fov=Cs*2*Math.atan(1/Z.projectionMatrix.elements[5]),Z.zoom=1)}this.getCamera=function(){return F},this.getFoveation=function(){if(!(d===null&&f===null))return l},this.setFoveation=function(Z){l=Z,d!==null&&(d.fixedFoveation=Z),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=Z)},this.hasDepthSensing=function(){return m.texture!==null},this.getDepthSensingMesh=function(){return m.getMesh(F)},this.getCameraTexture=function(Z){return p[Z]};let Ge=null;function xt(Z,re){if(u=re.getViewerPose(c||o),g=re,u!==null){let le=u.views;f!==null&&(e.setRenderTargetFramebuffer(S,f.framebuffer),e.setRenderTarget(S));let Ve=!1;le.length!==F.cameras.length&&(F.cameras.length=0,Ve=!0);for(let je=0;je<le.length;je++){let it=le[je],ct=null;if(f!==null)ct=f.getViewport(it);else{let Mt=h.getViewSubImage(d,it);ct=Mt.viewport,je===0&&(e.setRenderTargetTextures(S,Mt.colorTexture,Mt.depthStencilTexture),e.setRenderTarget(S))}let Ke=I[je];Ke===void 0&&(Ke=new Rt,Ke.layers.enable(je),Ke.viewport=new pt,I[je]=Ke),Ke.matrix.fromArray(it.transform.matrix),Ke.matrix.decompose(Ke.position,Ke.quaternion,Ke.scale),Ke.projectionMatrix.fromArray(it.projectionMatrix),Ke.projectionMatrixInverse.copy(Ke.projectionMatrix).invert(),Ke.viewport.set(ct.x,ct.y,ct.width,ct.height),je===0&&(F.matrix.copy(Ke.matrix),F.matrix.decompose(F.position,F.quaternion,F.scale)),Ve===!0&&F.cameras.push(Ke)}let De=s.enabledFeatures;if(De&&De.includes("depth-sensing")&&s.depthUsage=="gpu-optimized"&&y){h=n.getBinding();let je=h.getDepthInformation(le[0]);je&&je.isValid&&je.texture&&m.init(je,s.renderState)}if(De&&De.includes("camera-access")&&y){e.state.unbindTexture(),h=n.getBinding();for(let je=0;je<le.length;je++){let it=le[je].camera;if(it){let ct=p[it];ct||(ct=new Do,p[it]=ct);let Ke=h.getCameraImage(it);ct.sourceTexture=Ke}}}}for(let le=0;le<C.length;le++){let Ve=A[le],De=C[le];Ve!==null&&De!==void 0&&De.update(Ve,re,c||o)}Ge&&Ge(Z,re),re.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:re}),g=null}let mt=new Ap;mt.setAnimationLoop(xt),this.setAnimationLoop=function(Z){Ge=Z},this.dispose=function(){}}},Hs=new zn,dv=new ze;function fv(i,e){function t(m,p){m.matrixAutoUpdate===!0&&m.updateMatrix(),p.value.copy(m.matrix)}function n(m,p){p.color.getRGB(m.fogColor.value,Ju(i)),p.isFog?(m.fogNear.value=p.near,m.fogFar.value=p.far):p.isFogExp2&&(m.fogDensity.value=p.density)}function s(m,p,M,w,S){p.isMeshBasicMaterial?r(m,p):p.isMeshLambertMaterial?(r(m,p),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)):p.isMeshToonMaterial?(r(m,p),h(m,p)):p.isMeshPhongMaterial?(r(m,p),u(m,p),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)):p.isMeshStandardMaterial?(r(m,p),d(m,p),p.isMeshPhysicalMaterial&&f(m,p,S)):p.isMeshMatcapMaterial?(r(m,p),g(m,p)):p.isMeshDepthMaterial?r(m,p):p.isMeshDistanceMaterial?(r(m,p),y(m,p)):p.isMeshNormalMaterial?r(m,p):p.isLineBasicMaterial?(o(m,p),p.isLineDashedMaterial&&a(m,p)):p.isPointsMaterial?l(m,p,M,w):p.isSpriteMaterial?c(m,p):p.isShadowMaterial?(m.color.value.copy(p.color),m.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function r(m,p){m.opacity.value=p.opacity,p.color&&m.diffuse.value.copy(p.color),p.emissive&&m.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(m.map.value=p.map,t(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.bumpMap&&(m.bumpMap.value=p.bumpMap,t(p.bumpMap,m.bumpMapTransform),m.bumpScale.value=p.bumpScale,p.side===on&&(m.bumpScale.value*=-1)),p.normalMap&&(m.normalMap.value=p.normalMap,t(p.normalMap,m.normalMapTransform),m.normalScale.value.copy(p.normalScale),p.side===on&&m.normalScale.value.negate()),p.displacementMap&&(m.displacementMap.value=p.displacementMap,t(p.displacementMap,m.displacementMapTransform),m.displacementScale.value=p.displacementScale,m.displacementBias.value=p.displacementBias),p.emissiveMap&&(m.emissiveMap.value=p.emissiveMap,t(p.emissiveMap,m.emissiveMapTransform)),p.specularMap&&(m.specularMap.value=p.specularMap,t(p.specularMap,m.specularMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest);let M=e.get(p),w=M.envMap,S=M.envMapRotation;w&&(m.envMap.value=w,Hs.copy(S),Hs.x*=-1,Hs.y*=-1,Hs.z*=-1,w.isCubeTexture&&w.isRenderTargetTexture===!1&&(Hs.y*=-1,Hs.z*=-1),m.envMapRotation.value.setFromMatrix4(dv.makeRotationFromEuler(Hs)),m.flipEnvMap.value=w.isCubeTexture&&w.isRenderTargetTexture===!1?-1:1,m.reflectivity.value=p.reflectivity,m.ior.value=p.ior,m.refractionRatio.value=p.refractionRatio),p.lightMap&&(m.lightMap.value=p.lightMap,m.lightMapIntensity.value=p.lightMapIntensity,t(p.lightMap,m.lightMapTransform)),p.aoMap&&(m.aoMap.value=p.aoMap,m.aoMapIntensity.value=p.aoMapIntensity,t(p.aoMap,m.aoMapTransform))}function o(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,p.map&&(m.map.value=p.map,t(p.map,m.mapTransform))}function a(m,p){m.dashSize.value=p.dashSize,m.totalSize.value=p.dashSize+p.gapSize,m.scale.value=p.scale}function l(m,p,M,w){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.size.value=p.size*M,m.scale.value=w*.5,p.map&&(m.map.value=p.map,t(p.map,m.uvTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function c(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.rotation.value=p.rotation,p.map&&(m.map.value=p.map,t(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function u(m,p){m.specular.value.copy(p.specular),m.shininess.value=Math.max(p.shininess,1e-4)}function h(m,p){p.gradientMap&&(m.gradientMap.value=p.gradientMap)}function d(m,p){m.metalness.value=p.metalness,p.metalnessMap&&(m.metalnessMap.value=p.metalnessMap,t(p.metalnessMap,m.metalnessMapTransform)),m.roughness.value=p.roughness,p.roughnessMap&&(m.roughnessMap.value=p.roughnessMap,t(p.roughnessMap,m.roughnessMapTransform)),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)}function f(m,p,M){m.ior.value=p.ior,p.sheen>0&&(m.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),m.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(m.sheenColorMap.value=p.sheenColorMap,t(p.sheenColorMap,m.sheenColorMapTransform)),p.sheenRoughnessMap&&(m.sheenRoughnessMap.value=p.sheenRoughnessMap,t(p.sheenRoughnessMap,m.sheenRoughnessMapTransform))),p.clearcoat>0&&(m.clearcoat.value=p.clearcoat,m.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(m.clearcoatMap.value=p.clearcoatMap,t(p.clearcoatMap,m.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,t(p.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(m.clearcoatNormalMap.value=p.clearcoatNormalMap,t(p.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===on&&m.clearcoatNormalScale.value.negate())),p.dispersion>0&&(m.dispersion.value=p.dispersion),p.iridescence>0&&(m.iridescence.value=p.iridescence,m.iridescenceIOR.value=p.iridescenceIOR,m.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(m.iridescenceMap.value=p.iridescenceMap,t(p.iridescenceMap,m.iridescenceMapTransform)),p.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=p.iridescenceThicknessMap,t(p.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),p.transmission>0&&(m.transmission.value=p.transmission,m.transmissionSamplerMap.value=M.texture,m.transmissionSamplerSize.value.set(M.width,M.height),p.transmissionMap&&(m.transmissionMap.value=p.transmissionMap,t(p.transmissionMap,m.transmissionMapTransform)),m.thickness.value=p.thickness,p.thicknessMap&&(m.thicknessMap.value=p.thicknessMap,t(p.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=p.attenuationDistance,m.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(m.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(m.anisotropyMap.value=p.anisotropyMap,t(p.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=p.specularIntensity,m.specularColor.value.copy(p.specularColor),p.specularColorMap&&(m.specularColorMap.value=p.specularColorMap,t(p.specularColorMap,m.specularColorMapTransform)),p.specularIntensityMap&&(m.specularIntensityMap.value=p.specularIntensityMap,t(p.specularIntensityMap,m.specularIntensityMapTransform))}function g(m,p){p.matcap&&(m.matcap.value=p.matcap)}function y(m,p){let M=e.get(p).light;m.referencePosition.value.setFromMatrixPosition(M.matrixWorld),m.nearDistance.value=M.shadow.camera.near,m.farDistance.value=M.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:s}}function pv(i,e,t,n){let s={},r={},o=[],a=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function l(M,w){let S=w.program;n.uniformBlockBinding(M,S)}function c(M,w){let S=s[M.id];S===void 0&&(g(M),S=u(M),s[M.id]=S,M.addEventListener("dispose",m));let C=w.program;n.updateUBOMapping(M,C);let A=e.render.frame;r[M.id]!==A&&(d(M),r[M.id]=A)}function u(M){let w=h();M.__bindingPointIndex=w;let S=i.createBuffer(),C=M.__size,A=M.usage;return i.bindBuffer(i.UNIFORM_BUFFER,S),i.bufferData(i.UNIFORM_BUFFER,C,A),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,w,S),S}function h(){for(let M=0;M<a;M++)if(o.indexOf(M)===-1)return o.push(M),M;return Ne("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function d(M){let w=s[M.id],S=M.uniforms,C=M.__cache;i.bindBuffer(i.UNIFORM_BUFFER,w);for(let A=0,R=S.length;A<R;A++){let v=Array.isArray(S[A])?S[A]:[S[A]];for(let T=0,K=v.length;T<K;T++){let I=v[T];if(f(I,A,T,C)===!0){let F=I.__offset,O=Array.isArray(I.value)?I.value:[I.value],V=0;for(let G=0;G<O.length;G++){let k=O[G],H=y(k);typeof k=="number"||typeof k=="boolean"?(I.__data[0]=k,i.bufferSubData(i.UNIFORM_BUFFER,F+V,I.__data)):k.isMatrix3?(I.__data[0]=k.elements[0],I.__data[1]=k.elements[1],I.__data[2]=k.elements[2],I.__data[3]=0,I.__data[4]=k.elements[3],I.__data[5]=k.elements[4],I.__data[6]=k.elements[5],I.__data[7]=0,I.__data[8]=k.elements[6],I.__data[9]=k.elements[7],I.__data[10]=k.elements[8],I.__data[11]=0):(k.toArray(I.__data,V),V+=H.storage/Float32Array.BYTES_PER_ELEMENT)}i.bufferSubData(i.UNIFORM_BUFFER,F,I.__data)}}}i.bindBuffer(i.UNIFORM_BUFFER,null)}function f(M,w,S,C){let A=M.value,R=w+"_"+S;if(C[R]===void 0)return typeof A=="number"||typeof A=="boolean"?C[R]=A:C[R]=A.clone(),!0;{let v=C[R];if(typeof A=="number"||typeof A=="boolean"){if(v!==A)return C[R]=A,!0}else if(v.equals(A)===!1)return v.copy(A),!0}return!1}function g(M){let w=M.uniforms,S=0,C=16;for(let R=0,v=w.length;R<v;R++){let T=Array.isArray(w[R])?w[R]:[w[R]];for(let K=0,I=T.length;K<I;K++){let F=T[K],O=Array.isArray(F.value)?F.value:[F.value];for(let V=0,G=O.length;V<G;V++){let k=O[V],H=y(k),ne=S%C,j=ne%H.boundary,de=ne+j;S+=j,de!==0&&C-de<H.storage&&(S+=C-de),F.__data=new Float32Array(H.storage/Float32Array.BYTES_PER_ELEMENT),F.__offset=S,S+=H.storage}}}let A=S%C;return A>0&&(S+=C-A),M.__size=S,M.__cache={},this}function y(M){let w={boundary:0,storage:0};return typeof M=="number"||typeof M=="boolean"?(w.boundary=4,w.storage=4):M.isVector2?(w.boundary=8,w.storage=8):M.isVector3||M.isColor?(w.boundary=16,w.storage=12):M.isVector4?(w.boundary=16,w.storage=16):M.isMatrix3?(w.boundary=48,w.storage=48):M.isMatrix4?(w.boundary=64,w.storage=64):M.isTexture?Ee("WebGLRenderer: Texture samplers can not be part of an uniforms group."):Ee("WebGLRenderer: Unsupported uniform value type.",M),w}function m(M){let w=M.target;w.removeEventListener("dispose",m);let S=o.indexOf(w.__bindingPointIndex);o.splice(S,1),i.deleteBuffer(s[w.id]),delete s[w.id],delete r[w.id]}function p(){for(let M in s)i.deleteBuffer(s[M]);o=[],s={},r={}}return{bind:l,update:c,dispose:p}}var mv=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),hi=null;function gv(){return hi===null&&(hi=new Pr(mv,16,16,Bs,ui),hi.name="DFG_LUT",hi.minFilter=Tt,hi.magFilter=Tt,hi.wrapS=En,hi.wrapT=En,hi.generateMipmaps=!1,hi.needsUpdate=!0),hi}var Mc=class{constructor(e={}){let{canvas:t=Zf(),context:n=null,depth:s=!0,stencil:r=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:u="default",failIfMajorPerformanceCaveat:h=!1,reversedDepthBuffer:d=!1,outputBufferType:f=fn}=e;this.isWebGLRenderer=!0;let g;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");g=n.getContextAttributes().alpha}else g=o;let y=f,m=new Set([Dl,Nl,Ll]),p=new Set([fn,Gn,Hr,Vr,Rl,Il]),M=new Uint32Array(4),w=new Int32Array(4),S=null,C=null,A=[],R=[],v=null;this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=Hn,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let T=this,K=!1;this._outputColorSpace=_t;let I=0,F=0,O=null,V=-1,G=null,k=new pt,H=new pt,ne=null,j=new Pe(0),de=0,xe=t.width,pe=t.height,Ge=1,xt=null,mt=null,Z=new pt(0,0,xe,pe),re=new pt(0,0,xe,pe),le=!1,Ve=new Lr,De=!1,Fe=!1,zt=new ze,je=new L,it=new pt,ct={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},Ke=!1;function Mt(){return O===null?Ge:1}let P=n;function At(b,U){return t.getContext(b,U)}try{let b={alpha:!0,depth:s,stencil:r,antialias:a,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:u,failIfMajorPerformanceCaveat:h};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${"183"}`),t.addEventListener("webglcontextlost",be,!1),t.addEventListener("webglcontextrestored",Oe,!1),t.addEventListener("webglcontextcreationerror",ft,!1),P===null){let U="webgl2";if(P=At(U,b),P===null)throw At(U)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(b){throw Ne("WebGLRenderer: "+b.message),b}let et,dt,we,E,x,D,$,J,Y,ye,oe,Re,Ue,ee,ie,ve,Me,fe,Xe,N,ae,se,ge;function te(){et=new w_(P),et.init(),ae=new cv(P,et),dt=new g_(P,et,e,ae),we=new av(P,et),dt.reversedDepthBuffer&&d&&we.buffers.depth.setReversed(!0),E=new A_(P),x=new qy,D=new lv(P,et,we,x,dt,ae,E),$=new S_(T),J=new Lg(P),se=new p_(P,J),Y=new T_(P,J,E,se),ye=new R_(P,Y,J,se,E),fe=new C_(P,dt,D),ie=new x_(x),oe=new Xy(T,$,et,dt,se,ie),Re=new fv(T,x),Ue=new $y,ee=new tv(et),Me=new f_(T,$,we,ye,g,l),ve=new ov(T,ye,dt),ge=new pv(P,E,dt,we),Xe=new m_(P,et,E),N=new E_(P,et,E),E.programs=oe.programs,T.capabilities=dt,T.extensions=et,T.properties=x,T.renderLists=Ue,T.shadowMap=ve,T.state=we,T.info=E}te(),y!==fn&&(v=new P_(y,t.width,t.height,s,r));let X=new mh(T,P);this.xr=X,this.getContext=function(){return P},this.getContextAttributes=function(){return P.getContextAttributes()},this.forceContextLoss=function(){let b=et.get("WEBGL_lose_context");b&&b.loseContext()},this.forceContextRestore=function(){let b=et.get("WEBGL_lose_context");b&&b.restoreContext()},this.getPixelRatio=function(){return Ge},this.setPixelRatio=function(b){b!==void 0&&(Ge=b,this.setSize(xe,pe,!1))},this.getSize=function(b){return b.set(xe,pe)},this.setSize=function(b,U,W=!0){if(X.isPresenting){Ee("WebGLRenderer: Can't change size while VR device is presenting.");return}xe=b,pe=U,t.width=Math.floor(b*Ge),t.height=Math.floor(U*Ge),W===!0&&(t.style.width=b+"px",t.style.height=U+"px"),v!==null&&v.setSize(t.width,t.height),this.setViewport(0,0,b,U)},this.getDrawingBufferSize=function(b){return b.set(xe*Ge,pe*Ge).floor()},this.setDrawingBufferSize=function(b,U,W){xe=b,pe=U,Ge=W,t.width=Math.floor(b*W),t.height=Math.floor(U*W),this.setViewport(0,0,b,U)},this.setEffects=function(b){if(y===fn){console.error("THREE.WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(b){for(let U=0;U<b.length;U++)if(b[U].isOutputPass===!0){console.warn("THREE.WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}v.setEffects(b||[])},this.getCurrentViewport=function(b){return b.copy(k)},this.getViewport=function(b){return b.copy(Z)},this.setViewport=function(b,U,W,z){b.isVector4?Z.set(b.x,b.y,b.z,b.w):Z.set(b,U,W,z),we.viewport(k.copy(Z).multiplyScalar(Ge).round())},this.getScissor=function(b){return b.copy(re)},this.setScissor=function(b,U,W,z){b.isVector4?re.set(b.x,b.y,b.z,b.w):re.set(b,U,W,z),we.scissor(H.copy(re).multiplyScalar(Ge).round())},this.getScissorTest=function(){return le},this.setScissorTest=function(b){we.setScissorTest(le=b)},this.setOpaqueSort=function(b){xt=b},this.setTransparentSort=function(b){mt=b},this.getClearColor=function(b){return b.copy(Me.getClearColor())},this.setClearColor=function(){Me.setClearColor(...arguments)},this.getClearAlpha=function(){return Me.getClearAlpha()},this.setClearAlpha=function(){Me.setClearAlpha(...arguments)},this.clear=function(b=!0,U=!0,W=!0){let z=0;if(b){let B=!1;if(O!==null){let ue=O.texture.format;B=m.has(ue)}if(B){let ue=O.texture.type,me=p.has(ue),he=Me.getClearColor(),Se=Me.getClearAlpha(),Ae=he.r,ke=he.g,qe=he.b;me?(M[0]=Ae,M[1]=ke,M[2]=qe,M[3]=Se,P.clearBufferuiv(P.COLOR,0,M)):(w[0]=Ae,w[1]=ke,w[2]=qe,w[3]=Se,P.clearBufferiv(P.COLOR,0,w))}else z|=P.COLOR_BUFFER_BIT}U&&(z|=P.DEPTH_BUFFER_BIT),W&&(z|=P.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),z!==0&&P.clear(z)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",be,!1),t.removeEventListener("webglcontextrestored",Oe,!1),t.removeEventListener("webglcontextcreationerror",ft,!1),Me.dispose(),Ue.dispose(),ee.dispose(),x.dispose(),$.dispose(),ye.dispose(),se.dispose(),ge.dispose(),oe.dispose(),X.dispose(),X.removeEventListener("sessionstart",wd),X.removeEventListener("sessionend",Td),ms.stop()};function be(b){b.preventDefault(),yo("WebGLRenderer: Context Lost."),K=!0}function Oe(){yo("WebGLRenderer: Context Restored."),K=!1;let b=E.autoReset,U=ve.enabled,W=ve.autoUpdate,z=ve.needsUpdate,B=ve.type;te(),E.autoReset=b,ve.enabled=U,ve.autoUpdate=W,ve.needsUpdate=z,ve.type=B}function ft(b){Ne("WebGLRenderer: A WebGL context could not be created. Reason: ",b.statusMessage)}function st(b){let U=b.target;U.removeEventListener("dispose",st),yi(U)}function yi(b){vi(b),x.remove(b)}function vi(b){let U=x.get(b).programs;U!==void 0&&(U.forEach(function(W){oe.releaseProgram(W)}),b.isShaderMaterial&&oe.releaseShaderCache(b))}this.renderBufferDirect=function(b,U,W,z,B,ue){U===null&&(U=ct);let me=B.isMesh&&B.matrixWorld.determinant()<0,he=wm(b,U,W,z,B);we.setMaterial(z,me);let Se=W.index,Ae=1;if(z.wireframe===!0){if(Se=Y.getWireframeAttribute(W),Se===void 0)return;Ae=2}let ke=W.drawRange,qe=W.attributes.position,Ce=ke.start*Ae,ot=(ke.start+ke.count)*Ae;ue!==null&&(Ce=Math.max(Ce,ue.start*Ae),ot=Math.min(ot,(ue.start+ue.count)*Ae)),Se!==null?(Ce=Math.max(Ce,0),ot=Math.min(ot,Se.count)):qe!=null&&(Ce=Math.max(Ce,0),ot=Math.min(ot,qe.count));let St=ot-Ce;if(St<0||St===1/0)return;se.setup(B,z,he,W,Se);let bt,at=Xe;if(Se!==null&&(bt=J.get(Se),at=N,at.setIndex(bt)),B.isMesh)z.wireframe===!0?(we.setLineWidth(z.wireframeLinewidth*Mt()),at.setMode(P.LINES)):at.setMode(P.TRIANGLES);else if(B.isLine){let $t=z.linewidth;$t===void 0&&($t=1),we.setLineWidth($t*Mt()),B.isLineSegments?at.setMode(P.LINES):B.isLineLoop?at.setMode(P.LINE_LOOP):at.setMode(P.LINE_STRIP)}else B.isPoints?at.setMode(P.POINTS):B.isSprite&&at.setMode(P.TRIANGLES);if(B.isBatchedMesh)if(B._multiDrawInstances!==null)vo("WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),at.renderMultiDrawInstances(B._multiDrawStarts,B._multiDrawCounts,B._multiDrawCount,B._multiDrawInstances);else if(et.get("WEBGL_multi_draw"))at.renderMultiDraw(B._multiDrawStarts,B._multiDrawCounts,B._multiDrawCount);else{let $t=B._multiDrawStarts,Te=B._multiDrawCounts,mn=B._multiDrawCount,Qe=Se?J.get(Se).bytesPerElement:1,Ln=x.get(z).currentProgram.getUniforms();for(let Jn=0;Jn<mn;Jn++)Ln.setValue(P,"_gl_DrawID",Jn),at.render($t[Jn]/Qe,Te[Jn])}else if(B.isInstancedMesh)at.renderInstances(Ce,St,B.count);else if(W.isInstancedBufferGeometry){let $t=W._maxInstanceCount!==void 0?W._maxInstanceCount:1/0,Te=Math.min(W.instanceCount,$t);at.renderInstances(Ce,St,Te)}else at.render(Ce,St)};function Sd(b,U,W){b.transparent===!0&&b.side===An&&b.forceSinglePass===!1?(b.side=on,b.needsUpdate=!0,_a(b,U,W),b.side=kn,b.needsUpdate=!0,_a(b,U,W),b.side=An):_a(b,U,W)}this.compile=function(b,U,W=null){W===null&&(W=b),C=ee.get(W),C.init(U),R.push(C),W.traverseVisible(function(B){B.isLight&&B.layers.test(U.layers)&&(C.pushLight(B),B.castShadow&&C.pushShadow(B))}),b!==W&&b.traverseVisible(function(B){B.isLight&&B.layers.test(U.layers)&&(C.pushLight(B),B.castShadow&&C.pushShadow(B))}),C.setupLights();let z=new Set;return b.traverse(function(B){if(!(B.isMesh||B.isPoints||B.isLine||B.isSprite))return;let ue=B.material;if(ue)if(Array.isArray(ue))for(let me=0;me<ue.length;me++){let he=ue[me];Sd(he,W,B),z.add(he)}else Sd(ue,W,B),z.add(ue)}),C=R.pop(),z},this.compileAsync=function(b,U,W=null){let z=this.compile(b,U,W);return new Promise(B=>{function ue(){if(z.forEach(function(me){x.get(me).currentProgram.isReady()&&z.delete(me)}),z.size===0){B(b);return}setTimeout(ue,10)}et.get("KHR_parallel_shader_compile")!==null?ue():setTimeout(ue,10)})};let Kc=null;function Sm(b){Kc&&Kc(b)}function wd(){ms.stop()}function Td(){ms.start()}let ms=new Ap;ms.setAnimationLoop(Sm),typeof self<"u"&&ms.setContext(self),this.setAnimationLoop=function(b){Kc=b,X.setAnimationLoop(b),b===null?ms.stop():ms.start()},X.addEventListener("sessionstart",wd),X.addEventListener("sessionend",Td),this.render=function(b,U){if(U!==void 0&&U.isCamera!==!0){Ne("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(K===!0)return;let W=X.enabled===!0&&X.isPresenting===!0,z=v!==null&&(O===null||W)&&v.begin(T,O);if(b.matrixWorldAutoUpdate===!0&&b.updateMatrixWorld(),U.parent===null&&U.matrixWorldAutoUpdate===!0&&U.updateMatrixWorld(),X.enabled===!0&&X.isPresenting===!0&&(v===null||v.isCompositing()===!1)&&(X.cameraAutoUpdate===!0&&X.updateCamera(U),U=X.getCamera()),b.isScene===!0&&b.onBeforeRender(T,b,U,O),C=ee.get(b,R.length),C.init(U),R.push(C),zt.multiplyMatrices(U.projectionMatrix,U.matrixWorldInverse),Ve.setFromProjectionMatrix(zt,On,U.reversedDepth),Fe=this.localClippingEnabled,De=ie.init(this.clippingPlanes,Fe),S=Ue.get(b,A.length),S.init(),A.push(S),X.enabled===!0&&X.isPresenting===!0){let me=T.xr.getDepthSensingMesh();me!==null&&Xc(me,U,-1/0,T.sortObjects)}Xc(b,U,0,T.sortObjects),S.finish(),T.sortObjects===!0&&S.sort(xt,mt),Ke=X.enabled===!1||X.isPresenting===!1||X.hasDepthSensing()===!1,Ke&&Me.addToRenderList(S,b),this.info.render.frame++,De===!0&&ie.beginShadows();let B=C.state.shadowsArray;if(ve.render(B,b,U),De===!0&&ie.endShadows(),this.info.autoReset===!0&&this.info.reset(),(z&&v.hasRenderPass())===!1){let me=S.opaque,he=S.transmissive;if(C.setupLights(),U.isArrayCamera){let Se=U.cameras;if(he.length>0)for(let Ae=0,ke=Se.length;Ae<ke;Ae++){let qe=Se[Ae];Ad(me,he,b,qe)}Ke&&Me.render(b);for(let Ae=0,ke=Se.length;Ae<ke;Ae++){let qe=Se[Ae];Ed(S,b,qe,qe.viewport)}}else he.length>0&&Ad(me,he,b,U),Ke&&Me.render(b),Ed(S,b,U)}O!==null&&F===0&&(D.updateMultisampleRenderTarget(O),D.updateRenderTargetMipmap(O)),z&&v.end(T),b.isScene===!0&&b.onAfterRender(T,b,U),se.resetDefaultState(),V=-1,G=null,R.pop(),R.length>0?(C=R[R.length-1],De===!0&&ie.setGlobalState(T.clippingPlanes,C.state.camera)):C=null,A.pop(),A.length>0?S=A[A.length-1]:S=null};function Xc(b,U,W,z){if(b.visible===!1)return;if(b.layers.test(U.layers)){if(b.isGroup)W=b.renderOrder;else if(b.isLOD)b.autoUpdate===!0&&b.update(U);else if(b.isLight)C.pushLight(b),b.castShadow&&C.pushShadow(b);else if(b.isSprite){if(!b.frustumCulled||Ve.intersectsSprite(b)){z&&it.setFromMatrixPosition(b.matrixWorld).applyMatrix4(zt);let me=ye.update(b),he=b.material;he.visible&&S.push(b,me,he,W,it.z,null)}}else if((b.isMesh||b.isLine||b.isPoints)&&(!b.frustumCulled||Ve.intersectsObject(b))){let me=ye.update(b),he=b.material;if(z&&(b.boundingSphere!==void 0?(b.boundingSphere===null&&b.computeBoundingSphere(),it.copy(b.boundingSphere.center)):(me.boundingSphere===null&&me.computeBoundingSphere(),it.copy(me.boundingSphere.center)),it.applyMatrix4(b.matrixWorld).applyMatrix4(zt)),Array.isArray(he)){let Se=me.groups;for(let Ae=0,ke=Se.length;Ae<ke;Ae++){let qe=Se[Ae],Ce=he[qe.materialIndex];Ce&&Ce.visible&&S.push(b,me,Ce,W,it.z,qe)}}else he.visible&&S.push(b,me,he,W,it.z,null)}}let ue=b.children;for(let me=0,he=ue.length;me<he;me++)Xc(ue[me],U,W,z)}function Ed(b,U,W,z){let{opaque:B,transmissive:ue,transparent:me}=b;C.setupLightsView(W),De===!0&&ie.setGlobalState(T.clippingPlanes,W),z&&we.viewport(k.copy(z)),B.length>0&&xa(B,U,W),ue.length>0&&xa(ue,U,W),me.length>0&&xa(me,U,W),we.buffers.depth.setTest(!0),we.buffers.depth.setMask(!0),we.buffers.color.setMask(!0),we.setPolygonOffset(!1)}function Ad(b,U,W,z){if((W.isScene===!0?W.overrideMaterial:null)!==null)return;if(C.state.transmissionRenderTarget[z.id]===void 0){let Ce=et.has("EXT_color_buffer_half_float")||et.has("EXT_color_buffer_float");C.state.transmissionRenderTarget[z.id]=new _n(1,1,{generateMipmaps:!0,type:Ce?ui:fn,minFilter:Vn,samples:Math.max(4,dt.samples),stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:$e.workingColorSpace})}let ue=C.state.transmissionRenderTarget[z.id],me=z.viewport||k;ue.setSize(me.z*T.transmissionResolutionScale,me.w*T.transmissionResolutionScale);let he=T.getRenderTarget(),Se=T.getActiveCubeFace(),Ae=T.getActiveMipmapLevel();T.setRenderTarget(ue),T.getClearColor(j),de=T.getClearAlpha(),de<1&&T.setClearColor(16777215,.5),T.clear(),Ke&&Me.render(W);let ke=T.toneMapping;T.toneMapping=Hn;let qe=z.viewport;if(z.viewport!==void 0&&(z.viewport=void 0),C.setupLightsView(z),De===!0&&ie.setGlobalState(T.clippingPlanes,z),xa(b,W,z),D.updateMultisampleRenderTarget(ue),D.updateRenderTargetMipmap(ue),et.has("WEBGL_multisampled_render_to_texture")===!1){let Ce=!1;for(let ot=0,St=U.length;ot<St;ot++){let bt=U[ot],{object:at,geometry:$t,material:Te,group:mn}=bt;if(Te.side===An&&at.layers.test(z.layers)){let Qe=Te.side;Te.side=on,Te.needsUpdate=!0,Cd(at,W,z,$t,Te,mn),Te.side=Qe,Te.needsUpdate=!0,Ce=!0}}Ce===!0&&(D.updateMultisampleRenderTarget(ue),D.updateRenderTargetMipmap(ue))}T.setRenderTarget(he,Se,Ae),T.setClearColor(j,de),qe!==void 0&&(z.viewport=qe),T.toneMapping=ke}function xa(b,U,W){let z=U.isScene===!0?U.overrideMaterial:null;for(let B=0,ue=b.length;B<ue;B++){let me=b[B],{object:he,geometry:Se,group:Ae}=me,ke=me.material;ke.allowOverride===!0&&z!==null&&(ke=z),he.layers.test(W.layers)&&Cd(he,U,W,Se,ke,Ae)}}function Cd(b,U,W,z,B,ue){b.onBeforeRender(T,U,W,z,B,ue),b.modelViewMatrix.multiplyMatrices(W.matrixWorldInverse,b.matrixWorld),b.normalMatrix.getNormalMatrix(b.modelViewMatrix),B.onBeforeRender(T,U,W,z,b,ue),B.transparent===!0&&B.side===An&&B.forceSinglePass===!1?(B.side=on,B.needsUpdate=!0,T.renderBufferDirect(W,U,z,B,b,ue),B.side=kn,B.needsUpdate=!0,T.renderBufferDirect(W,U,z,B,b,ue),B.side=An):T.renderBufferDirect(W,U,z,B,b,ue),b.onAfterRender(T,U,W,z,B,ue)}function _a(b,U,W){U.isScene!==!0&&(U=ct);let z=x.get(b),B=C.state.lights,ue=C.state.shadowsArray,me=B.state.version,he=oe.getParameters(b,B.state,ue,U,W),Se=oe.getProgramCacheKey(he),Ae=z.programs;z.environment=b.isMeshStandardMaterial||b.isMeshLambertMaterial||b.isMeshPhongMaterial?U.environment:null,z.fog=U.fog;let ke=b.isMeshStandardMaterial||b.isMeshLambertMaterial&&!b.envMap||b.isMeshPhongMaterial&&!b.envMap;z.envMap=$.get(b.envMap||z.environment,ke),z.envMapRotation=z.environment!==null&&b.envMap===null?U.environmentRotation:b.envMapRotation,Ae===void 0&&(b.addEventListener("dispose",st),Ae=new Map,z.programs=Ae);let qe=Ae.get(Se);if(qe!==void 0){if(z.currentProgram===qe&&z.lightsStateVersion===me)return Id(b,he),qe}else he.uniforms=oe.getUniforms(b),b.onBeforeCompile(he,T),qe=oe.acquireProgram(he,Se),Ae.set(Se,qe),z.uniforms=he.uniforms;let Ce=z.uniforms;return(!b.isShaderMaterial&&!b.isRawShaderMaterial||b.clipping===!0)&&(Ce.clippingPlanes=ie.uniform),Id(b,he),z.needsLights=Em(b),z.lightsStateVersion=me,z.needsLights&&(Ce.ambientLightColor.value=B.state.ambient,Ce.lightProbe.value=B.state.probe,Ce.directionalLights.value=B.state.directional,Ce.directionalLightShadows.value=B.state.directionalShadow,Ce.spotLights.value=B.state.spot,Ce.spotLightShadows.value=B.state.spotShadow,Ce.rectAreaLights.value=B.state.rectArea,Ce.ltc_1.value=B.state.rectAreaLTC1,Ce.ltc_2.value=B.state.rectAreaLTC2,Ce.pointLights.value=B.state.point,Ce.pointLightShadows.value=B.state.pointShadow,Ce.hemisphereLights.value=B.state.hemi,Ce.directionalShadowMatrix.value=B.state.directionalShadowMatrix,Ce.spotLightMatrix.value=B.state.spotLightMatrix,Ce.spotLightMap.value=B.state.spotLightMap,Ce.pointShadowMatrix.value=B.state.pointShadowMatrix),z.currentProgram=qe,z.uniformsList=null,qe}function Rd(b){if(b.uniformsList===null){let U=b.currentProgram.getUniforms();b.uniformsList=Kr.seqWithValue(U.seq,b.uniforms)}return b.uniformsList}function Id(b,U){let W=x.get(b);W.outputColorSpace=U.outputColorSpace,W.batching=U.batching,W.batchingColor=U.batchingColor,W.instancing=U.instancing,W.instancingColor=U.instancingColor,W.instancingMorph=U.instancingMorph,W.skinning=U.skinning,W.morphTargets=U.morphTargets,W.morphNormals=U.morphNormals,W.morphColors=U.morphColors,W.morphTargetsCount=U.morphTargetsCount,W.numClippingPlanes=U.numClippingPlanes,W.numIntersection=U.numClipIntersection,W.vertexAlphas=U.vertexAlphas,W.vertexTangents=U.vertexTangents,W.toneMapping=U.toneMapping}function wm(b,U,W,z,B){U.isScene!==!0&&(U=ct),D.resetTextureUnits();let ue=U.fog,me=z.isMeshStandardMaterial||z.isMeshLambertMaterial||z.isMeshPhongMaterial?U.environment:null,he=O===null?T.outputColorSpace:O.isXRRenderTarget===!0?O.texture.colorSpace:Xt,Se=z.isMeshStandardMaterial||z.isMeshLambertMaterial&&!z.envMap||z.isMeshPhongMaterial&&!z.envMap,Ae=$.get(z.envMap||me,Se),ke=z.vertexColors===!0&&!!W.attributes.color&&W.attributes.color.itemSize===4,qe=!!W.attributes.tangent&&(!!z.normalMap||z.anisotropy>0),Ce=!!W.morphAttributes.position,ot=!!W.morphAttributes.normal,St=!!W.morphAttributes.color,bt=Hn;z.toneMapped&&(O===null||O.isXRRenderTarget===!0)&&(bt=T.toneMapping);let at=W.morphAttributes.position||W.morphAttributes.normal||W.morphAttributes.color,$t=at!==void 0?at.length:0,Te=x.get(z),mn=C.state.lights;if(De===!0&&(Fe===!0||b!==G)){let Ht=b===G&&z.id===V;ie.setState(z,b,Ht)}let Qe=!1;z.version===Te.__version?(Te.needsLights&&Te.lightsStateVersion!==mn.state.version||Te.outputColorSpace!==he||B.isBatchedMesh&&Te.batching===!1||!B.isBatchedMesh&&Te.batching===!0||B.isBatchedMesh&&Te.batchingColor===!0&&B.colorTexture===null||B.isBatchedMesh&&Te.batchingColor===!1&&B.colorTexture!==null||B.isInstancedMesh&&Te.instancing===!1||!B.isInstancedMesh&&Te.instancing===!0||B.isSkinnedMesh&&Te.skinning===!1||!B.isSkinnedMesh&&Te.skinning===!0||B.isInstancedMesh&&Te.instancingColor===!0&&B.instanceColor===null||B.isInstancedMesh&&Te.instancingColor===!1&&B.instanceColor!==null||B.isInstancedMesh&&Te.instancingMorph===!0&&B.morphTexture===null||B.isInstancedMesh&&Te.instancingMorph===!1&&B.morphTexture!==null||Te.envMap!==Ae||z.fog===!0&&Te.fog!==ue||Te.numClippingPlanes!==void 0&&(Te.numClippingPlanes!==ie.numPlanes||Te.numIntersection!==ie.numIntersection)||Te.vertexAlphas!==ke||Te.vertexTangents!==qe||Te.morphTargets!==Ce||Te.morphNormals!==ot||Te.morphColors!==St||Te.toneMapping!==bt||Te.morphTargetsCount!==$t)&&(Qe=!0):(Qe=!0,Te.__version=z.version);let Ln=Te.currentProgram;Qe===!0&&(Ln=_a(z,U,B));let Jn=!1,gs=!1,nr=!1,ut=Ln.getUniforms(),Kt=Te.uniforms;if(we.useProgram(Ln.program)&&(Jn=!0,gs=!0,nr=!0),z.id!==V&&(V=z.id,gs=!0),Jn||G!==b){we.buffers.depth.getReversed()&&b.reversedDepth!==!0&&(b._reversedDepth=!0,b.updateProjectionMatrix()),ut.setValue(P,"projectionMatrix",b.projectionMatrix),ut.setValue(P,"viewMatrix",b.matrixWorldInverse);let Gi=ut.map.cameraPosition;Gi!==void 0&&Gi.setValue(P,je.setFromMatrixPosition(b.matrixWorld)),dt.logarithmicDepthBuffer&&ut.setValue(P,"logDepthBufFC",2/(Math.log(b.far+1)/Math.LN2)),(z.isMeshPhongMaterial||z.isMeshToonMaterial||z.isMeshLambertMaterial||z.isMeshBasicMaterial||z.isMeshStandardMaterial||z.isShaderMaterial)&&ut.setValue(P,"isOrthographic",b.isOrthographicCamera===!0),G!==b&&(G=b,gs=!0,nr=!0)}if(Te.needsLights&&(mn.state.directionalShadowMap.length>0&&ut.setValue(P,"directionalShadowMap",mn.state.directionalShadowMap,D),mn.state.spotShadowMap.length>0&&ut.setValue(P,"spotShadowMap",mn.state.spotShadowMap,D),mn.state.pointShadowMap.length>0&&ut.setValue(P,"pointShadowMap",mn.state.pointShadowMap,D)),B.isSkinnedMesh){ut.setOptional(P,B,"bindMatrix"),ut.setOptional(P,B,"bindMatrixInverse");let Ht=B.skeleton;Ht&&(Ht.boneTexture===null&&Ht.computeBoneTexture(),ut.setValue(P,"boneTexture",Ht.boneTexture,D))}B.isBatchedMesh&&(ut.setOptional(P,B,"batchingTexture"),ut.setValue(P,"batchingTexture",B._matricesTexture,D),ut.setOptional(P,B,"batchingIdTexture"),ut.setValue(P,"batchingIdTexture",B._indirectTexture,D),ut.setOptional(P,B,"batchingColorTexture"),B._colorsTexture!==null&&ut.setValue(P,"batchingColorTexture",B._colorsTexture,D));let Vi=W.morphAttributes;if((Vi.position!==void 0||Vi.normal!==void 0||Vi.color!==void 0)&&fe.update(B,W,Ln),(gs||Te.receiveShadow!==B.receiveShadow)&&(Te.receiveShadow=B.receiveShadow,ut.setValue(P,"receiveShadow",B.receiveShadow)),(z.isMeshStandardMaterial||z.isMeshLambertMaterial||z.isMeshPhongMaterial)&&z.envMap===null&&U.environment!==null&&(Kt.envMapIntensity.value=U.environmentIntensity),Kt.dfgLUT!==void 0&&(Kt.dfgLUT.value=gv()),gs&&(ut.setValue(P,"toneMappingExposure",T.toneMappingExposure),Te.needsLights&&Tm(Kt,nr),ue&&z.fog===!0&&Re.refreshFogUniforms(Kt,ue),Re.refreshMaterialUniforms(Kt,z,Ge,pe,C.state.transmissionRenderTarget[b.id]),Kr.upload(P,Rd(Te),Kt,D)),z.isShaderMaterial&&z.uniformsNeedUpdate===!0&&(Kr.upload(P,Rd(Te),Kt,D),z.uniformsNeedUpdate=!1),z.isSpriteMaterial&&ut.setValue(P,"center",B.center),ut.setValue(P,"modelViewMatrix",B.modelViewMatrix),ut.setValue(P,"normalMatrix",B.normalMatrix),ut.setValue(P,"modelMatrix",B.matrixWorld),z.isShaderMaterial||z.isRawShaderMaterial){let Ht=z.uniformsGroups;for(let Gi=0,ir=Ht.length;Gi<ir;Gi++){let Pd=Ht[Gi];ge.update(Pd,Ln),ge.bind(Pd,Ln)}}return Ln}function Tm(b,U){b.ambientLightColor.needsUpdate=U,b.lightProbe.needsUpdate=U,b.directionalLights.needsUpdate=U,b.directionalLightShadows.needsUpdate=U,b.pointLights.needsUpdate=U,b.pointLightShadows.needsUpdate=U,b.spotLights.needsUpdate=U,b.spotLightShadows.needsUpdate=U,b.rectAreaLights.needsUpdate=U,b.hemisphereLights.needsUpdate=U}function Em(b){return b.isMeshLambertMaterial||b.isMeshToonMaterial||b.isMeshPhongMaterial||b.isMeshStandardMaterial||b.isShadowMaterial||b.isShaderMaterial&&b.lights===!0}this.getActiveCubeFace=function(){return I},this.getActiveMipmapLevel=function(){return F},this.getRenderTarget=function(){return O},this.setRenderTargetTextures=function(b,U,W){let z=x.get(b);z.__autoAllocateDepthBuffer=b.resolveDepthBuffer===!1,z.__autoAllocateDepthBuffer===!1&&(z.__useRenderToTexture=!1),x.get(b.texture).__webglTexture=U,x.get(b.depthTexture).__webglTexture=z.__autoAllocateDepthBuffer?void 0:W,z.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(b,U){let W=x.get(b);W.__webglFramebuffer=U,W.__useDefaultFramebuffer=U===void 0};let Am=P.createFramebuffer();this.setRenderTarget=function(b,U=0,W=0){O=b,I=U,F=W;let z=null,B=!1,ue=!1;if(b){let he=x.get(b);if(he.__useDefaultFramebuffer!==void 0){we.bindFramebuffer(P.FRAMEBUFFER,he.__webglFramebuffer),k.copy(b.viewport),H.copy(b.scissor),ne=b.scissorTest,we.viewport(k),we.scissor(H),we.setScissorTest(ne),V=-1;return}else if(he.__webglFramebuffer===void 0)D.setupRenderTarget(b);else if(he.__hasExternalTextures)D.rebindTextures(b,x.get(b.texture).__webglTexture,x.get(b.depthTexture).__webglTexture);else if(b.depthBuffer){let ke=b.depthTexture;if(he.__boundDepthTexture!==ke){if(ke!==null&&x.has(ke)&&(b.width!==ke.image.width||b.height!==ke.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");D.setupDepthRenderbuffer(b)}}let Se=b.texture;(Se.isData3DTexture||Se.isDataArrayTexture||Se.isCompressedArrayTexture)&&(ue=!0);let Ae=x.get(b).__webglFramebuffer;b.isWebGLCubeRenderTarget?(Array.isArray(Ae[U])?z=Ae[U][W]:z=Ae[U],B=!0):b.samples>0&&D.useMultisampledRTT(b)===!1?z=x.get(b).__webglMultisampledFramebuffer:Array.isArray(Ae)?z=Ae[W]:z=Ae,k.copy(b.viewport),H.copy(b.scissor),ne=b.scissorTest}else k.copy(Z).multiplyScalar(Ge).floor(),H.copy(re).multiplyScalar(Ge).floor(),ne=le;if(W!==0&&(z=Am),we.bindFramebuffer(P.FRAMEBUFFER,z)&&we.drawBuffers(b,z),we.viewport(k),we.scissor(H),we.setScissorTest(ne),B){let he=x.get(b.texture);P.framebufferTexture2D(P.FRAMEBUFFER,P.COLOR_ATTACHMENT0,P.TEXTURE_CUBE_MAP_POSITIVE_X+U,he.__webglTexture,W)}else if(ue){let he=U;for(let Se=0;Se<b.textures.length;Se++){let Ae=x.get(b.textures[Se]);P.framebufferTextureLayer(P.FRAMEBUFFER,P.COLOR_ATTACHMENT0+Se,Ae.__webglTexture,W,he)}}else if(b!==null&&W!==0){let he=x.get(b.texture);P.framebufferTexture2D(P.FRAMEBUFFER,P.COLOR_ATTACHMENT0,P.TEXTURE_2D,he.__webglTexture,W)}V=-1},this.readRenderTargetPixels=function(b,U,W,z,B,ue,me,he=0){if(!(b&&b.isWebGLRenderTarget)){Ne("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Se=x.get(b).__webglFramebuffer;if(b.isWebGLCubeRenderTarget&&me!==void 0&&(Se=Se[me]),Se){we.bindFramebuffer(P.FRAMEBUFFER,Se);try{let Ae=b.textures[he],ke=Ae.format,qe=Ae.type;if(b.textures.length>1&&P.readBuffer(P.COLOR_ATTACHMENT0+he),!dt.textureFormatReadable(ke)){Ne("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!dt.textureTypeReadable(qe)){Ne("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}U>=0&&U<=b.width-z&&W>=0&&W<=b.height-B&&P.readPixels(U,W,z,B,ae.convert(ke),ae.convert(qe),ue)}finally{let Ae=O!==null?x.get(O).__webglFramebuffer:null;we.bindFramebuffer(P.FRAMEBUFFER,Ae)}}},this.readRenderTargetPixelsAsync=async function(b,U,W,z,B,ue,me,he=0){if(!(b&&b.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Se=x.get(b).__webglFramebuffer;if(b.isWebGLCubeRenderTarget&&me!==void 0&&(Se=Se[me]),Se)if(U>=0&&U<=b.width-z&&W>=0&&W<=b.height-B){we.bindFramebuffer(P.FRAMEBUFFER,Se);let Ae=b.textures[he],ke=Ae.format,qe=Ae.type;if(b.textures.length>1&&P.readBuffer(P.COLOR_ATTACHMENT0+he),!dt.textureFormatReadable(ke))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!dt.textureTypeReadable(qe))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let Ce=P.createBuffer();P.bindBuffer(P.PIXEL_PACK_BUFFER,Ce),P.bufferData(P.PIXEL_PACK_BUFFER,ue.byteLength,P.STREAM_READ),P.readPixels(U,W,z,B,ae.convert(ke),ae.convert(qe),0);let ot=O!==null?x.get(O).__webglFramebuffer:null;we.bindFramebuffer(P.FRAMEBUFFER,ot);let St=P.fenceSync(P.SYNC_GPU_COMMANDS_COMPLETE,0);return P.flush(),await jf(P,St,4),P.bindBuffer(P.PIXEL_PACK_BUFFER,Ce),P.getBufferSubData(P.PIXEL_PACK_BUFFER,0,ue),P.deleteBuffer(Ce),P.deleteSync(St),ue}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(b,U=null,W=0){let z=Math.pow(2,-W),B=Math.floor(b.image.width*z),ue=Math.floor(b.image.height*z),me=U!==null?U.x:0,he=U!==null?U.y:0;D.setTexture2D(b,0),P.copyTexSubImage2D(P.TEXTURE_2D,W,0,0,me,he,B,ue),we.unbindTexture()};let Cm=P.createFramebuffer(),Rm=P.createFramebuffer();this.copyTextureToTexture=function(b,U,W=null,z=null,B=0,ue=0){let me,he,Se,Ae,ke,qe,Ce,ot,St,bt=b.isCompressedTexture?b.mipmaps[ue]:b.image;if(W!==null)me=W.max.x-W.min.x,he=W.max.y-W.min.y,Se=W.isBox3?W.max.z-W.min.z:1,Ae=W.min.x,ke=W.min.y,qe=W.isBox3?W.min.z:0;else{let Kt=Math.pow(2,-B);me=Math.floor(bt.width*Kt),he=Math.floor(bt.height*Kt),b.isDataArrayTexture?Se=bt.depth:b.isData3DTexture?Se=Math.floor(bt.depth*Kt):Se=1,Ae=0,ke=0,qe=0}z!==null?(Ce=z.x,ot=z.y,St=z.z):(Ce=0,ot=0,St=0);let at=ae.convert(U.format),$t=ae.convert(U.type),Te;U.isData3DTexture?(D.setTexture3D(U,0),Te=P.TEXTURE_3D):U.isDataArrayTexture||U.isCompressedArrayTexture?(D.setTexture2DArray(U,0),Te=P.TEXTURE_2D_ARRAY):(D.setTexture2D(U,0),Te=P.TEXTURE_2D),P.pixelStorei(P.UNPACK_FLIP_Y_WEBGL,U.flipY),P.pixelStorei(P.UNPACK_PREMULTIPLY_ALPHA_WEBGL,U.premultiplyAlpha),P.pixelStorei(P.UNPACK_ALIGNMENT,U.unpackAlignment);let mn=P.getParameter(P.UNPACK_ROW_LENGTH),Qe=P.getParameter(P.UNPACK_IMAGE_HEIGHT),Ln=P.getParameter(P.UNPACK_SKIP_PIXELS),Jn=P.getParameter(P.UNPACK_SKIP_ROWS),gs=P.getParameter(P.UNPACK_SKIP_IMAGES);P.pixelStorei(P.UNPACK_ROW_LENGTH,bt.width),P.pixelStorei(P.UNPACK_IMAGE_HEIGHT,bt.height),P.pixelStorei(P.UNPACK_SKIP_PIXELS,Ae),P.pixelStorei(P.UNPACK_SKIP_ROWS,ke),P.pixelStorei(P.UNPACK_SKIP_IMAGES,qe);let nr=b.isDataArrayTexture||b.isData3DTexture,ut=U.isDataArrayTexture||U.isData3DTexture;if(b.isDepthTexture){let Kt=x.get(b),Vi=x.get(U),Ht=x.get(Kt.__renderTarget),Gi=x.get(Vi.__renderTarget);we.bindFramebuffer(P.READ_FRAMEBUFFER,Ht.__webglFramebuffer),we.bindFramebuffer(P.DRAW_FRAMEBUFFER,Gi.__webglFramebuffer);for(let ir=0;ir<Se;ir++)nr&&(P.framebufferTextureLayer(P.READ_FRAMEBUFFER,P.COLOR_ATTACHMENT0,x.get(b).__webglTexture,B,qe+ir),P.framebufferTextureLayer(P.DRAW_FRAMEBUFFER,P.COLOR_ATTACHMENT0,x.get(U).__webglTexture,ue,St+ir)),P.blitFramebuffer(Ae,ke,me,he,Ce,ot,me,he,P.DEPTH_BUFFER_BIT,P.NEAREST);we.bindFramebuffer(P.READ_FRAMEBUFFER,null),we.bindFramebuffer(P.DRAW_FRAMEBUFFER,null)}else if(B!==0||b.isRenderTargetTexture||x.has(b)){let Kt=x.get(b),Vi=x.get(U);we.bindFramebuffer(P.READ_FRAMEBUFFER,Cm),we.bindFramebuffer(P.DRAW_FRAMEBUFFER,Rm);for(let Ht=0;Ht<Se;Ht++)nr?P.framebufferTextureLayer(P.READ_FRAMEBUFFER,P.COLOR_ATTACHMENT0,Kt.__webglTexture,B,qe+Ht):P.framebufferTexture2D(P.READ_FRAMEBUFFER,P.COLOR_ATTACHMENT0,P.TEXTURE_2D,Kt.__webglTexture,B),ut?P.framebufferTextureLayer(P.DRAW_FRAMEBUFFER,P.COLOR_ATTACHMENT0,Vi.__webglTexture,ue,St+Ht):P.framebufferTexture2D(P.DRAW_FRAMEBUFFER,P.COLOR_ATTACHMENT0,P.TEXTURE_2D,Vi.__webglTexture,ue),B!==0?P.blitFramebuffer(Ae,ke,me,he,Ce,ot,me,he,P.COLOR_BUFFER_BIT,P.NEAREST):ut?P.copyTexSubImage3D(Te,ue,Ce,ot,St+Ht,Ae,ke,me,he):P.copyTexSubImage2D(Te,ue,Ce,ot,Ae,ke,me,he);we.bindFramebuffer(P.READ_FRAMEBUFFER,null),we.bindFramebuffer(P.DRAW_FRAMEBUFFER,null)}else ut?b.isDataTexture||b.isData3DTexture?P.texSubImage3D(Te,ue,Ce,ot,St,me,he,Se,at,$t,bt.data):U.isCompressedArrayTexture?P.compressedTexSubImage3D(Te,ue,Ce,ot,St,me,he,Se,at,bt.data):P.texSubImage3D(Te,ue,Ce,ot,St,me,he,Se,at,$t,bt):b.isDataTexture?P.texSubImage2D(P.TEXTURE_2D,ue,Ce,ot,me,he,at,$t,bt.data):b.isCompressedTexture?P.compressedTexSubImage2D(P.TEXTURE_2D,ue,Ce,ot,bt.width,bt.height,at,bt.data):P.texSubImage2D(P.TEXTURE_2D,ue,Ce,ot,me,he,at,$t,bt);P.pixelStorei(P.UNPACK_ROW_LENGTH,mn),P.pixelStorei(P.UNPACK_IMAGE_HEIGHT,Qe),P.pixelStorei(P.UNPACK_SKIP_PIXELS,Ln),P.pixelStorei(P.UNPACK_SKIP_ROWS,Jn),P.pixelStorei(P.UNPACK_SKIP_IMAGES,gs),ue===0&&U.generateMipmaps&&P.generateMipmap(Te),we.unbindTexture()},this.initRenderTarget=function(b){x.get(b).__webglFramebuffer===void 0&&D.setupRenderTarget(b)},this.initTexture=function(b){b.isCubeTexture?D.setTextureCube(b,0):b.isData3DTexture?D.setTexture3D(b,0):b.isDataArrayTexture||b.isCompressedArrayTexture?D.setTexture2DArray(b,0):D.setTexture2D(b,0),we.unbindTexture()},this.resetState=function(){I=0,F=0,O=null,we.reset(),se.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return On}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let t=this.getContext();t.drawingBufferColorSpace=$e._getDrawingBufferColorSpace(e),t.unpackColorSpace=$e._getUnpackColorSpace()}};function gh(i,e){if(e===qu)return console.warn("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Geometry already defined as triangles."),i;if(e===Gr||e===ta){let t=i.getIndex();if(t===null){let o=[],a=i.getAttribute("position");if(a!==void 0){for(let l=0;l<a.count;l++)o.push(l);i.setIndex(o),t=i.getIndex()}else return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Undefined position attribute. Processing not possible."),i}let n=t.count-2,s=[];if(e===Gr)for(let o=1;o<=n;o++)s.push(t.getX(0)),s.push(t.getX(o)),s.push(t.getX(o+1));else for(let o=0;o<n;o++)o%2===0?(s.push(t.getX(o)),s.push(t.getX(o+1)),s.push(t.getX(o+2))):(s.push(t.getX(o+2)),s.push(t.getX(o+1)),s.push(t.getX(o)));s.length/3!==n&&console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unable to generate correct amount of triangles.");let r=i.clone();return r.setIndex(s),r.clearGroups(),r}else return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unknown draw mode:",e),i}function Tc(i){let e=new Map,t=new Map,n=i.clone();return Lp(i,n,function(s,r){e.set(r,s),t.set(s,r)}),n.traverse(function(s){if(!s.isSkinnedMesh)return;let r=s,o=e.get(s),a=o.skeleton.bones;r.skeleton=o.skeleton.clone(),r.bindMatrix.copy(o.bindMatrix),r.skeleton.bones=a.map(function(l){return t.get(l)}),r.bind(r.skeleton,r.bindMatrix)}),n}function Lp(i,e,t){t(i,e);for(let n=0;n<i.children.length;n++)Lp(i.children[n],e.children[n],t)}var Ec=class extends li{constructor(e){super(e),this.dracoLoader=null,this.ktx2Loader=null,this.meshoptDecoder=null,this.pluginCallbacks=[],this.register(function(t){return new Sh(t)}),this.register(function(t){return new wh(t)}),this.register(function(t){return new Nh(t)}),this.register(function(t){return new Dh(t)}),this.register(function(t){return new Uh(t)}),this.register(function(t){return new Eh(t)}),this.register(function(t){return new Ah(t)}),this.register(function(t){return new Ch(t)}),this.register(function(t){return new Rh(t)}),this.register(function(t){return new Mh(t)}),this.register(function(t){return new Ih(t)}),this.register(function(t){return new Th(t)}),this.register(function(t){return new Lh(t)}),this.register(function(t){return new Ph(t)}),this.register(function(t){return new vh(t)}),this.register(function(t){return new Ac(t,Ye.EXT_MESHOPT_COMPRESSION)}),this.register(function(t){return new Ac(t,Ye.KHR_MESHOPT_COMPRESSION)}),this.register(function(t){return new Fh(t)})}load(e,t,n,s){let r=this,o;if(this.resourcePath!=="")o=this.resourcePath;else if(this.path!==""){let c=Li.extractUrlBase(e);o=Li.resolveURL(c,this.path)}else o=Li.extractUrlBase(e);this.manager.itemStart(e);let a=function(c){s?s(c):console.error(c),r.manager.itemError(e),r.manager.itemEnd(e)},l=new Br(this.manager);l.setPath(this.path),l.setResponseType("arraybuffer"),l.setRequestHeader(this.requestHeader),l.setWithCredentials(this.withCredentials),l.load(e,function(c){try{r.parse(c,o,function(u){t(u),r.manager.itemEnd(e)},a)}catch(u){a(u)}},n,a)}setDRACOLoader(e){return this.dracoLoader=e,this}setKTX2Loader(e){return this.ktx2Loader=e,this}setMeshoptDecoder(e){return this.meshoptDecoder=e,this}register(e){return this.pluginCallbacks.indexOf(e)===-1&&this.pluginCallbacks.push(e),this}unregister(e){return this.pluginCallbacks.indexOf(e)!==-1&&this.pluginCallbacks.splice(this.pluginCallbacks.indexOf(e),1),this}parse(e,t,n,s){let r,o={},a={},l=new TextDecoder;if(typeof e=="string")r=JSON.parse(e);else if(e instanceof ArrayBuffer)if(l.decode(new Uint8Array(e,0,4))===Op){try{o[Ye.KHR_BINARY_GLTF]=new Oh(e)}catch(h){s&&s(h);return}r=JSON.parse(o[Ye.KHR_BINARY_GLTF].content)}else r=JSON.parse(l.decode(e));else r=e;if(r.asset===void 0||r.asset.version[0]<2){s&&s(new Error("THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported."));return}let c=new Wh(r,{path:t||this.resourcePath||"",crossOrigin:this.crossOrigin,requestHeader:this.requestHeader,manager:this.manager,ktx2Loader:this.ktx2Loader,meshoptDecoder:this.meshoptDecoder});c.fileLoader.setRequestHeader(this.requestHeader);for(let u=0;u<this.pluginCallbacks.length;u++){let h=this.pluginCallbacks[u](c);h.name||console.error("THREE.GLTFLoader: Invalid plugin found: missing name"),a[h.name]=h,o[h.name]=!0}if(r.extensionsUsed)for(let u=0;u<r.extensionsUsed.length;++u){let h=r.extensionsUsed[u],d=r.extensionsRequired||[];switch(h){case Ye.KHR_MATERIALS_UNLIT:o[h]=new bh;break;case Ye.KHR_DRACO_MESH_COMPRESSION:o[h]=new Bh(r,this.dracoLoader);break;case Ye.KHR_TEXTURE_TRANSFORM:o[h]=new kh;break;case Ye.KHR_MESH_QUANTIZATION:o[h]=new zh;break;default:d.indexOf(h)>=0&&a[h]===void 0&&console.warn('THREE.GLTFLoader: Unknown extension "'+h+'".')}}c.setExtensions(o),c.setPlugins(a),c.parse(n,s)}parseAsync(e,t){let n=this;return new Promise(function(s,r){n.parse(e,t,s,r)})}};function _v(){let i={};return{get:function(e){return i[e]},add:function(e,t){i[e]=t},remove:function(e){delete i[e]},removeAll:function(){i={}}}}function Et(i,e,t){let n=i.json.materials[e];return n.extensions&&n.extensions[t]?n.extensions[t]:null}var Ye={KHR_BINARY_GLTF:"KHR_binary_glTF",KHR_DRACO_MESH_COMPRESSION:"KHR_draco_mesh_compression",KHR_LIGHTS_PUNCTUAL:"KHR_lights_punctual",KHR_MATERIALS_CLEARCOAT:"KHR_materials_clearcoat",KHR_MATERIALS_DISPERSION:"KHR_materials_dispersion",KHR_MATERIALS_IOR:"KHR_materials_ior",KHR_MATERIALS_SHEEN:"KHR_materials_sheen",KHR_MATERIALS_SPECULAR:"KHR_materials_specular",KHR_MATERIALS_TRANSMISSION:"KHR_materials_transmission",KHR_MATERIALS_IRIDESCENCE:"KHR_materials_iridescence",KHR_MATERIALS_ANISOTROPY:"KHR_materials_anisotropy",KHR_MATERIALS_UNLIT:"KHR_materials_unlit",KHR_MATERIALS_VOLUME:"KHR_materials_volume",KHR_TEXTURE_BASISU:"KHR_texture_basisu",KHR_TEXTURE_TRANSFORM:"KHR_texture_transform",KHR_MESH_QUANTIZATION:"KHR_mesh_quantization",KHR_MATERIALS_EMISSIVE_STRENGTH:"KHR_materials_emissive_strength",EXT_MATERIALS_BUMP:"EXT_materials_bump",EXT_TEXTURE_WEBP:"EXT_texture_webp",EXT_TEXTURE_AVIF:"EXT_texture_avif",EXT_MESHOPT_COMPRESSION:"EXT_meshopt_compression",KHR_MESHOPT_COMPRESSION:"KHR_meshopt_compression",EXT_MESH_GPU_INSTANCING:"EXT_mesh_gpu_instancing"},vh=class{constructor(e){this.parser=e,this.name=Ye.KHR_LIGHTS_PUNCTUAL,this.cache={refs:{},uses:{}}}_markDefs(){let e=this.parser,t=this.parser.json.nodes||[];for(let n=0,s=t.length;n<s;n++){let r=t[n];r.extensions&&r.extensions[this.name]&&r.extensions[this.name].light!==void 0&&e._addNodeRef(this.cache,r.extensions[this.name].light)}}_loadLight(e){let t=this.parser,n="light:"+e,s=t.cache.get(n);if(s)return s;let r=t.json,l=((r.extensions&&r.extensions[this.name]||{}).lights||[])[e],c,u=new Pe(16777215);l.color!==void 0&&u.setRGB(l.color[0],l.color[1],l.color[2],Xt);let h=l.range!==void 0?l.range:0;switch(l.type){case"directional":c=new Us(u),c.target.position.set(0,0,-1),c.add(c.target);break;case"point":c=new Wo(u),c.distance=h;break;case"spot":c=new Go(u),c.distance=h,l.spot=l.spot||{},l.spot.innerConeAngle=l.spot.innerConeAngle!==void 0?l.spot.innerConeAngle:0,l.spot.outerConeAngle=l.spot.outerConeAngle!==void 0?l.spot.outerConeAngle:Math.PI/4,c.angle=l.spot.outerConeAngle,c.penumbra=1-l.spot.innerConeAngle/l.spot.outerConeAngle,c.target.position.set(0,0,-1),c.add(c.target);break;default:throw new Error("THREE.GLTFLoader: Unexpected light type: "+l.type)}return c.position.set(0,0,0),fi(c,l),l.intensity!==void 0&&(c.intensity=l.intensity),c.name=t.createUniqueName(l.name||"light_"+e),s=Promise.resolve(c),t.cache.add(n,s),s}getDependency(e,t){if(e==="light")return this._loadLight(t)}createNodeAttachment(e){let t=this,n=this.parser,r=n.json.nodes[e],a=(r.extensions&&r.extensions[this.name]||{}).light;return a===void 0?null:this._loadLight(a).then(function(l){return n._getNodeRef(t.cache,a,l)})}},bh=class{constructor(){this.name=Ye.KHR_MATERIALS_UNLIT}getMaterialType(){return yn}extendParams(e,t,n){let s=[];e.color=new Pe(1,1,1),e.opacity=1;let r=t.pbrMetallicRoughness;if(r){if(Array.isArray(r.baseColorFactor)){let o=r.baseColorFactor;e.color.setRGB(o[0],o[1],o[2],Xt),e.opacity=o[3]}r.baseColorTexture!==void 0&&s.push(n.assignTexture(e,"map",r.baseColorTexture,_t))}return Promise.all(s)}},Mh=class{constructor(e){this.parser=e,this.name=Ye.KHR_MATERIALS_EMISSIVE_STRENGTH}extendMaterialParams(e,t){let n=Et(this.parser,e,this.name);return n===null||n.emissiveStrength!==void 0&&(t.emissiveIntensity=n.emissiveStrength),Promise.resolve()}},Sh=class{constructor(e){this.parser=e,this.name=Ye.KHR_MATERIALS_CLEARCOAT}getMaterialType(e){return Et(this.parser,e,this.name)!==null?hn:null}extendMaterialParams(e,t){let n=Et(this.parser,e,this.name);if(n===null)return Promise.resolve();let s=[];if(n.clearcoatFactor!==void 0&&(t.clearcoat=n.clearcoatFactor),n.clearcoatTexture!==void 0&&s.push(this.parser.assignTexture(t,"clearcoatMap",n.clearcoatTexture)),n.clearcoatRoughnessFactor!==void 0&&(t.clearcoatRoughness=n.clearcoatRoughnessFactor),n.clearcoatRoughnessTexture!==void 0&&s.push(this.parser.assignTexture(t,"clearcoatRoughnessMap",n.clearcoatRoughnessTexture)),n.clearcoatNormalTexture!==void 0&&(s.push(this.parser.assignTexture(t,"clearcoatNormalMap",n.clearcoatNormalTexture)),n.clearcoatNormalTexture.scale!==void 0)){let r=n.clearcoatNormalTexture.scale;t.clearcoatNormalScale=new Ie(r,r)}return Promise.all(s)}},wh=class{constructor(e){this.parser=e,this.name=Ye.KHR_MATERIALS_DISPERSION}getMaterialType(e){return Et(this.parser,e,this.name)!==null?hn:null}extendMaterialParams(e,t){let n=Et(this.parser,e,this.name);return n===null||(t.dispersion=n.dispersion!==void 0?n.dispersion:0),Promise.resolve()}},Th=class{constructor(e){this.parser=e,this.name=Ye.KHR_MATERIALS_IRIDESCENCE}getMaterialType(e){return Et(this.parser,e,this.name)!==null?hn:null}extendMaterialParams(e,t){let n=Et(this.parser,e,this.name);if(n===null)return Promise.resolve();let s=[];return n.iridescenceFactor!==void 0&&(t.iridescence=n.iridescenceFactor),n.iridescenceTexture!==void 0&&s.push(this.parser.assignTexture(t,"iridescenceMap",n.iridescenceTexture)),n.iridescenceIor!==void 0&&(t.iridescenceIOR=n.iridescenceIor),t.iridescenceThicknessRange===void 0&&(t.iridescenceThicknessRange=[100,400]),n.iridescenceThicknessMinimum!==void 0&&(t.iridescenceThicknessRange[0]=n.iridescenceThicknessMinimum),n.iridescenceThicknessMaximum!==void 0&&(t.iridescenceThicknessRange[1]=n.iridescenceThicknessMaximum),n.iridescenceThicknessTexture!==void 0&&s.push(this.parser.assignTexture(t,"iridescenceThicknessMap",n.iridescenceThicknessTexture)),Promise.all(s)}},Eh=class{constructor(e){this.parser=e,this.name=Ye.KHR_MATERIALS_SHEEN}getMaterialType(e){return Et(this.parser,e,this.name)!==null?hn:null}extendMaterialParams(e,t){let n=Et(this.parser,e,this.name);if(n===null)return Promise.resolve();let s=[];if(t.sheenColor=new Pe(0,0,0),t.sheenRoughness=0,t.sheen=1,n.sheenColorFactor!==void 0){let r=n.sheenColorFactor;t.sheenColor.setRGB(r[0],r[1],r[2],Xt)}return n.sheenRoughnessFactor!==void 0&&(t.sheenRoughness=n.sheenRoughnessFactor),n.sheenColorTexture!==void 0&&s.push(this.parser.assignTexture(t,"sheenColorMap",n.sheenColorTexture,_t)),n.sheenRoughnessTexture!==void 0&&s.push(this.parser.assignTexture(t,"sheenRoughnessMap",n.sheenRoughnessTexture)),Promise.all(s)}},Ah=class{constructor(e){this.parser=e,this.name=Ye.KHR_MATERIALS_TRANSMISSION}getMaterialType(e){return Et(this.parser,e,this.name)!==null?hn:null}extendMaterialParams(e,t){let n=Et(this.parser,e,this.name);if(n===null)return Promise.resolve();let s=[];return n.transmissionFactor!==void 0&&(t.transmission=n.transmissionFactor),n.transmissionTexture!==void 0&&s.push(this.parser.assignTexture(t,"transmissionMap",n.transmissionTexture)),Promise.all(s)}},Ch=class{constructor(e){this.parser=e,this.name=Ye.KHR_MATERIALS_VOLUME}getMaterialType(e){return Et(this.parser,e,this.name)!==null?hn:null}extendMaterialParams(e,t){let n=Et(this.parser,e,this.name);if(n===null)return Promise.resolve();let s=[];t.thickness=n.thicknessFactor!==void 0?n.thicknessFactor:0,n.thicknessTexture!==void 0&&s.push(this.parser.assignTexture(t,"thicknessMap",n.thicknessTexture)),t.attenuationDistance=n.attenuationDistance||1/0;let r=n.attenuationColor||[1,1,1];return t.attenuationColor=new Pe().setRGB(r[0],r[1],r[2],Xt),Promise.all(s)}},Rh=class{constructor(e){this.parser=e,this.name=Ye.KHR_MATERIALS_IOR}getMaterialType(e){return Et(this.parser,e,this.name)!==null?hn:null}extendMaterialParams(e,t){let n=Et(this.parser,e,this.name);return n===null||(t.ior=n.ior!==void 0?n.ior:1.5),Promise.resolve()}},Ih=class{constructor(e){this.parser=e,this.name=Ye.KHR_MATERIALS_SPECULAR}getMaterialType(e){return Et(this.parser,e,this.name)!==null?hn:null}extendMaterialParams(e,t){let n=Et(this.parser,e,this.name);if(n===null)return Promise.resolve();let s=[];t.specularIntensity=n.specularFactor!==void 0?n.specularFactor:1,n.specularTexture!==void 0&&s.push(this.parser.assignTexture(t,"specularIntensityMap",n.specularTexture));let r=n.specularColorFactor||[1,1,1];return t.specularColor=new Pe().setRGB(r[0],r[1],r[2],Xt),n.specularColorTexture!==void 0&&s.push(this.parser.assignTexture(t,"specularColorMap",n.specularColorTexture,_t)),Promise.all(s)}},Ph=class{constructor(e){this.parser=e,this.name=Ye.EXT_MATERIALS_BUMP}getMaterialType(e){return Et(this.parser,e,this.name)!==null?hn:null}extendMaterialParams(e,t){let n=Et(this.parser,e,this.name);if(n===null)return Promise.resolve();let s=[];return t.bumpScale=n.bumpFactor!==void 0?n.bumpFactor:1,n.bumpTexture!==void 0&&s.push(this.parser.assignTexture(t,"bumpMap",n.bumpTexture)),Promise.all(s)}},Lh=class{constructor(e){this.parser=e,this.name=Ye.KHR_MATERIALS_ANISOTROPY}getMaterialType(e){return Et(this.parser,e,this.name)!==null?hn:null}extendMaterialParams(e,t){let n=Et(this.parser,e,this.name);if(n===null)return Promise.resolve();let s=[];return n.anisotropyStrength!==void 0&&(t.anisotropy=n.anisotropyStrength),n.anisotropyRotation!==void 0&&(t.anisotropyRotation=n.anisotropyRotation),n.anisotropyTexture!==void 0&&s.push(this.parser.assignTexture(t,"anisotropyMap",n.anisotropyTexture)),Promise.all(s)}},Nh=class{constructor(e){this.parser=e,this.name=Ye.KHR_TEXTURE_BASISU}loadTexture(e){let t=this.parser,n=t.json,s=n.textures[e];if(!s.extensions||!s.extensions[this.name])return null;let r=s.extensions[this.name],o=t.options.ktx2Loader;if(!o){if(n.extensionsRequired&&n.extensionsRequired.indexOf(this.name)>=0)throw new Error("THREE.GLTFLoader: setKTX2Loader must be called before loading KTX2 textures");return null}return t.loadTextureImage(e,r.source,o)}},Dh=class{constructor(e){this.parser=e,this.name=Ye.EXT_TEXTURE_WEBP}loadTexture(e){let t=this.name,n=this.parser,s=n.json,r=s.textures[e];if(!r.extensions||!r.extensions[t])return null;let o=r.extensions[t],a=s.images[o.source],l=n.textureLoader;if(a.uri){let c=n.options.manager.getHandler(a.uri);c!==null&&(l=c)}return n.loadTextureImage(e,o.source,l)}},Uh=class{constructor(e){this.parser=e,this.name=Ye.EXT_TEXTURE_AVIF}loadTexture(e){let t=this.name,n=this.parser,s=n.json,r=s.textures[e];if(!r.extensions||!r.extensions[t])return null;let o=r.extensions[t],a=s.images[o.source],l=n.textureLoader;if(a.uri){let c=n.options.manager.getHandler(a.uri);c!==null&&(l=c)}return n.loadTextureImage(e,o.source,l)}},Ac=class{constructor(e,t){this.name=t,this.parser=e}loadBufferView(e){let t=this.parser.json,n=t.bufferViews[e];if(n.extensions&&n.extensions[this.name]){let s=n.extensions[this.name],r=this.parser.getDependency("buffer",s.buffer),o=this.parser.options.meshoptDecoder;if(!o||!o.supported){if(t.extensionsRequired&&t.extensionsRequired.indexOf(this.name)>=0)throw new Error("THREE.GLTFLoader: setMeshoptDecoder must be called before loading compressed files");return null}return r.then(function(a){let l=s.byteOffset||0,c=s.byteLength||0,u=s.count,h=s.byteStride,d=new Uint8Array(a,l,c);return o.decodeGltfBufferAsync?o.decodeGltfBufferAsync(u,h,d,s.mode,s.filter).then(function(f){return f.buffer}):o.ready.then(function(){let f=new ArrayBuffer(u*h);return o.decodeGltfBuffer(new Uint8Array(f),u,h,d,s.mode,s.filter),f})})}else return null}},Fh=class{constructor(e){this.name=Ye.EXT_MESH_GPU_INSTANCING,this.parser=e}createNodeMesh(e){let t=this.parser.json,n=t.nodes[e];if(!n.extensions||!n.extensions[this.name]||n.mesh===void 0)return null;let s=t.meshes[n.mesh];for(let c of s.primitives)if(c.mode!==Cn.TRIANGLES&&c.mode!==Cn.TRIANGLE_STRIP&&c.mode!==Cn.TRIANGLE_FAN&&c.mode!==void 0)return null;let o=n.extensions[this.name].attributes,a=[],l={};for(let c in o)a.push(this.parser.getDependency("accessor",o[c]).then(u=>(l[c]=u,l[c])));return a.length<1?null:(a.push(this.parser.createNodeMesh(e)),Promise.all(a).then(c=>{let u=c.pop(),h=u.isGroup?u.children:[u],d=c[0].count,f=[];for(let g of h){let y=new ze,m=new L,p=new jt,M=new L(1,1,1),w=new Ro(g.geometry,g.material,d);for(let S=0;S<d;S++)l.TRANSLATION&&m.fromBufferAttribute(l.TRANSLATION,S),l.ROTATION&&p.fromBufferAttribute(l.ROTATION,S),l.SCALE&&M.fromBufferAttribute(l.SCALE,S),w.setMatrixAt(S,y.compose(m,p,M));for(let S in l)if(S==="_COLOR_0"){let C=l[S];w.instanceColor=new Qi(C.array,C.itemSize,C.normalized)}else S!=="TRANSLATION"&&S!=="ROTATION"&&S!=="SCALE"&&g.geometry.setAttribute(S,l[S]);gt.prototype.copy.call(w,g),this.parser.assignFinalMaterial(w),f.push(w)}return u.isGroup?(u.clear(),u.add(...f),u):f[0]}))}},Op="glTF",ra=12,Np={JSON:1313821514,BIN:5130562},Oh=class{constructor(e){this.name=Ye.KHR_BINARY_GLTF,this.content=null,this.body=null;let t=new DataView(e,0,ra),n=new TextDecoder;if(this.header={magic:n.decode(new Uint8Array(e.slice(0,4))),version:t.getUint32(4,!0),length:t.getUint32(8,!0)},this.header.magic!==Op)throw new Error("THREE.GLTFLoader: Unsupported glTF-Binary header.");if(this.header.version<2)throw new Error("THREE.GLTFLoader: Legacy binary file detected.");let s=this.header.length-ra,r=new DataView(e,ra),o=0;for(;o<s;){let a=r.getUint32(o,!0);o+=4;let l=r.getUint32(o,!0);if(o+=4,l===Np.JSON){let c=new Uint8Array(e,ra+o,a);this.content=n.decode(c)}else if(l===Np.BIN){let c=ra+o;this.body=e.slice(c,c+a)}o+=a}if(this.content===null)throw new Error("THREE.GLTFLoader: JSON content not found.")}},Bh=class{constructor(e,t){if(!t)throw new Error("THREE.GLTFLoader: No DRACOLoader instance provided.");this.name=Ye.KHR_DRACO_MESH_COMPRESSION,this.json=e,this.dracoLoader=t,this.dracoLoader.preload()}decodePrimitive(e,t){let n=this.json,s=this.dracoLoader,r=e.extensions[this.name].bufferView,o=e.extensions[this.name].attributes,a={},l={},c={};for(let u in o){let h=Vh[u]||u.toLowerCase();a[h]=o[u]}for(let u in e.attributes){let h=Vh[u]||u.toLowerCase();if(o[u]!==void 0){let d=n.accessors[e.attributes[u]],f=qr[d.componentType];c[h]=f.name,l[h]=d.normalized===!0}}return t.getDependency("bufferView",r).then(function(u){return new Promise(function(h,d){s.decodeDracoFile(u,function(f){for(let g in f.attributes){let y=f.attributes[g],m=l[g];m!==void 0&&(y.normalized=m)}h(f)},a,c,Xt,d)})})}},kh=class{constructor(){this.name=Ye.KHR_TEXTURE_TRANSFORM}extendTexture(e,t){return(t.texCoord===void 0||t.texCoord===e.channel)&&t.offset===void 0&&t.rotation===void 0&&t.scale===void 0||(e=e.clone(),t.texCoord!==void 0&&(e.channel=t.texCoord),t.offset!==void 0&&e.offset.fromArray(t.offset),t.rotation!==void 0&&(e.rotation=t.rotation),t.scale!==void 0&&e.repeat.fromArray(t.scale),e.needsUpdate=!0),e}},zh=class{constructor(){this.name=Ye.KHR_MESH_QUANTIZATION}},Cc=class extends si{constructor(e,t,n,s){super(e,t,n,s)}copySampleValue_(e){let t=this.resultBuffer,n=this.sampleValues,s=this.valueSize,r=e*s*3+s;for(let o=0;o!==s;o++)t[o]=n[r+o];return t}interpolate_(e,t,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=a*2,c=a*3,u=s-t,h=(n-t)/u,d=h*h,f=d*h,g=e*c,y=g-c,m=-2*f+3*d,p=f-d,M=1-m,w=p-d+h;for(let S=0;S!==a;S++){let C=o[y+S+a],A=o[y+S+l]*u,R=o[g+S+a],v=o[g+S]*u;r[S]=M*C+w*A+m*R+p*v}return r}},yv=new jt,Hh=class extends Cc{interpolate_(e,t,n,s){let r=super.interpolate_(e,t,n,s);return yv.fromArray(r).normalize().toArray(r),r}},Cn={FLOAT:5126,FLOAT_MAT3:35675,FLOAT_MAT4:35676,FLOAT_VEC2:35664,FLOAT_VEC3:35665,FLOAT_VEC4:35666,LINEAR:9729,REPEAT:10497,SAMPLER_2D:35678,POINTS:0,LINES:1,LINE_LOOP:2,LINE_STRIP:3,TRIANGLES:4,TRIANGLE_STRIP:5,TRIANGLE_FAN:6,UNSIGNED_BYTE:5121,UNSIGNED_SHORT:5123},qr={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array},Dp={9728:wt,9729:Tt,9984:Al,9985:zr,9986:Os,9987:Vn},Up={33071:En,33648:Sr,10497:Ji},xh={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16},Vh={POSITION:"position",NORMAL:"normal",TANGENT:"tangent",TEXCOORD_0:"uv",TEXCOORD_1:"uv1",TEXCOORD_2:"uv2",TEXCOORD_3:"uv3",COLOR_0:"color",WEIGHTS_0:"skinWeight",JOINTS_0:"skinIndex"},rs={scale:"scale",translation:"position",rotation:"quaternion",weights:"morphTargetInfluences"},vv={CUBICSPLINE:void 0,LINEAR:As,STEP:Es},_h={OPAQUE:"OPAQUE",MASK:"MASK",BLEND:"BLEND"};function bv(i){return i.DefaultMaterial===void 0&&(i.DefaultMaterial=new Wt({color:16777215,emissive:0,metalness:1,roughness:1,transparent:!1,depthTest:!0,side:kn})),i.DefaultMaterial}function Gs(i,e,t){for(let n in t.extensions)i[n]===void 0&&(e.userData.gltfExtensions=e.userData.gltfExtensions||{},e.userData.gltfExtensions[n]=t.extensions[n])}function fi(i,e){e.extras!==void 0&&(typeof e.extras=="object"?Object.assign(i.userData,e.extras):console.warn("THREE.GLTFLoader: Ignoring primitive type .extras, "+e.extras))}function Mv(i,e,t){let n=!1,s=!1,r=!1;for(let c=0,u=e.length;c<u;c++){let h=e[c];if(h.POSITION!==void 0&&(n=!0),h.NORMAL!==void 0&&(s=!0),h.COLOR_0!==void 0&&(r=!0),n&&s&&r)break}if(!n&&!s&&!r)return Promise.resolve(i);let o=[],a=[],l=[];for(let c=0,u=e.length;c<u;c++){let h=e[c];if(n){let d=h.POSITION!==void 0?t.getDependency("accessor",h.POSITION):i.attributes.position;o.push(d)}if(s){let d=h.NORMAL!==void 0?t.getDependency("accessor",h.NORMAL):i.attributes.normal;a.push(d)}if(r){let d=h.COLOR_0!==void 0?t.getDependency("accessor",h.COLOR_0):i.attributes.color;l.push(d)}}return Promise.all([Promise.all(o),Promise.all(a),Promise.all(l)]).then(function(c){let u=c[0],h=c[1],d=c[2];return n&&(i.morphAttributes.position=u),s&&(i.morphAttributes.normal=h),r&&(i.morphAttributes.color=d),i.morphTargetsRelative=!0,i})}function Sv(i,e){if(i.updateMorphTargets(),e.weights!==void 0)for(let t=0,n=e.weights.length;t<n;t++)i.morphTargetInfluences[t]=e.weights[t];if(e.extras&&Array.isArray(e.extras.targetNames)){let t=e.extras.targetNames;if(i.morphTargetInfluences.length===t.length){i.morphTargetDictionary={};for(let n=0,s=t.length;n<s;n++)i.morphTargetDictionary[t[n]]=n}else console.warn("THREE.GLTFLoader: Invalid extras.targetNames length. Ignoring names.")}}function wv(i){let e,t=i.extensions&&i.extensions[Ye.KHR_DRACO_MESH_COMPRESSION];if(t?e="draco:"+t.bufferView+":"+t.indices+":"+yh(t.attributes):e=i.indices+":"+yh(i.attributes)+":"+i.mode,i.targets!==void 0)for(let n=0,s=i.targets.length;n<s;n++)e+=":"+yh(i.targets[n]);return e}function yh(i){let e="",t=Object.keys(i).sort();for(let n=0,s=t.length;n<s;n++)e+=t[n]+":"+i[t[n]]+";";return e}function Gh(i){switch(i){case Int8Array:return 1/127;case Uint8Array:return 1/255;case Int16Array:return 1/32767;case Uint16Array:return 1/65535;default:throw new Error("THREE.GLTFLoader: Unsupported normalized accessor component type.")}}function Tv(i){return i.search(/\.jpe?g($|\?)/i)>0||i.search(/^data\:image\/jpeg/)===0?"image/jpeg":i.search(/\.webp($|\?)/i)>0||i.search(/^data\:image\/webp/)===0?"image/webp":i.search(/\.ktx2($|\?)/i)>0||i.search(/^data\:image\/ktx2/)===0?"image/ktx2":"image/png"}var Ev=new ze,Wh=class{constructor(e={},t={}){this.json=e,this.extensions={},this.plugins={},this.options=t,this.cache=new _v,this.associations=new Map,this.primitiveCache={},this.nodeCache={},this.meshCache={refs:{},uses:{}},this.cameraCache={refs:{},uses:{}},this.lightCache={refs:{},uses:{}},this.sourceCache={},this.textureCache={},this.nodeNamesUsed={};let n=!1,s=-1,r=!1,o=-1;if(typeof navigator<"u"&&typeof navigator.userAgent<"u"){let a=navigator.userAgent;n=/^((?!chrome|android).)*safari/i.test(a)===!0;let l=a.match(/Version\/(\d+)/);s=n&&l?parseInt(l[1],10):-1,r=a.indexOf("Firefox")>-1,o=r?a.match(/Firefox\/([0-9]+)\./)[1]:-1}typeof createImageBitmap>"u"||n&&s<17||r&&o<98?this.textureLoader=new ko(this.options.manager):this.textureLoader=new Ko(this.options.manager),this.textureLoader.setCrossOrigin(this.options.crossOrigin),this.textureLoader.setRequestHeader(this.options.requestHeader),this.fileLoader=new Br(this.options.manager),this.fileLoader.setResponseType("arraybuffer"),this.options.crossOrigin==="use-credentials"&&this.fileLoader.setWithCredentials(!0)}setExtensions(e){this.extensions=e}setPlugins(e){this.plugins=e}parse(e,t){let n=this,s=this.json,r=this.extensions;this.cache.removeAll(),this.nodeCache={},this._invokeAll(function(o){return o._markDefs&&o._markDefs()}),Promise.all(this._invokeAll(function(o){return o.beforeRoot&&o.beforeRoot()})).then(function(){return Promise.all([n.getDependencies("scene"),n.getDependencies("animation"),n.getDependencies("camera")])}).then(function(o){let a={scene:o[0][s.scene||0],scenes:o[0],animations:o[1],cameras:o[2],asset:s.asset,parser:n,userData:{}};return Gs(r,a,s),fi(a,s),Promise.all(n._invokeAll(function(l){return l.afterRoot&&l.afterRoot(a)})).then(function(){for(let l of a.scenes)l.updateMatrixWorld();e(a)})}).catch(t)}_markDefs(){let e=this.json.nodes||[],t=this.json.skins||[],n=this.json.meshes||[];for(let s=0,r=t.length;s<r;s++){let o=t[s].joints;for(let a=0,l=o.length;a<l;a++)e[o[a]].isBone=!0}for(let s=0,r=e.length;s<r;s++){let o=e[s];o.mesh!==void 0&&(this._addNodeRef(this.meshCache,o.mesh),o.skin!==void 0&&(n[o.mesh].isSkinnedMesh=!0)),o.camera!==void 0&&this._addNodeRef(this.cameraCache,o.camera)}}_addNodeRef(e,t){t!==void 0&&(e.refs[t]===void 0&&(e.refs[t]=e.uses[t]=0),e.refs[t]++)}_getNodeRef(e,t,n){if(e.refs[t]<=1)return n;let s=n.clone(),r=(o,a)=>{let l=this.associations.get(o);l!=null&&this.associations.set(a,l);for(let[c,u]of o.children.entries())r(u,a.children[c])};return r(n,s),s.name+="_instance_"+e.uses[t]++,s}_invokeOne(e){let t=Object.values(this.plugins);t.push(this);for(let n=0;n<t.length;n++){let s=e(t[n]);if(s)return s}return null}_invokeAll(e){let t=Object.values(this.plugins);t.unshift(this);let n=[];for(let s=0;s<t.length;s++){let r=e(t[s]);r&&n.push(r)}return n}getDependency(e,t){let n=e+":"+t,s=this.cache.get(n);if(!s){switch(e){case"scene":s=this.loadScene(t);break;case"node":s=this._invokeOne(function(r){return r.loadNode&&r.loadNode(t)});break;case"mesh":s=this._invokeOne(function(r){return r.loadMesh&&r.loadMesh(t)});break;case"accessor":s=this.loadAccessor(t);break;case"bufferView":s=this._invokeOne(function(r){return r.loadBufferView&&r.loadBufferView(t)});break;case"buffer":s=this.loadBuffer(t);break;case"material":s=this._invokeOne(function(r){return r.loadMaterial&&r.loadMaterial(t)});break;case"texture":s=this._invokeOne(function(r){return r.loadTexture&&r.loadTexture(t)});break;case"skin":s=this.loadSkin(t);break;case"animation":s=this._invokeOne(function(r){return r.loadAnimation&&r.loadAnimation(t)});break;case"camera":s=this.loadCamera(t);break;default:if(s=this._invokeOne(function(r){return r!=this&&r.getDependency&&r.getDependency(e,t)}),!s)throw new Error("Unknown type: "+e);break}this.cache.add(n,s)}return s}getDependencies(e){let t=this.cache.get(e);if(!t){let n=this,s=this.json[e+(e==="mesh"?"es":"s")]||[];t=Promise.all(s.map(function(r,o){return n.getDependency(e,o)})),this.cache.add(e,t)}return t}loadBuffer(e){let t=this.json.buffers[e],n=this.fileLoader;if(t.type&&t.type!=="arraybuffer")throw new Error("THREE.GLTFLoader: "+t.type+" buffer type is not supported.");if(t.uri===void 0&&e===0)return Promise.resolve(this.extensions[Ye.KHR_BINARY_GLTF].body);let s=this.options;return new Promise(function(r,o){n.load(Li.resolveURL(t.uri,s.path),r,void 0,function(){o(new Error('THREE.GLTFLoader: Failed to load buffer "'+t.uri+'".'))})})}loadBufferView(e){let t=this.json.bufferViews[e];return this.getDependency("buffer",t.buffer).then(function(n){let s=t.byteLength||0,r=t.byteOffset||0;return n.slice(r,r+s)})}loadAccessor(e){let t=this,n=this.json,s=this.json.accessors[e];if(s.bufferView===void 0&&s.sparse===void 0){let o=xh[s.type],a=qr[s.componentType],l=s.normalized===!0,c=new a(s.count*o);return Promise.resolve(new It(c,o,l))}let r=[];return s.bufferView!==void 0?r.push(this.getDependency("bufferView",s.bufferView)):r.push(null),s.sparse!==void 0&&(r.push(this.getDependency("bufferView",s.sparse.indices.bufferView)),r.push(this.getDependency("bufferView",s.sparse.values.bufferView))),Promise.all(r).then(function(o){let a=o[0],l=xh[s.type],c=qr[s.componentType],u=c.BYTES_PER_ELEMENT,h=u*l,d=s.byteOffset||0,f=s.bufferView!==void 0?n.bufferViews[s.bufferView].byteStride:void 0,g=s.normalized===!0,y,m;if(f&&f!==h){let p=Math.floor(d/f),M="InterleavedBuffer:"+s.bufferView+":"+s.componentType+":"+p+":"+s.count,w=t.cache.get(M);w||(y=new c(a,p*f,s.count*f/u),w=new Rs(y,f/u),t.cache.add(M,w)),m=new ji(w,l,d%f/u,g)}else a===null?y=new c(s.count*l):y=new c(a,d,s.count*l),m=new It(y,l,g);if(s.sparse!==void 0){let p=xh.SCALAR,M=qr[s.sparse.indices.componentType],w=s.sparse.indices.byteOffset||0,S=s.sparse.values.byteOffset||0,C=new M(o[1],w,s.sparse.count*p),A=new c(o[2],S,s.sparse.count*l);a!==null&&(m=new It(m.array.slice(),m.itemSize,m.normalized)),m.normalized=!1;for(let R=0,v=C.length;R<v;R++){let T=C[R];if(m.setX(T,A[R*l]),l>=2&&m.setY(T,A[R*l+1]),l>=3&&m.setZ(T,A[R*l+2]),l>=4&&m.setW(T,A[R*l+3]),l>=5)throw new Error("THREE.GLTFLoader: Unsupported itemSize in sparse BufferAttribute.")}m.normalized=g}return m})}loadTexture(e){let t=this.json,n=this.options,r=t.textures[e].source,o=t.images[r],a=this.textureLoader;if(o.uri){let l=n.manager.getHandler(o.uri);l!==null&&(a=l)}return this.loadTextureImage(e,r,a)}loadTextureImage(e,t,n){let s=this,r=this.json,o=r.textures[e],a=r.images[t],l=(a.uri||a.bufferView)+":"+o.sampler;if(this.textureCache[l])return this.textureCache[l];let c=this.loadImageSource(t,n).then(function(u){u.flipY=!1,u.name=o.name||a.name||"",u.name===""&&typeof a.uri=="string"&&a.uri.startsWith("data:image/")===!1&&(u.name=a.uri);let d=(r.samplers||{})[o.sampler]||{};return u.magFilter=Dp[d.magFilter]||Tt,u.minFilter=Dp[d.minFilter]||Vn,u.wrapS=Up[d.wrapS]||Ji,u.wrapT=Up[d.wrapT]||Ji,u.generateMipmaps=!u.isCompressedTexture&&u.minFilter!==wt&&u.minFilter!==Tt,s.associations.set(u,{textures:e}),u}).catch(function(){return null});return this.textureCache[l]=c,c}loadImageSource(e,t){let n=this,s=this.json,r=this.options;if(this.sourceCache[e]!==void 0)return this.sourceCache[e].then(h=>h.clone());let o=s.images[e],a=self.URL||self.webkitURL,l=o.uri||"",c=!1;if(o.bufferView!==void 0)l=n.getDependency("bufferView",o.bufferView).then(function(h){c=!0;let d=new Blob([h],{type:o.mimeType});return l=a.createObjectURL(d),l});else if(o.uri===void 0)throw new Error("THREE.GLTFLoader: Image "+e+" is missing URI and bufferView");let u=Promise.resolve(l).then(function(h){return new Promise(function(d,f){let g=d;t.isImageBitmapLoader===!0&&(g=function(y){let m=new Ut(y);m.needsUpdate=!0,d(m)}),t.load(Li.resolveURL(h,r.path),g,void 0,f)})}).then(function(h){return c===!0&&a.revokeObjectURL(l),fi(h,o),h.userData.mimeType=o.mimeType||Tv(o.uri),h}).catch(function(h){throw console.error("THREE.GLTFLoader: Couldn't load texture",l),h});return this.sourceCache[e]=u,u}assignTexture(e,t,n,s){let r=this;return this.getDependency("texture",n.index).then(function(o){if(!o)return null;if(n.texCoord!==void 0&&n.texCoord>0&&(o=o.clone(),o.channel=n.texCoord),r.extensions[Ye.KHR_TEXTURE_TRANSFORM]){let a=n.extensions!==void 0?n.extensions[Ye.KHR_TEXTURE_TRANSFORM]:void 0;if(a){let l=r.associations.get(o);o=r.extensions[Ye.KHR_TEXTURE_TRANSFORM].extendTexture(o,a),r.associations.set(o,l)}}return s!==void 0&&(o.colorSpace=s),e[t]=o,o})}assignFinalMaterial(e){let t=e.geometry,n=e.material,s=t.attributes.tangent===void 0,r=t.attributes.color!==void 0,o=t.attributes.normal===void 0;if(e.isPoints){let a="PointsMaterial:"+n.uuid,l=this.cache.get(a);l||(l=new Dr,rn.prototype.copy.call(l,n),l.color.copy(n.color),l.map=n.map,l.sizeAttenuation=!1,this.cache.add(a,l)),n=l}else if(e.isLine){let a="LineBasicMaterial:"+n.uuid,l=this.cache.get(a);l||(l=new Nr,rn.prototype.copy.call(l,n),l.color.copy(n.color),l.map=n.map,this.cache.add(a,l)),n=l}if(s||r||o){let a="ClonedMaterial:"+n.uuid+":";s&&(a+="derivative-tangents:"),r&&(a+="vertex-colors:"),o&&(a+="flat-shading:");let l=this.cache.get(a);l||(l=n.clone(),r&&(l.vertexColors=!0),o&&(l.flatShading=!0),s&&(l.normalScale&&(l.normalScale.y*=-1),l.clearcoatNormalScale&&(l.clearcoatNormalScale.y*=-1)),this.cache.add(a,l),this.associations.set(l,this.associations.get(n))),n=l}e.material=n}getMaterialType(){return Wt}loadMaterial(e){let t=this,n=this.json,s=this.extensions,r=n.materials[e],o,a={},l=r.extensions||{},c=[];if(l[Ye.KHR_MATERIALS_UNLIT]){let h=s[Ye.KHR_MATERIALS_UNLIT];o=h.getMaterialType(),c.push(h.extendParams(a,r,t))}else{let h=r.pbrMetallicRoughness||{};if(a.color=new Pe(1,1,1),a.opacity=1,Array.isArray(h.baseColorFactor)){let d=h.baseColorFactor;a.color.setRGB(d[0],d[1],d[2],Xt),a.opacity=d[3]}h.baseColorTexture!==void 0&&c.push(t.assignTexture(a,"map",h.baseColorTexture,_t)),a.metalness=h.metallicFactor!==void 0?h.metallicFactor:1,a.roughness=h.roughnessFactor!==void 0?h.roughnessFactor:1,h.metallicRoughnessTexture!==void 0&&(c.push(t.assignTexture(a,"metalnessMap",h.metallicRoughnessTexture)),c.push(t.assignTexture(a,"roughnessMap",h.metallicRoughnessTexture))),o=this._invokeOne(function(d){return d.getMaterialType&&d.getMaterialType(e)}),c.push(Promise.all(this._invokeAll(function(d){return d.extendMaterialParams&&d.extendMaterialParams(e,a)})))}r.doubleSided===!0&&(a.side=An);let u=r.alphaMode||_h.OPAQUE;if(u===_h.BLEND?(a.transparent=!0,a.depthWrite=!1):(a.transparent=!1,u===_h.MASK&&(a.alphaTest=r.alphaCutoff!==void 0?r.alphaCutoff:.5)),r.normalTexture!==void 0&&o!==yn&&(c.push(t.assignTexture(a,"normalMap",r.normalTexture)),a.normalScale=new Ie(1,1),r.normalTexture.scale!==void 0)){let h=r.normalTexture.scale;a.normalScale.set(h,h)}if(r.occlusionTexture!==void 0&&o!==yn&&(c.push(t.assignTexture(a,"aoMap",r.occlusionTexture)),r.occlusionTexture.strength!==void 0&&(a.aoMapIntensity=r.occlusionTexture.strength)),r.emissiveFactor!==void 0&&o!==yn){let h=r.emissiveFactor;a.emissive=new Pe().setRGB(h[0],h[1],h[2],Xt)}return r.emissiveTexture!==void 0&&o!==yn&&c.push(t.assignTexture(a,"emissiveMap",r.emissiveTexture,_t)),Promise.all(c).then(function(){let h=new o(a);return r.name&&(h.name=r.name),fi(h,r),t.associations.set(h,{materials:e}),r.extensions&&Gs(s,h,r),h})}createUniqueName(e){let t=lt.sanitizeNodeName(e||"");return t in this.nodeNamesUsed?t+"_"+ ++this.nodeNamesUsed[t]:(this.nodeNamesUsed[t]=0,t)}loadGeometries(e){let t=this,n=this.extensions,s=this.primitiveCache;function r(a){return n[Ye.KHR_DRACO_MESH_COMPRESSION].decodePrimitive(a,t).then(function(l){return Fp(l,a,t)})}let o=[];for(let a=0,l=e.length;a<l;a++){let c=e[a],u=wv(c),h=s[u];if(h)o.push(h.promise);else{let d;c.extensions&&c.extensions[Ye.KHR_DRACO_MESH_COMPRESSION]?d=r(c):d=Fp(new Pt,c,t),s[u]={primitive:c,promise:d},o.push(d)}}return Promise.all(o)}loadMesh(e){let t=this,n=this.json,s=this.extensions,r=n.meshes[e],o=r.primitives,a=[];for(let l=0,c=o.length;l<c;l++){let u=o[l].material===void 0?bv(this.cache):this.getDependency("material",o[l].material);a.push(u)}return a.push(t.loadGeometries(o)),Promise.all(a).then(function(l){let c=l.slice(0,l.length-1),u=l[l.length-1],h=[];for(let f=0,g=u.length;f<g;f++){let y=u[f],m=o[f],p,M=c[f];if(m.mode===Cn.TRIANGLES||m.mode===Cn.TRIANGLE_STRIP||m.mode===Cn.TRIANGLE_FAN||m.mode===void 0)p=r.isSkinnedMesh===!0?new Ao(y,M):new nt(y,M),p.isSkinnedMesh===!0&&p.normalizeSkinWeights(),m.mode===Cn.TRIANGLE_STRIP?p.geometry=gh(p.geometry,ta):m.mode===Cn.TRIANGLE_FAN&&(p.geometry=gh(p.geometry,Gr));else if(m.mode===Cn.LINES)p=new Io(y,M);else if(m.mode===Cn.LINE_STRIP)p=new Ls(y,M);else if(m.mode===Cn.LINE_LOOP)p=new Po(y,M);else if(m.mode===Cn.POINTS)p=new Lo(y,M);else throw new Error("THREE.GLTFLoader: Primitive mode unsupported: "+m.mode);Object.keys(p.geometry.morphAttributes).length>0&&Sv(p,r),p.name=t.createUniqueName(r.name||"mesh_"+e),fi(p,r),m.extensions&&Gs(s,p,m),t.assignFinalMaterial(p),h.push(p)}for(let f=0,g=h.length;f<g;f++)t.associations.set(h[f],{meshes:e,primitives:f});if(h.length===1)return r.extensions&&Gs(s,h[0],r),h[0];let d=new Gt;r.extensions&&Gs(s,d,r),t.associations.set(d,{meshes:e});for(let f=0,g=h.length;f<g;f++)d.add(h[f]);return d})}loadCamera(e){let t,n=this.json.cameras[e],s=n[n.type];if(!s){console.warn("THREE.GLTFLoader: Missing camera parameters.");return}return n.type==="perspective"?t=new Rt(Lt.radToDeg(s.yfov),s.aspectRatio||1,s.znear||1,s.zfar||2e6):n.type==="orthographic"&&(t=new ts(-s.xmag,s.xmag,s.ymag,-s.ymag,s.znear,s.zfar)),n.name&&(t.name=this.createUniqueName(n.name)),fi(t,n),Promise.resolve(t)}loadSkin(e){let t=this.json.skins[e],n=[];for(let s=0,r=t.joints.length;s<r;s++)n.push(this._loadNodeShallow(t.joints[s]));return t.inverseBindMatrices!==void 0?n.push(this.getDependency("accessor",t.inverseBindMatrices)):n.push(null),Promise.all(n).then(function(s){let r=s.pop(),o=s,a=[],l=[];for(let c=0,u=o.length;c<u;c++){let h=o[c];if(h){a.push(h);let d=new ze;r!==null&&d.fromArray(r.array,c*16),l.push(d)}else console.warn('THREE.GLTFLoader: Joint "%s" could not be found.',t.joints[c])}return new Co(a,l)})}loadAnimation(e){let t=this.json,n=this,s=t.animations[e],r=s.name?s.name:"animation_"+e,o=[],a=[],l=[],c=[],u=[];for(let h=0,d=s.channels.length;h<d;h++){let f=s.channels[h],g=s.samplers[f.sampler],y=f.target,m=y.node,p=s.parameters!==void 0?s.parameters[g.input]:g.input,M=s.parameters!==void 0?s.parameters[g.output]:g.output;y.node!==void 0&&(o.push(this.getDependency("node",m)),a.push(this.getDependency("accessor",p)),l.push(this.getDependency("accessor",M)),c.push(g),u.push(y))}return Promise.all([Promise.all(o),Promise.all(a),Promise.all(l),Promise.all(c),Promise.all(u)]).then(function(h){let d=h[0],f=h[1],g=h[2],y=h[3],m=h[4],p=[];for(let w=0,S=d.length;w<S;w++){let C=d[w],A=f[w],R=g[w],v=y[w],T=m[w];if(C===void 0)continue;C.updateMatrix&&C.updateMatrix();let K=n._createAnimationTracks(C,A,R,v,T);if(K)for(let I=0;I<K.length;I++)p.push(K[I])}let M=new Ns(r,void 0,p);return fi(M,s),M})}createNodeMesh(e){let t=this.json,n=this,s=t.nodes[e];return s.mesh===void 0?null:n.getDependency("mesh",s.mesh).then(function(r){let o=n._getNodeRef(n.meshCache,s.mesh,r);return s.weights!==void 0&&o.traverse(function(a){if(a.isMesh)for(let l=0,c=s.weights.length;l<c;l++)a.morphTargetInfluences[l]=s.weights[l]}),o})}loadNode(e){let t=this.json,n=this,s=t.nodes[e],r=n._loadNodeShallow(e),o=[],a=s.children||[];for(let c=0,u=a.length;c<u;c++)o.push(n.getDependency("node",a[c]));let l=s.skin===void 0?Promise.resolve(null):n.getDependency("skin",s.skin);return Promise.all([r,Promise.all(o),l]).then(function(c){let u=c[0],h=c[1],d=c[2];d!==null&&u.traverse(function(f){f.isSkinnedMesh&&f.bind(d,Ev)});for(let f=0,g=h.length;f<g;f++)u.add(h[f]);if(u.userData.pivot!==void 0&&h.length>0){let f=u.userData.pivot,g=h[0];u.pivot=new L().fromArray(f),u.position.x-=f[0],u.position.y-=f[1],u.position.z-=f[2],g.position.set(0,0,0),delete u.userData.pivot}return u})}_loadNodeShallow(e){let t=this.json,n=this.extensions,s=this;if(this.nodeCache[e]!==void 0)return this.nodeCache[e];let r=t.nodes[e],o=r.name?s.createUniqueName(r.name):"",a=[],l=s._invokeOne(function(c){return c.createNodeMesh&&c.createNodeMesh(e)});return l&&a.push(l),r.camera!==void 0&&a.push(s.getDependency("camera",r.camera).then(function(c){return s._getNodeRef(s.cameraCache,r.camera,c)})),s._invokeAll(function(c){return c.createNodeAttachment&&c.createNodeAttachment(e)}).forEach(function(c){a.push(c)}),this.nodeCache[e]=Promise.all(a).then(function(c){let u;if(r.isBone===!0?u=new Ir:c.length>1?u=new Gt:c.length===1?u=c[0]:u=new gt,u!==c[0])for(let h=0,d=c.length;h<d;h++)u.add(c[h]);if(r.name&&(u.userData.name=r.name,u.name=o),fi(u,r),r.extensions&&Gs(n,u,r),r.matrix!==void 0){let h=new ze;h.fromArray(r.matrix),u.applyMatrix4(h)}else r.translation!==void 0&&u.position.fromArray(r.translation),r.rotation!==void 0&&u.quaternion.fromArray(r.rotation),r.scale!==void 0&&u.scale.fromArray(r.scale);if(!s.associations.has(u))s.associations.set(u,{});else if(r.mesh!==void 0&&s.meshCache.refs[r.mesh]>1){let h=s.associations.get(u);s.associations.set(u,{...h})}return s.associations.get(u).nodes=e,u}),this.nodeCache[e]}loadScene(e){let t=this.extensions,n=this.json.scenes[e],s=this,r=new Gt;n.name&&(r.name=s.createUniqueName(n.name)),fi(r,n),n.extensions&&Gs(t,r,n);let o=n.nodes||[],a=[];for(let l=0,c=o.length;l<c;l++)a.push(s.getDependency("node",o[l]));return Promise.all(a).then(function(l){for(let u=0,h=l.length;u<h;u++){let d=l[u];d.parent!==null?r.add(Tc(d)):r.add(d)}let c=u=>{let h=new Map;for(let[d,f]of s.associations)(d instanceof rn||d instanceof Ut)&&h.set(d,f);return u.traverse(d=>{let f=s.associations.get(d);f!=null&&h.set(d,f)}),h};return s.associations=c(r),r})}_createAnimationTracks(e,t,n,s,r){let o=[],a=e.name?e.name:e.uuid,l=[];rs[r.path]===rs.weights?e.traverse(function(d){d.morphTargetInfluences&&l.push(d.name?d.name:d.uuid)}):l.push(a);let c;switch(rs[r.path]){case rs.weights:c=ri;break;case rs.rotation:c=oi;break;case rs.translation:case rs.scale:c=ai;break;default:n.itemSize===1?c=ri:c=ai;break}let u=s.interpolation!==void 0?vv[s.interpolation]:As,h=this._getArrayFromAccessor(n);for(let d=0,f=l.length;d<f;d++){let g=new c(l[d]+"."+rs[r.path],t.array,h,u);s.interpolation==="CUBICSPLINE"&&this._createCubicSplineTrackInterpolant(g),o.push(g)}return o}_getArrayFromAccessor(e){let t=e.array;if(e.normalized){let n=Gh(t.constructor),s=new Float32Array(t.length);for(let r=0,o=t.length;r<o;r++)s[r]=t[r]*n;t=s}return t}_createCubicSplineTrackInterpolant(e){e.createInterpolant=function(n){let s=this instanceof oi?Hh:Cc;return new s(this.times,this.values,this.getValueSize()/3,n)},e.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline=!0}};function Av(i,e,t){let n=e.attributes,s=new Qt;if(n.POSITION!==void 0){let a=t.json.accessors[n.POSITION],l=a.min,c=a.max;if(l!==void 0&&c!==void 0){if(s.set(new L(l[0],l[1],l[2]),new L(c[0],c[1],c[2])),a.normalized){let u=Gh(qr[a.componentType]);s.min.multiplyScalar(u),s.max.multiplyScalar(u)}}else{console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.");return}}else return;let r=e.targets;if(r!==void 0){let a=new L,l=new L;for(let c=0,u=r.length;c<u;c++){let h=r[c];if(h.POSITION!==void 0){let d=t.json.accessors[h.POSITION],f=d.min,g=d.max;if(f!==void 0&&g!==void 0){if(l.setX(Math.max(Math.abs(f[0]),Math.abs(g[0]))),l.setY(Math.max(Math.abs(f[1]),Math.abs(g[1]))),l.setZ(Math.max(Math.abs(f[2]),Math.abs(g[2]))),d.normalized){let y=Gh(qr[d.componentType]);l.multiplyScalar(y)}a.max(l)}else console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.")}}s.expandByVector(a)}i.boundingBox=s;let o=new un;s.getCenter(o.center),o.radius=s.min.distanceTo(s.max)/2,i.boundingSphere=o}function Fp(i,e,t){let n=e.attributes,s=[];function r(o,a){return t.getDependency("accessor",o).then(function(l){i.setAttribute(a,l)})}for(let o in n){let a=Vh[o]||o.toLowerCase();a in i.attributes||s.push(r(n[o],a))}if(e.indices!==void 0&&!i.index){let o=t.getDependency("accessor",e.indices).then(function(a){i.setIndex(a)});s.push(o)}return $e.workingColorSpace!==Xt&&"COLOR_0"in n&&console.warn(`THREE.GLTFLoader: Converting vertex colors from "srgb-linear" to "${$e.workingColorSpace}" not supported.`),fi(i,e),Av(i,e,t),Promise.all(s).then(function(){return e.targets!==void 0?Mv(i,e.targets,t):i})}var Kh={AVATARS:[{id:"female-a",nameKo:"\uC5EC\uD589\uC790 \uBBF8\uB098",nameEn:"Mina",model:"assets/english-travel-3d/models/characters/character-female-a.glb",voice:"en-US"},{id:"male-a",nameKo:"\uC5EC\uD589\uC790 \uC900",nameEn:"Joon",model:"assets/english-travel-3d/models/characters/character-male-a.glb",voice:"en-US"}],LOCATIONS:[{id:"airport",titleKo:"\uACF5\uD56D",titleEn:"Airport",icon:"\u2708\uFE0F",color:"#70B7FF",descriptionKo:"\uC785\uAD6D \uC2EC\uC0AC\uB97C \uD1B5\uACFC\uD558\uACE0 \uC783\uC5B4\uBC84\uB9B0 \uC5EC\uD589 \uAC00\uBC29\uC744 \uCC3E\uC544\uC694.",npc:{name:"Officer Emma",role:"\uC785\uAD6D \uC2EC\uC0AC\uAD00",model:"assets/english-travel-3d/models/characters/character-female-b.glb",voice:"en-US",position:[0,4]},mission:{id:"airport-arrival",titleKo:"\uB450\uADFC\uB450\uADFC \uCCAB \uC785\uAD6D",goalKo:"\uC5EC\uAD8C\uC744 \uBCF4\uC5EC \uC8FC\uACE0 \uC5EC\uD589 \uAE30\uAC04\uC744 \uB9D0\uD55C \uB4A4 \uC783\uC5B4\uBC84\uB9B0 \uC9D0\uC744 \uC124\uBA85\uD574\uC694.",reward:{xp:100,coins:40,need:"confidence"},turns:[{id:"airport-passport",npc:"Welcome! May I see your passport?",npcKo:"\uC5B4\uC11C \uC624\uC138\uC694! \uC5EC\uAD8C\uC744 \uBCF4\uC5EC \uC8FC\uC2DC\uACA0\uC5B4\uC694?",target:"Here you are.",accepts:["Here you are.","Sure, here you are.","Of course. Here you are."],keywords:["here","you","are"],hintKo:"\uBB3C\uAC74\uC744 \uAC74\uB124\uBA70 '\uC5EC\uAE30 \uC788\uC2B5\uB2C8\uB2E4'\uB77C\uACE0 \uB9D0\uD574 \uBCF4\uC138\uC694.",correctionKo:"\uBB3C\uAC74\uC744 \uAC74\uB12C \uB54C\uB294 Here you are.\uB77C\uACE0 \uB9D0\uD574\uC694.",success:"Thank you. Everything looks good.",successKo:"\uACE0\uB9C8\uC6CC\uC694. \uBAA8\uB450 \uD655\uC778\uB410\uC5B4\uC694."},{id:"airport-purpose",npc:"Are you here on vacation?",npcKo:"\uD734\uAC00 \uC5EC\uD589\uC744 \uC654\uB098\uC694?",target:"Yes, I am. I'm here on vacation.",accepts:["Yes, I am. I'm here on vacation.","Yes. I'm here on vacation.","Yes, I'm on vacation."],keywords:["yes","vacation"],hintKo:"Yes\uB85C \uB300\uB2F5\uD558\uACE0 on vacation\uC744 \uC0AC\uC6A9\uD574\uC694.",correctionKo:"\uD734\uAC00 \uC911\uC774\uB77C\uB294 \uB9D0\uC740 I'm here on vacation.\uC774\uB77C\uACE0 \uD574\uC694.",success:"Wonderful. I hope you enjoy your trip.",successKo:"\uC88B\uC544\uC694. \uC990\uAC70\uC6B4 \uC5EC\uD589\uC774 \uB418\uAE38 \uBC14\uB77C\uC694."},{id:"airport-duration",npc:"How long are you staying?",npcKo:"\uC5BC\uB9C8 \uB3D9\uC548 \uBA38\uBB3C \uC608\uC815\uC778\uAC00\uC694?",target:"I'm staying for five days.",accepts:["I'm staying for five days.","For five days.","I will stay for five days."],keywords:["five","days"],hintKo:"five days\uB97C \uB123\uC5B4 \uBA38\uBB34\uB294 \uAE30\uAC04\uC744 \uB9D0\uD574\uC694.",correctionKo:"\uC22B\uC790\uAC00 2 \uC774\uC0C1\uC774\uBA74 day \uB4A4\uC5D0 s\uB97C \uBD99\uC5EC five days\uB77C\uACE0 \uD574\uC694.",success:"Five days. Got it!",successKo:"5\uC77C\uC774\uAD70\uC694. \uD655\uC778\uD588\uC5B4\uC694!"},{id:"airport-luggage",npc:"You look worried. How can I help you?",npcKo:"\uAC71\uC815\uC2A4\uB7EC\uC6CC \uBCF4\uC5EC\uC694. \uBB34\uC5C7\uC744 \uB3C4\uC640\uB4DC\uB9B4\uAE4C\uC694?",target:"I can't find my blue suitcase.",accepts:["I can't find my blue suitcase.","I can't find my suitcase. It's blue.","My blue suitcase is missing."],keywords:["suitcase","blue","find"],hintKo:"\uBABB \uCC3E\uACA0\uB2E4\uB294 I can't find\uC640 \uBB3C\uAC74\uC758 \uC0C9\uC744 \uD568\uAED8 \uB9D0\uD574\uC694.",correctionKo:"\uB0B4 \uAC00\uBC29\uC740 my suitcase, \uBABB \uCC3E\uACA0\uB2E4\uB294 I can't find\uB77C\uACE0 \uB9D0\uD574\uC694.",success:"Don't worry. We'll help you find it.",successKo:"\uAC71\uC815\uD558\uC9C0 \uB9C8\uC138\uC694. \uD568\uAED8 \uCC3E\uC544\uB4DC\uB9B4\uAC8C\uC694."}]}},{id:"hotel",titleKo:"\uD638\uD154",titleEn:"Hotel",icon:"\u{1F3E8}",color:"#8D7BFF",descriptionKo:"\uD638\uD154\uC5D0 \uCCB4\uD06C\uC778\uD558\uACE0 \uD544\uC694\uD55C \uBB3C\uAC74\uACFC \uC2DC\uAC04\uC744 \uC815\uC911\uD558\uAC8C \uBB3C\uC5B4\uBD10\uC694.",npc:{name:"Mr. Oliver",role:"\uD638\uD154 \uD504\uB7F0\uD2B8 \uC9C1\uC6D0",model:"assets/english-travel-3d/models/characters/character-male-c.glb",voice:"en-US",position:[-15,-4]},mission:{id:"hotel-check-in",titleKo:"\uB0B4 \uBC29\uC744 \uCC3E\uC544\uC11C",goalKo:"\uC608\uC57D\uC744 \uD655\uC778\uD558\uACE0 \uC219\uBC15 \uAE30\uAC04\uACFC \uD544\uC694\uD55C \uBB3C\uAC74\uC744 \uB9D0\uD574\uC694.",reward:{xp:100,coins:40,need:"energy"},turns:[{id:"hotel-reservation",npc:"Welcome to Sunrise Hotel. How can I help you?",npcKo:"\uC120\uB77C\uC774\uC988 \uD638\uD154\uC5D0 \uC624\uC2E0 \uAC83\uC744 \uD658\uC601\uD574\uC694. \uBB34\uC5C7\uC744 \uB3C4\uC640\uB4DC\uB9B4\uAE4C\uC694?",target:"I have a reservation.",accepts:["I have a reservation.","I have a room reservation.","I'd like to check in."],keywords:["reservation","check","in"],hintKo:"\uC608\uC57D\uC774 \uC788\uB2E4\uB294 \uD45C\uD604 I have a reservation.\uC744 \uC0AC\uC6A9\uD574\uC694.",correctionKo:"\uC608\uC57D\uC774 \uC788\uB2E4\uACE0 \uD560 \uB54C\uB294 have\uB97C \uB123\uC5B4 I have a reservation.\uC774\uB77C\uACE0 \uD574\uC694.",success:"Great. I found your reservation.",successKo:"\uC88B\uC544\uC694. \uC608\uC57D\uC744 \uCC3E\uC558\uC5B4\uC694."},{id:"hotel-nights",npc:"How many nights will you stay?",npcKo:"\uBA87 \uBC15\uC744 \uBA38\uBB3C \uAC74\uAC00\uC694?",target:"Two nights, please.",accepts:["Two nights, please.","I'll stay for two nights.","I'm staying for two nights."],keywords:["two","nights"],hintKo:"\uC22B\uC790\uC640 nights\uB97C \uD568\uAED8 \uB9D0\uD574\uC694.",correctionKo:"2\uBC15 \uC774\uC0C1\uC774\uBA74 night \uB4A4\uC5D0 s\uB97C \uBD99\uC5EC two nights\uB77C\uACE0 \uD574\uC694.",success:"Perfect. Here is your room key.",successKo:"\uC88B\uC544\uC694. \uC5EC\uAE30 \uAC1D\uC2E4 \uCE74\uB4DC \uD0A4\uAC00 \uC788\uC5B4\uC694."},{id:"hotel-towel",npc:"Is there anything you need for your room?",npcKo:"\uAC1D\uC2E4\uC5D0 \uD544\uC694\uD55C \uAC83\uC774 \uC788\uB098\uC694?",target:"Could I have an extra towel, please?",accepts:["Could I have an extra towel, please?","Can I have an extra towel, please?","I'd like an extra towel, please."],keywords:["extra","towel"],hintKo:"Could I have\uC640 please\uB97C \uC0AC\uC6A9\uD574 \uC815\uC911\uD558\uAC8C \uBD80\uD0C1\uD574\uC694.",correctionKo:"\uBD80\uD0C1\uD560 \uB54C\uB294 Could I have an extra towel, please?\uB77C\uACE0 \uD558\uBA74 \uC790\uC5F0\uC2A4\uB7EC\uC6CC\uC694.",success:"Of course. I'll send one to your room.",successKo:"\uBB3C\uB860\uC774\uC8E0. \uAC1D\uC2E4\uB85C \uBCF4\uB0B4\uB4DC\uB9B4\uAC8C\uC694."},{id:"hotel-breakfast",npc:"Do you have any questions about the hotel?",npcKo:"\uD638\uD154\uC5D0 \uAD00\uD574 \uAD81\uAE08\uD55C \uC810\uC774 \uC788\uB098\uC694?",target:"What time is breakfast?",accepts:["What time is breakfast?","When is breakfast?","What time does breakfast start?"],keywords:["breakfast","time"],hintKo:"\uC544\uCE68 \uC2DD\uC0AC\uC758 \uC2DC\uAC04\uC744 What time\uC73C\uB85C \uBB3C\uC5B4\uBD10\uC694.",correctionKo:"\uC2DC\uAC04\uC744 \uBB3C\uC744 \uB54C\uB294 What time is breakfast?\uB77C\uACE0 \uD574\uC694.",success:"Breakfast is from seven to ten.",successKo:"\uC544\uCE68 \uC2DD\uC0AC\uB294 7\uC2DC\uBD80\uD130 10\uC2DC\uAE4C\uC9C0\uC608\uC694."}]}},{id:"restaurant",titleKo:"\uB808\uC2A4\uD1A0\uB791",titleEn:"Restaurant",icon:"\u{1F37D}\uFE0F",color:"#FF8E72",descriptionKo:"\uC790\uB9AC\uB97C \uBD80\uD0C1\uD558\uACE0 \uC74C\uC2DD\uACFC \uC74C\uB8CC\uB97C \uC8FC\uBB38\uD558\uBA70 \uC54C\uB808\uB974\uAE30\uC640 \uACC4\uC0B0 \uBC29\uBC95\uC744 \uB9D0\uD574\uC694.",npc:{name:"Chef Sofia",role:"\uB808\uC2A4\uD1A0\uB791 \uC9C1\uC6D0",model:"assets/english-travel-3d/models/characters/character-female-d.glb",voice:"en-US",position:[14,-5]},mission:{id:"restaurant-dinner",titleKo:"\uB9DB\uC788\uB294 \uC800\uB141 \uC8FC\uBB38",goalKo:"\uC778\uC6D0\uC218\uC640 \uC8FC\uBB38\uC744 \uB9D0\uD558\uACE0 \uC54C\uB808\uB974\uAE30\uB97C \uD655\uC778\uD55C \uB4A4 \uACC4\uC0B0\uD574\uC694.",reward:{xp:110,coins:45,need:"hunger"},turns:[{id:"restaurant-table",npc:"Good evening! How many people?",npcKo:"\uC548\uB155\uD558\uC138\uC694! \uBA87 \uBD84\uC774\uC2E0\uAC00\uC694?",target:"A table for two, please.",accepts:["A table for two, please.","Table for two, please.","There are two of us."],keywords:["table","two"],hintKo:"table for two\uB97C \uC0AC\uC6A9\uD574 \uB450 \uBA85 \uC790\uB9AC\uB77C\uACE0 \uB9D0\uD574\uC694.",correctionKo:"\uB450 \uBA85 \uC790\uB9AC\uB97C \uBD80\uD0C1\uD560 \uB54C\uB294 A table for two, please.\uB77C\uACE0 \uD574\uC694.",success:"Right this way. Here is your table.",successKo:"\uC774\uCABD\uC73C\uB85C \uC624\uC138\uC694. \uC5EC\uAE30 \uC549\uC73C\uC2DC\uBA74 \uB3FC\uC694."},{id:"restaurant-order",npc:"Are you ready to order?",npcKo:"\uC8FC\uBB38\uD558\uC2DC\uACA0\uC5B4\uC694?",target:"I'd like the chicken sandwich and some water, please.",accepts:["I'd like the chicken sandwich and some water, please.","Can I have the chicken sandwich and water, please?","The chicken sandwich and water, please."],keywords:["chicken","sandwich","water"],hintKo:"I'd like\uB85C \uC74C\uC2DD\uACFC \uBB3C\uC744 \uD568\uAED8 \uC8FC\uBB38\uD574\uC694.",correctionKo:"\uC9C0\uAE08 \uC8FC\uBB38\uD560 \uB54C\uB294 I like\uBCF4\uB2E4 I'd like\uAC00 \uB354 \uC790\uC5F0\uC2A4\uB7EC\uC6CC\uC694.",success:"Excellent choice. I'll bring them soon.",successKo:"\uC88B\uC740 \uC120\uD0DD\uC774\uC5D0\uC694. \uACE7 \uAC00\uC838\uB2E4\uB4DC\uB9B4\uAC8C\uC694."},{id:"restaurant-allergy",npc:"Your meal comes with a cookie. Is that okay?",npcKo:"\uC2DD\uC0AC\uC5D0 \uCFE0\uD0A4\uAC00 \uD568\uAED8 \uB098\uC624\uB294\uB370 \uAD1C\uCC2E\uB098\uC694?",target:"Does it have nuts? I'm allergic to nuts.",accepts:["Does it have nuts? I'm allergic to nuts.","Are there nuts in it? I'm allergic to nuts.","I can't eat nuts. Does the cookie have nuts?"],keywords:["nuts","allergic"],hintKo:"\uACAC\uACFC\uB958\uAC00 \uC788\uB294\uC9C0 \uBB3B\uACE0 \uC54C\uB808\uB974\uAE30\uAC00 \uC788\uB2E4\uACE0 \uB9D0\uD574\uC694.",correctionKo:"Does \uB4A4\uC5D0\uB294 has\uAC00 \uC544\uB2C8\uB77C have\uB97C \uC4F0\uACE0, I'm allergic to nuts.\uB77C\uACE0 \uB9D0\uD574\uC694.",success:"Thanks for telling me. I'll bring fruit instead.",successKo:"\uB9D0\uD574 \uC918\uC11C \uACE0\uB9C8\uC6CC\uC694. \uB300\uC2E0 \uACFC\uC77C\uC744 \uB4DC\uB9B4\uAC8C\uC694."},{id:"restaurant-payment",npc:"Did you enjoy your meal? Is there anything else?",npcKo:"\uC2DD\uC0AC\uB294 \uB9DB\uC788\uC5C8\uB098\uC694? \uB354 \uD544\uC694\uD55C \uAC83\uC774 \uC788\uB098\uC694?",target:"Can I have the bill, please? Can I pay by card?",accepts:["Can I have the bill, please? Can I pay by card?","The bill, please. I'd like to pay by card.","Could I get the bill and pay by card?"],keywords:["bill","card","pay"],hintKo:"bill\uACFC pay by card\uB97C \uC0AC\uC6A9\uD574 \uACC4\uC0B0\uC744 \uBD80\uD0C1\uD574\uC694.",correctionKo:"\uCE74\uB4DC\uB85C \uACC4\uC0B0\uD55C\uB2E4\uB294 \uB9D0\uC740 pay with card\uBCF4\uB2E4 pay by card\uAC00 \uC790\uC5F0\uC2A4\uB7EC\uC6CC\uC694.",success:"Certainly. I'll bring the card machine.",successKo:"\uBB3C\uB860\uC774\uC8E0. \uCE74\uB4DC \uB2E8\uB9D0\uAE30\uB97C \uAC00\uC838\uC62C\uAC8C\uC694."}]}},{id:"shop",titleKo:"\uC0C1\uC810",titleEn:"Shop",icon:"\u{1F6CD}\uFE0F",color:"#F6C85F",descriptionKo:"\uC6D0\uD558\uB294 \uC637\uC758 \uC0C9\uACFC \uD06C\uAE30\uB97C \uB9D0\uD558\uACE0 \uC785\uC5B4 \uBCF8 \uB4A4 \uAC00\uACA9\uC744 \uBB3C\uC5B4\uBD10\uC694.",npc:{name:"Mr. Leo",role:"\uC0C1\uC810 \uC9C1\uC6D0",model:"assets/english-travel-3d/models/characters/character-male-e.glb",voice:"en-US",position:[15,10]},mission:{id:"shop-souvenir",titleKo:"\uB098\uB9CC\uC758 \uC5EC\uD589 \uAE30\uB150\uD488",goalKo:"\uCC3E\uB294 \uBB3C\uAC74\uACFC \uC0C9\xB7\uD06C\uAE30\uB97C \uB9D0\uD558\uACE0 \uCC29\uC6A9\uACFC \uAC00\uACA9\uC744 \uBB3C\uC5B4\uBD10\uC694.",reward:{xp:110,coins:45,need:"style"},turns:[{id:"shop-looking",npc:"Hello! Can I help you find something?",npcKo:"\uC548\uB155\uD558\uC138\uC694! \uCC3E\uB294 \uBB3C\uAC74\uC774 \uC788\uB098\uC694?",target:"I'm looking for a T-shirt.",accepts:["I'm looking for a T-shirt.","I'm looking for a shirt.","I'd like a T-shirt, please."],keywords:["looking","shirt"],hintKo:"I'm looking for\uB97C \uC0AC\uC6A9\uD574 \uCC3E\uB294 \uBB3C\uAC74\uC744 \uB9D0\uD574\uC694.",correctionKo:"\uCC3E\uB294 \uBB3C\uAC74\uC740 I'm looking for a T-shirt.\uB77C\uACE0 \uB9D0\uD574\uC694.",success:"We have several T-shirts over here.",successKo:"\uC774\uCABD\uC5D0 \uD2F0\uC154\uCE20\uAC00 \uC5EC\uB7EC \uBC8C \uC788\uC5B4\uC694."},{id:"shop-color-size",npc:"What color and size would you like?",npcKo:"\uC5B4\uB5A4 \uC0C9\uACFC \uD06C\uAE30\uB97C \uC6D0\uD558\uB098\uC694?",target:"Do you have it in blue, size medium?",accepts:["Do you have it in blue, size medium?","Blue in a medium, please.","I'd like a blue one in medium."],keywords:["blue","medium"],hintKo:"blue\uC640 medium\uC744 \uB123\uC5B4 \uC0C9\uACFC \uD06C\uAE30\uB97C \uD568\uAED8 \uB9D0\uD574\uC694.",correctionKo:"\uC0C9\uC740 in blue, \uD06C\uAE30\uB294 size medium \uB610\uB294 in medium\uC73C\uB85C \uB9D0\uD560 \uC218 \uC788\uC5B4\uC694.",success:"Yes, here is a blue medium.",successKo:"\uB124, \uC5EC\uAE30 \uD30C\uB780\uC0C9 \uC911\uAC04 \uD06C\uAE30\uAC00 \uC788\uC5B4\uC694."},{id:"shop-try-on",npc:"Here it is. What would you like to do?",npcKo:"\uC5EC\uAE30 \uC788\uC5B4\uC694. \uC5B4\uB5BB\uAC8C \uD574 \uBCFC\uAE4C\uC694?",target:"Can I try it on?",accepts:["Can I try it on?","Could I try this on?","May I try it on?"],keywords:["try","on"],hintKo:"\uC637\uC744 \uC785\uC5B4 \uBCF4\uB294 \uD45C\uD604 try it on\uC744 \uC0AC\uC6A9\uD574\uC694.",correctionKo:"\uC637\uC744 \uC785\uC5B4 \uBCF8\uB2E4\uB294 \uB9D0\uC740 try it on\uC774\uB77C\uACE0 \uD574\uC694. it\uC740 try\uC640 on \uC0AC\uC774\uC5D0 \uC640\uC694.",success:"Of course. The fitting room is over there.",successKo:"\uBB3C\uB860\uC774\uC8E0. \uD0C8\uC758\uC2E4\uC740 \uC800\uCABD\uC5D0 \uC788\uC5B4\uC694."},{id:"shop-price",npc:"It looks great on you. Do you have a question?",npcKo:"\uC544\uC8FC \uC798 \uC5B4\uC6B8\uB824\uC694. \uAD81\uAE08\uD55C \uC810\uC774 \uC788\uB098\uC694?",target:"How much is it?",accepts:["How much is it?","How much does it cost?","What's the price?"],keywords:["how","much"],hintKo:"How much\uB97C \uC0AC\uC6A9\uD574 \uAC00\uACA9\uC744 \uBB3C\uC5B4\uBD10\uC694.",correctionKo:"\uAC00\uACA9\uC744 \uBB3C\uC744 \uB54C\uB294 is\uB97C \uB123\uC5B4 How much is it?\uC774\uB77C\uACE0 \uD574\uC694.",success:"It's twelve dollars.",successKo:"12\uB2EC\uB7EC\uC608\uC694."}]}},{id:"transit",titleKo:"\uAD50\uD1B5\uC5ED",titleEn:"Transit Station",icon:"\u{1F689}",color:"#4FC3A1",descriptionKo:"\uBAA9\uC801\uC9C0\uAE4C\uC9C0 \uAC00\uB294 \uD45C\uB97C \uC0AC\uACE0 \uC2B9\uAC15\uC7A5\uACFC \uAE38\uC744 \uBB3C\uC5B4\uBD10\uC694.",npc:{name:"Mr. James",role:"\uC5ED\uBB34\uC6D0",model:"assets/english-travel-3d/models/characters/character-male-b.glb",voice:"en-US",position:[1,15]},mission:{id:"transit-city-trip",titleKo:"\uB3C4\uC2DC\uB97C \uAC00\uB85C\uC9C8\uB7EC",goalKo:"\uC655\uBCF5 \uD45C\uB97C \uC0AC\uACE0 \uC2B9\uAC15\uC7A5\uACFC \uBC15\uBB3C\uAD00\uAE4C\uC9C0 \uAC00\uB294 \uAE38\uC744 \uBB3C\uC5B4\uBD10\uC694.",reward:{xp:120,coins:50,need:"confidence"},turns:[{id:"transit-ticket",npc:"Hello. Where would you like to go?",npcKo:"\uC548\uB155\uD558\uC138\uC694. \uC5B4\uB514\uB85C \uAC00\uACE0 \uC2F6\uB098\uC694?",target:"One ticket to City Museum, please.",accepts:["One ticket to City Museum, please.","I'd like one ticket to City Museum.","A ticket to City Museum, please."],keywords:["ticket","museum"],hintKo:"one ticket to\uC640 \uBAA9\uC801\uC9C0\uB97C \uD568\uAED8 \uB9D0\uD574\uC694.",correctionKo:"\uBAA9\uC801\uC9C0\uB85C \uAC00\uB294 \uD45C\uB294 a ticket to City Museum\uC774\uB77C\uACE0 \uB9D0\uD574\uC694.",success:"Certainly. One ticket to City Museum.",successKo:"\uB124. \uC2DC\uB9BD \uBC15\uBB3C\uAD00\uD589 \uD45C \uD55C \uC7A5\uC774\uC5D0\uC694."},{id:"transit-round-trip",npc:"Would you like a one-way ticket or a round-trip ticket?",npcKo:"\uD3B8\uB3C4 \uD45C\uC640 \uC655\uBCF5 \uD45C \uC911 \uC5B4\uB5A4 \uAC83\uC744 \uC6D0\uD558\uB098\uC694?",target:"A round-trip ticket, please.",accepts:["A round-trip ticket, please.","Round trip, please.","I'd like a round-trip ticket."],keywords:["round","trip"],hintKo:"\uC655\uBCF5\uC740 round trip\uC774\uB77C\uACE0 \uD574\uC694.",correctionKo:"\uC655\uBCF5 \uD45C\uB294 a round-trip ticket\uC774\uB77C\uACE0 \uB9D0\uD574\uC694.",success:"All right. You can use this ticket to come back too.",successKo:"\uC88B\uC544\uC694. \uC774 \uD45C\uB85C \uB3CC\uC544\uC62C \uB54C\uB3C4 \uC774\uC6A9\uD560 \uC218 \uC788\uC5B4\uC694."},{id:"transit-platform",npc:"Your train leaves at ten thirty. Do you have another question?",npcKo:"\uAE30\uCC28\uB294 10\uC2DC 30\uBD84\uC5D0 \uCD9C\uBC1C\uD574\uC694. \uB2E4\uB978 \uC9C8\uBB38\uC774 \uC788\uB098\uC694?",target:"Which platform is it?",accepts:["Which platform is it?","What platform is it?","Which platform does it leave from?"],keywords:["platform"],hintKo:"Which platform\uC73C\uB85C \uC2B9\uAC15\uC7A5 \uBC88\uD638\uB97C \uBB3C\uC5B4\uBD10\uC694.",correctionKo:"\uC2B9\uAC15\uC7A5\uC744 \uBB3C\uC744 \uB54C\uB294 Which platform is it?\uC774\uB77C\uACE0 \uD574\uC694.",success:"Platform three, just past the stairs.",successKo:"3\uBC88 \uC2B9\uAC15\uC7A5\uC774\uC5D0\uC694. \uACC4\uB2E8\uC744 \uC9C0\uB098\uBA74 \uC788\uC5B4\uC694."},{id:"transit-directions",npc:"You look a little lost. Can I help?",npcKo:"\uAE38\uC744 \uCC3E\uACE0 \uC788\uB294 \uAC83 \uAC19\uB124\uC694. \uB3C4\uC640\uB4DC\uB9B4\uAE4C\uC694?",target:"Excuse me, how do I get to the museum?",accepts:["Excuse me, how do I get to the museum?","How can I get to the museum?","Could you tell me the way to the museum?"],keywords:["get","museum"],hintKo:"How do I get to\uC640 \uBAA9\uC801\uC9C0\uB97C \uC0AC\uC6A9\uD574 \uAE38\uC744 \uBB3C\uC5B4\uC694.",correctionKo:"\uBAA9\uC801\uC9C0\uAE4C\uC9C0 \uAC00\uB294 \uAE38\uC740 How do I get to the museum?\uC774\uB77C\uACE0 \uBB3C\uC5B4\uC694.",success:"Go straight and turn right at the bank.",successKo:"\uACE7\uC7A5 \uAC00\uB2E4\uAC00 \uC740\uD589\uC5D0\uC11C \uC624\uB978\uCABD\uC73C\uB85C \uB3C4\uC138\uC694."}]}},{id:"museum",titleKo:"\uBC15\uBB3C\uAD00",titleEn:"Museum",icon:"\u{1F3DB}\uFE0F",color:"#B38B62",descriptionKo:"\uC785\uC7A5\uAD8C\uACFC \uAD00\uB78C \uC2DC\uAC04\uC744 \uBB3B\uACE0 \uC0AC\uC9C4 \uADDC\uCE59\uACFC \uC88B\uC544\uD558\uB294 \uC804\uC2DC\uB97C \uC774\uC57C\uAE30\uD574\uC694.",npc:{name:"Guide Grace",role:"\uBC15\uBB3C\uAD00 \uC548\uB0B4\uC6D0",model:"assets/english-travel-3d/models/characters/character-female-e.glb",voice:"en-US",position:[-14,10]},mission:{id:"museum-discovery",titleKo:"\uACF5\uB8E1 \uC804\uC2DC\uC758 \uBE44\uBC00",goalKo:"\uC785\uC7A5\uAD8C\uC744 \uC0AC\uACE0 \uAD00\uB78C \uADDC\uCE59\uC744 \uD655\uC778\uD55C \uB4A4 \uC88B\uC544\uD558\uB294 \uC804\uC2DC\uB97C \uC124\uBA85\uD574\uC694.",reward:{xp:120,coins:50,need:"fun"},turns:[{id:"museum-tickets",npc:"Welcome to City Museum. How many tickets do you need?",npcKo:"\uC2DC\uB9BD \uBC15\uBB3C\uAD00\uC5D0 \uC624\uC2E0 \uAC83\uC744 \uD658\uC601\uD574\uC694. \uD45C\uAC00 \uBA87 \uC7A5 \uD544\uC694\uD55C\uAC00\uC694?",target:"Two child tickets, please.",accepts:["Two child tickets, please.","I'd like two child tickets.","Two tickets for children, please."],keywords:["two","tickets","child"],hintKo:"\uC22B\uC790\uC640 child tickets\uB97C \uD568\uAED8 \uB9D0\uD574\uC694.",correctionKo:"\uD45C\uAC00 \uB450 \uC7A5\uC774\uBBC0\uB85C ticket \uB4A4\uC5D0 s\uB97C \uBD99\uC5EC two child tickets\uB77C\uACE0 \uD574\uC694.",success:"Here are your two tickets.",successKo:"\uC5EC\uAE30 \uD45C \uB450 \uC7A5\uC774 \uC788\uC5B4\uC694."},{id:"museum-closing",npc:"Do you have a question before you go in?",npcKo:"\uB4E4\uC5B4\uAC00\uAE30 \uC804\uC5D0 \uAD81\uAE08\uD55C \uC810\uC774 \uC788\uB098\uC694?",target:"What time does the museum close?",accepts:["What time does the museum close?","What time does it close?","When does the museum close?"],keywords:["time","close"],hintKo:"What time does\uC640 close\uB97C \uC0AC\uC6A9\uD574\uC694.",correctionKo:"\uC9C8\uBB38\uC5D0\uC11C\uB294 does\uAC00 \uC55E\uC73C\uB85C \uC624\uACE0 \uB3D9\uC0AC\uB294 \uC6D0\uB798 \uBAA8\uC591 close\uB97C \uC368\uC694.",success:"It closes at five o'clock.",successKo:"\uC624\uD6C4 5\uC2DC\uC5D0 \uBB38\uC744 \uB2EB\uC544\uC694."},{id:"museum-photos",npc:"Please enjoy the exhibits. Anything you'd like to ask?",npcKo:"\uC804\uC2DC\uB97C \uC990\uACA8 \uC8FC\uC138\uC694. \uBB3C\uC5B4\uBCFC \uAC83\uC774 \uC788\uB098\uC694?",target:"Can I take pictures?",accepts:["Can I take pictures?","May I take pictures?","Is it okay to take pictures?"],keywords:["take","pictures"],hintKo:"Can I\uB85C \uC0AC\uC9C4 \uCD2C\uC601\uC774 \uAC00\uB2A5\uD55C\uC9C0 \uBB3C\uC5B4\uBD10\uC694.",correctionKo:"\uC0AC\uC9C4\uC744 \uCC0D\uB2E4\uB294 take pictures \uB610\uB294 take a picture\uB77C\uACE0 \uD574\uC694.",success:"Yes, but please don't use the flash.",successKo:"\uB124, \uD558\uC9C0\uB9CC \uD50C\uB798\uC2DC\uB294 \uC0AC\uC6A9\uD558\uC9C0 \uB9C8\uC138\uC694."},{id:"museum-favorite",npc:"Which exhibit do you like best?",npcKo:"\uC5B4\uB5A4 \uC804\uC2DC\uAC00 \uAC00\uC7A5 \uB9C8\uC74C\uC5D0 \uB4DC\uB098\uC694?",target:"I like the dinosaur because it's exciting.",accepts:["I like the dinosaur because it's exciting.","The dinosaur is my favorite because it's exciting.","I like the dinosaur. It's exciting."],keywords:["dinosaur","exciting"],hintKo:"\uC88B\uC544\uD558\uB294 \uB300\uC0C1\uACFC because\uB97C \uC0AC\uC6A9\uD574 \uC774\uC720\uB97C \uB9D0\uD574\uC694.",correctionKo:"because \uB4A4\uC5D0 \uC8FC\uC5B4\uC640 \uB3D9\uC0AC\uB97C \uB123\uC5B4 because it's exciting\uC774\uB77C\uACE0 \uD574\uC694.",success:"Me too! The dinosaur is amazing.",successKo:"\uC800\uB3C4 \uADF8\uB798\uC694! \uACF5\uB8E1\uC740 \uC815\uB9D0 \uB180\uB78D\uC8E0."}]}},{id:"park",titleKo:"\uACF5\uC6D0 \uCD95\uC81C",titleEn:"Park Festival",icon:"\u{1F3A1}",color:"#67C96B",descriptionKo:"\uD604\uC9C0 \uCE5C\uAD6C\uC640 \uC778\uC0AC\uD558\uACE0 \uCD9C\uC2E0\uC744 \uB9D0\uD558\uBA70 \uB180\uC774\uC640 \uC0AC\uC9C4\uC744 \uBD80\uD0C1\uD574\uC694.",npc:{name:"Noah",role:"\uACF5\uC6D0\uC5D0\uC11C \uB9CC\uB09C \uCE5C\uAD6C",model:"assets/english-travel-3d/models/characters/character-male-a.glb",voice:"en-US",position:[-15,-16]},mission:{id:"park-new-friend",titleKo:"\uCD95\uC81C\uC5D0\uC11C \uB9CC\uB09C \uC0C8 \uCE5C\uAD6C",goalKo:"\uC0C8 \uCE5C\uAD6C\uC640 \uC778\uC0AC\uD558\uACE0 \uD568\uAED8 \uB180\uAE30\uB85C \uD55C \uB4A4 \uC0AC\uC9C4\uC744 \uBD80\uD0C1\uD574\uC694.",reward:{xp:130,coins:55,need:"social"},turns:[{id:"park-greeting",npc:"Hi, I'm Noah. It's nice to meet you!",npcKo:"\uC548\uB155, \uB098\uB294 \uB178\uC544\uC57C. \uB9CC\uB098\uC11C \uBC18\uAC00\uC6CC!",target:"Nice to meet you, too.",accepts:["Nice to meet you, too.","It's nice to meet you, too.","Nice to meet you."],keywords:["nice","meet","you"],hintKo:"\uC0C1\uB300\uBC29\uC758 \uC778\uC0AC\uC5D0 Nice to meet you, too.\uB77C\uACE0 \uB2F5\uD574\uC694.",correctionKo:"\uC0C1\uB300\uBC29\uB3C4 \uB9CC\uB098\uC11C \uBC18\uAC11\uB2E4\uACE0 \uB2F5\uD560 \uB54C \uBB38\uC7A5 \uB05D\uC5D0 too\uB97C \uBD99\uC77C \uC218 \uC788\uC5B4\uC694.",success:"I'm glad you're here at the festival.",successKo:"\uCD95\uC81C\uC5D0 \uC640\uC11C \uC815\uB9D0 \uBC18\uAC00\uC6CC."},{id:"park-country",npc:"Where are you from?",npcKo:"\uC5B4\uB290 \uB098\uB77C\uC5D0\uC11C \uC654\uC5B4?",target:"I'm from Korea.",accepts:["I'm from Korea.","I am from Korea.","Korea. I'm from Korea."],keywords:["from","korea"],hintKo:"I'm from\uACFC \uB098\uB77C \uC774\uB984\uC744 \uC0AC\uC6A9\uD574\uC694.",correctionKo:"\uCD9C\uC2E0\uC9C0\uB97C \uB9D0\uD560 \uB54C\uB294 be\uB3D9\uC0AC\uB97C \uB123\uC5B4 I'm from Korea.\uB77C\uACE0 \uD574\uC694.",success:"That's wonderful. Welcome to our city!",successKo:"\uBA4B\uC9C0\uB2E4. \uC6B0\uB9AC \uB3C4\uC2DC\uC5D0 \uC628 \uAC78 \uD658\uC601\uD574!"},{id:"park-invitation",npc:"Would you like to play badminton with me?",npcKo:"\uB098\uC640 \uBC30\uB4DC\uBBFC\uD134\uC744 \uCE60\uB798?",target:"Yes, I'd love to.",accepts:["Yes, I'd love to.","Yes, I'd like to.","Sure, that sounds fun."],keywords:["yes","love"],hintKo:"\uCD08\uB300\uB97C \uAE30\uC058\uAC8C \uBC1B\uC544\uB4E4\uC774\uB294 I'd love to\uB97C \uC0AC\uC6A9\uD574\uC694.",correctionKo:"\uCD08\uB300\uB97C \uBC1B\uC544\uB4E4\uC77C \uB54C\uB294 Yes, I'd love to.\uB77C\uACE0 \uD558\uBA74 \uC790\uC5F0\uC2A4\uB7EC\uC6CC\uC694.",success:"Great! Let's play after we see the fountain.",successKo:"\uC88B\uC544! \uBD84\uC218\uB97C \uBCF8 \uB4A4\uC5D0 \uAC19\uC774 \uB180\uC790."},{id:"park-photo",npc:"This fountain is a great photo spot.",npcKo:"\uC774 \uBD84\uC218\uB294 \uC0AC\uC9C4 \uCC0D\uAE30 \uC815\uB9D0 \uC88B\uC740 \uACF3\uC774\uC57C.",target:"Could you take a picture of me, please?",accepts:["Could you take a picture of me, please?","Can you take my picture, please?","Would you take a photo of me, please?"],keywords:["picture","me","take"],hintKo:"Could you\uC640 please\uB97C \uC0AC\uC6A9\uD574 \uC0AC\uC9C4\uC744 \uBD80\uD0C1\uD574\uC694.",correctionKo:"\uB0B4 \uC0AC\uC9C4\uC744 \uCC0D\uC5B4 \uB2EC\uB77C\uB294 \uB9D0\uC740 take a picture of me\uB77C\uACE0 \uD574\uC694.",success:"Of course! Stand by the fountain and smile.",successKo:"\uBB3C\uB860\uC774\uC9C0! \uBD84\uC218 \uC606\uC5D0 \uC11C\uC11C \uC6C3\uC5B4 \uBD10."}]}},{id:"help",titleKo:"\uAC74\uAC15\xB7\uB3C4\uC6C0 \uC13C\uD130",titleEn:"Health & Help Center",icon:"\u{1FA7A}",color:"#F06D91",descriptionKo:"\uC544\uD508 \uACF3\uC744 \uC124\uBA85\uD558\uACE0 \uC57D \uBA39\uB294 \uBC29\uBC95\uC744 \uD655\uC778\uD558\uBA70 \uAE38\uC744 \uC783\uC5C8\uC744 \uB54C \uB3C4\uC6C0\uC744 \uCCAD\uD574\uC694.",npc:{name:"Nurse Lily",role:"\uAC04\uD638\uC0AC \uACB8 \uC5EC\uD589\uC790 \uB3C4\uC6C0 \uC9C1\uC6D0",model:"assets/english-travel-3d/models/characters/character-female-f.glb",voice:"en-US",position:[15,-16]},mission:{id:"help-health-safety",titleKo:"\uC544\uD50C \uB54C\uC640 \uAE38\uC744 \uC783\uC5C8\uC744 \uB54C",goalKo:"\uC99D\uC0C1\uACFC \uC5F4\uC774 \uC788\uB294\uC9C0 \uB9D0\uD558\uACE0 \uBCF5\uC57D \uBC29\uBC95\uACFC \uC548\uC804\uD55C \uB3C4\uC6C0 \uC694\uCCAD\uC744 \uC5F0\uC2B5\uD574\uC694.",reward:{xp:140,coins:60,need:"health"},turns:[{id:"help-symptom",npc:"Hello. What's wrong?",npcKo:"\uC548\uB155\uD558\uC138\uC694. \uC5B4\uB514\uAC00 \uC544\uD508\uAC00\uC694?",target:"I have a stomachache.",accepts:["I have a stomachache.","My stomach hurts.","I have a bad stomachache."],keywords:["stomach","stomachache","hurts"],hintKo:"I have\uC640 \uC544\uD508 \uC99D\uC0C1\uC744 \uD568\uAED8 \uB9D0\uD574\uC694.",correctionKo:"\uC544\uD508 \uC99D\uC0C1\uC740 I am\uC774 \uC544\uB2C8\uB77C I have a stomachache.\uB77C\uACE0 \uB9D0\uD574\uC694.",success:"I'm sorry to hear that. Let me check you.",successKo:"\uB9CE\uC774 \uBD88\uD3B8\uD588\uACA0\uB124\uC694. \uC0C1\uD0DC\uB97C \uD655\uC778\uD560\uAC8C\uC694."},{id:"help-fever",npc:"Do you have a fever?",npcKo:"\uC5F4\uB3C4 \uC788\uB098\uC694?",target:"No, I don't have a fever.",accepts:["No, I don't have a fever.","No, I don't.","No, I have no fever."],keywords:["no","fever"],hintKo:"No\uB85C \uB2F5\uD558\uACE0 don't have\uB97C \uC0AC\uC6A9\uD574\uC694.",correctionKo:"\uC5F4\uC774 \uC5C6\uB2E4\uB294 \uB9D0\uC740 I don't have a fever.\uB77C\uACE0 \uD574\uC694.",success:"That's good. Please drink water and get some rest.",successKo:"\uB2E4\uD589\uC774\uC5D0\uC694. \uBB3C\uC744 \uB9C8\uC2DC\uACE0 \uD479 \uC26C\uC138\uC694."},{id:"help-medicine",npc:"Take this medicine after meals. Do you have a question?",npcKo:"\uC774 \uC57D\uC744 \uC2DD\uD6C4\uC5D0 \uB4DC\uC138\uC694. \uAD81\uAE08\uD55C \uC810\uC774 \uC788\uB098\uC694?",target:"How often should I take it?",accepts:["How often should I take it?","How many times a day should I take it?","When should I take the medicine?"],keywords:["take","often"],hintKo:"How often\uC73C\uB85C \uD558\uB8E8\uC5D0 \uBA87 \uBC88\uC778\uC9C0 \uBB3C\uC5B4\uBD10\uC694.",correctionKo:"\uD69F\uC218\uB97C \uBB3C\uC744 \uB54C\uB294 How often should I take it?\uC774\uB77C\uACE0 \uD574\uC694.",success:"Take it twice a day after meals.",successKo:"\uD558\uB8E8 \uB450 \uBC88, \uC2DD\uD6C4\uC5D0 \uB4DC\uC138\uC694."},{id:"help-lost",npc:"You are safe here. How can I help you?",npcKo:"\uC5EC\uAE30\uB294 \uC548\uC804\uD574\uC694. \uBB34\uC5C7\uC744 \uB3C4\uC640\uB4DC\uB9B4\uAE4C\uC694?",target:"I'm lost. I need help getting to the Sunrise Hotel.",accepts:["I'm lost. I need help getting to the Sunrise Hotel.","I can't find my way to the Sunrise Hotel.","Can you help me get to the Sunrise Hotel? I'm lost."],keywords:["lost","help","hotel"],hintKo:"I'm lost\uC640 I need help\uB97C \uC0AC\uC6A9\uD574 \uC548\uC804\uD558\uAC8C \uB3C4\uC6C0\uC744 \uC694\uCCAD\uD574\uC694.",correctionKo:"\uAE38\uC744 \uC783\uC740 \uC0C1\uD0DC\uB294 lose\uAC00 \uC544\uB2C8\uB77C lost\uB97C \uC368\uC11C I'm lost.\uB77C\uACE0 \uD574\uC694.",success:"I'll call the hotel. Please wait here with me.",successKo:"\uD638\uD154\uC5D0 \uC5F0\uB77D\uD560\uAC8C\uC694. \uC774\uACF3\uC5D0\uC11C \uC800\uC640 \uD568\uAED8 \uAE30\uB2E4\uB824\uC694."}]}}]};var Xh={missions:[{id:"journey-01",type:"main",locationId:"airport",timeKo:"\uC5EC\uD589 1\uC77C\uCC28 \xB7 \uCD9C\uAD6D \uC624\uC804 6:30",titleKo:"\uBBF8\uC158 1 \xB7 \uD56D\uACF5\uC0AC \uCCB4\uD06C\uC778\uC744 \uC644\uB8CC\uD558\uB77C!",briefingKo:"\uB4DC\uB514\uC5B4 \uC5EC\uD589\uC774 \uC2DC\uC791\uB410\uC5B4\uC694. \uD56D\uACF5\uC0AC \uC9C1\uC6D0\uC5D0\uAC8C \uC368\uB2C8 \uC2DC\uD2F0\uB85C \uAC04\uB2E4\uACE0 \uB9D0\uD558\uACE0, \uBD80\uCE60 \uC9D0\uC774 1\uAC1C\uB77C\uACE0 \uC54C\uB824 \uC900 \uB4A4 \uD0D1\uC2B9\uAD8C\uC744 \uBC1B\uC73C\uC138\uC694.",openingEn:"Good morning. Where are you flying today, and how many bags would you like to check?",openingKo:"\uC88B\uC740 \uC544\uCE68\uC785\uB2C8\uB2E4. \uC624\uB298 \uC5B4\uB514\uB85C \uAC00\uC2DC\uBA70, \uBD80\uCE60 \uC9D0\uC740 \uBA87 \uAC1C\uC778\uAC00\uC694?",npcOverride:{name:"Ava",roleKo:"\uD56D\uACF5\uC0AC \uCCB4\uD06C\uC778 \uC9C1\uC6D0",icon:"\u{1F9F3}"},goals:[{id:"destination_city",labelKo:"\uC368\uB2C8 \uC2DC\uD2F0\uAC00 \uBAA9\uC801\uC9C0\uB77C\uACE0 \uB9D0\uD558\uAE30",descriptionEn:"Clearly state that Sunny City is the flight destination.",hintKo:"\uBAA9\uC801\uC9C0: \uC368\uB2C8 \uC2DC\uD2F0"},{id:"baggage_count",labelKo:"\uBD80\uCE60 \uC9D0\uC774 1\uAC1C\uB77C\uACE0 \uB9D0\uD558\uAE30",descriptionEn:"State that there is exactly one bag or suitcase to check.",hintKo:"\uBD80\uCE60 \uC9D0: \uC5EC\uD589\uAC00\uBC29 1\uAC1C"},{id:"boarding_pass",labelKo:"\uD0D1\uC2B9\uAD8C\uC744 \uC694\uCCAD\uD558\uAC70\uB098 \uBC1B\uAE30",descriptionEn:"Ask for the boarding pass or clearly acknowledge receiving it.",hintKo:"\uD544\uC694\uD55C \uAC83: \uD0D1\uC2B9\uAD8C"}],hints:["I'm flying to Sunny City today.","I have one suitcase to check.","Could I have my boarding pass, please?"],reward:{xp:110,coins:65}},{id:"journey-02",type:"main",locationId:"airport",timeKo:"\uC5EC\uD589 1\uC77C\uCC28 \xB7 \uCD9C\uAD6D \uC624\uC804 7:20",titleKo:"\uBBF8\uC158 2 \xB7 \uCD9C\uAD6D \uBCF4\uC548\xB7\uC2EC\uC0AC\uB97C \uD1B5\uACFC\uD558\uB77C!",briefingKo:"\uBCF4\uC548 \uAC80\uC0C9\uACFC \uCD9C\uAD6D \uC2EC\uC0AC \uCC28\uB840\uC608\uC694. \uC5EC\uAD8C\uACFC \uD0D1\uC2B9\uAD8C\uC744 \uBCF4\uC5EC \uC8FC\uACE0, \uB178\uD2B8\uBD81\uACFC \uC804\uC790\uAE30\uAE30\uB97C \uAC00\uBC29\uC5D0\uC11C \uAEBC\uB0C8\uB2E4\uACE0 \uC54C\uB824 \uC8FC\uC138\uC694.",openingEn:"Please have your passport and boarding pass ready. Have you taken your laptop and electronics out of your bag?",openingKo:"\uC5EC\uAD8C\uACFC \uD0D1\uC2B9\uAD8C\uC744 \uC900\uBE44\uD574 \uC8FC\uC138\uC694. \uB178\uD2B8\uBD81\uACFC \uC804\uC790\uAE30\uAE30\uB97C \uAC00\uBC29\uC5D0\uC11C \uAEBC\uB0B4\uC168\uB098\uC694?",npcOverride:{name:"Officer Daniel",roleKo:"\uCD9C\uAD6D \uBCF4\uC548\xB7\uC2EC\uC0AC \uC9C1\uC6D0",icon:"\u{1F6C2}"},goals:[{id:"passport",labelKo:"\uC5EC\uAD8C \uBCF4\uC5EC \uC8FC\uAE30",descriptionEn:"Offer or show the passport when the officer asks for it.",hintKo:"\uBCF4\uC5EC \uC904 \uAC83: \uC5EC\uAD8C"},{id:"boarding_pass",labelKo:"\uD0D1\uC2B9\uAD8C \uBCF4\uC5EC \uC8FC\uAE30",descriptionEn:"Offer or show the boarding pass to the officer.",hintKo:"\uBCF4\uC5EC \uC904 \uAC83: \uD0D1\uC2B9\uAD8C"},{id:"electronics_out",labelKo:"\uC804\uC790\uAE30\uAE30\uB97C \uAEBC\uB0C8\uB2E4\uACE0 \uB9D0\uD558\uAE30",descriptionEn:"Confirm that the laptop or other electronics have been removed from the bag for screening.",hintKo:"\uC804\uC790\uAE30\uAE30: \uAC00\uBC29\uC5D0\uC11C \uAEBC\uB0C4"}],hints:["Here are my passport and boarding pass.","Yes, I took my laptop out of my bag."],reward:{xp:120,coins:70}},{id:"journey-03",type:"main",locationId:"airport",timeKo:"\uC5EC\uD589 1\uC77C\uCC28 \xB7 \uCD9C\uAD6D \uC624\uC804 8:40",titleKo:"\uBBF8\uC158 3 \xB7 \uBE44\uD589\uAE30\uC5D0 \uD0C0\uC11C \uC88C\uC11D\uC744 \uCC3E\uC544\uB77C!",briefingKo:"\uD0D1\uC2B9\uC774 \uC2DC\uC791\uB410\uC5B4\uC694. \uC2B9\uBB34\uC6D0\uC5D0\uAC8C \uD0D1\uC2B9\uAD8C\uC744 \uBCF4\uC5EC \uC8FC\uACE0, 18A \uC88C\uC11D\uC774 \uC5B4\uB514\uC778\uC9C0 \uBB3C\uC5B4\uBCF4\uC138\uC694.",openingEn:"Welcome aboard. May I see your boarding pass? Do you need help finding your seat?",openingKo:"\uD0D1\uC2B9\uC744 \uD658\uC601\uD569\uB2C8\uB2E4. \uD0D1\uC2B9\uAD8C\uC744 \uBCF4\uC5EC \uC8FC\uC2DC\uACA0\uC5B4\uC694? \uC88C\uC11D\uC744 \uCC3E\uB294 \uB370 \uB3C4\uC6C0\uC774 \uD544\uC694\uD558\uC2E0\uAC00\uC694?",npcOverride:{name:"Flight Attendant Ava",roleKo:"\uD0D1\uC2B9 \uC548\uB0B4 \uC2B9\uBB34\uC6D0",icon:"\u{1F6EB}"},goals:[{id:"boarding_pass",labelKo:"\uD0D1\uC2B9\uAD8C \uBCF4\uC5EC \uC8FC\uAE30",descriptionEn:"Show or offer the boarding pass while boarding the aircraft.",hintKo:"\uBCF4\uC5EC \uC904 \uAC83: \uD0D1\uC2B9\uAD8C"},{id:"seat_number",labelKo:"18A \uC88C\uC11D \uC704\uCE58 \uBB3B\uAE30",descriptionEn:"Ask where seat 18A is or ask for help finding that seat.",hintKo:"\uC88C\uC11D: 18A"}],hints:["Here is my boarding pass.","Where is seat 18A?"],reward:{xp:125,coins:75}},{id:"journey-04",type:"main",locationId:"airport",timeKo:"\uC5EC\uD589 1\uC77C\uCC28 \xB7 \uBE44\uD589 \uC911 \uC624\uC804 11:30",titleKo:"\uBBF8\uC158 4 \xB7 \uAE30\uB0B4\uC2DD\uACFC \uC74C\uB8CC\uB97C \uBD80\uD0C1\uD558\uB77C!",briefingKo:"\uBE44\uD589\uAE30\uAC00 \uC21C\uD56D \uC911\uC774\uACE0 \uAE30\uB0B4\uC2DD \uC2DC\uAC04\uC774 \uB410\uC5B4\uC694. \uCE58\uD0A8\uACFC \uD30C\uC2A4\uD0C0 \uC911 \uBA39\uACE0 \uC2F6\uC740 \uC2DD\uC0AC\uB97C \uACE0\uB974\uACE0, \uB9C8\uC2E4 \uC74C\uB8CC\uB3C4 \uC694\uCCAD\uD558\uC138\uC694. please\uB97C \uBD99\uC774\uBA74 \uB354 \uBA4B\uC838\uC694!",openingEn:"For lunch, would you like chicken or pasta? And what would you like to drink?",openingKo:"\uC810\uC2EC\uC73C\uB85C \uCE58\uD0A8\uACFC \uD30C\uC2A4\uD0C0 \uC911 \uBB34\uC5C7\uC744 \uB4DC\uC2DC\uACA0\uC5B4\uC694? \uC74C\uB8CC\uB294 \uBB34\uC5C7\uC73C\uB85C \uB4DC\uB9B4\uAE4C\uC694?",npcOverride:{name:"Flight Attendant Ava",roleKo:"\uAE30\uB0B4 \uC11C\uBE44\uC2A4 \uC2B9\uBB34\uC6D0",icon:"\u{1F964}"},goals:[{id:"meal_choice",labelKo:"\uAE30\uB0B4\uC2DD \uBA54\uB274 \uACE0\uB974\uAE30",descriptionEn:"Choose either chicken or pasta, or another meal option offered by the attendant.",hintKo:"\uAE30\uB0B4\uC2DD: \uCE58\uD0A8"},{id:"drink_request",labelKo:"\uB9C8\uC2E4 \uC74C\uB8CC \uC694\uCCAD\uD558\uAE30",descriptionEn:"Ask for a specific drink such as water, juice, coffee, or tea.",hintKo:"\uC74C\uB8CC: \uC624\uB80C\uC9C0\uC8FC\uC2A4"}],hints:["I'd like the chicken, please.","Could I have some orange juice?"],reward:{xp:130,coins:80}},{id:"journey-05",type:"main",locationId:"airport",timeKo:"\uD604\uC9C0 1\uC77C\uCC28 \xB7 \uB3C4\uCC29 \uC624\uD6C4 3:10",titleKo:"\uBBF8\uC158 5 \xB7 \uB3C4\uCC29\uC9C0 \uC785\uAD6D\uC2EC\uC0AC\uB97C \uD1B5\uACFC\uD558\uB77C!",briefingKo:"\uC368\uB2C8 \uC2DC\uD2F0\uC5D0 \uB3C4\uCC29\uD588\uC5B4\uC694. \uC2EC\uC0AC\uAD00\uC5D0\uAC8C \uC5EC\uAD8C\uC744 \uBCF4\uC5EC \uC8FC\uACE0, \uD734\uAC00 \uC5EC\uD589\uC774\uBA70 4\uC77C \uB3D9\uC548 \uBA38\uBB38\uB2E4\uACE0 \uC124\uBA85\uD558\uC138\uC694.",openingEn:"Welcome to Sunny City. May I see your passport? What is the purpose of your visit, and how long will you stay?",openingKo:"\uC368\uB2C8 \uC2DC\uD2F0\uC5D0 \uC624\uC2E0 \uAC83\uC744 \uD658\uC601\uD569\uB2C8\uB2E4. \uC5EC\uAD8C\uC744 \uBCF4\uC5EC \uC8FC\uC2DC\uACA0\uC5B4\uC694? \uBC29\uBB38 \uBAA9\uC801\uACFC \uCCB4\uB958 \uAE30\uAC04\uC740 \uC5B4\uB5BB\uAC8C \uB418\uB098\uC694?",goals:[{id:"passport",labelKo:"\uC5EC\uAD8C \uBCF4\uC5EC \uC8FC\uAE30",descriptionEn:"Acknowledge the request and hand over or offer the passport.",hintKo:"\uBCF4\uC5EC \uC904 \uAC83: \uC5EC\uAD8C"},{id:"purpose",labelKo:"\uD734\uAC00 \uC5EC\uD589\uC774\uB77C\uACE0 \uB9D0\uD558\uAE30",descriptionEn:"State any plausible reason for visiting, such as vacation, sightseeing, visiting family, study, or work.",hintKo:"\uBC29\uBB38 \uBAA9\uC801: \uD734\uAC00"},{id:"duration",labelKo:"4\uC77C \uB3D9\uC548 \uBA38\uBB38\uB2E4\uACE0 \uB9D0\uD558\uAE30",descriptionEn:"State an understandable length of stay, with four days matching the travel story.",hintKo:"\uCCB4\uB958 \uAE30\uAC04: 4\uC77C"}],hints:["Here is my passport.","I'm here on vacation.","I'll stay for four days."],reward:{xp:140,coins:85}},{id:"journey-06",type:"main",locationId:"airport",timeKo:"\uD604\uC9C0 1\uC77C\uCC28 \xB7 \uB3C4\uCC29 \uC624\uD6C4 3:40",titleKo:"\uBBF8\uC158 6 \xB7 \uC218\uD558\uBB3C \uCC3E\uB294 \uACF3\uC744 \uD655\uC778\uD558\uB77C!",briefingKo:"\uC785\uAD6D\uC2EC\uC0AC\uB97C \uB9C8\uCE58\uACE0 \uC218\uD558\uBB3C \uCC3E\uB294 \uACF3\uC5D0 \uC654\uC5B4\uC694. \uC9C1\uC6D0\uC5D0\uAC8C \uB0B4 \uD56D\uACF5\uD3B8\uC758 \uC218\uD558\uBB3C \uBCA8\uD2B8 \uBC88\uD638\uB97C \uBB3B\uACE0, \uAC80\uC740\uC0C9 \uD070 \uC5EC\uD589\uAC00\uBC29\uC5D0 \uBE68\uAC04 \uB9AC\uBCF8\uC774 \uC788\uB2E4\uACE0 \uC124\uBA85\uD558\uC138\uC694.",openingEn:"Hello. Which flight did you arrive on, and what does your suitcase look like?",openingKo:"\uC548\uB155\uD558\uC138\uC694. \uC5B4\uB290 \uD56D\uACF5\uD3B8\uC73C\uB85C \uB3C4\uCC29\uD558\uC168\uACE0, \uC5EC\uD589\uAC00\uBC29\uC740 \uC5B4\uB5BB\uAC8C \uC0DD\uACBC\uB098\uC694?",npcOverride:{name:"Maya",roleKo:"\uACF5\uD56D \uC218\uD558\uBB3C \uC548\uB0B4 \uC9C1\uC6D0",icon:"\u{1F9F3}"},goals:[{id:"baggage_carousel",labelKo:"\uC218\uD558\uBB3C \uBCA8\uD2B8 \uBC88\uD638 \uBB3B\uAE30",descriptionEn:"Ask which baggage carousel or belt is assigned to the arriving flight.",hintKo:"\uCC3E\uC744 \uACF3: SC218\uD3B8 \uC218\uD558\uBB3C \uBCA8\uD2B8"},{id:"bag_description",labelKo:"\uB0B4 \uC5EC\uD589\uAC00\uBC29 \uBAA8\uC2B5 \uC124\uBA85\uD558\uAE30",descriptionEn:"Describe the suitcase clearly, including useful details such as size, color, or a red ribbon.",hintKo:"\uC5EC\uD589\uAC00\uBC29: \uD070 \uAC80\uC740\uC0C9 \xB7 \uBE68\uAC04 \uB9AC\uBCF8"}],hints:["Which carousel is for flight SC218?","My bag is a large black suitcase with a red ribbon."],reward:{xp:120,coins:75}},{id:"journey-07",type:"main",locationId:"transit",timeKo:"\uD604\uC9C0 1\uC77C\uCC28 \xB7 \uC624\uD6C4 4:20",titleKo:"\uBBF8\uC158 7 \xB7 \uACF5\uD56D\uC5D0\uC11C \uD0DD\uC2DC\uB97C \uC7A1\uC544\uB77C!",briefingKo:"\uC9D0\uC744 \uCC3E\uACE0 \uACF5\uD56D \uBC16\uC73C\uB85C \uB098\uC654\uC5B4\uC694. \uD0DD\uC2DC \uAE30\uC0AC\uC5D0\uAC8C \uC9C0\uAE08 \uC774\uC6A9 \uAC00\uB2A5\uD55C\uC9C0 \uD655\uC778\uD558\uACE0, \uD0C8 \uC218 \uC788\uB294\uC9C0 \uC815\uC911\uD558\uAC8C \uBD80\uD0C1\uD558\uC138\uC694.",openingEn:"Hello there. Are you looking for a taxi?",openingKo:"\uC548\uB155\uD558\uC138\uC694. \uD0DD\uC2DC\uB97C \uCC3E\uACE0 \uACC4\uC2E0\uAC00\uC694?",npcOverride:{name:"Driver James",roleKo:"\uACF5\uD56D \uD0DD\uC2DC \uAE30\uC0AC",icon:"\u{1F695}"},goals:[{id:"taxi_available",labelKo:"\uC9C0\uAE08 \uC774\uC6A9 \uAC00\uB2A5\uD55C \uD0DD\uC2DC\uC778\uC9C0 \uBB3B\uAE30",descriptionEn:"Ask whether the taxi or driver is available for a ride now.",hintKo:"\uC774\uC6A9 \uC2DC\uAC04: \uC9C0\uAE08"},{id:"polite_request",labelKo:"\uC815\uC911\uD558\uAC8C \uD0DC\uC6CC \uB2EC\uB77C\uACE0 \uBD80\uD0C1\uD558\uAE30",descriptionEn:"Politely ask to take the taxi using please, could you, may I, or an equivalent expression.",hintKo:"\uC694\uCCAD: \uC815\uC911\uD558\uAC8C \uD0DC\uC6CC \uB2EC\uB77C"}],hints:["Are you available now?","Could you take me, please?"],reward:{xp:110,coins:65}},{id:"journey-08",type:"main",locationId:"transit",timeKo:"\uD604\uC9C0 1\uC77C\uCC28 \xB7 \uC624\uD6C4 4:25",titleKo:"\uBBF8\uC158 8 \xB7 \uD0DD\uC2DC \uAE30\uC0AC\uC5D0\uAC8C \uD638\uD154\uC744 \uC54C\uB824\uB77C!",briefingKo:"\uD0DD\uC2DC\uC5D0 \uD0D4\uC5B4\uC694. \uC368\uB2C8 \uAC00\uB4E0 \uD638\uD154\uB85C \uAC00 \uB2EC\uB77C\uACE0 \uB9D0\uD558\uACE0, \uC608\uC0C1 \uC694\uAE08\uC744 \uBB3C\uC5B4\uBCF8 \uB4A4 \uBB34\uAC70\uC6B4 \uC5EC\uD589\uAC00\uBC29\uC744 \uD2B8\uB801\uD06C\uC5D0 \uC2E4\uC5B4 \uB2EC\uB77C\uACE0 \uBD80\uD0C1\uD558\uC138\uC694.",openingEn:"Sure, I can take you. Where are you heading, and do you need help with your luggage?",openingKo:"\uB124, \uBAA8\uC154\uB2E4\uB4DC\uB9B4\uAC8C\uC694. \uC5B4\uB514\uB85C \uAC00\uC2DC\uBA70, \uC9D0\uC744 \uC2E3\uB294 \uB370 \uB3C4\uC6C0\uC774 \uD544\uC694\uD558\uC2E0\uAC00\uC694?",npcOverride:{name:"Driver James",roleKo:"\uACF5\uD56D \uD0DD\uC2DC \uAE30\uC0AC",icon:"\u{1F695}"},goals:[{id:"hotel_destination",labelKo:"\uC368\uB2C8 \uAC00\uB4E0 \uD638\uD154\uB85C \uAC00 \uB2EC\uB77C\uACE0 \uB9D0\uD558\uAE30",descriptionEn:"Tell the driver that the destination is the Sunny Garden Hotel or clearly name the hotel.",hintKo:"\uBAA9\uC801\uC9C0: \uC368\uB2C8 \uAC00\uB4E0 \uD638\uD154"},{id:"fare_question",labelKo:"\uC608\uC0C1 \uD0DD\uC2DC \uC694\uAE08 \uBB3B\uAE30",descriptionEn:"Ask how much the ride will cost or what the approximate fare is.",hintKo:"\uD655\uC778\uD560 \uAC83: \uC608\uC0C1 \uC694\uAE08"},{id:"luggage_help",labelKo:"\uC5EC\uD589\uAC00\uBC29 \uC2E3\uB294 \uAC83\uC744 \uBD80\uD0C1\uD558\uAE30",descriptionEn:"Ask the driver for help putting the suitcase or luggage into the trunk.",hintKo:"\uC5EC\uD589\uAC00\uBC29 \uC704\uCE58: \uD2B8\uB801\uD06C"}],hints:["Please take me to the Sunny Garden Hotel.","About how much will the fare be?","Could you help me put this suitcase in the trunk?"],reward:{xp:135,coins:80}},{id:"journey-09",type:"main",locationId:"hotel",timeKo:"\uD604\uC9C0 1\uC77C\uCC28 \xB7 \uC624\uD6C4 5:10",titleKo:"\uBBF8\uC158 9 \xB7 \uD638\uD154 \uCCB4\uD06C\uC778\uC744 \uC644\uB8CC\uD558\uB77C!",briefingKo:"\uD638\uD154 \uD504\uB7F0\uD2B8\uC5D0 \uB3C4\uCC29\uD588\uC5B4\uC694. \uC608\uC57D\uC790 \uC774\uB984\uC774 Jin Kim\uC774\uB77C\uACE0 \uB9D0\uD558\uACE0, 3\uBC15 \uC608\uC57D\uC744 \uD655\uC778\uD55C \uB4A4 \uC5EC\uAD8C\uC744 \uBCF4\uC5EC \uC8FC\uC138\uC694.",openingEn:"Welcome to the Sunny Garden Hotel. Do you have a reservation with us?",openingKo:"\uC368\uB2C8 \uAC00\uB4E0 \uD638\uD154\uC5D0 \uC624\uC2E0 \uAC83\uC744 \uD658\uC601\uD569\uB2C8\uB2E4. \uC608\uC57D\uD558\uC168\uB098\uC694?",goals:[{id:"reservation_name",labelKo:"\uC608\uC57D\uC790 \uC774\uB984 \uB9D0\uD558\uAE30",descriptionEn:"State the name on the hotel reservation, with Jin Kim matching the travel story.",hintKo:"\uC608\uC57D\uC790: \uC9C4 \uAE40"},{id:"duration",labelKo:"3\uBC15 \uC608\uC57D\uC774\uB77C\uACE0 \uB9D0\uD558\uAE30",descriptionEn:"State that the hotel stay is for three nights or give another clear booked duration.",hintKo:"\uC219\uBC15 \uAE30\uAC04: 3\uBC15"},{id:"passport",labelKo:"\uC2E0\uBD84 \uD655\uC778\uC6A9 \uC5EC\uAD8C \uBCF4\uC5EC \uC8FC\uAE30",descriptionEn:"Offer or show the passport when the front desk needs identification.",hintKo:"\uBCF4\uC5EC \uC904 \uAC83: \uC5EC\uAD8C"}],hints:["I have a reservation under Jin Kim.","I'm staying for three nights.","Here is my passport."],reward:{xp:140,coins:85}},{id:"journey-10",type:"main",locationId:"hotel",timeKo:"\uD604\uC9C0 1\uC77C\uCC28 \xB7 \uC624\uD6C4 6:00",titleKo:"\uBBF8\uC158 10 \xB7 \uAC1D\uC2E4\uB85C \uC218\uAC74 2\uC7A5\uC744 \uC694\uCCAD\uD558\uB77C!",briefingKo:"\uBC29\uC5D0 \uB4E4\uC5B4\uC654\uB294\uB370 \uC218\uAC74\uC774 \uBD80\uC871\uD574\uC694. \uAC1D\uC2E4 \uC804\uD654\uB85C \uD638\uD154 \uC548\uB0B4 \uC9C1\uC6D0\uC5D0\uAC8C \uC5F0\uACB0\uD55C \uB4A4, \uC218\uAC74 2\uC7A5\uC744 \uBC29\uC73C\uB85C \uAC00\uC838\uB2E4 \uB2EC\uB77C\uACE0 \uC815\uC911\uD558\uAC8C \uBD80\uD0C1\uD558\uC138\uC694.",openingEn:"Hotel information. How may I help you this evening?",openingKo:"\uD638\uD154 \uC778\uD3EC\uBA54\uC774\uC158\uC785\uB2C8\uB2E4. \uC624\uB298 \uC800\uB141 \uBB34\uC5C7\uC744 \uB3C4\uC640\uB4DC\uB9B4\uAE4C\uC694?",entryAction:{id:"hotel-phone",labelKo:"\u260E\uFE0F \uAC1D\uC2E4 \uC804\uD654\uAE30 \uB4E4\uAE30"},npcOverride:{name:"Hotel Information",roleKo:"\uD638\uD154 \uC804\uD654 \uC548\uB0B4 \uC9C1\uC6D0",icon:"\u260E\uFE0F"},goals:[{id:"towels",labelKo:"\uAC1D\uC2E4 \uC218\uAC74 \uC694\uCCAD\uD558\uAE30",descriptionEn:"Clearly ask the hotel to bring towels to the room.",hintKo:"\uD544\uC694\uD55C \uAC83: \uAC1D\uC2E4 \uC218\uAC74"},{id:"quantity_two",labelKo:"\uC218\uAC74 2\uC7A5\uC774\uB77C\uACE0 \uB9D0\uD558\uAE30",descriptionEn:"Clearly request exactly two towels.",hintKo:"\uC218\uB7C9: 2\uC7A5"},{id:"polite_request",labelKo:"\uC815\uC911\uD558\uAC8C \uBD80\uD0C1\uD558\uAE30",descriptionEn:"Use a polite request, for example could I, would you, please, or an equally polite form.",hintKo:"\uB9D0\uD22C: \uC815\uC911\uD558\uAC8C"}],hints:["Could I have two towels, please?","Would you bring them to my room?"],reward:{xp:125,coins:75}},{id:"journey-11",type:"main",locationId:"hotel",timeKo:"\uD604\uC9C0 2\uC77C\uCC28 \xB7 \uC624\uD6C4 6:00",titleKo:"\uBBF8\uC158 11 \xB7 \uD638\uD154\uC5D0 \uD0DD\uC2DC\uB97C \uBD88\uB7EC \uB2EC\uB77C\uACE0 \uD558\uB77C!",briefingKo:"\uC800\uB141 \uC2DD\uC0AC\uB97C \uD558\uB7EC \uB098\uAC08 \uC2DC\uAC04\uC774\uC5D0\uC694. \uD638\uD154 \uCEE8\uC2DC\uC5B4\uC9C0\uC5D0\uAC8C \uC624\uD6C4 6\uC2DC 20\uBD84\uC5D0 \uC815\uBB38\uC73C\uB85C \uD0DD\uC2DC\uB97C \uBD88\uB7EC \uB2EC\uB77C\uACE0 \uC815\uC911\uD558\uAC8C \uC694\uCCAD\uD558\uC138\uC694.",openingEn:"Concierge desk. What can I arrange for you?",openingKo:"\uCEE8\uC2DC\uC5B4\uC9C0 \uB370\uC2A4\uD06C\uC785\uB2C8\uB2E4. \uBB34\uC5C7\uC744 \uC900\uBE44\uD574 \uB4DC\uB9B4\uAE4C\uC694?",entryAction:{id:"hotel-phone",labelKo:"\u260E\uFE0F \uCEE8\uC2DC\uC5B4\uC9C0\uC5D0 \uC804\uD654\uD558\uAE30"},npcOverride:{name:"Concierge Oliver",roleKo:"\uD638\uD154 \uCEE8\uC2DC\uC5B4\uC9C0",icon:"\u{1F6CE}\uFE0F"},goals:[{id:"taxi_request",labelKo:"\uD638\uD154\uC5D0 \uD0DD\uC2DC \uD638\uCD9C \uC694\uCCAD\uD558\uAE30",descriptionEn:"Ask the hotel or concierge to call or arrange a taxi.",hintKo:"\uC694\uCCAD\uD560 \uAC83: \uD0DD\uC2DC \uD638\uCD9C"},{id:"pickup_time",labelKo:"\uC624\uD6C4 6\uC2DC 20\uBD84 \uD53D\uC5C5 \uB9D0\uD558\uAE30",descriptionEn:"Give a clear pickup time, with 6:20 p.m. matching the travel story.",hintKo:"\uC694\uCCAD \uC2DC\uAC04: \uC624\uD6C4 6\uC2DC 20\uBD84"},{id:"polite_request",labelKo:"\uC815\uC911\uD55C \uC694\uCCAD \uD45C\uD604 \uC0AC\uC6A9\uD558\uAE30",descriptionEn:"Make the taxi request politely using could you, please, or an equivalent phrase.",hintKo:"\uB9D0\uD22C: \uC815\uC911\uD558\uAC8C"}],hints:["Could you call a taxi for me, please?","I'd like it at the front entrance at 6:20 p.m."],reward:{xp:130,coins:80}},{id:"journey-12",type:"main",locationId:"transit",timeKo:"\uD604\uC9C0 2\uC77C\uCC28 \xB7 \uC624\uD6C4 6:20",titleKo:"\uBBF8\uC158 12 \xB7 \uD0DD\uC2DC \uAE30\uC0AC\uC5D0\uAC8C \uC2DD\uB2F9\uC744 \uC54C\uB824\uB77C!",briefingKo:"\uD638\uD154 \uC55E\uC5D0 \uC608\uC57D\uD55C \uD0DD\uC2DC\uAC00 \uB3C4\uCC29\uD588\uC5B4\uC694. \uAE30\uC0AC\uC5D0\uAC8C \uB9AC\uBC84\uC0AC\uC774\uB4DC \uC2A4\uD14C\uC774\uD06C\uD558\uC6B0\uC2A4\uB85C \uAC00 \uB2EC\uB77C\uACE0 \uBAA9\uC801\uC9C0\uB97C \uBD84\uBA85\uD558\uACE0 \uC815\uC911\uD558\uAC8C \uB9D0\uD558\uC138\uC694.",openingEn:"Good evening. Where would you like to go?",openingKo:"\uC88B\uC740 \uC800\uB141\uC785\uB2C8\uB2E4. \uC5B4\uB514\uB85C \uBAA8\uC154\uB2E4\uB4DC\uB9B4\uAE4C\uC694?",npcOverride:{name:"Driver James",roleKo:"\uD638\uD154 \uD638\uCD9C \uD0DD\uC2DC \uAE30\uC0AC",icon:"\u{1F695}"},goals:[{id:"restaurant_destination",labelKo:"\uC2DD\uB2F9 \uC774\uB984\uACFC \uBAA9\uC801\uC9C0 \uB9D0\uD558\uAE30",descriptionEn:"Tell the driver that the destination is the Riverside Steakhouse or clearly name a restaurant.",hintKo:"\uBAA9\uC801\uC9C0: \uB9AC\uBC84\uC0AC\uC774\uB4DC \uC2A4\uD14C\uC774\uD06C\uD558\uC6B0\uC2A4"},{id:"polite_request",labelKo:"\uC815\uC911\uD558\uAC8C \uAC00 \uB2EC\uB77C\uACE0 \uBD80\uD0C1\uD558\uAE30",descriptionEn:"Politely ask the driver to take the traveler to the restaurant.",hintKo:"\uC694\uCCAD: \uC815\uC911\uD558\uAC8C \uAC00 \uB2EC\uB77C"}],hints:["Please take me to the Riverside Steakhouse.","It's the restaurant near the river."],reward:{xp:120,coins:70}},{id:"journey-13",type:"main",locationId:"restaurant",timeKo:"\uD604\uC9C0 2\uC77C\uCC28 \xB7 \uC624\uD6C4 6:45",titleKo:"\uBBF8\uC158 13 \xB7 \uC2DD\uB2F9\uC5D0\uC11C 2\uBA85 \uC790\uB9AC\uB97C \uC694\uCCAD\uD558\uB77C!",briefingKo:"\uC2DD\uB2F9\uC5D0 \uB3C4\uCC29\uD588\uC5B4\uC694. \uC608\uC57D\uC774 \uC5C6\uC5B4\uB3C4 \uAD1C\uCC2E\uC740\uC9C0 \uD655\uC778\uD558\uBA70 2\uBA85\uC774 \uC549\uC744 \uD14C\uC774\uBE14\uC744 \uC815\uC911\uD558\uAC8C \uC694\uCCAD\uD558\uC138\uC694.",openingEn:"Welcome to the Riverside Steakhouse. Do you have a reservation tonight?",openingKo:"\uB9AC\uBC84\uC0AC\uC774\uB4DC \uC2A4\uD14C\uC774\uD06C\uD558\uC6B0\uC2A4\uC5D0 \uC624\uC2E0 \uAC83\uC744 \uD658\uC601\uD569\uB2C8\uB2E4. \uC624\uB298 \uC800\uB141 \uC608\uC57D\uD558\uC168\uB098\uC694?",npcOverride:{name:"Host Sofia",roleKo:"\uB808\uC2A4\uD1A0\uB791 \uC548\uB0B4 \uC9C1\uC6D0",icon:"\u{1F37D}\uFE0F"},goals:[{id:"table_request",labelKo:"\uC549\uC744 \uD14C\uC774\uBE14 \uC694\uCCAD\uD558\uAE30",descriptionEn:"Ask the host for a table even if there is no reservation.",hintKo:"\uC608\uC57D: \uC5C6\uC74C \xB7 \uC694\uCCAD: \uD14C\uC774\uBE14"},{id:"quantity_two",labelKo:"2\uBA85 \uC790\uB9AC\uB77C\uACE0 \uB9D0\uD558\uAE30",descriptionEn:"Clearly say that the table is for exactly two people.",hintKo:"\uC778\uC6D0: 2\uBA85"},{id:"polite_request",labelKo:"\uC815\uC911\uD558\uAC8C \uC790\uB9AC \uBD80\uD0C1\uD558\uAE30",descriptionEn:"Use a polite request such as please, could we, or an equivalent form.",hintKo:"\uB9D0\uD22C: \uC815\uC911\uD558\uAC8C"}],hints:["We don't have a reservation.","Could we have a table for two, please?"],reward:{xp:125,coins:75}},{id:"journey-14",type:"main",locationId:"restaurant",timeKo:"\uD604\uC9C0 2\uC77C\uCC28 \xB7 \uC624\uD6C4 6:55",titleKo:"\uBBF8\uC158 14 \xB7 \uCCAB \uC74C\uC2DD\uACFC \uC74C\uB8CC\uB97C \uC8FC\uBB38\uD558\uB77C!",briefingKo:"\uC790\uB9AC\uC5D0 \uC549\uC544 \uBA54\uB274\uB97C \uACE8\uB790\uC5B4\uC694. \uC885\uC5C5\uC6D0\uC5D0\uAC8C \uC2A4\uD14C\uC774\uD06C 1\uAC1C, \uB9BD\uC544\uC774 1\uAC1C, \uADF8\uB9AC\uACE0 \uC74C\uB8CC 2\uAC1C\uB97C \uBE60\uB728\uB9AC\uC9C0 \uB9D0\uACE0 \uC8FC\uBB38\uD558\uC138\uC694.",openingEn:"Your table is ready. Would you like a few more minutes, or are you ready to order?",openingKo:"\uC790\uB9AC\uAC00 \uC900\uBE44\uB410\uC2B5\uB2C8\uB2E4. \uBA54\uB274\uB97C \uB354 \uBCF4\uC2DC\uACA0\uC5B4\uC694, \uC544\uB2C8\uBA74 \uC8FC\uBB38\uD558\uC2DC\uACA0\uC5B4\uC694?",entryAction:{id:"restaurant-call",labelKo:"\u{1F514} \uC885\uC5C5\uC6D0 \uBD80\uB974\uAE30"},npcOverride:{name:"Server Sofia",roleKo:"\uB808\uC2A4\uD1A0\uB791 \uC8FC\uBB38 \uB2F4\uB2F9 \uC9C1\uC6D0",icon:"\u{1F4DD}"},goals:[{id:"steak",labelKo:"\uC2A4\uD14C\uC774\uD06C 1\uAC1C \uC8FC\uBB38\uD558\uAE30",descriptionEn:"Order one regular steak as a separate item.",hintKo:"\uC74C\uC2DD: \uC2A4\uD14C\uC774\uD06C 1\uAC1C"},{id:"ribeye",labelKo:"\uB9BD\uC544\uC774 1\uAC1C \uC8FC\uBB38\uD558\uAE30",descriptionEn:"Order one rib-eye steak as a separate item.",hintKo:"\uC74C\uC2DD: \uB9BD\uC544\uC774 1\uAC1C"},{id:"two_drinks",labelKo:"\uC74C\uB8CC 2\uAC1C \uC8FC\uBB38\uD558\uAE30",descriptionEn:"Order exactly two drinks, either by quantity or by naming two drinks.",hintKo:"\uC74C\uB8CC: \uB808\uBAA8\uB124\uC774\uB4DC 1\uC794 \xB7 \uC624\uB80C\uC9C0\uC8FC\uC2A4 1\uC794"}],hints:["We'd like one steak and one rib-eye, please.","Could we also have two drinks?","One lemonade and one orange juice, please."],reward:{xp:150,coins:95}},{id:"journey-15",type:"main",locationId:"restaurant",timeKo:"\uD604\uC9C0 2\uC77C\uCC28 \xB7 \uC624\uD6C4 7:30",titleKo:"\uBBF8\uC158 15 \xB7 \uC2DD\uC0AC \uC911 \uCD94\uAC00 \uC8FC\uBB38\uC744 \uD558\uB77C!",briefingKo:"\uC2DD\uC0AC\uB97C \uD558\uB2E4 \uBCF4\uB2C8 \uC74C\uC2DD\uACFC \uBB3C\uC774 \uC870\uAE08 \uB354 \uD544\uC694\uD574\uC84C\uC5B4\uC694. \uC6D0\uD558\uB294 \uC0AC\uC774\uB4DC \uBA54\uB274\uB098 \uC74C\uC2DD\uC744 \uD558\uB098 \uB354 \uC8FC\uBB38\uD558\uACE0, \uB9C8\uC2E4 \uBB3C\uB3C4 \uC815\uC911\uD558\uAC8C \uC694\uCCAD\uD558\uC138\uC694.",openingEn:"How is everything? Can I bring you anything else?",openingKo:"\uC2DD\uC0AC\uB294 \uC5B4\uB5A0\uC2E0\uAC00\uC694? \uB354 \uAC00\uC838\uB2E4\uB4DC\uB9B4 \uAC83\uC774 \uC788\uC744\uAE4C\uC694?",npcOverride:{name:"Server Sofia",roleKo:"\uB808\uC2A4\uD1A0\uB791 \uC8FC\uBB38 \uB2F4\uB2F9 \uC9C1\uC6D0",icon:"\u{1F957}"},goals:[{id:"extra_order",labelKo:"\uC74C\uC2DD\uC774\uB098 \uC0AC\uC774\uB4DC \uBA54\uB274 \uCD94\uAC00 \uC8FC\uBB38\uD558\uAE30",descriptionEn:"Order an additional food item, side dish, or dessert during the meal.",hintKo:"\uCD94\uAC00 \uC74C\uC2DD: \uAC10\uC790\uD280\uAE40"},{id:"water_request",labelKo:"\uB9C8\uC2E4 \uBB3C \uC694\uCCAD\uD558\uAE30",descriptionEn:"Ask the server to bring water, a glass of water, or more water.",hintKo:"\uCD94\uAC00 \uC74C\uB8CC: \uBB3C"},{id:"polite_request",labelKo:"\uCD94\uAC00 \uC8FC\uBB38\uC744 \uC815\uC911\uD558\uAC8C \uB9D0\uD558\uAE30",descriptionEn:"Use a polite request such as could we have, please, or an equivalent form.",hintKo:"\uB9D0\uD22C: \uC815\uC911\uD558\uAC8C"}],hints:["Could we also order a side of fries?","And could we have some water, please?"],reward:{xp:135,coins:85}},{id:"journey-16",type:"main",locationId:"restaurant",timeKo:"\uD604\uC9C0 2\uC77C\uCC28 \xB7 \uC624\uD6C4 8:10",titleKo:"\uBBF8\uC158 16 \xB7 \uACC4\uC0B0\uC11C\uB97C \uBC1B\uACE0 \uCE74\uB4DC\uB85C \uACB0\uC81C\uD558\uB77C!",briefingKo:"\uB9DB\uC788\uAC8C \uC2DD\uC0AC\uB97C \uB9C8\uCCE4\uC5B4\uC694. \uC885\uC5C5\uC6D0\uC5D0\uAC8C \uACC4\uC0B0\uC11C\uB97C \uC815\uC911\uD558\uAC8C \uC694\uCCAD\uD558\uACE0, \uCE74\uB4DC\uB85C \uACB0\uC81C\uD558\uACE0 \uC2F6\uB2E4\uACE0 \uB9D0\uD558\uC138\uC694.",openingEn:"I hope you enjoyed your meal. Is there anything else I can get for you?",openingKo:"\uC2DD\uC0AC\uB294 \uB9DB\uC788\uAC8C \uB4DC\uC168\uB098\uC694? \uB354 \uD544\uC694\uD55C \uAC83\uC774 \uC788\uC73C\uC2E0\uAC00\uC694?",npcOverride:{name:"Server Sofia",roleKo:"\uB808\uC2A4\uD1A0\uB791 \uACC4\uC0B0 \uB2F4\uB2F9 \uC9C1\uC6D0",icon:"\u{1F4B3}"},goals:[{id:"bill_request",labelKo:"\uACC4\uC0B0\uC11C \uC694\uCCAD\uD558\uAE30",descriptionEn:"Ask the server to bring the bill, check, or receipt for the meal.",hintKo:"\uC694\uCCAD\uD560 \uAC83: \uACC4\uC0B0\uC11C"},{id:"card_payment",labelKo:"\uCE74\uB4DC\uB85C \uACB0\uC81C\uD55C\uB2E4\uACE0 \uB9D0\uD558\uAE30",descriptionEn:"State that the bill will be paid by card or ask whether card payment is accepted.",hintKo:"\uACB0\uC81C \uC218\uB2E8: \uCE74\uB4DC"},{id:"polite_request",labelKo:"\uC815\uC911\uD558\uAC8C \uACC4\uC0B0 \uBD80\uD0C1\uD558\uAE30",descriptionEn:"Make the billing request politely using please, could we, or an equivalent expression.",hintKo:"\uB9D0\uD22C: \uC815\uC911\uD558\uAC8C"}],hints:["Could we have the bill, please?","I'd like to pay by card."],reward:{xp:135,coins:85}},{id:"journey-17",type:"main",locationId:"shop",timeKo:"\uD604\uC9C0 3\uC77C\uCC28 \xB7 \uC624\uC804 10:00",titleKo:"\uBBF8\uC158 17 \xB7 \uC5EC\uD589\uC6A9 \uC7AC\uD0B7\uC744 \uCC3E\uC544\uB77C!",briefingKo:"\uC544\uCE68 \uC1FC\uD551\uC744 \uD558\uB7EC \uC654\uC5B4\uC694. \uC9C1\uC6D0\uC5D0\uAC8C \uB124\uC774\uBE44\uC0C9 M \uC0AC\uC774\uC988 \uC7AC\uD0B7\uC744 \uCC3E\uACE0 \uC788\uB2E4\uACE0 \uB9D0\uD558\uACE0, \uC9C1\uC811 \uC785\uC5B4 \uBD10\uB3C4 \uB418\uB294\uC9C0 \uBB3C\uC5B4\uBCF4\uC138\uC694.",openingEn:"Good morning! What are you looking for today?",openingKo:"\uC88B\uC740 \uC544\uCE68\uC785\uB2C8\uB2E4! \uC624\uB298 \uBB34\uC5C7\uC744 \uCC3E\uACE0 \uACC4\uC138\uC694?",goals:[{id:"jacket",labelKo:"\uC7AC\uD0B7\uC744 \uCC3E\uB294\uB2E4\uACE0 \uB9D0\uD558\uAE30",descriptionEn:"Tell the clerk that the desired item is a jacket.",hintKo:"\uCC3E\uB294 \uBB3C\uAC74: \uC7AC\uD0B7"},{id:"navy_medium",labelKo:"\uB124\uC774\uBE44\uC0C9 M \uC0AC\uC774\uC988 \uB9D0\uD558\uAE30",descriptionEn:"Specify both navy as the color and medium or size M as the size.",hintKo:"\uC0C9\uC0C1: \uB124\uC774\uBE44 \xB7 \uC0AC\uC774\uC988: M"},{id:"try_on",labelKo:"\uC785\uC5B4 \uBD10\uB3C4 \uB418\uB294\uC9C0 \uBB3B\uAE30",descriptionEn:"Ask permission to try the jacket on.",hintKo:"\uD655\uC778\uD560 \uAC83: \uC785\uC5B4 \uBCF4\uAE30 \uAC00\uB2A5 \uC5EC\uBD80"}],hints:["I'm looking for a navy jacket in size M.","May I try it on?"],reward:{xp:145,coins:90}},{id:"journey-18",type:"main",locationId:"museum",timeKo:"\uD604\uC9C0 3\uC77C\uCC28 \xB7 \uC624\uD6C4 1:00",titleKo:"\uBBF8\uC158 18 \xB7 \uBC15\uBB3C\uAD00 \uD45C\uC640 \uAD00\uB78C \uADDC\uCE59\uC744 \uD655\uC778\uD558\uB77C!",briefingKo:"\uC1FC\uD551\uC744 \uB9C8\uCE58\uACE0 \uBC15\uBB3C\uAD00\uC5D0 \uB3C4\uCC29\uD588\uC5B4\uC694. \uC5B4\uB9B0\uC774 \uD45C 2\uC7A5\uC744 \uC0AC\uACE0, \uC804\uC2DC\uC2E4 \uC548\uC5D0\uC11C \uC0AC\uC9C4\uC744 \uCC0D\uC5B4\uB3C4 \uB418\uB294\uC9C0 \uAD00\uB78C \uADDC\uCE59\uC744 \uBB3C\uC5B4\uBCF4\uC138\uC694.",openingEn:"Welcome to the Sunny City Museum. What tickets would you like today?",openingKo:"\uC368\uB2C8 \uC2DC\uD2F0 \uBC15\uBB3C\uAD00\uC5D0 \uC624\uC2E0 \uAC83\uC744 \uD658\uC601\uD569\uB2C8\uB2E4. \uC624\uB298 \uC5B4\uB5A4 \uD45C\uAC00 \uD544\uC694\uD558\uC2E0\uAC00\uC694?",npcOverride:{name:"Grace",roleKo:"\uBC15\uBB3C\uAD00 \uC785\uC7A5\uAD8C \uC548\uB0B4 \uC9C1\uC6D0",icon:"\u{1F39F}\uFE0F"},goals:[{id:"two_child_tickets",labelKo:"\uC5B4\uB9B0\uC774 \uD45C 2\uC7A5 \uC694\uCCAD\uD558\uAE30",descriptionEn:"Request exactly two children's admission tickets.",hintKo:"\uC785\uC7A5\uAD8C: \uC5B4\uB9B0\uC774 2\uC7A5"},{id:"photo_rule",labelKo:"\uC804\uC2DC\uC2E4 \uC0AC\uC9C4 \uCD2C\uC601 \uADDC\uCE59 \uBB3B\uAE30",descriptionEn:"Ask whether taking photos is allowed inside the exhibits.",hintKo:"\uD655\uC778\uD560 \uADDC\uCE59: \uC804\uC2DC\uC2E4 \uC0AC\uC9C4 \uCD2C\uC601"}],hints:["Two children's tickets, please.","Are we allowed to take photos inside?"],reward:{xp:140,coins:85}},{id:"journey-19",type:"main",locationId:"park",timeKo:"\uD604\uC9C0 3\uC77C\uCC28 \xB7 \uC624\uD6C4 4:00",titleKo:"\uBBF8\uC158 19 \xB7 \uACF5\uC6D0\uC5D0\uC11C \uC790\uC804\uAC70\uB97C \uBE4C\uB824\uB77C!",briefingKo:"\uBC15\uBB3C\uAD00 \uAD00\uB78C \uB4A4 \uAC00\uAE4C\uC6B4 \uACF5\uC6D0\uC5D0 \uC654\uC5B4\uC694. \uB300\uC5EC \uC9C1\uC6D0\uC5D0\uAC8C \uC790\uC804\uAC70 2\uB300\uB97C 1\uC2DC\uAC04 \uB3D9\uC548 \uBE4C\uB9AC\uACE0 \uC2F6\uB2E4\uACE0 \uB9D0\uD558\uACE0, \uD5EC\uBA67\uB3C4 \uD3EC\uD568\uB418\uB294\uC9C0 \uD655\uC778\uD558\uC138\uC694.",openingEn:"Hello! Would you like to rent bikes for the park?",openingKo:"\uC548\uB155\uD558\uC138\uC694! \uACF5\uC6D0\uC5D0\uC11C \uD0C8 \uC790\uC804\uAC70\uB97C \uBE4C\uB9AC\uC2DC\uACA0\uC5B4\uC694?",npcOverride:{name:"Noah",roleKo:"\uACF5\uC6D0 \uC790\uC804\uAC70 \uB300\uC5EC \uC9C1\uC6D0",icon:"\u{1F6B2}"},goals:[{id:"two_bikes",labelKo:"\uC790\uC804\uAC70 2\uB300 \uBE4C\uB9AC\uAE30",descriptionEn:"Ask to rent exactly two bicycles.",hintKo:"\uB300\uC5EC \uBB3C\uD488: \uC790\uC804\uAC70 2\uB300"},{id:"one_hour",labelKo:"1\uC2DC\uAC04 \uC774\uC6A9\uD55C\uB2E4\uACE0 \uB9D0\uD558\uAE30",descriptionEn:"Say that the bicycle rental is for one hour.",hintKo:"\uC774\uC6A9 \uC2DC\uAC04: 1\uC2DC\uAC04"},{id:"helmets",labelKo:"\uD5EC\uBA67 \uD3EC\uD568 \uC5EC\uBD80 \uBB3B\uAE30",descriptionEn:"Ask whether helmets are included with the rental or available.",hintKo:"\uD655\uC778\uD560 \uAC83: \uD5EC\uBA67 \uD3EC\uD568 \uC5EC\uBD80"}],hints:["We'd like to rent two bikes for one hour.","Are helmets included?"],reward:{xp:155,coins:100}},{id:"journey-20",type:"main",locationId:"help",timeKo:"\uD604\uC9C0 3\uC77C\uCC28 \xB7 \uC624\uD6C4 6:10",titleKo:"\uBBF8\uC158 20 \xB7 \uC544\uD508 \uCE5C\uAD6C\uB97C \uC704\uD574 \uC57D\uAD6D \uB3C4\uC6C0\uC744 \uAD6C\uD558\uB77C!",briefingKo:"\uACF5\uC6D0\uC5D0\uC11C \uB3CC\uC544\uC624\uB358 \uC911 \uCE5C\uAD6C\uAC00 \uAC11\uC790\uAE30 \uC544\uD30C\uC84C\uC5B4\uC694. \uCE5C\uAD6C\uAC00 \uBC30\uAC00 \uC544\uD504\uACE0 \uC5B4\uC9C0\uB7FD\uB2E4\uACE0 \uC124\uBA85\uD55C \uB4A4, \uAC00\uC7A5 \uAC00\uAE4C\uC6B4 \uC57D\uAD6D\uC774 \uC5B4\uB514\uC778\uC9C0 \uBB3C\uC5B4\uBCF4\uC138\uC694.",openingEn:"Hello. You look worried. What happened, and how can I help?",openingKo:"\uC548\uB155\uD558\uC138\uC694. \uAC71\uC815\uC2A4\uB7EC\uC6CC \uBCF4\uC774\uB124\uC694. \uBB34\uC2A8 \uC77C\uC774 \uC788\uACE0, \uC5B4\uB5BB\uAC8C \uB3C4\uC640\uB4DC\uB9B4\uAE4C\uC694?",npcOverride:{name:"Pharmacist Lily",roleKo:"\uC57D\uC0AC \uACB8 \uC5EC\uD589\uC790 \uB3C4\uC6C0 \uC9C1\uC6D0",icon:"\u{1F48A}"},goals:[{id:"stomachache",labelKo:"\uCE5C\uAD6C\uAC00 \uBC30\uAC00 \uC544\uD504\uB2E4\uACE0 \uC124\uBA85\uD558\uAE30",descriptionEn:"Explain that the friend has a stomachache or stomach pain.",hintKo:"\uCE5C\uAD6C \uC99D\uC0C1: \uBC30\uAC00 \uC544\uD514"},{id:"dizzy",labelKo:"\uCE5C\uAD6C\uAC00 \uC5B4\uC9C0\uB7FD\uB2E4\uACE0 \uC124\uBA85\uD558\uAE30",descriptionEn:"Explain that the friend feels dizzy or lightheaded.",hintKo:"\uCE5C\uAD6C \uC99D\uC0C1: \uC5B4\uC9C0\uB7EC\uC6C0"},{id:"pharmacy",labelKo:"\uAC00\uAE4C\uC6B4 \uC57D\uAD6D \uC704\uCE58 \uBB3B\uAE30",descriptionEn:"Ask where the nearest pharmacy is or how to get there.",hintKo:"\uCC3E\uC744 \uACF3: \uAC00\uC7A5 \uAC00\uAE4C\uC6B4 \uC57D\uAD6D"}],hints:["My friend has a stomachache and feels dizzy.","Where is the nearest pharmacy?"],reward:{xp:165,coins:110}},{id:"journey-21",type:"main",locationId:"hotel",timeKo:"\uD604\uC9C0 4\uC77C\uCC28 \xB7 \uC624\uC804 9:00",titleKo:"\uBBF8\uC158 21 \xB7 \uD558\uC6B0\uC2A4\uD0A4\uD37C\uC5D0\uAC8C \uB098\uC911\uC5D0 \uC640 \uB2EC\uB77C\uACE0 \uD558\uB77C!",briefingKo:"\uCCB4\uD06C\uC544\uC6C3 \uC900\uBE44 \uC911\uC778\uB370 \uD558\uC6B0\uC2A4\uD0A4\uD37C\uAC00 \uBC29\uC5D0 \uC654\uC5B4\uC694. \uC9C0\uAE08\uC740 \uC678\uCD9C \uC900\uBE44 \uC911\uC774\uB77C\uACE0 \uC124\uBA85\uD558\uACE0, 1\uC2DC\uAC04 \uB4A4\uC5D0 \uB2E4\uC2DC \uC640 \uB2EC\uB77C\uACE0 \uC815\uC911\uD558\uAC8C \uBD80\uD0C1\uD558\uC138\uC694.",openingEn:"Housekeeping. Would you like me to clean your room now?",openingKo:"\uD558\uC6B0\uC2A4\uD0A4\uD551\uC785\uB2C8\uB2E4. \uC9C0\uAE08 \uBC29\uC744 \uCCAD\uC18C\uD574 \uB4DC\uB9B4\uAE4C\uC694?",npcOverride:{name:"Mia",roleKo:"\uD638\uD154 \uD558\uC6B0\uC2A4\uD0A4\uD37C",icon:"\u{1F9F9}"},goals:[{id:"getting_ready",labelKo:"\uC678\uCD9C \uC900\uBE44 \uC911\uC774\uB77C\uACE0 \uC124\uBA85\uD558\uAE30",descriptionEn:"Explain that the traveler is getting ready to go out or is not ready for cleaning now.",hintKo:"\uD604\uC7AC \uC0C1\uD669: \uC678\uCD9C \uC900\uBE44 \uC911"},{id:"one_hour_later",labelKo:"1\uC2DC\uAC04 \uB4A4\uC5D0 \uB2E4\uC2DC \uC640 \uB2EC\uB77C\uACE0 \uD558\uAE30",descriptionEn:"Ask the housekeeper to return or clean the room one hour later.",hintKo:"\uB2E4\uC2DC \uC62C \uC2DC\uAC04: 1\uC2DC\uAC04 \uB4A4"},{id:"polite",labelKo:"\uC815\uC911\uD558\uAC8C \uBD80\uD0C1\uD558\uAE30",descriptionEn:"Make the request politely with please, could you, thank you, or an equivalent expression.",hintKo:"\uB9D0\uD22C: \uC815\uC911\uD558\uAC8C"}],hints:["We're getting ready to go out.","Could you come back in one hour, please?"],reward:{xp:135,coins:85}},{id:"journey-22",type:"main",locationId:"hotel",timeKo:"\uD604\uC9C0 4\uC77C\uCC28 \xB7 \uC624\uC804 10:00",titleKo:"\uBBF8\uC158 22 \xB7 \uD638\uD154 \uCCB4\uD06C\uC544\uC6C3\uC744 \uC644\uB8CC\uD558\uB77C!",briefingKo:"\uC5EC\uD589\uC758 \uB9C8\uC9C0\uB9C9 \uB0A0\uC774\uC5D0\uC694. \uD504\uB7F0\uD2B8 \uC9C1\uC6D0\uC5D0\uAC8C \uCCB4\uD06C\uC544\uC6C3\uD558\uACA0\uB2E4\uACE0 \uB9D0\uD558\uACE0, \uBBF8\uB2C8\uBC14\uB294 \uC0AC\uC6A9\uD558\uC9C0 \uC54A\uC558\uC73C\uBA70 \uACF5\uD56D\uC73C\uB85C \uAC00\uAE30 \uC804\uAE4C\uC9C0 \uC9D0\uC744 \uC7A0\uC2DC \uB9E1\uAE30\uACE0 \uC2F6\uB2E4\uACE0 \uC124\uBA85\uD558\uC138\uC694.",openingEn:"Good morning. Are you checking out today? Did you use anything from the minibar?",openingKo:"\uC88B\uC740 \uC544\uCE68\uC785\uB2C8\uB2E4. \uC624\uB298 \uCCB4\uD06C\uC544\uC6C3\uD558\uC2DC\uB098\uC694? \uBBF8\uB2C8\uBC14\uC5D0\uC11C \uC0AC\uC6A9\uD558\uC2E0 \uBB3C\uD488\uC774 \uC788\uB098\uC694?",goals:[{id:"checkout_request",labelKo:"\uCCB4\uD06C\uC544\uC6C3\uD558\uACA0\uB2E4\uACE0 \uB9D0\uD558\uAE30",descriptionEn:"Clearly state the intention to check out of the hotel now.",hintKo:"\uC694\uCCAD: \uC9C0\uAE08 \uCCB4\uD06C\uC544\uC6C3"},{id:"minibar_none",labelKo:"\uBBF8\uB2C8\uBC14\uB97C \uC0AC\uC6A9\uD558\uC9C0 \uC54A\uC558\uB2E4\uACE0 \uB9D0\uD558\uAE30",descriptionEn:"State that nothing from the minibar was used or consumed.",hintKo:"\uBBF8\uB2C8\uBC14 \uC0AC\uC6A9: \uC5C6\uC74C"},{id:"luggage_storage",labelKo:"\uC9D0\uC744 \uC7A0\uC2DC \uB9E1\uC544 \uB2EC\uB77C\uACE0 \uC694\uCCAD\uD558\uAE30",descriptionEn:"Ask the hotel to store or hold the luggage temporarily after checkout.",hintKo:"\uC694\uCCAD: \uC5EC\uD589\uAC00\uBC29 \uC7A0\uC2DC \uBCF4\uAD00"}],hints:["I'd like to check out, please.","I didn't use anything from the minibar.","Could you hold my luggage for a little while?"],reward:{xp:150,coins:95}},{id:"journey-23",type:"main",locationId:"transit",timeKo:"\uD604\uC9C0 4\uC77C\uCC28 \xB7 \uC624\uC804 10:30",titleKo:"\uBBF8\uC158 23 \xB7 \uD0DD\uC2DC\uB97C \uD0C0\uACE0 \uACF5\uD56D\uC73C\uB85C \uB3CC\uC544\uAC00\uB77C!",briefingKo:"\uD638\uD154\uC5D0\uC11C \uC9D0\uC744 \uCC3E\uC544 \uADC0\uAD6D\uAE38\uC5D0 \uC62C\uB790\uC5B4\uC694. \uAE30\uC0AC\uC5D0\uAC8C \uACF5\uD56D \uC81C2\uD130\uBBF8\uB110\uB85C \uAC00 \uB2EC\uB77C\uACE0 \uB9D0\uD558\uACE0, \uC774 \uD130\uBBF8\uB110\uC774 \uB9DE\uB294\uC9C0 \uD655\uC778\uD55C \uB4A4 \uC5EC\uD589\uAC00\uBC29\uC744 \uC2E4\uC5B4 \uB2EC\uB77C\uACE0 \uBD80\uD0C1\uD558\uC138\uC694.",openingEn:"Your taxi is ready. Where would you like to go, and can I help with your bags?",openingKo:"\uD0DD\uC2DC\uAC00 \uC900\uBE44\uB410\uC2B5\uB2C8\uB2E4. \uC5B4\uB514\uB85C \uAC00\uC2DC\uBA70, \uC9D0\uC744 \uC2E3\uB294 \uAC83\uC744 \uB3C4\uC640\uB4DC\uB9B4\uAE4C\uC694?",npcOverride:{name:"Driver James",roleKo:"\uACF5\uD56D\uD589 \uD0DD\uC2DC \uAE30\uC0AC",icon:"\u{1F695}"},goals:[{id:"airport_destination",labelKo:"\uACF5\uD56D\uC73C\uB85C \uAC00 \uB2EC\uB77C\uACE0 \uB9D0\uD558\uAE30",descriptionEn:"Tell the driver that the destination is the airport.",hintKo:"\uBAA9\uC801\uC9C0: \uACF5\uD56D"},{id:"terminal_question",labelKo:"\uC81C2\uD130\uBBF8\uB110\uC774 \uB9DE\uB294\uC9C0 \uD655\uC778\uD558\uAE30",descriptionEn:"Ask whether Terminal 2 is the correct terminal for the airline or flight.",hintKo:"\uD56D\uACF5\uC0AC: \uC368\uB2C8 \uC5D0\uC5B4 \xB7 \uD130\uBBF8\uB110: 2"},{id:"luggage_help",labelKo:"\uC5EC\uD589\uAC00\uBC29 \uC2E3\uB294 \uAC83\uC744 \uBD80\uD0C1\uD558\uAE30",descriptionEn:"Ask the driver for help loading the suitcase or luggage into the taxi.",hintKo:"\uC694\uCCAD: \uC5EC\uD589\uAC00\uBC29 \uC2E3\uAE30"}],hints:["Please take me to the airport.","Is Terminal 2 correct for Sunny Air?","Could you help me with this suitcase?"],reward:{xp:140,coins:90}},{id:"journey-24",type:"main",locationId:"airport",timeKo:"\uD604\uC9C0 4\uC77C\uCC28 \xB7 \uCD9C\uAD6D \uC624\uC804 11:20",titleKo:"\uBBF8\uC158 24 \xB7 \uBCC0\uACBD\uB41C \uD0D1\uC2B9\uAD6C\uC5D0\uC11C \uB9C8\uC9C0\uB9C9 \uD0D1\uC2B9\uC744 \uD558\uB77C!",briefingKo:"\uADC0\uAD6D\uD3B8 \uD0D1\uC2B9\uAD6C\uAC00 \uAC11\uC790\uAE30 12\uBC88\uC73C\uB85C \uBC14\uB00C\uC5C8\uC5B4\uC694. \uC9C1\uC6D0\uC5D0\uAC8C 12\uBC88 \uD0D1\uC2B9\uAD6C \uC704\uCE58\uC640 \uD0D1\uC2B9 \uC2DC\uC791 \uC2DC\uAC04\uC744 \uBB3B\uACE0, \uB9C8\uC9C0\uB9C9\uC73C\uB85C \uD0D1\uC2B9\uAD8C\uC744 \uBCF4\uC5EC \uC8FC\uBA70 \uBE44\uD589\uAE30\uC5D0 \uD0C0\uC138\uC694.",openingEn:"Your flight has moved to gate 12. May I help you before final boarding?",openingKo:"\uD0D1\uC2B9\uD558\uC2E4 \uD56D\uACF5\uD3B8\uC774 12\uBC88 \uD0D1\uC2B9\uAD6C\uB85C \uBCC0\uACBD\uB410\uC2B5\uB2C8\uB2E4. \uCD5C\uC885 \uD0D1\uC2B9 \uC804\uC5D0 \uB3C4\uC640\uB4DC\uB9B4\uAE4C\uC694?",npcOverride:{name:"Gate Agent Ava",roleKo:"\uADC0\uAD6D\uD3B8 \uD0D1\uC2B9\uAD6C \uC9C1\uC6D0",icon:"\u{1F3AB}"},goals:[{id:"gate_twelve",labelKo:"12\uBC88 \uD0D1\uC2B9\uAD6C \uC704\uCE58 \uBB3B\uAE30",descriptionEn:"Ask where the newly assigned gate 12 is located.",hintKo:"\uCC3E\uC744 \uACF3: 12\uBC88 \uD0D1\uC2B9\uAD6C"},{id:"boarding_time",labelKo:"\uD0D1\uC2B9 \uC2DC\uC791 \uC2DC\uAC04 \uBB3B\uAE30",descriptionEn:"Ask when boarding begins or what time final boarding takes place.",hintKo:"\uD655\uC778\uD560 \uAC83: \uD0D1\uC2B9 \uC2DC\uC791 \uC2DC\uAC04"},{id:"boarding_pass",labelKo:"\uB9C8\uC9C0\uB9C9 \uD0D1\uC2B9\uAD8C \uBCF4\uC5EC \uC8FC\uAE30",descriptionEn:"Offer or show the boarding pass to the gate agent for final boarding.",hintKo:"\uBCF4\uC5EC \uC904 \uAC83: \uD0D1\uC2B9\uAD8C"}],hints:["Where is gate 12?","What time does boarding begin?","Here is my boarding pass."],reward:{xp:180,coins:120}}],economy:{food:[{id:"city-sandwich",nameKo:"\uC2DC\uD2F0 \uC0CC\uB4DC\uC704\uCE58",icon:"\u{1F96A}",price:25,repeatable:!0,effects:{food:28,energy:3}},{id:"steak-dinner",nameKo:"\uC2A4\uD14C\uC774\uD06C \uB514\uB108",icon:"\u{1F969}",price:55,repeatable:!0,effects:{food:52,energy:8,confidence:3}},{id:"sunny-dessert",nameKo:"\uC368\uB2C8 \uB514\uC800\uD2B8",icon:"\u{1F368}",price:35,repeatable:!0,effects:{food:22,confidence:6}}],outfits:[{id:"sunny-cap",nameKo:"\uC368\uB2C8 \uCEA1",icon:"\u{1F9E2}",price:45,color:"#4f8df7"},{id:"city-jacket",nameKo:"\uC2DC\uD2F0 \uC7AC\uD0B7",icon:"\u{1F9E5}",price:90,color:"#574a9c"},{id:"travel-formal",nameKo:"\uC5EC\uD589 \uD3EC\uBA40\uB8E9",icon:"\u{1F454}",price:150,color:"#1f355e"}],activities:[{id:"bike-tour",nameKo:"\uACF5\uC6D0 \uC790\uC804\uAC70 \uD22C\uC5B4",icon:"\u{1F6B2}",price:65,effects:{energy:-10,confidence:10,xp:35}},{id:"museum-workshop",nameKo:"\uBC15\uBB3C\uAD00 \uCCB4\uD5D8 \uAD50\uC2E4",icon:"\u{1F3A8}",price:85,effects:{energy:-5,confidence:14,xp:50}},{id:"river-cruise",nameKo:"\uC57C\uACBD \uB9AC\uBC84 \uD06C\uB8E8\uC988",icon:"\u{1F6E5}\uFE0F",price:120,effects:{energy:12,confidence:12,xp:65}}],lodgings:[{id:"standard-room",nameKo:"\uC2A4\uD0E0\uB354\uB4DC \uB8F8",icon:"\u{1F6CF}\uFE0F",price:0,tier:0,rest:18},{id:"boutique-room",nameKo:"\uBD80\uD2F0\uD06C \uD638\uD154",icon:"\u{1F3E8}",price:180,tier:1,rest:32},{id:"skyline-suite",nameKo:"\uC2A4\uCE74\uC774\uB77C\uC778 \uC2A4\uC704\uD2B8",icon:"\u{1F303}",price:360,tier:2,rest:50}]}};var os=Kh.AVATARS,an=Kh.LOCATIONS,Rc=Xh.missions,Wn=Xh.economy;var Iv=new Map([["i'm","i am"],["i'd","i would"],["i'll","i will"],["can't","cannot"],["cannot","cannot"],["don't","do not"],["doesn't","does not"],["isn't","is not"],["it's","it is"],["what's","what is"],["that's","that is"],["we'll","we will"],["we're","we are"],["you're","you are"],["there's","there is"]]),Pv=new Set(["um","uh","er","ah","please"]);function Lv(i){return String(i||"").replace(/[’‘]/g,"'").replace(/[–—]/g,"-")}function Di(i){let e=Lv(i).toLowerCase().trim();for(let[t,n]of Iv)e=e.replace(new RegExp(`\\b${t.replace("'","\\'")}\\b`,"g"),n);return e.replace(/t\s*-\s*shirt/g,"tshirt").replace(/round\s*-\s*trip/g,"round trip").replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim()}function Ws(i,e=!1){let t=Di(i).split(" ").filter(Boolean);return e?t.filter(n=>!Pv.has(n)):t}function Nv(i,e){if(i===e)return 0;if(!i.length)return e.length;if(!e.length)return i.length;let t=Array.from({length:e.length+1},(s,r)=>r),n=new Array(e.length+1);for(let s=1;s<=i.length;s+=1){n[0]=s;for(let r=1;r<=e.length;r+=1)n[r]=Math.min(n[r-1]+1,t[r]+1,t[r-1]+(i[s-1]===e[r-1]?0:1));for(let r=0;r<=e.length;r+=1)t[r]=n[r]}return t[e.length]}function qh(i,e){let t=Di(i),n=Di(e),s=Math.max(t.length,n.length);return s?Math.max(0,1-Nv(t,n)/s):1}function Dv(i,e){let t=Ws(i,!0),n=Ws(e,!0);if(!t.length||!n.length)return 0;let s=[...n],r=0;t.forEach(l=>{let c=s.indexOf(l);c<0&&(c=s.findIndex(u=>qh(l,u)>=.78)),c>=0&&(r+=1,s.splice(c,1))});let o=r/t.length,a=r/n.length;return o+a?2*o*a/(o+a):0}function Uv(i,e){let t=Ws(i,!0),n=Ws(e,!0);if(!t.length||!n.length)return 0;let s=Array.from({length:t.length+1},()=>new Uint16Array(n.length+1));for(let r=1;r<=t.length;r+=1)for(let o=1;o<=n.length;o+=1)s[r][o]=t[r-1]===n[o-1]?s[r-1][o-1]+1:Math.max(s[r-1][o],s[r][o-1]);return s[t.length][n.length]/Math.max(t.length,n.length)}function Fv(i,e){return qh(i,e)*.5+Dv(i,e)*.32+Uv(i,e)*.18}function Ov(i,e){let t=Di(e);return t?t.includes(" ")?Di(i.join(" ")).includes(t):i.some(n=>n===t||t.length>4&&qh(n,t)>=.78):!1}function Bv(i,e=[]){if(!e.length)return 0;let t=Ws(i);return e.filter(s=>Ov(t,s)).length/e.length}function kv(i,e,t){let n=Di(i),s=Di(e);return/\bi like\b/.test(n)&&/\bi would like\b/.test(s)?"\uC9C0\uAE08 \uC8FC\uBB38\uD558\uAC70\uB098 \uBD80\uD0C1\uD560 \uB54C\uB294 I like\uBCF4\uB2E4 I'd like\uB97C \uC4F0\uBA74 \uB354 \uC790\uC5F0\uC2A4\uB7EC\uC6CC\uC694.":/\bdoes\s+\w+\s+has\b/.test(n)?"does\uAC00 \uC55E\uC5D0 \uC624\uBA74 \uB4A4\uC758 \uB3D9\uC0AC\uB294 \uC6D0\uB798 \uBAA8\uC591 have\uB97C \uC368\uC694.":/\b(two|three|four|five|six|seven|eight|nine|ten)\s+(day|night|ticket|picture)\b/.test(n)?"\uB450 \uAC1C \uC774\uC0C1\uC744 \uB9D0\uD560 \uB54C\uB294 \uBA85\uC0AC \uB4A4\uC5D0 s\uB97C \uBD99\uC5EC \uC8FC\uC138\uC694.":/\bi\s+(lost|from|allergic)\b/.test(n)&&!/\bi am\b/.test(n)?"I \uB2E4\uC74C\uC5D0 \uC0C1\uD0DC\uB97C \uB9D0\uD560 \uB54C\uB294 am\uC744 \uB123\uC5B4 \uBB38\uC7A5\uC744 \uC644\uC131\uD574\uC694.":/\bhow much it is\b/.test(n)?"\uC9C8\uBB38\uC5D0\uC11C\uB294 is\uB97C \uC55E\uC73C\uB85C \uBCF4\uB0B4 How much is it?\uC774\uB77C\uACE0 \uD574\uC694.":t||null}function Bp(i,e,t={}){let n=String(i||"").trim(),s=Number.isFinite(t.confidence)?t.confidence:null,r=[...new Set([e.target,...e.accepts||[]].filter(Boolean))];if(!n)return{status:"retry",score:0,canAdvance:!1,corrected:e.target,explanationKo:"\uC544\uC9C1 \uBB38\uC7A5\uC774 \uB4E4\uB9AC\uC9C0 \uC54A\uC558\uC5B4\uC694. \uCC9C\uCC9C\uD788 \uD55C \uBC88 \uB354 \uB9D0\uD574 \uBCF4\uC138\uC694."};let o=r.some(y=>Di(y)===Di(n)),a=Math.max(...r.map(y=>Fv(n,y))),l=Bv(n,e.keywords||[]),c=kv(n,e.target,null),u=(e.keywords||[]).length===1&&l===1,h=Ws(n,!0).length>=Math.min(2,Ws(e.target,!0).length),d=o||a>=.71||l>=.67&&h||u,f=o||a>=.9&&!c;return s!==null&&s>0&&s<.42&&!d?{status:"uncertain",score:Math.max(a,l),canAdvance:!1,corrected:e.target,explanationKo:"\uB9C8\uC774\uD06C\uAC00 \uBB38\uC7A5\uC744 \uB610\uB837\uD558\uAC8C \uB4E3\uC9C0 \uBABB\uD588\uC5B4\uC694. \uD2C0\uB9B0 \uAC83\uC73C\uB85C \uCC98\uB9AC\uD558\uC9C0 \uC54A\uC558\uC73C\uB2C8 \uAC00\uAE4C\uC774\uC5D0\uC11C \uCC9C\uCC9C\uD788 \uB2E4\uC2DC \uB9D0\uD574 \uBCF4\uC138\uC694."}:f?{status:"great",score:Math.max(a,l),canAdvance:!0,corrected:e.target,explanationKo:"\uC544\uC8FC \uC790\uC5F0\uC2A4\uB7EC\uC6CC\uC694! \uC5EC\uD589\uC9C0\uC5D0\uC11C\uB3C4 \uADF8\uB300\uB85C \uB9D0\uD560 \uC218 \uC788\uC5B4\uC694."}:d?{status:"polish",score:Math.max(a,l),canAdvance:!0,corrected:e.target,explanationKo:c||e.correctionKo||"\uB73B\uC740 \uC798 \uC804\uD574\uC84C\uC5B4\uC694. \uC544\uB798 \uBB38\uC7A5\uCC98\uB7FC \uB9D0\uD558\uBA74 \uB354 \uC790\uC5F0\uC2A4\uB7EC\uC6CC\uC694."}:{status:"retry",score:Math.max(a,l),canAdvance:!1,corrected:e.target,explanationKo:e.correctionKo||"\uAD1C\uCC2E\uC544\uC694. \uD575\uC2EC \uD45C\uD604\uC744 \uBCF4\uACE0 \uCC9C\uCC9C\uD788 \uB2E4\uC2DC \uB9D0\uD574 \uBCF4\uC138\uC694."}}var q=i=>document.querySelector(i),nn=23,zv=-.9,Hv=3.2,Vv=.015,em="english_travel_3d_v1",Gv="family_todos_selected_kid_id",Wv="study_game_local_saved_at_v1",Kv={"female-a":"\u{1F467}\u{1F3FB}","male-a":"\u{1F466}\u{1F3FB}"},eT=new Map(Rc.map(i=>[i.id,i])),qn=[...Rc],tm=new Map(qn.map((i,e)=>[i.id,e])),nm=(i=Q?.missionStep||0)=>qn[i]||null,_i=()=>nm(),fs=i=>(tm.get(i?.id)??-1)+1,er=(i=_i())=>an.find(e=>e.id===i?.locationId)||null,Hc=i=>String(i?.titleKo||"").replace(/^미션\s*\d+\s*·\s*/,""),Xv={city:"assets/english-travel-3d/models/city",roads:"assets/english-travel-3d/models/roads",furniture:"assets/english-travel-3d/models/furniture",market:"assets/english-travel-3d/models/market",food:"assets/english-travel-3d/models/food",nature:"assets/english-travel-3d/models/nature"},Rn=(i,e)=>`${Xv[i]}/${e}.glb`,im={airport:{building:"building-h",props:[["furniture","kitchenBar",-3.6,2.2,1.1,0],["furniture","kitchenBar",-.3,2.2,1.1,0],["furniture","desk",-1.8,-.8,1.05,0],["furniture","televisionModern",2.6,2.4,2.15,0],["furniture","bench",3.4,-.9,.78,Math.PI],["furniture","bench",-3.5,-2.8,.78,0],["furniture","bench",.2,-3.4,.78,0],["market","shelf-bags",5,1.2,1.45,Math.PI/2],["market","shopping-cart",4.5,-2.5,.82,-.3],["roads","sign-highway",-5.4,-.1,1.9,-.25],["roads","sign-highway",5.5,-1.1,1.9,.25],["roads","light-square",6.2,.8,2.7,0],["roads","light-square",-6.2,-2,2.7,0]]},hotel:{building:"building-e",props:[["furniture","loungeSofa",-2.1,-.4,.9,.5],["furniture","lampRoundFloor",2.2,-.7,1.5,0],["furniture","pottedPlant",3.1,.7,1.2,0],["furniture","bedDouble",-3,1.4,.65,.1]]},restaurant:{building:"building-d",props:[["city","detail-parasol-a",-2.5,-.1,2.1,0],["furniture","tableRound",-2.5,-.1,.8,0],["furniture","chair",-3.3,-.2,.8,1.4],["furniture","kitchenCoffeeMachine",2.5,.4,.75,-.2],["food","pizza",-2.5,-.1,.18,0,.77]]},shop:{building:"building-c",props:[["market","display-bread",-2.4,-.1,1.15,.25],["market","display-fruit",2.2,-.1,1.15,-.25],["market","cash-register",.4,-1,.65,Math.PI],["market","shopping-cart",3.2,1,.8,-.5],["city","detail-awning",0,2.5,1.3,0]]},transit:{building:"low-detail-building-b",props:[["roads","sign-highway",-2.7,.3,1.8,.3],["roads","light-square",3.1,.3,2.7,0],["furniture","bench",2.2,-1.1,.75,Math.PI/2]]},museum:{building:"building-h",props:[["furniture","bookcaseOpen",-2.4,.2,1.45,.15],["furniture","bench",2.5,-.7,.75,-.2],["furniture","pottedPlant",3.1,.7,1.2,0],["nature","rock_largeA",-3.4,1.2,1.15,0]]},park:{building:null,props:[["nature","tree_oak",-3.8,1.2,4.7,.2],["nature","tree_default",3.8,1.8,4.2,-.3],["nature","tree_palm",-3.2,-2,4.1,.1],["furniture","bench",2.2,-.8,.8,-.7],["nature","flower_redA",1.2,1.7,.65,0],["nature","flower_yellowA",2,1.5,.65,0],["food","ice-cream-cup",-.9,-.8,.26,0]]},help:{building:"building-a",props:[["furniture","desk",-1.9,-.4,1.05,.2],["furniture","chairCushion",.1,-1.3,.9,Math.PI],["furniture","loungeSofa",2.5,.2,.82,-.25],["furniture","pottedPlant",3.2,1.2,1.2,0]]}},kp=[{actor:0,en:"Is this the check-in line?",ko:"\uC5EC\uAE30\uAC00 \uCCB4\uD06C\uC778 \uC904\uC778\uAC00\uC694?"},{actor:1,en:"Yes, I think so.",ko:"\uB124, \uADF8\uB7F0 \uAC83 \uAC19\uC544\uC694."},{actor:2,en:"Your suitcase is cute!",ko:"\uC5EC\uD589 \uAC00\uBC29\uC774 \uADC0\uC5FD\uB124\uC694!"},{actor:3,en:"Thank you. Have a nice trip!",ko:"\uACE0\uB9C8\uC6CC\uC694. \uC990\uAC70\uC6B4 \uC5EC\uD589 \uB418\uC138\uC694!"},{actor:4,en:"The airport is busy today.",ko:"\uC624\uB298 \uACF5\uD56D\uC774 \uBD90\uBE44\uB124\uC694."}],_={gameStage:q("#gameStage"),canvas:q("#gameCanvas"),loadingScreen:q("#loadingScreen"),loadingBar:q("#loadingBar"),loadingText:q("#loadingText"),welcome:q("#welcomeScreen"),avatarOptions:q("#avatarOptions"),travelerName:q("#travelerName"),startButton:q("#startButton"),passportButton:q("#passportButton"),passportPanel:q("#passportPanel"),passportClose:q("#passportClose"),passportName:q("#passportName"),stampGrid:q("#stampGrid"),lifeButton:q("#lifeButton"),lifePanel:q("#lifePanel"),lifeClose:q("#lifeClose"),lifeCoinCount:q("#lifeCoinCount"),lifeCurrent:q("#lifeCurrent"),lifeCatalog:q("#lifeCatalog"),lifeHelp:q("#lifeHelp"),surpriseAlert:q("#surpriseAlert"),surpriseTitle:q("#surpriseTitle"),surpriseMissionTitle:q("#surpriseMissionTitle"),surpriseMissionGoal:q("#surpriseMissionGoal"),surpriseReward:q("#surpriseReward"),surpriseStart:q("#surpriseStart"),surpriseLater:q("#surpriseLater"),stampCount:q("#stampCount"),coinCount:q("#coinCount"),levelCount:q("#levelCount"),missionTitle:q("#missionTitle"),missionBadge:q("#missionBadge"),missionGoal:q("#missionGoal"),missionDoneCount:q("#missionDoneCount"),missionProgressBar:q("#missionProgressBar"),needFood:q("#needFood"),needEnergy:q("#needEnergy"),needConfidence:q("#needConfidence"),miniMapGrid:q("#miniMapGrid"),areaName:q("#areaName"),interactButton:q("#interactButton"),interactLabel:q("#interactLabel"),interactHint:q("#interactHint"),soundToggle:q("#soundToggle"),topHud:q(".top-hud"),toast:q("#toast"),missionWayfinder:q("#missionWayfinder"),wayfinderArrow:q("#wayfinderArrow"),wayfinderName:q("#wayfinderName"),wayfinderDistance:q("#wayfinderDistance"),ambientBubble:q("#ambientBubble"),ambientBubbleEn:q("#ambientBubbleEn"),ambientBubbleKo:q("#ambientBubbleKo"),worldConversation:q("#worldConversation"),conversationComposer:q("#conversationComposer"),npcWorldBubble:q("#npcWorldBubble"),npcBubbleName:q("#npcBubbleName"),npcBubbleText:q("#npcBubbleText"),npcWorldReplay:q("#npcWorldReplay"),npcWorldCaptionToggle:q("#npcWorldCaptionToggle"),playerWorldBubble:q("#playerWorldBubble"),playerBubbleText:q("#playerBubbleText"),playerBubbleHeard:q("#playerBubbleHeard"),worldHintPopup:q("#worldHintPopup"),worldHintText:q("#worldHintText"),worldHintButton:q("#worldHintButton"),worldHintSentences:q("#worldHintSentences"),worldHintSentenceList:q("#worldHintSentenceList"),worldReplyInput:q("#worldReplyInput"),worldClearButton:q("#worldClearButton"),worldSendButton:q("#worldSendButton"),worldVoiceState:q("#worldVoiceState"),worldCoach:q("#worldCoach"),dialogue:q("#dialogueSheet"),dialogueClose:q("#dialogueClose"),npcAvatar:q("#npcAvatar"),npcRole:q("#npcRole"),npcName:q("#npcName"),turnCount:q("#turnCount"),dialogueMissionBrief:q("#dialogueMissionBrief"),dialogueMissionBadge:q("#dialogueMissionBadge"),dialogueMissionTitle:q("#dialogueMissionTitle"),dialogueMissionGoal:q("#dialogueMissionGoal"),missionGoalList:q("#missionGoalList"),npcLine:q("#npcLine"),npcListenCue:q("#npcListenCue"),npcReplay:q("#npcReplay"),lineRevealToggle:q("#lineRevealToggle"),translationToggle:q("#translationToggle"),npcTranslation:q("#npcTranslation"),conversationTrail:q("#conversationTrail"),conversationTrailList:q("#conversationTrailList"),historyToggle:q("#historyToggle"),answerZone:q("#answerZone"),answerHint:q("#answerHint"),hintToggle:q("#hintToggle"),phraseChips:q("#phraseChips"),micButton:q("#micButton"),answerInput:q("#answerInput"),answerSubmit:q("#answerSubmit"),evaluationProgress:q("#evaluationProgress"),heardBox:q("#heardBox"),heardText:q("#heardText"),heardLiteralRow:q("#heardLiteralRow"),heardLiteralText:q("#heardLiteralText"),correctionCard:q("#correctionCard"),correctionStatus:q("#correctionStatus"),correctedSentence:q("#correctedSentence"),correctionReason:q("#correctionReason"),correctedReplay:q("#correctedReplay"),retryButton:q("#retryButton"),offlineContinueButton:q("#offlineContinueButton"),nextTurnButton:q("#nextTurnButton"),rewardScreen:q("#rewardScreen"),rewardIcon:q("#rewardIcon"),rewardTitle:q("#rewardTitle"),rewardPhrase:q("#rewardPhrase"),rewardXp:q("#rewardXp"),rewardCoins:q("#rewardCoins"),rewardExtra:q("#rewardExtra"),rewardContinue:q("#rewardContinue"),joystickWrap:q("#joystickWrap"),joystickBase:q("#joystickBase"),joystickKnob:q("#joystickKnob")};function nd(i){let e=localStorage.getItem(Gv);return e?`${i}:${e}`:i}function qv(){return{version:3,started:!1,avatarId:os[0].id,travelerName:"Jin",xp:0,coins:0,completed:[],completedMissions:[],completedSurprises:[],missionStep:0,rewardGrants:[],pendingSurpriseMissionId:null,ownedOutfits:[],equippedOutfit:null,completedActivities:[],ownedLodgings:["standard-room"],currentLodging:"standard-room",lastRestAt:0,needs:{food:72,energy:78,confidence:55},position:{x:0,z:0}}}function Yv(){let i=qv();try{let e=JSON.parse(localStorage.getItem(nd(em))||"null");if(!e||typeof e!="object")return i;let t=Number(e.position?.x),n=Number(e.position?.z),s=new Set(Rc.map(u=>u.id)),r=new Set(Wn.outfits.map(u=>u.id)),o=new Set(Wn.activities.map(u=>u.id)),a=new Set(Wn.lodgings.map(u=>u.id)),l=Array.isArray(e.ownedLodgings)?[...new Set(e.ownedLodgings.filter(u=>a.has(u)))]:["standard-room"];l.includes("standard-room")||l.unshift("standard-room");let c=Number(e.version)>=3;return{...i,...e,version:3,xp:Math.max(0,Math.floor(Number(e.xp)||0)),coins:Math.max(0,Math.floor(Number(e.coins)||0)),completed:c&&Array.isArray(e.completed)?[...new Set(e.completed.filter(u=>an.some(h=>h.id===u)))]:[],completedMissions:c&&Array.isArray(e.completedMissions)?[...new Set(e.completedMissions.filter(u=>s.has(u)))]:[],completedSurprises:[],missionStep:c?Lt.clamp(Math.floor(Number(e.missionStep)||0),0,qn.length):0,rewardGrants:Array.isArray(e.rewardGrants)?[...new Set(e.rewardGrants.filter(u=>typeof u=="string").slice(-60))]:[],pendingSurpriseMissionId:null,ownedOutfits:Array.isArray(e.ownedOutfits)?[...new Set(e.ownedOutfits.filter(u=>r.has(u)))]:[],equippedOutfit:r.has(e.equippedOutfit)?e.equippedOutfit:null,completedActivities:Array.isArray(e.completedActivities)?[...new Set(e.completedActivities.filter(u=>o.has(u)))]:[],ownedLodgings:l,currentLodging:l.includes(e.currentLodging)?e.currentLodging:"standard-room",lastRestAt:Number.isFinite(Number(e.lastRestAt))?Number(e.lastRestAt):0,needs:{...i.needs,...e.needs||{}},position:{x:Number.isFinite(t)?Lt.clamp(t,-nn,nn):0,z:Number.isFinite(n)?Lt.clamp(n,-nn,nn):0}}}catch{return i}}var Q=Yv();function $s(){try{localStorage.setItem(nd(em),JSON.stringify(Q)),localStorage.setItem(nd(Wv),String(Date.now()))}catch{}}var ln,Bt,Yt,id,sm,Ic=0,sd=0,Yr=0,Yh=!1,rd,od,cs,qs,Be,vt,Jr,Fi=null,_e=null,Vc=0,Le=null,Xn=new Set,mi=null,ki=0,yt=null,zi=null,ps=!1,Xs=!0,Je="idle",Zs=null,ca=null,jr=[],pd=0,ha=null,da=null,us=null,kt=!1,Pn=!1,ua=0,$r=null,rm=null,zp=null,om=!1,In=0,pi=0,Kn=null,Zn=!1,gi=[],Js=!1,Nt="food",Ui=null,Pc=null,Nc="",ls=null,Hp=0,Vp=0,ad=0,eo=new Map,am=new Map,$v=/^(?:yes|yeah|yep|yup|sure|right|correct|okay|ok|exactly|that's right|that is right|yes please|yes it is|yes i did)[\s.,!?]*$/i,ld=new Map,Zr=new Map,Dc=[],xi=new Map,md=new Map,gd=new Map,Uc=new Map,Qr=[],wn=new Set,Fc=new Ie,Gp=new L,Wp=new L,$h=new L,Zh=new L,Jh=new L,jh=new L,tT=new L,as=new L,Sn=new L,Ks=new L,oa=new L,Kp=new L,aa=new L,la=new L,Qh=new L,Xp=new L,qp=new L,Yp="",ed=-1,qt={left:90,right:900,top:145,bottom:600};function pn(i,e=2800){clearTimeout(zp),_.toast.textContent=i,_.toast.classList.add("is-visible"),requestAnimationFrame(Oc),zp=setTimeout(()=>{_.toast.classList.remove("is-visible"),requestAnimationFrame(Oc)},e)}function cn(i){return Math.max(12,Math.min(100,Number(i)||0))}function hs(){let i=Q.missionStep,e=_i();_.stampCount.textContent=String(Q.completed.length),_.coinCount.textContent=String(Q.coins),_.lifeCoinCount.textContent=String(Q.coins),_.levelCount.textContent=String(Math.floor(Q.xp/250)+1),_.missionDoneCount.textContent=String(i),_.missionProgressBar.style.width=`${i/Math.max(1,qn.length)*100}%`,_.needFood.style.width=`${cn(Q.needs.food)}%`,_.needEnergy.style.width=`${cn(Q.needs.energy)}%`,_.needConfidence.style.width=`${cn(Q.needs.confidence)}%`,_.passportName.textContent=(Q.travelerName||"TRAVELER").toUpperCase(),an.forEach(t=>{let n=Q.completed.includes(t.id),s=e?.locationId===t.id,r=_.miniMapGrid.querySelector(`[data-location="${t.id}"]`);r?.classList.toggle("is-done",n),r?.classList.toggle("is-target",s),_.stampGrid.querySelector(`[data-stamp="${t.id}"]`)?.classList.toggle("is-done",n);let a=md.get(t.id);a&&(a.material.color.set(s?16761159:n?4248220:t.color),a.material.emissive?.set(s?16761159:n?4248220:t.color),a.material.opacity=s?1:n?.4:.26)})}function Zv(){_.avatarOptions.innerHTML="",os.forEach(i=>{let e=document.createElement("button");e.type="button",e.className="avatar-option",e.dataset.avatar=i.id,e.innerHTML=`<span aria-hidden="true">${Kv[i.id]||"\u{1F9D2}"}</span><b>${i.nameKo}</b>`,e.addEventListener("click",async()=>{Q.avatarId=i.id,$p(),om&&await hm()}),_.avatarOptions.appendChild(e)}),_.travelerName.value=Q.travelerName||"Jin",$p(),_.stampGrid.innerHTML="",_.miniMapGrid.innerHTML="",an.forEach((i,e)=>{let t=document.createElement("div");t.className="passport-stamp",t.dataset.stamp=i.id,t.style.setProperty("--stamp-color",i.color),t.style.setProperty("--stamp-rotate",`${(e%2?5:-5)+e/2}deg`),t.innerHTML=`<span>${i.icon}<small>${i.titleEn.toUpperCase()}</small></span>`,_.stampGrid.appendChild(t);let n=document.createElement("span");n.className="map-dot",n.dataset.location=i.id,n.style.setProperty("--dot-color",i.color),n.style.left=`${(i.npc.position[0]+nn)/(nn*2)*100}%`,n.style.top=`${(nn-i.npc.position[1])/(nn*2)*100}%`,n.textContent=i.icon,_.miniMapGrid.appendChild(n)}),Jr=document.createElement("span"),Jr.className="map-player",_.miniMapGrid.appendChild(Jr),hs()}function $p(){_.avatarOptions.querySelectorAll(".avatar-option").forEach(i=>{let e=i.dataset.avatar===Q.avatarId;i.classList.toggle("is-selected",e),i.setAttribute("aria-pressed",String(e))})}function fa(i,e){_.loadingBar.style.width=`${Math.max(2,Math.min(100,i))}%`,_.loadingText.textContent=`${e} ${Math.round(i)}%`}function Jv(){ln=new wo,ln.background=new Pe(10214898),ln.fog=new So(10214898,31,67),Bt=new Rt(48,innerWidth/innerHeight,.1,140),Bt.position.set(9,9,12),Yt=new Mc({canvas:_.canvas,antialias:!0,alpha:!1,powerPreference:"high-performance"}),Yt.setPixelRatio(Math.min(devicePixelRatio,1.8)),Yt.setSize(innerWidth,innerHeight),Yt.shadowMap.enabled=!0,Yt.shadowMap.type=wl,Yt.outputColorSpace=_t,Yt.toneMapping=$o,Yt.toneMappingExposure=1.05,id=new qo,sm=new Ec;let i=new zo(14350335,7116882,2.25);ln.add(i);let e=new Us(16773327,3.35);e.position.set(-15,26,12),e.castShadow=!0,e.shadow.mapSize.set(1536,1536),e.shadow.camera.left=-34,e.shadow.camera.right=34,e.shadow.camera.top=34,e.shadow.camera.bottom=-34,e.shadow.camera.near=1,e.shadow.camera.far=75,e.shadow.bias=-35e-5,ln.add(e);let t=new nt(new Fr(38,64),new Wt({color:8636781,roughness:.95,metalness:0}));t.rotation.x=-Math.PI/2,t.receiveShadow=!0,ln.add(t),rd=t;let n=new nt(new Fo(37.5,42,64),new Wt({color:6858696,roughness:.8}));n.rotation.x=-Math.PI/2,n.position.y=-.03,ln.add(n),od=n}function jv(){let i=new Set;return os.forEach(e=>i.add(e.model)),an.forEach(e=>{i.add(e.npc.model);let t=im[e.id];t?.building&&i.add(Rn("city",t.building)),t?.props.forEach(([n,s])=>i.add(Rn(n,s)))}),["road-straight","road-crossroad","road-crossing","road-bend","light-square"].forEach(e=>i.add(Rn("roads",e))),["tree_default","tree_oak","plant_bush","grass_large","flower_yellowA"].forEach(e=>i.add(Rn("nature",e))),[...i]}async function Qv(i){if(Zr.has(i))return Zr.get(i);try{let e=await sm.loadAsync(i);return Zr.set(i,e),e}catch(e){return console.warn(`Could not load 3D asset: ${i}`,e),Zr.set(i,null),null}}async function eb(){let i=jv(),e=0;await Promise.all(i.map(async t=>{await Qv(t),e+=1;let n=8+e/i.length*58;fa(n,e<i.length*.45?"\uB3C4\uC2DC \uAC74\uBB3C\uC744 \uC138\uC6B0\uB294 \uC911\u2026":"\uCE90\uB9AD\uD130\uAC00 \uC637\uC744 \uC785\uB294 \uC911\u2026")}))}function lm(i,e={}){let{height:t=null,footprint:n=null,shadows:s=!0}=e,r=new Gt;i.updateMatrixWorld(!0);let o=new Qt().setFromObject(i),a=o.getSize(new L),l=Math.max(a.x,a.z),c=t&&a.y>0?t/a.y:n&&l>0?n/l:1;i.scale.multiplyScalar(c),i.updateMatrixWorld(!0),o=new Qt().setFromObject(i);let u=o.getCenter(new L);return i.position.x-=u.x,i.position.z-=u.z,i.position.y-=o.min.y,i.traverse(h=>{h.isMesh&&(h.castShadow=s,h.receiveShadow=s,h.material?.map&&(h.material.map.colorSpace=_t))}),r.add(i),r}function cm(i=16747114,e=1){let t=new Gt,n=new nt(new ii(.8,e,.8),new Wt({color:i,roughness:.75}));return n.position.y=e/2,n.castShadow=!0,n.receiveShadow=!0,t.add(n),t}function tb(i,e={}){let t=Zr.get(i);return t?.scene?lm(t.scene.clone(!0),e):cm(e.color,e.height||1)}function ds(i,e,t,n={}){let s=tb(i,n);return s.position.set(e,n.y||0,t),s.rotation.y=n.rotation||0,(n.parent||ln).add(s),s}function xd(i,e={}){let t=Zr.get(i),n=t?.scene?Tc(t.scene):null,s=n?lm(n,{height:e.height||1.72}):cm(e.color,1.72);if(s.position.set(e.x||0,e.y||0,e.z||0),s.rotation.y=e.rotation||0,s.userData.actions=new Map,s.userData.currentAction=null,s.userData.mixer=null,n&&t.animations?.length){let r=new Xo(n);t.animations.forEach(o=>s.userData.actions.set(o.name,r.clipAction(o))),s.userData.mixer=r,Dc.push(r),Yn(s,e.animation||"idle",!0)}return(e.parent||ln).add(s),s}function Yn(i,e,t=!0){if(!i)return;let n=i.userData.actions?.get(e)||i.userData.actions?.get("idle");if(!n||i.userData.currentAction===n)return;let s=i.userData.currentAction;if(n.reset(),n.enabled=!0,n.setLoop(t?pc:fc,t?1/0:1),n.clampWhenFinished=!t,n.fadeIn(.18).play(),s?.fadeOut(.18),i.userData.currentAction=n,!t){let r=i.userData.mixer,o=a=>{a.action===n&&(r.removeEventListener("finished",o),Yn(i,"idle",!0))};r?.addEventListener("finished",o)}}function nb(i,e=ln){let t=new nt(new Fr(4.8,40),new Wt({color:i.color,transparent:!0,opacity:.19,roughness:1}));t.rotation.x=-Math.PI/2,t.position.set(i.npc.position[0],.015,i.npc.position[1]),t.receiveShadow=!0,e.add(t);let n=new nt(new Or(1.2,.09,10,42),new Wt({color:i.color,emissive:i.color,emissiveIntensity:.35,transparent:!0,opacity:.78}));n.rotation.x=Math.PI/2,n.position.set(i.npc.position[0],.08,i.npc.position[1]),e.add(n),md.set(i.id,n)}function ib(i,e,t="#18204b"){let n=document.createElement("canvas");n.width=512,n.height=170;let s=n.getContext("2d");s.clearRect(0,0,n.width,n.height),s.fillStyle="rgba(255,255,255,.94)",s.beginPath(),typeof s.roundRect=="function"?s.roundRect(20,20,472,130,36):s.rect(20,20,472,130),s.fill(),s.lineWidth=8,s.strokeStyle=t,s.stroke(),s.fillStyle="#18204b",s.font="900 45px sans-serif",s.textAlign="center",s.fillText(i,256,83),s.fillStyle="#64708e",s.font="800 25px sans-serif",s.fillText(e,256,122);let r=new Ur(n);r.colorSpace=_t;let o=new Rr(new Is({map:r,transparent:!0,depthWrite:!1}));return o.scale.set(4.7,1.56,1),o}function cd(){if(!vt)return;Ui&&(vt.remove(Ui),Ui.material?.map?.dispose?.(),Ui.material?.dispose?.(),Ui=null);let i=Wn.outfits.find(s=>s.id===Q.equippedOutfit);if(!i)return;let e=document.createElement("canvas");e.width=160,e.height=160;let t=e.getContext("2d");t.fillStyle="rgba(255,255,255,.94)",t.beginPath(),t.arc(80,80,63,0,Math.PI*2),t.fill(),t.lineWidth=9,t.strokeStyle=i.color||"#5b8ef1",t.stroke(),t.font="78px sans-serif",t.textAlign="center",t.textBaseline="middle",t.fillText(i.icon,80,84);let n=new Ur(e);n.colorSpace=_t,Ui=new Rr(new Is({map:n,transparent:!0,depthWrite:!1})),Ui.position.set(0,2.28,0),Ui.scale.set(.75,.75,1),vt.add(Ui)}function um(i){let e=new Ie(i.npc.position[0],i.npc.position[1]);return e.lengthSq()<.1?new Ie(0,1):e.normalize()}function sb(i,e,t){return{x:i*Math.cos(t)-e*Math.sin(t),z:i*Math.sin(t)+e*Math.cos(t)}}function rb(i,e){let[t,n]=e.npc.position,s=new nt(new Ri(30,24),new Wt({color:13095384,roughness:.92,metalness:.02}));s.rotation.x=-Math.PI/2,s.position.set(t,.01,n-1.5),s.receiveShadow=!0,i.add(s);let r=new nt(new Ri(5.2,24),new Wt({color:5200230,roughness:1}));r.rotation.x=-Math.PI/2,r.position.set(t+10.3,.018,n-1.5),r.receiveShadow=!0,i.add(r);for(let c=n-10;c<=n+7;c+=3.2){let u=new nt(new Ri(.24,1.7),new yn({color:16250334}));u.rotation.x=-Math.PI/2,u.position.set(t+10.3,.025,c),i.add(u)}let o=new Wt({color:3430535,roughness:.45,metalness:.35}),a=new Wt({color:4155565,roughness:.7});[-4.8,-2.5,-.2,2.1].forEach((c,u,h)=>{let d=new nt(new Uo(.07,.09,.9,12),o);if(d.position.set(t+c,.46,n+.2),d.castShadow=!0,i.add(d),u<h.length-1){let f=new nt(new ii(2.2,.06,.06),a);f.position.set(t+c+1.15,.78,n+.2),i.add(f)}});let l=new Wt({color:14968925,roughness:.72});[[-5.2,-1.7],[5.2,-3.3],[2.9,-2.3]].forEach(([c,u],h)=>{let d=new Gt,f=new nt(new ii(.5,.75,.32),l.clone());f.material.color.offsetHSL(h*.11,0,0),f.position.y=.4,f.castShadow=!0;let g=new nt(new Or(.14,.025,6,12,Math.PI),o);g.position.set(0,.82,0),d.add(f,g),d.position.set(t+c,.01,n+u),d.rotation.y=h*.65,i.add(d)})}function ob(i,e){Qr.length=0;let[t,n]=e.npc.position,s=[an.find(o=>o.id==="hotel")?.npc.model,an.find(o=>o.id==="restaurant")?.npc.model,an.find(o=>o.id==="shop")?.npc.model,an.find(o=>o.id==="museum")?.npc.model,an.find(o=>o.id==="park")?.npc.model];[[-5.2,-3.1,.65],[-4.1,-2.5,-2.35],[4.2,.4,2.2],[5.1,-.3,-1],[1.1,-4.8,.25]].forEach(([o,a,l],c)=>{let u=xd(s[c]||os[c%os.length].model,{x:t+o,z:n+a,height:1.62,rotation:l,color:7837385+c*591107,parent:i});u.userData.ambientTraveler=!0,Qr.push(u)}),ad=performance.now()+2400}function ab(){cs=new Gt,cs.name="City roads",ln.add(cs);for(let i=-20;i<=20;i+=5)ds(Rn("roads","road-straight"),i,0,{footprint:5.1,rotation:Math.PI/2,shadows:!1,parent:cs});for(let i=-20;i<=20;i+=5)ds(Rn("roads",i===0?"road-crossroad":"road-straight"),0,i,{footprint:5.1,shadows:!1,parent:cs});[-10,10].forEach(i=>{[-10,10].forEach(e=>ds(Rn("roads","road-bend"),i,e,{footprint:4.7,rotation:(i+e>0?1:0)*Math.PI/2,shadows:!1,parent:cs}))})}function lb(){qs=new Gt,qs.name="City scenery",ln.add(qs),[[-21,-20,"tree_oak",4.8],[-20,-9,"tree_default",4.3],[-21,7,"tree_oak",4.5],[-20,20,"tree_default",4.6],[21,-21,"tree_oak",4.8],[21,-8,"tree_default",4.2],[21,3,"tree_oak",4.4],[20,21,"tree_default",4.7],[-8,22,"tree_oak",4.1],[9,-22,"tree_default",4.4]].forEach(([t,n,s,r],o)=>ds(Rn("nature",s),t,n,{height:r,rotation:o*.73,parent:qs})),[[-8,-7],[8,7],[-8,7],[8,-7],[-19,14],[18,-12]].forEach(([t,n],s)=>ds(Rn("nature",s%2?"plant_bush":"grass_large"),t,n,{height:.75,rotation:s,parent:qs}))}function cb(){an.forEach((i,e)=>{let t=new Gt;t.name=`Location: ${i.id}`,ln.add(t),Uc.set(i.id,t),nb(i,t);let n=um(i),s=Math.atan2(n.x,n.y),r=im[i.id];if(r.building){let l=i.id==="airport"?new Ie(-4.7,1):i.id==="transit"?new Ie(4.5,0):null,c=i.npc.position[0]+(l?.x??n.x*4.1),u=i.npc.position[1]+(l?.y??n.y*4.1);ds(Rn("city",r.building),c,u,{height:i.id==="transit"?4.7:6.2,rotation:l?Math.atan2(-l.x,-l.y):s+Math.PI,color:i.color,parent:t})}r.props.forEach(([l,c,u,h,d,f,g=0])=>{let y=sb(u,h,s);ds(Rn(l,c),i.npc.position[0]+y.x,i.npc.position[1]+y.z,{height:d,rotation:s+f,y:g,color:i.color,parent:t})});let o=xd(i.npc.model,{x:i.npc.position[0],z:i.npc.position[1],height:1.68,rotation:s+Math.PI,color:i.color,parent:t});o.userData.locationId=i.id,xi.set(i.id,o);let a=ib(i.id==="airport"?"\u2708\uFE0F \uACF5\uD56D \uCD9C\uAD6D\uC7A5":`${i.icon} ${i.titleEn}`,i.id==="airport"?"\uD56D\uACF5\uC0AC \uCCB4\uD06C\uC778":i.titleKo,i.color);a.position.set(i.npc.position[0],3.25,i.npc.position[1]),t.add(a),gd.set(i.id,a),e%2===0&&i.id!=="airport"&&ds(Rn("nature","flower_yellowA"),i.npc.position[0]+3,i.npc.position[1]-2.4,{height:.55,rotation:e,parent:t}),i.id==="airport"&&(rb(t,i),ob(t,i))})}function _d({reposition:i=!1}={}){let e=er();if(!e||!Uc.size||Nc===e.id&&!i)return;let t=Nc!==e.id;Nc=e.id,Uc.forEach((s,r)=>{s.visible=r===e.id});let n=e.id==="airport";if(cs&&(cs.visible=!n),qs&&(qs.visible=!n),rd?.material?.color&&rd.material.color.set(n?11188162:8636781),od?.material?.color&&od.material.color.set(n?4351617:6858696),n||(ls=null,_.ambientBubble.classList.add("is-hidden")),Be&&(i||t&&Math.hypot(Be.position.x-e.npc.position[0],Be.position.z-e.npc.position[1])>13)){let s=um(e);Be.position.set(e.npc.position[0]-s.x*7.2,0,e.npc.position[1]-s.y*7.2),Q.position.x=Number(Be.position.x.toFixed(2)),Q.position.z=Number(Be.position.z.toFixed(2)),$s()}}function ub(){if(!(Nc==="airport"&&ps&&Be&&Bt&&Yt&&!_e&&_.worldConversation.classList.contains("is-hidden")&&!js())||!Qr.length){ls=null,_.ambientBubble.classList.add("is-hidden");return}let e=performance.now();if(ls&&e>=Vp&&(ls=null,_.ambientBubble.classList.add("is-hidden"),ad=e+2500),!ls&&e>=ad){let t=kp[Hp%kp.length];Hp+=1;let n=Qr[t.actor%Qr.length];ls=n,Vp=e+2800,_.ambientBubbleEn.textContent=t.en,_.ambientBubbleKo.textContent=t.ko,_.ambientBubble.classList.remove("is-hidden"),Yn(n,"interact-right",!1)}ls&&vb(_.ambientBubble,ls,2.05,0)}async function hm(){let i=os.find(n=>n.id===Q.avatarId)||os[0],e=vt?.position.clone()||new L(Q.position.x,0,Q.position.z),t=vt?.rotation.y||Math.PI;if(vt){ln.remove(vt);let n=vt.userData.mixer;if(n){let s=Dc.indexOf(n);s>=0&&Dc.splice(s,1),n.stopAllAction()}}vt=xd(i.model,{x:e.x,z:e.z,height:1.72,rotation:t,animation:"idle",color:6123753}),vt.name="Traveler",Be=vt,cd()}async function hb(){fa(70,"\uC5EC\uD589 \uAC70\uB9AC\uB97C \uAFB8\uBBF8\uB294 \uC911\u2026"),ab(),lb(),cb(),await hm(),_d(),fa(94,"NPC\uAC00 \uC624\uB298\uC758 \uB300\uD654\uB97C \uC5F0\uC2B5\uD558\uB294 \uC911\u2026")}function Zp(){return null}function js(){return!_.loadingScreen.classList.contains("is-hidden")||!_.welcome.classList.contains("is-hidden")||!_.rewardScreen.classList.contains("is-hidden")||!_.passportPanel.classList.contains("is-hidden")||!_.lifePanel.classList.contains("is-hidden")||!_.surpriseAlert.classList.contains("is-hidden")}function Oi(){let i=_i();if(!i){_.missionBadge.textContent=`\uBBF8\uC158 ${qn.length} / ${qn.length}`,_.missionTitle.textContent="\uC5EC\uD589 \uC601\uC5B4 \uC77C\uC815 \uC644\uC8FC!",_.missionGoal.textContent="",_.areaName.textContent="\uC5EC\uD589 \uC644\uB8CC";return}let e=er(i),t=fs(i);_.missionBadge.textContent=`\uBBF8\uC158 ${t} / ${qn.length}`,_.missionTitle.textContent=Hc(i),_.missionGoal.textContent="",_.areaName.textContent=e?.titleKo||"\uB2E4\uC74C \uC7A5\uC18C",_d()}function db(){if(_.interactButton.classList.add("is-hidden"),_.gameStage.classList.remove("is-interaction-ready"),!Be||!ps||js()){Fi=null;return}if(_e){let n=Math.hypot(Be.position.x-_e.npc.position[0],Be.position.z-_e.npc.position[1]);Fi=_e,n>5.35&&!yt?.canAdvance&&(Ys(),Oi(),pn("\uB300\uD654\uB97C \uC7A0\uC2DC \uBA48\uCDC4\uC5B4\uC694. \uB2E4\uC2DC \uAC00\uAE4C\uC774 \uAC00\uC11C \uB9D0 \uAC78\uAE30 \uBC84\uD2BC\uC744 \uB20C\uB7EC \uC774\uC5B4\uAC00\uC138\uC694.",3900));return}let i=er(),e=i?Math.hypot(Be.position.x-i.npc.position[0],Be.position.z-i.npc.position[1]):1/0,t=Fi?.id===i?.id?3.8:3.35;if(e<t){Fi=i;let n=_i();if(!n||n.locationId!==i.id){Oi();return}let s=n.npcOverride?.name||i.npc.name,r=n.npcOverride?.roleKo||i.npc.role;_.interactHint.textContent=`${s} \xB7 ${r}`,_.interactLabel.textContent="\uB9D0 \uAC78\uAE30",_.interactButton.setAttribute("aria-label",`${s}\uC5D0\uAC8C \uB9D0 \uAC78\uAE30`),_.interactButton.classList.remove("is-hidden"),_.gameStage.classList.add("is-interaction-ready"),Oi()}else Fi=null,Oi()}function Jp(){let i=_i();if(!Fi||_e||js()||_.interactButton.classList.contains("is-hidden")||i?.locationId!==Fi.id)return;try{window.speechSynthesis?.resume?.()}catch{}let e=Fi;_.interactButton.classList.add("is-hidden"),_.gameStage.classList.remove("is-interaction-ready"),vm(e,i)}function fb(){!Jr||!Be||(Jr.style.left=`${(Be.position.x+nn)/(nn*2)*100}%`,Jr.style.top=`${(nn-Be.position.z)/(nn*2)*100}%`)}function Oc(){if(!_.canvas||!_.missionWayfinder)return;let i=_.canvas.getBoundingClientRect();if(!i.width||!i.height)return;let e=_.missionWayfinder.offsetWidth||170,t=_.missionWayfinder.offsetHeight||52,n=e/2,s=t/2,r=_.topHud?.getBoundingClientRect(),o=_.toast.classList.contains("is-visible")?_.toast.getBoundingClientRect():null,a=Math.max(r?.bottom||i.top,o?.bottom||i.top),l=innerWidth<=820||window.matchMedia?.("(pointer: coarse)")?.matches,c=Math.min(l?185:85,i.height*.25),u=i.height-s-10,h=Math.min(u,a-i.top+s+12),d=Math.max(h,i.height-c-s);qt={left:n+12,right:Math.max(n+12,i.width-n-12),top:h,bottom:d}}function jp(){_.missionWayfinder.classList.add("is-hidden"),_.missionWayfinder.classList.remove("is-onscreen","is-edge")}function pb(){let i=_i(),e=er(i);if(!ps||!Be||!Bt||!Yt||!i||!e||_e||!_.worldConversation.classList.contains("is-hidden")||js()){jp();return}let t=e.npc.position[0]-Be.position.x,n=e.npc.position[1]-Be.position.z,s=Math.hypot(t,n);if(s<3.2){jp();return}Yp!==i.id?(Yp=i.id,ed=-1,_.wayfinderName.textContent=`${e.icon} ${e.titleKo}`,_.missionWayfinder.classList.remove("is-hidden"),Oc()):_.missionWayfinder.classList.remove("is-hidden");let r=Math.max(1,Math.ceil(s));r!==ed&&(ed=r,_.wayfinderDistance.textContent=`\uC57D ${r}m \uB0A8\uC74C`);let o=xi.get(e.id);o?o.getWorldPosition(oa):oa.set(e.npc.position[0],0,e.npc.position[1]),oa.y+=2.05,Bt.updateMatrixWorld(!0),Kp.copy(oa).applyMatrix4(Bt.matrixWorldInverse),aa.copy(oa).project(Bt),la.copy(Be.position),la.y+=1.05,la.project(Bt);let a=Yt.domElement.clientWidth||innerWidth,l=Yt.domElement.clientHeight||innerHeight,c=(aa.x*.5+.5)*a,u=(-aa.y*.5+.5)*l,h=(la.x*.5+.5)*a,d=(-la.y*.5+.5)*l,f=Kp.z<-Bt.near&&aa.z>=-1&&aa.z<=1,g=u-64,y=f&&Number.isFinite(c)&&Number.isFinite(g)&&c>=qt.left&&c<=qt.right&&g>=qt.top&&g<=qt.bottom,m,p,M;if(y)m=c,p=g,M=90,_.missionWayfinder.classList.add("is-onscreen"),_.missionWayfinder.classList.remove("is-edge");else{let w,S;f&&Number.isFinite(c)&&Number.isFinite(u)?(w=c-h,S=u-d):(Qh.set(t,0,n),Xp.setFromMatrixColumn(Bt.matrixWorld,0).normalize(),qp.setFromMatrixColumn(Bt.matrixWorld,1).normalize(),w=Qh.dot(Xp),S=-Qh.dot(qp)),(!Number.isFinite(w)||!Number.isFinite(S)||Math.hypot(w,S)<.001)&&(w=0,S=-1);let C=Lt.clamp(h,qt.left,qt.right),A=Lt.clamp(d,qt.top,qt.bottom),R=1/0;w>.001?R=Math.min(R,(qt.right-C)/w):w<-.001&&(R=Math.min(R,(qt.left-C)/w)),S>.001?R=Math.min(R,(qt.bottom-A)/S):S<-.001&&(R=Math.min(R,(qt.top-A)/S)),(!Number.isFinite(R)||R<0)&&(R=0),m=Lt.clamp(C+w*R,qt.left,qt.right),p=Lt.clamp(A+S*R,qt.top,qt.bottom),M=Math.atan2(S,w)*180/Math.PI,_.missionWayfinder.classList.add("is-edge"),_.missionWayfinder.classList.remove("is-onscreen")}_.missionWayfinder.style.left=`${m}px`,_.missionWayfinder.style.top=`${p}px`,_.wayfinderArrow.style.setProperty("--wayfinder-angle",`${M}deg`)}function mb(i){if(!Be||!ps||js()){Yn(vt,"idle");return}if(Sn.set(0,0,0),(wn.has("KeyW")||wn.has("ArrowUp"))&&(Sn.z-=1),(wn.has("KeyS")||wn.has("ArrowDown"))&&(Sn.z+=1),(wn.has("KeyA")||wn.has("ArrowLeft"))&&(Sn.x-=1),(wn.has("KeyD")||wn.has("ArrowRight"))&&(Sn.x+=1),Sn.x+=Fc.x,Sn.z+=Fc.y,Sn.lengthSq()>.025){Sn.normalize();let e=wn.has("ShiftLeft")||wn.has("ShiftRight")?6.2:4.25;Be.position.addScaledVector(Sn,e*i),Be.position.x=Lt.clamp(Be.position.x,-nn,nn),Be.position.z=Lt.clamp(Be.position.z,-nn,nn);let n=Math.atan2(Sn.x,Sn.z)-Be.rotation.y;n=Math.atan2(Math.sin(n),Math.cos(n)),Be.rotation.y+=n*Math.min(1,i*11),Yn(vt,e>5?"sprint":"walk"),Q.position.x=Number(Be.position.x.toFixed(2)),Q.position.z=Number(Be.position.z.toFixed(2))}else Yn(vt,"idle")}function gb(i,e){return Math.max(zv,Math.min(Hv,i-e*Vv))}function xb(i){if(!Be)return;Ic=Lt.lerp(Ic,sd,1-Math.exp(-i*10)),$h.set(Be.position.x+8.8,Be.position.y+8.2,Be.position.z+10.5),Zh.set(Be.position.x,Be.position.y+1.05+Ic,Be.position.z);let e=_e?xi.get(_e.id):null,t=e?1:0;if(Yr=Lt.lerp(Yr,t,1-Math.exp(-i*4.5)),e){as.copy(e.position).sub(Be.position),as.y=0,as.lengthSq()<1e-4&&as.set(0,0,1);let n=as.length();as.normalize();let s=Lt.clamp(n-.42,2.7,3.6);Jh.set(e.position.x-as.x*s,Be.position.y+1.5,e.position.z-as.z*s),jh.set(e.position.x,e.position.y+1.3+Ic*.5,e.position.z),Yh=!0}else Yh||(Jh.copy($h),jh.copy(Zh));Wp.copy($h).lerp(Jh,Yr),Gp.copy(Zh).lerp(jh,Yr),Bt.position.lerp(Wp,1-Math.exp(-i*4.3)),Bt.lookAt(Gp),vt&&(vt.visible=!e),Qr.forEach(n=>{n.visible=!e}),!e&&Yr<.005&&(Yh=!1)}function _b(i){if(Be&&(xi.forEach((e,t)=>{if(!Uc.get(t)?.visible||!an.find(r=>r.id===t))return;if(e.position.distanceTo(Be.position)<5.3||_e?.id===t){let o=Math.atan2(Be.position.x-e.position.x,Be.position.z-e.position.z)-e.rotation.y;o=Math.atan2(Math.sin(o),Math.cos(o)),e.rotation.y+=o*Math.min(1,i*5)}}),_e&&vt&&Sn.lengthSq()<=.025)){let e=xi.get(_e.id);if(e){let n=Math.atan2(e.position.x-vt.position.x,e.position.z-vt.position.z)-vt.rotation.y;n=Math.atan2(Math.sin(n),Math.cos(n)),vt.rotation.y+=n*Math.min(1,i*5)}}}function dm(){requestAnimationFrame(dm);let i=Math.min(id.getDelta(),.05);Dc.forEach(t=>t.update(i)),mb(i),xb(i),_b(i),db(),pb(),ub(),Mb(),fb();let e=id.elapsedTime;md.forEach((t,n)=>{t.rotation.z+=i*.35,t.position.y=.09+Math.sin(e*2.2+n.length)*.025}),Yt.render(ln,Bt)}function fm(){let i=_.canvas.getBoundingClientRect(),e=_.topHud.getBoundingClientRect(),t=_.conversationComposer.getBoundingClientRect(),n=_.toast.classList.contains("is-visible")?_.toast.getBoundingClientRect():null,s=Math.max(12,e.bottom-i.top+10,n?n.bottom-i.top+10:0),r=Math.min(i.height-12,t.height?t.top-i.top-14:i.height-12);return{left:12,right:Math.max(12,i.width-12),top:s,bottom:Math.min(i.height-12,Math.max(s+76,r)),width:i.width,height:i.height}}function ud(i,e,t,n,s){if(!i||!e||!Bt||!Yt||i.classList.contains("is-hidden"))return null;if(Ks.set(0,t,0),e.localToWorld(Ks),Ks.project(Bt),Ks.z<-1||Ks.z>1)return i.style.opacity="0",null;let r=(Ks.x*.5+.5)*s.width,o=(-Ks.y*.5+.5)*s.height,a=Math.max(120,s.right-s.left),l=i.classList.contains("player-world-bubble")?310:350;i.style.maxWidth=`${Math.min(l,a)}px`;let c=Math.min(a,i.offsetWidth||l),u=i.offsetHeight||72,h=r+n,d=Lt.clamp(h-c/2,s.left,Math.max(s.left,s.right-c)),f=i.classList.contains("is-latest")?28:0,g=Lt.clamp(o-u-14-f,s.top,Math.max(s.top,s.bottom-u));return{element:i,actorX:r,left:d,top:g,width:c,height:u,hidden:!1}}function yb(i,e){return!i||!e?!1:!(i.left+i.width+8<=e.left||e.left+e.width+8<=i.left||i.top+i.height+8<=e.top||e.top+e.height+8<=i.top)}function hd(i){if(i){if(i.hidden){i.element.style.opacity="0";return}i.element.style.left=`${i.left}px`,i.element.style.top=`${i.top}px`,i.element.style.setProperty("--bubble-tail-x",`${Lt.clamp(i.actorX-i.left,20,Math.max(20,i.width-20))}px`),i.element.style.opacity="1"}}function vb(i,e,t=2,n=0){let s=fm();hd(ud(i,e,t,n,s))}function bb(i,e){if(!i||i.classList.contains("is-hidden"))return null;let t=Math.max(120,e.right-e.left);i.style.maxWidth=`${Math.min(310,t)}px`;let n=Math.min(t,i.offsetWidth||310),s=i.offsetHeight||72,r=(e.left+e.right)/2;return{element:i,actorX:r,left:Lt.clamp(r-n/2,e.left,Math.max(e.left,e.right-n)),top:Math.max(e.top,e.bottom-s),width:n,height:s}}function Mb(){if(!_e||_.worldConversation.classList.contains("is-hidden"))return;let i=fm(),e=ud(_.npcWorldBubble,xi.get(_e.id),2.18,22,i),t=Yr>.6?bb(_.playerWorldBubble,i):ud(_.playerWorldBubble,vt,2.22,-22,i);if(yb(e,t)){let n=_.npcWorldBubble.classList.contains("is-latest")?e:t,s=n===e?t:e;if(n&&s){let r=s.top-n.height-10;if(r>=i.top)n.top=r;else{let o=n.top+n.height+10;o+s.height<=i.bottom?s.top=o:s.hidden=!0}}}hd(e),hd(t)}function Sb(){return window.speechSynthesis?.getVoices?.()||[]}function wb(){let i=/whisper|trinoids|zarvox|boing|bubbles|bells|cellos|bad news|good news|pipe organ|superstar|wobble|bahh|albert|fred|junior|kathy|ralph/i,e=Sb().filter(n=>/^en[-_]/i.test(n.lang)&&!i.test(n.name));return e.find(n=>/samantha|ava|allison|google us english|microsoft aria|serena|daniel/i.test(n.name))||e.find(n=>/en[-_]us/i.test(n.lang))||e[0]||null}function pm(){return"MediaRecorder"in window&&["audio/webm;codecs=opus","audio/webm","audio/mp4","audio/ogg"].find(i=>!MediaRecorder.isTypeSupported||MediaRecorder.isTypeSupported(i))||""}function Bc(i=ca){i?.getTracks?.().forEach(e=>e.stop()),i===ca&&(ca=null)}function $n({abortRequest:i=!0}={}){pd+=1,window.clearTimeout(da),da=null,i&&(us?.abort?.(),us=null);let e=Zs;if(Zs=null,e&&e.state!=="inactive")try{e.stop()}catch{}Bc(),jr=[],ha=null}function Tb(i){return new Promise((e,t)=>{let n=new FileReader;n.onload=()=>e(String(n.result||"")),n.onerror=()=>t(n.error||new Error("audio_read_failed")),n.readAsDataURL(i)})}function Lc(i,e,t){for(let n=0;n<t.length;n+=1)i.setUint8(e+n,t.charCodeAt(n))}async function Eb(i){let e=window.AudioContext||window.webkitAudioContext;if(!e)throw new Error("audio_context_unavailable");let t=new e;try{let n=await t.decodeAudioData((await i.arrayBuffer()).slice(0)),s=16e3,r=Math.max(1,Math.ceil(n.duration*s)),o=new Float32Array(r),a=Array.from({length:n.numberOfChannels},(h,d)=>n.getChannelData(d)),l=n.sampleRate/s;for(let h=0;h<r;h+=1){let d=Math.min(n.length-1,h*l),f=Math.floor(d),g=Math.min(n.length-1,f+1),y=d-f,m=0;for(let p of a)m+=p[f]+(p[g]-p[f])*y;o[h]=m/Math.max(1,a.length)}let c=new ArrayBuffer(44+o.length*2),u=new DataView(c);Lc(u,0,"RIFF"),u.setUint32(4,36+o.length*2,!0),Lc(u,8,"WAVE"),Lc(u,12,"fmt "),u.setUint32(16,16,!0),u.setUint16(20,1,!0),u.setUint16(22,1,!0),u.setUint32(24,s,!0),u.setUint32(28,s*2,!0),u.setUint16(32,2,!0),u.setUint16(34,16,!0),Lc(u,36,"data"),u.setUint32(40,o.length*2,!0);for(let h=0;h<o.length;h+=1){let d=Math.max(-1,Math.min(1,o[h]));u.setInt16(44+h*2,d<0?d*32768:d*32767,!0)}return new Blob([c],{type:"audio/wav"})}finally{try{await t.close()}catch{}}}function kc(i,{slower:e=!1,onEnd:t=null,onUnavailable:n=null}={}){let s=++ua;$n(),Je="idle";let r=String(i||"").trim();kt=!!r;let o=!1,a=!1,l=null,c=null,u=null,h=({unavailable:y=!1}={})=>{o||(o=!0,window.clearTimeout(l),window.clearTimeout(c),s===ua&&($r===u&&($r=null),kt=!1,y&&typeof n=="function"&&n(),typeof t=="function"&&t()))},d=window.speechSynthesis;if(!r||!Xs||!d||!("SpeechSynthesisUtterance"in window)){c=window.setTimeout(()=>h({unavailable:!!r}),r?180:0);return}if(d.speaking||d.pending||$r)try{d.cancel()}catch{}let f=new SpeechSynthesisUtterance(r);u=f,$r=f;let g=wb();g&&(f.voice=g),f.lang=g?.lang||"en-US",f.rate=e?.78:.9,f.pitch=1.02,f.volume=1,f.onstart=()=>{s===ua&&(a=!0,window.clearTimeout(l))},f.onend=()=>h(),f.onerror=()=>h({unavailable:!0});try{d.resume(),d.speak(f)}catch{h({unavailable:!0});return}l=window.setTimeout(()=>{!a&&!d.speaking&&!d.pending&&h({unavailable:!0})},4e3),c=window.setTimeout(()=>h({unavailable:!a}),Math.min(18e3,Math.max(4200,r.length*115)))}function Dt(i,e=""){_.worldVoiceState.className=`world-voice-state${e?` is-${e}`:""}`,_.worldVoiceState.querySelector("b").textContent=i}function to(i){let e=!!i;_.npcWorldBubble.classList.toggle("is-caption-visible",e),_.npcBubbleText.setAttribute("aria-hidden",String(!e)),_.npcWorldCaptionToggle.setAttribute("aria-expanded",String(e)),_.npcWorldCaptionToggle.textContent=e?"\u{1F648} \uC790\uB9C9 \uAC00\uB9AC\uAE30":"\u{1F440} \uC790\uB9C9 \uBCF4\uAE30"}function mm(){let i=!!_.worldReplyInput.value.trim(),e="learner";_e?kt||!Pn?e="npc-speaking":Zn||yt?.canAdvance||["stopping","sending"].includes(Je)?e="thinking":Je==="starting"?e="starting":Je==="listening"&&(e="listening"):e="closed",_.worldConversation.dataset.dialogueState=e,_.gameStage.dataset.dialogueState=e,_.worldConversation.classList.toggle("is-status-only",["npc-speaking","thinking","starting"].includes(e)),_.worldClearButton.classList.toggle("is-hidden",!i),_.npcWorldBubble.classList.toggle("is-speaking",kt),_.npcWorldReplay.disabled=kt||!_e||!!yt?.canAdvance}function Hi(i,{heardAs:e=""}={}){window.clearTimeout(rm);let t=String(i||"").trim();_.playerBubbleText.textContent=t;let n=String(e||"").trim(),s=o=>o.toLowerCase().replace(/[^a-z0-9]+/gi," ").trim(),r=!!t&&!!n&&s(n)!==s(t);_.playerBubbleHeard.textContent=r?`\u{1F3A7} \uB4E4\uB9B0 \uC18C\uB9AC: ${n}`:"",_.playerBubbleHeard.classList.toggle("is-hidden",!r),_.playerWorldBubble.classList.toggle("is-hidden",!t),t&&yd("player")}function yd(i){let e=i==="npc";_.npcWorldBubble.classList.toggle("is-latest",e),_.playerWorldBubble.classList.toggle("is-latest",!e),_.npcWorldBubble.classList.toggle("is-previous",!e),_.playerWorldBubble.classList.toggle("is-previous",e)}function gm(){return Le?.goals?.find(i=>!Xn.has(i.id))||null}function Ab(){let i=gm();return i?i.hintKo||i.labelKo||"\uBBF8\uC158\uC5D0 \uD544\uC694\uD55C \uB0B4\uC6A9 \uB9D0\uD558\uAE30":"\uD544\uC694\uD55C \uB0B4\uC6A9\uC744 \uD55C\uAD6D\uC5B4\uB85C \uC0DD\uAC01\uD574 \uBCF4\uC138\uC694"}function Gc(){_.worldHintPopup.classList.add("is-hidden")}function Cb(){let i=(Le?.hints||[]).length?Le.hints:[tr()?.target].filter(Boolean);return _.worldHintSentenceList.innerHTML="",i.slice(0,4).forEach(e=>{let t=document.createElement("button");t.type="button",t.className="world-hint-sentence",t.textContent=e,t.addEventListener("click",()=>{["starting","listening","stopping","transcribing"].includes(Je)&&$n(),_.worldReplyInput.value=e,_.answerInput.value=e,Je="captured",Hi(e),Dt("\u{1F4E1} \uC804\uC1A1 \uBC84\uD2BC\uC744 \uB204\uB974\uAC70\uB098, \uBB38\uC7A5\uC744 \uBCF4\uACE0 \uC9C1\uC811 \uB9D0\uD574 \uBCF4\uC138\uC694."),io(!1),tn(),_.worldReplyInput.focus()}),_.worldHintSentenceList.appendChild(t)}),i.length>0}function io(i){let e=!!i&&Cb();_.worldHintSentences.classList.toggle("is-hidden",!e),_.worldHintButton.setAttribute("aria-expanded",String(e))}function vd(){return!Le||!gm()?(Gc(),!1):(_.worldHintText.textContent=Ab(),_.worldHintPopup.querySelector("span").textContent="\u{1F4A1} \uB9D0\uD560 \uB0B4\uC6A9",_.worldHintPopup.classList.remove("is-hidden"),!0)}function xm(i,e=""){let t=r=>String(r||"").toLowerCase().replace(/[^a-z0-9]+/gi," ").trim(),n=String(e||"").trim(),s=!!n&&t(n)!==t(i);_.heardText.textContent=String(i||""),_.heardLiteralText.textContent=s?n:"",_.heardLiteralRow.classList.toggle("is-hidden",!s),_.heardBox.classList.remove("is-hidden")}function Rb(){!_e||Zn||kt||!Pn||yt?.canAdvance||($n(),Je="idle",_.worldReplyInput.value="",_.answerInput.value="",_.heardText.textContent="",_.heardLiteralText.textContent="",_.heardLiteralRow.classList.add("is-hidden"),_.heardBox.classList.add("is-hidden"),Hi(""),_.npcWorldBubble.classList.contains("is-hidden")||yd("npc"),Dt("\uBAA8\uB450 \uC9C0\uC6E0\uC5B4\uC694. \uBB34\uC804\uAE30 \uBC84\uD2BC\uC744 \uB204\uB974\uACE0 \uB2E4\uC2DC \uB9D0\uD574 \uBCF4\uC138\uC694."),tn(),_.worldReplyInput.focus())}function tn(){let i=!!_.worldReplyInput.value.trim(),e=Zn||kt||!Pn||!!yt?.canAdvance||!_e,t=["starting","stopping","transcribing","sending"].includes(Je);_.worldReplyInput.disabled=e,_.worldReplyInput.readOnly=["starting","listening","stopping","transcribing"].includes(Je),_.worldClearButton.disabled=e||!i&&!Zs&&!["starting","listening","stopping"].includes(Je),_.worldSendButton.setAttribute("aria-pressed",String(Je==="listening"));let n=i?"\u{1F4E1} \uC804\uC1A1":"\u{1F399}\uFE0F \uB20C\uB7EC\uC11C \uB9D0\uD558\uAE30";kt?n="\uC0C1\uB300\uBC29 \uB9D0 \uB4E3\uB294 \uC911\u2026":!Pn&&_e?n="\uC0C1\uB300\uBC29 \uC9C8\uBB38 \uC900\uBE44 \uC911\u2026":Zn||Je==="sending"||Je==="transcribing"?n="\uC74C\uC131\uACFC \uB73B \uD655\uC778 \uC911\u2026":Je==="starting"?n="\uB9C8\uC774\uD06C \uC5EC\uB294 \uC911\u2026":Je==="listening"?n="\u{1F4FB} \uB9D0 \uB05D\uB0B4\uACE0 \uC804\uC1A1":Je==="stopping"&&(n="\u{1F4E1} \uC804\uC1A1 \uC911\u2026"),_.worldSendButton.textContent=n,_.worldSendButton.disabled=e||t,mm()}function bd(){!_e||Zn||yt?.canAdvance||(kt=!1,Pn=!0,Je=_.worldReplyInput.value.trim()?"captured":"idle",vd(),Dt("\u{1F399}\uFE0F \uC774\uC81C \uC601\uC5B4\uB85C \uB300\uB2F5\uD574 \uBCF4\uC138\uC694."),tn())}function pa(i,{onEnd:e=bd}={}){_e&&(Pn=!1,_.worldReplyInput.blur(),_.npcBubbleText.textContent=i,to(!1),_.npcWorldBubble.classList.remove("is-hidden"),yd("npc"),kt=!!i,Dt(`\u{1F50A} ${_.npcBubbleName.textContent||"NPC"}\uAC00 \uB9D0\uD558\uACE0 \uC788\uC5B4\uC694`,"speaking"),tn(),kc(i,{onUnavailable:()=>to(!0),onEnd:()=>{_e&&(yt?.canAdvance&&Dt("\u2705 \uBBF8\uC158 \uC644\uB8CC! \uBCF4\uC0C1\uC744 \uC900\uBE44\uD558\uACE0 \uC788\uC5B4\uC694.","thinking"),mm(),typeof e=="function"&&e())}}))}function Ib(){if(!_e||kt)return;let i=_.npcBubbleText.textContent.trim();i&&(_.worldReplyInput.blur(),Pn=!1,kt=!0,Dt(`\u{1F50A} ${_.npcBubbleName.textContent||"NPC"}\uAC00 \uB2E4\uC2DC \uB9D0\uD558\uACE0 \uC788\uC5B4\uC694`,"speaking"),tn(),kc(i,{slower:!0,onUnavailable:()=>to(!0),onEnd:()=>{_e&&(yt?.canAdvance?tn():bd())}}))}function tr(){return Le?{id:Le.id,npc:Le.openingEn,npcKo:Le.openingKo,hintKo:Le.briefingKo,target:Le.hints?.[0]||"Could you help me, please?",accepts:Le.hints||[],correctionKo:"\uC815\uD574\uC9C4 \uBB38\uC7A5\uC744 \uC678\uC6B0\uC9C0 \uB9D0\uACE0 \uBBF8\uC158\uC5D0 \uD544\uC694\uD55C \uB73B\uC744 \uC790\uC720\uB86D\uAC8C \uC804\uD574 \uBCF4\uC138\uC694.",success:"Great! You completed the mission.",successKo:"\uD6CC\uB96D\uD574\uC694! \uBBF8\uC158\uC744 \uC131\uACF5\uD588\uC5B4\uC694."}:_e?.mission.turns[Vc]||null}function ma(i){_.npcLine.classList.toggle("is-hidden",!i),_.npcListenCue.classList.toggle("is-hidden",i),_.lineRevealToggle.setAttribute("aria-expanded",String(i)),_.lineRevealToggle.textContent=i?"\u{1F648} \uC601\uC5B4 \uBB38\uC7A5 \uAC00\uB9AC\uAE30":"\u{1F440} \uC601\uC5B4 \uBB38\uC7A5 \uBCF4\uAE30",i||Md(!1)}function Md(i){_.npcTranslation.classList.toggle("is-hidden",!i),_.translationToggle.setAttribute("aria-expanded",String(i)),_.translationToggle.textContent=i?"\uD55C\uAD6D\uC5B4 \uB73B \uB2EB\uAE30":"\uD55C\uAD6D\uC5B4 \uB73B \uBCF4\uAE30"}function _m(i){_.phraseChips.classList.toggle("is-hidden",!i),_.hintToggle.setAttribute("aria-expanded",String(i)),_.hintToggle.textContent=i?"\uBB38\uC7A5 \uB3C4\uC6C0 \uB2EB\uAE30":"\uBB38\uC7A5 \uB3C4\uC6C0"}function no(i){Zn=i;let e=!i&&!!yt?.canAdvance;_.answerZone.setAttribute("aria-busy",String(i)),_.evaluationProgress.classList.toggle("is-hidden",!i),[_.micButton,_.answerInput,_.answerSubmit,_.hintToggle].forEach(t=>{t.disabled=i||e}),_.phraseChips.querySelectorAll("button").forEach(t=>{t.disabled=i||e}),i&&Dt("\uC0C1\uB300\uBC29\uC774 \uB124 \uB9D0\uC758 \uB73B\uC744 \uC774\uD574\uD558\uB294 \uC911\u2026","thinking"),tn()}function Qs(){let i=tr(),e=Le?.id||Vc;return eo.get(e)||{en:i?.npc||"",ko:i?.npcKo||""}}function ym(){if(!Le)return;_.missionGoalList.innerHTML="",Le.goals.forEach(e=>{let t=document.createElement("span");t.className=`mission-goal${Xn.has(e.id)?" is-done":""}`,t.textContent=`${Xn.has(e.id)?"\u2713":"\u25CB"} ${e.labelKo}`,_.missionGoalList.appendChild(t)}),_.turnCount.textContent=`${Xn.size} / ${Le.goals.length}`;let i=Le.goals.filter(e=>!Xn.has(e.id));_.answerHint.textContent=i.length?`\uB0A8\uC740 \uBAA9\uD45C: ${i.map(e=>e.labelKo).join(" \xB7 ")}`:"\uD544\uC694\uD55C \uB73B\uC744 \uBAA8\uB450 \uC804\uB2EC\uD588\uC5B4\uC694!",_e&&(_.missionBadge.textContent=`\uBBF8\uC158 ${fs(Le)} / ${qn.length}`,_.missionTitle.textContent=Hc(Le),_.missionGoal.textContent="",_.areaName.textContent=_e.titleKo)}function Wc(){_.conversationTrailList.innerHTML="";let i=gi.slice(-3);_.historyToggle.classList.toggle("is-hidden",i.length===0),_.historyToggle.setAttribute("aria-expanded",String(Js)),_.historyToggle.textContent=Js?"\u{1F648} \uC9C0\uB09C \uB300\uD654 \uAC00\uB9AC\uAE30":"\u{1F4AC} \uC9C0\uB09C \uB300\uD654 \uBCF4\uAE30",_.conversationTrail.classList.toggle("is-hidden",i.length===0||!Js);let e=document.createDocumentFragment();i.forEach(t=>{let n=document.createElement("div");n.className="trail-line";let s=document.createElement("b");s.textContent="NPC \xB7 ",n.append(s,document.createTextNode(t.npc)),e.appendChild(n);let r=document.createElement("div");r.className="trail-line is-learner";let o=document.createElement("b");o.textContent="ME \xB7 ",r.append(o,document.createTextNode(t.learner)),e.appendChild(r)}),_.conversationTrailList.appendChild(e),_.conversationTrailList.scrollLeft=_.conversationTrailList.scrollWidth}function Pb(){yt=null,$n(),_.answerInput.value="",_.worldReplyInput.value="",Je="idle",Gc(),Hi(""),_.worldCoach.classList.add("is-hidden"),_.worldCoach.textContent="",_.heardBox.classList.add("is-hidden"),_.correctionCard.className="correction-card is-hidden",_.nextTurnButton.classList.add("is-hidden"),_.offlineContinueButton.classList.add("is-hidden"),_.retryButton.classList.remove("is-hidden"),_.retryButton.textContent="\u{1F399}\uFE0F \uB2E4\uC2DC \uB9D0\uD574 \uBCF4\uAE30",_.micButton.classList.remove("is-listening"),_.micButton.querySelector("b").textContent="\uB20C\uB7EC\uC11C \uB9D0\uD558\uAE30",no(!1)}function Lb({speakLine:i=!0}={}){let e=tr();if(!e||!_e||!Le)return;Pb();let t=Qs();_.npcName.textContent=Le.npcOverride?.name||_e.npc.name,_.npcRole.textContent=`${Le.npcOverride?.roleKo||_e.npc.role} \xB7 ${_e.titleEn}`,_.npcAvatar.textContent=Le.npcOverride?.icon||_e.icon,_.npcBubbleName.textContent=Le.npcOverride?.name||_e.npc.name,_.worldConversation.classList.remove("is-hidden"),_.dialogueMissionBrief.classList.remove("is-surprise"),_.dialogueMissionBadge.textContent=`\uBBF8\uC158 ${fs(Le)} / ${qn.length}`,_.dialogueMissionTitle.textContent=Hc(Le),_.dialogueMissionGoal.textContent=Le.briefingKo,ym(),_.npcLine.textContent=t.en,_.npcTranslation.textContent=t.ko,ma(!1),_.phraseChips.innerHTML="",(Le.hints||[e.target]).slice(0,3).forEach(n=>{let s=document.createElement("button");s.type="button",s.className="phrase-chip",s.textContent=n,s.addEventListener("click",()=>{_.answerInput.value=n,_.answerInput.focus()}),_.phraseChips.appendChild(s)}),Md(!1),_m(!1),i&&pa(t.en)}function vm(i,e=null){if(!i||_e)return;let t=_i();if(!t||t.locationId!==i.id||e&&e.id!==t.id){let o=er(t);o&&pn(`\uC9C0\uAE08\uC740 \uBBF8\uC158 ${fs(t)} \uCC28\uB840\uC608\uC694. ${o.titleKo}\uB85C \uC774\uB3D9\uD574 \uC8FC\uC138\uC694.`,3600);return}$n(),Kn?.abort(),In+=1,pi+=1;let n=ld.get(t.id);gi=Array.isArray(n?.history)?n.history.slice(-8):[],Js=!1,zi=null,io(!1),eo.clear(),n?.prompt?.en&&eo.set(t.id,n.prompt),am.clear(),Pn=!1,Le=t,Xn=new Set(n?.completedGoalIds||[]),mi=n?.missionStateToken||null,ki=Number(n?.attemptCount)||0,Wc(),_e=i,Vc=0,_.dialogue.classList.add("is-hidden"),_.worldConversation.classList.remove("is-hidden"),_.gameStage.classList.add("is-dialogue-open"),_.joystickWrap.classList.remove("is-hidden"),_.interactButton.classList.add("is-hidden");let s=gd.get(i.id);s&&(s.visible=!1);let r=xi.get(i.id);Yn(r,"interact-right",!1),Lb()}function Ys({discardSession:i=!1}={}){if(!i&&yt?.canAdvance){zc();return}Le&&(i?ld.delete(Le.id):(mi||gi.length)&&ld.set(Le.id,{completedGoalIds:[...Xn],missionStateToken:mi,attemptCount:ki,history:gi.slice(-8),prompt:eo.get(Le.id)||null})),ua+=1,$n(),Je="idle",kt=!1,Pn=!1,$r=null,Kn?.abort(),Kn=null,In+=1,pi+=1,no(!1),window.speechSynthesis?.cancel?.(),window.clearTimeout(rm);let e=_e,t=e?gd.get(e.id):null;t&&(t.visible=!0),_e&&Yn(xi.get(_e.id),"idle",!0),_e=null,Le=null,Xn=new Set,mi=null,ki=0,Vc=0,yt=null,zi=null,io(!1),gi=[],Js=!1,eo.clear(),am.clear(),Wc(),_.dialogue.classList.add("is-hidden"),_.worldConversation.classList.add("is-hidden"),_.worldConversation.classList.remove("is-status-only"),delete _.worldConversation.dataset.dialogueState,delete _.gameStage.dataset.dialogueState,_.gameStage.classList.remove("is-dialogue-open"),_.joystickWrap.classList.remove("is-hidden"),_.npcWorldBubble.classList.add("is-hidden"),_.playerWorldBubble.classList.add("is-hidden"),_.worldCoach.classList.add("is-hidden"),Gc(),_.npcWorldBubble.classList.remove("is-latest","is-previous"),_.playerWorldBubble.classList.remove("is-latest","is-previous"),_.worldReplyInput.value="",_.worldClearButton.classList.add("is-hidden"),to(!1),_.micButton.classList.remove("is-listening")}function Nb(i){return i.offlineCanContinue?"\u{1F308} \uC5F0\uACB0\uC774 \uB290\uB9AC\uC9C0\uB9CC \uB124 \uB9D0\uC740 \uD2C0\uB838\uB2E4\uACE0 \uCC98\uB9AC\uD558\uC9C0 \uC54A\uC544\uC694.":i.missionComplete?"\u{1F3C6} \uD544\uC694\uD55C \uB73B\uC744 \uBAA8\uB450 \uC804\uB2EC\uD574 \uBBF8\uC158\uC5D0 \uC131\uACF5\uD588\uC5B4\uC694!":i.decision==="progress"?"\u2705 \uC88B\uC544\uC694! \uB9D0\uD55C \uB0B4\uC6A9\uC774 \uBBF8\uC158\uC5D0 \uBC18\uC601\uB410\uC5B4\uC694.":i.status==="great"?"\u{1F31F} \uC88B\uC740 \uB300\uB2F5\uC774\uC5D0\uC694! \uB73B\uB3C4 \uBB38\uC7A5\uB3C4 \uC790\uC5F0\uC2A4\uB7EC\uC6CC\uC694.":i.status==="polish"?"\u2728 \uB73B\uC774 \uC798 \uD1B5\uD588\uC5B4\uC694! \uB124 \uB73B\uC744 \uC0B4\uB824 \uC870\uAE08\uB9CC \uB2E4\uB4EC\uC5C8\uC5B4\uC694.":i.status==="continue"?"\u{1F4AC} \uC88B\uC740 \uB300\uD654\uC608\uC694! NPC\uAC00 \uC790\uC5F0\uC2A4\uB7FD\uAC8C \uC774\uC5B4\uC11C \uBB3C\uC5B4\uBD10\uC694.":i.status==="uncertain"?"\u{1F3A7} \uD2C0\uB9B0 \uAC8C \uC544\uB2C8\uC5D0\uC694. \uB73B\uC744 \uD55C \uBC88\uB9CC \uB354 \uD655\uC778\uD560\uAC8C\uC694.":"\u{1F9ED} \uC9C0\uAE08 \uC5EC\uD589 \uC0C1\uD669\uC5D0 \uB9DE\uAC8C \uB300\uD654\uB97C \uC774\uC5B4\uAC00 \uBCFC\uAE4C\uC694?"}function dd(i,e,t,{recordHistory:n=!0}={}){let s=tr();if(!s||!_e||!Le)return;yt=i,Hi(e,{heardAs:i.literalHeardText}),Array.isArray(i.completedGoalIds)&&(Xn=new Set(i.completedGoalIds)),ym(),i.canAdvance?Gc():vd(),n&&(gi.push({npc:t,learner:e}),gi=gi.slice(-6),Wc()),xm(e,i.literalHeardText),_.correctionCard.className=`correction-card is-${i.status}`,_.correctionStatus.textContent=Nb(i),_.correctedSentence.textContent=i.corrected||e,_.correctionReason.textContent=i.explanationKo||"",_.nextTurnButton.classList.toggle("is-hidden",!i.canAdvance),_.offlineContinueButton.classList.toggle("is-hidden",!i.offlineCanContinue),_.retryButton.classList.toggle("is-hidden",!!i.canAdvance),_.nextTurnButton.textContent="\uBBF8\uC158 \uC131\uACF5 \xB7 \uBCF4\uC0C1 \uBC1B\uAE30 \u2192";let r=String(i.corrected||"").trim(),o=String(e||"").trim().replace(/[.!?]+$/,"").toLowerCase(),a=r.replace(/[.!?]+$/,"").toLowerCase(),l=!i.canAdvance&&(i.decision==="clarify"||i.status==="uncertain")&&(!r||a===o);_.correctedSentence.classList.toggle("is-hidden",l),_.correctedReplay.classList.toggle("is-hidden",l),r&&a&&a!==o?(_.worldCoach.textContent=`\u2728 \uB354 \uC790\uC5F0\uC2A4\uB7FD\uAC8C \uB9D0\uD558\uBA74: ${r}${i.explanationKo?` \xB7 ${i.explanationKo}`:""}`,_.worldCoach.classList.remove("is-hidden")):(_.worldCoach.classList.add("is-hidden"),_.worldCoach.textContent="");let c=i.npcReplyEn||(i.canAdvance?s.success:""),u=i.npcReplyKo||(i.canAdvance?s.successKo:"");if(i.canAdvance){zi=null,_.npcLine.textContent=c,_.npcTranslation.textContent=u,ma(!1),Yn(xi.get(_e.id),"emote-yes",!1);let h=Le.id;pa(c,{onEnd:()=>window.setTimeout(()=>{Le?.id===h&&yt?.canAdvance&&zc()},480)})}else{let h=i.decision==="clarify",d=h&&i.clarificationKind==="specific"&&i.npcReplyEn,f=c.includes("?"),g=h?"":i.followUpEn||(f?"":t),y=h?"":i.followUpKo||(f?"":Qs().ko||s.npcKo),m=h?i.npcReplyEn||"Sorry, could you say that again?":[c,g].filter(Boolean).join(" "),p=h?i.npcReplyKo||"\uBBF8\uC548\uD574\uC694. \uB2E4\uC2DC \uB9D0\uD574 \uC904\uB798\uC694?":[u,y].filter(Boolean).join(" ");h||eo.set(Le.id,{en:m,ko:p}),zi=h?{question:m,questionKo:p,sentence:d?String(e||"").trim():""}:null,_.npcLine.textContent=m,_.npcTranslation.textContent=p,ma(!1),_.retryButton.textContent=h?"\u{1F399}\uFE0F \uB2E4\uC2DC \uB9D0\uD558\uAE30":"\u{1F399}\uFE0F \uACC4\uC18D \uB300\uD654\uD558\uAE30",_.answerInput.value="",_.worldReplyInput.value="",Yn(xi.get(_e.id),"interact-right",!1),pa(m)}}function Db(i,e){let t=String(i||"").toLowerCase().replace(/rib[- ]?eye/g,"ribeye"),n={destination_city:/\bsunny city\b/,baggage_count:/\b(one|1|a single|only one)\b.*\b(bag|suitcase|luggage)\b|\b(bag|suitcase|luggage)\b.*\b(one|1|a single|only one)\b/,boarding_pass:/boarding pass|here (it|you) (is|are)|here you go/,electronics_out:/\b(laptop|computer|electronic|electronics|tablet|device)\b.*\b(out|remove|removed|take|taken|took)\b|\b(out|remove|removed|take|taken|took)\b.*\b(laptop|computer|electronic|electronics|tablet|device)\b/,seat_number:/\b18\s*a\b|\bseat\b.*\b(where|find|help|which|row)\b|\b(where|find|help|which|row)\b.*\bseat\b/,overhead_bag:/\b(overhead|compartment|bin)\b.*\b(bag|carry-on|carry on|luggage|put|place)\b|\b(bag|carry-on|carry on|luggage|put|place)\b.*\b(overhead|compartment|bin)\b/,meal_choice:/\b(chicken|pasta|meal|lunch|vegetarian|vegan|fish|beef|rice|sandwich)\b/,drink_request:/\b(water|juice|coffee|tea|soda|cola|coke|lemonade|milk|drink)\b/,baggage_carousel:/\b(carousel|baggage belt|belt|claim area)\b/,bag_description:/\b(bag|suitcase|luggage)\b.*\b(black|red|blue|green|yellow|white|gray|grey|brown|pink|purple|orange|large|big|medium|small|ribbon|tag|wheel|wheels|hard|soft)\b|\b(black|red|blue|green|yellow|white|gray|grey|brown|pink|purple|orange|large|big|medium|small|ribbon|tag|wheel|wheels|hard|soft)\b.*\b(bag|suitcase|luggage)\b/,taxi_available:/\b(taxi|cab|ride|available|free|take me|drive me)\b/,hotel_destination:/\b(sunny garden hotel|hotel)\b/,fare_question:/\b(fare|cost|price|how much|charge|expensive)\b/,luggage_help:/\b(bag|bags|suitcase|suitcases|luggage|trunk|boot)\b.*\b(help|put|load|carry|lift|take)\b|\b(help|put|load|carry|lift|take)\b.*\b(bag|bags|suitcase|suitcases|luggage|trunk|boot)\b/,reservation_name:/\b(reservation|booking|under|name is|booked)\b/,taxi_request:/\b(taxi|cab)\b.*\b(call|arrange|book|get|need|want|send)\b|\b(call|arrange|book|get|need|want|send)\b.*\b(taxi|cab)\b/,pickup_time:/\b(at\s+around|at|around|by)\s+((\d{1,2})(:\d{2})?\s*(a\s*m|p\s*m)?|(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)(\s+(twenty|thirty|forty|fifty))?(\s+(o'?clock|a\s*m|p\s*m))?)\b/,restaurant_destination:/\b(riverside steakhouse|steakhouse|restaurant|diner|cafe)\b/,table_request:/\b(table|seat|seating|reservation)\b/,extra_order:/\b(also|another|extra|more|side|fries|salad|soup|bread|dessert|cake|ice cream|order|have|get|bring)\b/,water_request:/\bwater\b/,bill_request:/\b(bill|check|receipt)\b/,card_payment:/\b(card|credit|debit|visa|mastercard|contactless|apple pay|google pay)\b/,checkout_request:/\b(check out|checking out|checkout|leave the hotel|leaving the hotel)\b/,minibar_none:/\bminibar\b.*\b(nothing|none|no|not|didn't|did not|haven't|have not|never)\b|\b(nothing|none|no|not|didn't|did not|haven't|have not|never)\b.*\bminibar\b/,luggage_storage:/\b(bag|bags|suitcase|suitcases|luggage)\b.*\b(hold|store|keep|leave|watch)\b|\b(hold|store|keep|leave|watch)\b.*\b(bag|bags|suitcase|suitcases|luggage)\b/,airport_destination:/\bairport\b/,terminal_question:/\bterminal\b/,gate_twelve:/\bgate\b.*\b(twelve|12)\b|\b(twelve|12)\b.*\bgate\b/,boarding_time:/\b(boarding|board|flight)\b.*\b(when|what time|time|begin|start|starts|close|closes|final)\b|\b(when|what time|time)\b.*\b(boarding|board|flight)\b/,passport:/passport|here (it|you) (is|are)/,purpose:/vacation|holiday|visit|family|grandmother|grandfather|work|study|business|travel/,duration:/\b(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s*(day|days|night|nights|week|weeks|month|months)\b/,towels:/towel/,quantity_two:/\b(two|2|a couple|couple of)\b/,polite_request:/please|could (i|you|we)|would (i|you|we)|may i/,steak:/\bsteak\b/,ribeye:/\bribeye\b/,two_drinks:/\b(two|2|a couple)\b.*\b(drink|drinks|coke|cokes|juice|juices|water|waters|soda|sodas|lemonade|lemonades)\b|\b(coke|juice|water|soda|lemonade)\b.*\b(and|plus)\b.*\b(coke|juice|water|soda|lemonade)\b/,jacket:/jacket/,navy_medium:/navy.*\b(m|medium)\b|\b(m|medium)\b.*navy/,try_on:/try (it|this|the jacket) on|try on/,museum_destination:/museum/,round_trip:/round[- ]?trip|return ticket/,platform:/platform/,two_child_tickets:/\b(two|2)\b.*child|child.*\b(two|2)\b/,photo_rule:/photo|picture|camera/,two_bikes:/\b(two|2)\b.*bike|bike.*\b(two|2)\b/,one_hour:/\b(one|1|an)\s*hour\b/,helmets:/helmet/,stomachache:/stomach|tummy|belly/,dizzy:/dizz|lightheaded/,pharmacy:/pharmacy|drugstore/,getting_ready:/getting ready|preparing|go out|going out/,one_hour_later:/\b(one|1|an)\s*hour\b/,polite:/please|could|would|thank/};return e.goals.filter(s=>n[s.id]?.test(t)).map(s=>s.id)}function Ub(i,e,t){let n=Bp(i,t,{confidence:e});return{status:"uncertain",decision:(Le?Db(i,Le):[]).length?"continue":"clarify",canAdvance:!1,missionComplete:!1,offlineCanContinue:!0,completedGoalIds:[...Xn],missingGoalIds:Le?.goals.map(r=>r.id).filter(r=>!Xn.has(r))||[],corrected:n.corrected||i||t.target,explanationKo:"\uC5F0\uACB0\uC774 \uB290\uB824 \uC11C\uBC84\uAC00 \uB73B\uC744 \uD655\uC778\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694. \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uAC70\uB098 \uBCF4\uC0C1 \uC5C6\uC774 \uC774\uBC88 \uC5F0\uC2B5\uB9CC \uB05D\uB0BC \uC218 \uC788\uC5B4\uC694.",npcReplyEn:"I couldn't check your answer because the connection is slow.",npcReplyKo:"\uC5F0\uACB0\uC774 \uB290\uB824 \uB300\uB2F5\uC744 \uD655\uC778\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694.",followUpEn:Qs().en,followUpKo:Qs().ko,reward:null}}async function fd(i,e=null,t=[]){let n=tr();if(!n||!_e||!Le||Zn||yt?.canAdvance)return;let s=String(i||"").trim().slice(0,240);if(!s){Dt("\uBA3C\uC800 \uC601\uC5B4\uB85C \uB9D0\uD574 \uC8FC\uC138\uC694. \uC9C1\uC811 \uC801\uC5B4\uB3C4 \uAD1C\uCC2E\uC544\uC694."),_.worldReplyInput.focus();return}zi?.sentence&&$v.test(s)&&(s=zi.sentence),$n(),io(!1),Je="sending",Hi(s);let r=++pi,o=In,a=_e.id,l=Le.id,c=zi?.question||Qs().en;Kn?.abort(),Kn=new AbortController;let u=window.setTimeout(()=>Kn?.abort(),10500);xm(s),_.correctionCard.classList.add("is-hidden"),no(!0);try{let h=await fetch("/api/english-travel-dialogue",{method:"POST",headers:{"Content-Type":"application/json"},cache:"no-store",signal:Kn.signal,body:JSON.stringify({v:2,mode:"mission",locationId:a,missionId:l,reply:s,speechConfidence:Number.isFinite(e)?e:null,alternatives:Array.isArray(t)?t.slice(0,3):[],currentNpcLine:c,missionStateToken:mi,attemptCount:ki,history:gi.slice(-8)})}),d=await h.json().catch(()=>null);if(!h.ok||!d?.ok)throw new Error(d?.code||`dialogue_${h.status}`);if(r!==pi||o!==In||_e?.id!==a||Le?.id!==l)return;mi=typeof d.missionStateToken=="string"?d.missionStateToken:mi,ki+=1,dd(d,s,c)}catch{if(r!==pi||o!==In||_e?.id!==a||Le?.id!==l)return;ki+=1,dd(Ub(s,e,n),s,c)}finally{window.clearTimeout(u),r===pi&&o===In&&(Kn=null,no(!1))}}function zc(){let i=_e,e=Le;if(!i||!e||!yt?.canAdvance)return;let t=yt.reward||{...e.reward,grantId:`${e.id}:reward-v1`},n=!Q.rewardGrants.includes(t.grantId),s=!1;n&&(Q.rewardGrants.push(t.grantId),Q.xp+=t.xp,Q.coins+=t.coins,Q.needs.confidence=cn(Q.needs.confidence+10),Q.needs.food=cn(Q.needs.food-4),Q.needs.energy=cn(Q.needs.energy-5),i.id==="restaurant"&&(Q.needs.food=cn(Q.needs.food+18)),i.id==="hotel"&&(Q.needs.energy=cn(Q.needs.energy+10)),s=!0),Q.completedMissions.includes(e.id)||(Q.completedMissions.push(e.id),s=!0),Q.completed.includes(i.id)||(Q.completed.push(i.id),s=!0),tm.get(e.id)===Q.missionStep&&(Q.missionStep=Math.min(qn.length,Q.missionStep+1),s=!0),s&&$s(),Ys({discardSession:!0}),_.rewardIcon.textContent=i.icon,_.rewardTitle.textContent=`${Hc(e)} \uC131\uACF5!`,_.rewardPhrase.textContent="\uC2E4\uC81C \uC5EC\uD589 \uC21C\uC11C \uC18D\uC5D0\uC11C \uD544\uC694\uD55C \uB73B\uC744 \uC601\uC5B4\uB85C \uC815\uD655\uD788 \uC804\uB2EC\uD588\uC5B4\uC694.",_.rewardXp.textContent=n?`+${t.xp} XP`:"\uC644\uB8CC",_.rewardCoins.textContent=n?`+${t.coins}`:"\uBCF4\uC0C1 \uC218\uB839 \uC644\uB8CC",_.rewardExtra.textContent=`\uBBF8\uC158 ${fs(e)} \uC644\uB8CC`;let o=_i();_.rewardContinue.textContent=o?`${fs(o)}\uBC88 \uBBF8\uC158\uC73C\uB85C \u2192`:"\uC644\uC8FC \uACB0\uACFC \uBCF4\uAE30 \u2192",_.rewardScreen.classList.remove("is-hidden"),hs()}function Fb(i){let e=i.effects||{},t=[];return e.food&&t.push(`\uBC30\uBD80\uB984 ${e.food>0?"+":""}${e.food}`),e.energy&&t.push(`\uC5D0\uB108\uC9C0 ${e.energy>0?"+":""}${e.energy}`),e.confidence&&t.push(`\uC790\uC2E0\uAC10 ${e.confidence>0?"+":""}${e.confidence}`),e.xp&&t.push(`XP +${e.xp}`),i.rest&&t.push(`\uD734\uC2DD +${i.rest}`),t.join(" \xB7 ")||"\uC5EC\uD589 \uC2A4\uD0C0\uC77C \uC544\uC774\uD15C"}function bm(i){return i.tier===1&&Q.missionStep<10?"\uBBF8\uC158 10 \uC644\uB8CC \uD6C4 \uC774\uC6A9":i.tier===2&&Q.missionStep<16?"\uBBF8\uC158 16 \uC644\uB8CC \uD6C4 \uC774\uC6A9":""}function ga(i=Nt){window.clearTimeout(Pc),Pc=null,Nt=Wn[i]?i:"food",_.lifeCoinCount.textContent=String(Q.coins),_.lifePanel.querySelectorAll("[data-life-tab]").forEach(a=>{a.classList.toggle("is-active",a.dataset.lifeTab===Nt)});let e=Wn.outfits.find(a=>a.id===Q.equippedOutfit),t=Wn.lodgings.find(a=>a.id===Q.currentLodging)||Wn.lodgings[0];_.lifeCurrent.innerHTML="";let n=document.createElement("span");n.textContent=`${e?.icon||"\u{1F455}"} \uC2A4\uD0C0\uC77C: ${e?.nameKo||"\uAE30\uBCF8 \uC5EC\uD589\uBCF5"} \xB7 ${t.icon} \uC219\uC18C: ${t.nameKo}`,_.lifeCurrent.appendChild(n);let s=document.createElement("span");s.textContent=`\u{1F37D}\uFE0F ${Math.round(cn(Q.needs.food))} \xB7 \u26A1 ${Math.round(cn(Q.needs.energy))} \xB7 \u{1F49B} ${Math.round(cn(Q.needs.confidence))}`,_.lifeCurrent.appendChild(s);let r=document.createElement("button");r.type="button";let o=Math.max(0,6e4-(Date.now()-Q.lastRestAt));r.disabled=o>0||Q.needs.energy>=99,r.textContent=o>0?`\uD734\uC2DD ${Math.ceil(o/1e3)}\uCD08 \uD6C4`:Q.needs.energy>=99?"\uC5D0\uB108\uC9C0 \uAC00\uB4DD":`\uC219\uC18C\uC5D0\uC11C \uD734\uC2DD +${t.rest}`,r.addEventListener("click",()=>{Date.now()-Q.lastRestAt<6e4||(Q.lastRestAt=Date.now(),Q.needs.energy=cn(Q.needs.energy+t.rest),$s(),hs(),ga(Nt),pn(`${t.icon} ${t.nameKo}\uC5D0\uC11C \uD479 \uC26C\uC5C8\uC5B4\uC694. \uC5D0\uB108\uC9C0 +${t.rest}`,3800))}),_.lifeCurrent.appendChild(r),o>0&&(Pc=window.setTimeout(()=>{Pc=null,_.lifePanel.classList.contains("is-hidden")||ga(Nt)},o+80)),_.lifeCatalog.innerHTML="",(Wn[Nt]||[]).forEach(a=>{let l=document.createElement("article");l.className="life-item";let c=document.createElement("span");c.textContent=a.icon;let u=document.createElement("strong");u.textContent=a.nameKo;let h=document.createElement("small");h.textContent=Fb(a);let d=document.createElement("button");d.type="button";let f=!1,g=!1,y="";Nt==="outfits"?(f=Q.ownedOutfits.includes(a.id),g=Q.equippedOutfit===a.id):Nt==="activities"?f=Q.completedActivities.includes(a.id):Nt==="lodgings"&&(f=Q.ownedLodgings.includes(a.id),g=Q.currentLodging===a.id,y=bm(a)),l.classList.toggle("is-owned",f),g?d.textContent=Nt==="lodgings"?"\uD604\uC7AC \uC219\uC18C":"\uC785\uB294 \uC911":f?d.textContent=Nt==="outfits"?"\uC785\uAE30":Nt==="lodgings"?"\uC774 \uC219\uC18C\uB85C \uC774\uB3D9":"\uCCB4\uD5D8 \uC644\uB8CC":y?d.textContent=y:d.textContent=`\u{1FA99} ${a.price} \xB7 ${Nt==="food"?"\uBA39\uAE30":Nt==="activities"?"\uC990\uAE30\uAE30":"\uAD6C\uC785"}`;let m=Nt==="food"&&Q.needs.food>=98;d.disabled=g||!!y||m||!f&&Q.coins<a.price,d.addEventListener("click",()=>Ob(Nt,a.id)),l.append(c,u,h,d),_.lifeCatalog.appendChild(l)}),_.lifeHelp.textContent=Nt==="food"?"\uBC30\uAC00 \uACE0\uD50C \uB54C \uC74C\uC2DD\uC744 \uC0AC \uBA39\uC73C\uBA74 \uCEE8\uB514\uC158\uC774 \uD68C\uBCF5\uB3FC\uC694.":Nt==="outfits"?"\uAD6C\uC785\uD55C \uC5EC\uD589 \uC2A4\uD0C0\uC77C\uC740 \uC5B8\uC81C\uB4E0 \uB2E4\uC2DC \uC785\uC744 \uC218 \uC788\uC5B4\uC694.":Nt==="activities"?"\uC561\uD2F0\uBE44\uD2F0\uB294 \uD55C \uBC88 \uD574\uAE08\uB418\uBA70 XP\uC640 \uC790\uC2E0\uAC10\uC744 \uC5BB\uC5B4\uC694.":"\uC88B\uC740 \uC219\uC18C\uB85C \uC62E\uAE30\uBA74 \uD734\uC2DD\uD560 \uB54C \uC5D0\uB108\uC9C0\uAC00 \uB354 \uB9CE\uC774 \uD68C\uBCF5\uB3FC\uC694."}function Qp(i={}){i.food&&(Q.needs.food=cn(Q.needs.food+i.food)),i.energy&&(Q.needs.energy=cn(Q.needs.energy+i.energy)),i.confidence&&(Q.needs.confidence=cn(Q.needs.confidence+i.confidence)),i.xp&&(Q.xp+=i.xp)}function Ob(i,e){let t=Wn[i]?.find(n=>n.id===e);if(t){if(i==="outfits"&&Q.ownedOutfits.includes(t.id))Q.equippedOutfit=t.id,cd(),pn(`${t.icon} ${t.nameKo}\uC73C\uB85C \uAC08\uC544\uC785\uC5C8\uC5B4\uC694!`,3200);else if(i==="lodgings"&&Q.ownedLodgings.includes(t.id))Q.currentLodging=t.id,pn(`${t.icon} ${t.nameKo}\uC73C\uB85C \uC219\uC18C\uB97C \uC62E\uACBC\uC5B4\uC694!`,3400);else if(i==="activities"&&Q.completedActivities.includes(t.id)){pn(`${t.icon} \uC774\uBBF8 \uC990\uAE34 \uC561\uD2F0\uBE44\uD2F0\uC608\uC694. \uC5EC\uD589 \uCD94\uC5B5\uC5D0 \uC800\uC7A5\uB418\uC5B4 \uC788\uC5B4\uC694.`,3200);return}else{if(bm(t)||Q.coins<t.price)return;Q.coins-=t.price,i==="food"&&Qp(t.effects),i==="outfits"&&(Q.ownedOutfits.push(t.id),Q.equippedOutfit=t.id,cd()),i==="activities"&&(Q.completedActivities.push(t.id),Qp(t.effects),Yn(vt,"emote-yes",!1)),i==="lodgings"&&(Q.ownedLodgings.includes(t.id)||Q.ownedLodgings.push(t.id),Q.currentLodging=t.id),pn(`${t.icon} ${t.nameKo} ${i==="food"?"\uB9DB\uC788\uAC8C \uBA39\uC5C8\uC5B4\uC694!":i==="activities"?"\uCCB4\uD5D8 \uC644\uB8CC!":"\uAD6C\uC785 \uC644\uB8CC!"}`,3600)}$s(),hs(),ga(i)}}function Bi(i){return!!(i&&i.captureId===pd&&i.dialogueSession===In&&i.missionId===Le?.id&&i.locationId===_e?.id&&i.turnId===tr()?.id)}async function Bb(){if(!_e||Zn||kt||!Pn||yt?.canAdvance||["starting","listening","stopping","transcribing","sending"].includes(Je))return;if(!("MediaRecorder"in window)||!navigator.mediaDevices?.getUserMedia){Je=_.worldReplyInput.value.trim()?"captured":"idle",Dt("\uC774 \uBE0C\uB77C\uC6B0\uC800\uC5D0\uC11C\uB294 \uC544\uB798 \uCE78\uC5D0 \uC601\uC5B4\uB97C \uC9C1\uC811 \uC801\uACE0 \uC804\uC1A1\uD574 \uC8FC\uC138\uC694."),_.worldReplyInput.focus(),tn();return}$n(),io(!1);let i={captureId:++pd,dialogueSession:In,missionId:Le.id,locationId:_e.id,turnId:tr()?.id};ha=i,Je="starting",_.worldReplyInput.value="",_.answerInput.value="",_.heardBox.classList.add("is-hidden"),Hi(""),Dt("\u{1F399}\uFE0F \uB9C8\uC774\uD06C\uB97C \uC5EC\uB294 \uC911\u2026","thinking"),tn();let e;try{if(e=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:!0,noiseSuppression:!0,autoGainControl:!0}}),!Bi(i)){Bc(e);return}let t=pm(),n=t?new MediaRecorder(e,{mimeType:t}):new MediaRecorder(e),s=[];n.addEventListener("dataavailable",r=>{r.data?.size&&s.push(r.data)}),n.addEventListener("error",()=>{Bi(i)&&($n({abortRequest:!1}),Je="idle",Dt("\uB9C8\uC774\uD06C \uB179\uC74C\uC744 \uC2DC\uC791\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694. \uB2E4\uC2DC \uB20C\uB7EC \uC8FC\uC138\uC694."),tn())},{once:!0}),ca=e,Zs=n,jr=s,n.start(250),Je="listening",_.micButton.classList.add("is-listening"),_.micButton.querySelector("b").textContent="\uC601\uC5B4\uB85C \uB9D0\uD574 \uBCF4\uC138\uC694\u2026",Dt("\uB4E3\uACE0 \uC788\uC5B4\uC694. \uB2E4 \uB9D0\uD588\uC73C\uBA74 \uAC19\uC740 \uBC84\uD2BC\uC744 \uB20C\uB7EC \uC804\uC1A1\uD558\uC138\uC694.","listening"),da=window.setTimeout(()=>{!Bi(i)||Je!=="listening"||(Dt("\uB9D0\uD558\uAE30 \uC2DC\uAC04\uC774 \uB418\uC5B4 \uC790\uB3D9\uC73C\uB85C \uC804\uC1A1\uD560\uAC8C\uC694.","thinking"),Mm())},2e4),tn()}catch(t){if(Bc(e),!Bi(i))return;$n({abortRequest:!1}),Je="idle";let n=t?.name==="NotAllowedError"||t?.name==="SecurityError";Dt(n?"\uB9C8\uC774\uD06C \uAD8C\uD55C\uC774 \uAEBC\uC838 \uC788\uC5B4\uC694. \uC544\uB798 \uCE78\uC5D0 \uC601\uC5B4\uB97C \uC9C1\uC811 \uC801\uC5B4 \uC8FC\uC138\uC694.":"\uB9C8\uC774\uD06C\uB97C \uC5F4\uC9C0 \uBABB\uD588\uC5B4\uC694. \uB2E4\uC2DC \uB204\uB974\uAC70\uB098 \uC601\uC5B4\uB97C \uC9C1\uC811 \uC801\uC5B4 \uC8FC\uC138\uC694."),_.worldReplyInput.focus(),tn()}}function kb(i){let e=Zs,t=ca,n=jr;return window.clearTimeout(da),da=null,e?new Promise(s=>{let r=!1,o=()=>{if(r)return;r=!0,window.clearTimeout(a);let l=e.mimeType||pm()||"audio/webm",c=n.length?new Blob(n,{type:l}):null;Bc(t),Zs===e&&(Zs=null),jr===n&&(jr=[]),s(Bi(i)?c:null)},a=window.setTimeout(o,1800);if(e.addEventListener("stop",o,{once:!0}),e.state==="inactive")o();else{try{e.requestData()}catch{}try{e.stop()}catch{o()}}}):Promise.resolve(null)}async function zb(i,e){if(!i||i.size<500||!Bi(e)){Je="idle",Dt("\uBAA9\uC18C\uB9AC\uB97C \uB4E3\uC9C0 \uBABB\uD588\uC5B4\uC694. \uBC84\uD2BC\uC744 \uB20C\uB7EC \uB2E4\uC2DC \uB9D0\uD574 \uC8FC\uC138\uC694."),tn();return}let t=++pi,n=In,s=_e.id,r=Le.id,o=zi?.question||Qs().en,a=zi?.sentence||"",l=!1;Kn?.abort(),us?.abort(),us=new AbortController,Kn=us;let c=window.setTimeout(()=>us?.abort(),28500);Je="transcribing",no(!0),Dt("\uC6D0\uB798 \uC74C\uC131\uACFC \uC9C0\uAE08 \uC0C1\uD669\uC744 \uD568\uAED8 \uC774\uD574\uD558\uB294 \uC911\u2026","thinking");try{let u=i;try{u=await Eb(i)}catch{}if(!Bi(e))return;let h=await Tb(u);if(!Bi(e))return;let d=await fetch("/api/english-travel-speech",{method:"POST",headers:{"Content-Type":"application/json"},cache:"no-store",signal:us.signal,body:JSON.stringify({v:1,audio:h,mime:u.type,locationId:s,missionId:r,currentNpcLine:o,confirmationQuestion:a?o:void 0,confirmationSentence:a||void 0,missionStateToken:mi,attemptCount:ki,history:gi.slice(-8)})}),f=await d.json().catch(()=>null);if(!d.ok||!f?.ok||!f.heardText)throw new Error(f?.code||`speech_${d.status}`);if(t!==pi||n!==In||_e?.id!==s||Le?.id!==r)return;let g=String(f.heardText).trim().slice(0,240);mi=typeof f.missionStateToken=="string"?f.missionStateToken:mi,ki+=1,_.answerInput.value=g,_.worldReplyInput.value=g,dd(f,g,o)}catch{if(t!==pi||n!==In||_e?.id!==s||Le?.id!==r)return;ki+=1,Je="idle",_.answerInput.value="",_.worldReplyInput.value="",_.heardBox.classList.add("is-hidden"),Hi(""),vd(),l=!0}finally{window.clearTimeout(c),jr=[],ha=null,t===pi&&n===In&&(us=null,Kn=null,no(!1),l&&_e&&!kt&&(_.npcLine.textContent="Sorry, could you say that again?",_.npcTranslation.textContent="\uBBF8\uC548\uD574\uC694. \uB2E4\uC2DC \uB9D0\uD574 \uC904\uB798\uC694?",pa("Sorry, could you say that again?")))}}async function Mm(){if(Je!=="listening"||!ha)return;let i=ha;Je="stopping",_.micButton.classList.remove("is-listening"),_.micButton.querySelector("b").textContent="\uB20C\uB7EC\uC11C \uB9D0\uD558\uAE30",Dt("\uC6D0\uB798 \uC74C\uC131\uC744 \uC804\uC1A1\uD560 \uC900\uBE44 \uC911\u2026","thinking"),tn();let e=await kb(i);Bi(i)&&await zb(e,i)}function td(){if(!(!_e||Zn||kt||!Pn||yt?.canAdvance)){if(Je==="listening"){Mm();return}if(!["starting","stopping","transcribing","sending"].includes(Je)){if(_.worldReplyInput.value.trim()){Hb();return}Bb()}}}function Hb(){if(!_e||Zn||kt||!Pn||yt?.canAdvance)return;let i=_.worldReplyInput.value.trim();if(!i){Dt("\uBA3C\uC800 \uC601\uC5B4\uB85C \uB9D0\uD574 \uC8FC\uC138\uC694. \uC9C1\uC811 \uC801\uC5B4\uB3C4 \uAD1C\uCC2E\uC544\uC694."),_.worldReplyInput.focus();return}Je="sending",Hi(i),Dt("\uC804\uC1A1\uD588\uC5B4\uC694. \uC0C1\uB300\uBC29\uC774 \uC0DD\uAC01\uD558\uB294 \uC911\u2026","thinking"),tn(),fd(i)}function Vb(){_.startButton.addEventListener("click",()=>{let i=_.travelerName.value.trim().replace(/[^a-zA-Z '-]/g,"").slice(0,16)||"Jin";Q.travelerName=i,Q.started=!0,ps=!0,$s(),hs(),_.welcome.classList.add("is-hidden"),_.canvas.focus(),pn(`${i}, Sunny City\uC5D0 \uC628 \uAC78 \uD658\uC601\uD574\uC694! NPC \uAC00\uAE4C\uC774\uC5D0\uC11C \uB9D0 \uAC78\uAE30\uB97C \uB20C\uB7EC \uBCF4\uC138\uC694.`,4300)}),_.interactButton.addEventListener("click",Jp),_.worldClearButton.addEventListener("click",Rb),_.worldSendButton.addEventListener("click",td),_.npcWorldReplay.addEventListener("click",Ib),_.npcWorldCaptionToggle.addEventListener("click",()=>{to(!_.npcWorldBubble.classList.contains("is-caption-visible"))}),_.worldHintButton.addEventListener("click",()=>{io(_.worldHintSentences.classList.contains("is-hidden"))}),_.worldReplyInput.addEventListener("input",()=>{["starting","listening","stopping","transcribing"].includes(Je)&&$n(),Je=_.worldReplyInput.value.trim()?"captured":"idle",Hi(_.worldReplyInput.value),Dt(_.worldReplyInput.value.trim()?"\uAC19\uC740 \uBC84\uD2BC\uC744 \uB20C\uB7EC \uC804\uC1A1\uD558\uC138\uC694.":"\uBB34\uC804\uAE30 \uBC84\uD2BC\uC744 \uB204\uB974\uACE0 \uC601\uC5B4\uB85C \uB9D0\uD574 \uBCF4\uC138\uC694."),tn()}),_.worldReplyInput.addEventListener("keydown",i=>{i.key==="Enter"&&(i.preventDefault(),td())}),_.dialogueClose.addEventListener("click",Ys),_.npcReplay.addEventListener("click",()=>kc(_.npcLine.textContent,{slower:!0})),_.lineRevealToggle.addEventListener("click",()=>ma(_.npcLine.classList.contains("is-hidden"))),_.correctedReplay.addEventListener("click",()=>kc(_.correctedSentence.textContent,{slower:!0})),_.translationToggle.addEventListener("click",()=>Md(_.npcTranslation.classList.contains("is-hidden"))),_.hintToggle.addEventListener("click",()=>_m(_.phraseChips.classList.contains("is-hidden"))),_.historyToggle.addEventListener("click",()=>{Js=!Js,Wc()}),_.micButton.addEventListener("click",td),_.retryButton.addEventListener("click",()=>{if(Zn)return;yt=null,_.correctionCard.classList.add("is-hidden"),_.heardBox.classList.add("is-hidden"),_.nextTurnButton.classList.add("is-hidden"),_.offlineContinueButton.classList.add("is-hidden"),_.answerInput.value="";let i=Qs(),e=_.npcLine.textContent.trim()||i.en;_.npcLine.textContent=e,_.npcTranslation.textContent=i.ko,ma(!1),pa(e)}),_.offlineContinueButton.addEventListener("click",()=>{if(!yt?.offlineCanContinue||!_e||!Le)return;let i=_e;Ys({discardSession:!0}),Oi(i),pn("\uC5F0\uC2B5\uC740 \uC5EC\uAE30\uC11C \uB9C8\uCCE4\uC5B4\uC694. \uCF54\uC778\uACFC \uBBF8\uC158 \uC644\uB8CC\uB294 \uC5F0\uACB0\uC774 \uB3CC\uC544\uC628 \uB4A4 \uB2E4\uC2DC \uD655\uC778\uD574 \uC8FC\uC138\uC694.",5200)}),_.answerSubmit.addEventListener("click",()=>{fd(_.answerInput.value)}),_.answerInput.addEventListener("keydown",i=>{i.key==="Enter"&&(i.preventDefault(),fd(_.answerInput.value))}),_.nextTurnButton.addEventListener("click",()=>{yt?.canAdvance&&zc()}),_.passportButton.addEventListener("click",()=>{_e&&Ys(),_.lifePanel.classList.add("is-hidden"),hs(),_.passportPanel.classList.remove("is-hidden")}),_.passportClose.addEventListener("click",()=>_.passportPanel.classList.add("is-hidden")),_.passportPanel.addEventListener("click",i=>{i.target===_.passportPanel&&_.passportPanel.classList.add("is-hidden")}),_.lifeButton.addEventListener("click",()=>{_e&&Ys(),_.passportPanel.classList.add("is-hidden"),ga(Nt),_.lifePanel.classList.remove("is-hidden")}),_.lifeClose.addEventListener("click",()=>_.lifePanel.classList.add("is-hidden")),_.lifePanel.addEventListener("click",i=>{i.target===_.lifePanel&&_.lifePanel.classList.add("is-hidden")}),_.lifePanel.querySelectorAll("[data-life-tab]").forEach(i=>{i.addEventListener("click",()=>ga(i.dataset.lifeTab))}),_.surpriseStart.addEventListener("click",()=>{let i=Zp();if(!i){_.surpriseAlert.classList.add("is-hidden");return}let e=an.find(t=>t.id===i.locationId);_.surpriseAlert.classList.add("is-hidden"),vm(e,i)}),_.surpriseLater.addEventListener("click",()=>{let i=Zp();_.surpriseAlert.classList.add("is-hidden"),Oi(null);let e=an.find(t=>t.id===i?.locationId);pn(`\u26A1 ${e?.titleKo||"\uC9C0\uB3C4"}\uC5D0 \uB3CC\uBC1C \uBBF8\uC158\uC744 \uD45C\uC2DC\uD588\uC5B4\uC694. \uBA3C\uC800 \uD574\uACB0\uD574\uC57C \uB2E4\uC74C \uBBF8\uC158\uC744 \uC2DC\uC791\uD560 \uC218 \uC788\uC5B4\uC694.`,4700)}),_.rewardContinue.addEventListener("click",()=>{_.rewardScreen.classList.add("is-hidden");let i=nm(Math.max(0,Q.missionStep-1)),e=_i(),t=er(e);if(Oi(),hs(),!e||!t){pn(`\u{1F389} ${qn.length}\uAC1C \uC5EC\uD589 \uBBF8\uC158\uC744 \uBAA8\uB450 \uD574\uACB0\uD588\uC5B4\uC694! \uCD9C\uAD6D\uBD80\uD130 \uADC0\uAD6D\uAE4C\uC9C0 \uC644\uC8FC\uD588\uC5B4\uC694.`,5600);return}if(i?.locationId===e.locationId){Fi=null,pn(`\uC0C8 \uBBF8\uC158\uC774\uC5D0\uC694. ${e.npcOverride?.name||t.npc.name}\uC5D0\uAC8C \uB2E4\uC2DC \uB9D0 \uAC78\uC5B4 \uC8FC\uC138\uC694.`,3900);return}_d({reposition:!0}),pn(`\uBBF8\uC158 ${fs(e)}: ${t.titleKo}\uB85C \uC774\uB3D9\uD558\uC138\uC694.`,4200)}),_.soundToggle.addEventListener("click",()=>{if(Xs=!Xs,Xs)try{window.speechSynthesis?.resume?.()}catch{}else{let i=kt,e=!!yt?.canAdvance;ua+=1,kt=!1,$r=null,window.speechSynthesis?.cancel?.(),i&&_e&&(to(!0),e?window.setTimeout(zc,520):bd())}_.soundToggle.textContent=Xs?"\u{1F50A}":"\u{1F507}",_.soundToggle.setAttribute("aria-pressed",String(!Xs)),_.soundToggle.setAttribute("aria-label",Xs?"NPC \uC74C\uC131 \uB044\uAE30":"NPC \uC74C\uC131 \uCF1C\uAE30")}),window.addEventListener("keydown",i=>{if(!["INPUT","TEXTAREA"].includes(document.activeElement?.tagName)){if(i.code==="KeyE"){i.preventDefault(),i.repeat||Jp();return}["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(i.code)&&i.preventDefault(),wn.add(i.code),i.code==="Escape"&&(_e?Ys():_.surpriseAlert.classList.contains("is-hidden")?_.lifePanel.classList.contains("is-hidden")?_.passportPanel.classList.contains("is-hidden")||_.passportPanel.classList.add("is-hidden"):_.lifePanel.classList.add("is-hidden"):(_.surpriseAlert.classList.add("is-hidden"),Oi(null)))}}),window.addEventListener("keyup",i=>wn.delete(i.code)),window.addEventListener("blur",()=>wn.clear()),window.addEventListener("resize",()=>{!Yt||!Bt||(Bt.aspect=innerWidth/innerHeight,Bt.updateProjectionMatrix(),Yt.setPixelRatio(Math.min(devicePixelRatio,1.8)),Yt.setSize(innerWidth,innerHeight),requestAnimationFrame(Oc))}),window.addEventListener("beforeunload",$s),window.setInterval(()=>{ps&&$s()},5e3),Gb(),Wb()}function Gb(){let i=null,e=n=>{n&&i!==n.pointerId||(i=null,Fc.set(0,0),_.joystickKnob.style.transform="translate(-50%, -50%)")},t=n=>{let s=_.joystickBase.getBoundingClientRect(),r=s.left+s.width/2,o=s.top+s.height/2,a=s.width*.32,l=n.clientX-r,c=n.clientY-o,u=Math.hypot(l,c);u>a&&(l=l/u*a,c=c/u*a),Fc.set(l/a,c/a),_.joystickKnob.style.transform=`translate(calc(-50% + ${l}px), calc(-50% + ${c}px))`};_.joystickBase.addEventListener("pointerdown",n=>{i===null&&(i=n.pointerId,_.joystickBase.setPointerCapture(i),t(n),n.preventDefault())}),_.joystickBase.addEventListener("pointermove",n=>{n.pointerId===i&&(t(n),n.preventDefault())}),_.joystickBase.addEventListener("pointerup",e),_.joystickBase.addEventListener("pointercancel",e),_.joystickBase.addEventListener("lostpointercapture",e),window.addEventListener("blur",()=>e()),document.addEventListener("visibilitychange",()=>{document.hidden&&e()})}function Wb(){let i=null,e=0,t=0,n=8,s=r=>{if(r&&i!==r.pointerId)return;let o=i;if(i=null,o!==null&&_.canvas.hasPointerCapture?.(o))try{_.canvas.releasePointerCapture(o)}catch{}};_.canvas.addEventListener("pointerdown",r=>{if(!(r.pointerType==="mouse"||i!==null||!ps||js())){i=r.pointerId,e=r.clientY,t=sd;try{_.canvas.setPointerCapture(i)}catch{}r.preventDefault()}},{passive:!1}),_.canvas.addEventListener("pointermove",r=>{if(r.pointerId!==i)return;if(js()){s(r);return}let o=r.clientY-e;Math.abs(o)<=n||(sd=gb(t,o),r.preventDefault())},{passive:!1}),_.canvas.addEventListener("pointerup",s),_.canvas.addEventListener("pointercancel",s),_.canvas.addEventListener("lostpointercapture",s),window.addEventListener("blur",()=>s()),document.addEventListener("visibilitychange",()=>{document.hidden&&s()})}async function Kb(){Zv(),Vb(),Oi();try{if(window.location.protocol==="file:")throw new Error("Local file URLs cannot fetch the 3D model assets.");Jv(),dm(),fa(6,"\uC5EC\uD589 \uAC00\uBC29\uC744 \uCC59\uAE30\uB294 \uC911\u2026"),await eb(),await hb(),hs(),fa(100,"Sunny City \uB3C4\uCC29!"),om=!0,ps=!!Q.started,setTimeout(()=>{_.loadingScreen.classList.add("is-leaving"),setTimeout(()=>{if(_.loadingScreen.classList.add("is-hidden"),!Q.started)_.welcome.classList.remove("is-hidden");else{_.welcome.classList.add("is-hidden");let i=_i(),e=er(i);pn(i?`${Q.travelerName}, \uBBF8\uC158 ${fs(i)}\uB97C \uC774\uC5B4\uC11C \uC2DC\uC791\uD574\uC694. ${e?.titleKo||"\uBAA9\uC801\uC9C0"}\uB85C \uAC00\uC138\uC694!`:`${Q.travelerName}, \uC5EC\uD589 \uBBF8\uC158\uC744 \uBAA8\uB450 \uC644\uC8FC\uD588\uC5B4\uC694!`,3800)}},520)},280)}catch(i){console.error(i),_.loadingText.textContent=location.protocol==="file:"?"3D \uC5D0\uC14B\uC740 \uBCF4\uC548 \uC5F0\uACB0\uC774 \uD544\uC694\uD574\uC694. \uBC30\uD3EC\uB41C \uC0AC\uC774\uD2B8 \uC8FC\uC18C\uC5D0\uC11C \uC5F4\uC5B4 \uC8FC\uC138\uC694.":"3D \uB3C4\uC2DC\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC5B4\uC694. \uC778\uD130\uB137 \uC5F0\uACB0\uC744 \uD655\uC778\uD55C \uB4A4 \uC0C8\uB85C\uACE0\uCE68\uD574 \uC8FC\uC138\uC694.",_.loadingBar.style.width="100%",_.loadingBar.style.background="#ff7c73"}}Kb();})();
/*! Bundled license information:

three/build/three.core.js:
three/build/three.module.js:
  (**
   * @license
   * Copyright 2010-2026 Three.js Authors
   * SPDX-License-Identifier: MIT
   *)
*/

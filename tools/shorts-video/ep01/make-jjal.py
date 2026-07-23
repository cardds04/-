# shorts-sseol.html의 캐릭터를 짤툰풍(매끈한 선, 점눈 무표정)으로 교체해 shorts-jjal.html 생성
import re

src = open('shorts-sseol.html', encoding='utf-8').read()

new_char = r'''/* ---------- 짤툰풍 캐릭터 (매끈한 선, 점눈, 데드팬) ---------- */
function charSVG(id,who,sc,x,y,flip){
  const F=flip?-1:1;
  const SW=6;
  let s=`<g id="${id}" transform="translate(${x},${y}) scale(${F*sc},${sc})">`;
  // 다리 (짧은 막대)
  s+=P(wobLine(-42,300,-46,425,id.length+1,3),'none','#111',SW);
  s+=P(wobLine(42,300,48,425,id.length+2,3),'none','#111',SW);
  // 몸통 (통짜 튜브)
  const shirt=who==='bf'?'#8fc1ee':who==='dr'?'#f4f4f4':'#f9a8c9';
  s+=P(wobEllipse(0,225,88,100,id.length+5,4,20),shirt,'#111',SW);
  // 팔 (짧은 곡선 + 벙어리손)
  s+=`<g class="arms-down">`
    +P(wobLine(-80,180,-118,300,id.length+6,4),'none','#111',SW)
    +P(wobLine(80,180,118,300,id.length+7,4),'none','#111',SW)
    +`<circle cx="-120" cy="308" r="14" fill="#ffe3c9" stroke="#111" stroke-width="5"/>`
    +`<circle cx="120" cy="308" r="14" fill="#ffe3c9" stroke="#111" stroke-width="5"/></g>`;
  s+=`<g class="arms-up" style="display:none">`
    +P(wobLine(-80,185,-140,55,id.length+8,4),'none','#111',SW)
    +P(wobLine(80,185,140,55,id.length+9,4),'none','#111',SW)
    +`<circle cx="-143" cy="46" r="14" fill="#ffe3c9" stroke="#111" stroke-width="5"/>`
    +`<circle cx="143" cy="46" r="14" fill="#ffe3c9" stroke="#111" stroke-width="5"/></g>`;
  // 머리 (매끈한 살구색 타원)
  s+=P(wobEllipse(0,0,132,122,id.length+10,4,22),'#ffe3c9','#111',SW);
  // 헤어
  if(who==='bf'){ // 검정 헬멧 바가지
    s+=P('M-130,-18 C-135,-155 135,-155 130,-18 C90,-40 60,-34 30,-46 C0,-34 -40,-46 -70,-36 C-95,-44 -115,-30 -130,-18 Z','#222','#111',SW);
  }else if(who==='gf'){ // 갈색 단발 + 낮은 양갈래
    s+=P('M-132,-8 C-140,-155 140,-155 132,-8 C110,-30 80,-40 40,-44 C0,-36 -50,-46 -90,-34 C-110,-28 -125,-18 -132,-8 Z','#7a4a2b','#111',SW);
    s+=P(wobEllipse(-148,60,34,52,77,4,16),'#7a4a2b','#111',SW);
    s+=P(wobEllipse(148,60,34,52,78,4,16),'#7a4a2b','#111',SW);
  }else{ // 박사: 대머리 + 옆머리
    s+=P(wobEllipse(-112,30,24,34,79,4,14),'#cfcfcf','#111',5);
    s+=P(wobEllipse(112,30,24,34,80,4,14),'#cfcfcf','#111',5);
  }
  /* 표정: 가까이 붙은 점눈이 기본 (데드팬) */
  const dotEyes='<circle cx="-32" cy="6" r="10" fill="#111"/><circle cx="34" cy="6" r="10" fill="#111"/>';
  const lazyLids='<path d="M-48,-8 L-16,-8 M18,-8 L50,-8" stroke="#111" stroke-width="5"/>';
  const E=(cls,inner,show)=>`<g class="face ${cls}" style="display:${show?'inline':'none'}">${inner}</g>`;
  if(who==='bf'){
    s+=E('f-norm',dotEyes+'<path d="M-14,64 L18,64" stroke="#111" stroke-width="5" fill="none"/>',true);
    s+=E('f-sweat',dotEyes+lazyLids
      +'<path d="M-16,66 Q2,58 20,66" stroke="#111" stroke-width="5" fill="none"/>'
      +P(wobEllipse(112,-44,12,19,85,3),'#aee2ff','#3399cc',4));
    s+=E('f-conf','<circle cx="-34" cy="0" r="24" fill="#fff" stroke="#111" stroke-width="5"/><circle cx="-34" cy="0" r="5" fill="#111"/>'
      +'<circle cx="38" cy="0" r="24" fill="#fff" stroke="#111" stroke-width="5"/><circle cx="38" cy="0" r="5" fill="#111"/>'
      +P(wobEllipse(2,74,26,30,87,4,14),'#5c2f2f','#111',5)
      +P(wobEllipse(112,-44,12,19,88,3),'#aee2ff','#3399cc',4));
    s+=E('f-happy','<path d="M-46,4 Q-32,-12 -18,4" stroke="#111" stroke-width="6" fill="none"/>'
      +'<path d="M20,4 Q34,-12 48,4" stroke="#111" stroke-width="6" fill="none"/>'
      +P(wobEllipse(2,66,30,20,89,4,14),'#5c2f2f','#111',5));
  }else if(who==='gf'){
    s+=E('f-smile',dotEyes+'<path d="M-14,62 Q2,72 18,62" stroke="#111" stroke-width="5" fill="none"/>',true);
    s+=E('f-flat','<path d="M-48,4 L-16,4" stroke="#111" stroke-width="7"/><path d="M18,4 L50,4" stroke="#111" stroke-width="7"/>'
      +'<path d="M-12,66 L20,66" stroke="#111" stroke-width="5"/>'
      +'<path d="M-70,-70 L-88,-30 M-48,-76 L-62,-36 M-26,-80 L-36,-42" stroke="#8899bb" stroke-width="4"/>');
    s+=E('f-angry','<path d="M-56,-18 L-20,-6 M58,-18 L22,-6" stroke="#111" stroke-width="8"/>'
      +dotEyes
      +'<path d="M-20,74 Q2,58 24,74" stroke="#111" stroke-width="6" fill="none"/>'
      +P(wobEllipse(-86,50,18,10,97,3),'#ff9d9d','none',0)+P(wobEllipse(90,48,18,10,98,3),'#ff9d9d','none',0));
    s+=E('f-happy','<path d="M-46,4 Q-32,-12 -18,4" stroke="#111" stroke-width="6" fill="none"/>'
      +'<path d="M20,4 Q34,-12 48,4" stroke="#111" stroke-width="6" fill="none"/>'
      +P(wobEllipse(2,64,28,18,99,4,14),'#5c2f2f','#111',5));
  }else{
    s+=E('f-norm','<circle cx="-40" cy="4" r="28" fill="none" stroke="#111" stroke-width="5"/>'
      +'<circle cx="44" cy="4" r="28" fill="none" stroke="#111" stroke-width="5"/>'
      +'<path d="M-12,4 L16,4" stroke="#111" stroke-width="5"/>'
      +'<circle cx="-40" cy="6" r="7" fill="#111"/><circle cx="44" cy="6" r="7" fill="#111"/>'
      +'<path d="M-10,66 L18,66" stroke="#111" stroke-width="5"/>'
      +'<path d="M-40,-70 Q0,-84 40,-72" stroke="#cfcfcf" stroke-width="5" fill="none"/>',true);
  }
  s+='</g>';
  return s;
}
'''

pat = re.compile(r'/\* ---------- 병맛재판소풍 캐릭터.*?\n}\n', re.S)
assert pat.search(src), 'char block not found'
out = pat.sub(new_char.replace('\\','\\\\'), src, count=1)

# 말풍선도 살짝 매끈하게
out = out.replace('wobRect(14,14,792,210,seed,12)', 'wobRect(14,14,792,210,seed,7)')

open('shorts-jjal.html','w',encoding='utf-8').write(out)
print('shorts-jjal.html written, len', len(out))

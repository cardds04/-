#!/usr/bin/env node
/* 20개 톤별 미리듣기 샘플 WAV 를 미리 생성 → tts_samples/tone_<id>.wav
   배포된 Vercel TTS 엔드포인트(서버 GEMINI_API_KEY 사용) 호출. 통일된 미리듣기 문구 사용.
   실행: node gen_tts_samples.cjs */
const fs = require("fs");
const path = require("path");

const API = "https://sc-pink.vercel.app/api/gemini-tts";
const HERE = __dirname;
const OUT = path.join(HERE, "tts_samples");
const cfg = JSON.parse(fs.readFileSync(path.join(HERE, "tts_tones.json"), "utf8"));

fs.mkdirSync(OUT, { recursive: true });

async function genOne(tone) {
  const dest = path.join(OUT, `tone_${tone.id}.wav`);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
    console.log(`skip ${tone.id} ${tone.name} (이미 있음)`);
    return true;
  }
  const body = { script: cfg.previewText, voiceGender: tone.gender, styleHint: tone.style };
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok || !j.audioBase64) throw new Error(j.message || `HTTP ${res.status}`);
      fs.writeFileSync(dest, Buffer.from(j.audioBase64, "base64"));
      console.log(`✓ ${tone.id} ${tone.name} (${(fs.statSync(dest).size / 1024).toFixed(0)}KB)`);
      return true;
    } catch (e) {
      console.log(`… ${tone.id} ${tone.name} 시도 ${attempt} 실패: ${e.message}`);
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
  console.log(`✗ ${tone.id} ${tone.name} 생성 실패`);
  return false;
}

(async () => {
  let ok = 0;
  for (const tone of cfg.tones) {
    if (await genOne(tone)) ok++;
  }
  console.log(`\n완료: ${ok}/${cfg.tones.length}`);
})();

/**
 * 릴스 제안 제조기 — Express(server.js) / Vercel(api/reel-suggest.js) 공용 로직
 *
 * "가치 전달자 운영체제(Value Creator OS)"의 방법론을 그대로 탑재한다.
 * 고객이 주제를 던지면 →
 *   action: "propose"    → '각인'에 기반한 릴스 제안 5개(각인/노력 정도 표시)
 *   action: "storyboard" → 고른 제안을 '그대로 따라 찍는 촬영 지시서'로 변환
 *                          (필요한 영상 개수 + 각 영상 최소 길이까지 구체적으로)
 *
 * 환경 변수:
 *   - ANTHROPIC_API_KEY  (필수)
 *   - REEL_MODEL         (선택, 기본 claude-sonnet-4-6)
 */

const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-4-6";

// ────────────────────────────────────────────────────────────────
// 프레임워크(정적) — 캐시해서 반복 호출 비용/지연을 줄인다
// ────────────────────────────────────────────────────────────────
const FRAMEWORK = `너는 '가치 전달자 운영체제(Value Creator OS)'를 체득한 숏폼 콘텐츠 전략가다.
어떤 업종/주제가 들어와도 이 원리로 릴스를 설계한다.

[정체성]
- 만드는 사람은 '창작자'가 아니라 '가치 전달자', '직업인'이 아니라 '문제 해결사'다.
- 사람들은 물건을 사지 않는다. '더 나은 내일/오늘'을 산다. 결과를 산다.
- '정체성'이 아니라 '관점(POV)'을 판다.

[유일한 질문]
- 이 콘텐츠가 누군가의 오늘을 조금 더 쉽고·즐겁고·편안하고·행복하게 하는가? (아니면 만들지 않는다)

[★기조는 엔진이지 대사가 아니다 — 가장 중요한 규칙]
- "우리가 파는 건 ○○가 아닙니다" 같은 컨셉의 '날것'을 영상에서 직접 말하면 안 된다.
- 기조는 영상 밑에 깔아두고, 에피소드·정보·디테일로 '증명'만 보여준다. 시청자가 스스로 결론에 도착하게 한다. (Show, don't tell)

[★각인(Imprint) — 모든 제안의 합격선]
- 각인 = "이거 딱 봐도 그 사람(그 가게) 거다"의 정도.
- 판별 테스트: "같은 업종 옆집이 이걸 그대로 올려도 말이 되나?" → 되면 각인 0(탈락). 안 되면 합격.
- 모든 제안은 반드시 각인 합격선을 넘어야 한다. 1인칭 경험·고유한 사연·축적된 판단·시그니처가 각인을 만든다.
- 각인은 흥미/정보/감정을 '꿰는 실'이지 네 번째 카테고리가 아니다. 노력이 아니라 '일관성/고유성'이 각인을 정한다.

[내용물 3종 — 무엇을 담느냐]
- 흥미 → 도달·체류 (비포애프터·ASMR·변신)
- 정보 → 저장·공유 (두고두고 꺼내보는 쓸모, '정보'보다 '판단'을 줘라: "이건 사지 마세요")
- 감정/스토리 → 동료 (보는 사람이 자기 얘기를 투영)
- 비포애프터는 카테고리가 아니라 '그릇'이다. 무엇을 담느냐로 흥미/정보/감정이 된다.

[포맷 서랍 — 4그룹]
- A 후킹&반전 (목표=도달): 결과→원인, 상식 파괴, 의문 제기, 숨겨진 진실, 경고형, 금기어, 가치 전도
- B 정보&전문성 (목표=저장·공유): 비교 분석, 3단 압축, 체크리스트, 타임라인, 사전 예방, 숨은 꿀템, 황금 비율, 질의응답
- C 스토리텔링&과몰입 (목표=동료): 흑역사 고백, 광기·집착, 가상 시나리오, 클라이언트 빙의, 1인칭 시점, 비하인드, 동기부여
- D 비주얼&감성 (목표=체류): 비트 매칭, ASMR+무드, 줌인 줌아웃, 라이팅 반전, 컬러 체인지, 스피드 조절, 무한 루프, 레이어 쌓기
- 모든 포맷의 'OO'에는 업종이 아니라 '고객의 변화'를 넣는다. 포맷은 결국 패턴(전후 비교·비밀·반전)의 구현이다.

[8법칙 핵심]
1 더할 것 말고 버릴 것을 찾아라  2 콘텐츠 말고 관찰 기록을 남겨라  3 트렌드 말고 패턴을 찾아라
4 경쟁자 말고 고객의 시간을 보라  5 정보 말고 '판단'을 남겨라  6 큐레이션 시대 — 가장 잘 골라주는 사람
7 유명세 말고 작고 강하게  8 팬 말고 '동료'를 만들어라(댓글·DM 등 쌍방향 장치)

[톤]
- 후킹은 강렬하고 단정적으로. 주제에 따라 도도하거나 따뜻하게. 단, 절대 광고 카피처럼 들리지 않게.
- 한국어. 짧고 구어체. 숏폼 자막답게.

반드시 지정된 JSON 스키마만 출력한다. 인사·설명·코드블록(\`\`\`)·주석 없이 순수 JSON만.`;

// ────────────────────────────────────────────────────────────────
// Claude 호출 (raw fetch — 다른 lib 와 동일 패턴)
// ────────────────────────────────────────────────────────────────
async function callClaude({ userMessage, maxTokens = 2600, temperature = 0.8 }) {
  const apiKey = String(process.env.ANTHROPIC_API_KEY || "").trim();
  if (!apiKey) {
    const err = new Error("ANTHROPIC_API_KEY 가 설정되어 있지 않습니다.");
    err.status = 500;
    throw err;
  }
  const model = String(process.env.REEL_MODEL || DEFAULT_MODEL).trim();

  const r = await fetch(ANTHROPIC_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      system: [
        { type: "text", text: FRAMEWORK, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = data?.error?.message || JSON.stringify(data) || r.statusText;
    const err = new Error(`Claude 오류: ${msg}`);
    err.status = r.status >= 400 && r.status < 600 ? r.status : 502;
    throw err;
  }
  let text = "";
  if (Array.isArray(data?.content)) {
    for (const c of data.content) if (c?.type === "text") text += c.text;
  }
  return extractJson(text);
}

function extractJson(raw) {
  const s = String(raw || "").trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(s);
  } catch (_) {
    const a = s.indexOf("{");
    const b = s.lastIndexOf("}");
    if (a >= 0 && b > a) {
      try {
        return JSON.parse(s.slice(a, b + 1));
      } catch (_) {}
    }
  }
  const err = new Error("AI 응답을 JSON으로 읽지 못했습니다. 다시 시도해 주세요.");
  err.status = 502;
  throw err;
}

// ────────────────────────────────────────────────────────────────
// 1) 제안 5개
// ────────────────────────────────────────────────────────────────
async function propose(topic) {
  const t = String(topic || "").trim().slice(0, 200);
  if (!t) {
    const err = new Error("주제를 입력해 주세요.");
    err.status = 400;
    throw err;
  }
  const userMessage = `주제: "${t}"

이 주제로 숏폼 릴스 '제안' 5개를 설계하라.
- 포맷 그룹 A·B·C·D를 고루 섞고, 흥미/정보/감정도 섞어라(한쪽으로 쏠리지 마라).
- 5개 전부 '각인 합격선'(옆집이 그대로 올리면 말이 안 되는)을 넘어야 한다.
- 후킹(hook)은 0~3초에 화면에 박을 한 줄. 강렬하고 단정적으로.
- imprint(각인)와 effort(노력)는 1~5 정수로 솔직하게 매겨라(서로 다르게 분포시켜라).

아래 JSON만 출력하라:
{
  "proposals": [
    {
      "title": "5~16자 제목",
      "hook": "0~3초 후킹 문구 한 줄",
      "group": "A|B|C|D 중 하나",
      "groupLabel": "후킹&반전|정보&전문성|스토리텔링|비주얼&감성",
      "formats": ["사용 포맷 이름(1~2개)"],
      "content": "흥미|정보|감정",
      "metric": "도달|저장·공유|동료·공유|체류",
      "imprint": 1~5,
      "effort": 1~5,
      "imprintWhy": "왜 옆집은 이걸 그대로 못 올리나 — 한 문장",
      "summary": "이 릴스가 어떻게 전개되는지 1~2문장(기조는 드러내지 말 것)"
    }
  ]
}
정확히 5개. JSON 외 어떤 글자도 출력하지 마라.`;

  const out = await callClaude({ userMessage, maxTokens: 2600, temperature: 0.85 });
  const proposals = Array.isArray(out?.proposals) ? out.proposals.slice(0, 5) : [];
  if (!proposals.length) {
    const err = new Error("제안을 생성하지 못했습니다. 다시 시도해 주세요.");
    err.status = 502;
    throw err;
  }
  return { ok: true, topic: t, proposals };
}

// ────────────────────────────────────────────────────────────────
// 2) 고른 제안 → 촬영 지시서(스토리보드)
// ────────────────────────────────────────────────────────────────
async function storyboard(topic, proposal) {
  const t = String(topic || "").trim().slice(0, 200);
  const p = proposal && typeof proposal === "object" ? proposal : null;
  if (!t || !p) {
    const err = new Error("주제와 고른 제안이 필요합니다.");
    err.status = 400;
    throw err;
  }
  const userMessage = `주제: "${t}"
고른 제안: ${JSON.stringify({
    title: p.title, hook: p.hook, group: p.group, formats: p.formats,
    content: p.content, metric: p.metric, summary: p.summary, imprintWhy: p.imprintWhy,
  })}

이 제안을 '고객이 그대로 따라 찍는 30초 촬영 지시서'로 만들어라.
- 맨 앞 클립은 반드시 후킹(포맷상자 기반). hook을 화면 자막으로 박는다.
- 기조(척추)는 povSpine 칸에만 적고, 클립의 자막/오디오에는 절대 직접 말하지 마라. 행동·정보·디테일로만 증명한다.
- 필요한 영상 클립이 총 몇 개인지(totalClips), 각 클립의 최소 길이(minSec, 초)를 반드시 명시한다.
- minSec 의 합이 totalSeconds(보통 25~35) 안쪽이 되게 한다. 클립은 4~7개가 적당.
- footage(촬영 지시)는 초보도 따라 할 만큼 구체적으로: 무엇을 / 어떤 앵글로 / 어떤 동작.

아래 JSON만 출력하라:
{
  "guide": {
    "title": "이 릴스 제목",
    "hook": "맨 앞 후킹 문구",
    "povSpine": "남들은 ___라 하지만 나는 ___라 믿는다 (영상에선 말하지 않는 척추)",
    "group": "A|B|C|D",
    "format": "핵심 포맷 이름",
    "totalClips": 정수,
    "totalSeconds": 정수,
    "clips": [
      {
        "n": 1,
        "role": "후킹|전개|증거|반전|디테일|마무리 등",
        "minSec": 정수,
        "label": "무엇을 찍나(짧게)",
        "footage": "구체적 촬영 지시(무엇을/어떤 앵글로/어떤 동작)",
        "subtitle": "화면 자막(없으면 빈 문자열)",
        "audio": "오디오·BGM 큐",
        "tip": "촬영 팁(없으면 빈 문자열)"
      }
    ],
    "shootTips": ["촬영/편집 팁 2~4개"],
    "props": ["필요한 준비물·소품(없으면 빈 배열)"],
    "cta": "마지막 화면 CTA 문구(톤 일관, 광고 같지 않게)"
  }
}
JSON 외 어떤 글자도 출력하지 마라.`;

  const out = await callClaude({ userMessage, maxTokens: 3600, temperature: 0.7 });
  const guide = out?.guide && typeof out.guide === "object" ? out.guide : null;
  if (!guide || !Array.isArray(guide.clips) || !guide.clips.length) {
    const err = new Error("지시서를 생성하지 못했습니다. 다시 시도해 주세요.");
    err.status = 502;
    throw err;
  }
  // totalClips 보정
  guide.totalClips = guide.clips.length;
  if (!guide.totalSeconds) {
    guide.totalSeconds = guide.clips.reduce((s, c) => s + (Number(c.minSec) || 0), 0);
  }
  return { ok: true, topic: t, guide };
}

// ────────────────────────────────────────────────────────────────
// 디스패처
// ────────────────────────────────────────────────────────────────
async function handleReelRequest(body) {
  const action = String(body?.action || "propose").trim();
  try {
    if (action === "propose") {
      const json = await propose(body?.topic);
      return { status: 200, json };
    }
    if (action === "storyboard") {
      const json = await storyboard(body?.topic, body?.proposal);
      return { status: 200, json };
    }
    return { status: 400, json: { ok: false, error: `알 수 없는 action: ${action}` } };
  } catch (e) {
    const status = e?.status && e.status >= 400 && e.status < 600 ? e.status : 500;
    return { status, json: { ok: false, error: e?.message || "서버 오류" } };
  }
}

module.exports = { handleReelRequest, propose, storyboard };

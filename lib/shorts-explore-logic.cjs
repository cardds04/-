/**
 * 숏츠 탐색기 — 주제로 YouTube '쇼츠'(세로 단편) 레퍼런스 검색 (한국 계정 한정)
 *
 *   GET ?q=인테리어 촬영   또는   POST { q }   → 관련 쇼츠 목록
 *
 * 쇼츠만 고르는 법(YouTube API엔 쇼츠 전용 필터가 없어 2단계로):
 *   1) search.list — '쇼츠' 키워드 + videoDuration=short + 한국(KR/ko)
 *   2) videos.list — 실제 길이 확인해 ≤180초만 + 제목/채널에 한글 있는 것(=한국 계정)만
 *
 * 환경변수: YOUTUBE_API_KEY (없으면 GEMINI_API_KEY 재사용 — Google Cloud에서 YouTube Data API v3 켜야 함)
 * 쿼터: search.list 100 + videos.list 1 = 101 units/회 (무료 10,000/day)
 */
"use strict";

const YT_SEARCH = "https://www.googleapis.com/youtube/v3/search";
const YT_VIDEOS = "https://www.googleapis.com/youtube/v3/videos";
const SHORTS_MAX_SEC = 180;   // 쇼츠 최대 길이(현 3분)
const MIN_VIEWS = 10000;      // 조회수 최소 기준(인기 검증)

function apiKey() {
  return String(process.env.YOUTUBE_API_KEY || process.env.GEMINI_API_KEY || "").trim();
}
function hasHangul(s) { return /[가-힣]/.test(String(s || "")); }
function iso8601ToSec(d) {
  const m = String(d || "").match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0);
}
async function ytGet(base, params) {
  const r = await fetch(`${base}?${params.toString()}`);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = (data && data.error && data.error.message) || `YouTube 오류 ${r.status}`;
    const e = new Error(msg);
    e.status = (r.status >= 400 && r.status < 600) ? r.status : 502;
    throw e;
  }
  return data;
}

async function search(q) {
  const key = apiKey();
  if (!key) { const e = new Error("YOUTUBE_API_KEY (또는 GEMINI_API_KEY) 가 설정되어 있지 않습니다."); e.status = 500; throw e; }
  q = String(q || "").trim().slice(0, 100);
  if (!q) { const e = new Error("검색어를 입력해 주세요."); e.status = 400; throw e; }

  // 1) 검색 — '쇼츠' 붙여 세로 단편 위주 + 한국
  const sp = new URLSearchParams({
    part: "snippet", type: "video", videoDuration: "short", maxResults: "50",
    q: `${q} 쇼츠`, regionCode: "KR", relevanceLanguage: "ko", order: "relevance", safeSearch: "moderate", key,
  });
  const sd = await ytGet(YT_SEARCH, sp);
  const ids = (sd.items || []).map((it) => it.id && it.id.videoId).filter(Boolean);
  if (!ids.length) return { status: 200, json: { ok: true, q, items: [] } };

  // 2) 상세(길이) 확인 → 쇼츠 길이(≤180s) + 한국어(한글) 만 남김. 검색 순위 유지.
  const order = {}; ids.forEach((id, i) => (order[id] = i));
  const vp = new URLSearchParams({ part: "contentDetails,snippet,statistics", id: ids.slice(0, 50).join(","), key });
  const vd = await ytGet(YT_VIDEOS, vp);
  const items = (vd.items || []).map((it) => {
    const sn = it.snippet || {};
    const st = it.statistics || {};
    const th = (sn.thumbnails && (sn.thumbnails.high || sn.thumbnails.medium || sn.thumbnails.default)) || {};
    return {
      videoId: it.id,
      title: sn.title || "",
      channel: sn.channelTitle || "",
      thumb: th.url || "",
      durationSec: iso8601ToSec(it.contentDetails && it.contentDetails.duration),
      views: Number(st.viewCount) || 0,
      likes: st.likeCount != null ? Number(st.likeCount) : null,        // 비공개면 null
      comments: st.commentCount != null ? Number(st.commentCount) : null,  // 댓글차단이면 null
    };
  })
    .filter((v) => v.videoId && v.durationSec > 0 && v.durationSec <= SHORTS_MAX_SEC && (hasHangul(v.title) || hasHangul(v.channel)) && v.views >= MIN_VIEWS)
    .sort((a, b) => (order[a.videoId] == null ? 999 : order[a.videoId]) - (order[b.videoId] == null ? 999 : order[b.videoId]))
    .slice(0, 24);

  return { status: 200, json: { ok: true, q, items } };
}

async function handleShortsExplore({ method, query, body }) {
  const q = (body && body.q) || (query && query.q) || "";
  try {
    return await search(q);
  } catch (e) {
    const s = e.status && e.status >= 400 && e.status < 600 ? e.status : 500;
    return { status: s, json: { ok: false, error: e.message || "서버 오류" } };
  }
}

module.exports = { handleShortsExplore };

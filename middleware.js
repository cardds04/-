/**
 * Vercel Routing Middleware — 3D 둘러보기 업체 페이지 잠금 (사장님 2026-11-25).
 *  /tour/                → 관리자만
 *  /tour/<업체>/          → 그 업체 촬영스케줄 계정(또는 관리자)만
 *  /tour/<업체>/<현장>/    → 잠금 없음(여기는 매칭 안 됨)
 * 쿠키 t3d 는 /api/tour-login 이 심는다(lib/tour-gate.cjs 와 같은 서명 방식).
 */
export const config = {
  matcher: ["/tour", "/tour/", "/tour/index.html", "/tour/:v", "/tour/:v/", "/tour/:v/index.html"],
};

function b64urlToBytes(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  s += "=".repeat((4 - (s.length % 4)) % 4);
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToB64url(buf) {
  let bin = "";
  const b = new Uint8Array(buf);
  for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function readToken(token) {
  try {
    const [body, sig] = String(token || "").split(".");
    if (!body || !sig) return null;
    const base = String(process.env.CUSTOMER_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
    if (!base) return null;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(base + "|tour3d"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const mac = bytesToB64url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
    if (mac.length !== sig.length) return null;
    let diff = 0;
    for (let i = 0; i < mac.length; i++) diff |= mac.charCodeAt(i) ^ sig.charCodeAt(i);
    if (diff) return null;
    const p = JSON.parse(new TextDecoder().decode(b64urlToBytes(body)));
    if (!p || (p.exp && Math.floor(Date.now() / 1000) > p.exp)) return null;
    return p;
  } catch (_) {
    return null;
  }
}

function getCookie(req, name) {
  const raw = req.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return "";
}

function gatePage(vendor) {
  const isTop = !vendor;
  const title = isTop ? "관리자 전용" : "업체 로그인";
  const desc = isTop
    ? "3D 둘러보기 전체 목록은 관리자만 볼 수 있습니다."
    : "업체 페이지는 촬영스케줄 사이트 아이디·비밀번호로 열립니다.<br>현장 링크를 받으셨다면 그 링크로 바로 보실 수 있습니다.";
  const fields = isTop
    ? `<input id="pw" type="password" placeholder="관리자 비밀번호" autocomplete="current-password" required>`
    : `<input id="id" type="text" placeholder="아이디" autocomplete="username" required>
       <input id="pw" type="password" placeholder="비밀번호" autocomplete="current-password" required>`;
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${title} · 3D 둘러보기</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;600;700&display=swap">
<style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f2ee;
font-family:"IBM Plex Sans KR",system-ui,sans-serif;color:#1f1d1a;padding:16px}
.card{width:100%;max-width:360px;background:#fff;border:1px solid #e4e0d8;border-radius:16px;padding:28px 24px}
h1{font-size:20px;margin:0 0 8px}p{font-size:14px;line-height:1.6;color:#6b665e;margin:0 0 20px}
input{width:100%;font:inherit;font-size:16px;padding:12px 14px;border:1px solid #d8d3ca;border-radius:10px;margin-bottom:10px}
button{width:100%;font:inherit;font-weight:700;font-size:16px;padding:12px;border:0;border-radius:10px;background:#1f1d1a;color:#fff;cursor:pointer}
.err{color:#b42318;font-size:13px;min-height:18px;margin:4px 0 8px}
a{color:#6b665e;font-size:13px}
</style></head><body><form class="card" id="f">
<h1>${title}</h1><p>${desc}</p>${fields}<div class="err" id="err"></div>
<button type="submit">들어가기</button>
${isTop ? "" : `<p style="margin:16px 0 0"><a href="/customer.html">촬영스케줄 사이트에서 로그인하기 →</a></p>`}
</form><script>
document.getElementById("f").addEventListener("submit",async function(e){e.preventDefault();
var err=document.getElementById("err");err.textContent="";
var body=${isTop ? `{action:"admin_pw",password:document.getElementById("pw").value}` : `{action:"login",vendor:${JSON.stringify(vendor)},loginId:document.getElementById("id").value,password:document.getElementById("pw").value}`};
try{var r=await fetch("/api/tour-login",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify(body)});
var j=await r.json().catch(function(){return{}});if(r.ok&&j.ok&&(j.adm||${isTop ? "false" : `(j.vendors||[]).some(function(v){return v.slug===${JSON.stringify(vendor)}})`})){location.reload();return;}
err.textContent=j.error||(j.ok?"이 페이지를 볼 수 있는 계정이 아닙니다.":"다시 시도해 주세요.");}catch(_){err.textContent="연결이 끊겼습니다. 다시 시도해 주세요.";}});
</script></body></html>`;
}

export default async function middleware(req) {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean); // ["tour", v?, "index.html"?]
  if (parts[0] !== "tour") return;
  let vendor = parts[1] || "";
  if (vendor === "index.html") vendor = "";
  if (parts.length === 3 && parts[2] !== "index.html") return;
  if (parts.length > 3) return;
  if (vendor && (vendor.startsWith("_") || vendor.includes("."))) return;

  const claims = await readToken(getCookie(req, "t3d"));
  if (claims && (claims.adm === 1 || (vendor && Array.isArray(claims.vs) && claims.vs.includes(vendor)))) return;

  return new Response(gatePage(vendor), {
    status: 401,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

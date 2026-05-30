/**
 * 공개 점유 신호 (서버 전용, service_role, 토큰 불필요).
 *
 * 목적: B-4 에서 anon 의 schedules SELECT 를 잠그면, 로그인 전 예약 달력이
 *       "하루 마감" 판정을 못 한다. 그러나 마감 판정에 필요한 건 익명화된
 *       점유 신호뿐(업체명·주소·비번·금액 전부 불필요).
 *
 * 해결: 민감 필드를 모두 제거한 익명 점유 배열만 토큰 없이 돌려준다.
 *       occupancy = [{ d: 날짜, k: "시간|해시" }]  — customer-data-logic 와 동일 규칙.
 *       해시는 비가역(SHA-256 16자리)이라 어떤 업체·장소인지 복원 불가.
 *
 * 노출 API: handlePublicOccupancyRequest() → { status, json:{ ok, occupancy } }
 */
const { getServiceConfig, fetchOccupancy } = require("./customer-data-logic.cjs");

async function handlePublicOccupancyRequest() {
  const { url, key } = getServiceConfig();
  const occupancy = await fetchOccupancy(url, key);
  return { status: 200, json: { ok: true, occupancy } };
}

module.exports = { handlePublicOccupancyRequest };

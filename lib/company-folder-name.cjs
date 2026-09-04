/**
 * 업체명 → 마이박스 폴더명 규칙 (2026-09-04).
 *
 * 업체정보관리의 업체명에는 무료촬영 표식 「/무」가 붙는 경우가 있고(예: 디자인담/무),
 * 「/」는 폴더명에 쓸 수 없다. 실측 확인한 기존 관례는 표식을 떼고 순수 업체명으로 만든다:
 *   에이제디자인스페이스/무  →  /공유폴더/에이제디자인스페이스/
 * 그 밖의 폴더 금지문자도 제거한다.
 *
 * ‼️업체 폴더명과 하위 원본 폴더명({MMDD}{업체명}사진원본)이 같은 규칙을 쓰도록
 *   scripts/daily_delivery_folders.cjs · lib/photographer-shoot-logic.cjs · 릴레이가
 *   모두 이 함수(릴레이는 동일 규칙의 파이썬 판)를 쓴다.
 */
function companyFolderName(name) {
  let s = String(name || "").trim();
  s = s.replace(/\s*\/\s*무\s*$/, ""); // 무료촬영 표식 제거
  s = s.replace(/[\/\\:*?"<>|]/g, "").trim();
  return s;
}

module.exports = { companyFolderName };

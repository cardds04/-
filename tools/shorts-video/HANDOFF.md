# 심리학 쇼츠 프로젝트 — 세션 인수인계 요약

> 2026-07-18 세션에서 작성. 브랜치 `claude/psychology-video-topics-1mn9i2`, PR #1 (draft, 충돌 없음).

## 프로젝트 개요

사용자는 **"병맛재판소"**라는 이름의 채널/프로젝트를 직접 만들고 있음 (맥 로컬 `다운로드/병맛재판장` 폴더에 자료 보유 — **아직 공유받지 못함**).
심리학 소재로 병맛 톤의 쇼츠 영상 시리즈를 제작 중. 콘셉트는 여러 번 진화했다:

1. 처음: 심리학 주제 브레인스토밍 (재판 콘셉트 제안 → 사용자가 반려)
2. 확정된 콘텐츠 포맷: **일상 상황(커플 싸움 등)을 보여주고 심리학으로 해설+해결책 제시**
3. 최종 진화: **1인칭 썰풀이 에피소드 형식** — 주인공이 "어제 있었던 일인데요…" 하고 사연을 들려주는 구조

## 만들어진 것 (전부 `tools/shorts-video/` 에 있음)

**EP.01 "아무거나" 편** — 대본: `docs/shorts-psychology-ep01-amugeona.md`
스토리: 커플이 저녁 메뉴 고르다 "아무거나~" → "그럼 국밥?" → 정색 → 심리학 해설(아론 벡의 인지 왜곡 중 '독심술 기대') → 해결책 '선택지 3개의 법칙' → "오늘도 한 커플 살렸습니다 🙏" 엔딩.

영상 4개 버전 (모두 1080x1920, 52초, 30fps, `ep01/` 폴더):
| 파일 | 스타일 |
|---|---|
| `ep01-amugeona.mp4` | 카톡 대화 UI 연출 (`shorts.html`) |
| `ep01-amugeona-byungmat.mp4` | 발그림 캐릭터 콩트, 손글씨 폰트 (`shorts-byungmat.html`) |
| `ep01-sseol.mp4` | **썰풀이 형식** + 거친 발그림 + 고딕 자막 (`shorts-sseol.html`) |
| `ep01-jjal.mp4` | 썰풀이 형식 + 짤툰풍 매끈한 그림체 (`shorts-jjal.html`, `make-jjal.py`로 생성) |

## 렌더링 파이프라인 (재사용 가능)

- **HTML 타임라인**: 각 `shorts-*.html`에 `window.seek(t)` 함수 — 임의 시점의 프레임을 결정적으로 렌더. 장면·대사·표정·타이밍 전부 이 파일에서 수정.
- **오디오**: `audio*.py` (numpy로 효과음+BGM 합성 → wav). TTS는 네트워크 정책으로 전부 차단됨(edge-tts, gTTS 모두 실패) → 무음성, 자막+효과음 구성.
- **렌더**: `render*.mjs` — Playwright(chromium `/opt/pw-browsers/chromium`)로 프레임 캡처 → ffmpeg(imageio-ffmpeg 바이너리) 파이프 인코딩.
- 실행법:
  ```bash
  pip install numpy imageio-ffmpeg && npm i playwright-core
  apt-get install -y fonts-nanum fonts-nanum-extra fonts-noto-color-emoji
  python3 audio-sseol.py
  FFMPEG=$(python3 -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())") node render-sseol.mjs
  ```

## 캐릭터/스타일 현황

- 남친(파란 셔츠·검은 바가지머리), 여친(분홍 옷·갈색 양갈래), 박사(안경·흰가운) — 전부 코드로 그린 SVG. 표정 교체(`face()`)·팔 포즈(`arms()`) 시스템 있음.
- 그림체는 지터(boiling line) 효과로 손그림 느낌.
- **미해결**: 사용자의 진짜 "병맛재판소" 그림체에 맞춰야 함. 참고 자료(캡처/영상/레포)를 아직 못 받음 — 로컬 맥 폴더는 원격 세션에서 접근 불가라서, 채팅 첨부 또는 레포 업로드(`reference/` 폴더 등)로 받아야 함.

## 다음 할 일

1. **병맛재판소 그림체 참고 자료 받기** ← 최우선 (사용자가 이미지 첨부 또는 레포에 업로드)
2. 받으면 그 그림체로 EP.01 재작업 (charSVG 함수만 교체하면 됨 — `make-jjal.py` 패턴 참고)
3. 채널명이 '재판소'이므로 재판/판결 콘셉트 재결합 여부 사용자와 상의
4. 후속 에피소드: EP.02 "나 화 안 났어" (화가 나 있음) 편 — 회피형/불안형 애착 소재 예정
5. 소재 리스트는 첫 대화에 다수 있음 (독심술 기대, 매몰비용, 방관자 효과, 더닝 크루거 등)

## 참고 사항

- PR #1은 draft로 열려 있고 Vercel 봇이 커밋마다 프리뷰 배포 댓글을 갱신함 (조치 불필요).
- 사용자 대화는 한국어. 병맛 톤 선호, 빠른 결과물 확인 선호.

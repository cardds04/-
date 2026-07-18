# 심리학 쇼츠 영상 생성기

HTML 타임라인 + Playwright 프레임 캡처 + ffmpeg 인코딩으로 쇼츠(1080x1920) 영상을 코드로 렌더링합니다.
음성 없이 자막 연출(키네틱 타이포)로 진행하고, 효과음/BGM은 numpy로 직접 합성합니다.

## 구성 (ep01/)
- `shorts.html` — 장면·타이밍 정의. `window.seek(t)`로 임의 시점 프레임을 결정적으로 렌더
- `audio.py` — 효과음(말풍선 팝, 정색 스탭, 시스템오류 비프, 목탁 등) + BGM 합성 → `audio.wav`
- `render.mjs` — Chromium으로 프레임 캡처 → ffmpeg 파이프 인코딩 → `ep01-amugeona.mp4`

## 렌더 방법
```bash
pip install numpy imageio-ffmpeg && npm i playwright-core
python3 audio.py
FFMPEG=$(python3 -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())") node render.mjs
```
대본 원문: `docs/shorts-psychology-ep01-amugeona.md`

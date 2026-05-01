# Gemini Computer Use — Lightroom Classic 자동 제어

Google Gemini Vision API를 활용하여 자연어로 macOS 컴퓨터를 제어하고 **Adobe Lightroom Classic**을 자동 조작하는 파이썬 프로그램입니다.

---

## 작동 원리

```
사용자 요청 입력
      ↓
스크린샷 촬영 (pyautogui)
      ↓
Gemini Vision API에 이미지 + 요청 전송
      ↓
Gemini가 화면 분석 → 액션 JSON 반환
      ↓
액션 실행 (클릭, 드래그, 키 입력 등)
      ↓
새 스크린샷 촬영 → 반복
      ↓
작업 완료 선언 시 종료
```

---

## 설치 방법

### 1. 의존성 설치

```bash
cd lightroom-ai-controller
pip install -r requirements.txt
```

macOS에서 `pyautogui`가 화면을 제어하려면 **손쉬운 사용(Accessibility) 권한**이 필요합니다.

> 시스템 설정 → 개인 정보 보호 및 보안 → 손쉬운 사용 → 터미널(또는 Python) 허용

### 2. API 키 설정

```bash
cp .env.example .env
# .env 파일을 열어 GEMINI_API_KEY에 실제 키 입력
```

Gemini API 키는 [Google AI Studio](https://aistudio.google.com/app/apikey)에서 무료로 발급받을 수 있습니다.

---

## 실행

```bash
python main.py
```

---

## 사용 예시

프로그램 실행 후 아래와 같이 자연어로 요청합니다.

| 요청 예시 | 설명 |
|---------|------|
| `노출을 -0.5로 설정해줘` | 노출(Exposure) 슬라이더를 -0.5로 조정 |
| `하이라이트를 -80으로 내려줘` | 하이라이트 슬라이더 조정 |
| `화이트 밸런스 자동으로 설정해줘` | WB 자동 설정 |
| `현상 패널 기본값으로 초기화해줘` | 현상 설정 전체 리셋 |
| `지금 노출 값이 얼마야?` | 현재 슬라이더 값 읽기 |
| `흑백으로 변환해줘` | HSL/컬러 → B&W 전환 |
| `선명도 30 올려줘` | Clarity 슬라이더 +30 조정 |

---

## 파일 구조

```
lightroom-ai-controller/
├── main.py          # 메인 실행 파일 (대화형 루프)
├── gemini_agent.py  # Gemini API 연동 및 화면 분석
├── actions.py       # 마우스/키보드 제어 실행
├── screen.py        # 스크린샷 캡처
├── requirements.txt
├── .env.example
└── logs/            # 스텝별 스크린샷 자동 저장
```

---

## 안전 장치

- **FailSafe**: 마우스를 화면 **왼쪽 상단 모서리**로 이동하면 즉시 프로그램 중단
- **최대 스텝 제한**: 작업당 최대 30스텝 자동 종료
- `Ctrl+C`로도 언제든지 중단 가능

---

## 주의 사항

- 프로그램 실행 중에는 마우스와 키보드를 건드리지 마세요.
- Lightroom이 **현상(Develop)** 모듈에 있는 상태에서 슬라이더 조작 요청을 하면 더 정확합니다.
- 화면 해상도나 UI 스케일에 따라 좌표가 달라질 수 있습니다. 결과가 부정확할 경우 다시 요청하세요.

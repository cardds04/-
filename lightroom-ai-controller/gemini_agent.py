"""
Gemini Vision API를 활용한 컴퓨터 제어 에이전트
스크린샷을 분석하고 액션 목록을 JSON으로 반환합니다.
"""

import io
import json
import re

import PIL.Image
from google import genai
from google.genai import types
from rich.console import Console

console = Console()

SYSTEM_PROMPT = """당신은 macOS 컴퓨터를 직접 제어하는 AI 어시스턴트입니다.
사용자의 요청을 받아 화면을 분석하고, 원하는 결과를 얻기 위한 마우스/키보드 액션을 순서대로 결정합니다.

## 역할
- Adobe Lightroom Classic 등 macOS 애플리케이션을 자동으로 조작합니다.
- 현재 화면 상태를 보고 다음 액션을 판단합니다.
- 한 번에 1~5개의 작은 액션 단위로 분리하여 반환하세요.

## 응답 형식 (반드시 순수 JSON만 반환)
{
  "thinking": "현재 화면 분석 및 다음 행동 이유 설명 (한국어)",
  "task_complete": false,
  "actions": [
    {
      "type": "click",
      "x": 950,
      "y": 355,
      "description": "노출 슬라이더 클릭"
    }
  ]
}

## 지원 액션 타입
| 타입 | 필수 파라미터 | 설명 |
|------|------------|------|
| click | x, y | 마우스 좌클릭 |
| double_click | x, y | 더블 클릭 |
| right_click | x, y | 우클릭 |
| move | x, y | 마우스 이동 (클릭 없음) |
| drag | x1, y1, x2, y2 | 드래그 (슬라이더 조작에 유용) |
| type | text | 키보드 텍스트 입력 |
| key | keys (문자열 또는 배열) | 키보드 단축키 (예: ["command","z"]) |
| scroll | x, y, direction("up"/"down"), amount | 스크롤 |
| wait | seconds | 지정 시간 대기 |
| screenshot | (없음) | 새 스크린샷 촬영 후 재분석 |
| done | message | 모든 작업 완료 선언 |

## Lightroom Classic 주요 단축키
- D: 현상(Develop) 모듈 이동
- G: 격자(Grid) 뷰
- Cmd+Z: 실행 취소
- Cmd+Shift+R: 현상 설정 초기화
- 슬라이더 값 직접 입력: 슬라이더 우측 숫자 필드 더블클릭 → 숫자 입력 → Enter

## 슬라이더 조작 방법 (Lightroom 우측 패널)
- 슬라이더 우측 숫자 필드를 더블클릭하면 직접 숫자 입력 가능 → 가장 정확
- 드래그: 트랙 중앙=0, 오른쪽=값 증가, 왼쪽=값 감소

## 중요 규칙
1. 반드시 순수 JSON만 반환하세요. 마크다운 코드블록(```) 없이 JSON 객체만.
2. task_complete가 true이면 actions 배열은 비워도 됩니다.
3. 화면에 Lightroom이 없으면 먼저 실행하는 액션을 반환하세요.
4. 좌표는 실제 화면 해상도 기준 픽셀 값으로 정확하게 지정하세요.
5. 불확실한 경우 screenshot 액션으로 최신 화면을 다시 확인하세요.
"""


class GeminiComputerAgent:
    def __init__(self, api_key: str, model_name: str = "gemini-2.5-flash"):
        self.client = genai.Client(api_key=api_key)
        self.model_name = model_name
        self.max_steps = 20

    def analyze_and_plan(
        self,
        screenshot: PIL.Image.Image,
        user_request: str,
        previous_actions: list[str] | None = None,
    ) -> dict:
        """
        현재 스크린샷과 사용자 요청을 Gemini에 전달하고
        실행할 액션 목록을 JSON으로 반환받습니다.
        """
        prev_str = ""
        if previous_actions:
            prev_str = "\n## 이전에 실행한 액션들\n" + "\n".join(
                f"- {a}" for a in previous_actions[-10:]
            )

        text_prompt = f"""## 사용자 요청
{user_request}
{prev_str}

위 요청을 달성하기 위해 현재 화면에서 다음에 해야 할 액션을 JSON으로 반환하세요.
반드시 순수 JSON만 반환하세요 (마크다운 코드블록 없이)."""

        # PIL 이미지를 JPEG bytes로 변환 (RGBA → RGB 변환 필수)
        buf = io.BytesIO()
        screenshot.convert("RGB").save(buf, format="JPEG", quality=85)
        img_bytes = buf.getvalue()

        response = self.client.models.generate_content(
            model=self.model_name,
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_bytes(data=img_bytes, mime_type="image/jpeg"),
                        types.Part.from_text(text_prompt),
                    ],
                )
            ],
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                temperature=0.1,
                max_output_tokens=2048,
            ),
        )

        raw_text = response.text.strip()
        return self._parse_response(raw_text)

    def _parse_response(self, raw_text: str) -> dict:
        """Gemini 응답에서 JSON을 추출하고 파싱합니다."""
        cleaned = re.sub(r"```(?:json)?\s*", "", raw_text).strip().rstrip("```").strip()

        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            cleaned = match.group(0)

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError as e:
            console.print(f"[red]JSON 파싱 실패: {e}[/red]")
            console.print(f"[dim]원본 응답:\n{raw_text}[/dim]")
            return {
                "thinking": "응답 파싱 실패 - 다시 화면을 분석합니다.",
                "task_complete": False,
                "actions": [{"type": "screenshot"}],
            }

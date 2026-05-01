"""
Gemini Computer Use - 웹 기반 제어 서버
"""

import asyncio
import base64
import io
import json
import os
from pathlib import Path

import uvicorn
from dotenv import load_dotenv, set_key
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse

from actions import execute_action
from gemini_agent import GeminiComputerAgent
from screen import take_screenshot

load_dotenv()

app = FastAPI(title="Gemini Computer Use")

static_dir = Path(__file__).parent / "static"
static_dir.mkdir(exist_ok=True)

ENV_PATH = Path(__file__).parent / ".env"

MAX_STEPS = 30
STEP_DELAY = 0.4

# 런타임 API 키 저장 (서버 재시작 전까지 유지)
_runtime_api_key: str = ""
_runtime_model: str = "gemini-2.5-flash"


def _load_env_key() -> str:
    """환경변수에서 유효한 API 키 로드 (placeholder 제외)"""
    key = os.getenv("GEMINI_API_KEY", "").strip()
    if key and key != "your_gemini_api_key_here" and len(key) > 10:
        return key
    return ""


def _load_env_model() -> str:
    return os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip() or "gemini-2.5-flash"


# 서버 시작 시 .env에서 유효한 키가 있으면 로드
_runtime_api_key = _load_env_key()
_runtime_model = _load_env_model()


def safe_screenshot_b64() -> str:
    """스크린샷 촬영 실패 시 빈 문자열 반환 (서버 크래시 방지)"""
    try:
        img = take_screenshot()
        buf = io.BytesIO()
        img.convert("RGB").save(buf, format="JPEG", quality=70)
        return base64.b64encode(buf.getvalue()).decode()
    except Exception:
        return ""


def make_agent(api_key: str, model: str) -> GeminiComputerAgent:
    return GeminiComputerAgent(api_key=api_key, model_name=model)


# ── HTTP ──────────────────────────────────────
@app.get("/", response_class=HTMLResponse)
async def index():
    return HTMLResponse((static_dir / "index.html").read_text(encoding="utf-8"))


@app.get("/api/key-status")
async def key_status():
    key = _runtime_api_key
    masked = (key[:6] + "••••" + key[-4:]) if len(key) > 10 else ""
    return {"has_key": bool(key), "masked": masked, "model": _runtime_model}


# ── WebSocket ─────────────────────────────────
@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    global _runtime_api_key, _runtime_model

    await ws.accept()

    async def send(msg_type: str, **kwargs):
        try:
            await ws.send_text(json.dumps({"type": msg_type, **kwargs}))
        except Exception:
            pass

    agent: GeminiComputerAgent | None = None
    running = False
    loop = asyncio.get_event_loop()

    try:
        # 연결 시 키 상태 전송 (UI 초기화)
        if _runtime_api_key:
            agent = make_agent(_runtime_api_key, _runtime_model)
            masked = _runtime_api_key[:6] + "••••" + _runtime_api_key[-4:]
            await send("key_ok", masked=masked, model=_runtime_model)
            await send("status", text="대기 중", running=False)
            await send("log", level="info", message="✅ API 키 확인 완료. 요청을 입력하세요.")
            # 스크린샷 (실패해도 연결 유지)
            b64 = await loop.run_in_executor(None, safe_screenshot_b64)
            if b64:
                await send("screenshot", data=b64)
            else:
                await send("log", level="warn", message="⚠ 화면 캡처 권한이 없습니다. macOS 설정 → 개인 정보 보호 → 화면 기록 → 터미널 허용 후 재시작하세요.")
        else:
            await send("need_key")
            await send("log", level="warn", message="🔑 Gemini API 키를 입력해주세요.")

        # 메인 메시지 루프
        while True:
            raw = await ws.receive_text()
            msg = json.loads(raw)
            action = msg.get("action")

            # ── API 키 설정 ──────────────────────────
            if action == "set_key":
                new_key = msg.get("key", "").strip()
                new_model = msg.get("model", "gemini-2.0-flash").strip()
                save = msg.get("save", False)

                if not new_key:
                    await send("log", level="error", message="❌ API 키가 비어 있습니다.")
                    await send("key_fail")
                    continue

                await send("log", level="dim", message="🔍 API 키 검증 중...")
                try:
                    test_agent = make_agent(new_key, new_model)
                    # 간단한 ping으로 유효성 확인
                    await loop.run_in_executor(
                        None,
                        lambda: test_agent.client.models.generate_content(
                            model=new_model, contents="hi"
                        ),
                    )
                    agent = test_agent
                    _runtime_api_key = new_key
                    _runtime_model = new_model

                    masked = new_key[:6] + "••••" + new_key[-4:]
                    await send("key_ok", masked=masked, model=new_model)
                    await send("log", level="success", message=f"✅ API 키 설정 완료! ({masked})")

                    if save:
                        ENV_PATH.touch(exist_ok=True)
                        set_key(str(ENV_PATH), "GEMINI_API_KEY", new_key)
                        set_key(str(ENV_PATH), "GEMINI_MODEL", new_model)
                        await send("log", level="success", message="💾 .env 파일에 저장되었습니다.")

                    b64 = await loop.run_in_executor(None, safe_screenshot_b64)
                    if b64:
                        await send("screenshot", data=b64)
                    else:
                        await send("log", level="warn", message="⚠ 화면 캡처 권한을 확인하세요. (시스템 설정 → 개인 정보 보호 → 화면 기록)")
                    await send("status", text="대기 중", running=False)

                except Exception as e:
                    await send("key_fail")
                    await send("log", level="error", message=f"❌ API 키 오류: {e}")
                continue

            # ── 키 없을 때 차단 ──────────────────────
            if agent is None:
                await send("need_key")
                await send("log", level="warn", message="🔑 먼저 API 키를 입력하세요.")
                continue

            # ── 작업 실행 ────────────────────────────
            if action == "run":
                user_request = msg.get("request", "").strip()
                if not user_request:
                    await send("log", level="warn", message="요청 내용이 비어 있습니다.")
                    continue

                running = True
                await send("status", text="실행 중", running=True)
                await send("log", level="info", message=f"📝 요청: {user_request}")

                executed: list[str] = []
                step = 0

                while running and step < MAX_STEPS:
                    step += 1
                    await send("step", number=step)
                    await send("log", level="dim", message=f"[스텝 {step}] 스크린샷 촬영...")

                    b64 = await loop.run_in_executor(None, safe_screenshot_b64)
                    if b64:
                        await send("screenshot", data=b64)

                    screenshot_img = await loop.run_in_executor(None, take_screenshot)

                    await send("log", level="dim", message="Gemini 분석 중...")
                    try:
                        result = await loop.run_in_executor(
                            None,
                            lambda: agent.analyze_and_plan(
                                screenshot=screenshot_img,
                                user_request=user_request,
                                previous_actions=executed,
                            ),
                        )
                    except Exception as e:
                        await send("log", level="error", message=f"Gemini 오류: {e}")
                        await asyncio.sleep(2)
                        continue

                    thinking = result.get("thinking", "")
                    if thinking:
                        await send("thinking", text=thinking)

                    if result.get("task_complete", False):
                        done_msg = next(
                            (a.get("message","") for a in result.get("actions",[]) if a.get("type")=="done"), ""
                        )
                        await send("log", level="success", message=f"✅ 작업 완료! {done_msg}")
                        running = False
                        break

                    actions_list = result.get("actions", [])
                    if not actions_list:
                        await send("log", level="warn", message="액션 없음 → 완료로 간주")
                        running = False
                        break

                    for act in actions_list:
                        if not running:
                            break
                        atype = act.get("type", "")
                        desc = act.get("description", "")

                        if atype == "done":
                            await send("log", level="success", message=f"✅ {act.get('message','완료')}")
                            running = False
                            break

                        if atype == "screenshot":
                            await send("log", level="dim", message="🔄 재스크린샷...")
                            await asyncio.sleep(0.3)
                            break

                        await send("action", action_type=atype, description=desc)
                        try:
                            result_msg = await loop.run_in_executor(None, lambda a=act: execute_action(a))
                            executed.append(f"[{step}] {atype}: {result_msg}")
                            await send("log", level="success", message=f"  ✓ {result_msg}")
                        except RuntimeError as e:
                            await send("log", level="error", message=f"⛔ {e}")
                            running = False
                            break
                        except Exception as e:
                            await send("log", level="error", message=f"  오류: {e}")
                            executed.append(f"[{step}] {atype}: 오류 - {e}")

                        await asyncio.sleep(STEP_DELAY)

                if step >= MAX_STEPS:
                    await send("log", level="warn", message=f"⚠ 최대 스텝({MAX_STEPS}) 도달.")

                running = False
                await send("status", text="대기 중", running=False)
                b64 = await loop.run_in_executor(None, safe_screenshot_b64)
                if b64:
                    await send("screenshot", data=b64)

            elif action == "stop":
                running = False
                await send("status", text="중단됨", running=False)
                await send("log", level="warn", message="⛔ 작업이 중단되었습니다.")

            elif action == "refresh":
                b64 = await loop.run_in_executor(None, safe_screenshot_b64)
                if b64:
                    await send("screenshot", data=b64)
                else:
                    await send("log", level="warn", message="화면 캡처 권한을 확인하세요.")

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await send("error", message=str(e))
        except Exception:
            pass


if __name__ == "__main__":
    uvicorn.run("server:app", host="127.0.0.1", port=7777, reload=False)

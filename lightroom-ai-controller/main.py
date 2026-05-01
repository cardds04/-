#!/usr/bin/env python3
"""
Gemini Computer Use - Lightroom Classic 자동 제어 프로그램
========================================================
사용자의 자연어 요청을 받아 Gemini AI가 화면을 분석하고
macOS + Lightroom Classic을 직접 제어합니다.

실행 방법:
  python main.py

요구사항:
  - .env 파일에 GEMINI_API_KEY 설정 필요
  - pip install -r requirements.txt
"""

import os
import sys
import time

from dotenv import load_dotenv
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt
from rich.rule import Rule
from rich.text import Text

from actions import execute_action
from gemini_agent import GeminiComputerAgent
from screen import get_screen_size, save_screenshot, take_screenshot

load_dotenv()
console = Console()


# ──────────────────────────────────────────────
# 설정
# ──────────────────────────────────────────────
MAX_STEPS_PER_TASK = 30      # 작업당 최대 실행 스텝
STEP_DELAY = 0.5             # 스텝 사이 대기 시간(초)
SCREENSHOT_SAVE_DIR = "logs" # 스크린샷 로그 저장 디렉토리
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")


def print_banner() -> None:
    banner = Text()
    banner.append("🤖 Gemini Computer Use\n", style="bold cyan")
    banner.append("Lightroom Classic 자동 제어 프로그램\n", style="white")
    banner.append(f"모델: {GEMINI_MODEL} | ", style="dim")
    w, h = get_screen_size()
    banner.append(f"화면 해상도: {w}×{h}", style="dim")
    console.print(Panel(banner, border_style="cyan"))
    console.print(
        "[yellow]💡 팁: 마우스를 화면 왼쪽 상단 모서리로 이동하면 즉시 중단됩니다.[/yellow]\n"
    )


def run_task(agent: GeminiComputerAgent, user_request: str) -> None:
    """
    사용자 요청 하나를 처리하는 메인 루프.
    스크린샷 → Gemini 분석 → 액션 실행을 반복합니다.
    """
    os.makedirs(SCREENSHOT_SAVE_DIR, exist_ok=True)

    executed_actions: list[str] = []
    step = 0

    console.print(Rule(f"[bold green]작업 시작: {user_request}[/bold green]"))

    while step < MAX_STEPS_PER_TASK:
        step += 1
        console.print(f"\n[bold]── 스텝 {step} ──[/bold]")

        # 1. 스크린샷 촬영
        console.print("[dim]스크린샷 촬영 중...[/dim]")
        screenshot = take_screenshot()
        save_screenshot(screenshot, f"{SCREENSHOT_SAVE_DIR}/step_{step:03d}.png")

        # 2. Gemini에 분석 요청
        console.print("[cyan]Gemini 분석 중...[/cyan]")
        try:
            result = agent.analyze_and_plan(
                screenshot=screenshot,
                user_request=user_request,
                previous_actions=executed_actions,
            )
        except Exception as e:
            console.print(f"[red]Gemini API 오류: {e}[/red]")
            time.sleep(2)
            continue

        # 3. Gemini의 사고 과정 출력
        thinking = result.get("thinking", "")
        if thinking:
            console.print(
                Panel(thinking, title="[yellow]🧠 AI 분석[/yellow]", border_style="yellow")
            )

        # 4. 작업 완료 여부 확인
        if result.get("task_complete", False):
            done_msg = ""
            for action in result.get("actions", []):
                if action.get("type") == "done":
                    done_msg = action.get("message", "")
            console.print(
                Panel(
                    f"✅ 작업 완료!\n{done_msg}",
                    border_style="green",
                    title="[bold green]완료[/bold green]",
                )
            )
            break

        # 5. 액션 실행
        actions = result.get("actions", [])
        if not actions:
            console.print("[yellow]액션이 없습니다. 작업이 완료된 것으로 간주합니다.[/yellow]")
            break

        for action in actions:
            action_type = action.get("type", "")
            description = action.get("description", "")

            # done 액션 처리
            if action_type == "done":
                console.print(
                    Panel(
                        f"✅ {action.get('message', '작업 완료')}",
                        border_style="green",
                    )
                )
                return

            # screenshot 액션은 루프를 재시작하면 됨
            if action_type == "screenshot":
                console.print("[dim]새 스크린샷 촬영 후 재분석...[/dim]")
                time.sleep(0.5)
                break

            log = f"[Step {step}] {action_type}"
            if description:
                log += f" - {description}"

            console.print(f"  ▶ [bold]{action_type}[/bold] {description}")

            try:
                result_msg = execute_action(action)
                executed_actions.append(f"{log}: {result_msg}")
                console.print(f"    [green]✓ {result_msg}[/green]")
            except RuntimeError as e:
                console.print(f"[red bold]⛔ {e}[/red bold]")
                return
            except Exception as e:
                console.print(f"  [red]오류: {e}[/red]")
                executed_actions.append(f"{log}: 오류 - {e}")

            time.sleep(STEP_DELAY)

    else:
        console.print(
            f"[yellow]⚠ 최대 스텝({MAX_STEPS_PER_TASK})에 도달했습니다. 작업을 종료합니다.[/yellow]"
        )


def main() -> None:
    # API 키 확인
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        console.print(
            "[red bold]오류: GEMINI_API_KEY가 설정되지 않았습니다.[/red bold]\n"
            ".env 파일에 GEMINI_API_KEY=your_key_here 형식으로 입력하세요."
        )
        sys.exit(1)

    print_banner()

    # Gemini 에이전트 초기화
    console.print(f"[dim]Gemini 에이전트 초기화 중 ({GEMINI_MODEL})...[/dim]")
    try:
        agent = GeminiComputerAgent(api_key=api_key, model_name=GEMINI_MODEL)
        console.print("[green]✓ 에이전트 준비 완료[/green]\n")
    except Exception as e:
        console.print(f"[red]에이전트 초기화 실패: {e}[/red]")
        sys.exit(1)

    console.print("요청 예시:")
    console.print("  • [italic]노출을 -0.5로 설정해줘[/italic]")
    console.print("  • [italic]하이라이트를 -100으로 내려줘[/italic]")
    console.print("  • [italic]현재 슬라이더 값들을 알려줘[/italic]")
    console.print("  • [italic]화이트 밸런스를 자동으로 설정해줘[/italic]")
    console.print("  • [italic]현상 패널 기본값으로 초기화해줘[/italic]\n")

    # 대화형 루프
    while True:
        try:
            user_input = Prompt.ask(
                "\n[bold cyan]요청 입력[/bold cyan] (종료: q 또는 quit)",
                default="",
            ).strip()
        except (KeyboardInterrupt, EOFError):
            console.print("\n[yellow]프로그램을 종료합니다.[/yellow]")
            break

        if not user_input:
            continue

        if user_input.lower() in ("q", "quit", "exit", "종료"):
            console.print("[yellow]프로그램을 종료합니다.[/yellow]")
            break

        run_task(agent, user_input)


if __name__ == "__main__":
    main()

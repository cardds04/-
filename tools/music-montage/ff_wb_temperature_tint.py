#!/usr/bin/env python3
"""
FFmpeg colortemperature + colorbalance(gm) 로 화이트밸런스 미세 조정.

  python3 ff_wb_temperature_tint.py 입력.mp4 출력.mp4 --kelvin 5200 --tint 15
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


def build_wb_temperature_tint_vf_chain(
    kelvin: int = 6500,
    tint_ui: int = 0,
) -> str:
    """
    색온도(Kelvin)와 색조(틴트)를 하나의 -vf 문자열로 만든다.

    - 색온도: colortemperature 필터, 1000~40000K (기본 6500).
    - 색조: colorbalance 의 gm (Green midtones).
      UI -100(마젠타) ~ +100(그린) → gm -0.1 ~ +0.1
    """
    k = max(1000, min(40000, int(kelvin)))
    t = max(-100, min(100, int(tint_ui)))
    gm = (t / 100.0) * 0.1
    gm = max(-0.1, min(0.1, gm))
    return f"colortemperature=temperature={k:.1f},colorbalance=gm={gm:.6f}"


def run_ffmpeg_with_wb_temperature_tint(
    input_path: Path,
    output_path: Path,
    *,
    kelvin: int = 6500,
    tint_ui: int = 0,
    video_codec: str = "libx264",
    crf: str = "20",
    preset: str = "veryfast",
    pix_fmt: str = "yuv420p",
    audio_mode: str = "copy",
) -> None:
    """
    단일 입력 영상에 WB vf 체인을 적용해 인코딩한다.

    audio_mode: \"copy\"(기본) 또는 \"aac\" 등 ffmpeg가 받는 오디오 코덱 이름.
    """
    inp = Path(input_path).expanduser().resolve()
    out = Path(output_path).expanduser().resolve()
    if not inp.is_file():
        raise FileNotFoundError(str(inp))
    out.parent.mkdir(parents=True, exist_ok=True)

    vf = build_wb_temperature_tint_vf_chain(kelvin=kelvin, tint_ui=tint_ui)
    cmd: list[str] = [
        "ffmpeg",
        "-y",
        "-hide_banner",
        "-loglevel",
        "warning",
        "-i",
        str(inp),
        "-vf",
        vf,
        "-c:v",
        video_codec,
        "-preset",
        preset,
        "-crf",
        str(crf),
        "-pix_fmt",
        pix_fmt,
    ]
    if audio_mode == "copy":
        cmd.extend(["-c:a", "copy"])
    else:
        cmd.extend(["-c:a", audio_mode])
    cmd.append(str(out))

    cp = subprocess.run(cmd, capture_output=True, text=True)
    if cp.returncode != 0:
        err = (cp.stderr or "").strip() or (cp.stdout or "").strip() or f"exit {cp.returncode}"
        raise RuntimeError(f"ffmpeg 실패:\n{err}\n명령: {' '.join(cmd[:10])} …")


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="colortemperature + colorbalance(gm) WB 조정")
    p.add_argument("input", type=Path, help="입력 영상")
    p.add_argument("output", type=Path, help="출력 영상")
    p.add_argument(
        "--kelvin",
        type=int,
        default=6500,
        help="색온도 1000~40000 K (기본 6500)",
    )
    p.add_argument(
        "--tint",
        type=int,
        default=0,
        help="색조 -100(마젠타)~+100(그린), gm에 매핑",
    )
    p.add_argument("--crf", type=str, default="20")
    args = p.parse_args(argv)

    k = max(1000, min(40000, args.kelvin))
    print(f"-vf 체인: {build_wb_temperature_tint_vf_chain(kelvin=k, tint_ui=args.tint)}")
    try:
        run_ffmpeg_with_wb_temperature_tint(
            args.input,
            args.output,
            kelvin=k,
            tint_ui=args.tint,
            crf=args.crf,
        )
    except (OSError, RuntimeError) as e:
        print(e, file=sys.stderr)
        return 1
    print(f"저장: {args.output.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

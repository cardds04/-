#!/usr/bin/env python3
"""CLI: 음악 피크에 맞춰 영상 이어붙이기. GUI는 montage_gui.py"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

from montage_lib import montage_output_filename_stem_from_preset, run_montage


def main() -> None:
    parser = argparse.ArgumentParser(description="음악 피크에 맞춰 영상 이어붙이기")
    parser.add_argument("--videos", required=True, type=Path, help="영상 파일이 있는 폴더")
    parser.add_argument(
        "--music",
        required=True,
        type=Path,
        help="음악 파일 또는 음악이 있는 폴더(폴더면 파일명 순서대로, 재실행 시 이어서 1곡)",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=None,
        help="출력 mp4. 생략 시 영상 폴더에 「프리셋태그」.mp4 (같은 이름 있으면 시각 접미사)",
    )
    parser.add_argument("--window", type=float, default=4.0, help="피크 탐색 창 길이(초), 기본 4")
    parser.add_argument(
        "--peak-from",
        type=float,
        default=3.0,
        dest="peak_from",
        help="창 안에서 피크를 찾기 시작하는 시각(초, 창 시작 기준). 기본 3 (=3~4초 구간, 창 4초일 때)",
    )
    parser.add_argument("--width", type=int, default=1920, help="출력 가로 (기본 시네마, tri_stack이면 무시)")
    parser.add_argument("--height", type=int, default=850, help="출력 세로 (기본 시네마, tri_stack이면 무시)")
    parser.add_argument(
        "--layout",
        choices=("fullframe", "tri_stack"),
        default="fullframe",
        help="fullframe=한 클립 전체화면, tri_stack=3개씩 위·중·아래 동시(1080×1920, 3의 배수만 사용)",
    )
    parser.add_argument(
        "--audio-fade-out",
        type=float,
        default=5.0,
        help="끝나기 전 오디오 페이드아웃 길이(초), 기본 5",
    )
    parser.add_argument(
        "--clip-trim-start",
        type=float,
        default=0.5,
        help="각 원본 클립 앞부분 건너뛸 시간(초), 기본 0.5",
    )
    parser.add_argument(
        "--letterbox-open",
        type=float,
        default=2.0,
        help="도입 검은 화면에서 밝아지는 페이드 길이(초), 0이면 끔, 기본 2",
    )
    parser.add_argument(
        "--letterbox-close",
        type=float,
        default=2.0,
        help="끝으로 갈수록 어두워지는 페이드 길이(초), 0이면 끔, 기본 2",
    )
    parser.add_argument(
        "--logo",
        type=Path,
        default=None,
        help="로고 이미지(PNG 등). 생략 시 미적용",
    )
    parser.add_argument(
        "--tail-black",
        type=float,
        default=2.0,
        dest="tail_black",
        help="본문 끝 검은 화면 추가 길이(초), 기본 2",
    )
    parser.add_argument(
        "--auto-wb",
        action="store_true",
        dest="auto_wb",
        help="FFmpeg grayworld 자동 화이트밸런스(클립마다)",
    )
    parser.add_argument(
        "--auto-wb-strength",
        type=float,
        default=100.0,
        dest="auto_wb_strength",
        metavar="PCT",
        help="화이트밸런스 강도 0~100%% (100=순수 grayworld, 낮추면 원본과 블렌드)",
    )
    args = parser.parse_args()

    out_tag = montage_output_filename_stem_from_preset(
        {"layout": args.layout, "w": args.width, "h": args.height, "label": ""}
    )

    try:
        run_montage(
            args.music.resolve(),
            args.output,
            videos_dir=args.videos.resolve(),
            video_files=None,
            window_sec=args.window,
            peak_band_start=args.peak_from,
            width=args.width,
            height=args.height,
            layout=args.layout,
            output_preset_tag=out_tag,
            audio_fade_out_sec=max(0.0, args.audio_fade_out),
            clip_trim_start_sec=max(0.0, args.clip_trim_start),
            letterbox_open_sec=max(0.0, args.letterbox_open),
            letterbox_close_sec=max(0.0, args.letterbox_close),
            tail_black_sec=max(0.0, args.tail_black),
            logo_path=args.logo.resolve() if args.logo else None,
            auto_wb_grade=bool(args.auto_wb),
            auto_wb_strength=max(0.0, min(1.0, float(args.auto_wb_strength) / 100.0)),
            log=print,
        )
    except (OSError, RuntimeError, ValueError, subprocess.CalledProcessError) as e:
        print(e, file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

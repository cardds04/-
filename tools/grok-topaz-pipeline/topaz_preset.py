"""
고정 Topaz 내보내기 프리셋 (filter_complex + 출력 인자 + 입력 직후 옵션).
번들 FFmpeg 경로는 아래 상수 하나로 통일합니다.

출력은 몽타주·NLE 호환을 위해 CFR 고정·일반 MP4(faststart)로 두고,
스트리밍용 프래그먼트(frag_keyframe 등)와 fps passthrough는 쓰지 않습니다.
"""

from __future__ import annotations

from pathlib import Path

# 항상 동일한 Topaz 번들 ffmpeg (SSD)
TOPAZ_FFMPEG_PATH = "/Volumes/ssd/Applications/Topaz Video.app/Contents/MacOS/ffmpeg"

# 인코딩할 구간(초). None이면 입력 파일 전체.
# 짧은 구간만 시험할 때만 예: TOPAZ_SEGMENT_DURATION_SEC = 6.0 (-t 6, 앞 6초만)
TOPAZ_SEGMENT_START_SEC: float | None = None  # 양수일 때만 FFmpeg -ss (0초 시작은 -ss 생략)
TOPAZ_SEGMENT_DURATION_SEC: float | None = None  # None이면 전체; 양수면 그 길이만 인코딩

# 최종 MP4 CFR (편집기·몽타주와 맞춤). 팬 영상이 60fps면 60으로 통일해도 됨.
TOPAZ_OUTPUT_FPS = 24

# Topaz 「보내기 명령」의 -filter_complex 따옴표 안
FILTER_COMPLEX = (
    "tvai_fi=model=apo-8:slowmo=4:rdt=0.01:device=0:vram=1:instances=1,"
    "tvai_up=model=prob-4:scale=0:w=1920:h=1080:"
    "preblur=-0.21023399999999998:noise=0.0561137:details=0.127749:halo=0.0849279:"
    "blur=0.0758914:compression=0.316099:blend=0.2:device=0:vram=1:instances=1,"
    "scale=w=1920:h=1080:flags=lanczos:threads=0"
)

# -i 입력 파일 직후 (Topaz 내보내기와 동일 순서)
POST_INPUT_ARGS = [
    "-flush_packets",
    "1",
    "-sws_flags",
    "spline+accurate_rnd+full_chroma_int",
]

# -filter_complex 이후 ~ 출력 파일 직전
_EXTRA_META = (
    "videoai=Slowmo 400% using apo-8 replacing duplicate frames. "
    "Enhanced using prob-4; mode: manual; revert compression at 32; recover details at 13; "
    "sharpen at 8; reduce noise at 6; dehalo at 8; anti-alias/deblur at -21; focus fix Off; "
    "and recover original detail at 20. Changed resolution to 1920x1080"
)

EXTRA_AFTER_FILTER = [
    "-fflags",
    "+flush_packets",
    "-c:v",
    "h264_videotoolbox",
    "-profile:v",
    "high",
    "-pix_fmt",
    "yuv420p",
    "-allow_sw",
    "1",
    "-g",
    str(TOPAZ_OUTPUT_FPS),
    "-b:v",
    "0",
    "-q:v",
    "82",
    "-an",
    "-map_metadata",
    "0",
    "-map_metadata:s:v",
    "0:s:v",
    "-fps_mode",
    "cfr",
    "-r",
    str(TOPAZ_OUTPUT_FPS),
    "-movflags",
    "+faststart+use_metadata_tags",
    "-bf",
    "0",
    "-metadata",
    _EXTRA_META,
]


def ffmpeg_path() -> Path:
    return Path(TOPAZ_FFMPEG_PATH)


def filter_complex() -> str:
    return FILTER_COMPLEX


# xAI 문서 기준 비율 → Topaz prob-4 최종 scale (16:9 기본 프리셋의 1920×1080 패턴을 비율에 맞게 치환)
_GROK_TOPAZ_OUT_WH: dict[str, tuple[int, int]] = {
    "16:9": (1920, 1080),
    "9:16": (1080, 1920),
    "1:1": (1080, 1080),
    "4:3": (1920, 1440),
    "3:4": (1080, 1440),
    "3:2": (1920, 1280),
    "2:3": (1080, 1620),
}


def filter_complex_for_grok_aspect(aspect_ratio: str) -> str:
    """Grok(+Topaz 프리셋)용: Grok에서 고른 비율에 맞춰 출력 해상도만 바꿉니다."""
    ar = (aspect_ratio or "16:9").strip().lower().replace("∶", ":")
    w, h = _GROK_TOPAZ_OUT_WH.get(ar, (1920, 1080))
    return FILTER_COMPLEX.replace("w=1920:h=1080", f"w={w}:h={h}")


def post_input_args() -> list[str]:
    return list(POST_INPUT_ARGS)


def extra_after_filter() -> list[str]:
    return list(EXTRA_AFTER_FILTER)


def segment_start_sec_for_ffmpeg() -> float | None:
    """0초부터 자를 때는 None(-ss 생략). 양수면 해당 초부터."""
    s = TOPAZ_SEGMENT_START_SEC
    if s is None or s <= 0:
        return None
    return float(s)


def segment_duration_sec_for_ffmpeg() -> float | None:
    """None 또는 0 이하면 -t 생략(전체). 양수면 그 길이만 인코딩."""
    d = TOPAZ_SEGMENT_DURATION_SEC
    if d is None or d <= 0:
        return None
    return float(d)

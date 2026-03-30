#!/usr/bin/env python3
"""
인테리어 영상/사진 폴더 배치: 전수 스캔 → 글로벌 기준 → ±15% 노출·10% WB 이상치만 선택 보정.
전부 정상이면 인코딩 없이 종료. 그 외에는 마스터 노출·웜 색온도·colorlevels·unsharp를 전 파일에 적용.

  python3 tools/interior_batch_selective_grade.py ./clips -o ./out
"""

from __future__ import annotations

import argparse
import csv
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import auto_exposure_wb as aew

# -----------------------------------------------------------------------------
# 마스터 노출: 자동 보정 여부와 무관하게 모든 출력에 더해지는 eq.brightness (대략 -1~1)
# 예: 0.06 ≈ 살짝 밝게(반 스탑 느낌은 장면마다 다름)
# -----------------------------------------------------------------------------
MASTER_EXPOSURE_OFFSET: float = 0.0

EXPOSURE_OUTLIER_FRAC: float = 0.15
WB_OUTLIER_FRAC: float = 0.10
WARM_K_MIN: float = 6500.0
WARM_K_MAX: float = 7000.0
DEFAULT_WARM_K: float = 6720.0

EQ_PULL_GAIN: float = 1.05
EQ_AUTO_CAP: float = 0.28
EQ_TOTAL_CAP: float = 0.38
WB_CB_CAP: float = 0.14
WB_CB_GAIN: float = 1.35

SCAN_MAX_SIDE: int = 960
UNSHARP_LA: float = 0.62
UNSHARP_LX: int = 5
UNSHARP_LY: int = 5

VIDEO_EXTS = aew.VIDEO_EXTS
IMAGE_EXTS = aew.IMAGE_EXTS
ALL_MEDIA = VIDEO_EXTS | IMAGE_EXTS


@dataclass
class FrameMetrics:
    path: Path
    p70_lum: float
    r_mean: float
    g_mean: float
    b_mean: float
    r_p5: float
    r_p95: float
    g_p5: float
    g_p95: float
    b_p5: float
    b_p95: float


@dataclass
class GlobalBatchStats:
    mean_p70: float
    mean_r: float
    mean_g: float
    mean_b: float
    n: int


def _iter_media_files(root: Path, recursive: bool) -> Iterable[Path]:
    it = root.rglob("*") if recursive else root.iterdir()
    for p in sorted(it):
        if p.is_file() and p.suffix.lower() in ALL_MEDIA:
            yield p


def _sample_ppm(path: Path, at_sec: float) -> bytes | None:
    vf = f"scale='min({SCAN_MAX_SIDE},iw)':-2"
    try:
        cp = subprocess.run(
            [
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "error",
                "-ss",
                f"{max(0.0, at_sec):.4f}",
                "-i",
                str(path),
                "-frames:v",
                "1",
                "-vf",
                vf,
                "-f",
                "image2pipe",
                "-vcodec",
                "ppm",
                "pipe:1",
            ],
            capture_output=True,
            timeout=120,
        )
    except (OSError, subprocess.TimeoutExpired, ValueError):
        return None
    if cp.returncode != 0 or not cp.stdout:
        return None
    return cp.stdout


def analyze_frame_metrics(path: Path, at_sec: float) -> FrameMetrics | None:
    raw = _sample_ppm(path, at_sec)
    if raw is None:
        return None
    parsed = aew._parse_ppm6_header_and_pixels(raw)
    if parsed is None:
        return None
    w, h, maxv, pix = parsed
    mv = float(maxv)
    if w <= 0 or h <= 0 or mv <= 0:
        return None
    n = w * h
    step = max(1, n // 200_000)
    rs: list[float] = []
    gs: list[float] = []
    bs: list[float] = []
    lum: list[float] = []
    j = 0
    while j + 2 < len(pix):
        r = pix[j] / mv
        g = pix[j + 1] / mv
        b = pix[j + 2] / mv
        rs.append(r)
        gs.append(g)
        bs.append(b)
        lum.append((r + g + b) / 3.0)
        j += 3 * step
    if len(lum) < 64:
        return None
    rs.sort()
    gs.sort()
    bs.sort()
    lum.sort()
    return FrameMetrics(
        path=path.resolve(),
        p70_lum=aew.percentile_linear(lum, 70.0),
        r_mean=sum(rs) / len(rs),
        g_mean=sum(gs) / len(gs),
        b_mean=sum(bs) / len(bs),
        r_p5=aew.percentile_linear(rs, 5.0),
        r_p95=aew.percentile_linear(rs, 95.0),
        g_p5=aew.percentile_linear(gs, 5.0),
        g_p95=aew.percentile_linear(gs, 95.0),
        b_p5=aew.percentile_linear(bs, 5.0),
        b_p95=aew.percentile_linear(bs, 95.0),
    )


def scan_folder(folder: Path, *, recursive: bool) -> list[FrameMetrics]:
    out: list[FrameMetrics] = []
    for p in _iter_media_files(folder, recursive):
        ss = aew.pick_sample_sec(p) if p.suffix.lower() in VIDEO_EXTS else 0.0
        m = analyze_frame_metrics(p, ss)
        if m is not None:
            out.append(m)
    return out


def compute_global_stats(metrics: list[FrameMetrics]) -> GlobalBatchStats | None:
    if not metrics:
        return None
    n = len(metrics)
    return GlobalBatchStats(
        mean_p70=sum(x.p70_lum for x in metrics) / n,
        mean_r=sum(x.r_mean for x in metrics) / n,
        mean_g=sum(x.g_mean for x in metrics) / n,
        mean_b=sum(x.b_mean for x in metrics) / n,
        n=n,
    )


def is_exposure_outlier(fm: FrameMetrics, g: GlobalBatchStats) -> bool:
    ref = max(g.mean_p70, 1e-6)
    return abs(fm.p70_lum - g.mean_p70) / ref > EXPOSURE_OUTLIER_FRAC


def is_wb_outlier(fm: FrameMetrics, g: GlobalBatchStats) -> bool:
    r, gg, b = fm.r_mean, fm.g_mean, fm.b_mean
    gr, gg0, gb = g.mean_r, g.mean_g, g.mean_b
    lo = min(r, gg, b)
    hi = max(r, gg, b)
    if lo < 1e-5:
        return False
    if hi / lo > 1.0 + WB_OUTLIER_FRAC:
        return True
    mf = (r + gg + b) / 3.0
    mg = (gr + gg0 + gb) / 3.0
    if mf < 1e-5 or mg < 1e-5:
        return False
    for a, ga in ((r, gr), (gg, gg0), (b, gb)):
        rf = a / mf
        rg = ga / mg
        if abs(rf - rg) / max(rg, 0.04) > WB_OUTLIER_FRAC:
            return True
    return False


def colorlevels_guard_vf(fm: FrameMetrics, *, highlight_compress: float) -> str:
    """블랙/화이트 포인트 스트레치 + 하이라이트 살짝 눌러 날림 완화. preserve=lum."""
    hc = max(0.88, min(0.995, float(highlight_compress)))
    rr_lo, rr_hi = fm.r_p5, min(1.0, fm.r_p95 * hc)
    gr_lo, gr_hi = fm.g_p5, min(1.0, fm.g_p95 * hc)
    br_lo, br_hi = fm.b_p5, min(1.0, fm.b_p95 * hc)
    if rr_hi < rr_lo + 1e-4:
        rr_hi = min(1.0, rr_lo + 0.05)
    if gr_hi < gr_lo + 1e-4:
        gr_hi = min(1.0, gr_lo + 0.05)
    if br_hi < br_lo + 1e-4:
        br_hi = min(1.0, br_lo + 0.05)
    return (
        f"colorlevels=rimin={rr_lo:.5f}:gimin={gr_lo:.5f}:bimin={br_lo:.5f}"
        f":rimax={rr_hi:.5f}:gimax={gr_hi:.5f}:bimax={br_hi:.5f}"
        f":romin=0:gomin=0:bomin=0:romax=1:gomax=1:bomax=1:preserve=lum"
    )


def colorbalance_toward_global(fm: FrameMetrics, g: GlobalBatchStats) -> str | None:
    """파일 RGB 평균을 배치 글로벌 평균 비율에 가깝게 미드톤 colorbalance."""
    r, gg, b = fm.r_mean, fm.g_mean, fm.b_mean
    tr, tg, tb = g.mean_r, g.mean_g, g.mean_b
    m = (r + gg + b) / 3.0
    tm = (tr + tg + tb) / 3.0
    if m < 1e-4 or tm < 1e-4:
        return None
    dr = (tr / tm) * m - r
    dg = (tg / tm) * m - gg
    db = (tb / tm) * m - b
    c = WB_CB_CAP
    gn = WB_CB_GAIN
    rm = max(-c, min(c, dr * gn))
    gm = max(-c, min(c, dg * gn))
    bm = max(-c, min(c, db * gn))
    if abs(rm) < 1e-5 and abs(gm) < 1e-5 and abs(bm) < 1e-5:
        return None
    return f"colorbalance=rm={rm:.5f}:gm={gm:.5f}:bm={bm:.5f}"


def build_vf_for_file(
    fm: FrameMetrics,
    g: GlobalBatchStats,
    *,
    exposure_outlier: bool,
    wb_outlier: bool,
    master_offset: float,
    warm_k: float,
) -> tuple[str, list[str]]:
    """(vf 문자열, 사람 읽기 이유 태그들)."""
    reasons: list[str] = []
    brightening = False
    b_auto = 0.0
    if exposure_outlier and g.mean_p70 > 1e-6:
        b_auto = (g.mean_p70 - fm.p70_lum) * EQ_PULL_GAIN
        b_auto = max(-EQ_AUTO_CAP, min(EQ_AUTO_CAP, b_auto))
        if fm.p70_lum < g.mean_p70:
            reasons.append("노출 낮음(글로벌 P70 대비)")
        else:
            reasons.append("노출 높음(글로벌 P70 대비)")
        brightening = b_auto > 0.02
    b_total = b_auto + float(master_offset)
    b_total = max(-EQ_TOTAL_CAP, min(EQ_TOTAL_CAP, b_total))
    if abs(float(master_offset)) > 1e-8:
        reasons.append(f"마스터 노출 {float(master_offset):+.3f}")

    hi_compress = 0.97 if brightening else 0.99
    parts: list[str] = [colorlevels_guard_vf(fm, highlight_compress=hi_compress)]

    parts.append(f"eq=brightness={b_total:.5f}:contrast=1.0")

    if wb_outlier:
        cb = colorbalance_toward_global(fm, g)
        if cb:
            parts.append(cb)
        reasons.append("화이트밸런스 편차(채널/글로벌)")
    wk = max(WARM_K_MIN, min(WARM_K_MAX, float(warm_k)))
    parts.append(f"colortemperature=temperature={wk:.1f}:mix=1:pl=0.08")
    parts.append(
        f"unsharp=lx={UNSHARP_LX}:ly={UNSHARP_LY}:la={UNSHARP_LA:.3f}:cx=5:cy=5:ca=0"
    )
    return ",".join(parts), reasons


def _is_video(p: Path) -> bool:
    return p.suffix.lower() in VIDEO_EXTS


def _ffprobe_has_audio(path: Path) -> bool:
    return aew._ffprobe_has_audio(path)


def encode_one(
    src: Path,
    dst: Path,
    vf: str,
    *,
    overwrite: bool,
    video_crf: int = 20,
    video_preset: str = "medium",
) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    cmd: list[str | Path]
    if _is_video(src):
        cmd = ["ffmpeg", "-hide_banner", "-loglevel", "warning"]
        if overwrite:
            cmd.append("-y")
        cmd.extend(["-i", str(src), "-vf", vf, "-map", "0:v:0"])
        cmd.extend(
            ["-c:v", "libx264", "-crf", str(int(video_crf)), "-preset", video_preset]
        )
        if _ffprobe_has_audio(src):
            cmd.extend(["-map", "0:a:0", "-c:a", "copy"])
        cmd.extend(["-movflags", "+faststart", str(dst)])
    else:
        cmd = ["ffmpeg", "-hide_banner", "-loglevel", "warning"]
        if overwrite:
            cmd.append("-y")
        cmd.extend(["-i", str(src), "-vf", vf, "-frames:v", "1"])
        ext = dst.suffix.lower()
        if ext in (".jpg", ".jpeg"):
            cmd.extend(["-q:v", "2"])
        elif ext == ".png":
            pass
        else:
            cmd.extend(["-q:v", "2"])
        cmd.append(str(dst))
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError((r.stderr or r.stdout or "")[:800])


def run_batch(
    folder: Path,
    out_root: Path,
    *,
    recursive: bool,
    master_offset: float | None,
    warm_k: float | None,
    overwrite: bool,
    video_crf: int,
    dry_run: bool,
) -> int:
    folder = folder.resolve()
    out_root = out_root.resolve()
    if not folder.is_dir():
        print(f"폴더가 아닙니다: {folder}", file=sys.stderr)
        return 2

    m_off = MASTER_EXPOSURE_OFFSET if master_offset is None else float(master_offset)
    wk = DEFAULT_WARM_K if warm_k is None else float(warm_k)

    print(f"1단계: 스캔 중… ({folder})")
    metrics = scan_folder(folder, recursive=recursive)
    if not metrics:
        print("미디어를 찾지 못했거나 샘플 분석에 실패했습니다.", file=sys.stderr)
        return 1

    g = compute_global_stats(metrics)
    assert g is not None
    print(
        f"글로벌 기준: P70(휘도)={g.mean_p70:.4f}  R̄={g.mean_r:.4f} Ḡ={g.mean_g:.4f} B̄={g.mean_b:.4f}  (n={g.n})"
    )

    flags: list[tuple[FrameMetrics, bool, bool]] = []
    for fm in metrics:
        eo = is_exposure_outlier(fm, g)
        wo = is_wb_outlier(fm, g)
        flags.append((fm, eo, wo))

    any_work = any(eo or wo for _, eo, wo in flags)
    if not any_work:
        print("보정이 필요 없는 완벽한 상태입니다 (노출 ±15%·WB 기준 내). 출력·인코딩 없음.")
        return 0

    adj_dir = out_root / "selective_corrected"
    tone_dir = out_root / "batch_tone_only"
    log_path = out_root / "batch_grade_report.csv"

    if not dry_run:
        adj_dir.mkdir(parents=True, exist_ok=True)
        tone_dir.mkdir(parents=True, exist_ok=True)

    rows: list[list[str]] = []
    print("3~5단계: 이상치는 선택 보정 + 전원 마스터·웜톤·가드·unsharp …")
    for fm, eo, wo in flags:
        selective = eo or wo
        vf, reasons = build_vf_for_file(
            fm,
            g,
            exposure_outlier=eo,
            wb_outlier=wo,
            master_offset=m_off,
            warm_k=wk,
        )
        sub = adj_dir if selective else tone_dir
        dst = sub / fm.path.name
        reason_str = "; ".join(reasons) if reasons else "정상 구간(웜톤·가드·선명만)"
        rows.append(
            [
                str(fm.path),
                str(dst),
                "selective" if selective else "tone_only",
                "yes" if eo else "no",
                "yes" if wo else "no",
                reason_str,
                vf[:200] + ("…" if len(vf) > 200 else ""),
                "",
            ]
        )
        print(f"  {'[보정]' if selective else '[톤만]'} {fm.path.name} — {reason_str}")
        if dry_run:
            continue
        try:
            encode_one(fm.path, dst, vf, overwrite=overwrite, video_crf=video_crf)
        except RuntimeError as e:
            print(f"    실패: {e}", file=sys.stderr)
            rows[-1][-1] = str(e)[:300]

    if not dry_run:
        out_root.mkdir(parents=True, exist_ok=True)
        with log_path.open("w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(
                [
                    "source",
                    "output",
                    "bucket",
                    "exposure_outlier",
                    "wb_outlier",
                    "reason_ko",
                    "vf_prefix",
                    "error",
                ]
            )
            for row in rows:
                w.writerow(row)
        print(f"로그: {log_path}")
        print(f"선택 보정 출력: {adj_dir}")
        print(f"정상(배치 톤만) 출력: {tone_dir}")

    return 0


def main() -> None:
    ap = argparse.ArgumentParser(
        description="폴더 전수 스캔 → 글로벌 P70·RGB 평균 → 이상치만 선택 보정 + 마스터·웜·가드"
    )
    ap.add_argument("folder", type=Path, help="입력 폴더")
    ap.add_argument("-o", "--output", type=Path, required=True, help="출력 루트")
    ap.add_argument("-r", "--recursive", action="store_true")
    ap.add_argument(
        "--master-exposure",
        type=float,
        default=None,
        help=f"코드 상단 MASTER_EXPOSURE_OFFSET 대신 이 값 사용 (eq.brightness 가산, 기본=모듈 상수 {MASTER_EXPOSURE_OFFSET})",
    )
    ap.add_argument(
        "--warm-k",
        type=float,
        default=None,
        help=f"색온도 K ({WARM_K_MIN:.0f}~{WARM_K_MAX:.0f}), 기본 {DEFAULT_WARM_K}",
    )
    ap.add_argument("--crf", type=int, default=20)
    ap.add_argument("-n", "--dry-run", action="store_true")
    args = ap.parse_args()
    sys.exit(
        run_batch(
            args.folder,
            args.output,
            recursive=args.recursive,
            master_offset=args.master_exposure,
            warm_k=args.warm_k,
            overwrite=True,
            video_crf=args.crf,
            dry_run=args.dry_run,
        )
    )


if __name__ == "__main__":
    main()

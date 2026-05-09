"""Phase 1 검증: 클립 폴더 → 중간 프레임 추출 → 자동 레퍼런스 선택
→ Reinhard 매칭 → before/after PNG 그리드 저장.

사용:
    python -m color_match.phase1_preview <clips_folder> [-o out_dir] [-n 8]
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import cv2
import numpy as np

# package-relative imports
try:
    from .color_transfer import reinhard_transfer_bgr
    from .frame_extractor import extract_mid_frames
    from .reference_picker import pick_reference
except ImportError:  # 직접 실행 fallback
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from color_match.color_transfer import reinhard_transfer_bgr  # noqa: E402
    from color_match.frame_extractor import extract_mid_frames  # noqa: E402
    from color_match.reference_picker import pick_reference  # noqa: E402


VIDEO_EXTS = {".mp4", ".mov", ".m4v", ".mkv"}


def _list_videos(folder: Path) -> list[Path]:
    files = []
    for p in sorted(folder.iterdir()):
        if p.name.startswith("._"):
            continue
        if p.is_file() and p.suffix.lower() in VIDEO_EXTS:
            files.append(p)
    return files


def _annotate(img: np.ndarray, text: str) -> np.ndarray:
    out = img.copy()
    h, w = out.shape[:2]
    pad_h = 36
    bar = np.zeros((pad_h, w, 3), dtype=np.uint8)
    cv2.putText(
        bar,
        text,
        (10, 24),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (240, 240, 240),
        2,
        cv2.LINE_AA,
    )
    return np.vstack([bar, out])


def _resize_to_h(img: np.ndarray, target_h: int) -> np.ndarray:
    h, w = img.shape[:2]
    new_w = max(1, int(round(w * target_h / h)))
    return cv2.resize(img, (new_w, target_h), interpolation=cv2.INTER_AREA)


def build_grid(
    items: list[tuple[Path, np.ndarray, np.ndarray]],
    ref_idx: int,
    cell_h: int = 360,
    cols: int = 2,
) -> np.ndarray:
    """items: (path, before_bgr, after_bgr). 각 행 = 한 클립 [before | after]."""
    rows = []
    for i, (p, before, after) in enumerate(items):
        is_ref = i == ref_idx
        b_label = f"{p.name}  [원본{'  ★ 레퍼런스' if is_ref else ''}]"
        a_label = f"{p.name}  [매칭 후{'  (= 원본)' if is_ref else ''}]"
        b = _annotate(_resize_to_h(before, cell_h), b_label)
        a = _annotate(_resize_to_h(after, cell_h), a_label)
        # pad widths to match
        h_target = b.shape[0]
        if a.shape[0] != h_target:
            a = cv2.resize(a, (a.shape[1], h_target))
        row = np.hstack([b, a]) if cols == 2 else np.vstack([b, a])
        rows.append(row)
    # pad rows to same width
    max_w = max(r.shape[1] for r in rows)
    rows_p = []
    for r in rows:
        if r.shape[1] < max_w:
            pad = np.zeros((r.shape[0], max_w - r.shape[1], 3), dtype=np.uint8)
            r = np.hstack([r, pad])
        rows_p.append(r)
    return np.vstack(rows_p)


def main() -> int:
    p = argparse.ArgumentParser(description="Phase 1: Reinhard color match preview")
    p.add_argument("clips", type=Path, help="mp4 가 들어있는 폴더")
    p.add_argument("-o", "--out", type=Path, default=None, help="출력 디렉토리 (기본: clips/_phase1_preview)")
    p.add_argument("-n", type=int, default=8, help="사용할 클립 수(앞에서부터, 기본 8)")
    p.add_argument(
        "--ref",
        type=int,
        default=-1,
        help="레퍼런스 인덱스(0부터). 기본 -1 = 자동 선택",
    )
    p.add_argument("--strength", type=float, default=1.0, help="매칭 강도 0~1")
    args = p.parse_args()

    folder = args.clips.expanduser().resolve()
    if not folder.is_dir():
        print(f"폴더 없음: {folder}", file=sys.stderr)
        return 2

    all_videos = _list_videos(folder)
    if not all_videos:
        print(f"클립 없음: {folder}", file=sys.stderr)
        return 2
    videos = all_videos[: max(1, args.n)]
    print(f"[1/4] {len(videos)}개 클립 중간 프레임 추출 중…")
    frames = extract_mid_frames(videos)

    if args.ref >= 0 and args.ref < len(frames):
        ref_idx = args.ref
        scores = [{"total": float("nan"), "luma_balance": 0, "std_uniformity": 0, "clip_score": 0, "neutrality": 0, "mean_luma": 0, "br_ratio": 0} for _ in frames]
        print(f"[2/4] 레퍼런스 수동 지정: {videos[ref_idx].name}")
    else:
        print("[2/4] 자동 레퍼런스 선택 중…")
        ref_idx, scores = pick_reference(frames)
        ref_path = videos[ref_idx]
        print(f"     ★ 레퍼런스: {ref_path.name}  (total={scores[ref_idx]['total']:.3f})")
        for i, (vp, _) in enumerate(frames):
            mark = " ★" if i == ref_idx else "  "
            s = scores[i]
            print(
                f"     {mark} [{i}] {vp.name:30s}"
                f"  total={s['total']:.3f}"
                f"  luma={s['mean_luma']:.2f}"
                f"  B/R={s['br_ratio']:.2f}"
            )

    ref_bgr = frames[ref_idx][1]
    print("[3/4] Reinhard LAB 매칭 적용 중…")
    items: list[tuple[Path, np.ndarray, np.ndarray]] = []
    for i, (vp, bgr) in enumerate(frames):
        if i == ref_idx:
            after = bgr
        else:
            after = reinhard_transfer_bgr(bgr, ref_bgr, strength=args.strength)
        items.append((vp, bgr, after))

    out_dir = args.out or (folder / "_phase1_preview")
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"[4/4] 그리드 + 개별 PNG 저장 중 → {out_dir}")
    for i, (vp, before, after) in enumerate(items):
        cv2.imwrite(str(out_dir / f"{i:02d}_{vp.stem}_before.png"), before)
        cv2.imwrite(str(out_dir / f"{i:02d}_{vp.stem}_after.png"), after)

    grid = build_grid(items, ref_idx, cell_h=360, cols=2)
    grid_path = out_dir / "00_GRID_before_vs_after.png"
    cv2.imwrite(str(grid_path), grid)
    print(f"\n완료. 비교 그리드: {grid_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

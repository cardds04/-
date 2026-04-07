#!/usr/bin/env python3
"""
참조 스타일 복제 웹 API (FastAPI).

  cd tools/darktable-gemini-batch
  pip install -r requirements.txt
  python3 style_transfer_server.py

브라우저: schedule-site 루트에서 node server.js 후
  http://localhost:8787/style-transfer-web.html
(API는 기본 http://127.0.0.1:8790 — HTML에서 주소 변경 가능)
"""

from __future__ import annotations

import asyncio
import base64
import io
import json
import logging
import sys
import tempfile
import zipfile
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from style_transfer_assistant_shared import SYSTEM_INSTRUCTION
from style_transfer_core import (
    DEFAULT_GROK_MODEL,
    DEFAULT_HISTOGRAM_MATCH_ALPHA,
    PHASE1_VARIANT_KEYS,
    STYLE_TRANSFER_BUILD,
    load_variant_choice_from_pack,
    raw_preview_pil,
    run_phase1_samples,
    run_phase2_batch,
)


def _clip_unit_interval(x: float) -> float:
    return max(0.0, min(1.0, float(x)))


if not logging.root.handlers:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

app = FastAPI(title="Style Transfer API", version="1")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"ok": "style-transfer", "build": STYLE_TRANSFER_BUILD}


@app.on_event("startup")
def _startup_log() -> None:
    print(
        f"[style-transfer-api] STYLE_TRANSFER_BUILD={STYLE_TRANSFER_BUILD}",
        file=sys.stderr,
        flush=True,
    )


@app.post("/api/raw-preview")
async def api_raw_preview(raw_file: UploadFile = File(...)) -> dict:
    """브라우저용 RAW 썸네일 (rawpy). API 키 불필요."""
    raw_name = raw_file.filename or "raw.dng"
    suffix = Path(raw_name).suffix or ".raw"
    data = await raw_file.read()
    max_bytes = 120 * 1024 * 1024
    if len(data) > max_bytes:
        raise HTTPException(400, "RAW 파일이 너무 큽니다 (120MB 이하).")
    tmp: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tf:
            tf.write(data)
            tmp = Path(tf.name)
        pil = raw_preview_pil(tmp, 640)
        buf = io.BytesIO()
        pil.convert("RGB").save(buf, format="JPEG", quality=82)
        b64 = base64.standard_b64encode(buf.getvalue()).decode("ascii")
        return {"ok": True, "preview_base64": b64}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"RAW 미리보기 실패: {e}") from e
    finally:
        if tmp is not None:
            try:
                tmp.unlink(missing_ok=True)
            except OSError:
                pass


@app.post("/api/phase1")
async def api_phase1(
    reference: UploadFile = File(...),
    reference_xmp: UploadFile | None = File(None),
    raw_one: UploadFile = File(...),
    api_key: str = Form(...),
    model: str = Form("gemini-2.5-flash"),
    histogram_match_alpha: str = Form(""),
    override_strength: str = Form("0"),
    r_gain: str = Form(""),
    g_gain: str = Form(""),
    b_gain: str = Form(""),
    exposure_mul: str = Form(""),
    grok_api_key: str = Form(""),
    grok_model: str = Form(""),
    multi_agent: str = Form(""),
) -> dict:
    if not api_key.strip():
        raise HTTPException(400, "api_key 필요")
    ref_name = reference.filename or "reference.jpg"
    raw_name = raw_one.filename or "raw.dng"
    try:
        with tempfile.TemporaryDirectory() as td:
            tdp = Path(td)
            ref_path = tdp / Path(ref_name).name
            raw_path = tdp / Path(raw_name).name
            ref_path.write_bytes(await reference.read())
            raw_path.write_bytes(await raw_one.read())
            if reference_xmp is not None and (reference_xmp.filename or "").strip():
                try:
                    xmp_bytes = await reference_xmp.read()
                except Exception:
                    xmp_bytes = b""
                if xmp_bytes:
                    ref_path.with_suffix(".xmp").write_bytes(xmp_bytes)
            sample_dir = tdp / "samples"
            hs = (histogram_match_alpha or "").strip()
            if not hs:
                hm_a = float(DEFAULT_HISTOGRAM_MATCH_ALPHA)
            else:
                try:
                    hm_a = _clip_unit_interval(float(hs))
                except ValueError:
                    hm_a = float(DEFAULT_HISTOGRAM_MATCH_ALPHA)
            try:
                ov_s = _clip_unit_interval(float((override_strength or "").strip() or "0"))
            except ValueError:
                ov_s = 0.0
            override: dict | None = None
            raw_override = {
                "r_gain": (r_gain or "").strip(),
                "g_gain": (g_gain or "").strip(),
                "b_gain": (b_gain or "").strip(),
                "exposure_mul": (exposure_mul or "").strip(),
            }
            if any(v != "" for v in raw_override.values()):
                override = {}
                for k, v in raw_override.items():
                    if v == "":
                        continue
                    try:
                        override[k] = float(v)
                    except ValueError:
                        continue
            ma_flag = (multi_agent or "").strip().lower() in (
                "1",
                "true",
                "yes",
                "on",
            )
            grok_k = (grok_api_key or "").strip()
            grok_m = (grok_model or "").strip() or DEFAULT_GROK_MODEL
            analysis, _variants, pack = run_phase1_samples(
                reference_path=ref_path,
                raw_one_path=raw_path,
                sample_dir=sample_dir,
                api_key=api_key.strip(),
                model_name=model.strip() or "gemini-2.5-flash",
                preview_max=1536,
                sample_quality=82,
                half_size=True,
                histogram_match_alpha=hm_a,
                override_simple_params=override,
                override_strength=ov_s,
                grok_api_key=grok_k or None,
                grok_model=grok_m,
                multi_agent_review=ma_flag and bool(grok_k),
            )
            samples_b64: dict[str, str] = {}
            for key in PHASE1_VARIANT_KEYS:
                jp = sample_dir / f"sample_{key}.jpg"
                if jp.is_file():
                    samples_b64[key] = base64.standard_b64encode(jp.read_bytes()).decode("ascii")
                st1 = sample_dir / f"sample_{key}_stage1.jpg"
                if st1.is_file():
                    samples_b64[f"{key}_stage1"] = base64.standard_b64encode(
                        st1.read_bytes()
                    ).decode("ascii")
                r2 = sample_dir / f"sample_{key}_round2.jpg"
                if r2.is_file():
                    samples_b64[f"{key}_round2"] = base64.standard_b64encode(
                        r2.read_bytes()
                    ).decode("ascii")
            pack_text = pack.read_text(encoding="utf-8")
            out: dict = {
                "ok": True,
                "analysis_ko": analysis,
                "samples_base64": samples_b64,
                "variants_ABC_json": pack_text,
                "multi_agent": {},
                "final_xmp_crs_preview": {},
                "debate_summary_ko": "",
            }
            meta_fp = sample_dir / "variants_meta.json"
            if meta_fp.is_file():
                try:
                    meta_obj = json.loads(meta_fp.read_text(encoding="utf-8"))
                    if isinstance(meta_obj.get("multi_agent"), dict):
                        out["multi_agent"] = meta_obj["multi_agent"]
                        ds = meta_obj["multi_agent"].get("debate_summary_ko")
                        if isinstance(ds, str) and ds.strip():
                            out["debate_summary_ko"] = ds.strip()
                    fx = meta_obj.get("final_xmp_crs_preview")
                    if isinstance(fx, dict):
                        out["final_xmp_crs_preview"] = fx
                except (json.JSONDecodeError, OSError):
                    pass
            return out
    except Exception as e:
        raise HTTPException(500, str(e)) from e


def _decode_chat_images(last_msg: dict, *, max_n: int = 6, max_bytes_each: int = 8 * 1024 * 1024):
    from PIL import Image

    raw_list = last_msg.get("images")
    if not raw_list:
        return []
    if not isinstance(raw_list, list):
        raise HTTPException(400, "images 는 배열이어야 합니다.")
    out: list = []
    for i, item in enumerate(raw_list[:max_n]):
        if not isinstance(item, dict):
            continue
        b64 = item.get("data") or ""
        try:
            decoded = base64.b64decode(b64, validate=True)
        except Exception as e:
            raise HTTPException(400, f"이미지 {i + 1} base64 오류: {e}") from e
        if len(decoded) > max_bytes_each:
            raise HTTPException(400, f"이미지 {i + 1} 이 너무 큽니다 (한 장당 {max_bytes_each // (1024 * 1024)}MB 이하).")
        try:
            pil = Image.open(io.BytesIO(decoded)).convert("RGB")
        except Exception as e:
            raise HTTPException(400, f"이미지 {i + 1} 를 열 수 없습니다: {e}") from e
        out.append(pil)
    return out


# 오래된 대화는 토큰·지연만 늘림 — 최근 N개 메시지만 유지 (현재 user 제외 이전 기록)
_MAX_CHAT_HISTORY_MESSAGES = 36


def _gemini_chat_blocking(
    api_key: str,
    model: str,
    messages: list,
    user_text: str,
    pil_images: list,
) -> str:
    import google.generativeai as genai

    genai.configure(api_key=api_key)
    try:
        gen_cfg = genai.GenerationConfig(
            max_output_tokens=8192,
            temperature=0.7,
        )
    except Exception:
        gen_cfg = None
    mdl = None
    if gen_cfg is not None:
        try:
            mdl = genai.GenerativeModel(
                model,
                system_instruction=SYSTEM_INSTRUCTION,
                generation_config=gen_cfg,
            )
        except TypeError:
            gen_cfg = None
    if mdl is None:
        try:
            mdl = genai.GenerativeModel(model, system_instruction=SYSTEM_INSTRUCTION)
        except TypeError:
            mdl = genai.GenerativeModel(model)
    hist: list[dict] = []
    for m in messages[:-1]:
        if not isinstance(m, dict):
            continue
        role = m.get("role")
        t = str(m.get("text", ""))
        if role == "user":
            hist.append({"role": "user", "parts": [t]})
        elif role == "model":
            hist.append({"role": "model", "parts": [t]})
    chat = mdl.start_chat(history=hist)
    parts: list = [user_text]
    parts.extend(pil_images)
    resp = chat.send_message(parts if len(parts) > 1 else user_text)
    reply = (getattr(resp, "text", None) or "").strip()
    if not reply:
        reply = "(응답 텍스트 없음)"
    return reply


@app.post("/api/chat")
async def api_chat(body: dict) -> dict:
    messages = body.get("messages")
    api_key = (body.get("api_key") or "").strip()
    model = (body.get("model") or "gemini-2.5-flash").strip()
    if not api_key:
        raise HTTPException(400, "api_key 필요")
    if not isinstance(messages, list) or not messages:
        raise HTTPException(400, "messages 배열 필요")
    last = messages[-1]
    if not isinstance(last, dict) or last.get("role") != "user":
        raise HTTPException(400, "마지막 메시지는 user 여야 합니다.")
    text = str(last.get("text", "")).strip()
    pil_images = _decode_chat_images(last)
    if not text and not pil_images:
        raise HTTPException(400, "텍스트 또는 이미지(캡처 붙여넣기) 중 하나는 필요합니다.")
    if not text:
        text = "사용자가 화면 캡처 등 이미지를 첨부했습니다. 이미지를 보고 질문에 답해 주세요."

    prior = messages[:-1]
    if len(prior) > _MAX_CHAT_HISTORY_MESSAGES:
        prior = prior[-_MAX_CHAT_HISTORY_MESSAGES:]
    messages_for_model = prior + [messages[-1]]

    try:
        reply = await asyncio.to_thread(
            _gemini_chat_blocking,
            api_key,
            model,
            messages_for_model,
            text,
            pil_images,
        )
        return {"ok": True, "text": reply}
    except Exception as e:
        raise HTTPException(500, str(e)) from e


@app.post("/api/phase2")
async def api_phase2(
    variants_json: UploadFile = File(...),
    choice: str = Form("01"),
    raws: list[UploadFile] = File(...),
    histogram_match_alpha: str | None = Form(None),
    histogram_reference: UploadFile | None = File(None),
) -> StreamingResponse:
    if not raws:
        raise HTTPException(400, "RAW 파일을 1개 이상 업로드하세요.")
    try:
        vbytes = await variants_json.read()
        with tempfile.TemporaryDirectory() as td:
            tdp = Path(td)
            vpath = tdp / "variants_ABC.json"
            vpath.write_bytes(vbytes)
            params = load_variant_choice_from_pack(vpath, choice)
            in_dir = tdp / "in"
            in_dir.mkdir(parents=True)
            for uf in raws:
                name = Path(uf.filename or "file.raw").name
                (in_dir / name).write_bytes(await uf.read())
            hist_ref_path: Path | None = None
            if histogram_reference is not None and (histogram_reference.filename or "").strip():
                ext = Path(histogram_reference.filename or "ref.jpg").suffix or ".jpg"
                hist_ref_path = tdp / f"histogram_reference{ext}"
                hist_ref_path.write_bytes(await histogram_reference.read())
            a_override = None
            if histogram_match_alpha is not None and str(histogram_match_alpha).strip() != "":
                try:
                    a_override = _clip_unit_interval(float(str(histogram_match_alpha).strip()))
                except ValueError:
                    a_override = None
            out_dir = tdp / "out"
            n = run_phase2_batch(
                in_dir,
                out_dir,
                params,
                jpeg_quality=95,
                verbose=False,
                pack_path=vpath,
                reference_for_histogram=hist_ref_path,
                histogram_match_alpha=a_override,
                write_jpeg=False,
                write_sidecar_xmp=True,
            )
            if n == 0:
                raise HTTPException(400, "RAW 로 인식된 파일이 없습니다. 확장자를 확인하세요.")
            buf = io.BytesIO()
            with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
                for xmp in sorted(in_dir.glob("*.xmp")):
                    zf.write(xmp, xmp.name)
                for jpg in sorted(out_dir.glob("*.jpg")):
                    zf.write(jpg, jpg.name)
            buf.seek(0)
            return StreamingResponse(
                buf,
                media_type="application/zip",
                headers={"Content-Disposition": 'attachment; filename="style_xmp_out.zip"'},
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e)) from e


def main() -> None:
    import uvicorn

    uvicorn.run(
        "style_transfer_server:app",
        host="127.0.0.1",
        port=8790,
        reload=False,
    )


if __name__ == "__main__":
    main()

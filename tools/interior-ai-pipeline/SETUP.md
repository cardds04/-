# Interior AI Pipeline — 설치 및 실행 매뉴얼

## 시스템 요구사항

| 항목 | 최소 | 권장 |
|------|------|------|
| Python | 3.10+ | 3.11 |
| GPU | 없어도 동작 (느림) | NVIDIA RTX 3060+ (VRAM 8GB+) |
| RAM | 16 GB | 32 GB |
| 저장공간 | 5 GB (가중치 포함) | — |

---

## STEP 1 — 가상환경 생성

```bash
cd tools/interior-ai-pipeline

python3 -m venv .venv
source .venv/bin/activate          # macOS / Linux
# .venv\Scripts\activate           # Windows
```

---

## STEP 2 — PyTorch 설치

### CUDA (NVIDIA GPU) 사용 시 → [공식 사이트](https://pytorch.org/get-started/locally/)에서 CUDA 버전에 맞는 명령어 확인

```bash
# CUDA 12.1 예시
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
```

### CPU 전용 (Mac / GPU 없는 환경)

```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
```

---

## STEP 3 — 나머지 패키지 설치

```bash
pip install -r requirements.txt
```

---

## STEP 4 — SAM 2 설치 (GitHub에서 직접 설치)

SAM 2는 PyPI에 없으므로 소스 설치가 필요합니다.

```bash
# 프로젝트 루트 밖에 clone (또는 임시 폴더)
cd /tmp
git clone https://github.com/facebookresearch/sam2.git
cd sam2
pip install -e .

# 설치 확인
python -c "from sam2.build_sam import build_sam2; print('SAM2 OK')"
```

---

## STEP 5 — AI 모델 가중치 다운로드

`weights/` 폴더에 아래 파일들을 넣으세요.

```
tools/interior-ai-pipeline/weights/
├── sam2_hiera_large.pt       ← SAM 2 Large 가중치
└── mlsd_large_512_fp32.pth   ← MLSD Large 가중치 (선택)
```

### SAM 2 가중치 (필수)

```bash
cd tools/interior-ai-pipeline/weights

# SAM 2 Large (1.2 GB) — 가장 정확
wget https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_large.pt \
     -O sam2_hiera_large.pt

# SAM 2 Small (183 MB) — 빠름, VRAM 적게 사용
# wget https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_small.pt \
#      -O sam2_hiera_large.pt
```

> macOS에서 wget 없으면: `brew install wget` 또는 `curl -L URL -o 파일명` 사용

### MLSD 가중치 (선택 — 없으면 Hough 변환 자동 폴백)

```bash
# Google Drive 직접 다운로드
# https://drive.google.com/file/d/1NjyEeMmddNiVLRpwl6A_Zy5AEXExHBmz/view
# → weights/mlsd_large_512_fp32.pth 에 저장

# 또는 huggingface
pip install huggingface_hub
python3 -c "
from huggingface_hub import hf_hub_download
path = hf_hub_download(
    repo_id='Xenova/mlsd',
    filename='mlsd_large_512_fp32.pth',
    local_dir='weights'
)
print(f'저장됨: {path}')
"
```

---

## STEP 6 — 앱 실행

```bash
cd tools/interior-ai-pipeline
source .venv/bin/activate

streamlit run app.py
```

브라우저에서 `http://localhost:8501` 자동으로 열립니다.

---

## 폴더 구조 최종 확인

```
tools/interior-ai-pipeline/
├── app.py               ← Streamlit 메인 앱
├── pipeline.py          ← 배치 파이프라인
├── requirements.txt
├── SETUP.md
├── models/
│   ├── __init__.py
│   ├── exposure.py      ← RAW 현상 & AI 노출 보정
│   ├── geometry.py      ← MLSD 기하 보정
│   └── segmentation.py  ← SAM2 Window Pull
└── weights/
    ├── sam2_hiera_large.pt       ← 여기에 다운로드
    └── mlsd_large_512_fp32.pth   ← 여기에 다운로드
```

---

## 문제 해결

| 증상 | 원인 | 해결 |
|------|------|------|
| `rawpy` 설치 오류 | libraw 미설치 | `brew install libraw` (mac) / `apt install libraw-dev` (ubuntu) |
| SAM2 import 오류 | git 설치 안 됨 | STEP 4 재실행 |
| CUDA Out of Memory | VRAM 부족 | SAM2 Small 가중치 사용, 또는 CPU 모드 |
| MLSD Hough 폴백 | 가중치 파일 없음 | STEP 5 실행 (없어도 동작함) |
| 투시 보정 부정확 | 선분 부족 | 더 선명한 이미지 사용 or MLSD 가중치 설치 |

---

## GPU vs CPU 처리 시간 비교 (3600만 화소 ARW 기준)

| 단계 | CPU | RTX 3080 |
|------|-----|----------|
| Step 1 RAW 현상 | ~8초 | ~8초 (CPU 작업) |
| Step 2 MLSD 보정 | ~3초 | ~0.5초 |
| Step 3 SAM2 마스킹 | ~60초 | ~3초 |
| **전체** | **~70초** | **~12초** |

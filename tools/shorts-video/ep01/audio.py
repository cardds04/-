"""EP.01 '아무거나' 편 — 효과음 + BGM 합성 (52초, 44.1kHz 스테레오 WAV)"""
import numpy as np, wave

SR = 44100
DUR = 52.0
N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N)

def add(t0, sig, pan=0.0, vol=1.0):
    i0 = int(t0 * SR)
    n = min(len(sig), N - i0)
    if n <= 0: return
    l = vol * (1 - max(pan, 0)); r = vol * (1 + min(pan, 0))
    L[i0:i0+n] += sig[:n] * l
    R[i0:i0+n] += sig[:n] * r

def env_decay(n, tau):
    return np.exp(-np.arange(n) / (tau * SR))

def sine(f, dur, tau=None):
    n = int(dur * SR); t = np.arange(n) / SR
    s = np.sin(2*np.pi*f*t)
    if tau: s *= env_decay(n, tau)
    return s

def pluck(f, dur=0.28):
    """마림바/카림바 느낌 — 기음 + 배음, 빠른 어택 지수감쇠"""
    n = int(dur * SR); t = np.arange(n) / SR
    s = (np.sin(2*np.pi*f*t) + 0.4*np.sin(2*np.pi*f*2*t) + 0.15*np.sin(2*np.pi*f*3.01*t))
    s *= env_decay(n, 0.09)
    s[:80] *= np.linspace(0, 1, 80)
    return s

def pop(f0=420, f1=880, dur=0.07):
    n = int(dur * SR); t = np.arange(n) / SR
    f = np.linspace(f0, f1, n)
    s = np.sin(2*np.pi*np.cumsum(f)/SR) * np.hanning(n)
    return s

def boom(f0=95, dur=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    f = f0 * np.exp(-t*2.2) + 38
    s = np.sin(2*np.pi*np.cumsum(f)/SR) * env_decay(n, 0.28)
    s += 0.12 * np.random.RandomState(1).randn(n) * env_decay(n, 0.03)
    return s

def stab(dur=0.7):
    """단조 스탭 (정색 효과)"""
    n = int(dur * SR)
    s = np.zeros(n)
    for f in (220.0, 261.63, 329.63):  # A minor-ish
        s += sine(f, dur, tau=0.22)[:n]
    s += 0.4 * sine(110, dur, tau=0.3)[:n]
    return s / 3

def beep(f=880, dur=0.14):
    n = int(dur * SR); t = np.arange(n) / SR
    s = np.sign(np.sin(2*np.pi*f*t)) * 0.6  # square
    s *= np.hanning(n) ** 0.3
    return s

def scratch(dur=0.5):
    rs = np.random.RandomState(7)
    n = int(dur * SR)
    s = rs.randn(n)
    f = np.linspace(1.0, 0.15, n)
    s *= f * env_decay(n, 0.35)
    from numpy import convolve
    s = convolve(s, np.ones(24)/24, mode='same')
    return s * 2.2

def woodblock():
    """목탁"""
    n = int(0.18 * SR); t = np.arange(n) / SR
    s = np.sin(2*np.pi*640*t) + 0.5*np.sin(2*np.pi*1010*t)
    s *= env_decay(n, 0.022)
    return s

def shimmer(dur=1.4):
    n = int(dur * SR)
    s = np.zeros(n)
    rs = np.random.RandomState(3)
    for k in range(7):
        f = 1400 + 520*k + rs.rand()*80
        st = int(rs.rand()*0.4*SR)
        seg = sine(f, 0.5, tau=0.14) * 0.12
        m = min(len(seg), n-st)
        s[st:st+m] += seg[:m]
    return s

def whoosh(dur=0.7):
    rs = np.random.RandomState(11)
    n = int(dur * SR)
    s = rs.randn(n)
    envl = np.hanning(n)
    from numpy import convolve
    s = convolve(s, np.ones(60)/60, mode='same')
    return s * envl * 2.0

# ---------------- BGM ----------------
def arp_loop(t0, t1, base=0, vol=0.10):
    """카톡풍 가벼운 펜타토닉 아르페지오, 96bpm 8분음표"""
    notes = [523.25, 587.33, 659.25, 783.99, 880.0]  # C D E G A (C5 pentatonic)
    step = 60/96/2
    seq = [0, 2, 4, 2, 3, 1, 2, 0]
    t = t0; i = 0
    while t < t1 - 0.05:
        f = notes[seq[i % len(seq)]] * (2 ** (base/12))
        add(t, pluck(f), pan=0.25*np.sin(i), vol=vol)
        if i % 8 == 0:
            add(t, pluck(f/2, 0.5), vol=vol*0.7)
        t += step; i += 1

def dark_pulse(t0, t1, vol=0.10):
    """해설 파트 — 낮은 심장박동 펄스"""
    t = t0
    while t < t1 - 0.1:
        add(t, boom(70, 0.55), vol=vol)
        add(t + 0.32, boom(60, 0.4), vol=vol*0.55)
        t += 60/52  # ~52bpm
    # 저역 드론
    n = int((t1-t0)*SR); tt = np.arange(n)/SR
    dr = (np.sin(2*np.pi*55*tt) + 0.5*np.sin(2*np.pi*82.5*tt)) * 0.03
    fade = np.minimum(1, np.minimum(tt/1.0, (t1-t0-tt)/1.0).clip(0))
    add(t0, dr*fade)

# ---------------- 타임라인 ----------------
# S1 훅
add(0.05, sine(52, 3.0, tau=1.4) * 0.5)                     # 저역 드론
add(1.4, boom(110, 1.4), vol=0.9)                            # 둥— (스탬프)
add(0.3, pop(200, 300, 0.05), vol=0.35)
add(0.75, pop(200, 300, 0.05), vol=0.35)

# S2 채팅 — 말풍선 팝 (남=오른쪽 높은음, 여=왼쪽 낮은음)
msg = [(3.4,'R'),(5.0,'L'),(6.6,'R'),(8.4,'L'),(10.2,'R'),(11.8,'L'),(13.6,'R'),(15.6,'L'),(17.8,'R')]
for t0, side in msg:
    if side == 'R': add(t0, pop(500, 1000), pan=0.35, vol=0.5)
    else:           add(t0, pop(380, 700),  pan=-0.35, vol=0.5)
add(8.45, stab(), vol=0.5)                                   # …국밥? 정색
add(15.65, boom(80, 0.8), vol=0.55)                          # 분노 러블
add(15.65, scratch(0.35), vol=0.25)
# 시스템 오류
for k in range(3):
    add(19.45 + k*0.22, beep(880), vol=0.4)
add(20.35, beep(660, 0.3), vol=0.35)
add(19.4, sine(50, 2.0, tau=1.2), vol=0.35)

# S3 브릿지
add(21.5, scratch(0.55), vol=0.8)                            # 레코드 스크래치
add(21.9, stab(0.9), vol=0.6)                                # 질문 등장

# S4 해설
add(24.5, whoosh(), vol=0.7)
dark_pulse(25.0, 41.0, vol=0.16)
add(28.2, boom(90, 1.2), vol=0.7)                            # '독심술 기대' 등장
add(28.3, shimmer(), vol=0.8)
add(33.4, pop(300, 500, 0.08), vol=0.4)                      # 카드 전환
add(35.0, stab(0.8), vol=0.35)                               # '관심이 없구나'
add(35.0, boom(75, 0.9), vol=0.4)

# S5 해결책
add(41.5, pluck(1046.5, 0.6), vol=0.5)                       # 밝은 딩
add(41.5, pluck(1318.5, 0.6), vol=0.35)
add(41.55, shimmer(1.0), vol=0.5)
arp_loop(41.8, 47.8, base=2, vol=0.11)
add(45.7, pop(380, 700), pan=-0.35, vol=0.5)
add(46.6, pop(500, 1000), pan=0.35, vol=0.5)
add(47.1, shimmer(0.9), vol=0.7)

# S2 채팅 BGM (뒤에 배치해도 add는 믹스라 무관)
arp_loop(3.2, 15.5, vol=0.09)
arp_loop(15.5, 19.2, base=-3, vol=0.06)                      # 싸움 구간은 반음 내리고 작게

# S6 엔딩
add(48.6, woodblock(), vol=0.8)                              # 목탁 똑
add(49.05, woodblock(), vol=0.7)                             # 똑
add(49.6, pluck(523.25, 1.2), vol=0.25)
add(49.6, pluck(659.25, 1.2), vol=0.2)
add(49.6, pluck(783.99, 1.2), vol=0.18)

# ---------------- 마스터 ----------------
mix = np.stack([L, R], axis=1)
# 마스터 페이드아웃
t_axis = np.arange(N)/SR
fade = np.ones(N); m = t_axis > 50.5
fade[m] = np.clip(1 - (t_axis[m]-50.5)/1.5, 0, 1)
mix *= fade[:, None]
# 소프트 리미터 + 노멀라이즈
mix = np.tanh(mix * 1.2)
mix *= 0.88 / max(np.abs(mix).max(), 1e-9)
pcm = (mix * 32767).astype(np.int16)

with wave.open('audio.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('audio.wav written:', pcm.shape[0]/SR, 'sec')

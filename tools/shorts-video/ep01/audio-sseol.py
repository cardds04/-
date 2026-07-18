"""EP.01 썰풀이 버전 — 효과음 + BGM 합성 (52초)"""
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

def env_decay(n, tau): return np.exp(-np.arange(n) / (tau * SR))

def sine(f, dur, tau=None):
    n = int(dur * SR); t = np.arange(n) / SR
    s = np.sin(2*np.pi*f*t)
    if tau: s *= env_decay(n, tau)
    return s

def pluck(f, dur=0.28):
    n = int(dur * SR); t = np.arange(n) / SR
    s = (np.sin(2*np.pi*f*t) + 0.4*np.sin(2*np.pi*f*2*t) + 0.15*np.sin(2*np.pi*f*3.01*t))
    s *= env_decay(n, 0.09); s[:80] *= np.linspace(0, 1, 80)
    return s

def pop(f0=420, f1=880, dur=0.07):
    n = int(dur * SR)
    f = np.linspace(f0, f1, n)
    return np.sin(2*np.pi*np.cumsum(f)/SR) * np.hanning(n)

def boom(f0=95, dur=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    f = f0 * np.exp(-t*2.2) + 38
    s = np.sin(2*np.pi*np.cumsum(f)/SR) * env_decay(n, 0.28)
    s += 0.12 * np.random.RandomState(1).randn(n) * env_decay(n, 0.03)
    return s

def stab(dur=0.7):
    n = int(dur * SR); s = np.zeros(n)
    for f in (220.0, 261.63, 329.63): s += sine(f, dur, tau=0.22)[:n]
    s += 0.4 * sine(110, dur, tau=0.3)[:n]
    return s / 3

def scratch(dur=0.5):
    rs = np.random.RandomState(7); n = int(dur * SR)
    s = rs.randn(n) * np.linspace(1.0, 0.15, n) * env_decay(n, 0.35)
    return np.convolve(s, np.ones(24)/24, mode='same') * 2.2

def woodblock():
    n = int(0.18 * SR); t = np.arange(n) / SR
    s = np.sin(2*np.pi*640*t) + 0.5*np.sin(2*np.pi*1010*t)
    return s * env_decay(n, 0.022)

def shimmer(dur=1.4):
    n = int(dur * SR); s = np.zeros(n); rs = np.random.RandomState(3)
    for k in range(7):
        f = 1400 + 520*k + rs.rand()*80
        st = int(rs.rand()*0.4*SR)
        seg = sine(f, 0.5, tau=0.14) * 0.12
        m = min(len(seg), n-st); s[st:st+m] += seg[:m]
    return s

def whoosh(dur=0.7):
    rs = np.random.RandomState(11); n = int(dur * SR)
    s = np.convolve(rs.randn(n), np.ones(60)/60, mode='same')
    return s * np.hanning(n) * 2.0

def tick():
    """내레이션 자막 등장 틱"""
    n = int(0.05 * SR)
    return np.sin(2*np.pi*1200*np.arange(n)/SR) * np.hanning(n) * 0.5

def arp_loop(t0, t1, base=0, vol=0.10):
    notes = [523.25, 587.33, 659.25, 783.99, 880.0]
    step = 60/96/2; seq = [0,2,4,2,3,1,2,0]
    t = t0; i = 0
    while t < t1 - 0.05:
        f = notes[seq[i % 8]] * (2 ** (base/12))
        add(t, pluck(f), pan=0.25*np.sin(i), vol=vol)
        if i % 8 == 0: add(t, pluck(f/2, 0.5), vol=vol*0.7)
        t += step; i += 1

def dark_pulse(t0, t1, vol=0.10):
    t = t0
    while t < t1 - 0.1:
        add(t, boom(70, 0.55), vol=vol)
        add(t + 0.32, boom(60, 0.4), vol=vol*0.55)
        t += 60/52
    n = int((t1-t0)*SR); tt = np.arange(n)/SR
    dr = (np.sin(2*np.pi*55*tt) + 0.5*np.sin(2*np.pi*82.5*tt)) * 0.03
    fade = np.minimum(1, np.minimum(tt/1.0, (t1-t0-tt)/1.0).clip(0))
    add(t0, dr*fade)

# ---------- 타임라인 ----------
# 훅 (썰 제목)
add(0.05, sine(52, 3.0, tau=1.4) * 0.5)
add(0.7, boom(110, 1.4), vol=0.9)
add(0.2, pop(200, 300, 0.05), vol=0.35)

# 내레이션 틱
for t0 in (3.3, 5.9, 10.5, 14.5, 18.3, 23.7, 40.8, 46.0):
    add(t0, tick(), vol=0.6)

# 말풍선 팝
add(8.5, pop(380, 700), pan=-0.35, vol=0.5)     # 여 "아무거나~"
add(12.5, pop(500, 1000), pan=0.35, vol=0.5)    # 남 "그럼 국밥?"
add(16.5, pop(380, 700), pan=-0.35, vol=0.5)    # 여 "...국밥?"

# 공기 달라짐 (14.5) / 정색 (16.5)
add(14.5, stab(0.8), vol=0.45)
add(14.5, boom(75, 0.9), vol=0.4)
add(16.55, stab(), vol=0.55)
add(16.55, scratch(0.3), vol=0.2)
# 혼란 (18.3)
add(18.3, boom(80, 0.8), vol=0.5)
add(18.4, sine(50, 2.0, tau=1.2), vol=0.35)

# 브릿지
add(20.5, scratch(0.55), vol=0.8)
add(20.9, stab(0.9), vol=0.6)

# 해설
add(23.5, whoosh(), vol=0.7)
dark_pulse(24.0, 40.0, vol=0.16)
add(27.2, boom(90, 1.2), vol=0.7)
add(27.3, shimmer(), vol=0.8)
add(32.7, pop(300, 500, 0.08), vol=0.4)
add(34.5, stab(0.8), vol=0.35)
add(34.5, boom(75, 0.9), vol=0.4)

# 해결 (썰의 결말)
add(40.5, pluck(1046.5, 0.6), vol=0.5)
add(40.5, pluck(1318.5, 0.6), vol=0.35)
add(40.55, shimmer(1.0), vol=0.5)
arp_loop(40.8, 47.3, base=2, vol=0.11)
add(43.5, pop(500, 1000), pan=0.35, vol=0.5)    # 남 3개 제시
add(45.2, shimmer(0.9), vol=0.7)

# 회상 장면 BGM
arp_loop(3.2, 14.4, vol=0.09)
arp_loop(14.5, 20.3, base=-3, vol=0.055)

# 엔딩
add(48.1, woodblock(), vol=0.8)
add(48.55, woodblock(), vol=0.7)
add(49.3, pluck(523.25, 1.2), vol=0.25)
add(49.3, pluck(659.25, 1.2), vol=0.2)
add(49.3, pluck(783.99, 1.2), vol=0.18)

# ---------- 마스터 ----------
mix = np.stack([L, R], axis=1)
t_axis = np.arange(N)/SR
fade = np.ones(N); m = t_axis > 50.5
fade[m] = np.clip(1 - (t_axis[m]-50.5)/1.5, 0, 1)
mix *= fade[:, None]
mix = np.tanh(mix * 1.2)
mix *= 0.88 / max(np.abs(mix).max(), 1e-9)
pcm = (mix * 32767).astype(np.int16)

with wave.open('audio-sseol.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('audio-sseol.wav written')

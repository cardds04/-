/* ───────────────────────────────────────────────────────────────
   easymux — 아주 작은 WebM(Matroska/EBML) 먹서
   WebCodecs 로 인코딩한 VP8/VP9 영상 + Opus 음성 청크를 묶어
   재생 가능한 .webm Blob 으로 만든다. (전부 버퍼링 후 크기 계산 → 시킹 가능)
   window.EasyMux = { WebMMuxer, opusHead }
   ─────────────────────────────────────────────────────────────── */
(function () {
  "use strict";

  function concat(arrs) {
    let len = 0; for (const a of arrs) len += a.length;
    const out = new Uint8Array(len); let o = 0;
    for (const a of arrs) { out.set(a, o); o += a.length; }
    return out;
  }
  // EBML 크기(vint): 길이 표시 비트 포함
  function vintSize(n) {
    let len = 1;
    while (len < 8 && n >= Math.pow(2, 7 * len) - 1) len++;
    const b = new Uint8Array(len); let v = n;
    for (let i = len - 1; i >= 0; i--) { b[i] = v & 0xff; v = Math.floor(v / 256); }
    b[0] |= 0x80 >> (len - 1);
    return b;
  }
  function uintBytes(n) {
    if (n === 0) return new Uint8Array([0]);
    const t = []; let v = n; while (v > 0) { t.unshift(v & 0xff); v = Math.floor(v / 256); }
    return new Uint8Array(t);
  }
  function f64(n) { const b = new Uint8Array(8); new DataView(b.buffer).setFloat64(0, n, false); return b; }
  function str(s) { return new TextEncoder().encode(s); }
  function el(id, payload) { return concat([new Uint8Array(id), vintSize(payload.length), payload]); }

  const ID = {
    EBML: [0x1A, 0x45, 0xDF, 0xA3],
    EBMLVersion: [0x42, 0x86], EBMLReadVersion: [0x42, 0xF7],
    EBMLMaxIDLength: [0x42, 0xF2], EBMLMaxSizeLength: [0x42, 0xF3],
    DocType: [0x42, 0x82], DocTypeVersion: [0x42, 0x87], DocTypeReadVersion: [0x42, 0x85],
    Segment: [0x18, 0x53, 0x80, 0x67],
    Info: [0x15, 0x49, 0xA9, 0x66], TimecodeScale: [0x2A, 0xD7, 0xB1],
    Duration: [0x44, 0x89], MuxingApp: [0x4D, 0x80], WritingApp: [0x57, 0x41],
    Tracks: [0x16, 0x54, 0xAE, 0x6B], TrackEntry: [0xAE],
    TrackNumber: [0xD7], TrackUID: [0x73, 0xC5], TrackType: [0x83],
    FlagLacing: [0x9C], CodecID: [0x86], CodecPrivate: [0x63, 0xA2],
    Video: [0xE0], PixelWidth: [0xB0], PixelHeight: [0xBA],
    Audio: [0xE1], SamplingFrequency: [0xB5], Channels: [0x9F],
    Cluster: [0x1F, 0x43, 0xB6, 0x75], Timecode: [0xE7], SimpleBlock: [0xA3],
  };

  // Opus 식별 헤더(CodecPrivate)
  function opusHead(channels, sampleRate, preSkip) {
    const b = new Uint8Array(19); const dv = new DataView(b.buffer);
    b.set([0x4F, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64], 0); // "OpusHead"
    b[8] = 1; b[9] = channels;
    dv.setUint16(10, preSkip || 3840, true);
    dv.setUint32(12, sampleRate, true);
    dv.setInt16(16, 0, true); b[18] = 0;
    return b;
  }

  function WebMMuxer() {
    this.blocks = [];      // {track, ms, key, data}
    this.video = null;     // {w,h,codecId}
    this.audio = null;     // {sampleRate,channels,codecId,codecPrivate}
    this.durationMs = 0;
  }
  WebMMuxer.prototype.configureVideo = function (o) { this.video = o; };
  WebMMuxer.prototype.configureAudio = function (o) { this.audio = o; };
  WebMMuxer.prototype.addVideoChunk = function (chunk) {
    const data = new Uint8Array(chunk.byteLength); chunk.copyTo(data);
    const ms = Math.max(0, Math.round(chunk.timestamp / 1000));
    this.blocks.push({ track: 1, ms, key: chunk.type === "key", data });
    this.durationMs = Math.max(this.durationMs, ms);
  };
  WebMMuxer.prototype.addAudioChunk = function (chunk) {
    const data = new Uint8Array(chunk.byteLength); chunk.copyTo(data);
    const ms = Math.max(0, Math.round(chunk.timestamp / 1000));
    this.blocks.push({ track: 2, ms, key: true, data });
    this.durationMs = Math.max(this.durationMs, ms);
  };

  function simpleBlock(b, clusterMs) {
    const rel = b.ms - clusterMs;
    const head = new Uint8Array(4);
    head[0] = 0x81;                      // 트랙번호(vint, 1바이트): 1→0x81, 2→0x82
    head[0] = 0x80 | b.track;
    new DataView(head.buffer).setInt16(1, rel, false);
    head[3] = b.key ? 0x80 : 0x00;       // keyframe 플래그
    return el(ID.SimpleBlock, concat([head, b.data]));
  }

  WebMMuxer.prototype.finalize = function () {
    // EBML 헤더
    const ebml = el(ID.EBML, concat([
      el(ID.EBMLVersion, uintBytes(1)), el(ID.EBMLReadVersion, uintBytes(1)),
      el(ID.EBMLMaxIDLength, uintBytes(4)), el(ID.EBMLMaxSizeLength, uintBytes(8)),
      el(ID.DocType, str("webm")), el(ID.DocTypeVersion, uintBytes(4)), el(ID.DocTypeReadVersion, uintBytes(2)),
    ]));
    // Info
    const info = el(ID.Info, concat([
      el(ID.TimecodeScale, uintBytes(1000000)),  // 1ms 단위
      el(ID.Duration, f64(this.durationMs + 40)),
      el(ID.MuxingApp, str("easyshorts")), el(ID.WritingApp, str("easyshorts")),
    ]));
    // Tracks
    const trackEntries = [];
    if (this.video) {
      trackEntries.push(el(ID.TrackEntry, concat([
        el(ID.TrackNumber, uintBytes(1)), el(ID.TrackUID, uintBytes(1)),
        el(ID.TrackType, uintBytes(1)), el(ID.FlagLacing, uintBytes(0)),
        el(ID.CodecID, str(this.video.codecId)),
        el(ID.Video, concat([el(ID.PixelWidth, uintBytes(this.video.w)), el(ID.PixelHeight, uintBytes(this.video.h))])),
      ])));
    }
    if (this.audio) {
      const ae = [
        el(ID.TrackNumber, uintBytes(2)), el(ID.TrackUID, uintBytes(2)),
        el(ID.TrackType, uintBytes(2)), el(ID.FlagLacing, uintBytes(0)),
        el(ID.CodecID, str(this.audio.codecId)),
        el(ID.Audio, concat([
          concat([new Uint8Array(ID.SamplingFrequency), vintSize(8), f64(this.audio.sampleRate)]),
          el(ID.Channels, uintBytes(this.audio.channels)),
        ])),
      ];
      if (this.audio.codecPrivate) ae.push(el(ID.CodecPrivate, this.audio.codecPrivate));
      trackEntries.push(el(ID.TrackEntry, concat(ae)));
    }
    const tracks = el(ID.Tracks, concat(trackEntries));
    // 블록을 시간순 정렬 후 클러스터로 묶음(영상 키프레임마다 새 클러스터, rel 32s 초과 방지)
    this.blocks.sort((a, b) => a.ms - b.ms);
    const clusters = [];
    let cur = null, curStart = 0;
    const flush = () => { if (cur && cur.length) clusters.push(el(ID.Cluster, concat([el(ID.Timecode, uintBytes(curStart)), concat(cur)]))); cur = null; };
    for (const b of this.blocks) {
      const needNew = !cur || (b.track === 1 && b.key) || (b.ms - curStart) > 30000;
      if (needNew) { flush(); cur = []; curStart = b.ms; }
      cur.push(simpleBlock(b, curStart));
    }
    flush();
    const segment = el(ID.Segment, concat([info, tracks, ...clusters]));
    return new Blob([ebml, segment], { type: "video/webm" });
  };

  // ─── MP4(ISO BMFF) 먹서 — AVC(H.264) 영상 + AAC 음성, 프로그레시브 ───
  function u32(n) { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n >>> 0); return b; }
  function u16(n) { const b = new Uint8Array(2); new DataView(b.buffer).setUint16(0, n & 0xffff); return b; }
  function u8(n) { return new Uint8Array([n & 0xff]); }
  function box(type) {
    const children = Array.prototype.slice.call(arguments, 1);
    const payload = concat(children);
    return concat([u32(8 + payload.length), str(type), payload]);
  }
  function fullbox(type, version, flags) {
    const vf = new Uint8Array([version & 0xff, (flags >> 16) & 0xff, (flags >> 8) & 0xff, flags & 0xff]);
    const children = Array.prototype.slice.call(arguments, 3);
    return box.apply(null, [type, vf].concat(children));
  }
  function desc(tag, payload) { return concat([u8(tag), u8(payload.length), payload]); }
  const MATRIX = concat([u32(0x00010000), u32(0), u32(0), u32(0), u32(0x00010000), u32(0), u32(0), u32(0), u32(0x40000000)]);

  function MP4Muxer() {
    this.vid = null; this.aud = null;
    this.vSamples = []; this.aSamples = [];
    this.avcc = null; this.asc = null;
  }
  MP4Muxer.prototype.configureVideo = function (o) { this.vid = o; };   // {width,height,fps}
  MP4Muxer.prototype.configureAudio = function (o) { this.aud = o; };   // {sampleRate,channels}
  MP4Muxer.prototype.addVideoChunk = function (chunk, meta) {
    if (meta && meta.decoderConfig && meta.decoderConfig.description && !this.avcc) this.avcc = new Uint8Array(meta.decoderConfig.description);
    const data = new Uint8Array(chunk.byteLength); chunk.copyTo(data);
    this.vSamples.push({ data, dur: Math.round(chunk.duration || 0), key: chunk.type === "key" });
  };
  MP4Muxer.prototype.addAudioChunk = function (chunk, meta) {
    if (meta && meta.decoderConfig && meta.decoderConfig.description && !this.asc) this.asc = new Uint8Array(meta.decoderConfig.description);
    const data = new Uint8Array(chunk.byteLength); chunk.copyTo(data);
    this.aSamples.push({ data, dur: 1024 });
  };
  function sttsBox(samples) {
    const entries = [];
    for (const s of samples) {
      const last = entries[entries.length - 1];
      if (last && last.delta === s.dur) last.count++;
      else entries.push({ count: 1, delta: s.dur });
    }
    const parts = [u32(entries.length)];
    for (const e of entries) { parts.push(u32(e.count)); parts.push(u32(e.delta)); }
    return fullbox.apply(null, ["stts", 0, 0].concat(parts));
  }
  function stszBox(samples) {
    const parts = [u32(0), u32(samples.length)];
    for (const s of samples) parts.push(u32(s.data.length));
    return fullbox.apply(null, ["stsz", 0, 0].concat(parts));
  }
  function stcoBox(offsets) {
    const parts = [u32(offsets.length)];
    for (const o of offsets) parts.push(u32(o));
    return fullbox.apply(null, ["stco", 0, 0].concat(parts));
  }
  function stscBox() { return fullbox("stsc", 0, 0, u32(1), u32(1), u32(1), u32(1)); }
  function stssBox(samples) {
    const idx = []; samples.forEach((s, i) => { if (s.key) idx.push(i + 1); });
    const parts = [u32(idx.length)]; for (const n of idx) parts.push(u32(n));
    return fullbox.apply(null, ["stss", 0, 0].concat(parts));
  }
  function dinf() { return box("dinf", box("dref", concat([u8(0), new Uint8Array([0, 0, 0]), u32(1), fullbox("url ", 0, 1)]))); }

  MP4Muxer.prototype.finalize = function () {
    const v = this.vid, a = this.aud && this.asc ? this.aud : null;
    const VTS = 1000000;   // 영상 timescale = 마이크로초
    // mdat 데이터(영상 먼저, 그다음 음성) + 오프셋 계산
    const vData = this.vSamples.map((s) => s.data);
    const aData = a ? this.aSamples.map((s) => s.data) : [];
    let vBytes = 0; vData.forEach((d) => vBytes += d.length);
    const ftyp = box("ftyp", str("isom"), u32(0x200), str("isom"), str("iso2"), str("avc1"), str("mp41"));
    const base = ftyp.length + 8;   // mdat 헤더 8바이트 뒤부터 샘플 시작
    let off = base; const vOff = []; this.vSamples.forEach((s) => { vOff.push(off); off += s.data.length; });
    const aOff = []; this.aSamples.forEach((s) => { aOff.push(off); off += s.data.length; });
    const mdat = box("mdat", concat(vData.concat(aData)));
    // 길이
    const vDurUs = this.vSamples.reduce((x, s) => x + s.dur, 0) || (this.vSamples.length * Math.round(VTS / (v.fps || 30)));
    const vDurMs = Math.round(vDurUs / 1000);
    const aDurMs = a ? Math.round(this.aSamples.length * 1024 / a.sampleRate * 1000) : 0;
    const movieMs = Math.max(vDurMs, aDurMs, 1);
    // 영상 trak
    const avc1 = box("avc1",
      new Uint8Array(6), u16(1), u16(0), u16(0), u32(0), u32(0), u32(0),
      u16(v.width), u16(v.height), u32(0x00480000), u32(0x00480000), u32(0), u16(1),
      new Uint8Array(32), u16(0x0018), new Uint8Array([0xFF, 0xFF]),
      box("avcC", this.avcc || new Uint8Array()));
    const vStbl = box("stbl", fullbox("stsd", 0, 0, u32(1), avc1), sttsBox(this.vSamples), stssBox(this.vSamples), stscBox(), stszBox(this.vSamples), stcoBox(vOff));
    const vTrak = box("trak",
      fullbox("tkhd", 0, 7, u32(0), u32(0), u32(1), u32(0), u32(vDurMs), u32(0), u32(0), u16(0), u16(0), u16(0), u16(0), MATRIX, u32(v.width * 65536), u32(v.height * 65536)),
      box("mdia",
        fullbox("mdhd", 0, 0, u32(0), u32(0), u32(VTS), u32(vDurUs), u16(0x55c4), u16(0)),
        fullbox("hdlr", 0, 0, u32(0), str("vide"), u32(0), u32(0), u32(0), concat([str("VideoHandler"), u8(0)])),
        box("minf", fullbox("vmhd", 0, 1, u16(0), u16(0), u16(0), u16(0)), dinf(), vStbl)));
    const traks = [vTrak];
    let nextTrackId = 2;
    if (a) {
      const mp4a = box("mp4a", new Uint8Array(6), u16(1), u32(0), u32(0), u16(a.channels), u16(16), u16(0), u16(0), u32(a.sampleRate * 65536),
        (function () {
          const dsi = desc(0x05, this.asc);
          const dcd = desc(0x04, concat([u8(0x40), u8(0x15), new Uint8Array([0, 0, 0]), u32(0), u32(0), dsi]));
          const slc = desc(0x06, new Uint8Array([0x02]));
          const es = desc(0x03, concat([u16(0), u8(0), dcd, slc]));
          return fullbox("esds", 0, 0, es);
        }).call(this));
      const aStbl = box("stbl", fullbox("stsd", 0, 0, u32(1), mp4a), sttsBox(this.aSamples), stscBox(), stszBox(this.aSamples), stcoBox(aOff));
      const aDurTs = this.aSamples.length * 1024;
      traks.push(box("trak",
        fullbox("tkhd", 0, 7, u32(0), u32(0), u32(2), u32(0), u32(aDurMs), u32(0), u32(0), u16(0), u16(0), u16(0x0100), u16(0), MATRIX, u32(0), u32(0)),
        box("mdia",
          fullbox("mdhd", 0, 0, u32(0), u32(0), u32(a.sampleRate), u32(aDurTs), u16(0x55c4), u16(0)),
          fullbox("hdlr", 0, 0, u32(0), str("soun"), u32(0), u32(0), u32(0), concat([str("SoundHandler"), u8(0)])),
          box("minf", fullbox("smhd", 0, 0, u16(0), u16(0)), dinf(), aStbl))));
      nextTrackId = 3;
    }
    const mvhd = fullbox("mvhd", 0, 0, u32(0), u32(0), u32(1000), u32(movieMs), u32(0x00010000), u16(0x0100), u16(0), u32(0), u32(0), MATRIX, u32(0), u32(0), u32(0), u32(0), u32(0), u32(0), u32(nextTrackId));
    const moov = box.apply(null, ["moov", mvhd].concat(traks));
    return new Blob([ftyp, mdat, moov], { type: "video/mp4" });
  };

  window.EasyMux = { WebMMuxer, MP4Muxer, opusHead };
})();

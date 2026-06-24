package com.easyshorts.app;

import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.media.MediaMetadataRetriever;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import android.provider.OpenableColumns;
import android.util.DisplayMetrics;
import android.view.TextureView;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;

import androidx.activity.result.ActivityResult;
import androidx.annotation.OptIn;
import androidx.media3.common.MediaItem;
import androidx.media3.common.Player;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.SeekParameters;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.util.ArrayList;
import java.util.List;

/**
 * 🎬 네이티브 비디오 표면 — WebView 위에 ExoPlayer + TextureView 를 띄워 미리보기·컷편집 스크럽을 캡컷처럼 즉각 반응시키는 하이브리드.
 *
 * 자바스크립트 → 이 플러그인:
 *   open({ path })                 - 영상 열기(필요 시 표면 생성)
 *   setBounds({ x, y, w, h })      - WebView 위 정확한 위치·크기로 맞춤(CSS px)
 *   seekTo({ ms })                 - 즉시 그 시간 프레임 그리기(스크럽)
 *   play() / pause()
 *   setVolume({ v })               - 0~1
 *   hide() / show()                - 잠시 가리기/보이기(다른 화면 전환 시)
 *   close()                        - 정리
 */
@OptIn(markerClass = UnstableApi.class)
@CapacitorPlugin(name = "NativeVideo")
public class NativeVideoPlugin extends Plugin {

    private ExoPlayer player;
    private TextureView surface;
    private FrameLayout container;
    private float density = 1f;
    private String lastPath = null;
    private long[] cumMs = null;   // 플레이리스트 각 클립 누적 끝(ms) — 전체 타임라인 시크용
    private String lastClipsSig = null;

    private void ensureView() {
        if (container != null && surface != null && player != null) return;
        DisplayMetrics dm = getContext().getResources().getDisplayMetrics();
        density = dm.density;

        player = new ExoPlayer.Builder(getContext()).build();
        player.setSeekParameters(SeekParameters.CLOSEST_SYNC);   // 스크럽 = 가장 가까운 키프레임(빠름·끊김 없음)
        surface = new TextureView(getContext());
        surface.setOpaque(true);
        player.setVideoTextureView(surface);

        container = new FrameLayout(getContext());
        container.setBackgroundColor(Color.BLACK);
        container.addView(surface, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        // WebView 와 같은 부모에 추가 + 맨 위로(z-order). 부모 타입에 무관하게 크기는 LayoutParams, 위치는 translation 으로.
        ViewGroup parent = (ViewGroup) getBridge().getWebView().getParent();
        if (parent != null) {
            parent.addView(container, new ViewGroup.LayoutParams(1, 1));
            try { container.setElevation(99999f); } catch (Throwable t) {}   // WebView 위로
            container.bringToFront();
            try { surface.setElevation(99999f); } catch (Throwable t) {}
            // 👆 영상 탭하면 웹에 알림 → 재생/정지 토글(네이티브가 버튼을 덮어서 안 보이는 문제 해결)
            container.setOnClickListener(v -> { try { notifyListeners("nvtap", new JSObject()); } catch (Throwable t) {} });
        }
    }

    @PluginMethod
    public void open(final PluginCall call) {
        final String path = call.getString("path");
        if (path == null || path.isEmpty()) { call.reject("path 필요"); return; }
        getActivity().runOnUiThread(() -> {
            try {
                ensureView();
                Uri uri = path.startsWith("file://") || path.startsWith("content://") || path.startsWith("http") ? Uri.parse(path) : Uri.fromFile(new File(path));
                if (!path.equals(lastPath)) {
                    player.setMediaItem(MediaItem.fromUri(uri));
                    player.prepare();
                    lastPath = path;
                }
                player.setPlayWhenReady(false);
                surface.setVisibility(View.VISIBLE);
                container.setVisibility(View.VISIBLE);
                call.resolve();
            } catch (Throwable t) { call.reject("open 실패: " + t.getMessage()); }
        });
    }

    @PluginMethod
    public void setBounds(final PluginCall call) {
        final double x = call.getDouble("x", 0.0);
        final double y = call.getDouble("y", 0.0);
        final double w = call.getDouble("w", 0.0);
        final double h = call.getDouble("h", 0.0);
        getActivity().runOnUiThread(() -> {
            try {
                if (container == null) ensureView();
                int xp = (int) Math.round(x * density);
                int yp = (int) Math.round(y * density);
                int wp = Math.max(1, (int) Math.round(w * density));
                int hp = Math.max(1, (int) Math.round(h * density));
                ViewGroup.LayoutParams lp = container.getLayoutParams();
                if (lp == null) lp = new ViewGroup.LayoutParams(wp, hp);
                lp.width = wp; lp.height = hp;
                container.setLayoutParams(lp);
                container.setTranslationX(xp);   // 위치는 translation 으로(부모 타입 무관)
                container.setTranslationY(yp);
                container.setVisibility(View.VISIBLE);
                container.requestLayout();
                call.resolve();
            } catch (Throwable t) { call.reject("setBounds 실패: " + t.getMessage()); }
        });
    }

    @PluginMethod
    public void seekTo(final PluginCall call) {
        final long ms = call.getLong("ms", 0L);
        getActivity().runOnUiThread(() -> {
            try { if (player != null) player.seekTo(ms); call.resolve(); }
            catch (Throwable t) { call.reject("seekTo 실패: " + t.getMessage()); }
        });
    }

    @PluginMethod
    public void play(final PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try { if (player != null) { player.setPlayWhenReady(true); } call.resolve(); }
            catch (Throwable t) { call.reject(t.getMessage()); }
        });
    }

    @PluginMethod
    public void pause(final PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try { if (player != null) { player.setPlayWhenReady(false); } call.resolve(); }
            catch (Throwable t) { call.reject(t.getMessage()); }
        });
    }

    @PluginMethod
    public void setVolume(final PluginCall call) {
        final double v = call.getDouble("v", 1.0);
        getActivity().runOnUiThread(() -> {
            try { if (player != null) player.setVolume((float) Math.max(0, Math.min(1, v))); call.resolve(); }
            catch (Throwable t) { call.reject(t.getMessage()); }
        });
    }

    @PluginMethod
    public void hide(final PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try { if (container != null) container.setVisibility(View.GONE); if (player != null) player.setPlayWhenReady(false); call.resolve(); }
            catch (Throwable t) { call.reject(t.getMessage()); }
        });
    }

    @PluginMethod
    public void show(final PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try { if (container != null) container.setVisibility(View.VISIBLE); call.resolve(); }
            catch (Throwable t) { call.reject(t.getMessage()); }
        });
    }

    // 🎬 컷편집 — 전체 타임라인을 플레이리스트(클립 N개·트림)로 세팅. 같은 구성이면 재세팅 안 함.
    @PluginMethod
    public void setClips(final PluginCall call) {
        final JSArray arr = call.getArray("clips");
        if (arr == null || arr.length() == 0) { call.reject("clips 필요"); return; }
        getActivity().runOnUiThread(() -> {
            try {
                ensureView();
                StringBuilder sigB = new StringBuilder();
                java.util.List<MediaItem> items = new java.util.ArrayList<>();
                java.util.List<Long> ends = new java.util.ArrayList<>();
                long acc = 0;
                for (int i = 0; i < arr.length(); i++) {
                    JSObject c = JSObject.fromJSONObject(arr.getJSONObject(i));
                    String p = c.getString("path"); if (p == null || p.isEmpty()) continue;
                    double inSec = c.has("inSec") ? c.getDouble("inSec") : 0.0;
                    double durSec = c.has("durSec") ? c.getDouble("durSec") : 0.0;
                    Uri uri = p.startsWith("file://") || p.startsWith("content://") || p.startsWith("http") ? Uri.parse(p) : Uri.fromFile(new File(p));
                    MediaItem.Builder mib = new MediaItem.Builder().setUri(uri);
                    if (durSec > 0.01) {
                        long s = (long) Math.max(0, inSec * 1000.0), e = (long) ((inSec + durSec) * 1000.0);
                        mib.setClippingConfiguration(new MediaItem.ClippingConfiguration.Builder().setStartPositionMs(s).setEndPositionMs(e).build());
                        acc += (long) (durSec * 1000.0);
                    }
                    items.add(mib.build()); ends.add(acc);
                    sigB.append(p).append('@').append(inSec).append('+').append(durSec).append('|');
                }
                if (items.isEmpty()) { call.reject("유효 클립 없음"); return; }
                String sig = sigB.toString();
                if (!sig.equals(lastClipsSig)) {
                    cumMs = new long[ends.size()];
                    for (int i = 0; i < ends.size(); i++) cumMs[i] = ends.get(i);
                    player.setMediaItems(items);
                    player.prepare();
                    player.setPlayWhenReady(false);
                    lastClipsSig = sig;
                    lastPath = null;
                }
                surface.setVisibility(View.VISIBLE);
                container.setVisibility(View.VISIBLE);
                call.resolve();
            } catch (Throwable t) { call.reject("setClips 실패: " + t.getMessage()); }
        });
    }

    // 전체 타임라인 글로벌 ms → (클립 인덱스, 클립 내 오프셋)으로 즉시 시크
    @PluginMethod
    public void seekToTimeline(final PluginCall call) {
        final long ms = call.getLong("ms", 0L);
        getActivity().runOnUiThread(() -> {
            try {
                if (player == null) { call.resolve(); return; }
                if (cumMs == null || cumMs.length == 0) { player.seekTo(ms); call.resolve(); return; }
                int idx = cumMs.length - 1; long base = 0;
                for (int i = 0; i < cumMs.length; i++) { if (ms < cumMs[i]) { idx = i; base = (i > 0) ? cumMs[i - 1] : 0; break; } base = cumMs[i]; idx = i; }
                long off = Math.max(0, ms - base);
                player.seekTo(idx, off);
                call.resolve();
            } catch (Throwable t) { call.reject("seekToTimeline 실패: " + t.getMessage()); }
        });
    }

    // 🎞 네이티브 영상 선택기 — 원본 content:// 주소를 그대로 받음(복사 0). 길이·해상도·첫프레임 썸네일도 같이.
    @PluginMethod
    public void pickVideos(final PluginCall call) {
        Intent i;
        if (Build.VERSION.SDK_INT >= 33) {   // 📷 안드 13+ 포토피커(갤러리 UI · 다중선택)
            i = new Intent(MediaStore.ACTION_PICK_IMAGES);
            i.setType("video/*");
            i.putExtra(MediaStore.EXTRA_PICK_IMAGES_MAX, 30);
        } else {   // 그 이하 — 문서 선택기(다중)
            i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            i.setType("video/*");
            i.addCategory(Intent.CATEGORY_OPENABLE);
            i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
            i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        }
        startActivityForResult(call, i, "pickResult");
    }

    @ActivityCallback
    private void pickResult(final PluginCall call, ActivityResult result) {
        if (call == null) return;
        // 1) URI는 콜백 즉시 수집(가벼움)
        final List<Uri> uris = new ArrayList<>();
        try {
            Intent data = result.getData();
            if (data != null) {
                if (data.getClipData() != null) {
                    int n = data.getClipData().getItemCount();
                    for (int k = 0; k < n; k++) uris.add(data.getClipData().getItemAt(k).getUri());
                } else if (data.getData() != null) {
                    uris.add(data.getData());
                }
            }
        } catch (Throwable t) {}
        if (uris.isEmpty()) { JSObject ret = new JSObject(); ret.put("videos", new JSArray()); call.resolve(ret); return; }   // 취소/빈선택 = 빈 결과(즉시)
        // 2) 메타데이터·썸네일 추출은 무거우니 백그라운드 스레드로 → 선택 결과가 막히지 않게
        new Thread(() -> {
            JSArray out = new JSArray();
            ContentResolver cr = getContext().getContentResolver();
            for (Uri u : uris) {
                try { cr.takePersistableUriPermission(u, Intent.FLAG_GRANT_READ_URI_PERMISSION); } catch (Throwable t) {}
                JSObject o = new JSObject();
                o.put("uri", u.toString());
                try { o.put("name", queryName(cr, u)); } catch (Throwable t) { o.put("name", "video.mp4"); }
                MediaMetadataRetriever mmr = new MediaMetadataRetriever();
                try {
                    mmr.setDataSource(getContext(), u);
                    o.put("durationMs", parseL(mmr.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)));
                    o.put("width", parseL(mmr.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH)));
                    o.put("height", parseL(mmr.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT)));
                    Bitmap bm = mmr.getFrameAtTime(0);
                    if (bm != null) {
                        int tw = 360, th = Math.max(1, Math.round(bm.getHeight() * (360f / Math.max(1, bm.getWidth()))));
                        Bitmap small = (bm.getWidth() > tw) ? Bitmap.createScaledBitmap(bm, tw, th, true) : bm;
                        File tf = new File(getContext().getCacheDir(), "thumb_" + System.nanoTime() + ".jpg");
                        FileOutputStream fos = new FileOutputStream(tf);
                        small.compress(Bitmap.CompressFormat.JPEG, 80, fos); fos.flush(); fos.close();
                        o.put("thumbPath", "file://" + tf.getAbsolutePath());
                    }
                } catch (Throwable t) {} finally { try { mmr.release(); } catch (Throwable t) {} }
                out.put(o);   // 메타·썸네일 실패해도 uri는 항상 들어감(영상은 무조건 들어오게)
            }
            JSObject ret = new JSObject(); ret.put("videos", out);
            call.resolve(ret);
        }).start();
    }

    private String queryName(ContentResolver cr, Uri u) {
        try { Cursor c = cr.query(u, null, null, null, null); if (c != null) { int idx = c.getColumnIndex(OpenableColumns.DISPLAY_NAME); String nm = null; if (c.moveToFirst() && idx >= 0) nm = c.getString(idx); c.close(); if (nm != null) return nm; } } catch (Throwable t) {}
        return "video.mp4";
    }
    private long parseL(String s) { try { return s == null ? 0 : Long.parseLong(s.trim()); } catch (Throwable t) { return 0; } }

    @PluginMethod
    public void close(final PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                if (player != null) { player.stop(); player.release(); player = null; }
                if (container != null) { ViewGroup p = (ViewGroup) container.getParent(); if (p != null) p.removeView(container); container = null; }
                surface = null; lastPath = null; cumMs = null; lastClipsSig = null;
                call.resolve();
            } catch (Throwable t) { call.reject(t.getMessage()); }
        });
    }
}

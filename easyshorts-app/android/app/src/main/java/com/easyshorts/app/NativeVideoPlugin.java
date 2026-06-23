package com.easyshorts.app;

import android.graphics.Color;
import android.net.Uri;
import android.util.DisplayMetrics;
import android.view.TextureView;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;

import androidx.annotation.OptIn;
import androidx.media3.common.MediaItem;
import androidx.media3.common.Player;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.exoplayer.ExoPlayer;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;

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

    private void ensureView() {
        if (container != null && surface != null && player != null) return;
        DisplayMetrics dm = getContext().getResources().getDisplayMetrics();
        density = dm.density;

        player = new ExoPlayer.Builder(getContext()).build();
        surface = new TextureView(getContext());
        surface.setOpaque(true);
        player.setVideoTextureView(surface);

        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(1, 1);
        lp.leftMargin = 0; lp.topMargin = 0;
        container = new FrameLayout(getContext());
        container.setLayoutParams(lp);
        container.setBackgroundColor(Color.BLACK);
        container.addView(surface, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        // WebView 와 같은 부모(FrameLayout 루트)에 추가 → WebView 위에 오버레이(나중에 추가 = 위)
        View root = getBridge().getWebView().getRootView();
        ViewGroup parent = (ViewGroup) getBridge().getWebView().getParent();
        if (parent != null) parent.addView(container);
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
                FrameLayout.LayoutParams lp = (FrameLayout.LayoutParams) container.getLayoutParams();
                if (lp == null) lp = new FrameLayout.LayoutParams(wp, hp);
                lp.width = wp; lp.height = hp; lp.leftMargin = xp; lp.topMargin = yp;
                container.setLayoutParams(lp);
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

    @PluginMethod
    public void close(final PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                if (player != null) { player.stop(); player.release(); player = null; }
                if (container != null) { ViewGroup p = (ViewGroup) container.getParent(); if (p != null) p.removeView(container); container = null; }
                surface = null; lastPath = null;
                call.resolve();
            } catch (Throwable t) { call.reject(t.getMessage()); }
        });
    }
}

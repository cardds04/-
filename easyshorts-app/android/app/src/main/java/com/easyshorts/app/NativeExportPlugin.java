package com.easyshorts.app;

import android.net.Uri;

import androidx.annotation.OptIn;
import androidx.media3.common.Effect;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MimeTypes;
import androidx.media3.common.audio.AudioProcessor;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.effect.Presentation;
import androidx.media3.transformer.Composition;
import androidx.media3.transformer.EditedMediaItem;
import androidx.media3.transformer.EditedMediaItemSequence;
import androidx.media3.transformer.Effects;
import androidx.media3.transformer.ExportException;
import androidx.media3.transformer.ExportResult;
import androidx.media3.transformer.Transformer;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

/**
 * 🚀 네이티브 영상 내보내기 — AndroidX Media3 Transformer.
 * 1단계: 클립 N개를 이어붙여(트림 반영) 1080p MP4로 인코딩. 폰의 하드웨어 코덱(MediaCodec)을 끝까지 네이티브로 사용.
 *
 * export({ clips:[{path, inSec, durSec}], removeAudio?, shortSide? }) → { path, ms }
 *  - path: 입력 영상 파일 경로(file:// 또는 절대경로)
 *  - inSec/durSec: 트림 시작초 / 재생 길이초
 *  - removeAudio: true 면 원본 소리 제거(원본소리 0%일 때)
 *  - shortSide: 짧은 변 픽셀(기본 1080) — 세로영상이면 가로 1080
 */
@OptIn(markerClass = UnstableApi.class)
@CapacitorPlugin(name = "NativeExport")
public class NativeExportPlugin extends Plugin {

    @PluginMethod
    public void export(final PluginCall call) {
        final JSArray clipsArr = call.getArray("clips");
        if (clipsArr == null || clipsArr.length() == 0) { call.reject("clips 가 필요해요"); return; }
        final boolean removeAudio = Boolean.TRUE.equals(call.getBoolean("removeAudio", false));
        final int shortSide = call.getInt("shortSide", 1080);

        final List<EditedMediaItem> items = new ArrayList<>();
        try {
            for (int i = 0; i < clipsArr.length(); i++) {
                JSObject c = JSObject.fromJSONObject(clipsArr.getJSONObject(i));
                String path = c.getString("path");
                if (path == null || path.isEmpty()) continue;
                double inSec = c.has("inSec") ? c.getDouble("inSec") : 0.0;
                double durSec = c.has("durSec") ? c.getDouble("durSec") : 0.0;
                Uri uri = path.startsWith("file://") || path.startsWith("content://") ? Uri.parse(path) : Uri.fromFile(new File(path));

                MediaItem.Builder mib = new MediaItem.Builder().setUri(uri);
                if (durSec > 0.01) {
                    long startMs = (long) Math.max(0, inSec * 1000.0);
                    long endMs = (long) ((inSec + durSec) * 1000.0);
                    mib.setClippingConfiguration(new MediaItem.ClippingConfiguration.Builder()
                            .setStartPositionMs(startMs).setEndPositionMs(endMs).build());
                }
                List<AudioProcessor> aps = new ArrayList<>();
                List<Effect> ves = new ArrayList<>();
                if (shortSide > 0) ves.add(Presentation.createForShortSide(shortSide));
                EditedMediaItem.Builder eb = new EditedMediaItem.Builder(mib.build()).setEffects(new Effects(aps, ves));
                if (removeAudio) eb.setRemoveAudio(true);
                items.add(eb.build());
            }
        } catch (Exception e) { call.reject("입력 처리 실패: " + e.getMessage()); return; }
        if (items.isEmpty()) { call.reject("유효한 클립이 없어요"); return; }

        final File out = new File(getContext().getCacheDir(), "ne_out_" + System.currentTimeMillis() + ".mp4");
        final long t0 = System.currentTimeMillis();

        getActivity().runOnUiThread(() -> {
            try {
                EditedMediaItemSequence seq = new EditedMediaItemSequence(items);
                Composition composition = new Composition.Builder(seq).build();
                Transformer transformer = new Transformer.Builder(getContext())
                        .setVideoMimeType(MimeTypes.VIDEO_H264)
                        .addListener(new Transformer.Listener() {
                            @Override
                            public void onCompleted(Composition c, ExportResult result) {
                                JSObject ret = new JSObject();
                                ret.put("path", "file://" + out.getAbsolutePath());
                                ret.put("ms", System.currentTimeMillis() - t0);
                                call.resolve(ret);
                            }
                            @Override
                            public void onError(Composition c, ExportResult result, ExportException exception) {
                                call.reject("네이티브 인코딩 실패: " + exception.getMessage(), exception);
                            }
                        })
                        .build();
                transformer.start(composition, out.getAbsolutePath());
            } catch (Throwable t) {
                call.reject("Transformer 시작 실패: " + t.getMessage());
            }
        });
    }
}

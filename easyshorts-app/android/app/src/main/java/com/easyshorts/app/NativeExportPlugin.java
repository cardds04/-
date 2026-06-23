package com.easyshorts.app;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;

import androidx.annotation.OptIn;
import androidx.media3.common.Effect;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MimeTypes;
import androidx.media3.common.audio.AudioProcessor;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.effect.OverlayEffect;
import androidx.media3.effect.TextureOverlay;
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
import com.google.common.collect.ImmutableList;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

/**
 * 🚀 네이티브 영상 내보내기 — AndroidX Media3 Transformer.
 * 클립 N개 이어붙이기·트림 + 오버레이(자막/스티커/로고를 전체 프레임 투명 PNG로 받음, 시간 윈도우 알파블렌딩) + 별도 오디오 트랙 믹스.
 *
 * export({
 *   clips:    [{path, inSec, durSec}],
 *   overlays: [{path, startMs, durMs, alpha?}],   // 모두 출력 프레임과 같은 종횡비의 PNG(가운데 정렬·Identity 스케일)
 *   audioPath?: string,                            // 미리 믹스한 단일 오디오(WAV/AAC). 있으면 클립 원음은 자동 제거.
 *   removeOriginalAudio?: boolean,                 // audioPath 가 있으면 자동 true
 *   shortSide?: number,                            // 출력 짧은 변(기본 1080)
 * }) → { path, ms }
 */
@OptIn(markerClass = UnstableApi.class)
@CapacitorPlugin(name = "NativeExport")
public class NativeExportPlugin extends Plugin {

    @PluginMethod
    public void export(final PluginCall call) {
        final JSArray clipsArr = call.getArray("clips");
        if (clipsArr == null || clipsArr.length() == 0) { call.reject("clips 가 필요해요"); return; }
        final JSArray overlaysArr = call.getArray("overlays");
        final String audioPath = call.getString("audioPath", null);
        final boolean removeAudio = (audioPath != null && !audioPath.isEmpty()) || Boolean.TRUE.equals(call.getBoolean("removeOriginalAudio", false));
        final int shortSide = call.getInt("shortSide", 1080);

        // 1) 비디오 클립들 → EditedMediaItemSequence (필요시 원음 제거)
        final List<EditedMediaItem> videoItems = new ArrayList<>();
        double totalMs = 0.0;
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
                    totalMs += durSec * 1000.0;
                }
                EditedMediaItem.Builder eb = new EditedMediaItem.Builder(mib.build());
                if (removeAudio) eb.setRemoveAudio(true);
                videoItems.add(eb.build());
            }
        } catch (Exception e) { call.reject("입력 처리 실패: " + e.getMessage()); return; }
        if (videoItems.isEmpty()) { call.reject("유효한 클립이 없어요"); return; }

        // 2) 오버레이 비트맵들 → Composition 레벨 OverlayEffect (시간 윈도우 알파블렌딩, 좌표는 가운데/Identity)
        final List<Effect> composEffects = new ArrayList<>();
        // (해상도 정규화 Presentation 은 Media3 1.3.1 에 createForShortSide 가 없어 생략 — 클립 해상도 그대로)
        if (overlaysArr != null && overlaysArr.length() > 0) {
            List<TextureOverlay> overlays = new ArrayList<>();
            try {
                for (int i = 0; i < overlaysArr.length(); i++) {
                    JSObject o = JSObject.fromJSONObject(overlaysArr.getJSONObject(i));
                    String p = o.getString("path");
                    if (p == null || p.isEmpty()) continue;
                    String ap = p.startsWith("file://") ? Uri.parse(p).getPath() : p;
                    Bitmap bm = BitmapFactory.decodeFile(ap);
                    if (bm == null) continue;
                    long sMs = o.has("startMs") ? (long) o.getDouble("startMs") : 0L;
                    long dMs = o.has("durMs") ? (long) o.getDouble("durMs") : 9_999_999L;
                    float alpha = o.has("alpha") ? (float) o.getDouble("alpha") : 1f;
                    overlays.add(new TimedBitmapOverlay(bm, sMs * 1000L, (sMs + dMs) * 1000L, alpha));
                }
            } catch (Exception e) { call.reject("오버레이 처리 실패: " + e.getMessage()); return; }
            if (!overlays.isEmpty()) composEffects.add(new OverlayEffect(ImmutableList.copyOf(overlays)));
        }

        // 3) 시퀀스 만들기: 비디오 시퀀스 + (선택) 오디오 시퀀스(미리 믹스된 단일 트랙)
        EditedMediaItemSequence videoSeq = new EditedMediaItemSequence(videoItems);
        List<EditedMediaItemSequence> sequences = new ArrayList<>();
        sequences.add(videoSeq);
        if (audioPath != null && !audioPath.isEmpty()) {
            try {
                Uri auri = audioPath.startsWith("file://") || audioPath.startsWith("content://") ? Uri.parse(audioPath) : Uri.fromFile(new File(audioPath));
                MediaItem ami = new MediaItem.Builder().setUri(auri).build();
                EditedMediaItem aei = new EditedMediaItem.Builder(ami).setDurationUs((long) (totalMs * 1000.0)).build();
                sequences.add(new EditedMediaItemSequence(ImmutableList.of(aei), /* isLooping= */ false));
            } catch (Exception e) {
                // 오디오 실패는 치명적이지 않게 — 영상만 인코딩
            }
        }

        Composition composition = new Composition.Builder(sequences)
                .setEffects(new Effects(new ArrayList<AudioProcessor>(), composEffects))
                .build();

        final File out = new File(getContext().getCacheDir(), "ne_out_" + System.currentTimeMillis() + ".mp4");
        final long t0 = System.currentTimeMillis();

        getActivity().runOnUiThread(() -> {
            try {
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

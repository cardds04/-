package com.easyshorts.app;

import android.graphics.Bitmap;

import androidx.annotation.OptIn;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.effect.BitmapOverlay;
import androidx.media3.effect.OverlaySettings;

/**
 * 시간 윈도우(start~end) 동안만 알파 1, 밖에선 알파 0 인 비트맵 오버레이.
 * 비트맵은 '프레임 전체' 사이즈로 미리 그려서 받으므로 좌표/스케일 계산 불필요(Identity).
 */
@OptIn(markerClass = UnstableApi.class)
public class TimedBitmapOverlay extends BitmapOverlay {
    private final Bitmap bitmap;
    private final long startUs;
    private final long endUs;
    private final float alpha;

    public TimedBitmapOverlay(Bitmap bitmap, long startUs, long endUs, float alpha) {
        this.bitmap = bitmap;
        this.startUs = startUs;
        this.endUs = endUs;
        this.alpha = Math.max(0f, Math.min(1f, alpha));
    }

    @Override
    public Bitmap getBitmap(long presentationTimeUs) {
        return bitmap;
    }

    @Override
    public OverlaySettings getOverlaySettings(long presentationTimeUs) {
        boolean visible = presentationTimeUs >= startUs && presentationTimeUs < endUs;
        return new OverlaySettings.Builder().setAlphaScale(visible ? alpha : 0f).build();
    }
}

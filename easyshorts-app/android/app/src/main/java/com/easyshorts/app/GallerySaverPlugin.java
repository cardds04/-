package com.easyshorts.app;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.io.OutputStream;

/**
 * 완성 영상을 폰 '갤러리(동영상)'에 직접 저장.
 * MediaStore 방식 — Android 10(API 29)+ 에선 권한 없이 앱 자기 콘텐츠를 갤러리에 넣을 수 있음.
 * 그 이하(23~28)는 WERITE_EXTERNAL_STORAGE 가 필요(매니페스트, maxSdk 28) — 실패 시 웹에서 공유로 폴백.
 */
@CapacitorPlugin(name = "GallerySaver")
public class GallerySaverPlugin extends Plugin {

    @PluginMethod
    public void saveVideo(PluginCall call) {
        String path = call.getString("path");
        if (path == null || path.isEmpty()) { call.reject("path 가 필요해요"); return; }
        String fileName = call.getString("fileName", "easyshorts_" + System.currentTimeMillis() + ".mp4");
        if (!fileName.toLowerCase().endsWith(".mp4")) fileName = fileName + ".mp4";
        String album = call.getString("album", "이지숏폼");

        try {
            String p = path;
            if (p.startsWith("file://")) p = Uri.parse(p).getPath();
            File input = new File(p);
            if (!input.exists()) { call.reject("파일을 찾지 못했어요: " + p); return; }

            ContentResolver resolver = getContext().getContentResolver();
            ContentValues values = new ContentValues();
            values.put(MediaStore.Video.Media.DISPLAY_NAME, fileName);
            values.put(MediaStore.Video.Media.MIME_TYPE, "video/mp4");

            Uri collection;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                values.put(MediaStore.Video.Media.RELATIVE_PATH, Environment.DIRECTORY_MOVIES + "/" + album);
                values.put(MediaStore.Video.Media.IS_PENDING, 1);
                collection = MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
            } else {
                File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES), album);
                if (!dir.exists()) dir.mkdirs();
                values.put(MediaStore.Video.Media.DATA, new File(dir, fileName).getAbsolutePath());
                collection = MediaStore.Video.Media.EXTERNAL_CONTENT_URI;
            }

            Uri item = resolver.insert(collection, values);
            if (item == null) { call.reject("갤러리에 등록하지 못했어요"); return; }

            OutputStream os = resolver.openOutputStream(item);
            InputStream is = new FileInputStream(input);
            byte[] buf = new byte[262144];
            int n;
            while ((n = is.read(buf)) > 0) os.write(buf, 0, n);
            os.flush();
            os.close();
            is.close();

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues done = new ContentValues();
                done.put(MediaStore.Video.Media.IS_PENDING, 0);
                resolver.update(item, done, null, null);
            }

            JSObject ret = new JSObject();
            ret.put("uri", item.toString());
            ret.put("album", album);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("저장 실패: " + e.getMessage(), e);
        }
    }
}

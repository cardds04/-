package com.easyshorts.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(GallerySaverPlugin.class);   // 갤러리 직접 저장
        registerPlugin(NativeExportPlugin.class);   // 🚀 네이티브 영상 내보내기(Media3)
        super.onCreate(savedInstanceState);
    }
}

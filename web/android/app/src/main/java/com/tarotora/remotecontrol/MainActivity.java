package com.tarotora.remotecontrol;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "TaroToraMainActivity";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Log.i(TAG, "onCreate");

        // Register custom plugins
        registerPlugin(SharePlugin.class);
        registerPlugin(InstallerPlugin.class);
        registerPlugin(TerminalReminderBackgroundPlugin.class);
    }

    @Override
    public void onStop() {
        super.onStop();
        Log.i(TAG, "onStop isChangingConfigurations=" + isChangingConfigurations());

        if (!isChangingConfigurations()) {
            TerminalReminderBackgroundService.updateAppActiveState(this, false);
            TerminalReminderBackgroundService.startMonitoringIfConfigured(this);
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        Log.i(TAG, "onResume");
        TerminalReminderBackgroundService.updateAppActiveState(this, true);
    }
}

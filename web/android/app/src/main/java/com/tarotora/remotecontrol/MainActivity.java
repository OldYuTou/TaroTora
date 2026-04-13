package com.tarotora.remotecontrol;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Register custom plugins
        registerPlugin(SharePlugin.class);
        registerPlugin(InstallerPlugin.class);
        registerPlugin(TerminalReminderBackgroundPlugin.class);
    }

    @Override
    public void onStop() {
        super.onStop();

        if (!isChangingConfigurations()) {
            TerminalReminderBackgroundService.startMonitoringIfConfigured(this);
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        TerminalReminderBackgroundService.stopMonitoring(this, false);
    }
}

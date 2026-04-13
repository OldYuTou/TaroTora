package com.tarotora.remotecontrol;

import android.text.TextUtils;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "TerminalReminderBackground")
public class TerminalReminderBackgroundPlugin extends Plugin {
    private static final String TAG = "TermReminderPlugin";

    @PluginMethod
    public void sync(PluginCall call) {
        boolean enabled = call.getBoolean("enabled", false);
        boolean appActive = call.getBoolean("appActive", true);
        String serverUrl = call.getString("serverUrl", "");
        String token = call.getString("token", "");

        Log.i(
            TAG,
            "sync enabled=" + enabled
                + " appActive=" + appActive
                + " serverUrlPresent=" + !TextUtils.isEmpty(serverUrl)
                + " tokenPresent=" + !TextUtils.isEmpty(token)
        );

        if (!TextUtils.isEmpty(serverUrl) && !TextUtils.isEmpty(token)) {
            TerminalReminderBackgroundService.storeConfig(getContext(), serverUrl, token);
        }
        TerminalReminderBackgroundService.storeMonitoringState(getContext(), enabled, appActive);

        if (enabled && !TextUtils.isEmpty(serverUrl) && !TextUtils.isEmpty(token)) {
            TerminalReminderBackgroundService.startMonitoringIfConfigured(getContext());
        } else {
            TerminalReminderBackgroundService.stopMonitoring(getContext(), false);
        }

        JSObject result = new JSObject();
        result.put("enabled", enabled);
        result.put("appActive", appActive);
        result.put("serviceRunning", enabled && !TextUtils.isEmpty(serverUrl) && !TextUtils.isEmpty(token));
        Log.i(TAG, "sync resolved serviceRunning=" + result.getBool("serviceRunning"));
        call.resolve(result);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        boolean clearConfig = call.getBoolean("clearConfig", false);
        Log.i(TAG, "stop clearConfig=" + clearConfig);
        TerminalReminderBackgroundService.stopMonitoring(getContext(), clearConfig);

        JSObject result = new JSObject();
        result.put("stopped", true);
        result.put("clearConfig", clearConfig);
        call.resolve(result);
    }
}

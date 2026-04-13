package com.tarotora.remotecontrol;

import android.os.Bundle;
import android.text.TextUtils;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "TaroToraMainActivity";
    private static final String AUTH_CONFIG_JS =
        "(function() {" +
            "try {" +
                "return JSON.stringify({" +
                    "serverUrl: localStorage.getItem('server_url') || ''," +
                    "token: localStorage.getItem('auth_token') || ''" +
                "});" +
            "} catch (error) {" +
                "return JSON.stringify({ serverUrl: '', token: '', error: String(error) });" +
            "}" +
        "})();";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Log.i(TAG, "onCreate");

        // Register custom plugins
        registerPlugin(SharePlugin.class);
        registerPlugin(InstallerPlugin.class);
        registerPlugin(KeyboardStatePlugin.class);
        registerPlugin(TerminalReminderBackgroundPlugin.class);
    }

    @Override
    public void onStop() {
        super.onStop();
        Log.i(TAG, "onStop isChangingConfigurations=" + isChangingConfigurations());

        if (!isChangingConfigurations()) {
            syncStoredAuthConfigAndStartMonitoring();
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        Log.i(TAG, "onResume");
        TerminalReminderBackgroundService.updateAppActiveState(this, true);
        TerminalReminderBackgroundService.stopMonitoring(this, false);
    }

    private void syncStoredAuthConfigAndStartMonitoring() {
        if (bridge == null || bridge.getWebView() == null) {
            Log.w(TAG, "syncStoredAuthConfigAndStartMonitoring skipped: webView unavailable");
            TerminalReminderBackgroundService.updateAppActiveState(this, false);
            TerminalReminderBackgroundService.startMonitoringIfConfigured(this);
            return;
        }

        bridge.getWebView().evaluateJavascript(AUTH_CONFIG_JS, value -> {
            try {
                String jsonText = normalizeJavascriptResult(value);
                JSONObject payload = TextUtils.isEmpty(jsonText)
                    ? new JSONObject()
                    : new JSONObject(jsonText);
                String serverUrl = payload.optString("serverUrl", "").trim();
                String token = payload.optString("token", "").trim();
                String error = payload.optString("error", "").trim();

                Log.i(
                    TAG,
                    "syncStoredAuthConfigAndStartMonitoring result"
                        + " serverUrlPresent=" + !TextUtils.isEmpty(serverUrl)
                        + " tokenPresent=" + !TextUtils.isEmpty(token)
                        + (TextUtils.isEmpty(error) ? "" : " error=" + error)
                );

                if (!TextUtils.isEmpty(serverUrl) && !TextUtils.isEmpty(token)) {
                    TerminalReminderBackgroundService.storeConfig(this, serverUrl, token);
                    TerminalReminderBackgroundService.storeMonitoringState(this, true, false);
                } else {
                    TerminalReminderBackgroundService.updateAppActiveState(this, false);
                }
            } catch (Exception exception) {
                Log.e(TAG, "syncStoredAuthConfigAndStartMonitoring parse failed", exception);
                TerminalReminderBackgroundService.updateAppActiveState(this, false);
            }

            TerminalReminderBackgroundService.startMonitoringIfConfigured(this);
        });
    }

    private String normalizeJavascriptResult(String value) {
        if (value == null) {
            return "";
        }

        String normalized = value.trim();
        if ("null".equals(normalized)) {
            return "";
        }

        if (normalized.length() >= 2 && normalized.startsWith("\"") && normalized.endsWith("\"")) {
            normalized = normalized.substring(1, normalized.length() - 1);
        }

        return normalized
            .replace("\\\\", "\\")
            .replace("\\\"", "\"")
            .replace("\\n", "\n")
            .replace("\\r", "\r")
            .replace("\\t", "\t");
    }
}

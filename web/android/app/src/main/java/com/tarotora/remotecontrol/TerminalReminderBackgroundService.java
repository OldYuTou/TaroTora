package com.tarotora.remotecontrol;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.text.TextUtils;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class TerminalReminderBackgroundService extends Service {
    private static final String TAG = "TermReminderService";

    private static final String PREFS_NAME = "terminal_reminder_background";
    private static final String KEY_SERVER_URL = "server_url";
    private static final String KEY_AUTH_TOKEN = "auth_token";
    private static final String KEY_MONITORING_ENABLED = "monitoring_enabled";
    private static final String KEY_APP_ACTIVE = "app_active";

    private static final String ACTION_START = "com.tarotora.remotecontrol.action.START_TERMINAL_REMINDER";
    private static final String ACTION_STOP = "com.tarotora.remotecontrol.action.STOP_TERMINAL_REMINDER";
    private static final String EXTRA_SERVER_URL = "serverUrl";
    private static final String EXTRA_AUTH_TOKEN = "token";

    private static final String FOREGROUND_CHANNEL_ID = "terminal-reminder-monitor";
    private static final String REMINDER_CHANNEL_ID = "terminal-reminders";
    private static final int FOREGROUND_NOTIFICATION_ID = 49001;
    private static final long POLL_INTERVAL_MS = 3000L;
    private static final int CONNECT_TIMEOUT_MS = 4000;
    private static final int READ_TIMEOUT_MS = 5000;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Runnable pollRunnable = this::requestReminderPoll;

    private volatile boolean pollInFlight = false;
    private String serverUrl = "";
    private String authToken = "";
    private boolean monitoringEnabled = false;
    private boolean appActive = true;

    private static void logStoredState(Context context, String prefix) {
        SharedPreferences preferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String storedServerUrl = safeTrim(preferences.getString(KEY_SERVER_URL, ""));
        String storedAuthToken = safeTrim(preferences.getString(KEY_AUTH_TOKEN, ""));
        boolean storedMonitoringEnabled = preferences.getBoolean(KEY_MONITORING_ENABLED, false);
        boolean storedAppActive = preferences.getBoolean(KEY_APP_ACTIVE, true);

        Log.i(
            TAG,
            prefix
                + " monitoringEnabled=" + storedMonitoringEnabled
                + " appActive=" + storedAppActive
                + " serverUrlPresent=" + !TextUtils.isEmpty(storedServerUrl)
                + " tokenPresent=" + !TextUtils.isEmpty(storedAuthToken)
        );
    }

    private void logRuntimeState(String prefix) {
        Log.i(
            TAG,
            prefix
                + " monitoringEnabled=" + monitoringEnabled
                + " appActive=" + appActive
                + " serverUrlPresent=" + !TextUtils.isEmpty(serverUrl)
                + " tokenPresent=" + !TextUtils.isEmpty(authToken)
                + " pollInFlight=" + pollInFlight
        );
    }

    public static void storeConfig(Context context, String serverUrl, String authToken) {
        SharedPreferences preferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        preferences.edit()
            .putString(KEY_SERVER_URL, safeTrim(serverUrl))
            .putString(KEY_AUTH_TOKEN, safeTrim(authToken))
            .commit();
        logStoredState(context, "storeConfig:");
    }

    public static void storeMonitoringState(Context context, boolean enabled, boolean appActive) {
        SharedPreferences preferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        preferences.edit()
            .putBoolean(KEY_MONITORING_ENABLED, enabled)
            .putBoolean(KEY_APP_ACTIVE, appActive)
            .commit();
        logStoredState(context, "storeMonitoringState:");
    }

    public static void updateAppActiveState(Context context, boolean appActive) {
        SharedPreferences preferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean enabled = preferences.getBoolean(KEY_MONITORING_ENABLED, false);
        storeMonitoringState(context, enabled, appActive);
        logStoredState(context, "updateAppActiveState:");
    }

    public static void clearConfig(Context context) {
        SharedPreferences preferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        preferences.edit()
            .remove(KEY_SERVER_URL)
            .remove(KEY_AUTH_TOKEN)
            .remove(KEY_MONITORING_ENABLED)
            .remove(KEY_APP_ACTIVE)
            .commit();
        logStoredState(context, "clearConfig:");
    }

    public static void startMonitoring(Context context, String serverUrl, String authToken) {
        storeConfig(context, serverUrl, authToken);
        storeMonitoringState(context, true, false);

        Intent intent = new Intent(context, TerminalReminderBackgroundService.class);
        intent.setAction(ACTION_START);
        intent.putExtra(EXTRA_SERVER_URL, safeTrim(serverUrl));
        intent.putExtra(EXTRA_AUTH_TOKEN, safeTrim(authToken));

        try {
            Log.i(TAG, "startMonitoring: startForegroundService");
            ContextCompat.startForegroundService(context, intent);
        } catch (RuntimeException exception) {
            Log.e(TAG, "启动后台提醒前台服务失败", exception);
        }
    }

    public static boolean hasStoredConfig(Context context) {
        SharedPreferences preferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String storedServerUrl = safeTrim(preferences.getString(KEY_SERVER_URL, ""));
        String storedAuthToken = safeTrim(preferences.getString(KEY_AUTH_TOKEN, ""));
        return !TextUtils.isEmpty(storedServerUrl) && !TextUtils.isEmpty(storedAuthToken);
    }

    public static boolean startMonitoringIfConfigured(Context context) {
        logStoredState(context, "startMonitoringIfConfigured:");
        if (!hasStoredConfig(context)) {
            Log.i(TAG, "后台提醒未启动：尚未保存服务端配置");
            return false;
        }

        Intent intent = new Intent(context, TerminalReminderBackgroundService.class);
        intent.setAction(ACTION_START);
        try {
            Log.i(TAG, "startMonitoringIfConfigured: startForegroundService");
            ContextCompat.startForegroundService(context, intent);
            return true;
        } catch (RuntimeException exception) {
            Log.e(TAG, "按已保存配置启动后台提醒前台服务失败", exception);
            return false;
        }
    }

    public static void stopMonitoring(Context context, boolean clearConfig) {
        logStoredState(context, "stopMonitoring: before");
        if (clearConfig) {
            clearConfig(context);
        }

        Intent intent = new Intent(context, TerminalReminderBackgroundService.class);
        context.stopService(intent);
        logStoredState(context, "stopMonitoring: after");
    }

    private static String safeTrim(String value) {
        return value == null ? "" : value.trim();
    }

    @Override
    public void onCreate() {
        super.onCreate();
        ensureNotificationChannels();
        Log.i(TAG, "onCreate");
        logStoredState(this, "onCreate stored:");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : ACTION_START;
        Log.i(
            TAG,
            "onStartCommand action=" + action
                + " startId=" + startId
                + " flags=" + flags
                + " extrasServerUrlPresent=" + !TextUtils.isEmpty(safeTrim(intent != null ? intent.getStringExtra(EXTRA_SERVER_URL) : null))
                + " extrasTokenPresent=" + !TextUtils.isEmpty(safeTrim(intent != null ? intent.getStringExtra(EXTRA_AUTH_TOKEN) : null))
        );

        if (ACTION_STOP.equals(action)) {
            stopSelfSafely();
            return START_NOT_STICKY;
        }

        serverUrl = safeTrim(intent != null ? intent.getStringExtra(EXTRA_SERVER_URL) : null);
        authToken = safeTrim(intent != null ? intent.getStringExtra(EXTRA_AUTH_TOKEN) : null);

        if (TextUtils.isEmpty(serverUrl) || TextUtils.isEmpty(authToken)) {
            SharedPreferences preferences = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            serverUrl = safeTrim(preferences.getString(KEY_SERVER_URL, ""));
            authToken = safeTrim(preferences.getString(KEY_AUTH_TOKEN, ""));
        }

        refreshMonitoringState();
        logRuntimeState("onStartCommand after refresh:");

        if (!monitoringEnabled) {
            Log.i(TAG, "后台提醒未启用，停止监听");
            stopSelfSafely();
            return START_NOT_STICKY;
        }

        if (TextUtils.isEmpty(serverUrl) || TextUtils.isEmpty(authToken)) {
            Log.w(TAG, "缺少服务端地址或认证令牌，停止后台提醒监听");
            stopSelfSafely();
            return START_NOT_STICKY;
        }

        startForeground(FOREGROUND_NOTIFICATION_ID, buildForegroundNotification());
        Log.i(TAG, "startForeground success");
        scheduleNextPoll(0);
        return START_STICKY;
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        Log.i(TAG, "onDestroy");
        handler.removeCallbacksAndMessages(null);
        executor.shutdownNow();
        super.onDestroy();
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        Log.w(TAG, "onTaskRemoved");
        super.onTaskRemoved(rootIntent);
    }

    private void scheduleNextPoll(long delayMs) {
        Log.i(TAG, "scheduleNextPoll delayMs=" + delayMs);
        handler.removeCallbacks(pollRunnable);
        handler.postDelayed(pollRunnable, Math.max(0L, delayMs));
    }

    private void requestReminderPoll() {
        logRuntimeState("requestReminderPoll enter:");
        if (pollInFlight) {
            Log.i(TAG, "requestReminderPoll skipped: poll already in flight");
            return;
        }

        refreshMonitoringState();
        logRuntimeState("requestReminderPoll after refresh:");

        if (!monitoringEnabled) {
            Log.i(TAG, "后台提醒已禁用，停止后台监听");
            stopSelfSafely();
            return;
        }

        if (appActive) {
            Log.i(TAG, "requestReminderPoll skipped: appActive=true");
            scheduleNextPoll(POLL_INTERVAL_MS);
            return;
        }

        pollInFlight = true;
        executor.execute(() -> {
            try {
                PollResult result = pullPendingReminders();
                Log.i(
                    TAG,
                    "requestReminderPoll result reminders=" + result.reminders.size()
                        + " hasEnabledReminders=" + result.hasEnabledReminders
                );
                deliverReminderNotifications(result.reminders);

                if (!result.hasEnabledReminders) {
                    Log.i(TAG, "服务端无启用中的终端提醒，停止后台监听");
                    storeMonitoringState(this, false, appActive);
                    handler.post(this::stopSelfSafely);
                    return;
                }
            } catch (UnauthorizedException unauthorizedException) {
                Log.e(TAG, "后台提醒认证失效，停止监听", unauthorizedException);
                clearConfig(this);
                handler.post(this::stopSelfSafely);
                return;
            } catch (Exception exception) {
                Log.e(TAG, "拉取后台终端提醒失败", exception);
            } finally {
                pollInFlight = false;
                Log.i(TAG, "requestReminderPoll finish pollInFlight=false");
            }

            scheduleNextPoll(POLL_INTERVAL_MS);
        });
    }

    private void refreshMonitoringState() {
        SharedPreferences preferences = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        monitoringEnabled = preferences.getBoolean(KEY_MONITORING_ENABLED, false);
        appActive = preferences.getBoolean(KEY_APP_ACTIVE, true);
        logRuntimeState("refreshMonitoringState:");
    }

    private PollResult pullPendingReminders() throws Exception {
        HttpURLConnection connection = null;

        try {
            String apiUrl = buildApiUrl("/api/terminals/reminders/pull");
            Log.i(TAG, "pullPendingReminders request=" + apiUrl);
            URL url = new URL(apiUrl);
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("POST");
            connection.setConnectTimeout(CONNECT_TIMEOUT_MS);
            connection.setReadTimeout(READ_TIMEOUT_MS);
            connection.setRequestProperty("Authorization", "Bearer " + authToken);
            connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            connection.setRequestProperty("Accept", "application/json");
            connection.setDoOutput(true);

            byte[] body = "{}".getBytes(StandardCharsets.UTF_8);
            try (OutputStream outputStream = connection.getOutputStream()) {
                outputStream.write(body);
            }

            int code = connection.getResponseCode();
            if (code == HttpURLConnection.HTTP_UNAUTHORIZED || code == HttpURLConnection.HTTP_FORBIDDEN) {
                throw new UnauthorizedException("Unauthorized: " + code);
            }
            if (code < 200 || code >= 300) {
                throw new IllegalStateException("HTTP " + code + ": " + readStream(connection.getErrorStream()));
            }

            String responseText = readStream(connection.getInputStream());
            JSONObject json = new JSONObject(responseText);
            JSONArray remindersJson = json.optJSONArray("reminders");
            JSONObject monitoringJson = json.optJSONObject("monitoring");

            PollResult result = new PollResult();
            result.hasEnabledReminders = monitoringJson == null || monitoringJson.optBoolean("hasEnabledReminders", true);
            if (remindersJson == null) {
                Log.i(TAG, "pullPendingReminders parsed reminders=0");
                return result;
            }

            for (int index = 0; index < remindersJson.length(); index += 1) {
                JSONObject reminderJson = remindersJson.optJSONObject(index);
                if (reminderJson == null) {
                    continue;
                }

                TerminalReminder reminder = new TerminalReminder();
                reminder.reminderId = reminderJson.optString("reminderId", "");
                reminder.terminalId = reminderJson.optString("terminalId", "");
                reminder.name = reminderJson.optString("name", "");
                reminder.cwd = reminderJson.optString("cwd", "");
                result.reminders.add(reminder);
            }

            Log.i(
                TAG,
                "pullPendingReminders parsed reminders=" + result.reminders.size()
                    + " hasEnabledReminders=" + result.hasEnabledReminders
            );
            return result;
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    private void deliverReminderNotifications(List<TerminalReminder> reminders) {
        Log.i(TAG, "deliverReminderNotifications count=" + reminders.size());
        for (TerminalReminder reminder : reminders) {
            showReminderNotification(reminder);
        }
    }

    private void showReminderNotification(TerminalReminder reminder) {
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null) {
            Log.w(TAG, "showReminderNotification skipped: manager is null");
            return;
        }

        Intent launchIntent = new Intent(this, MainActivity.class);
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        PendingIntent contentIntent = PendingIntent.getActivity(
            this,
            Math.abs((reminder.reminderId + reminder.terminalId).hashCode()),
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        String terminalName = !TextUtils.isEmpty(reminder.name)
            ? reminder.name
            : resolveTerminalName(reminder.cwd);
        String body = terminalName + " 会话有新消息";
        Log.i(
            TAG,
            "showReminderNotification terminalId=" + reminder.terminalId
                + " reminderId=" + reminder.reminderId
                + " body=" + body
        );

        Notification notification = new NotificationCompat.Builder(this, REMINDER_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("终端提醒")
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setAutoCancel(true)
            .setContentIntent(contentIntent)
            .build();

        manager.notify(Math.abs((reminder.reminderId + reminder.terminalId).hashCode()), notification);
    }

    private Notification buildForegroundNotification() {
        Intent launchIntent = new Intent(this, MainActivity.class);
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        PendingIntent contentIntent = PendingIntent.getActivity(
            this,
            FOREGROUND_NOTIFICATION_ID,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, FOREGROUND_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_notify_sync_noanim)
            .setContentTitle("TaroTora 后台提醒")
            .setContentText("终端提醒后台监听中")
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(contentIntent)
            .build();
    }

    private void ensureNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null) {
            return;
        }

        NotificationChannel foregroundChannel = new NotificationChannel(
            FOREGROUND_CHANNEL_ID,
            "后台终端提醒监听",
            NotificationManager.IMPORTANCE_LOW
        );
        foregroundChannel.setDescription("保持后台终端提醒监听运行");
        foregroundChannel.setShowBadge(false);

        NotificationChannel reminderChannel = new NotificationChannel(
            REMINDER_CHANNEL_ID,
            "终端提醒",
            NotificationManager.IMPORTANCE_HIGH
        );
        reminderChannel.setDescription("终端输出停止后的消息提醒");

        manager.createNotificationChannel(foregroundChannel);
        manager.createNotificationChannel(reminderChannel);
    }

    private String buildApiUrl(String apiPath) {
        String normalized = serverUrl.replaceAll("/+$", "");
        return normalized + apiPath;
    }

    private String readStream(InputStream inputStream) throws Exception {
        if (inputStream == null) {
            return "";
        }

        StringBuilder builder = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                builder.append(line);
            }
        }
        return builder.toString();
    }

    private String resolveTerminalName(String cwd) {
        if (TextUtils.isEmpty(cwd)) {
            return "终端";
        }

        String normalized = cwd.replaceAll("[\\\\/]+$", "");
        if (TextUtils.isEmpty(normalized)) {
            return "终端";
        }

        String[] parts = normalized.split("[\\\\/]+");
        return parts.length > 0 ? parts[parts.length - 1] : normalized;
    }

    private void stopSelfSafely() {
        logRuntimeState("stopSelfSafely:");
        handler.removeCallbacksAndMessages(null);
        stopForeground(true);
        stopSelf();
    }

    private static final class PollResult {
        final List<TerminalReminder> reminders = new ArrayList<>();
        boolean hasEnabledReminders = true;
    }

    private static final class TerminalReminder {
        String reminderId = "";
        String terminalId = "";
        String name = "";
        String cwd = "";
    }

    private static final class UnauthorizedException extends Exception {
        UnauthorizedException(String message) {
            super(message);
        }
    }
}

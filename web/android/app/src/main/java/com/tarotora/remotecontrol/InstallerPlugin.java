package com.tarotora.remotecontrol;

import android.app.Activity;
import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.webkit.MimeTypeMap;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import android.Manifest;
import java.io.File;

@CapacitorPlugin(name = "Installer")
public class InstallerPlugin extends Plugin {

    private long downloadId = -1;
    private BroadcastReceiver downloadReceiver;
    private PluginCall pendingCall;
    private String pendingFileName;

    private static final int REQUEST_CODE_INSTALL_PERMISSION = 1001;

    @PluginMethod
    public void installApk(PluginCall call) {
        String url = call.getString("url");
        String fileName = call.getString("fileName", "update.apk");

        if (url == null) {
            call.reject("URL is required");
            return;
        }

        // Save pending call for later
        pendingCall = call;
        pendingFileName = fileName;

        // Check and request install permission for Android 8+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            boolean canInstall = getContext().getPackageManager().canRequestPackageInstalls();
            if (!canInstall) {
                // Request permission - go to settings
                Intent intent = new Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES)
                        .setData(Uri.parse("package:" + getContext().getPackageName()));
                startActivityForResult(call, intent, REQUEST_CODE_INSTALL_PERMISSION);
                return;
            }
        }

        // Permission granted or not needed, start download
        downloadApk(url, fileName, call);
    }

    @Override
    protected void handleOnActivityResult(int requestCode, int resultCode, Intent data) {
        super.handleOnActivityResult(requestCode, resultCode, data);

        // Handle install permission request result
        if (requestCode == REQUEST_CODE_INSTALL_PERMISSION) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                boolean canInstall = getContext().getPackageManager().canRequestPackageInstalls();
                if (canInstall && pendingCall != null) {
                    String url = pendingCall.getString("url");
                    String fileName = pendingCall.getString("fileName", pendingFileName != null ? pendingFileName : "update.apk");
                    downloadApk(url, fileName, pendingCall);
                    pendingCall = null;
                    pendingFileName = null;
                } else if (pendingCall != null) {
                    // Permission not granted
                    pendingCall.reject("需要安装权限才能更新应用，请在设置中开启");
                    pendingCall = null;
                    pendingFileName = null;
                }
            }
        }
    }

    private void downloadApk(String url, String fileName, PluginCall call) {
        Context context = getContext();

        try {
            // Create download request
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
            request.setTitle("下载更新");
            request.setDescription("正在下载 " + fileName);
            request.setMimeType("application/vnd.android.package-archive");

            // Set destination - use external files dir for better compatibility
            File downloadDir = context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
            if (downloadDir == null) {
                downloadDir = context.getFilesDir();
            }
            request.setDestinationInExternalFilesDir(context, Environment.DIRECTORY_DOWNLOADS, fileName);

            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);

            // For MIUI and other custom ROMs, allow roaming and metered networks
            request.setAllowedOverRoaming(true);
            request.setAllowedOverMetered(true);

            // Add headers if needed
            JSObject headers = call.getObject("headers");
            if (headers != null) {
                java.util.Iterator<String> keys = headers.keys();
                while (keys.hasNext()) {
                    String key = keys.next();
                    String value = headers.getString(key);
                    if (value != null) {
                        request.addRequestHeader(key, value);
                    }
                }
            }

            // Enqueue download
            DownloadManager downloadManager = (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
            if (downloadManager == null) {
                call.reject("无法获取下载管理器");
                return;
            }

            downloadId = downloadManager.enqueue(request);

            // Register receiver to handle download completion
            if (downloadReceiver != null) {
                try {
                    context.unregisterReceiver(downloadReceiver);
                } catch (IllegalArgumentException e) {
                    // Receiver not registered
                }
            }

            downloadReceiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                    if (id == downloadId) {
                        handleDownloadComplete(context, downloadManager, id, fileName, call);
                    }
                }
            };

            context.registerReceiver(downloadReceiver, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE));

            JSObject ret = new JSObject();
            ret.put("downloadId", downloadId);
            ret.put("status", "downloading");
            call.resolve(ret);

        } catch (Exception e) {
            call.reject("启动下载失败: " + e.getMessage());
        }
    }

    private void handleDownloadComplete(Context context, DownloadManager downloadManager, long id, String fileName, PluginCall call) {
        DownloadManager.Query query = new DownloadManager.Query();
        query.setFilterById(id);
        Cursor cursor = downloadManager.query(query);

        if (cursor == null) {
            call.reject("无法查询下载状态");
            return;
        }

        if (cursor.moveToFirst()) {
            int statusIdx = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS);
            int reasonIdx = cursor.getColumnIndex(DownloadManager.COLUMN_REASON);

            if (statusIdx >= 0) {
                int status = cursor.getInt(statusIdx);
                if (status == DownloadManager.STATUS_SUCCESSFUL) {
                    // Use Handler to ensure we're on main thread
                    new Handler(Looper.getMainLooper()).post(() -> {
                        installDownloadedApk(context, fileName, call);
                    });
                } else {
                    String reason = reasonIdx >= 0 ? String.valueOf(cursor.getInt(reasonIdx)) : "未知";
                    call.reject("下载失败，错误码: " + reason);
                }
            }
        } else {
            call.reject("下载记录不存在");
        }
        cursor.close();
    }

    private void installDownloadedApk(Context context, String fileName, PluginCall call) {
        try {
            File downloadDir = context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
            if (downloadDir == null) {
                call.reject("无法获取下载目录");
                return;
            }

            File apkFile = new File(downloadDir, fileName);

            if (!apkFile.exists()) {
                call.reject("APK文件不存在: " + apkFile.getAbsolutePath());
                return;
            }

            // Check file size
            long fileSize = apkFile.length();
            if (fileSize < 1024) {
                call.reject("APK文件大小异常: " + fileSize + " bytes");
                return;
            }

            Intent installIntent = new Intent(Intent.ACTION_VIEW);

            // For Android N+ (API 24+) use FileProvider
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                String authority = context.getPackageName() + ".fileprovider";
                Uri apkUri = FileProvider.getUriForFile(context, authority, apkFile);
                installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            } else {
                Uri apkUri = Uri.fromFile(apkFile);
                installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                installIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            }

            // For MIUI: add extra to avoid permission dialog
            if (isMIUI()) {
                installIntent.putExtra("android.intent.extra.NOT_UNKNOWN_SOURCE", true);
            }

            // Get activity to start the intent
            Activity activity = getActivity();
            if (activity != null) {
                activity.startActivity(installIntent);

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("message", "安装程序已启动");
                ret.put("fileSize", fileSize);
                call.resolve(ret);
            } else {
                // Fallback to context
                installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(installIntent);

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("message", "安装程序已启动 (fallback)");
                ret.put("fileSize", fileSize);
                call.resolve(ret);
            }
        } catch (Exception e) {
            call.reject("安装失败: " + e.getMessage());
        }
    }

    private boolean isMIUI() {
        try {
            Class<?> propClass = Class.forName("android.os.SystemProperties");
            java.lang.reflect.Method getMethod = propClass.getMethod("get", String.class);
            String miuiVersion = (String) getMethod.invoke(null, "ro.miui.ui.version.name");
            return miuiVersion != null && !miuiVersion.isEmpty();
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        if (downloadReceiver != null) {
            try {
                getContext().unregisterReceiver(downloadReceiver);
            } catch (IllegalArgumentException e) {
                // Receiver not registered
            }
        }
    }
}

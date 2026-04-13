package com.tarotora.remotecontrol;

import android.content.Intent;
import android.net.Uri;
import android.webkit.MimeTypeMap;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.Base64;

@CapacitorPlugin(name = "Share")
public class SharePlugin extends Plugin {

    @PluginMethod
    public void shareFile(PluginCall call) {
        String base64Data = call.getString("base64Data");
        String filename = call.getString("filename");
        String mimeType = call.getString("mimeType", "application/octet-stream");

        if (base64Data == null || filename == null) {
            call.reject("Missing required parameters");
            return;
        }

        try {
            // Decode base64 data
            byte[] fileData = Base64.getDecoder().decode(base64Data);

            // Save to cache directory
            File cacheDir = getContext().getCacheDir();
            File shareFile = new File(cacheDir, filename);

            FileOutputStream fos = new FileOutputStream(shareFile);
            fos.write(fileData);
            fos.close();

            // Create content URI using FileProvider
            Uri contentUri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                shareFile
            );

            // Create share intent
            Intent shareIntent = new Intent(Intent.ACTION_SEND);
            shareIntent.setType(mimeType);
            shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
            shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            shareIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            // Show chooser
            Intent chooser = Intent.createChooser(shareIntent, "分享文件");
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(chooser);

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);

        } catch (Exception e) {
            call.reject("Share failed: " + e.getMessage());
        }
    }
}

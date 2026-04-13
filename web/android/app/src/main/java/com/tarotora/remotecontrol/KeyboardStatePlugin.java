package com.tarotora.remotecontrol;

import android.graphics.Rect;
import android.util.Log;
import android.util.TypedValue;
import android.view.View;
import android.view.ViewTreeObserver;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "KeyboardState")
public class KeyboardStatePlugin extends Plugin {
    private static final String TAG = "KeyboardStatePlugin";
    private static final float KEYBOARD_THRESHOLD_DP = 100f;

    private View rootView;
    private ViewTreeObserver.OnGlobalLayoutListener layoutListener;
    private boolean keyboardVisible = false;
    private int keyboardHeight = 0;

    @Override
    public void load() {
        super.load();

        if (getActivity() == null) {
            Log.w(TAG, "load skipped: activity unavailable");
            return;
        }

        getActivity().runOnUiThread(this::attachKeyboardListener);
    }

    @PluginMethod
    public void getState(PluginCall call) {
        call.resolve(buildKeyboardState());
    }

    private void attachKeyboardListener() {
        if (rootView != null || getActivity() == null) {
            return;
        }

        rootView = getActivity().findViewById(android.R.id.content);
        if (rootView == null) {
            rootView = bridge != null ? bridge.getWebView() : null;
        }

        if (rootView == null) {
            Log.w(TAG, "attachKeyboardListener skipped: rootView unavailable");
            return;
        }

        layoutListener = this::dispatchKeyboardStateIfChanged;
        rootView.getViewTreeObserver().addOnGlobalLayoutListener(layoutListener);
        dispatchKeyboardStateIfChanged();
    }

    private void dispatchKeyboardStateIfChanged() {
        if (rootView == null) {
            return;
        }

        Rect visibleFrame = new Rect();
        rootView.getWindowVisibleDisplayFrame(visibleFrame);

        int rootHeight = rootView.getRootView() != null
            ? rootView.getRootView().getHeight()
            : rootView.getHeight();
        int detectedKeyboardHeight = Math.max(0, rootHeight - visibleFrame.bottom);
        int threshold = Math.round(
            TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP,
                KEYBOARD_THRESHOLD_DP,
                getContext().getResources().getDisplayMetrics()
            )
        );
        boolean detectedVisible = detectedKeyboardHeight > threshold;
        int normalizedHeight = detectedVisible ? detectedKeyboardHeight : 0;

        if (detectedVisible == keyboardVisible && normalizedHeight == keyboardHeight) {
            return;
        }

        keyboardVisible = detectedVisible;
        keyboardHeight = normalizedHeight;

        JSObject payload = buildKeyboardState();
        Log.i(
            TAG,
            "keyboardStateChange visible=" + keyboardVisible
                + " height=" + keyboardHeight
        );
        notifyListeners("keyboardStateChange", payload);
    }

    private JSObject buildKeyboardState() {
        JSObject payload = new JSObject();
        payload.put("visible", keyboardVisible);
        payload.put("height", keyboardHeight);
        return payload;
    }
}

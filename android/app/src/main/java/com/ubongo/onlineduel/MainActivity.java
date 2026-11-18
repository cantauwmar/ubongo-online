package com.ubongo.onlineduel;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setStatusBarColor(Color.parseColor("#141311"));
        getWindow().setNavigationBarColor(Color.parseColor("#141311"));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#141311"));

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setMediaPlaybackRequiresUserGesture(false);

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                request.grant(request.getResources());
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (uri != null && ("ubongo".equals(uri.getScheme()) ||
                        (uri.getHost() != null && uri.getHost().contains("cantauwmar.github.io")))) {
                    String room = uri.getQueryParameter("room");
                    if (room != null && !room.isEmpty()) {
                        view.loadUrl("file:///android_asset/index.html?room=" + Uri.encode(room));
                        return true;
                    }
                }
                return false;
            }
        });

        setContentView(webView);
        loadFromIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        loadFromIntent(intent);
    }

    private void loadFromIntent(Intent intent) {
        String targetUrl = "file:///android_asset/index.html";
        if (intent != null && Intent.ACTION_VIEW.equals(intent.getAction())) {
            Uri data = intent.getData();
            if (data != null) {
                String room = data.getQueryParameter("room");
                if (room != null && !room.isEmpty()) {
                    targetUrl = "file:///android_asset/index.html?room=" + Uri.encode(room);
                }
            }
        }
        webView.loadUrl(targetUrl);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}

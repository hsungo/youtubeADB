// ==UserScript==
// @name         youtube ad skipper (optimized v2)
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  my youtube adb
// @author       hsungo
// @match        *://*.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        none
// @updateURL    https://raw.githubusercontent.com/hsungo/youtube-tools/main/ad-skipper.user.js
// @downloadURL  https://raw.githubusercontent.com/hsungo/youtube-tools/main/ad-skipper.user.js
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    let lastRun = 0;
    let lastSkip = 0;

    const THROTTLE_MS = 300;     // 控制 observer 觸發頻率
    const SKIP_COOLDOWN = 1000;  // 防止連點 skip

    function handleAds() {
        const video = document.querySelector('video');
        const player = document.querySelector('.html5-video-player');

        if (!video || !player) return;

        const isAdShowing = player.classList.contains('ad-showing');

        // ===== 正片恢復 =====
        if (!isAdShowing) {
            if (video.muted) {
                video.muted = false;
                console.log('🔊 [智慧小幫手] 恢復音量');
            }

            if (video.playbackRate > 1) {
                video.playbackRate = 1;
                console.log('🔄 [智慧小幫手] 恢復正常速度');
            }

            return;
        }

        // ===== 廣告處理 =====
        // 靜音
        if (!video.muted) {
            video.muted = true;
        }

        // 嘗試安全快進（避免卡頓）
        if (video.duration && video.currentTime < video.duration - 1) {
            video.currentTime = video.duration;
            console.log('⏩ [智慧小幫手] 嘗試跳過廣告');
        }

        // Skip 按鈕（多重 selector 防 YouTube 改版）
        const skipButton = document.querySelector(
            '.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, button[aria-label*="Skip"]'
        );

        if (skipButton && skipButton.offsetParent !== null) {
            const now = Date.now();
            if (now - lastSkip > SKIP_COOLDOWN) {
                skipButton.click();
                lastSkip = now;
                console.log('🚀 [智慧小幫手] 點擊略過按鈕');
            }
        }

        // 關閉橫幅廣告（單一查詢，減少負擔）
        const bannerClose = document.querySelector('.ytp-ad-overlay-close-button');
        if (bannerClose) {
            bannerClose.click();
        }
    }

    // ===== MutationObserver + throttle =====
    const observer = new MutationObserver(() => {
        const now = Date.now();
        if (now - lastRun > THROTTLE_MS) {
            lastRun = now;
            handleAds();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // ===== requestAnimationFrame 補強（避免漏判）=====
    function loop() {
        handleAds();
        requestAnimationFrame(loop);
    }
    loop();

    console.log('✅ [智慧小幫手] YouTube Ad Skipper V2 已啟動（低負載穩定版）');

})();
```

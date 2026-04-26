// ==UserScript==
// @name         youtube ad skipper (optimized v2 雙保險終極版)
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  my youtube adb
// @author       hsungo (Optimized)
// @match        *://*.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        none
// @updateURL    https://raw.githubusercontent.com/hsungo/youtubeADB/main/adb.user.js
// @downloadURL  https://raw.githubusercontent.com/hsungo/youtubeADB/main/adb.user.js
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    let lastRun = 0;
    let lastSkip = 0;
    let isMutedByScript = false; // 【修復】紀錄是否由腳本靜音，避免干擾使用者自己設定的靜音

    const THROTTLE_MS = 300;     // 控制執行頻率 (300毫秒)
    const SKIP_COOLDOWN = 1000;  // 防止連點略過按鈕 (1000毫秒)

    function handleAds() {
        // 【效能優化】將 Throttle 統一放在這裡，這樣不論是 Observer 還是 rAF 呼叫，都不會過載
        const now = Date.now();
        if (now - lastRun < THROTTLE_MS) return;
        lastRun = now;

        const video = document.querySelector('video');
        const player = document.querySelector('.html5-video-player');

        if (!video || !player) return;

        // 多加一個 .ad-interrupting 防漏網之魚
        const isAdShowing = player.classList.contains('ad-showing') || document.querySelector('.ad-interrupting');

        // ===== 正片恢復 =====
        if (!isAdShowing) {
            // 只在「被腳本靜音」的情況下才恢復音量，尊重使用者手動靜音的設定
            if (isMutedByScript && video.muted) {
                video.muted = false;
                isMutedByScript = false;
                console.log('🔊 [智慧小幫手] 正片開始，恢復音量');
            }

            if (video.playbackRate > 1) {
                video.playbackRate = 1;
                console.log('🔄 [智慧小幫手] 恢復正常速度');
            }

            return;
        }

        // ===== 廣告處理 =====
        
        // 1. 靜音並記錄
        if (!video.muted) {
            video.muted = true;
            isMutedByScript = true; 
        }

        // 2. 嘗試安全快進（【修復】避免直接等於 duration 導致 YT 播放器轉圈圈卡死）
        if (video.duration && video.currentTime < video.duration - 0.5) {
            video.currentTime = video.duration - 0.1; // 留 0.1 秒
            video.playbackRate = 16;                  // 開 16 倍速衝刺
            console.log('⏩ [智慧小幫手] 16倍速瞬間跳過廣告');
        }

        // 3. Skip 按鈕（多重 selector 防 YouTube 改版）
        const skipButton = document.querySelector(
            '.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, button[aria-label*="Skip"], button[id^="skip-button:"]'
        );

        if (skipButton && skipButton.offsetParent !== null) {
            if (now - lastSkip > SKIP_COOLDOWN) {
                skipButton.click();
                lastSkip = now;
                console.log('🚀 [智慧小幫手] 點擊略過按鈕');
            }
        }

        // 4. 關閉橫幅廣告
        const bannerClose = document.querySelector('.ytp-ad-overlay-close-button');
        if (bannerClose) {
            bannerClose.click();
        }
    }

    // ===== MutationObserver =====
    const observer = new MutationObserver(() => {
        handleAds(); // 節流機制已移至 handleAds 內統一控管
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,                             // 【修復盲區】監聽元素屬性的變化 (破解第二個廣告按鈕)
        attributeFilter: ['style', 'class', 'hidden'] // 限制只監聽這三個屬性以節省效能
    });

    // ===== requestAnimationFrame 補強（避免漏判）=====
    function loop() {
        handleAds();
        requestAnimationFrame(loop);
    }
    loop();

    console.log('✅ [智慧小幫手] YouTube Ad Skipper V2.1 已啟動（雙保險終極版）');

})();

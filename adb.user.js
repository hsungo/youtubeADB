// ==UserScript==
// @name         youtube ad skipper (optimized v2.3 終極突破與偵錯版)
// @namespace    http://tampermonkey.net/
// @version      2.3
// @description  my youtube adb - 加入精準座標突破、視覺化追蹤與強制結束機制
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
    let isMutedByScript = false; // 紀錄是否由腳本靜音，避免干擾使用者自己設定的靜音

    const THROTTLE_MS = 300;     // 控制執行頻率 (300毫秒)
    const SKIP_COOLDOWN = 1000;  // 防止連點略過按鈕 (1000毫秒)

    // 【終極突破與偵錯】加上精確座標、Pointer事件，並開啟視覺化追蹤
    const triggerRealClick = (el) => {
        // 1. 視覺化：把腳本抓到的按鈕加上「粗紅框」跟「黃底色」，讓你肉眼確認腳本有沒有抓錯人
        el.style.border = "5px solid red";
        el.style.backgroundColor = "yellow";
        
        // 2. 計算按鈕在螢幕上的真實中心座標
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + (rect.width / 2);
        const centerY = rect.top + (rect.height / 2);

        // 防護機制：如果 YouTube 放了一個隱形的 0x0 假按鈕來騙腳本
        if (rect.width === 0 || rect.height === 0) {
            console.warn('⚠️ [智慧小幫手偵錯] 抓到按鈕了，但它的尺寸是 0x0，可能被隱藏或用來釣魚！', el);
            return;
        }

        console.log(`🎯 [智慧小幫手偵錯] 準備射擊按鈕，精準座標: X=${centerX}, Y=${centerY}`, el);

        // 3. 全套的 Pointer 與 Mouse 事件連擊 (帶上真實座標破解防護)
        const events = ['pointerover', 'mouseover', 'pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
        
        events.forEach(eventType => {
            const event = new MouseEvent(eventType, {
                bubbles: true,
                cancelable: true,
                view: window,
                buttons: 1,
                clientX: centerX, // 帶上真實 X 座標
                clientY: centerY  // 帶上真實 Y 座標
            });
            el.dispatchEvent(event);
        });
    };

    function handleAds() {
        // 【效能優化】將 Throttle 統一放在這裡，避免 observer 和 rAF 互相干擾
        const now = Date.now();
        if (now - lastRun < THROTTLE_MS) return;
        lastRun = now;

        const video = document.querySelector('video');
        const player = document.querySelector('.html5-video-player');

        if (!video || !player) return;

        // 判斷是否為廣告狀態 (多加一個 .ad-interrupting 防漏網之魚)
        const isAdShowing = player.classList.contains('ad-showing') || document.querySelector('.ad-interrupting');

        // ===== 正片恢復 =====
        if (!isAdShowing) {
            // 只在「被腳本靜音」的情況下才恢復音量
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

        // 2. 嘗試安全快進（避免直接等於 duration 導致卡死）
        if (video.duration && video.currentTime < video.duration - 0.5) {
            video.currentTime = video.duration - 0.1; // 留 0.1 秒
            video.playbackRate = 16;                  // 開 16 倍速衝刺
            
            // 【核彈級防禦】直接對影片播放器發出「影片已結束」的信號，強制拆門！
            video.dispatchEvent(new Event('ended'));
            console.log('⏩ [智慧小幫手] 16倍速衝刺 + 強制發送結束信號！');
        }

        // 3. Skip 按鈕（多重 selector 防 YouTube 改版）
        const skipButton = document.querySelector(
            '.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, button[aria-label*="Skip"], button[id^="skip-button:"]'
        );

        if (skipButton && skipButton.offsetParent !== null) {
            if (now - lastSkip > SKIP_COOLDOWN) {
                triggerRealClick(skipButton); // 使用帶有座標的真實點擊模擬器
                lastSkip = now;
                console.log('🚀 [智慧小幫手] 已發動真實滑鼠點擊略過按鈕！');
            }
        }

        // 4. 關閉橫幅廣告
        const bannerClose = document.querySelector('.ytp-ad-overlay-close-button');
        if (bannerClose) {
            triggerRealClick(bannerClose); // 橫幅廣告也套用真實點擊
        }
    }

    // ===== MutationObserver =====
    const observer = new MutationObserver(() => {
        handleAds(); 
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,                             // 監聽元素屬性的變化 (破解第二個廣告按鈕)
        attributeFilter: ['style', 'class', 'hidden'] // 限制只監聽這三個屬性以節省效能
    });

    // ===== requestAnimationFrame 補強（避免漏判）=====
    function loop() {
        handleAds();
        requestAnimationFrame(loop);
    }
    loop();

    console.log('✅ [智慧小幫手] YouTube Ad Skipper V2.3 已啟動（終極突破與偵錯版）');

})();

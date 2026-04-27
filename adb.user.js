// ==UserScript==
// @name         youtube ad skipper
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  my youtube adb
// @author       hsungo
// @match        *://*.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        none
// @updateURL    https://raw.githubusercontent.com/hsungo/youtubeADB/main/adb.user.js
// @downloadURL  https://raw.githubusercontent.com/hsungo/youtubeADB/main/adb.user.js
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';
    let last=0, mute=false, rate=1, was=false;
    const selectors = ['.ytp-skip-ad-button', '.ytp-ad-skip-button', '.ytp-ad-skip-button-modern', 'button[aria-label*="Skip"]', 'button[id^="skip-button:"]'];

    const run = () => {
        const v = document.querySelector('video'), p = document.querySelector('.html5-video-player');
        if (!v || !p) return;
        const isAd = p.classList.contains('ad-showing') || document.querySelector('.ad-interrupting');

        if (!isAd) {
            if (was) {
                if (mute && v.muted) v.muted = false;
                if (v.playbackRate !== rate) v.playbackRate = rate;
                if (v.paused) v.play().catch(()=>{});
                was = mute = false;
            } else if (v.playbackRate <= 4) rate = v.playbackRate;
            return;
        }

        was = true;
        if (!v.muted) { v.muted = true; mute = true; }

        if (isFinite(v.duration)) {
            if (v.currentTime < v.duration - 0.2) {
                v.currentTime = v.duration - 0.1;
                v.playbackRate = 16;
            } else v.pause();
        }

        let btn = null;
        for (const s of selectors) if ((btn = document.querySelector(s)) && btn.offsetParent) break;

        const now = Date.now();
        if (btn && now - last > 500) {
            btn.click();
            ['mousedown', 'mouseup'].forEach(t => btn.dispatchEvent(new MouseEvent(t, {bubbles:true})));
            last = now;
            v.play().catch(()=>{});
        }
    };

    new MutationObserver(run).observe(document.body, {childList:true, subtree:true, attributes:true, attributeFilter:['class']});
    const loop = () => { run(); requestAnimationFrame(loop); };
    loop();
})();

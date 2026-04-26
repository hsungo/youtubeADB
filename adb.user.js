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

(function(){
    'use strict';
    let lastRun=0,lastSkip=0,isMutedByScript=false,originalPlaybackRate=1,wasAdShowing=false;

    const triggerRealClick=e=>{
        const r=e.getBoundingClientRect();
        if(r.width===0||r.height===0)return;
        if(typeof e.click==='function')e.click();
        const cx=r.left+r.width/2,cy=r.top+r.height/2;
        ['pointerover','mouseover','pointerdown','mousedown','pointerup','mouseup','click'].forEach(t=>{
            e.dispatchEvent(new MouseEvent(t,{bubbles:true,cancelable:true,view:window,buttons:1,clientX:cx,clientY:cy}));
        });
    };

    const handleAds=()=>{
        const now=Date.now();
        if(now-lastRun<300)return;
        lastRun=now;
        const v=document.querySelector('video'),p=document.querySelector('.html5-video-player');
        if(!v||!p)return;

        if(!(p.classList.contains('ad-showing')||document.querySelector('.ad-interrupting'))){
            if(wasAdShowing){
                if(isMutedByScript&&v.muted){v.muted=false;isMutedByScript=false;}
                if(v.playbackRate!==originalPlaybackRate)v.playbackRate=originalPlaybackRate;
                wasAdShowing=false;
            }else if(v.playbackRate>0&&v.playbackRate<=4){
                originalPlaybackRate=v.playbackRate;
            }
            return;
        }

        wasAdShowing=true;
        if(!v.muted){v.muted=true;isMutedByScript=true;}
        if(v.duration&&v.currentTime<v.duration-0.5){
            v.currentTime=v.duration-0.1;
            v.playbackRate=16;
            v.dispatchEvent(new Event('ended'));
        }

        const btn=document.querySelector('.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, button[aria-label*="Skip"], button[id^="skip-button:"]');
        if(btn&&btn.offsetParent!==null&&now-lastSkip>1000){
            triggerRealClick(btn);
            lastSkip=now;
        }

        const banner=document.querySelector('.ytp-ad-overlay-close-button');
        if(banner)triggerRealClick(banner);
    };

    new MutationObserver(handleAds).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class','hidden']});
    const loop=()=>{handleAds();requestAnimationFrame(loop);};
    loop();
})();

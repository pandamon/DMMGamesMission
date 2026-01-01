// ==UserScript==
// @name         DMM Games Mission - Mobile UA Bypass
// @namespace    https://www.youtube.com/watch?v=dQw4w9WgXcQ
// @version      beta-0.1.5
// @description  Bypass some dmm mobile game check userAgent in PC browser
// @author       Pandamon
// @match        https://play.games.dmm.com/game/*
// @match        https://play.games.dmm.co.jp/game/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @run-at       document-start
// @grant        unsafeWindow
// @downloadURL  https://raw.githubusercontent.com/pandamon/DMMGamesMission/refs/heads/main/dmmgamesmission-mobilebypass.js
// @updateURL    https://raw.githubusercontent.com/pandamon/DMMGamesMission/refs/heads/main/dmmgamesmission-mobilebypass.js

// ==/UserScript==

(function() {
    'use strict';
    // also need use chrome extension User-Agent Switcher set to Android

    const URLList = [
        // DMM Games
        "https://play.games.dmm.com/game/yuusyananteokotowari_150692",      // 勇者なんてお断り！～勇者パーティーを追放された俺は、魔王軍の幹部として世界を救う～
        "https://play.games.dmm.com/game/crimson_youmataisen_sp",           // CRIMSON YOU MATAI SEN SP
        "https://play.games.dmm.com/game/leagueofangels",                   // League of Angels - 天使の聖戦 -
        "https://play.games.dmm.com/game/otogi_f_sp",                       // オトギフロンティア
        "https://play.games.dmm.com/game/artwhirl_sp",                      // アートワール
        "https://play.games.dmm.com/game/aigis_sp",                         // 千年戦争アイギス 〜SPブラウザ版〜

        // Fanza Games
        "https://play.games.dmm.co.jp/game/inyouchu-kin_sp",                // 陰陽師-金-
        "https://play.games.dmm.co.jp/game/oenshinshix_sp",                 // 御神楽少女探偵団
        "https://play.games.dmm.co.jp/game/otogi_f_r_sp",                   // オトギフロンティアR
        "https://play.games.dmm.co.jp/game/bokuchin",                       // 僕と彼女のゲーム戦争
        "https://play.games.dmm.co.jp/game/crimson_youmataisen_x_sp",       // クリムゾン妖魔大戦X for SPブラウザ
        "https://play.games.dmm.co.jp/game/devilcarnival",                  // 淫魔降臨デビル☆カーニバル
        "https://play.games.dmm.co.jp/game/perigeenewmoon_sp_987324",       // 悪の女幹部 ペリジーニュームーン【SPブラウザ支部】
        "https://play.games.dmm.co.jp/game/dokyusei_sp",                    // 同級生〜Another World〜 SPブラウザ
    ];

    let bypassMobileUACheck = function(){
        Object.defineProperty(unsafeWindow.navigator,"userAgent",{
            get: function(){
                return "Mozilla/5.0 (Linux; Android 4.4.2; Nexus 4 Build/KOT49H) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/34.0.1847.114 Mobile Safari/537.36";
            }
        })
    }

    if(URLList.includes(unsafeWindow.location.href)){
        bypassMobileUACheck();
        console.log("User-Agent bypassed: " + unsafeWindow.location.href);
    }

})();
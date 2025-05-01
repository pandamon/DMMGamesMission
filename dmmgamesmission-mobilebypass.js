// ==UserScript==
// @name         DMM Games Mission - Mobile UA Bypass
// @namespace    https://www.youtube.com/watch?v=dQw4w9WgXcQ
// @version      beta-0.0.3
// @description  Bypass some dmm mobile game check userAgent in browser
// @author       Pandamon
// @match        https://play.games.dmm.com/game/yuusyananteokotowari_150692
// @match        https://play.games.dmm.com/game/crimson_youmataisen_sp
// @match        https://play.games.dmm.com/game/leagueofangels
// @match        https://play.games.dmm.com/game/otogi_f_sp
// @match        https://play.games.dmm.co.jp/game/inyouchu-kin_sp
// @match        https://play.games.dmm.co.jp/game/oenshinshix_sp
// @match        https://play.games.dmm.co.jp/game/otogi_f_r_sp
// @match        https://play.games.dmm.co.jp/game/bokuchin
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @run-at       document-start
// @grant        unsafeWindow

// ==/UserScript==

(function() {
    'use strict';
    // also need use chrome extension User-Agent Switcher set to Android

    Object.defineProperty(unsafeWindow.navigator,"userAgent",{
        get: function(){
            return "Mozilla/5.0 (Linux; Android 4.4.2; Nexus 4 Build/KOT49H) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/34.0.1847.114 Mobile Safari/537.36";
        }
    })

})();
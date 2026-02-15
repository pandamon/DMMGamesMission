// ==UserScript==
// @name         DMM Games Mission
// @namespace    https://www.youtube.com/watch?v=dQw4w9WgXcQ
// @version      beta-0.4.3
// @description  DMM Games Mission one click harvest
// @author       Pandamon
// @match        https://mission.games.dmm.com
// @match        https://mission.games.dmm.co.jp
// @require      https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.2.0/crypto-js.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/js-yaml/4.1.0/js-yaml.min.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @grant        unsafeWindow
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_xmlhttpRequest
// @grant        GM_openInTab
// @connect      dmm.com
// @run-at       document-idle
// @downloadURL  https://raw.githubusercontent.com/pandamon/DMMGamesMission/refs/heads/main/dmmgamesmission.js
// @updateURL    https://raw.githubusercontent.com/pandamon/DMMGamesMission/refs/heads/main/dmmgamesmission.js

// ==/UserScript==

(function() {
    'use strict';

    // for debug
    unsafeWindow.GM_getValue = GM_getValue;
    unsafeWindow.GM_setValue = GM_setValue;
    unsafeWindow.GM_deleteValue = GM_deleteValue;
    unsafeWindow.GM_listValues = GM_listValues;
    unsafeWindow.GM_xmlhttpRequest = GM_xmlhttpRequest;
    unsafeWindow.GM = GM;
    // unsafeWindow.CryptoJS = CryptoJS;
    // unsafeWindow.jsyaml = jsyaml;


    // some util functions

    let clearGMstorage = function(){
        let keylist = GM_listValues();
        for(let i = 0; i < keylist.length; i++){
            GM_deleteValue(keylist[i]);
        }
        return;
    }
    unsafeWindow.clearGMstorage = clearGMstorage;

    let sleep = function(ms){
        return new Promise(function(resolve,reject){
            setTimeout(function(){
                resolve();
            },ms);
        });
    }

    let waitQuerySelector = async function(queryString){
        while(!document.querySelector(queryString)){
            await sleep(500);
        };
        return document.querySelector(queryString);
    }

    let zeroHourNextDayTokyoTime = function(){
        // return next day 0:00:00 GMT+9
        // Get the time difference between the local time zone and UTC (minutes)
        let localOffset = new Date().getTimezoneOffset(); // Beijing time is -480
        // Time difference between Tokyo time zone and UTC (minutes)
        let tokyoOffset = -9 * 60; // UTC+9
        // Calculate the time difference between local time and Tokyo time (hours)
        let diffHours = (tokyoOffset - localOffset) / 60; // Beijing time is -1
        let d = new Date(); // local time
        d.setHours(d.getHours() - diffHours); // to GMT+9
        d.setDate(d.getDate() + 1); // Next day
        d.setHours(0);
        d.setMinutes(0);
        d.setSeconds(0);
        d.setMilliseconds(0);
        d.setHours(d.getHours() + diffHours); // to local time
        return d;
    }




    // page platform and type check

    let pagePlatform = function(){
        let hallmarkElement = document.querySelector("body > div[data-title=main_contents] > div.gamesResetStyle > main[class^=styles_main] > section");
        if (hallmarkElement) {
            if (hallmarkElement.className.startsWith('pc_pc')){
                return "pc";
            } else if (hallmarkElement.className.startsWith('sp_sp')) {
                return "mobile";
            } else {
                throw Error("pagePlatform className error");
            }
        } else {
            throw Error("pagePlatform get element error");
        }
    }

    let pageType = function(){
        let dmm = location.hostname.match(/mission\.games\.dmm\.com/);
        let fanza = location.hostname.match(/mission\.games\.dmm\.co\.jp/);
        if(dmm && !fanza){
            return 'dmm';
        } else if(!dmm && fanza){
            return 'fanza';
        } else {
            return null;
        }
    }


    // client header

    let getLatestClientVersion = async function(oldVersion){
        let details = {
            method: "GET",
            url: 'https://dlapp-dmmgameplayer.games.dmm.com/latest.yml'
        }
        if(oldVersion){
            details.headers = {
                "User-Agent":`DMMGamePlayer5-Win/${oldVersion} Electron/34.1.1`,
                "Client-App":"DMMGamePlayer5",
                "Client-Version":oldVersion
            }
        };
        let latestResponse = await GM.xmlHttpRequest(details);
        let parsedLatestYml = jsyaml.load(latestResponse.responseText);
        return parsedLatestYml.version;
    }

    let updateClientVersion = async function(oldVersion){
        let clientVersion = {};
        clientVersion.version = await getLatestClientVersion(oldVersion);
        clientVersion.expireTime = Date.now() + 7*24*3600*1000;
        saveClientVersion(clientVersion);
        return clientVersion;
    }

    let getClientVersion = async function(){
        let clientVersion = GM_getValue("DMMGamePlayerVersion",null);
        if(clientVersion == null){
            clientVersion = await updateClientVersion();
        } else if(clientVersion.expireTime < Date.now()){
            clientVersion = await updateClientVersion(clientVersion.version);
        }
        return clientVersion;
    }

    let saveClientVersion = function(clientVersion){
        GM_setValue("DMMGamePlayerVersion",clientVersion);
        return;
    }

    let clientHeader = async function(){
        let clientVersion = await getClientVersion();
        let header = {
            "Cookie": "age_check_done=1",
            "Content-Type": "application/json",
            "User-Agent":`DMMGamePlayer5-Win/${clientVersion.version} Electron/34.3.0`,
            "Client-App":"DMMGamePlayer5",
            "Client-Version":clientVersion.version
        }
        return header;
    }


    // generate random hardware info

    let genRandomMAC = function(){
        let charList = "0123456789ABCDEF";
        let MACarray = [];
        for(let i=0;i<6;i++){
            MACarray[i] = charList[Math.floor(16*Math.random())]+charList[Math.floor(16*Math.random())];
        }
        return MACarray.join(':');
    }

    let sha256Hash = function(string){
        let hash = CryptoJS.SHA256(string);
        return hash.toString();
    }

    let genRandomHardwareInfo = function(){
        let timestamp = Date.now();
        let hardwareInfo = {};
        hardwareInfo.mac_address = genRandomMAC();
        hardwareInfo.hdd_serial = sha256Hash("hdd_serial"+timestamp);
        hardwareInfo.motherboard = sha256Hash("motherboard"+timestamp);
        hardwareInfo.user_os = "win";
        return hardwareInfo;
    }

    let getHardwareInfo = function(){
        let hardwareInfo = GM_getValue("HardwareInfo",null);
        if(!hardwareInfo || !('user_os' in hardwareInfo)){
            hardwareInfo = genRandomHardwareInfo();
            saveHardwareInfo(hardwareInfo);
        }
        return hardwareInfo;
    }

    let saveHardwareInfo = function(hardwareInfo){
        GM_setValue("HardwareInfo",hardwareInfo);
        return;
    }

    let resetHardwareInfo = function(){
        let hardwareInfo = genRandomHardwareInfo();
        saveHardwareInfo(hardwareInfo);
        console.log(hardwareInfo);
        return;
    }
    unsafeWindow.resetHardwareInfo = resetHardwareInfo; // for debug manually


    // get actauth string

    let getClientLoginURL = async function(){
        // simulate client login start
        let header = await clientHeader();
        let data = {"prompt":"choose"};
        let details = {
            method: "POST",
            url: 'https://apidgp-gameplayer.games.dmm.com/v5/auth/login/url',
            headers: header,
            data: JSON.stringify(data)
        }
        let response = await GM.xmlHttpRequest(details);
        let result = JSON.parse(response.responseText);
        // console.log(result);
        if(result.result_code == 100){
            return result.data.url;
        } else {
            throw Error("getClientLoginURL error: "+result.result_code);
        }
    }

    let realClientLoginURL = function(clientLoginURL){
        // get the real client login url
        // example: 
        // https://accounts.dmm.com/service/oauth/select/=/path=https%3A%2F%2Fwww.dmm.com%2Fmy%2F-%2Fauthorize%3Fclient_id%3DXXX%26response_type%3Dcode%26from_domain%3Daccounts?prompt=choose
        let urlstring = clientLoginURL.match(/(?<=https:\/\/accounts\.dmm\.com\/service\/oauth\/select\/=\/path=).*/)[0];
        return decodeURIComponent(urlstring);
    }

    let getLoginCode = async function(realclientLoginURL){
        // get the login code from the real client login url
        // example: https://webdgp-gameplayer.games.dmm.com/login/success?code=XXX
        // the code is the value of the "code" parameter in the url
        let details = {
            method: "GET",
            url: realclientLoginURL
        }
        let response = await GM.xmlHttpRequest(details);
        //console.log(response);
        let result = response.finalUrl.match(/(?<=code=).*/)[0];
        console.log("login code: "+result);
        return result;
    }

    let getClientAccessToken = async function(loginCode){
        // get the access token from the login code
        let header = await clientHeader();
        let data = {"code": loginCode};
        let details = {
            method: "POST",
            url: 'https://apidgp-gameplayer.games.dmm.com/v5/auth/accesstoken/issue',
            headers: header,
            data: JSON.stringify(data)
        }
        let response = await GM.xmlHttpRequest(details);
        let result = JSON.parse(response.responseText);
        // console.log(result);
        if(result.result_code == 100){ 
            if(result.data && result.data.access_token){
                return result.data.access_token;
            }
        } else {
            throw Error("getClientAccessToken error: "+result.result_code);
        }
    }

    let checkClientAccessToken = async function(accessToken){
        console.log('/v5/auth/accesstoken/check');
        // check the access token
        let header = await clientHeader();
        let data = {"access_token": accessToken};
        let details = {
            method: "POST",
            url: 'https://apidgp-gameplayer.games.dmm.com/v5/auth/accesstoken/check',
            headers: header,
            data: JSON.stringify(data)
        }
        console.log(data);
        let response = await GM.xmlHttpRequest(details);
        let result = JSON.parse(response.responseText);
        console.log(result);
        if(result.result_code == 100){
            if(result.data && result.data.result){
                return true;
            } else {
            return false;   
            }
        } else {
            throw Error("checkClientAccessToken error: "+result.result_code);
        }
    }

    let updateClientAccessToken = async function(){
        // this function is used to update the access token
        let clientLoginURL = realClientLoginURL(await getClientLoginURL());
        let loginCode = await getLoginCode(clientLoginURL);
        let accessToken = await getClientAccessToken(loginCode);
        saveActauth(accessToken);
        console.log("Actauth updated: "+accessToken);
        return accessToken;
    }
    unsafeWindow.updateClientAccessToken = updateClientAccessToken;

    let saveActauth = function(actauth){
        GM_setValue("Actauth",actauth);
        return;
    }

    let getActauth = async function(){
        let actauth = GM_getValue("Actauth",null);
        if(actauth == null){
            actauth = await updateClientAccessToken();
            // actauth not exist
        }
        return actauth;
    }

    let checkAndUpdateActauth = async function () {
        let actauth = await getActauth();
        if(!await checkClientAccessToken(actauth)){
            actauth = await updateClientAccessToken();
        }
        return;
    }





    // add dmm game player client game into your gamelist
    
    let detailButtoninfo = async function (product_id, game_type){
        console.log('/v5/detail/buttoninfo');
        let header = await clientHeader();
        header.Actauth = await getActauth();
        // let data = {...getHardwareInfo(), ...dmmgameplayerLinkParser(getDmmgameplayerLink(pageType))};
        let data = getHardwareInfo();
        data.product_id = product_id;
        data.game_type = game_type;
        data.game_os = "win";
        let details = {
            method: "POST",
            url: 'https://apidgp-gameplayer.games.dmm.com/v5/detail/buttoninfo',
            headers: header,
            data: JSON.stringify(data)
        }
        console.log(data);
        let response = await GM.xmlHttpRequest(details);
        let result = JSON.parse(response.responseText);
        console.log(result);
        if(result.result_code !== 100){
            throw Error("detail/buttoninfo error");
        }
        return result;
    }
    
    let mygameRestore = async function (product_id, game_type){
        console.log('/v5/mygame/restore');
        let header = await clientHeader();
        header.Actauth = await getActauth();
        // let data = { my_games: [dmmgameplayerLinkParser(getDmmgameplayerLink(pageType))]};
        let data = { my_games: [{
            product_id: product_id,
            game_type: game_type,
            game_os: "win"
        }] };
        let details = {
            method: "POST",
            url: 'https://apidgp-gameplayer.games.dmm.com/v5/mygame/restore',
            headers: header,
            data: JSON.stringify(data)
        }
        console.log(data);
        let response = await GM.xmlHttpRequest(details);
        let result = JSON.parse(response.responseText);
        console.log(result);
        if(result.result_code !== 100){
            throw Error("mygame/restore error");
        }
        return result;
    }

    let detailMygameAdd = async function (product_id, game_type){
        console.log('/v5/detail/mygame/add');
        let header = await clientHeader();
        header.Actauth = await getActauth();
        let data = {};//dmmgameplayerLinkParser(getDmmgameplayerLink(pageType));
        data.product_id = product_id;
        data.game_type = game_type;
        data.game_os = "win";
        let details = {
            method: "POST",
            url: 'https://apidgp-gameplayer.games.dmm.com/v5/detail/mygame/add',
            headers: header,
            data: JSON.stringify(data)
        }
        console.log(data);
        let response = await GM.xmlHttpRequest(details);
        let result = JSON.parse(response.responseText);
        console.log(result);
        if(result.result_code !== 100){
            throw Error("detail/mygame/add error");
        }
        return result;
    }

    let r2InstallCl = async function (product_id, game_type){
        console.log('/v5/r2/install/cl');
        let header = await clientHeader();
        header.Actauth = await getActauth();
        // let data = {...getHardwareInfo(), ...dmmgameplayerLinkParser(getDmmgameplayerLink(pageType))};
        let data = getHardwareInfo();
        data.product_id = product_id;
        data.game_type = game_type;
        data.game_os = "win";
        let details = {
            method: "POST",
            url: 'https://apidgp-gameplayer.games.dmm.com/v5/r2/install/cl',
            headers: header,
            data: JSON.stringify(data)
        }
        console.log(data);
        let response = await GM.xmlHttpRequest(details);
        let result = JSON.parse(response.responseText);
        console.log(result);
        if(result.result_code == 308){
            console.log("r2/install/cl result_code 308, agreement required");
        } else if (result.result_code == 100){
            console.log("r2/install/cl result_code 100");
        } else {
            throw Error("r2/install/cl unknown error");
        }
        return result;
    }

    let agreement = async function (product_id){
        console.log('/v5/agreement');
        let header = await clientHeader();
        header.Actauth = await getActauth();
        // let data = {product_id:dmmgameplayerLinkParser(getDmmgameplayerLink(pageType)).product_id};
        let data = {
            product_id: product_id
        };
        let details = {
            method: "POST",
            url: 'https://apidgp-gameplayer.games.dmm.com/v5/agreement',
            headers: header,
            data: JSON.stringify(data)
        }
        console.log(data);
        let response = await GM.xmlHttpRequest(details);
        let result = JSON.parse(response.responseText);
        console.log(result);
        if(result.result_code !== 100){
            throw Error("agreement error");
        }
        return result;
    }

    let agreementConfirmClient = async function (product_id){
        console.log('/v5/agreement/confirm/client');
        let header = await clientHeader();
        header.Actauth = await getActauth();
        let data = {
            product_id: product_id,//dmmgameplayerLinkParser(getDmmgameplayerLink(pageType)).product_id,
            is_notification:false
        };
        let details = {
            method: "POST",
            url: 'https://apidgp-gameplayer.games.dmm.com/v5/agreement/confirm/client',
            headers: header,
            data: JSON.stringify(data)
        }
        console.log(data);
        let response = await GM.xmlHttpRequest(details);
        let result = JSON.parse(response.responseText);
        console.log(result);
        if(result.result_code !== 100){
            throw Error("agreement/confirm/client error");
        }
        return result;
    }

    let addClientGame = async function (product_id, game_type){
        // let actauth = await getActauth();
        // if(!await checkClientAccessToken(actauth)){
        //     actauth = await updateClientAccessToken();
        // }
        let detailButtoninfoResult = await detailButtoninfo(product_id, game_type);
        if(detailButtoninfoResult.data[0].main_button_info.actions[0] == 'addMyGame' || !detailButtoninfoResult.data[0].is_in_mygame){
            await mygameRestore(product_id, game_type);
            await detailMygameAdd(product_id, game_type);
            console.log('this game is added into game list now');
        } else {
            console.log('this game have been in game list');
        }
        let r2InstallClResult = await r2InstallCl(product_id, game_type);
        if(r2InstallClResult.result_code == 308){
            // agreement required
            await agreement(product_id);
            let agreementConfirmClientResult = await agreementConfirmClient(product_id);
            if(agreementConfirmClientResult.result_code == 100){
                console.log('confirm agreement success');
            }            
            let r2InstallClResult2 = await r2InstallCl(product_id, game_type);
            if(r2InstallClResult2.result_code == 100){
                console.log('r2/install/cl success');
            } else {
                throw Error("r2/install/cl 2 unknown error");
            }
        } else if (r2InstallClResult.result_code == 100){
            // no need confirm agreement
            console.log('r2/install/cl success, no need confirm agreement');
        } else {
            throw Error("r2/install/cl unknown error");
        }
        console.log('add client game finish');
        return;
    }


    // dmm game player client game launch

    let r2LaunchCl = async function (product_id, game_type) {
        // product_id = product_id string, example: "mementomori"
        // game_type = "GCL"(not adult) or "ACL"(adult)
        console.log('/v5/r2/launch/cl');
        let actauth = await getActauth();
        // if (!await checkClientAccessToken(actauth)) {
        //     actauth = await updateClientAccessToken();
        // }
        let header = await clientHeader();
        header.Actauth = actauth;
        // console.log(header);
        let data = getHardwareInfo();
        data.product_id = product_id;
        data.game_type = game_type;
        data.game_os = "win";
        data.launch_type = "LIB";
        let details = {
            method: "POST",
            url: 'https://apidgp-gameplayer.games.dmm.com/v5/r2/launch/cl',
            headers: header,
            data: JSON.stringify(data)
        }
        console.log(data);
        let response = await GM.xmlHttpRequest(details);
        let result = JSON.parse(response.responseText);
        console.log(result);
        return result;
    }

    let launchClientGame = async function (product_id, game_type) {
        let launchResult = await r2LaunchCl(product_id, game_type);
        if (launchResult.result_code == 100) {
            // launch success
            console.log(`result_code is 100, launch product_id:${product_id} game_type:${game_type} success`);
        } else {
            // launch fail, try addClientGame, then retry launch
            await addClientGame(product_id, game_type);
            launchResult = await r2LaunchCl(product_id, game_type);
            if (launchResult.result_code == 100){
                // retry launch success
                console.log(`result_code is 100, launch product_id:${product_id} game_type:${game_type} success`);
            } else {
                // retry launch fail
                console.log(`result_code is ${launchResult.result_code}, launch product_id:${product_id} game_type:${game_type} fail`);
            }
        }
        return launchResult.result_code;
    }


    // dmm game player mission api

    let missionCatalogs = async function (category, is_adult) {
        // category: "limited" "daily" "weekly" "monthly"
        // is_adult: true false
        console.log('/v5/mission/catalogs');
        let header = await clientHeader();
        header.Actauth = await getActauth();
        let data = {
            category: category,
            is_adult: is_adult
        };
        let details = {
            method: "POST",
            url: 'https://apidgp-gameplayer.games.dmm.com/v5/mission/catalogs',
            headers: header,
            data: JSON.stringify(data)
        }
        console.log(data);
        let response = await GM.xmlHttpRequest(details);
        let result = JSON.parse(response.responseText);
        console.log(result);
        if (result.result_code !== 100) {
            throw Error("/v5/mission/catalogs error");
        }
        return result;
    }
    unsafeWindow.missionCatalogs = missionCatalogs;

    let missionAward = async function (mission_id) {
        // mission_id: string (should be a uuid)
        console.log('/v5/mission/mission/award');
        let header = await clientHeader();
        header.Actauth = await getActauth();
        let data = {
            mission_id: mission_id
        };
        let details = {
            method: "POST",
            url: 'https://apidgp-gameplayer.games.dmm.com/v5/mission/mission/award',
            headers: header,
            data: JSON.stringify(data)
        }
        console.log(data);
        let response = await GM.xmlHttpRequest(details);
        let result = JSON.parse(response.responseText);
        console.log(result);
        if (result.result_code !== 100) {
            throw Error("/v5/mission/mission/award error");
        }
        return result;
    }


    // one click harvest dmm game player daily mission

    let dmmgameplayerDailyMission = async function (is_adult) {
        // is_adult: true false
        await checkAndUpdateActauth();
        let retryCount = 3;
        let dailyMissionDetail = (await missionCatalogs("daily", is_adult)).data.daily[0];
        let lastMissionStatus = '';
        let product_id = '';
        let game_type = is_adult ? "ACL" : "GCL";
        while (retryCount > 0){
            if (dailyMissionDetail.status == "progressing") {
                // send launch signal
                for (let i = 0; i < dailyMissionDetail.applications.length; i++){
                    product_id = dailyMissionDetail.applications[i].link.url.match(/\/free\/(.*)$/)[1];
                    await launchClientGame(product_id, game_type);
                }
                // await sleep(1000);
            } else if (dailyMissionDetail.status == "achieved") {
                // send award signal
                await missionAward(dailyMissionDetail.id);
            } else if (dailyMissionDetail.status == "completed") {
                return "completed";
            } else {
                console.log(dailyMissionDetail);
                throw Error("dailyMissionDetail.status error");
            }
            lastMissionStatus = dailyMissionDetail.status;
            dailyMissionDetail = (await missionCatalogs("daily", is_adult)).data.daily[0];
            if (dailyMissionDetail.status == lastMissionStatus){
                retryCount--;
                console.log("retryCount: " + retryCount);
            }
        }
        return dailyMissionDetail.status;
    }

    let dmmgameplayerOneClickHarvest = async function () {
        let commonMissionStatus = await dmmgameplayerDailyMission(false);
        let adultMissionStatus = await dmmgameplayerDailyMission(true);
        console.log(`commonMissionStatus: ${commonMissionStatus}, adultMissionStatus: ${adultMissionStatus}`);
        return;
    }


    // dmmplayer send launch signal manually

    let getDmmgameplayerLink = function (pageType) {
        if (pageType == 'dmm') {
            return GM_getValue('dmm_dmmgameplayerLink', null);
        } else if (pageType == 'fanza') {
            return GM_getValue('fanza_dmmgameplayerLink', null);
        } else {
            throw Error('pageType error');
        }
    }

    let saveDmmgameplayerLink = function (pageType, dmmgameplayerLink) {
        if (pageType == 'dmm') {
            GM_setValue('dmm_dmmgameplayerLink', dmmgameplayerLink);
            console.log('dmm_dmmgameplayerLink now is ' + dmmgameplayerLink);
        } else if (pageType == 'fanza') {
            GM_setValue('fanza_dmmgameplayerLink', dmmgameplayerLink);
            console.log('fanza_dmmgameplayerLink now is ' + dmmgameplayerLink);
        } else {
            throw Error('pageType error');
        }
        return;
    }

    let dmmgameplayerLinkParser = function (dmmgameplayerLink) {
        if (!dmmgameplayerLink.startsWith('dmmgameplayer://')) {
            throw Error("dmmplayerLinkParser error: dmmplayerLink must be start with dmmgameplayer://");
        }
        let dmmgameplayerURL = new URL(dmmgameplayerLink);
        if (!(dmmgameplayerURL.protocol == 'dmmgameplayer:')) {
            throw Error("dmmplayerLinkParser error: dmmplayerLink must be dmmgameplayer protocol");
        }
        if (dmmgameplayerURL.pathname.includes('general')) {
            return {
                product_id: dmmgameplayerURL.host,
                game_type: 'GCL'
            };
        } else if (dmmgameplayerURL.pathname.includes('adult')) {
            return {
                product_id: dmmgameplayerURL.host,
                game_type: 'ACL'
            };
        } else {
            throw Error("dmmplayerLinkParser error: game_type is not general(GCL) or adult(ACL)");
        }
    }

    let sendLaunchSignal = async function (pageType) {
        await checkAndUpdateActauth();
        let clientGameData = dmmgameplayerLinkParser(getDmmgameplayerLink(pageType));
        await r2LaunchCl(clientGameData.product_id, clientGameData.game_type);
        return;
    }

    let addClientGameManually = async function (pageType) {
        await checkAndUpdateActauth();
        let clientGameData = dmmgameplayerLinkParser(getDmmgameplayerLink(pageType));
        await addClientGame(clientGameData.product_id, clientGameData.game_type);
        return;
    }




    // xmlHttpRequest get MissionPage

    let getMissionPage = async function (link) {
        let ua = () => {
            if (pagePlatform() == 'pc'){
                return navigator.userAgent;
            } else if (pagePlatform() == 'mobile'){
                return "Mozilla/5.0 (Linux; Android 4.4.2; Nexus 4 Build/KOT49H) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/34.0.1847.114 Mobile Safari/537.36";
            }
        }
        let response = await GM.xmlHttpRequest({
            method: "GET",
            url: link,
            headers: {
                "user-agent": ua()
            },
        });
        return response;
    }

    // web game mission process

    let queryMissionTarget = function(pageDocument){
        let button = pageDocument.querySelector("div[class^=actionButton] > a[data-gtm-action-detail=link_mission]");
        if (button){
            let bottonList = pageDocument.querySelectorAll("div[class^=actionButton] > a[data-gtm-action-detail=link_mission]");
            return { node: bottonList, type: 'button' };
        }
        let list = pageDocument.querySelectorAll("a[class^=targetGame]");
        if (list.length > 0){
            return { node: list, type: 'list' };
        }
        return { node: null, type: null };
    }

    let openMissionTargetTab = function (missionTarget){
        if (missionTarget.type) {
            for (let i = 0; i < missionTarget.node.length; i++) {
                if (missionTarget.node[i].href.includes('rcv.ixd.dmm.com')) {
                    let tab = GM_openInTab(missionTarget.node[i].href);
                    setTimeout(function () {
                        tab.close();
                    }, 10000);
                }
            }
        }
        return;
    }

    let webGameMission = async function (missionLink){
        // console.log(missionLink);
        let missionPage = await getMissionPage(missionLink);
        let missionTarget = queryMissionTarget(missionPage.responseXML);
        if (missionTarget.type){
            openMissionTargetTab(missionTarget);
        }
        return;
    }



    // check web game mission status

    let missionStatus = function (node) {
        if (node.querySelector("a[data-gtm-action-detail=link_mission-card]")) {
            return 'harvest';
        } else if (node.querySelector("button[data-gtm-action-detail=receive_card]")) {
            return 'reward';
        } else if (node.querySelector("div[class^=missionCard_completedOverlay]")) {
            return 'completed';
        } else {
            throw Error("missionStatus error");
        }
    }

    let receiveStatus = function (node) {
        if (document.querySelector("div[class^=catalogsRewardButton] > button")) {
            if (missionStatus(node) == 'reward') {
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    }

    let webGameOneClickHarvest = async function (webMissionCatalog) {
        for (let i = 0; i < webMissionCatalog.length; i++){
            let missionLinkList = webMissionCatalog[i].querySelectorAll("li > a[data-gtm-action-detail=link_mission-card]");
            if (missionLinkList.length > 0){
                for (let j = 0; j < missionLinkList.length; j++){
                    webGameMission(missionLinkList[j].href);
                }
            }
        }
        await sleep(12000);
        location.reload();
        return;
    }



    // button ui

    let insertNodeBefore = function (beforeNode, createNodeType, createNodeAttribute) {
        // return node
        // createNodeType:"div","button"...
        // insertNodeAttribute example:
        // insertNodeAttribute = {
        //     id:xxx,
        //     innerHTML:xxx,
        //     innerText:xxx,
        //     background:xxx,
        //     color:xxx,
        //     fontSize:xxx
        // }
        let createNode = document.createElement(createNodeType);
        if (createNodeAttribute.id) {
            createNode.setAttribute('id', createNodeAttribute.id);
        }
        if (createNodeAttribute.innerHTML) {
            createNode.innerHTML = createNodeAttribute.innerHTML;
        }
        if (createNodeAttribute.innerText) {
            createNode.innerText = createNodeAttribute.innerText;
        }
        if (createNodeAttribute.background) {
            createNode.style.background = createNodeAttribute.background;
        }
        if (createNodeAttribute.color) {
            createNode.style.color = createNodeAttribute.color;
        }
        if (createNodeAttribute.fontSize) {
            createNode.style.fontSize = createNodeAttribute.fontSize;
        }
        if (createNodeAttribute.textAlign) {
            createNode.style.textAlign = createNodeAttribute.textAlign;
        }
        if (createNodeAttribute.border) {
            createNode.style.border = createNodeAttribute.border;
        }
        beforeNode.parentElement.insertBefore(createNode, beforeNode);
        return createNode;
    }

    let createClientGameMissionBtn = function (beforeNode, id) {
        let attribute = {
            id: id, //"ClientGameMissionBtn"
            innerHTML: "&nbsp;One Click Harvest (DMM Game Player)&nbsp;",
            background: "#66CDAA",
            color: "#000",
            fontSize: "16px",
            border: "2px solid black"
        };
        return insertNodeBefore(beforeNode, "button", attribute);
    }

    let createOneClickReceiveBtn = function (beforeNode, id) {
        let attribute = {
            id: id,
            innerHTML: "&nbsp;One Click Harvest&nbsp;",
            background: "#FFD700",
            color: "#000",
            fontSize: "16px",
            border: "2px solid black"
        };
        return insertNodeBefore(beforeNode, "button", attribute);
    }

    let createInputLink = function (beforeNode, id) {
        let inputLinkAttribute = {
            id: id, //"dmmgameplayerLink"
            background: "#FFFFFF",
            fontSize: "16px",
            border: "2px solid black"
        };
        return insertNodeBefore(beforeNode, "input", inputLinkAttribute);
    }

    let createSaveLinkBtn = function (beforeNode, id) {
        let saveLinkBtnAttribute = {
            id: id, //"SaveLinkBtn"
            innerHTML: "&nbsp;Save Link&nbsp;",
            background: "#F4A460",
            color: "#000",
            fontSize: "16px",
            border: "2px solid black"
        };
        return insertNodeBefore(beforeNode, "button", saveLinkBtnAttribute);
    }

    let createSendLaunchSignalBtn = function (beforeNode, id) {
        let attribute = {
            id: id, //"SendLaunchSignalBtn"
            innerHTML: "&nbsp;Send Launch Signal&nbsp;",
            background: "#66CDAA",
            color: "#000",
            fontSize: "16px",
            border: "2px solid black"
        };
        return insertNodeBefore(beforeNode, "button", attribute);
    }

    let createAddGameBtn = function (beforeNode, id) {
        let attribute = {
            id: id, //"AddGameBtn"
            innerHTML: "&nbsp;Add Game&nbsp;",
            background: "#EE82EE",
            color: "#000",
            fontSize: "16px",
            border: "2px solid black"
        };
        return insertNodeBefore(beforeNode, "button", attribute);
    }



    // main function

    let mainPC = async function(){

        console.log("pc");

        await sleep(1000);

        let allMission = document.querySelector("div[class^=allPanel]");
        let allMissionCatalog = allMission.querySelectorAll("div > ul[role=list][class^=catalogPanel]");
        // allMissionCatalog index: 0.limited 1.daily 2.weeklyLottery 3.monthlyLottery


        let currentPageType = pageType();
        let missionContentPlace = document.querySelector("body > div[data-title=main_contents] > div.gamesResetStyle > main[class^=styles_main] > div[class^=styles_content] > div[class^=pc_pc]");
        insertNodeBefore(missionContentPlace, "br", {});
        let pcOneClickReceiveBtn = createOneClickReceiveBtn(missionContentPlace,"PCOneClickReceiveBtn");
        pcOneClickReceiveBtn.onclick = function(){
            webGameOneClickHarvest(allMissionCatalog);
        }
        insertNodeBefore(missionContentPlace,"br",{});
        let clientGameMissionBtn = createClientGameMissionBtn(missionContentPlace,"ClientGameMissionBtn");
        clientGameMissionBtn.onclick = async function(){
            await dmmgameplayerOneClickHarvest();
            clientGameMissionBtn.innerHTML = '&nbsp;One Click Harvest (DMM Game Player) Finished!&nbsp;';
            clientGameMissionBtn.style.background = "#EE82EE";
        }
        insertNodeBefore(missionContentPlace, "br", {});
        insertNodeBefore(missionContentPlace, "span", {
            fontSize: "16px",
            innerHTML: "&nbsp;Input dmmgameplayer link:&nbsp;"
        });
        insertNodeBefore(missionContentPlace, "br", {});
        let inputLink = createInputLink(missionContentPlace, "dmmgameplayerLink");
        inputLink.style.width = "600px";
        if (getDmmgameplayerLink(currentPageType)) {
            inputLink.value = getDmmgameplayerLink(currentPageType);
        }
        insertNodeBefore(missionContentPlace, "br", {});
        let saveLinkBtn = createSaveLinkBtn(missionContentPlace, "SaveLinkBtn");
        saveLinkBtn.onclick = function () {
            saveDmmgameplayerLink(currentPageType, inputLink.value);
        }
        let sendLaunchSignalBtn = createSendLaunchSignalBtn(missionContentPlace, "SendLaunchSignalBtn");
        sendLaunchSignalBtn.onclick = async function () {
            await sendLaunchSignal(currentPageType);
        }
        let addGameBtn = createAddGameBtn(missionContentPlace, "AddGameBtn");
        addGameBtn.onclick = async function () {
            await addClientGameManually(currentPageType);
        }

        if (receiveStatus(allMissionCatalog[1])){
            let receiveAllBtn = document.querySelector("div[class^=catalogsRewardButton] > button");
            receiveAllBtn.click();
        }
    }


    let mainMobile = async function(){

        console.log("mobile");

        await sleep(1000);

        let allMission = document.querySelector("div[class^=allPanel]");
        let allMissionCatalog = allMission.querySelectorAll("div > ul[role=list][class^=catalogPanel]");
        // allMissionCatalog index: 0.limited 1.daily 2.weekly 3.monthly

        let missionContentPlace = document.querySelector("body > div[data-title=main_contents] > div.gamesResetStyle > main[class^=styles_main] > div[class^=styles_content] > div[class^=sp_sp]");
        insertNodeBefore(missionContentPlace, "br", {});
        let mobileOneClickReceiveBtn = createOneClickReceiveBtn(missionContentPlace,"MobileOneClickReceiveBtn");
        mobileOneClickReceiveBtn.onclick = function(){
            webGameOneClickHarvest(allMissionCatalog);
        }

        if (receiveStatus(allMissionCatalog[1])){
            let receiveAllBtn = document.querySelector("div[class^=catalogsRewardButton] > button");
            receiveAllBtn.click();
        }
    }

    if(pagePlatform() == "pc"){
        mainPC();
    } else if(pagePlatform() == "mobile"){
        mainMobile();
    }

})();
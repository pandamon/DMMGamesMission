// ==UserScript==
// @name         DMM Games Mission
// @namespace    https://www.youtube.com/watch?v=dQw4w9WgXcQ
// @version      beta-0.3.0
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
    // unsafeWindow.GM_getValue = GM_getValue;
    // unsafeWindow.GM_setValue = GM_setValue;
    // unsafeWindow.GM_deleteValue = GM_deleteValue;
    // unsafeWindow.GM_listValues = GM_listValues;
    // unsafeWindow.GM_xmlhttpRequest = GM_xmlhttpRequest;
    // unsafeWindow.GM = GM;
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

    let domparser = new DOMParser();
    unsafeWindow.domparser = domparser;

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
        let pcHallmark = document.querySelector("#olympus-ntgnav");
        let mobileHallmark = document.querySelector("#olympus-menu-bar");
        if(pcHallmark && !mobileHallmark){
            return "PC";
        } else if(!pcHallmark && mobileHallmark){
            return "mobile";
        } else {
            throw Error("pagePlatform error");
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
        if(!hardwareInfo){
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
        // check the access token
        let header = await clientHeader();
        let data = {"access_token": accessToken};
        let details = {
            method: "POST",
            url: 'https://apidgp-gameplayer.games.dmm.com/v5/auth/accesstoken/check',
            headers: header,
            data: JSON.stringify(data)
        }
        let response = await GM.xmlHttpRequest(details);
        let result = JSON.parse(response.responseText);
        console.log('/v5/auth/accesstoken/check');
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
        // console.log("New access token: "+accessToken);
        return accessToken;
    }

    let saveActauth = function(actauth){
        GM_setValue("Actauth",actauth);
        return;
    }

    let getActauthExpireTime = function(){
        if(GM_getValue("ActauthExpireTime",null) == null){
            resetActauthExpireTime();
        }
        return GM_getValue("ActauthExpireTime",null);
    }

    let resetActauthExpireTime = function(){
        // reset expire time to next day 0:00:00 GMT+9
        let expireTime = zeroHourNextDayTokyoTime().getTime();
        GM_setValue("ActauthExpireTime", expireTime);
        console.log("Actauth expire time is reset to next day 0:00:00 GMT+9");
        return;
    }

    let getActauth = async function(){
        let actauth = GM_getValue("Actauth",null);
        if(actauth == null){
            actauth = await updateClientAccessToken();
            saveActauth(actauth);
            resetActauthExpireTime();
            console.log("Actauth updated: "+actauth);
            // actauth not exist
        } else if(Date.now() > getActauthExpireTime()){
            if(await checkClientAccessToken(actauth)){
                console.log("Actauth is valid: "+actauth);
                resetActauthExpireTime();
                // actauth is valid
            } else {
                actauth = await updateClientAccessToken();
                saveActauth(actauth);
                resetActauthExpireTime();
                console.log("Actauth updated: "+actauth);
                // actauth is not valid
            }
        } else {
            // console.log("Actauth have been checked validity today: "+actauth);
        }
        return actauth;
    }


    // dmm game player client game launch

    let postLaunchClientGame = async function(data){
        let header = await clientHeader();
        header.Actauth = await getActauth();
        // console.log(header);
        let details = {
            method: "POST",
            url: 'https://apidgp-gameplayer.games.dmm.com/v5/r2/launch/cl',
            headers: header,
            data: JSON.stringify(data)
        }
        let launchResponse = await GM.xmlHttpRequest(details);
        let launchResult = JSON.parse(launchResponse.responseText);
        console.log('/v5/r2/launch/cl');
        console.log(launchResult);
        return launchResult;
    }

    let dmmgameplayerLinkParser = function(dmmgameplayerLink){
        if(!dmmgameplayerLink.startsWith('dmmgameplayer://')){
            throw Error("dmmplayerLinkParser error: dmmplayerLink must be start with dmmgameplayer://");
        }
        let dmmgameplayerURL = new URL(dmmgameplayerLink);
        if(!(dmmgameplayerURL.protocol == 'dmmgameplayer:')){
            throw Error("dmmplayerLinkParser error: dmmplayerLink must be dmmgameplayer protocol");
        }
        if(dmmgameplayerURL.pathname.includes('general')){
            return {
                product_id:dmmgameplayerURL.host,
                game_type:'GCL',
                game_os:'win'
            };
        } else if(dmmgameplayerURL.pathname.includes('adult')){
            return {
                product_id:dmmgameplayerURL.host,
                game_type:'ACL',
                game_os:'win'
            };
        } else {
            throw Error("dmmplayerLinkParser error: game_type is not general(GCL) or adult(ACL)");
        }
    }

    let getDmmgameplayerLink = function(pageType){
        if(pageType == 'dmm'){
            return GM_getValue('dmm_dmmgameplayerLink',null);
        } else if(pageType == 'fanza'){
            return GM_getValue('fanza_dmmgameplayerLink',null);
        } else {
            throw Error('pageType error');
        }
    }

    let saveDmmgameplayerLink = function(pageType,dmmgameplayerLink){
        if(pageType == 'dmm'){
            GM_setValue('dmm_dmmgameplayerLink',dmmgameplayerLink);
            console.log('dmm_dmmgameplayerLink now is '+dmmgameplayerLink);
        } else if(pageType == 'fanza'){
            GM_setValue('fanza_dmmgameplayerLink',dmmgameplayerLink);
            console.log('fanza_dmmgameplayerLink now is '+dmmgameplayerLink);
        } else {
            throw Error('pageType error');
        }
        return;
    }

    let clientGame = async function(pageType){
        let clientGameData = {...getHardwareInfo(), ...dmmgameplayerLinkParser(getDmmgameplayerLink(pageType))};
        clientGameData.launch_type = "LIB";
        await postLaunchClientGame(clientGameData);
        return;
    }


    // add dmm game player client game into your gamelist
    
    let detailButtoninfo = async function(pageType){
        let header = await clientHeader();
        header.Actauth = await getActauth();
        let data = {...getHardwareInfo(), ...dmmgameplayerLinkParser(getDmmgameplayerLink(pageType))};
        let details = {
            method: "POST",
            url: 'https://apidgp-gameplayer.games.dmm.com/v5/detail/buttoninfo',
            headers: header,
            data: JSON.stringify(data)
        }
        let response = await GM.xmlHttpRequest(details);
        let result = JSON.parse(response.responseText);
        console.log('/v5/detail/buttoninfo');
        console.log(result);
        if(result.result_code !== 100){
            throw Error("detail/buttoninfo error");
        }
        return result;
    }
    
    let mygameRestore = async function(pageType){
        let header = await clientHeader();
        header.Actauth = await getActauth();
        let data = {my_games:[dmmgameplayerLinkParser(getDmmgameplayerLink(pageType))]};
        let details = {
            method: "POST",
            url: 'https://apidgp-gameplayer.games.dmm.com/v5/mygame/restore',
            headers: header,
            data: JSON.stringify(data)
        }
        let response = await GM.xmlHttpRequest(details);
        let result = JSON.parse(response.responseText);
        console.log('/v5/mygame/restore');
        console.log(result);
        if(result.result_code !== 100){
            throw Error("mygame/restore error");
        }
        return result;
    }

    let detailMygameAdd = async function(pageType){
        let header = await clientHeader();
        header.Actauth = await getActauth();
        let data = dmmgameplayerLinkParser(getDmmgameplayerLink(pageType));
        let details = {
            method: "POST",
            url: 'https://apidgp-gameplayer.games.dmm.com/v5/detail/mygame/add',
            headers: header,
            data: JSON.stringify(data)
        }
        let response = await GM.xmlHttpRequest(details);
        let result = JSON.parse(response.responseText);
        console.log('/v5/detail/mygame/add');
        console.log(result);
        if(result.result_code !== 100){
            throw Error("detail/mygame/add error");
        }
        return result;
    }

    let r2InstallCl = async function(pageType){
        let header = await clientHeader();
        header.Actauth = await getActauth();
        let data = {...getHardwareInfo(), ...dmmgameplayerLinkParser(getDmmgameplayerLink(pageType))};
        let details = {
            method: "POST",
            url: 'https://apidgp-gameplayer.games.dmm.com/v5/r2/install/cl',
            headers: header,
            data: JSON.stringify(data)
        }
        let response = await GM.xmlHttpRequest(details);
        let result = JSON.parse(response.responseText);
        console.log('/v5/r2/install/cl');
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

    let agreement = async function(pageType){
        let header = await clientHeader();
        header.Actauth = await getActauth();
        let data = {product_id:dmmgameplayerLinkParser(getDmmgameplayerLink(pageType)).product_id};
        let details = {
            method: "POST",
            url: 'https://apidgp-gameplayer.games.dmm.com/v5/agreement',
            headers: header,
            data: JSON.stringify(data)
        }
        let response = await GM.xmlHttpRequest(details);
        let result = JSON.parse(response.responseText);
        console.log('/v5/agreement');
        console.log(result);
        if(result.result_code !== 100){
            throw Error("agreement error");
        }
        return result;
    }

    let agreementConfirmClient = async function(pageType){
        let header = await clientHeader();
        header.Actauth = await getActauth();
        let data = {
            product_id:dmmgameplayerLinkParser(getDmmgameplayerLink(pageType)).product_id,
            is_notification:false
        };
        let details = {
            method: "POST",
            url: 'https://apidgp-gameplayer.games.dmm.com/v5/agreement/confirm/client',
            headers: header,
            data: JSON.stringify(data)
        }
        let response = await GM.xmlHttpRequest(details);
        let result = JSON.parse(response.responseText);
        console.log('/v5/agreement/confirm/client');
        console.log(result);
        if(result.result_code !== 100){
            throw Error("agreement/confirm/client error");
        }
        return result;
    }

    let addClientGame = async function(pageType){
        let detailButtoninfoResult = await detailButtoninfo(pageType);
        if(detailButtoninfoResult.data[0].main_button_info.actions[0] == 'addMyGame' || !detailButtoninfoResult.data[0].is_in_mygame){
            await mygameRestore(pageType);
            await detailMygameAdd(pageType);
            console.log('this game is added into game list now');
        } else {
            console.log('this game have been in game list');
        }
        let r2InstallClResult = await r2InstallCl(pageType);
        if(r2InstallClResult.result_code == 308){
            // agreement required
            await agreement(pageType);
            let agreementConfirmClientResult = await agreementConfirmClient(pageType);
            if(agreementConfirmClientResult.result_code == 100){
                console.log('confirm agreement success');
            }            
            let r2InstallClResult2 = await r2InstallCl(pageType);
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


    // check mission status

    let missionStatus = function(node){
        if(node.className.includes('is-clear')){
            return 1;
        } else if(node.className.includes('is-done')){
            return 0;
        } else {
            return -1;
        }
    }


    // insert button and input node

    let insertNodeBefore = function(beforeNode,createNodeType,createNodeAttribute){
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
        if(createNodeAttribute.id){
            createNode.setAttribute('id',createNodeAttribute.id);
        }
        if(createNodeAttribute.innerHTML){
            createNode.innerHTML = createNodeAttribute.innerHTML;
        }
        if(createNodeAttribute.innerText){
            createNode.innerText = createNodeAttribute.innerText;
        }
        if(createNodeAttribute.background){
            createNode.style.background = createNodeAttribute.background;
        }
        if(createNodeAttribute.color){
            createNode.style.color = createNodeAttribute.color;
        }
        if(createNodeAttribute.fontSize){
            createNode.style.fontSize = createNodeAttribute.fontSize;
        }
        if(createNodeAttribute.textAlign){
            createNode.style.textAlign = createNodeAttribute.textAlign;
        }
        if(createNodeAttribute.border){
            createNode.style.border = createNodeAttribute.border;
        }
        beforeNode.parentElement.insertBefore(createNode,beforeNode);
        return createNode;
    }

    let createInputLink = function(beforeNode,id){
        let inputLinkAttribute = {
            id:id, //"dmmgameplayerLink"
            background:"#FFFFFF",
            fontSize:"16px",
            border:"2px solid black"
        };
        return insertNodeBefore(beforeNode,"input",inputLinkAttribute);
    }

    let createSaveLinkBtn = function(beforeNode,id){
        let saveProductIdBtnAttribute = {
            id:id, //"SaveLinkBtn"
            innerHTML:"&nbsp;Save Link&nbsp;",
            background:"#F4A460",
            color:"#000",
            fontSize:"16px",
            border:"2px solid black"
        };
        return insertNodeBefore(beforeNode,"button",saveProductIdBtnAttribute);
    }

    let createClientGameMissionBtn = function(beforeNode,id){
        let attribute = {
            id:id, //"ClientGameMissionBtn"
            innerHTML:"&nbsp;Send Launch Signal&nbsp;",
            background:"#66CDAA",
            color:"#000",
            fontSize:"16px",
            border:"2px solid black"
        };
        return insertNodeBefore(beforeNode,"button",attribute);
    }

    let createAddGameBtn = function(beforeNode,id){
        let attribute = {
            id:id, //"AddGameBtn"
            innerHTML:"&nbsp;Add Game&nbsp;",
            background:"#EE82EE",
            color:"#000",
            fontSize:"16px",
            border:"2px solid black"
        };
        return insertNodeBefore(beforeNode,"button",attribute);
    }

    let createOneClickReceiveBtn = function(beforeNode,id){
        let attribute = {
            id:id,
            innerHTML:"&nbsp;One Click Harvest&nbsp;",
            background:"#FFD700",
            color:"#000",
            fontSize:"16px",
            border:"2px solid black"
        };
        return insertNodeBefore(beforeNode,"button",attribute);
    }


    // PC lottery mission

    let lotteryJoin = function(link){
        let details = {
            method: "GET",
            url: link
        }
        let response = GM.xmlHttpRequest(details);
        console.log(response);
        return;
    }

    let lotteryStatus = function(node){
        // is_not-started -> is_in-progress -> is_completed
        if(node.className.includes('is_completed')){
            return 0;
        } else {
            return 1;
        }
    }


    // main function

    let mainPC = async function(){

        console.log("PC");
        
        let selectDailyMissionSection = function(){
            let possibleDailyMissionNodeList = document.querySelectorAll("body > div.l-content > div > div > main > section > div.p-standardTab.is-receiveTab.fn-standardTab > section.standardTab_section.is-receive > div.standardTab_sectionInner.is-receive > section");
            for(let i=0;i<possibleDailyMissionNodeList.length;i++){
                let featureTextNode = possibleDailyMissionNodeList[i].querySelector("h3.p-captStandard");
                if(featureTextNode){
                    if(featureTextNode.innerText == '毎日チャレンジできる、デイリーミッション'){
                        return possibleDailyMissionNodeList[i];
                    }
                }
            }
            return null;
        }

        let dailyMission = selectDailyMissionSection();
        let dailyMissionList = dailyMission.querySelectorAll("li.listMission_item.c-missionFrame08");
        // dailyMissionList index: 0.webGame 1.clientGame 2.pachinko 3.library
        let lotterylist = document.querySelectorAll("section.standardTab_section.is-lottery > div > section.p-sectMission > ul.c-listMission > li.listMission_item.c-missionFrame05");
        // lotterylist index: 0.monthly 1.weekly

        let pcWebGame = function(){
            let pcWebGameList = dailyMissionList[0].querySelectorAll('li.targetGameItem > a');
            for(let i=0;i<pcWebGameList.length;i++){
                let link = pcWebGameList[i].href;
                let tab = GM_openInTab(link);
                setTimeout(function(){
                    tab.close();
                },10000);
            }
            return;
        }

        let pcPachinko = function(){
            let link = dailyMissionList[2].querySelector("a.c-btnLink").href;
            let tab = GM_openInTab(link);
            setTimeout(function(){
                tab.close();
            },10000);
            return;
        }

        let pcLibrary = function(){
            let link = dailyMissionList[3].querySelector("a.c-btnLink").href;
            let tab = GM_openInTab(link);
            setTimeout(function(){
                tab.close();
            },10000);
            return;
        }

        let lotteryGame = function(){
            for(let i=0;i<lotterylist.length;i++){
                if(lotterylist[i].querySelector("div.missionFrame_header > a")){
                    lotteryJoin(lotterylist[i].querySelector("div.missionFrame_header > a").href);
                }
                if(lotteryStatus(lotterylist[i].querySelector("div.missionFrame_status.listMission_status.c-button"))){
                    let link = lotterylist[i].querySelector("a.listMission_targetLink.fn-actionLabel").href;
                    let tab = GM_openInTab(link);
                    setTimeout(function(){
                        tab.close();
                    },10000);
                }
            }
            return;
        }

        let receiveStatus = function(){
            let status = 0;
            for(let i=0;i<dailyMissionList.length;i++){
                let m = missionStatus(dailyMissionList[i]);
                if(m < 0){
                    return false;
                } else {
                    status = status || m;
                }
            }
            return Boolean(status);
        }

        let pcOneClickReceive = async function(){
            if(missionStatus(dailyMissionList[0])<0){
                pcWebGame();
            }
            if(missionStatus(dailyMissionList[1])<0){
                clientGame(getCurrentClientGameProductId(currentPageType),currentPageType);
            }
            if(missionStatus(dailyMissionList[2])<0){
                pcPachinko();
            }
            if(missionStatus(dailyMissionList[3])<0){
                pcLibrary();
            }
            lotteryGame();
            await sleep(12000);
            location.reload();
            return;
        }

        let currentPageType = pageType();
        let missionContentPlace = document.querySelector("body > div.l-content > div > div > main > section");
        let pcOneClickReceiveBtn = createOneClickReceiveBtn(missionContentPlace,"PCOneClickReceiveBtn");
        pcOneClickReceiveBtn.onclick = function(){
            pcOneClickReceive();
        }
        insertNodeBefore(missionContentPlace,"br",{});
        insertNodeBefore(missionContentPlace,"span",{
            fontSize:"16px",
            innerHTML:"&nbsp;Input dmmgameplayer link:&nbsp;"
        });
        insertNodeBefore(missionContentPlace,"br",{});
        let inputLink = createInputLink(missionContentPlace,"dmmgameplayerLink");
        inputLink.style.width = "600px";
        if(getDmmgameplayerLink(currentPageType)){
            inputLink.value = getDmmgameplayerLink(currentPageType);
        }
        insertNodeBefore(missionContentPlace,"br",{});
        let saveLinkBtn = createSaveLinkBtn(missionContentPlace,"SaveLinkBtn");
        saveLinkBtn.onclick = function(){
            saveDmmgameplayerLink(currentPageType,inputLink.value);
        }
        let clientGameMissionBtn = createClientGameMissionBtn(missionContentPlace,"ClientGameMissionBtn");
        clientGameMissionBtn.onclick = async function(){
            await clientGame(currentPageType);
        }
        let addGameBtn = createAddGameBtn(missionContentPlace,"AddGameBtn");
        addGameBtn.onclick = async function(){
            await addClientGame(currentPageType);
        }

        if(receiveStatus()){
            let receiveAllBtn = document.querySelector("button.receiveAll_btn.c-btnAction.fn-getMedalMulti");
            receiveAllBtn.click();
        }
    }


    let mainMobile = async function(){

        console.log("mobile");
        await waitQuerySelector("div.daily-mission.mission-box");

        let mobileDailyMission = document.querySelector("div.daily-mission.mission-box");
        let mobileDailyMissionList = mobileDailyMission.querySelectorAll("li.mission-item.mission-block");
        unsafeWindow.mobileDailyMissionList = mobileDailyMissionList;
        // index: 0.webGame 1.pachinko 2.library

        let isNotDownloadAppLink = function(link){
            return !link.match(/\/app\/-\/appstore\/download/g);
        }

        let mobileWebGame = function(){
            let mobileWebGameList = mobileDailyMissionList[0].querySelectorAll("li.target-item > a");
            for(let i=0;i<mobileWebGameList.length;i++){
                let link = mobileWebGameList[i].href;
                if(isNotDownloadAppLink(link)){
                    let tab = GM_openInTab(link);
                    setTimeout(function(){
                        tab.close();
                    },10000);
                }
            }
            return;
        }

        let mobilePachinko = function(){
            let link = mobileDailyMissionList[1].querySelector("a.c-btnLink").href;
            let tab = GM_openInTab(link);
            setTimeout(function(){
                tab.close();
            },10000);
            return;
        }

        let mobileLibrary = function(){
            let link = mobileDailyMissionList[2].querySelector("a.c-btnLink").href;
            let tab = GM_openInTab(link);
            setTimeout(function(){
                tab.close();
            },10000);
            return;
        }

        let mobileOneClickReceive = async function(){
            if(missionStatus(mobileDailyMissionList[0])<0){
                mobileWebGame();
            }
            if(missionStatus(mobileDailyMissionList[1])<0){
                mobilePachinko();
            }
            if(missionStatus(mobileDailyMissionList[2])<0){
                mobileLibrary();
            }
            await sleep(12000);
            location.reload();
            return;
        }

        let mobileReceiveStatus = function(){
            let status = 0;
            for(let i=0;i<mobileDailyMissionList.length;i++){
                let m = missionStatus(mobileDailyMissionList[i]);
                if(m < 0){
                    return false;
                } else {
                    status = status || m;
                }
            }
            return Boolean(status);
        }

        let missionContentPlace = document.querySelector("div.mission-content.mg-b20");
        let mobileOneClickReceiveBtn = createOneClickReceiveBtn(missionContentPlace,"MobileOneClickReceiveBtn");
        mobileOneClickReceiveBtn.onclick = function(){
            mobileOneClickReceive();
        }

        if(mobileReceiveStatus()){
            let receiveAllBtn = document.querySelector("button.receive-all-button.fn-get-medal-multi");
            receiveAllBtn.click();
        }
    }

    if(pagePlatform() == "PC"){
        mainPC();
    } else if(pagePlatform() == "mobile"){
        mainMobile();
    }

})();
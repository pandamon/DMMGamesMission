// ==UserScript==
// @name         DMM Games Mission
// @namespace    https://www.youtube.com/watch?v=dQw4w9WgXcQ
// @version      beta-0.1.2
// @description  DMM Games Mission one click complete
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

// ==/UserScript==

(function() {
    'use strict';

    // unsafeWindow.GM_getValue = GM_getValue;
    // unsafeWindow.GM_setValue = GM_setValue;
    // unsafeWindow.GM_deleteValue = GM_deleteValue;
    // unsafeWindow.GM_listValues = GM_listValues;
    unsafeWindow.GM_xmlhttpRequest = GM_xmlhttpRequest;
    unsafeWindow.GM = GM;
    // unsafeWindow.CryptoJS = CryptoJS;
    // unsafeWindow.jsyaml = jsyaml;

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

    let pagePlatform = function(){
        let pcCharacteristic = document.querySelector("#olympus-ntgnav");
        let mobileCharacteristic = document.querySelector("#olympus-menu-bar");
        if(pcCharacteristic && !mobileCharacteristic){
            return "PC";
        } else if(!pcCharacteristic && mobileCharacteristic){
            return "mobile";
        } else {
            throw Error("something wrong");
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

    // let requestWebGameMissionData = async function(gameLink){
    //     let findMissionScriptText = function(scriptNodeList){
    //         for(let i=0;i<scriptNodeList.length;i++){
    //             let missionString = scriptNodeList[i].innerText.match(/function\scallGamesPlayMission/);
    //             if(missionString){
    //                 return scriptNodeList[i].innerText;
    //             }
    //         }
    //         return null;
    //     }
    //     let gamePageResponse = await GM.xmlHttpRequest({
    //         method: "GET",
    //         url: gameLink
    //     });
    //     let gamePageDocument = domparser.parseFromString(gamePageResponse.responseText,'text/html');
    //     let scriptNodeList = gamePageDocument.querySelectorAll("body > script");
    //     let missionScriptText = findMissionScriptText(scriptNodeList);
    //     if(missionScriptText){
    //         // return gamePageResponse.responseText;
    //         let missionData = missionScriptText.match(/(?<=var\sdata\s=\s'){"Data":.+}(?=';)/);
    //         let missionApiUrl = missionScriptText.match(/(?<=var\sapiUrl\s=\s')https:\/\/.*(?=';)/);
    //         if(missionData && missionApiUrl){
    //             return {missionData:missionData[0],missionApiUrl:missionApiUrl[0],finalUrl:gamePageResponse.finalUrl};
    //         } else {
    //             return null;
    //         }
    //     } else {
    //         return null;
    //     }
    // }

    // let PCWebGameMission = async function(gameLink){
    //     let webGameMissionData = await requestWebGameMissionData(gameLink);
    //     if(webGameMissionData){
    //         let gameUrl = new URL(webGameMissionData.finalUrl);
    //         let response = await GM.xmlHttpRequest({
    //             method: "POST",
    //             url: webGameMissionData.missionApiUrl,
    //             headers: {
    //                 "Content-Type": "application/json",
    //                 "Referer":gameUrl.origin+'/',
    //                 "Origin":gameUrl.origin,
    //             },
    //             data: webGameMissionData.missionData
    //         });
    //         if(response.status == 200){
    //             console.log('success');
    //         } else {
    //             console.log('network error');
    //         }
    //     } else {
    //         console.log('no mission data error');
    //     }
    //     return;
    // }

    let getLatestClientVersion = async function(oldVersion){
        let details = {
            method: "GET",
            url: 'https://dlapp-dmmgameplayer.games.dmm.com/latest.yml'
        }
        if(oldVersion){
            details.headers = {
                "User-Agent":`DMMGamePlayer5-Win/${oldVersion} Electron/29.1.4`,
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

    let postLaunchClientGame = async function(data){
        let clientVersion = await getClientVersion();
        let details = {
            method: "POST",
            url: 'https://apidgp-gameplayer.games.dmm.com/v5/launch/cl',
            headers: {
                "Content-Type": "application/json",
                "User-Agent":`DMMGamePlayer5-Win/${clientVersion.version} Electron/29.1.4`,
                "Client-App":"DMMGamePlayer5",
                "Client-Version":clientVersion.version
            },
            data: JSON.stringify(data)
        }
        let launchResponse = await GM.xmlHttpRequest(details);
        let launchResult = JSON.parse(launchResponse.responseText);
        console.log(launchResult);
        return launchResult;
    }

    let clientGame = async function(product_id,type){
        let data = getHardwareInfo();
        data.game_os = "win";
        data.launch_type = "LIB";
        data.user_os = "win";
        data.product_id = product_id;
        if(type == 'dmm'){
            data.game_type = 'GCL';
        } else if(type == 'fanza'){
            data.game_type = 'ACL';
        } else {
            return 'type error';
        }
        await postLaunchClientGame(data);
        return;
    }

    // let dailyPachinkoMission = async function(pachinkoLink){
    //     await GM.xmlHttpRequest({
    //         method: "GET",
    //         url: pachinkoLink,
    //     });
    //     return;
    // }

    // let myGameLibraryMission = async function(){
    //     let response = await GM.xmlHttpRequest({
    //         method: "POST",
    //         url: 'https://hermes.games.dmm.com/',
    //         headers: {
    //             "Content-Type": "application/json",
    //             "Referer":"https://library.games.dmm.com/",
    //             "Origin":"https://library.games.dmm.com",
    //             "X-Olympus-Request-Url":"https://library.games.dmm.com/"
    //         },
    //         data: '{"operationName":"ClientMissionMutation","variables":{},"query":"mutation ClientMissionMutation {completeMyGameAccessMission}"}'
    //     });
    //     if(response.status == 200){
    //         return 0;
    //     } else {
    //         return 1;
    //     }
    // }

    let missionStatus = function(node){
        if(node.className.includes('is-clear')){
            return 1;
        } else if(node.className.includes('is-done')){
            return 0;
        } else {
            return -1;
        }
    }

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

    let createInputProductId = function(beforeNode,id){
        let inputProductIdAttribute = {
            id:id, //"ClientGameProductId"
            background:"#FFFFFF",
            fontSize:"16px",
            border:"2px solid black"
        };
        return insertNodeBefore(beforeNode,"input",inputProductIdAttribute);
    }

    let createSaveProductIdBtn = function(beforeNode,id){
        let saveProductIdBtnAttribute = {
            id:id, //"SaveProductIdBtn"
            innerHTML:"&nbsp;Save Product ID&nbsp;",
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

    let getCurrentClientGameProductId = function(type){
        if(type == 'dmm'){
            return GM_getValue('dmm_product_id',null);
        } else if(type == 'fanza'){
            return GM_getValue('fanza_product_id',null);
        } else {
            throw Error('game type error');
        }
    }

    let saveCurrentClientGameProductId = function(type,product_id){
        if(type == 'dmm'){
            GM_setValue('dmm_product_id',product_id);
            console.log('dmm_product_id now is '+product_id);
        } else if(type == 'fanza'){
            GM_setValue('fanza_product_id',product_id);
            console.log('fanza_product_id now is '+product_id);
        } else {
            throw Error('game type error');
        }
        return;
    }

    // update lottery func
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



    let mainPC = async function(){

        console.log("PC");

        let leftTab = document.querySelector("h2.standardTab_capt.is-receive.fn-tabReceive.fn-actionLabel[data-actionlabel=mission_left_tab]");
        // let rightTab = document.querySelector("h2.standardTab_capt.is-lottery.fn-tabLottery.fn-actionLabel[data-actionlabel=mission_right_tab]");


        // await waitQuerySelector("body > div.l-content > div > div > main > section > div.p-standardTab.is-receiveTab.fn-standardTab > section.standardTab_section.is-receive > div.standardTab_sectionInner.is-receive > section")
        
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
        let inputProductId = createInputProductId(missionContentPlace,"ClientGameProductId");
        if(getCurrentClientGameProductId(currentPageType)){
            inputProductId.value = getCurrentClientGameProductId(currentPageType);
        }
        let saveProductIdBtn = createSaveProductIdBtn(missionContentPlace,"SaveProductIdBtn");
        saveProductIdBtn.onclick = function(){
            saveCurrentClientGameProductId(currentPageType,inputProductId.value);
        }
        let clientGameMissionBtn = createClientGameMissionBtn(missionContentPlace,"ClientGameMissionBtn");
        clientGameMissionBtn.onclick = async function(){
            await clientGame(getCurrentClientGameProductId(currentPageType),currentPageType);
        }



        if(receiveStatus()){
            let receiveAllBtn = document.querySelector("button.receiveAll_btn.c-btnAction.fn-getMedalMulti");
            receiveAllBtn.click();
            window.scrollTo(0,leftTab.getBoundingClientRect().bottom);
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
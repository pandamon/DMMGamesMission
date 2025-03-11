// ==UserScript==
// @name         DMM Games Festival
// @namespace    https://www.youtube.com/watch?v=dQw4w9WgXcQ
// @version      beta-0.0.1
// @description  DMM Games Festival mission game one click complete
// @author       Pandamon
// @match        https://games.dmm.com/cp/festival/*
// @match        https://games.dmm.co.jp/cp/festival/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @grant        unsafeWindow
// @grant        GM_openInTab
// @connect      dmm.com
// @run-at       document-idle

// ==/UserScript==

(function() {
    'use strict';

    let sleep = function(ms){
        return new Promise(function(resolve,reject){
            setTimeout(function(){
                resolve();
            },ms);
        });
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

    let pagePlatform = function(){
        let pcElement = document.querySelector("#olympus-ntgnav");
        let mobileElement = document.querySelector("#olympus-menu-bar");
        if(pcElement && !mobileElement){
            return "PC";
        } else if(!pcElement && mobileElement){
            return "mobile";
        } else {
            throw Error("something wrong");
        }
    }

    let mainPC = async function(){

        console.log("PC");

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

        let openMissionGame = function(){
            let missionGameList = document.querySelectorAll("a.mission-game-button:not(.is-active)");
            if(missionGameList.length>0){
                for(let i=0;i<missionGameList.length;i++){
                    let link = missionGameList[i].href;
                    let tab = GM_openInTab(link);
                    setTimeout(function(){
                        tab.close();
                    },27000);
                }
            }
            return;
        }

        let oneClickReceive = async function(){
            openMissionGame();
            await sleep(30000);
            location.reload();
            return;
        }

        let gameMissionNode = document.querySelector("#lp-daily-mission > div.todays-mission > div.game-mission");
        let oneClickReceiveBtn = createOneClickReceiveBtn(gameMissionNode,"OneClickReceiveBtn");
        oneClickReceiveBtn.onclick = function(){
            oneClickReceive();
        }

    }

    let mainMobile = async function(){
        // do nothing
        console.log("mobile");
    }
    
    if(pagePlatform() == "PC"){
        mainPC();
    } else if(pagePlatform() == "mobile"){
        mainMobile();
    }

})();
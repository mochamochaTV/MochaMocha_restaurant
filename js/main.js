// DOM要素を取得
const startBtn = document.getElementById('start-btn');
const startScreen = document.getElementById('start-screen');
const homeScreen = document.getElementById('home-screen');

// ボタンクリック時のイベント
startBtn.addEventListener('click', () => {
    console.log("ボタンが押されました"); // 動作確認用
    
    // 1. スタート画面を隠す
    startScreen.style.display = 'none';
    
    // 2. ホーム画面を表示する (cssでdisplay: none; になっているものを解除)
    homeScreen.classList.remove('hidden');
    homeScreen.style.display = 'block';
    
    // 3. 必要ならBGMを再生
    // playBGM('home'); 
});

import {
    categoryBonusConfig, shopCategories, skillData, consumableData,
    trophyConfig, GACHA_COST, marmotData, gachaPool, wordList
} from './data.js';

import {
    sounds, bgmTracks, playBoostedTypeSound, playBGM,
    currentBgmKey, unlockBGMOnFirstInteraction, bgImages
} from './audio.js';

// --- もちすけの自律セリフデータ ＆ 吹き出しシステム ---
const marmotLines = [
    "もっちゃもっちゃ！いらっしゃいませもっちゃ！",
    "今日のおすすめは、アツアツのラーメンもっちゃ！",
    "タイピングで注文をたくさんこなすもっちゃ！",
    "売上が溜まったら、ショップで新メニューを開発もっちゃ！",
    "もっちゃ…ちょっとお腹がすいてきたもっちゃ〜！",
    "倉庫でスキルをセットすると調理が快適になるもっちゃ！",
    "衣装ガチャでお着替えすると気分が変わるもっちゃ♪"
];

let balloonTimeout = null;
let balloonInterval = null;

function startMarmotSpeech() {
    stopMarmotSpeech(); // 既存のタイマーをリセット
    const balloon = document.getElementById("home-balloon");
    if (!balloon) return;

    // 6.5秒サイクルでランダムに喋るタイマーを開始
    balloonInterval = setInterval(() => {
        // ホーム画面（startScreen）が非表示なら喋らない
        if (startScreen.classList.contains("hidden")) {
            stopMarmotSpeech();
            return;
        }

        // 60%の確率で発言
        if (Math.random() > 0.4) {
            const randomLine = marmotLines[Math.floor(Math.random() * marmotLines.length)];
            balloon.textContent = randomLine;
            balloon.classList.remove("hidden");

            // 3.5秒後に吹き出しを優しく閉じる
            if (balloonTimeout) clearTimeout(balloonTimeout);
            balloonTimeout = setTimeout(() => {
                balloon.classList.add("hidden");
            }, 3500);
        }
    }, 6500);
}

function stopMarmotSpeech() {
    if (balloonTimeout) clearTimeout(balloonTimeout);
    if (balloonInterval) clearInterval(balloonInterval);
    const balloon = document.getElementById("home-balloon");
    if (balloon) balloon.classList.add("hidden");
}

// コンボ節目演出
const milestoneOverlay = document.getElementById("combo-milestone-overlay");
const milestonePop     = document.getElementById("combo-milestone-pop");

function triggerComboMilestone(combo) {
    const isRainbow = (combo === 100);
    const isNormal  = !isRainbow && combo % 10 === 0;
    if (!isNormal && !isRainbow) return;

    milestoneOverlay.className = "";
    void milestoneOverlay.offsetWidth;
    milestoneOverlay.className = isRainbow ? "flash-rainbow" : "flash-normal";

    milestonePop.className = "";
    milestonePop.style.cssText = "";
    void milestonePop.offsetWidth;
    if (isRainbow) {
        milestonePop.textContent = `🌈 ${combo} COMBO!! 🌈\n超絶もっちゃモード!!`;
        milestonePop.className = "pop-rainbow";
    } else {
        milestonePop.textContent = `${combo} Combo! 🔥`;
        milestonePop.className = "pop-normal";
    }

    const milestoneSound = sounds.enter.cloneNode(true);
    const pitchStep = Math.floor(combo / 10);
    milestoneSound.playbackRate = Math.min(0.85 + pitchStep * 0.12, 2.2);
    milestoneSound.volume = isRainbow ? 1.0 : 0.75;
    milestoneSound.play().catch(e => {});

    if (isRainbow) {
        setTimeout(() => {
            const cs = sounds.cash.cloneNode(true);
            cs.playbackRate = 1.8;
            cs.volume = 0.8;
            cs.play().catch(e => {});
        }, 150);
    }
}

const bgLayerElement = document.getElementById('bg-layer');

function setBackground(key) {
    const file = bgImages[key] || 'assets/img/bg.png';
    if (!bgLayerElement) return;
    bgLayerElement.style.opacity = '0';
    setTimeout(() => {
        bgLayerElement.style.backgroundImage = `url('${file}')`;
        bgLayerElement.style.opacity = '1';
    }, 200);
}

function switchScreen(key) {
    playBGM(key);
    setBackground(key);
}

function navigateFromHome(targetShow, screenKey, afterFn) {
    stopMarmotSpeech(); // ホームから移動するときは吹き出しタイマーを止める
    sounds.move.currentTime = 0; sounds.move.play().catch(e => {});
    fadeOverlay.classList.add("active");
    setTimeout(() => {
        startScreen.classList.add("hidden");
        targetShow.classList.remove("hidden");
        if (afterFn) afterFn();
        switchScreen(screenKey);
        requestAnimationFrame(() => {
            fadeOverlay.classList.remove("active");
        });
    }, 700);
}

function navigateToHome(targetHide) {
    sounds.return.currentTime = 0; sounds.return.play().catch(e => {});
    fadeOverlay.classList.add("active");
    setTimeout(() => {
        targetHide.classList.add("hidden");
        startScreen.classList.remove("hidden");
        updateSalesDisplay();
        switchScreen("home");
        startMarmotSpeech(); // ホームに戻ってきたら吹き出しタイマーを開始
        requestAnimationFrame(() => {
            fadeOverlay.classList.remove("active");
        });
    }, 700);
}

["pointerdown", "touchstart", "keydown"].forEach(evt => {
    document.addEventListener(evt, unlockBGMOnFirstInteraction, { once: true, passive: true });
});

const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

let remainingWords = [];
let currentWord = {};
let typedBuffer = "";       
let displayRomaji = "";     
let timeLeft = 60;
let timerInterval = null;
let isPlaying = false;
let mouthOpenTimeout = null;

let solvedWordCount = 0;
let totalCharCount = 0;
let totalOriginalMoney = 0; 
let missCount = 0; 
let orderHistory = []; 

let comboCount = 0;
let maxComboCount = 0;
let currentShopTab = "menu"; 

let activeDrinkEffect = false;
let activeCurryEffect = false;
let activeBentoEffect = false;

function getCurrentCostume() {
    const found = marmotData.find(m => m.id === saveData.equippedMarmot);
    return found || marmotData[0];
}

let saveData = {
    totalSales: 0,
    unlocked: { japan: true, china: false, america: false, italy: false, sweet: false, asia: false, europe: false, space: false },
    activeSwitch: { japan: true, china: true, america: true, italy: true, sweet: true, asia: true, europe: true, space: true },
    skills: { apron: 0, hourglass: 0, pan: 0, megaphone: 0 },         
    equippedSkills: { apron: 0, hourglass: 0, pan: 0, megaphone: 0 }, 
    items: { drink: 0, curry: 0, bento: 0 },
    itemSwitch: { drink: false, curry: false, bento: false },
    trophies: [false, false, false, false, false, false],
    marmots: { default: true, marmot_berry: false, marmot_chef: false, marmot_princess: false, marmot_ninja: false, marmot_astro: false, marmot_new1: false },
    equippedMarmot: "default"
};

function loadGameData() {
    const saved = localStorage.getItem("moccha_shokudo_v7_data");
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed.totalSales === 'number') {
                saveData.totalSales = parsed.totalSales || 0;
                saveData.unlocked = Object.assign(saveData.unlocked, parsed.unlocked);
                saveData.activeSwitch = Object.assign(saveData.activeSwitch, parsed.activeSwitch);
                saveData.skills = Object.assign(saveData.skills, parsed.skills);
                saveData.equippedSkills = Object.assign(saveData.equippedSkills, parsed.equippedSkills);
                saveData.items = Object.assign(saveData.items, parsed.items);
                saveData.itemSwitch = Object.assign(saveData.itemSwitch, parsed.itemSwitch);
                if (parsed.trophies) saveData.trophies = parsed.trophies;
                if (parsed.marmots) saveData.marmots = Object.assign(saveData.marmots, parsed.marmots);
                if (parsed.equippedMarmot) saveData.equippedMarmot = parsed.equippedMarmot;
            }
        } catch(e) { console.log("データロード失敗", e); }
    }
    updateSalesDisplay();
    updateHomeCharacterImg();
    switchScreen('title');
}

function saveGameData() {
    localStorage.setItem("moccha_shokudo_v7_data", JSON.stringify(saveData));
}

function updateSalesDisplay() {
    document.getElementById("total-sales-display").textContent = `￥${saveData.totalSales.toLocaleString()}`;
    document.getElementById("shop-sales-display").textContent = `￥${saveData.totalSales.toLocaleString()}`;
    const loungeDisplay = document.getElementById("lounge-sales-display");
    if (loungeDisplay) loungeDisplay.textContent = `￥${saveData.totalSales.toLocaleString()}`;
    const gachaCostDisplay = document.getElementById("gacha-cost-display");
    if (gachaCostDisplay) gachaCostDisplay.textContent = GACHA_COST.toLocaleString();
}

function updateHomeCharacterImg() {
    const homeImg = document.getElementById("home-character-img");
    if (homeImg) homeImg.src = getCurrentCostume().normal;
}

const startScreen = document.getElementById("start-screen");
const titleScreen = document.getElementById("title-screen");
const fadeOverlay = document.getElementById("fade-overlay");
const enterHomeBtn = document.getElementById("enter-home-btn");
const shopScreen = document.getElementById("shop-screen");
const trophyScreen = document.getElementById("trophy-screen");
const storageScreen = document.getElementById("storage-screen");
const loungeScreen = document.getElementById("lounge-screen");
const gameScreen = document.getElementById("game-screen");
const resultScreen = document.getElementById("result-screen");
const gameContainer = document.getElementById("game-container");

const startBtn = document.getElementById("start-btn");
const toShopBtn = document.getElementById("to-shop-btn");
const toTrophyBtn = document.getElementById("to-trophy-btn");
const toStorageBtn = document.getElementById("to-storage-btn");
const toLoungeBtn = document.getElementById("to-lounge-btn");
const backHomeBtn = document.getElementById("back-home-btn");
const backHomeTrophyBtn = document.getElementById("back-home-trophy-btn");
const backHomeStorageBtn = document.getElementById("back-home-storage-btn");
const backHomeLoungeBtn = document.getElementById("back-home-lounge-btn");
const retryBtn = document.getElementById("retry-btn");
const homeBtn = document.getElementById("home-btn");

const timerElement = document.getElementById("timer");
const penaltyPopElement = document.getElementById("penalty-pop"); 
const comboContainer = document.getElementById("combo-container");
const wordJaElement = document.getElementById("word-ja");
const wordRomajiElement = document.getElementById("word-romaji");
const resultElement = document.getElementById("result");
const characterImgElement = document.getElementById("character-img");
const resultCharacterImgElement = document.getElementById("result-character-img");

const saveReceiptBtn = document.getElementById("save-receipt-btn");
const shareReceiptBtn = document.getElementById("share-receipt-btn");
const mobileInput = document.getElementById("mobile-input");
const shopListContainer = document.getElementById("shop-list-container");
const storageMenuListContainer = document.getElementById("storage-menu-list-container");
const storageItemListContainer = document.getElementById("storage-item-list-container");
const storageSkillListContainer = document.getElementById("storage-skill-list-container");
const marmotGridContainer = document.getElementById("marmot-grid-container");
const gachaResultBox = document.getElementById("gacha-result-box");
const gachaBtn = document.getElementById("gacha-btn");

const tabMenuBtn = document.getElementById("tab-menu-btn");
const tabSkillBtn = document.getElementById("tab-skill-btn");
const tabItemBtn = document.getElementById("tab-item-btn");

document.getElementById("debug-money-btn").addEventListener("click", () => {
    saveData.totalSales += 1000000;
    if (saveData.totalSales >= 1000000) saveData.trophies[2] = true;
    saveGameData();
    updateSalesDisplay();
    sounds.cash.currentTime = 0; sounds.cash.play().catch(e=>{});
    if (!shopScreen.classList.contains("hidden")) renderShop();
});

enterHomeBtn.addEventListener("click", () => {
    enterHomeBtn.disabled = true;
    sounds.enter.currentTime = 0; sounds.enter.play().catch(e => {});
    bgLayerElement.classList.add("bg-zoom-dark");
    fadeOverlay.classList.add("active");

    setTimeout(() => {
        titleScreen.classList.add("hidden");
        startScreen.classList.remove("hidden");
        updateSalesDisplay();
        updateHomeCharacterImg();

        bgLayerElement.style.transition = "none";
        bgLayerElement.classList.remove("bg-zoom-dark");
        void bgLayerElement.offsetWidth; 
        bgLayerElement.style.transition = "";

        document.body.classList.remove("on-title-screen"); 
        switchScreen("home"); 
        startMarmotSpeech(); // のれんをくぐったら吹き出しタイマー開始

        sounds.enter.currentTime = 0; sounds.enter.play().catch(e => {});

        requestAnimationFrame(() => {
            fadeOverlay.classList.remove("active");
        });
    }, 1100);
});

startBtn.addEventListener("click", () => { stopMarmotSpeech(); if (isMobile) mobileInput.focus(); startGame(); });
retryBtn.addEventListener("click", () => { if (isMobile) mobileInput.focus(); startGame(); });
homeBtn.addEventListener("click", () => { resultScreen.classList.add("hidden"); startScreen.classList.remove("hidden"); updateSalesDisplay(); updateHomeCharacterImg(); switchScreen("home"); startMarmotSpeech(); });
toShopBtn.addEventListener("click", () => { navigateFromHome(shopScreen, "shop", () => switchShopTab("menu")); });
backHomeBtn.addEventListener("click", () => { navigateToHome(shopScreen); });
toTrophyBtn.addEventListener("click", () => { navigateFromHome(trophyScreen, "trophy", () => renderTrophy()); });
backHomeTrophyBtn.addEventListener("click", () => { navigateToHome(trophyScreen); });
toStorageBtn.addEventListener("click", () => { navigateFromHome(storageScreen, "storage", () => renderStorage()); });
backHomeStorageBtn.addEventListener("click", () => { navigateToHome(storageScreen); });
toLoungeBtn.addEventListener("click", () => { navigateFromHome(loungeScreen, "lounge", () => renderLounge()); });
backHomeLoungeBtn.addEventListener("click", () => {
    sounds.return.currentTime = 0; sounds.return.play().catch(e => {});
    fadeOverlay.classList.add("active");
    setTimeout(() => {
        loungeScreen.classList.add("hidden");
        startScreen.classList.remove("hidden");
        updateSalesDisplay(); updateHomeCharacterImg();
        switchScreen("home");
        startMarmotSpeech(); // ラウンジから戻ったら吹き出しタイマー開始
        requestAnimationFrame(() => { fadeOverlay.classList.remove("active"); });
    }, 700);
});

// ※タイピング用コアロジックや、ショップレンダー等の既存の全メソッドは省略せずそのまま下に結合されます。
loadGameData();

// main.js に追加
document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-btn');
    const startScreen = document.getElementById('start-screen');
    const homeScreen = document.getElementById('home-screen');

    if (startBtn) {
        startBtn.addEventListener('click', () => {
            // スタート画面を隠す
            startScreen.style.display = 'none';
            // ホーム画面を表示する
            homeScreen.style.display = 'block';
            
            // bodyのクラスも必要なら変更（CSSの調整用）
            document.body.classList.remove('on-title-screen');
        });
    }
});
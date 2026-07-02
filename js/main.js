import {
    categoryBonusConfig, shopCategories, skillData, consumableData,
    trophyConfig, GACHA_COST, marmotData, gachaPool, wordList
} from './data.js';

import {
    sounds, bgmTracks, playBoostedTypeSound, playBGM,
    unlockBGMOnFirstInteraction, bgImages
} from './audio.js';

/* =========================================================
   セーブデータ
========================================================= */
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
        } catch (e) { console.log("データロード失敗", e); }
    }
    updateSalesDisplay();
    updateHomeCharacterImg();
    switchScreen('title');
}

function saveGameData() {
    localStorage.setItem("moccha_shokudo_v7_data", JSON.stringify(saveData));
}

function getCurrentCostume() {
    const found = marmotData.find(m => m.id === saveData.equippedMarmot);
    return found || marmotData[0];
}

/* =========================================================
   DOM 参照
========================================================= */
const bgLayerElement = document.getElementById('bg-layer');
const startScreen = document.getElementById("start-screen");
const titleScreen = document.getElementById("title-screen");
const fadeOverlay = document.getElementById("fade-overlay");
const urgentOverlay = document.getElementById("urgent-overlay");
const entryBtn = document.getElementById("entry-btn");
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
const characterImgElement = document.getElementById("character-img");
const resultCharacterImgElement = document.getElementById("result-character-img");
const virtualKeyboardElement = document.getElementById("virtual-keyboard");

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

/* =========================================================
   もちすけの自律セリフ ＆ 吹き出し
========================================================= */
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
    stopMarmotSpeech();
    const balloon = document.getElementById("home-balloon");
    if (!balloon) return;

    balloonInterval = setInterval(() => {
        if (startScreen.classList.contains("hidden")) {
            stopMarmotSpeech();
            return;
        }
        if (Math.random() > 0.4) {
            const randomLine = marmotLines[Math.floor(Math.random() * marmotLines.length)];
            balloon.textContent = randomLine;
            balloon.classList.remove("hidden");
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

/* =========================================================
   コンボ節目演出
========================================================= */
const milestoneOverlay = document.getElementById("combo-milestone-overlay");
const milestonePop = document.getElementById("combo-milestone-pop");

function triggerComboMilestone(combo) {
    const isRainbow = (combo === 100);
    const isNormal = !isRainbow && combo % 10 === 0;
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

/* =========================================================
   画面遷移まわり
========================================================= */
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
    stopMarmotSpeech();
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
        updateHomeCharacterImg();
        switchScreen("home");
        startMarmotSpeech();
        requestAnimationFrame(() => {
            fadeOverlay.classList.remove("active");
        });
    }, 700);
}

["pointerdown", "touchstart", "keydown"].forEach(evt => {
    document.addEventListener(evt, unlockBGMOnFirstInteraction, { once: true, passive: true });
});

const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

/* =========================================================
   表示更新まわり
========================================================= */
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

/* =========================================================
   ステップ1：入店演出
========================================================= */
entryBtn.addEventListener("click", () => {
    entryBtn.disabled = true;
    sounds.enter.currentTime = 0; sounds.enter.play().catch(e => {}); // 開ける音
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
        startMarmotSpeech();

        sounds.enter.currentTime = 0; sounds.enter.play().catch(e => {}); // 閉める音

        requestAnimationFrame(() => {
            fadeOverlay.classList.remove("active");
        });
    }, 1100);
});

/* =========================================================
   ステップ2〜4：タイピングゲーム本体
========================================================= */

// --- 仮想キーボードのレイアウト ---
const KEYBOARD_ROWS = [
    ["1","2","3","4","5","6","7","8","9","0","-"],
    ["q","w","e","r","t","y","u","i","o","p"],
    ["a","s","d","f","g","h","j","k","l"],
    ["z","x","c","v","b","n","m"]
];

function buildVirtualKeyboard() {
    if (!virtualKeyboardElement) return;
    virtualKeyboardElement.innerHTML = "";
    KEYBOARD_ROWS.forEach((row, rIdx) => {
        const rowEl = document.createElement("div");
        rowEl.className = "vk-row";
        row.forEach(key => {
            const keyEl = document.createElement("div");
            keyEl.className = "vk-key";
            keyEl.dataset.key = key;
            keyEl.textContent = key === "-" ? "ー" : key;
            rowEl.appendChild(keyEl);
        });
        virtualKeyboardElement.appendChild(rowEl);
    });
}

function highlightNextKey(char) {
    if (!virtualKeyboardElement) return;
    virtualKeyboardElement.querySelectorAll(".vk-key.vk-active").forEach(el => el.classList.remove("vk-active"));
    if (!char) return;
    const target = virtualKeyboardElement.querySelector(`.vk-key[data-key="${char === "-" ? "-" : char.toLowerCase()}"]`);
    if (target) target.classList.add("vk-active");
}

// --- ゲームステート ---
let currentWordPool = [];
let currentWord = null;
let typedIndex = 0;
let timeLeft = 60;
let timerInterval = null;
let isPlaying = false;
let mouthOpenTimeout = null;

let comboCount = 0;
let maxComboCount = 0;
let missCount = 0;
let solvedWordCount = 0;
let sessionSales = 0;
let orderHistory = [];

let activeDrinkEffect = false;
let activeCurryEffect = false;
let activeBentoEffect = false;

let currentShopTab = "menu";

// カテゴリごとの単価倍率（文字単価に掛かる）
const categoryPriceMultiplier = {
    japan: 1, china: 1.3, america: 1.6, italy: 2, sweet: 2.5, asia: 3.2, europe: 4, space: 5
};
const BASE_CHAR_PRICE = 90;

function getEffectiveSkillLevel(id) {
    return Math.min(saveData.equippedSkills[id] || 0, saveData.skills[id] || 0);
}

function buildWordPool() {
    const pool = wordList.filter(w => saveData.unlocked[w.category] && saveData.activeSwitch[w.category]);
    return pool.length > 0 ? pool : wordList.filter(w => w.category === "japan");
}

function pickNextWord() {
    const megaLevel = getEffectiveSkillLevel("megaphone");
    if (megaLevel <= 0 || currentWordPool.length === 0) {
        return currentWordPool[Math.floor(Math.random() * currentWordPool.length)];
    }
    // メガホンレベルが高いほど長い単語(高額メニュー)が出やすくなるよう重み付け抽選
    const weights = currentWordPool.map(w => 1 + megaLevel * w.romaji.length * 0.12);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * totalWeight;
    for (let i = 0; i < currentWordPool.length; i++) {
        r -= weights[i];
        if (r <= 0) return currentWordPool[i];
    }
    return currentWordPool[currentWordPool.length - 1];
}

function calcPrice(word) {
    const multiplier = categoryPriceMultiplier[word.category] || 1;
    let price = Math.round(word.romaji.length * BASE_CHAR_PRICE * multiplier);
    const bonusConf = categoryBonusConfig[word.category];
    let bonus = bonusConf ? bonusConf.perCount : 0;
    if (activeBentoEffect) bonus = Math.round(bonus * 1.5);
    let total = price + bonus;
    const panLevel = getEffectiveSkillLevel("pan");
    const panMultiplier = 1 + panLevel * 0.1;
    total = Math.round(total * panMultiplier);
    return total;
}

function renderWordDisplay() {
    wordJaElement.textContent = currentWord.ja;
    wordRomajiElement.innerHTML = "";
    const chars = currentWord.romaji.split("");
    chars.forEach((c, i) => {
        const span = document.createElement("span");
        span.textContent = c;
        if (i < typedIndex) span.className = "char-typed";
        else if (i === typedIndex) span.className = "char-next";
        else span.className = "char-remaining";
        wordRomajiElement.appendChild(span);
    });
    highlightNextKey(chars[typedIndex]);
}

function nextWord() {
    currentWord = pickNextWord();
    typedIndex = 0;
    renderWordDisplay();
}

function updateTimerDisplay() {
    const shown = Math.max(0, Math.ceil(timeLeft));
    timerElement.textContent = `残り時間: ${shown} 秒`;
    if (timeLeft <= 10) {
        timerElement.classList.add("urgent");
        urgentOverlay.classList.add("active");
    } else {
        timerElement.classList.remove("urgent");
        urgentOverlay.classList.remove("active");
    }
}

function showPenaltyPop(text) {
    penaltyPopElement.textContent = text;
    penaltyPopElement.style.left = "50%";
    penaltyPopElement.style.top = "0px";
    penaltyPopElement.className = "";
    void penaltyPopElement.offsetWidth;
    penaltyPopElement.className = "popup-animation";
}

function reactMouth(cls) {
    characterImgElement.classList.remove("char-eat", "char-miss");
    void characterImgElement.offsetWidth;
    characterImgElement.classList.add(cls);
    if (mouthOpenTimeout) clearTimeout(mouthOpenTimeout);
    mouthOpenTimeout = setTimeout(() => {
        characterImgElement.classList.remove(cls);
    }, 260);
}

function updateComboDisplay() {
    comboContainer.textContent = comboCount > 0 ? `🔥 ${comboCount} コンボ！` : "";
}

function startGame() {
    // 効果初期化
    activeDrinkEffect = saveData.itemSwitch.drink && saveData.items.drink > 0;
    activeCurryEffect = saveData.itemSwitch.curry && saveData.items.curry > 0;
    activeBentoEffect = saveData.itemSwitch.bento && saveData.items.bento > 0;
    if (activeDrinkEffect) saveData.items.drink -= 1;
    if (activeCurryEffect) saveData.items.curry -= 1;
    if (activeBentoEffect) saveData.items.bento -= 1;
    saveGameData();

    const hourglassLevel = getEffectiveSkillLevel("hourglass");
    timeLeft = 60 + hourglassLevel * 2;

    comboCount = 0;
    maxComboCount = 0;
    missCount = 0;
    solvedWordCount = 0;
    sessionSales = 0;
    orderHistory = [];
    isPlaying = true;

    currentWordPool = buildWordPool();
    buildVirtualKeyboard();
    updateComboDisplay();
    updateTimerDisplay();
    urgentOverlay.classList.remove("active");
    timerElement.classList.remove("urgent");

    resultScreen.classList.add("hidden");
    startScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    document.body.classList.add("ingame");

    characterImgElement.src = getCurrentCostume().normal;
    mobileInput.value = "";

    nextWord();
    switchScreen("game");

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft -= 1;
        updateTimerDisplay();
        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);

    if (isMobile) {
        mobileInput.focus();
    }
}

function handleMiss() {
    const apronLevel = getEffectiveSkillLevel("apron");
    const guardChance = apronLevel * 0.1;
    if (Math.random() < guardChance) {
        // ガード成功：ペナルティなし
        return;
    }
    missCount += 1;
    comboCount = 0;
    updateComboDisplay();

    const penalty = activeCurryEffect ? 0.5 : 1;
    timeLeft = Math.max(0, timeLeft - penalty);
    updateTimerDisplay();

    showPenaltyPop(`-${penalty.toFixed(1)}秒`);
    reactMouth("char-miss");
    gameContainer.classList.remove("shake-animation");
    void gameContainer.offsetWidth;
    gameContainer.classList.add("shake-animation");

    const shoutSound = sounds.shout.cloneNode(true);
    shoutSound.play().catch(e => {});

    if (timeLeft <= 0) {
        endGame();
    }
}

function handleCorrectChar() {
    typedIndex += 1;
    playBoostedTypeSound(comboCount);
    comboCount += activeDrinkEffect ? 2 : 1;
    if (comboCount > maxComboCount) maxComboCount = comboCount;
    triggerComboMilestone(comboCount);
    updateComboDisplay();
    reactMouth("char-eat");

    if (typedIndex >= currentWord.romaji.length) {
        completeWord();
    } else {
        renderWordDisplay();
    }
}

function completeWord() {
    const price = calcPrice(currentWord);
    sessionSales += price;
    solvedWordCount += 1;
    orderHistory.push({ name: currentWord.ja, price });

    sounds.chew.currentTime = 0;
    sounds.chew.play().catch(e => {});

    nextWord();
}

function processChar(rawChar) {
    if (!isPlaying || !currentWord) return;
    const char = rawChar.toLowerCase();
    const expected = currentWord.romaji[typedIndex];
    if (char === expected) {
        handleCorrectChar();
    } else {
        handleMiss();
    }
}

mobileInput.addEventListener("input", () => {
    const val = mobileInput.value;
    if (val.length > 0) {
        const lastChar = val[val.length - 1];
        processChar(lastChar);
    }
    mobileInput.value = "";
});

// デスクトップでも直接キーボードで入力できるようにする
document.addEventListener("keydown", (e) => {
    if (!isPlaying) return;
    if (document.activeElement === mobileInput) return; // input側で処理済み
    if (e.key.length === 1 && /[a-zA-Z0-9\-]/.test(e.key)) {
        processChar(e.key);
    }
});

function endGame() {
    if (!isPlaying) return;
    isPlaying = false;
    clearInterval(timerInterval);
    urgentOverlay.classList.remove("active");
    timerElement.classList.remove("urgent");
    document.body.classList.remove("ingame");

    saveData.totalSales += sessionSales;

    // トロフィー判定
    if (sessionSales >= 10000) saveData.trophies[0] = true;
    if (sessionSales >= 100000) saveData.trophies[1] = true;
    if (saveData.totalSales >= 1000000) saveData.trophies[2] = true;
    if (maxComboCount >= 20) saveData.trophies[3] = true;
    if (missCount <= 3 && solvedWordCount >= 30) saveData.trophies[4] = true;
    if (sessionSales >= 1000000) saveData.trophies[5] = true;

    saveGameData();
    renderReceipt();

    gameScreen.classList.add("hidden");
    resultScreen.classList.remove("hidden");
    switchScreen("result");
}

function getRank(sales) {
    if (sales >= 500000) return { label: "🏆 神もっちゃランク", color: "#e91e63" };
    if (sales >= 200000) return { label: "🥇 Sランク", color: "#f39c12" };
    if (sales >= 100000) return { label: "🥈 Aランク", color: "#3498db" };
    if (sales >= 50000) return { label: "🥉 Bランク", color: "#27ae60" };
    if (sales >= 20000) return { label: "Cランク", color: "#7f8c8d" };
    return { label: "見習いランク", color: "#95a5a6" };
}

function renderReceipt() {
    const listEl = document.getElementById("receipt-list");
    listEl.innerHTML = "";
    orderHistory.forEach(item => {
        const row = document.createElement("div");
        row.className = "receipt-item";
        row.innerHTML = `<span>${item.name}</span><span>￥${item.price.toLocaleString()}</span>`;
        listEl.appendChild(row);
    });
    document.getElementById("receipt-grand-total").innerHTML =
        `<span>合計</span><span>￥${sessionSales.toLocaleString()}</span>`;

    const rank = getRank(sessionSales);
    const rankDisplay = document.getElementById("receipt-rank-display");
    rankDisplay.textContent = `${rank.label}（提供${solvedWordCount}皿 / 最大${maxComboCount}コンボ / ミス${missCount}回）`;
    rankDisplay.style.color = rank.color;

    resultCharacterImgElement.src = missCount === 0 && solvedWordCount > 0
        ? getCurrentCostume().eat
        : getCurrentCostume().normal;
}

/* --- レシート保存＆シェア --- */
saveReceiptBtn.addEventListener("click", () => {
    const target = document.getElementById("receipt-box");
    if (typeof html2canvas !== "function") return;
    html2canvas(target, { backgroundColor: "#ffffff", scale: 2 }).then(canvas => {
        const link = document.createElement("a");
        link.download = "moccha_receipt.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
    });
});

shareReceiptBtn.addEventListener("click", async () => {
    const shareText = `もっちゃもっちゃ食堂で￥${sessionSales.toLocaleString()}を売り上げたもっちゃ！(${solvedWordCount}皿提供 / 最大${maxComboCount}コンボ)`;
    if (navigator.share) {
        try {
            await navigator.share({ text: shareText });
        } catch (e) { /* キャンセル等は無視 */ }
    } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
        alert("結果をクリップボードにコピーしたもっちゃ！SNSに貼り付けてシェアしてね！");
    } else {
        alert(shareText);
    }
});

/* =========================================================
   ショップ
========================================================= */
function switchShopTab(tab) {
    currentShopTab = tab;
    [tabMenuBtn, tabSkillBtn, tabItemBtn].forEach(btn => btn.classList.remove("active"));
    if (tab === "menu") tabMenuBtn.classList.add("active");
    if (tab === "skill") tabSkillBtn.classList.add("active");
    if (tab === "item") tabItemBtn.classList.add("active");
    renderShop();
}

function renderShop() {
    shopListContainer.innerHTML = "";

    if (currentShopTab === "menu") {
        shopCategories.forEach(cat => {
            const unlocked = saveData.unlocked[cat.id];
            const row = document.createElement("div");
            row.className = "shop-item";
            row.innerHTML = `
                <div class="shop-item-info">
                    <div class="shop-item-icon">${cat.icon}</div>
                    <div>
                        <div class="shop-item-name">${cat.name}</div>
                        <div class="shop-item-desc">${cat.desc}</div>
                        ${unlocked ? "" : `<div class="shop-item-cost">￥${cat.cost.toLocaleString()}</div>`}
                    </div>
                </div>
            `;
            if (unlocked) {
                const status = document.createElement("div");
                status.className = "shop-item-status";
                status.textContent = "開発済み ✅";
                row.appendChild(status);
            } else {
                const btn = document.createElement("button");
                btn.className = "shop-btn";
                btn.textContent = "開発する";
                btn.disabled = saveData.totalSales < cat.cost;
                btn.addEventListener("click", () => {
                    if (saveData.totalSales < cat.cost) return;
                    saveData.totalSales -= cat.cost;
                    saveData.unlocked[cat.id] = true;
                    saveData.activeSwitch[cat.id] = true;
                    saveGameData();
                    updateSalesDisplay();
                    sounds.cash.currentTime = 0; sounds.cash.play().catch(e => {});
                    renderShop();
                });
                row.appendChild(btn);
            }
            shopListContainer.appendChild(row);
        });
    }

    if (currentShopTab === "skill") {
        skillData.forEach(skill => {
            const level = saveData.skills[skill.id] || 0;
            const maxLevel = skill.costs.length;
            const row = document.createElement("div");
            row.className = "shop-item";
            const nextCost = level < maxLevel ? skill.costs[level] : null;
            row.innerHTML = `
                <div class="shop-item-info">
                    <div class="shop-item-icon">${skill.icon}</div>
                    <div>
                        <div class="shop-item-name">${skill.name}（Lv.${level}/${maxLevel}）</div>
                        <div class="shop-item-desc">${skill.desc}</div>
                        <div class="shop-item-level">現在の効果：${skill.effects[level]}</div>
                        ${nextCost !== null ? `<div class="shop-item-cost">次のLvへ：￥${nextCost.toLocaleString()}</div>` : `<div class="shop-item-level">MAXレベル達成！</div>`}
                    </div>
                </div>
            `;
            if (nextCost !== null) {
                const btn = document.createElement("button");
                btn.className = "shop-btn";
                btn.textContent = "強化する";
                btn.disabled = saveData.totalSales < nextCost;
                btn.addEventListener("click", () => {
                    if (saveData.totalSales < nextCost) return;
                    saveData.totalSales -= nextCost;
                    saveData.skills[skill.id] = level + 1;
                    if (saveData.equippedSkills[skill.id] < level + 1) {
                        saveData.equippedSkills[skill.id] = level + 1;
                    }
                    saveGameData();
                    updateSalesDisplay();
                    sounds.cash.currentTime = 0; sounds.cash.play().catch(e => {});
                    renderShop();
                });
                row.appendChild(btn);
            }
            shopListContainer.appendChild(row);
        });
    }

    if (currentShopTab === "item") {
        consumableData.forEach(item => {
            const owned = saveData.items[item.id] || 0;
            const row = document.createElement("div");
            row.className = "shop-item";
            row.innerHTML = `
                <div class="shop-item-info">
                    <div class="shop-item-icon">${item.icon}</div>
                    <div>
                        <div class="shop-item-name">${item.name}（所持：${owned}個）</div>
                        <div class="shop-item-desc">${item.desc}</div>
                        <div class="shop-item-cost">￥${item.cost.toLocaleString()}</div>
                    </div>
                </div>
            `;
            const btn = document.createElement("button");
            btn.className = "shop-btn";
            btn.textContent = "購入する";
            btn.disabled = saveData.totalSales < item.cost;
            btn.addEventListener("click", () => {
                if (saveData.totalSales < item.cost) return;
                saveData.totalSales -= item.cost;
                saveData.items[item.id] = owned + 1;
                saveGameData();
                updateSalesDisplay();
                sounds.cash.currentTime = 0; sounds.cash.play().catch(e => {});
                renderShop();
            });
            row.appendChild(btn);
            shopListContainer.appendChild(row);
        });
    }
}

/* =========================================================
   倉庫＆スキル装備
========================================================= */
function renderStorage() {
    // メニュー提供スイッチ
    storageMenuListContainer.innerHTML = "";
    shopCategories.forEach(cat => {
        if (!saveData.unlocked[cat.id]) return;
        const row = document.createElement("div");
        row.className = "storage-row";
        const checked = saveData.activeSwitch[cat.id] ? "checked" : "";
        row.innerHTML = `<label><input type="checkbox" data-cat="${cat.id}" ${checked}> ${cat.icon} ${cat.name}</label>`;
        row.querySelector("input").addEventListener("change", (e) => {
            saveData.activeSwitch[cat.id] = e.target.checked;
            saveGameData();
        });
        storageMenuListContainer.appendChild(row);
    });

    // アイテム自動使用スイッチ
    storageItemListContainer.innerHTML = "";
    consumableData.forEach(item => {
        const owned = saveData.items[item.id] || 0;
        const row = document.createElement("div");
        row.className = "storage-row";
        const checked = saveData.itemSwitch[item.id] ? "checked" : "";
        row.innerHTML = `<label><input type="checkbox" data-item="${item.id}" ${checked} ${owned <= 0 ? "disabled" : ""}> ${item.icon} ${item.name}（所持：${owned}個）</label>`;
        row.querySelector("input").addEventListener("change", (e) => {
            saveData.itemSwitch[item.id] = e.target.checked;
            saveGameData();
        });
        storageItemListContainer.appendChild(row);
    });

    // スキル装備レベル
    storageSkillListContainer.innerHTML = "";
    skillData.forEach(skill => {
        const ownedLevel = saveData.skills[skill.id] || 0;
        if (ownedLevel <= 0) return;
        const row = document.createElement("div");
        row.className = "storage-row";
        const equippedLevel = saveData.equippedSkills[skill.id] || 0;
        let options = "";
        for (let lv = 0; lv <= ownedLevel; lv++) {
            options += `<option value="${lv}" ${lv === equippedLevel ? "selected" : ""}>Lv.${lv}（${skill.effects[lv]}）</option>`;
        }
        row.innerHTML = `<label>${skill.icon} ${skill.name}</label><select data-skill="${skill.id}">${options}</select>`;
        row.querySelector("select").addEventListener("change", (e) => {
            saveData.equippedSkills[skill.id] = parseInt(e.target.value, 10);
            saveGameData();
        });
        storageSkillListContainer.appendChild(row);
    });
    if (storageSkillListContainer.innerHTML === "") {
        storageSkillListContainer.innerHTML = `<div class="storage-row" style="justify-content:center; color:#95a5a6;">まだスキルを購入していません</div>`;
    }
}

/* =========================================================
   トロフィー
========================================================= */
let trophyPage = 0;

function renderTrophy() {
    for (let i = 0; i < 12; i++) {
        const spot = document.getElementById(`trophy-${i}`);
        if (!spot) continue;
        spot.classList.remove("locked-spot", "unlocked-spot", "future-spot");
        if (i < trophyConfig.length) {
            const unlocked = saveData.trophies[i];
            if (unlocked) {
                spot.textContent = trophyConfig[i].icon;
                spot.classList.add("unlocked-spot");
            } else {
                spot.textContent = "❓";
                spot.classList.add("locked-spot");
            }
        } else {
            spot.textContent = "🔒";
            spot.classList.add("future-spot");
        }
    }
    renderTrophyDots();
}

function renderTrophyDots() {
    const dotsContainer = document.getElementById("trophy-dots-container");
    dotsContainer.innerHTML = "";
    for (let p = 0; p < 2; p++) {
        const dot = document.createElement("div");
        dot.className = "trophy-dot" + (p === trophyPage ? " active" : "");
        dot.addEventListener("click", () => setTrophyPage(p));
        dotsContainer.appendChild(dot);
    }
}

function setTrophyPage(p) {
    trophyPage = p;
    const track = document.getElementById("trophy-slider-track");
    track.style.transform = `translateX(-${p * 50}%)`;
    renderTrophyDots();
}

window.clickTrophy = function (index) {
    if (index < trophyConfig.length) {
        const conf = trophyConfig[index];
        const unlocked = saveData.trophies[index];
        alert(`${conf.icon} ${conf.name}\n条件：${conf.desc}\n状態：${unlocked ? "解禁済み ✅" : "未解禁 ❓"}`);
    } else {
        alert("🔒 今後のアップデートで追加予定のトロフィーもっちゃ！お楽しみに！");
    }
};

/* =========================================================
   もちすけの部屋（ガチャ・衣装）
========================================================= */
function renderLounge() {
    marmotGridContainer.innerHTML = "";
    marmotData.forEach(m => {
        const owned = saveData.marmots[m.id];
        const equipped = saveData.equippedMarmot === m.id;
        const card = document.createElement("div");
        card.className = "marmot-card" + (owned ? "" : " locked") + (equipped ? " equipped" : "");
        card.innerHTML = `
            <div class="marmot-card-icon">${owned ? m.icon : "🔒"}</div>
            <div class="marmot-card-name">${owned ? m.name : "???"}</div>
            ${equipped ? `<div class="marmot-equipped-badge">装備中</div>` : ""}
        `;
        if (owned) {
            card.addEventListener("click", () => {
                saveData.equippedMarmot = m.id;
                saveGameData();
                updateHomeCharacterImg();
                renderLounge();
            });
        }
        marmotGridContainer.appendChild(card);
    });
}

gachaBtn.addEventListener("click", () => {
    if (saveData.totalSales < GACHA_COST) {
        gachaResultBox.textContent = "資金が足りないもっちゃ…！";
        return;
    }
    saveData.totalSales -= GACHA_COST;
    sounds.cash.currentTime = 0; sounds.cash.play().catch(e => {});

    const picked = gachaPool[Math.floor(Math.random() * gachaPool.length)];
    if (saveData.marmots[picked.id]) {
        const refund = Math.round(GACHA_COST * 0.4);
        saveData.totalSales += refund;
        gachaResultBox.textContent = `${picked.icon} ${picked.name}...重複だったので￥${refund.toLocaleString()}が返還されたもっちゃ！`;
    } else {
        saveData.marmots[picked.id] = true;
        gachaResultBox.textContent = `🎉 新しい衣装「${picked.icon} ${picked.name}」をゲットしたもっちゃ！`;
    }
    saveGameData();
    updateSalesDisplay();
    renderLounge();
});

/* =========================================================
   イベント登録
========================================================= */
document.getElementById("debug-money-btn").addEventListener("click", () => {
    saveData.totalSales += 1000000;
    if (saveData.totalSales >= 1000000) saveData.trophies[2] = true;
    saveGameData();
    updateSalesDisplay();
    sounds.cash.currentTime = 0; sounds.cash.play().catch(e => {});
    if (!shopScreen.classList.contains("hidden")) renderShop();
});

startBtn.addEventListener("click", () => { stopMarmotSpeech(); startGame(); });
retryBtn.addEventListener("click", () => { startGame(); });
homeBtn.addEventListener("click", () => {
    resultScreen.classList.add("hidden");
    startScreen.classList.remove("hidden");
    updateSalesDisplay();
    updateHomeCharacterImg();
    switchScreen("home");
    startMarmotSpeech();
});

toShopBtn.addEventListener("click", () => { navigateFromHome(shopScreen, "shop", () => switchShopTab("menu")); });
backHomeBtn.addEventListener("click", () => { navigateToHome(shopScreen); });

toTrophyBtn.addEventListener("click", () => { navigateFromHome(trophyScreen, "trophy", () => { trophyPage = 0; renderTrophy(); setTrophyPage(0); }); });
backHomeTrophyBtn.addEventListener("click", () => { navigateToHome(trophyScreen); });

toStorageBtn.addEventListener("click", () => { navigateFromHome(storageScreen, "storage", () => renderStorage()); });
backHomeStorageBtn.addEventListener("click", () => { navigateToHome(storageScreen); });

toLoungeBtn.addEventListener("click", () => { navigateFromHome(loungeScreen, "lounge", () => renderLounge()); });
backHomeLoungeBtn.addEventListener("click", () => { navigateToHome(loungeScreen); });

tabMenuBtn.addEventListener("click", () => switchShopTab("menu"));
tabSkillBtn.addEventListener("click", () => switchShopTab("skill"));
tabItemBtn.addEventListener("click", () => switchShopTab("item"));

/* =========================================================
   起動
========================================================= */
loadGameData();
import { 
    categoryBonusConfig, shopCategories, skillData, consumableData, 
    trophyConfig, GACHA_COST, marmotData, gachaPool, wordList 
} from './data.js';

import { 
    sounds, bgmTracks, playBoostedTypeSound, playBGM, 
    currentBgmKey, unlockBGMOnFirstInteraction, bgImages 
} from './audio.js';

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

        sounds.enter.currentTime = 0; sounds.enter.play().catch(e => {});

        requestAnimationFrame(() => {
            fadeOverlay.classList.remove("active");
        });
    }, 1100);
});

startBtn.addEventListener("click", () => { if (isMobile) mobileInput.focus(); startGame(); });
retryBtn.addEventListener("click", () => { if (isMobile) mobileInput.focus(); startGame(); });
homeBtn.addEventListener("click", () => { resultScreen.classList.add("hidden"); startScreen.classList.remove("hidden"); updateSalesDisplay(); updateHomeCharacterImg(); switchScreen("home"); });
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
        requestAnimationFrame(() => { fadeOverlay.classList.remove("active"); });
    }, 700);
});
gachaBtn.addEventListener("click", pullGacha);

tabMenuBtn.addEventListener("click", () => switchShopTab("menu"));
tabSkillBtn.addEventListener("click", () => switchShopTab("skill"));
tabItemBtn.addEventListener("click", () => switchShopTab("item"));

function switchShopTab(tab) {
    currentShopTab = tab;
    tabMenuBtn.classList.remove("active"); tabSkillBtn.classList.remove("active"); tabItemBtn.classList.remove("active");
    if (tab === "menu") tabMenuBtn.classList.add("active");
    if (tab === "skill") tabSkillBtn.classList.add("active");
    if (tab === "item") tabItemBtn.classList.add("active");
    renderShop();
}

window.addEventListener("keydown", handleKeyDown);
mobileInput.addEventListener("input", (event) => {
    if (!isMobile || !isPlaying) { mobileInput.value = ""; return; }
    let char = event.data || (mobileInput.value.length > 0 ? mobileInput.value.slice(-1) : null);
    if (char) handleCharInput(char);
    mobileInput.value = "";
});
gameContainer.addEventListener("click", () => { if (isPlaying && isMobile) mobileInput.focus(); });

function renderShop() {
    shopListContainer.innerHTML = "";

    if (currentShopTab === "menu") {
        shopCategories.forEach(item => {
            const isUnlocked = saveData.unlocked[item.id];
            const itemDiv = document.createElement("div");
            itemDiv.className = "shop-item";
            let actionHtml = "";
            if (item.id === "japan") { actionHtml = `<span class="shop-item-status">開店初期</span>`; }
            else if (isUnlocked) { actionHtml = `<span class="shop-item-status">✨ 開発済み</span>`; }
            else {
                const canBuy = saveData.totalSales >= item.cost;
                actionHtml = `<button class="shop-btn" ${canBuy ? "" : "disabled"} onclick="buyMenu('${item.id}', ${item.cost})">開発する</button>`;
            }
            itemDiv.innerHTML = `
                <div class="shop-item-info">
                    <div class="shop-item-icon">${item.icon}</div>
                    <div>
                        <div class="shop-item-name">${item.name}</div>
                        <div style="font-size:0.8rem; color:#27ae60; font-weight:bold; margin-top:2px;">${item.desc}</div>
                        <div class="shop-item-cost">${item.id==='japan' ? '' : '開発費: ￥' + item.cost.toLocaleString()}</div>
                    </div>
                </div>
                <div>${actionHtml}</div>
            `;
            shopListContainer.appendChild(itemDiv);
        });
    } 
    else if (currentShopTab === "skill") {
        skillData.forEach(skill => {
            const maxLv = saveData.skills[skill.id] || 0;
            const itemDiv = document.createElement("div");
            itemDiv.className = "shop-item";
            let actionHtml = "";

            if (maxLv >= 5) { actionHtml = `<span class="shop-item-status" style="color:#e67e22;">★極・MAX</span>`; }
            else {
                const nextCost = skill.costs[maxLv];
                const canBuy = saveData.totalSales >= nextCost;
                actionHtml = `<button class="shop-btn" ${canBuy ? "" : "disabled"} onclick="upgradeSkill('${skill.id}', ${nextCost})">LvUP (￥${nextCost.toLocaleString()})</button>`;
            }

            itemDiv.innerHTML = `
                <div class="shop-item-info">
                    <div class="shop-item-icon">${skill.icon}</div>
                    <div>
                        <div class="shop-item-name">${skill.name} <span style="color:#e67e22;">(最高保有: Lv.${maxLv})</span></div>
                        <div style="font-size:0.8rem; color:#555; margin-bottom:2px;">${skill.desc}</div>
                        <div style="font-size:0.85rem; color:#27ae60; font-weight:bold;">次段階効果: ${maxLv < 5 ? skill.effects[maxLv+1] : '上限到達'}</div>
                    </div>
                </div>
                <div>${actionHtml}</div>
            `;
            shopListContainer.appendChild(itemDiv);
        });
    } 
    else if (currentShopTab === "item") {
        consumableData.forEach(item => {
            const count = saveData.items[item.id] || 0;
            const canBuy = saveData.totalSales >= item.cost;
            const itemDiv = document.createElement("div");
            itemDiv.className = "shop-item";

            itemDiv.innerHTML = `
                <div class="shop-item-info">
                    <div class="shop-item-icon">${item.icon}</div>
                    <div>
                        <div class="shop-item-name">${item.name} <span style="color:#219653;">(所持: ${count}個)</span></div>
                        <div style="font-size:0.8rem; color:#555; margin-bottom:2px;">${item.desc}</div>
                        <div class="shop-item-cost">価格: ￥${item.cost.toLocaleString()}</div>
                    </div>
                </div>
                <div>
                    <button class="shop-btn" ${canBuy ? "" : "disabled"} onclick="buyConsumable('${item.id}', ${item.cost})">1個購入</button>
                </div>
            `;
            shopListContainer.appendChild(itemDiv);
        });
    }
}

// 外部（HTMLのonclickなど）から呼べるようにwindowに登録
window.buyMenu = function(id, cost) {
    if (saveData.totalSales >= cost && !saveData.unlocked[id]) {
        saveData.totalSales -= cost; saveData.unlocked[id] = true; saveData.activeSwitch[id] = true;
        saveGameData(); sounds.cash.currentTime = 0; sounds.cash.play().catch(e => {}); updateSalesDisplay(); renderShop();
    }
};

window.upgradeSkill = function(id, cost) {
    const maxLv = saveData.skills[id] || 0;
    if (saveData.totalSales >= cost && maxLv < 5) {
        saveData.totalSales -= cost;
        saveData.skills[id] = maxLv + 1;
        saveData.equippedSkills[id] = maxLv + 1; 
        saveGameData(); sounds.cash.currentTime = 0; sounds.cash.play().catch(e => {}); updateSalesDisplay(); renderShop();
    }
};

window.buyConsumable = function(id, cost) {
    if (saveData.totalSales >= cost) {
        saveData.totalSales -= cost;
        saveData.items[id] = (saveData.items[id] || 0) + 1;
        saveGameData(); sounds.cash.currentTime = 0; sounds.cash.play().catch(e => {}); updateSalesDisplay(); renderShop();
    }
};

let trophyPage = 0;
const TROPHY_TOTAL_PAGES = 2;

window.slideTrophy = function(dir) {
    trophyPage = Math.max(0, Math.min(TROPHY_TOTAL_PAGES - 1, trophyPage + dir));
    updateTrophySlider();
};
window.goToTrophyPage = function(page) {
    trophyPage = page;
    updateTrophySlider();
};
function updateTrophySlider() {
    const track = document.getElementById("trophy-slider-track");
    if (track) track.style.transform = `translateX(-${trophyPage * 100}%)`;
    for (let i = 0; i < TROPHY_TOTAL_PAGES; i++) {
        const dot = document.getElementById(`trophy-dot-${i}`);
        if (dot) dot.classList.toggle("active", i === trophyPage);
    }
}

function renderTrophy() {
    trophyPage = 0;
    updateTrophySlider();
    for (let i = 0; i < 6; i++) {
        const spot = document.getElementById(`trophy-${i}`);
        if (!spot) continue;
        if (saveData.trophies[i]) {
            spot.textContent = trophyConfig[i].icon;
            spot.classList.remove("trophy-locked");
        } else {
            spot.textContent = "❓";
            spot.classList.add("trophy-locked");
        }
    }
    for (let i = 6; i < 12; i++) {
        const spot = document.getElementById(`trophy-${i}`);
        if (!spot) continue;
        if (trophyConfig[i] && saveData.trophies[i]) {
            spot.textContent = trophyConfig[i].icon;
            spot.classList.remove("trophy-locked");
        } else {
            spot.textContent = "❓";
            spot.classList.add("trophy-locked");
        }
    }
}

function renderStorage() {
    storageMenuListContainer.innerHTML = "";
    storageItemListContainer.innerHTML = "";
    storageSkillListContainer.innerHTML = "";

    consumableData.forEach(item => {
        const count = saveData.items[item.id] || 0;
        const isActive = saveData.itemSwitch[item.id];
        const itemDiv = document.createElement("div");
        itemDiv.className = "shop-item";
        
        let toggleHtml = count <= 0 ? `<span class="lock-text">未所持</span>` : `
            <label class="switch">
                <input type="checkbox" ${isActive ? "checked" : ""} onchange="toggleItemSwitch('${item.id}', this.checked)">
                <span class="slider"></span>
            </label>
        `;

        itemDiv.innerHTML = `
            <div class="shop-item-info">
                <div class="shop-item-icon">${item.icon}</div>
                <div>
                    <div class="shop-item-name">${item.name} <span style="color:#219653;">(在庫: ${count}個)</span></div>
                    <div style="font-size:0.8rem; color:#7f8c8d;">${item.desc}</div>
                </div>
            </div>
            <div>${toggleHtml}</div>
        `;
        storageItemListContainer.appendChild(itemDiv);
    });

    skillData.forEach(skill => {
        const maxLv = saveData.skills[skill.id] || 0;
        const currentEquipped = saveData.equippedSkills[skill.id] || 0;
        const itemDiv = document.createElement("div");
        itemDiv.className = "shop-item";

        let actionHtml = "";
        if (maxLv === 0) {
            actionHtml = `<span class="lock-text">🔒 未購入</span>`;
        } else {
            let selectHtml = `<select class="level-select" onchange="changeSkillLevel('${skill.id}', this.value)">`;
            for(let i=0; i<=maxLv; i++) {
                const label = i === 0 ? "OFF (不使用)" : `Lv.${i} [${skill.effects[i]}]`;
                selectHtml += `<option value="${i}" ${i === currentEquipped ? "selected" : ""}>${label}</option>`;
            }
            selectHtml += `</select>`;
            actionHtml = selectHtml;
        }

        itemDiv.innerHTML = `
            <div class="shop-item-info">
                <div class="shop-item-icon">${skill.icon}</div>
                <div>
                    <div class="shop-item-name">${skill.name}</div>
                    <div style="font-size:0.8rem; color:#7f8c8d;">${skill.desc} <br>(最大解放値: Lv.${maxLv})</div>
                </div>
            </div>
            <div>${actionHtml}</div>
        `;
        storageSkillListContainer.appendChild(itemDiv);
    });

    shopCategories.forEach(item => {
        const isUnlocked = saveData.unlocked[item.id];
        const isActive = saveData.activeSwitch[item.id];
        const itemDiv = document.createElement("div");
        itemDiv.className = "shop-item";

        let toggleHtml = !isUnlocked ? `<span class="lock-text">🔒 未開発</span>` : `
            <label class="switch">
                <input type="checkbox" ${isActive ? "checked" : ""} onchange="toggleCategory('${item.id}', this.checked)">
                <span class="slider"></span>
            </label>
        `;

        itemDiv.innerHTML = `
            <div class="shop-item-info">
                <div class="shop-item-icon">${item.icon}</div>
                <div>
                    <div class="shop-item-name">${item.name}</div>
                    <div style="font-size:0.8rem; color:#7f8c8d;">${item.desc}</div>
                </div>
            </div>
            <div>${toggleHtml}</div>
        `;
        storageMenuListContainer.appendChild(itemDiv);
    });
}

function renderLounge() {
    updateSalesDisplay();
    updateLoungeCharacterImg();
    marmotGridContainer.innerHTML = "";
    marmotData.forEach(marmot => {
        const isUnlocked = !!saveData.marmots[marmot.id];
        const isEquipped = saveData.equippedMarmot === marmot.id;
        const card = document.createElement("div");
        card.className = "marmot-card" + (isEquipped ? " equipped" : "") + (isUnlocked ? "" : " locked");
        card.innerHTML = `
            <div class="marmot-card-icon">${isUnlocked ? marmot.icon : "❓"}</div>
            <div class="marmot-card-name">${isUnlocked ? marmot.name : "未解放"}</div>
            ${isEquipped ? `<div class="marmot-equipped-badge">★着用中</div>` : ""}
        `;
        if (isUnlocked) card.onclick = () => window.equipMarmot(marmot.id);
        marmotGridContainer.appendChild(card);
    });
}

function updateLoungeCharacterImg() {
    const loungeImg = document.getElementById("lounge-character-img");
    const loungeName = document.getElementById("lounge-character-name");
    const costume = getCurrentCostume();
    if (loungeImg) loungeImg.src = costume.normal;
    if (loungeName) loungeName.textContent = `現在の着用：${costume.name}`;
}

window.equipMarmot = function(id) {
    if (!saveData.marmots[id]) return;
    saveData.equippedMarmot = id;
    saveGameData();
    renderLounge();
    updateHomeCharacterImg();
};

function pullGacha() {
    if (saveData.totalSales < GACHA_COST) {
        gachaResultBox.innerHTML = `<div style="color:#e74c3c;">資金が足りません…（必要：￥${GACHA_COST.toLocaleString()}）</div>`;
        return;
    }

    saveData.totalSales -= GACHA_COST;
    saveGameData();
    updateSalesDisplay();

    const gachaBtn    = document.getElementById("gacha-btn");
    const drumOverlay = document.getElementById("gacha-drum-overlay");
    const drumIcon    = document.getElementById("gacha-drum-icon");
    const drumLabel   = document.getElementById("gacha-drum-label");
    const flashOvl    = document.getElementById("gacha-flash-overlay");

    gachaBtn.disabled = true;
    gachaResultBox.innerHTML = "";
    drumOverlay.style.display = "flex";

    const drumIcons = ["🎴","❓","🎁","🎰","🎊","🎉","🌟","✨"];
    let drumCount = 0;
    const drumInterval = setInterval(() => {
        drumIcon.textContent = drumIcons[drumCount % drumIcons.length];
        drumCount++;
        if (drumCount > 18) drumIcon.style.animationDuration = "0.3s";
        if (drumCount > 24) drumIcon.style.animationDuration = "0.55s";
    }, 120);

    const labels = ["ドキドキ…", "どれかな…", "頼む…！", "出ろ！", "…！！"];
    let labelIdx = 0;
    const labelInterval = setInterval(() => {
        drumLabel.textContent = labels[Math.min(labelIdx, labels.length - 1)];
        labelIdx++;
    }, 600);

    setTimeout(() => {
        clearInterval(drumInterval);
        clearInterval(labelInterval);
        drumOverlay.style.display = "none";
        drumIcon.style.animationDuration = "";

        const picked      = gachaPool[Math.floor(Math.random() * gachaPool.length)];
        const alreadyOwned = !!saveData.marmots[picked.id];

        flashOvl.className = "";
        void flashOvl.offsetWidth;
        flashOvl.className = "flash";

        setTimeout(() => {
            if (alreadyOwned) {
                const refund = Math.floor(GACHA_COST / 2);
                saveData.totalSales += refund;
                gachaResultBox.innerHTML = `
                    <div class="gacha-result-icon">${picked.icon}</div>
                    <div>「${picked.name}」と同じ子だった…！<br>お詫びに￥${refund.toLocaleString()}を返却したよ</div>
                `;
                sounds.cash.currentTime = 0; sounds.cash.play().catch(e => {});
            } else {
                saveData.marmots[picked.id] = true;
                gachaResultBox.innerHTML = `
                    <div class="gacha-result-icon" style="font-size:4rem;">${picked.icon}</div>
                    <div style="color:#e84393; font-size:1.2rem;">🎉「${picked.name}」が仲間になった！🎉</div>
                `;
                const newSnd = sounds.cash.cloneNode(true);
                newSnd.playbackRate = 1.3;
                newSnd.volume = 0.9;
                newSnd.play().catch(e => {});
                setTimeout(() => {
                    const newSnd2 = sounds.cash.cloneNode(true);
                    newSnd2.playbackRate = 1.6;
                    newSnd2.volume = 0.7;
                    newSnd2.play().catch(e => {});
                }, 200);
            }

            saveGameData();
            updateSalesDisplay();
            renderLounge();
            gachaBtn.disabled = false;
        }, 300);

    }, 3000);
}

window.alertTrophy = function(index) {
    const config = trophyConfig[index];
    if (!config) return;
    const isUnlocked = saveData.trophies[index];
    if (isUnlocked) {
        alert(`🏆【${config.name}】獲得済み！\n条件: ${config.desc}`);
    } else {
        alert(`🔒【未解放のトロフィー台座】\n獲得条件: ${config.desc}`);
    }
};

window.toggleCategory = function(id, isChecked) { saveData.activeSwitch[id] = isChecked; saveGameData(); };
window.toggleItemSwitch = function(id, isChecked) { saveData.itemSwitch[id] = isChecked; saveGameData(); };
window.changeSkillLevel = function(id, value) { saveData.equippedSkills[id] = parseInt(value, 10); saveGameData(); };

function getRomajiVariants(baseRomaji) {
    let variants = [baseRomaji];
    const rules = [
        { src: "she", dst: "sye" }, { src: "ffu", dst: "hhu" }, { src: "cchi", dst: "tti" }, 
        { src: "chi", dst: "ti" }, { src: "shi", dst: "si" }, { src: "tsu", dst: "tu" }, 
        { src: "fu", dst: "hu" }, { src: "ji", dst: "zi" }, { src: "cha", dst: "tya" }, 
        { src: "chu", dst: "tyu" }, { src: "cho", dst: "tyo" }, { src: "sha", dst: "sya" }, 
        { src: "shu", dst: "syu" }, { src: "sho", dst: "syo" }, { src: "ja", dst: "zya" }, 
        { src: "ju", dst: "zyu" }, { src: "jo", dst: "zyo" }, { src: "ka", dst: "ca" }
    ];
    let queue = [baseRomaji]; let visited = new Set(queue);
    while(queue.length > 0) {
        let curr = queue.shift();
        for (let rule of rules) {
            if (curr.includes(rule.src)) {
                let next = curr.replace(new RegExp(rule.src, 'g'), rule.dst);
                if (!visited.has(next)) { visited.add(next); queue.push(next); }
            }
            if (curr.includes(rule.dst)) {
                let next = curr.replace(new RegExp(rule.dst, 'g'), rule.src);
                if (!visited.has(next)) { visited.add(next); queue.push(next); }
            }
        }
    }
    return Array.from(visited);
}

function startGame() {
    if (isMobile) mobileInput.focus();

    remainingWords = wordList.filter(word => saveData.unlocked[word.category] && saveData.activeSwitch[word.category]);
    if (remainingWords.length === 0) { remainingWords = wordList.filter(word => word.category === "japan"); }

    const hourglassLv = saveData.equippedSkills.hourglass || 0;
    timeLeft = 60 + (hourglassLv * 2); 

    activeDrinkEffect = false; activeCurryEffect = false; activeBentoEffect = false;

    if (saveData.itemSwitch.drink && (saveData.items.drink || 0) > 0) {
        activeDrinkEffect = true; saveData.items.drink -= 1; if (saveData.items.drink <= 0) saveData.itemSwitch.drink = false;
    }
    if (saveData.itemSwitch.curry && (saveData.items.curry || 0) > 0) {
        activeCurryEffect = true; saveData.items.curry -= 1; if (saveData.items.curry <= 0) saveData.itemSwitch.curry = false;
    }
    if (saveData.itemSwitch.bento && (saveData.items.bento || 0) > 0) {
        activeBentoEffect = true; saveData.items.bento -= 1; if (saveData.items.bento <= 0) saveData.itemSwitch.bento = false;
    }
    saveGameData();

    isPlaying = true; solvedWordCount = 0; totalCharCount = 0; totalOriginalMoney = 0; missCount = 0; comboCount = 0; maxComboCount = 0; orderHistory = []; 
    
    startScreen.classList.add("hidden"); resultScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    document.body.classList.add("ingame");
    penaltyPopElement.classList.remove("popup-animation"); timerElement.classList.remove("shake-animation"); timerElement.classList.remove("urgent"); comboContainer.textContent = ""; 
    document.getElementById("urgent-overlay").classList.remove("active");
    bgmTracks.game.playbackRate = 1.0;
    resetCharacterImg();

    switchScreen("game");

    timerElement.textContent = `残り時間: ${timeLeft} 秒`;
    timerInterval = setInterval(() => {
        timeLeft--; timerElement.textContent = `残り時間: ${timeLeft} 秒`;

        if (timeLeft === 10) {
            timerElement.classList.add("urgent");
            document.getElementById("urgent-overlay").classList.add("active");
            if (bgmTracks.game && !bgmTracks.game.paused) {
                bgmTracks.game.playbackRate = 1.35;
            }
            const warnSnd = sounds.shout.cloneNode(true);
            warnSnd.playbackRate = 1.6;
            warnSnd.volume = 0.5;
            warnSnd.play().catch(e => {});
        }

        if (timeLeft <= 0) endGame();
    }, 1000);

    nextWord();
    if (isMobile) { setTimeout(() => { mobileInput.focus(); }, 150); }
}

function nextWord() {
    typedBuffer = ""; 
    if (remainingWords.length === 0) {
        remainingWords = wordList.filter(word => saveData.unlocked[word.category] && saveData.activeSwitch[word.category]);
        if (remainingWords.length === 0) remainingWords = wordList.filter(word => word.category === "japan");
    }

    const megaphoneLv = saveData.equippedSkills.megaphone || 0;
    let pool = [...remainingWords];
    
    if (megaphoneLv > 0) {
        pool.sort((a, b) => b.romaji.length - a.romaji.length);
        const cutSize = Math.max(3, Math.ceil(pool.length / (6 - megaphoneLv)));
        pool = pool.slice(0, cutSize);
    }

    const randomIndex = Math.floor(Math.random() * pool.length);
    const targetWord = pool[randomIndex];
    
    const origIndex = remainingWords.indexOf(targetWord);
    if (origIndex > -1) remainingWords.splice(origIndex, 1);

    currentWord = { ja: targetWord.ja, romaji: targetWord.romaji, category: targetWord.category };
    currentWord.variants = getRomajiVariants(currentWord.romaji);
    displayRomaji = currentWord.romaji; 
    wordJaElement.textContent = currentWord.ja;
    updateRomajiDisplay();
}

function updateRomajiDisplay() {
    const typedPart = displayRomaji.substring(0, typedBuffer.length);
    const untypedPart = displayRomaji.substring(typedBuffer.length);
    wordRomajiElement.innerHTML = `<span class="typed">${typedPart}</span><span class="untyped">${untypedPart}</span>`;
}

function handleCharInput(char) {
    if (!isPlaying) return;
    let inputChar = char.toLowerCase();
    if (inputChar === '.') inputChar = '-';
    if (!/[a-z\-]/.test(inputChar)) return; 

    const nextBuffer = typedBuffer + inputChar;
    const matchingVariants = currentWord.variants.filter(v => v.startsWith(nextBuffer));

    if (matchingVariants.length > 0) {
        typedBuffer = nextBuffer; totalCharCount++;
        comboCount += activeDrinkEffect ? 2 : 1;
        if (comboCount > maxComboCount) maxComboCount = comboCount;

        triggerComboMilestone(comboCount);

        if (comboCount >= 3) {
            comboContainer.textContent = `${comboCount} Combo!`; comboContainer.classList.remove("combo-pop");
            void comboContainer.offsetWidth; comboContainer.classList.add("combo-pop");
        } else { comboContainer.textContent = ""; }

        wordRomajiElement.classList.remove("bounce-effect"); void wordRomajiElement.offsetWidth; wordRomajiElement.classList.add("bounce-effect");
        playBoostedTypeSound(comboCount);

        if (!displayRomaji.startsWith(typedBuffer)) { displayRomaji = matchingVariants[0]; }
        updateRomajiDisplay();

        if (typedBuffer === displayRomaji) {
            solvedWordCount++;
            const baseWordPrice = displayRomaji.length * 100; 
            totalOriginalMoney += baseWordPrice;
            orderHistory.push({ name: currentWord.ja, price: baseWordPrice, category: currentWord.category });
            
            sounds.chew.currentTime = 0; sounds.chew.play().catch(e => {});
            characterImgElement.src = getCurrentCostume().eat; characterImgElement.style.transform = 'scale(1.1)';
            if (mouthOpenTimeout) clearTimeout(mouthOpenTimeout);
            mouthOpenTimeout = setTimeout(resetCharacterImg, 1500);

            nextWord();
        }
    } else {
        const apronLv = saveData.equippedSkills.apron || 0;
        if (Math.random() < (apronLv * 0.1)) { comboCount = 0; comboContainer.textContent = ""; return; } 

        missCount++; comboCount = 0; comboContainer.textContent = "";
        const penaltyTime = activeCurryEffect ? 0.5 : 1.0;
        timeLeft = Math.max(0, timeLeft - penaltyTime);
        timerElement.textContent = `残り時間: ${Math.ceil(timeLeft)} 秒`;
        
        penaltyPopElement.textContent = activeCurryEffect ? "-0.5秒" : "-1秒";
        penaltyPopElement.classList.remove("popup-animation"); void penaltyPopElement.offsetWidth; penaltyPopElement.classList.add("popup-animation");
        timerElement.classList.remove("shake-animation"); void timerElement.offsetWidth; timerElement.classList.add("shake-animation");
        
        gameContainer.style.backgroundColor = "rgba(255, 200, 200, 0.95)";
        setTimeout(() => { if (isPlaying) gameContainer.style.backgroundColor = "rgba(255, 255, 255, 0.92)"; }, 100);

        const clonedShout = sounds.shout.cloneNode(true); clonedShout.play().catch(e => {});
        characterImgElement.src = getCurrentCostume().miss; characterImgElement.style.transform = 'scale(1.1)';
        if (mouthOpenTimeout) clearTimeout(mouthOpenTimeout);
        mouthOpenTimeout = setTimeout(resetCharacterImg, 1000);
    }
}

function handleKeyDown(event) {
    if (isMobile) return;
    if (!isPlaying || event.key.length > 1 || event.ctrlKey || event.altKey || event.metaKey) return;
    handleCharInput(event.key);
}

function resetCharacterImg() { characterImgElement.src = getCurrentCostume().normal; characterImgElement.style.transform = 'scale(1)'; }

function endGame() {
    isPlaying = false; clearInterval(timerInterval);
    if (mouthOpenTimeout) clearTimeout(mouthOpenTimeout);

    timerElement.classList.remove("urgent");
    document.getElementById("urgent-overlay").classList.remove("active");
    bgmTracks.game.playbackRate = 1.0;

    switchScreen("result"); gameContainer.style.backgroundColor = "rgba(255, 255, 255, 0.92)"; document.body.classList.remove("ingame");
    sounds.cash.currentTime = 0; sounds.cash.play().catch(e => {});
    gameScreen.classList.add("hidden"); resultScreen.classList.remove("hidden");
    if (resultCharacterImgElement) resultCharacterImgElement.src = getCurrentCostume().eat;
    if (isMobile) mobileInput.blur();

    let receiptItemsHtml = "";
    let categoryCounts = { china:0, america:0, italy:0, sweet:0, asia:0, europe:0, space:0 };

    orderHistory.forEach(item => {
        receiptItemsHtml += `<div class="receipt-row"><span>・${item.name}</span><span>￥${item.price.toLocaleString()}</span></div>`;
        if(categoryCounts[item.category] !== undefined) {
            categoryCounts[item.category]++;
        }
    });
    if (orderHistory.length === 0) { receiptItemsHtml = `<div class="receipt-row" style="color:#7f8c8d;"><span>（客足ゼロ）</span><span>￥0</span></div>`; }

    let subtotal = totalOriginalMoney;
    const panLv = saveData.equippedSkills.pan || 0;
    const panBonusRatio = panLv * 0.1; 
    const panBonusMoney = Math.floor(subtotal * panBonusRatio);

    let drinkBonusMoney = 0;
    if (activeDrinkEffect && maxComboCount >= 10) {
        drinkBonusMoney = Math.floor(subtotal * 0.15); 
    }

    let developmentBonusMoney = 0;
    let bonusRowsHtml = "";

    if (panBonusMoney > 0) {
        bonusRowsHtml += `<div class="receipt-bonus-row"><span>└ 🍳 黄金のフライパン(Lv.${panLv})</span><span>+￥${panBonusMoney.toLocaleString()}</span></div>`;
    }
    if (drinkBonusMoney > 0) {
        bonusRowsHtml += `<div class="receipt-bonus-row"><span>└ 🧪 栄養ドリンク(大入りコンボ)</span><span>+￥${drinkBonusMoney.toLocaleString()}</span></div>`;
    }

    for (let cat in categoryBonusConfig) {
        if (categoryCounts[cat] > 0) {
            let basePerCount = categoryBonusConfig[cat].perCount;
            if (activeBentoEffect) {
                basePerCount = Math.floor(basePerCount * 1.5);
            }
            const totalCatBonus = basePerCount * categoryCounts[cat];
            developmentBonusMoney += totalCatBonus;

            const iconStr = shopCategories.find(s => s.id === cat)?.icon || "🍳";
            const itemLabel = activeBentoEffect ? `└ ${iconStr} ${categoryBonusConfig[cat].name}(1.5倍)` : `└ ${iconStr} ${categoryBonusConfig[cat].name}`;
            bonusRowsHtml += `<div class="receipt-bonus-row" style="color:#e67e22;"><span>${itemLabel} (×${categoryCounts[cat]}回)</span><span>+￥${totalCatBonus.toLocaleString()}</span></div>`;
        }
    }

    const finalSubtotal = subtotal + panBonusMoney + drinkBonusMoney + developmentBonusMoney;
    const tax = Math.floor(finalSubtotal * 0.1);
    const grandTotal = finalSubtotal + tax; 

    let trophyAlerts = [];
    if (grandTotal >= 10000 && !saveData.trophies[0]) { saveData.trophies[0] = true; trophyAlerts.push(trophyConfig[0].name); }
    if (grandTotal >= 100000 && !saveData.trophies[1]) { saveData.trophies[1] = true; trophyAlerts.push(trophyConfig[1].name); }
    if (maxComboCount >= 20 && !saveData.trophies[3]) { saveData.trophies[3] = true; trophyAlerts.push(trophyConfig[3].name); }
    if (missCount <= 3 && solvedWordCount >= 30 && !saveData.trophies[4]) { saveData.trophies[4] = true; trophyAlerts.push(trophyConfig[4].name); }
    if (grandTotal >= 1000000 && !saveData.trophies[5]) { saveData.trophies[5] = true; trophyAlerts.push(trophyConfig[5].name); }

    saveData.totalSales += grandTotal; 
    if (saveData.totalSales >= 1000000 && !saveData.trophies[2]) { saveData.trophies[2] = true; trophyAlerts.push(trophyConfig[2].name); }
    
    saveGameData();

    if (trophyAlerts.length > 0) {
        setTimeout(() => {
            alert(`✨🏆 トロフィー獲得！！ 🏆✨\n\n・${trophyAlerts.join('\n・')}\n\n「トロフィー＆貯蔵庫」に飾られました！`);
        }, 800);
    }

    let rankName = "お腹ペコペコ一般人";
    if (grandTotal === 0) rankName = "ただの通行人";
    else if (grandTotal <= 5000) rankName = "ちょい食いお馴染みさん";
    else if (grandTotal <= 25000) rankName = "常連のプロ食いしん坊";
    else if (grandTotal <= 150000) rankName = "精鋭フードファイター";
    else if (grandTotal <= 1000000) rankName = "三ツ星メガ食堂オーナー";
    else rankName = "伝説のもっちゃもっちゃ天帝";

    const now = new Date();
    const dateStr = `${now.getFullYear()}/${now.getMonth()+1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

    let activeItemsText = [];
    if (activeDrinkEffect) activeItemsText.push("🧪ドリンク");
    if (activeCurryEffect) activeItemsText.push("🍛激辛カレー");
    if (activeBentoEffect) activeItemsText.push("🍱特製お弁当箱");
    let itemSectionHtml = activeItemsText.length > 0 ? `<div style="font-size:0.75rem; color:#27ae60; text-align:center; margin-bottom:5px;">発動アイテム: ${activeItemsText.join(" / ")}</div>` : "";

    resultElement.innerHTML = `
        <div class="receipt" id="receipt-box">
            <div class="receipt-title">もっちゃもっちゃ食堂</div>
            <div class="receipt-subtitle">${dateStr}  伝票明細</div>
            <div class="receipt-line"></div>
            <div style="text-align: center; font-weight: bold; font-size: 1.1rem; margin: 10px 0; color: #2c3e50;">称号：${rankName}</div>
            ${itemSectionHtml}
            <div class="receipt-line"></div>
            <div class="receipt-row" style="font-weight: bold; color: #e67e22;"><span>最高連続コンボ</span><span>${maxComboCount} Combo!</span></div>
            <div class="receipt-line"></div>
            <div class="receipt-item-list" id="receipt-list">${receiptItemsHtml}</div>
            <div class="receipt-line"></div>
            <div class="receipt-row"><span>料理基本売上 (${solvedWordCount}品)</span><span>￥${subtotal.toLocaleString()}</span></div>
            ${bonusRowsHtml}
            <div class="receipt-line"></div>
            <div class="receipt-row"><span>税抜総合計</span><span>￥${finalSubtotal.toLocaleString()}</span></div>
            <div class="receipt-row"><span>消費税 (10%)</span><span>￥${tax.toLocaleString()}</span></div>
            <div class="receipt-line"></div>
            <div class="receipt-bold-row"><span>今回獲得した売上(税込)</span><span>￥${grandTotal.toLocaleString()}</span></div>
        </div>
        <p style="font-size:1rem; font-weight:bold; color:#4a3728;">合計 ${totalCharCount} 文字タイピングしました！（ミス: ${missCount}回）</p>
    `;

    saveReceiptBtn.onclick = function() {
        const target = document.getElementById("receipt-box"); const list = document.getElementById("receipt-list");
        const originalMaxHeight = list.style.maxHeight; list.style.maxHeight = "none";
        html2canvas(target, { scale: 2, backgroundColor: "#ffffff" }).then(canvas => {
            list.style.maxHeight = originalMaxHeight;
            const link = document.createElement("a"); link.download = `moccha_shokudo_receipt.png`; link.href = canvas.toDataURL("image/png"); link.click();
        }).catch(err => { list.style.maxHeight = originalMaxHeight; alert("保存に失敗しました。"); });
    };

    shareReceiptBtn.onclick = async function() {
        const target = document.getElementById("receipt-box"); const list = document.getElementById("receipt-list");
        const originalMaxHeight = list.style.maxHeight; list.style.maxHeight = "none";
        try {
            const canvas = await html2canvas(target, { scale: 2, backgroundColor: "#ffffff" });
            list.style.maxHeight = originalMaxHeight;
            const dataUrl = canvas.toDataURL("image/png"); const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], 'receipt.png', { type: 'image/png' });
            const shareData = {
                title: 'もっちゃもっちゃ食堂',
                text: `今日のもっちゃもっちゃ食堂の売上は【${grandTotal.toLocaleString()}円】！称号は【${rankName}】でした！ #もっちゃもっちゃ食堂`,
            };
            if (navigator.canShare && navigator.canShare({ files: [file] })) { shareData.files = [file]; await navigator.share(shareData); }
            else if (navigator.share) { await navigator.share(shareData); }
            else { alert("「レシートを保存」から画像を保存してSNSに投稿してね！"); }
        } catch (err) { list.style.maxHeight = originalMaxHeight; }
    };
}

window.onload = function() { loadGameData(); };
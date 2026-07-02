// 効果音
export const sounds = {
    chew: new Audio('assets/sounds/chew.mp3'),
    cash: new Audio('assets/sounds/cash.mp3'),
    shout: new Audio('assets/sounds/shout.mp3'),
    type: new Audio('assets/sounds/type.mp3'),
    enter: new Audio('assets/sounds/enter.mp3'),
    move: new Audio('assets/sounds/move.mp3'),
    return: new Audio('assets/sounds/return.mp3')
};
sounds.shout.volume = 0.6;
sounds.type.volume = 0.9;

export function playBoostedTypeSound(currentCombo) {
    const sound = sounds.type.cloneNode(true);
    sound.volume = 0.9;
    sound.play().catch(e => {});
}

// BGM
export const bgmTracks = {
    title: new Audio('assets/sounds/home_bgm.mp3'),
    home: new Audio('assets/sounds/game_bgm.mp3'),
    game: new Audio('assets/sounds/bgm.mp3'),
    shop: new Audio('assets/sounds/shop_bgm.mp3'),
    trophy: new Audio('assets/sounds/trophy_bgm.mp3'),
    storage: new Audio('assets/sounds/storage_bgm.mp3'),
    lounge: new Audio('assets/sounds/lounge_bgm.mp3')
};
Object.values(bgmTracks).forEach(track => { track.loop = true; track.volume = 0.4; });

export let currentBgmKey = null;

export function playBGM(key) {
    if (currentBgmKey === key) return;
    if (currentBgmKey && bgmTracks[currentBgmKey]) {
        bgmTracks[currentBgmKey].pause();
        bgmTracks[currentBgmKey].currentTime = 0;
    }
    currentBgmKey = key;
    const track = bgmTracks[key];
    if (track) { track.currentTime = 0; track.play().catch(e => {}); }
}

export function unlockBGMOnFirstInteraction() {
    const track = bgmTracks[currentBgmKey];
    if (track && track.paused) {
        track.play().catch(() => {});
    }
}

// ホーム画面の背景を変更（アップロード画像を assets/img/counter_bg.jpg として配置する前提）
export const bgImages = {
    title: 'assets/img/bg.png',
    home: 'assets/img/counter_bg.jpg', // カウンターの背景画像に変更
    game: 'assets/img/game_bg.png',
    result: 'assets/img/game_bg.png',
    shop: 'assets/img/shop_bg.png',
    trophy: 'assets/img/trophy_bg.png',
    storage: 'assets/img/storage_bg.png',
    lounge: 'assets/img/lounge_bg.png'
};
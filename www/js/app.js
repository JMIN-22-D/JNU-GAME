// localStorage 기반 window.storage (게임 저장 및 복약 인증 데이터가 실제 기기에 남도록)
    if (!window.storage) {
        window.storage = {
            async get(key) {
                try {
                    const raw = localStorage.getItem(key);
                    return raw === null ? null : { value: raw };
                } catch (e) { return null; }
            },
            async set(key, value) {
                try { localStorage.setItem(key, value); return true; }
                catch (e) { return false; }
            },
            async delete(key) {
                try { localStorage.removeItem(key); } catch (e) {}
            }
        };
    }

    // ===================================================================
    // 긴급 연락처
    // 개발 중에 실수로 119/112에 진짜 전화가 걸리면 안 되므로 테스트 번호로
    // 돌려두는 스위치입니다. 스토어에 올릴 빌드에서는 반드시 false 로 두세요.
    //
    // HTML의 href에는 처음부터 진짜 번호가 박혀 있고 테스트 모드일 때만
    // 자바스크립트가 덮어씁니다. 스크립트가 어떤 이유로든 실행되지 않아도
    // 실제 긴급번호로 연결되는 쪽이 안전하기 때문입니다.
    // ===================================================================
    // EMERGENCY_MODE 로 동작을 고릅니다.
    //   'live'     실제 긴급번호로 연결합니다. 스토어에 올릴 빌드는 반드시 이 값.
    //   'block'    전화를 걸지 않고 "어떤 번호로 연결될지"만 안내합니다.
    //              여러 사람에게 뿌리는 테스트 배포(깃허브 등)의 기본값입니다.
    //   'redirect' EMERGENCY_TEST_NUMBER 로 진짜 전화를 겁니다.
    //              연결까지 직접 확인할 때만 혼자서 잠깐 쓰세요.
    //
    // 'redirect' 로 여러 명에게 배포하면 테스터가 긴급 버튼을 누를 때마다
    // 그 번호 주인에게 실제로 전화가 갑니다. 공개 저장소에 개인 번호가
    // 남는 문제도 있어서, 기본값은 아무에게도 걸리지 않는 'block' 입니다.
    const EMERGENCY_MODE = 'block';            // ← 스토어 배포 전 'live'
    const EMERGENCY_TEST_NUMBER = "";          // 'redirect' 쓸 때만 잠깐 넣고, 커밋 전에 비우세요

    const EMERGENCY_NUMBERS = {
        fire:    "119",   // 화재·구조·구급
        police:  "112",   // 경찰
        suicide: "109",   // 자살예방 상담전화 (24시간)
        counsel: "1393"   // 자살예방상담
    };
    const EMERGENCY_LABELS = {
        fire:    "119 소방·구급",
        police:  "112 경찰",
        suicide: "109 자살예방 상담전화",
        counsel: "1393 자살예방상담"
    };

    function emergencyRealNumber(kind) {
        return EMERGENCY_NUMBERS[kind] || EMERGENCY_NUMBERS.suicide;
    }

    function emergencyTel(kind) {
        if (EMERGENCY_MODE === 'redirect' && EMERGENCY_TEST_NUMBER) return EMERGENCY_TEST_NUMBER;
        return emergencyRealNumber(kind);
    }

    // data-emergency 가 붙은 링크를 현재 모드에 맞게 손봅니다
    function applyEmergencyNumbers(root) {
        const scope = root || document;
        scope.querySelectorAll('[data-emergency]').forEach(function (a) {
            const kind = a.getAttribute('data-emergency');

            if (EMERGENCY_MODE === 'block') {
                // href 를 없애야 전화 앱이 뜨지 않습니다
                a.removeAttribute('href');
                a.style.cursor = 'pointer';
                a.onclick = function (e) { e.preventDefault(); showEmergencyBlocked(kind); };
            } else {
                a.href = 'tel:' + emergencyTel(kind);
                a.onclick = null;
            }

            if (EMERGENCY_MODE !== 'live' && !a.querySelector('.tel-test-flag')) {
                a.insertAdjacentHTML('beforeend', ' <span class="tel-test-flag">(테스트)</span>');
            }
        });
    }

    // 'block' 모드에서 전화 대신 띄우는 안내.
    // 진짜로 도움이 필요한 사람이 이 화면에서 막히면 안 되므로,
    // 걸어야 할 번호를 크게 알려주고 직접 걸 수 있게 안내합니다.
    function showEmergencyBlocked(kind) {
        let ov = document.getElementById('emg-block-view');
        if (!ov) {
            ov = document.createElement('div');
            ov.id = 'emg-block-view';
            ov.innerHTML =
                '<div class="emg-block-card">' +
                    '<h4>테스트 배포라 전화를 걸지 않았어요</h4>' +
                    '<p id="emg-block-msg"></p>' +
                    '<button type="button" onclick="closeEmergencyBlocked()">알겠어요</button>' +
                '</div>';
            document.body.appendChild(ov);
            ov.addEventListener('click', function (e) {
                if (e.target === ov) closeEmergencyBlocked();
            });
        }
        // 번호마다 "로/으로"가 갈려서(119로 / 1393으로) 조사를 붙이지 않는 문장으로 씁니다
        document.getElementById('emg-block-msg').innerHTML =
            '정식 앱에서는 아래로 연결돼요.<br>' +
            '<b>' + (EMERGENCY_LABELS[kind] || EMERGENCY_LABELS.suicide) + '</b>' +
            '<br><br>지금 정말 도움이 필요하다면 전화 앱에서 직접 ' +
            '<b class="emg-block-num">' + emergencyRealNumber(kind) + '</b>번으로 걸어주세요.';
        ov.classList.add('show');
    }

    function closeEmergencyBlocked() {
        const ov = document.getElementById('emg-block-view');
        if (ov) ov.classList.remove('show');
    }

    document.addEventListener('DOMContentLoaded', function () { applyEmergencyNumbers(); });

    function hideSplash() {
        const splash = document.getElementById('splash-view');
        if (splash) splash.classList.add('hide');
    }

    function selectSignal(color) {
        const labels = {
            red: '🔴 지금 위험해요',
            orange: '🟠 조금 힘들어요',
            green: '🟢 지금은 괜찮아요'
        };
        ['red', 'orange', 'green'].forEach(c => {
            document.getElementById('light-' + c).classList.toggle('active', c === color);
            document.getElementById('signal-panel-' + c).classList.toggle('active', c === color);
        });
        document.getElementById('signal-label').innerText = labels[color];
        // [4] 감정-날씨 동기화 — 오늘 마음 상태가 미니게임 하늘로도 이어집니다.
        // 힘든 날엔 작물도 천천히 자라요. 서두르지 않아도 된다는 뜻으로 뒀습니다.
        syncWeatherToSignal(color);
    }

    let currentExp = 0;
    let currentLevel = 0;
    let hunger = 100, love = 100, energy = 100;
    let asleep = false;
    let elapsedSeconds = 0;
    let gameStarted = false;
    let tickIntervalStarted = false;
    let lastWarn = { hunger: false, energy: false, love: false };

    // 케어 성향/품질 추적용
    let feedCount = 0;
    let petCount = 0;
    let sleepSeconds = 0;
    let careSum = 0;
    let careTicks = 0;

    // 미션용 누적 카운터 (펫을 리셋해도 초기화되지 않음)
    let totalFeedCount = 0;
    let totalPetCount = 0;
    let harvestCount = 0;
    let fishCaughtCount = 0;
    let walkCount = 0;
    let oreMinedCount = 0;
    let landBought = 0;

    // 이번 판에서 확정된 최종 변이 (없으면 null)
    let finalVariant = null;

    // 수집한 변이 목록: { "feed-radiant": count, ... }
    let collected = {};

    // ===== 농장/상점/낚시 자원 (플레이 전체에서 유지) =====
    const cropTypes = {
        wheat:      { name: "밀",     emoji: "🌾", growDuration: 25, seedCost: 3,  sellPrice: 2 },
        carrot:     { name: "당근",   emoji: "🥕", growDuration: 35, seedCost: 5,  sellPrice: 4 },
        potato:     { name: "감자",   emoji: "🥔", growDuration: 45, seedCost: 7,  sellPrice: 6 },
        tomato:     { name: "토마토", emoji: "🍅", growDuration: 55, seedCost: 10, sellPrice: 9 },
        strawberry: { name: "딸기",   emoji: "🍓", growDuration: 70, seedCost: 14, sellPrice: 13 },
        tangerine:  { name: "감귤",   emoji: "🍊", growDuration: 90, seedCost: 20, sellPrice: 19 }
    };
    // 비싸고 오래 걸리는 재료일수록 적은 양으로 요리가 되고, 밥의 품질(포만감 회복량)도 더 좋음
    const cookRatios = {
        wheat: 3, carrot: 2, potato: 1, tomato: 2, strawberry: 1, tangerine: 1,
        anchovy: 2, mackerel: 1, squid: 1, octopus: 1
    };
    // [3] 가치 사슬 — buff 필드가 붙은 요리는 먹이면 5분짜리 액티브 버프가 켜집니다.
    // 농사/낚시 → 요리 → 버프 → 채굴·낚시 이득 으로 순환이 이어지도록 배치했어요.
    //
    // buyCost — 상점에서 밥을 '완성된 채로' 사는 값.
    // 재료를 키워서 직접 만드는 쪽이 늘 싸도록, 재료를 그냥 팔았을 때
    // 받는 돈의 두 배쯤으로 잡았습니다. 사 먹는 건 급할 때 쓰는 지름길이지
    // 농사·낚시를 대신하는 길이 되면 안 되니까요.
    // (기준: 포만감 x1.1 + 버프가 붙으면 +10)
    const mealTypes = {
        wheat:      { emoji: "🍚", label: "밀밥",       hungerRestore: 12, exp: 10, buyCost: 13 },
        carrot:     { emoji: "🥕", label: "당근밥",     hungerRestore: 16, exp: 12, buff: "growfast", buyCost: 28 },
        potato:     { emoji: "🥔", label: "감자밥",     hungerRestore: 20, exp: 15, buff: "mine2x",   buyCost: 32 },
        tomato:     { emoji: "🍲", label: "토마토스프", hungerRestore: 24, exp: 18, buff: "fishfast", buyCost: 36 },
        strawberry: { emoji: "🍰", label: "딸기케이크", hungerRestore: 28, exp: 22, buff: "luck",     buyCost: 41 },
        tangerine:  { emoji: "🧃", label: "감귤주스",   hungerRestore: 32, exp: 26, buff: "growfast", buyCost: 45 },
        anchovy:    { emoji: "🍢", label: "멸치볶음",   hungerRestore: 10, exp: 8,  buyCost: 11 },
        mackerel:   { emoji: "🍱", label: "고등어구이", hungerRestore: 15, exp: 13, buff: "fishfast", buyCost: 27 },
        squid:      { emoji: "🍜", label: "오징어볶음", hungerRestore: 20, exp: 17, buff: "mine2x",   buyCost: 32 },
        octopus:    { emoji: "🥘", label: "문어탕",     hungerRestore: 26, exp: 23, buff: "luck",     buyCost: 39 }
    };

    // ===== 농장 부지 (여러 곳, 코인으로 개방/확장) =====
    //
    // toolCost — 그 농장에만 쓰는 '농기구' 값.
    // 한 번 사면 그 농장에서 한번에 심기·한번에 수확을 쓸 수 있습니다.
    // 농장마다 따로 사야 해요. 하나 샀다고 전부 편해지면 뒤에 여는
    // 농장이 시시해지니까요. 값은 그 농장을 여는 값에 맞춰 올라갑니다.
    const farmFields = {
        home: {
            name: "우리 텃밭", emoji: "🏡", unlockCost: 0, baseSlots: 4, maxSlots: 8,
            slotCostBase: 25, slotCostStep: 15, crops: ["wheat", "carrot", "potato"],
            desc: "처음부터 주어진 작고 소중한 밭이에요", toolCost: 70
        },
        green: {
            name: "비닐하우스", emoji: "🪴", unlockCost: 80, baseSlots: 2, maxSlots: 8,
            slotCostBase: 40, slotCostStep: 20, crops: ["tomato", "strawberry"],
            desc: "따뜻해서 더 귀한 작물을 키울 수 있어요", toolCost: 130
        },
        orchard: {
            name: "감귤 과수원", emoji: "🍊", unlockCost: 220, baseSlots: 2, maxSlots: 8,
            slotCostBase: 60, slotCostStep: 30, crops: ["tangerine"],
            desc: "제주의 햇살을 담은 감귤을 키워요", toolCost: 200
        }
    };
    const fieldOrder = ["home", "green", "orchard"];
    let fieldsUnlocked = { home: true, green: false, orchard: false };
    // 농장별로 따로 사는 농기구 (한번에 심기 · 한번에 수확)
    let fieldTools = { home: false, green: false, orchard: false };
    let fieldPlots = {
        home: [
            { state: "empty", crop: null, start: 0 },
            { state: "empty", crop: null, start: 0 },
            { state: "empty", crop: null, start: 0 },
            { state: "empty", crop: null, start: 0 }
        ],
        green: [],
        orchard: []
    };
    let currentField = null; // null이면 농장 입구 화면

    let cropSeeds = { wheat: 5, carrot: 0, potato: 0, tomato: 0, strawberry: 0, tangerine: 0 };
    let cropInventory = { wheat: 0, carrot: 0, potato: 0, tomato: 0, strawberry: 0, tangerine: 0 };
    let selectedCrop = "wheat";
    let mealInventory = {
        wheat: 2, carrot: 0, potato: 0, tomato: 0, strawberry: 0, tangerine: 0,
        anchovy: 0, mackerel: 0, squid: 0, octopus: 0
    };
    let coins = 15;
    let farmTick = 0; // 게임 리셋과 무관하게 계속 흐르는 농장 전용 시간

    // ===== 광산 =====
    const oreTypes = {
        stone:   { name: "돌",         emoji: "🪨", sellPrice: 2 },
        iron:    { name: "철광석",     emoji: "⚙️", sellPrice: 5 },
        crystal: { name: "수정",       emoji: "🔮", sellPrice: 11 },
        diamond: { name: "다이아몬드", emoji: "💎", sellPrice: 26 }
    };
    const oreOrder = ["stone", "iron", "crystal", "diamond"];
    let oreInventory = { stone: 0, iron: 0, crystal: 0, diamond: 0 };
    const pickLevels = [
        { emoji: "⛏️",   name: "낡은 곡괭이",       power: 1.0,  durabilityMax: 8,  upgradeCost: 35,  multiChance: 0.12 },
        { emoji: "⛏️✨", name: "단단한 곡괭이 +1",  power: 1.25, durabilityMax: 12, upgradeCost: 70,  multiChance: 0.26 },
        { emoji: "⛏️💠", name: "빛나는 곡괭이 +2",  power: 1.5,  durabilityMax: 16, upgradeCost: 130, multiChance: 0.42 },
        { emoji: "⛏️👑", name: "전설의 곡괭이 +3",  power: 1.9,  durabilityMax: 22, upgradeCost: 0,   multiChance: 0.60 }
    ];
    let pickLevel = 0;
    let pickDurability = pickLevels[0].durabilityMax;
    const PICK_REPAIR_COST = 8;

    // ===== 놀이 미니게임 =====
    let playBestScore = 0;
    let playTotalScore = 0;
    let playCount = 0;

    // ===== 꾸미기 (코인 사용처) =====
    // 하나만 착용할 수 있고, 착용 중인 장식이 병아리에게 특별한 능력을 줍니다
    const accessories = {
        ribbon:  { emoji: "🎀", name: "리본",     cost: 40,  desc: "애정도가 천천히 줄어요 (-25%)" },
        scarf:   { emoji: "🧣", name: "목도리",   cost: 70,  desc: "활력이 천천히 줄어요 (-25%)" },
        hat:     { emoji: "🎩", name: "모자",     cost: 110, desc: "얻는 경험치 +15%" },
        glasses: { emoji: "🕶️", name: "선글라스", cost: 150, desc: "낚시·채굴 대박 확률 +8%" },
        crown:   { emoji: "👑", name: "왕관",     cost: 300, desc: "위 효과를 조금씩 모두 가져요" }
    };
    const accessoryOrder = ["ribbon", "scarf", "hat", "glasses", "crown"];
    let ownedAccessories = {};
    let equippedAccessory = null;

    // 착용 중인 장식의 효과
    function accEffect() {
        const base = { loveDecay: 1, energyDecay: 1, exp: 1, multi: 0 };
        switch (equippedAccessory) {
            case "ribbon":  base.loveDecay = 0.75; break;
            case "scarf":   base.energyDecay = 0.75; break;
            case "hat":     base.exp = 1.15; break;
            case "glasses": base.multi = 0.08; break;
            case "crown":   base.loveDecay = 0.9; base.energyDecay = 0.9; base.exp = 1.1; base.multi = 0.04; break;
        }
        return base;
    }

    function addExp(amount) {
        currentExp += Math.round(amount * accEffect().exp);
    }

    // 낚시/채굴에서 한 번에 여러 개를 얻을 확률
    function rodMultiChance() { return rodLevels[rodLevel].multiChance + accEffect().multi; }
    function pickMultiChance() { return pickLevels[pickLevel].multiChance + accEffect().multi; }

    // ===== 즉시 사용 소모품 (코인 사용처) =====
    const SNACK_COST = 12;   // 간식: 애정도 회복
    const TONIC_COST = 15;   // 기운약: 활력 회복
    const WATER_COST = 18;   // 물뿌리개: 작물 하나 즉시 성장

    // ===== 마을에 기부하기 (코인 → 온기) =====
    //
    // 돈은 벌리는데 쓸 데가 없어서 넣었습니다.
    // 다만 온기는 원래 '병아리를 잘 돌본 정도'라서, 돈으로 다 살 수 있게
    // 하면 쓰다듬고 산책하는 일이 의미를 잃어요. 그래서 하루 세 번까지만
    // 받습니다. 하루 15 온기면 거들어 주는 정도지 대신하지는 못해요.
    const DONATE_COST = 60;     // 한 번 기부할 때 드는 코인
    const DONATE_WARMTH = 5;    // 그때 돌아오는 온기
    const DONATE_MAX_DAY = 3;   // 하루에 받을 수 있는 횟수
    let donateDate = "";
    let donateCount = 0;

    // ===== 낚시 (물고기 종류) =====
    const fishSpecies = {
        anchovy:  { name: "멸치",   emoji: "🐟", rarity: "common",    zoneWidth: 42, duration: 2.4, sellPrice: 2 },
        mackerel: { name: "고등어", emoji: "🐠", rarity: "uncommon",  zoneWidth: 30, duration: 1.9, sellPrice: 4 },
        squid:    { name: "오징어", emoji: "🦑", rarity: "rare",      zoneWidth: 20, duration: 1.5, sellPrice: 6 },
        octopus:  { name: "문어",   emoji: "🐙", rarity: "legendary", zoneWidth: 13, duration: 1.1, sellPrice: 10 }
    };
    const fishSpeciesOrder = ["anchovy", "mackerel", "squid", "octopus"];
    let fishInventory = { anchovy: 0, mackerel: 0, squid: 0, octopus: 0 };
    let currentFishSpecies = null;
    let captureGauge = 0;

    // ===== 산책 배경 =====
    // 하늘·산·나무·건물은 이제 CSS 가 SVG 로 그립니다(.scene-* 클래스).
    // 여기 deco 는 그 위에 얹는 앞쪽 소품만 남겼습니다 — 예전처럼 구름·나무까지
    // 이모지로 두면 그려진 풍경과 겹쳐서 지저분해져요.
    const walkScenes = {
        forest: { deco: [
            { e: "🌼", l: 22, t: 84 }, { e: "🍄", l: 68, t: 87 }, { e: "🌸", l: 47, t: 79 },
            { e: "🦋", l: 78, t: 46 }
        ]},
        beach: { deco: [
            { e: "☀️", l: 84, t: 9 }, { e: "🐚", l: 30, t: 88 }, { e: "🏖️", l: 63, t: 86 },
            { e: "🦀", l: 46, t: 90 }
        ]},
        campus: { deco: [
            { e: "🚩", l: 18, t: 60 }, { e: "🌳", l: 8, t: 78 }, { e: "🌳", l: 91, t: 76 },
            { e: "📚", l: 55, t: 88 }
        ]}
    };
    let currentWalkScene = "forest";

    // ===== 대장간 (낚싯대 강화) =====
    const rodLevels = [
        { emoji: "🎣", name: "기본 낚싯대", zoneBonus: 0, durationBonus: 0, durabilityMax: 6, upgradeCost: 15, multiChance: 0 },
        { emoji: "🎣✨", name: "강화 낚싯대 +1", zoneBonus: 5, durationBonus: 0.2, durabilityMax: 9, upgradeCost: 30, multiChance: 0.12 },
        { emoji: "🎣💠", name: "강화 낚싯대 +2", zoneBonus: 10, durationBonus: 0.4, durabilityMax: 12, upgradeCost: 55, multiChance: 0.24 },
        { emoji: "🎣🌟", name: "강화 낚싯대 +3", zoneBonus: 16, durationBonus: 0.6, durabilityMax: 16, upgradeCost: 90, multiChance: 0.38 },
        { emoji: "🎣👑", name: "전설의 낚싯대 +4", zoneBonus: 24, durationBonus: 0.9, durabilityMax: 22, upgradeCost: 0, multiChance: 0.55 }
    ];
    let rodLevel = 0;
    let rodDurability = rodLevels[0].durabilityMax;
    const rodBreakChance = { common: 0, uncommon: 0.03, rare: 0.14, legendary: 0.28 };

    // ===== 산책 날씨 =====
    // ★ 날씨는 신호등(오늘 마음)과 연결돼 있습니다.
    //   그래서 어떤 날씨도 손해가 되면 안 됩니다 — "힘들다"고 고른 사람이
    //   활력을 더 깎이거나 애정을 덜 받으면, 솔직하게 고른 게 벌이 됩니다.
    //   힘든 날일수록 오히려 덜 지치고 애정이 더 붙도록 뒀습니다.
    const weatherTypes = {
        clear: { emoji: "☀️", label: "맑음",   energyMod: 1,    loveMod: 1 },
        hot:   { emoji: "🌥️", label: "흐림",   energyMod: 0.8,  loveMod: 1.2 },
        rain:  { emoji: "🌧️", label: "비",     energyMod: 0.7,  loveMod: 1.3 }
    };
    let currentWeather = "clear";

    // ===================================================================
    // Active Healing 모듈
    // 요구사항 [1] 시간대 사이클 / [2] 콤보·타격감 / [3] 요리 버프
    //          [4] 감정-날씨 동기화 · 우연한 발견
    //
    // 상태를 이 구역에 모아두고, 기존 게임 로직은 여기서 내보낸 helper 만
    // 불러 쓰도록 했습니다. 그래야 로직이 서로 얽히지 않아요.
    // ===================================================================

    // --- [1] 시간대 사이클 ---------------------------------------------
    // 실제 시각을 4구간으로 나눠 <html data-daytime> 에 적습니다.
    // 색은 CSS 변수(--sky-1 등)가 알아서 바뀌므로 JS 는 이 한 줄만 관리해요.
    function currentDaytime(h) {
        if (h < 6 || h >= 21) return "night";
        if (h < 11) return "morning";
        if (h < 17) return "day";
        return "evening";
    }

    let lastDaytime = null;
    function applyDaytime() {
        const key = currentDaytime(new Date().getHours());
        if (key === lastDaytime) return;
        lastDaytime = key;
        document.documentElement.setAttribute("data-daytime", key);
    }

    // 구름·별·입자를 한 번만 만들어 두고 CSS 애니메이션에 맡깁니다.
    // JS 는 매 프레임 아무것도 하지 않으므로 모바일에서도 60fps 가 유지돼요.
    function createAmbient() {
        const root = document.getElementById("ambient");
        if (!root || root.childElementCount) return;
        let html = "";
        ["a", "b", "c"].forEach((c, i) => {
            html += '<div class="amb-cloud ' + c + '" style="animation-delay:' + (i * -26) + 's"></div>';
        });
        for (let i = 0; i < 26; i++) {                    // 별 (밤에만 보임)
            html += '<div class="amb-star" style="left:' + (Math.random() * 100).toFixed(1) + '%;' +
                    'top:' + (Math.random() * 62).toFixed(1) + '%;' +
                    'animation-duration:' + (2.4 + Math.random() * 3).toFixed(1) + 's;' +
                    'animation-delay:' + (-Math.random() * 5).toFixed(1) + 's"></div>';
        }
        for (let i = 0; i < 14; i++) {                    // 떠다니는 반짝 입자
            html += '<div class="amb-mote" style="left:' + (Math.random() * 100).toFixed(1) + '%;' +
                    'top:' + (55 + Math.random() * 45).toFixed(1) + '%;' +
                    'animation-duration:' + (9 + Math.random() * 9).toFixed(1) + 's;' +
                    'animation-delay:' + (-Math.random() * 14).toFixed(1) + 's"></div>';
        }
        root.innerHTML = html;
    }

    // --- [2] 타격감: 흔들림 + 파티클 ------------------------------------
    function fxShake(el, big) {
        if (!el) return;
        const cls = big ? "fx-shake-lg" : "fx-shake";
        el.classList.remove("fx-shake", "fx-shake-lg");
        void el.offsetWidth;                              // 연타해도 다시 재생되도록
        el.classList.add(cls);
        setTimeout(() => el.classList.remove(cls), big ? 1000 : 340);
    }

    // 기존 .mine-spark 스타일을 그대로 재사용합니다 (--dx 로 퍼지는 방향 지정)
    function burstParticles(el, count, chars) {
        if (!el) return;
        const set = chars || ["✨", "💥", "⭐"];
        for (let i = 0; i < count; i++) {
            const s = document.createElement("span");
            s.className = "mine-spark";
            s.innerText = set[Math.floor(Math.random() * set.length)];
            s.style.left = (24 + Math.random() * 52) + "%";
            s.style.top = (30 + Math.random() * 34) + "%";
            s.style.setProperty("--dx", (Math.random() * 120 - 60).toFixed(0) + "px");
            s.style.animationDelay = (Math.random() * 0.12).toFixed(2) + "s";
            el.appendChild(s);
            setTimeout(() => s.remove(), 760);
        }
    }

    // --- [2] 콤보 시스템 -------------------------------------------------
    // 정해진 시간 안에 다음 입력이 들어오면 콤보가 이어지고, 끊기면 0 으로 돌아갑니다.
    // 획득량 배수는 comboMultiplier() 하나로만 계산해서 밸런스를 한곳에서 봅니다.
    const COMBO_WINDOW = { mine: 900, fish: 1400 };       // ms 안에 다음 입력이 와야 유지
    const comboState = { mine: { n: 0, at: 0 }, fish: { n: 0, at: 0 } };

    function bumpCombo(kind) {
        const st = comboState[kind];
        const now = Date.now();
        st.n = (now - st.at <= COMBO_WINDOW[kind]) ? st.n + 1 : 1;
        st.at = now;
        renderCombo(kind);
        return st.n;
    }

    function resetCombo(kind) {
        comboState[kind].n = 0;
        comboState[kind].at = 0;
        renderCombo(kind);
    }

    // 10콤보마다 +20%, 최대 2배까지만 (무한정 늘면 게임이 무너져요)
    function comboMultiplier(kind) {
        return Math.min(2, 1 + Math.floor(comboState[kind].n / 10) * 0.2);
    }

    function renderCombo(kind) {
        const el = document.getElementById(kind + "-combo");
        if (!el) return;
        const n = comboState[kind].n;
        if (n < 3) { el.classList.remove("show", "hot"); return; }
        const mult = comboMultiplier(kind);
        el.innerText = n + " COMBO" + (mult > 1 ? "  ×" + mult.toFixed(1) : "");
        el.classList.add("show");
        el.classList.remove("hot");
        void el.offsetWidth;
        el.classList.add("hot");
    }

    // --- [3] 요리 버프 ---------------------------------------------------
    // 밥을 먹이면 그 요리에 붙은 버프가 5분간 켜집니다.
    // "밥 → 버프 → 채굴/낚시 이득" 으로 가치 사슬이 이어지게 하는 장치예요.
    const BUFF_TYPES = {
        mine2x:   { emoji: "⛏️", label: "채굴 2배",   mult: 2 },
        fishfast: { emoji: "🎣", label: "입질 빨라짐", mult: 0.5 },
        growfast: { emoji: "🌱", label: "성장 1.5배", mult: 1.5 },
        luck:     { emoji: "🍀", label: "행운 2배",   mult: 2 }
    };
    const BUFF_DURATION = 5 * 60 * 1000;                  // 5분
    let activeBuffs = {};                                 // key -> 만료 시각(ms)

    function grantBuff(key) {
        if (!BUFF_TYPES[key]) return;
        activeBuffs[key] = Date.now() + BUFF_DURATION;    // 다시 먹으면 시간 갱신
        renderBuffBar();
    }

    function hasBuff(key) {
        return !!activeBuffs[key] && activeBuffs[key] > Date.now();
    }

    // 버프가 없으면 1(=영향 없음)을 돌려주므로 호출부에서 분기할 필요가 없습니다
    function buffMult(key) {
        return hasBuff(key) ? BUFF_TYPES[key].mult : 1;
    }

    function renderBuffBar() {
        const bar = document.getElementById("buff-bar");
        if (!bar) return;
        const now = Date.now();
        let html = "";
        Object.keys(activeBuffs).forEach(k => {
            const left = activeBuffs[k] - now;
            if (left <= 0) { delete activeBuffs[k]; return; }
            const b = BUFF_TYPES[k];
            const m = Math.floor(left / 60000);
            const s = Math.floor((left % 60000) / 1000);
            html += '<span class="buff-chip' + (left < 30000 ? " ending" : "") + '">' +
                    '<span class="bc-ico">' + b.emoji + '</span>' + b.label +
                    '<span class="bc-time">' + m + ":" + String(s).padStart(2, "0") + '</span></span>';
        });
        bar.innerHTML = html;
    }

    // --- [4] 감정 - 날씨 동기화 ------------------------------------------
    // 마음 신호등에서 고른 색이 미니게임 날씨가 됩니다.
    // 힘든 날엔 세상도 흐리지만, 그만큼 천천히 가도 된다는 뜻으로 설계했어요.
    const SIGNAL_WEATHER = { green: "clear", orange: "rain", red: "hot" };
    let weatherFromSignal = false;      // 한 번이라도 고르면 무작위 날씨를 멈춥니다

    // 신호등 색마다 오늘 권하는 활동. 힘든 날일수록 짧고 부담 없는 쪽으로,
    // 그리고 "그냥 걷기"는 어떤 날에도 항상 남겨둡니다.
    const SIGNAL_ADVICE = {
        green:  "오늘은 뭐든 잘 풀릴 것 같아요. 낚시나 광산도 좋아요 🎣",
        orange: "무리하지 마세요. 밥 주고 쓰다듬는 것만 해도 충분해요 🌧️",
        red:    "아무것도 안 해도 괜찮아요. 그냥 섬을 걷기만 해도 돼요 🌥️"
    };

    function syncWeatherToSignal(color) {
        const key = SIGNAL_WEATHER[color];
        if (!key) return;
        weatherFromSignal = true;
        if (key === currentWeather) return;
        currentWeather = key;
        applyWeatherBadge();
        showEventToast(SIGNAL_ADVICE[color] || "", "neutral");
    }

    function applyWeatherBadge() {
        const w = weatherTypes[currentWeather];
        const badge = document.getElementById("weather-badge");
        if (!badge || !w) return;
        badge.innerText = w.emoji + " " + w.label;
        badge.className = "weather-badge weather-" + currentWeather;
    }

    // 날씨가 주는 가중치.
    //
    // ★ 힘든 날을 고른 사람이 손해를 보면 안 됩니다.
    //   예전에는 비(주황)일 때 작물이 15% 느리게 자랐는데, 그건
    //   "오늘 힘들다"고 말한 대가로 게임에서 불이익을 주는 셈이었습니다.
    //   그래서 모든 값을 1 이상으로만 두고, 힘든 날일수록 오히려
    //   더 빨리 끝나도록(=부담이 적도록) 바꿨습니다.
    //   신호등은 벌점이 아니라 '오늘 어떤 활동을 권할지'를 고르는 장치입니다.
    const WEATHER_GROW = { clear: 1.15, rain: 1.25, hot: 1.2 };
    const WEATHER_BITE = { clear: 0.85, rain: 0.7,  hot: 0.75 };

    function weatherGrowMod() { return WEATHER_GROW[currentWeather] || 1; }
    function weatherBiteMod() { return WEATHER_BITE[currentWeather] || 1; }

    // --- [4] 우연한 발견 -------------------------------------------------
    // 산책 중 낮은 확률로 좋은 일이 생깁니다. 확률이 낮아야 만났을 때 반가워요.
    const LUCKY_FINDS = [
        { icon: "🍀", coins: 10, msg: "네잎클로버를 주웠어요! 오늘은 좋은 일이 있을 것 같아요" },
        { icon: "💌", coins: 0,  msg: "따뜻한 위로의 편지를 주웠어요.\n\"오늘 하루 버틴 것만으로 충분해요.\"" },
        { icon: "🐚", coins: 6,  msg: "예쁜 조개껍데기를 주웠어요. 바다 냄새가 나네요" },
        { icon: "🪶", coins: 4,  msg: "고운 깃털을 주웠어요. 병아리가 좋아할 것 같아요" },
        { icon: "💌", coins: 0,  msg: "쪽지를 주웠어요.\n\"지금 잘하고 있어요. 조금 천천히 가도 괜찮아요.\"" }
    ];

    function rollLuckyFind(leftPct, topPct) {
        const chance = 0.05 * buffMult("luck");           // 행운 버프가 있으면 2배
        if (Math.random() >= chance) return;
        const find = LUCKY_FINDS[Math.floor(Math.random() * LUCKY_FINDS.length)];

        const boundary = document.getElementById("walk-boundary");
        if (boundary) {
            const pop = document.createElement("span");
            pop.className = "lucky-pop";
            pop.innerText = find.icon;
            pop.style.left = leftPct + "%";
            pop.style.top = topPct + "%";
            boundary.appendChild(pop);
            setTimeout(() => pop.remove(), 1600);
        }
        if (find.coins) {
            coins += find.coins;
            updateResourceBar();
        }
        showEventToast(find.icon + " " + find.msg + (find.coins ? " (+🪙" + find.coins + ")" : ""), "good");
        saveGame();
    }

    // --- 모듈 기동 -------------------------------------------------------
    // 1초 타이머 하나로 시간대 갱신과 버프 잔여시간 표시를 같이 처리합니다.
    applyDaytime();
    createAmbient();
    setInterval(() => { applyDaytime(); renderBuffBar(); }, 1000);


    const stages = [
        { emoji: "🥚", name: "알", expNeed: 0, minSeconds: 0,
          msg: "작은 알에 따뜻한 온기를 나눠주세요." },
        { emoji: "🐣", name: "갓 태어난 병아리", expNeed: 70, minSeconds: 45,
          msg: "껍질을 깨고 희망이 태어났어요!\n당신의 따뜻함 덕분입니다." },
        { emoji: "🐥", name: "포동포동 병아리", expNeed: 160, minSeconds: 110,
          msg: "병아리가 통통하게 자라고 있어요.\n꾸준한 보살핌이 느껴져요." },
        { emoji: "🐤", name: "씩씩한 병아리", expNeed: 280, minSeconds: 200,
          msg: "제법 씩씩해졌어요.\n작은 관심이 큰 변화를 만듭니다." },
        { emoji: "🐔", name: "다 자란 어른 새", expNeed: 430, minSeconds: 320,
          msg: "무럭무럭 자라 의젓한 모습이 되었어요.\n곧 진짜 모습을 드러낼 거예요." },
        { emoji: "✨", name: "성장 완료", expNeed: 620, minSeconds: 480,
          msg: "완전히 자랐어요! 어떤 모습일까요..." }
    ];

    const encourageWords = [
        "잘하고 있어요 🌱", "작은 마음이 모여요 💛", "당신 덕분이에요 🙌",
        "천천히, 꾸준히 ✨", "따뜻함이 전해져요 🌤️"
    ];

    // 케어 성향에 따라 갈리는 4종류, 케어 품질에 따라 갈리는 3단계 = 총 12종 컬렉션
    const speciesList = {
        feed:     { emoji: "🦃", label: "칠면조" },
        pet:      { emoji: "🦚", label: "공작새" },
        sleep:    { emoji: "🦉", label: "부엉이" },
        balanced: { emoji: "🦢", label: "백조" },
        // [5] 히든 진화체 — 조건을 채워야만 나옵니다.
        // 도감에는 조건을 만나기 전까지 '???' 로만 보여요.
        rainbird: { emoji: "🕊️", label: "비둘기", hidden: true,
                    hint: "비 오는 날 30번 넘게 쓰다듬어 주기" },
        nightowl: { emoji: "🦇", label: "밤새",   hidden: true,
                    hint: "깊은 밤(0~5시)에 10번 넘게 재워주기" }
    };
    // [5] 히든 진화 조건 카운터 (세이브에 같이 저장됩니다)
    let rainPetCount = 0;      // 비 오는 날 쓰다듬은 횟수
    let nightSleepCount = 0;   // 한밤중에 재운 횟수
    const tierList = {
        wild:    { label: "야생",  min: 0 },
        healthy: { label: "건강한", min: 45 },
        radiant: { label: "찬란한", min: 75 }
    };
    const speciesOrder = ["feed", "pet", "sleep", "balanced", "rainbird", "nightowl"];
    const tierOrder = ["wild", "healthy", "radiant"];

    // ===================================================================
    // 캐릭터 그림 (이모지 대신 직접 그린 SVG)
    // ===================================================================
    const stageForms = ["egg", "hatchling", "chubby", "brave", "adult", "adult"];
    const speciesForms = { feed: "turkey", pet: "peacock", sleep: "owl", balanced: "swan",
                           // [5] 히든 진화체는 기존 그림을 재활용하되 색을 달리 입힙니다
                           rainbird: "rainbird", nightowl: "nightowl" };
    const accessoryAnchor = {
        egg:       { x: 60, y: 22, size: 26 },
        hatchling: { x: 60, y: 33, size: 23 },
        chubby:    { x: 60, y: 29, size: 25 },
        brave:     { x: 60, y: 25, size: 25 },
        adult:     { x: 58, y: 17, size: 25 },
        turkey:    { x: 58, y: 19, size: 24 },
        peacock:   { x: 58, y: 12, size: 22 },
        owl:       { x: 60, y: 21, size: 25 },
        swan:      { x: 46, y: 19, size: 22 },
        rainbird:  { x: 50, y: 30, size: 22 },
        nightowl:  { x: 60, y: 21, size: 25 }
    };


    // ===================================================================
    // [P0] 공용 월드 상태 — 병아리 게임과 섬을 하나로 묶는 층
    //
    // 제안서 지적: 두 게임이 저장소도 재화도 달라서, 같은 섬을 키우는
    // 한 번의 모험이 아니라 닮은 활동을 두 번 하는 느낌이 난다는 것.
    //
    // 기존 저장 키(jeroki-pet-save / jeroki-island)는 그대로 두고,
    // 두 쪽이 함께 쓰는 값만 이 객체에 담아 별도 키로 저장합니다.
    // 그래야 예전 세이브를 가진 사람도 그대로 이어서 할 수 있어요.
    // ===================================================================
    const WORLD_KEY = "jeroki-world";
    const WORLD_VERSION = 1;

    // 복원 대상 다섯 곳. 각 3단계.
    const RESTORE_ZONES = {
        beach:      { emoji: "🏖️", name: "바닷길",     order: 1,
                      cost: [0, 40, 110],
                      tell: ["조개랑 표지판만 덩그러니 남은 해변이에요.",
                             "길이 트였어요. 여기서 산책하고 낚시할 수 있어요.",
                             "노을이 드는 바닷길이 됐어요. 희귀한 물고기도 온대요."] },
        farm:       { emoji: "🍊", name: "감귤밭",     order: 2,
                      cost: [0, 60, 150],
                      tell: ["태풍에 쓸린 뒤로 비어 있는 밭이에요.",
                             "다시 심을 수 있게 됐어요. 계절 작물이 자라요.",
                             "감귤나무가 가득해요. 병아리가 수확을 도와줘요."] },
        flower:     { emoji: "🌺", name: "동백 정원",   order: 3,
                      cost: [0, 80, 190],
                      tell: ["산책길이 막혀 있어요.",
                             "꽃을 심고 이웃에게 나눠줄 수 있어요.",
                             "동백 아치가 생겼어요. 비 오는 날이 예뻐요."] },
        lighthouse: { emoji: "🗼", name: "등대",       order: 4,
                      cost: [0, 100, 230],
                      tell: ["불이 꺼진 채로 서 있어요.",
                             "불이 들어왔어요. 밤에 별을 볼 수 있어요.",
                             "전망대가 열렸어요. 밤에만 나오는 것들이 있대요."] },
        home:       { emoji: "🏠", name: "내 오두막",   order: 5,
                      cost: [0, 50, 130],
                      tell: ["기본 가구만 있는 방이에요.",
                             "선반이 생겼어요. 기록을 걸어둘 수 있어요.",
                             "나만의 방이 됐어요. 여기 있으면 편해져요."] }
    };
    const RESTORE_ORDER = ["beach", "farm", "flower", "lighthouse", "home"];

    // 다음 단계에 실제로 뭐가 생기는지 미리 알려줍니다.
    // "뭐가 좋아지는지 모르겠는데 온기를 왜 쓰지?" 가 되지 않도록,
    // 값을 치르기 전에 무엇을 얻는지 보이게 했어요.
    const RESTORE_NEXT = {
        beach:      ["바다로 뻗는 나무 데크, 고쳐진 배, 창고, 배 매는 말뚝",
                     "데크 끝 정자와 매달린 등불, 생선 건조대"],
        farm:       ["비닐하우스, 물길, 허수아비, 줄지어 심은 모종, 농기구 창고",
                     "열매 달린 감귤나무 6그루, 수확 수레, 쌓인 상자"],
        flower:     ["꽃밭 울타리, 우물, 벤치 두 개, 돌길",
                     "동백 아치, 돌등 네 개, 꽃잎 깔린 길"],
        lighthouse: ["불 켜진 등대, 차양 달린 가게, 진열대",
                     "등대 전망대, 회전 불빛, 깃발"],
        home:       ["기록 선반, 양탄자, 커튼 달린 창문",
                     "벽난로, 액자 세 개, 탁자와 의자, 화환"]
    };

    let worldState = newWorldState();

    function newWorldState() {
        return {
            v: WORLD_VERSION,
            warmth: 0,              // 섬 복원에 쓰는 기여도. 코인과 분리된 재화입니다.
            warmthTotal: 0,         // 지금까지 모은 총량 (기록용, 쓰면 줄지 않음)
            restoration: { beach: 1, farm: 1, flower: 1, lighthouse: 1, home: 1 },
            activeCompanionId: null,
            companions: [],         // 진화를 마친 병아리들
            dailyQuest: null,
            storyFlags: {},
            season: currentSeason()
        };
    }

    // 기기 날짜만으로 계절을 정합니다 (서버 없이 동작해야 하므로)
    function currentSeason() {
        const m = new Date().getMonth() + 1;
        if (m >= 3 && m <= 5) return "spring";
        if (m >= 6 && m <= 8) return "summer";
        if (m >= 9 && m <= 11) return "autumn";
        return "winter";
    }

    async function loadWorld() {
        try {
            const raw = await window.storage.get(WORLD_KEY, false);
            if (raw && raw.value) {
                const s = JSON.parse(raw.value);
                worldState = Object.assign(newWorldState(), s);
                // 나중에 항목이 늘어나도 예전 세이브가 깨지지 않도록 채워 넣습니다
                worldState.restoration = Object.assign(
                    { beach: 1, farm: 1, flower: 1, lighthouse: 1, home: 1 },
                    s.restoration || {});
                worldState.companions = s.companions || [];
                worldState.storyFlags = s.storyFlags || {};
            }
        } catch (e) {}
        worldState.season = currentSeason();
        window.jerokiWorld = worldState;      // island3d.js 가 같은 객체를 봅니다
    }

    async function saveWorld() {
        try { await window.storage.set(WORLD_KEY, JSON.stringify(worldState)); } catch (e) {}
    }

    // --- 온기 ---------------------------------------------------------
    // 코인은 '사고 파는 돈', 온기는 '섬을 좋게 만든 정도'.
    // 둘을 섞지 않아야 "돈을 벌었다"와 "섬이 좋아졌다"가 다른 만족으로 남습니다.
    function addWarmth(n, why) {
        if (!n || n <= 0) return;
        // [P2] 주말에는 조금 더 쌓입니다 (평일에 해도 손해는 없어요)
        n = Math.round(n * seasonWarmthMult());
        worldState.warmth += n;
        worldState.warmthTotal += n;
        renderWarmth();
        spawnWarmthFloat(n);
        if (why) showEventToast("🔥 온기 +" + n + " · " + why, "good");
        saveWorld();
    }

    function spendWarmth(n) {
        if (worldState.warmth < n) return false;
        worldState.warmth -= n;
        renderWarmth();
        saveWorld();
        return true;
    }

    function renderWarmth() {
        const el = document.getElementById("res-warmth");
        if (el) el.innerText = worldState.warmth;
        const isl = document.getElementById("i3-warmth");
        if (isl) isl.innerText = worldState.warmth;
    }

    function spawnWarmthFloat(n) {
        const bar = document.getElementById("res-warmth");
        if (!bar || typeof spawnFloatText !== "function") return;
        try { spawnFloatText(bar.parentElement || bar, "+" + n + " 온기"); } catch (e) {}
    }

    // --- 복원 ---------------------------------------------------------
    function zoneStage(key) { return worldState.restoration[key] || 1; }

    function zoneNextCost(key) {
        const z = RESTORE_ZONES[key];
        const st = zoneStage(key);
        return st >= 3 ? null : z.cost[st];      // cost[1] = 2단계 비용
    }

    function restoreZone(key) {
        const z = RESTORE_ZONES[key];
        const cost = zoneNextCost(key);
        if (cost === null) { showEventToast(z.emoji + " " + z.name + eunNeun(z.name) + " 이미 다 되살아났어요", "neutral"); return false; }
        if (worldState.warmth < cost) {
            showEventToast("🔥 온기가 " + (cost - worldState.warmth) + " 더 필요해요", "bad");
            return false;
        }
        spendWarmth(cost);
        worldState.restoration[key] = zoneStage(key) + 1;
        saveWorld();
        const st = zoneStage(key);
        showEventToast(z.emoji + " " + z.name + iGa(z.name) + " 달라졌어요!\n" + z.tell[st - 1], "good");
        if (typeof spawnConfetti === "function") spawnConfetti();
        renderRestore();
        // 섬이 열려 있으면 그 자리에서 바로 반영합니다
        if (typeof window.islandRefreshArea === "function") window.islandRefreshArea();
        return true;
    }

    function restoredCount() {
        return RESTORE_ORDER.reduce((a, k) => a + (zoneStage(k) - 1), 0);
    }

    function renderRestore() {
        const wrap = document.getElementById("restore-list");
        if (!wrap) return;
        let html = "";
        RESTORE_ORDER.forEach(key => {
            const z = RESTORE_ZONES[key];
            const st = zoneStage(key);
            const cost = zoneNextCost(key);
            const done = cost === null;
            html += '<div class="restore-row' + (done ? " done" : "") + '">' +
                '<div class="rs-ico">' + z.emoji + '</div>' +
                '<div class="rs-body">' +
                    '<div class="rs-name">' + z.name +
                        '<span class="rs-stage">' + st + ' / 3</span></div>' +
                    '<div class="rs-tell">' + z.tell[st - 1] + '</div>' +
                    '<div class="rs-bar"><span style="width:' + Math.round((st - 1) / 2 * 100) + '%"></span></div>' +
                    // 값을 치르기 전에 무엇이 생기는지 보여줍니다
                    (done ? ''
                          : '<div class="rs-next">🔨 다음에 생겨요 · ' +
                            ((RESTORE_NEXT[key] || [])[st - 1] || '') + '</div>') +
                '</div>' +
                (done
                    ? '<span class="rs-done">완료</span>'
                    : '<button class="rs-btn" ' + (worldState.warmth < cost ? "disabled" : "") +
                      ' onclick="restoreZone(\'' + key + '\')">🔥 ' + cost + '</button>') +
                '</div>';
        });
        wrap.innerHTML = html;
        const sum = document.getElementById("restore-sum");
        if (sum) sum.innerText = restoredCount() + " / 10 단계";
    }

    // --- 동반자 -------------------------------------------------------
    // 진화를 마친 병아리를 버리지 않고 섬에 데려갈 친구로 남깁니다.
    // 능력은 수치 경쟁이 아니라 '무엇을 먼저 볼 수 있는가' 쪽으로 뒀습니다.
    const COMPANION_PERKS = {
        feed:     { icon: "🌾", label: "수확 도우미", desc: "밭에서 가끔 하나 더 거둬요" },
        pet:      { icon: "💗", label: "친화력",     desc: "주민 선물 온기가 더 올라요" },
        sleep:    { icon: "🌙", label: "밤눈",       desc: "밤에 등대에서 특별한 걸 봐요" },
        balanced: { icon: "🍀", label: "행운",       desc: "산책 중 좋은 걸 더 자주 주워요" },
        rainbird: { icon: "🕊️", label: "빗속 친구",  desc: "비 오는 날 온기를 더 모아요" },
        nightowl: { icon: "🦇", label: "밤샘",       desc: "깊은 밤 활동에 힘이 붙어요" }
    };

    function addCompanion(variantKey, speciesKey, tierKey, fullName) {
        const id = variantKey + "-" + Date.now();
        worldState.companions.push({
            id: id, key: variantKey, species: speciesKey, tier: tierKey,
            name: fullName, form: speciesForms[speciesKey] || "adult",
            bornAt: new Date().toISOString()
        });
        // 첫 친구는 자동으로 데리고 다닙니다
        if (!worldState.activeCompanionId) worldState.activeCompanionId = id;
        saveWorld();
    }

    function activeCompanion() {
        if (!worldState.activeCompanionId) return null;
        return worldState.companions.find(c => c.id === worldState.activeCompanionId) || null;
    }

    function companionPerk() {
        const c = activeCompanion();
        return c ? (COMPANION_PERKS[c.species] || null) : null;
    }

    function hasPerk(speciesKey) {
        const c = activeCompanion();
        return !!c && c.species === speciesKey;
    }

    function setCompanion(id) {
        worldState.activeCompanionId = id;
        saveWorld();
        renderCompanions();
        const c = activeCompanion();
        if (c) showEventToast("🐥 " + c.name + iGa(c.name) + " 섬에 같이 가요!", "good");
    }

    function renderCompanions() {
        const wrap = document.getElementById("companion-list");
        if (!wrap) return;
        if (!worldState.companions.length) {
            wrap.innerHTML = '<div class="comp-empty">아직 다 자란 친구가 없어요.<br>' +
                             '병아리를 끝까지 키우면 여기 남아서 섬에 같이 가요.</div>';
            return;
        }
        let html = "";
        worldState.companions.forEach(c => {
            const perk = COMPANION_PERKS[c.species] || { icon: "✨", label: "친구", desc: "함께 있어요" };
            const on = c.id === worldState.activeCompanionId;
            let pic = "🐥";
            try { pic = charPic(c.form, { size: 46, tier: c.tier }); } catch (e) {}
            html += '<div class="comp-card' + (on ? " on" : "") + '" onclick="setCompanion(\'' + c.id + '\')">' +
                '<div class="comp-pic">' + pic + '</div>' +
                '<div class="comp-body">' +
                    '<div class="comp-name">' + c.name + (on ? ' <span class="comp-tag">동행 중</span>' : '') + '</div>' +
                    '<div class="comp-perk">' + perk.icon + ' <b>' + perk.label + '</b> · ' + perk.desc + '</div>' +
                '</div></div>';
        });
        wrap.innerHTML = html;
    }


    // ===================================================================
    // [P1] 기록 벽 — 오두막을 '나의 기록 공간'으로
    //
    // 제안서 지적: 오래 플레이한 이유가 숫자로만 남아 있다는 것.
    // 다 키운 병아리 사진, 주민에게 받은 물건, 되살린 구역 엽서,
    // 계절 트로피를 한 벽에 걸어 두면 그게 눈에 보입니다.
    // ===================================================================
    function keepsakes() {
        return (worldState.storyFlags && worldState.storyFlags.keepsakes) || [];
    }
    function trophies() {
        return (worldState.storyFlags && worldState.storyFlags.trophies) || [];
    }

    function wallItems() {
        const out = [];

        // 1) 다 키운 병아리 사진
        worldState.companions.forEach(c => {
            let pic = "🐥";
            try { pic = charPic(c.form, { size: 44, tier: c.tier }); } catch (e) {}
            out.push({ kind: "photo", pic: pic, name: c.name,
                       sub: "함께 자란 친구",
                       when: c.bornAt });
        });

        // 2) 주민에게 받은 물건
        keepsakes().forEach(k => {
            out.push({ kind: "gift", pic: '<span class="wall-emoji">' + k.emoji + '</span>',
                       name: k.name, sub: k.from + "에게 받음", note: k.text, when: k.at });
        });

        // 3) 끝까지 되살린 구역 엽서
        RESTORE_ORDER.forEach(key => {
            if (zoneStage(key) < 3) return;
            const z = RESTORE_ZONES[key];
            out.push({ kind: "card", pic: '<span class="wall-emoji">' + z.emoji + '</span>',
                       name: z.name + " 엽서", sub: "끝까지 되살린 곳", note: z.tell[2] });
        });

        // 4) 계절 트로피
        trophies().forEach(t => {
            out.push({ kind: "trophy", pic: '<span class="wall-emoji">' + t.emoji + '</span>',
                       name: t.name, sub: t.season + " 기념", note: t.text, when: t.at });
        });

        return out;
    }

    window.renderKeepsakes = renderKeepsakes;
    function renderKeepsakes() {
        const wrap = document.getElementById("wall-grid");
        if (!wrap) return;
        const items = wallItems();
        const cnt = document.getElementById("wall-count");
        if (cnt) cnt.innerText = items.length + "개";

        if (!items.length) {
            wrap.innerHTML = '<div class="wall-empty">아직 걸어둔 게 없어요.<br>' +
                '병아리를 끝까지 키우거나, 주민 이야기를 마치거나,<br>' +
                '섬을 되살리면 여기 하나씩 남아요.</div>';
            return;
        }
        let html = "";
        items.forEach(it => {
            html += '<div class="wall-item ' + it.kind + '">' +
                '<div class="wall-pic">' + it.pic + '</div>' +
                '<div class="wall-name">' + it.name + '</div>' +
                '<div class="wall-sub">' + it.sub + '</div>' +
                (it.note ? '<div class="wall-note">' + it.note + '</div>' : '') +
                '</div>';
        });
        wrap.innerHTML = html;
    }

    // ===================================================================
    // [P2] 계절 테마와 주말
    //
    // 서버 없이 기기 날짜만 봅니다. 놓쳐도 손해가 없도록,
    // 트로피는 '그 계절에 한 번이라도 왔으면' 남습니다.
    // 출석을 못 채웠다고 벌을 주지 않습니다.
    // ===================================================================
    const SEASONS = {
        spring: { emoji: "🌸", name: "봄",   tell: "동백이 지고 벚꽃이 피는 철이에요",
                  tint: ["#ffe0ea", "#f7e8ff"] },
        summer: { emoji: "🌊", name: "여름", tell: "바다에 조개가 많이 밀려오는 철이에요",
                  tint: ["#cdefff", "#dff6e8"] },
        autumn: { emoji: "🍊", name: "가을", tell: "감귤이 제일 단 철이에요",
                  tint: ["#ffe6c4", "#fff0d0"] },
        winter: { emoji: "🕯️", name: "겨울", tell: "등대 불빛이 제일 예쁜 철이에요",
                  tint: ["#dce8f7", "#eef2fb"] }
    };

    function isWeekend() {
        const d = new Date().getDay();
        return d === 0 || d === 6;
    }

    // 계절마다 한 번, 그 계절에 처음 들어오면 트로피를 남깁니다
    function checkSeasonVisit() {
        const key = currentSeason();
        const year = new Date().getFullYear();
        const tag = year + "-" + key;
        if (!worldState.storyFlags.seasons) worldState.storyFlags.seasons = {};
        if (worldState.storyFlags.seasons[tag]) return;
        worldState.storyFlags.seasons[tag] = true;

        const s = SEASONS[key];
        if (!worldState.storyFlags.trophies) worldState.storyFlags.trophies = [];
        worldState.storyFlags.trophies.push({
            emoji: s.emoji, name: s.name + " 기념패", season: year + "년 " + s.name,
            text: s.tell, at: new Date().toISOString()
        });
        saveWorld();
        renderKeepsakes();
        setTimeout(() => {
            showEventToast(s.emoji + " " + s.name + iGa(s.name) + " 왔어요!\n" + s.tell + " (기록 벽에 기념패가 걸렸어요)", "good");
        }, 1500);
    }

    function renderSeasonBanner() {
        const el = document.getElementById("season-banner");
        if (!el) return;
        const s = SEASONS[currentSeason()];
        const weekend = isWeekend();
        el.style.background = "linear-gradient(135deg," + s.tint[0] + "," + s.tint[1] + ")";
        el.innerHTML =
            '<span class="sb-emoji">' + s.emoji + '</span>' +
            '<span class="sb-text"><b>' + s.name + '</b> · ' + s.tell +
            (weekend ? '<br><b class="sb-weekend">🎪 주말이에요 — 온기가 1.5배로 쌓여요</b>' : '') +
            '</span>';
    }

    // 주말에는 온기가 조금 더 쌓입니다. 놓쳐도 평일에 그대로 할 수 있어요.
    function seasonWarmthMult() { return isWeekend() ? 1.5 : 1; }

    function currentCharForm() {
        if (finalVariant) {
            const sp = String(finalVariant.key || "").split("-")[0];
            return speciesForms[sp] || "adult";
        }
        return stageForms[Math.min(currentLevel, stageForms.length - 1)];
    }

    // --- 부품 ---
    function svgEyes(x1, x2, y, r, sleeping) {
        if (sleeping) {
            const w = r * 1.5;
            return '<path d="M' + (x1 - w) + ' ' + y + ' q ' + w + ' ' + (r * 2) + ' ' + (w * 2) + ' 0" fill="none" stroke="#4a3524" stroke-width="2.6" stroke-linecap="round"/>' +
                   '<path d="M' + (x2 - w) + ' ' + y + ' q ' + w + ' ' + (r * 2) + ' ' + (w * 2) + ' 0" fill="none" stroke="#4a3524" stroke-width="2.6" stroke-linecap="round"/>';
        }
        // 몇 초에 한 번씩 눈을 깜빡입니다 (주기를 조금 랜덤하게 줘서 기계적으로 보이지 않게)
        const dur = (4 + Math.random() * 3).toFixed(1);
        const lidY = (r * 0.12).toFixed(2);
        const hl = (r * 0.3).toFixed(2);
        const blinkEye = '<animate attributeName="ry" values="' + r + ';' + r + ';' + lidY + ';' + r +
            '" keyTimes="0;0.93;0.965;1" dur="' + dur + 's" repeatCount="indefinite"/>';
        const blinkHl = '<animate attributeName="r" values="' + hl + ';' + hl + ';0;' + hl +
            '" keyTimes="0;0.93;0.965;1" dur="' + dur + 's" repeatCount="indefinite"/>';
        return '<ellipse cx="' + x1 + '" cy="' + y + '" rx="' + (r * 0.86) + '" ry="' + r + '" fill="#4a3524">' + blinkEye + '</ellipse>' +
               '<ellipse cx="' + x2 + '" cy="' + y + '" rx="' + (r * 0.86) + '" ry="' + r + '" fill="#4a3524">' + blinkEye + '</ellipse>' +
               '<circle cx="' + (x1 + r * 0.36) + '" cy="' + (y - r * 0.38) + '" r="' + hl + '" fill="#fff">' + blinkHl + '</circle>' +
               '<circle cx="' + (x2 + r * 0.36) + '" cy="' + (y - r * 0.38) + '" r="' + hl + '" fill="#fff">' + blinkHl + '</circle>';
    }

    function svgBlush(x1, x2, y, rx) {
        return '<ellipse cx="' + x1 + '" cy="' + y + '" rx="' + rx + '" ry="' + (rx * 0.62) + '" fill="#ff9a8f" opacity="0.45"/>' +
               '<ellipse cx="' + x2 + '" cy="' + y + '" rx="' + rx + '" ry="' + (rx * 0.62) + '" fill="#ff9a8f" opacity="0.45"/>';
    }

    function svgBeak(cx, cy, w, h, color) {
        color = color || "#ffa62b";
        return '<path d="M' + (cx - w) + ' ' + cy + ' H' + (cx + w) + ' L' + cx + ' ' + (cy + h) + ' Z" fill="' + color + '"/>' +
               '<path d="M' + (cx - w) + ' ' + cy + ' H' + (cx + w) + ' L' + cx + ' ' + (cy + h * 0.38) + ' Z" fill="#ffc76b"/>';
    }

    function svgFeet(x1, x2, y, color) {
        color = color || "#ffa62b";
        const foot = function (x) {
            return '<path d="M' + x + ' ' + (y - 4) + ' V' + (y + 3) + '" stroke="' + color + '" stroke-width="3.4" stroke-linecap="round"/>' +
                   '<path d="M' + (x - 5) + ' ' + (y + 4) + ' H' + (x + 5) + '" stroke="' + color + '" stroke-width="3.4" stroke-linecap="round"/>';
        };
        return foot(x1) + foot(x2);
    }

    // 잠잘 때 코에 맺히는 숨방울
    function svgSleepBubble(x, y) {
        return '<circle cx="' + x + '" cy="' + y + '" r="3" fill="#dceeff" fill-opacity="0.85" stroke="#a8d4f5" stroke-width="1.2">' +
               '<animate attributeName="r" values="1.8;6.5;1.8" dur="3.2s" repeatCount="indefinite"/>' +
               '<animate attributeName="opacity" values="0.45;1;0.45" dur="3.2s" repeatCount="indefinite"/>' +
               '</circle>';
    }

    function svgGround(rx) {
        return '<ellipse cx="60" cy="107" rx="' + rx + '" ry="5.5" fill="#c08c4a" opacity="0.22"/>';
    }

    function svgFan(colors, cy, rx, ry, dist, eyeSpots, spread) {
        let s = "";
        const n = colors.length;
        const sp = spread || 58;
        for (let i = 0; i < n; i++) {
            const ang = -sp + ((sp * 2) / (n - 1)) * i;
            s += '<g transform="rotate(' + ang + ' 60 ' + cy + ')">';
            s += '<ellipse cx="60" cy="' + (cy - dist) + '" rx="' + rx + '" ry="' + ry + '" fill="' + colors[i] + '"/>';
            if (eyeSpots) {
                s += '<circle cx="60" cy="' + (cy - dist - ry * 0.35) + '" r="4.6" fill="#f4d35e"/>';
                s += '<circle cx="60" cy="' + (cy - dist - ry * 0.35) + '" r="2.4" fill="#2b4a8b"/>';
            }
            s += '</g>';
        }
        return s;
    }

    // --- 알 ---
    function formEgg(sleeping, progress) {
        let s = svgGround(24);

        // 지푸라기 둥지 — 알만 덩그러니 있으면 허전해서 받쳐줍니다
        s += '<ellipse cx="60" cy="99" rx="40" ry="13" fill="url(#g-straw)" stroke="#a8823f" stroke-width="1.6"/>';
        s += '<ellipse cx="60" cy="96" rx="30" ry="8.5" fill="#8f6c34" opacity="0.35"/>';
        s += '<g stroke="#d8b070" stroke-width="2" stroke-linecap="round" opacity="0.9">' +
             '<path d="M24 98 q 14 -7 30 -5"/><path d="M96 98 q -14 -7 -30 -5"/>' +
             '<path d="M32 104 q 18 5 40 2"/><path d="M46 92 q 12 -4 26 -1"/></g>';

        s += '<path d="M60 13 C82 13 97 41 97 64 C97 86 80 101 60 101 C40 101 23 86 23 64 C23 41 38 13 60 13 Z" fill="#fdf3e0" stroke="#eed9b0" stroke-width="2"/>';
        s += '<path d="M60 13 C82 13 97 41 97 64 C97 86 80 101 60 101 C40 101 23 86 23 64 C23 41 38 13 60 13 Z" fill="url(#g-shell)"/>';
        s += '<g fill="#e9d3a6" opacity="0.75">' +
             '<ellipse cx="44" cy="47" rx="4.4" ry="3.4"/><ellipse cx="73" cy="39" rx="3.2" ry="2.6"/>' +
             '<ellipse cx="78" cy="68" rx="4.8" ry="3.6"/><ellipse cx="41" cy="78" rx="3.6" ry="2.8"/>' +
             '<ellipse cx="61" cy="60" rx="2.8" ry="2.2"/><ellipse cx="55" cy="86" rx="3" ry="2.3"/></g>';
        s += '<ellipse cx="45" cy="41" rx="8.5" ry="13" fill="#ffffff" opacity="0.6" transform="rotate(-22 45 41)"/>';
        if (progress > 0.4) {
            s += '<path d="M30 60 l9 -7 l3 9 l9 -8" fill="none" stroke="#d8bb87" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>';
        }
        if (progress > 0.75) {
            s += '<path d="M90 56 l-8 7 l-4 -8 l-8 6" fill="none" stroke="#d8bb87" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>';
            s += '<path d="M52 20 l7 6 l6 -6" fill="none" stroke="#d8bb87" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>';
        }
        if (sleeping) {
            s += '<path d="M46 66 q 5 6 10 0" fill="none" stroke="#c9a97a" stroke-width="2.2" stroke-linecap="round"/>';
            s += '<path d="M64 66 q 5 6 10 0" fill="none" stroke="#c9a97a" stroke-width="2.2" stroke-linecap="round"/>';
        }
        return s;
    }

    // --- 병아리 ---
    function formChick(sleeping, o) {
        const bx = o.bodyRx, by = o.bodyY, br = o.bodyRy;
        const hy = o.headY, hr = o.headR;
        let s = svgGround(bx * 0.8);
        s += svgFeet(60 - bx * 0.34, 60 + bx * 0.34, by + br - 1, "#ffa62b");
        // 몸통 — 단색 위에 그라데이션을 덮어 둥글게 보이게
        s += '<ellipse cx="60" cy="' + by + '" rx="' + bx + '" ry="' + br + '" fill="' + o.body + '"/>';
        s += '<ellipse cx="60" cy="' + (by + 3) + '" rx="' + (bx * 0.6) + '" ry="' + (br * 0.68) + '" fill="#ffffff" opacity="0.32"/>';
        s += '<ellipse cx="60" cy="' + by + '" rx="' + bx + '" ry="' + br + '" fill="url(#g-body)"/>';
        // 솜털 결
        s += '<g stroke="' + o.dark + '" stroke-width="1.1" stroke-linecap="round" opacity="0.35" fill="none">' +
             '<path d="M' + (60 - bx * 0.45) + ' ' + (by + br * 0.45) + ' q 4 4 8 0"/>' +
             '<path d="M' + (60 + bx * 0.12) + ' ' + (by + br * 0.6) + ' q 4 4 8 0"/></g>';
        // 날개
        const wa = o.spread ? 34 : 14;
        const wl = 60 - bx + 4, wr = 60 + bx - 4;
        s += '<ellipse cx="' + wl + '" cy="' + by + '" rx="6.5" ry="12" fill="' + o.dark + '" transform="rotate(' + (-wa) + ' ' + wl + ' ' + by + ')"/>';
        s += '<ellipse cx="' + wr + '" cy="' + by + '" rx="6.5" ry="12" fill="' + o.dark + '" transform="rotate(' + wa + ' ' + wr + ' ' + by + ')"/>';
        // 머리
        s += '<circle cx="60" cy="' + hy + '" r="' + hr + '" fill="' + o.body + '"/>';
        s += '<circle cx="60" cy="' + hy + '" r="' + hr + '" fill="url(#g-body)"/>';
        if (o.tuft) {
            s += '<path d="M60 ' + (hy - hr + 2) + ' q -3 -10 -9 -11 q 6 -1 9 5 q 3 -10 10 -9 q -6 3 -6 12" fill="' + o.dark + '"/>';
        }
        s += svgEyes(60 - hr * 0.4, 60 + hr * 0.4, hy - 1, hr * 0.19 + 2.2, sleeping);
        s += svgBeak(60, hy + hr * 0.36, 5, 6.5);
        s += svgBlush(60 - hr * 0.76, 60 + hr * 0.76, hy + hr * 0.34, sleeping ? 5.8 : 5);
        if (sleeping) s += svgSleepBubble(60 + hr * 0.72, hy + hr * 0.62);
        if (o.shell) {
            // 아래쪽 깨진 껍질
            s += '<path d="M27 76 L33 67 L39 76 L45 65 L51 75 L58 64 L65 75 L71 65 L77 76 L83 67 L90 76 ' +
                 'C90 94 77 103 59 103 C41 103 27 94 27 76 Z" fill="#fdf3e0" stroke="#eed9b0" stroke-width="2"/>';
            s += '<g fill="#e9d3a6" opacity="0.7"><ellipse cx="42" cy="88" rx="3.4" ry="2.6"/><ellipse cx="74" cy="86" rx="3" ry="2.3"/></g>';
            // 머리 위 껍질 조각
            s += '<path d="M45 ' + (hy - hr - 3) + ' L51 ' + (hy - hr + 2) + ' L57 ' + (hy - hr - 5) + ' L63 ' + (hy - hr + 1) +
                 ' L69 ' + (hy - hr - 6) + ' L75 ' + (hy - hr - 1) + ' L77 ' + (hy - hr - 9) +
                 ' C70 ' + (hy - hr - 16) + ' 50 ' + (hy - hr - 16) + ' 45 ' + (hy - hr - 3) + ' Z" fill="#fdf3e0" stroke="#eed9b0" stroke-width="2"/>';
        }
        return s;
    }

    // --- 닭 / 칠면조 / 공작 ---
    function formHen(sleeping, o) {
        let s = "";
        if (o.fan) s += svgFan(o.fan, 76, o.eyeSpots ? 10 : 9.5, o.eyeSpots ? 26 : 24, o.eyeSpots ? 40 : 38, o.eyeSpots, 58);
        s += svgGround(26);
        // 꼬리 (일반 닭)
        if (o.tail) {
            s += '<path d="M84 78 C98 74 104 58 100 44 C96 56 90 62 82 64 Z" fill="' + o.dark + '"/>';
            s += '<path d="M86 82 C102 82 110 70 110 58 C104 70 96 74 85 72 Z" fill="' + o.body + '"/>';
        }
        s += svgFeet(52, 68, 97, "#ffa62b");
        // 몸통
        s += '<ellipse cx="58" cy="76" rx="29" ry="24" fill="' + o.body + '"/>';
        s += '<ellipse cx="58" cy="80" rx="18" ry="15" fill="#ffffff" opacity="0.28"/>';
        s += '<ellipse cx="34" cy="76" rx="7" ry="13" fill="' + o.dark + '" transform="rotate(-18 34 76)"/>';
        s += '<ellipse cx="82" cy="76" rx="7" ry="13" fill="' + o.dark + '" transform="rotate(18 82 76)"/>';
        // 머리
        s += '<circle cx="58" cy="42" r="19" fill="' + o.body + '"/>';
        if (o.comb) {
            s += '<g fill="#ef5350"><circle cx="48" cy="25" r="6"/><circle cx="58" cy="21" r="7"/><circle cx="68" cy="25" r="6"/></g>';
        }
        if (o.crest) {
            s += '<g stroke="#1f7f74" stroke-width="2" stroke-linecap="round">' +
                 '<path d="M50 25 L47 14"/><path d="M58 23 L58 11"/><path d="M66 25 L69 14"/></g>' +
                 '<g fill="#3fb4c9"><circle cx="47" cy="12" r="3.4"/><circle cx="58" cy="9" r="3.4"/><circle cx="69" cy="12" r="3.4"/></g>';
        }
        s += svgEyes(51, 65, 40, 3.6, sleeping);
        s += svgBeak(58, 48, 5.5, 8, o.beak);
        if (o.snood) {
            // 칠면조 특유의 늘어진 볏 (부리 옆에 살짝)
            s += '<path d="M52 45 C47 49 46 55 48 59" fill="none" stroke="#ef5350" stroke-width="4.5" stroke-linecap="round"/>';
        }
        if (o.wattle) {
            s += '<path d="M58 55 C53 58 53 65 58 66 C63 65 63 58 58 55 Z" fill="#ef5350"/>';
        }
        s += svgBlush(42, 74, 48, sleeping ? 5.8 : 5);
        if (sleeping) s += svgSleepBubble(73, 55);
        return s;
    }

    // --- 부엉이 ---
    function formOwl(sleeping) {
        const body = "#b08055", dark = "#96683f";
        let s = svgGround(26);
        s += svgFeet(51, 69, 97, "#e6a83c");
        s += '<path d="M38 26 L44 8 L54 22 Z" fill="' + dark + '"/>';
        s += '<path d="M82 26 L76 8 L66 22 Z" fill="' + dark + '"/>';
        s += '<ellipse cx="60" cy="66" rx="32" ry="34" fill="' + body + '"/>';
        s += '<ellipse cx="60" cy="74" rx="20" ry="22" fill="#f0dcc0" opacity="0.85"/>';
        s += '<g fill="' + dark + '" opacity="0.55"><ellipse cx="52" cy="70" rx="3" ry="2"/><ellipse cx="66" cy="76" rx="3" ry="2"/><ellipse cx="58" cy="84" rx="3" ry="2"/></g>';
        s += '<ellipse cx="30" cy="64" rx="8" ry="18" fill="' + dark + '" transform="rotate(-10 30 64)"/>';
        s += '<ellipse cx="90" cy="64" rx="8" ry="18" fill="' + dark + '" transform="rotate(10 90 64)"/>';
        s += '<circle cx="47" cy="46" r="14" fill="#fdf6ea"/><circle cx="73" cy="46" r="14" fill="#fdf6ea"/>';
        if (sleeping) {
            s += '<path d="M39 46 q 8 9 16 0" fill="none" stroke="#4a3524" stroke-width="3" stroke-linecap="round"/>';
            s += '<path d="M65 46 q 8 9 16 0" fill="none" stroke="#4a3524" stroke-width="3" stroke-linecap="round"/>';
        } else {
            // 부엉이는 눈이 커서 깜빡임이 잘 보입니다
            const owlDur = (4 + Math.random() * 3).toFixed(1);
            const owlBlink = '<animate attributeName="r" values="7;7;0.6;7" keyTimes="0;0.93;0.965;1" dur="' + owlDur + 's" repeatCount="indefinite"/>';
            const owlHl = '<animate attributeName="r" values="2.4;2.4;0;2.4" keyTimes="0;0.93;0.965;1" dur="' + owlDur + 's" repeatCount="indefinite"/>';
            s += '<circle cx="47" cy="46" r="7" fill="#4a3524">' + owlBlink + '</circle>';
            s += '<circle cx="73" cy="46" r="7" fill="#4a3524">' + owlBlink + '</circle>';
            s += '<circle cx="49.6" cy="43.4" r="2.4" fill="#fff">' + owlHl + '</circle>';
            s += '<circle cx="75.6" cy="43.4" r="2.4" fill="#fff">' + owlHl + '</circle>';
        }
        s += '<path d="M53 52 H67 L60 64 Z" fill="#e6a83c"/>';
        if (sleeping) s += svgSleepBubble(80, 58);
        return s;
    }

    // --- 백조 ---
    function formSwan(sleeping) {
        let s = svgGround(26);
        s += svgFeet(58, 74, 97, "#f0a04b");
        s += '<ellipse cx="66" cy="78" rx="31" ry="21" fill="#ffffff" stroke="#eceff3" stroke-width="2"/>';
        s += '<path d="M56 72 C36 68 32 46 43 34" fill="none" stroke="#ffffff" stroke-width="13" stroke-linecap="round"/>';
        s += '<path d="M56 72 C36 68 32 46 43 34" fill="none" stroke="#eceff3" stroke-width="1.5" stroke-linecap="round"/>';
        s += '<circle cx="46" cy="31" r="11.5" fill="#ffffff" stroke="#eceff3" stroke-width="1.5"/>';
        s += '<ellipse cx="76" cy="76" rx="16" ry="12" fill="#f5f7fa"/>';
        s += '<path d="M88 66 C100 66 104 76 100 84 C96 76 92 72 86 72 Z" fill="#ffffff" stroke="#eceff3" stroke-width="1.5"/>';
        s += '<path d="M36 30 L25 33 L36 37 Z" fill="#f0a04b"/>';
        s += '<ellipse cx="38" cy="31" rx="3.4" ry="4" fill="#3a3a3a"/>';
        if (sleeping) {
            s += '<path d="M43 30 q 4 5 8 0" fill="none" stroke="#4a3524" stroke-width="2.4" stroke-linecap="round"/>';
        } else {
            const swDur = (4 + Math.random() * 3).toFixed(1);
            s += '<circle cx="47" cy="29" r="3.2" fill="#4a3524">' +
                 '<animate attributeName="r" values="3.2;3.2;0.3;3.2" keyTimes="0;0.93;0.965;1" dur="' + swDur + 's" repeatCount="indefinite"/></circle>' +
                 '<circle cx="48.2" cy="27.8" r="1.1" fill="#fff">' +
                 '<animate attributeName="r" values="1.1;1.1;0;1.1" keyTimes="0;0.93;0.965;1" dur="' + swDur + 's" repeatCount="indefinite"/></circle>';
        }
        s += svgBlush(44, 56, 37, 4);
        if (sleeping) s += svgSleepBubble(26, 26);
        return s;
    }

    // --- 비둘기 (히든: 빗속에서 자란 아이) ---
    // 잿빛 파랑에 목덜미가 무지갯빛으로 도는 게 특징입니다.
    function formRainbird(sleeping) {
        const body = "#8f9bb3", dark = "#6d7a94";
        let s = svgGround(26);
        s += svgFeet(53, 71, 97, "#e07a7a");
        // 꼬리
        s += '<path d="M92 74 L112 66 L110 82 L92 84 Z" fill="' + dark + '"/>';
        s += '<ellipse cx="60" cy="74" rx="30" ry="25" fill="' + body + '"/>';
        // 목덜미 광택 — 비 온 뒤 젖은 깃털처럼
        s += '<ellipse cx="52" cy="52" rx="15" ry="12" fill="#7fd4c1" opacity="0.55"/>';
        s += '<ellipse cx="54" cy="56" rx="12" ry="8" fill="#b58fd6" opacity="0.45"/>';
        // 날개
        s += '<ellipse cx="72" cy="76" rx="18" ry="13" fill="' + dark + '" transform="rotate(12 72 76)"/>';
        s += '<g stroke="#5b6880" stroke-width="1.2" opacity="0.7">' +
             '<path d="M62 72 L84 78" fill="none"/><path d="M62 78 L84 84" fill="none"/></g>';
        s += '<circle cx="50" cy="48" r="16" fill="' + body + '"/>';
        s += '<path d="M36 48 L24 51 L36 55 Z" fill="#e0a24b"/>';
        s += '<ellipse cx="37" cy="47" rx="2.6" ry="3" fill="#4a3524"/>';
        if (sleeping) {
            s += '<path d="M43 47 q 5 6 10 0" fill="none" stroke="#4a3524" stroke-width="2.6" stroke-linecap="round"/>';
        } else {
            const d = (4 + Math.random() * 3).toFixed(1);
            s += '<circle cx="48" cy="46" r="3.6" fill="#4a3524">' +
                 '<animate attributeName="r" values="3.6;3.6;0.4;3.6" keyTimes="0;0.93;0.965;1" dur="' + d + 's" repeatCount="indefinite"/></circle>' +
                 '<circle cx="49.3" cy="44.6" r="1.2" fill="#fff"/>';
        }
        // 함께 맞은 빗방울
        s += '<g fill="#9fd8f5" opacity="0.75">' +
             '<path d="M26 22 q3 5 0 7 q-3-2 0-7"/><path d="M96 30 q3 5 0 7 q-3-2 0-7"/>' +
             '<path d="M84 16 q2.5 4 0 5.5 q-2.5-1.5 0-5.5"/></g>';
        s += svgBlush(42, 60, 54, 4);
        if (sleeping) s += svgSleepBubble(88, 34);
        return s;
    }

    // --- 밤새 (히든: 깊은 밤에 자란 아이) ---
    // 남보라 깃털에 별빛이 앉은 부엉이입니다.
    function formNightowl(sleeping) {
        const body = "#4b4b73", dark = "#3a3a5c";
        let s = svgGround(26);
        s += svgFeet(51, 69, 97, "#c9a24a");
        s += '<path d="M38 26 L44 6 L54 22 Z" fill="' + dark + '"/>';
        s += '<path d="M82 26 L76 6 L66 22 Z" fill="' + dark + '"/>';
        s += '<ellipse cx="60" cy="66" rx="32" ry="34" fill="' + body + '"/>';
        s += '<ellipse cx="60" cy="74" rx="20" ry="22" fill="#6f6f9c" opacity="0.8"/>';
        // 가슴에 앉은 별
        s += '<g fill="#ffe08a" opacity="0.9">' +
             '<path d="M52 70 l1.6 3.4 3.7.4-2.8 2.5.8 3.6-3.3-1.9-3.3 1.9.8-3.6-2.8-2.5 3.7-.4z"/>' +
             '<path d="M67 80 l1.2 2.6 2.8.3-2.1 1.9.6 2.7-2.5-1.4-2.5 1.4.6-2.7-2.1-1.9 2.8-.3z"/></g>';
        s += '<ellipse cx="30" cy="64" rx="8" ry="18" fill="' + dark + '" transform="rotate(-10 30 64)"/>';
        s += '<ellipse cx="90" cy="64" rx="8" ry="18" fill="' + dark + '" transform="rotate(10 90 64)"/>';
        s += '<circle cx="47" cy="46" r="14" fill="#2b2b45"/><circle cx="73" cy="46" r="14" fill="#2b2b45"/>';
        if (sleeping) {
            s += '<path d="M39 46 q 8 9 16 0" fill="none" stroke="#ffe08a" stroke-width="3" stroke-linecap="round"/>';
            s += '<path d="M65 46 q 8 9 16 0" fill="none" stroke="#ffe08a" stroke-width="3" stroke-linecap="round"/>';
        } else {
            // 밤에 보는 눈이라 노랗게 빛납니다
            const d = (4 + Math.random() * 3).toFixed(1);
            const bl = '<animate attributeName="r" values="7;7;0.6;7" keyTimes="0;0.93;0.965;1" dur="' + d + 's" repeatCount="indefinite"/>';
            s += '<circle cx="47" cy="46" r="7" fill="#ffd34d">' + bl + '</circle>';
            s += '<circle cx="73" cy="46" r="7" fill="#ffd34d">' + bl + '</circle>';
            s += '<circle cx="47" cy="46" r="2.6" fill="#3a2a10"/><circle cx="73" cy="46" r="2.6" fill="#3a2a10"/>';
        }
        s += '<path d="M53 52 H67 L60 64 Z" fill="#c9a24a"/>';
        if (sleeping) s += svgSleepBubble(80, 58);
        return s;
    }

    // =================================================================
    // 등급(야생 / 건강한 / 찬란한)별 겉모습
    //
    // 같은 종이라도 얼마나 잘 돌봤는지가 눈에 보여야 합니다.
    // 종 그림은 그대로 두고 색감과 장식만 얹어서, 종 6 × 등급 3 = 18종이
    // 전부 다르게 보이도록 했습니다.
    // =================================================================
    function tierDress(inner, tier) {
        if (tier === "wild") {
            // 야생 — 색이 바래고 깃털이 헝클어져 있습니다
            return '<g style="filter:saturate(0.5) brightness(0.94)">' + inner + '</g>' +
                   '<g stroke="#8a7f6a" stroke-width="2" stroke-linecap="round" opacity="0.8">' +
                   '<path d="M44 22 l-5 -9" fill="none"/><path d="M52 19 l1 -10" fill="none"/>' +
                   '<path d="M60 21 l6 -8" fill="none"/></g>' +
                   '<g fill="#a99b7e" opacity="0.6">' +
                   '<ellipse cx="26" cy="100" rx="7" ry="2"/><ellipse cx="95" cy="103" rx="6" ry="2"/></g>';
        }
        if (tier === "healthy") {
            // 건강한 — 색이 또렷하고 곁에 풀꽃이 돋아 있습니다
            return '<g style="filter:saturate(1.05)">' + inner + '</g>' +
                   '<g><path d="M22 104 q3 -12 9 -14 q-2 11 -9 14" fill="#7fc98a"/>' +
                   '<circle cx="31" cy="89" r="3.4" fill="#ff9ec4"/>' +
                   '<path d="M100 105 q-3 -10 -8 -12 q2 9 8 12" fill="#7fc98a"/>' +
                   '<circle cx="92" cy="92" r="3" fill="#ffd166"/></g>';
        }
        if (tier === "radiant") {
            // 찬란한 — 금빛 관과 반짝임, 은은한 후광
            return '<circle cx="60" cy="62" r="52" fill="url(#g-halo)"/>' +
                   '<g style="filter:saturate(1.2) brightness(1.05)">' + inner + '</g>' +
                   // 관
                   '<path d="M44 18 L50 6 L56 15 L60 3 L64 15 L70 6 L76 18 Z" fill="#ffd34d" stroke="#e0a92b" stroke-width="1.5" stroke-linejoin="round"/>' +
                   '<circle cx="60" cy="9" r="2.6" fill="#fff3b0"/>' +
                   // 반짝임
                   '<g fill="#fff6c9">' +
                   '<path d="M20 40 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z">' +
                     '<animate attributeName="opacity" values="0.3;1;0.3" dur="2.2s" repeatCount="indefinite"/></path>' +
                   '<path d="M100 52 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6z">' +
                     '<animate attributeName="opacity" values="1;0.3;1" dur="2.8s" repeatCount="indefinite"/></path>' +
                   '<path d="M92 24 l1.3 3.2 3.2 1.3 -3.2 1.3 -1.3 3.2 -1.3 -3.2 -3.2 -1.3 3.2 -1.3z">' +
                     '<animate attributeName="opacity" values="0.5;1;0.5" dur="1.8s" repeatCount="indefinite"/></path>' +
                   '</g>';
        }
        return inner;
    }

    function characterSVG(form, opts) {
        opts = opts || {};
        const sleeping = !!opts.asleep;
        const size = opts.size || 132;
        let inner;
        switch (form) {
            case "egg":       inner = formEgg(sleeping, opts.progress || 0); break;
            case "hatchling": inner = formChick(sleeping, { body: "#ffdc5e", dark: "#f2bd2c", bodyY: 74, bodyRx: 23, bodyRy: 20, headY: 47, headR: 17, shell: true }); break;
            case "chubby":    inner = formChick(sleeping, { body: "#ffd54a", dark: "#f0b71f", bodyY: 76, bodyRx: 27, bodyRy: 23, headY: 45, headR: 20 }); break;
            case "brave":     inner = formChick(sleeping, { body: "#ffc93c", dark: "#eba606", bodyY: 76, bodyRx: 28, bodyRy: 24, headY: 43, headR: 21, spread: true, tuft: true }); break;
            case "adult":     inner = formHen(sleeping, { body: "#f6bd3b", dark: "#dda017", comb: true, wattle: true, tail: true }); break;
            case "turkey":    inner = formHen(sleeping, { body: "#a97045", dark: "#8a5730", wattle: true, snood: true, fan: ["#e0b585", "#cf9760", "#bd7c42", "#a3612f", "#bd7c42", "#cf9760", "#e0b585"] }); break;
            case "peacock":   inner = formHen(sleeping, { body: "#2f9e8f", dark: "#1f7f74", crest: true, beak: "#ffb84d", eyeSpots: true, fan: ["#4fc3d9", "#3fb4c9", "#2f9e8f", "#2c7fb8", "#2f9e8f", "#3fb4c9", "#4fc3d9"] }); break;
            case "owl":       inner = formOwl(sleeping); break;
            case "swan":      inner = formSwan(sleeping); break;
            case "rainbird":  inner = formRainbird(sleeping); break;
            case "nightowl":  inner = formNightowl(sleeping); break;
            default:          inner = formChick(sleeping, { body: "#ffd54a", dark: "#f0b71f", bodyY: 76, bodyRx: 27, bodyRy: 23, headY: 45, headR: 20 });
        }
        // 등급이 주어지면 색감과 장식을 얹습니다 (종 6 × 등급 3 = 18종이 전부 달라짐)
        if (opts.tier) inner = tierDress(inner, opts.tier);

        let acc = "";
        if (opts.accessory) {
            const a = accessoryAnchor[form] || accessoryAnchor.chubby;
            acc = '<text x="' + a.x + '" y="' + a.y + '" font-size="' + a.size + '" text-anchor="middle" dominant-baseline="middle">' + opts.accessory + '</text>';
        }
        return '<svg viewBox="0 0 120 120" width="' + size + '" height="' + size +
               '" xmlns="http://www.w3.org/2000/svg">' + svgDefs() + inner + acc + '</svg>';
    }

    // 단색으로만 칠하면 납작해 보여서, 몸통마다 위가 밝고 아래가 어두운
    // 그라데이션을 깔아줍니다. 각 form 이 fill="url(#g-body)" 로 씁니다.
    function svgDefs() {
        return '<defs>' +
            '<radialGradient id="g-halo" cx="50%" cy="50%" r="50%">' +
                '<stop offset="55%" stop-color="#ffe9a8" stop-opacity="0"/>' +
                '<stop offset="82%" stop-color="#ffd86b" stop-opacity="0.34"/>' +
                '<stop offset="100%" stop-color="#ffcf4d" stop-opacity="0"/></radialGradient>' +
            '<radialGradient id="g-body" cx="38%" cy="28%" r="78%">' +
                '<stop offset="0%" stop-color="#ffffff" stop-opacity="0.55"/>' +
                '<stop offset="55%" stop-color="#ffffff" stop-opacity="0.08"/>' +
                '<stop offset="100%" stop-color="#8a5a10" stop-opacity="0.22"/>' +
            '</radialGradient>' +
            '<radialGradient id="g-shell" cx="36%" cy="26%" r="80%">' +
                '<stop offset="0%" stop-color="#ffffff" stop-opacity="0.85"/>' +
                '<stop offset="52%" stop-color="#fff6e2" stop-opacity="0.25"/>' +
                '<stop offset="100%" stop-color="#c9a061" stop-opacity="0.35"/>' +
            '</radialGradient>' +
            '<linearGradient id="g-straw" x1="0" y1="0" x2="0" y2="1">' +
                '<stop offset="0%" stop-color="#e8c98a"/>' +
                '<stop offset="100%" stop-color="#c09a55"/>' +
            '</linearGradient>' +
        '</defs>';
    }

    // 알이 얼마나 부화에 가까운지 (껍질 금이 가는 연출용)
    function eggProgress() {
        const next = stages[Math.min(currentLevel + 1, stages.length - 1)];
        if (!next || !next.expNeed) return 0;
        return Math.min(1, currentExp / next.expNeed);
    }

    function renderCharacter() {
        const form = currentCharForm();
        const chickEl = document.getElementById("chick");
        const tier = finalVariant ? String(finalVariant.key).split("-")[1] : null;

        // 주인공은 3D 로 그립니다. WebGL 이 안 되는 기기에서는
        // chick3d 가 조용히 실패하므로, 그때는 원래대로 SVG 를 넣습니다.
        let did3d = false;
        if (window.chick3d && window.chick3d.available()) {
            did3d = window.chick3d.setForm(form, {
                tier: tier,
                asleep: asleep,
                accessory: equippedAccessory ? accessories[equippedAccessory].emoji : null
            });
            if (did3d) window.chick3d.show();
        }

        if (chickEl) {
            // 3D 일 때 악세서리는 모델에 직접 씌웁니다(위 setForm).
            // 예전처럼 이모지를 화면 위에 띄우면 병아리가 움직여도 제자리에
            // 붙어 있어서 쓴 것처럼 보이지 않았어요.
            chickEl.innerHTML = did3d
                ? ""
                : characterSVG(form, {
                    asleep: asleep,
                    size: 132,
                    progress: eggProgress(),
                    // 다 자란 뒤에는 등급까지 겉모습에 드러납니다
                    tier: tier,
                    accessory: equippedAccessory ? accessories[equippedAccessory].emoji : null
                });
            chickEl.classList.toggle("is3d", did3d);
        }
        const walkEl = document.getElementById("walk-char");
        if (walkEl) {
            // 산책 캐릭터도 3D 로 구운 그림을 씁니다
            walkEl.innerHTML = charPic(form, {
                size: 46,
                tier: tier,
                accessory: equippedAccessory ? accessories[equippedAccessory].emoji : null
            });
        }
    }

    // 캠퍼스 산책(로드뷰·지도)에서도 같은 3D 모습을 쓰게 밖으로 내줍니다.
    // campus.js 는 따로 감싸인 파일이라 finalVariant·equippedAccessory 같은
    // 안쪽 값에 손이 닿지 않아요. 그래서 여기서 다 챙겨서 그림만 넘깁니다.
    function currentCharPic(px) {
        const tier = finalVariant ? String(finalVariant.key).split("-")[1] : null;
        return charPic(currentCharForm(), {
            size: px || 46,
            tier: tier,
            accessory: equippedAccessory ? accessories[equippedAccessory].emoji : null
        });
    }

    // ===================================================================
    // 애교 / 다가오기
    // 가만히 두면 스스로 폴짝 뛰거나 화면 쪽으로 다가와 말을 겁니다.
    // 탭하면 그때그때 다르게 반응하고, 배고프거나 졸릴 땐 시무룩해집니다.
    // (스탯은 건드리지 않습니다 — 먹이주기·쓰다듬기 밸런스를 지키기 위해서)
    // ===================================================================
    const CHAR_VOICE = {
        egg:       ["…톡톡", "꼼지락", "…?", "톡, 톡"],
        hatchling: ["삐약!", "삐약삐약", "…삐약?", "삐-약!"],
        chubby:    ["삐약~ 🎵", "삐약삐약!", "히히", "삐약♪"],
        brave:     ["꼬꼬!", "삐약! 삐약!", "다 컸죠?", "꼬꼬꼬"],
        adult:     ["꼬끼오~", "꼬꼬꼬", "든든하죠?", "꼬-끼-오!"],
        turkey:    ["구구!", "꼬르륵~", "구구구"],
        peacock:   ["꺄악~ ✨", "예쁘죠?", "우아~"],
        owl:       ["부엉…", "부엉부엉", "…부엉?"],
        swan:      ["끼룩~", "우아하죠?", "끼룩끼룩"],
        rainbird:  ["구구~", "비 오는 날 기억나?", "구구구"],
        nightowl:  ["부엉…", "밤이 좋아요", "부우엉"]
    };
    const CHAR_AEGYO_LINES = [
        "같이 있어줘서 고마워요", "오늘도 왔네요!", "보고 싶었어요", "헤헤",
        "쓰다듬어 주세요~", "옆에 있을게요", "심심했어요!", "여기 봐요!",
        "제일 좋아해요", "오늘 어땠어요?"
    ];
    const CHAR_NEED_LINES = {
        hunger: ["배고파요…", "밥 주세요…", "꼬르륵…"],
        energy: ["졸려요…", "하암…", "눕고 싶어요…"],
        love:   ["…심심해요", "혼자 있었어요", "안아주세요…"]
    };

    const AEGYO_MOVES = ["ag-hop", "ag-tilt", "ag-spin", "ag-approach", "ag-nuzzle", "ag-wiggle", "ag-shy"];
    let aegyoTimer = null;
    let lastAegyoMove = "";

    function pickOne(list) { return list[Math.floor(Math.random() * list.length)]; }

    // 작은 캐릭터 그림 하나 — 가능하면 3D 로 구운 이미지, 아니면 기존 SVG.
    // 도감·산책·동반자 카드처럼 여러 개가 동시에 나오는 곳에서 씁니다.
    // (3D 캔버스를 수십 개 띄우면 폰이 못 버티므로 이미지로 구워 씁니다)
    function charPic(form, opts) {
        opts = opts || {};
        const px = opts.size || 52;
        if (window.chick3d && window.chick3d.available()) {
            const img = window.chick3d.snapshotImg(form, {
                tier: opts.tier, asleep: opts.asleep, accessory: opts.accessory
            }, px, opts.cls);
            if (img) return img;
        }
        return characterSVG(form, opts);
    }

    // 한글 조사 — 마지막 글자의 받침을 보고 골라 줍니다.
    // 이게 없으면 "당근을(를) 먹었어요" 처럼 어색하게 보여요.
    function eulReul(w) {
        const c = w.charCodeAt(w.length - 1);
        if (c < 0xAC00 || c > 0xD7A3) return "를";
        return ((c - 0xAC00) % 28) ? "을" : "를";
    }
    function iGa(w) {
        const c = w.charCodeAt(w.length - 1);
        if (c < 0xAC00 || c > 0xD7A3) return "가";
        return ((c - 0xAC00) % 28) ? "이" : "가";
    }
    function eunNeun(w) {
        const c = w.charCodeAt(w.length - 1);
        if (c < 0xAC00 || c > 0xD7A3) return "는";
        return ((c - 0xAC00) % 28) ? "은" : "는";
    }
    // 로/으로 — 받침이 없거나 ㄹ 받침이면 '로'
    function euRo(w) {
        const c = w.charCodeAt(w.length - 1);
        if (c < 0xAC00 || c > 0xD7A3) return "로";
        const jong = (c - 0xAC00) % 28;
        return (jong === 0 || jong === 8) ? "로" : "으로";
    }

    // 지금 캐릭터가 제일 아쉬워하는 게 뭔지 (없으면 null)
    function currentNeed() {
        if (hunger < 30) return "hunger";
        if (energy < 30) return "energy";
        if (love < 30) return "love";
        return null;
    }

    function charVoice() {
        const list = CHAR_VOICE[currentCharForm()] || CHAR_VOICE.chubby;
        return pickOne(list);
    }

    // 캐릭터 머리 위에 말풍선을 띄웁니다
    function spawnChickBubble(text) {
        const wrap = document.getElementById("chick-stage-wrap");
        if (!wrap) return;
        const old = wrap.querySelector(".chick-bubble");
        if (old) old.remove();
        const el = document.createElement("div");
        el.className = "chick-bubble";
        el.innerText = text;
        wrap.appendChild(el);
        setTimeout(() => el.remove(), 2000);
    }

    // 안쪽 svg에 애니메이션 클래스를 잠깐 붙였다 뗍니다
    function playAegyo(move, duration) {
        const svg = document.querySelector("#chick svg");
        if (!svg) return;
        AEGYO_MOVES.concat(["ag-droop"]).forEach(m => svg.classList.remove(m));
        void svg.offsetWidth;               // 같은 동작을 연달아 해도 다시 재생되도록
        svg.classList.add(move);
        setTimeout(() => svg.classList.remove(move), duration || 1200);
    }

    // 가만히 있을 때 스스로 하는 애교
    function doIdleAegyo() {
        if (asleep) return;
        const need = currentNeed();
        if (need) {                          // 아쉬운 게 있으면 시무룩하게 조르기
            playAegyo("ag-droop", 1400);
            spawnChickBubble(pickOne(CHAR_NEED_LINES[need]));
            return;
        }
        let move = pickOne(AEGYO_MOVES);
        if (move === lastAegyoMove) move = pickOne(AEGYO_MOVES);   // 같은 동작 연속 방지
        lastAegyoMove = move;
        playAegyo(move, move === "ag-approach" ? 1600 : 1200);

        if (move === "ag-approach" || move === "ag-nuzzle") {
            spawnChickBubble(pickOne(CHAR_AEGYO_LINES));           // 다가올 땐 말도 걸고
            if (Math.random() < 0.5) spawnHearts();
        } else if (Math.random() < 0.6) {
            spawnChickBubble(charVoice());
        }
    }

    // 6~13초 간격으로 반복 (일정하지 않게 해서 살아있는 느낌을 줍니다)
    function scheduleAegyo() {
        aegyoTimer = setTimeout(() => {
            const careOpen = document.getElementById("game-view").style.display !== "none" &&
                             document.getElementById("tab-panel-care").classList.contains("active");
            if (careOpen && !document.hidden) doIdleAegyo();
            scheduleAegyo();
        }, 6000 + Math.random() * 7000);
    }

    function startIdleAegyo() {
        if (aegyoTimer) return;
        scheduleAegyo();
    }

    function stopIdleAegyo() {
        if (aegyoTimer) { clearTimeout(aegyoTimer); aegyoTimer = null; }
    }

    // 캐릭터를 직접 탭했을 때
    let lastChickTapAt = 0;
    function tapChick() {
        const now = Date.now();
        if (now - lastChickTapAt < 400) return;      // 연타 방지
        lastChickTapAt = now;

        if (asleep) {
            playAegyo("ag-droop", 1200);
            spawnChickBubble("쉿… 자는 중이에요 💤");
            return;
        }
        const need = currentNeed();
        if (need) {
            playAegyo("ag-droop", 1400);
            spawnChickBubble(pickOne(CHAR_NEED_LINES[need]));
            return;
        }
        // 기분이 괜찮을 땐 반갑게 반응
        const move = pickOne(["ag-hop", "ag-wiggle", "ag-nuzzle", "ag-spin", "ag-shy"]);
        playAegyo(move, 1200);
        spawnChickBubble(Math.random() < 0.5 ? charVoice() : pickOne(CHAR_AEGYO_LINES));
        if (Math.random() < 0.45) spawnHearts();
    }

    // 보살피기 탭에 들어오면 반갑게 다가와 인사합니다
    function greetOnCareTab() {
        if (asleep) return;
        setTimeout(() => {
            const careOpen = document.getElementById("tab-panel-care").classList.contains("active");
            if (!careOpen || asleep) return;
            playAegyo("ag-approach", 1600);
            spawnChickBubble(currentNeed() ? pickOne(CHAR_NEED_LINES[currentNeed()]) : pickOne(CHAR_AEGYO_LINES));
        }, 450);
    }

    function showGame() {
        document.getElementById('main-view').style.display = 'none';
        const medView = document.getElementById('medication-view');
        if (medView) medView.style.display = 'none';
        document.getElementById('game-view').style.display = 'flex';
        window.scrollTo(0, 0);
        gameStarted = true;
        updateResourceBar();
        renderFarm();
        renderShop();
        updateFishStatus();
        updateMineStatus();
        updateAccessoryVisual();
        buildPlayGrid();
        document.getElementById("play-best").innerText = playBestScore;
        if (!document.querySelector('.walk-deco')) setWalkScene(currentWalkScene);
        checkMissions();
        startTicking();
        startIdleAegyo();
        greetOnCareTab();
    }

    function startTicking() {
        if (tickIntervalStarted) return;
        tickIntervalStarted = true;
        setInterval(tick, 1000);
    }

    function showMain() {
        document.getElementById('game-view').style.display = 'none';
        const medView = document.getElementById('medication-view');
        if (medView) medView.style.display = 'none';
        document.getElementById('main-view').style.display = 'flex';
        window.scrollTo(0, 0);
        stopIdleAegyo();
    }

    function spawnFloatText(btnEl, text) {
        const el = document.createElement("span");
        el.className = "float-xp";
        el.innerText = text;
        btnEl.appendChild(el);
        setTimeout(() => el.remove(), 900);
    }

    function spawnConfetti() {
        const box = document.getElementById("game-box");
        const emojis = ["🎉", "✨", "💛", "🌟", "🐤"];
        for (let i = 0; i < 18; i++) {
            const piece = document.createElement("span");
            piece.className = "confetti-piece";
            piece.innerText = emojis[Math.floor(Math.random() * emojis.length)];
            piece.style.left = Math.random() * 100 + "%";
            piece.style.animationDuration = (1.2 + Math.random() * 1.2) + "s";
            piece.style.fontSize = (1 + Math.random() * 0.8) + "rem";
            box.appendChild(piece);
            setTimeout(() => piece.remove(), 2600);
        }
    }

    function updateStageClass() {
        document.getElementById("game-view").className = "view stage-" + Math.min(currentLevel, 5);
    }

    function formatTime(sec) {
        const m = Math.floor(sec / 60).toString().padStart(2, "0");
        const s = Math.floor(sec % 60).toString().padStart(2, "0");
        return m + ":" + s;
    }

    function setStat(name, value) {
        const clamped = Math.max(0, Math.min(100, value));
        if (name === "hunger") hunger = clamped;
        if (name === "love") love = clamped;
        if (name === "energy") energy = clamped;

        const fill = document.getElementById(name + "-fill");
        const text = document.getElementById(name + "-text");
        fill.style.width = clamped + "%";
        text.innerText = Math.round(clamped) + "%";
        fill.classList.toggle("low", clamped < 20);
    }

    function flashStatDelta(name, delta) {
        const label = document.getElementById(name + "-text");
        if (!label || !label.parentElement) return;
        const el = document.createElement("span");
        el.className = "stat-delta " + (delta >= 0 ? "pos" : "neg");
        el.innerText = (delta >= 0 ? "+" : "") + Math.round(delta);
        label.parentElement.appendChild(el);
        setTimeout(() => el.remove(), 900);
    }

    let eventToastTimeout = null;
    function showEventToast(text, type) {
        const el = document.getElementById("event-toast");
        if (!el) return;
        el.innerText = text;
        el.className = "event-toast show " + (type || "neutral");
        clearTimeout(eventToastTimeout);
        eventToastTimeout = setTimeout(() => el.classList.remove("show"), 3200);
    }

    function showMessage(text, warn) {
        const msgEl = document.getElementById("message");
        msgEl.innerText = text;
        msgEl.classList.toggle("warn", !!warn);
    }

    function checkWarnings() {
        if (asleep) return;
        if (hunger < 20 && !lastWarn.hunger) {
            showMessage("배가 고파요... 먹이를 주세요 🥺", true);
            lastWarn.hunger = true;
        } else if (hunger >= 20) lastWarn.hunger = false;

        if (energy < 20 && !lastWarn.energy) {
            showMessage("너무 지쳐 보여요. 재워주는 게 좋겠어요 😪", true);
            lastWarn.energy = true;
        } else if (energy >= 20) lastWarn.energy = false;

        if (love < 20 && !lastWarn.love) {
            showMessage("외로워하는 것 같아요. 쓰다듬어 주세요 🥲", true);
            lastWarn.love = true;
        } else if (love >= 20) lastWarn.love = false;
    }

    function tick() {
        farmTick++;
        fieldOrder.forEach(f => {
            (fieldPlots[f] || []).forEach(plot => {
                // 빈 밭은 plot.crop 이 없으므로 반드시 growing 인지 먼저 확인해야 합니다
                if (plot.state !== "growing") return;
                // [3][4] 날씨와 '성장 1.5배' 버프가 필요 시간을 함께 줄이거나 늘립니다.
                // 저장된 plot.start 는 건드리지 않고 기준선만 나눠서, 기존 세이브와도 호환돼요.
                const need = cropTypes[plot.crop].growDuration
                             / (weatherGrowMod() * buffMult("growfast"));
                if (farmTick - plot.start >= need) {
                    plot.state = "ready";
                }
            });
        });
        const farmPanelActive = document.getElementById("tab-panel-farm").classList.contains("active");
        if (farmPanelActive) renderFarm();

        if (!finalVariant) {
            elapsedSeconds++;
            document.getElementById("playtime").innerText = formatTime(elapsedSeconds);

            const eff = accEffect();
            if (asleep) {
                sleepSeconds++;
                setStat("hunger", hunger - 0.08);
                setStat("love", love - 0.05 * eff.loveDecay);
                setStat("energy", energy + 2.0);
                flashStatDelta("energy", 2.0);
                if (energy >= 100) {
                    toggleSleep();
                    showMessage("잘 잤어요! 기운이 넘쳐요 ⚡", false);
                }
            } else {
                setStat("hunger", hunger - 0.22);
                setStat("energy", energy - 0.15 * eff.energyDecay);
                setStat("love", love - 0.13 * eff.loveDecay);
                checkWarnings();
            }

            careSum += (hunger + love + energy) / 3;
            careTicks++;

            checkLevelUp();
            updateTimeGateHint();
        }

        saveGame();
    }

    // 2D 일 때는 CSS 클래스로, 3D 일 때는 모델을 실제로 움직입니다
    const CHICK_ANIM_3D = { eating: "eat", petted: "pet", happy: "hop", tapped: "hop" };

    function bumpChick(extraClass, duration) {
        const chickEl = document.getElementById("chick");
        chickEl.classList.add(extraClass);
        setTimeout(() => chickEl.classList.remove(extraClass), duration);
        if (window.chick3d && window.chick3d.available()) {
            window.chick3d.play(CHICK_ANIM_3D[extraClass] || "hop", duration);
        }
    }

    function spawnFoodFly() {
        const wrap = document.getElementById("chick-stage-wrap");
        const foods = ["🍚", "🌾", "🥕", "🍎"];
        const el = document.createElement("span");
        el.className = "food-fly";
        el.innerText = foods[Math.floor(Math.random() * foods.length)];
        wrap.appendChild(el);
        setTimeout(() => el.remove(), 700);
    }

    function spawnPetHand() {
        const wrap = document.getElementById("chick-stage-wrap");
        const el = document.createElement("span");
        el.className = "pet-hand";
        el.innerText = "✋";
        wrap.appendChild(el);
        setTimeout(() => el.remove(), 600);
    }

    function spawnHearts() {
        const wrap = document.getElementById("chick-stage-wrap");
        const icons = ["💕", "💗", "✨"];
        for (let i = 0; i < 3; i++) {
            const el = document.createElement("span");
            el.className = "heart-particle";
            el.innerText = icons[i % icons.length];
            el.style.left = (38 + Math.random() * 24) + "%";
            el.style.top = "30%";
            el.style.setProperty("--dx", (Math.random() * 40 - 20) + "px");
            wrap.appendChild(el);
            setTimeout(() => el.remove(), 1000);
        }
    }

    let zzzInterval = null;
    function spawnZzz() {
        const wrap = document.getElementById("chick-stage-wrap");
        const el = document.createElement("span");
        el.className = "zzz-float";
        el.innerText = "Z";
        el.style.fontSize = (0.9 + Math.random() * 0.6) + "rem";
        wrap.appendChild(el);
        setTimeout(() => el.remove(), 1800);
    }
    function startZzz() {
        spawnZzz();
        zzzInterval = setInterval(spawnZzz, 1400);
    }
    function stopZzz() {
        if (zzzInterval) { clearInterval(zzzInterval); zzzInterval = null; }
    }

    function getBestMealKey() {
        // 좋은 밥(포만감이 큰 요리)부터 우선 사용
        const order = ["tangerine", "strawberry", "octopus", "tomato", "potato", "squid",
                       "carrot", "mackerel", "wheat", "anchovy"];
        for (const k of order) {
            if (mealInventory[k] > 0) return k;
        }
        return null;
    }

    // 밥 고르기 — 예전에는 제일 좋은 걸 알아서 먹였습니다.
    // 그러면 아껴둔 감귤주스가 배가 살짝 줄었을 때 그냥 사라져서,
    // 버프도 못 쓰고 아깝습니다. 이제 직접 고를 수 있게 판을 띄웁니다.
    function openFeedPicker() {
        if (asleep || finalVariant) return;
        if (hunger >= 100) {
            showMessage("이미 배가 불러서 더 먹을 수 없어요 🍚", false);
            return;
        }
        const have = Object.keys(mealTypes).filter(k => (mealInventory[k] || 0) > 0);
        if (!have.length) {
            showMessage("먹일 밥이 없어요! 농장에서 작물을 키우거나 낚시를 해서 요리해보세요 🌾", true);
            return;
        }
        // 한 종류뿐이면 굳이 고를 것도 없으니 바로 먹입니다
        if (have.length === 1) { feedPet(have[0]); return; }

        const order = ["tangerine", "strawberry", "octopus", "tomato", "potato", "squid",
                       "carrot", "mackerel", "wheat", "anchovy"];
        const sorted = order.filter(k => have.indexOf(k) >= 0);

        let html = '<div class="feed-pick-head">무엇을 줄까요?<small>배고픔 ' +
                   Math.round(hunger) + ' / 100</small></div><div class="feed-pick-list">';
        sorted.forEach(k => {
            const m = mealTypes[k];
            const b = m.buff ? BUFF_TYPES[m.buff] : null;
            // 이미 배부른 만큼은 버려지므로 미리 알려줍니다
            // 배고픔은 소수점까지 있는 값이라, 그대로 쓰면 "19.18 남아 버려져요"로 나옵니다
            const waste = Math.round(Math.max(0, (hunger + m.hungerRestore) - 100));
            html += '<button type="button" class="feed-pick" onclick="feedPet(\'' + k + '\')">' +
                    '<span class="fp-emoji">' + m.emoji + '</span>' +
                    '<span class="fp-body"><b>' + m.label + ' <small>x' + mealInventory[k] + '</small></b>' +
                    '<small>포만감 +' + m.hungerRestore + ' · 경험치 +' + m.exp +
                    (b ? ' · ' + b.emoji + ' ' + b.label : '') +
                    (waste > 0 ? ' <i class="fp-waste">(' + waste + ' 남아 버려져요)</i>' : '') +
                    '</small></span></button>';
        });
        html += '</div><button type="button" class="feed-pick-close" onclick="closeFeedPicker()">닫기</button>';
        const box = document.getElementById("feed-picker");
        box.innerHTML = html;
        box.classList.add("show");
    }

    function closeFeedPicker() {
        const box = document.getElementById("feed-picker");
        if (box) box.classList.remove("show");
    }

    function feedPet(pick) {
        if (asleep || finalVariant) return;
        if (hunger >= 100) {
            showMessage("이미 배가 불러서 더 먹을 수 없어요 🍚", false);
            return;
        }
        closeFeedPicker();
        const key = (pick && mealInventory[pick] > 0) ? pick : getBestMealKey();
        if (!key) {
            showMessage("먹일 밥이 없어요! 농장에서 작물을 키우거나 낚시를 해서 요리해보세요 🌾", true);
            return;
        }
        mealInventory[key]--;
        updateResourceBar();
        const meal = mealTypes[key];
        setStat("hunger", hunger + meal.hungerRestore);
        flashStatDelta("hunger", meal.hungerRestore);
        addExp(meal.exp);
        feedCount++;
        addWarmth(1);
        questTick("care");
        totalFeedCount++;
        bumpChick("eating", 420);
        spawnFoodFly();
        spawnFloatText(document.getElementById("feed-btn"), "+" + meal.exp + " EXP");
        // [3] 요리에 붙은 버프 발동 — 상단 버프 바에 아이콘과 남은 시간이 뜹니다
        if (meal.buff) {
            grantBuff(meal.buff);
            const b = BUFF_TYPES[meal.buff];
            showEventToast(b.emoji + " " + b.label + " 버프가 5분간 켜졌어요!", "good");
        }
        if (!lastWarn.hunger || hunger > 40) showMessage(meal.emoji + " " + meal.label + eulReul(meal.label) + " 냠냠 맛있게 먹었어요!", false);
        lastWarn.hunger = false;
        checkLevelUp();
        checkMissions();
    }

    // 손으로 쓸어서 쓰다듬을 때, 몇 번째 쓸기인지 세는 값.
    // 쓸기 한 번은 버튼 한 번의 '반'만 쳐주려고 씁니다.
    let strokeTick = 0;
    let lastStrokeMsg = 0;

    // stroke = true 면 3D 화면에서 손가락으로 직접 쓸어준 경우입니다.
    // 버튼과 달리 연속으로 들어오기 때문에 효과를 반으로 줄이고,
    // 말풍선·손 아이콘 같은 요란한 연출은 뺍니다 (3D 쪽에서 이미 반응해요).
    // 쓰다듬기가 실제로 먹혔으면 true 를 돌려줍니다.
    // 3D 쪽은 이 값을 보고 하트를 띄울지 정해요 — 자고 있는데 하트가
    // 피어오르면 사랑이 오른 줄 알거든요.
    function petPet(stroke) {
        if (asleep || finalVariant) return false;
        if (love >= 100) {
            if (!stroke) showMessage("이미 충분한 사랑을 받고 있어요 💗", false);
            return false;
        }
        // 쓸어주는 중에 기운이 바닥나면 멈춥니다
        if (stroke && energy <= 5) {
            if (Date.now() - lastStrokeMsg > 4000) {
                lastStrokeMsg = Date.now();
                showMessage("기운이 없어요... 조금 쉬게 해줄까요?", false);
            }
            return false;
        }

        const loveGain = stroke ? 10 : 22;
        const enCost = stroke ? 2 : 4;
        const expGain = stroke ? 4 : 8;

        setStat("love", love + loveGain);
        flashStatDelta("love", loveGain);
        setStat("energy", energy - enCost);
        flashStatDelta("energy", -enCost);
        addExp(expGain);

        // 쓸기는 두 번에 한 번만 '쓰다듬은 횟수'로 셉니다 —
        // 안 그러면 진화 조건이 손가락 속도로 정해져 버려요
        let counts = true;
        if (stroke) { strokeTick++; counts = (strokeTick % 2 === 0); }

        if (counts) {
            petCount++;
            addWarmth(1);                 // [P0] 잘 돌본 만큼 온기가 쌓입니다
            questTick("care");            // [P1] 오늘의 부탁 진행도
            totalPetCount++;
            // [5] 히든 진화 조건 — 비 오는 날 쓰다듬은 횟수를 따로 셉니다
            if (currentWeather === "rain") {
                rainPetCount++;
                if (rainPetCount === 30) {
                    showEventToast("🕊️ 빗속에서도 곁을 지켜줬네요... 뭔가 달라지고 있어요", "good");
                }
            }
        }

        if (!stroke) {
            bumpChick("petted", 500);
            spawnPetHand();
            spawnHearts();
            spawnFloatText(document.getElementById("pet-btn"), "+8 EXP");
            showMessage(encourageWords[Math.floor(Math.random() * encourageWords.length)], false);
        } else if (Date.now() - lastStrokeMsg > 3500) {
            // 계속 쓸어주면 가끔 한마디만 — 말풍선이 쉴 새 없이 바뀌면 정신없어요
            lastStrokeMsg = Date.now();
            showMessage(encourageWords[Math.floor(Math.random() * encourageWords.length)], false);
        }

        lastWarn.love = false;
        checkLevelUp();
        checkMissions();
        return true;
    }

    // 3D 화면에서 손가락으로 쓸어줄 때 chick3d 가 여기를 부릅니다
    window.onChickPet = function () { return petPet(true); };

    // ===== 농장 =====
    // 개방된 농장에서 키울 수 있는 작물 목록
    function unlockedCrops() {
        const list = [];
        fieldOrder.forEach(f => {
            if (fieldsUnlocked[f]) farmFields[f].crops.forEach(c => list.push(c));
        });
        return list;
    }

    function nextSlotCost(fieldKey) {
        const f = farmFields[fieldKey];
        const owned = fieldPlots[fieldKey].length;
        return f.slotCostBase + (owned - f.baseSlots) * f.slotCostStep;
    }

    // 농장 입구: 부지 목록
    function renderFarmHub() {
        const wrap = document.getElementById("farm-field-list");
        if (!wrap) return;
        let html = "";
        fieldOrder.forEach(key => {
            const f = farmFields[key];
            const unlocked = fieldsUnlocked[key];
            const plotsOfField = fieldPlots[key] || [];
            const readyCount = plotsOfField.filter(p => p.state === "ready").length;
            const growingCount = plotsOfField.filter(p => p.state === "growing").length;
            const cropNames = f.crops.map(c => cropTypes[c].emoji + cropTypes[c].name).join(" ");

            html += '<div class="field-card' + (unlocked ? "" : " locked") + '">';
            html += '<span class="field-emoji">' + (unlocked ? f.emoji : "🔒") + '</span>';
            html += '<div class="field-body">';
            html += '<div class="field-name">' + f.name + (readyCount > 0 ? '<span class="field-ready-dot">수확 ' + readyCount + '</span>' : '') + '</div>';
            html += '<div class="field-desc">' + f.desc + '</div>';
            if (unlocked) {
                html += '<div class="field-meta">밭 ' + plotsOfField.length + '칸 · 자라는 중 ' + growingCount + ' · ' + cropNames +
                        (fieldTools[key] ? ' · 🧰 농기구' : '') + '</div>';
            } else {
                html += '<div class="field-meta">키울 수 있는 작물: ' + cropNames + '</div>';
            }
            html += '</div>';
            if (unlocked) {
                html += '<button class="field-enter-btn" onclick="enterField(\'' + key + '\')">들어가기</button>';
            } else {
                const can = coins >= f.unlockCost;
                html += '<button class="field-buy-btn" ' + (can ? "" : "disabled") + ' onclick="buyField(\'' + key + '\')">🪙' + f.unlockCost + '</button>';
            }
            html += '</div>';
        });
        wrap.innerHTML = html;
        renderCookRows();
    }

    function buyField(key) {
        if (fieldsUnlocked[key]) return;
        const f = farmFields[key];
        if (coins < f.unlockCost) {
            showEventToast("코인이 부족해요! 작물이나 광물을 팔아보세요 🪙", "bad");
            return;
        }
        coins -= f.unlockCost;
        fieldsUnlocked[key] = true;
        fieldPlots[key] = [];
        for (let i = 0; i < f.baseSlots; i++) fieldPlots[key].push({ state: "empty", crop: null, start: 0 });
        landBought++;
        // 새 농장의 첫 씨앗을 하나씩 선물
        f.crops.forEach(c => cropSeeds[c]++);
        showEventToast("🎉 " + f.emoji + " " + f.name + eulReul(f.name) + " 열었어요! 씨앗도 하나씩 챙겨드릴게요", "good");
        updateResourceBar();
        renderFarm();
        renderShop();
        checkMissions();
        saveGame();
    }

    function buyPlotSlot() {
        if (!currentField) return;
        const f = farmFields[currentField];
        const owned = fieldPlots[currentField].length;
        if (owned >= f.maxSlots) return;
        const cost = nextSlotCost(currentField);
        if (coins < cost) {
            showEventToast("코인이 부족해요! 조금만 더 모아봐요 🪙", "bad");
            return;
        }
        coins -= cost;
        fieldPlots[currentField].push({ state: "empty", crop: null, start: 0 });
        landBought++;
        showEventToast("🌱 밭을 한 칸 넓혔어요! (" + (owned + 1) + "칸)", "good");
        updateResourceBar();
        renderFarm();
        checkMissions();
        saveGame();
    }

    function enterField(key) {
        if (!fieldsUnlocked[key]) return;
        currentField = key;
        // 이 농장에서 키울 수 없는 작물이 선택돼 있으면 첫 작물로 교체
        if (!farmFields[key].crops.includes(selectedCrop)) selectedCrop = farmFields[key].crops[0];
        document.getElementById("farm-hub").style.display = "none";
        document.getElementById("farm-inside").style.display = "block";
        document.getElementById("field-title").innerText = farmFields[key].emoji + " " + farmFields[key].name;
        renderFarm();
    }

    function exitField() {
        currentField = null;
        document.getElementById("farm-inside").style.display = "none";
        document.getElementById("farm-hub").style.display = "block";
        renderFarm();
    }

    function renderCropSelector() {
        const row = document.getElementById("crop-select-row");
        if (!row || !currentField) return;
        let html = "";
        farmFields[currentField].crops.forEach(key => {
            const c = cropTypes[key];
            const active = selectedCrop === key ? "active" : "";
            html += '<button class="crop-select-btn ' + active + '" onclick="selectCrop(\'' + key + '\')">';
            html += '<span class="crop-emoji">' + c.emoji + '</span>' + c.name + ' (' + cropSeeds[key] + ')';
            html += '</button>';
        });
        row.innerHTML = html;
    }

    function selectCrop(key) {
        selectedCrop = key;
        // 한번에 심기 버튼에 씨앗 개수가 적혀 있어서 같이 다시 그립니다
        renderFarm();
    }

    // 입구/농장 안 중 지금 보이는 쪽을 다시 그림
    function renderFarm() {
        if (!currentField) {
            renderFarmHub();
            return;
        }
        renderCropSelector();
        const grid = document.getElementById("farm-grid");
        if (!grid) return;
        const plots = fieldPlots[currentField];
        let html = "";
        plots.forEach((plot, i) => {
            if (plot.state === "empty") {
                html += '<div class="farm-plot" onclick="plantPlot(' + i + ')">';
                html += '<span class="plot-emoji plot-empty">＋</span><span class="plot-label">빈 밭 (탭해서 심기)</span>';
                html += '</div>';
            } else if (plot.state === "growing") {
                const c = cropTypes[plot.crop];
                const pct = Math.min(100, ((farmTick - plot.start) / c.growDuration) * 100);
                html += '<div class="farm-plot growing">';
                html += '<span class="plot-emoji">🌱</span><span class="plot-label">' + c.name + ' 자라는 중</span>';
                html += '<div class="farm-progress-bg"><div class="farm-progress-fill" style="width:' + pct + '%"></div></div>';
                html += '</div>';
            } else {
                const c = cropTypes[plot.crop];
                html += '<div class="farm-plot ready" onclick="harvestPlot(' + i + ')">';
                html += '<span class="plot-emoji">' + c.emoji + '</span><span class="plot-label">' + c.name + ' 수확하기!</span>';
                html += '</div>';
            }
        });
        grid.innerHTML = html;

        // 농기구 — 이 농장에서 산 경우에만 한번에 심기/수확이 나옵니다
        const toolRow = document.getElementById("farm-tool-row");
        if (toolRow) {
            const f0 = farmFields[currentField];
            const emptyN = plots.filter(p => p.state === "empty").length;
            const readyN = plots.filter(p => p.state === "ready").length;
            if (fieldTools[currentField]) {
                const seedN = cropSeeds[selectedCrop] || 0;
                const willPlant = Math.min(emptyN, seedN);
                let h = '<button class="farm-tool-btn" ' + (willPlant <= 0 ? "disabled" : "") +
                        ' onclick="plantAll()">🌱 한번에 심기' +
                        (emptyN ? ' <small>빈 밭 ' + emptyN + '칸 · 씨앗 ' + seedN + '개</small>'
                                : ' <small>빈 밭 없음</small>') + '</button>';
                h += '<button class="farm-tool-btn" ' + (readyN <= 0 ? "disabled" : "") +
                     ' onclick="harvestAll()">🧺 한번에 수확' +
                     (readyN ? ' <small>' + readyN + '칸 다 자랐어요</small>'
                             : ' <small>아직 없어요</small>') + '</button>';
                toolRow.innerHTML = h;
            } else {
                toolRow.innerHTML =
                    '<button class="farm-tool-buy" ' + (coins < f0.toolCost ? "disabled" : "") +
                    ' onclick="buyFieldTool(\'' + currentField + '\')">' +
                    '🧰 이 농장에 농기구 들이기 (🪙' + f0.toolCost + ')' +
                    '<small>한번에 심기 · 한번에 수확이 생겨요 · 농장마다 따로 사요</small></button>';
            }
        }

        // 물뿌리개 버튼
        const waterBtn = document.getElementById("water-btn");
        const hasGrowing = plots.some(p => p.state === "growing");
        waterBtn.disabled = !hasGrowing || coins < WATER_COST;
        waterBtn.innerText = hasGrowing
            ? "💧 물뿌리개 쓰기 (🪙" + WATER_COST + ") — 작물 하나 바로 다 자라게"
            : "💧 물뿌리개 — 자라는 중인 작물이 있을 때 쓸 수 있어요";

        // 밭 넓히기 버튼
        const btn = document.getElementById("land-buy-btn");
        const f = farmFields[currentField];
        if (plots.length >= f.maxSlots) {
            btn.disabled = true;
            btn.innerText = "🌾 이 농장은 최대 크기예요 (" + f.maxSlots + "칸)";
        } else {
            const cost = nextSlotCost(currentField);
            btn.disabled = coins < cost;
            btn.innerText = "🪙 " + cost + " — 밭 한 칸 넓히기 (" + plots.length + "/" + f.maxSlots + ")";
        }
    }

    function plantPlot(i) {
        const plots = fieldPlots[currentField];
        if (!plots || plots[i].state !== "empty") return;
        if (cropSeeds[selectedCrop] <= 0) {
            showMessage(cropTypes[selectedCrop].name + " 씨앗이 없어요! 상점에서 구매해보세요 🌱", true);
            return;
        }
        cropSeeds[selectedCrop]--;
        plots[i] = { state: "growing", crop: selectedCrop, start: farmTick };
        renderFarm();
    }

    // 한 칸 수확 — 확률과 보상은 한 칸씩 캘 때와 완전히 같습니다.
    // 한번에 수확이 '더 이득'이거나 '더 손해'가 되면 안 되니까요.
    // 결과만 돌려주고 알림은 부르는 쪽에서 정합니다
    // (한번에 수확할 때 칸마다 토스트가 뜨면 화면이 가려져요).
    function harvestOne(plots, i) {
        const key = plots[i].crop;
        const roll = Math.random();
        const res = { crop: key, got: 0, boom: false, fail: false, helper: false };

        if (roll < 0.1) {
            // 풍작: 2배 수확
            cropInventory[key] += 2;
            cropSeeds[key] += 2;
            res.got = 2; res.boom = true;
        } else if (roll < 0.18) {
            // 흉작: 수확 실패
            res.fail = true;
        } else {
            cropInventory[key]++;
            cropSeeds[key]++;
            res.got = 1;
            if (Math.random() < 0.3) cropSeeds[key]++;
            // [P0] 동반자 능력 — 수확 도우미가 가끔 하나 더 거둬줍니다
            if (hasPerk("feed") && Math.random() < 0.35) {
                cropInventory[key]++;
                res.got++; res.helper = true;
            }
        }

        plots[i] = { state: "empty", crop: null, start: 0 };
        harvestCount++;
        addWarmth(1);          // [P0] 돌본 만큼 섬에 온기가 쌓입니다
        questTick("harvest");  // [P1]
        return res;
    }

    function harvestPlot(i) {
        const plots = fieldPlots[currentField];
        if (!plots || plots[i].state !== "ready") return;
        const r = harvestOne(plots, i);
        const cropName = cropTypes[r.crop].name;

        if (r.boom) {
            showEventToast("🌟 풍작이에요! " + cropName + eulReul(cropName) + " 2배로 수확했어요!", "good");
        } else if (r.fail) {
            showEventToast("😢 흉작... 이번엔 " + cropName + eulReul(cropName) + " 수확하지 못했어요", "bad");
        } else if (r.helper) {
            showEventToast("🌾 " + activeCompanion().name + iGa(activeCompanion().name) + " 하나 더 찾아왔어요!", "good");
        }

        renderFarm();
        checkMissions();
        saveGame();
    }

    // ===== 농기구 — 농장마다 따로 삽니다 =====
    function buyFieldTool(key) {
        if (!fieldsUnlocked[key] || fieldTools[key]) return;
        const f = farmFields[key];
        if (coins < f.toolCost) {
            showEventToast("코인이 부족해요! 🪙" + f.toolCost + "이 필요해요", "bad");
            return;
        }
        coins -= f.toolCost;
        fieldTools[key] = true;
        showEventToast("🧰 " + f.emoji + " " + f.name + "에 농기구를 들였어요! 이제 한번에 심고 거둘 수 있어요", "good");
        updateResourceBar();
        renderFarm();
        saveGame();
    }

    // 고른 작물을 빈 밭에 한꺼번에 심습니다. 씨앗이 모자라면 있는 만큼만.
    function plantAll() {
        if (!currentField || !fieldTools[currentField]) return;
        const plots = fieldPlots[currentField];
        const empty = plots.filter(p => p.state === "empty").length;
        if (!empty) {
            showEventToast("빈 밭이 없어요", "bad");
            return;
        }
        const c = cropTypes[selectedCrop];
        if (cropSeeds[selectedCrop] <= 0) {
            showMessage(c.name + " 씨앗이 없어요! 상점에서 구매해보세요 🌱", true);
            return;
        }
        let planted = 0;
        for (let i = 0; i < plots.length; i++) {
            if (plots[i].state !== "empty") continue;
            if (cropSeeds[selectedCrop] <= 0) break;
            cropSeeds[selectedCrop]--;
            plots[i] = { state: "growing", crop: selectedCrop, start: farmTick };
            planted++;
        }
        const short = empty - planted;
        showEventToast("🌱 " + c.emoji + " " + c.name + " " + planted + "칸 심었어요" +
                       (short > 0 ? " (씨앗이 모자라 " + short + "칸은 비워뒀어요)" : ""), "good");
        renderFarm();
        saveGame();
    }

    // 다 자란 밭을 한꺼번에 거둡니다.
    // 칸마다 알림이 뜨면 화면이 가려지니 한 줄로 모아 보여줍니다.
    function harvestAll() {
        if (!currentField || !fieldTools[currentField]) return;
        const plots = fieldPlots[currentField];
        const ready = [];
        plots.forEach((p, i) => { if (p.state === "ready") ready.push(i); });
        if (!ready.length) {
            showEventToast("수확할 게 아직 없어요", "bad");
            return;
        }
        const tally = {};      // 작물별로 몇 개 거뒀는지
        let boom = 0, fail = 0, helper = 0;
        ready.forEach(i => {
            const r = harvestOne(plots, i);
            tally[r.crop] = (tally[r.crop] || 0) + r.got;
            if (r.boom) boom++;
            if (r.fail) fail++;
            if (r.helper) helper++;
        });
        const parts = Object.keys(tally)
            .filter(k => tally[k] > 0)
            .map(k => cropTypes[k].emoji + cropTypes[k].name + " " + tally[k] + "개");
        let msg = "🧺 " + ready.length + "칸 수확 — " + (parts.length ? parts.join(", ") : "이번엔 건진 게 없네요");
        const extra = [];
        if (boom) extra.push("🌟 풍작 " + boom);
        if (fail) extra.push("😢 흉작 " + fail);
        if (helper) extra.push("🌾 도우미 " + helper);
        if (extra.length) msg += " (" + extra.join(" · ") + ")";
        showEventToast(msg, parts.length ? "good" : "bad");

        renderFarm();
        checkMissions();
        saveGame();
    }

    function renderCookRows() {
        const wrap = document.getElementById("cook-rows");
        if (!wrap) return;
        let html = "";
        unlockedCrops().forEach(key => {
            const c = cropTypes[key];
            const need = cookRatios[key];
            const meal = mealTypes[key];
            const canCook = cropInventory[key] >= need;
            html += '<div class="cook-row"><div class="cook-info">' + c.emoji + ' ' + c.name + ' ' + need + '개 → ' + meal.emoji + ' ' + meal.label + ' 1개 (포만감 +' + meal.hungerRestore + ', 보유 작물 ' + cropInventory[key] + ')</div>';
            html += '<button class="cook-btn" ' + (canCook ? "" : "disabled") + ' onclick="cookCrop(\'' + key + '\')">요리</button></div>';
        });
        wrap.innerHTML = html;
    }

    function cookCrop(key) {
        const need = cookRatios[key];
        if (cropInventory[key] < need) return;
        cropInventory[key] -= need;
        mealInventory[key]++;
        updateResourceBar();
        renderFarm();
    }

    // ===== 낚시 =====
    let fishState = "idle"; // idle | waiting | reeling
    let fishTimeout = null;
    let reelInterval = null;
    let reelTimeLeft = 0;
    const rarityWeight = { common: 50, uncommon: 30, rare: 15, legendary: 5 };

    function pickFishSpecies() {
        const total = fishSpeciesOrder.reduce((a, k) => a + rarityWeight[fishSpecies[k].rarity], 0);
        let r = Math.random() * total;
        for (const k of fishSpeciesOrder) {
            r -= rarityWeight[fishSpecies[k].rarity];
            if (r <= 0) return k;
        }
        return fishSpeciesOrder[0];
    }

    function handleFishClick() {
        if (fishState === "idle") startCast();
        else if (fishState === "reeling") reelTap();
    }

    function startCast() {
        if (rodDurability <= 0) {
            showMessage("낚싯대가 부러졌어요! 상점의 대장간에서 수리해주세요 🔨", true);
            return;
        }
        fishState = "waiting";
        document.getElementById("fish-status").innerText = "입질을 기다리는 중...";
        document.getElementById("fish-bobber").classList.add("waiting");
        if (window.scene3d) { window.scene3d.fish.cast(); window.scene3d.fish.set({ stage: "waiting", pull: 0 }); }
        const castBtn = document.getElementById("fish-cast-btn");
        castBtn.innerText = "기다리는 중...";
        castBtn.disabled = true;
        // [3][4] 입질 시간에 날씨와 '입질 빨라짐' 버프가 함께 걸립니다.
        // 맑은 날은 잘 물고, 비 오는 날은 조금 더 기다려야 해요.
        const waitTime = (2000 + Math.random() * 3000) * weatherBiteMod() * buffMult("fishfast");
        fishTimeout = setTimeout(startReeling, waitTime);
    }

    function startReeling() {
        currentFishSpecies = pickFishSpecies();
        const sp = fishSpecies[currentFishSpecies];
        const rod = rodLevels[rodLevel];

        // 너무 큰 물고기에 무리하게 도전하다 낚싯대가 부러지는 이벤트
        if (Math.random() < rodBreakChance[sp.rarity]) {
            rodDurability = 0;
            showEventToast("💥 너무 큰 " + sp.name + iGa(sp.name) + " 걸려서 낚싯대가 부러졌어요!", "bad");
            resetFishing();
            saveGame();
            return;
        }

        fishState = "reeling";
        if (window.scene3d) window.scene3d.fish.set({ stage: "bite" });
        captureGauge = 15;
        reelTimeLeft = 7;

        document.getElementById("fish-bobber").classList.remove("waiting");
        document.getElementById("fish-bobber").classList.add("biting");
        document.getElementById("fish-status").innerText = sp.emoji + " 무언가 걸렸어요! 초록 존에 맞춰 당기기를 연타하세요";

        const castBtn = document.getElementById("fish-cast-btn");
        castBtn.innerText = "당기기!";
        castBtn.disabled = false;
        castBtn.classList.add("bite-ready");

        const zoneEl = document.getElementById("fish-reel-zone");
        const markerEl = document.getElementById("fish-reel-marker");
        const effectiveZone = Math.min(70, sp.zoneWidth + rod.zoneBonus);
        zoneEl.style.width = effectiveZone + "%";
        zoneEl.style.left = ((100 - effectiveZone) / 2) + "%";
        markerEl.style.animationDuration = (sp.duration + rod.durationBonus) + "s";

        document.getElementById("fish-reel-wrap").style.display = "block";
        updateReelUI();

        reelInterval = setInterval(() => {
            captureGauge = Math.max(0, captureGauge - 3);
            reelTimeLeft -= 0.2;
            updateReelUI();
            if (reelTimeLeft <= 0) finishReeling(false);
        }, 200);
    }


    // ===================================================================
    // [P2] 미니게임 희귀 순간
    //
    // 제안서 지적: 낚시·광산·놀이가 결국 코인·재료로만 귀결돼서
    // 잘했을 때와 대충 했을 때의 차이가 안 남는다는 것.
    //
    // 새 미니게임을 만들지 않고, 각 게임에 '잘했을 때만 나오는 순간'을
    // 하나씩 넣었습니다. 나온 재료는 섬 복원(온기)으로 이어집니다.
    // ===================================================================

    // --- 낚시: 완벽 당기기 -------------------------------------------
    // 존 한가운데를 정확히 맞히면 '완벽'. 완벽을 연달아 내면
    // 별빛 물고기가 걸립니다 (제록이 에피소드와 이어지는 물고기예요).
    let perfectStreak = 0;
    let starfishCaught = 0;

    function judgeReel(markerCenter, zone) {
        const zc = (zone.left + zone.right) / 2;
        const half = (zone.right - zone.left) / 2;
        if (markerCenter < zone.left || markerCenter > zone.right) return "miss";
        // 존 안쪽 35% 이내면 완벽
        return Math.abs(markerCenter - zc) <= half * 0.35 ? "perfect" : "good";
    }

    function showReelJudge(kind) {
        const pond = document.getElementById("fish-pond");
        if (!pond) return;
        const el = document.createElement("span");
        el.className = "reel-judge " + kind;
        el.innerText = kind === "perfect" ? "PERFECT!" : (kind === "good" ? "GOOD" : "MISS");
        pond.appendChild(el);
        setTimeout(() => el.remove(), 800);
    }

    // --- 광산: 갈림길과 희귀 광맥 -------------------------------------
    // 채굴을 시작할 때 어느 쪽으로 갈지 고릅니다.
    // 안전한 길은 확실하게, 깊은 길은 크게 벌거나 빈손이거나.
    const MINE_ROUTES = {
        safe: { label: "🪨 얕은 길", desc: "확실하지만 평범해요",       gaugeMod: 1.15, rareChance: 0.03 },
        deep: { label: "🕳️ 깊은 길", desc: "크게 벌 수도, 헛걸음일 수도", gaugeMod: 0.8,  rareChance: 0.22 }
    };
    let mineRoute = "safe";
    let rareOreCount = 0;

    function pickMineRoute(key) {
        mineRoute = MINE_ROUTES[key] ? key : "safe";
        const wrap = document.getElementById("mine-route");
        if (wrap) {
            wrap.querySelectorAll("[data-route]").forEach(b => {
                b.classList.toggle("on", b.getAttribute("data-route") === mineRoute);
            });
        }
        showMessage(MINE_ROUTES[mineRoute].label + " — " + MINE_ROUTES[mineRoute].desc, false);
    }

    function renderMineRoutes() {
        const wrap = document.getElementById("mine-route");
        if (!wrap) return;
        let html = "";
        Object.keys(MINE_ROUTES).forEach(k => {
            const r = MINE_ROUTES[k];
            html += '<button type="button" class="mr-btn' + (k === mineRoute ? " on" : "") +
                    '" data-route="' + k + '" onclick="pickMineRoute(\'' + k + '\')">' +
                    '<b>' + r.label + '</b><small>' + r.desc + '</small></button>';
        });
        wrap.innerHTML = html;
    }

    // --- 놀이: 동반자 성향에 따라 판이 달라짐 --------------------------
    // 같은 두더지잡기라도 데려간 친구에 따라 속도·칸이 달라집니다.
    function playTuning() {
        const c = (typeof activeCompanion === "function") ? activeCompanion() : null;
        if (!c) return { speed: 1, label: "" };
        if (c.species === "feed")   return { speed: 0.85, label: c.name + iGa(c.name) + " 느긋하게 도와줘요" };
        if (c.species === "pet")    return { speed: 1,    label: c.name + iGa(c.name) + " 응원하고 있어요" };
        if (c.species === "sleep")  return { speed: 1.2,  label: c.name + eunNeun(c.name) + " 눈이 밝아요" };
        if (c.species === "nightowl") return { speed: 1.35, label: c.name + eunNeun(c.name) + " 밤에 더 빨라요" };
        return { speed: 1.1, label: c.name + iGa(c.name) + " 같이 놀아요" };
    }

    function reelTap() {
        if (fishState !== "reeling") return;
        const zone = document.getElementById("fish-reel-zone").getBoundingClientRect();
        const marker = document.getElementById("fish-reel-marker").getBoundingClientRect();
        const markerCenter = marker.left + marker.width / 2;
        // [P2] 완벽 당기기 — 존 한가운데를 맞히면 더 크게 당겨집니다
        const judge = judgeReel(markerCenter, zone);
        const inZone = judge !== "miss";
        showReelJudge(judge);

        let gain = judge === "perfect" ? 26 : (judge === "good" ? 16 : 3);
        if (judge === "perfect") perfectStreak++; else if (judge === "miss") perfectStreak = 0;

        // [2] 콤보 — 존 안에서 계속 맞히면 이어지고, 빗나가면 그 자리에서 끊깁니다
        if (inZone) {
            const combo = bumpCombo("fish");
            if (combo === 3) questTick("combo", 3);      // [P1] 콤보 3연속 부탁
            gain = Math.round(gain * comboMultiplier("fish"));
            const pond = document.getElementById("fish-pond");
            if (combo >= 3) burstParticles(pond, combo >= 6 ? 4 : 2, ["💧", "✨", "🫧"]);
            if (combo > 0 && combo % 5 === 0) fxShake(pond);
        } else {
            resetCombo("fish");
        }
        captureGauge = Math.min(100, captureGauge + gain);
        // 누를 때마다 줄을 감습니다 — 대가 휘고 찌가 끌려옵니다
        if (window.scene3d) window.scene3d.fish.reel(captureGauge / 100);

        const btn = document.getElementById("fish-cast-btn");
        btn.classList.add("bump-tap");
        setTimeout(() => btn.classList.remove("bump-tap"), 120);

        updateReelUI();
        if (captureGauge >= 100) finishReeling(true);
    }

    function updateReelUI() {
        document.getElementById("fish-reel-progress-fill").style.width = captureGauge + "%";
        document.getElementById("fish-reel-timer").innerText = Math.max(0, Math.ceil(reelTimeLeft)) + "초";
    }

    function finishReeling(success) {
        clearInterval(reelInterval);
        document.getElementById("fish-reel-wrap").style.display = "none";
        const sp = fishSpecies[currentFishSpecies];

        rodDurability = Math.max(0, rodDurability - 1);

        if (success) {
            // 낚싯대를 강화할수록 한 번에 여러 마리가 딸려 올라옵니다
            let amount = 1;
            const chance = rodMultiChance();
            if (Math.random() < chance) amount++;
            if (Math.random() < chance * 0.35) amount++;

            fishInventory[currentFishSpecies] += amount;
            // 바늘에 걸린 물고기가 파닥거리며 올라옵니다
            if (window.scene3d) window.scene3d.fish.caught(currentFishSpecies);
            fishCaughtCount += amount;
            // [2] 낚아 올린 순간의 타격감 — 물보라가 터지고 낚시터가 흔들립니다
            const pond = document.getElementById("fish-pond");
            fxShake(pond, amount > 1);
            burstParticles(pond, amount > 1 ? 12 : 6, ["💦", "🫧", "✨", sp.emoji]);

            // [P2] 완벽 당기기를 3번 넘게 이어가면 별빛 물고기가 걸립니다.
            // 잘했을 때만 나오는 순간이라, 같은 낚시라도 결과가 달라져요.
            if (perfectStreak >= 3) {
                perfectStreak = 0;
                starfishCaught++;
                addWarmth(8, "별빛 물고기를 만났어요");
                fxShake(pond, true);
                burstParticles(pond, 16, ["✨", "🌟", "💫", "🐟"]);
                showEventToast("🌟 별빛 물고기가 걸렸어요!\n제록이가 그렇게 기다리던 그 물고기예요", "good");
                spawnConfetti();
            }
            if (amount > 1) {
                showMessage(sp.emoji + " " + sp.name + " " + amount + "마리가 한꺼번에 잡혔어요!", false);
                showEventToast("🎊 " + sp.emoji + " " + sp.name + " " + amount + "마리 대박!", "good");
            } else {
                showMessage(sp.emoji + " " + sp.name + eulReul(sp.name) + " 낚았어요!", false);
            }
        } else {
            showMessage("아쉽게도 " + sp.name + eulReul(sp.name) + " 놓쳤어요... 다시 시도해보세요", false);
        }
        resetCombo("fish");          // [2] 한 판이 끝나면 콤보 초기화
        if (rodDurability <= 0) {
            showEventToast("🔧 낚싯대 내구도가 다 됐어요. 대장간에서 수리해보세요!", "neutral");
        }
        resetFishing();
        checkMissions();
        saveGame();
    }

    function resetFishing() {
        fishState = "idle";
        if (window.scene3d) window.scene3d.fish.set({ stage: "idle" });
        currentFishSpecies = null;
        document.getElementById("fish-bobber").classList.remove("waiting", "biting");
        const castBtn = document.getElementById("fish-cast-btn");
        castBtn.classList.remove("bite-ready");
        castBtn.innerText = "🎣 낚싯대 던지기";
        castBtn.disabled = false;
        updateFishStatus();
    }

    function updateFishStatus() {
        const total = Object.values(fishInventory).reduce((a, b) => a + b, 0);
        if (total === 0) {
            document.getElementById("fish-status").innerText = "보유 물고기: 없음";
        } else {
            const detail = fishSpeciesOrder
                .filter(k => fishInventory[k] > 0)
                .map(k => fishSpecies[k].emoji + fishInventory[k])
                .join("  ");
            document.getElementById("fish-status").innerText = "보유 물고기: " + detail;
        }
        renderFishCookRows();
    }

    function renderFishCookRows() {
        const wrap = document.getElementById("fish-cook-rows");
        if (!wrap) return;
        let html = "";
        fishSpeciesOrder.forEach(key => {
            const sp = fishSpecies[key];
            const need = cookRatios[key];
            const meal = mealTypes[key];
            const canCook = fishInventory[key] >= need;
            html += '<div class="cook-row"><div class="cook-info">' + sp.emoji + ' ' + sp.name + ' ' + need + '마리 → ' + meal.emoji + ' ' + meal.label + ' 1개 (포만감 +' + meal.hungerRestore + ', 보유 ' + fishInventory[key] + ')</div>';
            html += '<button class="cook-btn" ' + (canCook ? "" : "disabled") + ' onclick="cookFish(\'' + key + '\')">요리</button></div>';
        });
        wrap.innerHTML = html;
    }

    function cookFish(key) {
        const need = cookRatios[key];
        if (fishInventory[key] < need) return;
        fishInventory[key] -= need;
        mealInventory[key]++;
        showEventToast(mealTypes[key].emoji + " " + mealTypes[key].label + eulReul(mealTypes[key].label) + " 만들었어요!", "good");
        updateResourceBar();
        updateFishStatus();
        renderShop();
        saveGame();
    }

    // ===== 광산 =====
    let mineState = "idle"; // idle | mining
    let mineGauge = 0;
    let mineTimeLeft = 0;
    let mineInterval = null;
    const MINE_DURATION = 6.0;   // 채굴 제한 시간(초)
    const MINE_TAPS_FOR_FULL = 30; // 기본 곡괭이로 게이지를 꽉 채우는 데 필요한 탭 수

    function mineTierOf(gauge) {
        if (gauge >= 88) return "diamond";
        if (gauge >= 65) return "crystal";
        if (gauge >= 35) return "iron";
        if (gauge >= 12) return "stone";
        return null;
    }

    function startMining() {
        if (mineState !== "idle") return;
        if (pickDurability <= 0) {
            showEventToast("곡괭이가 다 닳았어요! 수리한 뒤에 다시 캐요 🔧", "bad");
            return;
        }
        mineState = "mining";
        mineGauge = 0;
        mineTimeLeft = MINE_DURATION;
        pickDurability--;

        document.getElementById("mine-gauge-wrap").style.display = "block";
        document.getElementById("mine-cave").classList.add("active");
        document.getElementById("mine-cave-hint").innerText = "연타! 연타!";
        const btn = document.getElementById("mine-start-btn");
        btn.innerText = "⛏️ 광맥을 연타하세요!";
        btn.classList.add("mining");
        updateMineUI();

        mineInterval = setInterval(() => {
            mineTimeLeft -= 0.1;
            if (mineTimeLeft <= 0) {
                finishMining();
            } else {
                document.getElementById("mine-timer").innerText = mineTimeLeft.toFixed(1) + "초";
            }
        }, 100);
    }

    function mineTap() {
        if (mineState !== "mining") return;
        // [2] 콤보 — 쉬지 않고 연타하면 곡괭이 위력에 배수가 붙습니다
        const combo = bumpCombo("mine");
        const power = pickLevels[pickLevel].power * comboMultiplier("mine");
        // [P2] 고른 길에 따라 게이지가 차는 속도가 달라집니다
        mineGauge = Math.min(100, mineGauge + (100 / MINE_TAPS_FOR_FULL) * power * MINE_ROUTES[mineRoute].gaugeMod);
        const vein = document.getElementById("mine-vein");
        vein.classList.remove("hit");
        void vein.offsetWidth; // 애니메이션 재시작
        vein.classList.add("hit");
        spawnMineSpark();
        if (window.scene3d) window.scene3d.mine.hit();
        // [2] 콤보가 쌓일수록 파티클이 풍성해지고 10콤보마다 동굴이 흔들립니다
        if (combo >= 5) burstParticles(document.getElementById("mine-cave"), combo >= 15 ? 5 : 3);
        if (combo > 0 && combo % 10 === 0) fxShake(document.getElementById("mine-cave"));
        updateMineUI();
        if (mineGauge >= 100) finishMining();
    }

    function spawnMineSpark() {
        const cave = document.getElementById("mine-cave");
        const el = document.createElement("span");
        el.className = "mine-spark";
        el.innerText = ["✨", "💥", "⭐"][Math.floor(Math.random() * 3)];
        el.style.left = (35 + Math.random() * 30) + "%";
        el.style.top = (35 + Math.random() * 25) + "%";
        el.style.setProperty("--dx", (Math.random() * 60 - 30) + "px");
        cave.appendChild(el);
        setTimeout(() => el.remove(), 600);
    }

    function updateMineUI() {
        document.getElementById("mine-gauge-fill").style.width = mineGauge + "%";
        const tier = mineTierOf(mineGauge);
        document.getElementById("mine-tier-label").innerText =
            tier ? (oreTypes[tier].emoji + " " + oreTypes[tier].name) : "아직 부족해요";
        // 3D 광맥이 게이지에 맞춰 커지고 색이 바뀝니다
        if (window.scene3d) window.scene3d.mine.set({ gauge: mineGauge, tier: tier || "none" });
        renderPickStatus();
    }

    function finishMining() {
        clearInterval(mineInterval);
        mineInterval = null;
        mineState = "idle";

        const tier = mineTierOf(mineGauge);
        document.getElementById("mine-gauge-wrap").style.display = "none";
        document.getElementById("mine-cave").classList.remove("active");
        const btn = document.getElementById("mine-start-btn");
        btn.classList.remove("mining");
        btn.innerText = "⛏️ 채굴 시작";

        if (!tier) {
            document.getElementById("mine-cave-hint").innerText = "다음엔 더 힘차게!";
            showEventToast("😵 아무것도 캐지 못했어요... 조금만 더 힘내요!", "bad");
        } else {
            // 곡괭이를 강화할수록 한 번에 여러 개가 쏟아집니다
            let amount = 1;
            const chance = pickMultiChance();
            if (Math.random() < chance) amount++;
            if (Math.random() < chance * 0.4) amount++;
            // [3] 요리 버프: '채굴 2배' 가 켜져 있으면 획득량이 그대로 곱해집니다
            const buffed = buffMult("mine2x");
            amount = Math.round(amount * buffed);

            // [P2] 희귀 광맥 — 깊은 길로 갔을 때 훨씬 잘 터집니다.
            // 캐낸 원석은 코인이 아니라 온기로 이어져서 섬 복원에 쓰입니다.
            if (Math.random() < MINE_ROUTES[mineRoute].rareChance) {
                rareOreCount++;
                addWarmth(10, "희귀 광맥을 찾았어요");
                const cave = document.getElementById("mine-cave");
                fxShake(cave, true);
                burstParticles(cave, 18, ["💎", "🌟", "✨", "💫"]);
                showEventToast("💠 희귀 광맥이 터졌어요! 섬 복원에 큰 도움이 돼요", "good");
                spawnConfetti();
            }
            oreInventory[tier] += amount;
            oreMinedCount += amount;
            document.getElementById("mine-cave-hint").innerText = "채굴 시작을 눌러주세요";
            const ore = oreTypes[tier];
            showEventToast(
                (amount > 1 ? "🌟 노다지! " : "") + ore.emoji + " " + ore.name + " " + amount + "개를 캤어요!" +
                (buffed > 1 ? " (⛏️버프 ×" + buffed + ")" : ""),
                tier === "diamond" || tier === "crystal" ? "good" : "neutral"
            );
            // [2] 대성공일수록 크게 흔들리고 파티클이 쏟아집니다
            const cave = document.getElementById("mine-cave");
            if (tier === "diamond" || tier === "crystal") {
                fxShake(cave, true);
                burstParticles(cave, 14, ["💎", "✨", "🌟", "💫"]);
            } else {
                fxShake(cave);
                burstParticles(cave, 7);
            }
            if (tier === "diamond") spawnConfetti();
        }

        resetCombo("mine");          // [2] 한 판이 끝나면 콤보도 초기화
        questTick("mine");           // [P1]
        mineGauge = 0;
        updateMineStatus();
        renderShop();
        checkMissions();
        saveGame();
    }

    function updateMineStatus() {
        const total = Object.values(oreInventory).reduce((a, b) => a + b, 0);
        const statusEl = document.getElementById("mine-status");
        if (!statusEl) return;
        if (total === 0) {
            statusEl.innerText = "보유 광물: 없음";
        } else {
            const detail = oreOrder
                .filter(k => oreInventory[k] > 0)
                .map(k => oreTypes[k].emoji + oreInventory[k])
                .join("  ");
            statusEl.innerText = "보유 광물: " + detail;
        }
        renderPickStatus();
    }

    function renderPickStatus() {
        // 강화 단계에 맞는 곡괭이를 3D 무대에 세웁니다
        if (window.scene3d) window.scene3d.mine.pick(pickLevel);
        const pick = pickLevels[pickLevel];
        const nameEl = document.getElementById("mine-pick-name");
        if (!nameEl) return;
        nameEl.innerText = pick.emoji + " " + pick.name;
        document.getElementById("mine-pick-durability").innerText = "내구도 " + pickDurability + " / " + pick.durabilityMax;
        document.getElementById("mine-pick-fill").style.width = (pickDurability / pick.durabilityMax) * 100 + "%";
        const repairBtn = document.getElementById("mine-repair-btn");
        repairBtn.disabled = pickDurability >= pick.durabilityMax || coins < PICK_REPAIR_COST;
        repairBtn.innerText = pickDurability >= pick.durabilityMax
            ? "곡괭이 상태가 좋아요 ✨"
            : "🔧 곡괭이 수리하기 (🪙" + PICK_REPAIR_COST + ")";
    }

    function renderPickCard() {
        const card = document.getElementById("pick-card");
        if (!card) return;
        const pick = pickLevels[pickLevel];
        const isMax = pickLevel >= pickLevels.length - 1;
        const pct = (pickDurability / pick.durabilityMax) * 100;

        let html = '<span class="rod-emoji">' + pick.emoji + '</span>';
        html += '<div class="rod-name">' + pick.name + '</div>';
        html += '<div class="rod-stats">채굴력 x' + pick.power.toFixed(2) + ' · 여러 개 채굴 ' + Math.round(pick.multiChance * 100) + '% · 최대내구도 ' + pick.durabilityMax + '</div>';
        html += '<div class="rod-durability-bg"><div class="rod-durability-fill" style="width:' + pct + '%"></div></div>';
        html += '<div class="rod-stats">내구도 ' + pickDurability + ' / ' + pick.durabilityMax + '</div>';

        if (isMax) {
            html += '<button class="rod-btn rod-upgrade-btn" disabled>최고 단계 달성!</button>';
        } else {
            const canAfford = coins >= pick.upgradeCost;
            html += '<button class="rod-btn rod-upgrade-btn" ' + (canAfford ? "" : "disabled") + ' onclick="upgradePick()">🔨 강화하기 (🪙' + pick.upgradeCost + ')</button>';
        }
        if (pickDurability < pick.durabilityMax) {
            html += '<button class="rod-btn rod-repair-btn" ' + (coins >= PICK_REPAIR_COST ? "" : "disabled") + ' onclick="repairPick()">🔧 수리하기 (🪙' + PICK_REPAIR_COST + ')</button>';
        }
        card.innerHTML = html;
    }

    function upgradePick() {
        const pick = pickLevels[pickLevel];
        if (pickLevel >= pickLevels.length - 1) return;
        if (coins < pick.upgradeCost) {
            showMessage("코인이 부족해요! 광물을 팔아보세요 🪙", true);
            return;
        }
        coins -= pick.upgradeCost;
        pickLevel++;
        pickDurability = pickLevels[pickLevel].durabilityMax;
        showEventToast("🔨 " + pickLevels[pickLevel].name + euRo(pickLevels[pickLevel].name) + " 강화했어요!", "good");
        updateResourceBar();
        renderShop();
        updateMineStatus();
        saveGame();
    }

    function repairPick() {
        const pick = pickLevels[pickLevel];
        if (pickDurability >= pick.durabilityMax) return;
        if (coins < PICK_REPAIR_COST) {
            showEventToast("코인이 부족해요! 광물을 팔아보세요 🪙", "bad");
            return;
        }
        coins -= PICK_REPAIR_COST;
        pickDurability = pick.durabilityMax;
        showEventToast("🔧 곡괭이를 말끔히 수리했어요!", "good");
        updateResourceBar();
        renderShop();
        updateMineStatus();
        saveGame();
    }

    function sellOreType(key) {
        if (oreInventory[key] <= 0) return;
        oreInventory[key]--;
        coins += oreTypes[key].sellPrice;
        updateResourceBar();
        renderShop();
        updateMineStatus();
        saveGame();
    }

    // ===== 놀이 (숨은 병아리 쓰다듬기) =====
    const PLAY_CELLS = 9;
    const PLAY_DURATION = 15;
    const PLAY_ENERGY_COST = 12;
    let playState = "idle";
    let playScore = 0;
    let playTimeLeft = 0;
    let playTimer = null;
    let playSpawner = null;
    let playActiveCell = -1;

    function buildPlayGrid() {
        const grid = document.getElementById("play-grid");
        if (!grid || grid.children.length) return;
        let html = "";
        for (let i = 0; i < PLAY_CELLS; i++) {
            html += '<div class="play-cell" id="play-cell-' + i + '" onclick="playHit(' + i + ')"><span class="play-chick"></span></div>';
        }
        grid.innerHTML = html;
        bindAllTaps();      // 방금 만든 칸에도 터치를 붙입니다
    }

    function startPlayGame() {
        if (playState === "running") return;
        const pt = playTuning();
        if (pt.label) showEventToast("🎈 " + pt.label, "neutral");   // [P2]
        if (asleep) {
            showEventToast("지금은 자고 있어요. 깨운 뒤에 놀아주세요 😴", "neutral");
            return;
        }
        if (energy < PLAY_ENERGY_COST) {
            showEventToast("활력이 부족해요! 재우고 나서 놀아주세요 ⚡", "bad");
            return;
        }
        buildPlayGrid();
        playState = "running";
        playScore = 0;
        playTimeLeft = PLAY_DURATION;
        playActiveCell = -1;
        setStat("energy", energy - PLAY_ENERGY_COST);
        flashStatDelta("energy", -PLAY_ENERGY_COST);

        document.getElementById("play-score").innerText = "0";
        document.getElementById("play-time").innerText = PLAY_DURATION + "초";
        document.getElementById("play-status").innerText = "병아리가 나오면 얼른 탭하세요!";
        const btn = document.getElementById("play-start-btn");
        btn.disabled = true;
        btn.innerText = "🎈 놀이 중...";

        playTimer = setInterval(() => {
            playTimeLeft--;
            document.getElementById("play-time").innerText = playTimeLeft + "초";
            if (playTimeLeft <= 0) finishPlayGame();
        }, 1000);

        popPlayChick();
    }

    function popPlayChick() {
        if (playState !== "running") return;
        clearPlayCell();
        let idx = Math.floor(Math.random() * PLAY_CELLS);
        playActiveCell = idx;
        const cell = document.getElementById("play-cell-" + idx);
        cell.classList.add("up");
        cell.querySelector(".play-chick").innerHTML = charPic(currentCharForm(), { size: 52 });

        // 점수가 오를수록 조금씩 빨라짐
        // [P2] 데려간 친구에 따라 판이 달라집니다
        const tune = playTuning();
        const visible = Math.max(340, (900 - playScore * 25) / tune.speed);
        playSpawner = setTimeout(() => {
            clearPlayCell();
            playSpawner = setTimeout(popPlayChick, 180 + Math.random() * 260);
        }, visible);
    }

    function clearPlayCell() {
        if (playActiveCell >= 0) {
            const cell = document.getElementById("play-cell-" + playActiveCell);
            if (cell) {
                cell.classList.remove("up");
                cell.querySelector(".play-chick").innerHTML = "";
            }
        }
        playActiveCell = -1;
    }

    function playHit(i) {
        if (playState !== "running" || i !== playActiveCell) return;
        playScore++;
        document.getElementById("play-score").innerText = playScore;
        const cell = document.getElementById("play-cell-" + i);
        cell.classList.add("hit");
        setTimeout(() => cell.classList.remove("hit"), 300);
        clearTimeout(playSpawner);
        clearPlayCell();
        playSpawner = setTimeout(popPlayChick, 160 + Math.random() * 200);
    }

    function finishPlayGame() {
        clearInterval(playTimer);
        clearTimeout(playSpawner);
        playTimer = null;
        playSpawner = null;
        playState = "idle";
        clearPlayCell();

        const loveGain = Math.min(35, playScore * 2.5);
        const expGain = playScore * 3;
        const coinGain = Math.floor(playScore / 3);
        setStat("love", love + loveGain);
        flashStatDelta("love", loveGain);
        addExp(expGain);
        coins += coinGain;
        playCount++;
        playTotalScore += playScore;
        if (playScore > playBestScore) playBestScore = playScore;

        document.getElementById("play-best").innerText = playBestScore;
        document.getElementById("play-status").innerText =
            "🐣 " + playScore + "마리와 놀았어요! 애정도 +" + Math.round(loveGain) + " · 🪙 +" + coinGain;
        const btn = document.getElementById("play-start-btn");
        btn.disabled = false;
        btn.innerText = "🎈 다시 놀기";

        showEventToast("🎈 신나게 놀았어요! 애정도 +" + Math.round(loveGain) + ", 코인 +" + coinGain, "good");
        if (playScore >= 15) spawnConfetti();
        updateResourceBar();
        checkLevelUp();
        checkMissions();
        saveGame();
    }

    // ===== 상점 =====
    function renderShop() {
        const wrap = document.getElementById("shop-rows");
        if (!wrap) return;
        const crops = unlockedCrops();
        let html = "";

        html += '<div class="section-title">🌱 씨앗 구매</div>';
        crops.forEach(key => {
            const c = cropTypes[key];
            html += '<div class="shop-row"><div><div class="shop-info">' + c.emoji + ' ' + c.name + ' 씨앗</div>';
            html += '<div class="shop-sub">' + c.seedCost + ' 🪙 / 개 (보유 ' + cropSeeds[key] + ')</div></div>';
            html += '<button class="shop-btn shop-buy" ' + (coins < c.seedCost ? "disabled" : "") + ' onclick="buySeedType(\'' + key + '\')">구매</button></div>';
        });

        html += '<div class="section-title">🧺 수확물 판매</div>';
        crops.forEach(key => {
            const c = cropTypes[key];
            html += '<div class="shop-row"><div><div class="shop-info">' + c.emoji + ' ' + c.name + '</div>';
            html += '<div class="shop-sub">' + c.sellPrice + ' 🪙 / 개 (보유 ' + cropInventory[key] + ')</div></div>';
            html += '<button class="shop-btn shop-sell" ' + (cropInventory[key] <= 0 ? "disabled" : "") + ' onclick="sellCropType(\'' + key + '\')">판매</button></div>';
        });
        fishSpeciesOrder.forEach(key => {
            const sp = fishSpecies[key];
            html += '<div class="shop-row"><div><div class="shop-info">' + sp.emoji + ' ' + sp.name + '</div>';
            html += '<div class="shop-sub">' + sp.sellPrice + ' 🪙 / 개 (보유 ' + fishInventory[key] + ')</div></div>';
            html += '<button class="shop-btn shop-sell" ' + (fishInventory[key] <= 0 ? "disabled" : "") + ' onclick="sellFishType(\'' + key + '\')">판매</button></div>';
        });
        oreOrder.forEach(key => {
            const ore = oreTypes[key];
            html += '<div class="shop-row"><div><div class="shop-info">' + ore.emoji + ' ' + ore.name + '</div>';
            html += '<div class="shop-sub">' + ore.sellPrice + ' 🪙 / 개 (보유 ' + oreInventory[key] + ')</div></div>';
            html += '<button class="shop-btn shop-sell" ' + (oreInventory[key] <= 0 ? "disabled" : "") + ' onclick="sellOreType(\'' + key + '\')">판매</button></div>';
        });

        html += '<div class="section-title">🎀 꾸미기 — 하나를 착용해 특별한 능력을 받아요</div>';
        accessoryOrder.forEach(key => {
            const a = accessories[key];
            const owned = !!ownedAccessories[key];
            const equipped = equippedAccessory === key;
            html += '<div class="shop-row' + (equipped ? " equipped" : "") + '"><div><div class="shop-info">' + a.emoji + ' ' + a.name + (equipped ? ' <span class="equip-tag">착용 중</span>' : '') + '</div>';
            html += '<div class="shop-sub">' + a.desc + (owned ? '' : ' · 🪙' + a.cost) + '</div></div>';
            if (!owned) {
                html += '<button class="shop-btn shop-buy" ' + (coins < a.cost ? "disabled" : "") + ' onclick="buyAccessory(\'' + key + '\')">구매</button>';
            } else if (equipped) {
                html += '<button class="shop-btn shop-unequip" onclick="equipAccessory(null)">해제</button>';
            } else {
                html += '<button class="shop-btn shop-equip" onclick="equipAccessory(\'' + key + '\')">착용</button>';
            }
            html += '</div>';
        });

        // 벌어둔 코인으로 밥을 바로 살 수 있습니다.
        // 재료가 떨어졌거나 시간이 없을 때 쓰는 지름길이에요.
        html += '<div class="section-title">🍚 밥 사기 — 직접 만드는 것보다 비싸요</div>';
        Object.keys(mealTypes).forEach(key => {
            const m = mealTypes[key];
            const buff = m.buff ? BUFF_TYPES[m.buff] : null;
            html += '<div class="shop-row"><div><div class="shop-info">' + m.emoji + ' ' + m.label + '</div>';
            html += '<div class="shop-sub">포만감 +' + m.hungerRestore + ' · 경험치 +' + m.exp +
                    (buff ? ' · ' + buff.emoji + ' ' + buff.label : '') +
                    ' · 🪙' + m.buyCost + ' (보유 ' + (mealInventory[key] || 0) + ')</div></div>';
            html += '<button class="shop-btn shop-buy" ' + (coins < m.buyCost ? "disabled" : "") +
                    ' onclick="buyMeal(\'' + key + '\')">구매</button></div>';
        });

        // 코인 → 온기. 하루 횟수를 제한해 둔 이유는 위 DONATE_COST 주석에 적어 뒀습니다.
        const donateLeft = donateRemaining();
        html += '<div class="section-title">🎁 마을에 기부하기</div>';
        html += '<div class="shop-row"><div><div class="shop-info">🎁 온기 나눔</div>';
        html += '<div class="shop-sub">코인을 마을에 보태면 온기가 🔥' + DONATE_WARMTH + ' 돌아와요 · 🪙' + DONATE_COST +
                '<br>오늘 ' + donateLeft + '번 남았어요 (하루 ' + DONATE_MAX_DAY + '번까지)</div></div>';
        html += '<button class="shop-btn shop-buy" ' + (coins < DONATE_COST || donateLeft <= 0 ? "disabled" : "") +
                ' onclick="donateForWarmth()">' + (donateLeft <= 0 ? '내일 또' : '기부') + '</button></div>';

        html += '<div class="section-title">🍬 바로 쓰는 물건</div>';
        html += '<div class="shop-row"><div><div class="shop-info">🍬 간식</div>';
        html += '<div class="shop-sub">애정도를 바로 +20 채워요 · 🪙' + SNACK_COST + '</div></div>';
        html += '<button class="shop-btn shop-buy" ' + (coins < SNACK_COST ? "disabled" : "") + ' onclick="buySnack()">사용</button></div>';
        html += '<div class="shop-row"><div><div class="shop-info">⚡ 기운약</div>';
        html += '<div class="shop-sub">활력을 바로 +25 채워요 · 🪙' + TONIC_COST + '</div></div>';
        html += '<button class="shop-btn shop-buy" ' + (coins < TONIC_COST ? "disabled" : "") + ' onclick="buyTonic()">사용</button></div>';
        html += '<div class="shop-row"><div><div class="shop-info">💧 물뿌리개</div>';
        html += '<div class="shop-sub">농장 안에서 자라는 작물 하나를 바로 다 자라게 해요 · 🪙' + WATER_COST + '</div></div>';
        html += '<button class="shop-btn shop-sell" disabled>농장에서</button></div>';

        wrap.innerHTML = html;
        renderRodCard();
        renderPickCard();
    }

    // ===== 꾸미기 / 소모품 =====
    function buyAccessory(key) {
        const a = accessories[key];
        if (ownedAccessories[key]) return;
        if (coins < a.cost) {
            showEventToast("코인이 부족해요! 조금만 더 모아봐요 🪙", "bad");
            return;
        }
        coins -= a.cost;
        ownedAccessories[key] = true;
        equipAccessory(key);
        showEventToast("🎁 " + a.emoji + " " + a.name + eulReul(a.name) + " 샀어요! 바로 착용했어요", "good");
        spawnConfetti();
    }

    function equipAccessory(key) {
        equippedAccessory = (key && ownedAccessories[key]) ? key : null;
        updateAccessoryVisual();
        updateResourceBar();
        renderShop();
        saveGame();
    }

    function updateAccessoryVisual() {
        renderCharacter();
    }

    // 밥을 완성된 채로 삽니다. 만들어 둔 밥이랑 똑같이 창고에 들어가서,
    // 밥 줄 때 고르는 화면에 같이 나옵니다.
    function buyMeal(key) {
        const m = mealTypes[key];
        if (!m) return;
        if (coins < m.buyCost) {
            showEventToast("코인이 부족해요! 🪙" + m.buyCost + "이 필요해요", "bad");
            return;
        }
        coins -= m.buyCost;
        mealInventory[key] = (mealInventory[key] || 0) + 1;
        showEventToast(m.emoji + " " + m.label + eulReul(m.label) + " 사 왔어요!", "good");
        updateResourceBar();
        renderShop();
        saveGame();
    }

    // 오늘 기부를 몇 번 더 할 수 있는지
    function donateRemaining() {
        if (donateDate !== todayKey()) return DONATE_MAX_DAY;
        return Math.max(0, DONATE_MAX_DAY - donateCount);
    }

    function donateForWarmth() {
        if (donateRemaining() <= 0) {
            showEventToast("오늘 몫은 다 나눴어요. 내일 또 와요 🌙", "bad");
            return;
        }
        if (coins < DONATE_COST) {
            showEventToast("코인이 부족해요! 🪙" + DONATE_COST + "이 필요해요", "bad");
            return;
        }
        coins -= DONATE_COST;
        // 날짜가 바뀌었으면 오늘치로 새로 셉니다
        if (donateDate !== todayKey()) { donateDate = todayKey(); donateCount = 0; }
        donateCount++;
        addWarmth(DONATE_WARMTH, "마을에 보탰어요");
        updateResourceBar();
        renderShop();
        saveGame();
    }

    function buySnack() {
        if (coins < SNACK_COST) return;
        if (love >= 100) {
            showEventToast("이미 사랑이 가득해요 💗", "neutral");
            return;
        }
        coins -= SNACK_COST;
        setStat("love", love + 20);
        flashStatDelta("love", 20);
        spawnHearts();
        showEventToast("🍬 간식을 맛있게 먹었어요! 애정도 +20", "good");
        updateResourceBar();
        renderShop();
        saveGame();
    }

    function buyTonic() {
        if (coins < TONIC_COST) return;
        if (energy >= 100) {
            showEventToast("이미 기운이 넘쳐요 ⚡", "neutral");
            return;
        }
        coins -= TONIC_COST;
        setStat("energy", energy + 25);
        flashStatDelta("energy", 25);
        showEventToast("⚡ 기운약을 마셨어요! 활력 +25", "good");
        updateResourceBar();
        renderShop();
        saveGame();
    }

    function useWatering() {
        if (!currentField) return;
        const plots = fieldPlots[currentField];
        const idx = plots.findIndex(p => p.state === "growing");
        if (idx < 0) {
            showEventToast("지금 자라는 중인 작물이 없어요 🌱", "neutral");
            return;
        }
        if (coins < WATER_COST) {
            showEventToast("코인이 부족해요! 🪙" + WATER_COST + "이 필요해요", "bad");
            return;
        }
        coins -= WATER_COST;
        plots[idx].state = "ready";
        showEventToast("💧 물을 듬뿍 줬더니 쑥 자랐어요!", "good");
        updateResourceBar();
        renderFarm();
        saveGame();
    }

    function renderRodCard() {
        // 강화 단계에 맞는 낚싯대를 3D 무대에 세웁니다
        if (window.scene3d) window.scene3d.fish.rod(rodLevel);
        const card = document.getElementById("rod-card");
        if (!card) return;
        const rod = rodLevels[rodLevel];
        const isMax = rodLevel >= rodLevels.length - 1;
        const pct = (rodDurability / rod.durabilityMax) * 100;

        let html = '<span class="rod-emoji">' + rod.emoji + '</span>';
        html += '<div class="rod-name">' + rod.name + '</div>';
        html += '<div class="rod-stats">존 +' + rod.zoneBonus + '% · 여유시간 +' + rod.durationBonus.toFixed(1) + 's · 여러 마리 ' + Math.round(rod.multiChance * 100) + '% · 최대내구도 ' + rod.durabilityMax + '</div>';
        html += '<div class="rod-durability-bg"><div class="rod-durability-fill" style="width:' + pct + '%"></div></div>';
        html += '<div class="rod-stats">내구도 ' + rodDurability + ' / ' + rod.durabilityMax + '</div>';

        if (isMax) {
            html += '<button class="rod-btn rod-upgrade-btn" disabled>최고 단계 달성!</button>';
        } else {
            const canAfford = coins >= rod.upgradeCost;
            html += '<button class="rod-btn rod-upgrade-btn" ' + (canAfford ? "" : "disabled") + ' onclick="upgradeRod()">🔨 강화하기 (🪙' + rod.upgradeCost + ')</button>';
        }
        if (rodDurability < rod.durabilityMax) {
            const repairCost = 8;
            const canRepair = coins >= repairCost;
            html += '<button class="rod-btn rod-repair-btn" ' + (canRepair ? "" : "disabled") + ' onclick="repairRod()">🔧 수리하기 (🪙' + repairCost + ')</button>';
        }
        card.innerHTML = html;
    }

    function upgradeRod() {
        const rod = rodLevels[rodLevel];
        if (rodLevel >= rodLevels.length - 1) return;
        if (coins < rod.upgradeCost) {
            showMessage("코인이 부족해요! 물고기나 작물을 팔아보세요 🪙", true);
            return;
        }
        coins -= rod.upgradeCost;
        rodLevel++;
        rodDurability = rodLevels[rodLevel].durabilityMax;
        showEventToast("🔨 낚싯대가 " + rodLevels[rodLevel].name + euRo(rodLevels[rodLevel].name) + " 강화됐어요!", "good");
        updateResourceBar();
        renderRodCard();
        saveGame();
    }

    function repairRod() {
        const repairCost = 8;
        const rod = rodLevels[rodLevel];
        if (rodDurability >= rod.durabilityMax) return;
        if (coins < repairCost) {
            showMessage("코인이 부족해요! 물고기나 작물을 팔아보세요 🪙", true);
            return;
        }
        coins -= repairCost;
        rodDurability = rod.durabilityMax;
        showEventToast("🔧 낚싯대를 수리했어요!", "good");
        updateResourceBar();
        renderRodCard();
        saveGame();
    }

    function buySeedType(key) {
        const cost = cropTypes[key].seedCost;
        if (coins < cost) {
            showMessage("코인이 부족해요! 작물이나 물고기를 판매해보세요 🪙", true);
            return;
        }
        coins -= cost;
        cropSeeds[key]++;
        updateResourceBar();
        renderShop();
        renderCropSelector();
    }

    function sellCropType(key) {
        if (cropInventory[key] <= 0) return;
        cropInventory[key]--;
        coins += cropTypes[key].sellPrice;
        updateResourceBar();
        renderShop();
        renderFarm();
    }

    function sellFishType(key) {
        if (fishInventory[key] <= 0) return;
        fishInventory[key]--;
        coins += fishSpecies[key].sellPrice;
        updateResourceBar();
        renderShop();
        updateFishStatus();
    }

    function updateResourceBar() {
        const totalMeals = Object.values(mealInventory).reduce((a, b) => a + b, 0);
        document.getElementById("res-meals").innerText = totalMeals;
        document.getElementById("res-coins").innerText = coins;
    }

    // ===== 탭 전환 =====
    function switchTab(name) {
        const tabs = ["care", "farm", "fish", "mine", "walk", "play", "shop"];
        tabs.forEach(t => {
            document.getElementById("tab-panel-" + t).classList.toggle("active", t === name);
            document.getElementById("tab-btn-" + t).classList.toggle("active", t === name);
        });
        if (name === "farm") { exitField(); }
        if (name === "shop") renderShop();
        if (name === "fish") updateFishStatus();
        if (name === "mine") updateMineStatus();
        if (name === "play") {
            buildPlayGrid();
            document.getElementById("play-best").innerText = playBestScore;
        }
        if (name === "walk") rollWeather();
        if (name === "mine") renderMineRoutes();      // [P2] 갈림길
        // 낚시터·광산 3D 무대는 그 탭에서만 그립니다
        if (window.scene3d && window.scene3d.available()) {
            if (name === "fish") window.scene3d.fish.show(); else window.scene3d.fish.hide();
            if (name === "mine") window.scene3d.mine.show(); else window.scene3d.mine.hide();
        }
        if (name === "care") greetOnCareTab();   // 돌아오면 반갑게 다가와요

        // 3D 병아리는 보살피기 탭에서만 그립니다.
        // 다른 탭에서도 계속 그리면 배터리만 쓰고 보이지도 않아요.
        if (window.chick3d && window.chick3d.available()) {
            if (name === "care") { window.chick3d.show(); window.chick3d.resize(); }
            else window.chick3d.hide();
        }
    }

    // ===== 산책 날씨 =====
    function rollWeather() {
        // [4] 마음 신호등을 고른 날은 그 색이 곧 오늘의 날씨입니다.
        // 무작위로 덮어쓰면 "내가 고른 게 반영됐다"는 느낌이 사라져서 잠급니다.
        if (weatherFromSignal) { applyWeatherBadge(); return; }
        const r = Math.random();
        const prevWeather = currentWeather;
        currentWeather = r < 0.6 ? "clear" : (r < 0.8 ? "hot" : "rain");
        const w = weatherTypes[currentWeather];
        const badge = document.getElementById("weather-badge");
        badge.innerText = w.emoji + " " + w.label;
        badge.className = "weather-badge weather-" + currentWeather;

        // 안내 문구도 겁주지 않는 쪽으로. 날씨는 경고가 아니라 분위기입니다.
        if (currentWeather !== "clear" && currentWeather !== prevWeather) {
            if (currentWeather === "hot") {
                showEventToast("🌥️ 흐린 날이에요. 천천히 걸어도 병아리는 좋아해요", "neutral");
            } else if (currentWeather === "rain") {
                showEventToast("🌧️ 비가 와요. 이런 날 함께 있어주면 병아리가 더 붙어 있어요", "neutral");
            }
        }
    }

    // ===== 산책 배경 =====
    // fromUser: 버튼을 직접 눌렀을 때만 true.
    // 저장된 씬을 복원하면서(앱 시작·게임 진입) 캠퍼스 지도가 제멋대로
    // 열리면 안 되므로, 지도 진입은 사용자가 누른 경우로 한정합니다.
    function setWalkScene(key, fromUser) {
        currentWalkScene = key;
        const boundary = document.getElementById("walk-boundary");
        // 배경은 CSS 클래스가 그립니다(.scene-forest / .scene-beach / .scene-campus).
        // 인라인 style 로 덮으면 겹겹이 그린 레이어가 통째로 지워져서 클래스로 바꿨습니다.
        boundary.classList.remove("scene-forest", "scene-beach", "scene-campus");
        boundary.classList.add("scene-" + key);
        boundary.style.background = "";
        document.querySelectorAll(".walk-deco").forEach(el => el.remove());
        const charEl = document.getElementById("walk-char");
        walkScenes[key].deco.forEach(d => {
            const el = document.createElement("span");
            el.className = "walk-deco";
            el.style.left = d.l + "%";
            el.style.top = d.t + "%";
            el.innerText = d.e;
            boundary.insertBefore(el, charEl);
        });
        Object.keys(walkScenes).forEach(k => {
            const btn = document.getElementById("scene-btn-" + k);
            if (btn) btn.classList.toggle("active", k === key);
        });

        // 캠퍼스는 배경만 바뀌는 게 아니라 제주대 실제 지도 위를 걷는
        // 가로 화면으로 들어갑니다 (campus.js). 지도를 닫고 나오면
        // 여기서 깔아둔 캠퍼스 배경이 그대로 보입니다.
        if (fromUser && key === "campus" && typeof openCampusWalk === "function") {
            openCampusWalk();
        }
    }

    // ===== 산책 (바운더리) =====
    let lastWalkEffect = 0;
    let lastTiredHint = 0;   // 지쳤을 때 안내를 너무 자주 띄우지 않도록

    // ===================================================================
    // 탭(터치) 처리
    //
    // div 에 onclick 만 걸어두면 브라우저가 만들어 주는 '합성 클릭'에
    // 기대게 됩니다. 그런데 손가락이 10px 만 밀려도 브라우저는 그걸
    // 스크롤로 보고 click 을 안 만들어요. 그래서 폰에서 탭이 자꾸 씹힙니다.
    //
    // 여기서는 touchstart/touchend 를 직접 받아서, 손가락이 크게 움직이지
    // 않았으면 탭으로 처리합니다. touchend 에서 preventDefault 를 불러
    // 뒤따라올 합성 클릭을 막으므로 두 번 실행되지 않습니다.
    // ===================================================================
    const TAP_SLOP = 14;      // 이 정도까지는 손이 흔들린 것으로 봅니다
    const TAP_TIME = 700;     // 길게 누른 건 탭이 아닙니다

    function bindTap(el, fn) {
        if (!el || el.dataset.tapBound) return;
        el.dataset.tapBound = "1";

        let sx = 0, sy = 0, st = 0, moved = false;

        el.addEventListener("touchstart", function (e) {
            const t = e.changedTouches[0];
            sx = t.clientX; sy = t.clientY; st = Date.now(); moved = false;
        }, { passive: true });

        el.addEventListener("touchmove", function (e) {
            const t = e.changedTouches[0];
            if (Math.abs(t.clientX - sx) > TAP_SLOP || Math.abs(t.clientY - sy) > TAP_SLOP) moved = true;
        }, { passive: true });

        el.addEventListener("touchend", function (e) {
            if (moved || Date.now() - st > TAP_TIME) return;
            const t = e.changedTouches[0];
            // 합성 클릭이 뒤따라오지 않도록 막습니다 (두 번 실행 방지)
            if (e.cancelable) e.preventDefault();
            fn({ clientX: t.clientX, clientY: t.clientY, target: e.target });
        }, { passive: false });
    }

    // 화면에 있는 탭 대상들을 한 번에 묶어둡니다.
    // 놀이판처럼 나중에 만들어지는 것은 만든 뒤에 다시 부릅니다.
    function bindAllTaps() {
        bindTap(document.getElementById("walk-boundary"), function (e) { moveCharacter(e); });
        bindTap(document.getElementById("mine-cave"), function () { mineTap(); });
        bindTap(document.getElementById("chick"), function () { tapChick(); });
        for (let i = 0; i < 9; i++) {
            (function (idx) {
                bindTap(document.getElementById("play-cell-" + idx), function () { playHit(idx); });
            })(i);
        }
    }

    function moveCharacter(evt) {
        if (asleep || finalVariant) return;

        // 예전에는 배고프거나 지치면 아예 못 걷게 막았습니다.
        // 그런데 산책은 "아무것도 안 해도 되는" 활동이라 항상 열려 있어야 해요.
        // 막아두면 화면이 그냥 안 눌리는 것처럼 보이기도 하고요.
        // 그래서 지쳤을 땐 막는 대신, 힘을 덜 쓰고 천천히 걷습니다.
        const tired = (hunger < 10 || energy < 10);
        if (tired && Date.now() - lastTiredHint > 8000) {
            lastTiredHint = Date.now();
            showMessage("조금 지쳤지만 천천히 걸을 수 있어요. 쉬엄쉬엄 가요 🐾", false);
        }

        const boundary = document.getElementById("walk-boundary");
        const rect = boundary.getBoundingClientRect();
        const clickX = evt.clientX - rect.left;
        const clickY = evt.clientY - rect.top;
        const leftPct = Math.max(6, Math.min(94, (clickX / rect.width) * 100));
        const topPct = Math.max(12, Math.min(88, (clickY / rect.height) * 100));

        const charEl = document.getElementById("walk-char");
        charEl.style.left = leftPct + "%";
        charEl.style.top = topPct + "%";
        charEl.classList.add("walking-anim");
        setTimeout(() => charEl.classList.remove("walking-anim"), 600);
        spawnWalkFootprint(leftPct, topPct);
        // [4] 우연한 발견 — 5% 확률로 네잎클로버나 위로의 편지를 줍습니다
        rollLuckyFind(leftPct, topPct);
        questTick("walk");            // [P1]

        const now = Date.now();
        if (now - lastWalkEffect > 1500) {
            const weather = weatherTypes[currentWeather];
            // 지쳤을 때는 소모를 거의 없애서, 걷는다고 더 나빠지지 않게 합니다
            const wear = tired ? 0.15 : 1;
            const hungerLoss = -4 * wear;
            const energyLoss = -3 * weather.energyMod * wear;
            const loveGain = 5 * weather.loveMod;
            setStat("hunger", hunger + hungerLoss);
            flashStatDelta("hunger", hungerLoss);
            setStat("energy", energy + energyLoss);
            flashStatDelta("energy", -Math.round(Math.abs(energyLoss)));
            setStat("love", love + loveGain);
            flashStatDelta("love", Math.round(loveGain));
            addExp(3);
            walkCount++;
            lastWalkEffect = now;
            showMessage("상쾌한 바람을 맞으며 함께 걸었어요 🚶🍃", false);
            checkLevelUp();
            checkMissions();
        }
    }

    function spawnWalkFootprint(leftPct, topPct) {
        const boundary = document.getElementById("walk-boundary");
        const el = document.createElement("span");
        el.className = "walk-footprint";
        el.innerText = "👣";
        el.style.left = leftPct + "%";
        el.style.top = topPct + "%";
        boundary.appendChild(el);
        setTimeout(() => el.remove(), 1600);
    }

    function toggleSleep() {
        if (finalVariant) return;
        asleep = !asleep;
        const sleepBtn = document.getElementById("sleep-btn");
        const chickEl = document.getElementById("chick");
        const feedBtn = document.getElementById("feed-btn");
        const petBtn = document.getElementById("pet-btn");

        if (asleep) {
            sleepBtn.innerText = "🌅 깨우기";
            chickEl.classList.add("asleep");
            feedBtn.disabled = true;
            petBtn.disabled = true;
            showMessage("스르르 눈을 감고 쿨쿨 잠들었어요 💤", false);
            // [5] 히든 진화 조건 — 깊은 밤(0~5시)에 재운 횟수
            const hr = new Date().getHours();
            if (hr >= 0 && hr < 5) {
                nightSleepCount++;
                if (nightSleepCount === 10) {
                    showEventToast("🦇 이 아이도 밤에 익숙해진 것 같아요... 뭔가 달라지고 있어요", "good");
                }
            }
            startZzz();
        } else {
            sleepBtn.innerText = "😴 재우기";
            chickEl.classList.remove("asleep");
            feedBtn.disabled = false;
            petBtn.disabled = false;
            showMessage("잘 잤어요! 기운이 나요 ⚡", false);
            stopZzz();
            renderCharacter();
            playAegyo("ag-hop", 1200);          // 깨어나면 기지개 켜듯 폴짝
            spawnChickBubble("잘 잤어요!");
            return;
        }
        renderCharacter();
    }

    function updateTimeGateHint() {
        const hintEl = document.getElementById("time-gate-hint");
        if (currentLevel >= stages.length - 1) { hintEl.innerText = ""; return; }
        const next = stages[currentLevel + 1];
        if (currentExp >= next.expNeed && elapsedSeconds < next.minSeconds) {
            const remain = Math.ceil(next.minSeconds - elapsedSeconds);
            hintEl.innerText = "⏳ 다음 단계까지 " + remain + "초만 더 함께해주세요";
        } else {
            hintEl.innerText = "";
        }
    }

    function updateProgressBar() {
        if (currentLevel >= stages.length - 1) {
            document.getElementById("progress").style.width = "100%";
            document.getElementById("progress-percent").innerText = "완성!";
            return;
        }
        const next = stages[currentLevel + 1];
        const prev = stages[currentLevel];
        const expInLevel = currentExp - prev.expNeed;
        const expNeeded = next.expNeed - prev.expNeed;
        // 저장 데이터가 어긋나 경험치가 현재 단계 기준보다 낮아도 음수 폭이 나오지 않도록 막습니다
        const percentage = Math.max(0, Math.min(100, (expInLevel / expNeeded) * 100));
        document.getElementById("progress").style.width = percentage + "%";
        document.getElementById("progress-percent").innerText = Math.round(percentage) + "%";
    }

    function determineSpeciesKey() {
        // [5] 히든 진화 판정을 일반 성향 판정보다 먼저 봅니다.
        // 조건이 까다로운 쪽이 이겨야 "숨겨진 걸 찾았다"는 느낌이 나요.
        if (rainPetCount >= 30) return "rainbird";
        if (nightSleepCount >= 10) return "nightowl";

        // 예전에는 제일 많이 한 행동이 무조건 이겨서, 쓰다듬기를 조금만
        // 더 해도 매번 공작새만 나왔습니다. 모으는 재미가 없어져서
        // '성향은 확률에 반영하되 결과는 뽑기'로 바꿨습니다.
        //
        //   - 어떻게 키웠든 네 종류 모두 최소한의 몫(base)을 갖습니다
        //   - 많이 한 행동일수록 그 종이 나올 확률이 커집니다
        //   - 그래도 확정은 아니라서, 같은 방식으로 키워도 다른 애가 나와요
        const sleepScore = sleepSeconds / 15;
        const raw = { feed: feedCount, pet: petCount, sleep: sleepScore };
        const total = raw.feed + raw.pet + raw.sleep;
        if (total <= 0) return "balanced";

        const base = 1.0;                 // 아무것도 안 한 종에게도 주는 기본 몫
        const lean = 3.0;                 // 성향이 확률에 실리는 정도
        const weights = {
            feed:     base + lean * (raw.feed / total),
            pet:      base + lean * (raw.pet / total),
            sleep:    base + lean * (raw.sleep / total),
            // 골고루 키웠을수록 균형형(백조)이 잘 나오게.
            // 제곱해서, 한쪽으로 치우쳐 키웠는데 균형형이 나오는 일을 줄입니다.
            balanced: base + lean * Math.pow(balanceEvenness(raw, total), 2)
        };

        let sum = 0;
        Object.keys(weights).forEach(k => { sum += weights[k]; });
        let r = Math.random() * sum;
        const keys = Object.keys(weights);
        for (let i = 0; i < keys.length; i++) {
            r -= weights[keys[i]];
            if (r <= 0) return keys[i];
        }
        return "balanced";
    }

    // 셋을 얼마나 고르게 했는지 (1 이면 완전히 균등)
    function balanceEvenness(raw, total) {
        const ideal = total / 3;
        if (ideal <= 0) return 0;
        const dev = (Math.abs(raw.feed - ideal) + Math.abs(raw.pet - ideal) + Math.abs(raw.sleep - ideal)) / total;
        return Math.max(0, 1 - dev);
    }

    function determineTierKey() {
        const avgCare = careTicks > 0 ? careSum / careTicks : 100;
        if (avgCare >= tierList.radiant.min) return "radiant";
        if (avgCare >= tierList.healthy.min) return "healthy";
        return "wild";
    }

    function checkLevelUp() {
        if (currentLevel >= stages.length - 1) { updateProgressBar(); return; }
        const next = stages[currentLevel + 1];

        if (currentExp >= next.expNeed && elapsedSeconds >= next.minSeconds) {
            currentLevel++;
            renderCharacter();
            document.getElementById("stage-name").innerText = stages[currentLevel].name;
            document.getElementById("stage-badge").innerText = "Lv." + (currentLevel + 1);
            showMessage(stages[currentLevel].msg, false);
            updateStageClass();

            if (currentLevel === stages.length - 1) {
                revealFinalVariant();
            }
        }
        updateProgressBar();
    }

    function revealFinalVariant() {
        const speciesKey = determineSpeciesKey();
        const tierKey = determineTierKey();
        const variantKey = speciesKey + "-" + tierKey;
        const species = speciesList[speciesKey];
        const tier = tierList[tierKey];
        const fullName = tier.label + " " + species.label;

        finalVariant = { key: variantKey, emoji: species.emoji, name: fullName };
        collected[variantKey] = (collected[variantKey] || 0) + 1;

        // [P0] 다 자란 병아리는 사라지지 않고 섬에 데려갈 친구로 남습니다.
        // 진화가 '끝'이 아니라 '새 역할의 시작'이 되도록 하는 부분이에요.
        addCompanion(variantKey, speciesKey, tierKey, fullName);
        addWarmth(25, fullName + "이 무사히 다 자랐어요");

        document.getElementById("feed-btn").disabled = true;
        document.getElementById("pet-btn").disabled = true;
        document.getElementById("sleep-btn").disabled = true;

        const chickEl = document.getElementById("chick");
        chickEl.classList.add("max");
        renderCharacter();

        document.getElementById("stage-name").innerText = fullName;
        showMessage("당신의 보살핌으로 '" + fullName + "'(이)가 태어났어요!\n당신은 생명을 가꾸는 멋진 사람입니다. 🏆", false);

        const revealWrap = document.getElementById("variant-reveal-wrap");
        const revealEl = document.getElementById("variant-reveal");
        revealEl.innerText = "🎁 새로운 친구 획득: " + species.emoji + " " + fullName;
        revealWrap.style.display = "block";

        document.getElementById("reset-btn").style.display = "block";

        spawnConfetti();
        checkMissions();
        renderCollection();
    }

    function resetGame() {
        currentExp = 0;
        currentLevel = 0;
        elapsedSeconds = 0;
        asleep = false;
        gameStarted = true; // 인터벌은 계속 유지
        feedCount = 0;
        petCount = 0;
        sleepSeconds = 0;
        careSum = 0;
        careTicks = 0;
        finalVariant = null;
        lastWarn = { hunger: false, energy: false, love: false };

        setStat("hunger", 100);
        setStat("love", 100);
        setStat("energy", 100);

        document.getElementById("playtime").innerText = "00:00";
        document.getElementById("stage-badge").innerText = "Lv.1";
        document.getElementById("stage-name").innerText = stages[0].name;
        document.getElementById("chick").classList.remove("max", "asleep");
        renderCharacter();
        showMessage(stages[0].msg, false);
        updateStageClass();
        updateProgressBar();
        document.getElementById("time-gate-hint").innerText = "";

        document.getElementById("feed-btn").disabled = false;
        document.getElementById("pet-btn").disabled = false;
        document.getElementById("sleep-btn").disabled = false;
        document.getElementById("sleep-btn").innerText = "😴 재우기";
        stopZzz();

        document.getElementById("variant-reveal-wrap").style.display = "none";
        document.getElementById("reset-btn").style.display = "none";

        const oldBadge = document.querySelector(".max-badge");
        if (oldBadge) oldBadge.remove();

        saveGame();
    }

    // 미리보기 — 잠금과 상관없이 18종의 모습을 다 보여줍니다.
    // 모으는 재미를 없애지 않도록 이름은 여전히 감추고 그림만 보여줘요.
    let peekMode = false;
    function togglePeek() {
        peekMode = !peekMode;
        const btn = document.getElementById("collection-peek");
        if (btn) btn.innerText = peekMode ? "🔒 모은 것만 보기" : "🎨 전체 모습 미리보기";
        renderCollection();
    }

    function renderCollection() {
        const grid = document.getElementById("collection-grid");
        let html = "";
        speciesOrder.forEach(speciesKey => {
            tierOrder.forEach(tierKey => {
                const variantKey = speciesKey + "-" + tierKey;
                const species = speciesList[speciesKey];
                const tier = tierList[tierKey];
                const count = collected[variantKey] || 0;
                const unlocked = count > 0;
                // [5] 히든 진화체는 아직 못 만났을 때 해금 조건을 힌트로 보여줍니다.
                // 아무 단서도 없으면 영영 못 찾으니까요.
                const cls = "collection-cell" + (unlocked ? "" : " locked") +
                            (species.hidden ? " hidden-species" : "");
                html += '<div class="' + cls + '"' +
                        (!unlocked && species.hint ? ' title="' + species.hint + '"' : '') + '>';
                // 미리보기에서는 잠긴 칸도 그림은 보여줍니다 (이름은 계속 감춤)
                const showPic = unlocked || peekMode;
                html += '<span class="c-emoji' + (!unlocked && peekMode ? ' peeking' : '') + '">' +
                        (showPic ? charPic(speciesForms[speciesKey], { size: 52, tier: tierKey })
                                 : (species.hidden ? "🔒" : "❓")) + '</span>';
                html += '<span class="c-name">' + (unlocked ? (tier.label + " " + species.label) : "???") + '</span>';
                if (unlocked) html += '<span class="c-count">x' + count + '</span>';
                else if (species.hidden && species.hint) html += '<span class="c-hint">' + species.hint + '</span>';
                html += '</div>';
            });
        });
        grid.innerHTML = html;
    }

    function openCollection() {
        renderCollection();
        document.getElementById("collection-view").style.display = "flex";
    }

    function closeCollection() {
        document.getElementById("collection-view").style.display = "none";
    }

    // ===== 미션 (레벨제: 각 미션마다 1~10단계) =====
    const MISSION_MAX_LEVEL = 10;
    const missions = [
        { key: "feed",    icon: "🍚", label: "밥 먹이기",       step: 5, get: () => totalFeedCount, reward: 5 },
        { key: "pet",     icon: "🤗", label: "쓰다듬기",         step: 5, get: () => totalPetCount, reward: 5 },
        { key: "harvest", icon: "🌾", label: "작물 수확하기",    step: 3, get: () => harvestCount, reward: 6 },
        { key: "fish",    icon: "🎣", label: "물고기 낚기",      step: 2, get: () => fishCaughtCount, reward: 6 },
        { key: "walk",    icon: "🚶", label: "산책하기",         step: 5, get: () => walkCount, reward: 5 },
        { key: "mine",    icon: "⛏️", label: "광물 캐기",        step: 5, get: () => oreMinedCount, reward: 7 },
        { key: "play",    icon: "🎈", label: "놀이 점수 쌓기",   step: 10, get: () => playTotalScore, reward: 8 },
        { key: "land",    icon: "🌱", label: "밭 넓히기",        step: 1, get: () => landBought, reward: 12 },
        { key: "friend",  icon: "🏆", label: "친구 완성하기",    step: 1,
          get: () => Object.values(collected).reduce((a, b) => a + b, 0), reward: 20 }
    ];
    let missionLevel = {}; // key -> 완료한 단계 수 (0 ~ 10)

    function missionLevelOf(key) { return missionLevel[key] || 0; }
    // 다음 단계까지 필요한 누적 목표치 (5, 10, 15 ... 처럼 단계마다 늘어남)
    function missionTarget(m, level) { return m.step * (level + 1); }
    // 단계가 오를수록 보상도 커집니다
    function missionReward(m, level) { return m.reward + Math.floor(m.reward * 0.5 * level); }
    function missionReady(m) {
        const lv = missionLevelOf(m.key);
        return lv < MISSION_MAX_LEVEL && m.get() >= missionTarget(m, lv);
    }

    function checkMissions() {
        const badge = document.getElementById("mission-badge");
        if (!badge) return;
        const readyCount = missions.filter(missionReady).length;
        badge.style.display = readyCount > 0 ? "flex" : "none";
        badge.innerText = readyCount;
        if (document.getElementById("mission-view").style.display === "flex") renderMissions();
    }

    function renderMissions() {
        const list = document.getElementById("mission-list");
        let html = "";
        missions.forEach(m => {
            const lv = missionLevelOf(m.key);
            const maxed = lv >= MISSION_MAX_LEVEL;
            const target = maxed ? missionTarget(m, MISSION_MAX_LEVEL - 1) : missionTarget(m, lv);
            const prev = maxed ? target : missionTarget(m, lv - 1); // 이전 단계 목표(0단계면 0)
            const value = Math.min(target, m.get());
            const ready = !maxed && m.get() >= target;
            const spanTotal = Math.max(1, target - (lv > 0 ? prev : 0));
            const spanDone = Math.max(0, value - (lv > 0 ? prev : 0));
            const pct = maxed ? 100 : Math.min(100, (spanDone / spanTotal) * 100);

            html += '<div class="mission-row' + (maxed ? " done" : "") + (ready ? " ready" : "") + '">';
            html += '<div class="mission-top"><span>' + m.icon + ' ' + m.label;
            html += '<span class="mission-level">' + lv + '/' + MISSION_MAX_LEVEL + ' 단계</span>';
            html += '</span><span>' + value + '/' + target + '</span></div>';
            html += '<div class="mission-progress-bg"><div class="mission-progress-fill" style="width:' + pct + '%"></div></div>';
            if (maxed) {
                html += '<button class="mission-claim-btn done" disabled>모든 단계 완료 ✔</button>';
            } else {
                html += '<button class="mission-claim-btn" ' + (ready ? "" : "disabled") + ' onclick="claimMission(\'' + m.key + '\')">보상 받기 (🪙' + missionReward(m, lv) + ')</button>';
            }
            html += '</div>';
        });
        list.innerHTML = html;
    }

    function claimMission(key) {
        const m = missions.find(x => x.key === key);
        if (!m || !missionReady(m)) return;
        const lv = missionLevelOf(m.key);
        const reward = missionReward(m, lv);
        missionLevel[key] = lv + 1;
        coins += reward;
        const nextLv = lv + 1;
        if (nextLv >= MISSION_MAX_LEVEL) {
            showEventToast("🏅 " + m.icon + " " + m.label + " 모든 단계를 완료했어요! 🪙+" + reward, "good");
            spawnConfetti();
        } else {
            showEventToast("🎉 " + m.icon + " " + m.label + " " + nextLv + "단계 달성! 🪙+" + reward, "good");
        }
        updateResourceBar();
        renderMissions();
        checkMissions();
        saveGame();
    }

    function openMissions() {
        renderMissions();
        document.getElementById("mission-view").style.display = "flex";
    }

    function closeMissions() {
        document.getElementById("mission-view").style.display = "none";
    }

    // ===== 저장 / 불러오기 =====
    const SAVE_KEY = "jeroki-pet-save";

    async function saveGame() {
        try {
            const state = {
                currentExp, currentLevel, hunger, love, energy, asleep, elapsedSeconds, gameStarted,
                feedCount, petCount, sleepSeconds, careSum, careTicks,
                totalFeedCount, totalPetCount, harvestCount, fishCaughtCount, walkCount, missionLevel,
                oreMinedCount, landBought, playBestScore, playTotalScore, playCount,
                ownedAccessories, equippedAccessory,
                finalVariant, collected,
                cropSeeds, cropInventory, selectedCrop, fishInventory, mealInventory, coins, farmTick,
                fieldsUnlocked, fieldPlots, fieldTools,
                oreInventory, pickLevel, pickDurability,
                currentWalkScene, rodLevel, rodDurability,
                // [5] 히든 진화 조건 카운터  [3] 진행 중인 버프  [4] 신호등 날씨 잠금
                rainPetCount, nightSleepCount, activeBuffs, weatherFromSignal, currentWeather,
                questsToday, questProgress, questDate,     // [P1] 오늘의 부탁
                mineRoute, rareOreCount, starfishCaught,   // [P2] 희귀 순간
                donateDate, donateCount                    // 오늘 기부한 횟수
            };
            await window.storage.set(SAVE_KEY, JSON.stringify(state), false);
        } catch (e) {
            // 저장 실패는 조용히 무시 (다음 틱에서 다시 시도됨)
        }
    }

    function applyLoadedState(state) {
        currentExp = state.currentExp ?? 0;
        currentLevel = state.currentLevel ?? 0;
        asleep = state.asleep ?? false;
        elapsedSeconds = state.elapsedSeconds ?? 0;
        gameStarted = state.gameStarted ?? false;
        feedCount = state.feedCount ?? 0;
        petCount = state.petCount ?? 0;
        sleepSeconds = state.sleepSeconds ?? 0;
        careSum = state.careSum ?? 0;
        careTicks = state.careTicks ?? 0;
        totalFeedCount = state.totalFeedCount ?? 0;
        totalPetCount = state.totalPetCount ?? 0;
        rainPetCount = state.rainPetCount ?? 0;
        nightSleepCount = state.nightSleepCount ?? 0;
        activeBuffs = state.activeBuffs || {};
        weatherFromSignal = !!state.weatherFromSignal;
        questsToday = state.questsToday || [];
        questProgress = state.questProgress || questProgress;
        questDate = state.questDate || "";
        mineRoute = state.mineRoute || "safe";
        rareOreCount = state.rareOreCount || 0;
        starfishCaught = state.starfishCaught || 0;
        donateDate = state.donateDate || "";
        donateCount = state.donateCount || 0;
        if (state.currentWeather) currentWeather = state.currentWeather;
        harvestCount = state.harvestCount ?? 0;
        fishCaughtCount = state.fishCaughtCount ?? 0;
        walkCount = state.walkCount ?? 0;
        oreMinedCount = state.oreMinedCount ?? 0;
        landBought = state.landBought ?? 0;
        playBestScore = state.playBestScore ?? 0;
        playTotalScore = state.playTotalScore ?? 0;
        playCount = state.playCount ?? 0;
        missionLevel = state.missionLevel ?? {};
        ownedAccessories = state.ownedAccessories ?? {};
        equippedAccessory = state.equippedAccessory ?? null;
        if (equippedAccessory && !ownedAccessories[equippedAccessory]) equippedAccessory = null;
        finalVariant = state.finalVariant ?? null;
        collected = state.collected ?? {};
        // 예전 저장본에는 새 작물/광물 키가 없으므로 기본값 위에 덮어씀
        cropSeeds = Object.assign({}, cropSeeds, state.cropSeeds || {});
        cropInventory = Object.assign({}, cropInventory, state.cropInventory || {});
        mealInventory = Object.assign({}, mealInventory, state.mealInventory || {});
        // 예전 저장본의 '생선구이'는 멸치볶음으로 이어받음
        if (mealInventory.fish) {
            mealInventory.anchovy += mealInventory.fish;
            delete mealInventory.fish;
        }
        oreInventory = Object.assign({}, oreInventory, state.oreInventory || {});
        selectedCrop = state.selectedCrop ?? "wheat";
        fishInventory = Object.assign({}, fishInventory, state.fishInventory || {});
        coins = state.coins ?? 15;
        farmTick = state.farmTick ?? 0;
        fieldsUnlocked = Object.assign({}, fieldsUnlocked, state.fieldsUnlocked || {});
        fieldTools = Object.assign({ home: false, green: false, orchard: false }, state.fieldTools || {});
        if (state.fieldPlots) {
            fieldOrder.forEach(f => { fieldPlots[f] = state.fieldPlots[f] || fieldPlots[f] || []; });
        } else if (state.plots) {
            // 농장이 하나뿐이던 예전 저장본 이어받기
            fieldPlots.home = state.plots;
        }
        currentField = null;
        pickLevel = state.pickLevel ?? 0;
        pickDurability = state.pickDurability ?? pickLevels[pickLevel].durabilityMax;
        currentWalkScene = state.currentWalkScene ?? "forest";
        rodLevel = state.rodLevel ?? 0;
        rodDurability = state.rodDurability ?? rodLevels[rodLevel].durabilityMax;

        // ----- 화면 반영 -----
        setStat("hunger", state.hunger ?? 100);
        setStat("love", state.love ?? 100);
        setStat("energy", state.energy ?? 100);

        document.getElementById("playtime").innerText = formatTime(elapsedSeconds);
        document.getElementById("stage-badge").innerText = "Lv." + (currentLevel + 1);
        document.getElementById("stage-name").innerText = stages[currentLevel].name;
        updateStageClass();
        updateProgressBar();
        updateResourceBar();
        renderFarm();
        renderShop();
        updateFishStatus();
        updateMineStatus();
        updateAccessoryVisual();
        buildPlayGrid();
        document.getElementById("play-best").innerText = playBestScore;
        setWalkScene(currentWalkScene);

        if (asleep) {
            document.getElementById("sleep-btn").innerText = "🌅 깨우기";
            document.getElementById("chick").classList.add("asleep");
            document.getElementById("feed-btn").disabled = true;
            document.getElementById("pet-btn").disabled = true;
            startZzz();
        }

        if (finalVariant) {
            document.getElementById("feed-btn").disabled = true;
            document.getElementById("pet-btn").disabled = true;
            document.getElementById("sleep-btn").disabled = true;

            document.getElementById("chick").classList.add("max");
            document.getElementById("stage-name").innerText = finalVariant.name;

            const revealWrap = document.getElementById("variant-reveal-wrap");
            document.getElementById("variant-reveal").innerText = "🎁 함께한 친구: " + finalVariant.emoji + " " + finalVariant.name;
            revealWrap.style.display = "block";
            document.getElementById("reset-btn").style.display = "block";

            if (!document.querySelector(".max-badge")) {
                document.getElementById("stage-name").insertAdjacentHTML(
                    "afterend",
                    '<div class="max-badge">🏆 생명존중 대사 달성!</div>'
                );
            }
        }

        checkMissions();

        if (gameStarted) startTicking();
    }

    // 데모판이 한동안 켜지자마자 코인을 999999 로 채웠습니다. 그 값이 저장에
    // 남아 있으면 자동 채우기를 꺼도 계속 무한 상태로 보입니다. 그래서 한 번만
    // 정리하고, 다시는 지우지 않도록 표시를 남깁니다.
    const DEMO_WIPE_KEY = "jeroki-demofill-cleared";

    async function clearDemoInflatedSave() {
        try {
            const done = await window.storage.get(DEMO_WIPE_KEY, false);
            if (done && done.value) return false;

            let inflated = false;
            const cur = await window.storage.get(SAVE_KEY, false);
            if (cur && cur.value) {
                try {
                    const st = JSON.parse(cur.value);
                    // 정상 플레이로는 닿기 어려운 값이면 데모가 채운 것으로 봅니다
                    if ((st.coins || 0) > 50000) inflated = true;
                } catch (e) {}
            }
            if (inflated) await window.storage.delete(SAVE_KEY);
            await window.storage.set(DEMO_WIPE_KEY, "1", false);
            return inflated;
        } catch (e) { return false; }
    }

    (async function loadGame() {
        try {
            const wiped = await clearDemoInflatedSave();
            // [P0] 공용 월드는 병아리 세이브보다 먼저 읽습니다.
            // 동반자 능력이 로딩 직후의 계산에도 이미 반영되도록요.
            await loadWorld();
            const result = await window.storage.get(SAVE_KEY, false);
            if (result && result.value) {
                applyLoadedState(JSON.parse(result.value));
            }
            renderWarmth();
            renderRestore();
            renderCompanions();
            renderQuests();          // [P1] 오늘의 부탁
            bindAllTaps();           // 폰에서 탭이 씹히지 않도록 터치를 직접 받습니다
            renderKeepsakes();       // [P1] 기록 벽
            renderSeasonBanner();    // [P2] 계절
            checkSeasonVisit();      // [P2] 계절 기념패
            if (wiped) {
                setTimeout(function () {
                    try { showEventToast("데모로 채워졌던 자원을 기본값으로 되돌렸어요", "neutral"); } catch (e) {}
                }, 1200);
            }
        } catch (e) {
            // 저장된 데이터가 없으면 그냥 새로 시작
        }
    })();

    // ===================================================================
    // 약 챙겨 먹기 인증
    // 우울증 등으로 약을 꾸준히 챙겨야 하는데, 가족과 멀리 떨어져 있어
    // (제주라는 지역 특성상) 직접 확인해줄 수 없는 상황을 위한 기능.
    // 사진을 "실제로 찍는" 행동 자체가 인증이 되고, 원할 때만 가족에게
    // 공유할 수 있도록 해서 감시가 아닌 안심의 도구가 되도록 설계함.
    // ===================================================================
    const MED_STATE_KEY = "jeroki-med-state";
    const MED_PHOTO_RETENTION_DAYS = 14; // 최근 N일치 사진만 보관 (기기 저장공간 절약)
    const MED_CALENDAR_DAYS = 28;

    let medLog = {};        // { "2026-08-10": { time: "14:32", photo: "data:..." (최근 N일만) } }
    let medRefPhoto = null; // 등록해둔 "내 약" 사진 (data URL)
    let medCameraStream = null;
    let medCameraMode = null; // 'ref' | 'checkin'

    function medDateKeyOffset(offsetDays) {
        const d = new Date();
        d.setDate(d.getDate() + offsetDays);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return y + "-" + m + "-" + day;
    }
    function medTodayKey() { return medDateKeyOffset(0); }

    async function loadMedState() {
        try {
            const result = await window.storage.get(MED_STATE_KEY);
            if (result && result.value) {
                const state = JSON.parse(result.value);
                medLog = state.medLog || {};
                medRefPhoto = state.medRefPhoto || null;
            }
        } catch (e) {}
    }

    async function saveMedState() {
        try {
            await window.storage.set(MED_STATE_KEY, JSON.stringify({ medLog, medRefPhoto }));
        } catch (e) {}
    }

    // 오래된 날짜의 사진 데이터는 지우고 "챙겼다"는 기록만 남겨 저장 용량을 관리
    function trimMedPhotos() {
        const cutoff = medDateKeyOffset(-MED_PHOTO_RETENTION_DAYS);
        Object.keys(medLog).forEach(key => {
            if (key < cutoff && medLog[key] && medLog[key].photo) {
                delete medLog[key].photo;
            }
        });
    }

    function computeMedStreak() {
        let streak = 0;
        let cursor = medLog[medTodayKey()] ? 0 : -1; // 오늘 아직이면 어제부터 셈
        while (medLog[medDateKeyOffset(cursor)]) {
            streak++;
            cursor--;
        }
        return streak;
    }

    function showMedication() {
        document.getElementById('main-view').style.display = 'none';
        const gameView = document.getElementById('game-view');
        if (gameView) gameView.style.display = 'none';
        document.getElementById('medication-view').style.display = 'flex';
        window.scrollTo(0, 0);
        renderMedication();
    }

    function closeMedication() {
        stopMedCameraStream();
        document.getElementById('med-camera-view').style.display = 'none';
        document.getElementById('med-result-view').style.display = 'none';
        document.getElementById('medication-view').style.display = 'none';
        document.getElementById('main-view').style.display = 'flex';
        window.scrollTo(0, 0);
    }

    function renderMedication() {
        const todayEntry = medLog[medTodayKey()];
        const statusCard = document.getElementById('med-status-card');
        const thumb = document.getElementById('med-status-thumb');
        const headline = document.getElementById('med-status-headline');
        const sub = document.getElementById('med-status-sub');
        const primaryBtn = document.getElementById('med-primary-btn');

        if (todayEntry) {
            statusCard.classList.add('done');
            thumb.innerHTML = todayEntry.photo ? '<img src="' + todayEntry.photo + '" alt="">' : '✅';
            headline.innerText = "오늘도 잘 챙겼어요!";
            sub.innerText = todayEntry.time + "에 인증했어요";
            primaryBtn.classList.add('done');
            primaryBtn.innerText = "🔄 사진 다시 찍기";
        } else {
            statusCard.classList.remove('done');
            thumb.innerHTML = '💊';
            headline.innerText = "아직이에요";
            sub.innerText = "지금 챙겨볼까요?";
            primaryBtn.classList.remove('done');
            primaryBtn.innerText = "📸 오늘 약 먹은 사진 찍기";
        }

        const streak = computeMedStreak();
        const badge = document.getElementById('med-streak-badge');
        if (streak > 0) {
            badge.classList.remove('zero');
            badge.innerText = "🔥 " + streak + "일째 챙기고 있어요";
        } else {
            badge.classList.add('zero');
            badge.innerText = "오늘부터 시작해봐요 🌱";
        }

        renderMedCalendar();

        const refThumb = document.getElementById('med-ref-thumb');
        const refSub = document.getElementById('med-ref-sub');
        if (medRefPhoto) {
            refThumb.innerHTML = '<img src="' + medRefPhoto + '" alt="">';
            refSub.innerText = "등록된 사진과 비슷한 구도로 찍을 수 있어요";
        } else {
            refThumb.innerHTML = '🖼️';
            refSub.innerText = "등록해두면 매번 비슷한 구도로 찍을 수 있어요";
        }
    }

    function renderMedCalendar() {
        const cal = document.getElementById('med-calendar');
        if (!cal) return;
        let html = "";
        for (let offset = -(MED_CALENDAR_DAYS - 1); offset <= 0; offset++) {
            const key = medDateKeyOffset(offset);
            const checked = !!medLog[key];
            const isToday = offset === 0;
            const d = new Date();
            d.setDate(d.getDate() + offset);
            let cls = "med-day";
            if (checked) cls += " checked";
            if (isToday) cls += " today";
            html += '<span class="' + cls + '">' + d.getDate() + '</span>';
        }
        cal.innerHTML = html;
    }

    // ===== 촬영 (등록용 / 체크인용 공용) =====
    function startMedRefPhoto() { openMedCamera('ref'); }
    function startMedCheckin() { openMedCamera('checkin'); }

    async function openMedCamera(mode) {
        medCameraMode = mode;
        const title = document.getElementById('med-camera-title');
        const hint = document.getElementById('med-camera-hint');
        const ghost = document.getElementById('med-camera-ghost');
        title.innerText = mode === 'ref' ? "내 약 사진 등록하기" : "오늘 약 먹은 사진 찍기";

        if (mode === 'checkin' && medRefPhoto) {
            ghost.src = medRefPhoto;
            ghost.style.display = 'block';
            hint.innerText = "희미하게 보이는 사진과 비슷한 구도로 찍어보세요";
        } else {
            ghost.style.display = 'none';
            hint.innerText = mode === 'ref' ? "평소 약을 보관하는 모습을 찍어주세요" : "오늘 챙긴 약의 모습을 찍어주세요";
        }

        try {
            medCameraStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" }, audio: false
            });
            const video = document.getElementById('med-camera-video');
            video.srcObject = medCameraStream;
            document.getElementById('med-camera-view').style.display = 'flex';
        } catch (e) {
            // 카메라 권한이 없거나 지원하지 않는 브라우저면 기본 카메라 앱으로 대체
            openMedCameraFallback(mode);
        }
    }

    function stopMedCameraStream() {
        if (medCameraStream) {
            medCameraStream.getTracks().forEach(t => t.stop());
            medCameraStream = null;
        }
    }

    function cancelMedCamera() {
        stopMedCameraStream();
        document.getElementById('med-camera-view').style.display = 'none';
    }

    function captureMedPhoto() {
        const video = document.getElementById('med-camera-video');
        const canvas = document.getElementById('med-canvas');
        const w = video.videoWidth || 480;
        const h = video.videoHeight || 640;
        const targetW = 480;
        const targetH = Math.round(h * (targetW / w));
        canvas.width = targetW;
        canvas.height = targetH;
        canvas.getContext('2d').drawImage(video, 0, 0, targetW, targetH);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        stopMedCameraStream();
        document.getElementById('med-camera-view').style.display = 'none';
        handleCapturedPhoto(medCameraMode, dataUrl);
    }

    // getUserMedia를 쓸 수 없는 환경(권한 거부, 미지원 브라우저 등)의 대체 경로
    function openMedCameraFallback(mode) {
        medCameraMode = mode;
        const input = document.getElementById('med-file-input');
        input.value = "";
        input.onchange = (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                resizeImageDataUrl(reader.result, 480, 0.7, (resized) => {
                    handleCapturedPhoto(mode, resized);
                });
            };
            reader.readAsDataURL(file);
        };
        input.click();
    }

    function resizeImageDataUrl(sourceDataUrl, maxWidth, quality, cb) {
        const img = new Image();
        img.onload = () => {
            const scale = Math.min(1, maxWidth / img.width);
            const canvas = document.getElementById('med-canvas');
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            cb(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = sourceDataUrl;
    }

    async function handleCapturedPhoto(mode, dataUrl) {
        if (mode === 'ref') {
            medRefPhoto = dataUrl;
            await saveMedState();
            renderMedication();
            return;
        }
        const now = new Date();
        const time = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        medLog[medTodayKey()] = { time, photo: dataUrl };
        trimMedPhotos();
        await saveMedState();
        renderMedication();
        showMedResult(dataUrl);
        try { await syncMedMission(); } catch (e) {}
    }

    function showMedResult(dataUrl) {
        document.getElementById('med-result-img').src = dataUrl;
        document.getElementById('med-download-link').style.display = 'none';
        const streak = computeMedStreak();
        document.getElementById('med-result-msg').innerText =
            streak > 1 ? ("🔥 " + streak + "일 연속으로 챙겼어요! 정말 잘하고 있어요") : "오늘도 잘 챙겼어요! 😊";
        document.getElementById('med-result-view').style.display = 'flex';
    }

    function closeMedResult() {
        document.getElementById('med-result-view').style.display = 'none';
    }

    async function shareMedPhoto() {
        const img = document.getElementById('med-result-img');
        try {
            const res = await fetch(img.src);
            const blob = await res.blob();
            const file = new File([blob], 'med-checkin.jpg', { type: 'image/jpeg' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: '약 챙겨 먹었어요',
                    text: '오늘도 약 잘 챙겨 먹었어요 💊'
                });
                return;
            }
            if (navigator.share) {
                await navigator.share({ title: '약 챙겨 먹었어요', text: '오늘도 약 잘 챙겨 먹었어요 💊' });
                return;
            }
        } catch (e) {
            // 공유 도중 취소한 경우 등은 조용히 무시
        }
        // 공유 API를 지원하지 않는 환경: 직접 저장해서 보낼 수 있도록 다운로드 링크 노출
        const link = document.getElementById('med-download-link');
        link.href = img.src;
        link.style.display = 'block';
    }

    loadMedState();

    // ===================================================================
    // 사용자 / 출석 / 오늘의 미션
    // ===================================================================
    const USER_KEY = "jeroki-user";
    const DAILY_KEY = "jeroki-daily";
    const CALL_PENDING_KEY = "jeroki-call-pending";

    let userProfile = null;              // { studentId, name, joinedAt }
    let attendance = {};                 // { "2026-08-10": true }
    let dailyData = {};                  // 날짜별 미션 진행 상황
    // usesMedication: 약을 복용하지 않는 학생은 복약 미션을 목록에서 숨길 수 있습니다.
    // 매일 회색으로 남아 있는 '약 챙겨 먹기'가 안 한 숙제처럼 보이면
    // 필요도 없는 약을 억지로 먹게 만들 수 있어서 아예 빼주는 쪽을 택했습니다.
    // notifyOn/notifyTime: 매일 미션 리마인더. 기본은 꺼짐(opt-in)입니다.
    // 원치 않는 알림은 정신건강 앱에서 특히 역효과가 커서, 학생이 직접 켜고
    // 시간을 고르게 했습니다. 끄는 것도 항상 한 번에 되어야 합니다.
    let dailySettings = {
        callGoalMin: 5, walkGoal: 2000, callName: "", callPhone: "",
        usesMedication: true,
        notifyOn: false, notifyTime: "20:00"
    };

    // 오늘 화면에 실제로 떠 있는 미션들. 복약을 숨기면 둘만 남습니다.
    function activeMissionKeys() {
        return dailySettings.usesMedication ? ["med", "call", "walk"] : ["call", "walk"];
    }

    async function setUsesMedication(on) {
        dailySettings.usesMedication = !!on;
        await saveUserState();
        renderDailyMissions();
        showEventToast(
            on ? "💊 복약 미션을 다시 켰어요" : "복약 미션을 숨겼어요. 언제든 다시 켤 수 있어요",
            "neutral"
        );
    }

    function todayKey() { return medTodayKey(); }

    function blankDay() {
        return {
            med:  { done: false, time: "" },
            call: { done: false, minutes: 0 },
            walk: { done: false, steps: 0 }
        };
    }

    function todayData() {
        const key = todayKey();
        if (!dailyData[key]) dailyData[key] = blankDay();
        return dailyData[key];
    }

    async function loadUserState() {
        try {
            const u = await window.storage.get(USER_KEY);
            if (u && u.value) userProfile = JSON.parse(u.value);
        } catch (e) {}
        try {
            const d = await window.storage.get(DAILY_KEY);
            if (d && d.value) {
                const parsed = JSON.parse(d.value);
                attendance = parsed.attendance || {};
                dailyData = parsed.dailyData || {};
                dailySettings = Object.assign(dailySettings, parsed.dailySettings || {});
            }
        } catch (e) {}
    }

    async function saveUserState() {
        try { await window.storage.set(USER_KEY, JSON.stringify(userProfile)); } catch (e) {}
        try {
            await window.storage.set(DAILY_KEY, JSON.stringify({ attendance, dailyData, dailySettings }));
        } catch (e) {}
    }

    function attendanceStreak() {
        let streak = 0;
        let cursor = attendance[todayKey()] ? 0 : -1;
        while (attendance[medDateKeyOffset(cursor)]) { streak++; cursor--; }
        return streak;
    }

    // ----- 온보딩 -----
    // [P0] 게스트로 바로 시작.
    // 학번·이름 없이도 게임 전부를 할 수 있고, 기록도 이 기기에 남습니다.
    // 나중에 등록하면 그때까지의 진행이 그대로 이어집니다.
    async function startAsGuest() {
        userProfile = { guest: true, name: "", studentId: "", joinedAt: new Date().toISOString() };
        await saveUserState();
        document.getElementById('onboarding-view').classList.remove('show');
        startDailySession();
        setTimeout(function () {
            try { showEventToast("🐣 바로 시작했어요! 학번은 나중에 등록해도 괜찮아요", "neutral"); } catch (e) {}
        }, 900);
    }

    function isGuest() { return !!(userProfile && userProfile.guest); }

    function needsOnboarding() {
        if (userProfile && userProfile.guest) return false;   // 게스트도 통과
        return !userProfile || !userProfile.studentId || !userProfile.name;
    }

    function showOnboarding() {
        const avatar = document.getElementById('onb-avatar');
        const logoImg = document.querySelector('.logo-badge img');
        if (avatar && logoImg && !avatar.querySelector('img')) {
            const clone = document.createElement('img');
            clone.src = logoImg.src;
            clone.alt = "제록이";
            avatar.appendChild(clone);
        }
        document.getElementById('onboarding-view').classList.add('show');
    }

    async function submitOnboarding() {
        const idEl = document.getElementById('onb-student-id');
        const nameEl = document.getElementById('onb-name');
        const errEl = document.getElementById('onb-error');
        const studentId = idEl.value.trim();
        const name = nameEl.value.trim();

        if (!studentId) { errEl.innerText = "학번을 입력해주세요."; idEl.focus(); return; }
        if (!/^\d{4,12}$/.test(studentId)) { errEl.innerText = "학번은 숫자로만 입력해주세요."; idEl.focus(); return; }
        if (!name) { errEl.innerText = "이름을 입력해주세요."; nameEl.focus(); return; }
        errEl.innerText = "";

        // 게스트로 놀다가 등록하는 경우, 가입 시각은 처음 시작한 때로 둡니다
        const joinedAt = (userProfile && userProfile.joinedAt) || new Date().toISOString();
        userProfile = { studentId, name, joinedAt, guest: false };
        await saveUserState();
        document.getElementById('onboarding-view').classList.remove('show');
        startDailySession();
    }

    // ----- 출석 -----
    async function startDailySession() {
        const key = todayKey();
        const firstToday = !attendance[key];
        attendance[key] = true;
        todayData();
        await saveUserState();
        renderHeaderUser();
        renderDailyMissions();
        if (firstToday) {
            const streak = attendanceStreak();
            showEventToast(
                streak > 1
                    ? "🎉 " + streak + "일 연속 출석! 오늘도 와줘서 고마워요"
                    : "🌱 오늘도 만나서 반가워요, " + userProfile.name + "님",
                "good"
            );
        }
    }

    function renderHeaderUser() {
        if (!userProfile) return;
        const box = document.getElementById('header-user');
        // 게스트는 이름이 없으므로 부르는 말을 바꿉니다
        document.getElementById('header-hello').innerText =
            isGuest() ? "안녕하세요" : (userProfile.name + "님");
        const streak = attendanceStreak();
        const badge = document.getElementById('header-streak');
        badge.innerText = streak > 0 ? "출석 " + streak + "일" : "출석 시작";
        box.style.display = 'block';
        renderGuestRow();
    }

    // [P0] 게스트에게만 보이는 등록 안내.
    // 강요하지 않고, 왜 필요한지(출석·미션 기록)만 적어 둡니다.
    function renderGuestRow() {
        const row = document.getElementById('guest-row');
        if (!row) return;
        if (!isGuest()) { row.innerHTML = ""; row.style.display = "none"; return; }
        row.style.display = "block";
        row.innerHTML =
            '<div class="guest-note">' +
                '<div class="gn-text">지금은 <b>바로 시작</b>으로 즐기는 중이에요.<br>' +
                '학번을 등록하면 출석과 미션 기록이 함께 쌓여요.</div>' +
                '<button type="button" class="gn-btn" onclick="openRegister()">학번 등록</button>' +
            '</div>';
    }

    // 게스트가 나중에 등록할 때 온보딩 화면을 다시 띄웁니다.
    // 지금까지의 병아리·코인·섬은 그대로 이어집니다.
    function openRegister() {
        const v = document.getElementById('onboarding-view');
        if (!v) return;
        const err = document.getElementById('onb-error');
        if (err) err.innerText = "";
        const guestBtn = v.querySelector('.onb-guest-btn');
        const or = v.querySelector('.onb-or');
        if (guestBtn) guestBtn.style.display = "none";     // 이미 시작했으므로 감춥니다
        if (or) or.style.display = "none";
        const sub = v.querySelector('.onb-sub');
        if (sub) sub.innerHTML = "지금까지 키운 병아리와 섬은 그대로 이어져요.<br>학번과 이름만 알려주세요.";
        v.classList.add('show');
    }

    // ----- 오늘의 미션 렌더링 -----
    // 오늘의 미션은 "셋 중 하나만" 해내도 달성입니다.
    // 셋 다 채워야 하는 모양이면, 약을 드시지 않는 학생에게 복약 인증이
    // 숙제처럼 남아 억지로 약을 먹게 만들 수 있어서 목표를 1개로 뒀습니다.
    // 더 하는 건 순전히 보너스이고, 하나씩 더할수록 보상이 커집니다.
    const DAILY_MISSION_GOAL = 1;
    const MISSION_COIN_REWARD = 10;   // 목표를 채웠을 때 기본 보상
    const MISSION_BONUS_REWARD = 5;   // 목표를 넘겨 하나 더 할 때마다 얹어주는 보너스


    // ===================================================================
    // [P1] 오늘의 부탁 — 상황형 의뢰
    //
    // 제안서 지적: 미션이 "N번 하세요" 누적이라 할 일 목록처럼 느껴진다는 것.
    // 기존 10단계 누적 미션(checkMissions)은 그대로 두고, 메인에는
    // 하루 3개까지 짧은 의뢰만 보여줍니다.
    //
    // 각 의뢰에는 어디서 하는지(탭), 얼마나 걸리는지, 무엇이 달라지는지를
    // 같이 적었습니다. 그래야 할 일이 아니라 작은 모험이 됩니다.
    // ===================================================================
    const QUEST_POOL = [
        { id: "gift",    icon: "🌸", title: "이웃에게 하나 건네기",
          where: "섬",   mins: 2, warmth: 5,
          desc: "감귤이나 동백이한테 뭐라도 하나 주고 오세요.",
          why:  "주민과 가까워지면 못 듣던 이야기를 들려줘요",
          check: () => questProgress.gift >= 1, goal: 1, get: () => questProgress.gift },
        { id: "harvest", icon: "🌾", title: "밭에서 두 번 거두기",
          where: "농장", mins: 3, warmth: 4,
          desc: "심어둔 걸 거두고 새로 심어두면 좋아요.",
          why:  "복원에 쓸 온기가 쌓여요",
          check: () => questProgress.harvest >= 2, goal: 2, get: () => questProgress.harvest },
        { id: "combo",   icon: "🎣", title: "낚시 콤보 3번 잇기",
          where: "낚시", mins: 2, warmth: 5,
          desc: "존 안에서 연속으로 세 번 당겨보세요.",
          why:  "잘 잡으면 귀한 게 걸려요",
          check: () => questProgress.combo >= 3, goal: 3, get: () => questProgress.combo },
        { id: "care",    icon: "💗", title: "병아리 컨디션 채우기",
          where: "보살피기", mins: 1, warmth: 3,
          desc: "밥 주고 쓰다듬어서 기분을 올려주세요.",
          why:  "잘 돌본 병아리가 나중에 섬 친구가 돼요",
          check: () => questProgress.care >= 3, goal: 3, get: () => questProgress.care },
        { id: "walk",    icon: "🚶", title: "같이 조금 걷기",
          where: "산책", mins: 1, warmth: 3,
          desc: "아무 데나 몇 걸음이면 충분해요.",
          why:  "걷다 보면 뭔가 주울지도 몰라요",
          check: () => questProgress.walk >= 5, goal: 5, get: () => questProgress.walk },
        { id: "mine",    icon: "⛏️", title: "광산 한 번 다녀오기",
          where: "광산", mins: 2, warmth: 4,
          desc: "한 판만 캐고 나와도 돼요.",
          why:  "복원 재료가 모여요",
          check: () => questProgress.mine >= 1, goal: 1, get: () => questProgress.mine }
    ];

    // 힘든 날(빨강)에는 짧고 부담 없는 것만 고릅니다.
    // 제안서 지적대로, 마음 상태가 나쁘다고 할 일이 늘어나면 안 됩니다.
    const GENTLE_QUESTS = ["care", "walk"];

    let questProgress = { gift: 0, harvest: 0, combo: 0, care: 0, walk: 0, mine: 0 };
    let questsToday = [];        // [{id, done}]
    let questDate = "";

    // 날짜가 바뀌면 새로 뽑습니다. 하루 안에서는 계속 같은 의뢰예요.
    function rollDailyQuests() {
        const key = todayKey();
        if (questDate === key && questsToday.length) return;
        questDate = key;
        questProgress = { gift: 0, harvest: 0, combo: 0, care: 0, walk: 0, mine: 0 };

        // 날짜를 씨앗으로 써서, 같은 날 다시 켜도 같은 의뢰가 나오게 합니다
        let seed = 0;
        for (let i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) % 99991;
        const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };

        const gentle = weatherFromSignal && currentWeather !== "clear";
        const pool = gentle
            ? QUEST_POOL.filter(q => GENTLE_QUESTS.indexOf(q.id) >= 0)
            : QUEST_POOL.slice();

        const picked = [];
        const bag = pool.slice();
        const want = gentle ? Math.min(2, bag.length) : 3;
        while (picked.length < want && bag.length) {
            picked.push(bag.splice(Math.floor(rnd() * bag.length), 1)[0].id);
        }
        questsToday = picked.map(id => ({ id, done: false }));
        saveWorld();
    }

    // 게임 곳곳에서 이걸 불러 진행도를 올립니다
    function questTick(kind, n) {
        if (!questsToday.length) return;
        if (questProgress[kind] === undefined) return;
        questProgress[kind] += (n || 1);
        let changed = false;
        questsToday.forEach(q => {
            if (q.done) return;
            const def = QUEST_POOL.find(x => x.id === q.id);
            if (def && def.check()) {
                q.done = true;
                changed = true;
                addWarmth(def.warmth, "'" + def.title + "' 해냈어요");
                showEventToast(def.icon + " 오늘의 부탁을 하나 들어줬어요!\n" + def.why, "good");
            }
        });
        if (changed) { renderQuests(); saveWorld(); }
        else renderQuests();
    }

    function renderQuests() {
        const wrap = document.getElementById("quest-list");
        if (!wrap) return;
        rollDailyQuests();
        const doneN = questsToday.filter(q => q.done).length;
        const cnt = document.getElementById("quest-count");
        if (cnt) cnt.innerText = doneN + " / " + questsToday.length;

        let html = "";
        questsToday.forEach(q => {
            const d = QUEST_POOL.find(x => x.id === q.id);
            if (!d) return;
            const cur = Math.min(d.get(), d.goal);
            const pct = Math.round(cur / d.goal * 100);
            html += '<div class="quest-row' + (q.done ? " done" : "") + '">' +
                '<div class="q-ico">' + d.icon + '</div>' +
                '<div class="q-body">' +
                    '<div class="q-title">' + d.title +
                        (q.done ? ' <span class="q-done">완료</span>' : '') + '</div>' +
                    '<div class="q-desc">' + d.desc + '</div>' +
                    '<div class="q-meta">' +
                        '<span class="q-chip">' + d.where + '</span>' +
                        '<span class="q-chip">약 ' + d.mins + '분</span>' +
                        '<span class="q-chip warm">🔥 ' + d.warmth + '</span>' +
                    '</div>' +
                    '<div class="q-bar"><span style="width:' + pct + '%"></span></div>' +
                    '<div class="q-why">' + d.why + '</div>' +
                '</div></div>';
        });
        wrap.innerHTML = html;
    }

    function renderDailyMissions() {
        const list = document.getElementById('daily-list');
        if (!list) return;
        const d = todayData();

        const now = new Date();
        const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
        document.getElementById('mission-date').innerText =
            (now.getMonth() + 1) + "월 " + now.getDate() + "일 (" + weekdays[now.getDay()] + ")";

        const callGoal = dailySettings.callGoalMin;
        const walkGoal = dailySettings.walkGoal;
        const callMin = Math.floor(d.call.minutes);
        const rows = [
            {
                key: "med", icon: "💊", title: "약 챙겨 먹기",
                done: d.med.done,
                sub: d.med.done ? (d.med.time + "에 사진으로 인증했어요") : "사진으로 오늘 약을 인증해요",
                pct: d.med.done ? 100 : 0,
                btn: d.med.done ? "기록 보기" : "인증",
                action: "showMedication()"
            },
            {
                key: "call", icon: "📞", title: callGoal + "분 이상 통화하기",
                done: d.call.done,
                sub: d.call.done
                    ? ("오늘 " + callMin + "분 통화했어요")
                    : (d.call.minutes > 0
                        ? (callMin + "분 통화 · " + Math.max(1, callGoal - callMin) + "분만 더!")
                        : (dailySettings.callName ? (dailySettings.callName + "님과 목소리 나누기") : "전화할 사람을 등록해보세요")),
                pct: Math.min(100, (d.call.minutes / callGoal) * 100),
                btn: d.call.done ? "완료" : "전화",
                action: "openCallMission()"
            },
            {
                key: "walk", icon: "🚶", title: walkGoal.toLocaleString() + "걸음 걷기",
                done: d.walk.done,
                sub: d.walk.done
                    ? ("오늘 " + d.walk.steps.toLocaleString() + "걸음 걸었어요")
                    : (d.walk.steps > 0
                        ? (d.walk.steps.toLocaleString() + "걸음 · " + (walkGoal - d.walk.steps).toLocaleString() + "걸음 남았어요")
                        : "바깥 공기를 쐬고 와요"),
                pct: Math.min(100, (d.walk.steps / walkGoal) * 100),
                btn: d.walk.done ? "완료" : "걷기",
                action: "startWalkMission()"
            }
        ].filter(r => activeMissionKeys().indexOf(r.key) !== -1);

        let html = "";
        rows.forEach(r => {
            html += '<div class="daily-row' + (r.done ? " done" : "") + '">';
            html += '<span class="daily-ico">' + (r.done ? "✅" : r.icon) + '</span>';
            html += '<div class="daily-body">';
            html += '<div class="daily-title">' + r.title + '</div>';
            html += '<div class="daily-sub">' + r.sub + '</div>';
            if (!r.done && r.pct > 0) {
                html += '<div class="daily-bar-bg"><div class="daily-bar-fill" style="width:' + r.pct + '%"></div></div>';
            }
            html += '</div>';
            html += '<button class="daily-btn' + (r.done ? " done" : "") + '" onclick="' + r.action + '">' + r.btn + '</button>';
            html += '</div>';
        });
        list.innerHTML = html;

        // 목표는 1개까지만 세고, 넘긴 만큼은 "+n" 으로 따로 붙여 보여줍니다.
        // (2 / 1 처럼 목표를 넘긴 숫자가 그대로 찍히면 고장난 것처럼 보여서요)
        const doneCount = rows.filter(r => r.done).length;
        const bonusCount = Math.max(0, doneCount - DAILY_MISSION_GOAL);
        document.getElementById('mission-count').innerText =
            Math.min(doneCount, DAILY_MISSION_GOAL) + " / " + DAILY_MISSION_GOAL +
            (bonusCount > 0 ? "  +" + bonusCount : "");

        const note = document.getElementById('mission-reward-note');
        const howMany = rows.length === 2 ? "둘" : "셋";
        if (doneCount >= rows.length) {
            note.innerText = "🎊 오늘 미션을 모두 해냈어요! 정말 잘하고 있어요.";
        } else if (bonusCount > 0) {
            note.innerText = "보너스까지 챙겼어요 ✨ 하나 더 하면 코인을 더 드려요 🪙";
        } else if (doneCount >= DAILY_MISSION_GOAL) {
            note.innerText = "오늘 목표 달성! 🎉 여유가 되면 하나 더 해보세요. 보너스 코인을 드려요 🪙";
        } else {
            note.innerText = howMany + " 중 하나만 해내도 오늘 목표는 달성이에요. 더 하면 코인을 더 드려요 🪙";
        }

        renderMedOptOutRow();
        renderNotifyRow();
    }

    // ===================================================================
    // 매일 미션 알림
    //
    // 이 앱의 가장 큰 약점은 학생이 앱 여는 걸 잊는다는 것이라, 알림이
    // 사실상 재방문을 만드는 유일한 수단입니다. 다만 재촉하는 말투가 되면
    // 오히려 앱을 지우게 되므로, 문구는 "하나만 해도 충분하다"는
    // 미션 설계(DAILY_MISSION_GOAL = 1)와 같은 톤으로 맞췄습니다.
    //
    // 미래 날짜는 목표를 채울지 미리 알 수 없어서, 앱을 열 때와 미션을
    // 끝냈을 때마다 통째로 다시 예약하는 방식으로 맞춥니다.
    // ===================================================================
    const REMINDER_ID_BASE = 4200;   // 다른 알림 id 와 겹치지 않게
    const REMINDER_DAYS = 7;         // 한 번에 일주일치를 걸어둡니다

    const REMINDER_MESSAGES = [
        { title: "🐣 제록이가 기다려요",     body: "오늘 미션은 하나만 해도 충분해요." },
        { title: "🌤 오늘 하루 어땠어요?",   body: "잠깐 들러서 하나만 챙겨볼까요?" },
        { title: "🐣 병아리가 심심해해요",   body: "미션 하나면 오늘 목표 달성이에요." },
        { title: "💬 하고 싶은 말 있어요?",  body: "제록이가 듣고 있을게요." },
        { title: "🌱 오늘도 한 걸음",        body: "셋 중 하나만 하면 돼요. 부담 갖지 마세요." }
    ];

    function todayGoalMet() {
        const d = todayData();
        return activeMissionKeys().filter(k => d[k] && d[k].done).length >= DAILY_MISSION_GOAL;
    }

    // 예약을 통째로 지우고 다시 겁니다 (웹에서는 아무 일도 하지 않음)
    async function syncReminders() {
        if (!window.nativeNotify) return;

        const allIds = [];
        for (let i = 0; i < REMINDER_DAYS; i++) allIds.push(REMINDER_ID_BASE + i);
        await window.nativeNotify.cancel(allIds);

        if (!dailySettings.notifyOn) return;

        const parts = (dailySettings.notifyTime || "20:00").split(':');
        const hh = parseInt(parts[0], 10) || 0;
        const mm = parseInt(parts[1], 10) || 0;

        const now = new Date();
        const goalMetToday = todayGoalMet();
        const items = [];

        for (let i = 0; i < REMINDER_DAYS; i++) {
            const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, hh, mm, 0, 0);
            if (at <= now) continue;              // 이미 지난 시각
            if (i === 0 && goalMetToday) continue; // 오늘은 이미 다 했으니 조용히
            const msg = REMINDER_MESSAGES[i % REMINDER_MESSAGES.length];
            items.push({ id: REMINDER_ID_BASE + i, title: msg.title, body: msg.body, at: at });
        }
        await window.nativeNotify.schedule(items);
    }

    // 미션 목록 아래의 알림 줄
    function renderNotifyRow() {
        const row = document.getElementById('notify-row');
        if (!row) return;

        // 웹으로 열었을 때는 켤 수가 없으니 솔직하게 알려줍니다
        if (!window.nativeNotify) {
            row.innerHTML = '<span>🔔 알림은 앱으로 설치했을 때 쓸 수 있어요</span>';
            return;
        }
        row.innerHTML = dailySettings.notifyOn
            ? '<span>🔔 매일 ' + dailySettings.notifyTime + ' 알림</span>' +
              '<button class="med-optout-btn" onclick="openNotifySetup()">시간 바꾸기</button>' +
              '<button class="med-optout-btn" onclick="setNotifyOn(false)">끄기</button>'
            : '<span>🔔 미션 알림 받기</span>' +
              '<button class="med-optout-btn" onclick="openNotifySetup()">켜기</button>';
    }

    function openNotifySetup() {
        showCallPanel(
            '<h3>🔔 매일 알림 받기</h3>' +
            '<p>정한 시각에 한 번만 알려드려요.<br>언제든 끌 수 있고, 이미 미션을 끝낸 날은 울리지 않아요.</p>' +
            '<div class="onb-field"><label class="onb-label">알림 받을 시각</label>' +
            '<input class="onb-input" id="notify-time-input" type="time" value="' +
                (dailySettings.notifyTime || "20:00") + '"></div>' +
            '<div class="onb-error" id="notify-setup-error"></div>' +
            '<button class="btn btn-green" onclick="saveNotifySetup()">이 시각에 받기</button>' +
            (dailySettings.notifyOn
                ? '<button class="btn btn-yellow" onclick="setNotifyOn(false)">알림 끄기</button>'
                : '') +
            '<button class="btn btn-yellow" onclick="closeCallPanel()">취소</button>'
        );
    }

    async function saveNotifySetup() {
        const time = document.getElementById('notify-time-input').value;
        const err = document.getElementById('notify-setup-error');
        if (!/^\d{2}:\d{2}$/.test(time || '')) {
            err.innerText = "알림 받을 시각을 골라주세요.";
            return;
        }

        const granted = await window.nativeNotify.requestPermission();
        if (!granted) {
            err.innerText = "휴대폰 설정에서 이 앱의 알림을 켜주셔야 보내드릴 수 있어요.";
            return;
        }

        dailySettings.notifyTime = time;
        dailySettings.notifyOn = true;
        await saveUserState();
        await syncReminders();
        renderNotifyRow();
        closeCallPanel();
        showEventToast("🔔 매일 " + time + "에 알려드릴게요", "good");
    }

    async function setNotifyOn(on) {
        dailySettings.notifyOn = !!on;
        await saveUserState();
        await syncReminders();
        renderNotifyRow();
        closeCallPanel();
        showEventToast(on ? "🔔 알림을 켰어요" : "알림을 껐어요. 언제든 다시 켤 수 있어요", "neutral");
    }

    // 복약 미션을 숨기거나 되돌리는 줄. 눈에 띄지 않게 목록 아래에 조용히 둡니다.
    function renderMedOptOutRow() {
        const row = document.getElementById('med-optout-row');
        if (!row) return;
        row.innerHTML = dailySettings.usesMedication
            ? '<span>약을 복용하지 않으시나요?</span>' +
              '<button class="med-optout-btn" onclick="setUsesMedication(false)">복약 미션 숨기기</button>'
            : '<span>💊 복약 미션을 숨겨두었어요</span>' +
              '<button class="med-optout-btn" onclick="setUsesMedication(true)">다시 보기</button>';
    }

    // 미션 완료 처리 (중복 보상 방지)
    // 목표(1개)를 채우면 기본 보상, 그 뒤로는 하나 더 할 때마다 보너스가 커집니다.
    // 오늘 몇 번째로 끝낸 미션인지에 따라 10 → 15 → 20 코인이 됩니다.
    async function completeMission(key, label) {
        const d = todayData();
        if (d[key].done) return;
        d[key].done = true;
        await saveUserState();

        // 숨긴 복약 미션은 보너스 계산에서도 빼야 코인이 어긋나지 않습니다
        const doneNow = activeMissionKeys().filter(k => d[k] && d[k].done).length;
        const extra = Math.max(0, doneNow - DAILY_MISSION_GOAL);
        const reward = MISSION_COIN_REWARD + MISSION_BONUS_REWARD * extra;

        try {
            coins += reward;
            updateResourceBar();
            saveGame();
        } catch (e) {}
        renderDailyMissions();
        showEventToast(
            (extra > 0 ? "✨ 보너스! " : "🎉 ") + label + " 미션 완료! 🪙+" + reward,
            "good"
        );
        spawnConfetti();

        // 오늘 목표를 채웠으면 오늘 남은 알림은 취소해야 합니다
        syncReminders();
    }

    // 약 인증이 끝나면 미션에도 반영
    async function syncMedMission() {
        const entry = medLog[todayKey()];
        if (!entry) return;
        const d = todayData();
        d.med.time = entry.time;
        if (!d.med.done) {
            await completeMission('med', "약 챙겨 먹기");
        } else {
            await saveUserState();
            renderDailyMissions();
        }
    }

    // ===================================================================
    // 전화 미션
    // 웹페이지는 실제 통화 시간을 읽을 수 없어서, 전화 앱으로 나갔다가
    // 돌아오기까지 걸린 시간을 대신 재는 방식입니다.
    // ===================================================================
    function openCallMission() {
        const d = todayData();
        if (d.call.done) {
            showCallPanel(
                '<h3>오늘 통화 미션 완료 🎉</h3>' +
                '<p>오늘 ' + Math.floor(d.call.minutes) + '분 통화했어요.<br>목소리를 나누는 건 생각보다 큰 힘이 돼요.</p>' +
                '<button class="btn btn-yellow" onclick="closeCallPanel()">닫기</button>'
            );
            return;
        }
        if (!dailySettings.callPhone) { openCallSetup(); return; }

        const remain = Math.max(0, dailySettings.callGoalMin - d.call.minutes);
        showCallPanel(
            '<h3>📞 ' + dailySettings.callName + '님께 전화하기</h3>' +
            '<p>' + (d.call.minutes > 0
                ? ('지금까지 ' + Math.floor(d.call.minutes) + '분 통화했어요.<br>' + Math.ceil(remain) + '분만 더 이야기하면 미션 완료!')
                : ('전화를 걸고 ' + dailySettings.callGoalMin + '분 넘게 이야기하면 미션이 완료돼요.<br>통화가 끝나고 이 화면으로 돌아와주세요.')) + '</p>' +
            '<button class="btn btn-green" onclick="placeCall()">📞 지금 전화 걸기</button>' +
            '<button class="btn btn-yellow" onclick="openCallSetup()">연락처 바꾸기</button>' +
            '<button class="btn btn-yellow" onclick="closeCallPanel()">나중에</button>'
        );
    }

    function openCallSetup() {
        showCallPanel(
            '<h3>누구와 통화할까요?</h3>' +
            '<p>매일 목소리를 나눌 사람을 등록해주세요.<br>번호는 이 기기에만 저장돼요.</p>' +
            '<div class="onb-field"><label class="onb-label">부르는 이름</label>' +
            '<input class="onb-input" id="call-name-input" type="text" maxlength="20" placeholder="예) 엄마" value="' + (dailySettings.callName || '') + '"></div>' +
            '<div class="onb-field"><label class="onb-label">전화번호</label>' +
            '<input class="onb-input" id="call-phone-input" type="tel" inputmode="tel" maxlength="20" placeholder="예) 01012345678" value="' + (dailySettings.callPhone || '') + '"></div>' +
            '<div class="onb-field"><label class="onb-label">하루 목표 통화 시간(분)</label>' +
            '<input class="onb-input" id="call-goal-input" type="number" min="1" max="120" value="' + dailySettings.callGoalMin + '"></div>' +
            '<div class="onb-error" id="call-setup-error"></div>' +
            '<button class="btn btn-green" onclick="saveCallSetup()">저장하기</button>' +
            '<button class="btn btn-yellow" onclick="closeCallPanel()">취소</button>'
        );
    }

    async function saveCallSetup() {
        const name = document.getElementById('call-name-input').value.trim();
        const phone = document.getElementById('call-phone-input').value.replace(/[^0-9+]/g, '');
        const goal = parseInt(document.getElementById('call-goal-input').value, 10);
        const err = document.getElementById('call-setup-error');
        if (!name) { err.innerText = "부르는 이름을 입력해주세요."; return; }
        if (phone.length < 8) { err.innerText = "전화번호를 정확히 입력해주세요."; return; }
        if (!goal || goal < 1) { err.innerText = "목표 시간을 1분 이상으로 정해주세요."; return; }
        dailySettings.callName = name;
        dailySettings.callPhone = phone;
        dailySettings.callGoalMin = goal;
        await saveUserState();
        renderDailyMissions();
        openCallMission();
    }

    function placeCall() {
        localStorage.setItem(CALL_PENDING_KEY, String(Date.now()));
        closeCallPanel();
        window.location.href = 'tel:' + dailySettings.callPhone;
    }

    async function checkPendingCall() {
        const started = localStorage.getItem(CALL_PENDING_KEY);
        if (!started) return;
        const elapsedMin = (Date.now() - Number(started)) / 60000;
        localStorage.removeItem(CALL_PENDING_KEY);
        if (elapsedMin < 0.25) return; // 바로 취소하고 돌아온 경우는 세지 않음

        const d = todayData();
        d.call.minutes += elapsedMin;
        await saveUserState();

        if (!d.call.done && d.call.minutes >= dailySettings.callGoalMin) {
            await completeMission('call', "통화하기");
            showCallPanel(
                '<div class="call-timer">' + Math.floor(d.call.minutes) + '분</div>' +
                '<h3>목소리 잘 나눴어요 💛</h3>' +
                '<p>오늘 통화 미션을 완료했어요.<br>연결되어 있다는 느낌, 오래 남을 거예요.</p>' +
                '<button class="btn btn-green" onclick="closeCallPanel()">고마워요</button>'
            );
        } else {
            renderDailyMissions();
            const remain = Math.ceil(dailySettings.callGoalMin - d.call.minutes);
            showCallPanel(
                '<div class="call-timer">' + Math.floor(d.call.minutes) + '분</div>' +
                '<h3>통화 기록했어요</h3>' +
                '<p>' + (remain > 0 ? (remain + '분만 더 이야기하면 오늘 미션 완료예요.') : '잘하고 있어요!') + '</p>' +
                '<button class="btn btn-yellow" onclick="closeCallPanel()">확인</button>'
            );
        }
    }

    function showCallPanel(html) {
        document.getElementById('call-panel').innerHTML = html;
        document.getElementById('call-modal').classList.add('show');
    }
    function closeCallPanel() {
        document.getElementById('call-modal').classList.remove('show');
    }

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) checkPendingCall();
    });
    window.addEventListener('pageshow', () => { checkPendingCall(); });

    // ===================================================================
    // 걷기 미션 (가속도 센서로 걸음 추정)
    // ===================================================================
    let walkTracking = false;
    let walkSteps = 0;
    let walkPrevMag = 0;
    let walkRising = false;
    let walkLastStepAt = 0;
    let walkWakeLock = null;
    const WALK_PEAK_THRESHOLD = 12.5;   // m/s² (중력 포함)
    const WALK_MIN_STEP_GAP = 260;      // ms

    async function startWalkMission() {
        const d = todayData();
        if (d.walk.done) {
            showEventToast("오늘 걷기 미션은 이미 완료했어요 🚶", "neutral");
            return;
        }
        const hasMotion = typeof DeviceMotionEvent !== 'undefined';
        if (!hasMotion) { walkPhotoFallback(); return; }

        if (typeof DeviceMotionEvent.requestPermission === 'function') {
            try {
                const perm = await DeviceMotionEvent.requestPermission();
                if (perm !== 'granted') { walkPhotoFallback(); return; }
            } catch (e) { walkPhotoFallback(); return; }
        }

        walkSteps = d.walk.steps || 0;
        walkTracking = true;
        walkPrevMag = 0;
        walkRising = false;
        walkLastStepAt = 0;
        window.addEventListener('devicemotion', onWalkMotion);

        document.getElementById('walk-goal-text').innerText = "목표 " + dailySettings.walkGoal.toLocaleString() + "걸음";
        updateWalkUI();
        document.getElementById('walk-tracker-view').style.display = 'flex';
        requestWalkWakeLock();
    }

    async function requestWalkWakeLock() {
        try {
            if ('wakeLock' in navigator) walkWakeLock = await navigator.wakeLock.request('screen');
        } catch (e) {}
    }

    function onWalkMotion(e) {
        if (!walkTracking) return;
        const a = e.accelerationIncludingGravity;
        if (!a || a.x === null) return;
        const mag = Math.sqrt((a.x || 0) * (a.x || 0) + (a.y || 0) * (a.y || 0) + (a.z || 0) * (a.z || 0));
        const now = Date.now();

        if (!walkRising && mag > WALK_PEAK_THRESHOLD && mag > walkPrevMag) walkRising = true;
        if (walkRising && mag < walkPrevMag) {
            walkRising = false;
            if (now - walkLastStepAt > WALK_MIN_STEP_GAP) {
                walkLastStepAt = now;
                walkSteps++;
                updateWalkUI();
                if (walkSteps % 25 === 0) persistWalkSteps();
                if (walkSteps >= dailySettings.walkGoal) finishWalkGoal();
            }
        }
        walkPrevMag = mag;
    }

    function updateWalkUI() {
        const el = document.getElementById('walk-count');
        if (el) el.innerText = walkSteps.toLocaleString();
    }

    async function persistWalkSteps() {
        const d = todayData();
        d.walk.steps = walkSteps;
        await saveUserState();
    }


    async function finishWalkGoal() {
        if (todayData().walk.done) return;
        await persistWalkSteps();
        await completeMission('walk', "걷기");
        document.getElementById('walk-hint-text').innerHTML = "🎉 목표를 채웠어요!<br>이제 마쳐도 좋아요.";
    }

    async function stopWalkTracking() {
        walkTracking = false;
        window.removeEventListener('devicemotion', onWalkMotion);
        try { if (walkWakeLock) { await walkWakeLock.release(); walkWakeLock = null; } } catch (e) {}
        await persistWalkSteps();
        document.getElementById('walk-tracker-view').style.display = 'none';
        renderDailyMissions();
    }

    // 센서를 못 쓰는 기기: 산책 사진으로 인증
    function walkPhotoFallback() {
        showCallPanel(
            '<h3>🚶 산책 인증</h3>' +
            '<p>이 기기에서는 걸음 수를 셀 수 없어요.<br>대신 산책하면서 본 풍경을 한 장 찍어서 인증해요.</p>' +
            '<button class="btn btn-green" onclick="closeCallPanel(); capturePhotoViaInput(onWalkPhotoTaken);">📸 산책 사진 찍기</button>' +
            '<button class="btn btn-yellow" onclick="closeCallPanel()">나중에</button>'
        );
    }

    function capturePhotoViaInput(cb) {
        const input = document.getElementById('med-file-input');
        input.value = "";
        input.onchange = (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => resizeImageDataUrl(reader.result, 480, 0.7, cb);
            reader.readAsDataURL(file);
        };
        input.click();
    }

    async function onWalkPhotoTaken() {
        const d = todayData();
        d.walk.steps = dailySettings.walkGoal;
        await saveUserState();
        await completeMission('walk', "걷기");
    }

    // ===================================================================
    // 제록이 대화
    //
    // 지금은 기기 안에서 도는 규칙 기반 대화입니다. 인터넷 없이 돌고,
    // 말이 기기 밖으로 나가지 않습니다.
    //
    // 생성형 AI 를 붙이려면 docs/AI-CHAT.md 를 보세요. 요약하면,
    //   1) Gemini API 키를 받고 (무료)
    //   2) tools/jerok-worker.js 를 Cloudflare Workers 에 올린 뒤
    //   3) 그 주소를 아래에 적습니다
    // 키를 이 파일에 직접 넣으면 안 됩니다. 파일 하나로 배포되기 때문에
    // 받은 사람 누구나 꺼내 쓸 수 있어요.
    //
    // 위기 신호는 AI 연결 여부와 상관없이 항상 기기에서 먼저 걸러 냅니다.
    // (sendChatMessage 가 AI 를 부르기 전에 확인합니다)
    // ===================================================================
    const JEROK_AI_ENDPOINT = "";

    const CRISIS_WORDS = ["죽고싶", "죽고 싶", "죽을래", "자살", "목숨을 끊", "목숨 끊", "목숨을 버리", "사라지고싶", "사라지고 싶",
        "없어지고싶", "없어지고 싶", "살기싫", "살기 싫", "죽어버리", "자해", "손목을 긋", "손목 긋", "손목을 그었", "손목 그었", "뛰어내리",
        "극단적인 생각", "극단적 선택", "유서", "끝내고싶", "끝내고 싶", "죽는게 낫", "죽는 게 낫", "그만 살고 싶", "그만 살래", "그만 살자",
        "사라져버리", "내가 없어지면", "내가 없는 게", "죽어야겠", "확 죽",
        // 직접적인 말 대신 소진·체념으로 나오는 표현들.
        // 놓치는 쪽이 잘못 잡는 쪽보다 훨씬 위험해서 넓게 잡았습니다.
        // "과제 못 버티겠다"까지 잡히면 곤란해서 앞에 강조가 붙은 형태만 봅니다
        "더 이상 못 버티", "더는 못 버티", "이제 못 버티", "버틸 수 없", "버틸 수가 없",
        "버틸 힘이 없", "버틸 자신이 없", "한계인 것 같", "한계에 왔", "한계에 다다",
        "살아갈 이유가 없", "살 이유가 없", "살아야 할 이유",
        "안 깨어났으면", "안 깨어나고 싶", "내일이 안 왔으면", "영원히 잠들",
        "다 놓고 싶", "다 놓아버리"];

    // 주제별 답변 묶음.
    // replies = 그 주제가 처음 나왔을 때, deep = 같은 주제가 두 번 이상 이어질 때
    // (같은 질문을 또 던지지 않고 한 걸음 더 들어가도록 분리했습니다)
    // {name} 자리에는 사용자 이름이 들어가고, 이름이 없으면 자연스럽게 생략됩니다.
    const CHAT_TOPICS = [
        // ===============================================================
        // 일상 대화
        //
        // 여기 오는 학생이 늘 무거운 얘기만 하지는 않습니다.
        // "오늘 너무 더웠어" 같은 말에 상담을 권하면 이상하죠.
        //
        // 그런데 감정 주제의 키워드가 너무 넓어서 일상 표현을 자꾸
        // 낚아챘습니다 — "습해서 죽겠어"의 '죽겠'이 우울로,
        // "갔다왔어"의 '왔어'가 인사로 잡히는 식이었어요.
        //
        // 그래서 일상 주제에 boost 를 크게 줘서 먼저 잡히게 했습니다.
        // 진짜 힘든 말("힘들어 죽겠어")은 감정 키워드가 둘 이상 걸려서
        // 여전히 감정 주제가 이깁니다.
        // ===============================================================
        { key: "weather", boost: 2,
          words: ["더워", "더웠", "더운", "덥다", "덥네", "무더", "폭염",
                  "추워", "추웠", "추운", "춥다", "춥네", "쌀쌀", "한파",
                  "비 와", "비와", "비온다", "비 온다", "비가", "장마", "소나기",
                  "눈 와", "눈온다", "눈 온다", "눈이 와",
                  "바람", "습해", "습하", "건조", "미세먼지", "날씨", "맑아", "흐려", "흐리",
                  "비 많이", "눈 많이", "온대", "쏟아진다", "쏟아져", "개었", "갰", "그쳤", "그치", "그쳐"],
          replies: [
            "그러게요, 오늘 유난했죠.\n밖에 다니느라 고생했어요.",
            "날씨 하나로 하루 기분이 좌우되기도 하죠.\n오늘은 좀 어땠어요?",
            "제주는 날씨가 하루에도 몇 번씩 바뀌더라고요.",
            "그런 날엔 시원한 데서 좀 쉬어야 해요.\n오늘 잘 챙겼어요?"
          ],
          deep: [
            "이런 날씨엔 몸이 먼저 지치더라고요.\n무리하지 마세요.",
            "밖에 나갔다 왔으면 그것만으로도 오늘 할 일 한 거예요."
          ] },

        { key: "meal", boost: 2,
          words: ["먹었어", "먹었다", "먹고 왔", "점심", "저녁밥", "아침 먹", "야식",
                  "맛있", "맛없", "배불러", "배부르", "배고파", "배고프",
                  "커피", "카페", "편의점", "배달", "치킨", "떡볶이", "라면",
                  "뭐 먹", "뭐먹", "메뉴", "밥 먹었"],
          replies: [
            "잘 챙겨 먹었네요. 그거 생각보다 큰일이에요.",
            "오, 맛있었어요?\n뭐 먹었는지 궁금하네요.",
            "밥 얘기 좋아요. 이런 시시한 얘기가 편하더라고요.",
            "끼니 챙긴 날은 그것만으로도 잘한 거예요."
          ],
          deep: [
            "요즘은 잘 챙겨 먹고 있어요?",
            "혼자 먹는 밥이 심심할 때도 있죠."
          ] },

        { key: "campus", boost: 2,
          words: ["수업 끝", "공강", "강의실", "도서관", "학식", "기숙사 갔",
                  "지하철", "버스", "통학", "등교", "하교", "늦잠", "지각",
                  "학교 왔", "학교 갔", "캠퍼스", "동아리 갔", "조모임 끝"],
          replies: [
            "오늘 하루도 무사히 지나갔네요.",
            "학교 오가는 것만도 은근히 힘들죠.",
            "수고했어요. 이제 좀 쉬어요.",
            "그렇게 하루가 가네요.\n오늘은 어떤 하루였어요?"
          ],
          deep: [
            "매일 오가는 게 당연해 보여도 사실 대단한 거예요.",
            "돌아가면 뭐 할 거예요?"
          ] },

        // 해냈다는 말에 "미루지 말라"는 답이 나가면 안 됩니다
        { key: "done", boost: 3,
          words: ["끝났어", "끝났다", "끝냈어", "끝냈다", "다 했어", "다했어", "다 냈",
                  "제출했", "제출 완료", "붙었어", "합격", "통과했", "해냈",
                  "성공했", "마쳤", "완성했", "제출함"],
          replies: [
            "우와, 해냈네요! 고생 많았어요 🎉",
            "잘했어요. 진짜로요.\n오늘은 좀 쉬어도 돼요.",
            "그거 끝내느라 얼마나 애썼을지 알아요.\n축하해요!",
            "해낸 거 맞아요. 스스로도 그렇게 봐주세요."
          ],
          deep: [
            "끝내고 나면 오히려 허전할 때도 있죠.\n지금 기분은 어때요?",
            "다음 건 다음에 생각해요. 오늘은 쉬어요."
          ] },

        { key: "hobby", boost: 2,
          words: ["드라마", "영화 봤", "영화 보", "유튜브", "노래 들", "음악 들",
                  "게임 했", "게임했", "운동 했", "운동했", "헬스", "러닝", "산책 했", "산책했",
                  "머리 잘랐", "머리했", "옷 샀", "쇼핑", "책 읽", "그림 그"],
          replies: [
            "오 좋네요. 그런 시간이 있어야죠.",
            "재밌었어요?\n뭐가 제일 좋았는지 궁금해요.",
            "그렇게 숨 돌리는 시간이 꼭 필요해요.",
            "좋아하는 걸 할 여유가 있었다니 다행이에요."
          ],
          deep: [
            "요즘 그거 말고 또 재밌는 건 없어요?",
            "그런 게 하나쯤 있으면 하루가 좀 버텨지죠."
          ] },

        // 짧은 리액션 — 대화가 뚝 끊기지 않도록 받아줍니다
        { key: "react", boost: 1.5,
          words: ["헐", "대박", "진짜?", "진짜로", "레알", "실화", "그래서",
                  "그치", "그러게", "그렇구나", "오랜만", "잘 지냈",
                  "그래?", "어떻게 알았", "신기"],
          replies: [
            "그쵸? 저도 그렇게 생각했어요.",
            "네, 계속 얘기해요.\n듣고 있어요.",
            "오랜만이에요. 잘 지냈어요?",
            "음, 그래서 어떻게 됐어요?"
          ],
          deep: [
            "이렇게 편하게 주고받는 것도 좋네요.",
            "더 얘기해도 괜찮아요."
          ] },

        { key: "sad", words: ["우울", "슬퍼", "슬프", "눈물", "울었", "울고", "울음", "괴로", "비참", "서럽", "속상",
            "마음이 아", "힘들", "힘드", "버겁", "죽겠", "못 버티", "못버티", "ㅠㅠ", "ㅜㅜ", "눈물이"],
          replies: [

            "그런 마음이 드는 날엔 하루가 참 길게 느껴지죠.\n지금 그 기분이 언제부터 이어지고 있었어요?",
            "슬픔을 말로 꺼내는 것만으로도 쉽지 않았을 텐데, 이야기해줘서 고마워요.\n오늘 특별히 마음을 무겁게 한 일이 있었나요?",
            "괜찮은 척하지 않아도 돼요. 지금은 그냥 그런 날인 거예요.",
            "가라앉는 기분은 이유가 또렷하지 않을 때가 더 힘들더라고요.\n짚이는 게 있어요, 아니면 그냥 무겁게 내려앉은 느낌이에요?",
            "그 마음을 혼자 들고 계셨겠네요.\n조금 나눠서 들어드릴게요. 어떤 게 제일 무거워요?",
            "울고 싶으면 울어도 괜찮아요. 참는 것도 생각보다 큰 에너지를 쓰는 일이에요.",
            "말로 다 설명 안 되는 기분도 있죠.\n굳이 정리하지 않고 떠오르는 대로 적어도 괜찮아요."
          ],
          deep: [
            "계속 이야기해줘서 고마워요.\n그 기분이 하루 중에 특히 심해지는 시간대가 있나요?",
            "듣다 보니 꽤 오래 혼자 버텨오신 것 같아요.\n주변에 이런 얘기 꺼낼 수 있는 사람이 있어요?",
            "지금 당장 나아지지 않아도 괜찮아요.\n그래도 오늘 하루 버티는 데 아주 조금이라도 도움이 됐던 게 있었어요?",
            "제가 해결해드릴 순 없지만 듣는 건 계속할 수 있어요.\n더 하고 싶은 말 있으면 편하게요.",
            "이런 기분이 2주 넘게 이어지고 있다면, 혼자 견디는 것보다 학교 상담센터에 한 번 기대보는 것도 방법이에요."
          ] },

        { key: "anxious", words: ["불안", "걱정", "초조", "무서", "두렵", "긴장", "떨려", "겁나", "조마조마", "심장이"],
          replies: [
            "머릿속이 시끄러울 때 정말 힘들죠.\n지금 가장 크게 걸리는 게 뭔지 하나만 말해줄 수 있어요?",
            "불안은 아직 일어나지도 않은 일을 미리 겪게 만들죠.\n4초 들이쉬고 4초 내쉬어볼까요? 저도 같이 기다릴게요.",
            "그 걱정이 현실이 될 확률보다, 지금 힘든 마음이 훨씬 확실하네요.\n무엇이 제일 마음에 걸려요?",
            "불안할 땐 몸이 먼저 반응하더라고요. 혹시 지금 어깨나 턱에 힘 들어가 있지 않아요?\n한 번 툭 내려놔 보세요.",
            "머릿속에서 최악의 장면이 자동으로 재생되고 있진 않나요?\n그거, 말로 꺼내놓으면 조금 작아지기도 해요.",
            "당장 답이 안 나오는 걱정이라면 지금 붙잡고 있어도 나아지진 않아요.\n오늘 밤만이라도 잠깐 내려놓을 수 있을까요?"
          ],
          deep: [
            "그 불안이 요즘 계속 따라다니는 것 같네요.\n잠이나 밥 먹는 것에도 영향을 주고 있어요?",
            "걱정이 이 정도 크기면 혼자 감당하기 버거워요.\n상담센터에서 한 번 이야기해보는 건 어때요? 제주대는 학생상담센터가 무료예요.",
            "지금 이 순간만 놓고 보면, 당장 큰일이 벌어지고 있는 건 아니죠?\n일단 그것부터 확인하고 가요.",
            "불안을 없애려고 애쓸수록 더 커지기도 해요.\n없애는 대신 '있는 채로 하루를 보내는' 쪽으로 생각해보면 어때요?"
          ] },

        { key: "lonely", words: ["외로", "쓸쓸", "아무도", "친구가 없", "고립", "소외", "혼자", "말할 사람", "낄 데"],
          replies: [
            "혼자라고 느껴질 때가 제일 시린 것 같아요.\n지금은 제가 여기 있어요. 오늘 하루는 어땠어요?",
            "사람들 사이에 있어도 외로울 때가 있죠.\n마지막으로 누군가와 편하게 이야기한 게 언제였어요?",
            "그 마음 알 것 같아요. 연결되고 싶은데 방법을 모를 때가 있죠.",
            "제주에 혼자 와서 지내는 거라면 더 그럴 수 있어요.\n{name}, 지금 제일 보고 싶은 사람은 누구예요?",
            "외롭다고 말하는 것 자체가 쉽지 않았을 텐데요.\n용기내서 꺼내줘서 고마워요.",
            "오늘 누군가와 한마디라도 나눈 적 있어요?\n없었다면 지금 저랑 나누는 이 대화가 첫 번째네요."
          ],
          deep: [
            "혼자 있는 시간이 길어지면 생각도 같이 무거워지더라고요.\n요즘 하루에 몇 시간 정도 혼자 있어요?",
            "연락하고 싶은데 먼저 하기 어려운 사람 있어요?\n부담 없는 짧은 안부 한 줄이면 충분할 때도 있어요.",
            "오늘의 미션 중에 '통화하기'가 있어요.\n5분이라도 목소리 나누면 생각보다 덜 외롭더라고요."
          ] },

        { key: "tired", words: ["지쳐", "지친", "지쳤", "피곤", "무기력", "귀찮", "힘이 없", "번아웃", "아무것도", "손도 안", "누워만", "의욕", "기운이 없"],
          replies: [
            // 가볍게 "피곤하네" 한 마디에도 상담처럼 들리지 않도록
            // 앞쪽에는 짧고 편한 말을 둡니다. 무거운 이야기는 deep 에 있어요.
            "오늘 고생 많았어요.\n좀 쉬어요.",
            "피곤할 만하죠.\n오늘 뭐 하느라 그렇게 됐어요?",
            "몸도 마음도 방전됐나 봐요.\n그럴 땐 더 하려고 애쓰기보다 잠깐 멈추는 게 나을 수도 있어요.",
            "아무것도 하기 싫은 건 게을러서가 아니라, 이미 너무 많이 버텨왔다는 뜻일 수 있어요.",
            "지친 상태로도 여기까지 온 것만으로 충분해요.\n오늘 딱 하나만 한다면 뭐가 제일 편할까요?",
            "에너지가 0인데 계속 뭘 하라고 하는 것만큼 잔인한 것도 없죠.\n지금은 충전이 먼저예요.",
            "요즘 몸이 무거운 편이에요, 아니면 마음이 더 무거운 편이에요?",
            "'해야 하는데 못 하고 있다'는 생각이 제일 사람을 갉아먹더라고요.\n혹시 지금 그 상태인가요?"
          ],
          deep: [
            "이런 상태가 얼마나 됐어요?\n며칠인지 몇 주인지에 따라 필요한 게 좀 달라져요.",
            "무기력할 땐 큰 목표보다 아주 작은 것 하나가 나아요.\n물 한 잔 마시기, 창문 열기 정도면 충분해요.",
            "쉬어도 회복이 안 되는 느낌이면 그건 피로가 아니라 다른 신호일 수 있어요.\n병원이나 상담을 생각해본 적 있어요?"
          ] },

        { key: "angry", words: ["화나", "화가", "짜증", "분노", "억울", "열받", "빡쳐", "미치겠", "어이없", "기가 막"],
          replies: [
            "그럴 만하니까 화가 났겠죠.\n무슨 일이 있었는지 편하게 쏟아내도 괜찮아요.",
            "억울한 감정은 눌러두면 더 커지더라고요.\n어떤 부분이 제일 부당하게 느껴졌어요?",
            "화가 난다는 건 그만큼 중요한 게 있었다는 뜻이에요.\n무엇이 지켜지지 않았나요?",
            "여기서는 참지 않아도 돼요. 하고 싶은 말 그대로 적어보세요.",
            "그 상황에서 {name}가 잘못한 건 없어 보이는데요.\n조금 더 자세히 들려줄래요?"
          ],
          deep: [
            "화가 가라앉고 나면 보통 어떤 기분이 남아요?\n허탈함일 때가 많더라고요.",
            "그 사람한테 하고 싶었던 말, 여기다 대신 해봐도 괜찮아요.",
            "계속 곱씹게 되는 일이면 마음이 계속 그 자리에 묶여 있는 거예요.\n어떻게 하면 조금 놓을 수 있을까요?"
          ] },

        { key: "selfblame", words: ["내 탓", "내탓", "못난", "쓸모없", "한심", "실패자", "민폐", "짐이", "폐 끼", "자책", "내가 싫", "나 싫", "자신이 싫", "자존감",
            "잘하는 게 없", "왜 이럴까", "나만 못", "부족한 사람", "내가 문제", "나 때문", "나 때문에"],
          replies: [
            "자기를 그렇게까지 몰아세우지 않아도 돼요.\n지금 그 생각, 사실이라기보다 지쳐서 나오는 말일 수 있어요.",
            "다른 사람이 똑같은 상황이었다면 {name}도 그 사람한테 한심하다고 했을까요?\n아마 아닐 거예요.",
            "잘하는 게 없다고 느끼는 건 못해서가 아니라, 스스로를 계속 채점하고 있어서일 때가 많아요.",
            "민폐라고 생각하면서도 여기까지 와서 말을 꺼냈잖아요.\n그건 스스로를 포기하지 않았다는 뜻이에요.",
            "언제부터 그렇게 자기한테 엄격해졌어요?",
            "그 생각이 사실인지 아닌지보다, 그런 생각을 계속 하고 있는 게 얼마나 힘들지가 먼저 보이네요."
          ],
          deep: [
            "자책이 습관이 되면 잘한 일도 안 보이게 돼요.\n최근에 아주 사소하게라도 해낸 일 하나만 떠올려볼래요?",
            "누가 계속 그렇게 말했었나요?\n스스로한테 하는 말인데 남의 목소리 같을 때가 있어요.",
            "이런 생각이 자주 든다면 혼자 이겨내려 하지 않아도 돼요.\n상담에서 다루기 정말 좋은 주제거든요."
          ] },

        { key: "empty", words: ["공허", "허무", "의미없", "의미 없", "아무 느낌", "무감각", "텅 빈", "재미가 없", "흥미가"],
          replies: [
            "아무 느낌도 안 드는 상태가 슬픈 것보다 더 답답할 때가 있어요.",
            "예전엔 좋아했던 것도 시들해졌나요?\n그것도 지쳐 있다는 신호일 수 있어요.",
            "텅 빈 것 같은 기분, 언제부터였는지 기억나요?",
            "의미를 못 찾겠는 건 {name}가 이상해서가 아니라 마음이 지금 절전 모드라서일 수 있어요."
          ],
          deep: [
            "감정이 잘 안 느껴지는 상태가 2주 이상 이어지고 있다면, 한 번쯤 전문가와 이야기해볼 만해요.",
            "예전에 좋아했던 것 중에 지금 가장 손이 덜 가는 게 뭐예요?"
          ] },

        { key: "study", words: ["과제", "시험", "학점", "공부", "발표", "졸업", "수업", "레포트", "리포트", "팀플", "출석", "재수강", "학기"],
          replies: [
            "해야 할 게 쌓이면 숨이 막히죠.\n지금 제일 급한 것 하나만 꼽는다면 뭐예요?",
            "다 잘하려고 하면 시작조차 어려워져요.\n오늘은 딱 15분만 손대볼 만한 게 있을까요?",
            "성적이 {name}의 값어치를 말해주진 않아요.\n요즘 어떤 부분이 가장 부담돼요?",
            "팀플이면 사람 때문에 힘든 건지, 일 때문에 힘든 건지에 따라 좀 다르죠.\n어느 쪽이에요?",
            "밀린 게 많을 땐 목록으로 꺼내놓기만 해도 조금 가벼워져요.\n지금 머릿속에 몇 개나 떠올라요?",
            "시험 기간엔 다들 괜찮은 척하지만 사실 아무도 안 괜찮아요."
          ],
          deep: [
            "완벽하게 못 할 바에 손도 못 대겠는 마음, 혹시 있어요?",
            "이번 학기만 버티면 되는 건가요, 아니면 계속 이런 상태였어요?",
            "감당이 안 되는 수준이면 교수님이나 학과 사무실에 미리 말하는 것도 방법이에요.\n생각보다 조정 가능한 게 있더라고요."
          ] },

        { key: "career", boost: 0.5,
          words: ["취업", "진로", "미래", "졸업하고", "뭐 먹고", "스펙", "자소서", "면접", "인턴", "불투명", "앞날"],
          replies: [
            "앞이 안 보일 때가 제일 막막하죠.\n지금 제일 걱정되는 건 시간이에요, 방향이에요?",
            "남들 다 정해놓은 것 같아 보여도 실제로는 대부분 흔들리면서 가고 있어요.",
            "진로 고민은 답이 하나뿐인 문제가 아니라서 더 어려운 것 같아요.\n요즘 어떤 선택지를 놓고 재고 있어요?",
            "'뭘 하고 싶은지 모르겠다'는 것도 충분히 정직한 답이에요.\n조급해하지 않아도 괜찮아요.",
            "미래가 불안한 건 지금 {name}가 제대로 살아보려고 하고 있다는 뜻이기도 해요."
          ],
          deep: [
            "제주대 취업지원 쪽에서 상담이나 프로그램도 열려요.\n혼자 검색하는 것보다 한 번 물어보는 게 빠를 때가 있어요.",
            "지금 당장 정하지 않아도 되는 결정을 미리 붙잡고 있는 건 아닐까요?",
            "주변과 비교하면서 조급해지는 부분도 있어요?"
          ] },

        { key: "compare", words: ["비교", "남들은", "다들 잘", "나보다", "다들 나보다", "나만", "뒤처", "뒤쳐", "부럽", "부러워", "부러웠", "sns", "인스타", "앞서가", "앞서 가", "다들 앞"],
          replies: [
            "다른 사람의 결과물이랑 내 과정을 비교하면 늘 지는 싸움이 돼요.",
            "SNS에는 다들 좋은 순간만 올리죠.\n그 사람들의 새벽 세 시는 안 보이고요.",
            "뒤처진 것 같은 기분, 정말 사람 지치게 하죠.\n{name}는 어떤 부분에서 그렇게 느껴요?",
            "속도가 다른 거지 방향이 틀린 건 아닐 수 있어요."
          ],
          deep: [
            "비교를 아예 안 할 순 없지만, 비교 대상을 줄일 수는 있어요.\n요즘 SNS 보는 시간은 어느 정도예요?",
            "남들 기준 말고 {name} 기준으로는, 요즘 뭘 하고 있을 때 제일 괜찮아요?"
          ] },

        { key: "relation", words: ["친구", "인간관계", "관계", "사람들이", "왕따", "따돌", "눈치", "오해", "싸웠", "손절", "멀어", "선배", "후배", "동기", "단톡", "카톡", "연락이", "연락 안", "톡 씹", "씹혔", "씹더라", "읽씹", "안읽씹", "룸메", "룸메이트", "같은 방", "조원"],
          replies: [
            "사람 때문에 생기는 마음은 유독 오래가더라고요.\n무슨 일이 있었어요?",
            "관계에서 상처받는 건 그만큼 마음을 줬다는 뜻이기도 해요.",
            "눈치를 많이 보게 되는 관계는 같이 있어도 쉬는 게 아니죠.",
            "그 상황에서 {name}는 어떤 말을 듣고 싶었어요?",
            "가까웠던 사람일수록 멀어질 때 더 아프죠."
          ],
          deep: [
            "그 관계를 회복하고 싶은 마음이에요, 아니면 정리하고 싶은 마음에 가까워요?",
            "혼자 참고 넘어간 적이 많았던 건 아닐까요?",
            "모든 관계를 다 지킬 필요는 없어요.\n{name}를 갉아먹는 관계라면 거리를 두는 것도 선택이에요."
          ] },

        // 짝사랑·썸은 이별과 마음이 전혀 달라서 따로 뒀습니다.
        // 한 묶음이면 "연애하고 싶다"에 이별 위로가 나가버려요.
        { key: "crush", words: ["짝사랑", "썸", "고백할", "고백하고", "연애하고", "연애가 하고",
            "솔로", "모태솔로", "좋아하는 사람", "관심 있는 사람", "마음에 드는 사람"],
          boost: 1,
          replies: [
            "좋아하는 마음이 생기는 것 자체가 기운이 남아 있다는 뜻이에요.",
            "설레는 만큼 조마조마하기도 하죠.\n요즘 그 사람 생각이 자주 나요?",
            "연애하고 싶다는 마음, 외로움이랑 붙어 있을 때도 있어요.\n요즘 사람들이랑은 좀 어때요?",
            "혼자인 시간이 길어지면 조급해지기도 하는데, 그게 부족해서는 아니에요."
          ],
          deep: [
            "고백할지 말지 고민 중이라면, 어느 쪽이 더 오래 후회로 남을 것 같아요?",
            "누군가를 좋아하는 일에 정답은 없더라고요.\n{name} 마음이 편한 쪽이 맞는 방향이에요."
          ] },

        { key: "love", words: ["여자친구", "남자친구", "헤어", "이별", "차였", "전 여친", "전 남친", "환승", "재회"],
          replies: [
            "그 마음 정리하는 데 시간이 필요할 거예요. 서두르지 않아도 돼요.",
            "이별은 사람 하나가 아니라 같이 쌓았던 일상까지 같이 사라지는 거라 더 힘들죠.",
            "괜찮아진 줄 알았다가 갑자기 훅 오는 날도 있어요.\n오늘이 그런 날이었나요?",
            "많이 좋아했나 봐요.\n어떤 부분이 제일 그리워요?"
          ],
          deep: [
            "혼자 있는 시간이 길어지면 더 생각나기도 해요.\n오늘은 잠깐이라도 밖에 나가보는 건 어때요?",
            "그 사람 탓도, {name} 탓도 아닐 수 있어요.\n그냥 안 맞았던 거일 수도 있고요."
          ] },

        { key: "family", words: ["부모님", "엄마", "아빠", "가족", "집에서", "본가", "형", "누나", "언니", "동생", "기대에"],
          replies: [
            "가족 이야기는 꺼내기가 더 어렵죠. 가까운 만큼요.",
            "부모님 기대가 부담이 될 때가 있어요.\n요즘 어떤 이야기가 오갔어요?",
            "가족한테는 오히려 힘들다는 말을 못 하게 되기도 하죠.\n걱정시키기 싫어서요.",
            "{name}는 지금 가족한테 무슨 말을 가장 하고 싶어요?"
          ],
          deep: [
            "말은 안 해도 걱정하고 계실 거예요.\n오늘 미션에 통화하기가 있는데, 짧게라도 목소리 들려드리는 건 어때요?",
            "가족에게 다 말할 필요는 없어요.\n말할 수 있는 만큼만 말해도 괜찮아요."
          ] },

        { key: "alone_living", words: ["자취", "혼자 살", "집이 멀", "타지", "고향", "육지", "기숙사", "월세", "밥 챙겨", "집에 가고 싶", "집 가고 싶", "집이 그리"],
          replies: [
            "혼자 지내면 아플 때나 지칠 때가 특히 서럽죠.",
            "제주에 혼자 와서 지내는 거면 챙겨줄 사람이 없다는 게 제일 크더라고요.\n밥은 잘 챙겨 먹고 있어요?",
            "집이 멀면 힘들 때 훌쩍 갈 수도 없어서 더 답답하죠.",
            "혼자 살면 아무도 안 물어봐 주니까, 오늘은 제가 물어볼게요.\n오늘 하루 어땠어요?"
          ],
          deep: [
            "혼자 있는 공간이 편할 때도 있지만 가라앉을 때도 있죠.\n요즘은 어느 쪽에 가까워요?",
            "가족과 멀리 있어도 연결은 유지할 수 있어요.\n약 인증 사진 보내기나 통화 미션이 그런 용도예요."
          ] },

        { key: "money", words: ["돈이", "생활비", "알바", "등록금", "월급", "가난", "돈 없", "빚", "장학금", "학자금", "차비", "통장"],
          replies: [
            "돈 문제는 마음까지 같이 쪼그라들게 만들죠.",
            "생활비 걱정하면서 공부까지 하는 건 정말 쉽지 않은 일이에요.",
            "알바랑 학업 병행하고 있어요? 그러면 지치는 게 당연해요.",
            "학교에 생활비 지원이나 장학 제도가 있는 경우도 있어요.\n학생복지과에 한 번 문의해본 적 있어요?"
          ] },

        { key: "sleep", words: ["잠이", "잠을", "잠 못", "잠못", "잠들", "잠자", "잠은", "불면", "못자", "못 자",
            "새벽", "밤새", "수면", "일찍 깨", "뒤척"],
          replies: [
            "잠이 안 오는 밤은 생각이 유독 커지죠.\n요즘 몇 시쯤 누워요?",
            "누워서 뒤척이는 시간만큼 지치는 것도 없어요.\n자기 전엔 주로 무슨 생각이 들어요?",
            "잠은 억지로 자려 할수록 더 안 오더라고요.\n오늘은 화면을 조금 일찍 꺼보는 건 어때요?",
            "새벽에 깨면 유난히 생각이 어두워지죠. 그건 {name} 탓이 아니라 시간대 탓이 커요.",
            "몇 시간 정도 자고 있어요?"
          ],
          deep: [
            "잠이 계속 안 오는 게 2주 이상 이어지면 병원에서 도움받을 수 있는 부분이에요.",
            "잠들기 전에 특히 반복되는 생각이 있어요?\n여기다 미리 꺼내놓고 자는 것도 방법이에요."
          ] },

        { key: "appetite", boost: 3, words: ["밥이", "밥맛", "밥 맛", "입맛", "식욕", "굶", "폭식", "먹기 싫", "끼니를", "편의점만", "며칠째 안 먹"],
          replies: [
            "마음이 힘들면 먹는 것부터 무너지더라고요.\n오늘은 뭐라도 먹었어요?",
            "입맛이 없을 땐 잘 챙겨 먹으라는 말이 제일 부담스럽죠.\n간단한 거라도 하나 넣어두면 좋겠어요.",
            "식욕이 변한 건 마음이 보내는 신호일 때가 많아요.\n언제부터 그랬어요?"
          ] },

        { key: "body", words: ["아파", "아픈", "머리가", "속이 안", "속이 울렁", "속쓰", "메스꺼",
            "가슴이 답답", "숨이", "몸이 안", "두통", "체한", "어지러",
            "살이 빠", "살 빠", "살이 쪄", "살쪄", "체중", "몸무게"],
          replies: [
            "마음이 힘들면 몸이 먼저 신호를 보내기도 해요.\n어디가 제일 불편해요?",
            "숨이 답답한 느낌이면 잠깐 천천히 호흡해볼까요? 4초 들이쉬고 4초 내쉬고요.",
            "몸이 아프면 마음도 같이 약해지죠. 병원은 가봤어요?"
          ] },

        { key: "med", words: ["약을", "약은", "약이", "약 먹", "약먹", "약 챙", "약챙", "약 안", "병원", "상담",
            "처방", "치료", "정신과", "정신건강", "복약", "부작용"],
          replies: [
            "약이나 치료 이야기를 꺼내는 것도 용기가 필요했을 텐데요.\n요즘은 잘 챙기고 있어요?",
            "치료를 받는 건 약해서가 아니라 자기를 돌보고 있다는 뜻이에요.",
            "꾸준히 이어가는 게 제일 어렵죠.\n혹시 챙기기 힘들게 만드는 게 있나요?",
            "약 챙기는 걸 자꾸 잊는다면 여기 '오늘의 미션'에 사진 인증 기능이 있어요.\n한 번 써볼래요?",
            "부작용이나 효과에 대한 판단은 저보다 담당 선생님이 훨씬 정확해요.\n다음 진료 때 꼭 얘기해보세요."
          ],
          deep: [
            "상담을 받아볼 생각이 있다면 제주대 학생상담센터는 재학생 무료예요.",
            "약을 끊고 싶은 마음이 들 때도 있죠.\n그건 꼭 혼자 결정하지 말고 선생님과 상의해주세요."
          ] },

        { key: "happy", words: ["좋아", "좋았", "좋은", "기뻐", "기분좋", "행복", "즐거", "신나", "다행",
            "웃었", "웃음", "잘됐", "잘 됐", "설레", "나아졌", "나아진", "괜찮아졌", "재밌", "재미있", "뿌듯", "성공"],
          replies: [
            "그 이야기 들으니 저까지 기분이 좋아지네요!\n어떤 일이 있었는지 더 들려주세요.",
            "좋은 일은 자세히 말할수록 더 오래 남는대요.\n무슨 일이었어요?",
            "그런 순간들이 쌓여서 버틸 힘이 되더라고요.\n오늘 또 좋았던 게 있었어요?",
            "잘됐다니 정말 다행이에요 😊\n{name}가 애쓴 결과일 거예요.",
            "이런 얘기 들려줘서 저도 기뻐요.\n기분 좋은 날은 좀 오래 기억해두면 좋겠어요."
          ],
          deep: [
            "요즘 조금씩 나아지고 있는 것 같아서 저도 좋아요.\n어떤 게 도움이 됐던 것 같아요?",
            "좋은 기분일 때 뭘 하면 더 오래가는지 알아두면 힘들 때 꺼내 쓸 수 있어요."
          ] },

        { key: "greeting", words: ["안녕", "하이", "반가", "잘 있었", "잘 왔", "여보세요", "하잉", "ㅎㅇ"],
          replies: [
            "안녕하세요! 와줘서 반가워요.\n오늘 하루는 어땠어요?",
            "안녕하세요 😊\n{name}, 지금 마음은 어떤 색깔에 가까워요?",
            "반가워요! 오늘은 어떤 이야기를 나눠볼까요?",
            "왔군요. 기다리고 있었어요.\n오늘 컨디션은 어때요?"
          ] },

        { key: "thanks", words: ["고마", "감사", "덕분", "ㄱㅅ"],
          replies: [
            "저야말로 이야기해줘서 고마워요.\n언제든 다시 와도 좋아요.",
            "그렇게 말해주니 저도 힘이 나요 🌱",
            "도움이 됐다니 다행이에요.\n오늘 하루도 버텨줘서 고마워요.",
            "제가 한 건 듣는 것뿐인걸요.\n오늘 하루를 버틴 건 {name} 본인이에요."
          ] },

        { key: "about", words: ["너 누구", "넌 누구", "누구야", "너 뭐야", "넌 뭐야", "너는 뭐", "제록이",
            "네 이름", "이름이 뭐", "이름 뭐", "정체", "ai야", "사람이야", "챗봇", "봇이야"],
          replies: [
            "저는 제록이예요. 제주대학교 학생들 곁에 있으려고 만들어진 친구고요.\n전문 상담사는 아니지만, 이야기는 얼마든지 들어드릴 수 있어요.",
            "제록이라고 해요 🦌\n판단하거나 조언을 밀어붙이지 않고, 그냥 들어주는 역할이에요.",
            "사람은 아니에요. 다만 여기서 하는 이야기는 아무 데도 전해지지 않아요.\n그래서 더 편하게 말해도 괜찮아요.",
            "제주대 학생복지과에서 만든 마음쉼터 친구예요.\n혼자 있는 시간에 말 걸 곳 하나쯤은 있으면 좋으니까요."
          ] },

        { key: "help", words: ["어떡", "어떻게", "모르겠", "방법", "뭘 해야", "어쩌지", "막막"],
          replies: [
            "답을 몰라도 괜찮아요. 지금 상태를 말로 꺼낸 것만으로 한 걸음이에요.\n제일 먼저 덜어내고 싶은 게 뭐예요?",
            "한 번에 다 해결하려 하지 않아도 돼요.\n오늘 하루만 놓고 보면 뭐가 제일 무거워요?",
            "막막할 땐 문제를 잘게 쪼개는 게 도움이 되더라고요.\n지금 얹혀 있는 것들 하나씩 말해볼래요?",
            "정답을 찾는 것보다, 지금 견딜 수 있는 방법을 찾는 게 먼저일 수도 있어요."
          ] },

        { key: "listen", words: ["들어줘", "그냥 들어", "말만", "얘기만", "조언 말고", "위로"],
          replies: [
            "네, 그냥 들을게요. 편하게 다 꺼내놔도 괜찮아요.",
            "조언 안 할게요. 하고 싶은 말 다 하세요.",
            "듣고 있어요. 천천히요."
          ] },

        { key: "refuse", words: ["몰라", "그냥", "됐어", "말하기 싫", "귀찮아", "아무말", "노잼", "관심없"],
          replies: [
            "말하기 싫으면 안 해도 괜찮아요. 그냥 여기 있어도 돼요.",
            "네, 안 물어볼게요.\n그래도 나중에 하고 싶어지면 언제든 와요.",
            "말로 정리가 안 될 때도 있죠. 그럴 땐 그냥 있어도 괜찮아요.",
            "지금은 말할 기운이 없는 걸 수도 있어요. 그래도 여기 온 건 잘한 거예요."
          ] },

        { key: "short", words: ["ㅇㅇ", "응", "네", "ㅇㅋ", "그래", "음", "ㅎㅎ", "ㅋㅋ", "..."],
          replies: [
            "혹시 더 하고 싶은 말 있어요? 짧게라도 괜찮아요.",
            "지금 기분을 한 단어로 표현한다면 뭐에 가까워요?",
            "오늘 하루 중에 제일 기억에 남는 순간은 뭐였어요?",
            "말이 잘 안 나올 때도 있죠. 천천히 해도 괜찮아요."
          ] },

        { key: "curse", words: ["씨발", "ㅅㅂ", "존나", "미친", "개같", "좆", "ㅈㄴ", "닥쳐"],
          replies: [
            "많이 답답했나 봐요. 여기서는 그렇게 말해도 괜찮아요.",
            "화가 많이 났네요. 무슨 일인지 들려줄래요?",
            "욕이라도 해야 숨이 쉬어질 때가 있죠. 계속 쏟아내도 돼요."
          ] },

        { key: "app", boost: 0.5,
          words: ["미션", "출석", "코인", "이 앱", "어플", "기능", "어떻게 쓰", "여기서 뭘", "비밀 보장"],
          replies: [
            "여기서는 세 가지를 할 수 있어요.\n오늘의 미션(약·통화·걷기), 병아리 키우기, 그리고 저랑 대화하기요.",
            "미션을 하나 깰 때마다 병아리 키우기에서 쓸 코인을 드려요.\n부담 갖지 말고 할 수 있는 것만 해도 괜찮아요.",
            "출석은 들어오기만 해도 자동으로 기록돼요.\n매일 오는 게 목표가 되면 그것도 부담이니, 오고 싶을 때 와요."
          ] },

        // 휴학·자퇴는 그냥 학업 고민으로 넘기면 안 되는 신호라 boost 를 줘서
        // study 보다 먼저 잡히게 합니다. 말리지도 부추기지도 않고,
        // 혼자 정하지 않도록 실제로 물어볼 곳을 알려주는 쪽으로 씁니다.
        { key: "leave", boost: 0.8,
          words: ["휴학", "자퇴", "그만둘까", "그만두고 싶", "학교 그만", "때려치", "때려칠",
            "학교 안 가", "학교 가기 싫", "중퇴", "전과", "반수", "수능 다시"],
          replies: [
            "그 생각이 들 만큼 버거우셨나 봐요.\n언제부터 그런 마음이 들었어요?",
            "휴학이든 계속 다니든, 둘 다 선택지예요.\n도망이라고 생각 안 하셔도 돼요.",
            "지쳐서 쉬고 싶은 건지, 이 길이 안 맞는 것 같은 건지\n어느 쪽에 더 가까워요?",
            "당장 결정 안 하셔도 괜찮아요.\n지금은 그런 마음이 든다는 것만 알아두면 돼요."
          ],
          deep: [
            "혼자 정하기엔 큰 결정이라, 한 번쯤 같이 얘기해볼 사람이 있으면 좋아요.\n제주대 학생상담센터는 무료예요.",
            "학사 제도는 생각보다 선택지가 많아요.\n휴학, 계절학기, 학점 포기… 학과 사무실에서 물어볼 수 있어요.",
            "쉬는 게 늦어지는 게 아니라\n계속 버티다 무너지는 게 더 오래 걸려요.",
            "지금 제일 그만두고 싶은 건 학교예요, 아니면 지금의 이 상태예요?"
          ] },

        // 무거운 얘기만 받으면 말 걸기가 부담스러워집니다.
        // 가벼운 잡담도 받아줘야 편하게 들르는 곳이 됩니다.
        { key: "smalltalk",
          words: ["날씨", "덥다", "춥다", "비 와", "비온다", "눈 와", "바람",
            "심심", "뭐 먹", "점심", "저녁", "메뉴", "배고파", "뭐해", "뭐하고", "뭐하니",
            "바다", "제주", "한라산", "산책 갈", "노래", "영화", "게임하고"],
          replies: [
            "그런 얘기 좋아요.\n무거운 얘기만 할 필요 없잖아요.",
            "저도 궁금하네요. 오늘은 어땠어요?",
            "제주는 날씨가 하루에도 몇 번씩 바뀌죠.\n오늘은 어때요?",
            "가끔은 아무 얘기나 하는 게 제일 쉬어져요.",
            "바다 보러 가는 거 좋죠.\n걷다 보면 생각이 좀 정리되더라고요."
          ],
          deep: [
            "이렇게 시시한 얘기 하는 것도 괜찮네요.",
            "요즘 소소하게 즐거운 건 뭐가 있어요?",
            "그런 것 하나쯤 있으면 하루가 좀 버텨져요."
          ] },

        { key: "bye",
          words: ["잘 있어", "잘있어", "안녕히", "나중에 봐", "이만", "갈게", "가볼게",
            "그만할래", "끝낼래", "다음에 봐", "바이", "잘가", "잘 가", "들어갈게", "자러 갈"],
          replies: [
            "네, 오늘 이야기해줘서 고마웠어요.\n또 오세요 🦌",
            "잘 가요. 여기는 늘 열려 있어요.",
            "오늘 하루도 잘 버텨내시길 바랄게요.",
            "언제든 다시 와요. 기다리고 있을게요."
          ] },

        { key: "mission_done", boost: 0.6,
          words: ["약 먹었", "약먹었", "약 챙겼", "산책", "걸었", "통화했", "전화했", "미션 했", "인증했", "다 했어"],
          replies: [
            "잘했어요! 그거 생각보다 쉽지 않은 일이에요.",
            "오늘 하나 해냈네요 👏\n작아 보여도 쌓이면 분명 달라져요.",
            "챙겼다니 다행이에요.\n오늘 컨디션은 좀 어때요?",
            "{name}, 오늘 잘 지켜줘서 고마워요. 병아리도 좋아할 거예요 🐣"
          ] },

        { key: "game", boost: 0.5,
          words: ["병아리", "키우기", "게임", "농장", "낚시", "광산", "도감"],
          replies: [
            "병아리는 잘 크고 있어요?\n어떻게 보살피느냐에 따라 다른 친구가 태어나요.",
            "먹이주기·쓰다듬기·재우기 중에 뭘 제일 많이 했는지에 따라 최종 모습이 달라져요.\n어떤 친구가 나올지 궁금하네요.",
            "게임이 심심할 때 잠깐 딴생각 돌리는 데 도움이 되면 좋겠어요."
          ] }
    ];

    // 주제를 못 잡았을 때 쓰는 답변. 되묻기만 반복하지 않도록 종류를 섞었습니다.
    const CHAT_DEFAULTS = [
        "그랬군요. 조금 더 자세히 들려줄 수 있어요?",
        "듣고 있어요. 그때 마음은 어땠어요?",
        "말해줘서 고마워요.\n그 일이 지금도 마음에 남아 있나요?",
        "음... 제가 잘 이해했는지 모르겠어요.\n조금만 더 이야기해줄래요?",
        "그런 일이 있었군요.\n그 상황에서 제일 힘들었던 건 뭐였어요?",
        "네, 계속 들을게요.",
        "혼자 담아두기 무거웠겠어요.",
        "그 얘기를 하면서 지금 어떤 기분이 들어요?",
        "생각보다 많은 일이 있었네요.\n어떤 부분부터 풀어놓고 싶어요?",
        "그렇게 느낄 만해요.\n그때 옆에 누가 있어줬으면 좋았을 텐데요.",
        "천천히 말해도 괜찮아요. 시간은 충분해요.",
        "지금 이야기 중에 제일 마음에 걸리는 게 뭐예요?"
    ];

    const CHAT_QUICK_DEFAULT = ["오늘 좀 힘들었어", "그냥 무기력해", "잠이 안 와", "괜찮아진 것 같아", "그냥 들어줘"];

    let chatStarted = false;
    let chatLastTopic = null;
    const chatRecentIdx = {};   // 답변 묶음별로 최근에 쓴 인덱스 (반복 방지)
    const chatTopicCount = {};  // 주제별 등장 횟수 (같은 주제면 더 깊이 들어감)

    function detectCrisis(text) {
        const t = text.replace(/\s/g, '');
        return CRISIS_WORDS.some(w => t.includes(w.replace(/\s/g, '')));
    }

    // {name} 자리에 사용자 이름을 넣습니다.
    // 이름은 "OOO님"이라 항상 받침으로 끝나므로 뒤따르는 조사를 은/이/을 형태로 맞춰주고,
    // 이름을 모를 때는 이름과 조사를 함께 지워 문장이 어색해지지 않게 합니다.
    function personalizeReply(text) {
        if (text.indexOf("{name}") < 0) return text;
        const name = (userProfile && userProfile.name) ? userProfile.name + "님" : null;
        if (!name) return text.replace(/\{name\}(은|는|이|가|을|를|의|도)?,?\s*/g, "");
        return text.replace(/\{name\}(은|는|이|가|을|를)?/g, function (m, particle) {
            if (particle === "는") return name + "은";
            if (particle === "가") return name + "이";
            if (particle === "를") return name + "을";
            return name + (particle || "");
        });
    }

    // 최근에 쓴 답변을 기억해서 같은 말이 금방 다시 나오지 않게 합니다
    function pickFrom(list, bankKey) {
        if (!list || !list.length) return CHAT_DEFAULTS[0];
        if (!chatRecentIdx[bankKey]) chatRecentIdx[bankKey] = [];
        const recent = chatRecentIdx[bankKey];
        let candidates = [];
        for (let i = 0; i < list.length; i++) {
            if (recent.indexOf(i) < 0) candidates.push(i);
        }
        if (!candidates.length) {          // 다 썼으면 기억을 비우고 다시 시작
            recent.length = 0;
            for (let i = 0; i < list.length; i++) candidates.push(i);
        }
        const idx = candidates[Math.floor(Math.random() * candidates.length)];
        recent.push(idx);
        // 목록의 3분의 2 정도는 기억해 둬서 짧은 주기의 반복을 막습니다
        const keep = Math.max(1, Math.floor(list.length * 0.66));
        while (recent.length > keep) recent.shift();
        return list[idx];
    }

    function pickReply(topic) {
        if (!topic) return personalizeReply(pickFrom(CHAT_DEFAULTS, "_default"));
        const count = chatTopicCount[topic.key] || 0;
        // 같은 주제가 두 번 이상 이어지면 같은 질문을 반복하지 않고 한 걸음 더 들어갑니다
        const useDeep = count >= 2 && topic.deep && topic.deep.length;
        const list = useDeep ? topic.deep : topic.replies;
        return personalizeReply(pickFrom(list, topic.key + (useDeep ? ":deep" : "")));
    }

    // "안 좋아", "재미없어"처럼 뒤집힌 표현이 긍정으로 잡히지 않도록 거르는 장치
    const NEGATION_PATTERNS = ["안좋", "안 좋", "좋지않", "좋지 않", "안괜찮", "안 괜찮",
        "재미없", "재밌지않", "행복하지않", "행복하지 않", "즐겁지않", "즐겁지 않", "안기뻐", "웃지도"];

    // "응", "ㅇㅇ"처럼 아주 짧은 대답은 메시지 전체가 그 말일 때만 인식합니다
    const SHORT_REPLIES = ["ㅇㅇ", "ㅇ", "응", "어", "네", "넵", "ㅇㅋ", "오케이", "그래", "음",
        "ㅎㅎ", "ㅋㅋ", "ㅋ", "ㅎ", "...", "..", ".", "글쎄", "아니", "ㄴㄴ"];

    function ruleBasedReply(text) {
        const t = text.toLowerCase();
        // "ㅋㅋㅋㅋ", "ㅎㅎㅎ", "ㅠㅠㅠ"처럼 늘여 쓴 말은 두 글자로 줄여서 봅니다.
        // 안 그러면 웃는 말에 무거운 답이 나가요.
        const bare = t.replace(/[\s!?~,]/g, '').replace(/([ㅋㅎㅠㅜㅡ.])\1{1,}/g, '$1$1');

        // 1) 아주 짧은 단답
        if (SHORT_REPLIES.indexOf(bare) >= 0) {
            const shortTopic = CHAT_TOPICS.find(x => x.key === "short");
            chatLastTopic = "short";
            chatTopicCount.short = (chatTopicCount.short || 0) + 1;
            return pickReply(shortTopic);
        }

        // 2) 키워드 점수로 주제 판별
        const negated = NEGATION_PATTERNS.some(p => t.includes(p));
        let best = null;
        let bestScore = 0;
        CHAT_TOPICS.forEach(topic => {
            if (topic.key === "short") return;                 // 단답은 위에서만 처리
            if (negated && topic.key === "happy") return;      // 뒤집힌 문장은 긍정으로 보지 않음
            let score = 0;
            topic.words.forEach(w => { if (t.includes(w)) score++; });
            // 구체적인 주제(취업·미션·게임 등)는 일반 감정 주제보다 우선하도록 가중치를 줍니다
            if (score > 0) score += (topic.boost || 0);
            if (score > bestScore) { bestScore = score; best = topic; }
        });

        // 3) 부정 표현만 있고 다른 단서가 없으면 우울 쪽으로 받아줌
        if (!best && negated) best = CHAT_TOPICS.find(x => x.key === "sad");

        chatLastTopic = best ? best.key : null;
        if (best) chatTopicCount[best.key] = (chatTopicCount[best.key] || 0) + 1;
        return pickReply(best);
    }

    // 대화 흐름이 이어지도록 최근 몇 마디를 들고 다닙니다.
    // 기기 밖으로 나가는 건 이 대화 내용뿐이고, 학번·이름은 보내지 않습니다.
    let chatHistory = [];
    const CHAT_HISTORY_MAX = 6;

    function pushHistory(who, text) {
        chatHistory.push({ who: who, text: String(text).slice(0, 400) });
        if (chatHistory.length > CHAT_HISTORY_MAX) chatHistory = chatHistory.slice(-CHAT_HISTORY_MAX);
    }

    // AI 가 연달아 실패하면 잠시 쉬었다 다시 시도합니다.
    // 안 그러면 인터넷이 끊겼을 때 매번 8초씩 기다리게 돼요.
    let aiFailStreak = 0;
    let aiPausedUntil = 0;

    // 실제 AI를 붙이면 여기로 흘러갑니다. 실패하면 규칙 기반으로 자연스럽게 돌아가요.
    //
    // ★ 안전 원칙
    //   1) 위기 표현은 여기까지 오지 않습니다. sendChatMessage 가 먼저 걸러
    //      109 안내를 띄우고 끝냅니다.
    //   2) 그래도 AI 가 돌려준 말에 위험한 표현이 섞이면 버리고
    //      직접 만든 답으로 돌아갑니다.
    //   3) 느리거나 실패하면 기다리지 않고 규칙 기반으로 넘어갑니다.
    async function askJerok(text) {
        const canTry = JEROK_AI_ENDPOINT && Date.now() > aiPausedUntil;
        if (canTry) {
            try {
                // 오래 붙들고 있으면 대화가 끊긴 것처럼 보여서 7초에서 끊습니다
                const ctrl = new AbortController();
                const timer = setTimeout(() => ctrl.abort(), 7000);
                const res = await fetch(JEROK_AI_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    signal: ctrl.signal,
                    // 이름·학번은 보내지 않습니다. 대화 내용만 갑니다.
                    body: JSON.stringify({ message: text, history: chatHistory })
                });
                clearTimeout(timer);
                if (res.ok) {
                    const data = await res.json();
                    const reply = data && data.reply;
                    // 돌려받은 말도 한 번 더 봅니다
                    if (reply && !detectCrisis(reply)) {
                        aiFailStreak = 0;
                        return reply;
                    }
                }
                aiFailStreak++;
            } catch (e) {
                aiFailStreak++;
            }
            // 세 번 내리 실패하면 2분 쉽니다
            if (aiFailStreak >= 3) {
                aiPausedUntil = Date.now() + 120000;
                aiFailStreak = 0;
            }
        }
        return ruleBasedReply(text);
    }

    function showChat() {
        document.getElementById('main-view').style.display = 'none';
        const g = document.getElementById('game-view'); if (g) g.style.display = 'none';
        const m = document.getElementById('medication-view'); if (m) m.style.display = 'none';
        document.getElementById('chat-view').style.display = 'flex';
        window.scrollTo(0, 0);

        const avatar = document.getElementById('chat-avatar');
        const logoImg = document.querySelector('.logo-badge img');
        if (avatar && logoImg && !avatar.querySelector('img')) {
            const clone = document.createElement('img');
            clone.src = logoImg.src;
            clone.alt = "제록이";
            avatar.appendChild(clone);
        }

        if (!chatStarted) {
            chatStarted = true;
            const name = userProfile ? userProfile.name : "";
            addChatMessage('bot',
                (name ? (name + "님, ") : "") + "안녕하세요. 저는 제록이예요 🦌\n오늘 마음은 어떤가요? 편하게 적어주세요.");
            renderQuickReplies(CHAT_QUICK_DEFAULT);
        }
        setTimeout(() => document.getElementById('chat-input').focus(), 120);
    }

    function closeChat() {
        document.getElementById('chat-view').style.display = 'none';
        document.getElementById('main-view').style.display = 'flex';
        window.scrollTo(0, 0);
        // 나가면 대화 기록을 비웁니다. 다음 사람이 열어도 앞 대화가 안 남고,
        // AI 로도 지난 이야기가 다시 넘어가지 않습니다.
        chatHistory = [];
    }

    function addChatMessage(who, text) {
        const log = document.getElementById('chat-log');
        const wrap = document.createElement('div');
        wrap.className = 'chat-msg ' + who;
        if (who === 'bot') {
            const av = document.createElement('span');
            av.className = 'chat-mini-avatar';
            const logoImg = document.querySelector('.logo-badge img');
            if (logoImg) {
                const im = document.createElement('img');
                im.src = logoImg.src;
                im.alt = "";
                av.appendChild(im);
            }
            wrap.appendChild(av);
        }
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble';
        bubble.innerText = text;
        wrap.appendChild(bubble);
        log.appendChild(wrap);
        log.scrollTop = log.scrollHeight;
    }

    function addCrisisCard() {
        const log = document.getElementById('chat-log');
        const card = document.createElement('div');
        card.className = 'chat-crisis-card';
        card.innerHTML =
            '<h4>지금 많이 힘들어 보여요</h4>' +
            '<p>혼자 견디지 않아도 괜찮아요. 지금 바로 이야기 나눌 수 있는 곳이 있어요.<br>제록이보다 훨씬 잘 도와줄 수 있는 사람들이에요.</p>' +
            '<a href="tel:109" data-emergency="suicide">📞 109 자살예방 상담전화 (24시간)</a>' +
            '<a href="tel:1393" data-emergency="counsel" class="secondary">📞 1393 자살예방상담</a>' +
            '<a href="tel:119" data-emergency="fire" class="secondary">🚑 119 응급</a>';
        applyEmergencyNumbers(card);
        log.appendChild(card);
        log.scrollTop = log.scrollHeight;
    }

    function showTyping() {
        const log = document.getElementById('chat-log');
        const wrap = document.createElement('div');
        wrap.className = 'chat-msg bot';
        wrap.id = 'chat-typing-indicator';
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble chat-typing';
        bubble.innerHTML = '<span></span><span></span><span></span>';
        wrap.appendChild(bubble);
        log.appendChild(wrap);
        log.scrollTop = log.scrollHeight;
    }
    function hideTyping() {
        const el = document.getElementById('chat-typing-indicator');
        if (el) el.remove();
    }

    function renderQuickReplies(list) {
        const row = document.getElementById('chat-quick-row');
        row.innerHTML = list.map(t =>
            '<button class="chat-quick-btn" onclick="quickReply(this)">' + t + '</button>'
        ).join('');
    }

    function quickReply(btn) {
        document.getElementById('chat-input').value = btn.innerText;
        sendChatMessage();
    }

    async function sendChatMessage() {
        const input = document.getElementById('chat-input');
        const text = input.value.trim();
        if (!text) return;
        input.value = "";
        addChatMessage('me', text);
        pushHistory('me', text);

        const isCrisis = detectCrisis(text);
        showTyping();

        const delay = isCrisis ? 500 : (700 + Math.random() * 600);
        setTimeout(async () => {
            hideTyping();
            if (isCrisis) {
                addChatMessage('bot',
                    "지금 그런 생각이 들 만큼 많이 아팠군요.\n그 말을 꺼내줘서 정말 다행이에요.\n제가 옆에 있을게요. 그런데 지금은 저보다 더 든든한 사람들과 이야기했으면 좋겠어요.");
                addCrisisCard();
                renderQuickReplies(["조금 진정됐어", "그냥 들어줘", "무슨 일이 있었냐면"]);
                return;
            }
            const reply = await askJerok(text);
            addChatMessage('bot', reply);
            pushHistory('bot', reply);
            renderQuickReplies(nextQuickReplies());
        }, delay);
    }

    // 방금 나온 주제에 맞춰 다음에 누르기 쉬운 말들을 제안합니다
    const CHAT_QUICKS = {
        sad:        ["그냥 들어줘", "요즘 계속 그래", "이유를 모르겠어", "조금 나아진 것 같아"],
        anxious:    ["같이 숨 쉬어줘", "내일이 걱정돼", "자꾸 최악만 상상해", "괜찮아지고 싶어"],
        lonely:     ["말할 사람이 없어", "혼자 지낸 지 오래됐어", "그냥 들어줘", "고마워"],
        tired:      ["잠을 잘 못 자", "쉬고 싶어", "그래도 해야 해", "몇 주째 이래"],
        angry:      ["더 쏟아내도 돼?", "억울해", "이제 좀 괜찮아졌어"],
        selfblame:  ["내가 문제인 것 같아", "다들 나보다 잘해", "그렇게 말해줘서 고마워"],
        empty:      ["아무 느낌이 없어", "예전엔 좋아했는데", "언제부터였는지 모르겠어"],
        study:      ["과제가 너무 많아", "다 못할 것 같아", "시작을 못 하겠어", "잠깐 쉴래"],
        career:     ["뭘 하고 싶은지 모르겠어", "남들보다 늦은 것 같아", "취업이 무서워"],
        compare:    ["다들 잘 나가 보여", "SNS 보면 우울해", "나만 제자리야"],
        relation:   ["친구랑 멀어졌어", "눈치를 많이 봐", "정리하는 게 맞을까"],
        love:       ["아직 생각나", "괜찮은 줄 알았는데", "그냥 들어줘"],
        family:     ["부모님한테 말 못 해", "기대가 부담돼", "걱정시키기 싫어"],
        alone_living: ["밥 챙겨먹기 힘들어", "집이 너무 멀어", "아플 때 서러워"],
        money:      ["생활비가 빠듯해", "알바랑 병행 중이야", "지원 제도가 있어?"],
        sleep:      ["새벽까지 못 자", "자려고 하면 생각나", "몇 주째 이래"],
        appetite:   ["입맛이 없어", "먹는 걸 자꾸 걸러", "챙겨 먹어볼게"],
        body:       ["가슴이 답답해", "머리가 아파", "병원 가봐야 하나"],
        med:        ["오늘 약 챙겼어", "자꾸 까먹어", "병원 가기 싫어", "상담은 어떻게 받아?"],
        happy:      ["더 얘기할래", "오늘 진짜 좋았어", "요즘 좀 나아졌어", "고마워"],
        listen:     ["사실은 있잖아", "말이 잘 안 나와", "고마워"],
        refuse:     ["그냥 있을래", "나중에 말할게", "사실은 있잖아"],
        short:      ["오늘 좀 힘들었어", "그냥 그래", "할 말이 없어"],
        curse:      ["진짜 화나", "무슨 일이었냐면", "이제 좀 풀렸어"],
        about:      ["여기서 뭘 할 수 있어?", "비밀 보장 돼?", "오늘 좀 힘들었어"],
        help:       ["뭐부터 해야 할까", "다 무겁게 느껴져", "그냥 들어줘"],
        app:        ["미션이 뭐야?", "병아리는 뭐야?", "약 인증은 어떻게 해?"],
        mission_done: ["오늘 다 했어", "내일도 해볼게", "고마워"],
        game:       ["병아리 키우는 중이야", "어떻게 하면 잘 커?", "재밌더라"]
    };

    function nextQuickReplies() {
        return CHAT_QUICKS[chatLastTopic] || CHAT_QUICK_DEFAULT;
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && document.activeElement && document.activeElement.id === 'chat-input') {
            sendChatMessage();
        }
    });

    // ===================================================================
    // 시작
    // ===================================================================
    (async function bootDaily() {
        await loadUserState();
        if (!needsOnboarding()) {
            renderHeaderUser();
            renderDailyMissions();
        }
        // 날짜가 넘어갔거나 알림이 소진됐을 수 있으니 열 때마다 다시 채워둡니다
        syncReminders();
    })();

    // 스플래시를 닫은 뒤 온보딩 여부를 판단
    const originalHideSplash = hideSplash;
    hideSplash = function () {
        originalHideSplash();
        setTimeout(async () => {
            await loadUserState();
            if (needsOnboarding()) {
                showOnboarding();
            } else {
                startDailySession();
                checkPendingCall();
            }
        }, 60);
    };

    // ===================================================================
    // 빌드 정보 / 데이터 초기화
    //
    // 테스트 배포에서는 한 기기를 여러 명이 돌려쓰는 일이 생기는데
    // 로그인이 없어서 뒷사람이 앞사람 세이브로 들어가버립니다.
    // 초기화로 온보딩부터 다시 시작할 수 있게 해뒀습니다.
    // 버그 제보를 받을 때 어느 빌드인지 알 수 있도록 버전도 같이 띄웁니다.
    // ===================================================================
    const APP_VERSION = "0.41.0";

    function renderBuildInfo() {
        const el = document.getElementById('footer-build');
        if (!el) return;
        el.innerHTML =
            '<span class="build-ver">v' + APP_VERSION +
            (EMERGENCY_MODE === 'live' ? '' : ' · 테스트 빌드') + '</span>' +
            '<button type="button" class="build-reset" onclick="resetAllData()">처음부터 다시 시작</button>';
    }

    async function resetAllData() {
        const ok = confirm(
            "이 기기에 저장된 기록을 모두 지우고 처음부터 시작할까요?\n\n" +
            "병아리와 코인, 미션 기록, 복약 사진이 전부 사라지고 되돌릴 수 없어요.\n" +
            "다른 사람이 이어서 쓰려면 이렇게 초기화하면 됩니다."
        );
        if (!ok) return;

        const keys = [SAVE_KEY, MED_STATE_KEY, USER_KEY, DAILY_KEY, CALL_PENDING_KEY];
        for (const k of keys) {
            try { await window.storage.delete(k); } catch (e) {}
        }
        location.reload();
    }

    renderBuildInfo();

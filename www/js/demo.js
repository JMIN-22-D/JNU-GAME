/* =====================================================================
   데모 모드 — 시연 전용, 출시 빌드에는 포함하지 마세요
   ---------------------------------------------------------------------
   아직 안 만든 부분을 기다리지 않고 넘어가면서 보여주기 위한 도구입니다.
   도감 전부 열기, 즉시 성장, 무한 코인, 감정표현 재생 등.

   ■ 제거 방법
     index.html 에서 이 파일을 부르는 <script> 한 줄만 지우면 됩니다.
     앱 코드에는 손대지 않았기 때문에 흔적이 남지 않습니다.

   ■ 안전장치
     데모 데이터를 넣기 전에 원래 세이브를 통째로 백업해 둡니다.
     패널의 [원래 데이터로 되돌리기] 를 누르면 그대로 복구됩니다.
     시연 끝나고 꼭 눌러주세요.
   ===================================================================== */
(function () {
    "use strict";

    var DEMO_ENABLED = true;          // false 로 두면 버튼조차 뜨지 않습니다
    if (!DEMO_ENABLED) return;

    // 열자마자 전부 열린 상태로 시작할지.
    // 시연용 단일 파일(DEMO.html)만 앞쪽 스크립트에서 이 값을 켭니다.
    // www/ 로 개발할 때는 켜지지 않으므로 작업 중인 세이브가 덮이지 않습니다.
    var AUTOFILL = (window.DEMO_AUTOFILL === true);

    var BACKUP_KEY = "jeroki-demo-backup";
    // 앱이 쓰는 저장 키 전부. 되돌릴 때 이 넷을 통째로 원위치시킵니다.
    var KEYS = ["jeroki-pet-save", "jeroki-daily", "jeroki-user", "jeroki-med-state"];

    var infiniteTimer = null;
    var COIN_TOP = 999999;

    // -----------------------------------------------------------------
    // 백업 / 복구
    //
    // localStorage 를 직접 쓰지 않고 app.js 와 같은 window.storage 를 씁니다.
    // 네이티브 앱에서는 native.js 가 저장소를 Capacitor Preferences 로
    // 바꿔치기하기 때문에, localStorage 를 보면 엉뚱한 곳을 백업하게 됩니다.
    //
    // 데모 데이터를 처음 넣는 순간에만 백업합니다. 여러 번 눌러도
    // 데모 상태가 원본 백업을 덮어쓰지 않도록 이미 있으면 건너뜁니다.
    // -----------------------------------------------------------------
    async function backupOnce() {
        try {
            var existing = await window.storage.get(BACKUP_KEY);
            if (existing && existing.value) return;
            var snap = {};
            for (var i = 0; i < KEYS.length; i++) {
                var r = await window.storage.get(KEYS[i]);
                snap[KEYS[i]] = (r && r.value !== undefined && r.value !== null) ? r.value : null;
            }
            await window.storage.set(BACKUP_KEY, JSON.stringify(snap));
        } catch (e) {}
    }

    // 저장된 걸 통째로 비워 처음 상태로 돌립니다.
    // 데모로 코인을 999999 로 채워 놓으면 가구·도구·확장이 전부 무의미해져서,
    // 실제로 플레이해 보려면 이 버튼이 필요합니다.
    async function resetAll() {
        if (!confirm("모든 진행을 지우고 처음부터 시작할까요?\n(병아리 · 섬 · 마을 전부)")) return;
        for (var i = 0; i < KEYS.length; i++) {
            try { await window.storage.delete(KEYS[i]); } catch (e) {}
        }
        try { await window.storage.delete("jeroki-island"); } catch (e) {}
        try { await window.storage.delete("jeroki-village"); } catch (e) {}
        try { await window.storage.delete(BACKUP_KEY); } catch (e) {}
        if (infiniteTimer) { clearInterval(infiniteTimer); infiniteTimer = null; }
        location.reload();
    }

    async function restoreBackup() {
        var raw = null;
        try {
            var r = await window.storage.get(BACKUP_KEY);
            raw = r && r.value;
        } catch (e) {}
        if (!raw) { alert("백업이 없어요. 데모 데이터를 넣은 적이 없는 것 같아요."); return; }
        if (!confirm("데모 데이터를 지우고 원래 상태로 되돌릴까요?")) return;

        var snap = JSON.parse(raw);
        for (var i = 0; i < KEYS.length; i++) {
            var k = KEYS[i];
            try {
                if (snap[k] === null || snap[k] === undefined) await window.storage.delete(k);
                else await window.storage.set(k, snap[k]);
            } catch (e) {}
        }
        try { await window.storage.delete(BACKUP_KEY); } catch (e) {}
        if (infiniteTimer) { clearInterval(infiniteTimer); infiniteTimer = null; }
        location.reload();
    }

    // -----------------------------------------------------------------
    // 게임 화면을 확실히 띄워둡니다 (감정표현은 병아리가 보여야 재생됨)
    // -----------------------------------------------------------------
    function ensureGameOpen() {
        var gv = document.getElementById("game-view");
        if (gv && getComputedStyle(gv).display === "none" && typeof showGame === "function") {
            showGame();
            return true;
        }
        return false;
    }

    function refreshAll() {
        [
            "updateResourceBar", "renderFarm", "renderShop", "updateFishStatus",
            "updateMineStatus", "updateAccessoryVisual", "renderCollection",
            "updateProgressBar", "renderCharacter", "updateStageClass", "renderDailyMissions"
        ].forEach(function (fn) {
            try { if (typeof window[fn] === "function") window[fn](); } catch (e) {}
        });
        try { if (typeof saveGame === "function") saveGame(); } catch (e) {}
    }

    // -----------------------------------------------------------------
    // 개별 치트
    // -----------------------------------------------------------------

    // 도감 12종 (4종족 × 3등급) 전부 열기
    // silent: '전부 열기'에서 부를 때는 토스트가 겹치지 않도록 조용히
    function unlockCollection(silent) {
        speciesOrder.forEach(function (s) {
            tierOrder.forEach(function (t) {
                var key = s + "-" + t;
                if (!collected[key]) collected[key] = 1;
            });
        });
        if (!silent) {
            refreshAll();
            toast("📖 도감 12종 전부 열었어요");
        }
    }

    // 한 단계 성장: 시간 제한(minSeconds)까지 같이 채워줍니다
    function growOneStage() {
        if (currentLevel >= stages.length - 1) { toast("이미 마지막 단계예요"); return; }
        var next = stages[currentLevel + 1];
        currentExp = Math.max(currentExp, next.expNeed);
        elapsedSeconds = Math.max(elapsedSeconds, next.minSeconds);
        ensureGameOpen();
        try { checkLevelUp(); } catch (e) {}
        refreshAll();
    }

    // 최종 모습까지 한 번에 (변신 연출 포함)
    function growToFinal() {
        ensureGameOpen();
        var guard = 0;
        while (currentLevel < stages.length - 1 && guard++ < 20) {
            var next = stages[currentLevel + 1];
            currentExp = Math.max(currentExp, next.expNeed);
            elapsedSeconds = Math.max(elapsedSeconds, next.minSeconds);
            try { checkLevelUp(); } catch (e) { break; }
        }
        refreshAll();
    }

    // 무한 코인: 줄어들면 다시 채워 넣습니다
    function toggleInfiniteCoins() {
        if (infiniteTimer) {
            clearInterval(infiniteTimer);
            infiniteTimer = null;
            toast("🪙 무한 코인 껐어요");
        } else {
            coins = COIN_TOP;
            try { updateResourceBar(); } catch (e) {}
            infiniteTimer = setInterval(function () {
                if (coins < COIN_TOP - 1000) {
                    coins = COIN_TOP;
                    try { updateResourceBar(); } catch (e) {}
                }
            }, 800);
            toast("🪙 무한 코인 켰어요");
        }
        syncPanel();
    }

    // 농장·낚시·광산·꾸미기까지 전부 열어 시연할 수 있는 상태로
    function fillEverything() {
        coins = COIN_TOP;

        // 농장 3곳 전부 + 씨앗과 수확물 넉넉히
        fieldOrder.forEach(function (f) { fieldsUnlocked[f] = true; });
        Object.keys(cropSeeds).forEach(function (k) { cropSeeds[k] = 99; });
        Object.keys(cropInventory).forEach(function (k) { cropInventory[k] = 30; });
        Object.keys(mealInventory).forEach(function (k) { mealInventory[k] = 30; });

        // 낚시·광산 최고 장비 + 재료
        Object.keys(fishInventory).forEach(function (k) { fishInventory[k] = 20; });
        Object.keys(oreInventory).forEach(function (k) { oreInventory[k] = 20; });
        rodLevel = rodLevels.length - 1;
        rodDurability = rodLevels[rodLevel].durabilityMax;
        pickLevel = pickLevels.length - 1;
        pickDurability = pickLevels[pickLevel].durabilityMax;

        // 꾸미기 전부 보유 (착용은 직접 골라서 보여주도록 비워둡니다)
        accessoryOrder.forEach(function (a) { ownedAccessories[a] = true; });

        // 게임 내 미션 전부 최고 단계
        try {
            missions.forEach(function (m) { missionLevel[m.key] = MISSION_MAX_LEVEL; });
        } catch (e) {}

        // 스탯 가득
        try {
            setStat("hunger", 100); setStat("love", 100); setStat("energy", 100);
        } catch (e) { hunger = love = energy = 100; }

        unlockCollection(true);
        refreshAll();
        toast("✨ 도감·농장·장비·코인 전부 열었어요");
    }

    // 온보딩을 건너뛰고 바로 본화면으로 (시연 중에 학번 타이핑 안 하도록)
    async function skipOnboarding() {
        userProfile = { studentId: "202500000", name: "제주", joinedAt: new Date().toISOString() };
        try { await saveUserState(); } catch (e) {}
        var ov = document.getElementById("onboarding-view");
        if (ov) ov.classList.remove("show");
        var sp = document.getElementById("splash-view");
        if (sp) sp.classList.add("hide");
        try { if (typeof startDailySession === "function") startDailySession(); } catch (e) {}
        try { if (typeof renderHeaderUser === "function") renderHeaderUser(); } catch (e) {}
        refreshAll();
        toast("👤 온보딩 건너뛰었어요");
    }

    // 오늘의 미션을 완료 상태로 (완료 화면과 보너스 표시를 보여줄 때)
    async function completeToday() {
        var labels = { med: "약 챙겨 먹기", call: "통화하기", walk: "걷기" };
        var keys = (typeof activeMissionKeys === "function") ? activeMissionKeys() : ["med", "call", "walk"];
        for (var i = 0; i < keys.length; i++) {
            try { await completeMission(keys[i], labels[keys[i]] || keys[i]); } catch (e) {}
        }
        try { renderDailyMissions(); } catch (e) {}
        toast("✅ 오늘 미션 전부 완료 처리했어요");
    }

    // 오늘의 미션을 다시 안 한 상태로 (같은 시연을 반복할 때)
    async function resetToday() {
        try {
            var d = todayData();
            d.med = { done: false, time: "" };
            d.call = { done: false, minutes: 0 };
            d.walk = { done: false, steps: 0 };
            await saveUserState();
            renderDailyMissions();
        } catch (e) {}
        toast("↩️ 오늘 미션 되돌렸어요");
    }

    function playMove(move) {
        ensureGameOpen();
        // 화면이 막 열렸으면 병아리 svg가 그려질 때까지 아주 잠깐 기다립니다
        setTimeout(function () {
            try {
                if (move === "hearts") { spawnHearts(); return; }
                if (move === "bubble") { spawnChickBubble(pickOne(CHAR_AEGYO_LINES)); return; }
                if (move === "voice")  { spawnChickBubble(charVoice()); return; }
                playAegyo(move, move === "ag-approach" ? 1600 : 1200);
                if (move === "ag-nuzzle" || move === "ag-approach") spawnHearts();
            } catch (e) {}
        }, 60);
    }

    function toast(msg) {
        try { showEventToast(msg, "good"); } catch (e) {}
    }

    // -----------------------------------------------------------------
    // 패널
    // -----------------------------------------------------------------
    var MOVES = [
        ["ag-hop", "폴짝"], ["ag-tilt", "갸웃"], ["ag-spin", "빙글"],
        ["ag-approach", "다가오기"], ["ag-nuzzle", "부비부비"], ["ag-wiggle", "꼼지락"],
        ["ag-shy", "부끄"], ["ag-droop", "시무룩"],
        ["hearts", "💗 하트"], ["bubble", "💬 애교말"], ["voice", "🔊 울음소리"]
    ];

    // 스타일도 여기서 넣습니다 (style.css 를 건드리지 않아야 제거가 깔끔해서)
    function injectStyle() {
        var css =
        '#demo-wrap{position:fixed;right:14px;bottom:14px;z-index:11000;' +
            'display:flex;flex-direction:column;align-items:flex-end;gap:8px;' +
            'font-family:"Noto Sans KR",sans-serif;}' +
        // 반투명이면 잘 안 보인다는 피드백이 있어 또렷한 알약 버튼으로 바꿨습니다
        '#demo-fab{padding:12px 18px;border-radius:24px;border:2px solid #fff;cursor:pointer;' +
            'background:#e4483a;color:#fff;font-size:14px;font-weight:700;line-height:1;' +
            'white-space:nowrap;font-family:inherit;' +
            'box-shadow:0 6px 22px rgba(0,0,0,.45);}' +
        '#demo-fab:active{transform:scale(.95);}' +
        '#demo-panel{display:none;width:270px;max-height:74vh;overflow-y:auto;' +
            'background:#20222c;color:#e9e7e2;border-radius:14px;' +
            'box-shadow:0 16px 44px rgba(0,0,0,.42);font-size:12px;}' +
        '#demo-wrap.open #demo-panel{display:block;}' +
        '.demo-head{display:flex;align-items:center;justify-content:space-between;' +
            'padding:11px 13px;font-weight:700;border-bottom:1px solid #33363f;' +
            'position:sticky;top:0;background:#20222c;border-radius:14px 14px 0 0;}' +
        '.demo-head button{background:none;border:none;color:#9a9aa4;font-size:19px;' +
            'cursor:pointer;line-height:1;padding:0 2px;}' +
        '.demo-body{padding:11px 13px 14px;}' +
        '.demo-warn{background:#3a2f1c;color:#e8c98a;border-radius:8px;padding:7px 9px;' +
            'line-height:1.5;margin-bottom:11px;font-size:11px;}' +
        '.demo-sec{margin-bottom:12px;}' +
        '.demo-sec>b{display:block;color:#8e93a3;font-size:10.5px;font-weight:700;' +
            'margin-bottom:6px;letter-spacing:.4px;}' +
        '.demo-row{display:flex;gap:6px;flex-wrap:wrap;}' +
        '.demo-row>button{flex:1 1 auto;}' +
        '.demo-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;}' +
        '#demo-panel button[data-act],#demo-panel button[data-move]{' +
            'background:#2e313d;border:1px solid #3d414f;color:#dcdae4;border-radius:8px;' +
            'padding:8px 9px;font-size:11.5px;font-weight:600;cursor:pointer;width:100%;' +
            'font-family:inherit;}' +
        '#demo-panel button[data-act]:active,#demo-panel button[data-move]:active{transform:scale(.96);}' +
        '#demo-panel button.demo-primary{background:#1f6f4a;border-color:#2b8c60;color:#eafff4;' +
            'margin-bottom:6px;}' +
        '#demo-panel button.demo-danger{background:#5d2b2b;border-color:#7a3a3a;color:#ffe9e9;}' +
        '#demo-panel button.on{background:#1f6f4a;border-color:#2b8c60;color:#eafff4;}';
        var el = document.createElement("style");
        el.id = "demo-style";
        el.textContent = css;
        document.head.appendChild(el);
    }

    function buildPanel() {
        injectStyle();

        var wrap = document.createElement("div");
        wrap.id = "demo-wrap";

        var btn = document.createElement("button");
        btn.id = "demo-fab";
        btn.type = "button";
        btn.innerText = "🎬 데모";
        btn.title = "데모 패널 열기";
        btn.onclick = function () { wrap.classList.toggle("open"); };

        var panel = document.createElement("div");
        panel.id = "demo-panel";

        var moveBtns = MOVES.map(function (m) {
            return '<button type="button" data-move="' + m[0] + '">' + m[1] + '</button>';
        }).join("");

        panel.innerHTML =
            '<div class="demo-head">🎬 데모 모드<button type="button" id="demo-close">×</button></div>' +
            '<div class="demo-body">' +
                '<div class="demo-warn">시연용입니다. 끝나면 아래 되돌리기를 눌러주세요.</div>' +

                '<div class="demo-sec"><b>한 번에</b>' +
                    '<button type="button" data-act="fill" class="demo-primary">전부 열기 (도감·농장·장비·코인)</button>' +
                    '<button type="button" data-act="reset" class="demo-danger">기본값으로 초기화 (처음부터)</button>' +
                    '<button type="button" data-act="restore" class="demo-danger">원래 데이터로 되돌리기</button>' +
                '</div>' +

                '<div class="demo-sec"><b>성장</b>' +
                    '<div class="demo-row">' +
                        '<button type="button" data-act="grow1">한 단계 ▲</button>' +
                        '<button type="button" data-act="growmax">최종 모습으로</button>' +
                    '</div>' +
                '</div>' +

                '<div class="demo-sec"><b>자원</b>' +
                    '<div class="demo-row">' +
                        '<button type="button" data-act="collection">도감 전부</button>' +
                        '<button type="button" data-act="coins" id="demo-coin-btn">무한 코인</button>' +
                    '</div>' +
                '</div>' +

                '<div class="demo-sec"><b>감정표현</b>' +
                    '<div class="demo-grid">' + moveBtns + '</div>' +
                '</div>' +

                '<div class="demo-sec"><b>건너뛰기</b>' +
                    '<div class="demo-row">' +
                        '<button type="button" data-act="skiponb">온보딩</button>' +
                        '<button type="button" data-act="today">오늘 미션 완료</button>' +
                        '<button type="button" data-act="untoday">미션 되돌리기</button>' +
                    '</div>' +
                '</div>' +
            '</div>';

        wrap.appendChild(panel);
        wrap.appendChild(btn);
        document.body.appendChild(wrap);

        panel.querySelector("#demo-close").onclick = function () { wrap.classList.remove("open"); };

        panel.addEventListener("click", async function (e) {
            var t = e.target;
            if (t.tagName !== "BUTTON") return;

            var move = t.getAttribute("data-move");
            if (move) { playMove(move); return; }

            var act = t.getAttribute("data-act");
            if (!act) return;

            // 무엇이든 건드리기 전에 원본을 먼저 확보합니다.
            // (되돌리기 자체는 백업을 만들면 안 되므로 제외)
            if (act !== "restore") await backupOnce();

            switch (act) {
                case "fill":       fillEverything(); break;
                case "reset":      resetAll(); break;
                case "restore":    restoreBackup(); break;
                case "grow1":      growOneStage(); break;
                case "growmax":    growToFinal(); break;
                case "collection": unlockCollection(); break;
                case "coins":      toggleInfiniteCoins(); break;
                case "skiponb":    skipOnboarding(); break;
                case "today":      completeToday(); break;
                case "untoday":    resetToday(); break;
            }
        });
    }

    // -----------------------------------------------------------------
    // 자동 채우기 (DEMO.html 전용)
    // -----------------------------------------------------------------

    // 최종 단계까지 가면 먹이주기·쓰다듬기가 잠겨서 시연할 게 없어집니다.
    // 그래서 한 칸 앞(어른 새)에서 멈춰 상호작용은 살려둡니다.
    function growToPenultimate() {
        var target = stages.length - 2;
        var guard = 0;
        while (currentLevel < target && guard++ < 20) {
            var next = stages[currentLevel + 1];
            currentExp = Math.max(currentExp, next.expNeed);
            elapsedSeconds = Math.max(elapsedSeconds, next.minSeconds);
            try { checkLevelUp(); } catch (e) { break; }
        }
    }

    async function autoFillOnLoad() {
        await backupOnce();

        // 시연 중에 학번을 타이핑하지 않도록 온보딩을 미리 통과시켜 둡니다
        try {
            userProfile = { studentId: "202500000", name: "제주", joinedAt: new Date().toISOString() };
            await saveUserState();
        } catch (e) {}
        var ov = document.getElementById("onboarding-view");
        if (ov) ov.classList.remove("show");
        try { if (typeof renderHeaderUser === "function") renderHeaderUser(); } catch (e) {}
        try { if (typeof startDailySession === "function") startDailySession(); } catch (e) {}

        fillEverything();
        growToPenultimate();
        refreshAll();
    }

    function syncPanel() {
        var b = document.getElementById("demo-coin-btn");
        if (b) {
            b.innerText = infiniteTimer ? "무한 코인 ✓" : "무한 코인";
            b.classList.toggle("on", !!infiniteTimer);
        }
    }

    function boot() {
        buildPanel();
        // app.js 의 초기화(bootDaily)가 비동기라 한 박자 뒤에 채웁니다
        if (AUTOFILL) setTimeout(autoFillOnLoad, 350);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
})();

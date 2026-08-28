/* =====================================================================
   제록이 마을 — 돌아다니며 이웃과 이야기하는 게임
   ---------------------------------------------------------------------
   기존 '병아리 키우기'와 완전히 별개입니다.
   저장 키도 따로 써서(jeroki-village) 서로의 데이터를 건드리지 않습니다.

   ■ 왜 따로 만들었나
     병아리 게임은 탭을 눌러 기능을 고르는 구조입니다. 이 마을은 그 대신
     '직접 걸어가서 만나는' 방식이라, 같은 화면에 섞으면 둘 다 어색해집니다.

   ■ 마음쉼터 앱다운 부분
     이웃들은 그냥 퀘스트를 주는 NPC가 아니라, 안부를 묻고 조용히 곁을
     지켜주는 쪽으로 대사를 썼습니다. 재촉하거나 몰아붙이지 않습니다.
   ===================================================================== */
(function () {
    "use strict";

    var SAVE_KEY = "jeroki-village";
    var TILE = 44;
    var W = 30, H = 22;              // 맵 크기 (타일 수)
    var SPEED = 130;                 // 초당 픽셀

    // ---- 타일 ---------------------------------------------------------
    // .  잔디   ,  모래   ~  바다   T  나무   R  바위
    // P  길     F  밭     H  집     B  게시판
    var SOLID = { "~": 1, "T": 1, "R": 1, "H": 1, "B": 1 };
    var TILE_STYLE = {
        ".": { bg: "#a8d98a" },
        ",": { bg: "#f0e2b6" },
        "~": { bg: "#8fd3f0", emoji: "" },
        "T": { bg: "#a8d98a", emoji: "🌳" },
        "R": { bg: "#a8d98a", emoji: "🪨" },
        "P": { bg: "#e8dcc0" },
        "F": { bg: "#c9a56f" },
        "H": { bg: "#a8d98a", emoji: "🏠" },
        "B": { bg: "#a8d98a", emoji: "🪧" }
    };

    // ---- 이웃들 --------------------------------------------------------
    // 제주에 사는 것들로 골랐습니다.
    var NPCS = [
        {
            id: "harbang", name: "하르방", emoji: "🗿", x: 9, y: 8,
            lines: [
                "어서 오라, 반갑수다.\n오늘은 어떵 지냈수과?",
                "바쁘게 안 살아도 됩니다.\n돌도 천 년을 그냥 서 있었주.",
                "힘들면 여기 와서 좀 쉬었다 가라."
            ],
            again: [
                "또 왔구나. 반갑다.",
                "오늘 바람이 좋수다.",
                "천천히 가도 늦지 않아."
            ]
        },
        {
            id: "gyul", name: "감귤이", emoji: "🍊", x: 20, y: 7,
            lines: [
                "안녕! 나는 감귤이야 🍊\n마을 구경 왔어?",
                "밭에 씨앗 심어봤어?\n기다리면 쑥쑥 자라!",
                "심심하면 나한테 또 놀러 와!"
            ],
            again: [
                "오늘도 왔네! 반가워 🍊",
                "밭은 잘 되고 있어?",
                "햇볕이 좋으니까 잠깐 걷다 가!"
            ]
        },
        {
            id: "haenyeo", name: "바다", emoji: "🤿", x: 5, y: 16,
            lines: [
                "물질하러 왔수과?\n여기 바닷가에서 낚시할 수 있주.",
                "물가에 서서 확인을 누르면 돼요.",
                "조급해 말고 기다리는 게 요령이라."
            ],
            again: [
                "오늘은 뭐가 잡히려나.",
                "바다는 서두르는 사람한테 안 줘요.",
                "많이 잡았수과?"
            ]
        },
        {
            id: "noru", name: "노루", emoji: "🦌", x: 24, y: 15,
            lines: [
                "…아, 안녕하세요.\n조금 놀랐어요.",
                "저는 말수가 적은 편이에요.\n그래도 옆에 있는 건 좋아해요.",
                "말 안 해도 괜찮아요.\n같이 있어줄게요."
            ],
            again: [
                "…또 오셨네요. 좋아요.",
                "오늘은 조금 괜찮으세요?",
                "여기 조용해서 좋죠."
            ]
        },
        {
            id: "dongbaek", name: "동백", emoji: "🌺", x: 14, y: 17,
            lines: [
                "겨울에 피는 꽃이에요.\n다들 질 때 피죠.",
                "제일 추울 때 피어서\n다들 놀라더라고요.",
                "지금 힘들어도, 그게 끝은 아니에요."
            ],
            again: [
                "오늘도 잘 버텼네요.",
                "천천히 피어도 괜찮아요.",
                "여기 앉았다 가세요."
            ]
        }
    ];

    // ---- 작물 ----------------------------------------------------------
    var CROPS = {
        turnip:    { name: "무",   seed: "🌱", grown: "🥬", ms: 60000,  price: 12 },
        carrot:    { name: "당근", seed: "🌱", grown: "🥕", ms: 100000, price: 20 },
        tangerine: { name: "감귤", seed: "🌱", grown: "🍊", ms: 160000, price: 34 }
    };
    var CROP_ORDER = ["turnip", "carrot", "tangerine"];
    var SEED_COST = { turnip: 4, carrot: 8, tangerine: 14 };

    var FISH = [
        { name: "멸치",   emoji: "🐟", price: 6,  weight: 45 },
        { name: "고등어", emoji: "🐠", price: 14, weight: 30 },
        { name: "한치",   emoji: "🦑", price: 26, weight: 17 },
        { name: "돌돔",   emoji: "🐡", price: 48, weight: 8 }
    ];

    // ---- 상태 -----------------------------------------------------------
    var open = false, raf = null, lastT = 0;
    var map = null;
    var px = 0, py = 0;              // 픽셀 좌표 (캐릭터 발 위치)
    var facing = "down";
    var keys = {};
    var coins = 30;
    var seeds = { turnip: 3, carrot: 0, tangerine: 0 };
    var bag = {};                    // { 이름: 개수 }
    var plots = {};                  // "x,y" -> { crop, at }
    var met = {};                    // 처음 만난 이웃 기록
    var busy = false;                // 대화·낚시 중에는 못 움직임

    var elRoot, elWorld, elChar, elCoins, elDlg, elDlgName, elDlgText, elToast;
    var npcEls = {}, plotEls = {};

    // =================================================================
    // 맵
    // =================================================================
    function buildMap() {
        var m = [], x, y;
        for (y = 0; y < H; y++) {
            m[y] = [];
            for (x = 0; x < W; x++) m[y][x] = ".";
        }
        function rect(x0, y0, x1, y1, ch) {
            for (var yy = y0; yy <= y1; yy++)
                for (var xx = x0; xx <= x1; xx++)
                    if (yy >= 0 && yy < H && xx >= 0 && xx < W) m[yy][xx] = ch;
        }

        rect(0, 0, W - 1, 1, "~");            // 위쪽 바다
        rect(0, H - 3, W - 1, H - 1, "~");    // 아래쪽 바다
        rect(0, 0, 1, H - 1, "~");
        rect(W - 2, 0, W - 1, H - 1, "~");
        rect(2, 2, W - 3, 2, ",");            // 백사장
        rect(2, H - 4, W - 3, H - 4, ",");

        rect(3, 9, W - 4, 10, "P");           // 가로 큰길
        rect(14, 4, 15, 17, "P");             // 세로 큰길

        rect(5, 4, 6, 5, "T");                // 나무 무리
        rect(22, 4, 24, 5, "T");
        rect(4, 13, 5, 14, "T");
        rect(25, 12, 26, 13, "T");
        m[7][7] = "R"; m[16][20] = "R";

        rect(8, 4, 9, 5, "H");                // 집
        rect(19, 12, 20, 13, "H");
        m[8][14] = "B";                       // 마을 게시판 (길 옆)

        rect(6, 12, 11, 15, "F");             // 밭

        return m;
    }

    function tileAt(tx, ty) {
        if (tx < 0 || ty < 0 || tx >= W || ty >= H) return "~";
        return map[ty][tx];
    }

    function solidAt(tx, ty) { return !!SOLID[tileAt(tx, ty)]; }

    // 캐릭터는 한 타일보다 작게 잡아서 모서리에 잘 걸리지 않게 합니다
    function canStand(nx, ny) {
        var r = 12;
        var pts = [[nx - r, ny - 4], [nx + r, ny - 4], [nx - r, ny + 8], [nx + r, ny + 8]];
        for (var i = 0; i < pts.length; i++) {
            if (solidAt(Math.floor(pts[i][0] / TILE), Math.floor(pts[i][1] / TILE))) return false;
        }
        return true;
    }

    // =================================================================
    // 그리기
    // =================================================================
    function drawWorld() {
        var html = "";
        for (var y = 0; y < H; y++) {
            for (var x = 0; x < W; x++) {
                var ch = map[y][x];
                var st = TILE_STYLE[ch] || TILE_STYLE["."];
                html += '<div class="vt" style="left:' + (x * TILE) + 'px;top:' + (y * TILE) +
                        'px;background:' + st.bg + '">' + (st.emoji || "") + '</div>';
            }
        }
        elWorld.innerHTML = html;
        elWorld.style.width = (W * TILE) + "px";
        elWorld.style.height = (H * TILE) + "px";

        NPCS.forEach(function (n) {
            var el = document.createElement("div");
            el.className = "vnpc";
            el.style.left = (n.x * TILE) + "px";
            el.style.top = (n.y * TILE) + "px";
            el.innerHTML = '<span class="vnpc-emoji">' + n.emoji + '</span>' +
                           '<span class="vnpc-name">' + n.name + '</span>';
            elWorld.appendChild(el);
            npcEls[n.id] = el;
        });

        elChar = document.createElement("div");
        elChar.className = "vchar";
        elChar.innerText = "🐣";
        elWorld.appendChild(elChar);

        renderPlots();
    }

    function renderPlots() {
        Object.keys(plotEls).forEach(function (k) { plotEls[k].remove(); });
        plotEls = {};
        Object.keys(plots).forEach(function (k) {
            var p = plots[k];
            var xy = k.split(",");
            var el = document.createElement("div");
            el.className = "vcrop";
            el.style.left = (xy[0] * TILE) + "px";
            el.style.top = (xy[1] * TILE) + "px";
            el.innerText = isRipe(p) ? CROPS[p.crop].grown : CROPS[p.crop].seed;
            if (isRipe(p)) el.classList.add("ripe");
            elWorld.appendChild(el);
            plotEls[k] = el;
        });
    }

    function isRipe(p) { return Date.now() - p.at >= CROPS[p.crop].ms; }

    function camera() {
        var vw = elRoot.clientWidth, vh = elRoot.clientHeight;
        var cx = Math.min(Math.max(px, vw / 2), W * TILE - vw / 2);
        var cy = Math.min(Math.max(py, vh / 2), H * TILE - vh / 2);
        if (W * TILE < vw) cx = W * TILE / 2;
        if (H * TILE < vh) cy = H * TILE / 2;
        elWorld.style.transform =
            "translate(" + Math.round(vw / 2 - cx) + "px," + Math.round(vh / 2 - cy) + "px)";
        elChar.style.left = Math.round(px) + "px";
        elChar.style.top = Math.round(py) + "px";
    }

    // =================================================================
    // 루프
    // =================================================================
    function loop(ts) {
        if (!open) return;
        var dt = lastT ? Math.min(0.1, (ts - lastT) / 1000) : 1 / 60;
        lastT = ts || 0;
        if (!busy) step(dt);
        raf = requestAnimationFrame(loop);
    }

    function step(dt) {
        var d = SPEED * dt;
        var dx = (keys.right ? d : 0) - (keys.left ? d : 0);
        var dy = (keys.down ? d : 0) - (keys.up ? d : 0);
        if (!dx && !dy) { elChar.classList.remove("walking"); return; }
        if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }

        if (dx && canStand(px + dx, py)) px += dx;
        if (dy && canStand(px, py + dy)) py += dy;

        if (Math.abs(dx) > Math.abs(dy)) facing = dx > 0 ? "right" : "left";
        else if (dy) facing = dy > 0 ? "down" : "up";

        elChar.classList.add("walking");
        elChar.style.transform = "translate(-50%,-70%) scaleX(" + (facing === "left" ? -1 : 1) + ")";
        camera();
    }

    // =================================================================
    // 상호작용
    // =================================================================
    function frontTile() {
        var tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
        if (facing === "up") ty--;
        else if (facing === "down") ty++;
        else if (facing === "left") tx--;
        else tx++;
        return { tx: tx, ty: ty };
    }

    function nearbyNpc() {
        for (var i = 0; i < NPCS.length; i++) {
            var n = NPCS[i];
            var cx = n.x * TILE + TILE / 2, cy = n.y * TILE + TILE / 2;
            if (Math.abs(cx - px) < TILE * 1.3 && Math.abs(cy - py) < TILE * 1.3) return n;
        }
        return null;
    }

    function interact() {
        if (busy) { advanceDialog(); return; }

        var n = nearbyNpc();
        if (n) { talkTo(n); return; }

        var f = frontTile();
        var ch = tileAt(f.tx, f.ty);
        var here = tileAt(Math.floor(px / TILE), Math.floor(py / TILE));

        if (ch === "B") { readBoard(); return; }
        if (ch === "~") { startFishing(); return; }
        if (here === "F") { useField(Math.floor(px / TILE), Math.floor(py / TILE)); return; }
        if (ch === "F") { useField(f.tx, f.ty); return; }

        toast("여기엔 아무것도 없어요");
    }

    // ---- 대화 ----------------------------------------------------------
    var dlgQueue = [], dlgName = "";

    function say(name, lines) {
        dlgName = name;
        dlgQueue = lines.slice();
        busy = true;
        elDlg.classList.add("show");
        advanceDialog();
    }

    function advanceDialog() {
        if (!dlgQueue.length) {
            elDlg.classList.remove("show");
            busy = false;
            save();
            return;
        }
        elDlgName.innerText = dlgName;
        elDlgText.innerText = dlgQueue.shift();
    }

    function talkTo(n) {
        var first = !met[n.id];
        met[n.id] = true;
        say(n.name, first ? n.lines : [n.again[Math.floor(Math.random() * n.again.length)]]);
    }

    function readBoard() {
        say("마을 게시판", [
            "🪧 제록이 마을 안내\n\n· 방향키로 걸어다녀요\n· 이웃 앞에서 [확인]을 누르면 이야기해요",
            "· 갈색 밭에 서서 [확인] → 씨앗 심기\n· 바다를 보고 [확인] → 낚시",
            "여기선 아무것도 안 해도 괜찮아요.\n그냥 걷다 가셔도 돼요."
        ]);
    }

    // ---- 밭 -------------------------------------------------------------
    function useField(tx, ty) {
        if (tileAt(tx, ty) !== "F") { toast("여긴 밭이 아니에요"); return; }
        var key = tx + "," + ty;
        var p = plots[key];

        if (p) {
            if (!isRipe(p)) {
                var left = Math.ceil((CROPS[p.crop].ms - (Date.now() - p.at)) / 1000);
                toast(CROPS[p.crop].name + " 자라는 중… " + left + "초");
                return;
            }
            var c = CROPS[p.crop];
            bag[c.name] = (bag[c.name] || 0) + 1;
            coins += c.price;
            delete plots[key];
            renderPlots();
            updateHud();
            save();
            toast("🎉 " + c.name + " 수확! 🪙+" + c.price);
            return;
        }

        // 심을 씨앗 고르기
        var have = CROP_ORDER.filter(function (k) { return seeds[k] > 0; });
        if (!have.length) { openShop(); return; }
        var pick = have[0];
        seeds[pick]--;
        plots[key] = { crop: pick, at: Date.now() };
        renderPlots();
        updateHud();
        save();
        toast("🌱 " + CROPS[pick].name + " 심었어요");
    }

    function openShop() {
        dlgQueue = [];                 // 대화 큐를 비워 클릭으로 넘어가지 않게
        busy = true;

        var html = CROP_ORDER.map(function (k) {
            return '<button type="button" data-seed="' + k + '">' +
                   CROPS[k].grown + " " + CROPS[k].name + " 🪙" + SEED_COST[k] + '</button>';
        }).join("");

        elDlgName.innerText = "씨앗 가게 · 가진 코인 🪙" + coins;
        elDlgText.innerHTML = '<div class="vshop">' + html +
            '<button type="button" data-seed="close">닫기</button></div>';
        elDlg.classList.add("show");
        elDlgText.querySelectorAll("button").forEach(function (b) {
            b.onclick = function (e) {
                e.stopPropagation();   // 대화창 클릭(=닫기)까지 번지지 않게
                var k = b.getAttribute("data-seed");
                if (k === "close") { elDlg.classList.remove("show"); busy = false; save(); return; }
                if (coins < SEED_COST[k]) { toast("코인이 모자라요"); return; }
                coins -= SEED_COST[k];
                seeds[k]++;
                updateHud();
                elDlgName.innerText = "씨앗 가게 · 가진 코인 🪙" + coins;
                toast(CROPS[k].name + " 씨앗을 샀어요");
                save();
            };
        });
    }

    // ---- 낚시 -------------------------------------------------------------
    var fishTimer = null;

    function startFishing() {
        busy = true;
        elDlgName.innerText = "낚시";
        elDlgText.innerText = "🎣 찌를 던졌어요…\n입질이 오면 [확인]을 누르세요";
        elDlg.classList.add("show");

        var bit = false, missed = false;
        var wait = 1200 + Math.random() * 2800;

        fishTimer = setTimeout(function () {
            if (!busy) return;
            bit = true;
            elDlgText.innerText = "❗ 입질이다! 지금!";
            // 놓치면 실패
            fishTimer = setTimeout(function () {
                if (!bit || missed) return;
                missed = true;
                endFishing(null);
            }, 900);
        }, wait);

        elDlg.onclick = function () {
            if (missed) return;
            if (!bit) { missed = true; clearTimeout(fishTimer); endFishing(null, "너무 일찍 당겼어요"); return; }
            clearTimeout(fishTimer);
            endFishing(rollFish());
        };
    }

    // 받침이 있으면 '을', 없으면 '를' (돌돔을 / 고등어를)
    function eulReul(word) {
        var c = word.charCodeAt(word.length - 1);
        if (c < 0xAC00 || c > 0xD7A3) return "를";
        return ((c - 0xAC00) % 28) ? "을" : "를";
    }

    function rollFish() {
        var total = FISH.reduce(function (s, f) { return s + f.weight; }, 0);
        var r = Math.random() * total;
        for (var i = 0; i < FISH.length; i++) {
            r -= FISH[i].weight;
            if (r <= 0) return FISH[i];
        }
        return FISH[0];
    }

    function endFishing(fish, why) {
        elDlg.onclick = null;
        if (fish) {
            bag[fish.name] = (bag[fish.name] || 0) + 1;
            coins += fish.price;
            updateHud();
            elDlgText.innerText = fish.emoji + " " + fish.name + eulReul(fish.name) +
                                  " 잡았어요!\n🪙+" + fish.price;
        } else {
            elDlgText.innerText = "🌊 " + (why || "놓쳤어요…") + "\n괜찮아요, 또 하면 되죠";
        }
        save();
        setTimeout(function () {
            elDlg.classList.remove("show");
            busy = false;
        }, 1400);
    }

    // =================================================================
    // 화면 / 저장
    // =================================================================
    function updateHud() {
        elCoins.innerText = "🪙 " + coins;
    }

    var toastTimer = null;
    function toast(msg) {
        elToast.innerText = msg;
        elToast.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { elToast.classList.remove("show"); }, 1600);
    }

    async function save() {
        try {
            await window.storage.set(SAVE_KEY, JSON.stringify({
                px: px, py: py, coins: coins, seeds: seeds, bag: bag, plots: plots, met: met
            }));
        } catch (e) {}
    }

    async function load() {
        try {
            var r = await window.storage.get(SAVE_KEY);
            if (!r || !r.value) return;
            var s = JSON.parse(r.value);
            px = s.px || px; py = s.py || py;
            coins = (typeof s.coins === "number") ? s.coins : coins;
            seeds = Object.assign(seeds, s.seeds || {});
            bag = s.bag || {};
            plots = s.plots || {};
            met = s.met || {};
        } catch (e) {}
    }

    // =================================================================
    // 입력
    // =================================================================
    var KEYMAP = {
        ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
        w: "up", s: "down", a: "left", d: "right",
        W: "up", S: "down", A: "left", D: "right"
    };

    function onKey(e) {
        if (e.key === "Escape") { if (e.type === "keydown") closeVillage(); return; }
        if (e.key === " " || e.key === "Enter") {
            if (e.type === "keydown") { e.preventDefault(); interact(); }
            return;
        }
        var dir = KEYMAP[e.key];
        if (!dir) return;
        e.preventDefault();
        keys[dir] = (e.type === "keydown");
    }

    function bindPad(btn, dir) {
        function on(e) { e.preventDefault(); keys[dir] = true; }
        function off(e) { e.preventDefault(); keys[dir] = false; }
        btn.addEventListener("touchstart", on, { passive: false });
        btn.addEventListener("touchend", off);
        btn.addEventListener("touchcancel", off);
        btn.addEventListener("mousedown", on);
        btn.addEventListener("mouseup", off);
        btn.addEventListener("mouseleave", off);
    }

    // =================================================================
    // 열기 / 닫기
    // =================================================================
    async function showVillage() {
        if (open) return;
        build();
        map = map || buildMap();

        px = 14 * TILE + TILE / 2;
        py = 10 * TILE + TILE / 2;
        await load();

        open = true;
        lastT = 0;
        busy = false;
        keys = {};

        document.getElementById("main-view").style.display = "none";
        elRoot.classList.add("show");

        if (!elWorld.children.length) drawWorld();
        renderPlots();
        updateHud();
        camera();
        loop();

        window.addEventListener("keydown", onKey, { passive: false });
        window.addEventListener("keyup", onKey);
        window.addEventListener("resize", camera);

        toast("방향키로 걸어보세요 · [확인]으로 말 걸기");
    }

    function closeVillage() {
        if (!open) return;
        open = false;
        busy = false;
        if (raf) { cancelAnimationFrame(raf); raf = null; }
        clearTimeout(fishTimer);
        window.removeEventListener("keydown", onKey);
        window.removeEventListener("keyup", onKey);
        window.removeEventListener("resize", camera);
        keys = {};
        elDlg.classList.remove("show");
        elDlg.onclick = null;
        elRoot.classList.remove("show");
        document.getElementById("main-view").style.display = "flex";
        window.scrollTo(0, 0);
        save();
    }

    function build() {
        if (elRoot) return;
        elRoot = document.createElement("div");
        elRoot.id = "village-view";
        elRoot.innerHTML =
            '<div id="village-world"></div>' +
            '<div id="village-top">' +
                '<button type="button" id="village-exit">← 나가기</button>' +
                '<span id="village-coins">🪙 0</span>' +
            '</div>' +
            '<div id="village-toast"></div>' +
            '<div id="village-dlg">' +
                '<div id="village-dlg-name"></div>' +
                '<div id="village-dlg-text"></div>' +
                '<div id="village-dlg-hint">계속하려면 누르세요</div>' +
            '</div>' +
            '<div id="village-pad">' +
                '<button type="button" data-dir="up">▲</button>' +
                '<div><button type="button" data-dir="left">◀</button>' +
                '<button type="button" data-dir="right">▶</button></div>' +
                '<button type="button" data-dir="down">▼</button>' +
            '</div>' +
            '<button type="button" id="village-act">확인</button>';

        document.body.appendChild(elRoot);

        elWorld = elRoot.querySelector("#village-world");
        elCoins = elRoot.querySelector("#village-coins");
        elDlg = elRoot.querySelector("#village-dlg");
        elDlgName = elRoot.querySelector("#village-dlg-name");
        elDlgText = elRoot.querySelector("#village-dlg-text");
        elToast = elRoot.querySelector("#village-toast");

        elRoot.querySelector("#village-exit").onclick = closeVillage;
        elRoot.querySelector("#village-act").onclick = interact;
        elRoot.querySelectorAll("#village-pad button").forEach(function (b) {
            bindPad(b, b.getAttribute("data-dir"));
        });
        elDlg.addEventListener("click", function () {
            if (elDlg.onclick) return;     // 낚시 중에는 낚시 쪽이 처리
            if (busy && dlgQueue !== null) advanceDialog();
        });
    }

    window.showVillage = showVillage;
    window.closeVillage = closeVillage;
    window.isVillageOpen = function () { return open; };
})();

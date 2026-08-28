/* =====================================================================
   제록이 섬 — 1인칭 3D, 캐릭터별 4개 구역
   ---------------------------------------------------------------------
   섬 가운데가 허브이고, 사방에 이웃 넷의 구역이 하나씩 있습니다.
   문 앞에 서면 "입장하기"가 뜨고, 들어가면 그 구역 전용 공간에서
   직접 걸어다니며 활동합니다.

       🍊 감귤 농장   감귤이   씨앗 심기 → 물주기 → 수확
       🎣 바다 낚시터 제록이   부두에서 낚시
       🌺 동백 꽃밭   동백이   꽃 심고, 꺾어서 이웃에게 선물
       🏪 하르방 상점 하르방   씨앗·미끼 사기, 수확물 팔기

   ■ 왜 구역을 나눴나
     한 섬에 전부 늘어놓으면 뭘 하러 왔는지 흐려집니다. 구역을 나누면
     들어가는 순간 목적이 분명해지고, 이웃도 자기 자리를 갖게 됩니다.

   ■ 꽃밭이 농장과 겹치지 않게
     농장은 "길러서 판다"(코인), 꽃밭은 "길러서 준다"(친밀도)로 갈랐습니다.
     선물을 받은 이웃은 대사가 달라집니다. 마음쉼터 앱이라 주고받는 쪽에
     무게를 뒀습니다.

   ■ 저장
     jeroki-island 키 하나에 구역별 상태까지 담습니다. 병아리 게임
     (jeroki-pet-save)과 섞이지 않습니다.
   ===================================================================== */
(function () {
    "use strict";

    var SAVE_KEY = "jeroki-island";

    var CFG = {
        eye: 1.6,
        speed: 4.2,
        lookSpeed: 0.0032,
        keyLook: 1.7,
        reach: 2.6,
        fishBite: 2.7,
        cropMs: 25000,        // 감귤 자라는 시간
        flowerMs: 18000       // 꽃 피는 시간
    };

    // ---- 이웃 -------------------------------------------------------------
    // talks: 한 편이 여러 줄입니다. 말을 걸 때마다 다음 편으로 넘어가고,
    // 다 보면 처음으로 돌아옵니다. 한 줄만 툭 던지고 끝나면 대화 같지가
    // 않아서, [다음]으로 이어지도록 편 단위로 묶었습니다.
    var VILLAGERS = {
        gyul: {
            name: "감귤이", role: "밭을 돌보는 귤", zone: "farm",
            talks: [
                ["안녕! 나는 감귤이야 🍊\n여긴 우리 감귤 농장이야.",
                 "씨앗을 심고 물을 주면\n금방 쑥쑥 자라.",
                 "다 자란 건 하르방 상점에\n팔면 코인이 돼!"],
                ["물을 주면 훨씬 빨리 자라.\n귀찮아도 한 번씩 들러줘.",
                 "근데 안 와도 죽진 않아.\n천천히 기다리고 있을게."],
                ["오늘은 좀 어때?",
                 "밭일 하다 보면 딴 생각이\n덜 나서 좋더라.",
                 "손으로 뭘 하는 게\n생각보다 도움이 돼."],
                ["귤은 겨울에 제일 달아.\n추울수록 단맛이 든대.",
                 "사람도 그런 데가 있는 것 같아."]
            ],
            gift: ["우와, 꽃이다!", "밭 한쪽에 꽂아둘게.\n고마워 🍊"],
            giftAlt: ["오, 이거 직접 키운 거야?", "잘 먹을게.\n고마워 🍊"]
        },
        jerok: {
            name: "제록이", role: "제주대 노루", zone: "fishing",
            talks: [
                ["안녕하세요! 저는 제록이예요 🦌",
                 "여기 부두에서 낚시할 수 있어요.\n미끼를 끼우고 던지면 돼요.",
                 "찌가 쏙 들어갈 때\n딱 맞춰 당기는 게 요령이에요."],
                ["안 잡혀도 괜찮아요.",
                 "바다 보고 앉아 있는 것만으로\n괜찮아지는 날이 있더라고요."],
                ["학교 다니다 보면\n숨 쉴 틈이 없을 때가 있죠.",
                 "그럴 땐 여기 와서\n아무것도 안 하고 앉아 있어요.",
                 "그래도 되는 거예요, 진짜로."],
                ["오늘 여기까지 온 것만으로\n충분히 잘한 거예요.",
                 "제가 그렇게 생각해요."]
            ],
            gift: ["저한테 주시는 거예요?", "…고맙습니다.\n오래 두고 볼게요."],
            giftAlt: ["저 주시려고 챙겨오신 거예요? 😊", "마음이 따뜻해지네요.\n고맙게 받을게요."]
        },
        dongbaek: {
            name: "동백이", role: "겨울에 피는 꽃", zone: "flower",
            talks: [
                ["안녕하세요.\n여긴 제 꽃밭이에요 🌺",
                 "꽃씨를 심으면 조금 뒤에 펴요.",
                 "핀 꽃은 꺾어서\n이웃한테 선물할 수 있어요."],
                ["저는 겨울에 피는 꽃이에요.\n다들 질 때 피죠.",
                 "제일 추울 때 피어서\n다들 놀라더라고요.",
                 "지금 힘들어도,\n그게 끝은 아니에요."],
                ["꽃은 매일 안 봐도 펴요.",
                 "며칠 못 와도 괜찮으니까\n너무 마음 쓰지 마세요."],
                ["선물은 받는 쪽보다\n주는 쪽이 더 따뜻해진대요.",
                 "그래서 저는 자꾸 나눠주고 싶어요."]
            ],
            gift: ["제 꽃을 저한테 주시다니 😊", "마음이 따뜻해지네요.\n잘 간직할게요."],
            giftAlt: ["저한테 주시는 거예요?", "…고맙습니다.\n잘 챙겨둘게요."]
        },
        harbang: {
            name: "하르방", role: "마을을 지켜온 돌", zone: "shop",
            talks: [
                ["어서 오라, 반갑수다.",
                 "필요한 거 있으면 골라보라.\n씨앗이영 미끼영 다 있수다.",
                 "가져온 거 있으면\n저기서 팔 수도 있고."],
                ["바쁘게 안 살아도 됩니다.",
                 "돌도 천 년을 그냥 서 있었주.",
                 "가만히 있는 것도\n하는 일이라."],
                ["요즘 아이들은 다 급해.",
                 "빨리 안 해도 되는 걸\n빨리 하려니 힘들지.",
                 "천천히 하라, 천천히."],
                ["여기 오래 서 있다 보난\n오가는 사람이 다 보여.",
                 "다들 애쓰고 있수다.\n자네도 그렇고."]
            ],
            gift: ["허허, 나한테 꽃을?", "오래 살고 볼 일이라.\n고맙수다."],
            giftAlt: ["허허, 나한테 이런 걸?", "오래 살고 볼 일이라.\n고맙수다."]
        }
    };
    var NPC_SPRITE = {
        jerok:    "assets/npc/jerok.png",
        dongbaek: "assets/npc/dongbaek.png",
        gyul:     "assets/npc/gyul.png",
        harbang:  "assets/npc/harbang.png"
    };

    // ---- 구역 -------------------------------------------------------------
    var ZONES = {
        farm:    { label: "감귤 농장",   emoji: "🍊", npc: "gyul",     at: [-7.5, -6.5] },
        fishing: { label: "바다 낚시터", emoji: "🎣", npc: "jerok",    at: [7.5, -6.5] },
        flower:  { label: "동백 꽃밭",   emoji: "🌺", npc: "dongbaek", at: [-9.5, 3] },
        shop:    { label: "하르방 상점", emoji: "🏪", npc: "harbang",  at: [9.5, 3] },
        home:    { label: "내 오두막",   emoji: "🏠", npc: null,       at: [0, 10.5] }
    };

    // ---- 물건 --------------------------------------------------------------
    var ITEMS = {
        seed:   { label: "씨앗",   emoji: "🌱", buy: 6,  sell: 0 },
        bait:   { label: "미끼",   emoji: "🪱", buy: 4,  sell: 0 },
        fseed:  { label: "꽃씨",   emoji: "🌾", buy: 5,  sell: 0 },
        crop:   { label: "감귤",   emoji: "🍊", buy: 0,  sell: 18 },
        fish:   { label: "물고기", emoji: "🐟", buy: 0,  sell: 22 },
        flower: { label: "꽃",     emoji: "🌸", buy: 0,  sell: 9 }
    };
    var BAG_ORDER = ["seed", "bait", "fseed", "crop", "fish", "flower"];
    var SHOP_BUY = ["seed", "bait", "fseed"];
    var SHOP_SELL = ["crop", "fish", "flower"];

    // ---- 돈 쓸 곳 ------------------------------------------------------------
    // 코인을 벌어도 씨앗만 다시 사면 제자리라, 모은 걸 쓸 데를 셋 만들었습니다.
    //   가구  내 오두막을 꾸밈 (눈에 보이는 목표)
    //   도구  실제로 편해짐 (성장 빨라짐 · 좋은 고기 확률)
    //   확장  밭과 꽃밭 칸을 늘림
    var FURNITURE = {
        rug:    { name: "양탄자", emoji: "🟥", price: 55,  floor: true },
        table:  { name: "탁자",   emoji: "🪵", price: 80 },
        chair:  { name: "의자",   emoji: "🪑", price: 50 },
        plant:  { name: "화분",   emoji: "🪴", price: 65 },
        lamp:   { name: "등불",   emoji: "🏮", price: 70 },
        shelf:  { name: "책장",   emoji: "📚", price: 110 },
        stove:  { name: "화로",   emoji: "🔥", price: 130 },
        bed:    { name: "침대",   emoji: "🛏️", price: 160 }
    };
    var FURN_ORDER = ["rug", "chair", "table", "plant", "lamp", "shelf", "stove", "bed"];

    // ---- 섬 꾸미기 ------------------------------------------------------------
    // 가구는 오두막 '안'을 꾸미는 것이고, 이건 섬 '밖'을 꾸미는 것입니다.
    // 복원이 '망가진 걸 되돌리는 일'이라면, 꾸미기는 '내 마음대로 두는 일'이에요.
    // 그래서 복원과 달리 온기가 아니라 코인으로 사고, 언제든 도로 거둘 수 있게 했습니다.
    //
    // glow 가 붙은 것은 밤처럼 어두운 구역에서 실제로 주변을 밝힙니다.
    var DECOR = {
        flowerbed: { name: "꽃화단",   emoji: "🌷", price: 70 },
        bench:     { name: "나무 벤치", emoji: "🪑", price: 90 },
        birdhouse: { name: "새집",     emoji: "🐦", price: 110 },
        stonelamp: { name: "돌등",     emoji: "🏮", price: 130, glow: { color: 0xffc978, power: 0.9, dist: 7, y: 1.1 } },
        harbang:   { name: "돌하르방", emoji: "🗿", price: 160 },
        pinwheel:  { name: "바람개비", emoji: "🌬️", price: 180, spin: true },
        swing:     { name: "그네",     emoji: "🎠", price: 210 },
        pond:      { name: "작은 연못", emoji: "⛲", price: 260 }
    };
    var DECOR_ORDER = ["flowerbed", "bench", "birdhouse", "stonelamp",
                       "harbang", "pinwheel", "swing", "pond"];
    var MAX_DECOR_GLOW = 3;   // 그 이상 불을 켜면 느려지기만 합니다

    var TOOLS = {
        water: {
            name: "물뿌리개", emoji: "💧",
            levels: ["대충 만든 것", "튼튼한 물뿌리개", "장인의 물뿌리개"],
            price: [0, 90, 220],
            desc: ["기본", "감귤이 25% 빨리 자라요", "감귤이 45% 빨리 자라요"]
        },
        rod: {
            name: "낚싯대", emoji: "🎣",
            levels: ["낡은 낚싯대", "단단한 낚싯대", "전설의 낚싯대"],
            price: [0, 110, 260],
            desc: ["기본", "귀한 물고기가 잘 물어요", "귀한 물고기가 훨씬 잘 물어요"]
        },
        spade: {
            name: "꽃삽", emoji: "🌱",
            levels: ["작은 꽃삽", "좋은 꽃삽", "장인의 꽃삽"],
            price: [0, 80, 190],
            desc: ["기본", "꽃이 25% 빨리 펴요", "꽃이 45% 빨리 펴요"]
        }
    };
    var TOOL_ORDER = ["water", "rod", "spade"];

    // 밭·꽃밭 확장 비용 (칸을 하나 열 때마다 비싸집니다)
    var PLOT_BASE = 4, BED_BASE = 4;          // 처음부터 열려 있는 칸 수
    function expandCost(openCount, base) { return 60 + (openCount - base) * 55; }

    var FISH_KINDS = [
        { name: "멸치",   emoji: "🐟", w: 45 },
        { name: "고등어", emoji: "🐠", w: 30 },
        { name: "한치",   emoji: "🦑", w: 17 },
        { name: "돌돔",   emoji: "🐡", w: 8 }
    ];

    // ---- 상태 ---------------------------------------------------------------
    var open = false, raf = null, lastT = 0, elapsed = 0, busy = false;
    var renderer, scene, camera, world = null;
    var yaw = 0, pitch = 0, pos = { x: 0, z: 6 }, keys = {};
    var area = "hub";

    var coins = 40;
    var bag = { seed: 3, bait: 2, fseed: 2, crop: 0, fish: 0, flower: 0 };
    var farmPlots = [];      // [{ stage:0|1|2, at, watered }]
    var flowerBeds = [];     // [{ stage:0|1, at }]
    var gifted = {};         // npcId -> 받은 꽃 수
    var talkIndex = {};
    var tools = { water: 0, rod: 0, spade: 0 };   // 강화 단계 0~2
    var owned = {};          // 사놓고 아직 안 놓은 가구  id -> 개수
    var homeSlots = [];      // 오두막 자리별로 놓인 가구 id (없으면 null)
    var decorOwned = {};     // 사놓고 아직 안 놓은 조경물  id -> 개수
    var decorSlots = {};     // 구역별로 놓인 조경물  area -> [id|null, ...]
    var openPlots = PLOT_BASE, openBeds = BED_BASE;

    var interactables = [], billboards = [];
    var ring = null, ringTarget = null;
    var fishStage = "idle", fishBiteAt = 0;
    var texCache = {};

    var elRoot, elCanvas, elMsg, elPrompt, elBag, elCoins, elWhere;
    var elDlg, elDlgName, elDlgRole, elDlgText, elPanel;
    var elDlgCount, elDlgNext, elDlgEnd;

    // =================================================================
    // 공용 만들기
    // =================================================================
    function mat(color, opts) {
        opts = opts || {};
        return new THREE.MeshLambertMaterial({
            color: color,
            transparent: opts.alpha !== undefined,
            opacity: opts.alpha !== undefined ? opts.alpha : 1,
            emissive: opts.emissive || 0x000000,
            side: opts.side || THREE.FrontSide
        });
    }
    // ---- 텍스처 ------------------------------------------------------------
    // 전부 CC0(저작권 완전 포기) 소재입니다. 학교 이름으로 스토어에 올릴 앱이라
    // 출처가 불분명한 이미지는 쓰지 않았습니다.
    //   grass  ambientCG Grass004
    //   sand   PolyHaven coast_sand_04     dirt  PolyHaven raked_dirt
    //   bark   PolyHaven bark_willow       plank PolyHaven plank_flooring
    //   stone  PolyHaven coral_stone_wall  (제주 현무암 돌담 느낌)
    //   roof   PolyHaven clay_roof_tiles_02 (기와)
    //   thatch PolyHaven thatch_roof_angled (초가)
    //   darkwood PolyHaven dark_wood        path  PolyHaven wood_stone_pathway
    //   plaster  PolyHaven clay_plaster
    var TEX_URL = {
        grass:    "assets/tex/grass.jpg",
        sand:     "assets/tex/sand.jpg",
        dirt:     "assets/tex/dirt.jpg",
        bark:     "assets/tex/bark.jpg",
        plank:    "assets/tex/plank.jpg",
        stone:    "assets/tex/stone.jpg",
        roof:     "assets/tex/roof.jpg",
        thatch:   "assets/tex/thatch.jpg",
        darkwood: "assets/tex/darkwood.jpg",
        path:     "assets/tex/path.jpg",
        plaster:  "assets/tex/plaster.jpg"
    };
    var TEX = {};

    function loadTextures() {
        var loader = new THREE.TextureLoader();
        var keys = Object.keys(TEX_URL);
        return Promise.all(keys.map(function (k) {
            return new Promise(function (res) {
                loader.load(TEX_URL[k], function (t) {
                    t.wrapS = t.wrapT = THREE.RepeatWrapping;
                    try { t.anisotropy = renderer.capabilities.getMaxAnisotropy(); } catch (e) {}
                    TEX[k] = t; res();
                }, undefined, function () { res(); });   // 실패해도 단색으로 계속
            });
        }));
    }

    // 같은 텍스처를 다른 배율로 쓰려면 복제해야 합니다 (repeat 이 공유되므로).
    // 복제본은 GPU 에 따로 올라가므로, 구역을 오갈 때마다 새로 만들지 않도록
    // 조합별로 하나씩만 만들어 재사용합니다.
    var matCache = {};
    function texMat(key, repeat, tint) {
        var id = key + "|" + repeat + "|" + (tint || 0);
        if (matCache[id]) return matCache[id];
        var t = TEX[key];
        if (!t) return mat(tint || 0xbcdc6e);
        var c = t.clone();
        c.needsUpdate = true;
        c.wrapS = c.wrapT = THREE.RepeatWrapping;
        c.repeat.set(repeat, repeat);
        var m = new THREE.MeshLambertMaterial({ map: c, color: tint || 0xffffff });
        matCache[id] = m;
        return m;
    }

    // ---- 하늘 · 물 (그림 대신 코드로 만듭니다) --------------------------------
    // 바다 사진을 타일로 깔면 이음새가 격자로 드러나서 오히려 어색합니다.
    // 물은 결이 흐르는 게 핵심이라, 무늬를 만들고 UV 를 밀어 물결을 냅니다.
    function makeSkyTex(top, bottom) {
        var c = document.createElement("canvas");
        c.width = 16; c.height = 256;
        var x = c.getContext("2d");
        var g = x.createLinearGradient(0, 256, 0, 0);
        g.addColorStop(0, bottom);
        g.addColorStop(0.55, top);
        g.addColorStop(1, top);
        x.fillStyle = g; x.fillRect(0, 0, 16, 256);
        var t = new THREE.CanvasTexture(c);
        t.needsUpdate = true;
        return t;
    }

    function makeWaterTex() {
        var S = 256;
        var c = document.createElement("canvas");
        c.width = c.height = S;
        var x = c.getContext("2d");
        x.fillStyle = "#2c93b8"; x.fillRect(0, 0, S, S);
        // 깊이감을 주는 얼룩
        for (var i = 0; i < 40; i++) {
            var r = 20 + Math.random() * 60;
            var gg = x.createRadialGradient(Math.random() * S, Math.random() * S, 0,
                                            Math.random() * S, Math.random() * S, r);
            gg.addColorStop(0, "rgba(120,220,235,0.16)");
            gg.addColorStop(1, "rgba(120,220,235,0)");
            x.fillStyle = gg;
            x.fillRect(0, 0, S, S);
        }
        // 물결 하이라이트
        x.strokeStyle = "rgba(255,255,255,0.20)";
        x.lineWidth = 2;
        for (var w = 0; w < 26; w++) {
            var y0 = Math.random() * S;
            x.beginPath();
            for (var px = 0; px <= S; px += 8) {
                var y = y0 + Math.sin((px / S) * Math.PI * 4 + w) * 6;
                if (px === 0) x.moveTo(px, y); else x.lineTo(px, y);
            }
            x.stroke();
        }
        var t = new THREE.CanvasTexture(c);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(14, 14);
        return t;
    }

    var waterTex = null, skyMesh = null, sunLight = null;

    // 그림자를 켜고 끄는 짧은 도우미. 바닥은 받기만, 물건은 드리우고 받기.
    function shade(m, cast, receive) {
        m.castShadow = cast !== false;
        m.receiveShadow = receive !== false;
        return m;
    }
    function shadeAll(g, cast, receive) {
        g.traverse(function (o) { if (o.isMesh) { o.castShadow = cast !== false; o.receiveShadow = receive !== false; } });
        return g;
    }

    function box(w, h, d, color) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color)); }
    function ball(r, color) { return new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat(color)); }
    function cyl(rt, rb, h, color, seg) { return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 10), mat(color)); }

    function at(m, x, y, z) { m.position.set(x, y, z); return m; }

    // 바닥은 텍스처를 반지름에 맞춰 촘촘히 깝니다
    function ground(radius, key, tint) {
        var g = new THREE.Mesh(new THREE.CircleGeometry(radius, 64),
                               texMat(key, Math.max(3, Math.round(radius / 1.6)), tint));
        g.rotation.x = -Math.PI / 2;
        g.receiveShadow = true;
        return g;
    }

    // 마을 게시판
    function noticeBoard() {
        var g = new THREE.Group();
        var wood = texMat("darkwood", 1);
        [-0.6, 0.6].forEach(function (x) {
            g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.13, 1.7, 0.13), wood), x, 0.85, 0));
        });
        var panel = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.0, 0.1), texMat("plank", 1));
        panel.position.y = 1.45; g.add(panel);
        var frame = box(1.9, 1.16, 0.06, 0x4a2f1a);
        frame.position.set(0, 1.45, -0.03); g.add(frame);
        var roof = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.12, 0.5), texMat("roof", 1));
        roof.position.y = 2.05; roof.rotation.x = 0.12; g.add(roof);
        // 붙어 있는 쪽지들
        [[-0.45, 1.6, 0xfff3d0], [0.2, 1.5, 0xffe8e0], [0.5, 1.72, 0xe6f2ff]].forEach(function (p) {
            var n = box(0.34, 0.26, 0.02, p[2]);
            n.position.set(p[0], p[1], 0.06);
            n.rotation.z = rnd(-0.12, 0.12);
            g.add(n);
        });
        return shadeAll(g);
    }

    function sea(y) {
        if (!waterTex) waterTex = makeWaterTex();
        var m = new THREE.MeshLambertMaterial({ map: waterTex, transparent: true, opacity: 0.94 });
        var s = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), m);
        s.rotation.x = -Math.PI / 2;
        s.position.y = y;
        return s;
    }

    function sky(topHex, botHex) {
        var t = makeSkyTex(topHex, botHex);
        var m = new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false, depthWrite: false });
        var s = new THREE.Mesh(new THREE.SphereGeometry(95, 24, 16), m);
        skyMesh = s;
        return s;
    }

    // =================================================================
    // 소품 라이브러리
    // 전부 기본 도형이지만, 층을 쌓고 크기를 조금씩 흩뜨리면
    // 구 세 개짜리 나무와는 완전히 달라 보입니다.
    // =================================================================
    var rnd = function (a, b) { return a + Math.random() * (b - a); };

    // type: tangerine | pine | camellia | plain
    function tree(x, z, type) {
        type = type || "plain";
        var g = new THREE.Group();
        g.position.set(x, 0, z);
        g.rotation.y = rnd(0, Math.PI * 2);
        var s = rnd(0.88, 1.14);

        if (type === "pine") {
            var th = 2.6 * s;
            var tr = new THREE.Mesh(new THREE.CylinderGeometry(0.11 * s, 0.2 * s, th, 8), texMat("bark", 2));
            tr.position.y = th / 2; g.add(tr);
            // 원뿔을 겹겹이 쌓아 소나무 실루엣
            for (var i = 0; i < 4; i++) {
                var f = 1 - i * 0.2;
                var c = new THREE.Mesh(new THREE.ConeGeometry(1.05 * s * f, 1.15 * s, 9),
                                       mat(i % 2 ? 0x3f7f34 : 0x4b9440));
                c.position.y = (1.35 + i * 0.62) * s;
                c.rotation.y = i * 0.5;
                g.add(c);
            }
        } else {
            var h = (type === "camellia" ? 1.5 : 1.85) * s;
            var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * s, 0.26 * s, h, 9), texMat("bark", 2));
            trunk.position.y = h / 2;
            trunk.rotation.z = rnd(-0.05, 0.05);
            g.add(trunk);

            // 잎 덩어리를 5~7개 흩어 붙여 실루엣을 울퉁불퉁하게
            var base = type === "camellia" ? 0x2f6f35 : 0x4a9438;
            var n = 6;
            for (var k = 0; k < n; k++) {
                var a = (Math.PI * 2 * k) / n + rnd(-0.3, 0.3);
                var rr = rnd(0.22, 0.5) * s;
                var cl = ball(rnd(0.45, 0.68) * s, base + (k % 3) * 0x0a1408);
                cl.position.set(Math.cos(a) * rr, h + rnd(0.15, 0.6) * s, Math.sin(a) * rr);
                cl.scale.y = rnd(0.72, 0.92);
                g.add(cl);
            }
            var top = ball(0.6 * s, base + 0x081006);
            top.position.y = h + 0.72 * s;
            top.scale.y = 0.8;
            g.add(top);

            if (type === "tangerine") {
                for (var q = 0; q < 7; q++) {
                    var ang = rnd(0, Math.PI * 2), rad = rnd(0.35, 0.72) * s;
                    g.add(at(ball(0.11 * s, 0xff9526),
                             Math.cos(ang) * rad, h + rnd(0.1, 0.7) * s, Math.sin(ang) * rad));
                }
            }
            if (type === "camellia") {
                for (var w = 0; w < 8; w++) {
                    var an2 = rnd(0, Math.PI * 2), rd2 = rnd(0.35, 0.7) * s;
                    var fl = ball(0.1 * s, 0xe23a2e);
                    fl.scale.y = 0.6;
                    fl.position.set(Math.cos(an2) * rd2, h + rnd(0.05, 0.65) * s, Math.sin(an2) * rd2);
                    g.add(fl);
                }
            }
        }
        return shadeAll(g);
    }

    // 흩뿌리는 소품(풀·자갈)은 자리를 무작위로 잡습니다.
    // 그러다 보니 꾸밀 자리 위에 떨어져서, 벤치나 연못을 놓으면
    // 그 사이로 풀이 삐죽 솟아 있었습니다. 들어갈 때마다 자리가 달라져서
    // 더 어수선해 보였어요. 그래서 꾸밀 자리 둘레는 비워 둡니다.
    function keepClear(x, z) {
        var spots = DECOR_SPOTS[area];
        if (!spots) return false;
        for (var i = 0; i < spots.length; i++) {
            if (Math.hypot(spots[i][0] - x, spots[i][1] - z) < 1.25) return true;
        }
        return false;
    }

    // 잔디 포기: 작은 원뿔을 흩뿌려 바닥이 밋밋하지 않게
    function grassTufts(cx, cz, radius, count) {
        var g = new THREE.Group();
        var m1 = mat(0x6fae4a), m2 = mat(0x82c257);
        for (var i = 0; i < count; i++) {
            var a = rnd(0, Math.PI * 2), r = Math.sqrt(Math.random()) * radius;
            var px = cx + Math.cos(a) * r, pz = cz + Math.sin(a) * r;
            if (keepClear(px, pz)) continue;
            var t = new THREE.Mesh(new THREE.ConeGeometry(rnd(0.07, 0.13), rnd(0.18, 0.34), 5),
                                   i % 2 ? m1 : m2);
            t.position.set(px, 0.12, pz);
            t.rotation.set(rnd(-0.15, 0.15), rnd(0, 3), rnd(-0.15, 0.15));
            g.add(t);
        }
        return shadeAll(g, false, false);
    }

    function pebbles(cx, cz, radius, count) {
        var g = new THREE.Group();
        var m = texMat("stone", 1);
        for (var i = 0; i < count; i++) {
            var a = rnd(0, Math.PI * 2), r = Math.sqrt(Math.random()) * radius;
            var px = cx + Math.cos(a) * r, pz = cz + Math.sin(a) * r;
            if (keepClear(px, pz)) continue;
            var s = rnd(0.09, 0.22);
            var p = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), m);
            p.position.set(px, s * 0.5, pz);
            p.rotation.set(rnd(0, 3), rnd(0, 3), rnd(0, 3));
            p.scale.y = 0.6;
            g.add(p);
        }
        // 자갈은 그림자를 드리워봐야 안 보이는데 그림자 통과 비용만 듭니다
        return shadeAll(g, false, true);
    }

    // 두 점 사이에 깔리는 디딤돌
    function pathStones(x1, z1, x2, z2, n) {
        var g = new THREE.Group();
        var m = texMat("path", 1);
        for (var i = 0; i <= n; i++) {
            var t = i / n;
            var s = new THREE.Mesh(new THREE.CylinderGeometry(rnd(0.32, 0.44), rnd(0.32, 0.44), 0.07, 7), m);
            s.position.set(x1 + (x2 - x1) * t + rnd(-0.16, 0.16), 0.035,
                           z1 + (z2 - z1) * t + rnd(-0.16, 0.16));
            s.rotation.y = rnd(0, 3);
            g.add(s);
        }
        return shadeAll(g, false, true);
    }

    // 가로대 울타리
    function fence(x1, z1, x2, z2, posts) {
        var g = new THREE.Group();
        var wood = texMat("darkwood", 1);
        var dx = (x2 - x1) / posts, dz = (z2 - z1) / posts;
        for (var i = 0; i <= posts; i++) {
            var p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.95, 0.12), wood);
            p.position.set(x1 + dx * i, 0.48, z1 + dz * i);
            g.add(p);
        }
        var len = Math.hypot(x2 - x1, z2 - z1);
        [0.4, 0.72].forEach(function (h) {
            var r = new THREE.Mesh(new THREE.BoxGeometry(len, 0.08, 0.07), wood);
            r.position.set((x1 + x2) / 2, h, (z1 + z2) / 2);
            r.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
            g.add(r);
        });
        return shadeAll(g);
    }

    // 구역 입구 문 — 돌 기단 + 기둥 + 기와 지붕 + 등
    function gate(tint, emoji, label) {
        var g = new THREE.Group();
        var wood = texMat("darkwood", 1);
        var stoneM = texMat("stone", 1);

        [-1.35, 1.35].forEach(function (x) {
            var base = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.34, 0.62), stoneM);
            base.position.set(x, 0.17, 0); g.add(base);
            var post = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.19, 2.7, 10), wood);
            post.position.set(x, 1.68, 0); g.add(post);
        });

        var beam = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.24, 0.32), wood);
        beam.position.y = 2.92; g.add(beam);
        var beam2 = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.16, 0.24), wood);
        beam2.position.y = 2.58; g.add(beam2);

        // 기와 지붕 두 겹
        var r1 = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.16, 1.05), texMat("roof", 2));
        r1.position.y = 3.12; g.add(r1);
        var r2 = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.14, 0.8), texMat("roof", 2));
        r2.position.y = 3.27; g.add(r2);
        // 처마 끝 살짝 들기
        [-1, 1].forEach(function (s) {
            var tip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.13, 1.05), texMat("roof", 1));
            tip.position.set(s * 2.0, 3.2, 0);
            tip.rotation.z = -s * 0.22;
            g.add(tip);
        });

        // 현판 — 색 띠만으로는 어디인지 몰라서 이모지·이름을 그려 넣습니다
        var frame = box(1.5, 1.5, 0.1, tint);
        frame.position.set(0, 1.95, 0.1); g.add(frame);
        if (emoji) {
            var sign = labelSign(emoji, label || "", "", 1.28);
            sign.position.set(0, 1.95, 0.17);
            g.add(sign);
        }

        // 등
        [-1.35, 1.35].forEach(function (x) {
            var lam = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.3, 8),
                                     mat(0xffdf9a, { emissive: 0x8a6a20 }));
            lam.position.set(x, 2.3, 0.34); g.add(lam);
            var cap = box(0.26, 0.06, 0.26, 0x4a2f1a);
            cap.position.set(x, 2.48, 0.34); g.add(cap);
        });

        return shadeAll(g);
    }

    function lantern(x, z) {
        var g = new THREE.Group();
        g.position.set(x, 0, z);
        g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.5, 8), texMat("darkwood", 1)).translateY(0.75));
        var l = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.32, 8),
                               mat(0xffe6a8, { emissive: 0x9a7526 }));
        l.position.y = 1.62; g.add(l);
        g.add(at(box(0.3, 0.07, 0.3, 0x4a2f1a), 0, 1.82, 0));
        return shadeAll(g);
    }

    function barrel(x, z) {
        var g = new THREE.Group();
        g.position.set(x, 0, z);
        var b = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.72, 12), texMat("plank", 1));
        b.position.y = 0.36; g.add(b);
        [0.16, 0.56].forEach(function (h) {
            var ring = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.03, 6, 14), mat(0x6b4a2a));
            ring.rotation.x = Math.PI / 2; ring.position.y = h; g.add(ring);
        });
        return shadeAll(g);
    }

    function crate(x, z, s) {
        s = s || 1;
        var g = new THREE.Group();
        g.position.set(x, 0, z);
        g.rotation.y = rnd(-0.4, 0.4);
        var c = new THREE.Mesh(new THREE.BoxGeometry(0.62 * s, 0.5 * s, 0.62 * s), texMat("plank", 1));
        c.position.y = 0.25 * s; g.add(c);
        var lid = box(0.66 * s, 0.05 * s, 0.66 * s, 0x8a6238);
        lid.position.y = 0.52 * s; g.add(lid);
        return shadeAll(g);
    }

    function sack(x, z) {
        var g = new THREE.Group();
        g.position.set(x, 0, z);
        var s = ball(0.26, 0xd9c89a);
        s.scale.set(1, 1.25, 0.85); s.position.y = 0.3; g.add(s);
        g.add(at(cyl(0.09, 0.13, 0.16, 0xbfae82, 8), 0, 0.62, 0));
        return shadeAll(g);
    }

    function bench(x, z, rot) {
        var g = new THREE.Group();
        g.position.set(x, 0, z);
        g.rotation.y = rot || 0;
        var wood = texMat("plank", 1);
        [-0.2, 0.2].forEach(function (dz) {
            var p = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.09, 0.26), wood);
            p.position.set(0, 0.46, dz); g.add(p);
        });
        var back = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.34, 0.08), wood);
        back.position.set(0, 0.74, -0.28); g.add(back);
        [-0.62, 0.62].forEach(function (dx) {
            g.add(at(box(0.11, 0.46, 0.5, 0x5d3a1e), dx, 0.23, 0));
        });
        return shadeAll(g);
    }

    function boat(x, z, rot) {
        var g = new THREE.Group();
        g.position.set(x, 0, z);
        g.rotation.y = rot || 0;
        var wood = texMat("plank", 1);
        var hull = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.34, 2.5, 10, 1, false, 0, Math.PI), wood);
        hull.rotation.set(Math.PI / 2, 0, Math.PI / 2);
        hull.position.y = 0.2; g.add(hull);
        var rim = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 6, 16), texMat("darkwood", 1));
        rim.rotation.x = Math.PI / 2; rim.position.y = 0.42; rim.scale.x = 2.4; g.add(rim);
        var seat = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.07, 0.4), wood);
        seat.position.y = 0.34; g.add(seat);
        return shadeAll(g);
    }

    function scarecrow(x, z) {
        var g = new THREE.Group();
        g.position.set(x, 0, z);
        g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.9, 6), texMat("darkwood", 1)).translateY(0.95));
        var arm = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.09, 0.09), texMat("darkwood", 1));
        arm.position.y = 1.4; g.add(arm);
        var body = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.8, 8), mat(0xb8563f));
        body.position.y = 1.15; g.add(body);
        var head = ball(0.24, 0xe6d3a0);
        head.position.y = 1.78; g.add(head);
        var hat = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.3, 10), texMat("thatch", 1));
        hat.position.y = 2.0; g.add(hat);
        return shadeAll(g);
    }

    // 벽 + 지붕 오두막. roofKey: "thatch"(초가) | "roof"(기와)
    function hut(x, z, rot, w, d, roofKey) {
        var g = new THREE.Group();
        g.position.set(x, 0, z);
        g.rotation.y = rot || 0;
        var wallM = texMat("plaster", 2);
        var wood = texMat("darkwood", 1);

        var wall = new THREE.Mesh(new THREE.BoxGeometry(w, 1.7, d), wallM);
        wall.position.y = 0.85; g.add(wall);

        // 모서리 기둥
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) {
            var p = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.8, 0.16), wood);
            p.position.set(c[0] * (w / 2 - 0.05), 0.9, c[1] * (d / 2 - 0.05));
            g.add(p);
        });

        // 지붕: 사각뿔
        var roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.82, 1.05, 4),
                                  texMat(roofKey || "thatch", 2));
        roof.position.y = 2.28;
        roof.rotation.y = Math.PI / 4;
        g.add(roof);
        var eave = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.1, d + 0.5), wood);
        eave.position.y = 1.76; g.add(eave);

        // 문
        var door = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.2, 0.07), wood);
        door.position.set(0, 0.6, d / 2 + 0.02); g.add(door);

        return shadeAll(g);
    }

    // 이모지·글자를 캔버스에 그려 3D 안에 세우는 표지판.
    // 상점에서 "이게 뭘 파는 자리인지"를 도형만으로는 알 수 없어서 씁니다.
    var labelTexCache = {};
    function labelTexture(emoji, line1, line2) {
        var key = emoji + "|" + line1 + "|" + (line2 || "");
        if (labelTexCache[key]) return labelTexCache[key];
        var W = 256, H = 256;
        var c = document.createElement("canvas");
        c.width = W; c.height = H;
        var x = c.getContext("2d");

        // 판자 팻말.
        //
        // 예전에는 크림색 둥근 카드였는데, 나무·돌·초가로 지은 섬 안에서
        // 혼자 화면 UI 처럼 붕 떠 보였습니다. 그래서 실제로 널빤지를 잇대
        // 만든 팻말처럼 그립니다 — 나뭇결, 판자 이음매, 모서리 못까지.
        var r = 10;
        x.fillStyle = "#b8895a";
        x.beginPath();
        x.moveTo(12 + r, 12); x.lineTo(W - 12 - r, 12); x.quadraticCurveTo(W - 12, 12, W - 12, 12 + r);
        x.lineTo(W - 12, H - 12 - r); x.quadraticCurveTo(W - 12, H - 12, W - 12 - r, H - 12);
        x.lineTo(12 + r, H - 12); x.quadraticCurveTo(12, H - 12, 12, H - 12 - r);
        x.lineTo(12, 12 + r); x.quadraticCurveTo(12, 12, 12 + r, 12);
        x.closePath(); x.fill();

        // 나뭇결 — 세로로 흐르는 옅은 줄
        x.save();
        x.clip();
        for (var gi = 0; gi < 26; gi++) {
            x.strokeStyle = gi % 3 ? "rgba(120,80,45,0.13)" : "rgba(220,180,130,0.16)";
            x.lineWidth = gi % 4 === 0 ? 3 : 1.5;
            var gx = 14 + gi * 9.4;
            x.beginPath();
            x.moveTo(gx, 8);
            x.bezierCurveTo(gx + 6, H * 0.34, gx - 6, H * 0.68, gx + 2, H - 8);
            x.stroke();
        }
        // 판자 이음매 두 줄
        x.strokeStyle = "rgba(92,58,30,0.42)";
        x.lineWidth = 3;
        [H * 0.36, H * 0.72].forEach(function (yy) {
            x.beginPath(); x.moveTo(12, yy); x.lineTo(W - 12, yy); x.stroke();
        });
        x.restore();

        // 테두리 (두 겹으로 깎은 느낌)
        x.strokeStyle = "#5f3d20";
        x.lineWidth = 9;
        x.beginPath();
        x.moveTo(12 + r, 12); x.lineTo(W - 12 - r, 12); x.quadraticCurveTo(W - 12, 12, W - 12, 12 + r);
        x.lineTo(W - 12, H - 12 - r); x.quadraticCurveTo(W - 12, H - 12, W - 12 - r, H - 12);
        x.lineTo(12 + r, H - 12); x.quadraticCurveTo(12, H - 12, 12, H - 12 - r);
        x.lineTo(12, 12 + r); x.quadraticCurveTo(12, 12, 12 + r, 12);
        x.closePath(); x.stroke();

        // 모서리 못
        x.fillStyle = "#4a3524";
        [[30, 30], [W - 30, 30], [30, H - 30], [W - 30, H - 30]].forEach(function (p) {
            x.beginPath(); x.arc(p[0], p[1], 5.5, 0, 6.3); x.fill();
        });

        x.textAlign = "center";
        x.textBaseline = "middle";
        // 그림은 나무에 지진 것처럼 — 아래로 그림자를 한 겹 깔아 파인 느낌을 냅니다
        var ey = line2 ? 92 : 104;
        x.save();
        x.globalAlpha = 0.3;
        x.font = "94px system-ui, 'Apple Color Emoji', 'Segoe UI Emoji'";
        x.fillStyle = "#3a2412";
        x.fillText(emoji, W / 2 + 2, ey + 3);
        x.restore();
        x.font = "94px system-ui, 'Apple Color Emoji', 'Segoe UI Emoji'";
        x.fillText(emoji, W / 2, ey);

        // 글씨도 새긴 것처럼 — 밝은 선 위에 짙은 글씨
        function carved(txt, yy, size, color) {
            x.font = "bold " + size + "px 'Noto Sans KR', system-ui, sans-serif";
            x.fillStyle = "rgba(240,214,178,0.55)";
            x.fillText(txt, W / 2, yy + 2);
            x.fillStyle = color;
            x.fillText(txt, W / 2, yy);
        }
        carved(line1, line2 ? 168 : 186, 40, "#402a15");
        if (line2) carved(line2, 214, 34, "#6b4a24");

        var t = new THREE.CanvasTexture(c);
        t.needsUpdate = true;
        labelTexCache[key] = t;
        return t;
    }

    // 팻말은 '그림 한 장'이 아니라 실제로 걸린 널빤지여야 합니다.
    //
    // 고친 것 두 가지:
    //  1) MeshBasic → MeshLambert. 예전에는 조명을 아예 안 받아서,
    //     폐허 구역에서 햇빛이 0.55 로 어두워져도 팻말만 100% 밝기로
    //     혼자 떠 보였습니다. 이제 주변과 같이 어두워지고 같이 밝아집니다.
    //  2) 두께 0 인 평면 한 장이라 옆에서 보면 종이처럼 사라졌습니다.
    //     뒤에 얇은 판을 대서 실제 두께를 줬어요.
    function labelSign(emoji, line1, line2, size) {
        var s = size || 0.72;
        var g = new THREE.Group();

        var back = new THREE.Mesh(new THREE.BoxGeometry(s * 1.02, s * 1.02, s * 0.07),
                                  texMat("darkwood", 1));
        back.position.z = -s * 0.045;
        g.add(shade(back));

        var face = new THREE.Mesh(new THREE.PlaneGeometry(s, s),
            new THREE.MeshLambertMaterial({
                map: labelTexture(emoji, line1, line2),
                transparent: true,
                // 살짝 스스로 밝아 어두운 구역에서도 글씨는 읽힙니다
                emissive: 0x2a2018
            }));
        face.position.z = s * 0.005;
        g.add(face);
        return g;
    }

    // 꽃 한 송이.
    // 꽃잎을 다섯 조각으로 만들면 한 송이에 9개 메시가 들어가서, 꽃밭 하나에
    // 400개가 넘어갑니다. 게임 거리에서는 차이가 안 보이므로 납작한 도넛
    // 하나로 꽃잎을 대신해 세 조각으로 줄였습니다.
    var flowerMatCache = {};
    function flowerPetalMat(color) {
        if (!flowerMatCache[color]) flowerMatCache[color] = mat(color);
        return flowerMatCache[color];
    }
    var STEM_MAT = null, CORE_MAT = null;

    function flowerMesh(color, scale) {
        var s = scale || 1;
        if (!STEM_MAT) STEM_MAT = mat(0x4a8a38);
        if (!CORE_MAT) CORE_MAT = mat(0xffd23f);
        var g = new THREE.Group();
        var stem = new THREE.Mesh(new THREE.CylinderGeometry(0.024 * s, 0.032 * s, 0.44 * s, 5), STEM_MAT);
        stem.position.y = 0.22 * s; g.add(stem);
        var petals = new THREE.Mesh(new THREE.TorusGeometry(0.11 * s, 0.062 * s, 6, 9), flowerPetalMat(color));
        petals.rotation.x = -Math.PI / 2;
        petals.position.y = 0.47 * s;
        g.add(petals);
        var core = new THREE.Mesh(new THREE.SphereGeometry(0.06 * s, 8, 6), CORE_MAT);
        core.position.y = 0.49 * s; g.add(core);
        return shadeAll(g);
    }

    // ---- 스프라이트 이웃 -----------------------------------------------------
    // 지금 화면에 있는 이웃 그림들의 재질 (구역 분위기에 맞춰 색을 눌러 줍니다)
    var npcSprites = [];
    var npcTint = 1;

    function applyNpcTint() {
        // amb 0.55(폐허) → 0.74,  1.05(복원 완료) → 1.0
        var k = Math.max(0.7, Math.min(1, 0.35 + npcTint * 0.62));
        npcSprites.forEach(function (m) { if (m && m.color) m.color.setScalar(k); });
    }

    function addVillager(id, x, z) {
        var v = VILLAGERS[id];
        var g = new THREE.Group();
        g.position.set(x, 0, z);

        // 그림이 오기 전/실패 시 보이는 임시 몸통
        var stub = new THREE.Group();
        stub.add(at(ball(0.36, 0xd8c8a8), 0, 0.7, 0));
        stub.add(at(ball(0.4, 0xe8d8b8), 0, 1.35, 0));
        g.add(stub);
        world.add(g);

        var url = NPC_SPRITE[id];
        if (url) {
            var apply = function (tex) {
                var iw = tex.image.width, ih = tex.image.height;
                var hh = 2.1, ww = hh * (iw / Math.max(1, ih));
                try { tex.anisotropy = renderer.capabilities.getMaxAnisotropy(); } catch (e) {}
                tex.minFilter = THREE.LinearMipmapLinearFilter;
                tex.magFilter = THREE.LinearFilter;
                var pl = new THREE.Mesh(
                    new THREE.PlaneGeometry(ww, hh),
                    new THREE.MeshBasicMaterial({
                        map: tex, transparent: true, alphaTest: 0.12,
                        side: THREE.DoubleSide, depthWrite: true
                    })
                );
                pl.position.y = hh / 2;
                g.add(pl);
                stub.visible = false;
                billboards.push(pl);
                // 이웃 그림은 조명을 안 받는 재질이라, 폐허 구역에서 온 세상이
                // 어두워져도 혼자 쨍하게 밝아 그림만 붙여놓은 것처럼 보였습니다.
                // 그렇다고 조명을 받게 하면 그림이 뭉개져서, 구역 분위기에 맞춰
                // 색만 살짝 눌러 줍니다.
                npcSprites.push(pl.material);
                applyNpcTint();
            };
            if (texCache[url]) apply(texCache[url]);
            else new THREE.TextureLoader().load(url, function (t) { texCache[url] = t; if (open) apply(t); }, undefined, function () {});
        }

        addI("villager", x, z, VILLAGERS[id].name + waGwa(VILLAGERS[id].name) + " 이야기하기", { npc: id });
        return g;
    }

    function waGwa(w) {
        var c = w.charCodeAt(w.length - 1);
        if (c < 0xAC00 || c > 0xD7A3) return "와";
        return ((c - 0xAC00) % 28) ? "과" : "와";
    }
    function eulReul(w) {
        var c = w.charCodeAt(w.length - 1);
        if (c < 0xAC00 || c > 0xD7A3) return "를";
        return ((c - 0xAC00) % 28) ? "을" : "를";
    }
    // 로/으로 — 받침이 없거나 ㄹ 받침이면 '로'
    function euRo(w) {
        var c = w.charCodeAt(w.length - 1);
        if (c < 0xAC00 || c > 0xD7A3) return "로";
        var jong = (c - 0xAC00) % 28;
        return (jong === 0 || jong === 8) ? "로" : "으로";
    }

    function addI(kind, x, z, label, extra) {
        var o = { kind: kind, x: x, z: z, label: label };
        if (extra) for (var k in extra) o[k] = extra[k];
        interactables.push(o);
        return o;
    }

    // 다 자란 감귤나무. 덜 자란 새싹과 한눈에 구분되도록
    // 열매를 여러 개 달고 잎도 풍성하게 만듭니다.
    function ripeTangerinePlant() {
        var g = new THREE.Group();
        var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.085, 0.52, 7), texMat("bark", 1));
        trunk.position.y = 0.26; g.add(trunk);

        [[0, 0.74, 0, 0.27], [0.19, 0.62, 0.11, 0.21], [-0.17, 0.64, -0.09, 0.2], [0.04, 0.6, -0.2, 0.18]]
            .forEach(function (p) {
                var lf = ball(p[3], 0x4f9438);
                lf.position.set(p[0], p[1], p[2]);
                lf.scale.y = 0.74;
                g.add(lf);
            });

        [[0.19, 0.6, 0.15], [-0.18, 0.58, -0.12], [0.03, 0.86, -0.1], [-0.06, 0.55, 0.22]]
            .forEach(function (p) {
                var f = ball(0.105, 0xff9526);
                f.position.set(p[0], p[1], p[2]);
                g.add(f);
                var tip = ball(0.03, 0x3d7a30);
                tip.scale.set(1.7, 0.5, 1);
                tip.position.set(p[0], p[1] + 0.1, p[2]);
                g.add(tip);
            });
        return shadeAll(g);
    }

    // 활짝 핀 꽃. 꽃잎을 두 겹으로 겹쳐 봉오리와 확실히 달라 보이게.
    function bloomMesh(color, scale) {
        var s = scale || 1;
        if (!STEM_MAT) STEM_MAT = mat(0x4a8a38);
        var g = new THREE.Group();
        var stem = new THREE.Mesh(new THREE.CylinderGeometry(0.026 * s, 0.034 * s, 0.5 * s, 5), STEM_MAT);
        stem.position.y = 0.25 * s; g.add(stem);

        [-1, 1].forEach(function (d) {
            var lf = ball(0.1 * s, 0x57a341);
            lf.scale.set(1.6, 0.28, 0.8);
            lf.position.set(d * 0.1 * s, 0.22 * s, 0);
            lf.rotation.z = -d * 0.55;
            g.add(lf);
        });

        var outer = new THREE.Mesh(new THREE.TorusGeometry(0.15 * s, 0.08 * s, 6, 11), flowerPetalMat(color));
        outer.rotation.x = -Math.PI / 2;
        outer.position.y = 0.53 * s;
        g.add(outer);

        var inner = new THREE.Mesh(new THREE.TorusGeometry(0.085 * s, 0.055 * s, 6, 9), flowerPetalMat(color));
        inner.rotation.x = -Math.PI / 2;
        inner.position.y = 0.585 * s;
        g.add(inner);

        if (!CORE_MAT) CORE_MAT = mat(0xffd23f);
        var core = new THREE.Mesh(new THREE.SphereGeometry(0.055 * s, 8, 6), CORE_MAT);
        core.position.y = 0.61 * s;
        g.add(core);
        return shadeAll(g);
    }

    // =================================================================
    // 낚싯대 (1인칭 손에 든 것)
    //
    // 예전에는 부두에 찌만 하나 떠 있고 메시지로만 안내해서 "내가 낚시를
    // 하고 있다"는 느낌이 없었습니다. 카메라에 낚싯대를 붙여 항상 손에
    // 들려 있게 하고, 던지면 줄이 앞으로 뻗어 찌가 물에 떠 있게 합니다.
    // =================================================================
    var rodView = null, rodTip = null, castBobber = null, castLine = null;
    var castAt = null;          // 던진 지점 {x,z}
    var rodKick = 0;            // 챌 때 튀어오르는 양

    function makeRod() {
        var g = new THREE.Group();

        // 손잡이 (코르크)
        var grip = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.042, 0.28, 8), mat(0xc9a06a));
        grip.position.set(0, 0, 0.1);
        grip.rotation.x = Math.PI / 2;
        g.add(grip);

        // 릴
        var reel = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.05, 12), mat(0x6f7378));
        reel.position.set(-0.055, -0.035, 0.02);
        reel.rotation.z = Math.PI / 2;
        g.add(reel);
        var knob = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), mat(0x3a3d40));
        knob.position.set(-0.1, -0.035, 0.02);
        g.add(knob);
        var seat = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.1), mat(0x3a3d40));
        seat.position.set(0, -0.012, 0.0);
        g.add(seat);

        // 대 — 앞으로 길게, 끝으로 갈수록 가늘게
        var shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.022, 1.55, 7), mat(0x2f3a44));
        shaft.position.set(0, 0.035, -0.8);
        shaft.rotation.x = Math.PI / 2;
        g.add(shaft);

        // 가이드 링
        [-0.35, -0.72, -1.08, -1.4].forEach(function (z, i) {
            var ring = new THREE.Mesh(new THREE.TorusGeometry(0.016 - i * 0.002, 0.004, 5, 9), mat(0xb9bfc5));
            ring.position.set(0, 0.02, z);
            g.add(ring);
        });

        // 줄이 나가는 끝점
        rodTip = new THREE.Object3D();
        rodTip.position.set(0, 0.04, -1.56);
        g.add(rodTip);

        g.traverse(function (o) { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
        return g;
    }

    // =================================================================
    // 가구 — 사서 오두막에 놓는 것들
    // =================================================================
    function makeFurniture(id) {
        var g = new THREE.Group();
        var wood = texMat("plank", 1), dark = texMat("darkwood", 1);

        if (id === "rug") {
            // 동심원 세 겹 + 가장자리 술
            [[0.98, 0xb04434], [0.74, 0xe0a758], [0.5, 0xc0523f], [0.24, 0xf2dcae]]
                .forEach(function (r, i) {
                    var d = new THREE.Mesh(new THREE.CircleGeometry(r[0], 28), mat(r[1]));
                    d.rotation.x = -Math.PI / 2;
                    d.position.y = 0.012 + i * 0.003;
                    d.receiveShadow = true;
                    g.add(d);
                });
            for (var t = 0; t < 28; t++) {
                var ta = (Math.PI * 2 * t) / 28;
                var tas = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 0.11), mat(0xf2dcae));
                tas.position.set(Math.cos(ta) * 1.04, 0.012, Math.sin(ta) * 1.04);
                tas.rotation.y = -ta;
                g.add(tas);
            }
            return g;                                  // 바닥에 깔리는 건 그림자 안 만듦
        }

        if (id === "table") {
            var topM = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 18), wood);
            topM.position.y = 0.64; g.add(topM);
            // 상판 테두리
            g.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.03, 6, 20), dark), 0, 0.64, 0));
            // 깎아 만든 듯한 기둥
            g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.3, 10), dark), 0, 0.46, 0));
            g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), dark), 0, 0.3, 0));
            g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.22, 10), dark), 0, 0.16, 0));
            // 십자 받침
            [0, Math.PI / 2].forEach(function (a) {
                var foot = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.06, 0.12), dark);
                foot.position.y = 0.04; foot.rotation.y = a; g.add(foot);
            });
            // 찻잔 한 벌
            var saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.015, 12), mat(0xf5f0e2));
            saucer.position.set(0.14, 0.675, 0.06); g.add(saucer);
            var cup = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.07, 12), mat(0xf5f0e2));
            cup.position.set(0.14, 0.72, 0.06); g.add(cup);
            var tea = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.01, 10), mat(0x8a5a2a));
            tea.position.set(0.14, 0.755, 0.06); g.add(tea);
            var bookT = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.035, 0.16), mat(0x3f7f9e));
            bookT.position.set(-0.16, 0.685, -0.05); bookT.rotation.y = 0.3; g.add(bookT);

        } else if (id === "chair") {
            // 쿠션 얹은 좌판
            g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.06, 0.46), wood), 0, 0.42, 0));
            var cush = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.07, 0.42), mat(0xc0523f));
            cush.position.y = 0.485; g.add(cush);
            // 등받이 — 기둥 둘 + 살 셋
            [-0.2, 0.2].forEach(function (x) {
                g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.62, 0.055), dark), x, 0.76, -0.2));
            });
            [0.62, 0.82, 1.0].forEach(function (y) {
                g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.07, 0.04), wood), 0, y, -0.2));
            });
            g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.06, 0.06), dark), 0, 1.08, -0.2));
            // 살짝 벌어진 다리 + 가로대
            [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].forEach(function (p) {
                var lg = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.42, 0.055), dark);
                lg.position.set(p[0], 0.21, p[1]);
                lg.rotation.z = p[0] > 0 ? -0.05 : 0.05;
                lg.rotation.x = p[1] > 0 ? 0.05 : -0.05;
                g.add(lg);
            });
            [-0.18, 0.18].forEach(function (z) {
                g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.04, 0.04), dark), 0, 0.14, z));
            });

        } else if (id === "plant") {
            var pot = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.17, 0.34, 14), mat(0xc4744a));
            pot.position.y = 0.17; g.add(pot);
            g.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.035, 6, 16), mat(0xa85f38)), 0, 0.34, 0));
            var soil = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.04, 14), mat(0x5a4028));
            soil.position.y = 0.35; g.add(soil);
            // 길쭉한 잎을 방향과 길이를 달리해 꽂습니다
            for (var i = 0; i < 9; i++) {
                var a = (Math.PI * 2 * i) / 9 + rnd(-0.2, 0.2);
                var len = rnd(0.34, 0.62);
                var lf = new THREE.Mesh(new THREE.ConeGeometry(0.07, len, 5),
                                        mat(i % 3 === 0 ? 0x3f8a2e : (i % 3 === 1 ? 0x54a83c : 0x6cbf4c)));
                lf.position.set(Math.cos(a) * 0.1, 0.37 + len / 2, Math.sin(a) * 0.1);
                lf.rotation.z = -Math.cos(a) * 0.5;
                lf.rotation.x = Math.sin(a) * 0.5;
                g.add(lf);
            }
            [0, 2.1, 4.2].forEach(function (a2) {
                var fl = ball(0.055, 0xff8ec2);
                fl.position.set(Math.cos(a2) * 0.16, 0.66, Math.sin(a2) * 0.16);
                g.add(fl);
            });

        } else if (id === "lamp") {
            g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.22, 0.06, 14), dark), 0, 0.03, 0));
            g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.05, 12), dark), 0, 0.08, 0));
            g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.95, 8), mat(0x6f5233)), 0, 0.56, 0));
            g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), dark), 0, 1.04, 0));
            // 갓 — 안쪽이 밝게 빛나도록 두 겹
            var shOut = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 0.36, 16, 1, true),
                                       new THREE.MeshLambertMaterial({ color: 0xf0d9a8, side: THREE.DoubleSide }));
            shOut.position.y = 1.26; g.add(shOut);
            var bulb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 9),
                                      mat(0xfff0c0, { emissive: 0xd8a840 }));
            bulb.position.y = 1.24; g.add(bulb);
            g.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.02, 6, 16), dark), 0, 1.44, 0));

        } else if (id === "shelf") {
            g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.94, 1.42, 0.06), wood), 0, 0.71, -0.17));
            [-0.44, 0.44].forEach(function (x) {
                g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.42, 0.36), dark), x, 0.71, 0));
            });
            g.add(at(new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.07, 0.42), dark), 0, 1.45, 0));
            g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.07, 0.36), dark), 0, 0.03, 0));

            var bookCols = [0xc0523f, 0x3f7f9e, 0xd6a53f, 0x6a8f5a, 0x8a5fa8, 0xd97a4a];
            [0.26, 0.66, 1.06].forEach(function (y, si) {
                g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.05, 0.34), wood), 0, y, 0));
                // 책을 크기·기울기 다르게 꽂아 정렬 안 된 느낌
                var x = -0.36;
                for (var b = 0; b < 7 && x < 0.34; b++) {
                    var bw = rnd(0.045, 0.085), bh = rnd(0.2, 0.3);
                    var bk = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, rnd(0.2, 0.28)),
                                            mat(bookCols[(b + si * 2) % bookCols.length]));
                    bk.position.set(x + bw / 2, y + bh / 2 + 0.025, 0);
                    if (b === 4 && si === 1) bk.rotation.z = 0.28;   // 한 권은 기대어
                    g.add(bk);
                    x += bw + 0.012;
                }
            });
            // 맨 위에 작은 화분
            var tp = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.075, 0.13, 10), mat(0xc4744a));
            tp.position.set(0.3, 1.55, 0); g.add(tp);
            for (var q = 0; q < 4; q++) {
                var qa = (Math.PI * 2 * q) / 4;
                var ql = ball(0.07, 0x54a83c);
                ql.scale.set(1, 1.5, 0.6);
                ql.position.set(0.3 + Math.cos(qa) * 0.05, 1.66, Math.sin(qa) * 0.05);
                g.add(ql);
            }

        } else if (id === "stove") {
            // 다리 셋 달린 무쇠 화로
            [0, 2.09, 4.19].forEach(function (a) {
                var lg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.26, 6), mat(0x3a3d40));
                lg.position.set(Math.cos(a) * 0.26, 0.13, Math.sin(a) * 0.26);
                lg.rotation.z = -Math.cos(a) * 0.18;
                lg.rotation.x = Math.sin(a) * 0.18;
                g.add(lg);
            });
            var bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.26, 0.3, 16), texMat("stone", 1));
            bowl.position.y = 0.4; g.add(bowl);
            g.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.035, 6, 18), mat(0x3a3d40)), 0, 0.55, 0));
            // 숯 + 불꽃
            var ash = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.03, 14), mat(0x4a4440));
            ash.position.y = 0.53; g.add(ash);
            for (var e = 0; e < 6; e++) {
                var ea = (Math.PI * 2 * e) / 6;
                // ball() 은 색만 받으므로 발광이 필요하면 직접 만듭니다
                var em = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8),
                                        mat(0xd8562a, { emissive: 0x8a2a08 }));
                em.position.set(Math.cos(ea) * 0.16, 0.56, Math.sin(ea) * 0.16);
                em.scale.y = 0.6;
                g.add(em);
            }
            var f1 = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.4, 9),
                                    mat(0xff8a2e, { emissive: 0xb04a10 }));
            f1.position.y = 0.76; g.add(f1);
            var f2 = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.24, 8),
                                    mat(0xffd23f, { emissive: 0xc08a10 }));
            f2.position.y = 0.8; g.add(f2);

        } else if (id === "bed") {
            // 살 달린 머리판
            g.add(at(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 0.1), dark), 0, 0.92, -0.95));
            [-0.42, -0.14, 0.14, 0.42].forEach(function (x) {
                g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.62, 0.07), dark), x, 0.6, -0.95));
            });
            [-0.52, 0.52].forEach(function (x) {
                g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.78, 0.1), dark), x, 0.5, -0.95));
            });
            // 프레임 · 매트리스
            g.add(at(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 2.0), dark), 0, 0.24, 0));
            var mattress = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.18, 1.88), mat(0xf5f0e2));
            mattress.position.y = 0.39; g.add(mattress);
            // 이불 + 접힌 깃
            var duvet = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.16, 1.24), mat(0x7fa9d6));
            duvet.position.set(0, 0.5, 0.32); g.add(duvet);
            var fold = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.1, 0.22), mat(0xa8c8e4));
            fold.position.set(0, 0.56, -0.32); g.add(fold);
            // 베개 둘
            [-0.24, 0.24].forEach(function (x) {
                var pil = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.15, 0.32), mat(0xffffff));
                pil.position.set(x, 0.53, -0.68);
                pil.rotation.z = x > 0 ? -0.05 : 0.05;
                g.add(pil);
            });
            [[-0.48, -0.9], [0.48, -0.9], [-0.48, 0.9], [0.48, 0.9]].forEach(function (p) {
                g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.1), dark), p[0], 0.1, p[1]));
            });
        }
        return shadeAll(g);
    }

    // =================================================================
    // 구역 만들기
    // =================================================================
    // 섬에 놓는 조경물. 가구(makeFurniture)와 같은 방식이지만
    // 바깥에 두는 것들이라 돌·풀·물처럼 야외 재질을 씁니다.
    // 바람개비처럼 도는 것은 userData.spin 에 표시해 두고 loop 에서 돌립니다.
    function makeDecor(id) {
        var g = new THREE.Group();
        var wood = texMat("plank", 1), dark = texMat("darkwood", 1), rock = texMat("stone", 1);

        if (id === "flowerbed") {
            // 돌로 두른 화단에 꽃 다섯 송이
            for (var i = 0; i < 12; i++) {
                var a = (Math.PI * 2 * i) / 12;
                var s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.13, 0), rock);
                s.scale.y = 0.7;
                s.position.set(Math.cos(a) * 0.62, 0.09, Math.sin(a) * 0.62);
                s.rotation.set(rnd(0, 3), rnd(0, 3), rnd(0, 3));
                g.add(s);
            }
            var soil = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.12, 16), texMat("dirt", 1));
            soil.position.y = 0.06;
            g.add(soil);
            [[0, 0], [-0.28, 0.2], [0.28, 0.2], [-0.2, -0.26], [0.24, -0.22]].forEach(function (p, k) {
                var f = flowerMesh([0xe4483a, 0xffd23f, 0xff8ec2, 0xffffff, 0xb07ae0][k], 0.85);
                f.position.set(p[0], 0.12, p[1]);
                g.add(f);
            });
            return shadeAll(g);
        }

        if (id === "bench") {
            var b = bench(0, 0, 0);
            return b;                        // 이미 만들어 둔 벤치를 그대로 씁니다
        }

        if (id === "birdhouse") {
            // 기둥 위에 작은 집 — 새 한 마리가 앉아 있습니다
            g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.5, 8), dark), 0, 0.75, 0));
            var hs = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.36, 0.4), wood);
            hs.position.y = 1.66; g.add(hs);
            [-1, 1].forEach(function (sx) {
                var rf = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.44), texMat("roof", 1));
                rf.position.set(sx * 0.12, 1.92, 0);
                rf.rotation.z = sx * 0.62;
                g.add(rf);
            });
            var hole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 10), mat(0x2a1d12));
            hole.rotation.x = Math.PI / 2;
            hole.position.set(0, 1.68, 0.21); g.add(hole);
            var perch = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 6), dark);
            perch.rotation.x = Math.PI / 2;
            perch.position.set(0, 1.55, 0.26); g.add(perch);
            var bird = ball(0.09, 0x6ba8d8);
            bird.scale.set(1, 0.9, 1.2);
            bird.position.set(0, 1.62, 0.3); g.add(bird);
            g.add(at(ball(0.055, 0x6ba8d8), 0, 1.72, 0.36));
            var beak = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.07, 5), mat(0xf2a33c));
            beak.rotation.x = Math.PI / 2;
            beak.position.set(0, 1.72, 0.42); g.add(beak);
            return shadeAll(g);
        }

        if (id === "stonelamp") {
            // 제주 돌등 — 받침 · 기둥 · 불집 · 갓
            g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.16, 8), rock), 0, 0.08, 0));
            g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.78, 8), rock), 0, 0.55, 0));
            g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.1, 8), rock), 0, 0.98, 0));
            var box2 = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.32, 0.34), rock);
            box2.position.y = 1.19; g.add(box2);
            // 불빛이 새어 나오는 창
            [[0, 0.18], [0, -0.18], [0.18, 0], [-0.18, 0]].forEach(function (p) {
                var win = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.02),
                                         mat(0xffd98a, { emissive: 0x6a4a12 }));
                win.position.set(p[0], 1.19, p[1]);
                if (p[0] !== 0) win.rotation.y = Math.PI / 2;
                g.add(win);
            });
            var cap = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.24, 8), rock);
            cap.position.y = 1.47; g.add(cap);
            g.add(at(ball(0.07, 0x9a9186), 0, 1.62, 0));
            return shadeAll(g);
        }

        if (id === "harbang") {
            // 돌하르방 — 벙거지 모자, 부리부리한 눈, 배 위에 얹은 두 손
            var body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, 1.3, 10), rock);
            body.position.y = 0.65; g.add(body);
            var head = new THREE.Mesh(new THREE.SphereGeometry(0.33, 14, 10), rock);
            head.scale.set(1, 1.12, 0.92);
            head.position.y = 1.52; g.add(head);
            // 모자
            g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.33, 0.3, 12), rock), 0, 1.84, 0));
            g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.06, 12), rock), 0, 1.7, 0));
            // 눈 (튀어나온 왕방울)
            [-0.13, 0.13].forEach(function (sx) {
                var ey = ball(0.085, 0x8c8378);
                ey.position.set(sx, 1.56, 0.27); g.add(ey);
                g.add(at(ball(0.035, 0x3a342c), sx, 1.56, 0.34));
            });
            // 코
            var nose = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 7), rock);
            nose.rotation.x = Math.PI / 2;
            nose.position.set(0, 1.42, 0.3); g.add(nose);
            // 배 위에 얹은 손
            [-0.17, 0.17].forEach(function (sx) {
                var hd = ball(0.11, 0x9a9186);
                hd.scale.set(1, 0.72, 0.8);
                hd.position.set(sx, 0.72, 0.3); g.add(hd);
            });
            return shadeAll(g);
        }

        if (id === "pinwheel") {
            g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.7, 8), dark), 0, 0.85, 0));
            var hub = new THREE.Group();
            hub.position.set(0, 1.72, 0.1);
            var cols = [0xff6b81, 0xffd166, 0x6fc3e8, 0x9ad86f, 0xf3a5e0, 0xffffff];
            for (var v = 0; v < 6; v++) {
                var vane = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.2, 0.02), mat(cols[v]));
                var va = (Math.PI * 2 * v) / 6;
                vane.position.set(Math.cos(va) * 0.24, Math.sin(va) * 0.24, 0);
                vane.rotation.z = va;
                hub.add(vane);
            }
            hub.add(at(ball(0.07, 0xf2c14e), 0, 0, 0.03));
            g.add(hub);
            g.userData.spin = hub;      // loop 에서 돌립니다
            return shadeAll(g);
        }

        if (id === "swing") {
            // 두 기둥에 매단 나무 그네
            [-0.7, 0.7].forEach(function (sx) {
                var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.7, 8), dark);
                leg.position.set(sx, 0.85, 0);
                leg.rotation.z = sx > 0 ? -0.12 : 0.12;
                g.add(leg);
            });
            var bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.7, 8), dark);
            bar.rotation.z = Math.PI / 2;
            bar.position.y = 1.68; g.add(bar);
            var seat = new THREE.Group();
            seat.position.set(0, 1.68, 0);
            [-0.28, 0.28].forEach(function (sx) {
                var rope = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.95, 5), mat(0xc8a678));
                rope.position.set(sx, -0.48, 0);
                seat.add(rope);
            });
            var plank = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.07, 0.28), wood);
            plank.position.y = -0.95; seat.add(plank);
            g.add(seat);
            g.userData.swing = seat;    // 바람에 살랑이게
            return shadeAll(g);
        }

        if (id === "pond") {
            // 돌로 두른 작은 연못 + 수련 잎
            for (var j = 0; j < 16; j++) {
                var pa = (Math.PI * 2 * j) / 16;
                var ps = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16, 0), rock);
                ps.scale.y = 0.66;
                ps.position.set(Math.cos(pa) * 0.86, 0.1, Math.sin(pa) * 0.86);
                ps.rotation.set(rnd(0, 3), rnd(0, 3), rnd(0, 3));
                g.add(ps);
            }
            var water = new THREE.Mesh(new THREE.CircleGeometry(0.82, 24),
                                       mat(0x4aa8c8, { alpha: 0.85 }));
            water.rotation.x = -Math.PI / 2;
            water.position.y = 0.11;
            g.add(water);
            [[0.3, 0.16], [-0.28, 0.3], [0.05, -0.34]].forEach(function (p) {
                var pad = new THREE.Mesh(new THREE.CircleGeometry(0.17, 12), mat(0x5aa84a));
                pad.rotation.x = -Math.PI / 2;
                pad.position.set(p[0], 0.13, p[1]);
                g.add(pad);
            });
            g.add(at(flowerMesh(0xff8ec2, 0.7), -0.28, 0.14, 0.3));
            return shadeAll(g);
        }

        return g;
    }

    function clearWorld() {
        if (world) {
            scene.remove(world);
            world.traverse(function (o) {
                if (o.geometry) o.geometry.dispose();
                if (o.material && o.material.map === undefined) o.material.dispose();
            });
        }
        world = new THREE.Group();
        scene.add(world);
        interactables = [];
        billboards = [];
        npcSprites = [];       // 구역이 바뀌면 이웃 그림도 새로 만들어집니다
        ringTarget = null;
    }

    // ---- 허브 ---------------------------------------------------------------
    // =================================================================
    // 폐허 → 복원 (구역별 단계 연출)
    //
    // 예전 방식은 1단계에 잔해를 얹고 3단계에 공통 장식을 얹는 식이라,
    // 2단계가 "1단계에서 잔해만 사라진 것"으로 보였습니다.
    // 좋아지는 게 아니라 없어지기만 한 셈이에요.
    //
    // 그래서 단계마다 그 구역에만 있는 '새로 지어진 것'을 쌓아 올립니다.
    // 1단계 잔해 → 2단계 기반 시설 → 3단계 완성 건축물 순으로 누적돼서,
    // 온기를 쓸 때마다 눈에 띄게 달라집니다.
    // =================================================================
    var AREA_RESTORE = {
        farm: "farm", fishing: "beach", flower: "flower",
        home: "home", shop: "lighthouse", hub: null
    };
    var RESTORE_KEYS = ["beach", "farm", "flower", "lighthouse", "home"];

    // 단계별 공기와 빛
    var MOOD = [
        { fog: 0x8d9aa3, near: 16, far: 40, amb: 0.55, sky: ["#8c9aa5", "#c3ccd0"] },
        { fog: 0xa8c4cc, near: 22, far: 48, amb: 0.82, sky: ["#8fc4dd", "#dfeee6"] },
        { fog: 0xcfeaf2, near: 30, far: 62, amb: 1.05, sky: ["#7fd0ee", "#fff0d8"] }
    ];

    function zoneLevelFor(key) {
        var rk = AREA_RESTORE[key];
        var lv = rk ? zoneLv(rk)
                    : Math.round(RESTORE_KEYS.reduce(function (a, k) { return a + zoneLv(k); }, 0) / RESTORE_KEYS.length);
        return Math.max(1, Math.min(3, lv));
    }

    function applyZoneMood(key) {
        var lv = zoneLevelFor(key);
        var m = MOOD[lv - 1];

        if (scene.fog) {
            scene.fog.color.setHex(m.fog);
            scene.fog.near = m.near;
            scene.fog.far = m.far;
        }
        if (sunLight) sunLight.intensity = 1.05 * m.amb;
        // 이웃 그림도 같은 분위기로 눌러 줍니다
        npcTint = m.amb;
        applyNpcTint();
        // 하늘도 단계에 맞춰 다시 칠합니다. 구역 빌더가 이미 하늘을 넣었으니
        // 그 위에 한 겹 더 씌우는 대신, 색만 바꿔 끼웁니다.
        if (skyMesh && skyMesh.material && skyMesh.material.map === undefined) {
            // 텍스처 하늘이면 건드리지 않습니다
        }
        world.add(sky(m.sky[0], m.sky[1]));

        if (lv === 1) world.add(ruinProps(key));
        if (lv >= 2) world.add(stage2Props(key));
        if (lv >= 3) world.add(stage3Props(key));
    }

    // --- 1단계: 폐허 -------------------------------------------------
    function ruinProps(key) {
        var g = new THREE.Group();

        // 폐허는 '물건이 많은 곳'이 아니라 '아무것도 없는 곳'입니다.
        // 잔해를 잔뜩 깔면 오히려 풍성해 보여서 복원해도 나아진 느낌이 안 나요.
        // 그래서 여기는 최소한만 두고, 좋아지는 건 2·3단계에서 쌓아 올립니다.
        // 실내(오두막)에는 잡초·자갈·쓰러진 울타리를 두지 않습니다.
        if (key !== "home") {
            g.add(grassTufts(0, 0, 9, 7));
            g.add(pebbles(0, 0, 9.5, 5));
            [[-5.4, -3.2, 1.1], [4.8, 4.1, -1.3]].forEach(function (p) {
                var post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.5, 6), texMat("bark", 1));
                post.position.set(p[0], 0.12, p[1]);
                post.rotation.z = Math.PI / 2 * 0.86 + p[2] * 0.12;
                post.rotation.y = p[2];
                g.add(shade(post));
            });
            [[-2.6, 5.2, 0.7], [3.1, 5.6, -0.4]].forEach(function (p) {
                var pl = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.07, 0.34), texMat("plank", 1));
                pl.position.set(p[0], 0.05, p[1]);
                pl.rotation.y = p[2]; pl.rotation.z = 0.05;
                g.add(shade(pl));
            });
        }

        if (key === "farm") {
            var b = barrel(-3.4, 3.4); b.rotation.z = Math.PI / 2 * 0.9; b.position.y = 0.3; g.add(b);
            [[2.8, -3.6], [-2.2, -4.1]].forEach(function (p) {
                var st = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.35, 8), texMat("bark", 1));
                st.position.set(p[0], 0.17, p[1]); g.add(shade(st));
            });
        } else if (key === "fishing") {
            var bt = boat(-4.6, 3.2); bt.rotation.z = 0.32; bt.position.y = -0.12; g.add(bt);
            var net = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 1.2), mat(0x8a8272, { alpha: 0.75 }));
            net.position.set(3.6, 0.04, 3.8); net.rotation.y = 0.5; g.add(net);
            // 부러진 잔교 기둥이 물 밖으로 삐죽
            [[-1.4, 8.5], [0.9, 10.2]].forEach(function (p, i) {
                var pil = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.7 + i * 0.2, 6), texMat("darkwood", 1));
                pil.position.set(p[0], 0.1, p[1]); pil.rotation.z = 0.1 * (i - 1);
                g.add(shade(pil));
            });
        } else if (key === "flower") {
            for (var i = 0; i < 5; i++) {
                var a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 5;
                var dry = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.025, 0.34, 4), mat(0x9a8f74));
                dry.position.set(Math.cos(a) * r, 0.17, Math.sin(a) * r);
                dry.rotation.z = (Math.random() - 0.5) * 0.5;
                g.add(dry);
            }
            // 무너진 시렁
            var tre = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 0.1), texMat("darkwood", 1));
            tre.position.set(0, 0.06, 4.4); tre.rotation.z = 0.06; g.add(shade(tre));
        } else if (key === "shop") {
            var c1 = crate(-2.4, 3.6, 0.9); c1.rotation.y = 0.4; g.add(c1);
            var c2 = crate(2.6, 3.9, 0.7);  c2.rotation.z = 0.2; g.add(c2);
        } else if (key === "home") {
            [[-1.8, 1.6], [1.9, -1.4]].forEach(function (p) {
                var junk = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.24), texMat("plank", 1));
                junk.position.set(p[0], 0.07, p[1]); junk.rotation.y = Math.random() * 2;
                g.add(shade(junk));
            });
        }
        return g;
    }

    // --- 2단계: 기반이 세워집니다 -------------------------------------
    // 여기서부터는 '없어지는' 게 아니라 '생기는' 단계입니다.
    function stage2Props(key) {
        var g = new THREE.Group();

        if (key === "farm") {
            // 비닐하우스 골조 + 물길 + 허수아비
            var gh = new THREE.Group();
            gh.position.set(-5.6, 0, -2.4);
            gh.rotation.y = 0.5;
            for (var i = 0; i < 5; i++) {
                var rib = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.045, 6, 14, Math.PI),
                                         mat(0xdfe6ea));
                rib.rotation.y = Math.PI / 2;
                rib.position.set(0, 0.02, -1.2 + i * 0.6);
                gh.add(rib);
            }
            var cover = new THREE.Mesh(new THREE.CylinderGeometry(1.16, 1.16, 2.5, 14, 1, true, 0, Math.PI),
                                       mat(0xd8f0ff, { alpha: 0.36 }));
            cover.rotation.z = Math.PI / 2; cover.rotation.y = Math.PI / 2;
            cover.position.y = 0.02;
            gh.add(cover);
            g.add(gh);

            // 물길
            var ch = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.12, 0.42), texMat("stone", 3));
            ch.position.set(0, 0.06, 3.1); g.add(shade(ch));
            var wtr = new THREE.Mesh(new THREE.BoxGeometry(9.1, 0.05, 0.3), mat(0x67c6e8, { alpha: 0.8 }));
            wtr.position.set(0, 0.11, 3.1); g.add(wtr);

            g.add(scarecrow(4.6, -2.2));
            g.add(fence(-6.2, 5.2, 6.2, 5.2, 8));
            g.add(pathStones(0, 5.6, 0, 1.2, 5));
            // 모종이 줄지어 올라옵니다
            for (var sr = 0; sr < 14; sr++) {
                var sx2 = -3.5 + (sr % 7) * 1.16, sz2 = (sr < 7) ? -1.1 : 0.9;
                var sprout = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 6), mat(0x6fbf5a));
                sprout.position.set(sx2, 0.25, sz2); g.add(sprout);
            }
            // 농기구 창고
            g.add(hut(6.0, 3.2, -0.5, 1.8, 1.6, "thatch"));

        } else if (key === "fishing") {
            // 바다로 뻗는 나무 데크 + 미끼통 + 작은 창고
            for (var d = 0; d < 9; d++) {
                var pl = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.11, 0.86), texMat("plank", 1));
                pl.position.set(0, 0.09, 6.4 + d * 0.9);
                g.add(shade(pl));
                if (d % 3 === 0) {
                    [-0.9, 0.9].forEach(function (sx) {
                        var pil = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 1.1, 6), texMat("darkwood", 1));
                        pil.position.set(sx, -0.35, 6.4 + d * 0.9);
                        g.add(pil);
                    });
                }
            }
            var bt2 = boat(-3.9, 6.2, 0.4); g.add(bt2);
            g.add(barrel(2.6, 4.4));
            g.add(crate(3.4, 5.2, 0.85));
            g.add(hut(-5.4, 2.2, 0.6, 2.2, 2.0, "roof"));
            // 배를 매어두는 말뚝과 미끼 손질대
            [[-1.9, 7.6], [1.9, 7.6], [-1.9, 10.4], [1.9, 10.4]].forEach(function (p) {
                var mp = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.0, 7), texMat("darkwood", 1));
                mp.position.set(p[0], 0.4, p[1]); g.add(shade(mp));
                g.add(at(ball(0.11, 0xe2584a), p[0], 0.95, p[1]));
            });
            var tbl2 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.7), texMat("plank", 1));
            tbl2.position.set(3.0, 0.72, 3.0); g.add(shade(tbl2));
            [[-0.6,-0.25],[0.6,-0.25],[-0.6,0.25],[0.6,0.25]].forEach(function (c) {
                var l4 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.72, 5), texMat("darkwood", 1));
                l4.position.set(3.0 + c[0], 0.36, 3.0 + c[1]); g.add(l4);
            });

        } else if (key === "flower") {
            // 꽃밭 테두리 + 우물 + 벤치
            g.add(fence(-6.4, -4.6, 6.4, -4.6, 9));
            g.add(fence(-6.4, 5.4, 6.4, 5.4, 9));
            var well = new THREE.Group();
            well.position.set(5.2, 0, 1.6);
            var ring = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.66, 0.62, 12), texMat("stone", 2));
            ring.position.y = 0.31; well.add(shade(ring));
            [-0.55, 0.55].forEach(function (sx) {
                var p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.25, 0.1), texMat("darkwood", 1));
                p.position.set(sx, 0.62, 0); well.add(p);
            });
            var beam = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.1, 0.14), texMat("darkwood", 1));
            beam.position.y = 1.25; well.add(beam);
            g.add(well);
            g.add(bench(-4.4, 2.6, 0.3));
            g.add(bench(4.2, -2.4, -0.4));
            g.add(pathStones(0, 5.2, 0, -4.2, 7));

        } else if (key === "shop") {
            // 등대에 불이 들어옵니다
            var tw = new THREE.Group();
            tw.position.set(-7.2, 0, -4.6);
            var base = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 1.0, 4.6, 12), texMat("plaster", 3));
            base.position.y = 2.3; tw.add(shade(base));
            // 빨간 띠
            [1.2, 2.6, 3.8].forEach(function (y) {
                var band = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.84, 0.42, 12), mat(0xe2584a));
                band.position.y = y; tw.add(band);
            });
            var room = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.86, 0.9, 12), mat(0xf6f2e8));
            room.position.y = 5.0; tw.add(room);
            var glass = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.66, 12), mat(0xffe9a8, { alpha: 0.85, emissive: 0x6a5312 }));
            glass.position.y = 5.0; tw.add(glass);
            var cap = new THREE.Mesh(new THREE.ConeGeometry(0.98, 0.7, 12), mat(0x3c4652));
            cap.position.y = 5.75; tw.add(cap);
            var lampL = new THREE.PointLight(0xffd98a, 1.1, 13, 1.6);
            lampL.position.y = 5.0; tw.add(lampL);
            g.add(tw);
            g.add(pathStones(-6.2, -3.2, -1.6, 1.4, 6));
            g.add(lantern(2.4, 3.6));

            // 가게가 문을 엽니다 — 차양과 간판, 진열대
            var shop = new THREE.Group();
            shop.position.set(3.6, 0, -1.4);
            shop.rotation.y = -0.45;
            var awn = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 1.5), mat(0xe2584a));
            awn.position.set(0, 2.05, 0.85); awn.rotation.x = -0.24;
            shop.add(shade(awn));
            for (var sb = 0; sb < 5; sb++) {
                var stripe = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.13, 1.5), mat(0xf6f2e8));
                stripe.position.set(-1.3 + sb * 0.65, 2.06, 0.85); stripe.rotation.x = -0.24;
                shop.add(stripe);
            }
            [-1.5, 1.5].forEach(function (sx) {
                var p4 = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 2.0, 7), texMat("darkwood", 1));
                p4.position.set(sx, 1.0, 1.5); shop.add(p4);
            });
            var counter = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.9, 0.6), texMat("plank", 1));
            counter.position.set(0, 0.45, 0.9); shop.add(shade(counter));
            var sign = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.08), texMat("darkwood", 1));
            sign.position.set(0, 2.5, 0.3); shop.add(shade(sign));
            g.add(shop);
            g.add(barrel(1.4, -3.2));
            g.add(sack(5.6, 0.8));

        } else if (key === "home") {
            // 선반과 양탄자 — 기록을 걸 자리가 생깁니다
            var shelf = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 0.42), texMat("darkwood", 1));
            shelf.position.set(0, 1.35, -3.15); g.add(shade(shelf));
            [-1.5, 1.5].forEach(function (sx) {
                var br = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.36), texMat("darkwood", 1));
                br.position.set(sx, 1.1, -3.15); g.add(br);
            });
            var rug = new THREE.Mesh(new THREE.CircleGeometry(1.9, 24), mat(0xc0684e));
            rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.012, 0.4);
            g.add(rug);
            var rug2 = new THREE.Mesh(new THREE.RingGeometry(1.35, 1.62, 24), mat(0xe8c07a));
            rug2.rotation.x = -Math.PI / 2; rug2.position.set(0, 0.02, 0.4);
            g.add(rug2);
            // 창문이 생기고 커튼이 걸립니다
            [-2.2, 2.2].forEach(function (sx) {
                var win = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.9, 0.08), mat(0xbfe3f7, { alpha: 0.85 }));
                win.position.set(sx, 1.5, -3.3); g.add(win);
                var fr2 = new THREE.Mesh(new THREE.BoxGeometry(1.14, 1.04, 0.05), texMat("darkwood", 1));
                fr2.position.set(sx, 1.5, -3.36); g.add(fr2);
                [-0.42, 0.42].forEach(function (cx) {
                    var cur = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.0, 0.05), mat(0xf0a8b8));
                    cur.position.set(sx + cx, 1.5, -3.22); g.add(cur);
                });
            });

        } else if (key === "hub") {
            // 섬 전체에 길이 나고 울타리가 섭니다
            Object.keys(ZONES).forEach(function (k) {
                var z = ZONES[k];
                g.add(pathStones(z.at[0] * 0.62, z.at[1] * 0.62, z.at[0] * 0.14, z.at[1] * 0.14, 5));
            });
            // 가운데 우물 겸 쉼터
            var plaza = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.7, 0.1, 20), texMat("path", 3));
            plaza.position.set(0, 0.03, 0); g.add(shade(plaza));
            [[-2.0, 1.6], [2.0, 1.6]].forEach(function (p) { g.add(bench(p[0], p[1], p[0] > 0 ? -0.4 : 0.4)); });
            g.add(fence(-6.5, 9.5, 6.5, 9.5, 9));
        }
        return g;
    }

    // --- 3단계: 완성 --------------------------------------------------
    function stage3Props(key) {
        var g = new THREE.Group();

        if (key === "farm") {
            // 열매 달린 감귤나무들 + 수확 수레 + 쌓인 상자
            [[-4.4, -4.2], [-1.4, -5.0], [1.8, -4.6], [4.6, -4.0], [-5.8, 0.6], [5.8, 0.4]]
                .forEach(function (p) { g.add(tree(p[0], p[1], "tangerine")); });
            var cart = new THREE.Group();
            cart.position.set(3.2, 0, 3.4);
            cart.rotation.y = -0.4;
            var bed = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.42, 0.95), texMat("plank", 1));
            bed.position.y = 0.52; cart.add(shade(bed));
            [-0.6, 0.6].forEach(function (sx) {
                var wh = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.07, 6, 14), texMat("darkwood", 1));
                wh.position.set(sx, 0.3, 0.52); cart.add(wh);
            });
            for (var i = 0; i < 7; i++) {
                cart.add(at(ball(0.13, 0xff9526), (Math.random() - 0.5) * 1.1, 0.78, (Math.random() - 0.5) * 0.6));
            }
            g.add(cart);
            g.add(crate(-3.0, 3.8, 0.9));
            var c2 = crate(-3.0, 3.8, 0.8); c2.position.y = 0.55; g.add(c2);

        } else if (key === "fishing") {
            // 데크 끝 정자 + 매달린 등불 + 생선 건조대
            var pav = new THREE.Group();
            pav.position.set(0, 0, 14.6);
            [[-1.0, -1.0], [1.0, -1.0], [-1.0, 1.0], [1.0, 1.0]].forEach(function (c) {
                var p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 2.3, 7), texMat("darkwood", 1));
                p.position.set(c[0], 1.15, c[1]); pav.add(p);
            });
            var roof = new THREE.Mesh(new THREE.ConeGeometry(1.85, 0.9, 4), texMat("roof", 2));
            roof.position.y = 2.7; roof.rotation.y = Math.PI / 4; pav.add(shade(roof));
            var seat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 0.5), texMat("plank", 1));
            seat.position.set(0, 0.5, -0.8); pav.add(seat);
            var pl2 = new THREE.PointLight(0xffc978, 1.0, 10, 1.6);
            pl2.position.set(0, 2.0, 0); pav.add(pl2);
            g.add(pav);
            // 데크를 따라 등불
            [8.2, 11.0, 13.6].forEach(function (z) {
                [-1.05, 1.05].forEach(function (sx) {
                    var ln = lantern(sx, z); ln.scale.set(0.8, 0.8, 0.8); g.add(ln);
                });
            });
            // 생선 건조대
            var dry = new THREE.Group();
            dry.position.set(3.6, 0, 4.6);
            [-0.8, 0.8].forEach(function (sx) {
                var p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.5, 6), texMat("bark", 1));
                p.position.set(sx, 0.75, 0); dry.add(p);
            });
            var bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.7, 6), texMat("bark", 1));
            bar.rotation.z = Math.PI / 2; bar.position.y = 1.4; dry.add(bar);
            for (var f = 0; f < 4; f++) {
                var fish = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), mat(0xb8c6cf));
                fish.scale.set(1, 0.55, 0.35);
                fish.position.set(-0.6 + f * 0.4, 1.18, 0); dry.add(fish);
            }
            g.add(dry);

        } else if (key === "flower") {
            // 동백 아치 + 돌등 + 꽃길
            var arch = new THREE.Group();
            arch.position.set(0, 0, 3.4);
            [-1.35, 1.35].forEach(function (sx) {
                var p = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.5, 8), texMat("bark", 1));
                p.position.set(sx, 1.25, 0); arch.add(shade(p));
            });
            var top = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.1, 8, 18, Math.PI), texMat("bark", 1));
            top.position.y = 2.5; arch.add(top);
            // 아치를 덮은 동백
            for (var a2 = 0; a2 < 22; a2++) {
                var t2 = Math.PI * (a2 / 21);
                var fx = Math.cos(t2) * 1.35, fy = 2.5 + Math.sin(t2) * 1.35;
                arch.add(at(ball(0.15, a2 % 3 ? 0xe8425c : 0xff7d92), fx, fy, (Math.random() - 0.5) * 0.3));
            }
            g.add(arch);
            [[-3.6, 0.4], [3.6, 0.4], [-3.6, -3.0], [3.6, -3.0]].forEach(function (p) {
                var st = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.9, 0.34), texMat("stone", 2));
                st.position.set(p[0], 0.45, p[1]); g.add(shade(st));
                var cap2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.5), texMat("stone", 2));
                cap2.position.set(p[0], 0.97, p[1]); g.add(cap2);
                g.add(at(ball(0.11, 0xffd98a), p[0], 0.8, p[1] + 0.19));
                var L2 = new THREE.PointLight(0xffc978, 0.5, 6, 1.7);
                L2.position.set(p[0], 0.9, p[1]); g.add(L2);
            });
            // 떨어진 꽃잎이 깔린 길
            for (var pi = 0; pi < 40; pi++) {
                var pt = new THREE.Mesh(new THREE.CircleGeometry(0.08, 6), mat(pi % 2 ? 0xe8425c : 0xff9fb0));
                pt.rotation.x = -Math.PI / 2;
                pt.position.set((Math.random() - 0.5) * 2.4, 0.015, -4 + Math.random() * 9);
                g.add(pt);
            }

        } else if (key === "shop") {
            // 전망대와 회전 불빛 + 깃발
            var deck = new THREE.Group();
            deck.position.set(-7.2, 0, -4.6);
            var ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.07, 8, 18), texMat("darkwood", 1));
            ring2.rotation.x = Math.PI / 2; ring2.position.y = 4.42; deck.add(ring2);
            for (var r2 = 0; r2 < 10; r2++) {
                var an2 = Math.PI * 2 * r2 / 10;
                var rail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 5), texMat("darkwood", 1));
                rail.position.set(Math.cos(an2) * 1.12, 4.12, Math.sin(an2) * 1.12);
                deck.add(rail);
            }
            var floor2 = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.18, 0.1, 14), texMat("plank", 1));
            floor2.position.y = 3.8; deck.add(shade(floor2));
            // 등대 불빛 기둥
            var beam2 = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 3.4, 9, 12, 1, true),
                                       mat(0xffe6a8, { alpha: 0.13 }));
            beam2.rotation.z = Math.PI / 2.6;
            beam2.position.set(3.2, 5.4, 0);
            deck.add(beam2);
            var flag = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.44), mat(0xff7a30));
            flag.position.set(0.4, 6.3, 0); deck.add(flag);
            var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 5), mat(0x8a8a8a));
            pole.position.set(0, 6.2, 0); deck.add(pole);
            g.add(deck);
            g.add(bench(1.8, 4.4, 0.2));
            g.add(lantern(-2.6, 3.2));

        } else if (key === "home") {
            // 벽난로 + 액자 + 창문 빛
            var fp = new THREE.Group();
            fp.position.set(-3.0, 0, -2.6);
            fp.rotation.y = 0.7;
            var stone = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 0.6), texMat("stone", 2));
            stone.position.y = 0.75; fp.add(shade(stone));
            var mouth = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.3), mat(0x2b2118));
            mouth.position.set(0, 0.42, 0.24); fp.add(mouth);
            var fire = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.55, 8), mat(0xff8a3c, { emissive: 0x9a3a08 }));
            fire.position.set(0, 0.42, 0.3); fp.add(fire);
            var fl = new THREE.PointLight(0xff9a4a, 1.2, 8, 1.7);
            fl.position.set(0, 0.7, 0.5); fp.add(fl);
            g.add(fp);
            // 선반 위 액자 세 개
            [-1.0, 0, 1.0].forEach(function (sx, i) {
                var fr = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.34, 0.05), texMat("darkwood", 1));
                fr.position.set(sx, 1.62, -3.1); g.add(fr);
                var pic = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.24),
                                         mat([0xffd166, 0xa5d8ff, 0xffb3c1][i]));
                pic.position.set(sx, 1.62, -3.06); g.add(pic);
            });
            var warm = new THREE.PointLight(0xffd9a0, 0.6, 10, 1.7);
            warm.position.set(0, 2.0, 0); g.add(warm);
            // 살림이 갖춰집니다 — 탁자, 의자, 화분, 벽걸이
            var tbl = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.1, 14), texMat("plank", 1));
            tbl.position.set(2.2, 0.62, 1.4); g.add(shade(tbl));
            for (var lg = 0; lg < 3; lg++) {
                var an3 = Math.PI * 2 * lg / 3;
                var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.62, 6), texMat("darkwood", 1));
                leg.position.set(2.2 + Math.cos(an3) * 0.4, 0.31, 1.4 + Math.sin(an3) * 0.4);
                g.add(leg);
            }
            g.add(at(ball(0.18, 0x7fc98a), 2.2, 0.8, 1.4));      // 탁자 위 화분
            [[1.2, 2.3], [3.2, 2.3]].forEach(function (p) {
                var st3 = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.1, 0.44), texMat("plank", 1));
                st3.position.set(p[0], 0.44, p[1]); g.add(shade(st3));
                var bk = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.5, 0.08), texMat("darkwood", 1));
                bk.position.set(p[0], 0.72, p[1] + 0.2); g.add(bk);
                [[-0.16,-0.16],[0.16,-0.16],[-0.16,0.16],[0.16,0.16]].forEach(function (c) {
                    var l3 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.44, 5), texMat("darkwood", 1));
                    l3.position.set(p[0] + c[0], 0.22, p[1] + c[1]); g.add(l3);
                });
            });
            // 벽에 걸린 화환
            for (var w3 = 0; w3 < 9; w3++) {
                g.add(at(ball(0.09, w3 % 2 ? 0xffd166 : 0xff9ec4), -1.6 + w3 * 0.4, 2.15, -3.28));
            }

        } else if (key === "hub") {
            // 섬 한가운데 기념비와 등불길, 꽃무리
            var mon = new THREE.Group();
            mon.position.set(0, 0, -2.2);
            var base3 = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.94, 0.36, 12), texMat("stone", 2));
            base3.position.y = 0.18; mon.add(shade(base3));
            var pil3 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 1.9, 10), texMat("stone", 2));
            pil3.position.y = 1.3; mon.add(shade(pil3));
            var orb = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 12),
                                     mat(0xffd98a, { emissive: 0x8a6512 }));
            orb.position.y = 2.5; mon.add(orb);
            var ml = new THREE.PointLight(0xffc978, 1.1, 12, 1.6);
            ml.position.y = 2.6; mon.add(ml);
            g.add(mon);
            // 각 구역 길목마다 등불
            Object.keys(ZONES).forEach(function (k) {
                var z = ZONES[k];
                var lx = z.at[0] * 0.45, lz = z.at[1] * 0.45;
                g.add(lantern(lx, lz));
                var L3 = new THREE.PointLight(0xffc978, 0.4, 6, 1.7);
                L3.position.set(lx, 1.4, lz); g.add(L3);
            });
            // 섬 가장자리를 두르는 꽃
            for (var fi = 0; fi < 26; fi++) {
                var fa = Math.PI * 2 * fi / 26, fr3 = 10.4 + Math.random() * 1.4;
                var fx3 = Math.cos(fa) * fr3, fz3 = Math.sin(fa) * fr3;
                var stm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.3, 5), mat(0x6fbf5a));
                stm.position.set(fx3, 0.15, fz3); g.add(stm);
                g.add(at(ball(0.085, [0xff6b81, 0xffd166, 0xf78fb3, 0xa5d8ff][fi % 4]), fx3, 0.32, fz3));
            }
        }
        return g;
    }
    function buildHub() {
        scene.background = null;
        scene.fog = new THREE.Fog(0x9fd9e6, 34, 70);
        world.add(sky("#8fd2ee", "#dff2f6"));

        world.add(sea(-0.15));
        world.add(at(ground(15.2, "sand"), 0, -0.04, 0));
        world.add(ground(13.4, "grass"));

        // 섬을 두르는 나무들 (제주답게 귤나무·소나무·동백 섞어서)
        var kinds = ["tangerine", "pine", "camellia", "plain"];
        [[0, -11], [-11.5, -3], [11.5, 1], [-4, 11.5], [6, 11], [-10.5, 8],
         [10, -7], [-8, -9], [3, -11.5], [12, 6]]
            .forEach(function (p, i) { world.add(tree(p[0], p[1], kinds[i % 4])); });

        world.add(grassTufts(0, 0, 12.5, 55));
        world.add(pebbles(0, 0, 13, 22));

        // 가운데 게시판
        var nb = noticeBoard();
        nb.position.set(0, 0, 0);
        world.add(nb);
        addI("board", 0, 0.9, "📋 섬 현황판 보기");

        // 구역 넷: 문 + 앞마당 + 이웃
        var tints = { farm: 0xff9a2e, fishing: 0x3aa7e0, flower: 0xe4483a,
                      shop: 0x9a8f7a, home: 0x7fae6a };
        Object.keys(ZONES).forEach(function (key) {
            var z = ZONES[key], gx = z.at[0], gz = z.at[1];
            var facing = Math.atan2(gx, gz);          // 섬 가운데를 바라보게

            var gt = gate(tints[key], z.emoji, z.label);
            gt.position.set(gx, 0, gz);
            gt.rotation.y = facing;
            world.add(gt);

            world.add(pathStones(gx * 0.78, gz * 0.78, gx * 0.16, gz * 0.16, 6));
            decorGate(key, gx, gz, facing);
            addI("gate", gx, gz, z.emoji + " " + z.label + " 입장하기", { to: key });

            // 이웃은 문 안쪽 옆에 (오두막은 주인이 나라서 없음)
            if (z.npc) {
                var side = facing + Math.PI / 2;
                addVillager(z.npc, gx + Math.cos(side) * 2.1 - gx * 0.08,
                                    gz + Math.sin(side) * 2.1 - gz * 0.08);
            }

            // [P0] 복원 단계가 눈에 보이게. 되살아난 구역 앞에는
            // 꽃과 등불이 늘어나고, 3단계에는 빛기둥이 섭니다.
            world.add(restoreMarker(key, gx, gz, facing));
        });

        // [P0] 아직 손대지 않은 바닷길. 복원하면 실제로 열립니다.
        world.add(seaPath());

        // 섬 한가운데에도 꾸밀 자리를 둡니다
        addDecorSpots("hub");
    }

    // 구역 문 앞에 놓이는 복원 표식
    function restoreMarker(key, x, z, facing) {
        var g = new THREE.Group();
        g.position.set(x, 0, z);
        g.rotation.y = facing;
        var lv = zoneLv(key);

        if (lv >= 2) {
            // 2단계: 길가에 꽃이 핍니다
            [[-1.5, 1.9], [1.5, 1.9], [-1.1, 2.6], [1.1, 2.6]].forEach(function (p, i) {
                var stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.3, 5), mat(0x6fbf5a));
                stem.position.set(p[0], 0.15, p[1]);
                g.add(stem);
                g.add(at(ball(0.09, [0xff6b81, 0xffd166, 0xf78fb3, 0xfff1a8][i % 4]), p[0], 0.33, p[1]));
            });
        }
        if (lv >= 3) {
            // 3단계: 따뜻한 빛기둥 + 등불
            var beam = new THREE.Mesh(
                new THREE.CylinderGeometry(0.5, 0.85, 3.4, 12, 1, true),
                mat(0xffd7a0, { alpha: 0.16 }));
            beam.position.set(0, 1.7, 1.4);
            g.add(beam);
            var L = new THREE.PointLight(0xffc978, 0.7, 7, 1.6);
            L.position.set(0, 1.5, 1.4);
            g.add(L);
        }
        return g;
    }

    // 바닷길 — 복원 전에는 부서진 표지판만, 복원하면 바다 위로 길이 놓입니다
    function seaPath() {
        var g = new THREE.Group();
        var lv = zoneLv("beach");
        var sign = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.06), texMat("plank", 1));
        sign.position.set(0, 0.9, 13.4);
        sign.rotation.z = lv >= 2 ? 0 : 0.22;      // 복원 전에는 기울어져 있어요
        g.add(sign);
        var post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.2, 7), texMat("bark", 1));
        post.position.set(0, 0.6, 13.4);
        g.add(post);

        if (lv >= 2) {
            // 바다 위 나무 데크
            for (var i = 0; i < 7; i++) {
                var plank = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.09, 0.9), texMat("plank", 1));
                plank.position.set(0, 0.06, 14.4 + i * 1.05);
                g.add(plank);
            }
        }
        if (lv >= 3) {
            // 끝에 등불이 걸린 작은 전망대
            [-0.75, 0.75].forEach(function (sx) {
                var p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.1, 6), texMat("darkwood", 1));
                p.position.set(sx, 0.6, 21.4);
                g.add(p);
                g.add(at(ball(0.13, 0xffb765), sx, 1.2, 21.4));
            });
            var L = new THREE.PointLight(0xffc978, 0.9, 9, 1.6);
            L.position.set(0, 1.4, 21.4);
            g.add(L);
        }
        return g;
    }

    // 문 앞에 그 구역 물건을 늘어놓아, 들어가기 전에 뭘 하는 곳인지 보이게
    function decorGate(key, x, z, facing) {
        var g = new THREE.Group();
        g.position.set(x, 0, z);
        g.rotation.y = facing;

        if (key === "farm") {
            var box1 = crate(-1.9, 0.9, 1.05); g.add(box1);
            [[-2.05, 0.62], [-1.75, 0.9], [-1.95, 1.15]].forEach(function (p) {
                g.add(at(ball(0.15, 0xff9526), p[0], 0.6, p[1]));
            });
            g.add(sack(1.9, 1.0));
            g.add(scarecrow(2.3, -0.6));
        } else if (key === "fishing") {
            g.add(barrel(-1.95, 1.0));
            var rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 2.2, 6), texMat("darkwood", 1));
            rod.position.set(1.9, 1.0, 0.9); rod.rotation.z = 0.4; g.add(rod);
            var net = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.05, 6, 14), mat(0x8a7a5a));
            net.position.set(2.25, 0.36, 1.4); net.rotation.x = 1.2; g.add(net);
        } else if (key === "flower") {
            var cols = [0xe4483a, 0xffd23f, 0xff8ec2, 0xffffff, 0xb07ae0];
            for (var i = 0; i < 7; i++) {
                var f = flowerMesh(cols[i % cols.length], 0.9);
                f.position.set(rnd(-2.4, 2.4), 0, rnd(0.7, 1.7));
                g.add(f);
            }
            g.add(bench(2.5, -0.6, -0.5));
        } else if (key === "shop") {
            g.add(crate(-1.9, 1.0));
            g.add(barrel(1.9, 1.05));
            g.add(sack(-2.4, 0.5));
            g.add(lantern(2.4, 0.3));
        } else if (key === "home") {
            g.add(lantern(-1.9, 1.1));
            g.add(lantern(1.9, 1.1));
            var mat1 = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.05, 0.7), mat(0xc86a4a));
            mat1.position.set(0, 0.03, 1.5); g.add(shade(mat1, false, true));
            g.add(flowerMesh(0xffd23f, 0.9).translateX(-2.3).translateZ(1.4));
            g.add(flowerMesh(0xff8ec2, 0.9).translateX(2.3).translateZ(1.4));
        }
        world.add(g);
    }

    // ---- 농장 ---------------------------------------------------------------
    // 7·8번째로 열리는 바깥쪽 두 칸은 원래 ±3.6 이었는데,
    // 왼쪽 오두막 초가지붕 처마가 거기까지 뻗어 있어서 밭을 늘리면
    // 지붕 밑에 파묻혔습니다. 안쪽으로 당겨 지붕을 피했어요.
    var FARM_SPOTS = [[-2.4, -1.2], [0, -1.2], [2.4, -1.2],
                      [-2.4, 1.4], [0, 1.4], [2.4, 1.4],
                      [-3.0, 0.1], [3.0, 0.1], [0, 0.1]];

    function buildFarm() {
        scene.background = null;
        scene.fog = new THREE.Fog(0xa8dcea, 26, 52);
        world.add(sky("#86cbe8", "#e6f3ea"));
        world.add(sea(-0.4));
        world.add(ground(11, "grass"));

        // 흙밭
        var soil = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.14, 4.6), texMat("dirt", 5));
        soil.position.set(0, 0.07, 0.1);
        world.add(soil);

        // 밭 테두리 목재
        [[-4.3, 0], [4.3, 0]].forEach(function (p) {
            var b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 4.9), texMat("darkwood", 1));
            b.position.set(p[0], 0.15, 0.1); world.add(shade(b));
        });
        [[-2.5], [2.7]].forEach(function (p) {
            var b = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.3, 0.22), texMat("darkwood", 1));
            b.position.set(0, 0.15, p[0]); world.add(shade(b));
        });

        world.add(fence(-6.4, -4.4, 6.4, -4.4, 8));
        world.add(fence(-6.4, 5.2, -6.4, -4.4, 6));
        world.add(fence(6.4, 5.2, 6.4, -4.4, 6));

        // 창고와 허수아비
        world.add(hut(-6.2, -1.4, 1.1, 2.4, 2.0, "thatch"));
        world.add(scarecrow(4.4, -1.2));
        world.add(barrel(-4.9, 3.4));
        world.add(crate(-3.9, 3.6));
        world.add(sack(5.2, 2.6));

        world.add(tree(-8.6, -4.2, "tangerine"));
        world.add(tree(8.4, -3.4, "tangerine"));
        world.add(tree(7.6, 5.4, "tangerine"));
        world.add(tree(-8.2, 4.6, "pine"));
        world.add(grassTufts(0, 0, 10, 44));
        world.add(pebbles(0, 0, 10, 14));
        world.add(pathStones(0, 5.4, 0, 2.6, 4));

        while (farmPlots.length < openPlots) farmPlots.push({ stage: 0, at: 0, watered: false });
        FARM_SPOTS.slice(0, openPlots).forEach(function (p, idx) {
            addI("plot", p[0], p[1], "밭", { idx: idx });
        });
        renderFarm();

        // 아직 안 연 칸이 있으면 그 자리에 표지판을 세워 늘릴 수 있게
        if (openPlots < FARM_SPOTS.length) {
            var np = FARM_SPOTS[openPlots];
            var sgn = labelSign("➕", "밭 늘리기", "🪙 " + expandCost(openPlots, PLOT_BASE), 0.7);
            sgn.position.set(np[0], 0.8, np[1]);
            world.add(sgn);
            world.add(shade(at(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.8, 6),
                                              texMat("darkwood", 1)), np[0], 0.4, np[1])));
            addI("expandPlot", np[0], np[1], "밭 늘리기");
        }

        addVillager("gyul", -3.6, 3.2);
        addDecorSpots("farm");
        addExit(0, 6.6);
    }

    var farmNodes = [];
    function renderFarm() {
        farmNodes.forEach(function (n) { world.remove(n); });
        farmNodes = [];
        FARM_SPOTS.slice(0, openPlots).forEach(function (p, idx) {
            var s = farmPlots[idx];
            var g = new THREE.Group();
            g.position.set(p[0], 0.14, p[1]);
            if (s.stage === 1) {
                // 떡잎 두 장 달린 새싹
                var col = s.watered ? 0x6fbf5a : 0x9aa86a;
                g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.03, 0.26, 5), mat(col)), 0, 0.13, 0));
                [-1, 1].forEach(function (d) {
                    var lf = ball(0.1, col);
                    lf.scale.set(1.4, 0.3, 0.8);
                    lf.position.set(d * 0.09, 0.24, 0);
                    lf.rotation.z = -d * 0.55;
                    g.add(lf);
                });
                if (!s.watered) {
                    // 목마르면 잎이 처지도록 살짝 기울임
                    g.rotation.z = 0.12;
                }
            } else if (s.stage === 2) {
                g.add(ripeTangerinePlant());
                // 수확할 때가 된 건 살짝 떠오르게 해서 눈에 띄게
                g.userData.ripe = true;
            } else {
                var hole = new THREE.Mesh(new THREE.CircleGeometry(0.3, 12), mat(0x6d4526));
                hole.rotation.x = -Math.PI / 2; hole.position.y = 0.01;
                hole.receiveShadow = true;
                g.add(hole);
            }
            shadeAll(g);
            world.add(g);
            farmNodes.push(g);
        });
    }

    // ---- 낚시터 -------------------------------------------------------------
    var DOCK_SPOTS = [[-1.6, -4.2], [1.6, -4.2]];

    function buildFishing() {
        scene.background = null;
        scene.fog = new THREE.Fog(0x9ad4ee, 30, 62);
        world.add(sky("#7ec6ea", "#dff0f7"));
        world.add(sea(-0.25));
        var sd = ground(9.5, "sand"); sd.position.set(0, -0.03, 3.2); world.add(sd);
        var gr = ground(7.4, "grass"); gr.position.set(0, 0.001, 3.9); world.add(gr);

        // 부두
        var dock = new THREE.Group();
        var plankMat = texMat("plank", 1);
        for (var i = 0; i < 8; i++) {
            var pk = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.14, 0.62), plankMat);
            pk.position.set(0, 0.12, 1.6 - i * 0.66);
            dock.add(pk);
        }
        [-1.9, 1.9].forEach(function (x) {
            [-3.9, -1.5, 0.9].forEach(function (z) {
                var pl = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.0, 6), texMat("bark", 1));
                pl.position.set(x, -0.35, z);
                dock.add(pl);
            });
        });
        world.add(dock);

        DOCK_SPOTS.forEach(function (p, idx) {
            addI("fish", p[0], p[1], "낚시", { idx: idx });
        });

        // 부두 난간
        [-2.25, 2.25].forEach(function (x) {
            for (var i = -3; i <= 1; i++) {
                var p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.72, 0.1), texMat("darkwood", 1));
                p.position.set(x, 0.55, i * 1.1);
                world.add(shade(p));
            }
            var rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 4.6), texMat("darkwood", 1));
            rail.position.set(x, 0.88, -1.1);
            world.add(shade(rail));
        });

        world.add(boat(-3.6, -2.4, 0.5));
        world.add(barrel(2.9, 1.4));
        world.add(crate(3.7, 1.9, 0.9));
        world.add(lantern(-2.6, 1.6));
        world.add(lantern(2.6, 1.6));

        // 떠 있는 부표
        [[-5.4, -4.6], [5.2, -5.2], [-6.2, -2.2]].forEach(function (p) {
            var b = ball(0.24, 0xef5a3a);
            b.position.set(p[0], 0.05, p[1]);
            world.add(shade(b, true, false));
        });

        world.add(hut(-5.4, 3.4, 0.5, 2.2, 1.9, "thatch"));
        world.add(tree(-6.6, 5.2, "pine"));
        world.add(tree(6.4, 4.8, "pine"));
        world.add(tree(5.6, 6.6, "camellia"));
        world.add(grassTufts(0, 4.2, 6.5, 45));
        world.add(pebbles(0, 3.6, 7, 18));
        addVillager("jerok", 3.4, 2.8);
        addDecorSpots("fishing");
        addExit(0, 5.8);
    }

    // ---- 꽃밭 ---------------------------------------------------------------
    var FLOWER_SPOTS = [[-2.6, -1], [-0.9, -1.8], [0.9, -1.8], [2.6, -1],
                        [-1.8, 0.9], [0, 1.4], [1.8, 0.9],
                        [-3.2, 1.9], [3.2, 1.9], [0, -2.6]];
    var FLOWER_COLORS = [0xe4483a, 0xffd23f, 0xff8ec2, 0xffffff, 0xb07ae0];

    function buildFlower() {
        scene.background = null;
        scene.fog = new THREE.Fog(0xbfe6ea, 26, 52);
        world.add(sky("#9fd6e6", "#f3ece0"));
        world.add(sea(-0.4));
        world.add(ground(10.5, "grass"));

        var bed = new THREE.Mesh(new THREE.CircleGeometry(4.3, 40), texMat("dirt", 4));
        bed.rotation.x = -Math.PI / 2; bed.position.y = 0.02;
        world.add(bed);

        // 꽃밭 테두리 돌
        for (var s = 0; s < 30; s++) {
            var sa = (Math.PI * 2 * s) / 30;
            var st = new THREE.Mesh(new THREE.DodecahedronGeometry(rnd(0.16, 0.26), 0), texMat("stone", 1));
            st.position.set(Math.cos(sa) * 4.55, 0.1, Math.sin(sa) * 4.55);
            st.rotation.set(rnd(0, 3), rnd(0, 3), rnd(0, 3));
            world.add(shade(st));
        }

        // 꽃 아치
        var arch = new THREE.Group();
        arch.position.set(0, 0, 4.9);
        [-1.1, 1.1].forEach(function (x) {
            arch.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.3, 8), texMat("darkwood", 1)), x, 1.15, 0));
        });
        var top = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.08, 8, 18, Math.PI), texMat("darkwood", 1));
        top.position.y = 2.3; arch.add(top);
        var acols = [0xe4483a, 0xff8ec2, 0xffd23f];
        for (var v = 0; v <= 12; v++) {
            var t2 = (v / 12) * Math.PI;
            var fb = ball(rnd(0.11, 0.17), acols[v % 3]);
            fb.position.set(-Math.cos(t2) * 1.1, 2.3 + Math.sin(t2) * 1.1, 0);
            arch.add(fb);
        }
        world.add(shadeAll(arch));

        world.add(bench(-4.6, 2.4, 0.7));
        world.add(bench(4.6, 2.4, -0.7));
        world.add(lantern(-3.2, -3.6));
        world.add(lantern(3.2, -3.6));

        world.add(tree(-7.2, -3.2, "camellia"));
        world.add(tree(6.8, -4.0, "camellia"));
        world.add(tree(-7.6, 4.4, "pine"));
        world.add(tree(7.4, 4.8, "camellia"));

        // 바깥쪽에 들꽃 흩뿌리기
        var wcols = [0xe4483a, 0xffd23f, 0xff8ec2, 0xffffff, 0xb07ae0];
        for (var i = 0; i < 5; i++) {
            var a = rnd(0, Math.PI * 2), r = rnd(5.2, 9.2);
            var wf = flowerMesh(wcols[i % wcols.length], rnd(0.7, 1.0));
            wf.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
            world.add(wf);
        }
        world.add(grassTufts(0, 0, 9.6, 46));

        while (flowerBeds.length < openBeds) flowerBeds.push({ stage: 0, at: 0, color: 0 });
        FLOWER_SPOTS.slice(0, openBeds).forEach(function (p, idx) {
            addI("bed", p[0], p[1], "꽃자리", { idx: idx });
        });
        renderFlowers();

        if (openBeds < FLOWER_SPOTS.length) {
            var nb2 = FLOWER_SPOTS[openBeds];
            var sg2 = labelSign("➕", "꽃자리", "🪙 " + expandCost(openBeds, BED_BASE), 0.7);
            sg2.position.set(nb2[0], 0.8, nb2[1]);
            world.add(sg2);
            world.add(shade(at(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.8, 6),
                                              texMat("darkwood", 1)), nb2[0], 0.4, nb2[1])));
            addI("expandBed", nb2[0], nb2[1], "꽃자리 늘리기");
        }

        addVillager("dongbaek", -3.4, 3);
        addDecorSpots("flower");
        addExit(0, 6.2);
    }

    var flowerNodes = [];
    function renderFlowers() {
        flowerNodes.forEach(function (n) { world.remove(n); });
        flowerNodes = [];
        FLOWER_SPOTS.slice(0, openBeds).forEach(function (p, idx) {
            var s = flowerBeds[idx];
            var g = new THREE.Group();
            g.position.set(p[0], 0.02, p[1]);
            if (s.stage === 1) {
                var st = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.03, 0.26, 5), mat(0x6fbf5a));
                st.position.y = 0.13; g.add(st);
                [-1, 1].forEach(function (d) {
                    var lf = ball(0.08, 0x7ac25c);
                    lf.scale.set(1.3, 0.3, 0.8);
                    lf.position.set(d * 0.08, 0.23, 0);
                    lf.rotation.z = -d * 0.55;
                    g.add(lf);
                });
            } else if (s.stage === 2) {
                g.add(bloomMesh(FLOWER_COLORS[s.color % FLOWER_COLORS.length], 1.2));
                g.userData.ripe = true;
            }
            shadeAll(g);
            world.add(g);
            flowerNodes.push(g);
        });
    }

    // ---- 상점 ---------------------------------------------------------------
    function buildShop() {
        scene.background = null;
        scene.fog = new THREE.Fog(0xd2dee2, 24, 48);
        world.add(sky("#a9cfdd", "#efe6d6"));
        world.add(ground(9.5, "sand"));

        // 제주 현무암 돌담 — 두 단으로 쌓아 실제 밭담처럼
        var stoneMat = texMat("stone", 1);
        for (var i = 0; i < 34; i++) {
            var a = (Math.PI * 2 * i) / 34;
            for (var lay = 0; lay < 2; lay++) {
                var s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38 + (i % 3) * 0.07, 0), stoneMat);
                s.scale.y = 0.72;
                s.position.set(Math.cos(a) * (8.4 + rnd(-0.1, 0.1)),
                               0.28 + lay * 0.48,
                               Math.sin(a) * (8.4 + rnd(-0.1, 0.1)));
                s.rotation.set(rnd(0, 3), rnd(0, 3), rnd(0, 3));
                world.add(shade(s));
            }
        }

        // 가게 본채 (기와 지붕)
        world.add(hut(0, -4.2, 0, 4.6, 2.8, "roof"));

        // 좌판
        var counter = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.9, 1.2), texMat("plank", 2));
        counter.position.set(0, 0.45, -1.6);
        world.add(shade(counter));
        var lip = new THREE.Mesh(new THREE.BoxGeometry(5.7, 0.12, 1.45), texMat("darkwood", 1));
        lip.position.set(0, 0.94, -1.6);
        world.add(shade(lip));

        // 차양 (기와)
        var awn = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.16, 2.6), texMat("roof", 2));
        awn.position.set(0, 2.45, -1.9);
        awn.rotation.x = -0.1;
        world.add(shade(awn));
        [-2.9, 2.9].forEach(function (x) {
            var po = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.4, 8), texMat("darkwood", 1));
            po.position.set(x, 1.2, -0.9);
            world.add(shade(po));
        });

        // 매달린 가게 간판
        // 팻말 자체가 이제 두께 있는 널빤지라, 따로 대던 뒷판은 없앴습니다
        var signBoard = labelSign("🏪", "하르방 상점", "", 1.05);
        signBoard.position.set(0, 2.02, -0.78);
        world.add(signBoard);

        world.add(lantern(-3.2, -0.6));
        world.add(lantern(3.2, -0.6));
        world.add(barrel(-4.2, -2.6));
        world.add(barrel(-4.2, -1.6));
        world.add(crate(4.3, -2.6));
        world.add(sack(4.3, -1.5));
        world.add(sack(-5.0, -0.4));
        world.add(bench(-5.6, 2.6, 0.6));
        world.add(tree(-6.8, 4.6, "pine"));
        world.add(tree(6.6, 4.4, "camellia"));
        world.add(pathStones(0, 5.2, 0, 0.4, 6));
        world.add(grassTufts(0, 3, 7.5, 40));
        world.add(pebbles(0, 0, 8, 16));

        // 파는 물건 세 가지를 좌판 위에
        // 좌판 위 바구니 셋 — 물건마다 담긴 모양을 다르게 하고,
        // 위에 이모지 팻말을 띄워 뭘 파는지 바로 보이게
        SHOP_BUY.forEach(function (k, i) {
            var x = -1.7 + i * 1.7;
            var basket = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.26, 12), texMat("plank", 1));
            basket.position.set(x, 1.13, -1.6);
            world.add(shade(basket));
            var rim = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.035, 6, 14), texMat("darkwood", 1));
            rim.rotation.x = Math.PI / 2; rim.position.set(x, 1.26, -1.6);
            world.add(shade(rim));

            if (k === "seed") {
                for (var b = 0; b < 7; b++) {
                    var pip = ball(0.06, 0x8fce63);
                    pip.scale.set(1, 0.7, 1.3);
                    pip.position.set(x + rnd(-0.15, 0.15), 1.28, -1.6 + rnd(-0.13, 0.13));
                    world.add(shade(pip));
                }
            } else if (k === "bait") {
                for (var w = 0; w < 5; w++) {
                    var worm = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.022, 5, 8, Math.PI * 1.4), mat(0xb0653a));
                    worm.position.set(x + rnd(-0.13, 0.13), 1.28, -1.6 + rnd(-0.11, 0.11));
                    worm.rotation.set(rnd(0.8, 1.8), rnd(0, 3), rnd(0, 3));
                    world.add(shade(worm));
                }
            } else {
                for (var s2 = 0; s2 < 8; s2++) {
                    var grain = ball(0.045, 0xe8c96a);
                    grain.scale.set(1, 1.6, 1);
                    grain.position.set(x + rnd(-0.14, 0.14), 1.28, -1.6 + rnd(-0.12, 0.12));
                    grain.rotation.z = rnd(-0.6, 0.6);
                    world.add(shade(grain));
                }
            }

            var sign = labelSign(ITEMS[k].emoji, ITEMS[k].label, "🪙 " + ITEMS[k].buy, 0.66);
            sign.position.set(x, 1.85, -1.35);
            world.add(sign);

            addI("buy", x, -0.6, ITEMS[k].emoji + " " + ITEMS[k].label + " 사기 (🪙" + ITEMS[k].buy + ")", { item: k });
        });

        // 파는 자리 — 수레
        var cart = new THREE.Group();
        cart.position.set(3.4, 0, 1.0);
        var bin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.62, 1.0), texMat("plank", 1));
        bin.position.y = 0.55; cart.add(bin);
        [-0.6, 0.6].forEach(function (x) {
            var wh = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.07, 8, 16), texMat("darkwood", 1));
            wh.position.set(x, 0.26, 0.54); cart.add(wh);
        });
        var handle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.1), texMat("darkwood", 1));
        handle.position.set(0, 0.8, -0.85); handle.rotation.x = 0.3; cart.add(handle);

        // 수레에 지금 가진 수확물을 실제로 쌓아 보여줍니다
        var piled = 0;
        [["crop", 0xff9526], ["fish", 0x7fb8d4], ["flower", 0xe4483a]].forEach(function (e) {
            var n = Math.min(4, bag[e[0]] || 0);
            for (var i = 0; i < n; i++) {
                var it = ball(0.13, e[1]);
                it.position.set(rnd(-0.5, 0.5), 0.9 + (piled % 2) * 0.1, rnd(-0.3, 0.3));
                cart.add(it);
                piled++;
            }
        });
        world.add(shadeAll(cart));

        var sellSign = labelSign("💰", "팔기", "", 0.7);
        sellSign.position.set(3.4, 1.75, 1.0);
        world.add(sellSign);
        addI("sell", 3.4, 2.0, "수확물 팔기");

        // 가구 가판 — 실제 가구 몇 점을 세워둬서 뭘 파는지 보이게
        var fstand = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 1.4), texMat("plank", 1));
        fstand.position.set(-4.4, 0.25, 1.6);
        world.add(shade(fstand));
        var mini1 = makeFurniture("chair"); mini1.scale.setScalar(0.6); mini1.position.set(-5.0, 0.5, 1.6);
        world.add(mini1);
        var mini2 = makeFurniture("lamp"); mini2.scale.setScalar(0.55); mini2.position.set(-3.9, 0.5, 1.6);
        world.add(mini2);
        var fsign = labelSign("🪑", "가구", "", 0.72);
        fsign.position.set(-4.4, 1.5, 2.35);
        world.add(fsign);
        addI("furnShop", -4.4, 2.7, "🪑 가구 사기");

        // 도구 가판
        var tstand = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 1.2), texMat("plank", 1));
        tstand.position.set(5.6, 0.25, 3.2);
        world.add(shade(tstand));
        var can = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.34, 10), mat(0x7fa9d6));
        can.position.set(5.1, 0.67, 3.2); world.add(shade(can));
        var spout = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.4, 6), mat(0x7fa9d6));
        spout.position.set(4.8, 0.8, 3.2); spout.rotation.z = 0.9; world.add(shade(spout));
        var rodProp = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.045, 1.5, 6), mat(0x2f3a44));
        rodProp.position.set(6.2, 1.1, 3.2); rodProp.rotation.z = 0.35; world.add(shade(rodProp));
        var tsign = labelSign("🔧", "도구 강화", "", 0.72);
        tsign.position.set(5.6, 1.55, 3.9);
        world.add(tsign);
        addI("toolShop", 5.6, 4.2, "🔧 도구 강화하기");

        // 조경 가판 — 섬 밖을 꾸미는 것들.
        // 실물 몇 개를 세워둬서 뭘 파는지 지나가다 바로 보이게 했습니다.
        // 처음에는 (-6.2, 4.4) 에 뒀는데 거기 소나무가 서 있어서
        // 가판이 나무 속에 박혀 있었습니다. 빈 자리로 옮겼어요.
        var dstand = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.5, 1.4), texMat("plank", 1));
        dstand.position.set(-4.1, 0.25, 4.2);
        world.add(shade(dstand));
        var d1 = makeDecor("harbang");   d1.scale.setScalar(0.45); d1.position.set(-4.9, 0.5, 4.2);
        world.add(d1);
        var d2 = makeDecor("stonelamp"); d2.scale.setScalar(0.5);  d2.position.set(-4.1, 0.5, 4.2);
        world.add(d2);
        var d3 = makeDecor("flowerbed"); d3.scale.setScalar(0.55); d3.position.set(-3.3, 0.5, 4.2);
        world.add(d3);
        var dsign = labelSign("🌷", "섬 꾸미기", "", 0.72);
        dsign.position.set(-4.1, 1.6, 4.9);
        world.add(dsign);
        addI("decorShop", -4.1, 5.2, "🌷 섬 꾸밀 것 사기");

        addVillager("harbang", -3.2, 0.6);
        addExit(0, 6.4);
    }

    // ---- 내 오두막 -----------------------------------------------------------
    // 벽으로 둘러싸인 방. 바닥 자리 여덟 곳에 산 가구를 놓습니다.
    var HOME_SLOTS = [
        [-2.6, -2.4], [0, -2.9], [2.6, -2.4],
        [-3.1, 0.2], [3.1, 0.2],
        [-2.4, 2.6], [0, 3.0], [2.4, 2.6]
    ];
    var homeNodes = [];

    function buildHome() {
        scene.background = null;
        scene.fog = new THREE.Fog(0xe4d8c4, 26, 52);
        world.add(sky("#b9d8e4", "#f2e8d8"));
        world.add(ground(9.5, "grass"));

        // 바닥
        var floor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.14, 9), texMat("plank", 5));
        floor.position.y = 0.07;
        world.add(shade(floor, false, true));

        // 벽 세 면 (남쪽은 트여 있어 드나듦)
        var wallM = texMat("plaster", 3);
        [[0, -4.5, 9, 0.3], [-4.5, 0, 0.3, 9], [4.5, 0, 0.3, 9]].forEach(function (w) {
            var wl = new THREE.Mesh(new THREE.BoxGeometry(w[2], 2.8, w[3]), wallM);
            wl.position.set(w[0], 1.4, w[1]);
            world.add(shade(wl));
        });
        // 서까래
        for (var b = -4; b <= 4; b += 2) {
            var beam = new THREE.Mesh(new THREE.BoxGeometry(9, 0.16, 0.18), texMat("darkwood", 1));
            beam.position.set(0, 2.75, b);
            world.add(shade(beam));
        }
        // 창문
        [[-2.2, -4.42], [2.2, -4.42]].forEach(function (p) {
            var fr = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 0.12), texMat("darkwood", 1));
            fr.position.set(p[0], 1.7, p[1]); world.add(shade(fr));
            var gl = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.82, 0.06), mat(0xbfe4ee, { alpha: 0.7 }));
            gl.position.set(p[0], 1.7, p[1] + 0.05); world.add(gl);
        });

        // 밖: 초가지붕 얹은 오두막 외벽 느낌
        world.add(tree(-7.2, -3.4, "camellia"));
        world.add(tree(7.0, -3.8, "pine"));
        world.add(grassTufts(0, 6, 6, 26));
        world.add(pathStones(0, 6.2, 0, 4.6, 3));

        // 가구 자리
        HOME_SLOTS.forEach(function (p, idx) {
            addI("slot", p[0], p[1], "자리", { idx: idx });
        });
        if (homeSlots.length !== HOME_SLOTS.length) {
            homeSlots = HOME_SLOTS.map(function () { return null; });
        }
        renderHome();

        addExit(0, 5.6);
    }

    var homeGlows = [];

    // 등불은 노란 불빛, 화로는 붉은 불빛 — 놓은 게 뭔지 색으로 알아보게
    var GLOW_KIND = {
        lamp:  { color: 0xffc978, power: 1.05, dist: 8.5, y: 1.35 },
        stove: { color: 0xff8a3c, power: 0.95, dist: 7.0, y: 0.75 }
    };
    var MAX_HOME_GLOW = 3;   // 그 이상은 느려지기만 하고 티도 안 납니다

    function renderHome() {
        homeNodes.forEach(function (n) { world.remove(n); });
        homeNodes = [];

        var glowSpots = [];
        HOME_SLOTS.forEach(function (p, idx) {
            var id = homeSlots[idx];
            var g = new THREE.Group();
            g.position.set(p[0], 0.14, p[1]);
            // 가구는 방 가운데를 바라보게 — 책장·침대 등받이가 벽을 향합니다
            g.rotation.y = Math.atan2(-p[0], -p[1]);

            if (id && FURNITURE[id]) {
                g.add(makeFurniture(id));
                if (GLOW_KIND[id]) glowSpots.push({ p: p, k: GLOW_KIND[id] });
            } else {
                // 빈 자리는 옅은 고리로만 표시
                var pad = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.4, 16),
                                         mat(0xffffff, { alpha: 0.28 }));
                pad.rotation.x = -Math.PI / 2;
                pad.position.y = 0.01;
                g.add(pad);
            }
            world.add(g);
            homeNodes.push(g);
        });

        // 등불이나 화로를 놓으면 방이 실제로 따뜻해집니다.
        // 꾸민 보람이 눈에 보이도록 넣은 장치입니다.
        clearHomeGlow();
        glowSpots.slice(0, MAX_HOME_GLOW).forEach(function (s) {
            var L = new THREE.PointLight(s.k.color, s.k.power, s.k.dist, 1.6);
            L.position.set(s.p[0], s.k.y, s.p[1]);
            scene.add(L);
            homeGlows.push(L);
        });
    }

    function clearHomeGlow() {
        homeGlows.forEach(function (L) { scene.remove(L); });
        homeGlows = [];
    }

    // =================================================================
    // 섬 꾸미기 — 야외 조경물 놓기
    //
    // 구역마다 '꾸밀 자리'를 정해 뒀습니다. 아무 데나 놓게 하면
    // 길을 막거나 밭 위에 겹쳐서 오히려 보기 싫어져요.
    // 자리는 길과 밭을 피해서, 눈에는 잘 띄는 곳으로 골랐습니다.
    // =================================================================
    // 자리는 밭·꽃자리·이웃·나가는 길에서 넉넉히 떨어뜨려 뒀습니다.
    // 가까이 붙으면 꾸미려다 이웃에게 말을 걸거나 밖으로 나가버려요.
    // (조작 반경 2.6 기준으로 서로 2.0 이상 띄웠습니다)
    // 자리를 고를 때 두 가지를 봤습니다.
    //   1) 나무·오두막 같은 기존 물건에 파묻히지 않을 것
    //      (제일 큰 연못 반지름 1.08 을 놓아도 여유가 남게)
    //   2) 밭·이웃·나가는 길에서 2.0 이상 떨어질 것
    // 처음 잡은 자리 중 일곱 곳이 나무 안에 박혀 있어서 전부 다시 골랐습니다.
    var DECOR_SPOTS = {
        hub:     [[-4.6, 4.2], [4.6, 4.2], [-4.6, -2.2], [4.6, -2.2], [0, 6.6], [0, -5.2]],
        farm:    [[3.2, 5.6], [-5.2, 5.0], [5.0, 4.0]],
        fishing: [[-6.6, -0.8], [4.0, -3.0], [4.0, -0.4]],
        flower:  [[3.4, 5.4], [-6.6, -0.6], [5.8, -1.6]]
    };
    var decorNodes = [], decorGlows = [], decorSpin = [];

    function decorList(areaKey) {
        var spots = DECOR_SPOTS[areaKey];
        if (!spots) return null;
        if (!decorSlots[areaKey] || decorSlots[areaKey].length !== spots.length) {
            var old = decorSlots[areaKey] || [];
            decorSlots[areaKey] = spots.map(function (_, i) { return old[i] || null; });
        }
        return decorSlots[areaKey];
    }

    // 구역을 지을 때 불러서 꾸밀 자리를 만듭니다
    function addDecorSpots(areaKey) {
        var spots = DECOR_SPOTS[areaKey];
        if (!spots) return;
        decorList(areaKey);
        spots.forEach(function (p, idx) {
            addI("dslot", p[0], p[1], "꾸밀 자리", { idx: idx, area: areaKey });
        });
        renderDecor(areaKey);
    }

    function clearDecorGlow() {
        decorGlows.forEach(function (L) { scene.remove(L); });
        decorGlows = [];
    }

    function renderDecor(areaKey) {
        var spots = DECOR_SPOTS[areaKey];
        if (!spots) return;
        var list = decorList(areaKey);

        // 2D 화면에서는 3D 물체를 만들지 않고 목록만 다시 그립니다.
        // (이게 없으면 놓았는데도 목록에 '비어 있어요'가 그대로 남아요)
        if (mode2d) { render2D(); return; }

        decorNodes.forEach(function (n) { world.remove(n); });
        decorNodes = [];
        decorSpin = [];
        clearDecorGlow();

        var lights = [];
        spots.forEach(function (p, idx) {
            var id = list[idx];
            var g = new THREE.Group();
            g.position.set(p[0], 0, p[1]);
            g.rotation.y = Math.atan2(-p[0], -p[1]);   // 섬 가운데를 바라보게

            if (id && DECOR[id]) {
                var m = makeDecor(id);
                g.add(m);
                if (m.userData.spin) decorSpin.push({ node: m.userData.spin, kind: "spin" });
                if (m.userData.swing) decorSpin.push({ node: m.userData.swing, kind: "swing" });
                if (DECOR[id].glow) lights.push({ p: p, k: DECOR[id].glow });
            } else {
                // 빈 자리는 옅은 고리로만 — 밟고 지나가도 걸리적거리지 않게
                var pad = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 18),
                                         mat(0xffffff, { alpha: 0.22 }));
                pad.rotation.x = -Math.PI / 2;
                pad.position.y = 0.03;
                g.add(pad);
            }
            world.add(g);
            decorNodes.push(g);
        });

        lights.slice(0, MAX_DECOR_GLOW).forEach(function (s) {
            var L = new THREE.PointLight(s.k.color, s.k.power, s.k.dist, 1.6);
            L.position.set(s.p[0], s.k.y, s.p[1]);
            scene.add(L);
            decorGlows.push(L);
        });
    }

    // 자리에 조경물을 놓거나, 놓인 걸 도로 거둡니다
    function useDecorSlot(areaKey, idx) {
        var list = decorList(areaKey);
        if (!list) return;

        if (list[idx]) {
            var id = list[idx];
            list[idx] = null;
            decorOwned[id] = (decorOwned[id] || 0) + 1;
            renderDecor(areaKey); save();
            msg(DECOR[id].name + eulReul(DECOR[id].name) + " 거뒀어요.\n다른 곳에 다시 놓을 수 있어요.");
            return;
        }

        var have = DECOR_ORDER.filter(function (k) { return (decorOwned[k] || 0) > 0; });
        if (!have.length) {
            msg("놓을 조경물이 없어요.\n하르방 상점의 조경 가판에서 살 수 있어요.");
            return;
        }
        var rows = have.map(function (k) {
            return '<button type="button" class="i3-pick" data-dput="' + k + '">' +
                   DECOR[k].emoji + " " + DECOR[k].name + " ×" + decorOwned[k] + '</button>';
        }).join("");
        showPanel("여기에 무엇을 놓을까요?",
            '<div class="i3-picks">' + rows + '</div><button type="button" id="i3-close">그만두기</button>');
        elPanel.querySelectorAll("[data-dput]").forEach(function (b) {
            b.onclick = function (e) {
                e.stopPropagation();
                var k = b.getAttribute("data-dput");
                decorOwned[k]--;
                if (decorOwned[k] <= 0) delete decorOwned[k];
                list[idx] = k;
                renderDecor(areaKey); closePanel(); save();
                msg(DECOR[k].emoji + " " + DECOR[k].name + eulReul(DECOR[k].name) + " 놓았어요.");
            };
        });
        elPanel.querySelector("#i3-close").onclick = closePanel;
    }

    // 사놓고 아직 안 놓은 조경물 수
    function heldDecorCount() {
        var n = 0;
        DECOR_ORDER.forEach(function (k) { n += decorOwned[k] || 0; });
        return n;
    }

    // 지금까지 섬에 놓은 조경물 수 (현황판·안내에 씁니다)
    function placedDecorCount() {
        var n = 0;
        Object.keys(decorSlots).forEach(function (a) {
            (decorSlots[a] || []).forEach(function (s) { if (s) n++; });
        });
        return n;
    }

    function decorSpotTotal() {
        var n = 0;
        Object.keys(DECOR_SPOTS).forEach(function (a) { n += DECOR_SPOTS[a].length; });
        return n;
    }

    function openDecorShop() {
        var rows = DECOR_ORDER.map(function (k) {
            var d = DECOR[k];
            var have = decorOwned[k] || 0;
            var placed = 0;
            Object.keys(decorSlots).forEach(function (a) {
                (decorSlots[a] || []).forEach(function (s) { if (s === k) placed++; });
            });
            var can = coins >= d.price;
            return '<div class="i3-row">' +
                   '<span>' + d.emoji + " " + d.name +
                   (d.glow ? ' <small>· 밤에 주변을 밝혀요</small>' : '') +
                   (have || placed ? '<br><small>가진 ' + have + ' · 놓음 ' + placed + '</small>' : '') +
                   '</span>' +
                   '<button type="button" class="i3-mini" data-decor="' + k + '"' + (can ? '' : ' disabled') +
                   '>🪙' + d.price + '</button></div>';
        }).join("");
        showPanel("🌷 조경 가판 · 🪙" + coins,
            rows + '<p class="i3-ask"><small>섬 곳곳의 빈 자리(흰 고리)에 놓을 수 있어요. ' +
            '지금 ' + placedDecorCount() + ' / ' + decorSpotTotal() + '자리를 꾸몄어요.</small></p>' +
            '<button type="button" id="i3-close">닫기</button>');
        elPanel.querySelectorAll("[data-decor]").forEach(function (b) {
            b.onclick = function (e) {
                e.stopPropagation();
                var k = b.getAttribute("data-decor");
                if (coins < DECOR[k].price) { msg("코인이 모자라요."); return; }
                coins -= DECOR[k].price;
                decorOwned[k] = (decorOwned[k] || 0) + 1;
                updateHud(); save();
                msg(DECOR[k].emoji + " " + DECOR[k].name + eulReul(DECOR[k].name) + " 샀어요!\n섬의 빈 자리에 놓아보세요.");
                openDecorShop();
            };
        });
        elPanel.querySelector("#i3-close").onclick = closePanel;
    }

    // 나가는 길 옆에 현황판을 하나 세웁니다.
    // 허브까지 돌아가지 않아도, 오두막을 꾸미다가도 바로 확인할 수 있게요.
    function addBoardHere(x, z) {
        var nb = noticeBoard();
        nb.position.set(x, 0, z);
        nb.rotation.y = Math.atan2(-x, -z);
        nb.scale.set(0.8, 0.8, 0.8);
        world.add(nb);
        addI("board", x, z, "📋 섬 현황판 보기");
    }

    function addExit(x, z) {
        // 출구 옆(왼쪽 두 걸음)에 현황판
        addBoardHere(x - 2.2, z - 0.4);

        var g = new THREE.Group();
        g.position.set(x, 0, z);
        var wood = texMat("darkwood", 1);
        g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.7, 0.14), wood), -0.55, 0.85, 0));
        g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.7, 0.14), wood), 0.55, 0.85, 0));
        var b = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.62, 0.1), texMat("plank", 1));
        b.position.y = 1.5; g.add(b);
        var fr = box(1.66, 0.74, 0.06, 0x4a2f1a);
        fr.position.set(0, 1.5, -0.03); g.add(fr);
        // 왼쪽을 가리키는 화살표
        var ar = box(0.7, 0.12, 0.05, 0xf3e2b8);
        ar.position.set(0.08, 1.5, 0.06); g.add(ar);
        var tip = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.26, 3), mat(0xf3e2b8));
        tip.position.set(-0.36, 1.5, 0.06); tip.rotation.z = Math.PI / 2; g.add(tip);
        var roof = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.1, 0.44), texMat("roof", 1));
        roof.position.y = 1.9; roof.rotation.x = 0.14; g.add(roof);
        world.add(shadeAll(g));
        addI("exit", x, z, "← 섬으로 돌아가기");
    }

    // =================================================================
    // 구역 전환
    // =================================================================
    var AREA_BUILD = { hub: buildHub, farm: buildFarm, fishing: buildFishing,
                       flower: buildFlower, shop: buildShop, home: buildHome };
    var AREA_SPAWN = { hub: [0, 6], farm: [0, 5.4], fishing: [0, 4.6],
                       flower: [0, 5], shop: [0, 5.2], home: [0, 4.2] };

    function goArea(key) {
        // 대화·상점창을 열어둔 채로 넘어가면 busy 가 남아 조작이 먹통이 됩니다
        if (elPanel) elPanel.classList.remove("show");
        if (elDlg) elDlg.classList.remove("show");
        dlgAll = []; dlgPos = 0; dlgQ = [];
        busy = false;

        area = key;
        endCast();
        if (key !== "home") clearHomeGlow();   // 오두막 불빛은 그 방에서만
        // 조경물 불빛(돌등)도 scene 에 직접 달리므로, 구역을 옮길 때
        // 꺼주지 않으면 다른 구역까지 따라와 밝힙니다.
        clearDecorGlow();
        decorNodes = []; decorSpin = [];

        // [배포 점검 1] 2D 화면에서는 3D 오브젝트를 아예 만들지 않습니다.
        // THREE 가 없는 기기에서도 여기까지 무사히 지나가야 해요.
        if (mode2d) { render2D(); updateHud(); return; }

        clearWorld();
        AREA_BUILD[key]();
        applyZoneMood(key);      // 폐허 → 복원 단계에 맞춰 분위기와 소품을 덧칠
        var sp = AREA_SPAWN[key];
        pos.x = sp[0]; pos.z = sp[1];
        // 스폰 지점은 구역 남쪽(+z)이라 -z 를 봐야 안쪽이 보입니다.
        // yaw=0 일 때 전방이 -z 입니다 (전방벡터 = -sin(yaw), -cos(yaw)).
        yaw = 0;
        pitch = 0;
        elWhere.innerText = key === "hub" ? "🏝️ 제록이 섬" : (ZONES[key].emoji + " " + ZONES[key].label);
        msg(key === "hub" ? "문 앞에 서면 들어갈 수 있어요." : ZONES[key].label + "에 들어왔어요.");
        save();
    }

    // =================================================================
    // 이동 · 시점
    // =================================================================
    function updatePlayer(dt) {
        if (busy) return;
        if (keys.lookL) yaw += CFG.keyLook * dt;
        if (keys.lookR) yaw -= CFG.keyLook * dt;

        var f = (keys.up ? 1 : 0) - (keys.down ? 1 : 0);
        var s = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
        if (f || s) {
            var len = Math.hypot(f, s); f /= len; s /= len;
            var fx = -Math.sin(yaw), fz = -Math.cos(yaw);
            var rx = Math.cos(yaw),  rz = -Math.sin(yaw);
            var nx = pos.x + (fx * f + rx * s) * CFG.speed * dt;
            var nz = pos.z + (fz * f + rz * s) * CFG.speed * dt;
            var lim = area === "hub" ? 13.0 : 7.6;
            if (Math.hypot(nx, nz) < lim) { pos.x = nx; pos.z = nz; }
        }
        camera.position.set(pos.x, CFG.eye, pos.z);
        camera.rotation.y = yaw;
        camera.rotation.x = pitch;
    }

    function nearest() {
        var best = null, bd = CFG.reach;
        for (var i = 0; i < interactables.length; i++) {
            var it = interactables[i];
            if (it.gone) continue;
            var d = Math.hypot(it.x - pos.x, it.z - pos.z);
            if (d < bd) { bd = d; best = it; }
        }
        return best;
    }

    function labelFor(it) {
        if (it.kind === "plot") {
            var s = farmPlots[it.idx];
            if (s.stage === 0) return bag.seed > 0 ? "🌱 씨앗 심기" : "씨앗이 없어요";
            if (s.stage === 1) return s.watered ? "자라는 중…" : "💧 물 주기";
            return "🍊 수확하기";
        }
        if (it.kind === "bed") {
            var b = flowerBeds[it.idx];
            if (b.stage === 0) return bag.fseed > 0 ? "🌾 꽃씨 심기" : "꽃씨가 없어요";
            if (b.stage === 1) return "피는 중…";
            return "🌸 꽃 꺾기";
        }
        if (it.kind === "fish") {
            if (fishStage === "bite") return "❗ 지금 당기기!";
            if (fishStage === "waiting") return "기다리는 중…";
            return bag.bait > 0 ? "🎣 낚시하기" : "미끼가 없어요";
        }
        if (it.kind === "slot") {
            var id = homeSlots[it.idx];
            if (id) return "🔄 " + FURNITURE[id].name + " 치우기";
            return heldFurnitureCount() ? "🪑 가구 놓기" : "빈 자리 (가구를 사 오세요)";
        }
        if (it.kind === "dslot") {
            var list = decorList(it.area);
            var did = list && list[it.idx];
            if (did) return "🔄 " + DECOR[did].name + " 거두기";
            return heldDecorCount() ? "🌷 여기 꾸미기" : "빈 자리 (조경 가판에서 사 오세요)";
        }
        if (it.kind === "expandPlot") return "🌱 밭 한 칸 늘리기 (🪙" + expandCost(openPlots, PLOT_BASE) + ")";
        if (it.kind === "expandBed") return "🌸 꽃자리 늘리기 (🪙" + expandCost(openBeds, BED_BASE) + ")";
        return it.label;
    }

    // =================================================================
    // 상호작용
    // =================================================================
    function interact() {
        if (busy) { closePanel(); return; }
        var t = ringTarget;
        if (!t) { msg("조금 더 가까이 가 보세요."); return; }

        switch (t.kind) {
            case "gate":     goArea(t.to); return;
            case "exit":     goArea("hub"); return;
            case "board":    readBoard(); return;
            case "villager": talkTo(t.npc); return;
            case "plot":     tendPlot(t.idx); break;
            case "bed":      tendBed(t.idx); break;
            case "fish":     doFish(); break;
            case "buy":      buyItem(t.item); break;
            case "sell":     openSell(); return;
            case "furnShop": openFurnitureShop(); return;
            case "toolShop": openToolShop(); return;
            case "decorShop": openDecorShop(); return;
            case "slot":     useSlot(t.idx); return;
            case "dslot":    useDecorSlot(t.area, t.idx); return;
            case "expandPlot": expandPlots(); break;
            case "expandBed":  expandBeds(); break;
        }
        updateHud();
        save();
    }

    // 게시판은 이제 안내문이 아니라 '섬 현황판'입니다.
    // 어디를 얼마나 되살렸는지, 다음에 뭘 하면 되는지 여기서 확인해요.
    // 오두막에서 가구를 놓는 중에도 볼 수 있도록 모든 구역에 세워 뒀습니다.
    var BOARD_ZONES = [
        { k: "beach",      emoji: "🏖️", name: "바닷길" },
        { k: "farm",       emoji: "🍊", name: "감귤밭" },
        { k: "flower",     emoji: "🌺", name: "동백 정원" },
        { k: "lighthouse", emoji: "🗼", name: "등대" },
        { k: "home",       emoji: "🏠", name: "내 오두막" }
    ];

    function readBoard() {
        var w = W();
        var warmth = w ? w.warmth : 0;
        var done = 0, total = 0;
        var lines = [];

        var status = BOARD_ZONES.map(function (z) {
            var lv = zoneLv(z.k);
            done += (lv - 1); total += 2;
            var bar = ["●", "●", "●"].map(function (_, i) { return i < lv ? "●" : "○"; }).join("");
            return z.emoji + " " + z.name + "  " + bar + " " + lv + "/3";
        }).join("\n");

        lines.push("📋 제록이 섬 현황판\n\n" + status);
        lines.push("🔥 지금 모은 온기: " + warmth + "\n\n" +
                   "복원 진행: " + done + " / " + total + " 단계\n" +
                   (done === total ? "섬이 다 되살아났어요! 🎉"
                                   : "포털 화면의 '제록이 섬 복원'에서\n온기를 들일 수 있어요."));

        // 아직 못 되살린 곳 중 제일 싼 곳을 다음 목표로 짚어줍니다
        var next = null;
        BOARD_ZONES.forEach(function (z) {
            if (zoneLv(z.k) >= 3) return;
            if (!next) next = z;
        });
        if (next) {
            lines.push("👉 다음에 손볼 만한 곳\n\n" + next.emoji + " " + next.name +
                       " (지금 " + zoneLv(next.k) + "단계)\n\n" +
                       "밭일·낚시·꽃 나누기로 온기가 쌓여요.");
        }

        // 복원과 꾸미기는 다른 일입니다.
        // 복원은 온기로 되살리는 것, 꾸미기는 코인으로 내 마음대로 두는 것.
        var dPlaced = placedDecorCount(), dTotal = decorSpotTotal();
        lines.push("🌷 섬 꾸미기\n\n" +
                   "꾸민 자리: " + dPlaced + " / " + dTotal + "\n" +
                   (heldDecorCount() ? "가진 조경물 " + heldDecorCount() + "개를\n빈 자리에 놓아보세요."
                    : dPlaced >= dTotal ? "빈 자리를 다 채웠어요! 🎉"
                    : "하르방 상점의 조경 가판에서\n살 수 있어요."));

        lines.push("🍊 감귤 농장 — 감귤이\n🎣 바다 낚시터 — 제록이\n" +
                   "🌺 동백 꽃밭 — 동백이\n🏪 하르방 상점 — 하르방");
        lines.push("아무것도 안 하고\n걷다 가셔도 괜찮아요.");

        openDialog("섬 현황판", "", lines);
    }

    // ---- 도구 효과 ------------------------------------------------------
    // 강화한 도구가 실제로 체감되도록 성장 시간과 물고기 확률에 곧장 먹입니다.
    var GROW_MULT = [1, 0.75, 0.55];
    function cropMs()   { return CFG.cropMs   * GROW_MULT[tools.water]; }
    function flowerMs() { return CFG.flowerMs * GROW_MULT[tools.spade]; }

    // ---- 농사 -----------------------------------------------------------
    // =================================================================
    // [P0] 공용 월드(온기 · 복원 · 동반자) 연결
    //
    // app.js 가 window.jerokiWorld 에 같은 객체를 올려둡니다.
    // 섬은 그 값을 읽어 풍경을 바꾸고, 활동하면 온기를 돌려줍니다.
    // 섬만 따로 열어도 죽지 않도록 전부 안전하게 감쌌습니다.
    // =================================================================
    function W() { return window.jerokiWorld || null; }

    function zoneLv(key) {
        var w = W();
        return (w && w.restoration && w.restoration[key]) || 1;
    }

    function gainWarmth(n, why) {
        if (typeof window.addWarmth === "function") window.addWarmth(n, why);
    }

    // 동반자가 곁에 있으면 섬에도 같이 나타납니다
    function companion() {
        var w = W();
        if (!w || !w.activeCompanionId) return null;
        for (var i = 0; i < (w.companions || []).length; i++) {
            if (w.companions[i].id === w.activeCompanionId) return w.companions[i];
        }
        return null;
    }

    function companionIs(species) {
        var c = companion();
        return !!c && c.species === species;
    }

    // 복원 단계가 오르면 그 구역을 다시 지어 눈에 보이게 바꿉니다.
    // app.js 의 restoreZone() 이 이걸 부릅니다.
    window.islandRefreshArea = function () {
        if (!open) return;
        try { goArea(area); } catch (e) {}
    };

    function tendPlot(i) {
        var s = farmPlots[i];
        if (s.stage === 0) {
            if (bag.seed <= 0) { msg("씨앗이 없어요. 상점에서 살 수 있어요."); return; }
            bag.seed--; s.stage = 1; s.at = elapsed; s.watered = false;
            msg("씨앗을 심었어요. 물을 주면 빨리 자라요 🌱");
        } else if (s.stage === 1) {
            if (!s.watered) { s.watered = true; s.at = elapsed - cropMs() / 1000 * 0.4; msg("물을 줬어요 💧"); }
            else msg("잘 자라고 있어요. 조금만 기다려요.");
        } else {
            // 물 준 표시까지 지워야 다음 씨앗이 이미 물 준 상태로 시작하지 않습니다
            s.stage = 0; s.watered = false; bag.crop++;
            gainWarmth(1);            // [P0] 섬에서 일한 것도 온기가 됩니다
            epTick("crop");           // [P1] 에피소드 진행
            msg("감귤을 수확했어요! 🍊+1");
        }
        renderFarm();
    }

    function updateFarm() {
        var changed = false;
        for (var i = 0; i < farmPlots.length; i++) {
            var s = farmPlots[i];
            if (s.stage === 1 && (elapsed - s.at) * 1000 > cropMs()) { s.stage = 2; changed = true; }
        }
        if (changed && area === "farm") { renderFarm(); msg("감귤이 익었어요! 🍊"); }
    }

    // ---- 꽃 -------------------------------------------------------------
    function tendBed(i) {
        var b = flowerBeds[i];
        if (b.stage === 0) {
            if (bag.fseed <= 0) { msg("꽃씨가 없어요. 상점에서 살 수 있어요."); return; }
            bag.fseed--; b.stage = 1; b.at = elapsed;
            b.color = Math.floor(Math.random() * FLOWER_COLORS.length);
            msg("꽃씨를 심었어요 🌾");
        } else if (b.stage === 1) {
            msg("곧 필 거예요.");
        } else {
            b.stage = 0; bag.flower++;
            gainWarmth(1);            // [P0]
            epTick("flower");         // [P1]
            msg("꽃을 꺾었어요 🌸+1\n이웃에게 선물할 수 있어요.");
        }
        renderFlowers();
    }

    function updateFlowers() {
        var changed = false;
        for (var i = 0; i < flowerBeds.length; i++) {
            var b = flowerBeds[i];
            if (b.stage === 1 && (elapsed - b.at) * 1000 > flowerMs()) { b.stage = 2; changed = true; }
        }
        if (changed && area === "flower") { renderFlowers(); msg("꽃이 피었어요 🌸"); }
    }

    // ---- 낚시 -----------------------------------------------------------
    function doFish() {
        if (fishStage === "idle") {
            if (bag.bait <= 0) { msg("미끼가 없어요. 상점에서 살 수 있어요."); return; }
            bag.bait--;
            fishStage = "waiting";
            fishBiteAt = elapsed + CFG.fishBite;
            // 바라보는 쪽 앞바다로 찌를 던집니다
            var d = 7.5;
            castAt = { x: pos.x - Math.sin(yaw) * d, z: pos.z - Math.cos(yaw) * d };
            if (castBobber) {
                castBobber.position.set(castAt.x, 0.06, castAt.z);
                castBobber.visible = true;
            }
            if (castLine) castLine.visible = true;
            rodKick = 0.5;
            msg("찌를 던졌어요. 쏙 들어가면 당기세요 🎣");
        } else if (fishStage === "waiting") {
            endCast();
            msg("너무 일찍 당겼어요. 괜찮아요, 또 하면 되죠.");
        } else {
            var f = rollFish();
            bag.fish++;
            endCast();
            rodKick = 1.4;
            gainWarmth(1);            // [P0]
            epTick("fish");           // [P1]
            msg(f.emoji + " " + f.name + eulReul(f.name) + " 잡았어요!");
        }
    }

    function endCast() {
        fishStage = "idle";
        castAt = null;
        if (castBobber) castBobber.visible = false;
        if (castLine) castLine.visible = false;
    }

    // 낚싯대를 강화하면 뒤쪽(귀한) 물고기의 가중치가 올라갑니다
    function rollFish() {
        var boost = [1, 1.9, 3.4][tools.rod];
        var w = FISH_KINDS.map(function (f, i) { return i >= 2 ? f.w * boost : f.w; });
        var tot = w.reduce(function (a, b) { return a + b; }, 0);
        var r = Math.random() * tot;
        for (var i = 0; i < FISH_KINDS.length; i++) { r -= w[i]; if (r <= 0) return FISH_KINDS[i]; }
        return FISH_KINDS[0];
    }

    function updateFishing(dt) {
        if (!rodView) return;

        // 낚시터에서는 항상 낚싯대를 들고 있습니다
        rodView.visible = (area === "fishing");
        if (!rodView.visible) { endCastVisualsOnly(); return; }

        // 걸을 때 살짝 흔들리고, 챌 때 위로 튕깁니다
        rodKick = Math.max(0, rodKick - dt * 3.2);
        var walking = (keys.up || keys.down || keys.left || keys.right) ? 1 : 0;
        var sway = Math.sin(elapsed * 6) * 0.02 * walking;
        var shake = (fishStage === "bite") ? Math.sin(elapsed * 26) * 0.035 : 0;
        rodView.position.set(0.34, -0.30 + sway, -0.42);
        rodView.rotation.set(-0.10 + rodKick * 0.5 + shake, 0.20, 0.06 + shake);

        if (fishStage !== "idle" && castBobber && castAt) {
            var amp = fishStage === "bite" ? 0.13 : 0.035;
            var sp = fishStage === "bite" ? 15 : 3.2;
            castBobber.position.y = 0.06 + Math.sin(elapsed * sp) * amp;
            // 물릴 때는 찌가 아래로 쑥
            if (fishStage === "bite") castBobber.position.y -= 0.09;

            // 낚싯줄을 대 끝 ~ 찌 사이에 다시 그립니다
            if (castLine) {
                var tip = new THREE.Vector3();
                rodTip.getWorldPosition(tip);
                var arr = castLine.geometry.attributes.position.array;
                arr[0] = tip.x; arr[1] = tip.y; arr[2] = tip.z;
                arr[3] = castBobber.position.x; arr[4] = castBobber.position.y; arr[5] = castBobber.position.z;
                castLine.geometry.attributes.position.needsUpdate = true;
                castLine.geometry.computeBoundingSphere();
            }
        }

        if (fishStage === "waiting" && elapsed >= fishBiteAt) {
            fishStage = "bite";
            msg("❗ 찌가 쏙 들어갔어요! 지금 당기세요!");
        }
    }

    function endCastVisualsOnly() {
        if (castBobber) castBobber.visible = false;
        if (castLine) castLine.visible = false;
    }

    // ---- 상점 -----------------------------------------------------------
    function buyItem(k) {
        var it = ITEMS[k];
        if (coins < it.buy) { msg("코인이 모자라요. 수확물을 팔아보세요."); return; }
        coins -= it.buy; bag[k]++;
        msg(it.emoji + " " + it.label + eulReul(it.label) + " 샀어요. 🪙-" + it.buy);
    }

    function openSell() {
        var rows = SHOP_SELL.filter(function (k) { return bag[k] > 0; });
        if (!rows.length) { msg("팔 게 없어요. 농장이나 낚시터에 가보세요."); return; }
        var total = rows.reduce(function (s, k) { return s + bag[k] * ITEMS[k].sell; }, 0);
        var html = rows.map(function (k) {
            return '<div class="i3-row"><span>' + ITEMS[k].emoji + " " + ITEMS[k].label +
                   " ×" + bag[k] + '</span><b>🪙' + (bag[k] * ITEMS[k].sell) + '</b></div>';
        }).join("");
        showPanel("수확물 팔기",
            html + '<div class="i3-row total"><span>합계</span><b>🪙' + total + '</b></div>' +
            '<button type="button" id="i3-sell-yes">전부 팔기</button>' +
            '<button type="button" id="i3-sell-no">그만두기</button>');
        elPanel.querySelector("#i3-sell-yes").onclick = function () {
            rows.forEach(function (k) { bag[k] = 0; });
            coins += total;
            closePanel(); updateHud(); save();
            msg("전부 팔았어요. 🪙+" + total);
        };
        elPanel.querySelector("#i3-sell-no").onclick = closePanel;
    }

    // ---- 가구 · 도구 · 확장 --------------------------------------------------
    function heldFurnitureCount() {
        var n = 0;
        FURN_ORDER.forEach(function (k) { n += owned[k] || 0; });
        return n;
    }

    function openFurnitureShop() {
        var rows = FURN_ORDER.map(function (k) {
            var f = FURNITURE[k];
            var have = owned[k] || 0;
            var placed = homeSlots.filter(function (s) { return s === k; }).length;
            var can = coins >= f.price;
            return '<div class="i3-row">' +
                   '<span>' + f.emoji + " " + f.name +
                   (have || placed ? ' <small>(가진 ' + have + ' · 놓음 ' + placed + ')</small>' : '') +
                   '</span>' +
                   '<button type="button" class="i3-mini" data-furn="' + k + '"' + (can ? '' : ' disabled') +
                   '>🪙' + f.price + '</button></div>';
        }).join("");
        showPanel("🪑 가구 가게 · 🪙" + coins,
            rows + '<p class="i3-ask"><small>산 가구는 내 오두막에서 자리에 놓을 수 있어요.</small></p>' +
            '<button type="button" id="i3-close">닫기</button>');
        elPanel.querySelectorAll("[data-furn]").forEach(function (b) {
            b.onclick = function (e) {
                e.stopPropagation();
                var k = b.getAttribute("data-furn");
                if (coins < FURNITURE[k].price) { msg("코인이 모자라요."); return; }
                coins -= FURNITURE[k].price;
                owned[k] = (owned[k] || 0) + 1;
                updateHud(); save();
                msg(FURNITURE[k].emoji + " " + FURNITURE[k].name + eulReul(FURNITURE[k].name) + " 샀어요!\n오두막에서 놓아보세요.");
                openFurnitureShop();
            };
        });
        elPanel.querySelector("#i3-close").onclick = closePanel;
    }

    function openToolShop() {
        var rows = TOOL_ORDER.map(function (k) {
            var t = TOOLS[k], lv = tools[k];
            var maxed = lv >= t.levels.length - 1;
            var price = maxed ? 0 : t.price[lv + 1];
            return '<div class="i3-row"><span>' + t.emoji + " " + t.levels[lv] +
                   '<br><small>' + t.desc[lv] + '</small></span>' +
                   (maxed ? '<b>최대</b>'
                          : '<button type="button" class="i3-mini" data-tool="' + k + '"' +
                            (coins >= price ? '' : ' disabled') + '>🪙' + price + '</button>') +
                   '</div>';
        }).join("");
        showPanel("🔧 도구 강화 · 🪙" + coins,
            rows + '<button type="button" id="i3-close">닫기</button>');
        elPanel.querySelectorAll("[data-tool]").forEach(function (b) {
            b.onclick = function (e) {
                e.stopPropagation();
                var k = b.getAttribute("data-tool"), t = TOOLS[k];
                var price = t.price[tools[k] + 1];
                if (coins < price) { msg("코인이 모자라요."); return; }
                coins -= price; tools[k]++;
                updateHud(); save();
                var lvName = t.levels[tools[k]];
                msg(t.emoji + " " + lvName + euRo(lvName) + " 바꿨어요!\n" + t.desc[tools[k]]);
                openToolShop();
            };
        });
        elPanel.querySelector("#i3-close").onclick = closePanel;
    }

    // 자리에 가구를 놓거나, 놓인 걸 도로 거둡니다
    function useSlot(idx) {
        if (homeSlots[idx]) {
            var id = homeSlots[idx];
            homeSlots[idx] = null;
            owned[id] = (owned[id] || 0) + 1;
            renderHome(); save();
            msg(FURNITURE[id].name + eulReul(FURNITURE[id].name) + " 치웠어요.");
            return;
        }
        var have = FURN_ORDER.filter(function (k) { return (owned[k] || 0) > 0; });
        if (!have.length) {
            msg("놓을 가구가 없어요.\n하르방 상점에서 살 수 있어요.");
            return;
        }
        var rows = have.map(function (k) {
            return '<button type="button" class="i3-pick" data-put="' + k + '">' +
                   FURNITURE[k].emoji + " " + FURNITURE[k].name + " ×" + owned[k] + '</button>';
        }).join("");
        showPanel("여기에 무엇을 놓을까요?",
            '<div class="i3-picks">' + rows + '</div><button type="button" id="i3-close">그만두기</button>');
        elPanel.querySelectorAll("[data-put]").forEach(function (b) {
            b.onclick = function (e) {
                e.stopPropagation();
                var k = b.getAttribute("data-put");
                owned[k]--;
                if (owned[k] <= 0) delete owned[k];
                homeSlots[idx] = k;
                renderHome(); closePanel(); save();
                msg(FURNITURE[k].emoji + " " + FURNITURE[k].name + eulReul(FURNITURE[k].name) + " 놓았어요.");
            };
        });
        elPanel.querySelector("#i3-close").onclick = closePanel;
    }

    function expandPlots() {
        if (openPlots >= FARM_SPOTS.length) { msg("밭이 이미 가득 찼어요."); return; }
        var c = expandCost(openPlots, PLOT_BASE);
        if (coins < c) { msg("코인이 모자라요. 🪙" + c + " 필요해요."); return; }
        coins -= c; openPlots++;
        while (farmPlots.length < openPlots) farmPlots.push({ stage: 0, at: 0, watered: false });
        goArea("farm");
        msg("밭을 한 칸 늘렸어요! 🌱");
    }

    function expandBeds() {
        if (openBeds >= FLOWER_SPOTS.length) { msg("꽃자리가 이미 가득 찼어요."); return; }
        var c = expandCost(openBeds, BED_BASE);
        if (coins < c) { msg("코인이 모자라요. 🪙" + c + " 필요해요."); return; }
        coins -= c; openBeds++;
        while (flowerBeds.length < openBeds) flowerBeds.push({ stage: 0, at: 0, color: 0 });
        goArea("flower");
        msg("꽃자리를 늘렸어요! 🌸");
    }

    // ---- 대화 · 선물 -------------------------------------------------------
    // =================================================================
    // [3] NPC 호감도 시스템
    // 수확한 작물·물고기·꽃을 선물하면 호감도가 오르고, 단계가 올라갈수록
    // 마을 사람들이 조금씩 더 속을 터놓습니다.
    // 게임 보상이 아니라 "관계가 쌓인다"는 감각을 주는 게 목적이에요.
    // =================================================================
    var GIFT_KINDS = {
        flower: { emoji: "🌸", label: "꽃",     points: 3 },
        crop:   { emoji: "🌾", label: "수확물", points: 2 },
        fish:   { emoji: "🐟", label: "물고기", points: 2 }
    };

    // 누적 점수 -> 단계. 하트로 보여줍니다.
    var AFF_LEVELS = [
        { min: 0,  name: "처음 뵙네요", hearts: "♡♡♡♡" },
        { min: 6,  name: "낯이 익어요", hearts: "♥♡♡♡" },
        { min: 16, name: "friendly",   hearts: "♥♥♡♡", label: "친해졌어요" },
        { min: 32, name: "close",      hearts: "♥♥♥♡", label: "마음을 여는 중" },
        { min: 55, name: "trusted",    hearts: "♥♥♥♥", label: "믿는 사이" }
    ];

    function affLevel(id) {
        var p = gifted[id] || 0;
        var lv = 0;
        for (var i = 0; i < AFF_LEVELS.length; i++) if (p >= AFF_LEVELS[i].min) lv = i;
        return lv;
    }

    function affHearts(id) { return AFF_LEVELS[affLevel(id)].hearts; }
    function affName(id) {
        var L = AFF_LEVELS[affLevel(id)];
        return L.label || L.name;
    }

    // 단계별로 풀리는 따뜻한 대사.
    // 단계가 오를수록 위로가 구체적이고 사적으로 바뀌도록 썼습니다.
    var WARM_LINES = {
        gyul: [
            [],
            ["요즘 자주 오네.\n반가워 🍊"],
            ["밭일은 결과가 바로 안 보여도\n분명 자라고 있거든.",
             "너도 그럴 거야."],
            ["힘든 날엔 그냥 와서 앉아 있어도 돼.\n말 안 해도 괜찮아.",
             "여긴 아무것도 안 해도\n뭐라 안 하는 곳이야."],
            ["있잖아, 나 사실 네가 오는 날이\n제일 기다려져.",
             "잘 지내는지 궁금하거든.",
             "오늘도 와줘서 고마워 🍊"]
        ],
        dongbaek: [
            [],
            ["또 오셨네요.\n조용히 있다 가셔도 돼요."],
            ["동백은 추울 때 펴요.\n다들 지는 계절에요.",
             "그래서 저는 겨울이\n밉지만은 않아요."],
            ["잘 지내냐고 묻는 게\n부담스러울 때도 있죠.",
             "그래서 저는 그냥\n여기 있을게요."],
            ["동백꽃은 질 때 통째로 떨어져요.\n시들지 않고요.",
             "저는 그게 슬프기보다\n정직해 보여서 좋더라고요.",
             "당신도 억지로 버티지 않아도 돼요."]
        ],
        // 제록이는 존댓말을 쓰는 캐릭터라 여기서도 말투를 맞췄습니다
        jerok: [
            [],
            ["어, 오셨네요.\n오늘은 좀 어떠세요?"],
            ["낚시는 기다리는 게 대부분이에요.\n안 물어도 시간은 가고요.",
             "그게 은근히 위로가 되더라고요."],
            ["저한테는 아무 말이나 하셔도 돼요.\n판단 안 해요.",
             "그냥 듣고 있을게요."],
            ["저는 사실 여기서\n사람 기다리는 게 일이거든요.",
             "근데 기다려지는 사람은\n많지 않아요.",
             "오래 뵀으면 좋겠어요."]
        ],
        harbang: [
            [],
            ["또 왔수다.\n허허."],
            ["돌은 오래 있으면 이끼가 껴.\n그게 나쁜 게 아니라 산 흔적이지.",
             "사람도 비슷하우다."],
            ["살다 보면 별일이 다 있수다.\n그거 다 지나가더라고.",
             "지금 힘든 것도 그럴 거우다."],
            ["나는 여기 오래 서 있었수다.\n오는 사람 가는 사람 다 봤지.",
             "근데 다시 오는 사람은\n많지 않수다.",
             "고맙수다. 잊지 않으리다."]
        ]
    };

    // 지금 줄 수 있는 선물 목록 (가진 게 있는 것만)
    function availableGifts() {
        var out = [];
        Object.keys(GIFT_KINDS).forEach(function (k) {
            if ((bag[k] || 0) > 0) out.push(k);
        });
        return out;
    }

    function giveGift(id, kind) {
        var g = GIFT_KINDS[kind];
        if (!g || (bag[kind] || 0) <= 0) return;
        var before = affLevel(id);
        bag[kind]--;
        gifted[id] = (gifted[id] || 0) + g.points;
        var after = affLevel(id);

        // [P0] 주민을 도운 건 온기로 남습니다. 애정으로 키운 동반자가
        // 곁에 있으면 더 많이 쌓여요 (수치 경쟁이 아니라 취향의 차이).
        if (typeof window.questTick === "function") window.questTick("gift");   // [P1]
        gainWarmth(companionIs("pet") ? g.points * 2 : g.points,
                   VILLAGERS[id].name + "에게 선물했어요");

        closePanel(); updateHud(); save();

        var v = VILLAGERS[id];
        // [3] 꽃이 아닌 선물에는 다른 반응이 나가야 자연스럽습니다
        var lines = ((kind === "flower" ? v.gift : v.giftAlt) || v.gift).slice();
        if (after > before) {
            // 단계가 오른 순간에만 나오는 대사 — 여기가 이 시스템의 보상입니다
            lines.push("(" + affHearts(id) + "  " + affName(id) + ")");
            lines = lines.concat(WARM_LINES[id][after] || []);
        }
        openDialog(v.name, v.role, lines);
    }

    // =================================================================
    // [P1] 주민 관계 에피소드
    //
    // 제안서 지적: 호감도가 하트 숫자와 대사 확장에만 머물러서,
    // 관계가 '섬의 실제 변화'로 이어지지 않는다는 것.
    //
    // 그래서 주민마다 3부작 에피소드를 두고, 각 부는 조건을 채워야
    // 다음으로 넘어갑니다. 마지막 부를 끝내면 물건·장소·조리법 같은
    // 눈에 보이는 보상이 남습니다.
    //
    // 조건은 이미 세고 있는 값(호감도·수확·낚시·복원)만 씁니다.
    // 새 카운터를 늘리면 저장이 복잡해지기만 해요.
    // =================================================================
    var EPISODES = {
        gyul: {
            title: "태풍이 지나간 밭",
            parts: [
                { need: { aff: 6 },
                  say: ["사실… 지난 태풍에 밭이 다 쓸렸어.",
                        "혼자 치우려니 엄두가 안 나더라.",
                        "같이 좀 봐줄래?"],
                  ask: "감귤이와 조금 더 친해지기" },
                { need: { crop: 5 },
                  say: ["와, 벌써 이만큼이나.",
                        "혼자였으면 아직 손도 못 댔을 거야.",
                        "밭이 다시 밭처럼 보여."],
                  ask: "밭에서 5번 거두기" },
                { need: { aff: 32, zone: ["farm", 2] },
                  say: ["봐, 여기 다시 초록빛이 돌아.",
                        "망가진 게 원래대로 돌아오진 않더라.\n근데 다른 모양으로 살아나긴 하네.",
                        "너도 그럴 거야. 나는 그렇게 믿어 🍊"],
                  ask: "감귤밭을 2단계까지 되살리기",
                  reward: { emoji: "🍊", name: "감귤이의 씨앗 주머니",
                            text: "감귤이가 직접 고른 씨앗이에요. 밭에서 가끔 하나 더 나와요." } }
            ]
        },
        dongbaek: {
            title: "떨어진 동백을 모아",
            parts: [
                { need: { aff: 6 },
                  say: ["동백은 질 때 통째로 떨어져요.",
                        "그게 지저분해 보일까 봐\n매일 주워요.",
                        "…같이 주워주실래요?"],
                  ask: "동백이와 조금 더 친해지기" },
                { need: { flower: 3 },
                  say: ["떨어진 꽃도 꽃이더라고요.",
                        "밟히지만 않으면\n한동안은 예뻐요."],
                  ask: "꽃 3송이 모으기" },
                { need: { aff: 32, zone: ["flower", 2] },
                  say: ["길이 꽃으로 덮였어요.",
                        "지는 걸 막을 순 없지만,\n지고 난 자리를 예쁘게 둘 순 있네요.",
                        "그거면 충분한 것 같아요 🌺"],
                  ask: "동백 정원을 2단계까지 되살리기",
                  reward: { emoji: "🌺", name: "동백 아치",
                            text: "비 오는 날 이 아래를 지나면 마음이 좀 가라앉아요." } }
            ]
        },
        jerok: {
            title: "별빛 물고기를 기다리며",
            parts: [
                { need: { aff: 6 },
                  say: ["여기서 오래 낚시했는데요,",
                        "딱 한 번, 밤에 빛나는 물고기를 봤어요.",
                        "그 뒤로는 못 봤고요."],
                  ask: "제록이와 조금 더 친해지기" },
                { need: { fish: 5 },
                  say: ["오늘도 안 나오네요.",
                        "근데 이상하죠, 안 나와도\n기다리는 시간이 싫진 않아요.",
                        "같이 기다려줘서 그런가 봐요."],
                  ask: "물고기 5마리 잡기" },
                { need: { aff: 32, zone: ["lighthouse", 2] },
                  say: ["등대에 불이 들어오니까\n바다가 다르게 보이네요.",
                        "별빛 물고기는 아직 못 봤어요.",
                        "그래도 이제 안 조급해요.\n기다릴 사람이 생겼거든요 🎣"],
                  ask: "등대를 2단계까지 되살리기",
                  reward: { emoji: "🎣", name: "별빛 낚싯대",
                            text: "밤에 은은하게 빛나요. 제록이가 쓰던 거래요." } }
            ]
        },
        harbang: {
            title: "오래된 등대",
            parts: [
                { need: { aff: 6 },
                  say: ["저 등대 말이우다.",
                        "내가 젊을 적엔 밤마다 켜졌지.",
                        "지금은 아무도 안 올라가."],
                  ask: "하르방과 조금 더 친해지기" },
                { need: { warmth: 60 },
                  say: ["돌은 혼자 못 움직이우다.",
                        "여럿이 손대야 겨우 옮겨지지.",
                        "고맙수다, 진심으로."],
                  ask: "온기 60 모으기" },
                { need: { aff: 32, zone: ["lighthouse", 3] },
                  say: ["불이 들어왔수다.",
                        "오래 걸렸지만, 안 되는 일은 아니었네.",
                        "포기 안 한 게 자네 덕이우다 🗼"],
                  ask: "등대를 끝까지 되살리기",
                  reward: { emoji: "🗼", name: "등대지기 열쇠",
                            text: "밤에 전망대에 올라갈 수 있어요." } }
            ]
        }
    };

    // 진행도는 공용 월드의 storyFlags 에 둡니다 (섬·병아리 어디서든 보이도록)
    function epState(id) {
        var w = W();
        if (!w) return { part: 0, done: false };
        if (!w.storyFlags.ep) w.storyFlags.ep = {};
        if (!w.storyFlags.ep[id]) w.storyFlags.ep[id] = { part: 0, done: false };
        return w.storyFlags.ep[id];
    }

    // 지금 부의 조건을 채웠는지
    function epReady(id) {
        var st = epState(id);
        if (st.done) return false;
        var p = EPISODES[id].parts[st.part];
        if (!p) return false;
        var n = p.need, w = W();
        if (n.aff !== undefined && (gifted[id] || 0) < n.aff) return false;
        if (n.crop !== undefined && (epCount.crop || 0) < n.crop) return false;
        if (n.fish !== undefined && (epCount.fish || 0) < n.fish) return false;
        if (n.flower !== undefined && (epCount.flower || 0) < n.flower) return false;
        if (n.warmth !== undefined && (!w || w.warmthTotal < n.warmth)) return false;
        if (n.zone && (!w || (w.restoration[n.zone[0]] || 1) < n.zone[1])) return false;
        return true;
    }

    // 에피소드용 누적 카운터 (섬 저장본에 같이 들어갑니다)
    var epCount = { crop: 0, fish: 0, flower: 0 };

    function epTick(kind) {
        if (epCount[kind] === undefined) return;
        epCount[kind]++;
    }

    // 대화를 열 때 조건을 채웠으면 에피소드가 먼저 나옵니다
    function epAdvance(id) {
        var st = epState(id);
        var ep = EPISODES[id];
        var p = ep.parts[st.part];
        if (!p) return null;

        var lines = ["〈" + ep.title + "〉 " + (st.part + 1) + "부"].concat(p.say);
        st.part++;
        if (st.part >= ep.parts.length) {
            st.done = true;
            if (p.reward) {
                var w = W();
                if (!w.storyFlags.keepsakes) w.storyFlags.keepsakes = [];
                w.storyFlags.keepsakes.push({
                    id: id, emoji: p.reward.emoji, name: p.reward.name,
                    text: p.reward.text, from: VILLAGERS[id].name,
                    at: new Date().toISOString()
                });
                lines.push("(" + p.reward.emoji + " " + p.reward.name + eulReul(p.reward.name) + " 받았어요)");
                lines.push("오두막 선반에 걸어두면 볼 수 있어요.");
            }
        }
        if (typeof window.saveWorld === "function") window.saveWorld();
        if (typeof window.renderKeepsakes === "function") window.renderKeepsakes();
        return lines;
    }

    // 아직 조건을 못 채웠을 때 보여줄 한 줄 (뭘 하면 되는지)
    function epHint(id) {
        var st = epState(id);
        if (st.done) return null;
        var p = EPISODES[id].parts[st.part];
        return p ? p.ask : null;
    }

    // [3] 선물 가능한 게 하나라도 있으면 먼저 물어봅니다.
    // 꽃뿐 아니라 밭에서 거둔 것, 바다에서 잡은 것도 줄 수 있어요.
    function talkTo(id) {
        var v = VILLAGERS[id];
        var kinds = availableGifts();
        if (kinds.length) {
            var html = '<div class="aff-row"><span class="aff-hearts">' + affHearts(id) + '</span>' +
                       '<span class="aff-label">' + affName(id) + '</span></div>' +
                       '<p class="i3-ask">무엇을 선물할까요?</p>';
            kinds.forEach(function (k) {
                var g = GIFT_KINDS[k];
                html += '<button type="button" data-gift="' + k + '">' +
                        g.emoji + ' ' + g.label + ' 주기 <small>(' + bag[k] + '개 보유)</small></button>';
            });
            html += '<button type="button" id="i3-gift-no">그냥 이야기하기</button>';
            showPanel(v.name, html);
            elPanel.querySelectorAll("[data-gift]").forEach(function (b) {
                b.onclick = function () { giveGift(id, b.getAttribute("data-gift")); };
            });
            elPanel.querySelector("#i3-gift-no").onclick = function () { closePanel(); sayLine(id); };
            return;
        }
        sayLine(id);
    }

    function sayLine(id) {
        var v = VILLAGERS[id];

        // [P1] 에피소드 조건을 채웠으면 그 이야기가 먼저 나옵니다.
        // 평소 대사보다 우선해야 "관계가 진행됐다"는 게 느껴져요.
        if (epReady(id)) {
            var ep = epAdvance(id);
            if (ep && ep.length) { openDialog(v.name, v.role, ep); return; }
        }

        var i = talkIndex[id] || 0;
        talkIndex[id] = i + 1;
        var convo = v.talks[i % v.talks.length].slice();

        // 아직 조건을 못 채웠으면, 뭘 하면 되는지 한 줄 흘려줍니다.
        // 힌트가 없으면 에피소드가 있는 줄도 모르고 지나가요.
        var hint = epHint(id);
        if (hint) convo.push("(지금 하고 있는 이야기: " + EPISODES[id].title + ")\n" + hint);
        // [3] 호감도가 쌓였으면 그 단계에서 풀린 따뜻한 대사를 뒤에 붙입니다
        var lv = affLevel(id);
        if (lv > 0) {
            var warm = WARM_LINES[id] && WARM_LINES[id][lv];
            if (warm && warm.length) convo = convo.concat(warm);
        }
        openDialog(v.name, v.role, convo);
    }

    // =================================================================
    // 루프
    // =================================================================
    function loop(ts) {
        if (!open) return;
        var dt = lastT ? Math.min(0.05, (ts - lastT) / 1000) : 1 / 60;
        lastT = ts || 0;
        elapsed += dt;

        updatePlayer(dt);
        updateFishing(dt);
        updateFarm();
        updateFlowers();

        // 물결: UV 를 천천히 밀어 흐르게 하고, 하늘은 카메라를 따라다녀
        // 아무리 걸어도 끝이 보이지 않게 합니다.
        if (waterTex) {
            waterTex.offset.x = (elapsed * 0.012) % 1;
            waterTex.offset.y = (elapsed * 0.007) % 1;
        }
        if (skyMesh) skyMesh.position.set(pos.x, 0, pos.z);

        // 다 자란 것만 살짝 떠올라 "이제 수확해도 된다"가 보이게
        var bobY = Math.sin(elapsed * 2.4) * 0.045;
        farmNodes.forEach(function (n) { if (n.userData.ripe) n.position.y = 0.14 + bobY; });
        flowerNodes.forEach(function (n) { if (n.userData.ripe) n.position.y = 0.02 + bobY; });

        // 놓아둔 조경물 중 움직이는 것들 — 바람개비는 돌고, 그네는 살랑입니다.
        // 가만히 서 있기만 하면 놓아도 티가 안 나서 넣었어요.
        for (var di = 0; di < decorSpin.length; di++) {
            var d = decorSpin[di];
            if (d.kind === "spin") d.node.rotation.z = elapsed * 1.6;
            else d.node.rotation.x = Math.sin(elapsed * 1.1) * 0.16;
        }

        for (var bi = 0; bi < billboards.length; bi++) {
            var b = billboards[bi];
            b.rotation.y = Math.atan2(pos.x - b.parent.position.x, pos.z - b.parent.position.z);
        }

        var t = nearest();
        ringTarget = t;
        if (t) {
            ring.visible = true;
            ring.position.set(t.x, 0.06, t.z);
            var p = 1 + Math.sin(elapsed * 4) * 0.06;
            ring.scale.set(p, p, p);
            elPrompt.innerText = labelFor(t);
            elPrompt.classList.add("show");
        } else {
            ring.visible = false;
            elPrompt.classList.remove("show");
        }

        renderer.render(scene, camera);
        raf = requestAnimationFrame(loop);
    }

    // =================================================================
    // UI
    // =================================================================
    function msg(t) { elMsg.innerText = t; }

    function updateHud() {
        elCoins.innerText = "🪙 " + coins;
        // [P0] 섬에서도 온기가 보이도록
        var wEl = elRoot && elRoot.querySelector("#i3-warmth");
        if (wEl) wEl.innerText = (W() && W().warmth) || 0;
        var chips = BAG_ORDER.filter(function (k) { return bag[k] > 0; }).map(function (k) {
            return '<span class="i3-chip">' + ITEMS[k].emoji + " " + bag[k] + '</span>';
        }).join("");
        elBag.innerHTML = chips || '<span class="i3-chip dim">주머니 비었어요</span>';
    }

    // 대화는 [다음]으로 넘기고 [끝]으로 언제든 빠져나옵니다.
    // 몇 번째 줄인지 보여줘서 얼마나 남았는지 알 수 있게 했습니다.
    var dlgAll = [], dlgPos = 0, dlgQ = [];

    function openDialog(name, role, lines) {
        busy = true;
        dlgAll = lines.slice();
        dlgPos = 0;
        dlgQ = dlgAll;                 // 남아있는 다른 코드와의 호환용
        elDlgName.innerText = name;
        elDlgRole.innerText = role || "";
        elDlg.classList.add("show");
        showLine();
    }

    function showLine() {
        if (dlgPos >= dlgAll.length) { endDialog(); return; }
        elDlgText.innerText = dlgAll[dlgPos];
        var last = (dlgPos === dlgAll.length - 1);
        elDlgCount.innerText = (dlgAll.length > 1) ? (dlgPos + 1) + " / " + dlgAll.length : "";
        elDlgNext.style.display = last ? "none" : "";
        elDlgEnd.innerText = last ? "끝" : "그만 듣기";
    }

    function nextLine() {
        if (dlgPos >= dlgAll.length - 1) { endDialog(); return; }
        dlgPos++;
        showLine();
    }

    function endDialog() {
        elDlg.classList.remove("show");
        dlgAll = []; dlgPos = 0; dlgQ = [];
        busy = false;
        save();
    }

    function showPanel(title, html) {
        busy = true;
        elPanel.innerHTML = '<div class="i3-panel-title">' + title + '</div>' + html;
        elPanel.classList.add("show");
    }
    function closePanel() {
        elPanel.classList.remove("show");
        elDlg.classList.remove("show");
        dlgAll = []; dlgPos = 0; dlgQ = [];
        busy = false;
        save();
    }

    // =================================================================
    // 입력
    // =================================================================
    var KEYMAP = {
        w: "up", W: "up", ArrowUp: "up", s: "down", S: "down", ArrowDown: "down",
        a: "left", A: "left", ArrowLeft: "left", d: "right", D: "right", ArrowRight: "right",
        q: "lookL", Q: "lookL", e: "lookR", E: "lookR"
    };
    function onKey(ev) {
        if (ev.key === "Escape") { if (ev.type === "keydown") { if (busy) closePanel(); else hideIsland(); } return; }
        if (ev.key === " " || ev.key === "Enter") {
            if (ev.type === "keydown") { ev.preventDefault(); if (busy && elDlg.classList.contains("show")) nextLine(); else interact(); }
            return;
        }
        var k = KEYMAP[ev.key];
        if (!k) return;
        ev.preventDefault();
        keys[k] = (ev.type === "keydown");
    }

    var dragOn = false, dragX = 0, dragY = 0;
    function onDown(e) {
        if (e.target.closest("#i3-ui")) return;
        var t = e.touches ? e.touches[0] : e;
        dragOn = true; dragX = t.clientX; dragY = t.clientY;
    }
    function onMove(e) {
        if (!dragOn) return;
        var t = e.touches ? e.touches[0] : e;
        yaw -= (t.clientX - dragX) * CFG.lookSpeed;
        pitch -= (t.clientY - dragY) * CFG.lookSpeed;
        pitch = Math.max(-1.1, Math.min(0.7, pitch));
        dragX = t.clientX; dragY = t.clientY;
        if (e.cancelable) e.preventDefault();
    }
    function onUp() { dragOn = false; }

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
    // 저장
    // =================================================================
    async function save() {
        try {
            await window.storage.set(SAVE_KEY, JSON.stringify({
                v: 3, area: area, coins: coins, bag: bag,
                farmPlots: farmPlots, flowerBeds: flowerBeds,
                gifted: gifted, talkIndex: talkIndex,
                tools: tools, owned: owned, homeSlots: homeSlots, epCount: epCount,
                openPlots: openPlots, openBeds: openBeds,
                decorOwned: decorOwned, decorSlots: decorSlots   // 섬 꾸미기
            }));
        } catch (e) {}
    }
    async function load() {
        try {
            var r = await window.storage.get(SAVE_KEY);
            if (!r || !r.value) return;
            var s = JSON.parse(r.value);
            if (s.v !== 2 && s.v !== 3) return;   // 더 옛날 저장본은 구조가 달라 무시
            coins = (typeof s.coins === "number") ? s.coins : coins;
            bag = Object.assign(bag, s.bag || {});
            farmPlots = s.farmPlots || [];
            flowerBeds = s.flowerBeds || [];
            gifted = s.gifted || {};
            talkIndex = s.talkIndex || {};
            if (s.v === 3) {
                tools = Object.assign(tools, s.tools || {});
                owned = s.owned || {};
                homeSlots = s.homeSlots || [];
                openPlots = s.openPlots || PLOT_BASE;
                epCount = Object.assign(epCount, s.epCount || {});   // [P1]
                openBeds = s.openBeds || BED_BASE;
                // 섬 꾸미기 — 이 항목이 없던 저장본에서도 그냥 빈 상태로 시작합니다
                decorOwned = s.decorOwned || {};
                decorSlots = s.decorSlots || {};
            } else {
                // v2 는 밭이 6칸이었으니 그만큼 열려 있던 것으로 봅니다
                openPlots = Math.max(PLOT_BASE, farmPlots.length);
                openBeds = Math.max(BED_BASE, flowerBeds.length);
            }
            if (s.area && AREA_BUILD[s.area]) area = s.area;
        } catch (e) {}
        ensureSlots();
    }

    // 밭·꽃자리·오두막 자리를 저장본과 상관없이 채워 둡니다.
    // 예전에는 3D 를 짓는 과정에서만 만들어져서, 2D 화면으로 들어가면
    // 오두막과 꽃밭이 텅 비어 보였습니다.
    function ensureSlots() {
        while (farmPlots.length < openPlots) farmPlots.push({ stage: 0, at: 0, watered: false });
        while (flowerBeds.length < openBeds) flowerBeds.push({ stage: 0, at: 0, color: 0 });
        if (!homeSlots.length) homeSlots = HOME_SLOTS.map(function () { return null; });
        Object.keys(DECOR_SPOTS).forEach(function (a) { decorList(a); });
    }

    // =================================================================
    // 열기 / 닫기
    // =================================================================
    function resize() {
        if (!renderer) return;
        var w = elRoot.clientWidth, h = elRoot.clientHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / Math.max(1, h);
        camera.updateProjectionMatrix();
    }

    // =================================================================
    // [배포 점검 1] 3D 섬의 2D 대체 경로
    //
    // WebGL 이 없거나(구형·저사양 기기, 드라이버 차단) three.js 가
    // 안 올라오면 예전에는 alert 한 줄 띄우고 끝이라 섬을 아예 못 갔습니다.
    // 이제 같은 활동을 전부 할 수 있는 2D 화면으로 자동 전환합니다.
    //
    // 활동 로직(심기·수확·낚시·선물·상점)은 3D 와 완전히 같은 함수를
    // 그대로 부릅니다. 다른 건 '어디를 보고 있는가'뿐이에요.
    // =================================================================
    var mode2d = false;
    var el2d = null;
    var timer2d = null;

    function webglAvailable() {
        if (typeof THREE === "undefined") return false;
        try {
            var c = document.createElement("canvas");
            var gl = c.getContext("webgl") || c.getContext("experimental-webgl");
            return !!gl;
        } catch (e) { return false; }
    }

    function enter2D(reason) {
        mode2d = true;
        if (elRoot) elRoot.classList.add("flat");
        if (reason) msg(reason);
        start2dTimer();
        render2D();
    }

    // 3D 루프가 없으니 시간·작물·낚시를 여기서 굴립니다
    function start2dTimer() {
        if (timer2d) return;
        timer2d = setInterval(function () {
            if (!open || !mode2d) return;
            elapsed += 0.25;
            updateFarm();
            updateFlowers();
            // 3D 의 updateFishing 은 낚싯대 모델이 있어야 도는 부분이라
            // 입질 판정만 따로 봅니다
            if (fishStage === "waiting" && elapsed >= fishBiteAt) {
                fishStage = "bite";
                msg("❗ 찌가 쏙 들어갔어요! 지금 당기세요!");
                render2D();
            }
        }, 250);
    }

    function stop2dTimer() {
        if (timer2d) { clearInterval(timer2d); timer2d = null; }
    }

    // 지금 구역에서 할 수 있는 일들을 상태에서 직접 만들어 냅니다.
    // 3D 오브젝트를 하나도 안 만들기 때문에 THREE 가 없어도 돌아갑니다.
    // 꾸밀 자리 — 3D 가 안 되는 기기에서도 섬을 꾸밀 수 있게
    function addDecorActions2D(out, areaKey) {
        var dl = decorList(areaKey);
        if (!dl) return;
        dl.forEach(function (id, i) {
            out.push({ ico: id && DECOR[id] ? DECOR[id].emoji : "⬜",
                       label: (i + 1) + "번 꾸밀 자리",
                       sub: id && DECOR[id] ? DECOR[id].name + " (누르면 거둬요)" : "비어 있어요",
                       run: function () { useDecorSlot(areaKey, i); } });
        });
    }

    function actions2D() {
        var out = [];
        if (area === "hub") {
            out.push({ ico: "📋", label: "섬 현황판 보기", sub: "복원 진행과 다음 할 일", run: readBoard });
            Object.keys(ZONES).forEach(function (k) {
                var z = ZONES[k];
                out.push({ ico: z.emoji, label: z.label + " 가기", sub: "구역 이동",
                           run: function () { goArea(k); } });
                if (z.npc) out.push({ ico: "💬", label: VILLAGERS[z.npc].name + waGwa(VILLAGERS[z.npc].name) + " 이야기하기",
                                      sub: affHearts(z.npc) + " " + affName(z.npc),
                                      run: function () { talkTo(z.npc); } });
            });
            // 섬 한가운데의 꾸밀 자리도 여기서 다룹니다.
            // (아래 공통 처리는 이 return 뒤라서 허브에는 안 닿아요)
            addDecorActions2D(out, "hub");
            return out;
        }

        if (area === "farm") {
            farmPlots.forEach(function (s, i) {
                var st = s.stage === 0 ? "빈 밭 · 씨앗 심기"
                       : s.stage === 1 ? (s.watered ? "자라는 중" : "물 주기")
                       : "다 익었어요! 수확하기";
                out.push({ ico: s.stage === 2 ? "🍊" : (s.stage === 1 ? "🌱" : "🟫"),
                           label: (i + 1) + "번 밭", sub: st, hot: s.stage === 2,
                           run: function () { tendPlot(i); } });
            });
            out.push({ ico: "➕", label: "밭 늘리기", sub: openPlots >= FARM_SPOTS.length ? "가득 찼어요" : ("🪙 " + expandCost(openPlots, PLOT_BASE)), run: expandPlots });
        } else if (area === "flower") {
            flowerBeds.forEach(function (b, i) {
                var st = b.stage === 0 ? "빈 자리 · 꽃씨 심기"
                       : b.stage === 1 ? "자라는 중" : "활짝 폈어요! 꺾기";
                out.push({ ico: b.stage === 2 ? "🌺" : (b.stage === 1 ? "🌱" : "🟫"),
                           label: (i + 1) + "번 꽃자리", sub: st, hot: b.stage === 2,
                           run: function () { tendBed(i); } });
            });
            out.push({ ico: "➕", label: "꽃자리 늘리기", sub: openBeds >= FLOWER_SPOTS.length ? "가득 찼어요" : ("🪙 " + expandCost(openBeds, BED_BASE)), run: expandBeds });
        } else if (area === "fishing") {
            var fl = fishStage === "idle" ? "찌 던지기"
                   : fishStage === "waiting" ? "기다리는 중… (누르면 헛챔질)"
                   : "지금 당기세요!";
            out.push({ ico: "🎣", label: "낚시", sub: fl, hot: fishStage === "bite", run: doFish });
        } else if (area === "shop") {
            out.push({ ico: "🌱", label: "씨앗 사기", sub: "🪙 " + ITEMS.seed.buy, run: function () { buyItem("seed"); } });
            out.push({ ico: "🪱", label: "미끼 사기", sub: "🪙 " + ITEMS.bait.buy, run: function () { buyItem("bait"); } });
            out.push({ ico: "🌾", label: "꽃씨 사기", sub: "🪙 " + ITEMS.fseed.buy, run: function () { buyItem("fseed"); } });
            out.push({ ico: "💰", label: "수확물 팔기", run: openSell });
            out.push({ ico: "🪑", label: "가구 사기", run: openFurnitureShop });
            out.push({ ico: "🌷", label: "섬 꾸밀 것 사기", sub: "조경 가판", run: openDecorShop });
            out.push({ ico: "🔧", label: "도구 강화하기", run: openToolShop });
        } else if (area === "home") {
            homeSlots.forEach(function (id, i) {
                out.push({ ico: id && FURNITURE[id] ? FURNITURE[id].emoji : "⬜",
                           label: (i + 1) + "번 자리",
                           sub: id && FURNITURE[id] ? FURNITURE[id].name : "비어 있어요",
                           run: function () { useSlot(i); } });
            });
        }

        addDecorActions2D(out, area);

        // 구역 주민
        var z2 = ZONES[area];
        if (z2 && z2.npc) {
            out.push({ ico: "💬", label: VILLAGERS[z2.npc].name + waGwa(VILLAGERS[z2.npc].name) + " 이야기하기",
                       sub: affHearts(z2.npc) + " " + affName(z2.npc),
                       run: function () { talkTo(z2.npc); } });
        }
        // 2D 화면에서도 어느 구역에서든 현황판을 볼 수 있게
        out.push({ ico: "📋", label: "섬 현황판 보기", sub: "복원 진행과 다음 할 일", run: readBoard });
        out.push({ ico: "↩️", label: "섬으로 돌아가기", run: function () { goArea("hub"); } });
        return out;
    }

    // 구역마다 다른 색을 줘서, 글자만 읽지 않고도 어디인지 알게 합니다
    var AREA_TONE = {
        hub:     ["#bfe6fb", "#d9f0d2"],
        farm:    ["#ffe6c2", "#ffd9a0"],
        fishing: ["#bfe3f7", "#8fcbe8"],
        flower:  ["#ffd9e2", "#ffc2d1"],
        shop:    ["#e7e0d2", "#d6ccb8"],
        home:    ["#e6ddcb", "#d8c9ad"]
    };

    // 2D 화면에서도 이 구역이 폐허인지 되살아났는지 한 줄로 알려줍니다.
    // 3D 라야만 복원이 보이면, 가벼운 화면을 쓰는 사람은 목적을 모르니까요.
    function flatZoneState() {
        var rk = AREA_RESTORE[area];
        if (!rk) return "가벼운 화면으로 보고 있어요. 할 수 있는 건 똑같아요.";
        var lv = zoneLv(rk);
        var tell = ["아직 손대지 못한 곳이에요. 온기를 들이면 달라져요.",
                    "조금씩 정리되고 있어요.",
                    "완전히 되살아났어요 ✨"][lv - 1];
        return "복원 " + lv + " / 3 · " + tell;
    }

    function render2D() {
        if (!mode2d || !elRoot) return;
        if (!el2d) {
            el2d = document.createElement("div");
            el2d.id = "i3-flat";
            elRoot.querySelector("#i3-ui").appendChild(el2d);
        }
        var tone = AREA_TONE[area] || AREA_TONE.hub;
        var title = area === "hub" ? "🏝️ 제록이 섬" : (ZONES[area].emoji + " " + ZONES[area].label);

        var html = '<div class="flat-head" style="background:linear-gradient(160deg,' +
                   tone[0] + ',' + tone[1] + ')">' +
                   '<div class="flat-title">' + title + '</div>' +
                   '<div class="flat-sub">' + flatZoneState() + '</div></div>' +
                   '<div class="flat-grid">';
        var acts = actions2D();
        acts.forEach(function (a, i) {
            html += '<button type="button" class="flat-btn' + (a.hot ? " hot" : "") + '" data-i="' + i + '">' +
                    '<span class="fb-ico">' + a.ico + '</span>' +
                    '<span class="fb-txt"><b>' + a.label + '</b>' +
                    (a.sub ? '<small>' + a.sub + '</small>' : '') + '</span></button>';
        });
        html += '</div>';
        el2d.innerHTML = html;

        el2d.querySelectorAll(".flat-btn").forEach(function (b) {
            b.onclick = function () {
                var a = acts[parseInt(b.getAttribute("data-i"), 10)];
                if (!a) return;
                a.run();
                updateHud();
                save();
                setTimeout(render2D, 30);      // 결과가 바로 보이도록 다시 그립니다
            };
        });
    }

    async function showIsland() {
        if (open) return;
        buildUi();
        document.getElementById("main-view").style.display = "none";
        elRoot.classList.add("show");

        // [배포 점검 1] WebGL 이 안 되면 여기서 막지 않고 2D 로 갑니다.
        // 예전에는 alert 만 띄우고 섬 자체를 못 들어갔어요.
        if (!webglAvailable()) {
            open = true;
            await load();
            goArea(area || "hub");
            enter2D("이 기기에서는 3D가 어려워서 가벼운 화면으로 열었어요 🌿");
            return;
        }

        if (!renderer) {
            renderer = new THREE.WebGLRenderer({ canvas: elCanvas, antialias: true });
            renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
            // 그림자가 있고 없고가 입체감을 제일 크게 가릅니다.
            // 휴대폰도 감당하도록 그림자맵은 1024 한 장만 씁니다.
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            renderer.outputEncoding = THREE.sRGBEncoding;

            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(68, 1, 0.1, 260);
            camera.rotation.order = "YXZ";

            scene.add(new THREE.HemisphereLight(0xfdf3dc, 0x6b8a4a, 0.95));
            sunLight = new THREE.DirectionalLight(0xfff4e0, 1.05);
            sunLight.position.set(11, 18, 7);
            sunLight.castShadow = true;
            sunLight.shadow.mapSize.set(1024, 1024);
            sunLight.shadow.camera.near = 1;
            sunLight.shadow.camera.far = 60;
            sunLight.shadow.camera.left = -18;
            sunLight.shadow.camera.right = 18;
            sunLight.shadow.camera.top = 18;
            sunLight.shadow.camera.bottom = -18;
            sunLight.shadow.bias = -0.0012;
            scene.add(sunLight);
            scene.add(sunLight.target);
            // 그늘이 새까매지지 않도록 반대쪽에서 아주 약하게 채웁니다
            var fill = new THREE.DirectionalLight(0xcfe4ff, 0.25);
            fill.position.set(-9, 7, -8);
            scene.add(fill);

            ring = new THREE.Group();
            var rm = mat(0xff7a30, { emissive: 0x7a2a08 });
            var tor = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.05, 8, 26), rm);
            tor.rotation.x = -Math.PI / 2; ring.add(tor);
            for (var d = 0; d < 10; d++) {
                var an = (Math.PI * 2 * d) / 10;
                var dot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), rm);
                dot.position.set(Math.cos(an) * 0.72, 0.02, Math.sin(an) * 0.72);
                ring.add(dot);
            }
            ring.visible = false;
            scene.add(ring);

            msg("섬을 그리는 중…");
            await loadTextures();     // 구역을 짓기 전에 다 받아둬야 단색으로 안 나옵니다

            // 손에 든 낚싯대는 카메라에 붙입니다. three.js 는 카메라가 씬에
            // 들어가 있어야 그 자식이 그려집니다.
            scene.add(camera);
            rodView = makeRod();
            rodView.visible = false;
            camera.add(rodView);

            // 찌와 낚싯줄은 씬에 둡니다 (구역을 다시 지어도 살아남도록)
            castBobber = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 9), mat(0xee4738));
            var stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.132, 0.132, 0.06, 12), mat(0xffffff));
            castBobber.add(stripe);
            castBobber.visible = false;
            scene.add(castBobber);

            var lg = new THREE.BufferGeometry();
            lg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
            castLine = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xf2f2f2, transparent: true, opacity: 0.85 }));
            castLine.visible = false;
            castLine.frustumCulled = false;
            scene.add(castLine);

            await load();
        }

        open = true; lastT = 0; busy = false; keys = {};
        resize();
        goArea(area);
        updateHud();

        window.addEventListener("keydown", onKey, { passive: false });
        window.addEventListener("keyup", onKey);
        window.addEventListener("resize", resize);
        elRoot.addEventListener("mousedown", onDown);
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        elRoot.addEventListener("touchstart", onDown, { passive: false });
        elRoot.addEventListener("touchmove", onMove, { passive: false });
        elRoot.addEventListener("touchend", onUp);

        loop();
    }

    function hideIsland() {
        if (!open) return;
        open = false;
        stop2dTimer();                         // [배포 점검 1]
        if (raf) { cancelAnimationFrame(raf); raf = null; }
        window.removeEventListener("keydown", onKey);
        window.removeEventListener("keyup", onKey);
        window.removeEventListener("resize", resize);
        elRoot.removeEventListener("mousedown", onDown);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        elRoot.removeEventListener("touchstart", onDown);
        elRoot.removeEventListener("touchmove", onMove);
        elRoot.removeEventListener("touchend", onUp);
        keys = {}; dragOn = false; busy = false;
        elDlg.classList.remove("show");
        elPanel.classList.remove("show");
        elRoot.classList.remove("show");
        document.getElementById("main-view").style.display = "flex";
        window.scrollTo(0, 0);
        save();
    }

    function buildUi() {
        if (elRoot) return;
        elRoot = document.createElement("div");
        elRoot.id = "island3d-view";
        elRoot.innerHTML =
            '<canvas id="i3-canvas"></canvas>' +
            '<div id="i3-cross">✛</div>' +
            '<div id="i3-ui">' +
                '<div id="i3-top">' +
                    '<button type="button" id="i3-exit">← 나가기</button>' +
            '<button type="button" id="i3-flatbtn">🗺️ 가벼운 화면</button>' +
                    '<div id="i3-where"></div>' +
                    '<div id="i3-right"><span id="i3-coins">🪙 0</span><span id="i3-warm">🔥 <b id="i3-warmth">0</b></span><div id="i3-bag"></div></div>' +
                '</div>' +
                '<div id="i3-msg"></div>' +
                '<div id="i3-prompt"></div>' +
                '<div id="i3-dlg">' +
                    '<div id="i3-dlg-head"><b id="i3-dlg-name"></b><span id="i3-dlg-role"></span></div>' +
                    '<div id="i3-dlg-text"></div>' +
                    '<div id="i3-dlg-nav">' +
                        '<span id="i3-dlg-count"></span>' +
                        '<button type="button" id="i3-dlg-end">그만 듣기</button>' +
                        '<button type="button" id="i3-dlg-next">다음 ▶</button>' +
                    '</div>' +
                '</div>' +
                '<div id="i3-panel"></div>' +
                '<div id="i3-pad">' +
                    '<button type="button" data-dir="up">▲</button>' +
                    '<div><button type="button" data-dir="left">◀</button>' +
                    '<button type="button" data-dir="right">▶</button></div>' +
                    '<button type="button" data-dir="down">▼</button>' +
                '</div>' +
                '<button type="button" id="i3-act">확인</button>' +
            '</div>';
        document.body.appendChild(elRoot);

        elCanvas = elRoot.querySelector("#i3-canvas");
        elMsg = elRoot.querySelector("#i3-msg");
        elPrompt = elRoot.querySelector("#i3-prompt");
        elBag = elRoot.querySelector("#i3-bag");
        elCoins = elRoot.querySelector("#i3-coins");
        elWhere = elRoot.querySelector("#i3-where");
        elDlg = elRoot.querySelector("#i3-dlg");
        elDlgName = elRoot.querySelector("#i3-dlg-name");
        elDlgRole = elRoot.querySelector("#i3-dlg-role");
        elDlgText = elRoot.querySelector("#i3-dlg-text");
        elDlgCount = elRoot.querySelector("#i3-dlg-count");
        elDlgNext = elRoot.querySelector("#i3-dlg-next");
        elDlgEnd = elRoot.querySelector("#i3-dlg-end");
        elPanel = elRoot.querySelector("#i3-panel");

        elDlgNext.onclick = function (e) { e.stopPropagation(); nextLine(); };
        elDlgEnd.onclick = function (e) { e.stopPropagation(); endDialog(); };

        elRoot.querySelector("#i3-exit").onclick = function () {
            if (area !== "hub") goArea("hub"); else hideIsland();
        };
        // [배포 점검 1] 3D 가 잘 돌아도 버거우면 직접 가벼운 화면으로 갈 수 있게
        elRoot.querySelector("#i3-flatbtn").onclick = function () {
            if (mode2d) {
                if (!webglAvailable()) { msg("이 기기에서는 3D 화면을 쓸 수 없어요."); return; }
                mode2d = false;
                stop2dTimer();
                elRoot.classList.remove("flat");
                this.innerText = "🗺️ 가벼운 화면";
                goArea(area);
                lastT = 0;
                loop();
            } else {
                if (raf) { cancelAnimationFrame(raf); raf = null; }
                this.innerText = "🧭 3D 화면";
                enter2D("가벼운 화면으로 바꿨어요. 할 수 있는 건 똑같아요 🌿");
            }
        };
        elRoot.querySelector("#i3-act").onclick = function () {
            if (busy && elDlg.classList.contains("show")) nextLine(); else interact();
        };
        elDlg.onclick = nextLine;
        elRoot.querySelectorAll("#i3-pad button").forEach(function (b) {
            bindPad(b, b.getAttribute("data-dir"));
        });
    }

    window.showIsland = showIsland;
    window.hideIsland = hideIsland;
    window.isIslandOpen = function () { return open; };
})();

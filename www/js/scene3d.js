/* =====================================================================
   낚시터 · 광산 미니 3D 무대
   ---------------------------------------------------------------------
   조작(찌 던지기 · 연타 · 게이지)은 app.js 가 그대로 들고 있고,
   여기서는 '지금 무슨 상태인가'만 받아서 눈에 보이게 만듭니다.
   규칙을 모르는 채로 그리기만 하므로 기존 로직을 건드리지 않아요.

   ■ 낚시
     던지기 → 기다리기 → 입질 → 줄 감기 → 잡음
     단계마다 낚싯대가 휘고, 찌가 날아가고, 물결이 퍼지고,
     마지막엔 잡은 물고기가 바늘에 매달려 올라옵니다.

   ■ 광산
     오른쪽에 곡괭이를 세워두고, 두들길 때마다 실제로 내리찍습니다.

   ■ 강화 단계
     낚싯대 5단계 · 곡괭이 4단계마다 생김새가 달라집니다.
     setRod(level) / setPick(level) 로 갈아끼웁니다.
   ===================================================================== */
(function () {
    "use strict";

    function webglOk() {
        if (typeof THREE === "undefined") return false;
        try {
            var c = document.createElement("canvas");
            return !!(c.getContext("webgl") || c.getContext("experimental-webgl"));
        } catch (e) { return false; }
    }

    function mat(hex, opt) {
        opt = opt || {};
        var p = { color: hex, roughness: opt.rough === undefined ? 0.9 : opt.rough,
                  metalness: opt.metal || 0, flatShading: !!opt.flat };
        if (opt.emissive) p.emissive = new THREE.Color(opt.emissive);
        if (opt.alpha !== undefined) { p.transparent = true; p.opacity = opt.alpha; }
        return new THREE.MeshStandardMaterial(p);
    }
    function at(m, x, y, z) { m.position.set(x, y, z); return m; }

    function disposeGroup(g) {
        g.traverse(function (o) {
            if (o.geometry) o.geometry.dispose();
            if (o.material) {
                if (Array.isArray(o.material)) o.material.forEach(function (m) { m.dispose(); });
                else o.material.dispose();
            }
        });
    }

    // 공통 뼈대
    function makeStage(hostId, opt) {
        var host = document.getElementById(hostId);
        if (!host || !webglOk()) return null;

        var S = { host: host, visible: false, raf: null, t0: performance.now(), state: {} };
        try {
            S.canvas = document.createElement("canvas");
            S.canvas.className = "mini3d-canvas";
            S.renderer = new THREE.WebGLRenderer({ canvas: S.canvas, antialias: true, alpha: true });
            S.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
            S.scene = new THREE.Scene();
            S.camera = new THREE.PerspectiveCamera(opt.fov || 42, 1.7, 0.1, 60);
            S.camera.position.fromArray(opt.cam);
            S.camera.lookAt(opt.look[0], opt.look[1], opt.look[2]);

            S.scene.add(new THREE.HemisphereLight(opt.sky || 0xdff0ff, opt.ground || 0x556070, 0.95));
            var d = new THREE.DirectionalLight(0xfff2d8, opt.sun === undefined ? 1.0 : opt.sun);
            d.position.set(3, 5, 4);
            S.scene.add(d);

            S.root = new THREE.Group();
            S.scene.add(S.root);
            host.insertBefore(S.canvas, host.firstChild);
            host.classList.add("has3d");
        } catch (e) { return null; }

        S.resize = function () {
            var w = host.clientWidth || 320, h = host.clientHeight || 180;
            S.renderer.setSize(w, h, false);
            S.camera.aspect = w / Math.max(1, h);
            S.camera.updateProjectionMatrix();
            if (S.reframe) S.reframe();
        };
        S.resize();
        window.addEventListener("resize", S.resize);

        S.loop = function () {
            S.raf = requestAnimationFrame(S.loop);
            if (!S.visible) return;
            // 무대는 탭이 아직 숨어 있을 때 만들어지기도 합니다. 그때는 캔버스가
            // 0x0 이라 도구 자리를 제대로 잴 수 없어요. 그래서 크기가 달라지면
            // (0 이었다가 실제 크기가 생긴 첫 프레임 포함) 다시 맞춥니다.
            var cw = host.clientWidth, ch = host.clientHeight;
            if (cw !== S.lastW || ch !== S.lastH) {
                S.lastW = cw; S.lastH = ch;
                S.resize();
            }
            var t = (performance.now() - S.t0) / 1000;
            if (opt.tick) opt.tick(S, t);
            S.renderer.render(S.scene, S.camera);
        };
        S.show = function () { S.visible = true; S.resize(); if (!S.raf) S.loop(); };
        S.hide = function () { S.visible = false; };
        S.set = function (st) { Object.keys(st || {}).forEach(function (k) { S.state[k] = st[k]; }); };
        S.now = function () { return (performance.now() - S.t0) / 1000; };
        return S;
    }

    // =================================================================
    // 도구를 화면 안에 맞춰 넣기
    //
    // 낚싯대와 곡괭이는 강화할수록 길어지고 부품이 늘어납니다.
    // 그런데 그 달라지는 부분이 화면 밖으로 잘리면 강화를 해도
    // 달라진 게 안 보여요. 실제로 그래서 "강화가 반영이 안 된다"고
    // 느껴졌습니다.
    //
    // 화면 폭은 기기마다 다르고(폰 320px ~ 태블릿), 카메라에 담기는
    // 가로 범위도 그만큼 달라집니다. 그래서 자리를 숫자로 고정하지 않고,
    // 지금 화면에 실제로 어떻게 찍히는지 재서 맞춥니다.
    //   1) 먼저 크기를 줄여 도구가 화면 폭의 일정 비율 안에 들어오게 하고
    //   2) 그 다음 오른쪽 끝이 화면 안쪽에 오도록 옆으로 밀어 넣습니다
    // 화면 크기가 바뀔 때마다(S.resize) 다시 맞춥니다.
    // =================================================================
    function projectBox(S, obj) {
        var w = S.renderer.domElement.clientWidth || 1;
        var h = S.renderer.domElement.clientHeight || 1;
        S.scene.updateMatrixWorld(true);
        var box = new THREE.Box3().setFromObject(obj);
        if (box.isEmpty()) return null;
        var lo = box.min, hi = box.max, v = new THREE.Vector3();
        var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (var i = 0; i < 8; i++) {
            v.set(i & 1 ? hi.x : lo.x, i & 2 ? hi.y : lo.y, i & 4 ? hi.z : lo.z).project(S.camera);
            var px = (v.x + 1) / 2 * w, py = (1 - v.y) / 2 * h;
            if (px < x0) x0 = px; if (px > x1) x1 = px;
            if (py < y0) y0 = py; if (py > y1) y1 = py;
        }
        return { x0: x0, x1: x1, y0: y0, y1: y1, w: w, h: h };
    }

    // pivot 을 옮기고 줄여서 obj 가 화면 안에 들어오게 합니다.
    //
    // 도구는 가만히 있지 않고 휘둘리거나 젖혀집니다. 쉴 때 자세만 보고
    // 맞추면 휘두르는 순간 화면 밖으로 나가요. 그래서 동작 중에 나오는
    // 자세들(poses)을 전부 겹쳐 놓은 크기를 기준으로 맞춥니다.
    //   maxW/maxH: 화면 대비 최대 크기 비율,  right: 오른쪽 끝을 둘 위치 비율
    function fitTool(S, pivot, obj, base, maxW, maxH, right, poses, setPose, ratio) {
        if (!S || !pivot || !obj) return;
        pivot.scale.setScalar(base.scale);
        pivot.position.set(base.x, base.y, base.z);

        // 모든 자세를 겹친 크기
        function measure() {
            var acc = null;
            for (var i = 0; i < poses.length; i++) {
                setPose(poses[i]);
                var b = projectBox(S, obj);
                if (!b) continue;
                if (!acc) acc = b;
                else {
                    acc = { x0: Math.min(acc.x0, b.x0), x1: Math.max(acc.x1, b.x1),
                            y0: Math.min(acc.y0, b.y0), y1: Math.max(acc.y1, b.y1),
                            w: b.w, h: b.h };
                }
            }
            return acc;
        }

        // 1) 크기 맞추기 — 두 번 재서 다듬습니다 (원근이라 한 번엔 딱 안 맞아요)
        for (var pass = 0; pass < 2; pass++) {
            var b = measure();
            if (!b) return;
            var kw = (b.w * maxW) / Math.max(1, b.x1 - b.x0);
            var kh = (b.h * maxH) / Math.max(1, b.y1 - b.y0);
            var k = Math.min(1, kw, kh);
            if (k < 0.999) pivot.scale.multiplyScalar(k);
        }

        // 1-b) 그냥 화면에 꽉 채우면 강화 단계마다 크기가 똑같아져서
        //      '길어졌다'는 느낌이 사라집니다. 그래서 제일 높은 단계를
        //      기준으로 맞춘 뒤, 낮은 단계는 그만큼 작게 둡니다.
        //      (자기 길이로 맞춘 값 x 제 길이 비율 = 모든 단계가 같은 배율)
        if (ratio && ratio > 0 && ratio < 1) pivot.scale.multiplyScalar(ratio);

        // 2) 오른쪽 끝이 화면 안에 들어오도록 옆으로 밀기
        var b2 = measure();
        if (!b2) return;
        var overshoot = b2.x1 - b2.w * right;
        if (overshoot > 0) {
            // 화면 1px 이 월드로 얼마인지 재서 그만큼 왼쪽으로 옮깁니다
            var before = b2.x1;
            pivot.position.x -= 0.5;
            var b3 = measure();
            var perUnit = (before - b3.x1) / 0.5;      // 월드 1 당 화면 px
            pivot.position.x += 0.5;
            if (perUnit > 0.001) pivot.position.x -= overshoot / perUnit;
        }
        // 3) 위아래로 삐져나가면 끌어당깁니다
        var b4 = measure();
        if (b4) {
            if (b4.y0 < 0) pivot.position.y -= (b4.y0 / Math.max(1, b4.y1 - b4.y0)) * 0.9;
            var b5 = measure();
            if (b5 && b5.y1 > b5.h) {
                pivot.position.y += ((b5.y1 - b5.h) / Math.max(1, b5.y1 - b5.y0)) * 0.9;
            }
        }
    }

    // =================================================================
    // 낚싯대 — 강화 단계마다 다른 모습
    // =================================================================
    var ROD_LOOK = [
        { pole: 0x8b5e3c, grip: 0x5a3b22, ring: 0x9a9a9a, len: 3.2, glow: 0,        gem: null },
        { pole: 0x9c6b42, grip: 0x4a4a52, ring: 0xd8d8e0, len: 3.5, glow: 0,        gem: null },
        { pole: 0x6f8fb0, grip: 0x35485c, ring: 0x9fd8f5, len: 3.8, glow: 0x143244, gem: 0x64d2ff },
        { pole: 0xd9b25a, grip: 0x8a6a25, ring: 0xffe08a, len: 4.0, glow: 0x4a3708, gem: 0xffd34d },
        { pole: 0xe8d7a0, grip: 0x9b7a2e, ring: 0xfff3b0, len: 4.3, glow: 0x6a5312, gem: 0xff7ad2 }
    ];

    function buildRod(level) {
        var L = ROD_LOOK[Math.max(0, Math.min(ROD_LOOK.length - 1, level || 0))];
        var g = new THREE.Group();

        // 손잡이
        var grip = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.75, 8), mat(L.grip, { rough: 0.7 }));
        grip.position.y = 0.36;
        g.add(grip);
        // 대 — 위로 갈수록 가늘어집니다
        var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.06, L.len, 7),
                                  mat(L.pole, { rough: 0.55, emissive: L.glow }));
        pole.position.y = 0.75 + L.len / 2;
        g.add(pole);
        // 가이드 링 — 강화할수록 개수가 늘어납니다
        var rings = 2 + level;
        for (var i = 0; i < rings; i++) {
            var f = (i + 1) / (rings + 1);
            var r = new THREE.Mesh(new THREE.TorusGeometry(0.055 - f * 0.02, 0.012, 6, 10),
                                   mat(L.ring, { metal: 0.6, rough: 0.3 }));
            r.rotation.x = Math.PI / 2;
            r.position.y = 0.85 + L.len * f;
            g.add(r);
        }
        // 릴
        var reel = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.1, 12),
                                  mat(L.ring, { metal: 0.6, rough: 0.35 }));
        reel.rotation.z = Math.PI / 2;
        reel.position.set(0.16, 0.72, 0);
        g.add(reel);
        var handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.04), mat(L.grip));
        handle.position.set(0.26, 0.72, 0);
        g.add(handle);
        g.userData.handle = handle;

        // 보석 (2단계 이상)
        if (L.gem) {
            var gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0),
                                     mat(L.gem, { emissive: L.glow, rough: 0.2, metal: 0.3 }));
            gem.position.y = 0.78;
            g.add(gem);
            g.userData.gem = gem;
        }
        g.userData.tipY = 0.75 + L.len;
        return g;
    }

    // =================================================================
    // 물고기 — 종마다 다르게
    // =================================================================
    var FISH_LOOK = {
        anchovy:  { body: 0xc3d3dc, fin: 0x9ab0bd, size: 0.7,  kind: "fish" },
        mackerel: { body: 0x6f95ad, fin: 0x3f6a86, size: 0.95, kind: "fish", stripe: true },
        squid:    { body: 0xe4a3b8, fin: 0xcf7f98, size: 1.0,  kind: "squid" },
        octopus:  { body: 0xc06fa0, fin: 0x9a4d7d, size: 1.15, kind: "octo" }
    };

    function buildFish(species) {
        var F = FISH_LOOK[species] || FISH_LOOK.anchovy;
        var g = new THREE.Group();
        var s = F.size;

        if (F.kind === "fish") {
            var body = new THREE.Mesh(new THREE.SphereGeometry(0.3 * s, 14, 10), mat(F.body, { rough: 0.5 }));
            body.scale.set(1.5, 0.85, 0.55);
            g.add(body);
            var tail = new THREE.Mesh(new THREE.ConeGeometry(0.2 * s, 0.3 * s, 4), mat(F.fin, { flat: true }));
            tail.rotation.z = Math.PI / 2;
            tail.position.x = -0.5 * s;
            tail.scale.set(1, 1, 0.4);
            g.add(tail);
            var dor = new THREE.Mesh(new THREE.ConeGeometry(0.12 * s, 0.22 * s, 3), mat(F.fin, { flat: true }));
            dor.position.y = 0.24 * s;
            dor.scale.z = 0.35;
            g.add(dor);
            if (F.stripe) {
                for (var i = 0; i < 3; i++) {
                    var st = new THREE.Mesh(new THREE.BoxGeometry(0.05 * s, 0.3 * s, 0.34 * s), mat(F.fin));
                    st.position.set(-0.12 * s + i * 0.16 * s, 0.03, 0);
                    g.add(st);
                }
            }
            g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.05 * s, 8, 6), mat(0x2b2118)),
                     0.34 * s, 0.07 * s, 0.13 * s));
        } else {
            // 오징어 · 문어 — 머리 + 다리
            var head = new THREE.Mesh(new THREE.SphereGeometry(0.32 * s, 14, 10), mat(F.body, { rough: 0.5 }));
            head.scale.set(1, F.kind === "squid" ? 1.35 : 1.05, 1);
            head.position.y = 0.14 * s;
            g.add(head);
            var arms = F.kind === "squid" ? 6 : 8;
            for (var k = 0; k < arms; k++) {
                var a = Math.PI * 2 * k / arms;
                var arm = new THREE.Mesh(new THREE.ConeGeometry(0.055 * s, 0.5 * s, 5), mat(F.fin, { flat: true }));
                arm.position.set(Math.cos(a) * 0.16 * s, -0.24 * s, Math.sin(a) * 0.16 * s);
                arm.rotation.z = Math.cos(a) * 0.3;
                arm.rotation.x = -Math.sin(a) * 0.3;
                g.add(arm);
            }
            [-1, 1].forEach(function (d) {
                g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.06 * s, 8, 6), mat(0x2b2118)),
                         d * 0.14 * s, 0.2 * s, 0.27 * s));
            });
        }
        return g;
    }

    // =================================================================
    // 낚시터
    // =================================================================
    var fish = null;
    var ROD_TILT = 0.90;   // 낚싯대 기본 기울기 (화면에 다 담기게 눕힌 각도)
    // 강화 단계는 무대보다 먼저 정해집니다 (상점에서 강화한 뒤에 낚시터에 들어가니까).
    // 무대가 아직 없을 때 들어온 단계를 여기 적어 뒀다가, 무대를 세울 때 반영합니다.
    var wantRod = 0, wantPick = 0;

    function buildFishStage() {
        var S = makeStage("fish-pond", {
            cam: [0, 2.4, 6.4], look: [0, 0.7, 0], fov: 40,
            sky: 0xbfe7ff, ground: 0x2f6f96,
            tick: tickFish
        });
        if (!S) return null;

        var seaGeo = new THREE.PlaneGeometry(26, 22, 30, 24);
        S.sea = new THREE.Mesh(seaGeo, mat(0x3ea8d6, { rough: 0.45 }));
        S.sea.rotation.x = -Math.PI / 2;
        S.root.add(S.sea);
        S.seaBase = seaGeo.attributes.position.array.slice();

        var far = new THREE.Mesh(new THREE.PlaneGeometry(60, 14), mat(0xbfe7ff));
        far.position.set(0, 5.6, -14);
        S.root.add(far);

        var deck = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.22, 2.2), mat(0xb08654, { flat: true }));
        deck.position.set(0, 0.2, 3.6);
        S.root.add(deck);
        [-2.0, 2.0].forEach(function (x) {
            [2.8, 4.4].forEach(function (z) {
                var p = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 1.2, 7), mat(0x7d5a34));
                p.position.set(x, -0.35, z);
                S.root.add(p);
            });
        });

        // 낚싯대 자리 (모델은 setRod 로 채웁니다)
        // 낚싯대 자리.
        //
        // 예전에는 대를 거의 세워 뒀는데, 낚시 화면이 옆으로 길고 세로가 짧아서
        // (417x156 쯤) 대의 윗부분이 화면 밖으로 잘렸습니다. 하필 강화할수록
        // 달라지는 부분(가이드 링 개수, 길이, 끝의 보석)이 전부 그 윗부분이라,
        // 강화를 해도 달라진 게 안 보였어요.
        // 그래서 대를 눕히고 크기를 줄여, 어느 동작에서든 대 전체가 화면에
        // 들어오게 맞췄습니다. (5단계 전부 · 던지기/감기 동작 포함해서 확인)
        S.rodPivot = new THREE.Group();
        S.rodBase = { x: 2.0, y: 0.5, z: 3.2, scale: 0.5 };
        S.rodPivot.position.set(S.rodBase.x, S.rodBase.y, S.rodBase.z);
        S.rodPivot.scale.setScalar(S.rodBase.scale);
        S.root.add(S.rodPivot);
        // 화면 크기가 정해지거나 바뀔 때마다 대를 화면 안에 다시 맞춥니다.
        // 대는 눕혀 두므로(ROD_TILT) 그 자세로 재야 맞습니다.
        S.reframe = function () {
            if (!S.rod) return;
            var keepZ = S.rodPivot.rotation.z, keepX = S.rodPivot.rotation.x;
            // tickFish 가 만드는 lean 의 전 범위 (던질 때 +0.7, 채는 순간 -0.45)
            var maxLen = ROD_LOOK[ROD_LOOK.length - 1].len;
            var curLen = ROD_LOOK[Math.max(0, Math.min(ROD_LOOK.length - 1, S.rodLevel))].len;
            fitTool(S, S.rodPivot, S.rod, S.rodBase, 0.46, 0.80, 0.90,
                    [0, 0.70, -0.45, -0.34, -0.21], function (lean) {
                        S.rodPivot.rotation.z = ROD_TILT + lean;
                        S.rodPivot.rotation.x = -0.25 + lean * 0.3;
                    }, curLen / maxLen);
            S.rodPivot.rotation.z = keepZ;
            S.rodPivot.rotation.x = keepX;
        };
        S.rodLevel = -1;

        // 찌
        S.bobber = new THREE.Group();
        var bTop = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 10), mat(0xee4738));
        var bBot = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 10), mat(0xf4f4f4));
        bTop.scale.y = 0.9; bBot.scale.y = 0.9;
        bTop.position.y = 0.1; bBot.position.y = -0.08;
        S.bobber.add(bTop); S.bobber.add(bBot);
        var stick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 5), mat(0xffffff));
        stick.position.y = 0.32;
        S.bobber.add(stick);
        S.bobber.visible = false;
        S.root.add(S.bobber);
        S.bobHome = new THREE.Vector3(0, 0.12, -0.8);

        var lg = new THREE.BufferGeometry();
        lg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
        S.line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xf2f2f2, transparent: true, opacity: 0.85 }));
        S.line.frustumCulled = false;
        S.line.visible = false;
        S.root.add(S.line);

        // 물결 파문 두 겹
        S.rings = [0, 1].map(function (i) {
            var r = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.33, 26),
                                   new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true,
                                                                 opacity: 0, side: THREE.DoubleSide }));
            r.rotation.x = -Math.PI / 2;
            r.position.y = 0.04;
            S.root.add(r);
            return r;
        });

        // 입질 전에 다가오는 물고기 그림자
        S.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.3, 16),
                                  new THREE.MeshBasicMaterial({ color: 0x0d3c55, transparent: true, opacity: 0 }));
        S.shadow.rotation.x = -Math.PI / 2;
        S.shadow.position.y = 0.05;
        S.root.add(S.shadow);

        // 잡은 물고기가 매달릴 자리
        S.hooked = new THREE.Group();
        S.hooked.visible = false;
        S.root.add(S.hooked);
        S.hookedSpecies = "";

        // 멀리서 튀는 물고기
        S.jumper = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 9), mat(0x9fc6d8));
        S.jumper.scale.set(1, 0.5, 0.35);
        S.jumper.visible = false;
        S.root.add(S.jumper);
        S.jumpAt = 3;

        S.castAt = -9;      // 던진 순간
        S.reelAt = -9;      // 마지막으로 감은 순간
        S.caughtAt = -9;    // 잡은 순간
        setRodModel(S, 0);
        return S;
    }

    function setRodModel(S, level) {
        if (!S || S.rodLevel === level) return;
        S.rodLevel = level;
        while (S.rodPivot.children.length) {
            var old = S.rodPivot.children[0];
            S.rodPivot.remove(old);
            disposeGroup(old);
        }
        S.rod = buildRod(level);
        S.rodPivot.add(S.rod);
        // 강화하면 대가 길어지므로 화면 안에 다시 맞춥니다
        if (S.reframe) S.reframe();
    }

    function setHooked(S, species) {
        if (S.hookedSpecies === species) return;
        S.hookedSpecies = species;
        while (S.hooked.children.length) {
            var old = S.hooked.children[0];
            S.hooked.remove(old);
            disposeGroup(old);
        }
        if (species) S.hooked.add(buildFish(species));
    }

    function tickFish(S, t) {
        // 물결
        var pos = S.sea.geometry.attributes.position;
        var base = S.seaBase;
        for (var i = 0; i < pos.count; i++) {
            var x = base[i * 3], y = base[i * 3 + 1];
            pos.array[i * 3 + 2] = Math.sin(x * 0.5 + t * 1.1) * 0.14 + Math.cos(y * 0.6 + t * 0.8) * 0.1;
        }
        pos.needsUpdate = true;

        var stage = S.state.stage || "idle";
        var sinceCast = t - S.castAt;
        var sinceReel = t - S.reelAt;
        var sinceCaught = t - S.caughtAt;
        var casting = sinceCast < 0.55;
        var caught = sinceCaught < 2.2;

        // --- 낚싯대 자세 ---
        var lean = 0;
        if (casting) {
            // 뒤로 젖혔다가 앞으로 채는 동작
            var ck = sinceCast / 0.55;
            lean = ck < 0.35 ? (ck / 0.35) * 0.7 : (1 - (ck - 0.35) / 0.65) * 0.7 - 0.45;
        } else if (sinceReel < 0.26) {
            // 줄을 감을 때마다 대가 휩니다
            lean = -0.34 * (1 - sinceReel / 0.26);
        } else if (stage === "bite") {
            lean = -0.16 + Math.sin(t * 20) * 0.05;
        } else {
            lean = Math.sin(t * 1.2) * 0.02;
        }
        // ROD_TILT 만큼 기본으로 눕혀 두고, 위에서 구한 lean 을 얹습니다.
        // (던지기·감기 동작은 그대로 두고 기준 자세만 바꾼 거예요)
        S.rodPivot.rotation.z = ROD_TILT + lean;
        S.rodPivot.rotation.x = -0.25 + lean * 0.3;

        // 릴 손잡이 — 감을 때 빙글 돕니다
        if (S.rod && S.rod.userData.handle) {
            if (sinceReel < 0.4) S.rod.userData.handle.rotation.x = -sinceReel * 34;
            if (S.rod.userData.gem) S.rod.userData.gem.rotation.y = t * 1.6;
        }

        // --- 찌 ---
        var showBobber = (stage !== "idle") || casting || caught;
        S.bobber.visible = showBobber && !caught;
        S.line.visible = showBobber;

        if (casting) {
            // 포물선을 그리며 날아갑니다
            var k = Math.min(1, sinceCast / 0.55);
            var fly = Math.max(0, (k - 0.35) / 0.65);
            S.bobber.position.set(
                1.0 + (S.bobHome.x - 1.0) * fly,
                0.6 + Math.sin(fly * Math.PI) * 1.5 + (S.bobHome.y - 0.6) * fly,
                3.0 + (S.bobHome.z - 3.0) * fly
            );
        } else if (stage !== "idle") {
            var bite = stage === "bite";
            // 감을수록 조금씩 가까이 끌려옵니다
            var pull = Math.min(1, (S.state.pull || 0));
            var hz = S.bobHome.z + pull * 2.6;
            var amp = bite ? 0.17 : 0.05;
            var sp2 = bite ? 15 : 2.6;
            var dip = sinceReel < 0.26 ? -0.18 * (1 - sinceReel / 0.26) : 0;
            S.bobber.position.set(S.bobHome.x, 0.12 + Math.sin(t * sp2) * amp - (bite ? 0.1 : 0) + dip, hz);
        }

        // --- 줄 ---
        // 대 끝 위치를 손으로 계산하면 대의 자리·기울기·크기를 바꿀 때마다
        // 줄이 대에서 떨어져 나갑니다. 그래서 실제 대 끝을 그대로 가져다 씁니다.
        if (S.line.visible && S.rod) {
            S.rodPivot.updateMatrixWorld(true);
            var tip = new THREE.Vector3(0, S.rod.userData.tipY, 0)
                        .applyMatrix4(S.rodPivot.matrixWorld);
            var arr = S.line.geometry.attributes.position.array;
            arr[0] = tip.x; arr[1] = tip.y; arr[2] = tip.z;
            var tgt = caught ? S.hooked.position : S.bobber.position;
            arr[3] = tgt.x; arr[4] = tgt.y; arr[5] = tgt.z;
            S.line.geometry.attributes.position.needsUpdate = true;
        }

        // --- 파문 ---
        S.rings.forEach(function (r, idx) {
            var active = (stage === "bite") || sinceReel < 0.5 || casting;
            if (!active) { r.material.opacity = 0; return; }
            var kk = ((t * 1.5 + idx * 0.5) % 1);
            r.position.x = S.bobber.position.x;
            r.position.z = S.bobber.position.z;
            r.scale.setScalar(1 + kk * 2.8);
            r.material.opacity = 0.5 * (1 - kk);
        });

        // --- 입질 전 다가오는 그림자 ---
        if (stage === "waiting") {
            var wk = (t * 0.5) % 1;
            S.shadow.material.opacity = 0.28 * Math.sin(wk * Math.PI);
            S.shadow.position.x = S.bobber.position.x + Math.cos(t * 0.9) * 1.6;
            S.shadow.position.z = S.bobber.position.z + Math.sin(t * 0.9) * 1.2;
        } else if (stage === "bite") {
            S.shadow.material.opacity = 0.34;
            S.shadow.position.set(S.bobber.position.x, 0.05, S.bobber.position.z);
        } else {
            S.shadow.material.opacity = 0;
        }

        // --- 잡은 물고기가 매달려 올라옵니다 ---
        S.hooked.visible = caught;
        if (caught) {
            var hk = Math.min(1, sinceCaught / 0.7);
            S.hooked.position.set(
                S.bobHome.x + (0.6 - S.bobHome.x) * hk,
                -0.2 + hk * 2.1,
                S.bobHome.z + (2.4 - S.bobHome.z) * hk
            );
            // 파닥거림
            S.hooked.rotation.z = Math.sin(sinceCaught * 16) * 0.5;
            S.hooked.rotation.y = Math.sin(sinceCaught * 6) * 0.6;
        }

        // 멀리서 튀는 물고기
        if (t > S.jumpAt) {
            var jk = (t - S.jumpAt) / 0.9;
            if (jk < 1) {
                S.jumper.visible = true;
                S.jumper.position.set(S.jumpX || -3, Math.sin(jk * Math.PI) * 1.1, -4.5);
                S.jumper.rotation.z = jk * 3;
            } else {
                S.jumper.visible = false;
                S.jumpAt = t + 4 + Math.random() * 5;
                S.jumpX = -4 + Math.random() * 8;
            }
        }
    }

    // =================================================================
    // 곡괭이 — 강화 단계마다 다른 모습
    // =================================================================
    var PICK_LOOK = [
        { head: 0x8a8a92, handle: 0x7a5433, glow: 0,        size: 1.0,  gem: null },
        { head: 0xc0c6cc, handle: 0x6a4a2c, glow: 0,        size: 1.08, gem: null },
        { head: 0x9fd8f5, handle: 0x4a5c6a, glow: 0x143244, size: 1.16, gem: 0x64d2ff },
        { head: 0xffd34d, handle: 0x8a6a25, glow: 0x4a3708, size: 1.26, gem: 0xff7ad2 }
    ];

    function buildPick(level) {
        var L = PICK_LOOK[Math.max(0, Math.min(PICK_LOOK.length - 1, level || 0))];
        var g = new THREE.Group();
        var s = L.size;

        var handle = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * s, 0.085 * s, 2.1 * s, 8),
                                    mat(L.handle, { rough: 0.75 }));
        g.add(handle);

        // 양쪽으로 뾰족한 머리
        var headG = new THREE.Group();
        headG.position.y = 1.0 * s;
        [-1, 1].forEach(function (d) {
            var tip = new THREE.Mesh(new THREE.ConeGeometry(0.15 * s, 0.75 * s, 4),
                                     mat(L.head, { metal: 0.55, rough: 0.3, emissive: L.glow, flat: true }));
            tip.rotation.z = d * Math.PI / 2;
            tip.position.x = d * 0.42 * s;
            headG.add(tip);
        });
        var core = new THREE.Mesh(new THREE.BoxGeometry(0.3 * s, 0.22 * s, 0.22 * s),
                                  mat(L.head, { metal: 0.55, rough: 0.3, emissive: L.glow }));
        headG.add(core);
        if (L.gem) {
            var gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.12 * s, 0),
                                     mat(L.gem, { emissive: L.glow, rough: 0.2 }));
            gem.position.y = 0.2 * s;
            headG.add(gem);
            g.userData.gem = gem;
        }
        g.add(headG);

        // 손잡이 감은 끈 (강화할수록 여러 겹)
        for (var i = 0; i <= level; i++) {
            var wrap = new THREE.Mesh(new THREE.TorusGeometry(0.082 * s, 0.02 * s, 6, 12),
                                      mat(0x5a4030));
            wrap.rotation.x = Math.PI / 2;
            wrap.position.y = -0.55 * s + i * 0.16 * s;
            g.add(wrap);
        }
        return g;
    }

    // =================================================================
    // 광산
    // =================================================================
    var mine = null;
    var TIER_COLOR = { none: 0x8a8a92, stone: 0xa0a0a8, iron: 0xb9977a, crystal: 0x9b7fd4, diamond: 0x8fe3f0 };

    function buildMineStage() {
        var S = makeStage("mine-cave", {
            cam: [0, 1.5, 5.6], look: [-0.4, 1.0, 0], fov: 44,
            sky: 0x6a6a80, ground: 0x2a2a34, sun: 0.7,
            tick: tickMine
        });
        if (!S) return null;

        var wall = new THREE.Mesh(new THREE.BoxGeometry(12, 6.4, 1), mat(0x4a4a58, { flat: true }));
        wall.position.set(0, 1.8, -1.6);
        S.root.add(wall);
        for (var i = 0; i < 16; i++) {
            var r = 0.3 + Math.random() * 0.55;
            var b = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), mat(0x545464, { flat: true }));
            b.position.set(-5 + Math.random() * 10, 0.2 + Math.random() * 3.4, -1.1 + Math.random() * 0.5);
            b.rotation.set(Math.random(), Math.random(), Math.random());
            S.root.add(b);
        }
        var floor = new THREE.Mesh(new THREE.BoxGeometry(12, 0.4, 4), mat(0x3d3d48, { flat: true }));
        floor.position.set(0, -0.2, 0.4);
        S.root.add(floor);

        // 광맥은 살짝 왼쪽으로 — 오른쪽은 곡괭이 자리
        S.vein = new THREE.Mesh(new THREE.DodecahedronGeometry(0.95, 0), mat(TIER_COLOR.none, { flat: true }));
        S.vein.position.set(-0.7, 1.5, -0.9);
        S.root.add(S.vein);
        S.veinHome = S.vein.position.clone();

        S.gems = [];
        for (var k = 0; k < 7; k++) {
            var a = Math.PI * 2 * k / 7;
            var gm = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0),
                                    mat(0xffffff, { emissive: 0x333333, flat: true }));
            gm.position.set(-0.7 + Math.cos(a) * 0.62, 1.5 + Math.sin(a) * 0.55, -0.5);
            gm.visible = false;
            S.gems.push(gm);
            S.root.add(gm);
        }

        var lamp = new THREE.PointLight(0xffb765, 1.3, 12, 1.6);
        lamp.position.set(-3.2, 3.2, 1.4);
        S.root.add(lamp);
        var lampBall = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 9), mat(0xffd98a, { emissive: 0x8a6512 }));
        lampBall.position.copy(lamp.position);
        S.root.add(lampBall);

        // 곡괭이는 오른쪽에서 휘두릅니다
        // 곡괭이도 낚싯대와 같은 이유로 자리를 다시 잡았습니다.
        // 예전 자리에서는 휘두를 때 머리 부분이 화면 위·오른쪽으로 잘려서,
        // 강화해도 달라진 머리가 안 보였어요. 4단계 전부, 휘두르는 각도
        // 전 범위에서 화면 안에 들어오는 값으로 맞췄습니다.
        S.pickPivot = new THREE.Group();
        S.pickBase = { x: 1.4, y: 1.3, z: 1.2, scale: 0.68 };
        S.pickPivot.position.set(S.pickBase.x, S.pickBase.y, S.pickBase.z);
        S.pickPivot.scale.setScalar(S.pickBase.scale);
        S.pickFitX = S.pickBase.x;   // 화면에 맞춰 정해지는 실제 x (reframe 이 갱신)
        S.pickLunge = 0.8;           // 내리찍을 때 앞으로 파고드는 거리
        S.reframe = function () {
            if (!S.pick) return;
            // 곡괭이는 휘두르며 도니까, 휘두르는 각도 전체를 겹쳐서 맞춥니다
            var keep = S.pickPivot.rotation.z;
            var maxSz = PICK_LOOK[PICK_LOOK.length - 1].size;
            var curSz = PICK_LOOK[Math.max(0, Math.min(PICK_LOOK.length - 1, S.pickLevel))].size;
            fitTool(S, S.pickPivot, S.pick, S.pickBase, 0.44, 0.76, 0.94,
                    [-1.0, -0.5, 0, 0.5, 1.0], function (rot) {
                        S.pickPivot.rotation.z = rot;
                    }, curSz / maxSz);
            S.pickPivot.rotation.z = keep;
            // 맞춰진 자리를 tickMine 이 쓰도록 기억해 둡니다.
            // 파고드는 거리도 줄어든 크기에 맞춰 같이 줄입니다.
            S.pickFitX = S.pickPivot.position.x;
            S.pickLunge = 0.8 * (S.pickPivot.scale.x / S.pickBase.scale);
        };
        S.root.add(S.pickPivot);
        S.pickLevel = -1;

        // 부딪히는 순간 튀는 불똥
        S.sparks = [];
        for (var sp = 0; sp < 10; sp++) {
            var s2 = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), mat(0xffd98a, { emissive: 0x8a6512 }));
            s2.visible = false;
            S.sparks.push(s2);
            S.root.add(s2);
        }

        S.pending = 0;      // 아직 찍지 않은 몫 (누를 때마다 하나씩 쌓입니다)
        S.swingSpeed = 0;
        S.swingPhase = 0;   // 스윙 위상 — 한 바퀴 돌 때마다 한 번 찍습니다
        S.impactAt = -9;
        setPickModel(S, 0);
        return S;
    }

    function setPickModel(S, level) {
        if (!S || S.pickLevel === level) return;
        S.pickLevel = level;
        while (S.pickPivot.children.length) {
            var old = S.pickPivot.children[0];
            S.pickPivot.remove(old);
            disposeGroup(old);
        }
        S.pick = buildPick(level);
        // 자루 아래쪽을 잡고 휘두르도록 위치를 내립니다
        S.pick.position.y = -1.0;
        S.pickPivot.add(S.pick);
        if (S.reframe) S.reframe();
    }

    function tickMine(S, t) {
        var g = S.state.gauge || 0;
        var tier = S.state.tier || "none";

        var target = TIER_COLOR[tier] || TIER_COLOR.none;
        S.vein.material.color.lerp(new THREE.Color(target), 0.08);
        var s = 1 + g / 100 * 0.35;
        S.vein.rotation.y = t * 0.25;

        var show = Math.floor(g / 100 * S.gems.length);
        S.gems.forEach(function (gm, i) {
            gm.visible = i < show;
            if (gm.visible) {
                gm.rotation.set(t * 1.2 + i, t * 0.9 + i, 0);
                gm.material.color.set(target);
                gm.position.y = 1.5 + Math.sin(Math.PI * 2 * i / S.gems.length) * 0.55 + Math.sin(t * 2 + i) * 0.03;
            }
        });

        // --- 곡괭이질 ---
        //
        // 한 번 누를 때마다 스윙 한 번을 처음부터 재생하면, 연타할 때
        // 자꾸 처음으로 되돌아가서 곡괭이가 버벅거립니다.
        // 그래서 '휘두르는 속도'를 두고 위상만 계속 굴립니다.
        // 두들기는 동안에는 멈추지 않고 이어서 찍고, 손을 떼면
        // 속도가 서서히 줄어 어깨에 걸친 자세로 돌아갑니다.
        var dt = Math.min(0.05, t - (S.lastT === undefined ? t : S.lastT));
        S.lastT = t;

        // 누른 만큼 '찍을 몫'이 쌓이고, 한 바퀴 돌 때마다 하나씩 씁니다.
        // 그래서 두들긴 횟수와 찍히는 횟수가 맞아떨어져요.
        // 몫이 밀려 있으면 그만큼 빠르게 휘둘러서 따라잡습니다.
        var pending = S.pending || 0;
        S.swingSpeed = pending > 0 ? (1 + pending * 0.4) : 0;

        var CHOP_HZ = 3.6;
        if (pending > 0) {
            var prev = S.swingPhase || 0;
            S.swingPhase = prev + dt * CHOP_HZ * S.swingSpeed;
            // 위상이 한 바퀴를 넘는 순간이 '맞는 순간'입니다
            if (Math.floor(S.swingPhase) > Math.floor(prev)) {
                S.impactAt = t;
                S.pending = Math.max(0, pending - 1);
                if (S.pending === 0) S.swingPhase = 0;      // 다 쓰면 대기 자세로
            }
        }

        var ph = (S.swingPhase || 0) % 1;
        if (S.swingSpeed > 0.01) {
            // 앞 35% 치켜들고, 뒤 65% 내리찍기
            var ang = ph < 0.35
                ? -0.45 - (ph / 0.35) * 0.7
                : -1.15 + ((ph - 0.35) / 0.65) * 2.05;
            // 속도가 잦아들면 대기 자세로 부드럽게 섞습니다
            var idleA = -0.45 + Math.sin(t * 1.3) * 0.05;
            var w = Math.min(1, S.swingSpeed * 2);
            S.pickPivot.rotation.z = ang * w + idleA * (1 - w);
            // 자리는 화면 크기에 맞춰 정해진 값(pickFitX)을 기준으로 씁니다.
            // 예전에는 여기서 2.45 로 못 박아 버려서, 화면에 맞춰 옮겨 놓은
            // 자리를 매 프레임 다시 밀어내고 있었어요.
            S.pickPivot.position.x = S.pickFitX - Math.max(0, (ph - 0.35) / 0.65) * S.pickLunge * w;
        } else {
            S.pickPivot.rotation.z = -0.45 + Math.sin(t * 1.3) * 0.05;
            S.pickPivot.position.x = S.pickFitX;
        }
        if (S.pick && S.pick.userData.gem) S.pick.userData.gem.rotation.y = t * 2;

        // 맞은 직후 — 광맥이 튀고 불똥이 흩어집니다.
        // 연타 중에는 이게 겹치면서 계속 깨지는 것처럼 보입니다.
        var impact = t - (S.impactAt === undefined ? -9 : S.impactAt);
        if (impact >= 0 && impact < 0.24) {
            var ik = impact / 0.24;
            S.vein.position.x = S.veinHome.x + Math.sin(ik * Math.PI * 6) * 0.16 * (1 - ik);
            S.vein.position.y = S.veinHome.y + Math.sin(ik * Math.PI * 4) * 0.07 * (1 - ik);
            S.vein.scale.setScalar(s * (1 + (1 - ik) * 0.16));
            S.sparks.forEach(function (sk, i) {
                sk.visible = true;
                var a2 = Math.PI * 2 * i / S.sparks.length + (S.impactAt || 0) * 3;
                var d = ik * 1.4;
                sk.position.set(S.veinHome.x + Math.cos(a2) * d,
                                S.veinHome.y + Math.sin(a2) * d + ik * 0.45,
                                -0.4 + Math.sin(a2 * 2) * 0.3);
                sk.scale.setScalar(Math.max(0.01, 1 - ik));
                sk.rotation.set(a2, a2 * 1.5, 0);
            });
        } else {
            S.vein.position.x = S.veinHome.x;
            S.vein.position.y = S.veinHome.y;
            S.vein.scale.setScalar(s + Math.sin(t * 2) * 0.01);
            S.sparks.forEach(function (sk) { sk.visible = false; });
        }
    }

    // =================================================================
    // 바깥에서 쓰는 창구
    // =================================================================
    window.scene3d = {
        available: webglOk,

        fish: {
            init: function () {
                if (!fish) {
                    fish = buildFishStage();
                    // 무대는 항상 기본 낚싯대로 세워집니다.
                    // 강화해 둔 단계를 기억했다가 여기서 바로 갈아 끼워요.
                    if (fish) setRodModel(fish, wantRod);
                }
                return !!fish;
            },
            show: function () { if (this.init()) fish.show(); },
            hide: function () { if (fish) fish.hide(); },
            set:  function (st) { if (fish) fish.set(st); },
            // 낚싯대를 던지는 순간
            cast: function () { if (fish) { fish.castAt = fish.now(); setHooked(fish, ""); fish.caughtAt = -9; } },
            // 줄을 한 번 감을 때마다
            reel: function (pull) {
                if (!fish) return;
                fish.reelAt = fish.now();
                fish.set({ pull: pull || 0 });
            },
            // 잡았을 때 — 바늘에 물고기가 매달립니다
            caught: function (species) {
                if (!fish) return;
                setHooked(fish, species || "anchovy");
                fish.caughtAt = fish.now();
            },
            rod: function (level) {
                wantRod = level || 0;
                if (fish) setRodModel(fish, wantRod);
            }
        },

        mine: {
            init: function () {
                if (!mine) {
                    mine = buildMineStage();
                    if (mine) setPickModel(mine, wantPick);
                }
                return !!mine;
            },
            show: function () { if (this.init()) mine.show(); },
            hide: function () { if (mine) mine.hide(); },
            set:  function (st) { if (mine) mine.set(st); },
            // 두들길 때마다 휘두르는 속도를 채워 줍니다.
            // 연타하면 속도가 유지되면서 곡괭이가 쉬지 않고 찍습니다.
            // 한 번 누를 때마다 '찍을 몫'을 하나 쌓습니다.
            // 연타하면 몫이 밀리면서 곡괭이가 더 빠르게 연속으로 찍어요.
            // 다만 너무 밀리면 우스워지므로 6개까지만 쌓입니다.
            hit:  function () {
                if (!mine) return;
                mine.pending = Math.min(6, (mine.pending || 0) + 1);
            },
            pick: function (level) {
                wantPick = level || 0;
                if (mine) setPickModel(mine, wantPick);
            }
        }
    };
})();

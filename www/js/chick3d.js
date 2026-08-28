/* =====================================================================
   병아리 3D — 보살피기 화면의 주인공을 입체로 그립니다
   ---------------------------------------------------------------------
   ■ 왜 여기만 3D 인가
     도감 18칸, 동반자 카드, 산책 캐릭터, 놀이판 두더지처럼 작은 그림이
     화면에 수십 개씩 뜹니다. 그걸 전부 WebGL 로 그리면 폰이 버티지
     못해요. 그래서 '크게 보이는 주인공' 한 마리만 3D 로 그리고,
     나머지는 지금까지 쓰던 SVG 를 그대로 씁니다.

   ■ WebGL 이 안 되면
     아무 일도 하지 않고 조용히 물러납니다. app.js 가 그때는 원래대로
     SVG 를 넣기 때문에, 구형 기기에서도 화면이 비지 않습니다.

   ■ 모델
     전부 기본 도형(구·원뿔·원기둥)을 조합해서 만듭니다. 외부 모델
     파일을 받지 않으므로 단일 HTML 빌드와 오프라인 실행이 그대로 됩니다.

   ■ 악세서리
     캐릭터 그룹 안에 같이 넣습니다. 그래야 쪼거나 폴짝 뛸 때 장식도
     같이 움직여요. 머리 크기·위치는 단계마다 다르므로, 그 값에서
     크기와 자리를 계산해 씌웁니다.
   ===================================================================== */
(function () {
    "use strict";

    var ready = false, failed = false;
    var renderer, scene, camera, root, raf = null;
    var elWrap, elCanvas;
    var curKey = "";
    var t0 = performance.now();
    var anim = { name: "", until: 0, dur: 600 };
    var spin = { base: 0, touched: false };
    var visible = false;
    var zzz = null;            // 잘 때 머리 위에 뜨는 Z

    // 쓰다듬기 상태
    var pet = { on: false, ok: true, u: 0, v: 0, stroke: 0, lastMoveAt: -9, warmth: 0 };
    var raycaster = null;
    var hearts = [];           // 쓰다듬을 때 피어오르는 하트

    var SKIN = {
        egg:       { body: 0xfff3dc, dark: 0xe8d5ae, beak: 0xffa62b, leg: 0xffa62b },
        hatchling: { body: 0xffe27a, dark: 0xf2bd2c, beak: 0xffb84d, leg: 0xffb84d },
        chubby:    { body: 0xffd54a, dark: 0xf0b71f, beak: 0xffa62b, leg: 0xffa62b },
        brave:     { body: 0xffc93c, dark: 0xeba606, beak: 0xffa62b, leg: 0xffa62b, comb: 0xef7070 },
        adult:     { body: 0xf6bd3b, dark: 0xdda017, beak: 0xffa62b, leg: 0xffa62b, comb: 0xef5350 },
        turkey:    { body: 0xa97045, dark: 0x8a5730, beak: 0xffa62b, leg: 0xffa62b, comb: 0xef5350 },
        peacock:   { body: 0x2f9e8f, dark: 0x1f7f74, beak: 0xffb84d, leg: 0xffa62b },
        owl:       { body: 0xb08055, dark: 0x96683f, beak: 0xe6a83c, leg: 0xe6a83c },
        swan:      { body: 0xffffff, dark: 0xe4e9ef, beak: 0xf0a04b, leg: 0xf0a04b },
        rainbird:  { body: 0x8f9bb3, dark: 0x6d7a94, beak: 0xe0a24b, leg: 0xe07a7a },
        nightowl:  { body: 0x4b4b73, dark: 0x3a3a5c, beak: 0xc9a24a, leg: 0xc9a24a }
    };

    var TIER_TINT = { wild: 0.62, healthy: 1.0, radiant: 1.12 };

    // 단계마다 몸매가 달라집니다.
    //   headR  머리가 몸에 비해 얼마나 큰가 (갓 깬 아이일수록 큽니다)
    //   legLen 다리 길이 (자랄수록 길어져 자세가 서 있게 됩니다)
    //   squash 몸통 납작함 (통통 단계가 제일 둥급니다)
    //   tail   꼬리깃 개수, comb 볏 단계
    var SHAPE = {
        hatchling: { br: 0.42, headR: 0.80, legLen: 0.06, squash: [1.00, 0.96, 1.00], tail: 0, comb: 0, shell: true,  neck: 0.00 },
        chubby:    { br: 0.60, headR: 0.62, legLen: 0.16, squash: [1.12, 0.88, 1.10], tail: 1, comb: 0, shell: false, neck: 0.02 },
        brave:     { br: 0.56, headR: 0.52, legLen: 0.34, squash: [0.96, 1.02, 1.00], tail: 3, comb: 1, shell: false, neck: 0.10 },
        adult:     { br: 0.60, headR: 0.46, legLen: 0.48, squash: [0.92, 1.06, 0.98], tail: 5, comb: 2, shell: false, neck: 0.16 },
        turkey:    { br: 0.64, headR: 0.44, legLen: 0.44, squash: [1.00, 1.00, 1.02], tail: 0, comb: 2, shell: false, neck: 0.12, fan: "turkey" },
        peacock:   { br: 0.60, headR: 0.44, legLen: 0.46, squash: [0.96, 1.04, 1.00], tail: 0, comb: 0, shell: false, neck: 0.16, fan: "peacock" },
        owl:       { br: 0.68, headR: 0.62, legLen: 0.14, squash: [1.02, 1.04, 1.00], tail: 0, comb: 0, shell: false, neck: 0.00, owl: true },
        nightowl:  { br: 0.68, headR: 0.62, legLen: 0.14, squash: [1.02, 1.04, 1.00], tail: 0, comb: 0, shell: false, neck: 0.00, owl: true },
        swan:      { br: 0.62, headR: 0.30, legLen: 0.26, squash: [0.92, 0.84, 1.16], tail: 2, comb: 0, shell: false, neck: 1.15 },
        rainbird:  { br: 0.54, headR: 0.50, legLen: 0.22, squash: [1.00, 0.94, 1.06], tail: 2, comb: 0, shell: false, neck: 0.34 }
    };

    function mat(hex, opt) {
        opt = opt || {};
        var p = { color: hex, roughness: opt.rough === undefined ? 0.85 : opt.rough,
                  metalness: opt.metal || 0, flatShading: !!opt.flat };
        if (opt.emissive) p.emissive = new THREE.Color(opt.emissive);
        if (opt.alpha !== undefined) { p.transparent = true; p.opacity = opt.alpha; }
        return new THREE.MeshStandardMaterial(p);
    }

    function tinted(hex, tier) {
        var f = TIER_TINT[tier] || 1;
        if (f === 1) return hex;
        var c = new THREE.Color(hex);
        if (f < 1) {
            var g = (c.r + c.g + c.b) / 3;
            c.setRGB(c.r * f + g * (1 - f), c.g * f + g * (1 - f), c.b * f + g * (1 - f));
        } else {
            c.multiplyScalar(f);
        }
        return c.getHex();
    }

    function ball(r, hex, seg) {
        return new THREE.Mesh(new THREE.SphereGeometry(r, seg || 20, (seg || 20) - 4), mat(hex));
    }
    function at(m, x, y, z) { m.position.set(x, y, z); return m; }

    // ---- 눈 ----------------------------------------------------------
    // 감은 눈은 아래로 볼록한 곡선이라야 '자고 있다'로 읽힙니다.
    // 예전에는 도넛을 반만 써서 방향이 어긋나 그냥 선처럼 보였어요.
    // 쓰다듬을 때 눈을 지그시 감게 하려고, 만든 눈을 따로 기억해 둡니다
    function eyes(g, y, z, r, spread, asleep) {
        g.userData.eyeBalls = g.userData.eyeBalls || [];
        [-spread, spread].forEach(function (sx) {
            if (asleep) {
                var lid = new THREE.Mesh(
                    new THREE.TorusGeometry(r * 1.15, r * 0.3, 8, 16, Math.PI),
                    mat(0x4a3524));
                lid.position.set(sx, y + r * 0.15, z);
                lid.rotation.x = -0.25;      // 얼굴 곡면을 따라 살짝 눕힙니다
                lid.rotation.z = Math.PI;    // 아래로 볼록하게
                g.add(lid);
                // 감은 눈 밑에 옅은 홍조
                var bl = ball(r * 0.9, 0xff9a8f, 10);
                bl.scale.set(1.1, 0.5, 0.4);
                bl.position.set(sx * 1.5, y - r * 1.2, z * 0.96);
                bl.material.transparent = true; bl.material.opacity = 0.4;
                g.add(bl);
                return;
            }
            var e = ball(r, 0x2b2118, 14);
            e.position.set(sx, y, z);
            g.add(e);
            g.userData.eyeBalls.push(e);
            var hl = ball(r * 0.36, 0xffffff, 10);
            hl.position.set(sx + r * 0.32, y + r * 0.34, z + r * 0.5);
            g.add(hl);
            g.userData.eyeBalls.push(hl);
        });
    }

    function beak(g, y, z, s, hex) {
        var b = new THREE.Mesh(new THREE.ConeGeometry(s * 0.5, s, 4), mat(hex, { flat: true }));
        b.rotation.x = Math.PI / 2;
        b.position.set(0, y, z + s * 0.4);
        g.add(b);
    }

    function legs(g, y, spread, hex, len) {
        [-spread, spread].forEach(function (sx) {
            if (len > 0.09) {
                var l = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, len, 6), mat(hex));
                l.position.set(sx, y - len / 2, 0);
                g.add(l);
            }
            var f = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.05, 0.22), mat(hex));
            f.position.set(sx, Math.max(0.03, y - len), 0.05);
            g.add(f);
        });
    }

    function wings(g, y, z, rx, hex, spread) {
        [-1, 1].forEach(function (s) {
            var w = ball(rx, hex, 14);
            w.scale.set(0.45, 1, 0.75);
            w.position.set(s * spread, y, z);
            w.rotation.z = s * -0.25;
            g.add(w);
        });
    }

    // 꼬리깃 — 개수로 성장 단계가 드러납니다
    function tailFeathers(g, y, z, n, hex) {
        for (var i = 0; i < n; i++) {
            var a = (i / Math.max(1, n - 1) - 0.5) * 0.9;
            var len = 0.28 + Math.abs(0.5 - i / Math.max(1, n - 1)) * -0.1 + n * 0.05;
            var f = new THREE.Mesh(new THREE.ConeGeometry(0.09, len, 5), mat(hex, { flat: true }));
            f.position.set(Math.sin(a) * 0.2, y + len * 0.3, z - Math.cos(a) * 0.1);
            f.rotation.x = -1.9;
            f.rotation.z = a;
            g.add(f);
        }
    }

    function tailFan(g, y, z, colors, tier) {
        colors.forEach(function (hex, i) {
            var n = colors.length;
            var a = (i / (n - 1) - 0.5) * 1.5;
            var f = new THREE.Mesh(new THREE.CircleGeometry(0.5, 12, 0, Math.PI),
                                   new THREE.MeshStandardMaterial({
                                       color: tinted(hex, tier), roughness: 0.9,
                                       side: THREE.DoubleSide
                                   }));
            f.position.set(Math.sin(a) * 0.34, y + Math.cos(a) * 0.34, z);
            f.rotation.z = -a;
            f.scale.set(0.5, 1.5, 1);
            g.add(f);
        });
    }

    // ---- 악세서리 (3D) ------------------------------------------------
    // 머리 크기(hr)와 위치(hy, hz)에서 계산하므로 단계마다 알아서 맞습니다.
    function buildAccessory(kind, A) {
        var g = new THREE.Group();
        var hr = A.hr, hy = A.hy, hz = A.hz;
        var GOLD = { emissive: 0x4a3708, metal: 0.35, rough: 0.35 };

        if (kind === "🎀" || kind === "ribbon") {
            var s = hr * 0.55;
            [-1, 1].forEach(function (d) {
                var loop = ball(s * 0.5, 0xff6b9d, 12);
                loop.scale.set(1.15, 0.85, 0.55);
                loop.position.set(hr * 0.72 + d * s * 0.42, hy + hr * 0.6, hz);
                loop.rotation.z = d * 0.5;
                g.add(loop);
            });
            g.add(at(ball(s * 0.24, 0xe23f74, 10), hr * 0.72, hy + hr * 0.6, hz));

        } else if (kind === "🧣" || kind === "scarf") {
            // 목에 두르는 것이라 머리 아래에 겁니다
            var ring = new THREE.Mesh(new THREE.TorusGeometry(hr * 0.82, hr * 0.24, 8, 18),
                                      mat(0xe2584a));
            ring.rotation.x = Math.PI / 2;
            ring.position.set(0, hy - hr * 0.95, hz * 0.6);
            g.add(ring);
            var tailS = new THREE.Mesh(new THREE.BoxGeometry(hr * 0.42, hr * 1.1, hr * 0.18),
                                       mat(0xe2584a));
            tailS.position.set(hr * 0.5, hy - hr * 1.5, hz * 0.6 + hr * 0.4);
            tailS.rotation.z = 0.25;
            g.add(tailS);

        } else if (kind === "🎩" || kind === "hat") {
            var brim = new THREE.Mesh(new THREE.CylinderGeometry(hr * 1.05, hr * 1.05, hr * 0.1, 18),
                                      mat(0x33333d));
            brim.position.set(0, hy + hr * 0.85, hz * 0.4);
            g.add(brim);
            var top = new THREE.Mesh(new THREE.CylinderGeometry(hr * 0.66, hr * 0.7, hr * 1.1, 18),
                                     mat(0x2b2b34));
            top.position.set(0, hy + hr * 1.42, hz * 0.4);
            g.add(top);
            var band = new THREE.Mesh(new THREE.CylinderGeometry(hr * 0.72, hr * 0.72, hr * 0.22, 18),
                                      mat(0xc0392b));
            band.position.set(0, hy + hr * 0.98, hz * 0.4);
            g.add(band);

        } else if (kind === "🕶️" || kind === "glasses") {
            [-1, 1].forEach(function (d) {
                var lens = new THREE.Mesh(new THREE.CircleGeometry(hr * 0.3, 14),
                                          mat(0x1b1b22, { rough: 0.25, metal: 0.4 }));
                lens.position.set(d * hr * 0.42, hy + hr * 0.16, hz + hr * 0.85);
                g.add(lens);
            });
            var bridge = new THREE.Mesh(new THREE.BoxGeometry(hr * 0.3, hr * 0.07, hr * 0.07),
                                        mat(0x1b1b22));
            bridge.position.set(0, hy + hr * 0.16, hz + hr * 0.84);
            g.add(bridge);

        } else if (kind === "👑" || kind === "crown") {
            var band2 = new THREE.Mesh(new THREE.CylinderGeometry(hr * 0.72, hr * 0.72, hr * 0.28, 16, 1, true),
                                       mat(0xffd34d, GOLD));
            band2.position.set(0, hy + hr * 0.95, hz * 0.4);
            g.add(band2);
            for (var i = 0; i < 5; i++) {
                var a = Math.PI * 2 * i / 5;
                var sp = new THREE.Mesh(new THREE.ConeGeometry(hr * 0.16, hr * 0.42, 4),
                                        mat(0xffd34d, GOLD));
                sp.position.set(Math.cos(a) * hr * 0.66, hy + hr * 1.3, hz * 0.4 + Math.sin(a) * hr * 0.66);
                g.add(sp);
                g.add(at(ball(hr * 0.09, 0xff5f7a, 8),
                         Math.cos(a) * hr * 0.66, hy + hr * 1.52, hz * 0.4 + Math.sin(a) * hr * 0.66));
            }
        }
        return g;
    }

    // ---- 모습 만들기 --------------------------------------------------
    function buildForm(form, tier, asleep) {
        var g = new THREE.Group();
        var c = SKIN[form] || SKIN.chubby;
        var body = tinted(c.body, tier), dark = tinted(c.dark, tier);
        var i, a;

        if (form === "egg") {
            // 알만 덩그러니 둡니다.
            // 지푸라기(선처럼 보임)도, 금 간 자국(줄 하나로 보임)도 뺐어요.
            // 깨끗한 알 하나가 제일 알처럼 보입니다.
            var e = ball(0.66, body, 26);
            e.scale.set(1, 1.32, 1);
            e.position.y = 0.9;
            g.add(e);
            // 밑에 살짝 깔린 둥근 받침 (공중에 뜬 것처럼 보이지 않게)
            var pad = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.66, 0.1, 22), mat(0xdcc79a));
            pad.position.y = 0.05;
            g.add(pad);
            g.userData.anchor = { hr: 0.4, hy: 1.5, hz: 0.3, top: 1.58 };
            return g;
        }

        var S = SHAPE[form] || SHAPE.adult;
        var br = S.br;
        var hr = br * S.headR;
        var bodyY = S.legLen + br * (S.squash[1]) * 0.9;

        var b = ball(br, body, 22);
        b.scale.set(S.squash[0], S.squash[1], S.squash[2]);
        b.position.y = bodyY;
        g.add(b);

        var belly = ball(br * 0.72, 0xffffff, 16);
        belly.scale.set(0.9, 0.8, 0.6);
        belly.position.set(0, bodyY - br * 0.22, br * 0.6);
        belly.material.transparent = true;
        belly.material.opacity = 0.32;
        g.add(belly);

        wings(g, bodyY + 0.02, 0, br * (form === "hatchling" ? 0.5 : 0.62), dark, br * 0.94);
        legs(g, S.legLen + 0.02, br * 0.42, tinted(c.leg, tier), S.legLen);

        // 목 — 백조는 길고, 갓 깬 아이는 없습니다
        if (S.neck > 0.2) {
            var segs = Math.round(S.neck * 7) + 2;
            for (i = 0; i < segs; i++) {
                var t = i / (segs - 1);
                var seg = ball(hr * (0.5 - t * 0.1), body, 12);
                seg.position.set(0, bodyY + br * 0.5 + t * S.neck, -0.02 + t * S.neck * 0.24);
                g.add(seg);
            }
        }

        var hy = bodyY + br * (S.squash[1]) * 0.72 + hr * 0.72 + S.neck;
        var hz = S.neck > 0.2 ? S.neck * 0.26 : 0.05;

        var head = ball(hr, body, 20);
        head.position.set(0, hy, hz);
        g.add(head);

        eyes(g, hy + hr * 0.14, hz + hr * 0.8, hr * 0.19, hr * 0.44, asleep);
        beak(g, hy - hr * 0.08, hz + hr * 0.74, hr * 0.52, tinted(c.beak, tier));

        // 갓 깬 아이는 머리에 알 껍데기를 얹고 있습니다
        if (S.shell) {
            var cap = new THREE.Mesh(new THREE.SphereGeometry(hr * 0.92, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.45),
                                     mat(0xfff3dc));
            cap.position.set(0.02, hy + hr * 0.5, hz - 0.02);
            cap.rotation.z = 0.28;
            g.add(cap);
        }

        // 볏 — 0 없음, 1 작게 한 덩이, 2 큼직하게 세 덩이 + 턱볏
        if (S.comb >= 1) {
            var combC = tinted(c.comb || 0xef5350, tier);
            if (S.comb === 1) {
                g.add(at(ball(hr * 0.24, combC, 12), 0, hy + hr * 0.98, hz - 0.02));
            } else {
                [-0.26, 0, 0.26].forEach(function (dx, k) {
                    var cb = ball(hr * (k === 1 ? 0.3 : 0.24), combC, 12);
                    cb.position.set(dx * hr, hy + hr * 1.0, hz - 0.02);
                    g.add(cb);
                });
                var wat = ball(hr * 0.2, combC, 12);
                wat.scale.set(0.7, 1.35, 0.7);
                wat.position.set(0, hy - hr * 0.78, hz + hr * 0.52);
                g.add(wat);
            }
        }

        if (S.tail > 0) tailFeathers(g, bodyY + br * 0.2, -br * 0.95, S.tail, dark);

        if (S.fan === "turkey") {
            tailFan(g, bodyY + 0.5, -br * 0.95,
                    [0xe0b585, 0xcf9760, 0xbd7c42, 0xa3612f, 0xbd7c42, 0xcf9760, 0xe0b585], tier);
        }
        if (S.fan === "peacock") {
            tailFan(g, bodyY + 0.55, -br * 0.95,
                    [0x4fc3d9, 0x3fb4c9, 0x2f9e8f, 0x2c7fb8, 0x2f9e8f, 0x3fb4c9, 0x4fc3d9], tier);
            [-0.1, 0, 0.1].forEach(function (dx) {
                var st2 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 5), mat(dark));
                st2.position.set(dx, hy + hr + 0.14, hz);
                g.add(st2);
                g.add(at(ball(0.05, tinted(0x3fb4c9, tier), 10), dx, hy + hr + 0.3, hz));
            });
        }
        if (S.owl) {
            [-1, 1].forEach(function (s3) {
                var ear = new THREE.Mesh(new THREE.ConeGeometry(hr * 0.3, hr * 0.7, 4), mat(dark, { flat: true }));
                ear.position.set(s3 * hr * 0.6, hy + hr * 0.95, hz - 0.04);
                ear.rotation.z = s3 * -0.3;
                g.add(ear);
            });
            [-1, 1].forEach(function (s4) {
                var disc = new THREE.Mesh(new THREE.CircleGeometry(hr * 0.46, 16),
                                          mat(form === "nightowl" ? 0x2b2b45 : 0xfdf6ea));
                disc.position.set(s4 * hr * 0.42, hy + hr * 0.14, hz + hr * 0.78);
                g.add(disc);
            });
        }
        if (form === "nightowl") {
            for (i = 0; i < 3; i++) {
                var star = ball(0.05, 0xffe08a, 8);
                star.position.set((i - 1) * 0.2, bodyY + 0.05 - i * 0.12, br * 0.92);
                g.add(star);
            }
        }
        if (form === "rainbird") {
            var sheen = ball(hr * 0.7, 0x7fd4c1, 14);
            sheen.scale.set(1, 0.6, 0.7);
            sheen.position.set(0, hy - hr * 0.85, hz + 0.06);
            sheen.material.transparent = true;
            sheen.material.opacity = 0.55;
            g.add(sheen);
        }
        if (form === "swan") {
            var tip = ball(br * 0.5, 0xffffff, 14);
            tip.scale.set(0.5, 0.7, 1.1);
            tip.position.set(0, bodyY + 0.1, -br * 0.88);
            g.add(tip);
        }

        // 악세서리가 올라탈 자리
        g.userData.anchor = { hr: hr, hy: hy, hz: hz, top: hy + hr * 1.2 };
        return g;
    }

    // 등급 관 — '찬란한' 에게만. 악세서리 왕관과 겹치지 않게 조금 위로.
    function tierCrown(g, tier, topY) {
        if (tier !== "radiant") return;
        var halo = new THREE.Mesh(new THREE.RingGeometry(0.66, 1.0, 28),
                                  new THREE.MeshBasicMaterial({
                                      color: 0xffd86b, transparent: true,
                                      opacity: 0.22, side: THREE.DoubleSide
                                  }));
        halo.position.y = topY * 0.55;
        g.add(halo);
        for (var i = 0; i < 6; i++) {
            var a = Math.PI * 2 * i / 6;
            var sp = ball(0.055, 0xfff3b0, 8);
            sp.position.set(Math.cos(a) * 1.15, topY * 0.6 + Math.sin(a) * 0.5, Math.sin(a) * 0.4);
            sp.material.emissive = new THREE.Color(0x6a5312);
            g.add(sp);
        }
    }

    // 자고 있을 때 머리 위로 떠오르는 Z
    function buildZzz(topY) {
        var g = new THREE.Group();
        for (var i = 0; i < 3; i++) {
            var bar1 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.032, 0.032), mat(0x7f9fd0));
            var bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.032, 0.032), mat(0x7f9fd0));
            var diag = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.032, 0.032), mat(0x7f9fd0));
            var z = new THREE.Group();
            bar1.position.y = 0.07; bar2.position.y = -0.07;
            diag.rotation.z = 0.72;
            z.add(bar1); z.add(bar2); z.add(diag);
            var s = 1 - i * 0.22;
            z.scale.set(s, s, s);
            z.position.set(0.34 + i * 0.24, topY + 0.22 + i * 0.3, 0);
            z.userData.i = i;
            g.add(z);
        }
        return g;
    }

    // 쓰다듬을 때 피어오르는 작은 하트.
    // 미리 몇 개 만들어 두고 돌려 씁니다 (매번 만들면 끊겨요).
    function makeHearts() {
        var pool = [];
        for (var i = 0; i < 12; i++) {
            var h = new THREE.Group();
            // 하트 = 공 둘 + 아래로 뾰족한 원뿔
            [-1, 1].forEach(function (s) {
                var lobe = ball(0.09, 0xff7aa2, 10);
                lobe.position.set(s * 0.07, 0.06, 0);
                h.add(lobe);
            });
            var tip = new THREE.Mesh(new THREE.ConeGeometry(0.125, 0.2, 8), mat(0xff7aa2));
            tip.rotation.z = Math.PI;
            tip.position.y = -0.07;
            h.add(tip);
            h.visible = false;
            h.userData.born = -9;
            pool.push(h);
        }
        return pool;
    }

    function spawnHearts(n) {
        if (!hearts.length) return;
        var now = (performance.now() - t0) / 1000;
        var made = 0;
        for (var i = 0; i < hearts.length && made < n; i++) {
            var h = hearts[i];
            if (h.visible) continue;
            h.visible = true;
            h.userData.born = now;
            h.userData.dx = (Math.random() - 0.5) * 0.8;
            h.userData.dz = (Math.random() - 0.5) * 0.5;
            h.position.set(pet.u * 1.1 + h.userData.dx, 1.1 + Math.random() * 0.4, 0.6 + h.userData.dz);
            made++;
        }
    }

    function makeStage() {
        var g = new THREE.Group();
        var grass = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.16, 28), mat(0x8fce7a));
        grass.position.y = -0.08;
        grass.receiveShadow = true;
        g.add(grass);
        var rim = new THREE.Mesh(new THREE.CylinderGeometry(2.42, 2.5, 0.14, 28), mat(0xb08a5a));
        rim.position.y = -0.2;
        g.add(rim);
        for (var i = 0; i < 16; i++) {
            var a = Math.PI * 2 * i / 16 + 0.2;
            var r = 1.5 + Math.random() * 0.7;
            var t = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.28, 5), mat(0x6fbf5a, { flat: true }));
            t.position.set(Math.cos(a) * r, 0.12, Math.sin(a) * r);
            g.add(t);
        }
        return g;
    }

    function boot() {
        if (ready) return true;
        if (failed) return false;
        if (typeof THREE === "undefined") { failed = true; return false; }
        elWrap = document.getElementById("chick-stage-wrap");
        if (!elWrap) { failed = true; return false; }

        try {
            elCanvas = document.createElement("canvas");
            elCanvas.id = "chick3d-canvas";
            var gl = elCanvas.getContext("webgl") || elCanvas.getContext("experimental-webgl");
            if (!gl) { failed = true; return false; }

            renderer = new THREE.WebGLRenderer({ canvas: elCanvas, antialias: true, alpha: true });
            renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;

            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(38, 1.4, 0.1, 40);
            camera.position.set(0, 1.9, 4.6);
            camera.lookAt(0, 1.0, 0);

            scene.add(new THREE.HemisphereLight(0xfff6e2, 0x88a86a, 1.0));
            var sun = new THREE.DirectionalLight(0xfff2d8, 1.15);
            sun.position.set(2.6, 4.2, 3.0);
            sun.castShadow = true;
            sun.shadow.mapSize.set(512, 512);
            sun.shadow.camera.near = 0.5;
            sun.shadow.camera.far = 14;
            scene.add(sun);
            var fill = new THREE.DirectionalLight(0xcfe4ff, 0.35);
            fill.position.set(-3, 2, -2);
            scene.add(fill);

            scene.add(makeStage());
            root = new THREE.Group();
            scene.add(root);

            // 쓰다듬기용 — 손가락이 병아리를 짚었는지 보는 광선, 그리고 하트
            raycaster = new THREE.Raycaster();
            hearts = makeHearts();
            hearts.forEach(function (h) { scene.add(h); });

            elWrap.insertBefore(elCanvas, elWrap.firstChild);
            elWrap.classList.add("has3d");
            bindDrag();
            resize();
            window.addEventListener("resize", resize);
            ready = true;
            return true;
        } catch (e) {
            failed = true;
            return false;
        }
    }

    function resize() {
        if (!ready || !elWrap) return;
        var w = elWrap.clientWidth || 320;
        var h = elWrap.clientHeight || 208;
        renderer.setSize(w, h, false);
        camera.aspect = w / Math.max(1, h);
        camera.updateProjectionMatrix();
    }

    // 드래그로 돌려보기.
    // 캔버스에 걸면 그 위를 덮고 있는 #chick(탭 판정용)이 가로채므로,
    // 무대 전체(elWrap)에서 받습니다.
    // 손가락이 병아리 위에 있으면 '쓰다듬기', 빈 곳이면 '돌려보기'.
    //
    // 버튼 한 번에 애니메이션 한 번이면 쓰다듬는 느낌이 안 납니다.
    // 실제로 손으로 쓸어야 하고, 쓸어준 만큼 반응해야 해요.
    // 그래서 손가락이 지나간 거리를 재서 일정 길이마다 한 번씩
    // 게임 쪽 petPet() 을 부릅니다.
    var STROKE_STEP = 70;      // 이만큼 쓸어야 한 번 쓰다듬은 걸로 칩니다

    // 화면에서 병아리가 차지하는 자리는 손가락보다 작습니다.
    // 그래서 정확히 맞았는지만 보면 자꾸 빗나가요.
    // 몸에 닿았거나, 몸 둘레 PET_PAD 픽셀 안이면 쓰다듬기로 봅니다.
    var PET_PAD = 26;

    function rayHits(px, py, r) {
        var nx = (px / r.width) * 2 - 1;
        var ny = -(py / r.height) * 2 + 1;
        raycaster.setFromCamera({ x: nx, y: ny }, camera);
        return raycaster.intersectObject(root, true).length > 0;
    }

    function pointerOnChick(clientX, clientY) {
        if (!root || !root.children.length || !raycaster) return false;
        var r = elCanvas.getBoundingClientRect();
        if (!r.width || !r.height) return false;
        var px = clientX - r.left, py = clientY - r.top;
        if (rayHits(px, py, r)) return true;

        // 살짝 빗나갔을 때를 위해, 누른 자리 둘레를 한 바퀴 더 봅니다.
        // 손가락 굵기만큼 봐주는 셈이에요.
        for (var i = 0; i < 8; i++) {
            var a = Math.PI * 2 * i / 8;
            if (rayHits(px + Math.cos(a) * PET_PAD, py + Math.sin(a) * PET_PAD, r)) return true;
        }
        return false;
    }

    function bindDrag() {
        var down = false, lastX = 0, lastY = 0, moved = 0;

        function start(x, y) {
            down = true; lastX = x; lastY = y; moved = 0;
            // 병아리를 짚었으면 쓰다듬기, 아니면 돌려보기
            pet.on = pointerOnChick(x, y);
            pet.stroke = 0;
            pet.ok = true;          // 새로 손을 대면 다시 받아줍니다
        }

        function move(x, y) {
            if (!down) return;
            var dx = x - lastX, dy = y - lastY;
            var d = Math.sqrt(dx * dx + dy * dy);
            moved += d;

            if (pet.on) {
                // 화면 좌표를 -1~1 로 바꿔서 어느 쪽을 만지는지 기억합니다
                var r = elCanvas.getBoundingClientRect();
                pet.u = ((x - r.left) / r.width) * 2 - 1;
                pet.v = -((y - r.top) / r.height) * 2 + 1;
                pet.stroke += d;
                pet.lastMoveAt = (performance.now() - t0) / 1000;
                // 충분히 쓸었으면 한 번 쓰다듬은 것으로 칩니다.
                // 게임 쪽이 거절하면(자는 중·기운 없음) 하트도 안 띄웁니다.
                while (pet.stroke >= STROKE_STEP) {
                    pet.stroke -= STROKE_STEP;
                    var took = true;
                    if (typeof window.onChickPet === "function") took = window.onChickPet() !== false;
                    pet.ok = took;
                    if (took) spawnHearts(2);
                }
            } else {
                spin.base += dx * 0.014;
                spin.touched = true;
            }
            lastX = x; lastY = y;
        }

        function end() { down = false; pet.on = false; }

        elWrap.addEventListener("mousedown", function (e) { start(e.clientX, e.clientY); });
        window.addEventListener("mousemove", function (e) { move(e.clientX, e.clientY); });
        window.addEventListener("mouseup", end);
        elWrap.addEventListener("touchstart", function (e) {
            start(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: true });
        elWrap.addEventListener("touchmove", function (e) {
            move(e.touches[0].clientX, e.touches[0].clientY);
            // 쓰다듬거나 돌리는 중엔 화면이 같이 밀리지 않게
            if ((pet.on || moved > 10) && e.cancelable) e.preventDefault();
        }, { passive: false });
        elWrap.addEventListener("touchend", end);
        elWrap.addEventListener("touchcancel", end);
    }

    function disposeGroup(g) {
        g.traverse(function (o) {
            if (o.geometry) o.geometry.dispose();
            if (o.material) {
                if (Array.isArray(o.material)) o.material.forEach(function (m) { m.dispose(); });
                else o.material.dispose();
            }
        });
    }

    function setForm(form, opt) {
        if (!boot()) return false;
        opt = opt || {};
        var key = form + "|" + (opt.tier || "") + "|" + (opt.asleep ? 1 : 0) + "|" + (opt.accessory || "");
        if (key === curKey) return true;
        curKey = key;

        while (root.children.length) {
            var old = root.children[0];
            root.remove(old);
            disposeGroup(old);
        }
        zzz = null;

        var g = buildForm(form, opt.tier, !!opt.asleep);
        var A = g.userData.anchor;

        // 악세서리를 같은 그룹에 넣습니다 — 그래야 움직일 때 같이 따라옵니다
        if (opt.accessory) g.add(buildAccessory(opt.accessory, A));
        tierCrown(g, opt.tier, A.top);

        if (opt.asleep) {
            zzz = buildZzz(A.top);
            g.add(zzz);
        }

        g.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        root.add(g);
        return true;
    }

    function play(name, ms) {
        anim.name = name;
        anim.dur = ms || 600;
        anim.until = performance.now() + anim.dur;
    }

    function loop() {
        raf = requestAnimationFrame(loop);
        tick(performance.now());
    }

    function tick(now) {
        if (!ready || !visible) return;
        var t = (now - t0) / 1000;

        var sleeping = curKey.split("|")[2] === "1";
        var amp = sleeping ? 0.02 : 0.05;
        var sp = sleeping ? 1.1 : 2.2;
        root.position.y = Math.sin(t * sp) * amp;
        // 손으로 돌린 적이 있으면 그 각도를 지키고, 아니면 스스로 살랑거립니다
        root.rotation.y = spin.base + (spin.touched ? 0 : Math.sin(t * 0.5) * 0.12);
        root.rotation.x = 0;
        root.rotation.z = 0;

        // -----------------------------------------------------------
        // 쓰다듬기 반응
        //
        // 손을 대고 있으면 기분이 서서히 차오르고, 떼면 서서히 식습니다.
        // 손을 대고만 있고 안 움직이면 반응이 줄어요 — 실제로 쓸어야
        // 좋아하는 느낌이 나게.
        // -----------------------------------------------------------
        var stroking = pet.on && pet.ok && (t - pet.lastMoveAt) < 0.35;
        var target = stroking ? 1 : 0;
        // 좋아지는 건 천천히, 식는 건 더 천천히
        pet.warmth += (target - pet.warmth) * (stroking ? 0.10 : 0.035);
        if (pet.warmth < 0.002) pet.warmth = 0;

        if (pet.warmth > 0) {
            var w = pet.warmth;
            // 병아리는 화면 폭의 3분의 1쯤만 차지하니, 그 폭 기준으로 다시 재야
            // 몸 끝을 만졌을 때 제대로 기울어 보입니다
            var lu = Math.max(-1, Math.min(1, pet.u * 3.2));
            var lv = Math.max(-1, Math.min(1, pet.v * 2.4));
            // 손이 있는 쪽으로 몸을 기울입니다 (손을 따라오는 느낌)
            root.rotation.z += -lu * 0.20 * w;
            root.rotation.x += lv * 0.14 * w;
            root.rotation.y += -lu * 0.22 * w;
            // 기분 좋을 때 몸을 살짝 부비는 잔떨림
            root.position.y += Math.sin(t * 9) * 0.012 * w;
            root.rotation.z += Math.sin(t * 7.5) * 0.03 * w;

            // 눈을 지그시 감습니다 (실눈)
            var body = root.children[0];
            var eb = body && body.userData.eyeBalls;
            if (eb) for (var ei = 0; ei < eb.length; ei++) eb[ei].scale.y = 1 - 0.75 * w;
        } else {
            var body0 = root.children[0];
            var eb0 = body0 && body0.userData.eyeBalls;
            if (eb0) for (var ej = 0; ej < eb0.length; ej++) {
                if (eb0[ej].scale.y !== 1) eb0[ej].scale.y = 1;
            }
        }

        // 하트가 떠올랐다 사라집니다
        for (var hi = 0; hi < hearts.length; hi++) {
            var h = hearts[hi];
            if (!h.visible) continue;
            var age = t - h.userData.born;
            if (age > 1.4) { h.visible = false; continue; }
            var k3 = age / 1.4;
            h.position.y += 0.010;
            h.position.x += Math.sin(t * 3 + hi) * 0.004;
            var s = k3 < 0.18 ? (k3 / 0.18) : 1;
            h.scale.setScalar(s * (1 - k3 * 0.35));
            h.children.forEach(function (part) {
                part.material.transparent = true;
                part.material.opacity = 1 - k3 * k3;
            });
        }

        if (zzz) {
            zzz.children.forEach(function (z) {
                var k = (t * 0.6 + z.userData.i * 0.33) % 1;
                z.position.y = z.userData.baseY === undefined
                    ? (z.userData.baseY = z.position.y) : z.userData.baseY;
                z.position.y += k * 0.35;
                z.material = z.material;
                z.children.forEach(function (bar) {
                    bar.material.transparent = true;
                    bar.material.opacity = 1 - k;
                });
            });
        }

        if (anim.until > now) {
            var k2 = 1 - (anim.until - now) / anim.dur;
            if (anim.name === "eat") {
                root.rotation.x = Math.sin(k2 * Math.PI * 3) * 0.28;
            } else if (anim.name === "pet") {
                root.position.y += Math.sin(k2 * Math.PI) * 0.12;
                root.rotation.z = Math.sin(k2 * Math.PI * 2) * 0.1;
            } else if (anim.name === "hop") {
                root.position.y += Math.abs(Math.sin(k2 * Math.PI * 2)) * 0.3;
            }
        }

        renderer.render(scene, camera);
    }

    function show() {
        if (!boot()) return false;
        visible = true;
        resize();
        if (!raf) loop();
        return true;
    }

    function hide() { visible = false; }

    // =================================================================
    // 스냅샷 — 도감·산책처럼 작은 그림이 여러 개 필요한 곳에 씁니다
    //
    // 도감은 18칸, 산책은 계속 다시 그려집니다. 그걸 전부 WebGL 캔버스로
    // 두면 컨텍스트가 수십 개 생겨서 폰이 못 버텨요. 그래서 여기서
    // '한 번만' 3D 로 그린 뒤 PNG 로 구워서 <img> 로 넘깁니다.
    // 같은 모습은 다시 굽지 않고 캐시에서 꺼내 씁니다.
    // =================================================================
    var snapRenderer = null, snapScene = null, snapCam = null, snapRoot = null;
    var snapCache = {};

    function snapBoot(px) {
        if (typeof THREE === "undefined") return false;
        if (snapRenderer) {
            snapRenderer.setSize(px, px, false);
            return true;
        }
        try {
            var cv = document.createElement("canvas");
            var gl = cv.getContext("webgl") || cv.getContext("experimental-webgl");
            if (!gl) return false;
            snapRenderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
            snapRenderer.setPixelRatio(1);
            snapRenderer.setSize(px, px, false);

            snapScene = new THREE.Scene();
            snapCam = new THREE.PerspectiveCamera(34, 1, 0.1, 40);

            snapScene.add(new THREE.HemisphereLight(0xfff6e2, 0x88a86a, 1.05));
            var s1 = new THREE.DirectionalLight(0xfff2d8, 1.2);
            s1.position.set(2.4, 4.0, 3.2);
            snapScene.add(s1);
            var s2 = new THREE.DirectionalLight(0xcfe4ff, 0.4);
            s2.position.set(-3, 2, -2);
            snapScene.add(s2);

            snapRoot = new THREE.Group();
            snapScene.add(snapRoot);
            return true;
        } catch (e) {
            snapRenderer = null;
            return false;
        }
    }

    // form/tier/accessory 조합 하나를 PNG 데이터 URL 로 돌려줍니다.
    // 실패하면 null 을 주고, 부르는 쪽은 원래 쓰던 SVG 로 돌아갑니다.
    function snapshot(form, opt, px) {
        opt = opt || {};
        px = px || 128;
        var key = form + "|" + (opt.tier || "") + "|" + (opt.asleep ? 1 : 0) +
                  "|" + (opt.accessory || "") + "|" + px;
        if (snapCache[key]) return snapCache[key];
        if (failed || !snapBoot(px)) return null;

        try {
            while (snapRoot.children.length) {
                var old = snapRoot.children[0];
                snapRoot.remove(old);
                disposeGroup(old);
            }
            var g = buildForm(form, opt.tier, !!opt.asleep);
            var A = g.userData.anchor;
            if (opt.accessory) g.add(buildAccessory(opt.accessory, A));
            tierCrown(g, opt.tier, A.top);
            snapRoot.add(g);

            // 모델 크기에 맞춰 카메라를 물려서 항상 꽉 차게 잡습니다
            var box = new THREE.Box3().setFromObject(g);
            var size = box.getSize(new THREE.Vector3());
            var mid = box.getCenter(new THREE.Vector3());
            var reach = Math.max(size.x, size.y) * 1.25;
            var dist = reach / (2 * Math.tan(snapCam.fov * Math.PI / 360));
            snapCam.position.set(dist * 0.34, mid.y + size.y * 0.12, dist);
            snapCam.lookAt(mid.x, mid.y, mid.z);
            snapCam.updateProjectionMatrix();

            snapRenderer.render(snapScene, snapCam);
            var url = snapRenderer.domElement.toDataURL("image/png");
            snapCache[key] = url;
            return url;
        } catch (e) {
            return null;
        }
    }

    // <img> 태그 문자열로 바로 받고 싶을 때 (도감·산책에서 씁니다)
    function snapshotImg(form, opt, px, cls) {
        var url = snapshot(form, opt, px);
        if (!url) return null;
        return '<img class="' + (cls || "chick-snap") + '" src="' + url +
               '" width="' + px + '" height="' + px + '" alt="">';
    }

    window.chick3d = {
        available: function () { return !failed && (ready || typeof THREE !== "undefined"); },
        show: show,
        hide: hide,
        setForm: setForm,
        play: play,
        resize: resize,
        snapshot: snapshot,
        snapshotImg: snapshotImg
    };
})();

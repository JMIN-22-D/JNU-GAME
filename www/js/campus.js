/* =====================================================================
   캠퍼스 산책 — 제주대 캠퍼스를 실제로 돌아다니는 모드
   ---------------------------------------------------------------------
   산책 탭에서 '캠퍼스'를 고르면 가로 전체화면으로 열립니다.
   모드가 둘이고, 화면 오른쪽 위 버튼으로 오갈 수 있습니다.

     로드뷰  실제 거리 사진 속을 1인칭으로 걸어다닙니다 (기본)
     지도    위에서 내려다보는 지도 위를 걸어다닙니다 (로드뷰가 안 될 때)

   ■ 로드뷰에는 카카오 지도 API 키가 필요합니다  ★ 중요
     아래 CAMPUS.kakaoAppKey 가 비어 있으면 로드뷰는 아예 시도하지 않고
     지도 모드로 바로 넘어갑니다. 키를 받는 방법은 문서에 적어뒀습니다.
     (docs/ROADMAP.md 의 '캠퍼스 로드뷰' 항목)

   ■ 왜 구글 스트리트뷰가 아닌가
     한국은 지도 데이터 반출 규제 때문에 구글 스트리트뷰 커버리지가
     성깁니다. 대학 캠퍼스 안쪽은 특히 비어 있는 곳이 많습니다.
     카카오 로드뷰가 국내 커버리지가 가장 넓고, 무료이며, 결제 수단
     등록도 필요 없습니다.

   ■ 지도 모드가 라이브러리를 안 쓰는 이유
     이 프로젝트는 번들러가 없고 단일 파일로도 빌드됩니다. Leaflet 을
     넣으면 그게 깨져서, OSM 타일을 직접 배치합니다.
   ===================================================================== */
(function () {
    "use strict";

    var CAMPUS = {
        // ★ 카카오 JavaScript 키. 비워두면 지도 모드만 동작합니다.
        //   developers.kakao.com > 내 애플리케이션 > 앱 키 > JavaScript 키
        //   그리고 [플랫폼 > Web] 에 이 앱을 띄우는 도메인을 등록해야 합니다.
        kakaoAppKey: "51eb3250539dbe782f2b2c53f6977aec",

        // 제주대학교 아라캠퍼스 대략 중심.
        // 화면에 현재 좌표가 계속 표시되니, 원하는 자리까지 걸어가서
        // 그 값을 여기 옮겨 적으면 시작 위치가 바뀝니다.
        center: { lat: 33.4566, lon: 126.5619 },

        // --- 로드뷰 ---
        // 속도는 전부 "초당" 값입니다. 프레임당으로 두면 기기 성능에 따라
        // 회전 속도가 제각각이 됩니다.
        stepMeters: 12,      // 한 번 전진할 때 나아가는 거리
        snapRadius: 45,      // 그 지점 주변 몇 m 안에서 사진을 찾을지
        turnSpeed: 130,      // 초당 회전 각도
        moveCooldown: 260,   // 연속 전진 간격 (ms)
        fadeMs: 170,         // 사진이 바뀔 때 밀고 들어가는 연출 길이

        // --- 지도 ---
        zoom: 17,
        span: { lat: 0.0070, lon: 0.0084 },   // 돌아다닐 범위 (약 ±780m)
        tileUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution: "© OpenStreetMap 기여자",
        speed: 95,           // 초당 픽셀 (줌 17 에서 1px ≈ 1m)
        sprint: 155
    };

    var TILE = 256;
    var EARTH = 6378137;

    // ---- 공통 계산 ----------------------------------------------------
    function toRad(d) { return d * Math.PI / 180; }
    function toDeg(r) { return r * 180 / Math.PI; }

    // 어떤 방위로 몇 m 떨어진 지점
    function offsetLatLng(lat, lng, bearingDeg, meters) {
        var br = toRad(bearingDeg);
        return {
            lat: lat + toDeg((meters * Math.cos(br)) / EARTH),
            lng: lng + toDeg((meters * Math.sin(br)) / (EARTH * Math.cos(toRad(lat))))
        };
    }

    // 두 지점 사이 거리 (m)
    function distanceM(a, b) {
        var dLat = toRad(b.lat - a.lat);
        var dLng = toRad(b.lng - a.lng);
        var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return 2 * EARTH * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
    }

    // 웹 메르카토르 (지도 모드용)
    function lonToX(lon, z) { return (lon + 180) / 360 * Math.pow(2, z) * TILE; }
    function latToY(lat, z) {
        var r = toRad(lat);
        return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * Math.pow(2, z) * TILE;
    }
    function xToLon(x, z) { return x / (Math.pow(2, z) * TILE) * 360 - 180; }
    function yToLat(y, z) {
        var n = Math.PI - 2 * Math.PI * y / (Math.pow(2, z) * TILE);
        return toDeg(Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))));
    }

    // ---- 상태 ----------------------------------------------------------
    var open = false;
    var mode = "roadview";        // "roadview" | "map"
    var raf = null;
    var keys = {};
    var walkedM = 0;              // 이번에 걸은 거리

    // 로드뷰
    var rv = null, rvClient = null;
    var rvReady = false;
    var rvPos = null;             // { lat, lng }
    var curPanoId = null;         // 지금 서 있는 사진. 제자리 재설정을 걸러내는 데 씁니다
    var rvInitTimer = null;       // 초기화가 영영 안 끝나는 경우를 대비한 타임아웃
    var lastMoveAt = 0;
    var kakaoTried = false;

    // 지도
    var camX = 0, camY = 0, minX, maxX, minY, maxY;
    var tiles = {}, facing = 1, tileFailures = 0, warnedOffline = false;

    var elRoot, elRvBox, elLayer, elChar, elCoord, elDist, elWarn, elModeBtn, elHint;

    // =================================================================
    // 진입 / 종료
    // =================================================================
    function openCampus() {
        if (open) return;
        build();
        open = true;
        walkedM = 0;
        keys = {};
        lastT = 0;        // 이전 세션의 타임스탬프가 남아 첫 프레임이 튀지 않도록

        elRoot.classList.add("show");
        lockLandscape();
        // 병아리는 로드뷰가 뜨든 안 뜨든 항상 먼저 그려둡니다.
        // 로드뷰 init 콜백에서만 그리면, 로드뷰가 안 열리는 환경에서
        // 캐릭터 자리가 계속 비어 있게 돼요.
        drawCharacter();
        lastSayAt = 0;
        setTimeout(function () { if (open) chickSay("같이 걸어요! 🐥"); }, 700);

        if (CAMPUS.kakaoAppKey) {
            startRoadview();
        } else {
            note("로드뷰를 보려면 카카오 지도 API 키가 필요해요.\n지금은 지도 모드로 보여드릴게요.");
            startMap();
        }
        loop();

        window.addEventListener("keydown", onKey, { passive: false });
        window.addEventListener("keyup", onKey);
        window.addEventListener("resize", onResize);
    }

    function closeCampus() {
        if (!open) return;
        open = false;
        if (raf) { cancelAnimationFrame(raf); raf = null; }
        clearTimeout(rvInitTimer);
        clearTimeout(prefetchTimer);
        window.removeEventListener("keydown", onKey);
        window.removeEventListener("keyup", onKey);
        window.removeEventListener("resize", onResize);
        keys = {};
        ahead = null;
        // 전환 연출 도중에 닫으면 클래스가 남아 다음에 열 때 화면이 확대된
        // 채로 시작합니다
        elRoot.classList.remove("show", "stepping", "stepping-back");
        elRvBox.style.transition = "";
        unlockOrientation();
        rewardWalk(walkedM);
    }

    function onResize() { if (mode === "map") renderMap(); }

    // =================================================================
    // 로드뷰
    // =================================================================
    function loadKakaoSdk(cb) {
        if (window.kakao && window.kakao.maps && window.kakao.maps.Roadview) { cb(true); return; }
        if (kakaoTried) { cb(false); return; }
        kakaoTried = true;

        var s = document.createElement("script");
        // autoload=false 로 받아서 kakao.maps.load() 로 직접 초기화합니다
        s.src = "https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&appkey=" +
                encodeURIComponent(CAMPUS.kakaoAppKey);
        s.onload = function () {
            try { window.kakao.maps.load(function () { cb(true); }); }
            catch (e) { cb(false); }
        };
        s.onerror = function () { cb(false); };
        document.head.appendChild(s);
    }

    function startRoadview() {
        mode = "roadview";
        elRoot.classList.add("rv");
        note("로드뷰를 불러오는 중…");

        loadKakaoSdk(function (ok) {
            if (!ok || !open) {
                note("로드뷰를 불러오지 못했어요.\nAPI 키와 인터넷 연결을 확인해주세요.\n지도 모드로 넘어갈게요.");
                setTimeout(function () { if (open) startMap(); }, 1800);
                return;
            }
            try {
                rv = new kakao.maps.Roadview(elRvBox);
                rvClient = new kakao.maps.RoadviewClient();

                // 좌표 조회나 사진 로딩이 응답하지 않으면 init 이 영영 오지 않습니다.
                // 그대로 두면 "불러오는 중…"에서 멈춰버려서, 일정 시간이 지나면
                // 지도 모드로 내려보냅니다.
                clearTimeout(rvInitTimer);
                rvInitTimer = setTimeout(function () {
                    if (!open || rvReady) return;
                    note("로드뷰 응답이 없어요.\n지도 모드로 보여드릴게요.");
                    setTimeout(function () { if (open && !rvReady) startMap(); }, 1600);
                }, 9000);

                kakao.maps.event.addListener(rv, "init", function () {
                    rvReady = true;
                    clearTimeout(rvInitTimer);
                    clearNote();
                    syncRvPos();
                    faceOpenDirection();
                    // 로드뷰는 캐릭터를 더 크게 그리므로 여기서 한 번 다시 그립니다
                    drawCharacter();
                });
                kakao.maps.event.addListener(rv, "position_changed", syncRvPos);

                jumpTo(CAMPUS.center.lat, CAMPUS.center.lon, true);
            } catch (e) {
                note("로드뷰를 여는 중 문제가 생겼어요.\n지도 모드로 넘어갈게요.");
                setTimeout(function () { if (open) startMap(); }, 1800);
            }
        });
    }

    // 사진을 바꿔 세울 때는 항상 이걸 거칩니다.
    //
    // 거리뷰는 어떤 서비스든 연속 영상이 아니라 일정 간격으로 찍은 사진
    // 묶음이라, 그냥 갈아끼우면 툭툭 끊겨 보입니다. 바꾸기 직전에 화면을
    // 살짝 밀고 들어갔다가(뒤로 갈 땐 물러났다가) 새 사진을 제자리에서
    // 시작시키면, 그 움직임이 교체 순간을 가려 걸어간 것처럼 보입니다.
    // 구글 스트리트뷰가 쓰는 것과 같은 눈속임입니다.
    function setPano(panoId, ll, dir) {
        curPanoId = panoId;

        if (!dir) {                       // 첫 진입·모드 전환은 연출 없이
            rv.setPanoId(panoId, ll);
            schedulePrefetch();
            return;
        }

        elRoot.classList.add(dir < 0 ? "stepping-back" : "stepping");
        setTimeout(function () {
            if (!open) return;
            rv.setPanoId(panoId, ll);
            // 새 사진까지 되돌아가는 애니메이션이 보이면 어색하므로 잠깐 끕니다
            elRvBox.style.transition = "none";
            elRoot.classList.remove("stepping", "stepping-back");
            void elRvBox.offsetWidth;
            elRvBox.style.transition = "";
            prefetchAhead();
            maybeChickSay();          // 걷다가 가끔 병아리가 한마디 합니다
        }, CAMPUS.fadeMs);
    }

    // 그 지점에서 가장 가까운 사진으로 이동
    function jumpTo(lat, lng, isFirst) {
        if (!rvClient) return;
        var pos = new kakao.maps.LatLng(lat, lng);
        rvClient.getNearestPanoId(pos, CAMPUS.snapRadius, function (panoId) {
            if (!open) return;
            if (panoId === null) {
                if (isFirst) {
                    note("이 근처에는 로드뷰 사진이 없어요.\n지도 모드로 보여드릴게요.");
                    setTimeout(function () { if (open) startMap(); }, 1800);
                } else {
                    hint("이쪽은 더 갈 수 없어요");
                }
                return;
            }
            setPano(panoId, pos);
        });
    }

    function syncRvPos() {
        if (!rv) return;
        var p = rv.getPosition();
        if (!p) return;
        var next = { lat: p.getLat(), lng: p.getLng() };
        if (rvPos) walkedM += distanceM(rvPos, next);
        rvPos = next;
        updateHud(next.lat, next.lng);
    }

    // 바라보는 방향으로 전진 / 후진
    function stepRoadview(backward) {
        if (!rvReady || !rvPos) return;
        var now = Date.now();
        if (now - lastMoveAt < CAMPUS.moveCooldown) return;

        var pan = 0;
        try { pan = rv.getViewpoint().pan; } catch (e) {}
        if (backward) pan += 180;

        // 미리 찾아둔 사진이 지금 방향과 맞으면 네트워크를 기다리지 않고 바로 갑니다
        if (!backward && ahead && angleDiff(ahead.pan, pan) < 12) {
            lastMoveAt = now;
            var a = ahead;
            ahead = null;
            setPano(a.panoId, a.ll, 1);
            return;
        }

        lastMoveAt = now;
        findAhead(pan, 0, function (panoId, ll) {
            if (!panoId) { hint("이쪽은 더 갈 수 없어요"); return; }
            setPano(panoId, ll, backward ? -1 : 1);
        });
    }

    function angleDiff(a, b) {
        return Math.abs(((a - b + 540) % 360) - 180);
    }

    // 다음 사진을 미리 찾아둡니다.
    // 전진할 때마다 좌표 조회를 새로 하면 그 왕복 시간만큼 화면이 멈춰서,
    // 서 있는 동안 미리 구해두고 누르는 순간 바로 넘어가게 합니다.
    var ahead = null;            // { pan, panoId, ll }
    var prefetchTimer = null;

    function prefetchAhead() {
        ahead = null;
        if (!rvReady || !rvPos || !rvClient) return;
        var pan;
        try { pan = rv.getViewpoint().pan; } catch (e) { return; }
        findAhead(pan, 0, function (panoId, ll) {
            if (panoId) ahead = { pan: pan, panoId: panoId, ll: ll };
        });
    }

    // 고개를 돌리는 중에는 의미가 없으니, 멈춘 뒤에 한 번만 찾습니다
    function schedulePrefetch() {
        ahead = null;
        clearTimeout(prefetchTimer);
        prefetchTimer = setTimeout(prefetchAhead, 250);
    }

    // 촬영 지점 간격이 일정하지 않아서 12m 앞에 사진이 없는 경우가 잦습니다.
    // 한 번 실패했다고 "못 간다"고 하면 길 한가운데서 막힌 것처럼 느껴져서,
    // 같은 방향으로 조금씩 더 멀리 늘려가며 여러 번 찾아봅니다.
    //
    // 중요: 반경 안에 지금 서 있는 사진이 다시 잡히는 일이 매우 흔합니다.
    // 그대로 setPanoId 하면 제자리에 다시 서면서 "앞으로 가기가 먹통"이 됩니다.
    // 그래서 현재 panoId 와 같으면 못 찾은 것으로 치고 더 멀리 봅니다.
    var AHEAD_TRIES = [1, 1.8, 2.8, 4];

    function findAhead(pan, i, cb) {
        if (i >= AHEAD_TRIES.length) { cb(null); return; }
        var d = CAMPUS.stepMeters * AHEAD_TRIES[i];
        var t = offsetLatLng(rvPos.lat, rvPos.lng, pan, d);
        var ll = new kakao.maps.LatLng(t.lat, t.lng);
        rvClient.getNearestPanoId(ll, CAMPUS.snapRadius, function (panoId) {
            if (!open) return;
            if (panoId === null || panoId === curPanoId) { findAhead(pan, i + 1, cb); return; }
            cb(panoId, ll);
        });
    }

    // 시작하자마자 길이 뻗은 쪽을 바라보게 맞춰줍니다.
    // 엉뚱한 방향(건물 벽 등)을 보고 있으면 앞으로 가기를 눌러도 아무 일이
    // 없어서 고장난 줄 알게 됩니다.
    function faceOpenDirection() {
        if (!rvPos || !rvClient) return;
        var dirs = [0, 45, 90, 135, 180, 225, 270, 315];
        var idx = 0;
        (function probe() {
            if (idx >= dirs.length || !open) return;
            var pan = dirs[idx++];
            var t = offsetLatLng(rvPos.lat, rvPos.lng, pan, CAMPUS.stepMeters * 2);
            rvClient.getNearestPanoId(new kakao.maps.LatLng(t.lat, t.lng), CAMPUS.snapRadius, function (id) {
                if (!open) return;
                // 지금 서 있는 사진이 잡힌 건 "그 방향에 길이 있다"는 뜻이 아닙니다
                if (id === null || id === curPanoId) { probe(); return; }
                try {
                    var vp = rv.getViewpoint();
                    rv.setViewpoint({ pan: pan, tilt: vp.tilt, zoom: vp.zoom });
                } catch (e) {}
                prefetchAhead();   // 첫 걸음도 기다리지 않도록 미리 준비
            });
        })();
    }

    function turnRoadview(deg) {
        if (!rvReady) return;
        try {
            var vp = rv.getViewpoint();
            rv.setViewpoint({ pan: (vp.pan + deg + 360) % 360, tilt: vp.tilt, zoom: vp.zoom });
        } catch (e) {}
        schedulePrefetch();   // 방향이 바뀌었으니 미리 찾아둔 건 버립니다
    }

    // =================================================================
    // 지도 (로드뷰가 안 될 때)
    // =================================================================
    function startMap() {
        mode = "map";
        rvReady = false;
        elRoot.classList.remove("rv");
        clearNote();

        var startLat = rvPos ? rvPos.lat : CAMPUS.center.lat;
        var startLon = rvPos ? rvPos.lng : CAMPUS.center.lon;

        camX = lonToX(startLon, CAMPUS.zoom);
        camY = latToY(startLat, CAMPUS.zoom);
        minX = lonToX(CAMPUS.center.lon - CAMPUS.span.lon, CAMPUS.zoom);
        maxX = lonToX(CAMPUS.center.lon + CAMPUS.span.lon, CAMPUS.zoom);
        minY = latToY(CAMPUS.center.lat + CAMPUS.span.lat, CAMPUS.zoom);
        maxY = latToY(CAMPUS.center.lat - CAMPUS.span.lat, CAMPUS.zoom);

        tileFailures = 0;
        warnedOffline = false;
        drawCharacter();
        renderMap();
    }

    function stepMap(dt) {
        var sp = (keys.sprint ? CAMPUS.sprint : CAMPUS.speed) * dt;
        var dx = (keys.right ? sp : 0) - (keys.left ? sp : 0);
        var dy = (keys.down ? sp : 0) - (keys.up ? sp : 0);
        if (!dx && !dy) { elChar.classList.remove("moving"); return; }

        if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }
        camX = Math.min(maxX, Math.max(minX, camX + dx));
        camY = Math.min(maxY, Math.max(minY, camY + dy));
        if (dx) { facing = dx > 0 ? 1 : -1; elChar.style.setProperty("--face", facing); }

        var mPerPx = 156543.03392 * Math.cos(toRad(CAMPUS.center.lat)) / Math.pow(2, CAMPUS.zoom);
        walkedM += Math.sqrt(dx * dx + dy * dy) * mPerPx;

        elChar.classList.add("moving");
        maybeChickSay();      // 지도 모드에서도 병아리가 가끔 말을 겁니다
        renderMap();
    }

    function renderMap() {
        if (!open || mode !== "map") return;
        var vw = elRoot.clientWidth, vh = elRoot.clientHeight;
        var z = CAMPUS.zoom;
        var originX = camX - vw / 2, originY = camY - vh / 2;
        var x0 = Math.floor(originX / TILE), x1 = Math.floor((originX + vw) / TILE);
        var y0 = Math.floor(originY / TILE), y1 = Math.floor((originY + vh) / TILE);
        var max = Math.pow(2, z), seen = {};

        for (var ty = y0; ty <= y1; ty++) {
            for (var tx = x0; tx <= x1; tx++) {
                if (ty < 0 || ty >= max) continue;
                var wx = ((tx % max) + max) % max;
                var key = z + "/" + wx + "/" + ty;
                seen[key] = true;
                var img = tiles[key];
                if (!img) {
                    img = document.createElement("img");
                    img.className = "campus-tile";
                    img.alt = "";
                    img.decoding = "async";
                    img.onerror = onTileError;
                    img.src = CAMPUS.tileUrl.replace("{z}", z).replace("{x}", wx).replace("{y}", ty);
                    tiles[key] = img;
                    elLayer.appendChild(img);
                }
                img.style.left = Math.round(tx * TILE - originX) + "px";
                img.style.top = Math.round(ty * TILE - originY) + "px";
            }
        }
        Object.keys(tiles).forEach(function (k) {
            if (!seen[k]) { tiles[k].remove(); delete tiles[k]; }
        });
        updateHud(yToLat(camY, z), xToLon(camX, z));
    }

    function onTileError() {
        tileFailures++;
        if (tileFailures >= 4 && !warnedOffline) {
            warnedOffline = true;
            note("지도를 불러오지 못했어요.\n인터넷 연결을 확인해주세요.");
        }
    }

    function drawCharacter() {
        var pic = "";
        // 로드뷰에서는 앞쪽에 크게 서므로 더 큰 그림을 씁니다
        var px = mode === "roadview" ? 76 : 46;
        try {
            // 돌보기 탭과 똑같은 3D 모습을 씁니다.
            // 화면에 보이는 크기의 두 배로 구워야 고해상도 화면에서 안 뭉개져요.
            if (typeof currentCharPic === "function") pic = currentCharPic(px * 2);
            // 3D 가 안 되는 기기에서는 예전 그림으로 돌아갑니다
            if (!pic && typeof characterSVG === "function" && typeof currentCharForm === "function") {
                pic = characterSVG(currentCharForm(), { size: px });
            }
        } catch (e) {}
        // 말풍선은 지우지 않고 그림만 갈아끼웁니다
        var bubble = elChar.querySelector("#campus-bubble");
        elChar.innerHTML = pic || "🐥";
        if (!pic) elChar.style.fontSize = mode === "roadview" ? "56px" : "34px";
        elChar.appendChild(bubble || makeBubble());
    }

    function makeBubble() {
        var b = document.createElement("span");
        b.id = "campus-bubble";
        return b;
    }

    // 걷다가 가끔 한마디 합니다. 산책 자체가 목적인 곳이라
    // 재촉하거나 목표를 주는 말은 넣지 않았습니다.
    var WALK_LINES = [
        "여기 조용하고 좋다 🌿", "천천히 가도 괜찮아요", "바람 시원하네요",
        "같이 걸으니까 좋아요", "저 나무 예쁘다 🌳", "오늘 여기까지 온 것만으로 충분해요",
        "조금 쉬었다 갈까요?", "이 길 처음 와봐요!", "발 안 아파요?",
        "하늘 한 번 봐요 ☁️", "아무 말 안 해도 돼요", "제가 옆에 있을게요"
    ];
    var lastSayAt = 0;

    function chickSay(text) {
        var b = elChar && elChar.querySelector("#campus-bubble");
        if (!b) return;
        b.innerText = text;
        b.classList.add("show");
        clearTimeout(b._t);
        b._t = setTimeout(function () { b.classList.remove("show"); }, 2600);
    }

    // 여덟 걸음에 한 번쯤, 그리고 최소 12초 간격으로만.
    // 너무 자주 말하면 시끄러워집니다.
    function maybeChickSay() {
        var now = Date.now();
        if (now - lastSayAt < 12000) return;
        if (Math.random() > 0.35) return;
        lastSayAt = now;
        chickSay(WALK_LINES[Math.floor(Math.random() * WALK_LINES.length)]);
    }

    // =================================================================
    // 루프 / 입력
    // =================================================================
    var lastT = 0;

    function loop(ts) {
        if (!open) return;
        // 지난 프레임과의 시간차(초). 탭을 되돌아왔을 때 확 튀지 않게 상한을 둡니다.
        var dt = lastT ? Math.min(0.1, (ts - lastT) / 1000) : 1 / 60;
        lastT = ts || 0;
        step(dt);
        raf = requestAnimationFrame(loop);
    }

    function step(dt) {
        dt = dt || 1 / 60;
        if (mode === "roadview") {
            if (keys.left) turnRoadview(-CAMPUS.turnSpeed * dt);
            if (keys.right) turnRoadview(CAMPUS.turnSpeed * dt);
            if (keys.up) stepRoadview(false);
            if (keys.down) stepRoadview(true);
        } else {
            stepMap(dt);
        }
    }

    var KEYMAP = {
        ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
        w: "up", s: "down", a: "left", d: "right",
        W: "up", S: "down", A: "left", D: "right",
        Shift: "sprint"
    };

    function onKey(e) {
        var dir = KEYMAP[e.key];
        if (!dir) {
            if (e.type === "keydown" && e.key === "Escape") closeCampus();
            return;
        }
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
    // 화면
    // =================================================================
    function updateHud(lat, lng) {
        elCoord.innerText = lat.toFixed(5) + ", " + lng.toFixed(5);
        elDist.innerText = Math.round(walkedM).toLocaleString() + " m";
        elModeBtn.innerText = (mode === "roadview") ? "🗺️ 지도로" : "👣 로드뷰로";
    }

    function note(msg) { elWarn.innerText = msg; elWarn.classList.add("show"); }
    function clearNote() { elWarn.classList.remove("show"); }

    var hintTimer = null;
    function hint(msg) {
        elHint.innerText = msg;
        elHint.classList.add("show");
        clearTimeout(hintTimer);
        hintTimer = setTimeout(function () { elHint.classList.remove("show"); }, 1400);
    }

    function toggleMode() {
        if (mode === "roadview") { startMap(); return; }
        if (!CAMPUS.kakaoAppKey) {
            note("로드뷰를 보려면 카카오 지도 API 키가 필요해요.");
            setTimeout(clearNote, 2200);
            return;
        }
        // 지도에서 서 있던 자리를 로드뷰 시작점으로 씁니다
        rvPos = { lat: yToLat(camY, CAMPUS.zoom), lng: xToLon(camX, CAMPUS.zoom) };
        var at = rvPos;
        startRoadview();
        setTimeout(function () { if (open && rvClient) jumpTo(at.lat, at.lng, true); }, 300);
    }

    function lockLandscape() {
        if (window.nativeOrientation && window.nativeOrientation.lock) {
            window.nativeOrientation.lock("landscape");
            return;
        }
        try {
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock("landscape").catch(function () {});
            }
        } catch (e) {}
    }

    function unlockOrientation() {
        if (window.nativeOrientation && window.nativeOrientation.unlock) {
            window.nativeOrientation.unlock();
            return;
        }
        try {
            if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
        } catch (e) {}
    }

    // 걸은 거리는 코인으로만 돌려줍니다.
    //
    // '걷기 미션'에는 일부러 반영하지 않습니다. 그 미션은 학생을 실제로
    // 바깥에 나가게 하려고 센서로 걸음을 세는 것이라, 방향키로 채워지면
    // 취지가 사라집니다. 캠퍼스 산책은 학교를 눈에 익히는 재미 요소입니다.
    var COIN_PER_M = 1 / 80;
    var COIN_CAP = 30;

    function rewardWalk(meters) {
        var gain = Math.min(COIN_CAP, Math.floor(meters * COIN_PER_M));
        if (gain <= 0) return;
        try {
            coins += gain;
            updateResourceBar();
            saveGame();
            showEventToast("🚶 캠퍼스를 " + Math.round(meters).toLocaleString() + "m 걸었어요 🪙+" + gain, "good");
        } catch (e) {}
    }

    function build() {
        if (elRoot) return;

        elRoot = document.createElement("div");
        elRoot.id = "campus-view";
        elRoot.innerHTML =
            '<div id="campus-rv"></div>' +
            '<div id="campus-sun"></div>' +
            '<div id="campus-layer"></div>' +
            // 병아리와 그 위에 뜨는 말풍선.
            // 혼자 로드뷰만 보는 게 아니라 같이 걷는 느낌이 나도록 넣었습니다.
            '<div id="campus-char"><span id="campus-bubble"></span></div>' +
            '<div id="campus-top">' +
                '<button type="button" id="campus-exit">← 산책 마치기</button>' +
                '<div id="campus-stats">' +
                    '<span>🚶 <b id="campus-dist">0 m</b></span>' +
                    '<span id="campus-coord">-</span>' +
                '</div>' +
                '<button type="button" id="campus-mode">🗺️ 지도로</button>' +
            '</div>' +
            '<div id="campus-attr">' + CAMPUS.attribution + '</div>' +
            '<div id="campus-pad">' +
                '<button type="button" data-dir="up">▲</button>' +
                '<div>' +
                    '<button type="button" data-dir="left">◀</button>' +
                    '<button type="button" data-dir="right">▶</button>' +
                '</div>' +
                '<button type="button" data-dir="down">▼</button>' +
            '</div>' +
            '<div id="campus-hint"></div>' +
            '<div id="campus-rotate">📱 휴대폰을 가로로 돌려주세요</div>' +
            '<div id="campus-warn"></div>';

        document.body.appendChild(elRoot);

        elRvBox  = elRoot.querySelector("#campus-rv");
        elLayer  = elRoot.querySelector("#campus-layer");
        elChar   = elRoot.querySelector("#campus-char");
        elCoord  = elRoot.querySelector("#campus-coord");
        elDist   = elRoot.querySelector("#campus-dist");
        elWarn   = elRoot.querySelector("#campus-warn");
        elHint   = elRoot.querySelector("#campus-hint");
        elModeBtn = elRoot.querySelector("#campus-mode");

        elRoot.querySelector("#campus-exit").onclick = closeCampus;
        elModeBtn.onclick = toggleMode;
        elRoot.querySelectorAll("#campus-pad button").forEach(function (b) {
            bindPad(b, b.getAttribute("data-dir"));
        });
    }

    window.openCampusWalk = openCampus;
    window.closeCampusWalk = closeCampus;
    window.isCampusWalkOpen = function () { return open; };
})();

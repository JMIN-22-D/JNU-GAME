/* =====================================================================
   Capacitor 네이티브 연동
   ---------------------------------------------------------------------
   app.js보다 먼저 로드됩니다. app.js는 window.storage가 이미 있으면
   자기 localStorage 구현을 만들지 않으므로(if (!window.storage)),
   여기서 먼저 선점해 네이티브 저장소로 바꿔치기합니다.

   웹 브라우저로 열었을 때는 아무 일도 하지 않고 그대로 빠져나가서,
   기존 localStorage 방식이 그대로 동작합니다.
   ===================================================================== */
(function () {
    "use strict";

    var cap = window.Capacitor;
    var isNative = !!(cap && typeof cap.isNativePlatform === "function" && cap.isNativePlatform());
    if (!isNative) return;

    // 번들러를 쓰지 않으므로 네이티브가 등록해 둔 플러그인 프록시를 직접 집어옵니다
    function plugin(name) {
        try {
            if (cap.Plugins && cap.Plugins[name]) return cap.Plugins[name];
            if (typeof cap.registerPlugin === "function") return cap.registerPlugin(name);
        } catch (e) {}
        return null;
    }

    // -----------------------------------------------------------------
    // 저장소를 Preferences로 교체
    // iOS WKWebView의 localStorage는 저장공간이 부족하면 OS가 통째로
    // 비워버릴 수 있습니다. 복약 기록처럼 잃으면 안 되는 데이터가 있어서
    // 시스템이 건드리지 않는 Preferences(UserDefaults/SharedPreferences)로
    // 옮깁니다. get/set/delete 형태는 app.js가 쓰던 것과 똑같이 맞췄습니다.
    // -----------------------------------------------------------------
    var Preferences = plugin("Preferences");
    if (Preferences) {
        window.storage = {
            get: function (key) {
                return Preferences.get({ key: key }).then(function (r) {
                    return (r && r.value !== null && r.value !== undefined) ? { value: r.value } : null;
                }).catch(function () { return null; });
            },
            set: function (key, value) {
                return Preferences.set({ key: key, value: String(value) })
                    .then(function () { return true; })
                    .catch(function () { return false; });
            },
            delete: function (key) {
                return Preferences.remove({ key: key }).catch(function () {});
            }
        };
    }

    // -----------------------------------------------------------------
    // 상태표시줄 — 앱 배경이 크림색이라 글자는 어둡게
    // -----------------------------------------------------------------
    var StatusBar = plugin("StatusBar");
    if (StatusBar) {
        try {
            StatusBar.setStyle({ style: "LIGHT" });
            if (cap.getPlatform() === "android") {
                StatusBar.setBackgroundColor({ color: "#faf7f1" });
            }
        } catch (e) {}
    }

    // -----------------------------------------------------------------
    // 네이티브 스플래시는 웹뷰가 그려지는 즉시 내리고,
    // 그 뒤는 앱 안의 #splash-view(탭해서 시작하기)가 이어받습니다.
    // -----------------------------------------------------------------
    var SplashScreen = plugin("SplashScreen");
    function hideNativeSplash() {
        if (!SplashScreen) return;
        try { SplashScreen.hide({ fadeOutDuration: 200 }); } catch (e) {}
    }
    if (document.readyState === "complete" || document.readyState === "interactive") {
        setTimeout(hideNativeSplash, 0);
    } else {
        document.addEventListener("DOMContentLoaded", function () { setTimeout(hideNativeSplash, 0); });
    }

    // -----------------------------------------------------------------
    // 로컬 알림
    // 서버 없이 기기 안에서만 예약되는 알림입니다.
    // app.js 는 window.nativeNotify 가 있을 때만 알림을 다루고,
    // 웹 브라우저에서는 이 객체가 없으므로 조용히 넘어갑니다.
    // -----------------------------------------------------------------
    var LocalNotifications = plugin("LocalNotifications");
    if (LocalNotifications) {
        window.nativeNotify = {
            // 안드로이드 13+ 와 iOS 는 알림을 보내기 전에 사용자 허락이 필요합니다
            requestPermission: function () {
                return LocalNotifications.requestPermissions()
                    .then(function (r) { return !!r && r.display === "granted"; })
                    .catch(function () { return false; });
            },
            checkPermission: function () {
                return LocalNotifications.checkPermissions()
                    .then(function (r) { return !!r && r.display === "granted"; })
                    .catch(function () { return false; });
            },
            schedule: function (items) {
                if (!items || !items.length) return Promise.resolve();
                return LocalNotifications.schedule({
                    notifications: items.map(function (n) {
                        return {
                            id: n.id,
                            title: n.title,
                            body: n.body,
                            // allowWhileIdle: 절전 모드에 들어가 있어도 제시간에 뜨도록
                            schedule: { at: n.at, allowWhileIdle: true }
                        };
                    })
                }).catch(function () {});
            },
            cancel: function (ids) {
                if (!ids || !ids.length) return Promise.resolve();
                return LocalNotifications.cancel({
                    notifications: ids.map(function (id) { return { id: id }; })
                }).catch(function () {});
            }
        };
    }

    // -----------------------------------------------------------------
    // 화면 방향
    // 캠퍼스 지도 산책은 가로로 넓게 봐야 해서 잠깐 가로로 고정합니다.
    // 웹 브라우저에서는 orientation.lock 이 대부분 막혀 있어서,
    // campus.js 가 대신 "가로로 돌려주세요" 안내를 띄웁니다.
    // -----------------------------------------------------------------
    var ScreenOrientation = plugin("ScreenOrientation");
    if (ScreenOrientation) {
        window.nativeOrientation = {
            lock: function (dir) {
                try { ScreenOrientation.lock({ orientation: dir || "landscape" }); } catch (e) {}
            },
            unlock: function () {
                try { ScreenOrientation.unlock(); } catch (e) {}
            }
        };
    }

    // -----------------------------------------------------------------
    // 안드로이드 하드웨어 뒤로가기
    // 기본 동작은 "앱 종료"라서, 열려 있는 화면을 위에서부터 하나씩
    // 닫아주고 더 닫을 게 없을 때만 종료합니다.
    // -----------------------------------------------------------------
    var App = plugin("App");

    function isVisible(id) {
        var el = document.getElementById(id);
        if (!el) return false;
        try { return window.getComputedStyle(el).display !== "none"; }
        catch (e) { return false; }
    }

    function call(fnName) {
        if (typeof window[fnName] === "function") { window[fnName](); return true; }
        return false;
    }

    // 위에 덮인 것부터 순서대로 검사합니다
    function closeTopmost() {
        // 캠퍼스 지도는 전체화면이라 제일 먼저 닫습니다
        if (typeof window.isCampusWalkOpen === "function" && window.isCampusWalkOpen()) {
            return call("closeCampusWalk");
        }
        if (typeof window.isIslandOpen === "function" && window.isIslandOpen()) {
            return call("hideIsland");
        }
        // 복약 화면 위에 겹쳐 뜨는 것들
        if (isVisible("med-camera-view")) return call("cancelMedCamera");
        if (isVisible("med-result-view")) return call("closeMedResult");

        // 전화 미션 모달은 display가 아니라 클래스로 여닫습니다
        var callModal = document.getElementById("call-modal");
        if (callModal && callModal.classList.contains("show")) return call("closeCallPanel");

        // 게임 모달
        if (isVisible("collection-view")) return call("closeCollection");
        if (isVisible("mission-view")) return call("closeMissions");

        // 걷기 측정 중
        if (isVisible("walk-tracker-view")) return call("stopWalkTracking");

        // 온보딩 중에는 뒤로가기로 빠져나갈 수 없게 둡니다
        if (isVisible("onboarding-view")) return true;

        // 전체 화면들
        if (isVisible("chat-view")) return call("closeChat");
        if (isVisible("medication-view")) return call("closeMedication");
        if (isVisible("game-view")) {
            // 농장 안에 들어가 있으면 농장 입구로만 물러납니다
            if (isVisible("farm-inside")) return call("exitField");
            return call("showMain");
        }
        return false;
    }

    if (App && typeof App.addListener === "function") {
        App.addListener("backButton", function () {
            if (closeTopmost()) return;
            try { App.exitApp(); } catch (e) {}
        });
    }
})();

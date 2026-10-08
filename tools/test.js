/* =====================================================================
   자동 점검
   ---------------------------------------------------------------------
   실행:  node tools/test.js
   (설치할 것 없습니다. Node 만 있으면 됩니다)

   ■ 왜 필요한가
     14,000줄짜리 앱을 손으로만 확인해 왔습니다. 사람이 이어받으면
     고칠 때마다 예전 것이 조용히 망가지는 걸 못 잡습니다.
     특히 위기 감지는 조용히 망가지면 사람이 다칩니다.

   ■ 무엇을 보는가
     1) 위기 감지 — 놓치면 안 되는 말 / 잡으면 안 되는 말
     2) 일상 대화 갈래 — 엉뚱한 답이 나가지 않는지
     3) 오늘의 미션 — 목표·저장·이관
     4) 배포 점검 — 키가 새지 않았는지, 데모가 섞이지 않았는지

   ■ 어떻게 도는가
     app.js 는 브라우저용이라 통째로 못 불러옵니다. 그래서 필요한
     부분(상수·순수 함수)만 떼어내 따로 실행합니다. 떼어내는 이름이
     바뀌면 테스트가 "못 찾음"으로 알려주니, 그때 이름을 맞춰주세요.
   ===================================================================== */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const APP = fs.readFileSync(path.join(ROOT, "www/js/app.js"), "utf8");
// 지도 기본값은 campus.js 에 있습니다. app.js 에서 찾으면 영영 안 걸립니다.
const CAMPUS_SRC = fs.readFileSync(path.join(ROOT, "www/js/campus.js"), "utf8");

let pass = 0, fail = 0;
const fails = [];

function ok(cond, name, detail) {
    if (cond) { pass++; return true; }
    fail++; fails.push(name + (detail ? "  → " + detail : ""));
    return false;
}
function section(t) { console.log("\n── " + t + " " + "─".repeat(Math.max(0, 46 - t.length))); }

// app.js 에서 이름으로 블록을 떼어냅니다
function grab(name, kind) {
    const re = kind === "fn"
        ? new RegExp("function\\s+" + name + "\\s*\\([\\s\\S]*?\\n    \\}", "m")
        : new RegExp("const\\s+" + name + "\\s*=\\s*\\[[\\s\\S]*?\\n?\\s*\\];", "m");
    const m = APP.match(re);
    if (!m) throw new Error("app.js 에서 " + name + " 을 못 찾았습니다 (이름이 바뀌었나요?)");
    return m[0];
}

// =====================================================================
section("1. 위기 감지");
// =====================================================================
const crisisEnv = {};
try {
    const code = grab("CRISIS_WORDS") + "\n" + grab("CRISIS_EXCLUDE") + "\n"
               + grab("normalizeForCrisis", "fn") + "\n" + grab("detectCrisis", "fn")
               + "\nmodule.exports = { detectCrisis, CRISIS_WORDS };";
    const mod = { exports: {} };
    new Function("module", code)(mod);
    Object.assign(crisisEnv, mod.exports);
} catch (e) {
    ok(false, "위기 감지 코드를 불러오기", e.message);
}

if (crisisEnv.detectCrisis) {
    const detect = crisisEnv.detectCrisis;

    // 반드시 잡아야 하는 말 — 놓치면 사람이 다칩니다
    const MUST = [
        "죽고 싶어", "자살하고 싶어", "자해했어", "목숨을 끊고 싶어",
        "사라지고 싶어", "살기 싫어", "유서 쓰고 있어", "뛰어내리고 싶어",
        "죽 고 싶 다", "죽,고,싶,다", "죽고싶다ㅠㅠ",
        "ㅈㅅ하고싶다", "ㅈㄱㅅ",
        "kill myself", "I want to die", "Kill Myself",
        "다들 나 없으면 편할 텐데", "내가 사라지는 게 나을 것 같아",
        "나 없어도 아무도 모를 거야",
        "마지막 인사 하려고", "이제 작별이야", "다 정리했어 이제",
        "약 다 모아놨어", "옥상에 올라와 있어",
        "이제 그만 쉬고 싶어", "영원히 쉬고 싶어",
        "더 이상 못 버티겠어", "살 이유가 없어", "내일이 안 왔으면 좋겠어",
        "내가 짐이 되는 것 같아", "폐만 끼치는 것 같아"
    ];
    // 절대 잡으면 안 되는 말 — 잘못 잡으면 학생이 앱을 안 믿습니다
    const MUST_NOT = [
        "과제 때문에 죽겠다", "배고파 죽겠어", "더워 죽겠네", "피곤해 죽겠다",
        "웃겨 죽는 줄", "게임에서 죽었어", "이 노래 죽인다", "죽순 먹었어",
        "자살골 넣었대", "자살예방 캠페인 봤어",
        "시험 끝나서 살 것 같아", "손목시계 샀어", "그만 살 빼야지",
        "영화가 극단적이더라", "방 정리했어", "마지막 문제 풀었어",
        "약 먹었어", "계단 올라왔어", "오늘 좀 쉬고 싶다",
        "유서 깊은 건물이래", "잠들기 전에 책 읽어"
    ];

    const missed = MUST.filter(t => !detect(t));
    const fp = MUST_NOT.filter(t => detect(t));

    ok(missed.length === 0, "위험한 말 " + MUST.length + "개 모두 감지",
       missed.length ? "놓침: " + missed.join(" / ") : "");
    ok(fp.length === 0, "평범한 말 " + MUST_NOT.length + "개 오탐 없음",
       fp.length ? "잘못 잡음: " + fp.join(" / ") : "");
    console.log("   위기어 " + crisisEnv.CRISIS_WORDS.length + "개 등록됨");
}

// =====================================================================
section("2. 일상 대화 갈래");
// =====================================================================
try {
    const topicsSrc = APP.match(/const CHAT_TOPICS = \[[\s\S]*?\n    \];/)[0];
    const mod = { exports: {} };
    new Function("module", topicsSrc + "\nmodule.exports = CHAT_TOPICS;")(mod);
    const TOPICS = mod.exports;

    // 뒤집는 말도 app.js 와 똑같이 봐야 "하나도 안 즐거워" 가 기쁨으로 새는 걸 잡습니다
    const negEnv = {};
    new Function("e", APP.match(/const NEGATION_PATTERNS = \[[\s\S]*?\];/)[0] +
                      APP.match(/const NOT_SAD_PATTERNS = \[[\s\S]*?\];/)[0] +
                      "\ne.NEG = NEGATION_PATTERNS; e.NOT_SAD = NOT_SAD_PATTERNS;")(negEnv);

    // app.js 의 ruleBasedReply 가 고르는 방식을 그대로 옮긴 것.
    // (맞은 개수 + boost 이고, 같으면 먼저 나온 갈래가 이깁니다)
    function pick(text) {
        const t = text.toLowerCase();
        const negated = negEnv.NEG.some(p => t.includes(p));
        const notSad = negEnv.NOT_SAD.some(p => t.includes(p));
        let best = null, bestScore = 0;
        TOPICS.forEach(topic => {
            if (topic.key === "short") return;
            if (negated && topic.key === "happy") return;
            if (notSad && topic.key === "sad") return;
            let score = 0;
            topic.words.forEach(w => { if (t.includes(w)) score++; });
            if (score > 0) score += (topic.boost || 0);
            if (score > bestScore) { bestScore = score; best = topic.key; }
        });
        // 뒤집는 말만 있고 다른 단서가 없으면 app.js 도 슬픔으로 받습니다
        if (!best && negated && !notSad) best = "sad";
        return best;
    }

    const CASES = [
        ["오늘 너무 더웠어", "weather"], ["비 와서 우울해", null],
        ["점심 뭐 먹지", "meal"], ["밥 먹었어?", "meal"],
        ["수업 끝났어", "campus"], ["과제 다 냈어", "done"],
        ["시험 끝났다!", "done"], ["드라마 봤어", "hobby"],
        ["헐 대박", "react"]
    ];
    let mismatch = [];
    CASES.forEach(([text, want]) => {
        const got = pick(text);
        if (want && got !== want) mismatch.push(text + " → " + got + " (기대 " + want + ")");
    });
    ok(mismatch.length === 0, "일상 표현이 알맞은 갈래로 감",
       mismatch.length ? mismatch.join(" / ") : "");
    console.log("   대화 갈래 " + TOPICS.length + "개");

    // 예전에 어긋났던 표현들 — 다시 새지 않는지
    const REGRESS = [
        ["학식 먹었어", "meal"],      // 예전엔 campus 로 새서 "그렇게 하루가 가네요"
        ["오랜만이야", "greeting"],   // 예전엔 react 로 새서 "그래서 어떻게 됐어요?"
        ["운동 갔다 왔어", "hobby"],  // 예전엔 아예 못 잡음
        ["노래 듣고 있어", "hobby"],  // 예전엔 smalltalk 로 샘
        ["덥더라", "weather"],        // 어미가 달라서 못 잡던 것
        ["내일도 덥대", "weather"],
        ["비라도 왔으면", "weather"],
        ["기숙사 가는 길", "campus"],  // 예전엔 자취 고민으로 새서 무거운 답
        // 2026-10-08 시뮬레이션에서 걸린 것들
        ["하나도 안 즐거워", "sad"],        // 기쁨으로 새서 "저까지 기분이 좋아지네요!"
        ["시험 잘 봤어", "happy"],          // study 로 새서 "다 잘하려고 하면..." 하고 위로
        ["성적 때문에 스트레스 받아", "study"], // 아예 못 잡아서 맹한 기본 답
        ["알바 힘들어", "money"],           // '힘들' 때문에 sad 로 새서 돈 얘기를 못 받음
        ["넌 뭐 할 수 있어?", "about"],     // 질문인데 "아 그렇구나. 더 얘기해줘요."
        ["합격했어", "done"],               // 축하가 나가야 하는 자리
        ["안 괜찮아", "sad"],               // 부정이어도 이건 슬픔이 맞습니다
        // 앱이 띄우는 빠른답변 버튼인데 못 알아듣던 것들.
        // 눌러보라고 내민 말을 "재밌네요. 그래서요?" 로 받으면 안 됩니다.
        ["몇 주째 이래", "sad"],            // 얼마나 오래됐는지 = 우울 지속 신호
        ["계속 그래", "sad"],
        ["나아지지 않아", "sad"],
        ["자려고 하면 생각나", "sleep"],
        ["예전엔 좋아했는데", "empty"],     // 기쁨으로 새서 "저도 기뻐요!" 가 나갔음
        ["집이 너무 멀어", "alone_living"], // relation 으로 새서 "관계에서 상처받는 건…"
        ["생활비가 빠듯해", "money"],       // 날씨의 "비가" 가 '생활비가' 안에서 걸렸음
        // 갈래를 아예 못 잡아 맹한 기본 답이 나가던 것들
        ["좀 도와줘", "help"],              // 도와달라는 말에 "아 그렇구나. 더 얘기해줘요."
        ["못 하겠어", "help"],
        ["감기 걸렸어", "body"],
        ["살쪘어", "body"],
        ["편입 고민", "leave"],
        ["수강신청 망했어", "study"],
        ["교수님이 싫어", "study"],
        ["현타 왔다", "sad"],
        ["창피해", "sad"],
        ["다 포기하고 싶어", "sad"],
        ["개인정보 안전해?", "about"],      // 믿고 써도 되냐는 물음은 꼭 받아야 합니다
        ["이거 무료야?", "about"],
        ["비밀 보장 돼?", "about"],         // app 으로 새서 코인 설명이 나갔음
        // 여러 턴 대화를 돌려보고 찾은 것들
        ["잠도 안 와", "sleep"],            // 어미만 달랐는데 공부 얘기로 샘
        ["그냥 다 관두고 싶다", "leave"],   // 흘려보내면 안 되는 말
        ["그냥 연락 끊길까", "relation"],   // refuse 로 새서 "말할 기운이 없는 걸 수도"
        ["내가 잘못한 건가 싶기도 하고", "selfblame"],
        ["요즘 아무랑도 말을 안 했어", "lonely"],
        ["동기들이랑 안 친해", "lonely"]
    ];

    // 못 알아들었을 때 쓰는 기본 답은 어떤 말 뒤에 붙어도 괜찮아야 합니다.
    // "오늘 너물 힙들었어" 처럼 오타로 못 알아들은 말에 "좋아요, 그런 얘기." 가
    // 나간 적이 있어요. 못 알아듣는 일은 앞으로도 생기니 여기가 안전해야 합니다.
    try {
        const lightSrc = APP.match(/const CHAT_DEFAULTS_LIGHT = \[[\s\S]*?\n    \];/)[0];
        const lEnv = {};
        new Function("e", lightSrc + "\ne.l = CHAT_DEFAULTS_LIGHT;")(lEnv);
        // "얘기 계속해도 좋아요" 의 '좋아요' 는 허락한다는 뜻이라 괜찮습니다.
        // 문제는 상대 말을 좋다고 평가하는 자리에 쓰일 때예요.
        const unsafe = ["재밌", "신나", "대박", "축하", "부럽", "기뻐", "다행"];
        const hits = lEnv.l.filter(s => unsafe.some(w => s.includes(w)) || /^좋아요/.test(s));
        ok(hits.length === 0, "못 알아들었을 때 쓰는 답이 " + lEnv.l.length + "개 모두 안전함",
           hits.join(" / "));
    } catch (e) {
        ok(false, "기본 답 안전성 검사", e.message);
    }

    // 이름을 안 알려준 사람(게스트)한테 문장이 깨지지 않는지.
    // "그 사람 탓도, {name} 탓도…" 가 "그 사람 탓도, 탓도…" 로 나간 적이 있습니다.
    try {
        // app.js 의 게스트 치환 규칙을 그대로 옮긴 것
        const pEnv = { f: function (text) {
            let s = text.replace(/\{name\}\s*,\s*/g, "");
            return s.replace(/\{name\}(은|는|이|가|을|를)?/g, function (m, p) {
                if (p === "는") return "본인은";
                if (p === "가") return "본인이";
                if (p === "를") return "본인을";
                return "본인" + (p || "");
            });
        } };
        const broken = [];
        // 줄바꿈을 넘어가면 엉뚱한 토막을 문장으로 착각합니다
        const nameLines = APP.match(/"[^"\n]*\{name\}[^"\n]*"/g) || [];
        nameLines.forEach(raw => {
            const s = raw.slice(1, -1).replace(/\\n/g, "\n");
            if (s === "{name}") return;
            const out = pEnv.f(s);
            if (out.indexOf("{name}") >= 0) broken.push("치환 안 됨: " + out);
            else if (/본인 본인/.test(out)) broken.push("겹침: " + out);
            else if (/,\s*(탓|마음|기준)/.test(out)) broken.push("빈 자리: " + out);
            else if (/\s{2,}/.test(out)) broken.push("빈칸 둘: " + out);
        });
        ok(broken.length === 0, "이름 없는 사람에게도 문장이 안 깨짐 (" + nameLines.length + "개)",
           broken.slice(0, 3).join(" / "));
    } catch (e) {
        ok(false, "이름 치환 검사", e.message);
    }
    // 기간을 말하는 답("2주정도")을 흘려보내면 안 됩니다.
    // 제록이가 "얼마나 됐어요?" 라고 물어놓고 답을 못 알아들은 적이 있어요.
    // 2주는 혼자 버틸 일이 아니라고 알려줘야 하는 경계입니다.
    try {
        const durSrc = APP.match(/const KO_NUM = [\s\S]*?\n    \}/)[0];
        const durEnv = {};
        new Function("e", durSrc + "\ne.f = durationWeeks;")(durEnv);
        const d = durEnv.f;
        const longEnough = ["2주정도", "한 달쯤", "몇 달째", "1년 넘었어", "보름정도", "오래됐어"];
        const tooShort = ["3일", "며칠 안 됐어", "얼마 안 됐어"];
        const notDuration = ["2주 뒤에 시험이야", "한 달 뒤에 발표가 있어", "3일 동안 과제만 했어", "2주까지야"];
        const dw = s => d(s.toLowerCase());
        ok(longEnough.every(s => dw(s) >= 2), "2주 이상이라고 답하면 알아봄",
           longEnough.filter(s => !(dw(s) >= 2)).join(" / "));
        ok(tooShort.every(s => dw(s) !== null && dw(s) < 2), "며칠이라고 답하면 알아봄",
           tooShort.filter(s => !(dw(s) !== null && dw(s) < 2)).join(" / "));
        ok(notDuration.every(s => dw(s) === null), "앞일을 말한 걸 기간으로 오해하지 않음",
           notDuration.filter(s => dw(s) !== null).join(" / "));
    } catch (e) {
        ok(false, "기간 인식 검사", e.message);
    }

    const regressed = REGRESS.filter(([t, want]) => pick(t) !== want)
                             .map(([t, want]) => t + " → " + pick(t) + " (기대 " + want + ")");
    ok(regressed.length === 0, "예전에 어긋났던 일상 표현 " + REGRESS.length + "개가 제자리",
       regressed.join(" / "));

    // 질문·부정·진행형을 구분하는 장치가 살아 있는지
    const APP_FNS = ["isAsking", "didNotDo", "isDoingNow", "looksHeavy"];
    const missingFn = APP_FNS.filter(f => !new RegExp("function\\s+" + f + "\\s*\\(").test(APP));
    ok(missingFn.length === 0, "질문·부정·진행·무거움 판별 함수가 있음", missingFn.join(","));

    // 가벼운 기본 답변이 따로 있는지
    ok(/const CHAT_DEFAULTS_LIGHT = \[/.test(APP),
       "못 알아들었을 때 쓸 가벼운 답변이 따로 있음");

    // 밥·학교·성취·취미에 '못 했을 때' 답이 있는지
    ["meal", "campus", "done", "hobby"].forEach(k => {
        const t = TOPICS.find(x => x.key === k);
        ok(t && t.undone && t.undone.length,
           k + " 갈래에 '못 했을 때' 답변이 있음");
    });
    const mealT = TOPICS.find(x => x.key === "meal");
    ok(mealT && mealT.asking && mealT.asking.length,
       "밥 갈래에 '물어봤을 때' 답변이 있음");

    // 갈래마다 답이 실제로 들어 있는지
    const empty = TOPICS.filter(t => !t.replies || !t.replies.length).map(t => t.key);
    ok(empty.length === 0, "모든 갈래에 답변이 있음", empty.join(","));
} catch (e) {
    ok(false, "대화 갈래를 불러오기", e.message);
}

// =====================================================================
section("3. 오늘의 미션");
// =====================================================================
try {
    const s = APP.match(/let dailySettings = \{[\s\S]*?\n    \};/)[0];
    const mod = { exports: {} };
    new Function("module", s.replace("let ", "var ") + "\nmodule.exports = dailySettings;")(mod);
    const D = mod.exports;

    ok(D.walkGoal === 1000, "걷기 목표 1,000걸음", "지금 " + D.walkGoal);
    ok(D.callGoalMin === 3, "통화 목표 3분", "지금 " + D.callGoalMin);
    ok(D.v >= 1, "설정 판 번호가 있음 (옛 저장본 이관용)", "v=" + D.v);

    // 이관 로직
    const mig = APP.match(/function migrateDailySettings\(\)[\s\S]*?\n    \}/)[0];
    const mod2 = { exports: {} };
    new Function("module", "var dailySettings = { v:0, walkGoal:2000, callGoalMin:5 };\n"
        + mig + "\nmigrateDailySettings();\nmodule.exports = dailySettings;")(mod2);
    ok(mod2.exports.walkGoal === 1000 && mod2.exports.callGoalMin === 3,
       "옛 저장본(2000걸음·5분)이 새 목표로 옮겨짐",
       JSON.stringify(mod2.exports));

    // 학생이 직접 고른 값은 안 건드려야 함
    const mod3 = { exports: {} };
    new Function("module", "var dailySettings = { v:1, walkGoal:1000, callGoalMin:10 };\n"
        + mig + "\nmigrateDailySettings();\nmodule.exports = dailySettings;")(mod3);
    ok(mod3.exports.callGoalMin === 10, "학생이 고른 목표는 덮어쓰지 않음",
       JSON.stringify(mod3.exports));

    const goal = APP.match(/const DAILY_MISSION_GOAL = (\d+)/);
    ok(goal && goal[1] === "1", "하루 목표는 미션 1개 (셋 중 하나만 해도 달성)");
} catch (e) {
    ok(false, "미션 설정을 불러오기", e.message);
}

// =====================================================================
section("4. 배포 점검");
// =====================================================================
const builds = ["DEMO.html", "jeju_life_support_portal (6).html"];
builds.forEach(f => {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) { ok(false, f + " 있음"); return; }
    const html = fs.readFileSync(p, "utf8");
    const isDemo = f.startsWith("DEMO");

    ok(!/AIza[0-9A-Za-z_\-]{30}/.test(html), f + ": 구글 API 키 안 섞임");
    ok(!html.includes("localhost:8787"), f + ": 시험용 주소 안 섞임");
    ok(!html.includes("__i3") && !html.includes("_dbg"), f + ": 디버그 훅 없음");
    ok(html.includes("109"), f + ": 긴급 연락처 들어 있음");
    if (!isDemo) {
        // infiniteTimer 하나만 보면 데모 패널의 일부만 섞여 들어와도 통과해버립니다.
        // 패널을 만드는 쪽(demo-wrap)과 버튼 글자(전부 열기)까지 같이 봅니다.
        // demo-fab 은 "if (false && ...)" 안의 자가진단 문구로도 등장하므로 제외합니다.
        ["infiniteTimer", "demo-wrap", "전부 열기"].forEach(mark => {
            ok(!html.includes(mark), f + ": 데모 패널 안 섞임 (" + mark + ")");
        });
    }
});

// 빌드가 소스보다 오래되면, 고친 내용이 학생에게 안 나갑니다.
// 깃허브에 올리기 전에 반드시 다시 빌드해야 해서 '경고'로 알립니다.
const SRC_FILES = ["www/js/app.js", "www/css/style.css", "www/index.html",
                   "www/js/campus.js", "www/js/island3d.js", "www/js/chick3d.js",
                   "www/js/scene3d.js"];
let newestSrc = 0, newestName = "";
SRC_FILES.forEach(s => {
    const p = path.join(ROOT, s);
    if (!fs.existsSync(p)) return;
    const m = fs.statSync(p).mtimeMs;
    if (m > newestSrc) { newestSrc = m; newestName = s; }
});
builds.forEach(f => {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) return;
    if (fs.statSync(p).mtimeMs < newestSrc) {
        console.log("\n   ⚠ " + f + " 이 " + newestName + " 보다 오래됐습니다 — tools\\build.ps1 을 다시 돌리세요");
    }
});

// 배포 전 반드시 바꿔야 하는 스위치는 '경고'로만 알립니다
const emg = APP.match(/const EMERGENCY_MODE = '(\w+)'/);
if (emg && emg[1] !== "live") {
    console.log("\n   ⚠ EMERGENCY_MODE = '" + emg[1] + "' — 실제 배포 전에 'live' 로 바꿔야 119/109 가 걸립니다");
}
// OSM 타일 서버는 "앱을 여러 사람에게 배포해서 쓰는 것"을 이용약관에서 금지합니다.
// 키 없이 뿌리면 약관 위반이고, 막히면 캠퍼스 산책 지도가 중간에 멈춥니다.
const mapDefault = CAMPUS_SRC.match(/mapProvider = "(\w+)"/);
if (mapDefault && mapDefault[1] === "osm") {
    console.log("   ⚠ 지도 기본값이 OSM 입니다 — 여러 사람에게 배포하려면 MapTiler/Mapbox 키가 필요합니다");
}

// =====================================================================
section("5. 접근성");
// =====================================================================
const CSS = fs.readFileSync(path.join(ROOT, "www/css/style.css"), "utf8");

// 글자 크기 — 저시력 학생이 읽을 수 있는 최소선
const tooSmall = (CSS.match(/font-size:\s*0\.\d+rem/g) || [])
    .filter(d => parseFloat(d.match(/0\.\d+/)[0]) < 0.75);
ok(tooSmall.length === 0, "12px 미만 글자 크기 선언 없음",
   tooSmall.length ? tooSmall.slice(0, 5).join(", ") + " …" : "");

// 대비가 모자랐던 색이 되돌아오지 않았는지
const BAD_COLORS = ["#a2977f", "#a89d88", "#ff7a30", "#b8860b", "#8a8375",
                    "#8a7f6a", "#8c8271", "#c8bfe0", "#8a80c4", "#7a70b8",
                    "#bd5a24", "#6b6f7d", "#4b3ea8", "#7c7669", "#7e7663", "#3d9a6f"];
const back = BAD_COLORS.filter(c => new RegExp(c, "i").test(CSS));
ok(back.length === 0, "대비 미달이던 색이 되돌아오지 않음", back.join(", "));

// 움직임 줄이기 · 키보드 포커스
ok(/@media \(prefers-reduced-motion: reduce\)[\s\S]{0,400}animation-duration:\s*0\.01ms/.test(CSS),
   "동작 줄이기를 켠 기기에서 애니메이션이 멈춤");
ok(/:focus-visible[\s\S]{0,120}outline:\s*3px/.test(CSS),
   "키보드로 이동할 때 지금 위치가 보임");
ok(/min-height:\s*44px/.test(CSS), "작은 버튼에 최소 터치 높이 44px");

// 아이콘만 있는 버튼에 이름이 붙어 있는지
const HTML = fs.readFileSync(path.join(ROOT, "www/index.html"), "utf8");
const CAMPUS = fs.readFileSync(path.join(ROOT, "www/js/campus.js"), "utf8");
const emptyBtn = (HTML.match(/<button[^>]*>\s*<\/button>/g) || [])
    .filter(b => !/aria-label/.test(b));
ok(emptyDone(emptyBtn), "내용 없는 버튼에 모두 이름이 있음", emptyBtn.join(" "));
function emptyDone(a) { return a.length === 0; }
ok(/data-dir="up"[^>]*aria-label/.test(CAMPUS), "캠퍼스 방향 버튼에 이름이 있음");

// 인터넷이 끊겼을 때 한글이 깨지지 않도록
ok(/Apple SD Gothic Neo/.test(CSS) && /Malgun Gothic/.test(CSS),
   "폰트 CDN 이 막혀도 한글이 보이는 대체 글꼴 있음");

// =====================================================================
console.log("\n" + "═".repeat(52));
if (fail === 0) {
    console.log("✅ " + pass + "개 항목 모두 통과");
} else {
    console.log("❌ " + fail + "개 실패 / " + (pass + fail) + "개 중\n");
    fails.forEach(f => console.log("   • " + f));
}
console.log("═".repeat(52));
process.exit(fail === 0 ? 0 : 1);

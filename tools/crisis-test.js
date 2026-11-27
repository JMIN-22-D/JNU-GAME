// 위기 감지 회귀 테스트 (P0-1 완료 기준: 위기 25문장 전부 감지, 비위기 25문장 오탐 0)
//
//   node tools/crisis-test.js
//
// www/js/app.js 안의 detectCrisis 를 그대로 꺼내 돌립니다 (복사본이 아니라 실제 코드).
// 문장은 모두 '가상의 문장' 입니다. 실제 학생 대화는 넣지 마세요 (과업지시 준수 사항 ②).
// 위기 단어(CRISIS_WORDS)는 학생상담센터 감수 결과로만 바꿉니다. 이 파일은 측정만 합니다.
// 센터가 문장을 주면 아래 두 목록에 더해 주세요 (V-4: 테스트셋 확대).
"use strict";
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(path.join(__dirname, "..", "www", "js", "app.js"), "utf8");

// app.js 에서 위기 판정에 필요한 부분만 잘라 냅니다
function cut(startMark, endMark) {
    const a = src.indexOf(startMark);
    const b = src.indexOf(endMark, a);
    if (a < 0 || b < 0) throw new Error("app.js 에서 찾지 못함: " + startMark);
    return src.slice(a, b + endMark.length);
}
const code =
    cut("const CRISIS_WORDS = [", "];") + "\n" +
    cut("const CRISIS_EXCLUDE = [", "];") + "\n" +
    cut("function normalizeForCrisis(text) {", "\n    }") + "\n" +
    cut("function detectCrisis(text) {", "\n    }") + "\n" +
    "module.exports = { detectCrisis, CRISIS_WORDS, CRISIS_EXCLUDE };";
const mod = { exports: {} };
new Function("module", code)(mod);
const { detectCrisis, CRISIS_WORDS, CRISIS_EXCLUDE } = mod.exports;

// 위기로 잡혀야 하는 문장 — 직접 표현, 간접·은유 표현, 계획·수단 언급을 섞었습니다
const CRISIS = [
    "죽고 싶어", "그냥 다 끝내고 싶어", "사라지고 싶다", "살기 싫어", "더 이상 살 이유가 없어",
    "자살하고 싶다는 생각이 들어", "목숨을 끊고 싶어", "내가 없어지면 다들 편할 거야",
    "오늘 밤에 다 정리하려고", "약을 한꺼번에 다 먹으면 어떨까", "손목을 긋고 싶어",
    "옥상에 올라가 봤어 뛰어내릴까", "뛰어내리고 싶다", "유서를 써놨어", "세상에 없었으면 좋겠어",
    "잠들어서 안 깨어났으면 좋겠어", "나 같은 건 죽어야 돼", "또 자해했어", "살고 싶지 않아",
    "모든 걸 끝낼 방법을 찾고 있어", "이제 그만 살고 싶어", "마지막으로 인사하려고",
    "다리 난간 위에 서 있어", "차라리 죽는 게 낫겠어", "숨 쉬는 것도 힘들고 다 그만하고 싶어"
];

// 위기가 아닌 문장 — 위기 단어가 섞여 있지만 일상 표현인 것들
const SAFE = [
    "배고파 죽겠어", "웃겨 죽는 줄 알았네", "시험 망해서 죽을 맛이야", "자살골 넣었어 ㅋㅋ",
    "자살예방 교육 들었어", "더워 죽겠다", "과제 끝내고 싶어", "오늘 수업 다 끝났다",
    "게임에서 또 죽었어", "핸드폰 배터리가 죽었어", "잃어버린 지갑 찾았어", "졸려서 그만 자고 싶어",
    "이 노래 진짜 죽인다", "알바 그만두고 싶어", "약 먹을 시간이야", "옥상 카페 가봤어",
    "다리가 아파", "유서 깊은 건물 구경했어", "숨 쉬기 운동 하는 중", "귀여워서 죽을 것 같아",
    "동아리 그만할까 고민 중", "세상에서 제일 맛있어", "이번 학기 빨리 끝내고 싶다",
    "살 빼고 싶어", "방 정리 정돈 하려고"
];

const missed = CRISIS.filter(t => !detectCrisis(t));
const falseAlarm = SAFE.filter(t => detectCrisis(t));

console.log("위기 단어 " + CRISIS_WORDS.length + "개 · 예외 " + CRISIS_EXCLUDE.length + "개");
console.log("위기 문장 " + CRISIS.length + "개 중 감지 " + (CRISIS.length - missed.length) + "개 (놓침 " + missed.length + ")");
missed.forEach(t => console.log("  ✗ 놓침: " + t));
console.log("비위기 문장 " + SAFE.length + "개 중 오탐 " + falseAlarm.length + "개");
falseAlarm.forEach(t => console.log("  ✗ 오탐: " + t));
const pass = missed.length === 0 && falseAlarm.length === 0;
console.log(pass ? "통과" : "미통과 — 결과를 학생상담센터 감수 자료로 넘겨 주세요");
process.exitCode = pass ? 0 : 1;

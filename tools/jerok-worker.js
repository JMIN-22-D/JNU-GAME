/* =====================================================================
   제록이 대화 — AI 중계 서버 (Cloudflare Workers 용)
   ---------------------------------------------------------------------
   ■ 이게 왜 필요한가
     이 앱은 HTML 파일 하나로 돌아갑니다. 그 안에 API 키를 적으면
     앱을 받은 사람 누구나 키를 꺼내 쓸 수 있어요. 요금이 새거나
     계정이 정지됩니다. 그래서 키는 여기(서버)에만 두고, 앱은 이
     주소로만 말을 겁니다.

   ■ 무료로 쓰는 법 (5분)
     1) https://aistudio.google.com/apikey 에서 Gemini API 키를 받습니다.
        (개인 사용 무료 등급이 있습니다)
     2) https://dash.cloudflare.com → Workers & Pages → Create Worker
     3) 이 파일 내용을 통째로 붙여넣고 Deploy
     4) Settings → Variables → Secret 에 GEMINI_KEY 이름으로 키를 넣습니다
     5) 배포된 주소(https://xxx.workers.dev)를 복사해서
        www/js/app.js 의 JEROK_AI_ENDPOINT 에 붙여넣습니다

   ■ 안전장치
     - 앱에서 위기 표현이 감지되면 여기까지 오지도 않습니다.
       (기기 안에서 먼저 걸러 109 안내를 띄웁니다)
     - 그래도 혹시 몰라 여기서 한 번 더 봅니다.
     - 시스템 프롬프트로 진단·처방·약 이야기를 막습니다.
     - 답이 길어지지 않게 자릅니다.
   ===================================================================== */

// 앱을 올려둔 주소만 허용합니다. 배포 주소로 바꿔주세요.
// 로컬에서 열어보는 file:// 는 Origin 이 "null" 로 옵니다.
const ALLOWED = [
    "http://localhost:5173",
    "https://jmin-22.github.io",
    "null"
];

// 여기 걸리면 AI 를 부르지 않고 규칙 기반으로 돌려보냅니다.
// 앱에서 이미 거르지만, 서버에서도 한 번 더 봅니다.
const CRISIS = [
    "죽고싶", "죽고 싶", "자살", "자해", "목숨을 끊", "사라지고싶", "사라지고 싶",
    "없어지고싶", "살기싫", "살기 싫", "죽어버리", "뛰어내리", "유서",
    "그만 살고 싶", "다 끝내고 싶", "더 이상 못 버티", "한계인 것 같"
];

const SYSTEM = `당신은 '제록이'입니다. 제주대학교 학생복지과의 마음쉼터 앱에서
학생의 이야기를 들어주는 노루 캐릭터예요.

지켜야 할 것:
- 상담 선생님이 아니라 '이야기 친구'입니다. 진단하거나 처방하지 마세요.
- 병명, 약 이름, 복용법을 말하지 마세요.
- 조언을 밀어붙이지 말고, 먼저 듣고 공감하세요.
- 2~3문장으로 짧게. 길게 설교하지 마세요.
- 반말 금지. 편안한 존댓말을 쓰세요.
- 학생을 판단하거나 다그치지 마세요. "그래도", "하지만"으로 시작하지 마세요.
- 힘들다는 말에 해결책을 바로 주지 말고, 어떤 마음인지 한 번 더 물어보세요.
- 필요할 때만 제주대 학생상담센터(무료)를 부드럽게 권하세요.
- 자해·자살 이야기가 나오면 답하지 말고 "지금은 109에 연락해 주세요"라고만 하세요.
- 이모지는 한 문장에 최대 하나.

말투 예시:
"그런 일이 있었군요. 그 상황에서 제일 힘들었던 건 뭐였어요?"
"혼자 담아두기 무거웠겠어요."
"오늘 여기까지 온 것만으로 충분히 잘한 거예요."`;

export default {
    async fetch(request, env) {
        const origin = request.headers.get("Origin") || "";
        const cors = {
            "Access-Control-Allow-Origin": ALLOWED.includes(origin) ? origin : ALLOWED[0],
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Max-Age": "86400"
        };

        if (request.method === "OPTIONS") return new Response(null, { headers: cors });
        if (request.method !== "POST") {
            return json({ error: "POST only" }, 405, cors);
        }
        if (origin && !ALLOWED.includes(origin)) {
            return json({ error: "origin not allowed" }, 403, cors);
        }

        let body;
        try { body = await request.json(); }
        catch (e) { return json({ error: "bad json" }, 400, cors); }

        const message = String(body.message || "").slice(0, 500);
        if (!message.trim()) return json({ reply: null }, 200, cors);

        // 위기 표현이면 AI 를 부르지 않습니다
        const flat = message.replace(/\s/g, "");
        if (CRISIS.some(w => flat.includes(w.replace(/\s/g, "")))) {
            return json({ reply: null, crisis: true }, 200, cors);
        }

        if (!env.GEMINI_KEY) return json({ reply: null, error: "no key" }, 200, cors);

        // 앞선 대화 몇 마디를 같이 보내면 말이 이어집니다
        const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
        const contents = [];
        history.forEach(h => {
            if (!h || !h.text) return;
            contents.push({
                role: h.who === "bot" ? "model" : "user",
                parts: [{ text: String(h.text).slice(0, 400) }]
            });
        });
        contents.push({ role: "user", parts: [{ text: message }] });

        try {
            const url = "https://generativelanguage.googleapis.com/v1beta/models/" +
                        "gemini-2.0-flash:generateContent?key=" + env.GEMINI_KEY;
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 8000);

            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: ctrl.signal,
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: SYSTEM }] },
                    contents: contents,
                    generationConfig: {
                        temperature: 0.85,
                        maxOutputTokens: 220,
                        topP: 0.9
                    },
                    // 자해·위험 주제는 모델 쪽에서도 막아둡니다
                    safetySettings: [
                        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                        { category: "HARM_CATEGORY_HARASSMENT",        threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                        { category: "HARM_CATEGORY_HATE_SPEECH",       threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
                    ]
                })
            });
            clearTimeout(timer);

            if (!res.ok) return json({ reply: null, error: "upstream " + res.status }, 200, cors);

            const data = await res.json();
            let reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
            reply = reply.trim();

            // 너무 길면 두 문장까지만
            if (reply.length > 220) {
                const cut = reply.slice(0, 220);
                const last = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("?"), cut.lastIndexOf("!"));
                reply = last > 60 ? cut.slice(0, last + 1) : cut;
            }
            // 답 안에 위험한 말이 섞이면 버립니다 (앱이 규칙 기반으로 돌아갑니다)
            const rf = reply.replace(/\s/g, "");
            if (CRISIS.some(w => rf.includes(w.replace(/\s/g, "")))) {
                return json({ reply: null, filtered: true }, 200, cors);
            }

            return json({ reply: reply || null }, 200, cors);
        } catch (e) {
            return json({ reply: null, error: "failed" }, 200, cors);
        }
    }
};

function json(obj, status, cors) {
    return new Response(JSON.stringify(obj), {
        status: status,
        headers: Object.assign({ "Content-Type": "application/json" }, cors)
    });
}

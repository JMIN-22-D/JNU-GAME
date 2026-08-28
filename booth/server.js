/**
 * 2026 제주대학교 통합체전 인생네컷 - 부스 서버
 *
 * 구조: 부스 노트북에서 24시간 켜두고, ngrok 으로 외부에 연다.
 *   - 아이패드(키오스크) : ngrok https 주소로 접속 -> 촬영
 *   - 방문객 휴대폰(LTE) : 아이패드에 뜬 일회성 QR 스캔 -> 사진 수령
 *
 * 실행 전 준비
 *   1) Node.js 설치 (https://nodejs.org  LTS)
 *   2) 이 폴더에서  npm install
 *   3) npm start            <- 서버가 3000 포트에서 뜬다
 *   4) 다른 창에서  ngrok http 3000
 *   5) ngrok 이 알려주는 https 주소를 아이패드 사파리로 연다
 *
 * ※ 반드시 https 주소로 접속해야 한다.
 *   iOS 사파리는 https 가 아니면 카메라를 열어주지 않는다.
 *   ngrok 주소는 https 이므로 그대로 쓰면 된다.
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 사진 보관 시간. 지나면 자동 삭제한다 (초상권)
const KEEP_MINUTES = 30;
// 토큰을 쓴 뒤 "이미 받아감" 안내를 띄워줄 기간
const USED_KEEP_MINUTES = 120;

// ngrok 뒤에 있으므로 프로토콜/호스트를 헤더에서 읽어야 한다
app.set('trust proxy', true);

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

app.use(express.static(path.join(__dirname, 'public'), {
  // 부스에서 코드를 고치면 아이패드가 새로고침만으로 반영되게 한다
  setHeaders: (res) => res.setHeader('Cache-Control', 'no-store')
}));

/* ───────── 토큰 저장소 ─────────
   서버를 계속 켜두는 구조라 메모리로 충분하다.
   ※ 서버를 재시작하면 발급된 QR 은 모두 무효가 된다. 행사 중에는 끄지 말 것. */
const tokenDB = new Map();   // token -> { filePath, isUsed, createdAt, usedAt }

/* QR 은 담기는 글자가 길수록 촘촘해져서 카메라가 못 읽는다.
   ngrok 주소만 40자 가까이 되므로 토큰은 짧게 만든다.
   (UUID 36자를 쓰면 QR 이 한 단계 더 커져 인식률이 떨어진다) */
const ID_CHARS = 'abcdefghijkmnpqrstuvwxyz23456789';   // 헷갈리는 l,o,0,1 제외
function makeToken() {
  let s = '';
  for (let i = 0; i < 8; i++) s += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)];
  return tokenDB.has(s) ? makeToken() : s;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.jpg')
});
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }
});

/** 요청 헤더에서 지금 접속 중인 주소를 그대로 읽는다.
 *  ngrok 주소는 켤 때마다 바뀌므로 하드코딩하지 않는다. */
function baseUrl(req) {
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0].trim();
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

/** 만료된 사진과 다 쓴 토큰을 정리한다 */
function sweep() {
  const now = Date.now();
  for (const [token, rec] of tokenDB) {
    const age = now - rec.createdAt;
    const expired = age > KEEP_MINUTES * 60 * 1000;
    const usedLongAgo = rec.isUsed && (now - (rec.usedAt || rec.createdAt)) > USED_KEEP_MINUTES * 60 * 1000;

    if (expired || usedLongAgo) {
      if (rec.filePath) fs.promises.unlink(rec.filePath).catch(() => {});
      if (usedLongAgo || expired) tokenDB.delete(token);
    }
  }
}
setInterval(sweep, 60 * 1000).unref();

/* ───────── [1] 사진 업로드 → 일회성 토큰 발급 ───────── */
app.post('/api/upload', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '사진이 없습니다.' });

  const token = makeToken();
  tokenDB.set(token, {
    filePath: req.file.path,
    isUsed: false,
    createdAt: Date.now()
  });

  console.log(`  발급  ${token}  (${Math.round(req.file.size / 1024)} KB)  보관중 ${tokenDB.size}건`);

  // QR 에 담을 짧은 주소. 실제 파일 전송은 아래 /api/download 가 한다.
  res.json({
    success: true,
    token,
    url: `${baseUrl(req)}/d/${token}`,
    keepMinutes: KEEP_MINUTES
  });
});

/* ───────── [2] QR 스캔 시 열리는 안내 페이지 ─────────
   여기서는 토큰을 소모하지 않는다.
   QR 스캐너 앱이나 카톡·인스타 인앱 브라우저가 링크를 미리 불러오는 일이 흔한데,
   페이지를 여는 것만으로 소모시키면 정작 학생은 사진을 못 받고
   "이미 받아감" 만 보게 된다. 그래서 버튼을 눌렀을 때만 소모한다. */
app.get('/d/:token', (req, res) => {
  const rec = tokenDB.get(req.params.token);
  const state = !rec ? 'expired' : rec.isUsed ? 'used' : 'ready';
  res.set('Cache-Control', 'no-store').type('html').send(claimPage(state, req.params.token));
});

/* ───────── [3] 실제 수령 (여기서 1회만 소모) ───────── */
app.get('/api/download/:token', (req, res) => {
  const token = req.params.token;
  const rec = tokenDB.get(token);

  res.set('Cache-Control', 'no-store');

  if (!rec) {
    return res.status(404).json({ error: 'expired', message: '사진이 만료되었습니다.' });
  }
  if (rec.isUsed) {
    return res.status(410).json({ error: 'used', message: '이미 다운로드된 사진입니다.' });
  }
  if (!fs.existsSync(rec.filePath)) {
    tokenDB.delete(token);
    return res.status(404).json({ error: 'expired', message: '사진이 만료되었습니다.' });
  }

  // 동시에 두 번 눌려도 두 번째가 막히도록, 파일을 보내기 전에 먼저 표시한다
  rec.isUsed = true;
  rec.usedAt = Date.now();

  console.log(`  수령  ${token}`);

  res.sendFile(rec.filePath, { headers: { 'Content-Type': 'image/jpeg' } }, (err) => {
    if (err) {
      console.error('  전송 실패', token, err.message);
      return;
    }
    // 받아간 뒤에는 원본을 남기지 않는다 (초상권)
    fs.promises.unlink(rec.filePath).catch(() => {});
    rec.filePath = null;
  });
});

/* 부스 화면이 "이 서버에 업로드 기능이 있는지" 를 이걸로 판별한다.
   404 가 아니면 업로드 가능으로 보고 폴더 연결 설정을 숨긴다. */
app.get('/api/upload', (req, res) => {
  res.set('Allow', 'POST').status(405).json({ error: 'method' });
});

/* 부스 화면에서 상태를 확인할 때 쓴다 */
app.get('/api/status', (req, res) => {
  res.json({ base: baseUrl(req), pending: tokenDB.size, keepMinutes: KEEP_MINUTES });
});

function claimPage(state, token) {
  const body = {
    ready: `<p class="sub">아래 버튼을 누르면 사진을 받을 수 있어요.</p>
            <button id="get">사진 받기</button>
            <p class="warn">이 QR 은 <b>한 번만</b> 사용할 수 있습니다.</p>`,
    used: `<p class="sub big">이미 다운로드된 사진입니다.</p>
           <p class="warn">일회성 QR 이라 다시 받을 수 없습니다.<br>부스에서 다시 촬영해 주세요.</p>`,
    expired: `<p class="sub big">사진을 찾을 수 없습니다.</p>
              <p class="warn">사진은 촬영 후 ${KEEP_MINUTES}분간만 보관됩니다.<br>부스에서 다시 촬영해 주세요.</p>`
  }[state];

  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>인생네컷 받기</title><style>
*{box-sizing:border-box}
body{margin:0;background:#05100d;color:#fff;text-align:center;
 font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;
 padding:34px 18px calc(40px + env(safe-area-inset-bottom,0px))}
h1{margin:0 0 6px;font-size:19px;font-weight:900;color:#12e3a6}
.sub{margin:0 0 22px;font-size:15px;color:rgba(255,255,255,.78);line-height:1.7}
.sub.big{font-size:18px;font-weight:800;color:#fff;margin-top:26px}
.warn{margin:18px 0 0;font-size:13px;color:rgba(255,255,255,.55);line-height:1.8}
button{border:0;border-radius:999px;padding:17px 40px;font-size:17px;font-weight:800;
 background:#12e3a6;color:#04231d;font-family:inherit}
button:active{transform:scale(.97)} button:disabled{opacity:.5}
img{max-width:100%;border-radius:12px;display:block;margin:22px auto 0;
 box-shadow:0 10px 40px rgba(0,0,0,.55)}
.tip{margin:20px auto 0;max-width:420px;font-size:13.5px;line-height:1.9;
 color:rgba(255,255,255,.65);background:rgba(255,255,255,.06);
 border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:14px 16px}
.tip b{color:#fff}
</style></head><body>
<h1>2026 제주대학교 통합체전</h1>
<div id="box">${body}</div>
<script>
var btn=document.getElementById('get');
if(btn)btn.addEventListener('click',async function(){
  btn.disabled=true;btn.textContent='받는 중...';
  try{
    var r=await fetch('/api/download/${token}');
    if(!r.ok){
      var m=r.status===410?'이미 다운로드된 사진입니다.'
           :r.status===404?'사진이 만료되었습니다.':'사진을 받지 못했습니다.';
      document.getElementById('box').innerHTML=
        '<p class="sub big">'+m+'</p><p class="warn">부스에서 다시 촬영해 주세요.</p>';
      return;
    }
    var url=URL.createObjectURL(await r.blob());
    document.getElementById('box').innerHTML=
      '<img src="'+url+'" alt="인생네컷">'+
      '<div class="tip"><b>아이폰</b> — 사진을 꾹 누르고 <b>사진에 추가</b><br>'+
      '<b>안드로이드</b> — 사진을 꾹 누르고 <b>이미지 다운로드</b><br>'+
      '<span style="color:rgba(255,255,255,.45)">이 화면을 벗어나면 다시 받을 수 없어요</span></div>';
  }catch(e){ btn.disabled=false;btn.textContent='다시 시도'; }
});
</script></body></html>`;
}

app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  부스 서버 실행 중');
  console.log(`  로컬   : http://localhost:${PORT}`);
  console.log(`  사진   : ${uploadDir}  (${KEEP_MINUTES}분 뒤 자동 삭제)`);
  console.log('');
  console.log(`  다음 단계: 다른 창에서  ngrok http ${PORT}`);
  console.log('  ngrok 이 알려주는 https 주소를 아이패드 사파리로 여세요.');
  console.log('');
});

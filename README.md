# 제록이의 마음쉼터

제주대학교 생명존중 학생지원포털. Capacitor로 감싼 Android / iOS 앱입니다.

---

## 프로젝트 구조

```
├── www/                       ← 앱 본체 (Capacitor webDir)
│   ├── index.html
│   ├── css/style.css
│   ├── js/native.js           ← Capacitor 연동 (app.js보다 먼저 로드)
│   ├── js/app.js              ← 앱 로직 전체
│   └── assets/                ← splash.jpg, logo.jpg
├── resources/                 ← 아이콘·스플래시 원본 (아래 "에셋" 참고)
├── capacitor.config.json
├── package.json
└── jeju_life_support_portal (6).html   ← 분리 전 원본 (보관용)
```

`www/`만 앱에 들어갑니다. 원본 단일 HTML은 참고용으로 남겨둔 것이라 빌드에 영향을 주지 않습니다.

### native.js가 하는 일

웹 브라우저로 열면 아무 것도 하지 않고 빠져나가고, 네이티브에서만 동작합니다.

| 기능 | 이유 |
|---|---|
| `window.storage` → Preferences | iOS WKWebView의 localStorage는 저장공간이 부족하면 OS가 지웁니다. 복약 기록이 사라지면 안 되므로 UserDefaults/SharedPreferences로 옮겼습니다. |
| 네이티브 스플래시 숨김 | 앱 자체 `#splash-view`가 이어받도록 |
| 상태표시줄 색 | 앱 배경(크림색)에 맞춤 |
| 하드웨어 뒤로가기 | 기본값은 앱 종료. 열린 화면을 위에서부터 닫고, 남은 게 없을 때만 종료 |

---

## 개발 환경 준비 (최초 1회)

Capacitor 8 기준 요구사항입니다.

| 도구 | 최소 버전 | 비고 |
|---|---|---|
| Node.js | **22 이상** | 필수 |
| Android Studio | **2025.2.1 이상** | JDK를 알아서 같이 깔아줍니다 (별도 설치 불필요) |
| Xcode | **26.0 이상** | iOS 빌드에만 필요. **macOS 전용** |

Windows에서 설치:

```bash
winget install OpenJS.NodeJS.LTS Google.AndroidStudio
```

설치 후 터미널을 새로 열어 확인:

```bash
node --version
```

Android Studio는 첫 실행 시 SDK 다운로드 마법사를 끝까지 진행해야 합니다. `Android SDK Platform 36`과 `Android SDK Build-Tools`가 포함되어야 합니다.

---

## 프로젝트 셋업 (최초 1회)

```bash
npm install
```

```bash
npx cap add android
```

macOS에서만:

```bash
npx cap add ios
```

---

## 개발 중 반복 작업

`www/` 안의 파일을 고친 뒤 네이티브로 반영:

```bash
npx cap sync
```

브라우저에서 빠르게 확인만 할 때 (카메라·센서는 동작하지 않음):

```bash
npm run serve
```

Android Studio 열기:

```bash
npx cap open android
```

---

## 에셋: 아이콘과 스플래시

`resources/` 에 원본 두 장을 넣고 생성기를 돌리면 모든 해상도가 자동으로 만들어집니다.

| 파일 | 크기 | 설명 |
|---|---|---|
| `resources/icon.png` | 1024 × 1024 | 앱 아이콘. 투명 배경 없이 꽉 채울 것 |
| `resources/splash.png` | 2732 × 2732 | 정사각형. 중앙 안전영역(가운데 1200×1200) 안에만 내용을 배치 |

```bash
npm run assets
```

> **현재 상태:** `www/assets/logo.jpg`는 160×160이라 아이콘 원본으로 쓰기엔 너무 작습니다.
> 확대하면 심하게 뭉개져서 스토어 심사에서 지적받습니다. 1024×1024 원본이 필요합니다.

---

## 네이티브 권한 설정

`cap add` 이후 아래를 직접 추가해야 합니다. 넣지 않으면 카메라가 검은 화면으로 뜹니다.

### Android — `android/app/src/main/AndroidManifest.xml`

`<manifest>` 바로 아래에 추가:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
```

전화 걸기 버튼(`tel:`)은 별도 권한이 필요 없습니다. 다이얼러를 띄우기만 하고 직접 걸지 않기 때문입니다.
(`CALL_PHONE` 권한은 넣지 마세요. 필요도 없고 심사에서 소명을 요구받습니다.)

### iOS — `ios/App/App/Info.plist`

```xml
<key>NSCameraUsageDescription</key>
<string>약을 챙겨 드셨는지 사진으로 기록하기 위해 카메라를 사용합니다. 사진은 기기에만 저장되며 전송되지 않습니다.</string>
<key>NSMotionUsageDescription</key>
<string>걷기 미션의 걸음 수를 세기 위해 동작 센서를 사용합니다.</string>
```

---

## 배포 전 필수 체크리스트

### 1. 긴급 연락처를 실번호로 전환 — **가장 중요**

`www/js/app.js` 상단:

```js
const EMERGENCY_TEST_MODE = true;   // ← 배포 빌드에서는 반드시 false
```

`true`인 동안은 119 · 112 · 109 버튼이 전부 개발용 테스트 번호(`01093802846`)로 연결되고, 버튼 라벨에 "(테스트)"가 붙습니다. `false`로 바꾸면 실제 번호로 연결되고 라벨의 표시도 사라집니다.

HTML의 `href`에는 처음부터 진짜 번호가 박혀 있고 테스트 모드일 때만 JS가 덮어씁니다. 스크립트가 실행되지 않는 상황에서도 실제 긴급번호로 걸리는 쪽이 안전하기 때문입니다.

바꾼 뒤 실기기에서 **반드시 한 번은** 세 버튼을 눌러 다이얼러에 뜨는 번호를 눈으로 확인하세요. (통화 버튼은 누르지 말 것)

### 2. 앱 식별자 확정

`capacitor.config.json`의 `appId`가 현재 `kr.ac.jejunu.jeroki`입니다.
**스토어에 한 번 올리면 영원히 바꿀 수 없습니다.** 학생복지과 명의로 갈지 확정한 뒤 결정하세요.

### 3. 개인정보처리방침 URL

양대 스토어 모두 **공개된 URL**을 요구합니다. 초안은 [docs/PRIVACY.md](docs/PRIVACY.md)에 있고, 웹에 올린 뒤 그 주소를 스토어 콘솔에 넣어야 합니다.

### 4. 서명 키 보관

Android 업로드 키(`.keystore`)를 잃어버리면 **앱 업데이트를 영영 못 올립니다.** `.gitignore`에 이미 제외해 두었으니, 별도로 안전한 곳에 백업하세요.

### 5. 알려진 개선 과제

- **Google Fonts를 CDN에서 불러옵니다.** 오프라인이면 폰트가 깨지고, 실행할 때마다 외부(Google)로 접속이 발생해 개인정보처리방침에 명시해야 합니다. 폰트 파일을 `www/assets/fonts/`에 직접 넣는 편이 좋습니다.
- **복약 사진을 Preferences에 저장합니다.** 14일치 × 장당 30~60KB면 약 1MB인데, Preferences는 통째로 메모리에 올라갑니다. 사진은 `@capacitor/filesystem`으로 옮기고 Preferences에는 파일 경로만 두는 편이 안전합니다.

---

## 스토어 심사 주의사항

이 앱은 자살예방·정신건강을 다루므로 **양대 스토어 모두 민감 카테고리로 분류**합니다.

- **Apple** — App Review Guideline 1.4.1 및 5.1.1. 의학적 정보를 다루는 앱은 출처와 운영 주체를 밝혀야 하고, 위기 상황 안내가 정확해야 합니다. 개인 개발자 계정이면 기관 연계 증빙을 추가로 요구받는 경우가 많습니다.
- **Google Play** — 건강 관련 앱 정책 및 민감한 이벤트 정책. 데이터 보안 양식(Data safety)에 수집 항목을 정확히 신고해야 합니다. 이 앱은 **모든 데이터가 기기에만 저장되고 전송되지 않으므로** "데이터를 수집하지 않음"으로 신고 가능하지만, 카메라·센서 사용은 명시해야 합니다.
- **Google Play 비공개 테스트 의무** — 개인 개발자 계정으로 새로 만든 앱은 정식 출시 전 **테스터 20명이 14일 연속 참여**해야 합니다. 조직(기관) 계정은 면제됩니다. 학생복지과 명의로 가면 이 단계를 건너뛸 수 있어 출시가 몇 주 빨라집니다.

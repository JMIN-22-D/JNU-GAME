# 단과대 프레임 추가하는 법

## 파일 이름 규칙

```
assets/frames/<단과대id>-4cut.jpg
assets/frames/<단과대id>-3cut.jpg
```

`<단과대id>` 는 `index.html` 의 `COLLEGES` 목록에 있는 `id` 입니다.

| id | 이름 | | id | 이름 |
|---|---|---|---|---|
| `chonghak` | 총학생회 (기본) | | `suui` | 수의대 |
| `ganho` | 간호대 | | `yakdae` | 약대 |
| `gyeongsang` | 경상대 | | `yedi` | 예디대 |
| `gongkwa` | 공과대 | | `uikwa` | 의과대 |
| `gyodae` | 교대 | | `inmun` | 인문대 |
| `sabeom` | 사범대 | | `jayeon` | 자연대 |
| `sahoe` | 사회대 | | `jayu` | 자유전공 |
| `saengmyeong` | 생명대 | | `haeyang` | 해양대 |

예) 인문대 4컷 → `assets/frames/inmun-4cut.jpg`

**목록을 고치려면** `index.html` 의 `COLLEGES` 배열만 수정하면 됩니다.
버튼은 그 배열을 보고 자동으로 만들어집니다.

## 만들 때 지켜야 할 것

1. **크기 800 x 1666** (세로형). 다르면 사진 칸 위치가 어긋납니다.
2. **사진 칸 위치를 총학생회 프레임과 똑같이** 두세요. 디자인만 바꾸고
   흰 칸의 좌표는 건드리지 마세요.

   - 4컷: `(93,348) (410,348) (93,804) (410,804)`, 칸 크기 `299x440` / `296x440`, 모서리 `12`
   - 3컷: `(98,317) (98,678) (98,1040)`, 칸 크기 `605x341` / `605x342` / `605x343`, 모서리 `10`

   칸을 옮기고 싶으면 옮겨도 됩니다. 아래 도구가 알아서 찾아냅니다.

3. **JPG 로 저장** (품질 88 정도). 한 장에 180KB 안팎이면 적당합니다.
   32장이면 6MB 정도인데, 프레임은 고를 때만 불러오므로 문제없습니다.

가장 쉬운 방법은 `chonghak-4cut.jpg` / `chonghak-3cut.jpg` 를 열어
**배경과 글자만 바꾸고 흰 칸은 그대로 두는** 것입니다.

## 칸 위치가 다른 프레임이 생기면

디자인상 칸을 옮겨야 한다면, `index.html` 의 `SLOT_OVERRIDE` 에 그 프레임만
적어주면 됩니다.

```js
const SLOT_OVERRIDE = {
  'inmun-4cut': [
    { x: 90, y: 400, w: 300, h: 430, r: 9 },
    ...
  ]
};
```

**좌표를 직접 잴 필요는 없습니다.** 아래를 실행하면 크기를 맞춰 저장하고
흰 칸을 찾아 좌표까지 출력해 줍니다. 원본 크기가 800x1666 이 아니어도 됩니다.

```
powershell -ExecutionPolicy Bypass -File tools\add-frame.ps1 -Source "인문대 인생네컷 4.png" -Key inmun-4cut
```

출력된 `slots` 를 그대로 `index.html` 의 `SLOT_OVERRIDE` 에 붙여넣으면 끝입니다.
칸 위치가 총학생회 프레임과 같다면 붙여넣지 않아도 됩니다.

## 아직 파일이 없는 단과대

버튼은 **점선 동그라미**로 흐리게 표시되고, 누르면 총학생회 프레임이 대신 나옵니다.
파일을 넣는 순간 자동으로 그 디자인이 적용됩니다. 한 번에 다 만들지 않아도
부스는 계속 돌아갑니다.

## 넣은 뒤

`deploy` 폴더에도 같은 파일을 복사하고 `git push` 하면 배포됩니다.

```
copy assets\frames\inmun-4cut.jpg deploy\assets\frames\
copy assets\frames\inmun-3cut.jpg deploy\assets\frames\
```

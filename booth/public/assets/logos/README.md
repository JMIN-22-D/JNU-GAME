# 단과대 로고

프레임 고르기 화면의 동그라미 버튼 안에 들어갑니다.

## 파일 이름

```
assets/logos/<단과대id>.png
```

id 는 `assets/frames/README.md` 의 표와 같습니다.
예) 인문대 → `assets/logos/inmun.png`

| id | 이름 | | id | 이름 |
|---|---|---|---|---|
| `chonghak` | 총학생회 | | `suui` | 수의대 |
| `ganho` | 간호대 | | `yakdae` | 약대 |
| `gyeongsang` | 경대 | | `yedi` | 예디대 |
| `gongkwa` | 공대 | | `uikwa` | 의과대 |
| `gyodae` | 교대 | | `inmun` | 인대 |
| `sabeom` | 사범대 | | `jayeon` | 자대 |
| `sahoe` | 사회대 | | `jayu` | 자유전공 |
| `saengmyeong` | 생대 | | `haeyang` | 해대 |

## 만들 때

- **정사각형**, 200x200 px 이상 권장 (동그라미 안에 꽉 차게 들어갑니다)
- **PNG, 배경 투명**
- 동그라미 배경이 **흰색**으로 바뀌므로 로고 색은 무엇이든 괜찮습니다
- 로고 주변 여백은 자동으로 5px 들어갑니다

## 아직 로고가 없으면

파일이 없는 단과대는 지금처럼 **이름 앞 두 글자**가 표시됩니다.
하나씩 넣어도 되고, 안 넣어도 부스는 정상 동작합니다.

## 넣은 뒤

`deploy/assets/logos/` 에도 같은 파일을 복사하고 `git push` 하면 배포됩니다.

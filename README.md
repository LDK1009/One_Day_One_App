# One_Day_One_App

**1일 1앱 챌린지** 저장소. 매일 앱 하나를 만들어 한 프로젝트에 누적합니다.
안드로이드 dev build 를 폰에 한 번 설치해 두고 그 위에서 매일 개발합니다. **스토어 배포·로그인·백엔드 없음.**

```
앱 실행 → 런처(만든 앱 목록) → 카드 탭 → 그날 앱
```

---

## 왜 단일 프로젝트인가

앱마다 레포·프로젝트를 나누면 `node_modules` 가 앱 수만큼 늘어납니다.
이 레포는 **Expo 앱 1개 + 라우트 누적** 구조라 의존성은 언제나 1벌이고,
런처 화면이 자연스럽게 "지금까지 만든 앱" 쇼케이스가 됩니다.

---

## 시작하기

```bash
# 사전 요구: Node ≥ 20.19.4, Expo 계정, 안드로이드 폰
npm install

# 1회만 — dev build APK 만들어 폰에 설치 (10~30분)
eas build --profile development --platform android

# 이후 매일 — 개발 서버만 띄우면 됨
npx expo start --dev-client
```

> **재빌드가 필요한 경우는 네이티브 모듈을 추가·제거했을 때뿐입니다.**
> JS/TS 코드만 바꿀 때는 Fast Refresh 로 즉시 반영됩니다.

### Expo Go 를 안 쓰는 이유
Day 01(포즈 인식)이 `react-native-vision-camera` + TFLite 를 쓰는데 Expo Go 에 없는 네이티브 모듈입니다.
dev build 도 폰에 설치된 앱이라 시연·촬영 방식은 Expo Go 와 동일합니다.

---

## 하루 루틴

```bash
# 1) 앱 생성 (라우트 + 화면 스켈레톤 + 런처 등록까지 한 번에)
node scripts/new-app.js tip-calc "팁 계산기" "금액 나누고 팁까지 한 번에" --icon calculator

# 2) 만들기
#    src/views/day01-tip-calc/Day01TipCalcView.tsx

# 3) 실행 중이면 저장하는 순간 Fast Refresh 로 바로 반영

# 4) 커밋
git add . && git commit -m "✨ Day 01 팁 계산기"
```

### `new-app.js` 인자

| 위치 | 값 | 필수 | 설명 |
|------|-----|------|------|
| 1 | 슬러그 | ✅ | 소문자 케밥. `dayNN-` 접두사는 자동으로 붙습니다 |
| 2 | 제목 | ✅ | 런처 카드 제목 + 화면 헤더 |
| 3 | 설명 | | 카드 한 줄 설명 (릴스 캡션에 재사용) |
| `--icon` | 아이콘 | | MaterialCommunityIcons 이름 · [목록](https://pictogrammers.com/library/mdi/) |
| `--day` | 번호 | | 생략하면 마지막 Day + 1 |

생성물:

```
src/app/(apps)/day01-tip-calc.tsx          # 라우트 (화면 조립만)
src/views/day01-tip-calc/Day01TipCalcView.tsx  # 화면
src/shared/constants/apps.ts               # 런처 목록에 항목 추가
```

---

## 폴더 구조

```
src/
├── app/                        # expo-router 라우트 전용
│   ├── _layout.tsx             #   Provider 트리 (Gesture → SafeArea → Query → Paper)
│   ├── index.tsx               #   → LauncherView
│   └── (apps)/                 #   챌린지 앱 그룹 (헤더 = 런처 복귀)
├── views/
│   ├── launcher/               #   앱 목록 화면
│   └── dayNN-<슬러그>/          #   그날 앱 (_components/_hooks/_store/_utils)
└── shared/
    ├── components/  constants/(apps.ts)  hooks/  lib/  providers/
    ├── store/       theme/    types/     utils/
```

의존성 방향: `app/ → views/ → shared/` (역방향 import 금지)

---

## 스택

| 영역 | 사용 |
|------|------|
| 코어 | Expo SDK 56, React Native 0.85, React 19, expo-router |
| UI | React Native Paper (MD3) + @expo/vector-icons |
| 애니메이션 | Reanimated 4 + worklets, gesture-handler |
| 상태 | Zustand (+persist / MMKV) |
| 서버 상태 | TanStack Query — 공개 API 쓰는 날에 사용 |
| 폼 | react-hook-form + zod |
| 기타 | dayjs, expo-image, expo-haptics, flash-list, bottom-sheet |

**백엔드·인증 없음.** 데이터는 로컬 저장 또는 공개 API 로 해결합니다.

### 테마 토큰

앱마다 인상을 바꾸려면 이 세 파일만 만지면 됩니다.

| 파일 | 내용 |
|------|------|
| `src/shared/theme/colors.ts` | 브랜드 색 + 런처 accent 팔레트 |
| `src/shared/theme/radius.ts` | 라운드 (각지게 ↔ 말랑하게) |
| `src/shared/theme/typography.ts` | 폰트 스케일 (촬영 기준으로 크게 잡음) |

---

## 이미 깔려 있는 네이티브 기능 (재빌드 불필요)

매일 재빌드를 기다리지 않으려고 자주 쓸 모듈을 미리 넣어뒀습니다. **import 만 하면 바로 씁니다.**

| 분류 | 모듈 |
|------|------|
| 센서 | `expo-sensors` (가속도·자이로·지자기·기압·만보계) |
| 카메라·ML | `react-native-vision-camera` + `-resizer`, `react-native-fast-tflite` |
| 미디어 | `expo-audio`, `expo-video`, `expo-image-picker`, `expo-media-library`, `expo-sharing` |
| 위치·기기 | `expo-location`, `expo-battery`, `expo-brightness`, `expo-screen-orientation`, `expo-keep-awake` |
| 인증·음성 | `expo-local-authentication` (지문), `expo-speech` (TTS) |
| 비주얼 | `@shopify/react-native-skia`, `expo-blur`, `expo-linear-gradient`, `reanimated`, `react-native-svg` |
| 저장 | `react-native-mmkv` (zustand persist 엔진) |
| 파일 | `expo-file-system` |

### 재빌드가 필요한 경우

```bash
eas build --profile development --platform android   # 10분 안팎 (arm64 전용)
```

- 위 목록에 **없는 네이티브 모듈**을 추가할 때 (NFC, BLE 등)
- `app.json` 의 플러그인·권한·빌드 설정을 바꿀 때

순수 JS 라이브러리(lodash, zod, 상태관리 등)는 재빌드 없이 즉시 반영됩니다.

---

## 명령어

| 명령 | 설명 |
|------|------|
| `npx expo start --dev-client` | 개발 서버 (매일 쓰는 것) |
| `eas build --profile development --platform android` | dev build 재생성 (네이티브 모듈 변경 시에만) |
| `npm run new-app -- <슬러그> "<제목>"` | 새 앱 생성 |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

---

## 촬영 메모

- 시연은 **런처 → 앱 진입 → 조작 → 런처 복귀** 흐름이 그림이 됩니다. `(apps)` 그룹에 헤더를 켜둔 이유.
- 런처 헤더가 `지금까지 N개` 를 세므로, 회차가 쌓일수록 인트로 자체가 성장 기록이 됩니다.
- Day 0 `샘플 앱` 은 동작 확인용입니다. 챌린지 시작할 때 지워도 됩니다
  (`src/app/(apps)/day00-sample.tsx`, `src/views/day00-sample/`, `apps.ts` 항목).

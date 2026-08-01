# One_Day_One_App — 에이전트 규칙

## 이 레포의 성격

**1일 1앱 챌린지** 저장소. 매일 앱 하나를 만들어 이 레포에 **누적**한다.
릴스 촬영이 목적이라 실기기에서 항상 돌아가는 상태를 유지해야 한다.

- **스토어 배포 안 함.** 개발용 dev build(EAS `development` 프로필)만 만들어 폰에 설치한다.
- **실행 방식은 dev build.** Day 01(포즈 인식)에서 네이티브 모듈이 필요해져 Expo Go 를 벗어났다.
  - 평소 개발: `npx expo start --dev-client` → 설치된 앱에서 Fast Refresh
  - **네이티브 모듈을 추가·제거했을 때만** 재빌드: `eas build --profile development --platform android`
- **백엔드 없음.** Supabase·로그인·서버 DB 사용하지 않는다. 데이터는 zustand persist(AsyncStorage) 또는 메모리.
- **단일 Expo 앱.** 앱마다 프로젝트를 나누지 않고 라우트로 누적한다 (`node_modules` 1개 유지 = 용량 최소).
- **안드로이드 전용.** 개발 PC 가 Windows 라 iOS dev build 는 만들지 않는다.
- `minSdkVersion` 은 26 (vision-camera-resizer 요구사항). 낮추지 말 것.

## Expo 버전 주의

Expo SDK 56 / RN 0.85 / React 19 / TS 6. API 가 최신이라 **추측 금지**.
코드 쓰기 전 https://docs.expo.dev/versions/v56.0.0/ 또는 context7 로 확인할 것.

---

## 새 앱 추가 절차

```bash
node scripts/new-app.js tip-calc "팁 계산기" "금액 나누고 팁까지 한 번에" --icon calculator
```

스크립트가 자동으로 만드는 것:

| 산출물 | 경로 |
|--------|------|
| 라우트 | `src/app/(apps)/dayNN-<슬러그>.tsx` |
| 화면 | `src/views/dayNN-<슬러그>/DayNN<Pascal>View.tsx` |
| 런처 등록 | `src/shared/constants/apps.ts` 배열에 항목 append |

- Day 번호는 레지스트리의 마지막 Day + 1 로 자동 계산. 직접 지정하려면 `--day 7`.
- accent 색은 Day 번호로 자동 순환 (`src/shared/theme/colors.ts` 의 `accents`).
- 아이콘은 MaterialCommunityIcons 이름 (https://pictogrammers.com/library/mdi/).
- **`apps.ts` 를 손으로 편집하지 말 것.** 스크립트가 `APPS_START`/`APPS_END` 마커 사이를 다룬다.

---

## 폴더 구조 & 레이어

```
src/
├── app/                        # expo-router 라우트 전용 (화면 조립만)
│   ├── _layout.tsx             #   Provider 트리
│   ├── index.tsx               #   → LauncherView
│   └── (apps)/                 #   챌린지 앱 그룹 (헤더 있음 = 런처 복귀 가능)
│       └── dayNN-<슬러그>.tsx
├── views/
│   ├── launcher/               # 앱 목록 화면
│   └── dayNN-<슬러그>/          # 그날 앱 화면
│       ├── <Pascal>View.tsx    #   진입 컴포넌트
│       ├── _components/        #   이 앱 전용 컴포넌트
│       ├── _hooks/             #   이 앱 전용 훅
│       ├── _store/             #   이 앱 전용 zustand
│       ├── _utils/             #   이 앱 전용 유틸
│       └── _constants/         #   이 앱 전용 상수
└── shared/                     # 2개 이상 앱이 쓰면 여기로 승격
    ├── components/ hooks/ store/ lib/ providers/ theme/ utils/ constants/ types/
```

**레이어 역할 (침범 금지)**

| 레이어 | 위치 | 역할 | 금지 |
|--------|------|------|------|
| Presentation | `views/**`, `shared/components/` | UI 렌더링 | 데이터 패칭, 유틸·상수 인라인 정의 |
| Application | `views/*/_hooks/`, `shared/hooks/` | 상태 조율·외부 API 호출 | UI 반환 |
| State | `views/*/_store/`, `shared/store/` | 상태 변경만 | 패칭, 비즈니스 로직 |
| Shared | `shared/utils|constants|types/` | 전역 재사용 | 특정 앱 종속 로직 |

**의존성 방향은 단방향:** `app/ → views/ → shared/`. `shared` 가 `views` 를 import 하면 안 된다.

---

## 스타일 규칙

- Paper(MD3) 컴포넌트 우선, 커스텀은 `StyleSheet.create` (인라인 스타일 지양).
- 값 하드코딩 금지 — `@/shared/theme` 의 `spacing` `radius` `fontSize` `fontWeight` `brand` 사용.
- 앱마다 룩을 바꾸고 싶으면 `src/shared/theme/` 토큰 파일만 수정.
- 촬영용이라 폰트 스케일이 기본보다 크다 (`fontSize.xxl = 40`). 화면에서 잘 보이는 크기를 유지할 것.
- 주석은 한국어, 섹션 구분자는 기존 파일 컨벤션(`////////////////////`)을 따른다.

## 하지 말 것

- `typedRoutes` 를 켜지 말 것 — 라우트가 매일 추가되고 런처가 `apps.ts` 의 문자열 경로로 push 하므로 끈 상태가 맞다.
- 앱마다 `package.json`/`app.json` 을 나누지 말 것 (모노레포화 금지 — 의존성 용량 때문에 단일 앱으로 간다).
- 네이티브 모듈은 **꼭 필요할 때만** 추가할 것. 하나 추가할 때마다 재빌드(10~30분)가 걸리고 모든 앱의 번들이 무거워진다.
- SharedValue 는 `.value =` 대신 **`.get()` / `.set()`** 을 쓸 것. React Compiler ESLint(`react-hooks/immutability`)가 `.value` 대입을 에러로 잡는다.
- 이전 Day 앱 코드는 건드리지 말 것. 완성된 날은 그대로 박제한다.

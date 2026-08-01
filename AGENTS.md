# One_Day_One_App — 에이전트 규칙

## 이 레포의 성격

**1일 1앱 챌린지** 저장소. 매일 앱 하나를 만들어 이 레포에 **누적**한다.
릴스 촬영이 목적이라 실기기에서 항상 돌아가는 상태를 유지해야 한다.

- **스토어 배포 안 함.** 개발용 dev build(EAS `development` 프로필)만 만들어 폰에 설치한다.
- **실행 방식은 dev build.** Day 01(포즈 인식)에서 네이티브 모듈이 필요해져 Expo Go 를 벗어났다.
  - 평소 개발: `npx expo start --dev-client` → 설치된 앱에서 Fast Refresh
  - **네이티브 모듈을 추가·제거했을 때만** 재빌드: `eas build --profile development --platform android`
- **백엔드 없음.** Supabase·로그인·서버 DB 사용하지 않는다. 데이터는 zustand persist(MMKV) 또는 메모리.
- **단일 Expo 앱.** 앱마다 프로젝트를 나누지 않고 라우트로 누적한다 (`node_modules` 1개 유지 = 용량 최소).
- **안드로이드 전용.** 개발 PC 가 Windows 라 iOS dev build 는 만들지 않는다.
- `minSdkVersion` 은 26 (vision-camera-resizer 요구사항). 낮추지 말 것.

## Expo 버전 주의

Expo SDK 56 / RN 0.85 / React 19 / TS 6. API 가 최신이라 **추측 금지**.
코드 쓰기 전 https://docs.expo.dev/versions/v56.0.0/ 또는 context7 로 확인할 것.
설치된 패키지의 `node_modules/<pkg>/src/` 를 직접 읽는 게 가장 확실하다 (문서보다 최신).

---

## 빌드·인프라 함정 (겪은 것만 기록)

여기 적힌 건 전부 실제로 부딪혀 해결한 것들이다. 다시 밟지 말 것.

**EAS 빌드**
- `eas build --non-interactive` 는 키스토어가 없으면 **eas-cli 16.x 에서 실패**한다
  (`Generating a new Keystore is not supported in --non-interactive mode`).
  → `npx --yes eas-cli@latest build ...` 로 실행하면 자동 생성된다. 키스토어가 생긴 뒤에는 구버전으로도 된다.
- 빌드 실패 시 `errorCode` 만으로는 원인을 알 수 없다. Gradle 로그를 직접 받아야 한다:
  ```bash
  # ~/.expo/state.json 의 auth.sessionSecret 을 expo-session 헤더로 사용
  # GraphQL: builds { byId(buildId:"...") { logFiles } }  → 서명된 URL
  curl -s --compressed "<logFile URL>" -o build.log   # --compressed 없으면 바이너리로 보인다
  # 각 줄이 JSON, 실제 내용은 .msg 필드
  ```
- `buildArchs: ["arm64-v8a"]` 로 제한해 뒀다 (갤럭시 S21 전용). 에뮬레이터가 필요하면 `x86_64` 를 추가하고 재빌드.

**react-native-vision-camera v5**
- **Expo config plugin 이 없다.** `app.json` 의 `plugins` 에 넣으면 `npx expo config` 자체가 깨진다
  (`Cannot find module .../lib/CameraDevices`). 카메라 권한은 `android.permissions` 로 직접 선언한다.
- v4 와 API 가 완전히 다르다. v5 는 `useCamera` / `useFrameOutput` / `usePreviewOutput` + Nitro 기반.
  프레임 프로세서는 `react-native-vision-camera-worklets` + `react-native-worklets` 를 쓴다
  (worklets-core 아님 — reanimated 4 와 같은 런타임을 공유하므로 충돌 없음).
- 프레임 → 모델 입력 변환은 `react-native-vision-camera-resizer` 를 쓴다 (구 `vision-camera-resize-plugin` 은 v4 용).

**카메라 기반 동작 인식 (Day 01 에서 얻은 것)**
- 프레임은 회전되어 오지 않는다. `useFrameOutput({ enablePhysicalBufferRotation: true })` 를 켜야
  세로(720×1280) 버퍼가 전달된다. 끄면 모델이 "누운 사람"을 보고 점수가 0.1~0.4 로 떨어진다.
- 판정 임계값은 **어깨너비로 정규화**할 것 (카메라 거리 무관). 단 어깨너비 자체가 프레임마다
  0.03~0.50 으로 요동치므로 **EMA 로 평활화**하고 이상값은 버려야 한다.
- 키포인트 신뢰도가 낮은 프레임에서 0 을 반환하면 상태 기계가 오작동한다. **-1(계산 불가)을
  반환하고 그 프레임은 건너뛸 것.**
- 좌·우 손처럼 대칭 동작은 **각각 독립된 상태 기계**로 추적할 것. 양손 max 하나로 묶으면
  한쪽이 뻗어 있는 동안 다른 쪽 판정이 막힌다.
- 정면 지르기에서 **어깨~손목 2D 거리는 늘어나지 않는다** (카메라 쪽으로 뻗으면 투영이 짧아짐).
  손목~골반 거리를 쓸 것. 임계값은 반드시 실측으로 잡는다 — 인체 비율 추정은 빗나간다.
- 전신이 필요한 조건(발 간격 등)은 피할 것. 발목이 프레임에 들어가려면 2~3m 물러나야 해서
  릴스 구도와 충돌한다.

**expo-audio (마이크 녹음)**
- **매니페스트 선언만으로는 녹음이 안 된다.** `app.json` 의 `plugins` 에 `expo-audio` 가 있으면
  `RECORD_AUDIO` 가 매니페스트에 들어가지만, Android 6+ 는 dangerous 권한이라 **런타임 요청이 별도로 필요**하다.
  안 하면 권한 팝업조차 안 뜨고 `prepareToRecordAsync()` 가 조용히 던진다
  (`node_modules/expo-audio/android/.../AudioModule.kt` 의 `checkRecordingPermission`).
  ```ts
  const current = await getRecordingPermissionsAsync();
  const granted = current.granted || (await requestRecordingPermissionsAsync()).granted;
  ```
- `setAudioModeAsync` 의 **`allowsRecording` 은 Android 에서 무시된다.** Android 브랜치는
  `shouldPlayInBackground`·`shouldRouteThroughEarpiece`·`interruptionMode`·`playsInSilentMode` 만 매핑한다.
  녹음+재생 동시 사용 시 이 옵션으로 튜닝하려 하지 말 것.
- 녹음 중 스피커로 소리를 내면 **마이크가 그 소리를 다시 잡는다.** 재생 구간에는 감지 로직을 게이트로 막아야 한다.
- `useAudioRecorderState` 는 폴링 결과를 `useState` 로 내보내 초당 10회 리렌더를 만든다.
  실시간 값이 필요하면 `recorder.getStatus()` 를 직접 폴링해 SharedValue 에 담을 것.
- `useAudioRecorder` 는 `JSON.stringify(옵션)` 기준으로 인스턴스를 재사용한다. 즉 **같은 recorder 가 계속 살아 있으므로**,
  화면을 빠르게 나갔다 들어오면 이전 `stop()` 이 끝나기 전에 `prepareToRecordAsync()` 가 걸린다.
  cleanup 의 stop 체인을 ref 에 담아 다음 start 에서 `await` 할 것.

**react-native-gesture-handler**
- **`Gesture.Pan().onEnd` 는 탭에서 호출되지 않는다.** ACTIVE 상태를 거친 제스처에만 END 가 오는데
  (`useAnimatedGesture.ts` 가 `event.oldState === State.ACTIVE` 로 게이트),
  Pan 은 터치 슬롭(≈8dp)을 넘겨야 활성화된다. 탭은 BEGAN → FAILED 로 끝난다.
  → `onBegin` 에서 켠 것(소리·플래그·타이머)은 **반드시 `onFinalize` 에서 정리**할 것. `onEnd` 는 커밋 용도로만.
- worklet 안의 `Date.now()` 는 React Compiler 의 `react-hooks/purity` 에 걸린다.
  `'worklet';` 지시어를 붙여도 안 풀린다 — 룰은 worklet 을 모른다.
  최상위 헬퍼 함수로 빼면 호출부가 불투명해져 통과한다 (`eslint-disable` 쓰지 말 것).

**Skia / Reanimated**
- `blendMode="clear"` 로 뚫을 때 **`<Group layer>` 가 필수**다. 없으면 캔버스 아래 네이티브 뷰까지 뚫린다.
- SharedValue 에 `.set(숫자)` 를 하면 진행 중인 `withTiming` 이 **즉시 취소**된다
  (`react-native-reanimated/src/valueSetter.ts`). 애니메이션과 폴링이 같은 값을 쓰면 폴링이 이긴다.
- UI 스레드에서 값을 비우고 JS 스레드에서 커밋하면 **한 프레임 동안 아무 데도 없는** 상태가 생긴다.
  둘을 같은 tick 에 처리할 것.
- `StyleSheet.absoluteFillObject` 는 **이 RN 버전에 없다.** `StyleSheet.absoluteFill` 을 배열로 합성할 것.

**MoveNet 모델**
- tfhub 다운로드 URL 은 전부 죽었다(403/404). GitHub 미러도 LFS 포인터뿐.
  → Kaggle 에서 **수동 다운로드**해야 한다: https://www.kaggle.com/models/google/movenet/tfLite/singlepose-lightning-tflite-int8
- Framework 를 `TfLite` 로 골라야 한다. `TensorFlow2` 를 받으면 `saved_model.pb` 가 나와서 못 쓴다.
- 변형마다 입력 dtype 이 다르다 (int8 → uint8 / float 계열 → float32).
  하드코딩하지 말고 `model.inputs[0]` 의 `dataType`·`shape` 를 읽어 resizer 를 맞출 것 (이미 그렇게 구현돼 있다).
- `.tflite` 를 번들에 넣으려면 `metro.config.js` 의 `resolver.assetExts` 에 `tflite` 가 있어야 한다.

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

## 앱 추출 (반응 좋은 앱만 단독 배포)

챌린지 레포는 개발·촬영용이다. 반응이 좋은 앱은 **폴더째 뽑아 단독 프로젝트로 만들어** 스토어에 낸다.
런처에 30개가 든 채로 스토어에 올리지 않는다.

**추출이 가능한 이유** — 앱 하나가 자기완결이기 때문. 이 두 규칙이 깨지면 추출이 불가능해진다.
- 앱끼리 import 금지 (`views/day01-*` 이 `views/day02-*` 를 참조하지 않음)
- 의존성 단방향 (`app/ → views/ → shared/`)

**공유가 필요해지면 반드시 `shared/` 로 승격할 것.**
```
❌ import { useCountdown } from '@/views/day01-board-break/_hooks/useCountdown'
✅ shared/hooks/useCountdown.ts 로 옮긴 뒤 양쪽에서 import
```

**추출 절차**

| 순서 | 작업 |
|------|------|
| 1 | 레포 클론 → `.git` 삭제 → `git init` |
| 2 | 대상 `views/dayNN-*/` 만 남기고 나머지 `views/`·`app/(apps)/`·`views/launcher/` 삭제 |
| 3 | `app/index.tsx` 가 런처 대신 해당 View 를 바로 렌더하도록 수정 |
| 4 | 그 앱이 안 쓰는 네이티브 모듈 `npm uninstall` (번들·권한 축소) |
| 5 | `app.json` 교체 — `name`·`slug`·`scheme`·`android.package`·아이콘·**권한** |
| 6 | `eas.json` 에 `production` 프로필 추가 → AAB 빌드 |

`shared/` 는 그대로 가져간다 (테마·스토어·유틸이라 가볍고 어차피 필요).

**주의**
- `android.package` 는 스토어 등록 후 **영구 고정**. 새 앱마다 새로 지을 것 (`com.devpreneur_ko.<앱이름>`).
- 안 쓰는 권한은 반드시 제거. 카메라 권한이 남아 있으면 심사에서 사유를 요구받고 개인정보처리방침에도 명시해야 한다.

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
- **다른 Day 앱의 코드를 직접 import 하지 말 것.** 추출 가능성이 깨진다 (위 "앱 추출" 참고).

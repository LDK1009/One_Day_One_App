# Day 02 · 입김 유리창 — 설계

작성일: 2026-08-01
슬러그: `day02-window-fog`

---

## 1. 무엇을 만드나

마이크에 "하아~" 입김을 불면 화면이 서린 유리창처럼 뿌예지고, 손가락으로 문질러 글씨를 쓸 수 있다.
문지르는 동안 유리 닦는 소리와 미세 진동이 난다. 폰을 흔들면 김이 전부 사라진다.

김서림 아래에는 **뒷면 카메라 실시간 화면**이 깔린다 — 지운 자리로 실제 눈앞 풍경이 드러나 진짜 유리창처럼 보인다.

### 확정된 범위

| 항목 | 결정 |
|------|------|
| 마이크 입력 | 소리 크기(dB)만 사용 — 주파수 분석 안 함 |
| 배경 | 뒷면 카메라 실시간 프리뷰 |
| 자동 복구 | **없음** — 지운 자리는 다시 불기 전까지 유지 |
| 서림 종류 | 흰김 1종 (성에·얼음결정 없음) |
| 효과음 | `assets/sounds/glass-wipe.mp3` (준비 완료) |

### 범위 밖 (하지 않음)

- 성에/얼음결정 모드
- 글씨 저장·공유
- 입김과 다른 소음의 정밀 구분 (FFT 필요 → 네이티브 모듈 추가 = 재빌드)

---

## 2. 사전 검증 결과 — 재빌드 불필요

| 필요 기능 | 패키지 | 상태 |
|-----------|--------|------|
| 마이크 dB 측정 | `expo-audio` (`isMeteringEnabled`) | 설치됨 |
| 효과음 재생 (루프) | `expo-audio` (`player.loop`) | 설치됨 |
| 김서림·지우기 렌더 | `@shopify/react-native-skia` 2.6.2 | 설치됨 |
| 카메라 프리뷰 | `react-native-vision-camera` 5.2.1 | 설치됨 |
| 흔들기 감지 | `expo-sensors` Accelerometer | 설치됨 |
| 진동 | `expo-haptics` | 설치됨 |

**권한**: `expo-audio` config plugin 이 `RECORD_AUDIO` · `MODIFY_AUDIO_SETTINGS` 를 자동 주입한다
(`node_modules/expo-audio/plugin/src/withAudio.ts:69-70`). `app.json` 의 `plugins` 에 `expo-audio` 가 이미 있으므로
현재 dev build 에 마이크 권한이 포함되어 있다. `CAMERA` 는 `app.json` 에 명시되어 있다.

**마이크 경합 없음**: vision-camera v5 는 `useVideoOutput({ enableAudio })` 를 쓸 때만 마이크를 잡는다.
프리뷰만 사용하므로 마이크는 `expo-audio` 가 단독 점유한다.

→ **네이티브 모듈 추가 0개. EAS 재빌드 불필요.**

---

## 3. 화면 구조 — 3층 스택

```
┌─ View (flex:1) ────────────────────────┐
│ [3] BlowHint      안내문 · 디버그 dB     │  아래 표시 규칙 참조
│ [2] Canvas        흰김 + 지우기 (투명)   │  Skia + GestureDetector
│ [1] Camera        네이티브 프리뷰        │  StyleSheet.absoluteFill
└────────────────────────────────────────┘
```

카메라 프레임을 Skia 로 넘기지 않는다. 네이티브 프리뷰를 그대로 배경에 깔고 그 위에 **투명 배경 Canvas** 로
김서림만 그린다. 프레임 프로세서가 필요 없어 성능·코드 둘 다 유리하다.

`BlowHint` 표시 규칙:

| 조건 | 표시 |
|------|------|
| `fogLevel === 0` | "마이크에 하아~ 불어보세요" |
| `fogLevel === 1` 이고 아직 글씨를 쓴 적 없음 | "손가락으로 글씨를 써보세요" |
| 그 외 | 숨김 |
| 개발 모드 (`SHOW_DEBUG` 상수 true) | 위와 별개로 실시간 dB · streak · fogLevel 표시 |

---

## 4. 파일 구조

```
src/app/(apps)/day02-window-fog.tsx                 라우트 (스크립트 자동 생성)
src/views/day02-window-fog/
├── Day02WindowFogView.tsx      3층 조립 + 권한 분기
├── _components/
│   ├── CameraBackground.tsx    프리뷰. device 없으면 그라데이션 폴백
│   ├── FogCanvas.tsx           Skia 흰김 Rect + clear path
│   └── BlowHint.tsx            안내문 · 개발용 dB 표시
├── _hooks/
│   ├── useBreathDetector.ts    metering → fogLevel
│   ├── useFogPaths.ts          Pan 제스처 → path 배열
│   ├── useShakeReset.ts        Accelerometer → 리셋
│   └── useWipeFeedback.ts      효과음 루프 + 햅틱
└── _constants/
    └── fog.ts                  임계값 상수

assets/sounds/glass-wipe.mp3    유리 닦는 소리 (준비 완료)
```

**zustand 를 쓰지 않는다.** `fogLevel` 은 초당 10회 변하므로 Reanimated `SharedValue` 로 둔다.
zustand 로 두면 매 변경마다 리렌더가 발생한다. 이 앱은 영구 저장할 상태도 없다.

생성 명령:

```bash
node scripts/new-app.js window-fog "입김 유리창" "하아~ 불어 서린 창에 낙서하기" --icon weather-fog
```

---

## 5. 데이터 흐름 ① 입김 → 김서림

```
expo-audio recorder (isMeteringEnabled: true)
  │  recorderState.metering   dBFS, 대략 -160 ~ 0
  ↓  100ms 폴링
연속 판정: metering > BLOW_DB 가 5틱(0.5초) 연속인가?
  ├ No  → streak = 0, 무시                    말소리·박수 배제
  └ Yes → fogLevel.set(min(1, 현재 + 0.04))
  ↓
useDerivedValue → <Rect opacity={fogLevel} />
```

단계별 중간값 (기대치):

| t(초) | metering | streak | fogLevel | 화면 |
|-------|----------|--------|----------|------|
| 0.0 | -52 | 0 | 0.00 | 맑음 |
| 0.1 | -18 | 1 | 0.00 | 맑음 (0.5초 미달) |
| 0.5 | -15 | 5 | 0.04 | 살짝 서림 |
| 1.0 | -14 | 10 | 0.24 | 뿌예짐 |
| 2.5 | -16 | 25 | 1.00 | 꽉 참 |
| 2.6 | -55 | 0 | 1.00 | 유지 (자동 복구 없음) |

> `BLOW_DB` 의 실제 값은 기기마다 다르다. 개발 중 `BlowHint` 에 실시간 dB 와 streak 을 표시해
> 갤럭시 S21 에서 실측한 뒤 확정하고, 확정 후 표시를 끈다.

---

## 6. 데이터 흐름 ② 손가락 → 글씨

```
Gesture.Pan()
  onBegin  → activePoints.set([{x, y}])  ·  효과음 재생 시작  ·  isWiping = true
  onUpdate → activePoints 에 점 추가  ·  햅틱 (80ms throttle)      ← worklet, JS 왕복 없음
  onEnd    → paths 배열에 완성 path 커밋  ·  효과음 정지  ·  isWiping = false
```

렌더:

```tsx
<Group layer>                                    {/* layer 필수 — 없으면 clear 가 배경까지 뚫는다 */}
  <Rect color="#FFFFFF" opacity={fogLevel} />
  {paths.map((p) => (
    <Path path={p} blendMode="clear" style="stroke" strokeWidth={44} strokeCap="round" strokeJoin="round" />
  ))}
  <Path path={activePath} blendMode="clear" style="stroke" strokeWidth={44} />  {/* useDerivedValue */}
</Group>
```

그리는 중인 stroke 는 `useDerivedValue` 안에서 `Skia.Path.Make()` 로 재구성한다.
→ 드래그 중 JS `setState` 0회, `onEnd` 에만 1회 커밋.

글씨 몇 자면 path 5~15개 수준이라 이 방식으로 충분하다.
오프스크린 서피스에 구워두는 최적화는 실제로 버벅일 때 도입한다.

---

## 7. 데이터 흐름 ③ 흔들기 → 리셋

```
Accelerometer (updateInterval 100ms)
  magnitude = √(x² + y² + z²)        정지 시 ≈ 1
  magnitude > 1.8 이 0.6초 안에 2회 감지되면 발동
  ↓
fogLevel → withTiming(0, 400ms)  ·  setPaths([])  ·  강한 햅틱 1회
```

2회를 요구하는 이유: 걷거나 주머니에서 흔들릴 때의 오작동 방지.

---

## 8. 효과음 · 햅틱

```
useWipeFeedback.ts
  player = useAudioPlayer(require('@/assets/sounds/glass-wipe.mp3'))
  player.loop = true

  onBegin  → player.seekTo(0); player.play()
  onUpdate → Haptics.impactAsync(Light), 80ms throttle
  onEnd    → player.pause()
```

`player.volume` 으로 세기를 조절할 수 있다. 드래그 속도에 비례시킬지는 실기기에서 들어보고 정한다.

### 하울링 대응

효과음이 스피커로 나가면 마이크가 그것을 다시 잡아 입김으로 오인한다. 그래서:

```
isWiping === true          → useBreathDetector 의 fogLevel 증가를 정지
드래그 종료 + 200ms 경과   → 감지 재개 (잔향이 빠질 시간)
```

---

## 9. 생명주기 · 정리

| 시점 | 동작 |
|------|------|
| 화면 focus | 녹음 시작, 가속도 구독, keep-awake 활성 |
| 화면 blur / unmount | 녹음 정지 + **녹음 파일 삭제**, 구독 해제, keep-awake 해제 |

녹음 파일은 시간에 비례해 커지므로 unmount 시 `expo-file-system` 으로 삭제한다.
앱을 나갔다 들어오면 처음부터 다시 시작한다 (상태 영속 없음).

---

## 10. 에러 처리

| 상황 | 처리 |
|------|------|
| 카메라 또는 마이크 권한 거부 | 안내 화면 + "설정 열기" 버튼 (`Linking.openSettings`) |
| 카메라 device 없음 | 어두운 그라데이션 배경으로 폴백, 나머지 기능은 정상 동작 |
| 녹음 시작 실패 | `console.error` 후 "마이크를 사용할 수 없습니다" 안내 표시 (김서림 기능만 멈추고 앱은 유지) |

`catch` 블록은 `console.error` 후 상위로 던진다 (전역 규칙 3.3).

---

## 11. 구현 중 검증할 것 (추측 금지)

Expo SDK 56 / RN 0.85 / Skia 2.6.2 는 API 가 최신이라 문서보다 `node_modules/<pkg>/src/` 를 우선 확인한다.

1. Skia 2.6.2 에서 `<Group layer>` + `blendMode="clear"` 조합의 실동작
2. worklet 안에서 `Skia.Path.Make()` 호출 가능 여부
   → 불가하면 `onUpdate` 를 `runOnJS` + 16ms throttle 의 `setState` 로 폴백
3. 녹음 중 `player.play()` 동시 실행 시 Android AudioSession 충돌 여부
   → 소리가 안 나거나 녹음이 끊기면 `setAudioModeAsync({ allowsRecording: true, shouldPlayInBackground: false })` 로 조정
4. `metering` 의 실제 값 범위 (기기별 편차) — 실측 후 `BLOW_DB` 확정

---

## 12. 테스트 시나리오 (갤럭시 S21 실기기)

| # | 경로 | 기대 결과 |
|---|------|-----------|
| 1 | 런처 > 입김 유리창 진입 | 권한 팝업 2개 → 허용 → 카메라 프리뷰 표시 |
| 2 | 마이크에 하아~ 2초 | 화면이 점점 뿌예져 꽉 참 |
| 3 | 옆사람과 평소 목소리로 대화 | 김이 서리지 않음 (지속시간 필터 동작) |
| 4 | 손가락으로 하트 그리기 | 지운 자리로 카메라가 보임 + 유리 닦는 소리 + 미세 진동 |
| 5 | 손 떼고 10초 대기 | 글씨가 그대로 유지됨 |
| 6 | 폰 흔들기 | 0.4초에 걸쳐 김이 전부 사라짐 |
| 7 | 뒤로가기 → 재진입 | 초기 상태(맑음)로 시작, 녹음 파일 남지 않음 |

---

## 13. 상수 초안 (`_constants/fog.ts`)

실측 전 시작값. 갤럭시 S21 에서 튜닝한다.

```
BLOW_DB              -25      입김으로 인정할 dBFS 임계
BLOW_STREAK_TICKS      5      연속 인정 틱 수 (100ms × 5 = 0.5초)
FOG_STEP            0.04      1틱당 fogLevel 증가량
POLL_INTERVAL_MS     100      metering 폴링 주기
SILENT_DB           -160      metering 이 없을 때의 대체값

WIPE_STROKE_WIDTH     44      지우개 굵기(px)
HAPTIC_THROTTLE_MS    80      드래그 중 햅틱 최소 간격
BREATH_RESUME_MS     200      드래그 종료 후 입김 감지 재개 지연

SHAKE_THRESHOLD_G    1.8      흔들기 판정 가속도 크기
SHAKE_COUNT            2      발동에 필요한 감지 횟수
SHAKE_WINDOW_MS      600      위 횟수를 채워야 하는 시간 창
RESET_DURATION_MS    400      김이 사라지는 애니메이션 시간

SHOW_DEBUG          true      개발용 dB·streak 오버레이 표시 여부 (튜닝 완료 후 false)
DEBUG_POLL_MS        200      디버그 오버레이 갱신 주기
```

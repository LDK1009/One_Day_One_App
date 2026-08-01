# Day 02 입김 유리창 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 마이크에 입김을 불면 화면이 서린 유리창처럼 뿌예지고, 손가락으로 문질러 글씨를 쓰고, 폰을 흔들면 지워지는 앱을 만든다.

**Architecture:** 뒷면 카메라 네이티브 프리뷰를 배경에 깔고 그 위에 투명 Skia Canvas 를 얹는다. Canvas 안에서 `<Group layer>` 로 흰색 사각형을 그리고, 손가락 경로를 `blendMode="clear"` 로 뚫어 배경이 드러나게 한다. 매 프레임 변하는 값(김 농도, 그리는 중인 획)은 Reanimated SharedValue 로 두어 JS 리렌더를 만들지 않는다.

**Tech Stack:** Expo SDK 56 · RN 0.85 · React 19 · expo-audio(마이크 dB·효과음) · @shopify/react-native-skia 2.6.2 · react-native-vision-camera 5.2.1 · react-native-reanimated 4.3.1 · react-native-gesture-handler · expo-sensors · expo-haptics

**설계 문서:** `docs/specs/2026-08-01-day02-window-fog.md`

---

## Global Constraints

이 계획의 모든 태스크에 적용된다.

- **네이티브 모듈을 추가하지 않는다.** 필요한 패키지는 전부 설치되어 있다. `npm install` 로 새 네이티브 의존성을 넣으면 EAS 재빌드(10~30분)가 필요해져 오늘 안에 끝나지 않는다.
- **Expo SDK 56 / RN 0.85 / React 19 / TS 6.** API 가 최신이라 추측 금지. 확실하지 않으면 `node_modules/<pkg>/src/` 를 직접 읽는다 (문서보다 최신).
- **SharedValue 는 `.get()` / `.set()` 을 쓴다.** `.value` 대입은 React Compiler ESLint(`react-hooks/immutability`)가 에러로 잡는다. 이 프로젝트는 `app.json` 에서 `reactCompiler: true` 다.
- **다른 Day 앱의 코드를 import 하지 않는다.** 앱 추출 가능성이 깨진다. 공유가 필요하면 `shared/` 로 승격한다.
- **의존성 방향 단방향:** `app/ → views/ → shared/`.
- **레이어 역할 침범 금지:** 컴포넌트는 UI 만, 훅은 상태 조율만, 상수는 `_constants/` 에만.
- **스타일:** 값 하드코딩 금지. `@/shared/theme` 의 `spacing` `radius` `fontSize` `fontWeight` 사용. 커스텀 스타일은 `StyleSheet.create`, 인라인 지양.
- **주석은 한국어.** 섹션 구분자는 기존 파일 컨벤션을 따른다:
  - 파일 섹션: `//////////////////////////////////////// 섹션명 ////////////////////////////////////////`
  - 함수 단위: `////////// 함수/기능명`
- **`src/shared/constants/apps.ts` 를 손으로 편집하지 않는다.** `scripts/new-app.js` 가 마커 사이를 관리한다.
- **커밋 컨벤션:** `이모지 한국어 설명`. `✨` 새 기능 / `🐛` 버그 / `🎨` 스타일 / `⚙` 리팩토링·설정 / `🧪` 테스트·데모 / `🌱` 기타. **`Co-Authored-By` 를 넣지 않는다.**
- **브랜치:** `feat/day02-window-fog` 에서 작업한다. 이미 생성되어 있다. main 에 직접 커밋하지 않는다.
- **`npm run build` 와 `git push` 는 명시적 요청 시에만 실행한다.**

### 이 레포에는 자동화 테스트 프레임워크가 없다

`package.json` 에 jest/vitest 가 없고 `test` 스크립트도 없다. 릴스 촬영용 실기기 앱이라 검증 수단은 다음 셋이다. 각 태스크는 이 셋으로 검증한다.

```bash
npm run typecheck      # tsc --noEmit
npm run lint           # expo lint
npx expo start --dev-client   # 갤럭시 S21 실기기에서 육안 확인
```

**태스크마다 "실기기 확인" 단계가 있다. 사람이 폰에서 직접 눈으로 보고 넘어간다.** 확인 없이 다음 태스크로 진행하지 않는다.

---

## File Structure

| 파일 | 책임 | 생성 태스크 |
|------|------|-------------|
| `src/app/(apps)/day02-window-fog.tsx` | 라우트. 화면 조립만 | 1 (스크립트) |
| `src/views/day02-window-fog/Day02WindowFogView.tsx` | 3층 조립 + 훅 배선 + 포커스 상태 | 1 → 매 태스크 확장 |
| `src/views/day02-window-fog/_constants/fog.ts` | 임계값·튜닝 상수 전부 | 1 |
| `src/views/day02-window-fog/_components/CameraBackground.tsx` | 뒷면 카메라 프리뷰 + 권한·기기없음 분기 | 1 |
| `src/views/day02-window-fog/_components/FogCanvas.tsx` | Skia 흰김 + clear 지우기 렌더 | 2 |
| `src/views/day02-window-fog/_hooks/useFogPaths.ts` | Pan 제스처 → 획 배열 관리 | 3 |
| `src/views/day02-window-fog/_hooks/useBreathDetector.ts` | 마이크 metering → fogLevel + 녹음 생명주기 | 4 |
| `src/views/day02-window-fog/_hooks/useWipeFeedback.ts` | 효과음 루프 + 햅틱 | 5 |
| `src/views/day02-window-fog/_hooks/useShakeReset.ts` | 가속도 → 흔들기 감지 | 6 |
| `src/views/day02-window-fog/_components/BlowHint.tsx` | 안내문 + 개발용 디버그 오버레이 | 7 |
| `assets/sounds/glass-wipe.mp3` | 유리 닦는 소리 | 완료 (커밋 `82c8cf5`) |

**zustand 를 쓰지 않는다.** `fogLevel` 은 초당 10회, 그리는 중인 획은 초당 60회 변한다. zustand 로 두면 그때마다 리렌더가 발생한다. 영구 저장할 상태도 없다.

---

## 태스크 순서의 근거

각 태스크가 **실기기에서 눈으로 확인 가능한 상태**로 끝나도록 배치했다.

```
1. 카메라만 보임
2. 김이 꽉 찬 상태로 고정 → 흰 화면 (김서림 레이어 동작 확인)
3. 문지르면 뚫림 (김은 여전히 고정 1.0)
4. 입김으로 김 농도 제어 (초기값 0 으로 전환)
5. 문지를 때 소리 + 진동
6. 흔들면 리셋
7. 안내문 + 정리
8. 실기기 튜닝
```

---

## Task 1: 스캐폴딩 + 상수 + 카메라 배경

**Files:**
- Create (스크립트): `src/app/(apps)/day02-window-fog.tsx`
- Create (스크립트): `src/views/day02-window-fog/Day02WindowFogView.tsx`
- Modify (스크립트): `src/shared/constants/apps.ts`
- Create: `src/views/day02-window-fog/_constants/fog.ts`
- Create: `src/views/day02-window-fog/_components/CameraBackground.tsx`
- Modify: `src/views/day02-window-fog/Day02WindowFogView.tsx` (스켈레톤 → 카메라 배경)

**Interfaces:**
- Produces:
  - `_constants/fog.ts` — 아래 Step 2 의 모든 상수 (이후 태스크가 전부 여기서 import)
  - `CameraBackground({ isActive: boolean, children?: React.ReactNode }): JSX.Element`
  - `Day02WindowFogView(): JSX.Element`

- [ ] **Step 1: 앱 스캐폴딩 생성**

```bash
node scripts/new-app.js window-fog "입김 유리창" "하아~ 불어 서린 창에 낙서하기" --icon weather-fog
```

기대 출력: `✅ Day 2 · 입김 유리창 생성 완료`
생성되는 것: 라우트 `src/app/(apps)/day02-window-fog.tsx`, 화면 `src/views/day02-window-fog/Day02WindowFogView.tsx`, `apps.ts` 레지스트리 항목.

- [ ] **Step 2: 상수 파일 작성**

Create `src/views/day02-window-fog/_constants/fog.ts`:

```ts
//////////////////////////////////////// 입김 유리창 상수 ////////////////////////////////////////
// 실측 전 시작값입니다. Task 8 에서 갤럭시 S21 로 튜닝한 뒤 확정합니다.

////////// 입김 감지
export const BLOW_DB = -25; // 입김으로 인정할 dBFS 임계
export const BLOW_STREAK_TICKS = 5; // 연속 인정 틱 수 (100ms × 5 = 0.5초)
export const FOG_STEP = 0.04; // 1틱당 fogLevel 증가량
export const POLL_INTERVAL_MS = 100; // metering 폴링 주기
export const SILENT_DB = -160; // metering 이 없을 때의 대체값

////////// 지우기
export const WIPE_STROKE_WIDTH = 44; // 지우개 굵기(px)
export const HAPTIC_THROTTLE_MS = 80; // 드래그 중 햅틱 최소 간격
export const BREATH_RESUME_MS = 200; // 드래그 종료 후 입김 감지 재개 지연

////////// 흔들기 리셋
export const SHAKE_THRESHOLD_G = 1.8; // 흔들기 판정 가속도 크기 (정지 시 1)
export const SHAKE_COUNT = 2; // 발동에 필요한 감지 횟수
export const SHAKE_WINDOW_MS = 600; // 위 횟수를 채워야 하는 시간 창
export const RESET_DURATION_MS = 400; // 김이 사라지는 애니메이션 시간

////////// 개발용 — Task 8 에서 false 로 바꿉니다
export const SHOW_DEBUG = true;
export const DEBUG_POLL_MS = 200; // 디버그 오버레이 갱신 주기
```

- [ ] **Step 3: 카메라 배경 컴포넌트 작성**

Create `src/views/day02-window-fog/_components/CameraBackground.tsx`:

```tsx
//////////////////////////////////////// 카메라 배경 ////////////////////////////////////////
// 뒷면 카메라 프리뷰를 전체 화면으로 깔고 그 위에 children(김서림 캔버스)을 올립니다.
// 권한 요청·거부·기기 없음 상태를 모두 여기서 처리합니다.
//
// outputs 를 빈 배열로 넘기면 프리뷰만 켜집니다. vision-camera v5 는
// useVideoOutput({ enableAudio }) 를 쓸 때만 마이크를 잡으므로 마이크는 expo-audio 가 단독 점유합니다.

import { Linking, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';

import { fontSize, spacing } from '@/shared/theme';

type CameraBackgroundProps = {
  ////////// 화면이 포커스를 잃으면 false 로 내려 카메라를 멈춥니다
  isActive: boolean;
  children?: React.ReactNode;
};

export function CameraBackground({ isActive, children }: CameraBackgroundProps) {
  const { hasPermission, canRequestPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  ////////// 권한 없음
  if (!hasPermission) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>창밖 풍경을 비추려면 카메라 권한이 필요합니다.</Text>
        {canRequestPermission ? (
          <Button mode="contained" onPress={requestPermission}>
            권한 허용
          </Button>
        ) : (
          <Button mode="outlined" onPress={() => Linking.openSettings()}>
            설정 열기
          </Button>
        )}
      </View>
    );
  }

  ////////// 뒷면 카메라 없음 — 어두운 배경으로 폴백하고 나머지 기능은 그대로 동작시킵니다
  if (device == null) {
    return <View style={styles.deviceFallback}>{children}</View>;
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        outputs={[]}
        resizeMode="cover"
      />
      {children}
    </View>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  deviceFallback: {
    flex: 1,
    backgroundColor: '#101418',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  fallbackText: {
    fontSize: fontSize.md,
    textAlign: 'center',
  },
});
```

- [ ] **Step 4: View 를 카메라 배경으로 교체**

Replace the whole contents of `src/views/day02-window-fog/Day02WindowFogView.tsx`:

```tsx
//////////////////////////////////////// 입김 유리창 ////////////////////////////////////////
// [1] 카메라 프리뷰 → [2] 김서림 캔버스 → [3] 안내문 순서로 3층을 쌓습니다.
// 화면이 포커스를 잃으면 카메라·마이크·센서를 모두 멈춥니다.

import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { CameraBackground } from './_components/CameraBackground';

export function Day02WindowFogView() {
  ////////// 화면 포커스 — 카메라·마이크·센서의 on/off 를 한 값으로 묶습니다
  const [isFocused, setIsFocused] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, []),
  );

  return <CameraBackground isActive={isFocused} />;
}
```

- [ ] **Step 5: 정적 검증**

```bash
npm run typecheck
npm run lint
```

기대: 둘 다 에러 0.

`useFocusEffect` 가 `expo-router` 에서 export 되지 않으면 `node_modules/expo-router/build/index.d.ts` 를 확인하고, 없으면 `@react-navigation/native` 에서 import 한다 (expo-router 의 의존성으로 이미 설치되어 있다).

- [ ] **Step 6: 실기기 확인**

```bash
npx expo start --dev-client
```

| 확인 | 기대 |
|------|------|
| 런처에 "입김 유리창" 카드가 보이는가 | Day 2 카드, 안개 아이콘 |
| 카드를 누르면 | 카메라 권한 팝업 → 허용 → 뒷면 카메라 화면이 꽉 참 |
| 뒤로가기 후 재진입 | 카메라가 다시 켜짐 |

- [ ] **Step 7: 커밋**

```bash
git add src/app/\(apps\)/day02-window-fog.tsx src/views/day02-window-fog src/shared/constants/apps.ts
git commit -m "✨ Day 02 스캐폴딩 + 뒷면 카메라 배경"
```

---

## Task 2: Skia 김서림 레이어

목표는 **`blendMode="clear"` 가 의도대로 동작하는지 먼저 확인**하는 것이다. 그래서 이 태스크에서는 `fogLevel` 을 1.0 으로 고정해 흰 화면이 나오게 만든다. 입김 연결은 Task 4 에서 한다.

**Files:**
- Create: `src/views/day02-window-fog/_components/FogCanvas.tsx`
- Modify: `src/views/day02-window-fog/Day02WindowFogView.tsx`

**Interfaces:**
- Consumes: `WIPE_STROKE_WIDTH` from `_constants/fog`
- Produces:
  - `type WipePoint = { x: number; y: number }`
  - `FogCanvas({ fogLevel: SharedValue<number>, activePoints: SharedValue<WipePoint[]>, paths: SkPath[] }): JSX.Element`

- [ ] **Step 1: FogCanvas 작성**

Create `src/views/day02-window-fog/_components/FogCanvas.tsx`:

```tsx
//////////////////////////////////////// 김서림 캔버스 ////////////////////////////////////////
// 흰색 사각형(김)을 깔고, 손가락 경로를 blendMode="clear" 로 뚫어 아래 카메라가 드러나게 합니다.
//
// <Group layer> 가 필수입니다. layer 가 없으면 clear 가 이 캔버스를 넘어
// 아래에 깔린 카메라 뷰까지 뚫어버립니다.

import { Canvas, Group, Path, Rect, Skia, type SkPath } from '@shopify/react-native-skia';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { WIPE_STROKE_WIDTH } from '../_constants/fog';

export type WipePoint = { x: number; y: number };

type FogCanvasProps = {
  ////////// 김 농도 0~1
  fogLevel: SharedValue<number>;
  ////////// 지금 그리는 중인 획의 점들. 손을 떼면 빈 배열이 됩니다
  activePoints: SharedValue<WipePoint[]>;
  ////////// 이미 완성된 획들
  paths: SkPath[];
};

export function FogCanvas({ fogLevel, activePoints, paths }: FogCanvasProps) {
  const { width, height } = useWindowDimensions();

  ////////// 그리는 중인 획 — worklet 안에서 매 프레임 재구성하므로 JS 리렌더가 없습니다
  const activePath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    const points = activePoints.get();
    if (points.length > 0) {
      path.moveTo(points[0].x, points[0].y);
      for (let index = 1; index < points.length; index += 1) {
        path.lineTo(points[index].x, points[index].y);
      }
    }
    return path;
  });

  return (
    <Canvas style={StyleSheet.absoluteFill}>
      <Group layer>
        <Group opacity={fogLevel}>
          <Rect x={0} y={0} width={width} height={height} color="#FFFFFF" />
        </Group>

        {paths.map((path, index) => (
          <Path
            key={index}
            path={path}
            blendMode="clear"
            style="stroke"
            strokeWidth={WIPE_STROKE_WIDTH}
            strokeCap="round"
            strokeJoin="round"
          />
        ))}

        <Path
          path={activePath}
          blendMode="clear"
          style="stroke"
          strokeWidth={WIPE_STROKE_WIDTH}
          strokeCap="round"
          strokeJoin="round"
        />
      </Group>
    </Canvas>
  );
}
```

- [ ] **Step 2: View 에 캔버스 얹기 (fogLevel 1.0 고정)**

Replace `src/views/day02-window-fog/Day02WindowFogView.tsx`:

```tsx
//////////////////////////////////////// 입김 유리창 ////////////////////////////////////////
// [1] 카메라 프리뷰 → [2] 김서림 캔버스 → [3] 안내문 순서로 3층을 쌓습니다.
// 화면이 포커스를 잃으면 카메라·마이크·센서를 모두 멈춥니다.

import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useSharedValue } from 'react-native-reanimated';

import { CameraBackground } from './_components/CameraBackground';
import { FogCanvas, type WipePoint } from './_components/FogCanvas';

export function Day02WindowFogView() {
  const [isFocused, setIsFocused] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, []),
  );

  ////////// Task 4 에서 입김 감지로 교체합니다. 지금은 김이 꽉 찬 상태로 고정해 렌더를 확인합니다
  const fogLevel = useSharedValue(1);
  const activePoints = useSharedValue<WipePoint[]>([]);

  return (
    <CameraBackground isActive={isFocused}>
      <FogCanvas fogLevel={fogLevel} activePoints={activePoints} paths={[]} />
    </CameraBackground>
  );
}
```

- [ ] **Step 3: 정적 검증**

```bash
npm run typecheck
npm run lint
```

- [ ] **Step 4: 실기기 확인**

| 확인 | 기대 |
|------|------|
| 앱 진입 | 화면 전체가 **흰색**. 카메라가 안 보임 |

흰 화면이 안 나오면 `<Group opacity={...}>` 가 SharedValue 를 직접 받는지 확인한다. 받지 않으면 `useDerivedValue(() => fogLevel.get())` 결과를 넘긴다.

- [ ] **Step 5: 커밋**

```bash
git add src/views/day02-window-fog
git commit -m "✨ Day 02 Skia 김서림 레이어 — clear 블렌드로 지우기 준비"
```

---

## Task 3: 손가락으로 지우기

`fogLevel` 은 여전히 1.0 고정이다. 문질러서 뚫리는지만 본다.

**Files:**
- Create: `src/views/day02-window-fog/_hooks/useFogPaths.ts`
- Modify: `src/views/day02-window-fog/Day02WindowFogView.tsx`

**Interfaces:**
- Consumes: `WipePoint` from `_components/FogCanvas`, `HAPTIC_THROTTLE_MS` from `_constants/fog`
- Produces:
  ```ts
  type FogPathsCallbacks = {
    onWipeStart: () => void;
    onWipeMove: () => void;
    onWipeEnd: () => void;
  };
  type FogPathsResult = {
    wipeGesture: PanGesture;
    activePoints: SharedValue<WipePoint[]>;
    paths: SkPath[];
    clearPaths: () => void;
  };
  useFogPaths(callbacks: FogPathsCallbacks): FogPathsResult
  ```

- [ ] **Step 1: useFogPaths 작성**

Create `src/views/day02-window-fog/_hooks/useFogPaths.ts`:

```ts
//////////////////////////////////////// 지우기 제스처 ////////////////////////////////////////
// 손가락 경로를 모아 Skia 획으로 만듭니다.
//
// 성능 설계: 드래그 중에는 SharedValue 만 갱신해 JS 리렌더를 0회로 유지하고,
// 손을 뗄 때(onEnd)만 setState 로 완성 획을 커밋합니다.
// 햅틱 콜백도 worklet 안에서 스로틀해 JS 왕복 횟수를 초당 12회 수준으로 낮춥니다.

import { Skia, type SkPath } from '@shopify/react-native-skia';
import { useCallback, useState } from 'react';
import { Gesture, type PanGesture } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue, type SharedValue } from 'react-native-reanimated';

import type { WipePoint } from '../_components/FogCanvas';
import { HAPTIC_THROTTLE_MS } from '../_constants/fog';

export type FogPathsCallbacks = {
  ////////// 문지르기 시작 — 효과음 재생·입김 감지 일시정지에 사용
  onWipeStart: () => void;
  ////////// 문지르는 중 (HAPTIC_THROTTLE_MS 간격으로만 호출) — 햅틱에 사용
  onWipeMove: () => void;
  ////////// 문지르기 종료 — 효과음 정지·입김 감지 재개에 사용
  onWipeEnd: () => void;
};

export type FogPathsResult = {
  wipeGesture: PanGesture;
  activePoints: SharedValue<WipePoint[]>;
  paths: SkPath[];
  clearPaths: () => void;
};

////////// 점 배열을 Skia 획 하나로 변환
function buildPath(points: WipePoint[]): SkPath | null {
  if (points.length < 2) return null;

  const path = Skia.Path.Make();
  path.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    path.lineTo(points[index].x, points[index].y);
  }
  return path;
}

export function useFogPaths(callbacks: FogPathsCallbacks): FogPathsResult {
  const activePoints = useSharedValue<WipePoint[]>([]);
  const lastHapticAt = useSharedValue(0);
  const [paths, setPaths] = useState<SkPath[]>([]);

  const commitPath = useCallback((points: WipePoint[]) => {
    const path = buildPath(points);
    if (path == null) return;
    setPaths((previous) => [...previous, path]);
  }, []);

  const clearPaths = useCallback(() => {
    setPaths([]);
  }, []);

  const { onWipeStart, onWipeMove, onWipeEnd } = callbacks;

  const wipeGesture = Gesture.Pan()
    .onBegin((event) => {
      activePoints.set([{ x: event.x, y: event.y }]);
      lastHapticAt.set(0);
      runOnJS(onWipeStart)();
    })
    .onUpdate((event) => {
      activePoints.set([...activePoints.get(), { x: event.x, y: event.y }]);

      ////////// 햅틱은 스로틀해서 JS 왕복을 줄입니다
      const now = Date.now();
      if (now - lastHapticAt.get() >= HAPTIC_THROTTLE_MS) {
        lastHapticAt.set(now);
        runOnJS(onWipeMove)();
      }
    })
    .onEnd(() => {
      runOnJS(commitPath)(activePoints.get());
      activePoints.set([]);
      runOnJS(onWipeEnd)();
    });

  return { wipeGesture, activePoints, paths, clearPaths };
}
```

- [ ] **Step 2: View 에 제스처 배선**

Replace `src/views/day02-window-fog/Day02WindowFogView.tsx`:

```tsx
//////////////////////////////////////// 입김 유리창 ////////////////////////////////////////
// [1] 카메라 프리뷰 → [2] 김서림 캔버스 → [3] 안내문 순서로 3층을 쌓습니다.
// 화면이 포커스를 잃으면 카메라·마이크·센서를 모두 멈춥니다.

import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';

import { CameraBackground } from './_components/CameraBackground';
import { FogCanvas } from './_components/FogCanvas';
import { useFogPaths } from './_hooks/useFogPaths';

export function Day02WindowFogView() {
  const [isFocused, setIsFocused] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, []),
  );

  ////////// Task 4 에서 입김 감지로 교체합니다
  const fogLevel = useSharedValue(1);

  ////////// Task 5·6 에서 효과음·햅틱으로 채웁니다
  const noop = useCallback(() => undefined, []);

  const { wipeGesture, activePoints, paths } = useFogPaths({
    onWipeStart: noop,
    onWipeMove: noop,
    onWipeEnd: noop,
  });

  return (
    <CameraBackground isActive={isFocused}>
      <GestureDetector gesture={wipeGesture}>
        <View style={StyleSheet.absoluteFill}>
          <FogCanvas fogLevel={fogLevel} activePoints={activePoints} paths={paths} />
        </View>
      </GestureDetector>
    </CameraBackground>
  );
}
```

- [ ] **Step 3: 정적 검증**

```bash
npm run typecheck
npm run lint
```

- [ ] **Step 4: 실기기 확인**

| 확인 | 기대 |
|------|------|
| 흰 화면을 손가락으로 문지름 | 지나간 자리로 카메라 화면이 드러남 |
| 손을 뗐다가 다른 곳을 문지름 | 앞서 그린 자국이 그대로 남아 있음 |
| 하트·글씨를 빠르게 그림 | 선이 끊기지 않고 따라옴 |

선이 뚝뚝 끊기면 `onUpdate` 가 아니라 `onChange` 를 써야 하는지 `node_modules/react-native-gesture-handler/src/handlers/gestures/panGesture.ts` 에서 확인한다.

- [ ] **Step 5: 커밋**

```bash
git add src/views/day02-window-fog
git commit -m "✨ Day 02 손가락으로 김 지우기 — 드래그 중 JS 리렌더 0회"
```

---

## Task 4: 입김 감지

`fogLevel` 초기값을 0 으로 바꾸고 마이크에 연결한다.

**Files:**
- Create: `src/views/day02-window-fog/_hooks/useBreathDetector.ts`
- Modify: `src/views/day02-window-fog/Day02WindowFogView.tsx`

**Interfaces:**
- Consumes: `BLOW_DB`, `BLOW_STREAK_TICKS`, `FOG_STEP`, `POLL_INTERVAL_MS`, `SILENT_DB` from `_constants/fog`
- Produces:
  ```ts
  type BreathDetectorResult = {
    fogLevel: SharedValue<number>;    // 0~1
    debugDb: SharedValue<number>;     // 최근 metering 값
    debugStreak: SharedValue<number>; // 연속 초과 틱 수
    hasMicError: boolean;             // 녹음 시작 실패 여부 (Task 7 안내문에서 사용)
  };
  useBreathDetector(isEnabled: boolean, isPausedRef: RefObject<boolean>): BreathDetectorResult
  ```

**검증된 expo-audio API (직접 확인함):**
- `useAudioRecorder(options: RecordingOptions): AudioRecorder`
- `RecordingPresets.LOW_QUALITY` — Android `.3gp` / amr_nb
- `recorder.prepareToRecordAsync(): Promise<void>` → `recorder.record(): void` → `recorder.stop(): Promise<void>`
- `recorder.getStatus(): RecorderState` — `{ canRecord, isRecording, durationMillis, metering?: number, url }`
- `setAudioModeAsync(mode: Partial<AudioMode>): Promise<void>`

**녹음 파일 삭제는 expo-file-system 신 API 를 쓴다.** SDK 56 은 `File` 클래스가 기본이고 `deleteAsync` 는 `expo-file-system/legacy` 로 밀려났다:

```ts
import { File } from 'expo-file-system';
const file = new File(uri);
if (file.exists) file.delete();   // 동기 메서드
```

- [ ] **Step 1: useBreathDetector 작성**

Create `src/views/day02-window-fog/_hooks/useBreathDetector.ts`:

```ts
//////////////////////////////////////// 입김 감지 ////////////////////////////////////////
// 마이크의 소리 크기(dBFS)만 읽어 김 농도를 올립니다. 주파수 분석은 하지 않습니다.
//
// 데이터 흐름:
//   recorder.getStatus().metering  ──100ms 폴링──▶  임계 초과가 5틱 연속인가?
//     └ No  → streak 0 으로 리셋 (말소리·박수 배제)
//     └ Yes → fogLevel += FOG_STEP (최대 1)
//
// 리렌더 방지: 상태를 useState 가 아니라 SharedValue 에 담습니다.
// useAudioRecorderState 훅은 폴링 결과를 useState 로 내보내므로 쓰지 않습니다 (초당 10회 리렌더).

import { File } from 'expo-file-system';
import { RecordingPresets, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

import {
  BLOW_DB,
  BLOW_STREAK_TICKS,
  FOG_STEP,
  POLL_INTERVAL_MS,
  SILENT_DB,
} from '../_constants/fog';

export type BreathDetectorResult = {
  fogLevel: SharedValue<number>;
  debugDb: SharedValue<number>;
  debugStreak: SharedValue<number>;
  ////////// 녹음을 시작하지 못했을 때 true. 안내문에서 사용합니다
  hasMicError: boolean;
};

////////// 녹음 파일은 계속 커지므로 화면을 벗어날 때 지웁니다
function deleteRecording(uri: string | null) {
  if (uri == null) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch (error) {
    console.error('[day02] 녹음 파일 삭제 실패', error);
  }
}

export function useBreathDetector(
  isEnabled: boolean,
  isPausedRef: RefObject<boolean>,
): BreathDetectorResult {
  const recorder = useAudioRecorder({
    ...RecordingPresets.LOW_QUALITY,
    isMeteringEnabled: true,
  });

  const fogLevel = useSharedValue(0);
  const debugDb = useSharedValue(SILENT_DB);
  const debugStreak = useSharedValue(0);
  const streakRef = useRef(0);
  const [hasMicError, setHasMicError] = useState(false);

  useEffect(() => {
    if (!isEnabled) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;
    let isCancelled = false;

    ////////// 1틱: metering 을 읽어 연속 판정 후 김 농도 반영
    function tick() {
      const status = recorder.getStatus();
      const decibel = status.metering ?? SILENT_DB;
      debugDb.set(decibel);

      ////////// 문지르는 중에는 효과음이 마이크에 되잡히므로 판정을 멈춥니다
      if (isPausedRef.current) {
        streakRef.current = 0;
        debugStreak.set(0);
        return;
      }

      if (decibel > BLOW_DB) {
        streakRef.current += 1;
        if (streakRef.current >= BLOW_STREAK_TICKS) {
          fogLevel.set(Math.min(1, fogLevel.get() + FOG_STEP));
        }
      } else {
        streakRef.current = 0;
      }

      debugStreak.set(streakRef.current);
    }

    async function start() {
      try {
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
          shouldPlayInBackground: false,
        });
        await recorder.prepareToRecordAsync();
        if (isCancelled) return;

        recorder.record();
        intervalId = setInterval(tick, POLL_INTERVAL_MS);
      } catch (error) {
        ////////// 정리(cleanup) 경로라 throw 하면 언마운트가 깨집니다. 로깅 후 안내 플래그만 세웁니다
        console.error('[day02] 녹음 시작 실패', error);
        setHasMicError(true);
      }
    }

    start();

    return () => {
      isCancelled = true;
      if (intervalId != null) clearInterval(intervalId);

      const uri = recorder.uri;
      recorder
        .stop()
        .then(() => deleteRecording(uri))
        .catch((error) => console.error('[day02] 녹음 정리 실패', error));
    };
  }, [isEnabled, recorder, isPausedRef, fogLevel, debugDb, debugStreak]);

  return { fogLevel, debugDb, debugStreak, hasMicError };
}
```

> **전역 규칙 3.3 예외 안내:** "catch 블록은 `console.error` 후 `throw`" 규칙은 service 레이어 기준이다. 위 두 catch 는 effect 정리 경로라 throw 하면 언마운트가 깨지고 처리할 상위도 없다. 그래서 로깅만 한다. 이 예외는 이 파일에만 적용한다.

- [ ] **Step 2: View 에 배선 (fogLevel 고정값 제거)**

Replace `src/views/day02-window-fog/Day02WindowFogView.tsx`:

```tsx
//////////////////////////////////////// 입김 유리창 ////////////////////////////////////////
// [1] 카메라 프리뷰 → [2] 김서림 캔버스 → [3] 안내문 순서로 3층을 쌓습니다.
// 화면이 포커스를 잃으면 카메라·마이크·센서를 모두 멈춥니다.

import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';

import { CameraBackground } from './_components/CameraBackground';
import { FogCanvas } from './_components/FogCanvas';
import { useBreathDetector } from './_hooks/useBreathDetector';
import { useFogPaths } from './_hooks/useFogPaths';

export function Day02WindowFogView() {
  const [isFocused, setIsFocused] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, []),
  );

  ////////// 문지르는 동안 입김 판정을 멈추기 위한 플래그 (Task 5 에서 실제로 켭니다)
  const isWipingRef = useRef(false);

  const { fogLevel } = useBreathDetector(isFocused, isWipingRef);

  ////////// Task 5 에서 효과음·햅틱으로 채웁니다
  const noop = useCallback(() => undefined, []);

  const { wipeGesture, activePoints, paths } = useFogPaths({
    onWipeStart: noop,
    onWipeMove: noop,
    onWipeEnd: noop,
  });

  return (
    <CameraBackground isActive={isFocused}>
      <GestureDetector gesture={wipeGesture}>
        <View style={StyleSheet.absoluteFill}>
          <FogCanvas fogLevel={fogLevel} activePoints={activePoints} paths={paths} />
        </View>
      </GestureDetector>
    </CameraBackground>
  );
}
```

- [ ] **Step 3: 정적 검증**

```bash
npm run typecheck
npm run lint
```

- [ ] **Step 4: 실기기 확인**

| 확인 | 기대 |
|------|------|
| 앱 진입 | 마이크 권한 팝업 → 허용 → 카메라가 선명하게 보임 (김 없음) |
| 마이크에 "하아~" 2~3초 | 화면이 점점 뿌예짐 |
| 입김을 멈춤 | 김이 그대로 유지됨 (자동 복구 없음) |
| 평소 목소리로 대화 | 김이 거의 안 서림 |

김이 전혀 안 서리거나 반대로 아무 소리에나 꽉 차면 Task 8 에서 튜닝한다. **여기서는 "반응이 있다"까지만 확인하고 넘어간다.**

- [ ] **Step 5: 커밋**

```bash
git add src/views/day02-window-fog
git commit -m "✨ Day 02 입김 감지 — dB 임계 + 0.5초 지속 필터"
```

---

## Task 5: 효과음 + 햅틱 + 하울링 대응

**Files:**
- Create: `src/views/day02-window-fog/_hooks/useWipeFeedback.ts`
- Modify: `src/views/day02-window-fog/Day02WindowFogView.tsx`

**Interfaces:**
- Consumes: `assets/sounds/glass-wipe.mp3`, `BREATH_RESUME_MS` from `_constants/fog`
- Produces:
  ```ts
  type WipeFeedback = {
    startWipe: () => void;
    tickWipe: () => void;
    stopWipe: () => void;
  };
  useWipeFeedback(): WipeFeedback
  ```

- [ ] **Step 1: useWipeFeedback 작성**

Create `src/views/day02-window-fog/_hooks/useWipeFeedback.ts`:

```ts
//////////////////////////////////////// 문지르기 피드백 ////////////////////////////////////////
// 효과음(유리 닦는 소리)을 루프로 재생하고, 드래그 중 미세 진동을 냅니다.
// 진동은 촬영자만 느끼고 영상에는 안 담기므로 소리와 둘 다 필요합니다.

import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';

const WIPE_SOUND = require('../../../../assets/sounds/glass-wipe.mp3');

export type WipeFeedback = {
  ////////// 문지르기 시작 — 효과음 루프 재생
  startWipe: () => void;
  ////////// 문지르는 중 — 미세 진동 (호출 측에서 스로틀됨)
  tickWipe: () => void;
  ////////// 문지르기 종료 — 효과음 정지
  stopWipe: () => void;
};

export function useWipeFeedback(): WipeFeedback {
  const player = useAudioPlayer(WIPE_SOUND);

  const startWipe = useCallback(() => {
    player.loop = true;
    player.seekTo(0);
    player.play();
  }, [player]);

  const tickWipe = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch((error) =>
      console.error('[day02] 햅틱 실패', error),
    );
  }, []);

  const stopWipe = useCallback(() => {
    player.pause();
  }, [player]);

  return { startWipe, tickWipe, stopWipe };
}
```

- [ ] **Step 2: View 에 배선 + 하울링 게이트**

`src/views/day02-window-fog/Day02WindowFogView.tsx` 에서 `noop` 을 지우고 실제 핸들러로 교체한다. import 에 다음을 추가:

```tsx
import { BREATH_RESUME_MS } from './_constants/fog';
import { useWipeFeedback } from './_hooks/useWipeFeedback';
```

`useBreathDetector` 호출 아래에 다음을 넣고, `useFogPaths` 의 콜백 3개를 이 핸들러로 바꾼다:

```tsx
  const { startWipe, tickWipe, stopWipe } = useWipeFeedback();

  ////////// 문지르기 시작 — 효과음을 켜고 입김 판정을 잠급니다
  const handleWipeStart = useCallback(() => {
    isWipingRef.current = true;
    startWipe();
  }, [startWipe]);

  ////////// 문지르기 종료 — 효과음을 끄고 잔향이 빠진 뒤 입김 판정을 재개합니다
  const handleWipeEnd = useCallback(() => {
    stopWipe();
    setTimeout(() => {
      isWipingRef.current = false;
    }, BREATH_RESUME_MS);
  }, [stopWipe]);

  const { wipeGesture, activePoints, paths } = useFogPaths({
    onWipeStart: handleWipeStart,
    onWipeMove: tickWipe,
    onWipeEnd: handleWipeEnd,
  });
```

- [ ] **Step 3: 정적 검증**

```bash
npm run typecheck
npm run lint
```

- [ ] **Step 4: 실기기 확인**

| 확인 | 기대 |
|------|------|
| 하아~ 불어 김을 채운 뒤 문지름 | 유리 닦는 소리가 나고 손끝에 미세 진동 |
| 손을 뗌 | 소리가 즉시 멈춤 |
| 길게 문지름 | 소리가 끊기지 않고 루프됨 |
| 문지르는 동안 김 농도 | 효과음 때문에 저절로 진해지지 않음 |

소리가 아예 안 나거나 녹음이 끊기면 Android AudioSession 충돌이다. `setAudioModeAsync` 인자를 조정한다 — `node_modules/expo-audio/src/Audio.types.ts` 의 `AudioMode` 필드(`playsInSilentMode`, `interruptionMode`, `shouldRouteThroughEarpiece`)를 확인하고 조합을 바꾼다.

- [ ] **Step 5: 커밋**

```bash
git add src/views/day02-window-fog
git commit -m "✨ Day 02 유리 닦는 효과음 + 햅틱 — 하울링 방지 게이트 포함"
```

---

## Task 6: 흔들기 리셋

**Files:**
- Create: `src/views/day02-window-fog/_hooks/useShakeReset.ts`
- Modify: `src/views/day02-window-fog/Day02WindowFogView.tsx`

**Interfaces:**
- Consumes: `SHAKE_THRESHOLD_G`, `SHAKE_COUNT`, `SHAKE_WINDOW_MS`, `RESET_DURATION_MS` from `_constants/fog`; `clearPaths` from `useFogPaths`
- Produces: `useShakeReset(isEnabled: boolean, onShake: () => void): void`

- [ ] **Step 1: useShakeReset 작성**

Create `src/views/day02-window-fog/_hooks/useShakeReset.ts`:

```ts
//////////////////////////////////////// 흔들기 감지 ////////////////////////////////////////
// 가속도 크기가 임계를 넘는 일이 짧은 시간 안에 2회 발생하면 리셋으로 판정합니다.
// 1회로 하면 걷거나 주머니에 넣을 때 오작동합니다.
//
// magnitude = √(x² + y² + z²) — 폰이 정지해 있으면 중력만 잡혀 약 1 입니다.

import { Accelerometer } from 'expo-sensors';
import { useEffect, useRef } from 'react';

import { SHAKE_COUNT, SHAKE_THRESHOLD_G, SHAKE_WINDOW_MS } from '../_constants/fog';

const ACCELEROMETER_INTERVAL_MS = 100;

export function useShakeReset(isEnabled: boolean, onShake: () => void) {
  const hitTimesRef = useRef<number[]>([]);
  const onShakeRef = useRef(onShake);

  ////////// 렌더 중 ref 를 건드리면 React Compiler 린트에 걸리므로 effect 에서 갱신합니다
  useEffect(() => {
    onShakeRef.current = onShake;
  }, [onShake]);

  useEffect(() => {
    if (!isEnabled) {
      hitTimesRef.current = [];
      return;
    }

    Accelerometer.setUpdateInterval(ACCELEROMETER_INTERVAL_MS);

    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      if (magnitude < SHAKE_THRESHOLD_G) return;

      const now = Date.now();
      const recentHits = hitTimesRef.current.filter((time) => now - time < SHAKE_WINDOW_MS);
      recentHits.push(now);
      hitTimesRef.current = recentHits;

      if (recentHits.length >= SHAKE_COUNT) {
        hitTimesRef.current = [];
        onShakeRef.current();
      }
    });

    return () => subscription.remove();
  }, [isEnabled]);
}
```

- [ ] **Step 2: View 에 배선**

`useFogPaths` 반환값에서 `clearPaths` 를 함께 받고, 아래 핸들러와 훅 호출을 추가한다:

```tsx
  const { wipeGesture, activePoints, paths, clearPaths } = useFogPaths({ /* 기존 그대로 */ });

  ////////// 흔들기 리셋 — 김과 글씨를 함께 지웁니다
  const handleShake = useCallback(() => {
    fogLevel.set(withTiming(0, { duration: RESET_DURATION_MS }));
    clearPaths();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch((error) =>
      console.error('[day02] 햅틱 실패', error),
    );
  }, [fogLevel, clearPaths]);

  useShakeReset(isFocused, handleShake);
```

추가 import (`BREATH_RESUME_MS` 는 Task 5 에서 이미 넣었으므로 `RESET_DURATION_MS` 만 덧붙인다):

```tsx
import * as Haptics from 'expo-haptics';
import { withTiming } from 'react-native-reanimated';

import { BREATH_RESUME_MS, RESET_DURATION_MS } from './_constants/fog';
import { useShakeReset } from './_hooks/useShakeReset';
```

- [ ] **Step 3: 정적 검증**

```bash
npm run typecheck
npm run lint
```

- [ ] **Step 4: 실기기 확인**

| 확인 | 기대 |
|------|------|
| 김을 채우고 글씨를 쓴 뒤 폰을 흔듦 | 0.4초에 걸쳐 김이 사라지고 글씨도 없어짐 + 강한 진동 1회 |
| 폰을 들고 천천히 걸음 | 리셋이 발동하지 않음 |
| 리셋 후 다시 하아~ | 처음부터 다시 서림 |

리셋이 너무 쉽게 걸리면 `SHAKE_THRESHOLD_G` 를 올리고, 세게 흔들어도 안 걸리면 내린다 (Task 8 에서 확정).

- [ ] **Step 5: 커밋**

```bash
git add src/views/day02-window-fog
git commit -m "✨ Day 02 흔들기 리셋 — 0.6초 내 2회 감지"
```

---

## Task 7: 안내문 + 디버그 오버레이 + 화면 꺼짐 방지

**Files:**
- Create: `src/views/day02-window-fog/_components/BlowHint.tsx`
- Modify: `src/views/day02-window-fog/Day02WindowFogView.tsx`

**Interfaces:**
- Consumes: `SHOW_DEBUG`, `DEBUG_POLL_MS` from `_constants/fog`; `fogLevel`·`debugDb`·`debugStreak` from `useBreathDetector`
- Produces:
  ```ts
  BlowHint({
    fogLevel: SharedValue<number>,
    debugDb: SharedValue<number>,
    debugStreak: SharedValue<number>,
    hasWiped: boolean,
    hasMicError: boolean,
  }): JSX.Element
  ```

**표시 규칙 (설계 문서 3절·10절):**

| 조건 | 표시 |
|------|------|
| `hasMicError === true` | "마이크를 사용할 수 없습니다" (다른 안내보다 우선) |
| `fogLevel === 0` | "마이크에 하아~ 불어보세요" |
| `fogLevel >= 1` 이고 아직 글씨를 쓴 적 없음 | "손가락으로 글씨를 써보세요" |
| 그 외 | 숨김 |
| `SHOW_DEBUG === true` | 위와 별개로 dB · streak · fogLevel 표시 |

- [ ] **Step 1: BlowHint 작성**

Create `src/views/day02-window-fog/_components/BlowHint.tsx`:

```tsx
//////////////////////////////////////// 안내문 · 디버그 ////////////////////////////////////////
// 안내문은 Reanimated 애니메이션 스타일로 보였다 숨겼다 합니다 (JS 리렌더 없음).
// 디버그 패널은 개발 중에만 켜며, 숫자를 화면에 띄워야 하므로 별도로 폴링합니다.
// Task 8 에서 임계값을 확정한 뒤 SHOW_DEBUG 를 false 로 바꿉니다.

import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { fontSize, fontWeight, radius, spacing } from '@/shared/theme';
import { DEBUG_POLL_MS, SHOW_DEBUG } from '../_constants/fog';

type BlowHintProps = {
  fogLevel: SharedValue<number>;
  debugDb: SharedValue<number>;
  debugStreak: SharedValue<number>;
  ////////// 이번 김에 글씨를 쓴 적이 있는지 (있으면 쓰기 안내를 숨깁니다)
  hasWiped: boolean;
  ////////// 녹음 시작에 실패했는지
  hasMicError: boolean;
};

export function BlowHint({ fogLevel, debugDb, debugStreak, hasWiped, hasMicError }: BlowHintProps) {
  ////////// 김이 하나도 없을 때 — 불라는 안내 (마이크 오류 시에는 숨깁니다)
  const blowStyle = useAnimatedStyle(() => ({
    opacity: !hasMicError && fogLevel.get() === 0 ? 1 : 0,
  }));

  ////////// 김이 꽉 찼는데 아직 안 썼을 때 — 쓰라는 안내
  const writeStyle = useAnimatedStyle(() => ({
    opacity: fogLevel.get() >= 1 && !hasWiped ? 1 : 0,
  }));

  return (
    <View style={styles.container} pointerEvents="none">
      {hasMicError ? (
        <View style={styles.hintBox}>
          <Text style={styles.hintText}>마이크를 사용할 수 없습니다</Text>
        </View>
      ) : null}

      <Animated.View style={[styles.hintBox, blowStyle]}>
        <Text style={styles.hintText}>마이크에 하아~ 불어보세요</Text>
      </Animated.View>

      <Animated.View style={[styles.hintBox, writeStyle]}>
        <Text style={styles.hintText}>손가락으로 글씨를 써보세요</Text>
      </Animated.View>

      {SHOW_DEBUG ? (
        <DebugPanel fogLevel={fogLevel} debugDb={debugDb} debugStreak={debugStreak} />
      ) : null}
    </View>
  );
}

//////////////////////////////////////// 디버그 패널 ////////////////////////////////////////
// 숫자를 텍스트로 보여줘야 해서 SharedValue 를 주기적으로 JS 로 복사합니다.
// 개발 중에만 켜므로 리렌더 비용을 감수합니다.

type DebugPanelProps = {
  fogLevel: SharedValue<number>;
  debugDb: SharedValue<number>;
  debugStreak: SharedValue<number>;
};

function DebugPanel({ fogLevel, debugDb, debugStreak }: DebugPanelProps) {
  const [snapshot, setSnapshot] = useState({ decibel: 0, streak: 0, fog: 0 });

  useEffect(() => {
    const intervalId = setInterval(() => {
      setSnapshot({
        decibel: debugDb.get(),
        streak: debugStreak.get(),
        fog: fogLevel.get(),
      });
    }, DEBUG_POLL_MS);

    return () => clearInterval(intervalId);
  }, [debugDb, debugStreak, fogLevel]);

  return (
    <View style={styles.debugBox}>
      <Text style={styles.debugText}>dB {snapshot.decibel.toFixed(1)}</Text>
      <Text style={styles.debugText}>streak {snapshot.streak}</Text>
      <Text style={styles.debugText}>fog {snapshot.fog.toFixed(2)}</Text>
    </View>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintBox: {
    position: 'absolute',
    bottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  hintText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  debugBox: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  debugText: {
    color: '#7CFFB2',
    fontSize: fontSize.sm,
  },
});
```

> `spacing` · `radius` · `fontSize` 의 실제 키 이름은 `src/shared/theme/spacing.ts` · `radius.ts` · `typography.ts` 에서 확인하고 없는 키는 있는 것으로 바꾼다.

- [ ] **Step 2: View 에 배선 + hasWiped 상태 + keep-awake**

`Day02WindowFogView.tsx` 에 다음을 추가한다.

`hasWiped` 상태 (글씨를 한 번이라도 썼는지):

```tsx
  const [hasWiped, setHasWiped] = useState(false);
```

`handleWipeStart` 에 `setHasWiped(true)` 를 추가하고, `handleShake` 에 `setHasWiped(false)` 를 추가한다.

화면 꺼짐 방지와 안내문 렌더:

```tsx
import { useKeepAwake } from 'expo-keep-awake';
import { BlowHint } from './_components/BlowHint';

  useKeepAwake();

  const { fogLevel, debugDb, debugStreak, hasMicError } = useBreathDetector(isFocused, isWipingRef);
```

```tsx
    <CameraBackground isActive={isFocused}>
      <GestureDetector gesture={wipeGesture}>
        <View style={StyleSheet.absoluteFill}>
          <FogCanvas fogLevel={fogLevel} activePoints={activePoints} paths={paths} />
        </View>
      </GestureDetector>
      <BlowHint
        fogLevel={fogLevel}
        debugDb={debugDb}
        debugStreak={debugStreak}
        hasWiped={hasWiped}
        hasMicError={hasMicError}
      />
    </CameraBackground>
```

> `BlowHint` 는 `GestureDetector` **밖**에 두고 `pointerEvents="none"` 이므로 터치를 가로채지 않는다.

- [ ] **Step 3: 정적 검증**

```bash
npm run typecheck
npm run lint
```

- [ ] **Step 4: 실기기 확인**

| 확인 | 기대 |
|------|------|
| 앱 진입 | "마이크에 하아~ 불어보세요" 표시 + 좌상단에 dB·streak·fog 숫자 |
| 김이 꽉 참 | 안내문이 "손가락으로 글씨를 써보세요" 로 바뀜 |
| 글씨를 씀 | 안내문이 사라짐 |
| 안내문 위를 문질러도 | 글씨가 정상적으로 그려짐 (터치를 안 가로챔) |
| 1분간 가만히 둠 | 화면이 꺼지지 않음 |

- [ ] **Step 5: 커밋**

```bash
git add src/views/day02-window-fog
git commit -m "✨ Day 02 안내문 + 디버그 오버레이 + 화면 꺼짐 방지"
```

---

## Task 8: 실기기 튜닝 + 마무리

임계값을 실측으로 확정하고 디버그를 끈다.

**Files:**
- Modify: `src/views/day02-window-fog/_constants/fog.ts`
- Modify: `TASKS.md`

- [ ] **Step 1: dB 실측**

`npx expo start --dev-client` 로 실행하고 좌상단 디버그 숫자를 보며 값을 적는다:

| 상황 | 관측 dB | 메모 |
|------|---------|------|
| 조용한 방, 가만히 | | 무음 기준선 |
| 평소 목소리로 대화 | | 이것보다 임계가 높아야 함 |
| 마이크에 하아~ 입김 | | 이것보다 임계가 낮아야 함 |
| 박수 1회 | | 순간값. 지속 필터로 걸러져야 함 |

- [ ] **Step 2: BLOW_DB 확정**

`_constants/fog.ts` 의 `BLOW_DB` 를 **(대화 dB)와 (입김 dB) 사이**로 정한다. 예: 대화 -30, 입김 -12 → `BLOW_DB = -20`.

이어서 체감으로 아래를 조정한다:

| 증상 | 조정 |
|------|------|
| 김이 너무 빨리 참 | `FOG_STEP` 을 낮춤 (0.04 → 0.02) |
| 김이 너무 느리게 참 | `FOG_STEP` 을 올림 (0.04 → 0.07) |
| 말소리에도 서림 | `BLOW_STREAK_TICKS` 를 올림 (5 → 8) |
| 불어도 반응이 굼뜸 | `BLOW_STREAK_TICKS` 를 낮춤 (5 → 3) |
| 흔들기가 너무 쉽게 걸림 | `SHAKE_THRESHOLD_G` 를 올림 (1.8 → 2.2) |
| 세게 흔들어도 안 걸림 | `SHAKE_THRESHOLD_G` 를 낮춤 (1.8 → 1.5) |
| 지우개가 너무 굵음/가늘음 | `WIPE_STROKE_WIDTH` 조정 |

- [ ] **Step 3: 디버그 끄기**

`_constants/fog.ts`:

```ts
export const SHOW_DEBUG = false;
```

- [ ] **Step 4: 전체 시나리오 확인 (설계 문서 12절)**

| # | 경로 | 기대 |
|---|------|------|
| 1 | 런처 > 입김 유리창 진입 | 권한 팝업 2개 → 카메라 프리뷰 |
| 2 | 마이크에 하아~ 2초 | 화면이 점점 뿌예져 꽉 참 |
| 3 | 옆사람과 평소 목소리로 대화 | 김이 서리지 않음 |
| 4 | 손가락으로 하트 그리기 | 지운 자리로 카메라 + 유리 닦는 소리 + 미세 진동 |
| 5 | 손 떼고 10초 대기 | 글씨가 그대로 유지됨 |
| 6 | 폰 흔들기 | 0.4초에 걸쳐 김이 전부 사라짐 |
| 7 | 뒤로가기 → 재진입 | 초기 상태(맑음)로 시작 |
| 8 | 디버그 숫자 | 화면에 안 보임 |

- [ ] **Step 5: 정적 검증**

```bash
npm run typecheck
npm run lint
```

- [ ] **Step 6: TASKS.md 체크 + 튜닝값 기록**

`TASKS.md` 의 Day 02 섹션에서 완료 항목을 `[x]` 로 바꾸고, Day 01 처럼 튜닝된 값 블록을 추가한다:

```markdown
### 튜닝된 값 (`_constants/fog.ts`)

```
입김 판정   BLOW_DB <실측값>, 연속 <실측값>틱(0.1초 단위), FOG_STEP <실측값>
흔들기      임계 <실측값>g, 0.6초 내 2회
지우개      굵기 <실측값>px, 햅틱 80ms 간격
```
```

겪은 문제가 있으면 Day 01 처럼 "겪은 문제와 해결" 표도 추가한다.

- [ ] **Step 7: 커밋**

```bash
git add src/views/day02-window-fog/_constants/fog.ts TASKS.md
git commit -m "🐛 Day 02 임계값 실측 튜닝 + 디버그 출력 정리"
```

- [ ] **Step 8: 머지 여부 확인**

머지는 **배포(=릴스 촬영) 승인 시점**에 한다. 사용자에게 물어본 뒤 진행한다:

```bash
git checkout main
git merge feat/day02-window-fog
git branch -d feat/day02-window-fog
```

`git push` 는 명시적 요청 시에만 실행한다.

---

## 구현 중 막히면 볼 것

| 증상 | 확인할 것 |
|------|-----------|
| `clear` 가 카메라까지 뚫음 | `<Group layer>` 가 빠졌다. Rect 와 clear Path 를 같은 layer Group 안에 둔다 |
| worklet 에서 `Skia.Path.Make()` 크래시 | `useDerivedValue` 대신 `onUpdate` 를 `runOnJS` + 16ms 스로틀 `setState` 로 폴백 |
| `.value` 대입 린트 에러 | `.get()` / `.set()` 으로 바꾼다 |
| 효과음이 안 나거나 녹음이 끊김 | `setAudioModeAsync` 조합. `node_modules/expo-audio/src/Audio.types.ts` 의 `AudioMode` 참조 |
| `metering` 이 항상 `undefined` | `useAudioRecorder` 옵션에 `isMeteringEnabled: true` 가 들어갔는지 확인 |
| 긴 획에서 프레임 드랍 | `activePoints` 배열 복사가 원인. 획당 점 수 상한을 두거나 완성 획을 이미지로 굽는다 |
| API 가 문서와 다름 | `node_modules/<pkg>/src/` 를 직접 읽는다. SDK 56 은 문서보다 코드가 최신이다 |

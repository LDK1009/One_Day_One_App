# 챌린지 진행 기록

새 앱을 시작하면 항목을 추가하고, 커밋이 끝나면 `[x]` 로 표시한다.

---

## 인프라

- [x] RN_Template 기반 챌린지 템플릿 구성 (Supabase·인증 제거, 런처 + 라우트 누적)
- [x] `scripts/new-app.js` — 라우트·화면·레지스트리 자동 생성
- [x] 테마 토큰 확장 (`colors` / `radius` / `typography`)
- [x] dev build 전환 (EAS `development` 프로필, 안드로이드 arm64)
- [x] 자주 쓸 네이티브 모듈 사전 설치 (센서·미디어·비주얼·MMKV)
- [x] 저장소 AsyncStorage → MMKV
- [x] 앱 추출 절차 문서화 (AGENTS.md)
- [x] 빌드·인프라 함정 기록 (AGENTS.md)
- [ ] `scripts/eject-app.js` — 추출 자동화 (추출이 실제로 반복되면)

---

## Day 01 · 송판 격파 ✅

포즈 인식으로 준비 자세를 잡으면 대상이 나오고, 주먹을 지르면 깨진다.
무한 모드. 한 장 깰 때마다 재질이 바뀐다 (송판 → 벽돌 → 콘크리트 → 강철 → 다이아몬드 → 순환).

- [x] 카메라 프리뷰 (VisionCamera v5)
- [x] MoveNet 추론 파이프라인 + 스켈레톤 오버레이
- [x] 준비 자세·주먹 판정 (어깨너비 정규화)
- [x] 게임 상태머신 + 재질별 연출
- [x] 효과음 합성(hit/break) · 햅틱 · 화면 흔들림
- [x] 실기기 검증 및 임계값 실측 튜닝
- [x] 디버그 출력 정리 (로깅 off, 스켈레톤 기본 off)
- [ ] 릴스 촬영

### 겪은 문제와 해결 (재발 방지용)

| 증상 | 원인 | 해결 |
|------|------|------|
| 자세 인식이 전혀 안 됨 | 발목이 프레임 밖 → 발 간격 조건이 항상 false | 발 조건 제거, 손목 높이(`rise`)로 대체 |
| 키포인트 점수 0.01 | float32 모델은 0~255 를 기대하는데 resizer 는 0.0~1.0 정규화 | int8 변형으로 교체 |
| 점수 0.1~0.4 에서 정체 | 카메라 버퍼가 가로(1280×720) → 모델이 누운 사람을 봄 | `enablePhysicalBufferRotation: true` |
| 주먹이 아예 안 잡힘 | 어깨~손목 거리는 정면 지르기에서 안 늘어남 | 손목~골반 거리로 지표 교체 |
| 연속 주먹 누락 | 양손을 max 하나로 묶어 접힘 복귀 실패 | 좌·우 독립 추적기 |

### 튜닝된 값 (`_constants/pose.ts`)

```
준비 자세   손목~골반 ≤ 0.6, 손목 높이 ≥ -0.05, 0.7초 유지
주먹        접힘 ≤ 0.55 → 뻗음 ≥ 0.70, 700ms 이내, 쿨다운 250ms
어깨너비    EMA alpha 0.25, 유효범위 0.08~0.9
```

---

## Day 02 · 입김 유리창 ✅

마이크에 입김을 불면 화면이 서린 유리창처럼 뿌예지고, 손가락으로 문질러 글씨를 쓴다.
김서림 아래는 뒷면 카메라 실시간 화면. 폰을 흔들면 전부 사라진다.
설계: `docs/specs/2026-08-01-day02-window-fog.md` · 계획: `docs/plans/2026-08-01-day02-window-fog.md`

- [x] 설계 확정 (재빌드 불필요 검증 완료 — 네이티브 모듈 추가 0개)
- [x] 앱 스캐폴딩 (`new-app.js window-fog`)
- [x] 카메라 배경 + 권한 분기
- [x] Skia 김서림 레이어 (clear blend 로 지우기)
- [x] 입김 감지 (expo-audio metering + 지속시간 필터)
- [x] 효과음 루프 + 햅틱
- [x] 흔들기 리셋 (Accelerometer)
- [x] 실기기 검증
- [x] 안내문 중앙 배치 + 아이콘, 디버그 패널 off
- [x] 릴스 촬영

### 겪은 문제와 해결 (재발 방지용)

| 증상 | 원인 | 해결 |
|------|------|------|
| 김이 전혀 안 서림, 권한 팝업도 안 뜸 | `app.json` 매니페스트 선언만 하고 **런타임 권한 요청**을 안 함. Android 6+ 는 `RECORD_AUDIO` 가 dangerous 권한 | `prepareToRecordAsync()` 앞에서 `requestRecordingPermissionsAsync()` 호출 |
| 화면을 톡 치면 효과음이 무한 루프, 입김 감지 영구 정지 | `Gesture.Pan` 의 `onEnd` 는 ACTIVE 를 거친 제스처만 호출. 터치 슬롭(≈8dp) 미만은 BEGAN→FAILED | 정리 로직을 `onEnd` → **`onFinalize`** 로 이동 |
| 획을 쓸 때마다 김이 다시 짙어짐 | 이전 획의 `setTimeout` 이 다음 획 도중에 하울링 게이트를 풀어 스피커 소리를 입김으로 오인 | 타이머 id 를 ref 에 보관, 새 획 시작 시 `clearTimeout` |
| 손 뗄 때마다 방금 쓴 획이 깜빡임 | `onEnd`(UI 스레드)가 `activePoints` 를 즉시 비워, JS 커밋 전까지 획이 어디에도 없음 | 비우기를 `commitPath`(JS 스레드) 안으로 옮겨 `setPaths` 와 같은 tick 에 처리 |

### 확정된 값 (`_constants/fog.ts`)

```
입김 판정   BLOW_DB -25, 연속 5틱(0.5초), FOG_STEP 0.04, 폴링 100ms
흔들기      임계 1.8g, 0.6초 내 2회, 리셋 애니메이션 400ms
지우개      굵기 44px, 햅틱 80ms 간격, 입김 재개 지연 200ms
```

실측 튜닝 없이 초기 추측값 그대로 통과. 반응이 둔하면 `SHOW_DEBUG` 를 `true` 로 켜면 dB·streak·fog 가 좌상단에 뜬다.

### 남겨둔 것 (촬영에 지장 없어 보류)

| 내용 | 고치려면 |
|------|----------|
| 탭하면 김에 점 하나가 뚫린 채 다음 제스처까지 남음 | `_components/FogCanvas.tsx` 의 `points.length > 0` → `> 1` |
| 권한 거부 분기에 `isCancelled` 가드 없어, 드문 경우 배너가 잠깐 잘못 뜰 수 있음 | `_hooks/useBreathDetector.ts` 거부 분기에 `if (isCancelled) return;` 추가 |
| 흔들기 판정이 "0.6초 내 임계 초과 **샘플** 2개"라 한 번의 강한 충격에도 걸림 | hit 사이 최소 간격(예: 150ms) 조건 추가 |

---

## Day 03 이후

- [ ] (미정)

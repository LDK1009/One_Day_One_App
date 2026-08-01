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
- [ ] `scripts/eject-app.js` — 추출 자동화 (추출이 실제로 반복되면)

---

## Day 01 · 송판 격파

브랜치 `feat/day01-board-break`

포즈 인식으로 태권도 준비 자세를 잡으면 송판이 나오고, 주먹을 지르면 깨진다.
무한 모드. 누적 격파 수에 따라 송판 강도(필요 타격 횟수)가 오른다.

- [x] S1 — 전면 카메라 프리뷰
- [x] S2 — MoveNet 추론 + 스켈레톤 오버레이 (코드)
- [x] S3~S4 — 준비 자세·주먹 판정 로직 (코드)
- [x] S5 — 송판 연출 + 게임 상태머신 (코드)
- [x] MoveNet 모델 파일 배치
- [ ] **실기기 검증** — 스켈레톤이 몸에 정렬되는지
  - 90° 돌아가면 안드로이드 프레임 회전 보정 필요
  - 거울처럼 반대면 `_constants/pose.ts` 의 `MIRROR_OVERLAY_X` 를 `false` 로
- [ ] **모델 변형 확인** — 화면 상단 디버그 배지의 `model <dtype> <size>` 값
  - `float32` 면 입력 범위 불일치 가능 (resizer 는 0~1, MoveNet float 는 0~255 기대) → int8 변형으로 교체
- [ ] 준비 자세 임계값 튜닝 (`READY_STANCE`)
- [ ] 주먹 임계값 튜닝 (`PUNCH`)
- [ ] 릴스 촬영
- [ ] `main` 머지

---

## Day 02 이후

- [ ] (미정)

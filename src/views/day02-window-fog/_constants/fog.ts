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
export const SHOW_DEBUG = false;
export const DEBUG_POLL_MS = 200; // 디버그 오버레이 갱신 주기

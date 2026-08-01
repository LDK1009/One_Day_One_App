//////////////////////////////////////// 라운드 토큰 ////////////////////////////////////////
// 앱마다 인상을 크게 바꾸는 값. 각지게 가려면 전부 낮추고, 말랑하게 가려면 올립니다.

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
  full: 999,
} as const;

export type Radius = keyof typeof radius;

//////////////////////////////////////// 컬러 토큰 ////////////////////////////////////////
// 앱의 룩을 바꿀 때 이 파일만 수정합니다.
// brand = Paper MD3 테마에 주입되는 색 / accents = 런처 카드에 순환 적용되는 색.

export const brand = {
  primary: '#3B5BFF',
  secondary: '#6C7A93',
  error: '#E5484D',
  success: '#30A46C',
  warning: '#F5A524',
} as const;

//////////////////// 런처 accent 팔레트 ////////////////////
// Day 번호 순서대로 순환 사용합니다 (accentByDay 참고).
export const accents = [
  '#3B5BFF',
  '#E5484D',
  '#30A46C',
  '#F5A524',
  '#8E4EC6',
  '#0BA5EC',
  '#EC4899',
  '#14B8A6',
] as const;

////////// Day 번호로 accent 색 선택 (new-app.js 도 같은 규칙을 사용)
export function accentByDay(day: number): string {
  const index = ((day - 1) % accents.length + accents.length) % accents.length;
  return accents[index];
}

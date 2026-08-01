//////////////////////////////////////// 격파 대상 재질 ////////////////////////////////////////
// 누적 격파 수가 올라가면 대상이 단단해진다. 재질마다 색·무늬·파편이 전부 다르다.
//
// 배열 순서 = 필요 타격 횟수 - 1  (0번 = 1타에 깨지는 송판)

export type MaterialPattern = 'wood' | 'brick' | 'concrete' | 'steel' | 'crystal';

export type BoardMaterial = {
  name: string;
  ////////// 정면 그라데이션 (위 → 아래)
  gradient: readonly [string, string, string, string];
  ////////// 테두리
  borderColor: string;
  ////////// 아래쪽 두께 면 (밝은 쪽 → 어두운 쪽)
  edgeGradient: readonly [string, string];
  ////////// 균열 색
  crackColor: string;
  ////////// 파편 색·테두리
  splinterColor: string;
  splinterBorder: string;
  ////////// 무늬 종류
  pattern: MaterialPattern;
  ////////// 파편 모양 비율 (1 = 정사각, 낮을수록 길쭉한 조각)
  splinterAspect: number;
};

export const BOARD_MATERIALS: readonly BoardMaterial[] = [
  {
    name: '송판',
    gradient: ['#E8C89B', '#D2A06B', '#B87F4C', '#96603A'],
    borderColor: '#6B4526',
    edgeGradient: ['#8A5A32', '#6B4526'],
    crackColor: 'rgba(30,14,2,0.85)',
    splinterColor: '#B87F4C',
    splinterBorder: '#6B4526',
    pattern: 'wood',
    ////////// 나무는 결을 따라 길쭉하게 쪼개진다
    splinterAspect: 0.35,
  },
  {
    name: '벽돌',
    gradient: ['#C0603F', '#A94B31', '#8E3B26', '#6F2C1C'],
    borderColor: '#4A1D12',
    edgeGradient: ['#7A3222', '#4A1D12'],
    crackColor: 'rgba(20,8,4,0.9)',
    splinterColor: '#A94B31',
    splinterBorder: '#4A1D12',
    pattern: 'brick',
    ////////// 벽돌은 덩어리로 떨어진다
    splinterAspect: 0.75,
  },
  {
    name: '콘크리트',
    gradient: ['#B9BCBE', '#9BA0A3', '#7F8588', '#63696C'],
    borderColor: '#4A4F52',
    edgeGradient: ['#6E7477', '#4A4F52'],
    crackColor: 'rgba(20,22,24,0.9)',
    splinterColor: '#8E9497',
    splinterBorder: '#4A4F52',
    pattern: 'concrete',
    ////////// 콘크리트는 불규칙한 조각
    splinterAspect: 0.6,
  },
  {
    name: '강철',
    gradient: ['#D6DBE2', '#A8B0BA', '#79828F', '#525A66'],
    borderColor: '#333A44',
    edgeGradient: ['#5E6672', '#333A44'],
    crackColor: 'rgba(10,12,16,0.95)',
    splinterColor: '#9AA3AE',
    splinterBorder: '#333A44',
    pattern: 'steel',
    ////////// 금속은 얇게 찢어진다
    splinterAspect: 0.3,
  },
  {
    name: '다이아몬드',
    gradient: ['#EAFBFF', '#9FE4F5', '#5FC2E0', '#2E93B8'],
    borderColor: '#1C6C8C',
    edgeGradient: ['#3FA3C6', '#1C6C8C'],
    crackColor: 'rgba(255,255,255,0.9)',
    splinterColor: '#B8ECF9',
    splinterBorder: '#2E93B8',
    pattern: 'crystal',
    ////////// 결정은 각진 조각으로 튄다
    splinterAspect: 0.85,
  },
] as const;

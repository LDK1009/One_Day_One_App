//////////////////////////////////////// 재질 무늬 ////////////////////////////////////////
// 재질마다 완전히 다른 표면을 그린다. 이미지 에셋 없이 뷰 조합으로만 구성.
//
//   wood      가로 나뭇결
//   brick     벽돌 격자 + 회색 줄눈 (한 줄씩 어긋남)
//   concrete  거친 반점 + 골재 덩어리
//   steel     세로 광택 밴드 + 모서리 리벳
//   crystal   대각 패싯 + 하이라이트

import { StyleSheet, View } from 'react-native';

import type { MaterialPattern } from '../_constants/materials';

type BoardPatternProps = {
  pattern: MaterialPattern;
  width: number;
  height: number;
  ////////// 왼쪽 반쪽인지 (무늬를 좌우로 이어 붙이기 위해)
  isLeft: boolean;
};

export function BoardPattern({ pattern, width, height, isLeft }: BoardPatternProps) {
  if (pattern === 'wood') return <WoodPattern width={width} height={height} isLeft={isLeft} />;
  if (pattern === 'brick') return <BrickPattern width={width} height={height} />;
  if (pattern === 'concrete') return <ConcretePattern width={width} height={height} />;
  if (pattern === 'steel') return <SteelPattern width={width} height={height} />;
  return <CrystalPattern width={width} height={height} />;
}

type PatternProps = {
  width: number;
  height: number;
  isLeft?: boolean;
};

//////////////////// 나무 — 가로 결 ////////////////////
const GRAIN_LINES = [
  [0.18, 0.82, 0.18],
  [0.3, 0.55, 0.1],
  [0.46, 0.92, 0.22],
  [0.6, 0.4, 0.09],
  [0.72, 0.75, 0.16],
  [0.86, 0.5, 0.1],
] as const;

function WoodPattern({ height, isLeft }: PatternProps) {
  return (
    <>
      {GRAIN_LINES.map((line, index) => (
        <View
          key={`grain-${index}`}
          style={[
            styles.grain,
            {
              top: height * line[0],
              width: `${line[1] * 100}%`,
              opacity: line[2],
              left: isLeft ? 0 : undefined,
              right: isLeft ? undefined : 0,
            },
          ]}
        />
      ))}
    </>
  );
}

//////////////////// 벽돌 — 격자 + 줄눈 ////////////////////
const BRICK_ROWS = 4;

function BrickPattern({ width, height }: PatternProps) {
  const rowHeight = height / BRICK_ROWS;
  const brickWidth = width / 2;

  return (
    <>
      {/* 가로 줄눈 */}
      {Array.from({ length: BRICK_ROWS - 1 }).map((_, index) => (
        <View
          key={`mortar-h-${index}`}
          style={[styles.mortar, { top: rowHeight * (index + 1) - 1.5, left: 0, right: 0, height: 3 }]}
        />
      ))}

      {/* 세로 줄눈 — 한 줄 건너 반 칸 어긋나게 */}
      {Array.from({ length: BRICK_ROWS }).map((_, rowIndex) => {
        const shift = rowIndex % 2 === 0 ? 0 : brickWidth / 2;
        return Array.from({ length: 3 }).map((__, columnIndex) => {
          const left = shift + brickWidth * columnIndex;
          if (left <= 0 || left >= width) return null;
          return (
            <View
              key={`mortar-v-${rowIndex}-${columnIndex}`}
              style={[
                styles.mortar,
                { top: rowHeight * rowIndex, left: left - 1.5, width: 3, height: rowHeight },
              ]}
            />
          );
        });
      })}
    </>
  );
}

//////////////////// 콘크리트 — 반점 + 골재 ////////////////////
// 좌표는 0~1 비율. 매 렌더 같은 무늬가 나오도록 고정값 사용.
const SPECKLES = [
  [0.12, 0.22, 2], [0.31, 0.14, 3], [0.55, 0.28, 2], [0.78, 0.18, 4],
  [0.2, 0.52, 3], [0.44, 0.62, 2], [0.68, 0.48, 3], [0.88, 0.58, 2],
  [0.08, 0.78, 4], [0.36, 0.85, 2], [0.6, 0.74, 3], [0.83, 0.88, 3],
  [0.5, 0.4, 5], [0.25, 0.36, 2], [0.72, 0.68, 2],
] as const;

function ConcretePattern({ width, height }: PatternProps) {
  return (
    <>
      {SPECKLES.map((speckle, index) => (
        <View
          key={`speckle-${index}`}
          style={[
            styles.speckle,
            {
              left: width * speckle[0],
              top: height * speckle[1],
              width: speckle[2] * 2,
              height: speckle[2] * 2,
              borderRadius: speckle[2],
              opacity: index % 3 === 0 ? 0.35 : 0.2,
            },
          ]}
        />
      ))}
      {/* 표면 얼룩 */}
      <View style={[styles.stain, { left: width * 0.15, top: height * 0.3, width: width * 0.35 }]} />
      <View style={[styles.stain, { left: width * 0.55, top: height * 0.62, width: width * 0.3 }]} />
    </>
  );
}

//////////////////// 강철 — 광택 + 리벳 ////////////////////
const RIVET_POSITIONS = [0.14, 0.38, 0.62, 0.86] as const;

function SteelPattern({ width, height }: PatternProps) {
  return (
    <>
      {/* 세로 광택 밴드 */}
      <View style={[styles.sheen, { left: width * 0.18, width: width * 0.1 }]} />
      <View style={[styles.sheen, { left: width * 0.52, width: width * 0.05, opacity: 0.18 }]} />

      {/* 위아래 리벳 */}
      {RIVET_POSITIONS.map((position, index) => (
        <View key={`rivet-top-${index}`} style={[styles.rivet, { left: width * position, top: 6 }]} />
      ))}
      {RIVET_POSITIONS.map((position, index) => (
        <View
          key={`rivet-bottom-${index}`}
          style={[styles.rivet, { left: width * position, top: height - 12 }]}
        />
      ))}
    </>
  );
}

//////////////////// 다이아몬드 — 패싯 + 하이라이트 ////////////////////
const FACETS = [
  [0.1, 28], [0.35, -34], [0.6, 30], [0.85, -26],
] as const;

function CrystalPattern({ width, height }: PatternProps) {
  return (
    <>
      {FACETS.map((facet, index) => (
        <View
          key={`facet-${index}`}
          style={[
            styles.facet,
            {
              left: width * facet[0],
              height: height * 1.6,
              transform: [{ rotate: `${facet[1]}deg` }],
            },
          ]}
        />
      ))}
      {/* 반짝임 */}
      <View style={[styles.sparkle, { left: width * 0.22, top: height * 0.28 }]} />
      <View style={[styles.sparkle, { left: width * 0.7, top: height * 0.6, width: 6, height: 6 }]} />
    </>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const styles = StyleSheet.create({
  grain: {
    position: 'absolute',
    height: 2,
    borderRadius: 999,
    backgroundColor: '#5C3A1E',
  },
  mortar: {
    position: 'absolute',
    backgroundColor: 'rgba(214,208,198,0.75)',
  },
  speckle: {
    position: 'absolute',
    backgroundColor: '#2E3436',
  },
  stain: {
    position: 'absolute',
    height: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  sheen: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.32)',
  },
  rivet: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B434E',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  facet: {
    position: 'absolute',
    top: '-30%',
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  sparkle: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
});

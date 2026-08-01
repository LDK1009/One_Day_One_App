//////////////////////////////////////// 키포인트 파싱 ////////////////////////////////////////
// 모델 출력(Float32Array) → 프레임 기준 정규 좌표(0~1)로 변환합니다.
// 프레임 프로세서(worklet) 안에서 호출되므로 모든 함수에 'worklet' 지시자가 필요합니다.
//
// 데이터 흐름:
//   Float32Array(51) [y,x,score] × 17          모델이 준 값 (192×192 정사각 기준)
//     → 레터박스 패딩 제거                        scaleMode 'contain' 으로 생긴 여백 보정
//     → { nose: {x,y,score}, ... } 17개          프레임 기준 0~1 좌표

import { KEYPOINT_NAMES, MODEL_INPUT_SIZE } from '../_constants/pose';

export type KeypointName = (typeof KEYPOINT_NAMES)[number];

export type Keypoint = {
  x: number;
  y: number;
  score: number;
};

export type PoseKeypoints = Record<KeypointName, Keypoint>;

////////// 좌표를 못 구했을 때 쓰는 빈 값
export function createEmptyKeypoints(): PoseKeypoints {
  'worklet';
  const empty = {} as PoseKeypoints;
  for (let index = 0; index < KEYPOINT_NAMES.length; index += 1) {
    empty[KEYPOINT_NAMES[index]] = { x: 0, y: 0, score: 0 };
  }
  return empty;
}

//////////////////// 모델 출력 파싱 ////////////////////
// scaleMode 'contain' 은 프레임을 정사각형 안에 넣고 남는 공간을 여백으로 채웁니다.
// 모델 좌표는 그 정사각형 기준이므로 여백을 빼고 실제 프레임 비율로 되돌립니다.
export function parseMoveNetOutput(
  output: Float32Array,
  frameWidth: number,
  frameHeight: number,
  modelInputSize: number = MODEL_INPUT_SIZE,
): PoseKeypoints {
  'worklet';

  ////////// 1) 프레임이 정사각형 안에 그려진 크기·여백 계산
  const scale = Math.min(modelInputSize / frameWidth, modelInputSize / frameHeight);
  const drawWidth = frameWidth * scale;
  const drawHeight = frameHeight * scale;
  const offsetX = (modelInputSize - drawWidth) / 2;
  const offsetY = (modelInputSize - drawHeight) / 2;

  ////////// 2) 키포인트 17개를 프레임 기준 0~1 좌표로 환산
  const keypoints = {} as PoseKeypoints;
  for (let index = 0; index < KEYPOINT_NAMES.length; index += 1) {
    const base = index * 3;
    const squareY = output[base] * modelInputSize;
    const squareX = output[base + 1] * modelInputSize;
    const score = output[base + 2];

    keypoints[KEYPOINT_NAMES[index]] = {
      x: (squareX - offsetX) / drawWidth,
      y: (squareY - offsetY) / drawHeight,
      score: score,
    };
  }

  return keypoints;
}

//////////////////// 기하 유틸 ////////////////////
export function distance(a: Keypoint, b: Keypoint): number {
  'worklet';
  const deltaX = a.x - b.x;
  const deltaY = a.y - b.y;
  return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
}

////////// 정규화 기준이 되는 어깨 너비. 어깨를 못 찾으면 0 을 돌려줍니다.
export function getShoulderWidth(keypoints: PoseKeypoints, minScore: number): number {
  'worklet';
  const left = keypoints.leftShoulder;
  const right = keypoints.rightShoulder;
  if (left.score < minScore || right.score < minScore) return 0;

  const width = distance(left, right);
  return width;
}

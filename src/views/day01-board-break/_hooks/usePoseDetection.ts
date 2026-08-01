//////////////////////////////////////// 포즈 추론 ////////////////////////////////////////
// 카메라 프레임 → 192×192 리사이즈 → MoveNet 추론 → 키포인트 SharedValue 갱신.
// onFrame 은 별도 워클릿 런타임에서 동기 실행되므로 무거운 작업을 넣으면 프레임이 드랍됩니다.
//
// 데이터 흐름:
//   Frame(예: 1280×720 yuv)
//     → resizer.resize()        192×192 rgb uint8 (contain, 여백 포함)
//     → model.runSync()         Float32Array(51) = [y,x,score] × 17
//     → parseMoveNetOutput()    { nose:{x,y,score}, ... } 프레임 기준 0~1
//     → keypoints.value         UI 스레드에서 오버레이·판정이 읽어감

import { useTensorflowModel } from 'react-native-fast-tflite';
import { useCallback } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import { useFrameOutput, type Frame } from 'react-native-vision-camera';
import { useResizer } from 'react-native-vision-camera-resizer';

import { MIN_KEYPOINT_SCORE, MODEL_INPUT_SIZE } from '../_constants/pose';
import {
  createEmptyKeypoints,
  distance,
  getShoulderWidth,
  parseMoveNetOutput,
  type PoseKeypoints,
} from '../_utils/keypoints';
import { computeMaxReach, computeWristRise, isReadyStance } from '../_utils/poseDetect';

////////// 번들에 포함되는 모델 파일 (metro.config.js 의 assetExts 에 tflite 등록 필요)
// eslint-disable-next-line @typescript-eslint/no-require-imports -- 에셋은 require 로만 번들에 포함됩니다
const MOVENET_MODEL = require('../../../../assets/models/movenet_lightning.tflite');

////////// 디버깅용 — Metro 콘솔에 몇 프레임마다 중간값을 찍을지 (0 이면 끔)
const LOG_EVERY_N_FRAMES = 30;

export type FrameSize = {
  width: number;
  height: number;
};

export type PoseDetection = {
  frameOutput: ReturnType<typeof useFrameOutput>;
  keypoints: SharedValue<PoseKeypoints>;
  ////////// 오버레이를 프리뷰에 맞추려면 원본 프레임 크기가 필요합니다
  frameSize: SharedValue<FrameSize>;
  ////////// 매 추론마다 증가. 프레임이 실제로 처리되고 있는지 확인용
  frameCount: SharedValue<number>;
  isReady: boolean;
  ////////// 실제로 로드된 모델의 입력 사양 (디버그 표시용)
  inputInfo?: { dataType: string; size: number };
  error?: Error;
};

export function usePoseDetection(): PoseDetection {
  const keypoints = useSharedValue<PoseKeypoints>(createEmptyKeypoints());
  const frameSize = useSharedValue<FrameSize>({ width: 0, height: 0 });
  const frameCount = useSharedValue(0);

  ////////// 1) 모델 로드 (CPU delegate)
  const modelState = useTensorflowModel(MOVENET_MODEL, []);
  const model = modelState.state === 'loaded' ? modelState.model : undefined;

  ////////// 2) 모델이 실제로 요구하는 입력 사양을 읽어옴
  //         MoveNet 변형(int8 / float16 / float32)마다 dtype·크기가 달라 하드코딩하지 않습니다.
  //         shape = [1, size, size, 3]
  const inputTensor = model?.inputs[0];
  const inputSize = inputTensor?.shape[1] ?? MODEL_INPUT_SIZE;

  ////////// 모델이 실제로 요구하는 입력 사양 확인용 (변형마다 다름)
  if (inputTensor != null) {
    console.log(
      `[pose] model input: dtype=${inputTensor.dataType} shape=[${inputTensor.shape.join(',')}]`,
    );
  }
  const isQuantizedInput =
    inputTensor?.dataType === 'uint8' || inputTensor?.dataType === 'int8';
  const inputDataType = isQuantizedInput ? 'uint8' : 'float32';

  ////////// 3) 프레임 → 모델 입력 변환기
  //         contain = 프레임 전체를 정사각형 안에 넣음(여백 발생). 사람 전신이 잘리지 않게 하려는 선택.
  const { resizer } = useResizer({
    width: inputSize,
    height: inputSize,
    channelOrder: 'rgb',
    dataType: inputDataType,
    scaleMode: 'contain',
    pixelLayout: 'interleaved',
  });

  ////////// 4) 프레임 프로세서 (워클릿)
  const onFrame = useCallback(
    (frame: Frame) => {
      'worklet';
      if (model == null || resizer == null) {
        frame.dispose();
        return;
      }

      const frameWidth = frame.width;
      const frameHeight = frame.height;

      const resized = resizer.resize(frame);
      frame.dispose();

      ////////// dispose 전에 복사해 둬야 모델이 안전하게 읽을 수 있습니다
      const inputBuffer = resized.getPixelBuffer().slice(0);
      resized.dispose();

      const outputs = model.runSync([inputBuffer]);
      const output = new Float32Array(outputs[0]);

      const parsed = parseMoveNetOutput(output, frameWidth, frameHeight, inputSize);
      keypoints.set(parsed);
      frameSize.set({ width: frameWidth, height: frameHeight });

      const nextCount = frameCount.get() + 1;
      frameCount.set(nextCount);

      ////////// 중간값을 Metro 콘솔로 — 어느 단계에서 값이 깨지는지 확인용
      if (LOG_EVERY_N_FRAMES > 0 && nextCount % LOG_EVERY_N_FRAMES === 0) {
        ////////// 모델에 들어간 이미지의 밝기 분포 (여백 위치·내용 유무 확인)
        //         6×6 격자로 R 채널 평균을 뽑아 0~9 로 표시. 0 이면 새까만 영역.
        const pixels = new Uint8Array(inputBuffer);
        const gridSize = 6;
        const cell = Math.floor(inputSize / gridSize);
        let brightnessMap = '';
        for (let gridY = 0; gridY < gridSize; gridY += 1) {
          for (let gridX = 0; gridX < gridSize; gridX += 1) {
            let sum = 0;
            let samples = 0;
            for (let y = gridY * cell; y < (gridY + 1) * cell; y += 4) {
              for (let x = gridX * cell; x < (gridX + 1) * cell; x += 4) {
                sum += pixels[(y * inputSize + x) * 3];
                samples += 1;
              }
            }
            brightnessMap += Math.min(9, Math.floor(sum / samples / 26));
          }
          brightnessMap += gridY < gridSize - 1 ? '|' : '';
        }
        ////////// 채널별 평균 + 중앙 픽셀 샘플 (YUV→RGB 변환·채널순서 확인)
        let sumR = 0;
        let sumG = 0;
        let sumB = 0;
        let channelSamples = 0;
        for (let y = 0; y < inputSize; y += 8) {
          for (let x = 0; x < inputSize; x += 8) {
            const offset = (y * inputSize + x) * 3;
            sumR += pixels[offset];
            sumG += pixels[offset + 1];
            sumB += pixels[offset + 2];
            channelSamples += 1;
          }
        }
        const centerOffset = (Math.floor(inputSize / 2) * inputSize + Math.floor(inputSize / 2)) * 3;
        console.log(
          `[pose] brightness ${brightnessMap} ` +
            `mean=R${Math.round(sumR / channelSamples)}/G${Math.round(sumG / channelSamples)}/B${Math.round(sumB / channelSamples)} ` +
            `center=(${pixels[centerOffset]},${pixels[centerOffset + 1]},${pixels[centerOffset + 2]})`,
        );

        console.log(
          `[pose] frame=${nextCount} size=${frameWidth}x${frameHeight} ` +
            `bytes=${inputBuffer.byteLength} out=${output.length} ` +
            `raw0=${output[0].toFixed(3)},${output[1].toFixed(3)},${output[2].toFixed(3)} ` +
            `shoulder=${parsed.leftShoulder.score.toFixed(2)}/${parsed.rightShoulder.score.toFixed(2)} ` +
            `hip=${parsed.leftHip.score.toFixed(2)}/${parsed.rightHip.score.toFixed(2)} ` +
            `wrist=${parsed.leftWrist.score.toFixed(2)}/${parsed.rightWrist.score.toFixed(2)} ` +
            `nose=(${parsed.nose.x.toFixed(2)},${parsed.nose.y.toFixed(2)})`,
        );

        ////////// 자세 판정에 실제로 쓰이는 수치 (임계값 튜닝용)
        const shoulderWidth = getShoulderWidth(parsed, MIN_KEYPOINT_SCORE);
        if (shoulderWidth > 0) {
          console.log(
            `[pose] shoulderW=${shoulderWidth.toFixed(3)} ` +
              `wristHip=${(distance(parsed.leftWrist, parsed.leftHip) / shoulderWidth).toFixed(2)}/` +
              `${(distance(parsed.rightWrist, parsed.rightHip) / shoulderWidth).toFixed(2)} ` +
              `rise=${computeWristRise(parsed.leftWrist, parsed.leftHip, shoulderWidth).toFixed(2)}/` +
              `${computeWristRise(parsed.rightWrist, parsed.rightHip, shoulderWidth).toFixed(2)} ` +
              `reach=${computeMaxReach(parsed, shoulderWidth).toFixed(2)} ` +
              `stance=${isReadyStance(parsed, shoulderWidth) ? 'OK' : 'NG'}`,
          );
        }
      }
    },
    [model, resizer, inputSize, keypoints, frameSize, frameCount],
  );

  const frameOutput = useFrameOutput({
    pixelFormat: 'yuv',
    ////////// 카메라 센서는 가로 버퍼(예: 1280×720)를 주고 프리뷰만 회전시킨다.
    //         이 옵션을 켜야 버퍼가 물리적으로 회전되어 모델이 "서 있는 사람"을 본다.
    //         끄면 모델 입장에서는 사람이 누워 있어 인식률이 급락한다.
    enablePhysicalBufferRotation: true,
    onFrame,
  });

  return {
    frameOutput,
    keypoints,
    frameSize,
    frameCount,
    isReady: model != null && resizer != null,
    inputInfo:
      inputTensor != null ? { dataType: inputTensor.dataType, size: inputSize } : undefined,
    error: modelState.state === 'error' ? modelState.error : undefined,
  };
}

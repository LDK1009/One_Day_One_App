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

import { MODEL_INPUT_SIZE } from '../_constants/pose';
import {
  createEmptyKeypoints,
  parseMoveNetOutput,
  type PoseKeypoints,
} from '../_utils/keypoints';

////////// 번들에 포함되는 모델 파일 (metro.config.js 의 assetExts 에 tflite 등록 필요)
// eslint-disable-next-line @typescript-eslint/no-require-imports -- 에셋은 require 로만 번들에 포함됩니다
const MOVENET_MODEL = require('../../../../assets/models/movenet_lightning.tflite');

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

      keypoints.set(parseMoveNetOutput(output, frameWidth, frameHeight, inputSize));
      frameSize.set({ width: frameWidth, height: frameHeight });
      frameCount.set(frameCount.get() + 1);
    },
    [model, resizer, inputSize, keypoints, frameSize, frameCount],
  );

  const frameOutput = useFrameOutput({
    pixelFormat: 'yuv',
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

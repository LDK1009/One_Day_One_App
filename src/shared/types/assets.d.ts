//////////////////////////////////////// 에셋 모듈 타입 ////////////////////////////////////////
// metro.config.js 의 assetExts 에 등록한 확장자는 TypeScript 에도 알려줘야 import 가 됩니다.

declare module '*.tflite' {
  const asset: number;
  export default asset;
}

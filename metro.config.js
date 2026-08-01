//////////////////////////////////////// Metro 설정 ////////////////////////////////////////
// .tflite 모델 파일을 에셋으로 번들링하기 위해 assetExts 에 확장자를 추가합니다.
// (react-native-fast-tflite 요구사항)

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('tflite');

module.exports = config;

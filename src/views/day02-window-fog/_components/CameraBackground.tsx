//////////////////////////////////////// 카메라 배경 ////////////////////////////////////////
// 뒷면 카메라 프리뷰를 전체 화면으로 깔고 그 위에 children(김서림 캔버스)을 올립니다.
// 권한 요청·거부·기기 없음 상태를 모두 여기서 처리합니다.
//
// outputs 를 빈 배열로 넘기면 프리뷰만 켜집니다. vision-camera v5 는
// useVideoOutput({ enableAudio }) 를 쓸 때만 마이크를 잡으므로 마이크는 expo-audio 가 단독 점유합니다.

import { Linking, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';

import { fontSize, spacing } from '@/shared/theme';

type CameraBackgroundProps = {
  ////////// 화면이 포커스를 잃으면 false 로 내려 카메라를 멈춥니다
  isActive: boolean;
  children?: React.ReactNode;
};

export function CameraBackground({ isActive, children }: CameraBackgroundProps) {
  const { hasPermission, canRequestPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  ////////// 권한 없음
  if (!hasPermission) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>창밖 풍경을 비추려면 카메라 권한이 필요합니다.</Text>
        {canRequestPermission ? (
          <Button mode="contained" onPress={requestPermission}>
            권한 허용
          </Button>
        ) : (
          <Button mode="outlined" onPress={() => Linking.openSettings()}>
            설정 열기
          </Button>
        )}
      </View>
    );
  }

  ////////// 뒷면 카메라 없음 — 어두운 배경으로 폴백하고 나머지 기능은 그대로 동작시킵니다
  if (device == null) {
    return <View style={styles.deviceFallback}>{children}</View>;
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        outputs={[]}
        resizeMode="cover"
      />
      {children}
    </View>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  deviceFallback: {
    flex: 1,
    backgroundColor: '#101418',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  fallbackText: {
    fontSize: fontSize.md,
    textAlign: 'center',
  },
});

//////////////////////////////////////// 카메라 레이어 ////////////////////////////////////////
// 전면 카메라 프리뷰를 전체 화면으로 깔고, 그 위에 게임 UI(children)를 올립니다.
// 권한 요청·거부·기기 없음 상태를 모두 여기서 처리합니다.

import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  type CameraFrameOutput,
} from 'react-native-vision-camera';

import { fontSize, spacing } from '@/shared/theme';

type CameraLayerProps = {
  ////////// 프레임 프로세서 출력. 없으면 프리뷰만 렌더합니다 (S1 확인용)
  frameOutput?: CameraFrameOutput;
  ////////// 화면이 포커스를 잃으면 false 로 내려 카메라를 멈춥니다
  isActive: boolean;
  children?: React.ReactNode;
};

export function CameraLayer({ frameOutput, isActive, children }: CameraLayerProps) {
  const { hasPermission, canRequestPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('front');

  ////////// 권한 없음
  if (!hasPermission) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>
          동작을 인식하려면 카메라 권한이 필요합니다.
        </Text>
        {canRequestPermission ? (
          <Button mode="contained" onPress={requestPermission}>
            권한 허용
          </Button>
        ) : (
          <Text style={styles.fallbackHint}>
            설정 앱에서 카메라 권한을 직접 허용해 주세요.
          </Text>
        )}
      </View>
    );
  }

  ////////// 전면 카메라 없음
  if (device == null) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>전면 카메라를 찾지 못했습니다.</Text>
      </View>
    );
  }

  const outputs = frameOutput != null ? [frameOutput] : [];

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        outputs={outputs}
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
  fallbackHint: {
    fontSize: fontSize.sm,
    opacity: 0.6,
    textAlign: 'center',
  },
});

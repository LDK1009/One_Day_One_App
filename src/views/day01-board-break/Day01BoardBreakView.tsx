//////////////////////////////////////// 송판 격파 ////////////////////////////////////////
// 전면 카메라로 자세를 인식해 송판을 격파하는 게임.
//
// 흐름:
//   카메라 프레임 → usePoseDetection(MoveNet 추론) → keypoints SharedValue
//     → useBreakGame(준비자세/주먹 판정) → 게임 상태
//     → BoardStage(송판 연출) · ScoreHud(점수·안내)

import { useIsFocused, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fontSize, fontWeight, radius, spacing } from '@/shared/theme';

import { BoardStage } from './_components/BoardStage';
import { CameraLayer } from './_components/CameraLayer';
import { GuideBanner } from './_components/GuideBanner';
import { ScoreHud } from './_components/ScoreHud';
import { SkeletonOverlay } from './_components/SkeletonOverlay';
import { useBreakGame } from './_hooks/useBreakGame';
import { usePoseDetection } from './_hooks/usePoseDetection';

export function Day01BoardBreakView() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isFocused = useIsFocused();

  ////////// 인식이 안 될 때 원인을 눈으로 보려면 켭니다
  const [showSkeleton, setShowSkeleton] = useState(true);

  const { frameOutput, keypoints, frameSize, isReady, inputInfo, error } = usePoseDetection();
  const game = useBreakGame({ keypoints });

  return (
    <CameraLayer isActive={isFocused} frameOutput={frameOutput}>
      {showSkeleton && <SkeletonOverlay keypoints={keypoints} frameSize={frameSize} />}

      <View
        style={[
          styles.overlay,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl },
        ]}
      >
        {/* 상단 — 뒤로가기 · 점수 · 스켈레톤 토글 */}
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.iconButton}>
            <Text style={styles.iconButtonText}>←</Text>
          </Pressable>

          <ScoreHud brokenCount={game.brokenCount} />

          <Pressable onPress={() => setShowSkeleton((shown) => !shown)} style={styles.iconButton}>
            <Text style={styles.iconButtonText}>{showSkeleton ? '⦿' : '○'}</Text>
          </Pressable>
        </View>

        {/* 디버그 — 실제 로드된 모델 입력 사양 */}
        {showSkeleton && inputInfo != null && (
          <Text style={styles.debugText}>
            model {inputInfo.dataType} {inputInfo.size}×{inputInfo.size}
          </Text>
        )}

        {/* 중앙 — 송판 */}
        <View style={styles.center}>
          {game.phase === 'playing' && (
            <BoardStage
              currentHits={game.currentHits}
              requiredHits={game.requiredHits}
              boardLabel={game.boardLabel}
              isBreaking={game.isBreaking}
              brokenCount={game.brokenCount}
            />
          )}
        </View>

        {/* 하단 — 안내 문구 */}
        <GuideBanner
          phase={game.phase}
          isStanceHeld={game.isStanceHeld}
          isModelReady={isReady}
        />

        {/* 모델 로드 실패 안내 */}
        {error != null && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              모델을 불러오지 못했습니다.{'\n'}
              assets/models/movenet_lightning_int8.tflite 파일을 확인하세요.
            </Text>
          </View>
        )}
      </View>
    </CameraLayer>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  iconButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  debugText: {
    alignSelf: 'center',
    marginTop: spacing.sm,
    color: '#00E5FF',
    fontSize: fontSize.xs,
  },
  errorBox: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(180,30,30,0.85)',
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
});

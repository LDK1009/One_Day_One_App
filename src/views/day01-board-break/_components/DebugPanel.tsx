//////////////////////////////////////// 디버그 패널 ////////////////////////////////////////
// 인식이 안 될 때 "어느 단계에서 끊겼는지" 눈으로 확인하기 위한 실시간 중간값 표시.
// 게임 로직과 분리되어 있고(같은 순수 함수를 다시 호출할 뿐) 끄면 아무 영향 없다.
//
// 읽는 법:
//   frames   0 이면 → 프레임 프로세서가 안 돎 (카메라·리사이저·모델 중 하나가 죽음)
//   sh/hip/wr/ank  각 키포인트 신뢰도. 0.3 미만이면 그 부위를 못 잡고 있다는 뜻
//   gap      발 간격 / 어깨너비. READY_STANCE.minAnkleGapRatio 이상이어야 함
//   wrist    손목~골반 거리 / 어깨너비. READY_STANCE.maxWristToHipRatio 이하여야 함
//   reach    어깨~손목 거리 / 어깨너비. 주먹 판정 기준값
//   stance   위 조건을 모두 만족하면 OK

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useAnimatedReaction, type SharedValue } from 'react-native-reanimated';
import { runOnJS } from 'react-native-worklets';

import { MIN_KEYPOINT_SCORE, PUNCH, READY_STANCE } from '../_constants/pose';
import { distance, getShoulderWidth, type PoseKeypoints } from '../_utils/keypoints';
import { computeMaxReach, isReadyStance } from '../_utils/poseDetect';

////////// 몇 프레임마다 화면을 갱신할지. 매 프레임 setState 하면 JS 스레드가 막힌다
const UPDATE_EVERY_N_FRAMES = 8;

type DebugStats = {
  frames: number;
  shoulderScoreLeft: number;
  shoulderScoreRight: number;
  hipScoreLeft: number;
  hipScoreRight: number;
  wristScoreLeft: number;
  wristScoreRight: number;
  ankleScoreLeft: number;
  ankleScoreRight: number;
  shoulderWidth: number;
  ankleGapRatio: number;
  wristToHipLeft: number;
  wristToHipRight: number;
  reach: number;
  stanceOk: boolean;
};

type DebugPanelProps = {
  keypoints: SharedValue<PoseKeypoints>;
  frameCount: SharedValue<number>;
};

export function DebugPanel({ keypoints, frameCount }: DebugPanelProps) {
  const [stats, setStats] = useState<DebugStats | null>(null);

  useAnimatedReaction(
    () => frameCount.get(),
    (frames, previousFrames) => {
      'worklet';
      ////////// 일정 프레임마다만 JS 로 올림 (프레임당 setState 금지)
      if (previousFrames != null && frames % UPDATE_EVERY_N_FRAMES !== 0) return;

      const points = keypoints.get();
      const shoulderWidth = getShoulderWidth(points, MIN_KEYPOINT_SCORE);

      ////////// 어깨를 못 잡으면 나머지 비율은 계산 불가 → 0 으로 표시
      const ankleGapRatio =
        shoulderWidth > 0
          ? Math.abs(points.leftAnkle.x - points.rightAnkle.x) / shoulderWidth
          : 0;
      const wristToHipLeft =
        shoulderWidth > 0 ? distance(points.leftWrist, points.leftHip) / shoulderWidth : 0;
      const wristToHipRight =
        shoulderWidth > 0 ? distance(points.rightWrist, points.rightHip) / shoulderWidth : 0;

      runOnJS(setStats)({
        frames: frames,
        shoulderScoreLeft: points.leftShoulder.score,
        shoulderScoreRight: points.rightShoulder.score,
        hipScoreLeft: points.leftHip.score,
        hipScoreRight: points.rightHip.score,
        wristScoreLeft: points.leftWrist.score,
        wristScoreRight: points.rightWrist.score,
        ankleScoreLeft: points.leftAnkle.score,
        ankleScoreRight: points.rightAnkle.score,
        shoulderWidth: shoulderWidth,
        ankleGapRatio: ankleGapRatio,
        wristToHipLeft: wristToHipLeft,
        wristToHipRight: wristToHipRight,
        reach: computeMaxReach(points, shoulderWidth),
        stanceOk: isReadyStance(points, shoulderWidth),
      });
    },
    [],
  );

  if (stats == null) {
    return (
      <View style={styles.panel}>
        <Text style={styles.line}>frames 0 — 프레임 프로세서가 안 돕니다</Text>
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.line}>frames {stats.frames}</Text>
      <Text style={styles.line}>
        score sh {format(stats.shoulderScoreLeft)}/{format(stats.shoulderScoreRight)} hip{' '}
        {format(stats.hipScoreLeft)}/{format(stats.hipScoreRight)}
      </Text>
      <Text style={styles.line}>
        {'      '}wr {format(stats.wristScoreLeft)}/{format(stats.wristScoreRight)} ank{' '}
        {format(stats.ankleScoreLeft)}/{format(stats.ankleScoreRight)}
      </Text>
      <Text style={styles.line}>shoulderW {format(stats.shoulderWidth)}</Text>
      <Text style={pickStyle(stats.ankleGapRatio >= READY_STANCE.minAnkleGapRatio)}>
        gap {format(stats.ankleGapRatio)} ≥ {READY_STANCE.minAnkleGapRatio}
      </Text>
      <Text
        style={pickStyle(
          stats.wristToHipLeft <= READY_STANCE.maxWristToHipRatio &&
            stats.wristToHipLeft > 0,
        )}
      >
        wristHip {format(stats.wristToHipLeft)}/{format(stats.wristToHipRight)} ≤{' '}
        {READY_STANCE.maxWristToHipRatio}
      </Text>
      <Text style={styles.line}>
        reach {format(stats.reach)} (접힘 ≤{PUNCH.retractedReachRatio} / 뻗음 ≥
        {PUNCH.extendedReachRatio})
      </Text>
      <Text style={pickStyle(stats.stanceOk)}>stance {stats.stanceOk ? 'OK' : 'NG'}</Text>
    </View>
  );
}

////////// 소수점 2자리 고정 문자열
function format(value: number): string {
  return value.toFixed(2);
}

////////// 조건 충족 여부에 따라 색을 바꿈
function pickStyle(isOk: boolean) {
  return isOk ? [styles.line, styles.ok] : [styles.line, styles.fail];
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const styles = StyleSheet.create({
  panel: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  line: {
    color: '#FFFFFF',
    fontSize: 11,
    lineHeight: 15,
    fontFamily: 'monospace',
  },
  ok: {
    color: '#4ADE80',
  },
  fail: {
    color: '#F87171',
  },
});

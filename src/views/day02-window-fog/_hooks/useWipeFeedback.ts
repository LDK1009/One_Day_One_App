//////////////////////////////////////// 문지르기 피드백 ////////////////////////////////////////
// 효과음(유리 닦는 소리)을 루프로 재생하고, 드래그 중 미세 진동을 냅니다.
// 진동은 촬영자만 느끼고 영상에는 안 담기므로 소리와 둘 다 필요합니다.

import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef } from 'react';

const WIPE_SOUND = require('../../../../assets/sounds/glass-wipe.mp3');

export type WipeFeedback = {
  ////////// 문지르기 시작 — 효과음 루프 재생
  startWipe: () => void;
  ////////// 문지르는 중 — 미세 진동 (호출 측에서 스로틀됨)
  tickWipe: () => void;
  ////////// 문지르기 종료 — 효과음 정지
  stopWipe: () => void;
};

export function useWipeFeedback(): WipeFeedback {
  const player = useAudioPlayer(WIPE_SOUND);
  ////////// expo-audio 의 AudioPlayer 는 loop 처럼 대입식 세터를 쓰는 네이티브 객체라
  ////////// 훅 반환값을 직접 대입하면 react-hooks/immutability 에 걸립니다.
  ////////// ref 에 옮겨 담아 변경 지점을 React 가 허용하는 탈출구(ref.current)로 옮깁니다.
  const playerRef = useRef(player);
  ////////// ref 갱신은 렌더 중이 아니라 effect(렌더 밖)에서만 허용됩니다 (react-hooks/refs)
  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  const startWipe = useCallback(() => {
    const current = playerRef.current;
    current.loop = true;
    current.seekTo(0);
    current.play();
  }, []);

  const tickWipe = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch((error) =>
      console.error('[day02] 햅틱 실패', error),
    );
  }, []);

  const stopWipe = useCallback(() => {
    playerRef.current.pause();
  }, []);

  return { startWipe, tickWipe, stopWipe };
}

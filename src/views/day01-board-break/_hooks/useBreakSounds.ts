//////////////////////////////////////// 효과음 ////////////////////////////////////////
// 타격음·파괴음을 미리 로드해두고 즉시 재생합니다.
// 음원은 외부 에셋 없이 합성한 WAV (scripts 없이 assets/sounds 에 직접 포함).
//
// 연타 대응: 재생 중 다시 호출되면 seekTo(0) 로 되감아 처음부터 다시 냅니다.

import { useAudioPlayer } from 'expo-audio';
import { useCallback } from 'react';

const HIT_SOUND = require('../../../../assets/sounds/hit.wav');
const BREAK_SOUND = require('../../../../assets/sounds/break.wav');

export type BreakSounds = {
  playHit: () => void;
  playBreak: () => void;
};

export function useBreakSounds(): BreakSounds {
  const hitPlayer = useAudioPlayer(HIT_SOUND);
  const breakPlayer = useAudioPlayer(BREAK_SOUND);

  const playHit = useCallback(() => {
    hitPlayer.seekTo(0);
    hitPlayer.play();
  }, [hitPlayer]);

  const playBreak = useCallback(() => {
    breakPlayer.seekTo(0);
    breakPlayer.play();
  }, [breakPlayer]);

  return { playHit, playBreak };
}

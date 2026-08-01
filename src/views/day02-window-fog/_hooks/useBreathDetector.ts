//////////////////////////////////////// 입김 감지 ////////////////////////////////////////
// 마이크의 소리 크기(dBFS)만 읽어 김 농도를 올립니다. 주파수 분석은 하지 않습니다.
//
// 데이터 흐름:
//   recorder.getStatus().metering  ──100ms 폴링──▶  임계 초과가 5틱 연속인가?
//     └ No  → streak 0 으로 리셋 (말소리·박수 배제)
//     └ Yes → fogLevel += FOG_STEP (최대 1)
//
// 리렌더 방지: 상태를 useState 가 아니라 SharedValue 에 담습니다.
// useAudioRecorderState 훅은 폴링 결과를 useState 로 내보내므로 쓰지 않습니다 (초당 10회 리렌더).

import { File } from 'expo-file-system';
import {
  RecordingPresets,
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

import {
  BLOW_DB,
  BLOW_STREAK_TICKS,
  FOG_STEP,
  POLL_INTERVAL_MS,
  SILENT_DB,
} from '../_constants/fog';

export type BreathDetectorResult = {
  fogLevel: SharedValue<number>;
  debugDb: SharedValue<number>;
  debugStreak: SharedValue<number>;
  ////////// 녹음을 시작하지 못했을 때 true. 안내문에서 사용합니다
  hasMicError: boolean;
};

////////// 녹음 파일은 계속 커지므로 화면을 벗어날 때 지웁니다
function deleteRecording(uri: string | null) {
  if (uri == null) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch (error) {
    console.error('[day02] 녹음 파일 삭제 실패', error);
  }
}

export function useBreathDetector(
  isEnabled: boolean,
  isPausedRef: RefObject<boolean>,
): BreathDetectorResult {
  const recorder = useAudioRecorder({
    ...RecordingPresets.LOW_QUALITY,
    isMeteringEnabled: true,
  });

  const fogLevel = useSharedValue(0);
  const debugDb = useSharedValue(SILENT_DB);
  const debugStreak = useSharedValue(0);
  const streakRef = useRef(0);
  const [hasMicError, setHasMicError] = useState(false);
  ////////// 직전 사이클의 stop() 이 끝나기 전에 같은 recorder 를 다시 준비하면 네이티브 세션이 꼬입니다
  const pendingStopRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (!isEnabled) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;
    let isCancelled = false;

    ////////// 1틱: metering 을 읽어 연속 판정 후 김 농도 반영
    function tick() {
      const status = recorder.getStatus();
      const decibel = status.metering ?? SILENT_DB;
      debugDb.set(decibel);

      ////////// 문지르는 중에는 효과음이 마이크에 되잡히므로 판정을 멈춥니다
      if (isPausedRef.current) {
        streakRef.current = 0;
        debugStreak.set(0);
        return;
      }

      if (decibel > BLOW_DB) {
        streakRef.current += 1;
        if (streakRef.current >= BLOW_STREAK_TICKS) {
          fogLevel.set(Math.min(1, fogLevel.get() + FOG_STEP));
        }
      } else {
        streakRef.current = 0;
      }

      debugStreak.set(streakRef.current);
    }

    async function start() {
      try {
        ////////// 재시도마다 이전 실패 플래그를 지웁니다 — 한 번 실패해도 다음 포커스 진입에서 성공하면 안내문을 꺼야 합니다
        setHasMicError(false);

        ////////// 직전 사이클(예: 빠른 화면 이탈→재진입)의 stop() 이 아직 안 끝났으면 기다립니다.
        ////////// recorder 인스턴스는 옵션이 같으면 계속 재사용되므로, stop() 이 끝나기 전에
        ////////// 같은 인스턴스에 prepareToRecordAsync()/record() 를 또 걸면 네이티브 세션이 꼬입니다
        if (pendingStopRef.current != null) {
          await pendingStopRef.current;
          if (isCancelled) return;
        }

        ////////// Android 6+ 는 매니페스트 선언만으로 부족합니다. 런타임 요청이 없으면 prepareToRecordAsync 가 던집니다
        const currentPermission = await getRecordingPermissionsAsync();
        const isGranted =
          currentPermission.granted || (await requestRecordingPermissionsAsync()).granted;
        if (!isGranted) {
          setHasMicError(true);
          return;
        }
        if (isCancelled) return;

        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
          shouldPlayInBackground: false,
        });
        await recorder.prepareToRecordAsync();
        if (isCancelled) return;

        recorder.record();
        intervalId = setInterval(tick, POLL_INTERVAL_MS);
      } catch (error) {
        ////////// 정리(cleanup) 경로라 throw 하면 언마운트가 깨집니다. 로깅 후 안내 플래그만 세웁니다
        console.error('[day02] 녹음 시작 실패', error);
        setHasMicError(true);
      }
    }

    start();

    return () => {
      isCancelled = true;
      if (intervalId != null) clearInterval(intervalId);

      const uri = recorder.uri;
      ////////// fire-and-forget 이 아니라 ref 에 보관 — 다음 사이클의 start() 가 이 체인을 기다립니다
      pendingStopRef.current = recorder
        .stop()
        .then(() => deleteRecording(uri))
        .catch((error) => console.error('[day02] 녹음 정리 실패', error));
    };
  }, [isEnabled, recorder, isPausedRef, fogLevel, debugDb, debugStreak]);

  return { fogLevel, debugDb, debugStreak, hasMicError };
}

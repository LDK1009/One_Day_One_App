//////////////////////////////////////// day02-window-fog 라우트 ////////////////////////////////////////
// 라우트는 화면 조립만 담당하고 실제 화면은 views 로 위임합니다.

import { Stack } from 'expo-router';

import { Day02WindowFogView } from '@/views/day02-window-fog/Day02WindowFogView';

export default function Day02WindowFogRoute() {
  return (
    <>
      <Stack.Screen options={{ title: '입김 유리창' }} />
      <Day02WindowFogView />
    </>
  );
}

//////////////////////////////////////// day00-sample 라우트 ////////////////////////////////////////
// 라우트는 화면 조립만 담당하고 실제 화면은 views 로 위임합니다.

import { Stack } from 'expo-router';

import { Day00SampleView } from '@/views/day00-sample/Day00SampleView';

export default function Day00SampleRoute() {
  return (
    <>
      <Stack.Screen options={{ title: '샘플 앱' }} />
      <Day00SampleView />
    </>
  );
}

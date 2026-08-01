//////////////////////////////////////// day01-board-break 라우트 ////////////////////////////////////////
// 라우트는 화면 조립만 담당하고 실제 화면은 views 로 위임합니다.
// 카메라 전체 화면 게임이라 헤더를 숨기고, 복귀는 화면 안 뒤로가기 버튼으로 합니다.

import { Stack } from 'expo-router';

import { Day01BoardBreakView } from '@/views/day01-board-break/Day01BoardBreakView';

export default function Day01BoardBreakRoute() {
  return (
    <>
      <Stack.Screen options={{ title: '송판 격파', headerShown: false }} />
      <Day01BoardBreakView />
    </>
  );
}

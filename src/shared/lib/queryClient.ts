//////////////////////////////////////// TanStack Query 클라이언트 ////////////////////////////////////////
// 서버 상태 전담. 클라이언트 상태는 zustand(store/)에서 관리합니다.

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1분
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

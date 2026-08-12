import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // data stays fresh 2 min — won't refetch on every navigation
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

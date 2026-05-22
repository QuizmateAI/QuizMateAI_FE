import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function makeQueryClient(overrides) {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        ...overrides?.queries,
      },
      mutations: {
        retry: false,
        ...overrides?.mutations,
      },
    },
  });
}

export function renderWithProviders(ui, options = {}) {
  const {
    route = '/',
    queryClient = makeQueryClient(),
    extraWrapper: ExtraWrapper,
  } = options;

  function Wrapper({ children }) {
    const tree = (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
    return ExtraWrapper ? <ExtraWrapper>{tree}</ExtraWrapper> : tree;
  }

  return {
    ...render(ui, { wrapper: Wrapper }),
    queryClient,
  };
}

export function resetClientAuthState() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem('user');
    window.localStorage.removeItem('accessToken');
    window.localStorage.removeItem('refreshToken');
  } catch {
    /* storage disabled in jsdom — ignore */
  }
}

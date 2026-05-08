/**
 * Shared test helpers.
 *
 * Goals:
 *   - Cut boilerplate: most component tests need a Router + QueryClient. Reusing
 *     a helper avoids a 30-line `wrapper` repeated in every spec.
 *   - Keep tests deterministic: a fresh QueryClient with retries off, gcTime 0,
 *     staleTime 0 prevents one test's cache from leaking into the next.
 *
 * Usage:
 *   import { renderWithProviders, makeQueryClient } from '@/test/utils';
 *
 *   it('renders the dashboard', () => {
 *     renderWithProviders(<DashboardPage />, { route: '/dashboard' });
 *   });
 */

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

/**
 * Render a UI tree wrapped with the providers most pages assume.
 *
 * @param {React.ReactElement} ui
 * @param {object} [options]
 * @param {string} [options.route='/']        Initial route for MemoryRouter.
 * @param {QueryClient} [options.queryClient] Pre-built client, otherwise fresh.
 * @param {React.ComponentType<{ children: React.ReactNode }>} [options.extraWrapper]
 *        Optional outer wrapper (e.g. ToastProvider) for tests that need it.
 */
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

/**
 * Reset the in-memory user snapshot used by `useRolePermission`,
 * `ProtectedRoute`, and friends. Call from beforeEach() in tests that
 * mutate auth state.
 */
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

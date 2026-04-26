import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AiAuditManagement from '@/pages/SuperAdmin/AiAuditManagement';
import { getAiAuditLogs } from '@/api/ManagementSystemAPI';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallbackOrOptions) => {
      if (key === 'common.refresh') {
        return 'Refresh';
      }
      if (typeof fallbackOrOptions === 'string') {
        return fallbackOrOptions;
      }
      if (fallbackOrOptions && typeof fallbackOrOptions === 'object' && 'defaultValue' in fallbackOrOptions) {
        return fallbackOrOptions.defaultValue;
      }
      return key;
    },
    i18n: { language: 'en' },
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams()],
  };
});

vi.mock('@/hooks/useDarkMode', () => ({
  useDarkMode: () => ({ isDarkMode: false }),
}));

vi.mock('@/lib/websocketUrl', () => ({
  getWebSocketUrl: () => '',
}));

vi.mock('@stomp/stompjs', () => ({
  Client: class {
    activate() {}
    deactivate() {}
    subscribe() {}
  },
}));

vi.mock('sockjs-client', () => ({
  default: vi.fn(),
}));

vi.mock('@/api/ManagementSystemAPI', () => ({
  getAiAuditLogs: vi.fn(),
}));

describe('AiAuditManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAiAuditLogs.mockImplementation(async ({ size }) => {
      if (size === 200) {
        return {
          data: {
            content: [
              {
                auditId: 'a-1',
                totalTokens: 100,
                promptTokens: 40,
                completionTokens: 50,
                thoughtTokens: 10,
                status: 'SUCCESS',
              },
              {
                auditId: 'a-2',
                totalTokens: 200,
                promptTokens: 80,
                completionTokens: 90,
                thoughtTokens: 30,
                status: 'ERROR',
              },
            ],
            page: 0,
            size: 200,
            totalPages: 1,
            totalElements: 2,
          },
        };
      }

      return {
        data: {
          content: [
            {
              auditId: 'a-1',
              actorFullName: 'Nguyen Van A',
              actorEmail: 'a@example.com',
              featureKey: 'GENERATE_FLASHCARDS',
              totalTokens: 100,
              promptTokens: 40,
              completionTokens: 50,
              thoughtTokens: 10,
              status: 'SUCCESS',
              provider: 'OPENAI',
              modelName: 'gpt-test',
              createdAt: '2026-04-14T11:47:45.000Z',
            },
          ],
          page: 0,
          size: 20,
          totalPages: 2,
          totalElements: 2,
        },
      };
    });
  });

  it('shows aggregated token metrics for the full filtered result instead of the current page only', async () => {
    render(<AiAuditManagement />);

    expect(await screen.findByText('Total tokens')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('300')).toBeInTheDocument();
    });

    expect(screen.queryByText('Tokens on this page')).not.toBeInTheDocument();
    expect(getAiAuditLogs).toHaveBeenCalledWith(expect.objectContaining({
      page: 0,
      size: 200,
    }));
  });
});

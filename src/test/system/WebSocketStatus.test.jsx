import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import WebSocketStatus from '@/components/features/WebSocketStatus';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

describe('WebSocketStatus', () => {
  it('TC-S03: shows the connected state when the websocket is online', () => {
    render(<WebSocketStatus isConnected />);

    expect(screen.getByText('workspace.wsConnected')).toBeInTheDocument();
    expect(screen.queryByText('workspace.wsDisconnected')).not.toBeInTheDocument();
  });
});

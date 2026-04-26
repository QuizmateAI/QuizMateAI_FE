import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InviteMemberDialog from '@/pages/Users/Group/group-leader/InviteMemberDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }) => (open ? <div role="dialog">{children}</div> : null),
  DialogContent: ({ children, className }) => <div className={className}>{children}</div>,
  DialogHeader: ({ children }) => <div>{children}</div>,
  DialogTitle: ({ children, className }) => <h2 className={className}>{children}</h2>,
  DialogDescription: ({ children, className }) => <p className={className}>{children}</p>,
  DialogFooter: ({ children, className }) => <div className={className}>{children}</div>,
}));

describe('InviteMemberDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-G01 (adapted): submits the trimmed email and closes the dialog on success', async () => {
    const onInvite = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    render(
      <InviteMemberDialog
        open
        onOpenChange={onOpenChange}
        onInvite={onInvite}
        isDarkMode={false}
      />
    );

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '  member@example.com  ' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'home.group.sendInvite' }));

    await waitFor(() => {
      expect(onInvite).toHaveBeenCalledWith('member@example.com');
    });

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('blocks submission when the member seat limit is already exhausted', async () => {
    const onInvite = vi.fn().mockResolvedValue(undefined);

    render(
      <InviteMemberDialog
        open
        onOpenChange={vi.fn()}
        onInvite={onInvite}
        isDarkMode={false}
        memberSeatLimit={5}
        memberSeatUsage={6}
        memberSeatRemaining={0}
        isMemberSeatLimitReached
      />
    );

    expect(screen.getByRole('button', { name: 'home.group.sendInvite' })).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'blocked@example.com' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'home.group.sendInvite' }).closest('form'));

    await waitFor(() => {
      expect(onInvite).not.toHaveBeenCalled();
    });
  });
});

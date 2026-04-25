import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import GroupMembersTab from '@/pages/Users/Group/group-leader/GroupMembersTab';

const translations = {
  'home.group.leader': 'Leader',
  'home.group.contributor': 'Contributor',
  'home.group.member': 'Member',
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => {
      if (key === 'groupManage.members.showing') {
        return `Showing ${options?.count} of ${options?.total}`;
      }
      return translations[key] || options?.defaultValue || key;
    },
    i18n: { language: 'en' },
  }),
}));

describe('GroupMembersTab', () => {
  const renderWithQueryClient = (ui) => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>,
    );
  };

  it('TC-G02: renders the expected role labels for each member', () => {
    renderWithQueryClient(
      <GroupMembersTab
        isDarkMode={false}
        workspaceId={9}
        membersLoading={false}
        isLeader={false}
        members={[
          { groupMemberId: 1, userId: 11, fullName: 'Alice', email: 'alice@example.com', role: 'LEADER', canUpload: true },
          { groupMemberId: 2, userId: 12, fullName: 'Bob', email: 'bob@example.com', role: 'CONTRIBUTOR', canUpload: true },
          { groupMemberId: 3, userId: 13, fullName: 'Cara', email: 'cara@example.com', role: 'MEMBER', canUpload: false },
        ]}
        onReload={vi.fn()}
        onGrantUpload={vi.fn()}
        onRevokeUpload={vi.fn()}
        onUpdateRole={vi.fn()}
        onRemoveMember={vi.fn()}
        onOpenInvite={vi.fn()}
      />
    );

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Cara')).toBeInTheDocument();
    expect(screen.getAllByText('Leader').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Contributor').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Member').length).toBeGreaterThan(0);
  });

  it('loads pending invitations from the shared query cache', async () => {
    renderWithQueryClient(
      <GroupMembersTab
        isDarkMode={false}
        workspaceId={9}
        membersLoading={false}
        isLeader
        members={[]}
        fetchPendingInvitations={vi.fn().mockResolvedValue({
          count: 1,
          invitations: [
            {
              invitationId: 91,
              invitedEmail: 'loc@example.com',
              status: 'PENDING',
            },
          ],
        })}
        onReload={vi.fn()}
        onGrantUpload={vi.fn()}
        onRevokeUpload={vi.fn()}
        onUpdateRole={vi.fn()}
        onRemoveMember={vi.fn()}
        onOpenInvite={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Pending invitations').closest('button'));

    expect(await screen.findByText('loc@example.com')).toBeInTheDocument();
  });

  it('disables the invite action when the group has no remaining member seats', () => {
    renderWithQueryClient(
      <GroupMembersTab
        isDarkMode={false}
        workspaceId={9}
        membersLoading={false}
        isLeader
        members={[]}
        totalMemberCount={6}
        memberSeatLimit={5}
        memberSeatUsage={6}
        memberSeatRemaining={0}
        isMemberSeatLimitReached
        fetchPendingInvitations={vi.fn().mockResolvedValue({ count: 0, invitations: [] })}
        onReload={vi.fn()}
        onGrantUpload={vi.fn()}
        onRevokeUpload={vi.fn()}
        onUpdateRole={vi.fn()}
        onRemoveMember={vi.fn()}
        onOpenInvite={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Invite User' })).toBeDisabled();
  });

  it('uses workspaceMemberId when toggling upload permission', async () => {
    const onGrantUpload = vi.fn();

    renderWithQueryClient(
      <GroupMembersTab
        isDarkMode={false}
        workspaceId={9}
        membersLoading={false}
        isLeader
        members={[
          { groupMemberId: 22, userId: 12, fullName: 'Bob', email: 'bob@example.com', role: 'MEMBER', canUpload: false },
        ]}
        onReload={vi.fn()}
        onGrantUpload={onGrantUpload}
        onRevokeUpload={vi.fn()}
        onUpdateRole={vi.fn()}
        onRemoveMember={vi.fn()}
        onOpenInvite={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('switch', { name: 'Grant upload' }));

    expect(onGrantUpload).toHaveBeenCalledWith(9, 22);
  });

  it('saves member permissions using workspaceMemberId', async () => {
    const onFetchMemberPermissions = vi.fn().mockResolvedValue({
      assignedPermissionCodes: ['CREATE_QUIZ'],
    });
    const onSyncMemberPermissions = vi.fn().mockResolvedValue({});

    renderWithQueryClient(
      <GroupMembersTab
        isDarkMode={false}
        workspaceId={9}
        membersLoading={false}
        isLeader
        members={[
          { groupMemberId: 55, userId: 15, fullName: 'Cara', email: 'cara@example.com', role: 'MEMBER', canUpload: false },
        ]}
        onReload={vi.fn()}
        onGrantUpload={vi.fn()}
        onRevokeUpload={vi.fn()}
        onUpdateRole={vi.fn()}
        onFetchMemberPermissions={onFetchMemberPermissions}
        onSyncMemberPermissions={onSyncMemberPermissions}
        onRemoveMember={vi.fn()}
        onOpenInvite={vi.fn()}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /manage/i }));
    });

    expect(await screen.findByRole('button', { name: 'Save permissions' })).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByText('Create flashcard'));
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save permissions' }));
    });

    expect(onFetchMemberPermissions).toHaveBeenCalledWith(9, 55);
    expect(onSyncMemberPermissions).toHaveBeenCalledWith(
      9,
      55,
      expect.arrayContaining(['CREATE_QUIZ', 'CREATE_FLASHCARD']),
    );
  });
});

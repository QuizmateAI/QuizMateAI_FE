import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GroupMembersTab from '@/Pages/Users/Group/Group_leader/GroupMembersTab';

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
      return translations[key] || key;
    },
    i18n: { language: 'en' },
  }),
}));

describe('GroupMembersTab', () => {
  it('TC-G02: renders the expected role labels for each member', () => {
    render(
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
});

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import QuestionInlineDiscussion from '@/Pages/Users/Group/Components/QuestionInlineDiscussion';
import { getThreadMessages } from '@/api/GroupDiscussionAPI';

vi.mock('@/context/UserProfileContext', () => ({
  useUserProfile: () => ({
    profile: {
      userId: 7,
      fullName: 'Test User',
      avatarUrl: '',
    },
  }),
}));

vi.mock('@/api/GroupDiscussionAPI', () => ({
  getThreadMessages: vi.fn(),
  postMessage: vi.fn(),
  deleteMessage: vi.fn(),
}));

describe('QuestionInlineDiscussion', () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
    window.localStorage.clear();
    getThreadMessages.mockResolvedValue({
      messages: [
        {
          id: 'msg-1',
          authorId: 9,
          authorName: 'Alice Example',
          authorRole: 'MEMBER',
          body: 'Tin nhắn đầu tiên',
          createdAt: '2026-04-12T00:00:00.000Z',
        },
      ],
    });
  });

  it('reports message counts from dialog mode without entering a render loop', async () => {
    function Harness() {
      const [counts, setCounts] = React.useState({});

      return (
        <>
          <QuestionInlineDiscussion
            questionId={3}
            questionIndex={1}
            workspaceId={1}
            quizId={2}
            isLeader
            hasAttempted
            inDialog
            hideGuide
            onMessagesChange={(nextCount) => {
              setCounts((prev) => ({ ...prev, 3: nextCount }));
            }}
          />
          <div data-testid="count">{counts[3] ?? 0}</div>
        </>
      );
    }

    render(<Harness />);

    expect(await screen.findByText('Tin nhắn đầu tiên')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('1');
    });
  });

  it('hides the empty discussion panel in dialog mode and keeps the composer visible', async () => {
    getThreadMessages.mockResolvedValue({ messages: [] });

    render(
      <QuestionInlineDiscussion
        questionId={3}
        questionIndex={1}
        workspaceId={1}
        quizId={2}
        isLeader
        hasAttempted
        inDialog
        hideGuide
      />,
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/test user/i)).toBeInTheDocument();
    });

    expect(screen.queryByText('Chưa có bình luận nào. Mở đầu cuộc thảo luận cho câu này.')).not.toBeInTheDocument();
  });
});

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import QuestionInlineDiscussion from '@/Pages/Users/Group/Components/QuestionInlineDiscussion';

vi.mock('@/context/UserProfileContext', () => ({
  useUserProfile: () => ({
    profile: {
      userId: 7,
      fullName: 'Test User',
      avatarUrl: '',
    },
  }),
}));

describe('QuestionInlineDiscussion', () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
    window.localStorage.clear();
    window.localStorage.setItem('qm_group_discussions_v1', JSON.stringify({
      'w1:q2:qu3': {
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
      },
    }));
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
    window.localStorage.setItem('qm_group_discussions_v1', JSON.stringify({}));

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
      expect(screen.getByPlaceholderText('Bình luận dưới tên Test User')).toBeInTheDocument();
    });

    expect(screen.queryByText('Chưa có bình luận nào. Mở đầu cuộc thảo luận cho câu này.')).not.toBeInTheDocument();
  });
});

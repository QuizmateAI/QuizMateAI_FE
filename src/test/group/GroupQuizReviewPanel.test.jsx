import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GroupQuizReviewPanel from '@/pages/Users/Group/Components/GroupQuizReviewPanel';
import {
  getMyQuizReviewContributor,
  setQuizReviewCompleteOk,
  deleteQuestionFromSnapshot,
  listSnapshotDeletionAudits,
} from '@/api/ChallengeAPI';

vi.mock('react-i18next', () => ({
  // Hỗ trợ cả 2 shape: t(key, "fallback") và t(key, { defaultValue: "..." }).
  // Panel dùng cả hai, mock cũ chỉ xử lý shape đầu nên render ra object → React lỗi.
  useTranslation: () => ({
    t: (key, opts) => {
      if (typeof opts === 'string') return opts;
      if (opts && typeof opts === 'object' && typeof opts.defaultValue === 'string') {
        let out = opts.defaultValue;
        // Hỗ trợ {{name}} interpolation tối thiểu để test render khớp.
        Object.keys(opts).forEach((k) => {
          if (k === 'defaultValue') return;
          out = out.replace(new RegExp(`{{${k}}}`, 'g'), String(opts[k]));
        });
        return out;
      }
      return key;
    },
  }),
}));

vi.mock('@/api/QuizAPI', () => ({
  QUESTION_TYPE_ID_MAP: {
    1: 'multipleChoice',
  },
  deleteQuestion: vi.fn(),
}));

vi.mock('@/api/Authentication', () => ({
  getCurrentUser: vi.fn(() => ({ fullName: 'Tester' })),
}));

vi.mock('@/api/ChallengeAPI', () => ({
  deleteQuestionFromSnapshot: vi.fn(),
  getMyQuizReviewContributor: vi.fn(),
  setQuizReviewCompleteOk: vi.fn(),
  raiseSnapshotConcern: vi.fn(),
  clearSnapshotConcern: vi.fn(),
  listSnapshotDeletionAudits: vi.fn(),
}));

vi.mock('@/api/WorkspaceReviewBanAPI', () => ({
  banWorkspaceReviewer: vi.fn(),
}));

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function makeQuestion(id, content = 'Câu hỏi') {
  return { questionId: id, questionTypeId: 1, content, difficulty: 'EASY' };
}

describe('GroupQuizReviewPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMyQuizReviewContributor.mockResolvedValue({ data: {} });
    setQuizReviewCompleteOk.mockResolvedValue({ data: {} });
    deleteQuestionFromSnapshot.mockResolvedValue({ data: {} });
    listSnapshotDeletionAudits.mockResolvedValue({ data: { data: [] } });
  });

  it('lets a reviewer delete a snapshot question through the challenge review API', async () => {
    const onQuestionDeleted = vi.fn().mockResolvedValue(undefined);
    render(
      <QueryClientProvider client={makeClient()}>
        <GroupQuizReviewPanel
          isDarkMode={false}
          sections={[{ sectionId: 10, content: 'Section A' }]}
          questionsMap={{ 10: [makeQuestion(501, 'Câu hỏi cần xóa')] }}
          answersMap={{
            501: [
              { answerId: 1, content: 'A', isCorrect: false },
              { answerId: 2, content: 'B', isCorrect: true },
            ],
          }}
          loading={false}
          quizId={900}
          workspaceId={55}
          isReviewer
          onQuestionDeleted={onQuestionDeleted}
        />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Xóa câu hỏi' }));
    const noteBox = await screen.findByPlaceholderText(/đáp án không chính xác|trùng/i);
    fireEvent.change(noteBox, { target: { value: 'lý do hợp lệ' } });
    const dialogConfirms = await screen.findAllByRole('button', { name: 'Xóa câu hỏi' });
    fireEvent.click(dialogConfirms[dialogConfirms.length - 1]);

    await waitFor(() => {
      expect(deleteQuestionFromSnapshot).toHaveBeenCalledWith(55, 900, 501, 'lý do hợp lệ');
    });
    expect(onQuestionDeleted).toHaveBeenCalled();
  });

  it('lets a leader delete a snapshot question through the challenge review API', async () => {
    const onQuestionDeleted = vi.fn().mockResolvedValue(undefined);
    render(
      <QueryClientProvider client={makeClient()}>
        <GroupQuizReviewPanel
          isDarkMode={false}
          sections={[{ sectionId: 10, content: 'Section A' }]}
          questionsMap={{ 10: [makeQuestion(501, 'Câu hỏi cần xóa')] }}
          answersMap={{ 501: [{ answerId: 2, content: 'B', isCorrect: true }] }}
          loading={false}
          quizId={900}
          workspaceId={55}
          isLeader
          challengeSnapshotReviewMode
          onQuestionDeleted={onQuestionDeleted}
        />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Xóa câu hỏi' }));
    const noteBox = await screen.findByPlaceholderText(/đáp án không chính xác|trùng/i);
    fireEvent.change(noteBox, { target: { value: 'leader edit lại' } });
    const dialogConfirms = await screen.findAllByRole('button', { name: 'Xóa câu hỏi' });
    fireEvent.click(dialogConfirms[dialogConfirms.length - 1]);

    await waitFor(() => {
      expect(deleteQuestionFromSnapshot).toHaveBeenCalledWith(55, 900, 501, 'leader edit lại');
    });
    expect(onQuestionDeleted).toHaveBeenCalled();
  });

  // Regression: trước đây cache 15s khiến lần delete thứ 2 không nhìn thấy câu
  // thứ 2 (vẫn render snapshot stale). Test này chỉ verify FE component vẫn
  // gọi đúng API cho 2 câu khác nhau khi parent refetch và truyền questionsMap mới.
  it('reviewer can delete multiple questions back-to-back (regression for cache bug)', async () => {
    let snapshotQs = [makeQuestion(501, 'Câu A'), makeQuestion(502, 'Câu B')];
    const onQuestionDeleted = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <QueryClientProvider client={makeClient()}>
        <GroupQuizReviewPanel
          isDarkMode={false}
          sections={[{ sectionId: 10, content: 'Section A' }]}
          questionsMap={{ 10: snapshotQs }}
          answersMap={{
            501: [{ answerId: 2, content: 'B', isCorrect: true }],
            502: [{ answerId: 4, content: 'D', isCorrect: true }],
          }}
          loading={false}
          quizId={900}
          workspaceId={55}
          isReviewer
          onQuestionDeleted={onQuestionDeleted}
        />
      </QueryClientProvider>,
    );

    // Lần 1: xóa câu A (id 501)
    const deleteBtns1 = screen.getAllByRole('button', { name: 'Xóa câu hỏi' });
    expect(deleteBtns1).toHaveLength(2);
    fireEvent.click(deleteBtns1[0]);
    fireEvent.change(await screen.findByPlaceholderText(/đáp án không chính xác|trùng/i), {
      target: { value: 'xóa câu A' },
    });
    const confirm1 = await screen.findAllByRole('button', { name: 'Xóa câu hỏi' });
    fireEvent.click(confirm1[confirm1.length - 1]);
    await waitFor(() => {
      expect(deleteQuestionFromSnapshot).toHaveBeenLastCalledWith(55, 900, 501, 'xóa câu A');
    });

    // Parent refetch → cache đã clear, list mới chỉ còn câu B
    snapshotQs = [makeQuestion(502, 'Câu B')];
    rerender(
      <QueryClientProvider client={makeClient()}>
        <GroupQuizReviewPanel
          isDarkMode={false}
          sections={[{ sectionId: 10, content: 'Section A' }]}
          questionsMap={{ 10: snapshotQs }}
          answersMap={{ 502: [{ answerId: 4, content: 'D', isCorrect: true }] }}
          loading={false}
          quizId={900}
          workspaceId={55}
          isReviewer
          onQuestionDeleted={onQuestionDeleted}
        />
      </QueryClientProvider>,
    );

    // Lần 2: chỉ còn 1 nút "Xóa câu hỏi" trên page (cho câu B id 502)
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Xóa câu hỏi' })).toHaveLength(1);
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Xóa câu hỏi' })[0]);
    fireEvent.change(await screen.findByPlaceholderText(/đáp án không chính xác|trùng/i), {
      target: { value: 'xóa câu B' },
    });
    const confirm2 = await screen.findAllByRole('button', { name: 'Xóa câu hỏi' });
    fireEvent.click(confirm2[confirm2.length - 1]);
    await waitFor(() => {
      expect(deleteQuestionFromSnapshot).toHaveBeenLastCalledWith(55, 900, 502, 'xóa câu B');
    });
    expect(deleteQuestionFromSnapshot).toHaveBeenCalledTimes(2);
  });

  // Khi BE trả về concernAutoTriggered=true, panel phải hiện banner đặc biệt
  // và KHÔNG render nút "Rút lại report".
  it('hides the withdraw button when concern is auto-triggered (≥30% threshold)', async () => {
    getMyQuizReviewContributor.mockResolvedValue({
      data: {
        data: {
          reviewCompleteOkAt: null,
          concernRaisedAt: '2026-05-10T03:00:00Z',
          concernResolvedAt: null,
          concernNote: 'Hệ thống tự động báo: reviewer đã xóa 3/10 câu (30%) — vượt ngưỡng 30%.',
          concernAutoTriggered: true,
        },
      },
    });

    render(
      <QueryClientProvider client={makeClient()}>
        <GroupQuizReviewPanel
          isDarkMode={false}
          sections={[{ sectionId: 10, content: 'Section A' }]}
          questionsMap={{ 10: [makeQuestion(601)] }}
          answersMap={{ 601: [{ answerId: 1, content: 'X', isCorrect: true }] }}
          loading={false}
          quizId={900}
          workspaceId={55}
          isReviewer
        />
      </QueryClientProvider>,
    );

    // Banner auto-triggered phải xuất hiện.
    await screen.findByText(/Hệ thống tự đánh dấu/i);
    // Nút rút lại KHÔNG được render khi auto-triggered.
    expect(screen.queryByRole('button', { name: /Rút lại report/i })).toBeNull();
  });
});

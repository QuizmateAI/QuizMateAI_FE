import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '@/api/api';
import { generateAIQuiz } from '@/api/AIAPI';

vi.mock('@/api/api', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('AIAPI generateAIQuiz', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.post.mockResolvedValue({ data: { quizId: 12 } });
  });

  it('keeps AI quiz generation requests open without a client timeout', async () => {
    const payload = { title: 'Slow AI quiz', workspaceId: 42 };

    await generateAIQuiz(payload);

    expect(api.post).toHaveBeenCalledWith(
      '/ai/quiz:generated',
      payload,
      expect.objectContaining({
        timeout: 0,
      }),
    );
  });
});

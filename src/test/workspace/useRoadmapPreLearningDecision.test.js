import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRoadmapPreLearningDecision } from '@/Pages/Users/Individual/Workspace/hooks/useRoadmapPreLearningDecision';
import {
  getCurrentRoadmapPhaseProgress,
  submitRoadmapPhaseSkipDecision,
} from '@/api/RoadmapPhaseAPI';

vi.mock('@/api/RoadmapPhaseAPI', () => ({
  getCurrentRoadmapPhaseProgress: vi.fn(),
  submitRoadmapPhaseSkipDecision: vi.fn(),
}));

describe('useRoadmapPreLearningDecision', () => {
  const t = (key, fallback) => fallback || key;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes skip decision card when current active phase is skipable and not completed', async () => {
    const roadmap = { roadmapId: 99 };
    const activePhase = { phaseId: 12 };

    getCurrentRoadmapPhaseProgress.mockResolvedValue({
      data: {
        data: {
          phaseId: 12,
          skipable: true,
          status: 'IN_PROGRESS',
        },
      },
    });

    const { result } = renderHook(() => useRoadmapPreLearningDecision({
      roadmap,
      activePhase,
      showError: vi.fn(),
      showSuccess: vi.fn(),
      t,
    }));

    await waitFor(() => {
      expect(getCurrentRoadmapPhaseProgress).toHaveBeenCalledWith(99);
      expect(result.current.canShowSkipDecision).toBe(true);
    });

    expect(result.current.shouldRenderDecisionCard).toBe(true);
    expect(result.current.canShowGenerateKnowledgeFallback).toBe(false);
  });

  it('submits skip decision and marks phase as handled', async () => {
    const roadmap = { roadmapId: 99 };
    const activePhase = { phaseId: 12 };

    getCurrentRoadmapPhaseProgress
      .mockResolvedValueOnce({
        data: {
          data: {
            phaseId: 12,
            skipable: true,
            status: 'IN_PROGRESS',
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            phaseId: 12,
            skipable: true,
            status: 'IN_PROGRESS',
          },
        },
      });

    submitRoadmapPhaseSkipDecision.mockResolvedValue({ data: {} });

    const showSuccess = vi.fn();
    const onSkipSuccess = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useRoadmapPreLearningDecision({
      roadmap,
      activePhase,
      showError: vi.fn(),
      showSuccess,
      onSkipSuccess,
      t,
    }));

    await waitFor(() => {
      expect(result.current.canShowSkipDecision).toBe(true);
    });

    await act(async () => {
      await result.current.handleRoadmapPreLearningDecision(12, true);
    });

    expect(submitRoadmapPhaseSkipDecision).toHaveBeenCalledWith(12, true);
    expect(showSuccess).toHaveBeenCalledWith('Current phase has been skipped successfully.');
    expect(onSkipSuccess).toHaveBeenCalledWith(12);

    await waitFor(() => {
      expect(result.current.decisionHandledPhaseIds).toContain(12);
      expect(result.current.canShowSkipDecision).toBe(false);
    });

    expect(getCurrentRoadmapPhaseProgress).toHaveBeenCalledTimes(2);
  });

  it('creates knowledge path when user does not skip pre-learning', async () => {
    const roadmap = { roadmapId: 99 };
    const activePhase = { phaseId: 12 };

    getCurrentRoadmapPhaseProgress.mockResolvedValue({
      data: {
        data: {
          phaseId: 12,
          skipable: false,
          status: 'IN_PROGRESS',
        },
      },
    });

    submitRoadmapPhaseSkipDecision.mockResolvedValue({ data: {} });

    const onCreatePhaseKnowledge = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useRoadmapPreLearningDecision({
      roadmap,
      activePhase,
      onCreatePhaseKnowledge,
      showError: vi.fn(),
      showSuccess: vi.fn(),
      t,
    }));

    await waitFor(() => {
      expect(getCurrentRoadmapPhaseProgress).toHaveBeenCalledWith(99);
    });

    await act(async () => {
      await result.current.handleRoadmapPreLearningDecision(12, false);
    });

    expect(submitRoadmapPhaseSkipDecision).toHaveBeenCalledWith(12, false);
    expect(onCreatePhaseKnowledge).toHaveBeenCalledWith(12, { skipPreLearning: false });
    expect(result.current.decisionHandledPhaseIds).toContain(12);
  });

  it('surfaces API failure through showError and releases submitting state', async () => {
    const roadmap = { roadmapId: 99 };
    const activePhase = { phaseId: 12 };

    getCurrentRoadmapPhaseProgress.mockResolvedValue({
      data: {
        data: {
          phaseId: 12,
          skipable: true,
          status: 'IN_PROGRESS',
        },
      },
    });

    submitRoadmapPhaseSkipDecision.mockRejectedValue(new Error('request failed'));

    const showError = vi.fn();

    const { result } = renderHook(() => useRoadmapPreLearningDecision({
      roadmap,
      activePhase,
      showError,
      showSuccess: vi.fn(),
      t,
    }));

    await waitFor(() => {
      expect(result.current.canShowSkipDecision).toBe(true);
    });

    await act(async () => {
      await result.current.handleRoadmapPreLearningDecision(12, true);
    });

    expect(showError).toHaveBeenCalledWith('request failed');
    expect(result.current.submittingSkipDecision).toBe(false);
  });
});

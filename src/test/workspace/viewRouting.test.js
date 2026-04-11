import { describe, expect, it } from 'vitest';
import {
  VIEW_TO_PATH,
  buildWorkspacePathForView,
  resolveWorkspaceViewFromSubPath,
} from '@/Pages/Users/Individual/Workspace/utils/viewRouting';

describe('workspace viewRouting', () => {
  it('resolves the bare workspace route to overview', () => {
    expect(resolveWorkspaceViewFromSubPath('')).toEqual({
      view: 'overview',
      quizId: null,
      backTarget: null,
      roadmapId: null,
      phaseId: null,
    });
  });

  it('maps overview and sources routes for the new shell', () => {
    expect(VIEW_TO_PATH.overview).toBe('');
    expect(VIEW_TO_PATH.sources).toBe('sources');
    expect(buildWorkspacePathForView('overview')).toBe('');
    expect(buildWorkspacePathForView('sources')).toBe('sources');
    expect(resolveWorkspaceViewFromSubPath('sources')).toEqual({
      view: 'sources',
      quizId: null,
      backTarget: null,
    });
  });

  it('resolves roadmap quiz detail deep links with roadmap and phase back targets', () => {
    expect(resolveWorkspaceViewFromSubPath('roadmaps/77/phases/11/quizzes/5')).toEqual({
      view: 'quizDetail',
      quizId: 5,
      backTarget: {
        view: 'roadmap',
        roadmapId: 77,
        phaseId: 11,
      },
    });
  });

  it('resolves roadmap quiz edit deep links with roadmap and phase back targets', () => {
    expect(resolveWorkspaceViewFromSubPath('roadmaps/77/phases/11/quizzes/5/edit')).toEqual({
      view: 'editQuiz',
      quizId: 5,
      backTarget: {
        view: 'roadmap',
        roadmapId: 77,
        phaseId: 11,
      },
    });
  });

  it('builds roadmap quiz detail and edit paths from view state', () => {
    const selectedQuiz = { quizId: 5 };
    const quizBackTarget = { view: 'roadmap', roadmapId: 77, phaseId: 11 };

    expect(buildWorkspacePathForView('quizDetail', selectedQuiz, quizBackTarget)).toBe('roadmaps/77/phases/11/quizzes/5');
    expect(buildWorkspacePathForView('editQuiz', selectedQuiz, quizBackTarget)).toBe('roadmaps/77/phases/11/quizzes/5/edit');
  });

  it('keeps direct path mappings for post-learning workspace routes', () => {
    expect(VIEW_TO_PATH.postLearning).toBe('post-learnings');
    expect(VIEW_TO_PATH.createPostLearning).toBe('post-learnings/create');
    expect(buildWorkspacePathForView('postLearning')).toBe('post-learnings');
    expect(buildWorkspacePathForView('createPostLearning')).toBe('post-learnings/create');
  });
});

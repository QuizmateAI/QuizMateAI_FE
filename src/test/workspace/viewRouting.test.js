import { describe, expect, it } from 'vitest';
import {
  VIEW_TO_PATH,
  buildWorkspacePathForView,
  resolveWorkspaceViewFromSubPath,
} from '@/Pages/Users/Individual/Workspace/utils/viewRouting';

describe('workspace viewRouting', () => {
  it('maps direct post-learning routes to the expected workspace views', () => {
    expect(resolveWorkspaceViewFromSubPath('post-learning')).toEqual({
      view: 'postLearning',
      quizId: null,
      backTarget: null,
    });

    expect(resolveWorkspaceViewFromSubPath('post-learning/create')).toEqual({
      view: 'createPostLearning',
      quizId: null,
      backTarget: null,
    });
  });

  it('resolves roadmap quiz detail deep links with roadmap and phase back targets', () => {
    expect(resolveWorkspaceViewFromSubPath('roadmap/77/phase/11/quiz/5')).toEqual({
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
    expect(resolveWorkspaceViewFromSubPath('roadmap/77/phase/11/quiz/5/edit')).toEqual({
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

    expect(buildWorkspacePathForView('quizDetail', selectedQuiz, quizBackTarget)).toBe('roadmap/77/phase/11/quiz/5');
    expect(buildWorkspacePathForView('editQuiz', selectedQuiz, quizBackTarget)).toBe('roadmap/77/phase/11/quiz/5/edit');
  });

  it('keeps direct path mappings for post-learning workspace routes', () => {
    expect(VIEW_TO_PATH.postLearning).toBe('post-learning');
    expect(VIEW_TO_PATH.createPostLearning).toBe('post-learning/create');
    expect(buildWorkspacePathForView('postLearning')).toBe('post-learning');
    expect(buildWorkspacePathForView('createPostLearning')).toBe('post-learning/create');
  });
});

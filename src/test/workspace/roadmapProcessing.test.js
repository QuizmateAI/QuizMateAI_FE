import { describe, expect, it } from 'vitest';
import { inferProcessingRoadmapGenerationIds } from '@/pages/Users/Individual/Workspace/utils/roadmapProcessing';

describe('inferProcessingRoadmapGenerationIds', () => {
  it('treats skipped pre-learning phases as knowledge generation instead of pre-learning generation', () => {
    const result = inferProcessingRoadmapGenerationIds([
      {
        phaseId: 11,
        status: 'PROCESSING',
        preLearningQuizzes: [],
        knowledges: [],
      },
      {
        phaseId: 12,
        status: 'PROCESSING',
        preLearningQuizzes: [],
        knowledges: [],
      },
    ], [11]);

    expect(result.knowledge).toEqual([11]);
    expect(result.preLearning).toEqual([12]);
  });
});

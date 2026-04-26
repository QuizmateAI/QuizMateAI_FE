import { describe, expect, it } from 'vitest';
import {
  filterModelsForAction,
  getAiActionLabel,
  getAiModelGroupLabel,
  getModelGroupsForAction,
} from '@/lib/aiModelCatalog';

const SAMPLE_MODELS = [
  { id: 1, provider: 'OPENAI', modelGroup: 'TEXT_GENERATION', displayName: 'GPT-4o' },
  { id: 2, provider: 'GEMINI', modelGroup: 'TEXT_GENERATION', displayName: 'Gemini Pro' },
  { id: 3, provider: 'OPENAI', modelGroup: 'DOCUMENT_PROCESSING', displayName: 'GPT-4o-mini' },
  { id: 4, provider: 'GEMINI', modelGroup: 'TRANSCRIPTION', displayName: 'Gemini Audio' },
  { id: 5, provider: 'OPENAI', modelGroup: 'TRANSCRIPTION', displayName: 'Whisper' },
];

describe('aiModelCatalog helpers', () => {
  describe('getAiActionLabel', () => {
    it('humanizes action keys when a translation is missing', () => {
      const t = (key, fallback) => fallback || key;

      expect(getAiActionLabel('SUGGEST_LEARNING_RESOURCES', t)).toBe('Suggest Learning Resources');
      expect(getAiActionLabel('UNKNOWN_ACTION', t)).toBe('Unknown Action');
    });
  });

  describe('getAiModelGroupLabel', () => {
    it('humanizes model groups when a translation is missing', () => {
      const t = (key, fallback) => fallback || key;

      expect(getAiModelGroupLabel('TEXT_GENERATION', t)).toBe('Text Generation');
      expect(getAiModelGroupLabel('UNKNOWN_GROUP', t)).toBe('Unknown Group');
    });
  });

  describe('getModelGroupsForAction', () => {
    it('returns the single mapped group for a known action', () => {
      expect(getModelGroupsForAction('GENERATE_QUIZ')).toEqual(['TEXT_GENERATION']);
      expect(getModelGroupsForAction('PROCESS_PDF')).toEqual(['DOCUMENT_PROCESSING']);
      expect(getModelGroupsForAction('PROCESS_AUDIO')).toEqual(['TRANSCRIPTION']);
      expect(getModelGroupsForAction('COMPANION_INTERPRET')).toEqual(['TEXT_GENERATION']);
      expect(getModelGroupsForAction('COMPANION_TRANSCRIBE')).toEqual(['TRANSCRIPTION']);
      expect(getModelGroupsForAction('COMPANION_TTS')).toEqual(['TEXT_TO_SPEECH']);
    });

    it('returns empty array for unknown actions', () => {
      expect(getModelGroupsForAction('UNKNOWN_ACTION')).toEqual([]);
      expect(getModelGroupsForAction(undefined)).toEqual([]);
    });
  });

  describe('filterModelsForAction', () => {
    it('filters by both action allowlist and explicit model group', () => {
      // PREVIEW_QUIZ_STRUCTURE is allowlisted to OPENAI only
      const filtered = filterModelsForAction(SAMPLE_MODELS, 'PREVIEW_QUIZ_STRUCTURE', 'TEXT_GENERATION');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(1);
    });

    it('returns models from both providers when allowlist is open', () => {
      // GENERATE_QUIZ has no allowlist override → both providers
      const filtered = filterModelsForAction(SAMPLE_MODELS, 'GENERATE_QUIZ', 'TEXT_GENERATION');
      expect(filtered.map((m) => m.id).sort()).toEqual([1, 2]);
    });

    it('respects modelGroup boundary', () => {
      const filtered = filterModelsForAction(SAMPLE_MODELS, 'PROCESS_AUDIO', 'TRANSCRIPTION');
      expect(filtered.map((m) => m.id).sort()).toEqual([4, 5]);
    });

    it('uses the companion provider allowlist', () => {
      const filtered = filterModelsForAction(SAMPLE_MODELS, 'COMPANION_TRANSCRIBE', 'TRANSCRIPTION');
      expect(filtered.map((m) => m.id)).toEqual([5]);
    });

    it('returns empty array when no model matches the requested group', () => {
      const filtered = filterModelsForAction(SAMPLE_MODELS, 'GENERATE_QUIZ', 'NONEXISTENT_GROUP');
      expect(filtered).toEqual([]);
    });

    it('honors the action allowlist when filtering across groups', () => {
      // ANALYZE_STUDY_PROFILE_KNOWLEDGE only allows OPENAI; only id=5 fits
      // (TRANSCRIPTION + OPENAI). id=4 is OPENAI-blocked.
      const filtered = filterModelsForAction(SAMPLE_MODELS, 'ANALYZE_STUDY_PROFILE_KNOWLEDGE', 'TRANSCRIPTION');
      expect(filtered.map((m) => m.id)).toEqual([5]);
    });

    it('treats missing modelGroup as no group filter', () => {
      const filtered = filterModelsForAction(SAMPLE_MODELS, 'GENERATE_QUIZ');
      // GENERATE_QUIZ has no allowlist → all 5 models pass provider filter
      expect(filtered).toHaveLength(5);
    });

    it('handles missing models param without throwing', () => {
      expect(filterModelsForAction(undefined, 'GENERATE_QUIZ', 'TEXT_GENERATION')).toEqual([]);
    });
  });
});

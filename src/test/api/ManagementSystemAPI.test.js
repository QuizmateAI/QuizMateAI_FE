import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '@/api/api';
import {
  deletePlanAiModelOverride,
  getAiFeatureCatalog,
  updateAiActionPolicy,
  upsertPlanAiModelOverride,
} from '@/api/ManagementSystemAPI';

vi.mock('@/api/api', () => ({
  default: {
    delete: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
  },
}));

const ADMIN_AI_CONFIG_TIMEOUT_MS = 30000;

describe('ManagementSystemAPI AI config timeouts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: {} });
    api.put.mockResolvedValue({ data: {} });
    api.delete.mockResolvedValue({ data: {} });
  });

  it('uses an extended timeout for AI action policy updates', async () => {
    const payload = { displayName: 'Generate flashcards' };

    await updateAiActionPolicy('GENERATE_FLASHCARDS', payload);

    expect(api.put).toHaveBeenCalledWith(
      '/ai-action-policies/GENERATE_FLASHCARDS',
      payload,
      expect.objectContaining({
        timeout: ADMIN_AI_CONFIG_TIMEOUT_MS,
      }),
    );
  });

  it('uses an extended timeout for plan model override mutations', async () => {
    const payload = {
      actionKey: 'GENERATE_FLASHCARDS',
      modelGroup: 'TEXT_GENERATION',
      modelId: 12,
    };

    await upsertPlanAiModelOverride(3, payload);
    await deletePlanAiModelOverride(3, 'GENERATE_FLASHCARDS', 'TEXT_GENERATION');

    expect(api.put).toHaveBeenCalledWith(
      '/management/plans/3/ai-model-overrides',
      payload,
      expect.objectContaining({
        timeout: ADMIN_AI_CONFIG_TIMEOUT_MS,
      }),
    );
    expect(api.delete).toHaveBeenCalledWith(
      '/management/plans/3/ai-model-overrides?actionKey=GENERATE_FLASHCARDS&modelGroup=TEXT_GENERATION',
      expect.objectContaining({
        timeout: ADMIN_AI_CONFIG_TIMEOUT_MS,
      }),
    );
  });

  it('loads the shared AI feature catalog from management API', async () => {
    await getAiFeatureCatalog();

    expect(api.get).toHaveBeenCalledWith('/management/ai-feature-catalog');
  });
});

import { describe, expect, it } from 'vitest';

import { resolveMaterialEventFromProgressPayload } from '@/hooks/useWebSocket';

describe('resolveMaterialEventFromProgressPayload', () => {
  it('routes APPROVED material progress to material:uploaded', () => {
    const result = resolveMaterialEventFromProgressPayload({
      status: 'APPROVED',
      data: {
        materialId: 42,
        status: 'ACTIVE',
        title: 'algebra.pdf',
      },
    });

    expect(result).toEqual({
      eventType: 'material:uploaded',
      material: {
        materialId: 42,
        status: 'ACTIVE',
        title: 'algebra.pdf',
      },
    });
  });

  it('uses processingObject materialId for warned terminal events', () => {
    const result = resolveMaterialEventFromProgressPayload({
      status: 'WARNED',
      message: 'Material requires review',
      processingObject: {
        materialId: 99,
      },
      data: {
        reason: 'Needs level review',
      },
    });

    expect(result).toEqual({
      eventType: 'material:updated',
      material: {
        materialId: 99,
        reason: 'Needs level review',
        status: 'WARN',
        message: 'Material requires review',
      },
    });
  });

  it('keeps processing material updates routable even when data payload is absent', () => {
    const result = resolveMaterialEventFromProgressPayload({
      status: 'PROCESSING',
      processingObject: {
        materialId: 7,
      },
    });

    expect(result).toEqual({
      eventType: 'material:updated',
      material: {
        materialId: 7,
        status: 'PROCESSING',
      },
    });
  });
});

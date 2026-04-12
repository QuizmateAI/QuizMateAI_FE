import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '@/api/api';
import { uploadGroupPendingMaterial, uploadMaterial } from '@/api/MaterialAPI';

vi.mock('@/api/api', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('MaterialAPI upload timeouts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.post.mockResolvedValue({ data: { ok: true } });
  });

  it('keeps standard material uploads open without a client timeout by default', async () => {
    const file = new File(['pdf'], 'slow-material.pdf', { type: 'application/pdf' });

    await uploadMaterial(file, 42);

    expect(api.post).toHaveBeenCalledWith(
      '/materials/upload',
      expect.any(FormData),
      expect.objectContaining({
        params: { workspaceID: 42 },
        timeout: 0,
      }),
    );
  });

  it('keeps group review uploads open without a client timeout by default', async () => {
    const file = new File(['pdf'], 'group-material.pdf', { type: 'application/pdf' });

    await uploadGroupPendingMaterial(file, 84);

    expect(api.post).toHaveBeenCalledWith(
      '/materials/upload/group-pending',
      expect.any(FormData),
      expect.objectContaining({
        params: { workspaceID: 84 },
        timeout: 0,
      }),
    );
  });

  it('still lets callers override the timeout explicitly when needed', async () => {
    const file = new File(['pdf'], 'override.pdf', { type: 'application/pdf' });

    await uploadMaterial(file, 99, { timeout: 3000 });

    expect(api.post).toHaveBeenCalledWith(
      '/materials/upload',
      expect.any(FormData),
      expect.objectContaining({
        params: { workspaceID: 99 },
        timeout: 3000,
      }),
    );
  });
});

import { describe, expect, it } from 'vitest';
import {
  GROUP_UPLOAD_ACCEPTED_EXTENSIONS,
  clampPercent,
  compactToastFilename,
  createUploadSessionKey,
  getFileExtension,
  getPendingMaterialRenderKey,
  getRealtimeMaterialId,
  inferMaterialType,
  isProcessingMaterialStatus,
  isReviewableMaterialStatus,
  isSupportedGroupUploadFile,
  isTerminalMaterialStatus,
  mapProcessingProgressToDisplay,
  mapTransportProgressToDisplay,
  normalizeMaterialStatus,
  normalizePositiveIds,
  normalizeWorkspaceSourceItem,
  resolveNeedReviewFlag,
  shouldTrackInLeaderReviewQueue,
  uploadFailuresIndicateWorkspaceCreditShortage,
} from '@/pages/Users/Group/utils/groupMaterialHelpers';

describe('groupMaterialHelpers', () => {
  describe('clampPercent', () => {
    it('clamps to [0, 100] and rounds', () => {
      expect(clampPercent(-10)).toBe(0);
      expect(clampPercent(0)).toBe(0);
      expect(clampPercent(45.7)).toBe(46);
      expect(clampPercent(101)).toBe(100);
      expect(clampPercent('not a number')).toBe(0);
    });
  });

  describe('normalizePositiveIds', () => {
    it('keeps unique positive integers only', () => {
      expect(normalizePositiveIds([1, 2, 2, '3', 0, -5, '4.5', null])).toEqual([1, 2, 3]);
    });

    it('returns [] for empty/invalid input', () => {
      expect(normalizePositiveIds()).toEqual([]);
      expect(normalizePositiveIds(null)).toEqual([]);
    });
  });

  describe('normalizeMaterialStatus + checks', () => {
    it('canonicalizes WARNED → WARN, REJECTED → REJECT', () => {
      expect(normalizeMaterialStatus('WARNED')).toBe('WARN');
      expect(normalizeMaterialStatus('rejected')).toBe('REJECT');
      expect(normalizeMaterialStatus(' active ')).toBe('ACTIVE');
    });

    it('isProcessingMaterialStatus matches in-flight statuses', () => {
      expect(isProcessingMaterialStatus('UPLOADING')).toBe(true);
      expect(isProcessingMaterialStatus('PROCESSING')).toBe(true);
      expect(isProcessingMaterialStatus('PENDING')).toBe(true);
      expect(isProcessingMaterialStatus('QUEUED')).toBe(true);
      expect(isProcessingMaterialStatus('ACTIVE')).toBe(false);
    });

    it('isReviewableMaterialStatus matches ACTIVE and WARN', () => {
      expect(isReviewableMaterialStatus('ACTIVE')).toBe(true);
      expect(isReviewableMaterialStatus('WARNED')).toBe(true);
      expect(isReviewableMaterialStatus('PROCESSING')).toBe(false);
    });

    it('isTerminalMaterialStatus covers all final states', () => {
      ['ACTIVE', 'WARN', 'ERROR', 'REJECT', 'DELETED', 'WARNED', 'REJECTED'].forEach((status) => {
        expect(isTerminalMaterialStatus(status)).toBe(true);
      });
      expect(isTerminalMaterialStatus('PROCESSING')).toBe(false);
    });
  });

  describe('resolveNeedReviewFlag', () => {
    it('returns first defined value coerced to boolean, else true', () => {
      expect(resolveNeedReviewFlag(undefined, null, true)).toBe(true);
      expect(resolveNeedReviewFlag(false, true)).toBe(false);
      expect(resolveNeedReviewFlag(undefined, undefined)).toBe(true);
    });
  });

  describe('compactToastFilename', () => {
    it('keeps short names intact', () => {
      expect(compactToastFilename('short.pdf')).toBe('short.pdf');
    });

    it('truncates long names while preserving extension', () => {
      const longName = `${'a'.repeat(80)}.docx`;
      const compact = compactToastFilename(longName, 30);
      expect(compact.endsWith('.docx')).toBe(true);
      expect(compact.length).toBeLessThanOrEqual(30);
      expect(compact).toContain('...');
    });
  });

  describe('upload helpers', () => {
    it('GROUP_UPLOAD_ACCEPTED_EXTENSIONS includes common doc types', () => {
      ['.pdf', '.docx', '.pptx', '.mp4', '.png'].forEach((ext) => {
        expect(GROUP_UPLOAD_ACCEPTED_EXTENSIONS.has(ext)).toBe(true);
      });
    });

    it('getFileExtension extracts last extension', () => {
      expect(getFileExtension('archive.tar.gz')).toBe('.gz');
      expect(getFileExtension('NoExt')).toBe('');
      expect(getFileExtension(undefined)).toBe('');
    });

    it('isSupportedGroupUploadFile gates by extension', () => {
      expect(isSupportedGroupUploadFile({ name: 'a.pdf' })).toBe(true);
      expect(isSupportedGroupUploadFile({ name: 'a.exe' })).toBe(false);
    });

    it('inferMaterialType uses provided MIME first', () => {
      expect(inferMaterialType({ type: 'image/webp', name: 'x.png' })).toBe('image/webp');
      expect(inferMaterialType({ name: 'x.PDF' })).toBe('application/pdf');
      expect(inferMaterialType({ name: 'unknown' })).toBe('application/octet-stream');
    });

    it('createUploadSessionKey is unique per call', () => {
      const a = createUploadSessionKey({ name: 'a.pdf' });
      const b = createUploadSessionKey({ name: 'a.pdf' });
      expect(a).not.toBe(b);
      expect(a.startsWith('upload:')).toBe(true);
    });

    it('uploadFailuresIndicateWorkspaceCreditShortage detects QMC/credit phrases', () => {
      expect(uploadFailuresIndicateWorkspaceCreditShortage(['file.pdf: cần 5 QMC'])).toBe(true);
      expect(uploadFailuresIndicateWorkspaceCreditShortage(['file.pdf: parsing error'])).toBe(false);
      expect(uploadFailuresIndicateWorkspaceCreditShortage([])).toBe(false);
    });
  });

  describe('progress mapping', () => {
    it('mapTransportProgressToDisplay stays in [1, 24]', () => {
      expect(mapTransportProgressToDisplay(0)).toBe(1);
      expect(mapTransportProgressToDisplay(100)).toBe(24);
      expect(mapTransportProgressToDisplay(50)).toBeGreaterThan(1);
      expect(mapTransportProgressToDisplay(50)).toBeLessThan(24);
    });

    it('mapProcessingProgressToDisplay stays in [25, 99]', () => {
      expect(mapProcessingProgressToDisplay(0)).toBe(25);
      expect(mapProcessingProgressToDisplay(100)).toBe(99);
    });
  });

  describe('getRealtimeMaterialId', () => {
    it('reads materialId from payload directly', () => {
      expect(getRealtimeMaterialId({ materialId: 7 })).toBe(7);
      expect(getRealtimeMaterialId({ data: { material_id: '8' } })).toBe(8);
    });

    it('falls back to uploads matched by taskId', () => {
      const uploads = [{ taskId: 't-1', materialId: 9 }];
      expect(getRealtimeMaterialId({}, 't-1', uploads)).toBe(9);
    });

    it('returns null when nothing matches', () => {
      expect(getRealtimeMaterialId({}, 't-x', [])).toBeNull();
      expect(getRealtimeMaterialId({})).toBeNull();
    });
  });

  describe('normalizeWorkspaceSourceItem', () => {
    it('builds canonical shape from primary and fallback inputs', () => {
      const result = normalizeWorkspaceSourceItem(
        { id: 12, title: 'Slide', materialType: 'application/pdf', status: 'WARNED' },
      );
      expect(result?.materialId).toBe(12);
      expect(result?.id).toBe(12);
      expect(result?.title).toBe('Slide');
      expect(result?.status).toBe('WARN');
    });

    it('returns null when materialId is invalid', () => {
      expect(normalizeWorkspaceSourceItem({ id: 0 })).toBeNull();
      expect(normalizeWorkspaceSourceItem(null)).toBeNull();
    });
  });

  describe('shouldTrackInLeaderReviewQueue', () => {
    it('returns true when processing or needReview is set', () => {
      expect(shouldTrackInLeaderReviewQueue('PROCESSING', false)).toBe(true);
      expect(shouldTrackInLeaderReviewQueue('ACTIVE', true)).toBe(true);
      expect(shouldTrackInLeaderReviewQueue('ACTIVE', false)).toBe(false);
    });
  });

  describe('getPendingMaterialRenderKey', () => {
    it('uses materialId when present', () => {
      expect(getPendingMaterialRenderKey({ materialId: 5 })).toBe('pending:material:5');
    });

    it('falls back to taskId when materialId missing', () => {
      expect(getPendingMaterialRenderKey({ taskId: 't1' })).toBe('pending:task:t1');
    });

    it('falls back to title+uploadedAt+index when both missing', () => {
      const key = getPendingMaterialRenderKey({ title: 'X', uploadedAt: '2026-01-01' }, 'queue', 3);
      expect(key).toBe('queue:fallback:X:2026-01-01:3');
    });
  });
});

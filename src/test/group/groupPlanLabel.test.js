import { describe, expect, it, vi } from 'vitest';
import {
  GROUP_PLAN_NAME_FALLBACKS,
  canonicalPlanNameToken,
  inferGroupPlanTokenFromDisplayName,
  normalizePlanLookupText,
  normalizePlanNameToken,
  resolveLocalizedGroupPlanName,
} from '@/pages/Users/Group/utils/groupPlanLabel';

describe('groupPlanLabel', () => {
  describe('normalizePlanNameToken', () => {
    it('uppercases and replaces separators with underscores', () => {
      expect(normalizePlanNameToken('group-base')).toBe('GROUP_BASE');
      expect(normalizePlanNameToken('Group Base')).toBe('GROUP_BASE');
      expect(normalizePlanNameToken('  group  base  ')).toBe('GROUP_BASE');
    });

    it('strips non-alphanumeric except underscore', () => {
      expect(normalizePlanNameToken('Group@Base!')).toBe('GROUPBASE');
      expect(normalizePlanNameToken(null)).toBe('');
    });
  });

  describe('canonicalPlanNameToken', () => {
    it('maps GROUPBASE → GROUP_BASE', () => {
      expect(canonicalPlanNameToken('groupbase')).toBe('GROUP_BASE');
      expect(canonicalPlanNameToken('GROUP-BASE')).toBe('GROUP_BASE');
    });

    it('passes through other tokens unchanged', () => {
      expect(canonicalPlanNameToken('PRO')).toBe('PRO');
    });
  });

  describe('normalizePlanLookupText', () => {
    it('strips Vietnamese diacritics and collapses whitespace', () => {
      expect(normalizePlanLookupText('Gói Cơ Bản')).toBe('goi co ban');
    });

    it('returns empty string for null/undefined', () => {
      expect(normalizePlanLookupText(null)).toBe('');
      expect(normalizePlanLookupText(undefined)).toBe('');
    });
  });

  describe('inferGroupPlanTokenFromDisplayName', () => {
    it('infers GROUP_BASE from common display names (en + vi)', () => {
      expect(inferGroupPlanTokenFromDisplayName('Group Base')).toBe('GROUP_BASE');
      expect(inferGroupPlanTokenFromDisplayName('Gói nhóm cơ bản')).toBe('GROUP_BASE');
      expect(inferGroupPlanTokenFromDisplayName('Gói cơ bản')).toBe('GROUP_BASE');
    });

    it('returns empty string when no match', () => {
      expect(inferGroupPlanTokenFromDisplayName('Premium')).toBe('');
      expect(inferGroupPlanTokenFromDisplayName('')).toBe('');
    });
  });

  describe('GROUP_PLAN_NAME_FALLBACKS', () => {
    it('has English label for known plan codes', () => {
      expect(GROUP_PLAN_NAME_FALLBACKS.GROUP_BASE.en).toBe('Group Base');
    });
  });

  describe('resolveLocalizedGroupPlanName', () => {
    const mockT = (key, options = {}) => {
      // Simulate i18n that returns a real label only when the key exactly matches
      // a hard-coded mapping; otherwise returns options.defaultValue or ''.
      const mapping = {
        'groupWorkspace.header.planNames.GROUP_BASE': 'Gói nhóm cơ bản',
      };
      return mapping[key] ?? options?.defaultValue ?? '';
    };

    it('returns localized label when t-key exists', () => {
      const label = resolveLocalizedGroupPlanName({
        planDisplayName: 'Group Base',
        planCode: 'group_base',
        t: mockT,
        lang: 'vi',
      });
      expect(label).toBe('Gói nhóm cơ bản');
    });

    it('falls back to GROUP_PLAN_NAME_FALLBACKS when t returns empty', () => {
      const emptyT = vi.fn(() => '');
      const label = resolveLocalizedGroupPlanName({
        planDisplayName: 'Group Base',
        planCode: 'group_base',
        t: emptyT,
        lang: 'en',
      });
      expect(label).toBe('Group Base');
    });

    it('falls back to original display name when nothing matches', () => {
      const emptyT = vi.fn(() => '');
      const label = resolveLocalizedGroupPlanName({
        planDisplayName: 'Custom Plan X',
        planCode: 'custom_x',
        t: emptyT,
        lang: 'en',
      });
      expect(label).toBe('Custom Plan X');
    });
  });
});

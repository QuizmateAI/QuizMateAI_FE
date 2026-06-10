// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  isWordDocxMaterial,
  pickDocxPreviewUrl,
  pickPdfUrl,
} from '@/utils/materialFileUrl';

describe('materialFileUrl', () => {
  it('picks pdf and docx urls from material source fields', () => {
    const source = {
      storageURL: 'https://cdn.example.com/workspace/report.docx',
      materialType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      originalFileName: 'report.docx',
    };

    expect(isWordDocxMaterial(source)).toBe(true);
    expect(pickDocxPreviewUrl(source)).toBe('https://cdn.example.com/workspace/report.docx');
    expect(pickPdfUrl({ storageURL: 'https://cdn.example.com/file.pdf' })).toBe(
      'https://cdn.example.com/file.pdf',
    );
  });

  it('does not treat legacy .doc files as docx preview candidates', () => {
    const source = {
      storageURL: 'https://cdn.example.com/legacy.doc',
      materialType: 'application/msword',
      originalFileName: 'legacy.doc',
    };

    expect(isWordDocxMaterial(source)).toBe(false);
    expect(pickDocxPreviewUrl(source)).toBeNull();
  });
});

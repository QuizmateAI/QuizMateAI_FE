// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { buildOfficeViewerUrl } from '@/utils/docxIframeRenderer';

describe('docx viewer helpers', () => {
  it('builds the Microsoft Office embed url', () => {
    const url = 'https://cdn.example.com/files/report.docx?sig=abc';
    expect(buildOfficeViewerUrl(url)).toBe(
      `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`,
    );
  });
});

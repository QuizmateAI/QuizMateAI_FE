// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  findPageForSectionId,
  findPageForSourceSpan,
  paginateByDocumentSections,
  paginateExtractedText,
} from '@/utils/documentPagination';

describe('documentPagination', () => {
  it('splits word documents by markdown headings', () => {
    const text = [
      '## Chapter 1',
      'First chapter body with enough content.',
      '## Chapter 2',
      'Second chapter body with another paragraph.',
    ].join('\n\n');

    const { pages, totalPages } = paginateExtractedText(text);
    expect(totalPages).toBe(2);
    expect(pages[0].text).toContain('Chapter 1');
    expect(pages[1].text).toContain('Chapter 2');
  });

  it('finds the page that contains the sourceSpan highlight', () => {
    const sourceSpan = 'Java chấp nhận phần mở rộng .java.';
    const text = [
      '## Intro',
      'General overview only.',
      '## Programs',
      `Tên file đóng vai trò rất quan trọng trong Java. ${sourceSpan}`,
    ].join('\n\n');
    const { pages } = paginateExtractedText(text);

    expect(findPageForSourceSpan(pages, sourceSpan)).toBe(2);
  });

  it('paginates by document sections using chunk content', () => {
    const sections = [
      {
        id: 'section-1',
        title: 'Intro',
        chunkIds: ['chunk-a'],
        children: [],
      },
      {
        id: 'section-2',
        title: 'Programs',
        chunkIds: ['chunk-b'],
        children: [],
      },
    ];
    const chunks = [
      { chunk_id: 'chunk-a', content: 'Opening paragraph for the book.' },
      { chunk_id: 'chunk-b', content: 'Java chấp nhận phần mở rộng .java.' },
    ];

    const { pages, totalPages } = paginateByDocumentSections(sections, chunks, '');
    expect(totalPages).toBe(2);
    expect(pages[0].sectionTitle).toBe('Intro');
    expect(pages[1].text).toContain('Java chấp nhận');
    expect(findPageForSectionId(pages, 'section-2')).toBe(2);
  });
});

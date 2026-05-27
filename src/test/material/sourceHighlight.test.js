// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { getHighlightedContentSegments } from '@/components/material/sourceHighlight';

function highlightedText(content, sourceSpan) {
  return getHighlightedContentSegments(content, sourceSpan)
    .filter((segment) => segment.highlight)
    .map((segment) => segment.text)
    .join('');
}

describe('sourceSpan highlight matching', () => {
  it('highlights the exact sourceSpan returned with the question', () => {
    const sourceSpan = 'Tên file đóng vai trò rất quan trọng trong Java.';
    const content = `Chương trình 3.1\n\n${sourceSpan} Chương trình biên dịch Java chấp nhận phần mở rộng .java.`;

    expect(highlightedText(content, sourceSpan)).toBe(sourceSpan);
  });

  it('still highlights when the chunk and sourceSpan only differ by whitespace or line breaks', () => {
    const content = 'Tên file đóng vai trò rất quan trọng trong Java. Chương trình biên dịch Java chấp nhận phần mở rộng .java.';
    const sourceSpan = 'Tên file đóng vai trò rất quan trọng\n\ntrong Java.   Chương trình biên dịch Java';

    expect(highlightedText(content, sourceSpan)).toBe(
      'Tên file đóng vai trò rất quan trọng trong Java. Chương trình biên dịch Java',
    );
  });

  it('still highlights when punctuation, quote style, or Vietnamese accents differ', () => {
    const content = 'Chương trình 3.1 // This is a simple program called “First.java” class First { public static void main(String args[]) { System.out.println("My first program in Java"); } }';
    const sourceSpan = 'Chuong trinh 3 1 This is a simple program called First java class First public static void main String args';

    expect(highlightedText(content, sourceSpan)).toContain(
      'Chương trình 3.1 // This is a simple program called “First.java” class First',
    );
  });

  it('does not highlight weak matches that only share a short generic prefix', () => {
    const content = 'Java là công cụ phổ biến trong ví dụ này, nhưng đoạn văn đang nói về lớp đối tượng và phương thức.';
    const sourceSpan = 'Java là công cụ phổ biến trong tài liệu này để biên dịch và chạy chương trình cùng terminal và trình soạn thảo văn bản.';

    expect(highlightedText(content, sourceSpan)).toBe('');
  });
});

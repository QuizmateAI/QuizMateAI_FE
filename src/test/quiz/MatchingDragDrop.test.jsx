import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MatchingDragDrop from '@/pages/Users/Quiz/components/MatchingDragDrop';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallbackOrOptions) => (typeof fallbackOrOptions === 'string' ? fallbackOrOptions : key),
  }),
}));

describe('MatchingDragDrop', () => {
  it('TC-Q04: updates the matching answer when an item is dropped into a slot', () => {
    const onPairChange = vi.fn();
    const dataTransfer = {
      setData: vi.fn(),
      effectAllowed: 'move',
      dropEffect: 'move',
    };

    render(
      <MatchingDragDrop
        leftItems={['Capital of France']}
        rightOptions={['Paris', 'Berlin']}
        matchedPairs={[]}
        onPairChange={onPairChange}
      />
    );

    const draggableOption = screen.getByText('Paris').closest('div[draggable="true"]');
    const dropZone = screen.getByText('Drag an answer here');

    expect(draggableOption).not.toBeNull();

    fireEvent.dragStart(draggableOption, { dataTransfer });
    fireEvent.dragEnter(dropZone, { dataTransfer });
    fireEvent.dragOver(dropZone, { dataTransfer });
    fireEvent.drop(dropZone, { dataTransfer });

    expect(onPairChange).toHaveBeenCalledWith({
      matchingPairs: [{ leftKey: 'Capital of France', rightKey: 'Paris' }],
    });
  });
});

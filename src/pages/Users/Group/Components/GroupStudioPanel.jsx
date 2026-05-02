import React, { Suspense } from 'react';
import ListSpinner from '@/components/ui/ListSpinner';

export const loadGroupChatPanel = () => import('./ChatPanel');
const LazyGroupChatPanel = React.lazy(loadGroupChatPanel);

/**
 * Wrapper for the studio panel (flashcard / quiz / roadmap / mockTest tabs of
 * the group workspace). Owns the lazy-load Suspense boundary and the surrounding
 * styling. The chat panel itself receives all behavioural props through
 * `chatPanelProps` so this file stays a pure presentational shell — extracting
 * it shrinks GroupWorkspacePage.jsx without taking on prop semantics.
 */
export function GroupStudioPanel({ unstyled = false, isDarkMode, chatPanelProps }) {
  const suspenseFallbackClass = unstyled
    ? 'flex h-full min-h-0 items-center justify-center'
    : 'flex h-full min-h-[500px] items-center justify-center';

  const panelContent = (
    <Suspense
      fallback={(
        <div className={suspenseFallbackClass}>
          <ListSpinner variant="section" className="h-full" />
        </div>
      )}
    >
      <LazyGroupChatPanel {...chatPanelProps} />
    </Suspense>
  );

  if (unstyled) {
    return <div className="h-full min-h-0">{panelContent}</div>;
  }

  return (
    <div
      className={`rounded-[28px] border overflow-hidden ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-white/80 bg-white/82'}`}
      style={{ minHeight: 500 }}
    >
      {panelContent}
    </div>
  );
}

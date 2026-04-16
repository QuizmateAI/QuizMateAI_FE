import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import ToastNotification from '@/Components/ToastNotification';
import { ToastProvider, useToast } from '@/context/ToastContext';

function ToastTrigger() {
  const { showSuccess, showError, showWarning, showInfo } = useToast();

  return (
    <div>
      <button onClick={() => showSuccess('Success action done')}>Show Success</button>
      <button onClick={() => showError('Mapped error message')}>Show Error</button>
      <button onClick={() => showWarning('Warning signal')}>Show Warning</button>
      <button onClick={() => showInfo('Information signal')}>Show Info</button>
      <button onClick={() => showWarning('Custom warning signal', { duration: 7000 })}>Show Custom Duration</button>
      <button
        onClick={() => {
          showSuccess('S1');
          showError('E2');
          showSuccess('S3');
          showError('E4');
        }}
      >
        Show Multiple
      </button>
    </div>
  );
}

describe('Toast behavior execution', () => {
  const flushToastTimers = () => {
    act(() => {
      vi.advanceTimersByTime(2500);
    });
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
  });

  it('TC_TOAST_01: renders success toast with success styling', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    );

    act(() => {
      screen.getByRole('button', { name: 'Show Success' }).click();
    });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Success action done');
    expect(alert.innerHTML).toContain('text-emerald-600');

    flushToastTimers();
  });

  it('TC_TOAST_02: renders error toast with error styling', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    );

    act(() => {
      screen.getByRole('button', { name: 'Show Error' }).click();
    });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Mapped error message');
    expect(alert.innerHTML).toContain('text-rose-600');

    flushToastTimers();
  });

  it('TC_TOAST_04: auto dismisses toast after configured timeout', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    );

    act(() => {
      screen.getByRole('button', { name: 'Show Success' }).click();
    });
    expect(screen.getByRole('alert')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2200);
    });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('TC_TOAST_04B: respects per-toast custom duration override', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    );

    act(() => {
      screen.getByRole('button', { name: 'Show Custom Duration' }).click();
    });
    expect(screen.getByRole('alert')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(6900);
    });
    expect(screen.getByRole('alert')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('TC_TOAST_06: supports stacking multiple toasts', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    );

    act(() => {
      screen.getByRole('button', { name: 'Show Multiple' }).click();
    });

    expect(screen.getAllByRole('alert')).toHaveLength(4);

    flushToastTimers();
  });

  it('TC_TOAST_07: toast container uses high z-index', () => {
    const { container } = render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    );

    const toastContainer = container.querySelector('.z-\\[9999\\]');
    expect(toastContainer).toBeTruthy();
  });

  it('TC_TOAST_10: cleans up interval on unmount and avoids post-unmount close call', () => {
    const onClose = vi.fn();

    const { unmount } = render(
      <ToastNotification
        id={1}
        type="success"
        message="Will be unmounted"
        duration={2000}
        onClose={onClose}
      />
    );

    unmount();

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('TC_TOAST_03: renders warning and info toast variants', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    );

    act(() => {
      screen.getByRole('button', { name: 'Show Warning' }).click();
    });
    const warningToast = screen.getByRole('alert');
    expect(warningToast).toHaveTextContent('Warning signal');
    expect(warningToast.innerHTML).toContain('text-amber-600');

    flushToastTimers();

    act(() => {
      screen.getByRole('button', { name: 'Show Info' }).click();
    });
    const infoToast = screen.getByRole('alert');
    expect(infoToast).toHaveTextContent('Information signal');
    expect(infoToast.innerHTML).toContain('text-sky-600');

    flushToastTimers();
  });

  it('TC_TOAST_05: supports manual close by clicking X button', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    );

    act(() => {
      screen.getByRole('button', { name: 'Show Success' }).click();
    });

    const closeBtn = screen.getByRole('button', { name: 'Close toast' });
    act(() => {
      closeBtn.click();
    });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('TC_TOAST_08: pauses auto-dismiss countdown on hover and resumes on mouse leave', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    );

    act(() => {
      screen.getByRole('button', { name: 'Show Success' }).click();
    });

    const toast = screen.getByRole('alert');

    act(() => {
      vi.advanceTimersByTime(900);
    });

    act(() => {
      fireEvent.mouseEnter(toast);
    });

    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(screen.getByRole('alert')).toBeInTheDocument();

    act(() => {
      fireEvent.mouseLeave(toast);
      vi.advanceTimersByTime(1300);
    });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('TC_TOAST_09: uses responsive width classes for mobile layout', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    );

    act(() => {
      screen.getByRole('button', { name: 'Show Success' }).click();
    });

    const toast = screen.getByRole('alert');
    expect(toast.className).toContain('w-[min(92vw,520px)]');
    expect(toast.className).toContain('min-w-0');

    flushToastTimers();
  });

  it('TC_TOAST_11: renders structured action as underlined CTA and executes it', () => {
    const onAction = vi.fn();
    const onClose = vi.fn();

    render(
      <ToastNotification
        id={99}
        type="warning"
        message={{
          title: 'Upgrade required',
          description: 'Advanced quiz types are locked in the current plan.',
          action: {
            label: 'Upgrade now',
            onClick: onAction,
          },
        }}
        duration={10000}
        onClose={onClose}
      />
    );

    const actionButton = screen.getByRole('button', { name: 'Upgrade now' });
    expect(actionButton.className).toContain('underline');

    act(() => {
      actionButton.click();
    });

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

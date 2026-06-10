import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AssignmentFormDialog from '@/pages/Users/Group/Components/assignments/AssignmentFormDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }) => (open ? <div role="dialog">{children}</div> : null),
  DialogContent: ({ children, className }) => <div className={className}>{children}</div>,
  DialogHeader: ({ children }) => <div>{children}</div>,
  DialogTitle: ({ children, className }) => <h2 className={className}>{children}</h2>,
  DialogDescription: ({ children, className }) => <p className={className}>{children}</p>,
  DialogFooter: ({ children, className }) => <div className={className}>{children}</div>,
}));

vi.mock('@/components/system/ToastError', () => ({
  default: ({ message, enabled }) => (
    <div
      data-testid="toast-error"
      data-message={message || ''}
      data-enabled={enabled ? 'true' : 'false'}
    />
  ),
}));

vi.mock('@/pages/Users/Group/Components/assignments/AssignmentResourcePicker', () => ({
  default: ({ onChange }) => (
    <div data-testid="resource-picker">
      <button onClick={() => onChange({ resourceType: 'QUIZ', resourceId: 42 })}>Select Resource</button>
      <button onClick={() => onChange({ resourceType: 'QUIZ', resourceId: null })}>Clear Resource</button>
    </div>
  ),
}));

vi.mock('@/pages/Users/Group/Components/assignments/AssignmentAudiencePicker', () => ({
  default: ({ onChange }) => (
    <div data-testid="audience-picker">
      <button onClick={() => onChange({ audienceType: 'SPECIFIC_MEMBERS', targetUserIds: [100, 101] })}>Select Members</button>
      <button onClick={() => onChange({ audienceType: 'SPECIFIC_MEMBERS', targetUserIds: [] })}>Clear Members</button>
    </div>
  ),
}));

describe('AssignmentFormDialog Validation Lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps ToastError disabled for empty members initially until the user has checked and unchecked members', async () => {
    render(
      <AssignmentFormDialog
        open
        onOpenChange={vi.fn()}
        workspaceId={1}
        currentUserId={9}
        onSubmit={vi.fn()}
      />
    );

    // Get the ToastError components. There are multiple (titleError, descriptionError, dueAtError, resourceError, audienceError, submitError).
    // Let's filter by the message we expect for audienceEmpty.
    const getAudienceToast = () => {
      const toasts = screen.getAllByTestId('toast-error');
      return toasts.find(
        (t) => t.getAttribute('data-message') === 'groupWorkspace.assignments.form.errors.audienceEmpty'
      );
    };

    // 1. Initially, audienceType is ALL_MEMBERS, so no audienceEmpty error toast exists/is active.
    let audienceToast = getAudienceToast();
    expect(audienceToast).toBeUndefined();

    // 2. Select specific members but keep the list empty.
    const clearMembersBtn = screen.getByText('Clear Members');
    fireEvent.click(clearMembersBtn);

    // The audienceEmpty ToastError should be rendered now, but with enabled="false" (disabled).
    await waitFor(() => {
      audienceToast = getAudienceToast();
      expect(audienceToast).toBeDefined();
      expect(audienceToast.getAttribute('data-enabled')).toBe('false');
    });

    // 3. Select some members (error becomes empty, audienceDirty becomes true).
    fireEvent.click(screen.getByText('Select Members'));
    await waitFor(() => {
      audienceToast = getAudienceToast();
      expect(audienceToast).toBeUndefined();
    });

    // 4. Clear members again (targetUserIds becomes []).
    // Since audienceDirty is now true, the audienceEmpty ToastError should be enabled.
    fireEvent.click(screen.getByText('Clear Members'));
    await waitFor(() => {
      audienceToast = getAudienceToast();
      expect(audienceToast).toBeDefined();
      expect(audienceToast.getAttribute('data-enabled')).toBe('true');
    });
  });

  it('keeps ToastError disabled for empty resource initially until the user has selected and cleared a resource', async () => {
    render(
      <AssignmentFormDialog
        open
        onOpenChange={vi.fn()}
        workspaceId={1}
        currentUserId={9}
        onSubmit={vi.fn()}
      />
    );

    const getResourceToast = () => {
      const toasts = screen.getAllByTestId('toast-error');
      return toasts.find(
        (t) => t.getAttribute('data-message') === 'groupWorkspace.assignments.form.errors.resourceIdRequired'
      );
    };

    // 1. Initially, resourceId is null.
    // The resourceIdRequired ToastError is rendered, but should have enabled="false".
    let resourceToast = getResourceToast();
    expect(resourceToast).toBeDefined();
    expect(resourceToast.getAttribute('data-enabled')).toBe('false');

    // 2. Select a resource (resourceId becomes 42, error becomes empty).
    fireEvent.click(screen.getByText('Select Resource'));
    await waitFor(() => {
      resourceToast = getResourceToast();
      expect(resourceToast).toBeUndefined();
    });

    // 3. Clear the resource (resourceId becomes null again).
    // Since resourceDirty is now true, the ToastError should be enabled.
    fireEvent.click(screen.getByText('Clear Resource'));
    await waitFor(() => {
      resourceToast = getResourceToast();
      expect(resourceToast).toBeDefined();
      expect(resourceToast.getAttribute('data-enabled')).toBe('true');
    });
  });
});

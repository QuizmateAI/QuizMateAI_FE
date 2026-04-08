import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PlanFormWizard from '@/Pages/Admin/components/PlanFormWizard';

function DummyIcon() {
  return <svg aria-hidden="true" />;
}

function createTranslator() {
  return (key, fallbackOrOptions) => {
    if (key === 'auth.cancel') return 'Cancel';
    if (key === 'subscription.create') return 'Create';
    if (key === 'subscription.addPlan') return 'Add New Plan';
    if (typeof fallbackOrOptions === 'string') return fallbackOrOptions;
    if (fallbackOrOptions && typeof fallbackOrOptions === 'object' && 'defaultValue' in fallbackOrOptions) {
      return fallbackOrOptions.defaultValue;
    }
    return key;
  };
}

function renderWizard(overrides = {}) {
  const t = createTranslator();

  return render(
    <PlanFormWizard
      open
      onOpenChange={vi.fn()}
      isDarkMode={false}
      t={t}
      locale="en-US"
      editingPlan={null}
      isSubmitting={false}
      formData={{
        code: 'TEAM',
        displayName: 'Team plan',
        planScope: 'WORKSPACE',
        planLevel: '2',
        price: '2000000',
        description: '',
      }}
      setFormData={vi.fn()}
      entitlement={{
        maxIndividualWorkspace: 1,
        maxMaterialInWorkspace: 10,
        planIncludedCredits: 0,
        canProcessPdf: true,
      }}
      setEntitlement={vi.fn()}
      entitlementToggles={{
        canProcessPdf: {
          labelKey: 'subscription.entitlements.canProcessPdf',
          defaultLabel: 'PDF',
          icon: DummyIcon,
        },
      }}
      aiModelAssignments={{}}
      setAiModelAssignments={vi.fn()}
      functionAssignmentMap={{}}
      availableAiModels={[]}
      creditUnitPrice={200}
      highestActiveUserPlanEntitlement={null}
      onSubmit={vi.fn()}
      onValidationError={vi.fn()}
      {...overrides}
    />
  );
}

describe('PlanFormWizard', () => {
  it('shows level selection for workspace plans without requiring user-only entitlement limits', () => {
    renderWizard();

    expect(screen.getByText('Level')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    expect(screen.getByText('Entitlements and limits')).toBeInTheDocument();
    expect(screen.queryByText(/Max individual workspace/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Max material \/ workspace/i)).not.toBeInTheDocument();
  });
});

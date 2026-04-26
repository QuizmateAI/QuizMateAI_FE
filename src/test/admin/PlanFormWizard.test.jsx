import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PlanFormWizard from '@/pages/Admin/components/PlanFormWizard';

vi.mock('@/api/ManagementSystemAPI', () => ({
  getAiFeatureCatalog: vi.fn().mockResolvedValue({ data: { data: [] } }),
  getAllAiActionPolicies: vi.fn().mockResolvedValue({ data: { data: [] } }),
}));

function DummyIcon() {
  return <svg aria-hidden="true" />;
}

const DEFAULT_ENTITLEMENT_TOGGLES = {
  canProcessPdf: {
    labelKey: 'subscription.entitlements.canProcessPdf',
    defaultLabel: 'PDF',
    icon: DummyIcon,
  },
  canProcessText: {
    labelKey: 'subscription.entitlements.canProcessText',
    defaultLabel: 'Text',
    icon: DummyIcon,
  },
  canProcessWord: {
    labelKey: 'subscription.entitlements.canProcessWord',
    defaultLabel: 'Word',
    icon: DummyIcon,
  },
  canProcessSlide: {
    labelKey: 'subscription.entitlements.canProcessSlide',
    defaultLabel: 'Slide',
    icon: DummyIcon,
  },
  canProcessExcel: {
    labelKey: 'subscription.entitlements.canProcessExcel',
    defaultLabel: 'Excel',
    icon: DummyIcon,
  },
  canProcessImage: {
    labelKey: 'subscription.entitlements.canProcessImage',
    defaultLabel: 'Image',
    icon: DummyIcon,
  },
  canProcessAudio: {
    labelKey: 'subscription.entitlements.canProcessAudio',
    defaultLabel: 'Audio',
    icon: DummyIcon,
  },
  canProcessVideo: {
    labelKey: 'subscription.entitlements.canProcessVideo',
    defaultLabel: 'Video',
    icon: DummyIcon,
  },
  hasAdvanceQuizConfig: {
    labelKey: 'subscription.entitlements.hasAdvanceQuizConfig',
    defaultLabel: 'Advanced quiz configuration',
    icon: DummyIcon,
  },
  canCreateRoadMap: {
    labelKey: 'subscription.entitlements.canCreateRoadMap',
    defaultLabel: 'Create roadmap',
    icon: DummyIcon,
  },
  hasAiCompanionMode: {
    labelKey: 'subscription.entitlements.hasAiCompanionMode',
    defaultLabel: 'AI companion',
    icon: DummyIcon,
  },
};

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
      entitlementToggles={DEFAULT_ENTITLEMENT_TOGGLES}
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

function renderStatefulWizard(overrides = {}) {
  const t = createTranslator();
  const onValidationError = overrides.onValidationError ?? vi.fn();

  function Wrapper() {
    const [formData, setFormData] = React.useState({
      code: 'BASIC',
      displayName: 'Basic plan',
      planScope: 'USER',
      planLevel: '0',
      price: '1500',
      description: '',
      ...(overrides.formData ?? {}),
    });
    const [entitlement, setEntitlement] = React.useState({
      maxIndividualWorkspace: 1,
      maxMaterialInWorkspace: 10,
      planIncludedCredits: 50,
      canProcessPdf: true,
      ...(overrides.entitlement ?? {}),
    });

    return (
      <PlanFormWizard
        open
        onOpenChange={vi.fn()}
        isDarkMode={false}
        t={t}
        locale="en-US"
        editingPlan={null}
        isSubmitting={false}
        formData={formData}
        setFormData={setFormData}
        entitlement={entitlement}
        setEntitlement={setEntitlement}
        entitlementToggles={DEFAULT_ENTITLEMENT_TOGGLES}
        aiModelAssignments={{}}
        setAiModelAssignments={vi.fn()}
        functionAssignmentMap={{}}
        availableAiModels={[]}
        creditUnitPrice={200}
        highestActiveUserPlanEntitlement={overrides.highestActiveUserPlanEntitlement ?? null}
        onSubmit={vi.fn()}
        onValidationError={onValidationError}
      />
    );
  }

  return {
    onValidationError,
    ...render(<Wrapper />),
  };
}

async function flushCatalogLoad() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('PlanFormWizard', () => {
  it('shows level selection for workspace plans without requiring user-only entitlement limits', async () => {
    renderWizard();
    await flushCatalogLoad();

    expect(screen.getByText('Level')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    expect(screen.getByText('Entitlements and limits')).toBeInTheDocument();
    expect(screen.queryByText(/Max individual workspace/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Max material \/ workspace/i)).not.toBeInTheDocument();
  });

  it('separates material features and renders action names without enum keys', async () => {
    renderStatefulWizard();
    await flushCatalogLoad();

    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    expect(screen.getByText('Advanced AI')).toBeInTheDocument();
    expect(screen.getByText('Material')).toBeInTheDocument();
    expect(screen.getAllByText('Create roadmap').length).toBeGreaterThan(0);
    expect(screen.getByText('Suggest Learning Resources')).toBeInTheDocument();
    expect(screen.queryByText('SUGGEST_LEARNING_RESOURCES')).not.toBeInTheDocument();
    expect(screen.queryByText(/GENERATE_ROADMAP_PHASES/)).not.toBeInTheDocument();
  });

  it('defaults included credits to 0 for level 0 plans and allows moving past entitlement validation', async () => {
    const { onValidationError } = renderStatefulWizard();
    await flushCatalogLoad();

    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    const creditsField = screen.getByText(/Included credits\s*\*/i).closest('div');
    const creditsInput = within(creditsField).getByRole('spinbutton');
    expect(creditsInput).toHaveValue(0);
    expect(creditsInput).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    expect(onValidationError).not.toHaveBeenCalled();
    expect(screen.getByText('AI models by action')).toBeInTheDocument();
  });

  it('does not apply inherited group entitlements for level 0 workspace plans', async () => {
    renderStatefulWizard({
      formData: {
        planScope: 'WORKSPACE',
        planLevel: '0',
      },
      entitlement: {
        canProcessPdf: false,
      },
      highestActiveUserPlanEntitlement: {
        canProcessPdf: true,
      },
    });
    await flushCatalogLoad();

    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    expect(screen.queryByText(/Gói group tự động kế thừa toàn bộ quyền lợi/i)).not.toBeInTheDocument();

    const pdfSwitch = screen.getByRole('switch', { name: /pdf/i });
    expect(pdfSwitch).not.toBeDisabled();
  });

  it('keeps inherited group entitlements locked for workspace plans above level 0', async () => {
    renderStatefulWizard({
      formData: {
        planScope: 'WORKSPACE',
        planLevel: '1',
      },
      entitlement: {
        canProcessPdf: false,
      },
      highestActiveUserPlanEntitlement: {
        canProcessPdf: true,
      },
    });
    await flushCatalogLoad();

    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    expect(screen.getByText(/Gói group tự động kế thừa toàn bộ quyền lợi/i)).toBeInTheDocument();

    const pdfSwitch = screen.getByRole('switch', { name: /pdf/i });
    expect(pdfSwitch).toBeDisabled();
  });
});

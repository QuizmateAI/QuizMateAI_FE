// Stack toàn bộ dialog/modal phụ thuộc state của GroupWorkspacePage. Tách
// khỏi page để page chỉ còn route + section dispatch, dễ đọc hơn. Dialog
// nào lazy-loaded vẫn giữ React.Suspense bao ngoài.

import React from 'react';
import WorkspaceOnboardingUpdateGuardDialog from '@/components/features/workspace/WorkspaceOnboardingUpdateGuardDialog';
import PlanUpgradeModal from '@/components/plan/PlanUpgradeModal';
import GroupWorkspaceCreditGateModal from './GroupWorkspaceCreditGateModal';

const LazyUploadSourceDialog = React.lazy(() => import('./UploadSourceDialog'));
const LazyRoadmapPhaseGenerateDialog = React.lazy(() => import('./RoadmapPhaseGenerateDialog'));
const LazyInviteMemberDialog = React.lazy(() => import('../group-leader/InviteMemberDialog'));
const LazyGroupWorkspaceProfileConfigDialog = React.lazy(() => import('./GroupWorkspaceProfileConfigDialog'));
const LazyRoadmapConfigEditDialog = React.lazy(() => import('@/components/features/workspace/RoadmapConfigEditDialog'));
const LazyRoadmapConfigSummaryDialog = React.lazy(() => import('@/components/features/workspace/RoadmapConfigSummaryDialog'));

export default function GroupWorkspaceDialogs({
  isDarkMode,
  currentLang,
  // Upload
  uploadDialogOpen,
  setUploadDialogOpen,
  uploadDialogWorkspaceId,
  onUploadFiles,
  onSuggestedImported,
  planEntitlements,
  // Roadmap phase generation
  phaseGenerateDialogOpen,
  setPhaseGenerateDialogOpen,
  phaseGenerateDialogSources,
  phaseGenerateDialogDefaultIds,
  isSubmittingRoadmapPhaseRequest,
  onSubmitRoadmapPhaseDialog,
  // Invite member
  inviteDialogOpen,
  setInviteDialogOpen,
  onInvite,
  memberSeatSummary,
  // Profile config
  profileConfigOpen,
  shouldForceProfileSetup,
  onProfileConfigChange,
  profileConfigWorkspaceId,
  onProfileConfigTemporaryClose,
  onProfileConfigComplete,
  // Profile-update guard
  profileUpdateGuardOpen,
  setProfileUpdateGuardOpen,
  materialCountForGroupProfile,
  groupHasLearningData,
  onDeleteMaterialsForGroupProfileUpdate,
  isResettingWorkspaceForProfileUpdate,
  // Credit gate
  groupBuyCreditModalOpen,
  setGroupBuyCreditModalOpen,
  onGroupBuyCreditPrimary,
  // Plan upgrade
  planUpgradeModalOpen,
  setPlanUpgradeModalOpen,
  planUpgradeFeatureName,
  groupPlanUpgradePath,
  groupPlanUpgradeState,
  // Roadmap config edit / view
  roadmapConfigEditOpen,
  setRoadmapConfigEditOpen,
  roadmapConfigInitialValues,
  roadmapConfigDialogMode,
  hasExistingRoadmap,
  onSaveRoadmapConfig,
  onSuggestRoadmapConfig,
  roadmapConfigViewOpen,
  setRoadmapConfigViewOpen,
  effectiveGroupRoadmapConfig,
}) {
  return (
    <>
      {uploadDialogOpen ? (
        <React.Suspense fallback={null}>
          <LazyUploadSourceDialog
            open={uploadDialogOpen}
            onOpenChange={setUploadDialogOpen}
            isDarkMode={isDarkMode}
            onUploadFiles={onUploadFiles}
            workspaceId={uploadDialogWorkspaceId}
            onSuggestedImported={onSuggestedImported}
            planEntitlements={planEntitlements}
          />
        </React.Suspense>
      ) : null}

      {phaseGenerateDialogOpen ? (
        <React.Suspense fallback={null}>
          <LazyRoadmapPhaseGenerateDialog
            open={phaseGenerateDialogOpen}
            onOpenChange={setPhaseGenerateDialogOpen}
            isDarkMode={isDarkMode}
            materials={phaseGenerateDialogSources}
            defaultSelectedMaterialIds={phaseGenerateDialogDefaultIds}
            submitting={isSubmittingRoadmapPhaseRequest}
            onSubmit={onSubmitRoadmapPhaseDialog}
          />
        </React.Suspense>
      ) : null}

      {inviteDialogOpen ? (
        <React.Suspense fallback={null}>
          <LazyInviteMemberDialog
            open={inviteDialogOpen}
            onOpenChange={setInviteDialogOpen}
            onInvite={onInvite}
            isDarkMode={isDarkMode}
            memberSeatLimit={memberSeatSummary?.limit}
            memberSeatUsage={memberSeatSummary?.usedCount}
            memberSeatRemaining={memberSeatSummary?.remainingCount}
            isMemberSeatLimitReached={memberSeatSummary?.isAtLimit}
          />
        </React.Suspense>
      ) : null}

      {(profileConfigOpen || shouldForceProfileSetup) ? (
        <React.Suspense fallback={null}>
          <LazyGroupWorkspaceProfileConfigDialog
            open={profileConfigOpen}
            onOpenChange={onProfileConfigChange}
            isDarkMode={isDarkMode}
            workspaceId={profileConfigWorkspaceId}
            canClose={!shouldForceProfileSetup}
            onTemporaryClose={shouldForceProfileSetup ? onProfileConfigTemporaryClose : undefined}
            onComplete={onProfileConfigComplete}
          />
        </React.Suspense>
      ) : null}

      <WorkspaceOnboardingUpdateGuardDialog
        open={profileUpdateGuardOpen}
        onOpenChange={setProfileUpdateGuardOpen}
        isDarkMode={isDarkMode}
        currentLang={currentLang?.startsWith('en') ? 'en' : 'vi'}
        materialCount={materialCountForGroupProfile}
        hasLearningData={groupHasLearningData}
        onDeleteAndContinue={onDeleteMaterialsForGroupProfileUpdate}
        deleting={isResettingWorkspaceForProfileUpdate}
      />

      <GroupWorkspaceCreditGateModal
        open={groupBuyCreditModalOpen}
        onOpenChange={setGroupBuyCreditModalOpen}
        isDarkMode={isDarkMode}
        lang={currentLang}
        onPrimary={onGroupBuyCreditPrimary}
      />

      <PlanUpgradeModal
        open={planUpgradeModalOpen}
        onOpenChange={setPlanUpgradeModalOpen}
        featureName={planUpgradeFeatureName}
        isDarkMode={isDarkMode}
        upgradePath={groupPlanUpgradePath}
        upgradeState={groupPlanUpgradeState}
      />

      <React.Suspense fallback={null}>
        <LazyRoadmapConfigEditDialog
          open={roadmapConfigEditOpen}
          onOpenChange={setRoadmapConfigEditOpen}
          isDarkMode={isDarkMode}
          initialValues={roadmapConfigInitialValues}
          mode={roadmapConfigDialogMode}
          hasExistingRoadmap={hasExistingRoadmap}
          onSave={onSaveRoadmapConfig}
          onSuggest={onSuggestRoadmapConfig}
        />
      </React.Suspense>

      <React.Suspense fallback={null}>
        <LazyRoadmapConfigSummaryDialog
          open={roadmapConfigViewOpen}
          onOpenChange={setRoadmapConfigViewOpen}
          isDarkMode={isDarkMode}
          values={effectiveGroupRoadmapConfig}
        />
      </React.Suspense>
    </>
  );
}

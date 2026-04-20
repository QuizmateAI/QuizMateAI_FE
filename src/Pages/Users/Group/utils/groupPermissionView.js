export function resolveGroupUiPermissions({
  myGroupPermissions,
  fallbackCanCreateContent = false,
  fallbackCanUploadSource = false,
  fallbackCanManageMembers = false,
  fallbackCanViewMemberDashboard = false,
  fallbackCanCreateQuiz = fallbackCanCreateContent,
  fallbackCanCreateFlashcard = fallbackCanCreateContent,
  fallbackCanCreateMockTest = fallbackCanCreateContent,
  fallbackCanCreateRoadmap = fallbackCanCreateContent,
  fallbackCanCreateChallenge = fallbackCanCreateContent,
} = {}) {
  const canCreateQuiz = myGroupPermissions?.canCreateQuiz ?? fallbackCanCreateQuiz;
  const canCreateFlashcard = myGroupPermissions?.canCreateFlashcard ?? fallbackCanCreateFlashcard;
  const canCreateMockTest = myGroupPermissions?.canCreateMockTest ?? fallbackCanCreateMockTest;
  const canCreateRoadmap = myGroupPermissions?.canCreateRoadmap ?? fallbackCanCreateRoadmap;
  const canCreateChallenge = myGroupPermissions?.canCreateChallenge ?? fallbackCanCreateChallenge;

  return {
    canCreateQuiz,
    canCreateFlashcard,
    canCreateMockTest,
    canCreateRoadmap,
    canCreateChallenge,
    canCreateContent: myGroupPermissions?.canCreateQuiz ?? fallbackCanCreateContent,
    canUploadSource: myGroupPermissions?.canUpload ?? fallbackCanUploadSource,
    canManageMembers: myGroupPermissions?.canManageMembers ?? fallbackCanManageMembers,
    canViewMemberDashboard: myGroupPermissions?.canViewMemberDashboard ?? fallbackCanViewMemberDashboard,
  };
}

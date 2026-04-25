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
  fallbackCanPublishQuiz = false,
  fallbackCanAssignQuizAudience = false,
} = {}) {
  const canCreateQuiz = myGroupPermissions?.canCreateQuiz ?? fallbackCanCreateQuiz;
  const canCreateFlashcard = myGroupPermissions?.canCreateFlashcard ?? fallbackCanCreateFlashcard;
  const canCreateMockTest = myGroupPermissions?.canCreateMockTest ?? fallbackCanCreateMockTest;
  const canCreateRoadmap = myGroupPermissions?.canCreateRoadmap ?? fallbackCanCreateRoadmap;
  const canCreateChallenge = myGroupPermissions?.canCreateChallenge ?? fallbackCanCreateChallenge;
  const canPublishQuiz = myGroupPermissions?.canPublishQuiz ?? fallbackCanPublishQuiz;
  const canAssignQuizAudience = myGroupPermissions?.canAssignQuizAudience ?? fallbackCanAssignQuizAudience;
  const canCreateContent = canCreateQuiz
    || canCreateFlashcard
    || canCreateMockTest
    || canCreateRoadmap
    || canCreateChallenge;

  return {
    canCreateQuiz,
    canCreateFlashcard,
    canCreateMockTest,
    canCreateRoadmap,
    canCreateChallenge,
    canPublishQuiz,
    canAssignQuizAudience,
    canCreateContent,
    canUploadSource: myGroupPermissions?.canUpload ?? fallbackCanUploadSource,
    canManageMembers: myGroupPermissions?.canManageMembers ?? fallbackCanManageMembers,
    canViewMemberDashboard: myGroupPermissions?.canViewMemberDashboard ?? fallbackCanViewMemberDashboard,
  };
}

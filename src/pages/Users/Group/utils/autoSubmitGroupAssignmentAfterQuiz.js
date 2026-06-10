export async function autoSubmitGroupAssignmentAfterQuiz({
  sourceWorkspaceId,
  groupAssignmentId,
  attemptId,
}) {
  const workspaceId = Number(sourceWorkspaceId);
  const assignmentId = Number(groupAssignmentId);
  const submissionRefId = Number(attemptId);
  if (!Number.isInteger(workspaceId) || workspaceId <= 0) return;
  if (!Number.isInteger(assignmentId) || assignmentId <= 0) return;
  if (!Number.isInteger(submissionRefId) || submissionRefId <= 0) return;

  try {
    const { submitAssignment } = await import('@/api/AssignmentAPI');
    await submitAssignment(workspaceId, assignmentId, { submissionRefId });
  } catch (error) {
    console.error('autoSubmitGroupAssignmentAfterQuiz failed', error);
  }
}

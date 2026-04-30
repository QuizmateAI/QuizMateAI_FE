function normalizePositiveInteger(value) {
  const normalized = Number(value);
  return Number.isInteger(normalized) && normalized > 0 ? normalized : null;
}

function getParticipantId(participant) {
  return normalizePositiveInteger(
    participant?.participantId
    ?? participant?.challengeParticipantId
    ?? participant?.id,
  );
}

function markDetailFinished(detail, participantId) {
  if (!detail || typeof detail !== 'object') return detail;

  let participants = detail.participants;
  if (Array.isArray(detail.participants) && participantId) {
    let participantChanged = false;
    participants = detail.participants.map((participant) => {
      if (getParticipantId(participant) !== participantId) return participant;
      participantChanged = true;
      return { ...participant, status: 'FINISHED' };
    });

    if (!participantChanged) {
      participants = detail.participants;
    }
  }

  return {
    ...detail,
    myParticipantStatus: 'FINISHED',
    participants,
  };
}

function markListFinished(challenges, eventId) {
  if (!Array.isArray(challenges)) return challenges;

  let changed = false;
  const nextChallenges = challenges.map((challenge) => {
    if (normalizePositiveInteger(challenge?.challengeEventId) !== eventId) return challenge;
    changed = true;
    return { ...challenge, myParticipantStatus: 'FINISHED' };
  });

  return changed ? nextChallenges : challenges;
}

function findCachedKeys(queryClient, baseKey, matcher) {
  const queryCache = queryClient?.getQueryCache?.();
  const queries = queryCache?.findAll?.({ queryKey: [baseKey] }) || [];
  return queries
    .map((query) => query.queryKey)
    .filter((queryKey) => Array.isArray(queryKey) && queryKey[0] === baseKey && matcher(queryKey));
}

function invalidateUniqueQueries(queryClient, queryKeys) {
  const seen = new Set();

  queryKeys.forEach((queryKey) => {
    const keyHash = JSON.stringify(queryKey);
    if (seen.has(keyHash)) return;
    seen.add(keyHash);
    void queryClient.invalidateQueries?.({ queryKey });
  });
}

export function markChallengeAttemptFinished(queryClient, challengeContext) {
  const workspaceId = normalizePositiveInteger(challengeContext?.workspaceId);
  const eventId = normalizePositiveInteger(challengeContext?.eventId);
  if (!queryClient || !workspaceId || !eventId) return;

  const participantId = normalizePositiveInteger(challengeContext?.participantId);
  const detailKeys = findCachedKeys(
    queryClient,
    'challenge-detail',
    (queryKey) => normalizePositiveInteger(queryKey[1]) === workspaceId
      && normalizePositiveInteger(queryKey[2]) === eventId,
  );

  const keysToUpdate = detailKeys.length > 0
    ? detailKeys
    : [['challenge-detail', workspaceId, eventId]];

  keysToUpdate.forEach((queryKey) => {
    queryClient.setQueryData(queryKey, (current) => markDetailFinished(current, participantId));
  });

  const listKeys = findCachedKeys(
    queryClient,
    'challenges',
    (queryKey) => normalizePositiveInteger(queryKey[1]) === workspaceId,
  );

  listKeys.forEach((queryKey) => {
    queryClient.setQueryData(queryKey, (current) => markListFinished(current, eventId));
  });

  const relatedChallengeKeys = [
    ...keysToUpdate,
    ...listKeys,
    ...findCachedKeys(
      queryClient,
      'challenge-leaderboard',
      (queryKey) => normalizePositiveInteger(queryKey[1]) === workspaceId
        && normalizePositiveInteger(queryKey[2]) === eventId,
    ),
    ...findCachedKeys(
      queryClient,
      'challenge-dashboard',
      (queryKey) => normalizePositiveInteger(queryKey[1]) === workspaceId
        && normalizePositiveInteger(queryKey[2]) === eventId,
    ),
    ...findCachedKeys(
      queryClient,
      'challenge-teams',
      (queryKey) => normalizePositiveInteger(queryKey[1]) === workspaceId
        && normalizePositiveInteger(queryKey[2]) === eventId,
    ),
    ...findCachedKeys(
      queryClient,
      'challenge-bracket',
      (queryKey) => normalizePositiveInteger(queryKey[1]) === workspaceId
        && normalizePositiveInteger(queryKey[2]) === eventId,
    ),
    ['challenge-detail', workspaceId, eventId],
    ['challenges', workspaceId],
    ['challenge-leaderboard', workspaceId, eventId],
    ['challenge-dashboard', workspaceId, eventId],
    ['challenge-teams', workspaceId, eventId],
    ['challenge-bracket', workspaceId, eventId],
  ];

  invalidateUniqueQueries(queryClient, relatedChallengeKeys);
}

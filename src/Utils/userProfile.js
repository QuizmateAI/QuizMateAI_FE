function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeUserProfile(rawProfile = {}, fallbackProfile = {}) {
  const fullName = normalizeText(
    rawProfile.fullName
    || rawProfile.fullname
    || rawProfile.name
    || rawProfile.displayName
    || fallbackProfile.fullName
    || fallbackProfile.fullname
    || fallbackProfile.name
    || fallbackProfile.displayName
  );

  const username = normalizeText(
    rawProfile.username
    || rawProfile.userName
    || rawProfile.login
    || fallbackProfile.username
    || fallbackProfile.userName
    || fallbackProfile.login
  );

  const email = normalizeText(rawProfile.email || fallbackProfile.email);
  const avatarUrl = normalizeText(
    rawProfile.avatarUrl
    || rawProfile.avatar
    || rawProfile.profilePicture
    || rawProfile.photoURL
    || rawProfile.picture
    || fallbackProfile.avatarUrl
    || fallbackProfile.avatar
    || fallbackProfile.profilePicture
    || fallbackProfile.photoURL
    || fallbackProfile.picture
  );

  return {
    email,
    username,
    fullName: fullName || username || email,
    avatarUrl,
    birthday: rawProfile.birthday || fallbackProfile.birthday || null,
  };
}

export function getUserDisplayName(profile) {
  if (!profile || typeof profile !== 'object') return 'User';

  return normalizeText(profile.fullName || profile.username || profile.email) || 'User';
}

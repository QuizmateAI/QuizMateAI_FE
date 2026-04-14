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

  const preferredLanguage = normalizeText(
    rawProfile.preferredLanguage
    || fallbackProfile.preferredLanguage
  ).toLowerCase() || null;

  const themeMode = normalizeText(
    rawProfile.themeMode
    || fallbackProfile.themeMode
  ).toLowerCase() || null;

  return {
    email,
    username,
    fullName: fullName || username || email,
    avatarUrl,
    birthday: rawProfile.birthday || fallbackProfile.birthday || null,
    preferredLanguage,
    themeMode,
  };
}

export function getUserDisplayName(profile) {
  if (!profile || typeof profile !== 'object') return 'User';

  return normalizeText(profile.fullName || profile.username || profile.email) || 'User';
}

export function getUserDisplayLabel(profile, fallback = 'User') {
  if (!profile || typeof profile !== 'object') return fallback;

  const username = normalizeText(
    profile.username
    || profile.userName
    || profile.authorUserName
    || profile.authorUsername
    || profile.login
  );
  const fullName = normalizeText(
    profile.fullName
    || profile.memberName
    || profile.userFullName
    || profile.authorName
    || profile.name
    || profile.displayName
  );
  const email = normalizeText(profile.email);
  const base = fullName || username || email || fallback;

  if (username && base.toLowerCase() !== username.toLowerCase() && !base.includes(`#${username}`)) {
    return `${base} #${username}`;
  }

  return base;
}

export function getUserDisplayParts(profile, fallback = 'User') {
  if (!profile || typeof profile !== 'object') {
    return { name: fallback, username: '', label: fallback, hasUsernameSuffix: false };
  }

  const username = normalizeText(
    profile.username
    || profile.userName
    || profile.authorUserName
    || profile.authorUsername
    || profile.login
  );
  const fullName = normalizeText(
    profile.fullName
    || profile.memberName
    || profile.userFullName
    || profile.authorName
    || profile.name
    || profile.displayName
  );
  const email = normalizeText(profile.email);
  const name = fullName || username || email || fallback;
  const hasUsernameSuffix = Boolean(username && name.toLowerCase() !== username.toLowerCase());
  const label = hasUsernameSuffix ? `${name} #${username}` : name;

  return { name, username, label, hasUsernameSuffix };
}

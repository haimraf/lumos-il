type ProfileNameSource = {
  full_name?: string | null;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

const GENERIC_NAMES = new Set([
  "wizard",
  "קוסם",
  "\u05e7\u05d5\u05e1\u05de\u05f3",
  "קוסמת",
  "דמות אלמונית בטירה",
]);

function normalizeName(value: string | null | undefined) {
  return value?.trim().toLowerCase() || "";
}

function isGenericName(value: string | null | undefined) {
  return GENERIC_NAMES.has(normalizeName(value));
}

function getUserMetadataName(userMetadata: Record<string, unknown> | null | undefined) {
  const candidateKeys = ["full_name", "name", "preferred_username", "username", "user_name"];

  for (const key of candidateKeys) {
    const rawValue = userMetadata?.[key];
    if (typeof rawValue !== "string") continue;

    const candidate = rawValue.trim();
    if (candidate && !isGenericName(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function needsProfileNameSync(value: string | null | undefined) {
  return !value?.trim() || isGenericName(value);
}

export function getSyncableProfileName(profile: ProfileNameSource | null | undefined) {
  if (!needsProfileNameSync(profile?.full_name)) {
    return null;
  }

  const metadataName = getUserMetadataName(profile?.user_metadata);
  if (metadataName) {
    return metadataName;
  }

  const emailName = profile?.email?.split("@")[0]?.trim();
  if (emailName && !isGenericName(emailName)) {
    return emailName;
  }

  return null;
}

export function getProfileDisplayName(
  profile: ProfileNameSource | null | undefined,
  fallback = "דמות אלמונית בטירה",
) {
  const fullName = profile?.full_name?.trim();
  if (fullName && !isGenericName(fullName)) {
    return fullName;
  }

  const metadataName = getUserMetadataName(profile?.user_metadata);
  if (metadataName) {
    return metadataName;
  }

  const emailName = profile?.email?.split("@")[0]?.trim();
  if (emailName) {
    return emailName;
  }

  return fallback;
}

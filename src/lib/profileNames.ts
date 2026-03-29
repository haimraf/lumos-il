type ProfileNameSource = {
  full_name?: string | null;
  email?: string | null;
};

export function getProfileDisplayName(
  profile: ProfileNameSource | null | undefined,
  fallback = "דמות אלמונית בטירה",
) {
  const fullName = profile?.full_name?.trim();
  if (fullName && fullName.toLowerCase() !== "wizard") {
    return fullName;
  }

  const emailName = profile?.email?.split("@")[0]?.trim();
  if (emailName) {
    return emailName;
  }

  return fallback;
}

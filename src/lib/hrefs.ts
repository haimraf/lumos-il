const INTERNAL_LUMOS_HOSTS = new Set(["lumos-il.co.il", "www.lumos-il.co.il"]);
const SAFE_INTERNAL_HREF_PATTERN = /^\/[A-Za-z0-9\-._~%/?#[\]@!&'()*+,;=:]*$/;

function normalizeRawHref(rawHref: string | null | undefined) {
  return typeof rawHref === "string" ? rawHref.trim() : "";
}

function isAllowedExternalProtocol(protocol: string) {
  return protocol === "http:" || protocol === "https:";
}

export function asSafeInternalHref(rawHref: string | null | undefined): string | null {
  const trimmed = normalizeRawHref(rawHref);
  if (!trimmed) return null;

  if (trimmed.startsWith("//") || trimmed.includes("$") || /\s/.test(trimmed)) {
    return null;
  }

  if (SAFE_INTERNAL_HREF_PATTERN.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    if (!isAllowedExternalProtocol(url.protocol)) return null;
    if (!INTERNAL_LUMOS_HOSTS.has(url.hostname)) return null;

    const internalHref = `${url.pathname}${url.search}${url.hash}`;
    if (
      internalHref.startsWith("//")
      || internalHref.includes("$")
      || !SAFE_INTERNAL_HREF_PATTERN.test(internalHref)
    ) {
      return null;
    }

    return internalHref;
  } catch {
    return null;
  }
}

export function getSafeInternalHref(
  rawHref: string | null | undefined,
  fallback = "/",
) {
  return asSafeInternalHref(rawHref) ?? fallback;
}

export type SafeHref = {
  href: string;
  isExternal: boolean;
};

export function resolveSafeHref(rawHref: string | null | undefined): SafeHref | null {
  const internalHref = asSafeInternalHref(rawHref);
  if (internalHref) {
    return { href: internalHref, isExternal: false };
  }

  const trimmed = normalizeRawHref(rawHref);
  if (!trimmed || /\s/.test(trimmed)) return null;

  try {
    const url = new URL(trimmed);
    if (!isAllowedExternalProtocol(url.protocol)) return null;
    if (url.username || url.password) return null;
    if (INTERNAL_LUMOS_HOSTS.has(url.hostname)) return null;

    return {
      href: url.toString(),
      isExternal: true,
    };
  } catch {
    return null;
  }
}

import { getSupabaseEnv } from "@/lib/env";

function normalizeUrl(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function getAppOrigin() {
  const { siteUrl } = getSupabaseEnv();

  if (siteUrl) {
    return normalizeUrl(siteUrl);
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return null;
}

/** Only allow navigation within this application, including after OAuth. */
export function safeNextPath(value: unknown, fallback = "/dashboard") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\r\n]/.test(value)) return fallback;
  try {
    const url = new URL(value, "https://colorhunt.invalid");
    return url.origin === "https://colorhunt.invalid" ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch { return fallback; }
}

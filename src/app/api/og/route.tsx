import type { NextRequest } from "next/server";
import { buildOgPalette, createOgImageResponse } from "@/lib/og-image";

export const runtime = "nodejs";

function clampText(value: string, fallback: string, maxLength: number) {
  const normalized = value.trim();

  if (!normalized) {
    return fallback;
  }

  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
}

export async function GET(request: NextRequest) {
  const title = clampText(
    request.nextUrl.searchParams.get("title") ?? "",
    "Turn travel into a color game.",
    90,
  );
  const subtitle = clampText(
    request.nextUrl.searchParams.get("subtitle") ?? "",
    "Pick a place, hunt one color, collect nine moments, and generate a poster worth sharing.",
    160,
  );
  const eyebrow = clampText(
    request.nextUrl.searchParams.get("eyebrow") ?? "",
    "Color Hunt",
    40,
  );
  const accent = request.nextUrl.searchParams.get("accent");
  const palette = buildOgPalette(accent);

  return await createOgImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        padding: 44,
        boxSizing: "border-box",
        background: palette.background,
        color: palette.text,
        fontFamily: '"Cormorant Garamond", Georgia, serif',
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          borderRadius: 38,
          border: `1px solid ${palette.border}`,
          background: palette.panel,
          boxShadow: "0 18px 72px rgba(53,37,30,0.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "36px 42px 0",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 22,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: palette.muted,
              fontWeight: 600,
            }}
          >
            {eyebrow}
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                style={{
                  width: 86,
                  height: 86,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 24,
                  background: index === 1 ? palette.accent : "rgba(255,255,255,0.6)",
                  color: index === 1 ? "#fff7ef" : palette.accent,
                  fontSize: 50,
                  fontWeight: 600,
                  boxShadow: "inset 0 0 0 1px rgba(45,34,48,0.06)",
                }}
              >
                {index === 0 ? "○" : index === 1 ? "◠" : "✦"}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
            padding: "0 42px",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              maxWidth: 840,
              fontSize: 112,
              lineHeight: 0.9,
              letterSpacing: "-0.07em",
              color: palette.text,
              fontWeight: 600,
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: "flex",
              maxWidth: 820,
              fontSize: 34,
              lineHeight: 1.18,
              color: palette.muted,
            }}
          >
            {subtitle}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0 42px 34px",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 24,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: palette.muted,
              fontWeight: 600,
            }}
          >
            One place. One color. Nine moments.
          </div>
          <div
            style={{
              display: "flex",
              borderRadius: 999,
              background: palette.accent,
              color: "#fffaf2",
              padding: "14px 22px",
              fontSize: 24,
              fontWeight: 600,
            }}
          >
            colorhunt.quest
          </div>
        </div>
      </div>
    </div>,
  );
}

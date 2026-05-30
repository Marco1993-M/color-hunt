import { notFound } from "next/navigation";
import { getPublicTripBundleByShareId } from "@/lib/data";
import { buildOgPalette, createOgImageResponse } from "@/lib/og-image";
import { getPosterTitleLabel } from "@/lib/poster";

export const alt = "Color Hunt public poster";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

type PosterOgImageProps = {
  params: Promise<{ shareId: string }>;
};

export default async function PosterOgImage({ params }: PosterOgImageProps) {
  const { shareId } = await params;
  const bundle = await getPublicTripBundleByShareId(shareId);

  if (!bundle) {
    notFound();
  }

  const { trip, mission } = bundle;
  const palette = buildOgPalette(mission.color_hex);
  const posterTitle = getPosterTitleLabel(trip.title, trip.location);

  return await createOgImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        padding: 40,
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
          borderRadius: 38,
          background: palette.panel,
          border: `1px solid ${palette.border}`,
          boxShadow: "0 18px 72px rgba(53,37,30,0.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: "58%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "38px 40px",
            boxSizing: "border-box",
            borderRight: `1px solid ${palette.border}`,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
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
              Color Hunt public poster
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 92,
                lineHeight: 0.9,
                letterSpacing: "-0.07em",
                textTransform: "uppercase",
                color: palette.accent,
                fontWeight: 600,
                maxWidth: 560,
              }}
            >
              {posterTitle}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 34,
                lineHeight: 1.14,
                color: palette.muted,
                maxWidth: 520,
              }}
            >
              Hunt {mission.color_name}, collect nine moments, and make a poster worth sharing.
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                display: "flex",
                fontSize: 22,
                letterSpacing: "0.14em",
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
                padding: "14px 20px",
                fontSize: 24,
                fontWeight: 600,
                alignSelf: "flex-start",
              }}
            >
              colorhunt.quest
            </div>
          </div>
        </div>

        <div
          style={{
            width: "42%",
            height: "100%",
            display: "flex",
            padding: 28,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexWrap: "wrap",
              gap: 14,
              justifyContent: "space-between",
              alignContent: "space-between",
            }}
          >
            {Array.from({ length: 9 }).map((_, index) => (
              <div
                key={index}
                style={{
                  width: "30.5%",
                  height: "30.5%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 22,
                  background: index % 2 === 0 ? palette.accent : "rgba(255,255,255,0.84)",
                  color: index % 2 === 0 ? "#fff7ef" : palette.accent,
                  fontSize: 30,
                  fontWeight: 600,
                  boxShadow: "inset 0 0 0 1px rgba(45,34,48,0.06)",
                }}
              >
                {index + 1}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
  );
}

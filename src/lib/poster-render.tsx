import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getPhotoUrl } from "@/lib/data";
import { buildPosterFrameSlots, getPosterLocationLabel, getPosterTripYear } from "@/lib/poster";
import {
  getPosterExportFormat,
  type PosterExportFormatId,
  slugifyPosterFileLabel,
} from "@/lib/poster-export";
import type { Mission, Photo, Trip } from "@/lib/types";

let posterFontsPromise: Promise<{ regular: ArrayBuffer; semibold: ArrayBuffer } | null> | null = null;

function toArrayBuffer(buffer: Buffer<ArrayBufferLike>) {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

async function loadPosterFonts() {
  if (!posterFontsPromise) {
    posterFontsPromise = (async () => {
      try {
        const regular = await readFile(join(process.cwd(), "public", "fonts", "CormorantGaramond-Regular.ttf"));
        const semibold = await readFile(join(process.cwd(), "public", "fonts", "CormorantGaramond-SemiBold.ttf"));

        return {
          regular: toArrayBuffer(regular),
          semibold: toArrayBuffer(semibold),
        };
      } catch {
        return null;
      }
    })();
  }

  return await posterFontsPromise;
}

function getFormatLayout(formatId: PosterExportFormatId) {
  switch (formatId) {
    case "story":
      return {
        canvasPaddingX: 36,
        canvasPaddingY: 44,
        posterPadding: 92,
        titleSize: 220,
        titleLeading: 0.86,
        metaSize: 34,
        kickerSize: 22,
        footerSize: 30,
        gridTopMargin: 62,
        footerTopPadding: 32,
        gap: 22,
        radius: 44,
        gridHeightScale: 0.88,
        tileRadius: 38,
        columns: 2,
      };
    case "square":
      return {
        canvasPaddingX: 30,
        canvasPaddingY: 30,
        posterPadding: 82,
        titleSize: 164,
        titleLeading: 0.88,
        metaSize: 26,
        kickerSize: 18,
        footerSize: 24,
        gridTopMargin: 40,
        footerTopPadding: 28,
        gap: 18,
        radius: 36,
        gridHeightScale: 0.9,
        tileRadius: 30,
        columns: 3,
      };
    default:
      return {
        canvasPaddingX: 18,
        canvasPaddingY: 18,
        posterPadding: 40,
        titleSize: 118,
        titleLeading: 0.9,
        metaSize: 18,
        kickerSize: 12,
        footerSize: 15,
        gridTopMargin: 22,
        footerTopPadding: 18,
        gap: 12,
        radius: 24,
        gridHeightScale: 0.95,
        tileRadius: 18,
        columns: 3,
      };
  }
}

function getPosterImageProxyUrl(origin: string, sourceUrl: string) {
  return `${origin}/api/poster-image?src=${encodeURIComponent(sourceUrl)}`;
}

export function getPosterExportFileName(location: string, formatId: PosterExportFormatId) {
  const format = getPosterExportFormat(formatId);
  return `${slugifyPosterFileLabel(location) || "see-places-differently-poster"}-${format.fileSuffix}.png`;
}

export async function createPosterImageResponse({
  origin,
  trip,
  mission,
  photos,
  formatId,
}: {
  origin: string;
  trip: Trip;
  mission: Mission;
  photos: Photo[];
  formatId: PosterExportFormatId;
}) {
  const format = getPosterExportFormat(formatId);
  const layout = getFormatLayout(format.id);
  const tripYear = getPosterTripYear(trip.created_at, trip.start_date, trip.end_date);
  const posterTone = mission.color_hex;
  const locationLabel = getPosterLocationLabel(trip.location);
  const posterFonts = await loadPosterFonts();
  const photoUrls = buildPosterFrameSlots(photos).map((photo) => {
    return photo ? getPosterImageProxyUrl(origin, getPhotoUrl(photo)) : null;
  });

  const posterWidth = format.width - layout.canvasPaddingX * 2;
  const posterHeight = format.height - layout.canvasPaddingY * 2;
  const contentWidth = posterWidth - layout.posterPadding * 2;
  const titleBlockHeight = Math.round(layout.titleSize * 1.55);
  const metaBlockHeight = layout.metaSize + 48;
  const footerBlockHeight = layout.footerSize + layout.footerTopPadding + 18;
  const availableGridHeight =
    posterHeight - layout.posterPadding * 2 - 22 - titleBlockHeight - metaBlockHeight - layout.gridTopMargin - footerBlockHeight;
  const gridHeight = Math.floor(availableGridHeight * layout.gridHeightScale);
  const photoRows =
    layout.columns === 2
      ? [photoUrls.slice(0, 2), photoUrls.slice(2, 4), photoUrls.slice(4, 6), photoUrls.slice(6, 8), photoUrls.slice(8, 9)]
      : [photoUrls.slice(0, 3), photoUrls.slice(3, 6), photoUrls.slice(6, 9)];
  const tileWidth = Math.floor((contentWidth - layout.gap * (layout.columns - 1)) / layout.columns);
  const rowHeight = Math.floor((gridHeight - layout.gap * (photoRows.length - 1)) / photoRows.length);
  const tileHeight = rowHeight;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "linear-gradient(180deg, #faf4eb 0%, #f3ebdf 100%)",
          padding: `${layout.canvasPaddingY}px ${layout.canvasPaddingX}px`,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            background: "linear-gradient(180deg, rgba(255,252,246,0.99), rgba(247,241,233,0.96))",
            borderRadius: layout.radius,
            border: "1px solid rgba(94,126,152,0.12)",
            boxShadow: "0 18px 60px rgba(52,70,82,0.09)",
            padding: layout.posterPadding,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              width: "100%",
              paddingBottom: 22,
              borderBottom: "1px solid rgba(94,126,152,0.16)",
              color: "rgba(32,26,23,0.72)",
              fontSize: layout.kickerSize,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            Color Hunt
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 22,
              fontSize: layout.titleSize,
              lineHeight: layout.titleLeading,
              letterSpacing: "-0.075em",
              textTransform: "uppercase",
              color: posterTone,
              fontWeight: 600,
            }}
          >
            {locationLabel}
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 26,
              paddingTop: 24,
              borderTop: `1px solid ${posterTone}24`,
              fontSize: layout.metaSize,
              letterSpacing: "0.04em",
              color: "rgba(32,26,23,0.64)",
            }}
          >
            <span style={{ fontWeight: 700, color: "rgba(32,26,23,0.88)" }}>Exploring</span>
            <span style={{ marginLeft: 14 }}>{trip.location}</span>
            <span style={{ marginLeft: 14, fontWeight: 700, color: "rgba(32,26,23,0.52)" }}>{tripYear}</span>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: layout.gap,
              marginTop: layout.gridTopMargin,
              width: "100%",
              height: gridHeight,
            }}
          >
            {photoRows.map((rowPhotos, rowIndex) => (
              <div
                key={`row-${rowIndex}`}
                style={{
                  display: "flex",
                  gap: layout.gap,
                  width: "100%",
                  height: tileHeight,
                  justifyContent: rowPhotos.length === 1 ? "center" : "flex-start",
                }}
              >
                {rowPhotos.map((source, columnIndex) => (
                  <div
                    key={`${source ?? "empty"}-${rowIndex}-${columnIndex}`}
                    style={{
                      width: rowPhotos.length === 1 ? contentWidth : tileWidth,
                      height: tileHeight,
                      display: "flex",
                      overflow: "hidden",
                      borderRadius: layout.tileRadius,
                      background: "rgba(255,255,255,0.52)",
                      border: "1px solid rgba(137,171,191,0.18)",
                      boxShadow: "0 10px 24px rgba(52,70,82,0.08)",
                    }}
                  >
                    {source ? (
                      <img
                        src={source}
                        alt={`Poster photo ${rowIndex * 3 + columnIndex + 1}`}
                        style={{
                          display: "flex",
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          borderRadius: layout.tileRadius,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "rgba(32,26,23,0.42)",
                          fontSize: 22,
                        }}
                      >
                        Open frame
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              width: "100%",
              justifyContent: "center",
              paddingTop: layout.footerTopPadding,
              marginTop: "auto",
              borderTop: "1px solid rgba(94,126,152,0.14)",
              color: "rgba(74,116,148,0.76)",
              fontSize: layout.footerSize,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              textAlign: "center",
            }}
          >
            colorhunt.quest
          </div>
        </div>
      </div>
    ),
    {
      width: format.width,
      height: format.height,
      fonts: posterFonts
        ? [
            {
              name: "Cormorant Garamond",
              data: posterFonts.regular,
              style: "normal",
              weight: 400,
            },
            {
              name: "Cormorant Garamond",
              data: posterFonts.semibold,
              style: "normal",
              weight: 600,
            },
          ]
        : undefined,
    },
  );
}

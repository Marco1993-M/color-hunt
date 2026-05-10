import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
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
        titleSize: 210,
        titleLeading: 0.89,
        metaSize: 35,
        kickerSize: 21,
        footerSize: 24,
        gridTopMargin: 72,
        footerTopPadding: 40,
        gap: 12,
        radius: 4,
        gridHeightScale: 1,
        tileRadius: 2,
        columns: 3,
        tileAspectRatio: 5 / 4,
      };
    case "square":
      return {
        canvasPaddingX: 30,
        canvasPaddingY: 30,
        posterPadding: 82,
        titleSize: 156,
        titleLeading: 0.9,
        metaSize: 27,
        kickerSize: 17,
        footerSize: 19,
        gridTopMargin: 48,
        footerTopPadding: 34,
        gap: 20,
        radius: 4,
        gridHeightScale: 0.9,
        tileRadius: 2,
        columns: 3,
        tileAspectRatio: 1,
      };
    default:
      return {
        canvasPaddingX: 18,
        canvasPaddingY: 18,
        posterPadding: 40,
        titleSize: 118,
        titleLeading: 0.92,
        metaSize: 20,
        kickerSize: 12,
        footerSize: 13,
        gridTopMargin: 28,
        footerTopPadding: 24,
        gap: 16,
        radius: 3,
        gridHeightScale: 0.95,
        tileRadius: 1,
        columns: 3,
        tileAspectRatio: 1,
      };
  }
}

function getPhotoRows(photoUrls: Array<string | null>, columns: number) {
  return Array.from({ length: 3 }, (_, rowIndex) => photoUrls.slice(rowIndex * columns, rowIndex * columns + columns));
}

function getPosterGridMetrics({
  formatId,
  contentWidth,
  availableGridHeight,
  gap,
  columns,
}: {
  formatId: PosterExportFormatId;
  contentWidth: number;
  availableGridHeight: number;
  gap: number;
  columns: number;
}) {
  const tileWidth = Math.floor((contentWidth - gap * (columns - 1)) / columns);

  if (formatId === "story") {
    const maxTileHeight = Math.floor((availableGridHeight - gap * 2) / 3);
    const tileHeight = Math.min(Math.floor(tileWidth * (5 / 4)), maxTileHeight);
    const gridHeight = tileHeight * 3 + gap * 2;

    return {
      columns,
      tileWidth,
      tileHeight,
      gridHeight: Math.min(gridHeight, availableGridHeight),
    };
  }

  const rowHeight = Math.floor((availableGridHeight - gap * 2) / 3);

  return {
    columns,
    tileWidth,
    tileHeight: rowHeight,
    gridHeight: Math.floor(availableGridHeight),
  };
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toBase64(data: ArrayBuffer) {
  return Buffer.from(data).toString("base64");
}

function hexToRgbChannels(hex: string) {
  const normalized = hex.replace("#", "");
  const source = normalized.length === 3 ? normalized.split("").map((value) => value + value).join("") : normalized;
  const parsed = Number.parseInt(source, 16);

  if (Number.isNaN(parsed)) {
    return { r: 90, g: 120, b: 150 };
  }

  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255,
  };
}

function withAlpha(hex: string, alpha: number) {
  const { r, g, b } = hexToRgbChannels(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function wrapPosterTitle(title: string, formatId: PosterExportFormatId) {
  const words = title.trim().split(/\s+/).filter(Boolean);

  if (words.length <= 1) {
    return words;
  }

  const maxLineLength = formatId === "story" ? 11 : formatId === "square" ? 13 : 15;
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (nextLine.length <= maxLineLength || currentLine.length === 0) {
      currentLine = nextLine;
      continue;
    }

    lines.push(currentLine);
    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  if (lines.length <= 2) {
    return lines;
  }

  return [lines[0], lines.slice(1).join(" ")];
}

function getPosterSvgText({
  trip,
  mission,
  formatId,
}: {
  trip: Trip;
  mission: Mission;
  formatId: PosterExportFormatId;
}) {
  const format = getPosterExportFormat(formatId);
  const layout = getFormatLayout(format.id);
  const tripYear = getPosterTripYear(trip.created_at, trip.start_date, trip.end_date);
  const locationLabel = getPosterLocationLabel(trip.location);
  const titleLines = wrapPosterTitle(locationLabel, formatId);
  const posterTone = mission.color_hex;
  const titleLineHeight = Math.round(layout.titleSize * layout.titleLeading);
  const titleBaseY = layout.posterPadding + 96;
  const titleMarkup = titleLines
    .map((line, index) => {
      const y = titleBaseY + index * titleLineHeight;
      return `<text x="${layout.posterPadding}" y="${y}" font-size="${layout.titleSize}" font-weight="600" letter-spacing="-6" fill="${posterTone}">${escapeXml(line.toUpperCase())}</text>`;
    })
    .join("");
  const metaY = titleBaseY + titleLines.length * titleLineHeight + 54;
  const metaDividerOffset = formatId === "story" ? 34 : 18;
  const footerY = format.height - layout.canvasPaddingY - layout.posterPadding + 4;
  const regularFontFace = `@font-face { font-family: 'PosterCormorant'; src: url(data:font/ttf;base64,__REGULAR__); font-weight: 400; font-style: normal; }`;
  const semiboldFontFace = `@font-face { font-family: 'PosterCormorant'; src: url(data:font/ttf;base64,__SEMIBOLD__); font-weight: 600; font-style: normal; }`;

  return {
    layout,
    svg: `
      <svg width="${format.width}" height="${format.height}" viewBox="0 0 ${format.width} ${format.height}" xmlns="http://www.w3.org/2000/svg">
        <style>
          ${regularFontFace}
          ${semiboldFontFace}
          .poster-serif { font-family: 'PosterCormorant', Georgia, serif; }
        </style>
        <rect width="${format.width}" height="${format.height}" fill="#faf6ef" />
        <rect
          x="${layout.canvasPaddingX}"
          y="${layout.canvasPaddingY}"
          width="${format.width - layout.canvasPaddingX * 2}"
          height="${format.height - layout.canvasPaddingY * 2}"
          rx="${layout.radius}"
          fill="#fbf9f4"
          stroke="rgba(94,126,152,0.12)"
          stroke-width="1"
        />
        <line
          x1="${layout.canvasPaddingX + layout.posterPadding}"
          y1="${layout.canvasPaddingY + 64}"
          x2="${format.width - layout.canvasPaddingX - layout.posterPadding}"
          y2="${layout.canvasPaddingY + 64}"
          stroke="rgba(94,126,152,0.14)"
          stroke-width="1"
        />
        <text
          class="poster-serif"
          x="${layout.canvasPaddingX + layout.posterPadding}"
          y="${layout.canvasPaddingY + 48}"
          font-size="${layout.kickerSize}"
          font-weight="600"
          letter-spacing="3.5"
          fill="rgba(32,26,23,0.6)"
        >COLOR HUNT</text>
        <g class="poster-serif" transform="translate(${layout.canvasPaddingX}, ${layout.canvasPaddingY})">
          ${titleMarkup}
          <line
            x1="${layout.posterPadding}"
            y1="${metaY - metaDividerOffset}"
            x2="${format.width - layout.canvasPaddingX * 2 - layout.posterPadding}"
            y2="${metaY - metaDividerOffset}"
            stroke="${withAlpha(posterTone, 0.16)}"
            stroke-width="1"
          />
          <text x="${layout.posterPadding}" y="${metaY}" font-size="${layout.metaSize}" fill="rgba(32,26,23,0.84)" font-weight="600">
            ${escapeXml("Exploring")}
          </text>
          <text x="${layout.posterPadding + 148}" y="${metaY}" font-size="${layout.metaSize}" fill="rgba(32,26,23,0.58)">
            ${escapeXml(trip.location)}
          </text>
          <text x="${layout.posterPadding + 148 + Math.max(trip.location.length, 10) * layout.metaSize * 0.48 + 28}" y="${metaY}" font-size="${layout.metaSize}" fill="rgba(32,26,23,0.46)" font-weight="600">
            ${escapeXml(tripYear)}
          </text>
        </g>
        <line
          x1="${layout.canvasPaddingX + layout.posterPadding}"
          y1="${format.height - layout.canvasPaddingY - 48}"
          x2="${format.width - layout.canvasPaddingX - layout.posterPadding}"
          y2="${format.height - layout.canvasPaddingY - 48}"
          stroke="rgba(94,126,152,0.12)"
          stroke-width="1"
        />
        <text
          class="poster-serif"
          x="${format.width / 2}"
          y="${footerY}"
          text-anchor="middle"
          font-size="${layout.footerSize}"
          font-weight="600"
          letter-spacing="3.5"
          fill="rgba(74,116,148,0.56)"
        >COLORHUNT.QUEST</text>
      </svg>
    `,
  };
}

async function fetchPosterSourceBuffer(sourceUrl: string) {
  const response = await fetch(sourceUrl, { cache: "force-cache" });

  if (!response.ok) {
    throw new Error(`Poster source image fetch failed with status ${response.status}.`);
  }

  return Buffer.from(await response.arrayBuffer());
}

function buildRoundedMask(width: number, height: number, radius: number) {
  return Buffer.from(
    `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="white" />
    </svg>`,
  );
}

export async function renderPosterPngBuffer({
  trip,
  mission,
  photos,
  formatId,
}: {
  trip: Trip;
  mission: Mission;
  photos: Photo[];
  formatId: PosterExportFormatId;
}) {
  const format = getPosterExportFormat(formatId);
  const { layout, svg } = getPosterSvgText({ trip, mission, formatId });
  const posterFonts = await loadPosterFonts();
  const baseSvg =
    posterFonts == null
      ? svg.replace(/@font-face[^}]+}/g, "")
      : svg
          .replace("__REGULAR__", toBase64(posterFonts.regular))
          .replace("__SEMIBOLD__", toBase64(posterFonts.semibold));
  const photoUrls = buildPosterFrameSlots(photos).map((photo) => (photo ? getPhotoUrl(photo) : null));
  const titleLines = wrapPosterTitle(getPosterLocationLabel(trip.location), formatId);
  const posterWidth = format.width - layout.canvasPaddingX * 2;
  const posterHeight = format.height - layout.canvasPaddingY * 2;
  const contentWidth = posterWidth - layout.posterPadding * 2;
  const titleLineHeight = Math.round(layout.titleSize * layout.titleLeading);
  const titleBlockHeight =
    Math.round(layout.titleSize + Math.max(0, titleLines.length - 1) * titleLineHeight) +
    (formatId === "story" ? 18 : 12);
  const metaBlockHeight = layout.metaSize + 52;
  const footerBlockHeight = layout.footerSize + layout.footerTopPadding + 18;
  const availableGridHeight =
    posterHeight - layout.posterPadding * 2 - 22 - titleBlockHeight - metaBlockHeight - layout.gridTopMargin - footerBlockHeight;
  const { columns, tileWidth, tileHeight, gridHeight } = getPosterGridMetrics({
    formatId,
    contentWidth,
    availableGridHeight: Math.floor(availableGridHeight * layout.gridHeightScale),
    gap: layout.gap,
    columns: layout.columns,
  });
  const photoRows = getPhotoRows(photoUrls, columns);
  const gridStartX = layout.canvasPaddingX + layout.posterPadding;
  const gridStartY = layout.canvasPaddingY + layout.posterPadding + titleBlockHeight + metaBlockHeight + layout.gridTopMargin;
  const tileMaskCache = new Map<string, Buffer>();

  const imageComposites = await Promise.all(
    photoRows.flatMap((rowPhotos, rowIndex) =>
      rowPhotos.map(async (source, columnIndex) => {
        const width = rowPhotos.length === 1 ? contentWidth : tileWidth;
        const left =
          rowPhotos.length === 1
            ? gridStartX
            : gridStartX + columnIndex * (tileWidth + layout.gap);
        const top = gridStartY + rowIndex * (tileHeight + layout.gap);

        if (!source) {
          return {
            input: Buffer.from(
              `<svg width="${width}" height="${tileHeight}" viewBox="0 0 ${width} ${tileHeight}" xmlns="http://www.w3.org/2000/svg">
                <rect width="${width}" height="${tileHeight}" rx="${layout.tileRadius}" fill="rgba(255,255,255,0.42)" stroke="rgba(137,171,191,0.12)" />
              </svg>`,
            ),
            left,
            top,
          };
        }

        const sourceBuffer = await fetchPosterSourceBuffer(source);
        const maskKey = `${width}x${tileHeight}x${layout.tileRadius}`;
        const mask =
          tileMaskCache.get(maskKey) ?? buildRoundedMask(width, tileHeight, layout.tileRadius);

        if (!tileMaskCache.has(maskKey)) {
          tileMaskCache.set(maskKey, mask);
        }

        const imageBuffer = await sharp(sourceBuffer)
          .resize(width, tileHeight, {
            fit: "cover",
            position: "attention",
          })
          .composite([{ input: mask, blend: "dest-in" }])
          .png()
          .toBuffer();

        return {
          input: imageBuffer,
          left,
          top,
        };
      }),
    ),
  );

  return await sharp({
    create: {
      width: format.width,
      height: format.height,
      channels: 4,
      background: "#faf6ef",
    },
  })
    .composite([{ input: Buffer.from(baseSvg), left: 0, top: 0 }, ...imageComposites])
    .png()
    .toBuffer();
}

export function getPosterExportFileName(location: string, formatId: PosterExportFormatId) {
  const format = getPosterExportFormat(formatId);
  return `${slugifyPosterFileLabel(location) || "see-places-differently-poster"}-${format.fileSuffix}.png`;
}

export async function createPosterImageResponse({
  trip,
  mission,
  photos,
  formatId,
}: {
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
  const photoUrls = buildPosterFrameSlots(photos).map((photo) => (photo ? getPhotoUrl(photo) : null));
  const titleLines = wrapPosterTitle(locationLabel, formatId);

  const posterWidth = format.width - layout.canvasPaddingX * 2;
  const posterHeight = format.height - layout.canvasPaddingY * 2;
  const contentWidth = posterWidth - layout.posterPadding * 2;
  const titleLineHeight = Math.round(layout.titleSize * layout.titleLeading);
  const titleBlockHeight =
    Math.round(layout.titleSize + Math.max(0, titleLines.length - 1) * titleLineHeight) +
    (formatId === "story" ? 18 : 12);
  const metaBlockHeight = layout.metaSize + 48;
  const footerBlockHeight = layout.footerSize + layout.footerTopPadding + 18;
  const availableGridHeight =
    posterHeight - layout.posterPadding * 2 - 22 - titleBlockHeight - metaBlockHeight - layout.gridTopMargin - footerBlockHeight;
  const { columns, tileWidth, tileHeight, gridHeight } = getPosterGridMetrics({
    formatId,
    contentWidth,
    availableGridHeight: Math.floor(availableGridHeight * layout.gridHeightScale),
    gap: layout.gap,
    columns: layout.columns,
  });
  const photoRows = getPhotoRows(photoUrls, columns);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "linear-gradient(180deg, #faf6ef 0%, #f1e7db 100%)",
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
            background: "linear-gradient(180deg, rgba(255,253,249,0.99), rgba(246,240,233,0.97))",
            borderRadius: layout.radius,
            border: "1px solid rgba(94,126,152,0.1)",
            boxShadow: "0 12px 34px rgba(52,70,82,0.06)",
            padding: layout.posterPadding,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              width: "100%",
              paddingBottom: 24,
              borderBottom: "1px solid rgba(94,126,152,0.12)",
              color: "rgba(32,26,23,0.6)",
              fontSize: layout.kickerSize,
              fontWeight: 600,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            Color Hunt
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: layout.titleSize,
              lineHeight: layout.titleLeading,
              letterSpacing: "-0.065em",
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
              marginTop: 30,
              paddingTop: 24,
              borderTop: `1px solid ${posterTone}18`,
              fontSize: layout.metaSize,
              letterSpacing: "0.08em",
              color: "rgba(32,26,23,0.56)",
            }}
          >
            <span style={{ fontWeight: 600, color: "rgba(32,26,23,0.82)" }}>Exploring</span>
            <span style={{ marginLeft: 14 }}>{trip.location}</span>
            <span style={{ marginLeft: 14, fontWeight: 600, color: "rgba(32,26,23,0.46)" }}>{tripYear}</span>
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
                      background: "rgba(255,255,255,0.42)",
                      border: "1px solid rgba(137,171,191,0.12)",
                      boxShadow: "0 6px 14px rgba(52,70,82,0.04)",
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
              borderTop: "1px solid rgba(94,126,152,0.1)",
              color: "rgba(74,116,148,0.56)",
              fontSize: layout.footerSize,
              fontWeight: 600,
              letterSpacing: "0.14em",
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

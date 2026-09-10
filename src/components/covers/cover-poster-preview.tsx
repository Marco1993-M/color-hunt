import Image from "next/image";
import { PurpleGlyphTitle } from "@/components/covers/purple-glyph-title";
import { getCoverGridColumns, getCoverTemplate } from "@/lib/covers";
import { getPhotoUrl } from "@/lib/photo-url";
import { getPosterPhotoPlacement } from "@/lib/poster";
import { getPhotoFilterClassName } from "@/lib/photo-filter";
import type { Photo } from "@/lib/types";

type CoverPosterPreviewProps = {
  id?: string;
  templateId: string | null | undefined;
  photos: Array<Photo | null>;
  title?: string | null;
  titleStyle?: "default" | "purple" | "purple-stacked" | null;
};

export function CoverPosterPreview({ id, templateId, photos, title = null, titleStyle = "default" }: CoverPosterPreviewProps) {
  const template = getCoverTemplate(templateId);
  const photoCount = Math.max(template.photoCount, photos.length);
  const previewPhotos = Array.from({ length: photoCount }, (_, index) => {
    const directPhoto = photos[index] ?? null;
    const sortedPhoto = photos.find((photo) => photo?.sort_order === index) ?? null;
    return sortedPhoto ?? directPhoto;
  });

  return (
    <div id={id} className="cover-preview-shell">
      <div className="cover-preview-grid" style={{ gridTemplateColumns: `repeat(${getCoverGridColumns(photoCount)}, minmax(0, 1fr))` }}>
        {previewPhotos.map((photo, index) => (
          <div key={`cover-photo-${index}`} className={`cover-preview-cell ${getPhotoFilterClassName(template.id === "wild-memory-87" ? "wild-memory-87" : photo?.photo_filter)}`}>
            {photo ? (() => {
              const placement = getPosterPhotoPlacement(photo);
              const isWildMemory = template.id === "wild-memory-87" || photo.photo_filter === "wild-memory-87";
              const imageStyle = { objectPosition: `${placement.focalX * 100}% ${placement.focalY * 100}%`, transform: `scale(${placement.zoom})`, transformOrigin: `${placement.focalX * 100}% ${placement.focalY * 100}%` };
              return <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={getPhotoUrl(photo)} alt={`Cover photo ${index + 1}`} className={getPhotoFilterClassName(isWildMemory ? "wild-memory-87" : "none")} crossOrigin="anonymous" loading="eager" decoding="async" style={imageStyle} />
                {isWildMemory ? <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={getPhotoUrl(photo)} alt="" aria-hidden="true" className="photo-filter-channel photo-filter-channel-red" style={{ ...imageStyle, transform: `translateX(-3px) scale(${placement.zoom})` }} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={getPhotoUrl(photo)} alt="" aria-hidden="true" className="photo-filter-channel photo-filter-channel-blue" style={{ ...imageStyle, transform: `translateX(3px) scale(${placement.zoom})` }} />
                </> : null}
              </>;
            })() : (
              <div className="cover-preview-placeholder">
                <span>Photo {index + 1}</span>
              </div>
            )}
          </div>
        ))}
      </div>
      {template.overlaySrc ? (
        <Image src={template.overlaySrc} alt="" fill className="cover-preview-overlay" sizes="(min-width: 1024px) 680px, 100vw" />
      ) : null}
      {template.isCustomTitle && (titleStyle === "purple" || titleStyle === "purple-stacked") ? <PurpleGlyphTitle title={title} stacked={titleStyle === "purple-stacked"} /> : null}
    </div>
  );
}

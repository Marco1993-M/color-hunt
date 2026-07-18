import Image from "next/image";
import { getCoverGridColumns, getCoverTemplate } from "@/lib/covers";
import { getPhotoUrl } from "@/lib/photo-url";
import { getPosterPhotoPlacement } from "@/lib/poster";
import type { Photo } from "@/lib/types";

type CoverPosterPreviewProps = {
  id?: string;
  templateId: string | null | undefined;
  photos: Array<Photo | null>;
  title?: string | null;
};

export function CoverPosterPreview({ id, templateId, photos, title = null }: CoverPosterPreviewProps) {
  const template = getCoverTemplate(templateId);
  const photoCount = Math.max(template.photoCount, photos.length);
  const previewPhotos = Array.from({ length: photoCount }, (_, index) => {
    const directPhoto = photos[index] ?? null;
    const sortedPhoto = photos.find((photo) => photo?.sort_order === index) ?? null;
    return sortedPhoto ?? directPhoto;
  });
  void title;

  return (
    <div id={id} className="cover-preview-shell">
      <div className="cover-preview-grid" style={{ gridTemplateColumns: `repeat(${getCoverGridColumns(photoCount)}, minmax(0, 1fr))` }}>
        {previewPhotos.map((photo, index) => (
          <div key={`cover-photo-${index}`} className="cover-preview-cell">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getPhotoUrl(photo)}
                alt={`Cover photo ${index + 1}`}
                crossOrigin="anonymous"
                loading="eager"
                decoding="async"
                style={{
                  objectPosition: `${getPosterPhotoPlacement(photo).focalX * 100}% ${getPosterPhotoPlacement(photo).focalY * 100}%`,
                  transform: `scale(${getPosterPhotoPlacement(photo).zoom})`,
                  transformOrigin: `${getPosterPhotoPlacement(photo).focalX * 100}% ${getPosterPhotoPlacement(photo).focalY * 100}%`,
                }}
              />
            ) : (
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
    </div>
  );
}

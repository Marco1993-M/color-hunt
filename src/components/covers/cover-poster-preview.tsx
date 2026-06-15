import Image from "next/image";
import { getCoverTemplate } from "@/lib/covers";

type CoverPosterPreviewProps = {
  templateId: string | null | undefined;
  photoUrls: Array<string | null>;
};

export function CoverPosterPreview({ templateId, photoUrls }: CoverPosterPreviewProps) {
  const template = getCoverTemplate(templateId);
  const previewPhotos = photoUrls.slice(0, 4);

  return (
    <div className="cover-preview-shell">
      <div className="cover-preview-grid">
        {previewPhotos.map((photoUrl, index) => (
          <div key={`cover-photo-${index}`} className="cover-preview-cell">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt={`Cover photo ${index + 1}`} crossOrigin="anonymous" loading="eager" decoding="async" />
            ) : (
              <div className="cover-preview-placeholder">
                <span>Photo {index + 1}</span>
              </div>
            )}
          </div>
        ))}
      </div>
      <Image src={template.overlaySrc} alt="" fill className="cover-preview-overlay" sizes="(min-width: 1024px) 680px, 100vw" />
    </div>
  );
}


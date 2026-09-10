import localFont from "next/font/local";
import { getPhotoUrl } from "@/lib/photo-url";
import { buildPosterFrameSlots, getPosterPhotoPlacement, getPosterSubtitle, getPosterTitleLabel } from "@/lib/poster";
import type { Mission, Photo, Trip } from "@/lib/types";

const posterSerif = localFont({
  src: [
    { path: "../../../node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../../../node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-italic.woff2", weight: "400", style: "italic" },
    { path: "../../../node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../../../node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-500-italic.woff2", weight: "500", style: "italic" },
    { path: "../../../node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../../../node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-600-italic.woff2", weight: "600", style: "italic" }
  ],
  variable: "--font-poster-serif",
  display: "swap",
});

type PosterSheetProps = {
  trip: Trip;
  mission: Mission;
  photos: Photo[];
  footer?: React.ReactNode;
  id?: string;
};

export function PosterSheet({ trip, mission, photos, footer, id }: PosterSheetProps) {
  const posterTitle = getPosterTitleLabel(trip.title, trip.location);
  const posterSubtitle = getPosterSubtitle(mission.color_name);
  const posterTone = mission.color_hex;
  const posterSlots = buildPosterFrameSlots(photos);

  return (
    <section
      id={id}
      className={`${posterSerif.variable} poster-frame poster-layout poster-postcard rounded-[0.2rem] p-4 sm:rounded-[0.25rem] sm:p-8 lg:p-10`}
    >
      <div className="poster-topline">
        <p className="poster-kicker">Color Hunt</p>
      </div>

      <div className="poster-hero">
        <p className="poster-location" style={{ color: posterTone }}>
          {posterTitle}
        </p>
      </div>

      <div className="poster-meta-line" style={{ borderColor: `${posterTone}24` }}>
        <p className="poster-meta-line-copy">{posterSubtitle}</p>
      </div>

      <div className="poster-grid-shell poster-postcard-grid mt-6">
        <div className="grid-poster poster-grid">
          {posterSlots.map((photo, index) => {
            const placement = photo ? getPosterPhotoPlacement(photo) : null;
            return (
              <div key={photo?.id ?? `poster-slot-${index}`} className="photo-tile poster-photo-tile rounded-[0.12rem] sm:rounded-[0.15rem]">
                {photo ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getPhotoUrl(photo)}
                      alt={photo.caption || `Poster photo ${index + 1}`}
                      crossOrigin="anonymous"
                      loading="eager"
                      decoding="async"
                      style={{
                        objectPosition: `${(placement?.focalX ?? 0.5) * 100}% ${(placement?.focalY ?? 0.5) * 100}%`,
                        transform: `scale(${placement?.zoom ?? 1})`,
                        transformOrigin: `${(placement?.focalX ?? 0.5) * 100}% ${(placement?.focalY ?? 0.5) * 100}%`,
                      }}
                    />
                  </>
                ) : (
                  <div className="photo-slot h-full w-full">
                    <div>
                      <p>Open frame</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="poster-footer mt-8">
        <p className="poster-footer-label">One place. One color. Nine moments.</p>
      </div>

      {footer ? <div className="mt-6">{footer}</div> : null}
    </section>
  );
}

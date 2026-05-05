import { Cormorant_Garamond } from "next/font/google";
import { getPhotoUrl } from "@/lib/data";
import { buildPosterFrameSlots, getPosterLocationLabel, getPosterTripYear } from "@/lib/poster";
import type { Mission, Photo, Trip } from "@/lib/types";

const posterSerif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-poster-serif",
});

type PosterSheetProps = {
  trip: Trip;
  mission: Mission;
  photos: Photo[];
  footer?: React.ReactNode;
  id?: string;
};

export function PosterSheet({ trip, mission, photos, footer, id }: PosterSheetProps) {
  const locationLabel = getPosterLocationLabel(trip.location);
  const posterTone = mission.color_hex;
  const tripYear = getPosterTripYear(trip.created_at, trip.start_date, trip.end_date);
  const posterSlots = buildPosterFrameSlots(photos);

  return (
    <section
      id={id}
      className={`${posterSerif.variable} poster-frame poster-layout poster-postcard rounded-[2.1rem] p-4 sm:rounded-[2.5rem] sm:p-8 lg:p-10`}
    >
      <div className="poster-topline">
        <p className="poster-kicker">Color Hunt</p>
      </div>

      <div className="poster-hero">
        <div>
          <p className="poster-location" style={{ color: posterTone }}>
            {locationLabel}
          </p>
        </div>
      </div>

      <div className="poster-meta-line" style={{ borderColor: `${posterTone}24` }}>
        <p className="poster-meta-line-copy">
          <span className="poster-meta-line-lead">Exploring</span> {trip.location} <span className="poster-meta-line-year">{tripYear}</span>
        </p>
      </div>

      <div className="poster-grid-shell poster-postcard-grid mt-6">
        <div className="grid-poster poster-grid">
          {posterSlots.map((photo, index) => {
            return (
              <div key={photo?.id ?? `poster-slot-${index}`} className="photo-tile poster-photo-tile rounded-[1.1rem] sm:rounded-[1.25rem]">
                {photo ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getPhotoUrl(photo)}
                      alt={photo.caption || `Poster photo ${index + 1}`}
                      crossOrigin="anonymous"
                      loading="eager"
                      decoding="async"
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

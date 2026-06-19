"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePhotoPosterPlacementAction } from "@/app/actions";
import { FeedbackToast } from "@/components/ui/feedback-toast";
import { getPhotoUrl } from "@/lib/photo-url";
import { getPosterPhotoPlacement } from "@/lib/poster";
import type { Photo } from "@/lib/types";

type PosterPhotoPlacementEditorProps = {
  tripId: string;
  missionMaxPhotos: number;
  photos: Photo[];
  isCoverTrip?: boolean;
};

function roundPlacementValue(value: number, precision = 1000) {
  return Math.round(value * precision) / precision;
}

export function PosterPhotoPlacementEditor({
  tripId,
  missionMaxPhotos,
  photos,
  isCoverTrip = false,
}: PosterPhotoPlacementEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(photos[0]?.id ?? null);
  const [focalX, setFocalX] = useState(0.5);
  const [focalY, setFocalY] = useState(0.5);
  const [zoom, setZoom] = useState(1);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedIndex = useMemo(
    () => Math.max(0, photos.findIndex((photo) => photo.id === selectedPhotoId)),
    [photos, selectedPhotoId],
  );
  const selectedPhoto = photos[selectedIndex] ?? null;
  const selectedPlacement = selectedPhoto ? getPosterPhotoPlacement(selectedPhoto) : null;
  const isDirty = Boolean(
    selectedPlacement &&
      (roundPlacementValue(focalX) !== roundPlacementValue(selectedPlacement.focalX) ||
        roundPlacementValue(focalY) !== roundPlacementValue(selectedPlacement.focalY) ||
        roundPlacementValue(zoom) !== roundPlacementValue(selectedPlacement.zoom)),
  );

  useEffect(() => {
    if (!selectedPhoto && photos[0]) {
      setSelectedPhotoId(photos[0].id);
      return;
    }

    if (selectedPhoto) {
      const placement = getPosterPhotoPlacement(selectedPhoto);
      setFocalX(placement.focalX);
      setFocalY(placement.focalY);
      setZoom(placement.zoom);
    }
  }, [photos, selectedPhoto]);

  if (photos.length === 0 || !selectedPhoto) {
    return null;
  }

  function handleReset() {
    const placement = getPosterPhotoPlacement(selectedPhoto);
    setFocalX(placement.focalX);
    setFocalY(placement.focalY);
    setZoom(placement.zoom);
    setStatus(null);
    setError(null);
  }

  function handleSave() {
    if (!selectedPhoto || !isDirty) {
      return;
    }

    setError(null);
    setStatus("Saving crop...");

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("trip_id", tripId);
        formData.set("photo_id", selectedPhoto.id);
        formData.set("poster_focal_x", String(roundPlacementValue(focalX)));
        formData.set("poster_focal_y", String(roundPlacementValue(focalY)));
        formData.set("poster_zoom", String(roundPlacementValue(zoom)));
        await updatePhotoPosterPlacementAction(formData);
        setStatus("Poster crop saved.");
        router.refresh();
      } catch (saveFailure) {
        setStatus(null);
        setError(saveFailure instanceof Error ? saveFailure.message : "Unable to save the poster crop right now.");
      }
    });
  }

  return (
    <>
      <div className="glass-panel rounded-[1.8rem] p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Adjust the crop</p>
            <h3 className="panel-title mt-2 text-2xl font-semibold">
              Move and zoom each {isCoverTrip ? "cover" : "poster"} frame.
            </h3>
          </div>
          <p className="text-sm text-[var(--muted)]">
            {photos.length}/{missionMaxPhotos} frames ready
          </p>
        </div>

        <p className="body-copy mt-3 max-w-2xl text-sm sm:text-base">
          Some photos need a nudge. Pick a frame, adjust what the crop centers on, then save before exporting.
        </p>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
          <div className="rounded-[1.5rem] border border-[rgba(53,37,30,0.08)] bg-[rgba(255,255,255,0.74)] p-4">
            <div className="overflow-hidden rounded-[1.2rem] border border-[rgba(53,37,30,0.08)] bg-[rgba(247,245,239,0.92)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getPhotoUrl(selectedPhoto)}
                alt={selectedPhoto.caption || `Selected poster photo ${selectedIndex + 1}`}
                className="aspect-square w-full object-cover"
                style={{
                  objectPosition: `${focalX * 100}% ${focalY * 100}%`,
                  transform: `scale(${zoom})`,
                  transformOrigin: `${focalX * 100}% ${focalY * 100}%`,
                }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">
                  Frame {selectedIndex + 1}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {isDirty ? "Unsaved adjustment" : "Saved crop"}
                </p>
              </div>
              <button type="button" className="button-secondary w-auto px-4 py-2 text-sm" onClick={handleReset} disabled={isPending || !isDirty}>
                Reset
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {photos.map((photo, index) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => {
                    setSelectedPhotoId(photo.id);
                    setStatus(null);
                    setError(null);
                  }}
                  className={`overflow-hidden rounded-[1rem] border p-1 transition ${
                    photo.id === selectedPhotoId
                      ? "border-[var(--ink)] bg-white shadow-[0_10px_24px_rgba(53,37,30,0.08)]"
                      : "border-[rgba(53,37,30,0.08)] bg-[rgba(255,255,255,0.74)]"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getPhotoUrl(photo)}
                    alt={photo.caption || `Poster frame ${index + 1}`}
                    className="aspect-square w-full rounded-[0.75rem] object-cover"
                  />
                  <span className="mt-2 block text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted-strong)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </button>
              ))}
            </div>

            <div className="rounded-[1.5rem] border border-[rgba(53,37,30,0.08)] bg-[rgba(255,255,255,0.74)] p-4">
              <label className="block">
                <span className="field-label">Horizontal focus</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={focalX}
                  onChange={(event) => setFocalX(Number(event.target.value))}
                  className="mt-2 w-full accent-[var(--ink)]"
                />
              </label>

              <label className="mt-4 block">
                <span className="field-label">Vertical focus</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={focalY}
                  onChange={(event) => setFocalY(Number(event.target.value))}
                  className="mt-2 w-full accent-[var(--ink)]"
                />
              </label>

              <label className="mt-4 block">
                <span className="field-label">Zoom</span>
                <input
                  type="range"
                  min="1"
                  max="2.5"
                  step="0.01"
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                  className="mt-2 w-full accent-[var(--ink)]"
                />
              </label>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button type="button" className="button-primary w-full sm:w-auto" disabled={isPending || !isDirty} onClick={handleSave}>
                  {isPending ? "Saving..." : "Save crop"}
                </button>
                <p className="text-sm text-[var(--muted)]">
                  {status ?? "Saved adjustments will update the poster preview and exports."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {error ? <FeedbackToast kind="error" message={error} onDismiss={() => setError(null)} /> : null}
    </>
  );
}

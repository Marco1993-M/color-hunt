"use client";

import imageCompression from "browser-image-compression";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FeedbackToast } from "@/components/ui/feedback-toast";
import { trackEvent } from "@/lib/analytics";
import { getCoverDisplayTitleLines, getCoverTemplate } from "@/lib/covers";
import { getPhotoUrl } from "@/lib/photo-url";
import { createClient } from "@/lib/supabase/client";
import type { Photo } from "@/lib/types";

type SupabaseErrorLike = {
  code?: string;
};

function isMissingSortOrderColumn(error: SupabaseErrorLike | null | undefined) {
  return error?.code === "42703" || error?.code === "PGRST204";
}

type CoverSlotBuilderProps = {
  tripId: string;
  missionId: string;
  userId: string;
  bucketName: string;
  templateId: string;
  title: string;
  photos: Photo[];
  maxPhotos: number;
};

const acceptedFileTypes = ["image/jpeg", "image/png", "image/webp"];

export function CoverSlotBuilder({
  tripId,
  missionId,
  userId,
  bucketName,
  templateId,
  title,
  photos,
  maxPhotos,
}: CoverSlotBuilderProps) {
  const router = useRouter();
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const libraryInputRef = useRef<HTMLInputElement | null>(null);
  const slotPhotoMap = useMemo(() => {
    const slots = Array.from({ length: maxPhotos }, () => null as Photo | null);

    for (const photo of photos) {
      const index = photo.sort_order ?? photos.indexOf(photo);
      if (index >= 0 && index < maxPhotos) {
        slots[index] = photo;
      }
    }

    return slots;
  }, [maxPhotos, photos]);
  const selectedPhoto = slotPhotoMap[selectedSlot];
  const filledSlots = slotPhotoMap.filter(Boolean).length;
  const template = getCoverTemplate(templateId);
  const titleLines = getCoverDisplayTitleLines(title || template.label, 3);

  useEffect(() => {
    const firstEmpty = slotPhotoMap.findIndex((photo) => !photo);
    if (firstEmpty !== -1) {
      setSelectedSlot((current) => (slotPhotoMap[current] ? firstEmpty : current));
      return;
    }

    if (selectedSlot >= slotPhotoMap.length) {
      setSelectedSlot(0);
    }
  }, [selectedSlot, slotPhotoMap]);

  function openPreferredPicker(slotIndex: number, hasPhoto: boolean) {
    setSelectedSlot(slotIndex);

    if (hasPhoto) {
      libraryInputRef.current?.click();
      return;
    }

    libraryInputRef.current?.click();
  }

  function handleFileSelection(event: React.ChangeEvent<HTMLInputElement>, source: "camera" | "library") {
    const file = Array.from(event.target.files ?? []).find((candidate) => acceptedFileTypes.includes(candidate.type));
    event.target.value = "";

    if (!file) {
      setError("Choose a JPG, PNG, or WebP image first.");
      return;
    }

    setError(null);
    setStatus(source === "camera" ? "Preparing camera shot..." : "Preparing photo...");

    startTransition(async () => {
      try {
        const supabase = createClient();
        const compressed = await imageCompression(file, {
          maxSizeMB: 0.55,
          maxWidthOrHeight: 1600,
          useWebWorker: true,
          fileType: "image/webp",
          initialQuality: 0.82,
        });

        const existingPhoto = slotPhotoMap[selectedSlot];
        const photoId = existingPhoto?.id ?? crypto.randomUUID();
        const previousStoragePath = existingPhoto?.storage_path ?? null;
        const storagePath = `${userId}/${tripId}/${missionId}/${photoId}.webp`;
        const uploadFile = new File([compressed], `${photoId}.webp`, {
          type: "image/webp",
        });

        setStatus(existingPhoto ? "Replacing photo..." : "Uploading photo...");

        const { error: uploadError } = await supabase.storage.from(bucketName).upload(storagePath, uploadFile, {
          cacheControl: "3600",
          contentType: "image/webp",
          upsert: true,
        });

        if (uploadError) {
          throw uploadError;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from(bucketName).getPublicUrl(storagePath);

        if (existingPhoto) {
          const { error: updateError } = await supabase
            .from("photos")
            .update({
              image_url: publicUrl,
              storage_path: storagePath,
              sort_order: selectedSlot,
            })
            .eq("id", existingPhoto.id)
            .eq("user_id", userId);

          let finalUpdateError = updateError as SupabaseErrorLike | null;

          if (isMissingSortOrderColumn(finalUpdateError)) {
            const fallbackUpdate = await supabase
              .from("photos")
              .update({
                image_url: publicUrl,
                storage_path: storagePath,
              })
              .eq("id", existingPhoto.id)
              .eq("user_id", userId);

            finalUpdateError = fallbackUpdate.error as SupabaseErrorLike | null;
          }

          if (finalUpdateError) {
            throw finalUpdateError;
          }
        } else {
          const { error: insertError } = await supabase.from("photos").insert({
            id: photoId,
            trip_id: tripId,
            mission_id: missionId,
            user_id: userId,
            image_url: publicUrl,
            storage_path: storagePath,
            sort_order: selectedSlot,
            caption: null,
            dominant_color: null,
            color_match_score: null,
          });

          let finalInsertError = insertError as SupabaseErrorLike | null;

          if (isMissingSortOrderColumn(finalInsertError)) {
            const fallbackInsert = await supabase.from("photos").insert({
              id: photoId,
              trip_id: tripId,
              mission_id: missionId,
              user_id: userId,
              image_url: publicUrl,
              storage_path: storagePath,
              caption: null,
              dominant_color: null,
              color_match_score: null,
            });

            finalInsertError = fallbackInsert.error as SupabaseErrorLike | null;
          }

          if (finalInsertError) {
            throw finalInsertError;
          }
        }

        if (previousStoragePath && previousStoragePath !== storagePath) {
          await supabase.storage.from(bucketName).remove([previousStoragePath]);
        }

        trackEvent({
          eventName: "cover_slot_filled",
          tripId,
          metadata: {
            templateId,
            slotIndex: selectedSlot,
            source,
            filledSlotsAfterUpload: Math.min(filledSlots + (existingPhoto ? 0 : 1), maxPhotos),
          },
        });

        const nextEmpty = slotPhotoMap.findIndex((photo, index) => index !== selectedSlot && !photo);
        if (nextEmpty !== -1) {
          setSelectedSlot(nextEmpty);
        }

        setStatus(existingPhoto ? `Photo updated in slot ${selectedSlot + 1}.` : `Photo added to slot ${selectedSlot + 1}.`);
        router.refresh();
      } catch (uploadFailure) {
        setStatus(null);
        setError(uploadFailure instanceof Error ? uploadFailure.message : "Unable to upload this photo right now.");
      }
    });
  }

  function handleDelete() {
    if (!selectedPhoto) {
      return;
    }

    const confirmed = window.confirm("Remove this photo from the template?");
    if (!confirmed) {
      return;
    }

    setError(null);
    setStatus("Removing photo...");

    startTransition(async () => {
      try {
        const supabase = createClient();
        const { error: deleteError } = await supabase.from("photos").delete().eq("id", selectedPhoto.id).eq("user_id", userId);

        if (deleteError) {
          throw deleteError;
        }

        await supabase.storage.from(bucketName).remove([selectedPhoto.storage_path]);

        trackEvent({
          eventName: "cover_slot_cleared",
          tripId,
          metadata: {
            templateId,
            slotIndex: selectedSlot,
            filledSlotsAfterDelete: Math.max(filledSlots - 1, 0),
          },
        });

        setStatus(`Photo removed from slot ${selectedSlot + 1}.`);
        router.refresh();
      } catch (deleteFailure) {
        setStatus(null);
        setError(deleteFailure instanceof Error ? deleteFailure.message : "Unable to remove this photo right now.");
      }
    });
  }

  return (
    <>
      <div className="glass-panel rounded-[2rem] p-6 sm:p-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Fill the template</p>
            <h3 className="panel-title mt-2 text-2xl font-semibold">Tap the exact spot you want to fill.</h3>
          </div>
          <p className="text-sm text-[var(--muted)]">{filledSlots}/{maxPhotos} photos added</p>
        </div>

        <p className="body-copy mt-3 max-w-2xl text-sm sm:text-base">
          This cover works differently from the hunt flow. Choose the slot first, then add the photo that belongs there.
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(18rem,0.95fr)]">
          <div className="cover-template-stage">
            <div className="cover-template-interactive">
              <div className="cover-preview-shell">
                <div className="cover-preview-grid">
                  {slotPhotoMap.map((photo, index) => (
                    <div key={`builder-photo-${index}`} className="cover-preview-cell">
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={getPhotoUrl(photo)} alt={`Template photo ${index + 1}`} />
                      ) : (
                        <div className="cover-preview-placeholder">
                          <span>Photo {index + 1}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <Image
                  src={template.overlaySrc}
                  alt=""
                  fill
                  className="cover-preview-overlay"
                  sizes="(min-width: 1024px) 680px, 100vw"
                />
                {template.id === "july" ? (
                  <div className="cover-preview-july-title" aria-hidden="true">
                    {titleLines.map((line) => (
                      <span key={line} className="cover-preview-july-line">
                        {line}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="cover-template-slot-layer">
                  {template.slots.map((slot, index) => {
                    const hasPhoto = Boolean(slotPhotoMap[index]);
                    const isSelected = selectedSlot === index;

                    return (
                      <button
                        key={`${template.id}-builder-slot-${index}`}
                        type="button"
                        className={`cover-template-slot-button ${isSelected ? "is-selected" : ""} ${hasPhoto ? "is-filled" : "is-empty"}`}
                        style={{
                          left: `${slot.left * 100}%`,
                          top: `${slot.top * 100}%`,
                          width: `${slot.width * 100}%`,
                          height: `${slot.height * 100}%`,
                        }}
                        onClick={() => openPreferredPicker(index, hasPhoto)}
                      >
                        <span className="cover-template-slot-pill">
                          {hasPhoto ? `Slot ${index + 1}` : `+ Slot ${index + 1}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="cover-template-actions">
            <div className="rounded-[1.6rem] border border-[rgba(53,37,30,0.08)] bg-[rgba(255,255,255,0.7)] p-5">
              <p className="eyebrow">Selected slot</p>
              <h4 className="panel-title mt-2 text-2xl font-semibold">Photo {selectedSlot + 1}</h4>
              <p className="body-copy mt-2 text-sm">
                {selectedPhoto
                  ? "This position is filled. Replace it or remove it if you want to change the sequence."
                  : "This spot is still empty. Add the photo that belongs here next."}
              </p>

              <div className="mt-5 flex flex-col gap-3">
                <input
                  ref={cameraInputRef}
                  className="sr-only"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  capture="environment"
                  onChange={(event) => handleFileSelection(event, "camera")}
                  disabled={isPending}
                  tabIndex={-1}
                />
                <input
                  ref={libraryInputRef}
                  className="sr-only"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={(event) => handleFileSelection(event, "library")}
                  disabled={isPending}
                  tabIndex={-1}
                />
                <button
                  className="button-primary w-full"
                  type="button"
                  disabled={isPending}
                  onClick={() => cameraInputRef.current?.click()}
                >
                  {selectedPhoto ? "Retake this photo" : "Take photo for this slot"}
                </button>
                <button
                  className="button-secondary w-full"
                  type="button"
                  disabled={isPending}
                  onClick={() => libraryInputRef.current?.click()}
                >
                  {selectedPhoto ? "Replace from library" : "Choose from library"}
                </button>
                {selectedPhoto ? (
                  <button className="button-secondary w-full" type="button" disabled={isPending} onClick={handleDelete}>
                    Remove this photo
                  </button>
                ) : null}
              </div>
            </div>

            <div className="rounded-[1.6rem] border border-[rgba(47,97,223,0.12)] bg-[rgba(255,255,255,0.58)] p-5">
              <p className="eyebrow">What happens next</p>
              <p className="body-copy mt-2 text-sm">
                Once all {maxPhotos} slots are filled, move into the cover preview to adjust crops and export the finished design.
              </p>
              <p className="mt-4 text-sm font-semibold text-[var(--ink)]">{title}</p>
            </div>
          </div>
        </div>
      </div>

      {status ? <FeedbackToast kind="success" message={status} onDismiss={() => setStatus(null)} /> : null}
      {error ? <FeedbackToast kind="error" message={error} onDismiss={() => setError(null)} /> : null}
    </>
  );
}

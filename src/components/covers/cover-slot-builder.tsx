"use client";

import imageCompression from "browser-image-compression";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { updatePhotoPosterPlacementAction } from "@/app/actions";
import { FeedbackToast } from "@/components/ui/feedback-toast";
import { PurpleGlyphTitle } from "@/components/covers/purple-glyph-title";
import { trackEvent } from "@/lib/analytics";
import { getCoverGridColumns, getCoverTemplate, getCoverTemplateSlots } from "@/lib/covers";
import { getPhotoUrl } from "@/lib/photo-url";
import { getPosterPhotoPlacement } from "@/lib/poster";
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
  titleStyle?: "default" | "purple" | "purple-stacked" | null;
  photos: Photo[];
  maxPhotos: number;
  inline?: boolean;
  previewId?: string;
};

const acceptedFileTypes = ["image/jpeg", "image/png", "image/webp"];

export function CoverSlotBuilder({
  tripId,
  missionId,
  userId,
  bucketName,
  templateId,
  title,
  titleStyle = "default",
  photos,
  maxPhotos,
  inline = false,
  previewId,
}: CoverSlotBuilderProps) {
  const router = useRouter();
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [cropSlot, setCropSlot] = useState<number | null>(null);
  const [cropX, setCropX] = useState(0.5);
  const [cropY, setCropY] = useState(0.5);
  const [cropZoom, setCropZoom] = useState(1);
  const pendingSlotRef = useRef<number | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const libraryInputRef = useRef<HTMLInputElement | null>(null);
  const batchInputRef = useRef<HTMLInputElement | null>(null);
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
  const templateSlots = getCoverTemplateSlots(templateId, maxPhotos);
  const cropPhoto = cropSlot === null ? null : slotPhotoMap[cropSlot];

  function openCropEditor(index: number) {
    const photo = slotPhotoMap[index];
    if (!photo) return;
    const placement = getPosterPhotoPlacement(photo);
    setCropSlot(index); setCropX(placement.focalX); setCropY(placement.focalY); setCropZoom(placement.zoom);
  }

  function saveCrop() {
    if (!cropPhoto) return;
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("photo_id", cropPhoto.id); formData.set("trip_id", tripId);
        formData.set("poster_focal_x", String(cropX)); formData.set("poster_focal_y", String(cropY)); formData.set("poster_zoom", String(cropZoom));
        await updatePhotoPosterPlacementAction(formData);
        setCropSlot(null); router.refresh();
      } catch (cropError) { setError(cropError instanceof Error ? cropError.message : "Unable to save that crop."); }
    });
  }

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
    pendingSlotRef.current = slotIndex;

    if (hasPhoto) {
      libraryInputRef.current?.click();
      return;
    }

    libraryInputRef.current?.click();
  }

  function handleFileSelection(event: React.ChangeEvent<HTMLInputElement>, source: "camera" | "library") {
    const file = Array.from(event.target.files ?? []).find((candidate) => acceptedFileTypes.includes(candidate.type));
    event.target.value = "";
    const targetSlot = pendingSlotRef.current ?? selectedSlot;
    pendingSlotRef.current = null;

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

        const existingPhoto = slotPhotoMap[targetSlot];
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
              sort_order: targetSlot,
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
            sort_order: targetSlot,
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
            slotIndex: targetSlot,
            source,
            filledSlotsAfterUpload: Math.min(filledSlots + (existingPhoto ? 0 : 1), maxPhotos),
          },
        });

        const nextEmpty = slotPhotoMap.findIndex((photo, index) => index !== targetSlot && !photo);
        if (nextEmpty !== -1) {
          setSelectedSlot(nextEmpty);
        } else {
          setSelectedSlot(targetSlot);
        }

        setStatus(existingPhoto ? `Photo updated in slot ${targetSlot + 1}.` : `Photo added to slot ${targetSlot + 1}.`);
        router.refresh();
      } catch (uploadFailure) {
        setStatus(null);
        setError(uploadFailure instanceof Error ? uploadFailure.message : "Unable to upload this photo right now.");
      }
    });
  }

  function handleBatchFileSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).filter((candidate) => acceptedFileTypes.includes(candidate.type));
    event.target.value = "";

    const emptySlots = slotPhotoMap
      .map((photo, index) => (photo ? null : index))
      .filter((index): index is number => index !== null);
    const queuedFiles = files.slice(0, emptySlots.length);

    if (queuedFiles.length === 0) {
      setError(emptySlots.length === 0 ? `All ${maxPhotos} photos are already in place.` : "Choose JPG, PNG, or WebP images first.");
      return;
    }

    setError(null);
    setStatus(`Adding ${queuedFiles.length} photo${queuedFiles.length === 1 ? "" : "s"}...`);

    startTransition(async () => {
      try {
        const supabase = createClient();

        for (const [queueIndex, file] of queuedFiles.entries()) {
          const targetSlot = emptySlots[queueIndex];
          const photoId = crypto.randomUUID();
          const storagePath = `${userId}/${tripId}/${missionId}/${photoId}.webp`;
          const compressed = await imageCompression(file, {
            maxSizeMB: 0.55,
            maxWidthOrHeight: 1600,
            useWebWorker: true,
            fileType: "image/webp",
            initialQuality: 0.82,
          });
          const uploadFile = new File([compressed], `${photoId}.webp`, { type: "image/webp" });
          const { error: uploadError } = await supabase.storage.from(bucketName).upload(storagePath, uploadFile, {
            cacheControl: "3600",
            contentType: "image/webp",
          });

          if (uploadError) {
            throw uploadError;
          }

          const {
            data: { publicUrl },
          } = supabase.storage.from(bucketName).getPublicUrl(storagePath);
          const { error: insertError } = await supabase.from("photos").insert({
            id: photoId,
            trip_id: tripId,
            mission_id: missionId,
            user_id: userId,
            image_url: publicUrl,
            storage_path: storagePath,
            sort_order: targetSlot,
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

          trackEvent({
            eventName: "cover_slot_filled",
            tripId,
            metadata: {
              templateId,
              slotIndex: targetSlot,
              source: "library_batch",
              filledSlotsAfterUpload: filledSlots + queueIndex + 1,
            },
          });
        }

        trackEvent({
          eventName: "cover_batch_uploaded",
          tripId,
          metadata: { templateId, photoCount: queuedFiles.length },
        });
        setSelectedSlot(Math.min(emptySlots[queuedFiles.length] ?? 0, maxPhotos - 1));
        setStatus(`${queuedFiles.length} photo${queuedFiles.length === 1 ? "" : "s"} added. Adjust any crop that needs it.`);
        router.refresh();
      } catch (uploadFailure) {
        setStatus(null);
        setError(uploadFailure instanceof Error ? uploadFailure.message : "Unable to add those photos right now.");
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

  if (inline) {
    return (
      <>
        <input
          ref={libraryInputRef}
          className="sr-only"
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          onChange={(event) => handleFileSelection(event, "library")}
          disabled={isPending}
          tabIndex={-1}
        />
        <div className="cover-template-interactive">
          <div id={previewId} className="cover-preview-shell">
            <div className="cover-preview-grid" style={{ gridTemplateColumns: `repeat(${getCoverGridColumns(maxPhotos)}, minmax(0, 1fr))` }}>
              {slotPhotoMap.map((photo, index) => (
                <div key={`inline-photo-${index}`} className="cover-preview-cell">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={getPhotoUrl(photo)} alt={`Template photo ${index + 1}`} style={{ objectPosition: `${getPosterPhotoPlacement(photo).focalX * 100}% ${getPosterPhotoPlacement(photo).focalY * 100}%`, transform: `scale(${getPosterPhotoPlacement(photo).zoom})`, transformOrigin: `${getPosterPhotoPlacement(photo).focalX * 100}% ${getPosterPhotoPlacement(photo).focalY * 100}%` }} />
                  ) : <div className="cover-preview-placeholder" />}
                </div>
              ))}
            </div>
            {template.overlaySrc ? <Image src={template.overlaySrc} alt="" fill className="cover-preview-overlay" sizes="(min-width: 1024px) 680px, 100vw" /> : null}
            {template.isCustomTitle && (titleStyle === "purple" || titleStyle === "purple-stacked") ? <PurpleGlyphTitle title={title} stacked={titleStyle === "purple-stacked"} /> : null}
            <div className="cover-template-slot-layer" data-export-hidden="true">
              {templateSlots.map((slot, index) => {
                const hasPhoto = Boolean(slotPhotoMap[index]);
                return (
                  <button
                    key={`${template.id}-inline-slot-${index}`}
                    type="button"
                    className={`cover-template-slot-button cover-template-inline-slot ${hasPhoto ? "is-filled" : "is-empty"}`}
                    style={{ left: `${slot.left * 100}%`, top: `${slot.top * 100}%`, width: `${slot.width * 100}%`, height: `${slot.height * 100}%` }}
                    onClick={() => hasPhoto ? openCropEditor(index) : openPreferredPicker(index, false)}
                    aria-label={hasPhoto ? `Replace photo ${index + 1}` : `Add photo ${index + 1}`}
                  >
                    <span className="cover-template-inline-add">{hasPhoto ? "Edit" : "+"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        {cropPhoto ? <div className="cover-crop-modal" role="dialog" aria-modal="true"><div className="cover-crop-panel"><div className="cover-crop-preview">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={getPhotoUrl(cropPhoto)} alt="Crop preview" style={{ objectPosition: `${cropX * 100}% ${cropY * 100}%`, transform: `scale(${cropZoom})`, transformOrigin: `${cropX * 100}% ${cropY * 100}%` }} /></div><div className="cover-crop-controls"><p className="eyebrow">Adjust photo {(cropSlot ?? 0) + 1}</p><label>Left / right<input type="range" min="0" max="1" step="0.01" value={cropX} onChange={(event) => setCropX(Number(event.target.value))} /></label><label>Up / down<input type="range" min="0" max="1" step="0.01" value={cropY} onChange={(event) => setCropY(Number(event.target.value))} /></label><label>Zoom<input type="range" min="1" max="2.5" step="0.01" value={cropZoom} onChange={(event) => setCropZoom(Number(event.target.value))} /></label><div className="flex gap-3"><button type="button" className="button-secondary flex-1" onClick={() => setCropSlot(null)}>Cancel</button><button type="button" className="button-primary flex-1" disabled={isPending} onClick={saveCrop}>Save crop</button></div></div></div></div> : null}
        {status || error ? <FeedbackToast kind={error ? "error" : "success"} message={error ?? status ?? ""} onDismiss={() => { setStatus(null); setError(null); }} /> : null}
      </>
    );
  }

  return (
    <>
      <div className="cover-builder-shell glass-panel rounded-[2rem] p-5 sm:p-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Build your cover</p>
            <h3 className="panel-title mt-2 text-2xl font-semibold">Add the photos. We will handle the layout.</h3>
          </div>
          <p className="text-sm text-[var(--muted)]">{filledSlots}/{maxPhotos} photos added</p>
        </div>

        <p className="body-copy mt-3 max-w-2xl text-sm sm:text-base">
          Pick up to {maxPhotos} photos and we will place them in order. Tap a photo afterwards only if you want to replace or refine it.
        </p>

        <input
          ref={batchInputRef}
          className="sr-only"
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          multiple
          onChange={handleBatchFileSelection}
          disabled={isPending || filledSlots === maxPhotos}
          tabIndex={-1}
        />
        <button
          className="button-primary mt-5 w-full sm:w-auto"
          type="button"
          disabled={isPending || filledSlots === maxPhotos}
          onClick={() => {
            trackEvent({ eventName: "cover_batch_picker_opened", tripId, metadata: { templateId, filledSlots } });
            batchInputRef.current?.click();
          }}
        >
          {filledSlots === maxPhotos ? `All ${maxPhotos} photos are in` : `Choose ${maxPhotos - filledSlots} photo${maxPhotos - filledSlots === 1 ? "" : "s"}`}
        </button>

        <div className="cover-builder-content mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(18rem,0.95fr)]">
          <div className="cover-template-stage">
            <div className="cover-template-interactive">
              <div className="cover-preview-shell">
                <div className="cover-preview-grid" style={{ gridTemplateColumns: `repeat(${getCoverGridColumns(maxPhotos)}, minmax(0, 1fr))` }}>
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
                {template.overlaySrc ? (
                  <Image
                    src={template.overlaySrc}
                    alt=""
                    fill
                    className="cover-preview-overlay"
                    sizes="(min-width: 1024px) 680px, 100vw"
                  />
                ) : null}
                {template.isCustomTitle && (titleStyle === "purple" || titleStyle === "purple-stacked") ? <PurpleGlyphTitle title={title} stacked={titleStyle === "purple-stacked"} /> : null}
                <div className="cover-template-slot-layer">
                  {templateSlots.map((slot, index) => {
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
                          {hasPhoto ? `Edit ${index + 1}` : `+ Add ${index + 1}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="cover-template-actions cover-builder-refine">
            <div className="rounded-[1.6rem] border border-[rgba(53,37,30,0.08)] bg-[rgba(255,255,255,0.7)] p-5">
              <p className="eyebrow">Fine-tune a photo</p>
              <h4 className="panel-title mt-2 text-2xl font-semibold">Photo {selectedSlot + 1}</h4>
              <p className="body-copy mt-2 text-sm">
                {selectedPhoto
                  ? "This position is filled. Replace or remove it if this one does not tell the story correctly."
                  : "This spot is still empty. Add the photo that belongs here."}
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

          </div>
        </div>
      </div>

      {status ? <FeedbackToast kind="success" message={status} onDismiss={() => setStatus(null)} /> : null}
      {error ? <FeedbackToast kind="error" message={error} onDismiss={() => setError(null)} /> : null}
    </>
  );
}

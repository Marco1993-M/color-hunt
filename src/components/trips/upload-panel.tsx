"use client";

import imageCompression from "browser-image-compression";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { FeedbackToast } from "@/components/ui/feedback-toast";
import { trackEvent } from "@/lib/analytics";
import { getSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";
import type { Photo } from "@/lib/types";

type SupabaseErrorLike = {
  code?: string;
  message?: string;
};

function isMissingSortOrderColumn(error: SupabaseErrorLike | null | undefined) {
  return error?.code === "42703" || error?.code === "PGRST204";
}

type UploadPanelProps = {
  tripId: string;
  missionId: string;
  userId: string;
  currentCount: number;
  maxPhotos: number;
  bucketName: string;
  photos: Photo[];
};

const acceptedFileTypes = ["image/jpeg", "image/png", "image/webp"];

export function UploadPanel({
  tripId,
  missionId,
  userId,
  currentCount,
  maxPhotos,
  bucketName,
  photos,
}: UploadPanelProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedSource, setSelectedSource] = useState<"camera" | "library" | null>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [orderedPhotos, setOrderedPhotos] = useState(photos);
  const [draggingPhotoId, setDraggingPhotoId] = useState<string | null>(null);
  const [dragTargetPhotoId, setDragTargetPhotoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const touchDragRef = useRef<{ photoId: string; pointerId: number } | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const libraryInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const remaining = useMemo(() => Math.max(maxPhotos - currentCount, 0), [currentCount, maxPhotos]);

  useEffect(() => {
    setOrderedPhotos(photos);
  }, [photos]);

  useEffect(() => {
    if (selectedFiles.length === 0) {
      setPreviewUrls([]);
      return;
    }

    const nextPreviewUrls = selectedFiles.map((selectedFile) => URL.createObjectURL(selectedFile));
    setPreviewUrls(nextPreviewUrls);

    return () => {
      nextPreviewUrls.forEach((nextPreviewUrl) => URL.revokeObjectURL(nextPreviewUrl));
    };
  }, [selectedFiles]);

  function clearSelectedFile() {
    setSelectedFiles([]);
    setSelectedSource(null);
    setPreviewUrls([]);
  }

  function handleFileSelection(
    event: React.ChangeEvent<HTMLInputElement>,
    source: "camera" | "library",
  ) {
    const nextFiles = Array.from(event.target.files ?? []).filter((candidate) =>
      acceptedFileTypes.includes(candidate.type),
    );

    if (nextFiles.length > 0) {
      const remainingCapacity = Math.max(maxPhotos - currentCount, 0);
      const limitedFiles = nextFiles.slice(0, remainingCapacity);
      setSelectedFiles(limitedFiles);
      setSelectedSource(source);

      if (nextFiles.length > limitedFiles.length) {
        setStatus(`Only the first ${limitedFiles.length} images were kept because this poster has limited space left.`);
      } else {
        setStatus(null);
      }
      setError(null);
    } else {
      setSelectedFiles([]);
      setSelectedSource(null);
    }

    event.target.value = "";
  }

  function clearDragState() {
    setDraggingPhotoId(null);
    setDragTargetPhotoId(null);
    touchDragRef.current = null;
  }

  function getPhotoImageUrl(photo: Photo) {
    if (photo.image_url) {
      return photo.image_url;
    }

    const { url } = getSupabaseEnv();
    return `${url}/storage/v1/object/public/${bucketName}/${photo.storage_path}`;
  }

  async function persistPhotoOrder(nextPhotos: Photo[], supabase = createClient()) {
    const updates = nextPhotos.map((photo, index) =>
      supabase.from("photos").update({ sort_order: index }).eq("id", photo.id).eq("user_id", userId),
    );

    const results = await Promise.all(updates);
    const updateError = results.find((result) => result.error)?.error as SupabaseErrorLike | undefined;

    if (updateError) {
      if (isMissingSortOrderColumn(updateError)) {
        throw new Error("Photo reordering needs the latest database schema. Run the updated Supabase SQL, then try again.");
      }

      throw updateError;
    }
  }

  function buildDraggedPhotos(fromPhotoId: string, toPhotoId: string) {
    if (fromPhotoId === toPhotoId) {
      return null;
    }

    const fromIndex = orderedPhotos.findIndex((photo) => photo.id === fromPhotoId);
    const toIndex = orderedPhotos.findIndex((photo) => photo.id === toPhotoId);

    if (fromIndex === -1 || toIndex === -1) {
      return null;
    }

    const nextPhotos = [...orderedPhotos];
    const [movedPhoto] = nextPhotos.splice(fromIndex, 1);
    nextPhotos.splice(toIndex, 0, movedPhoto);

    return nextPhotos.map((photo, index) => ({
      ...photo,
      sort_order: index,
    }));
  }

  function commitReorder(nextPhotos: Photo[], successMessage: string) {
    const previousPhotos = orderedPhotos;
    setError(null);
    setStatus("Saving your grid order...");
    setOrderedPhotos(nextPhotos);

    startTransition(async () => {
      try {
        await persistPhotoOrder(nextPhotos);
        trackEvent({
          eventName: "poster_reordered",
          tripId,
          metadata: {
            photoCount: nextPhotos.length,
          },
        });
        setStatus(successMessage);
        router.refresh();
      } catch (reorderFailure) {
        const message =
          reorderFailure instanceof Error ? reorderFailure.message : "Unable to save the new photo order right now.";
        trackEvent({
          eventName: "poster_reorder_failed",
          tripId,
          metadata: {
            message,
          },
        });
        setOrderedPhotos(previousPhotos);
        setError(message);
        setStatus(null);
      } finally {
        clearDragState();
      }
    });
  }

  function buildReorderedPhotos(photoId: string, direction: "backward" | "forward") {
    const currentIndex = orderedPhotos.findIndex((photo) => photo.id === photoId);

    if (currentIndex === -1) {
      return null;
    }

    const targetIndex = direction === "backward" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= orderedPhotos.length) {
      return null;
    }

    const nextPhotos = [...orderedPhotos];
    const [movedPhoto] = nextPhotos.splice(currentIndex, 1);
    nextPhotos.splice(targetIndex, 0, movedPhoto);
    return nextPhotos.map((photo, index) => ({
      ...photo,
      sort_order: index,
    }));
  }

  function handleReorder(photoId: string, direction: "backward" | "forward") {
    const nextPhotos = buildReorderedPhotos(photoId, direction);

    if (!nextPhotos) {
      return;
    }

    commitReorder(nextPhotos, "Grid order updated.");
  }

  function handleNativeDragStart(photoId: string) {
    setDraggingPhotoId(photoId);
    setDragTargetPhotoId(photoId);
    setError(null);
    setStatus("Drop this frame where you want it.");
  }

  function handleNativeDrop(targetPhotoId: string) {
    if (!draggingPhotoId) {
      return;
    }

    const nextPhotos = buildDraggedPhotos(draggingPhotoId, targetPhotoId);

    if (!nextPhotos) {
      clearDragState();
      setStatus(null);
      return;
    }

    commitReorder(nextPhotos, "Grid order updated.");
  }

  function handleTouchDragStart(
    event: React.PointerEvent<HTMLButtonElement>,
    photoId: string,
  ) {
    if (event.pointerType === "mouse") {
      return;
    }

    event.preventDefault();
    touchDragRef.current = { photoId, pointerId: event.pointerId };
    setDraggingPhotoId(photoId);
    setDragTargetPhotoId(photoId);
    setError(null);
    setStatus("Drag across the grid, then lift to place the frame.");
  }

  function handleTouchDragMove(event: React.PointerEvent<HTMLButtonElement>) {
    const activeTouchDrag = touchDragRef.current;

    if (!activeTouchDrag || activeTouchDrag.pointerId !== event.pointerId) {
      return;
    }

    const hoveredElement = document.elementFromPoint(event.clientX, event.clientY);
    const nextTargetId = hoveredElement?.closest("[data-photo-id]")?.getAttribute("data-photo-id");

    if (nextTargetId) {
      setDragTargetPhotoId(nextTargetId);
    }
  }

  function handleTouchDragEnd(event: React.PointerEvent<HTMLButtonElement>) {
    const activeTouchDrag = touchDragRef.current;

    if (!activeTouchDrag || activeTouchDrag.pointerId !== event.pointerId) {
      return;
    }

    const targetPhotoId = dragTargetPhotoId ?? activeTouchDrag.photoId;
    const nextPhotos = buildDraggedPhotos(activeTouchDrag.photoId, targetPhotoId);

    if (!nextPhotos) {
      clearDragState();
      setStatus(null);
      return;
    }

    commitReorder(nextPhotos, "Grid order updated.");
  }

  function handleDelete(photo: Photo) {
    const confirmed = window.confirm("Delete this frame from the trip?");

    if (!confirmed) {
      return;
    }

    const previousPhotos = orderedPhotos;
    const nextPhotos = orderedPhotos
      .filter((currentPhoto) => currentPhoto.id !== photo.id)
      .map((currentPhoto, index) => ({
        ...currentPhoto,
        sort_order: index,
      }));

    setError(null);
    setStatus("Removing photo...");
    setOrderedPhotos(nextPhotos);

    startTransition(async () => {
      try {
        const supabase = createClient();
        const { error: deleteError } = await supabase.from("photos").delete().eq("id", photo.id).eq("user_id", userId);

        if (deleteError) {
          throw deleteError;
        }

        const { error: storageError } = await supabase.storage.from(bucketName).remove([photo.storage_path]);

        if (storageError) {
          setStatus("Photo removed, but the storage cleanup may need a second pass.");
        }

        if (nextPhotos.length > 0) {
          try {
            await persistPhotoOrder(nextPhotos, supabase);
          } catch (reorderError) {
            if (!(reorderError instanceof Error && reorderError.message.includes("latest database schema"))) {
              throw reorderError;
            }
          }
        }

        trackEvent({
          eventName: "photo_deleted",
          tripId,
          metadata: {
            remainingPhotos: nextPhotos.length,
          },
        });
        setStatus(storageError ? "Photo removed." : "Photo deleted.");
        router.refresh();
      } catch (deleteFailure) {
        const message = deleteFailure instanceof Error ? deleteFailure.message : "Unable to delete the photo right now.";
        trackEvent({
          eventName: "photo_delete_failed",
          tripId,
          metadata: {
            message,
          },
        });
        setOrderedPhotos(previousPhotos);
        setError(message);
        setStatus(null);
      }
    });
  }

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (selectedFiles.length === 0) {
      setError("Choose a JPG, PNG, or WebP image first.");
      trackEvent({
        eventName: "photo_upload_failed",
        tripId,
        metadata: {
          reason: "missing_files",
        },
      });
      return;
    }

    if (remaining <= 0) {
      setError("This mission is already complete.");
      trackEvent({
        eventName: "photo_upload_blocked_complete",
        tripId,
        metadata: {
          maxPhotos,
        },
      });
      return;
    }

    setError(null);
    setStatus("Compressing image...");

    startTransition(async () => {
      try {
        const supabase = createClient();
        const filesToUpload = selectedFiles.slice(0, remaining);

        for (const [index, file] of filesToUpload.entries()) {
          if (!acceptedFileTypes.includes(file.type)) {
            throw new Error("Unsupported file type. Use JPG, PNG, or WebP.");
          }

          setStatus(
            filesToUpload.length > 1
              ? `Compressing image ${index + 1} of ${filesToUpload.length}...`
              : "Compressing image...",
          );

          const compressed = await imageCompression(file, {
            maxSizeMB: 0.8,
            maxWidthOrHeight: 2400,
            useWebWorker: true,
            fileType: "image/webp",
            initialQuality: 0.82,
          });

          const photoId = crypto.randomUUID();
          const storagePath = `${userId}/${tripId}/${missionId}/${photoId}.webp`;
          const uploadFile = new File([compressed], `${photoId}.webp`, {
            type: "image/webp",
          });

          setStatus(
            filesToUpload.length > 1
              ? `Uploading image ${index + 1} of ${filesToUpload.length}...`
              : "Uploading to storage...",
          );

          const { error: uploadError } = await supabase.storage.from(bucketName).upload(storagePath, uploadFile, {
            cacheControl: "3600",
            contentType: "image/webp",
            upsert: false,
          });

          if (uploadError) {
            throw uploadError;
          }

          const {
            data: { publicUrl },
          } = supabase.storage.from(bucketName).getPublicUrl(storagePath);

          setStatus(
            filesToUpload.length > 1
              ? `Saving image ${index + 1} of ${filesToUpload.length}...`
              : "Saving photo details...",
          );

          const { error: insertError } = await supabase.from("photos").insert({
            id: photoId,
            trip_id: tripId,
            mission_id: missionId,
            user_id: userId,
            image_url: publicUrl,
            storage_path: storagePath,
            sort_order: currentCount + index,
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

            finalInsertError = fallbackInsert.error;
          }

          if (finalInsertError) {
            throw finalInsertError;
          }

          trackEvent({
            eventName: "photo_uploaded",
            tripId,
            metadata: {
              missionId,
              remainingAfterUpload: Math.max(remaining - (index + 1), 0),
              source: selectedSource ?? "unknown",
            },
          });
        }

        clearSelectedFile();

        if (currentCount === 0) {
          trackEvent({
            eventName: "first_photo_uploaded",
            tripId,
            metadata: {
              missionId,
              source: selectedSource ?? "unknown",
            },
          });
        }

        if (currentCount + filesToUpload.length >= maxPhotos) {
          trackEvent({
            eventName: "poster_completed",
            tripId,
            metadata: {
              missionId,
              maxPhotos,
              source: selectedSource ?? "unknown",
            },
          });
        }
        setStatus(filesToUpload.length > 1 ? `${filesToUpload.length} photos added to your grid.` : "Photo added to your grid.");
        router.refresh();
      } catch (uploadFailure) {
        const message =
          uploadFailure instanceof Error ? uploadFailure.message : "Something went wrong while uploading the photo.";
        trackEvent({
          eventName: "photo_upload_failed",
          tripId,
          metadata: {
            message,
          },
        });
        setError(message);
        setStatus(null);
      }
    });
  }

  return (
    <div className="glass-panel rounded-[2rem] p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Upload Moments</p>
          <h3 className="panel-title mt-2 text-2xl font-semibold">Add one meaningful frame at a time.</h3>
        </div>
        <p className="text-sm text-[var(--muted)]">{remaining} of 9 uploads remaining</p>
      </div>

      {orderedPhotos.length === 0 ? (
        <div className="empty-state-card mt-5 rounded-[1.7rem] p-5">
          <p className="eyebrow">Start with one strong hit</p>
          <p className="body-copy mt-2 text-sm sm:text-base">
            Your first frame sets the tone for the whole poster. Pick something obvious, colorful, and easy to build from.
          </p>
        </div>
      ) : null}

      <form className="mt-6 space-y-4" onSubmit={handleUpload}>
        <div>
          <p className="field-label">Photo</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              ref={cameraInputRef}
              className="sr-only"
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              capture="environment"
              onChange={(event) => handleFileSelection(event, "camera")}
              disabled={isPending || remaining <= 0}
              tabIndex={-1}
            />
            <input
              ref={libraryInputRef}
              className="sr-only"
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              multiple
              onChange={(event) => handleFileSelection(event, "library")}
              disabled={isPending || remaining <= 0}
              tabIndex={-1}
            />
            <button
              className="button-primary w-full sm:w-auto"
              type="button"
              disabled={isPending || remaining <= 0}
              onClick={() => cameraInputRef.current?.click()}
            >
              Take photo
            </button>
            <button
              className="button-secondary w-full sm:w-auto"
              type="button"
              disabled={isPending || remaining <= 0}
              onClick={() => libraryInputRef.current?.click()}
            >
              Choose from library
            </button>
          </div>
          <p className="body-copy mt-2 text-sm">
            Take it live or pull it in later from your camera roll. Images are compressed in the browser to target 800KB or less.
          </p>
        </div>

        {previewUrls.length > 0 ? (
          <div className="rounded-[1.5rem] border border-[rgba(53,37,30,0.1)] bg-[rgba(255,255,255,0.55)] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Selected Preview</p>
                <p className="body-copy mt-2 text-sm">
                  {previewUrls.length > 1
                    ? `${previewUrls.length} ${
                        selectedSource === "library" ? "library photos are" : "images are"
                      } queued to join your grid.`
                    : `This ${selectedSource === "camera" ? "camera shot" : selectedSource === "library" ? "library photo" : "image"} is the next frame that will join your grid.`}
                </p>
              </div>
              <button className="text-sm font-medium text-[var(--muted)]" type="button" onClick={clearSelectedFile}>
                Remove
              </button>
            </div>
            <div className={`mt-3 ${previewUrls.length > 1 ? "grid grid-cols-3 gap-2" : "overflow-hidden rounded-[1.3rem] border border-[rgba(53,37,30,0.08)] bg-white/70"}`}>
              {previewUrls.map((previewUrl, index) => (
                <div
                  key={previewUrl}
                  className={
                    previewUrls.length > 1
                      ? "overflow-hidden rounded-[1rem] border border-[rgba(53,37,30,0.08)] bg-white/70"
                      : ""
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt={`Selected photo preview ${index + 1}`}
                    className={`${previewUrls.length > 1 ? "aspect-square" : "aspect-[4/5]"} w-full object-cover`}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <button className="button-primary w-full sm:w-auto" type="submit" disabled={isPending || remaining <= 0}>
          {isPending ? "Uploading..." : remaining <= 0 ? "Mission Complete" : previewUrls.length > 1 ? `Upload ${previewUrls.length} photos` : "Upload photo"}
        </button>
      </form>

      <div className="mt-8 rounded-[1.75rem] border border-[rgba(53,37,30,0.1)] bg-[rgba(255,255,255,0.42)] p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Arrange the poster</p>
            <h4 className="panel-title mt-2 text-xl font-semibold">Shape the sequence before you publish it.</h4>
          </div>
          <p className="body-copy text-sm">
            Drag a frame by its handle to shuffle the grid.
          </p>
        </div>

        {orderedPhotos.length === 0 ? (
          <div className="arrange-empty-state mt-4 rounded-[1.5rem] p-5 text-center">
            <p className="eyebrow">Nothing to arrange yet</p>
            <p className="body-copy mt-2 text-sm sm:text-base">
              Upload your first moment and the grid will start taking shape here.
            </p>
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-3 gap-3">
          {Array.from({ length: maxPhotos }).map((_, index) => {
            const photo = orderedPhotos[index];
            const isFirst = index === 0;
            const isLast = index === orderedPhotos.length - 1;
            const isDragging = draggingPhotoId === photo?.id;
            const isDropTarget = dragTargetPhotoId === photo?.id && draggingPhotoId !== photo?.id;

            return (
              <div
                key={photo?.id ?? `arrange-slot-${index}`}
                className={`${isDragging ? "opacity-55" : ""}`}
                data-photo-id={photo?.id ?? ""}
                onDragOver={(event) => {
                  if (!photo || !draggingPhotoId) {
                    return;
                  }

                  event.preventDefault();
                  if (dragTargetPhotoId !== photo.id) {
                    setDragTargetPhotoId(photo.id);
                  }
                }}
                onDrop={() => {
                  if (photo) {
                    handleNativeDrop(photo.id);
                  }
                }}
              >
                <div className={`photo-tile relative overflow-hidden ${isDropTarget ? "ring-2 ring-[rgba(32,26,23,0.28)]" : ""}`}>
                  {photo ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={getPhotoImageUrl(photo)} alt={photo.caption || `Arranged photo ${index + 1}`} />
                      <div className="absolute inset-x-0 top-0 h-20 bg-[linear-gradient(180deg,rgba(18,14,12,0.42),rgba(18,14,12,0.12),transparent)]" />

                      <div className="absolute inset-x-2 top-2 flex items-start justify-between gap-2">
                        <button
                          className={`drag-handle shadow-[0_10px_28px_rgba(15,12,10,0.28)] flex h-10 w-10 items-center justify-center rounded-full border text-base ${
                            isDragging
                              ? "border-[rgba(22,18,16,0.55)] bg-[rgba(255,251,246,0.96)] text-[rgba(24,20,18,0.92)]"
                              : "border-[rgba(255,255,255,0.42)] bg-[rgba(255,251,246,0.9)] text-[rgba(24,20,18,0.92)]"
                          } backdrop-blur-md`}
                          type="button"
                          aria-label="Drag to reorder"
                          title="Drag to reorder"
                          draggable={!isPending}
                          onDragStart={() => handleNativeDragStart(photo.id)}
                          onDragEnd={clearDragState}
                          onPointerDown={(event) => handleTouchDragStart(event, photo.id)}
                          onPointerMove={handleTouchDragMove}
                          onPointerUp={handleTouchDragEnd}
                          onPointerCancel={clearDragState}
                          disabled={isPending}
                        >
                          ⋮⋮
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(129,27,27,0.38)] bg-[rgba(255,239,239,0.94)] text-base text-[#861c1c] shadow-[0_10px_28px_rgba(15,12,10,0.28)] backdrop-blur-md"
                            type="button"
                            aria-label="Delete photo"
                            title="Delete photo"
                            onClick={() => handleDelete(photo)}
                            disabled={isPending}
                          >
                            ×
                          </button>
                        </div>
                      </div>

                      <div className="absolute bottom-2 left-2">
                        <span className="shrink-0 rounded-full border border-white/18 bg-[rgba(20,15,13,0.58)] px-2 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-white shadow-[0_8px_22px_rgba(15,12,10,0.24)] backdrop-blur-md">
                          {index + 1}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="photo-slot h-full w-full">
                      <div>
                        <p className="text-sm font-medium uppercase tracking-[0.18em]">Slot {index + 1}</p>
                        <p className="mt-2">Your next frame lands here.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {status ? <FeedbackToast kind="success" message={status} onDismiss={() => setStatus(null)} /> : null}
      {error ? <FeedbackToast kind="error" message={error} onDismiss={() => setError(null)} /> : null}
    </div>
  );
}

"use client";

import { savePhotoUpload } from "@/lib/upload-photo";
import { getPhotoSlots, selectImageFiles, photoErrorMessage, getFileUploadId } from "@/lib/photo-slots";
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
import { getPhotoFilterClassName, getPhotoFilterId, type PhotoFilterId } from "@/lib/photo-filter";
import { createClient } from "@/lib/supabase/client";
import type { Photo } from "@/lib/types";

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
  variant?: "cover" | "hunt";
};

const fileGuidance = "Use JPG, PNG or WebP. For HEIC photos, export as JPG or choose Most Compatible in your camera settings.";

function FilteredCropImage({
  photo,
  focalX,
  focalY,
  zoom,
  isWildMemory,
}: {
  photo: Photo;
  focalX: number;
  focalY: number;
  zoom: number;
  isWildMemory: boolean;
}) {
  const imageStyle = {
    objectPosition: `${focalX * 100}% ${focalY * 100}%`,
    transform: `scale(${zoom})`,
    transformOrigin: `${focalX * 100}% ${focalY * 100}%`,
  };

  return <>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={getPhotoUrl(photo)} alt="Crop preview" className={getPhotoFilterClassName(isWildMemory ? "wild-memory-87" : "none")} style={imageStyle} />
    {isWildMemory ? <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={getPhotoUrl(photo)} alt="" aria-hidden="true" className="photo-filter-channel photo-filter-channel-red" style={{ ...imageStyle, transform: `translateX(-3px) scale(${zoom})` }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={getPhotoUrl(photo)} alt="" aria-hidden="true" className="photo-filter-channel photo-filter-channel-blue" style={{ ...imageStyle, transform: `translateX(3px) scale(${zoom})` }} />
    </> : null}
  </>;
}

export function CoverSlotBuilder({
  tripId,
  missionId,
  userId,
  bucketName,
  templateId,
  title,
  titleStyle = "default",
  photos: incomingPhotos,
  maxPhotos,
  inline = false,
  previewId,
  variant = "cover",
}: CoverSlotBuilderProps) {
  const router = useRouter();
  const [photos, setPhotos] = useState(incomingPhotos);
  const [previousPhotos, setPreviousPhotos] = useState(incomingPhotos);
  const [retryFiles, setRetryFiles] = useState<File[]>([]);
  const busyRef = useRef(false);
  if (previousPhotos !== incomingPhotos) {
    setPreviousPhotos(incomingPhotos);
    setPhotos(incomingPhotos);
  }

  const [selectedSlot, setSelectedSlot] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const cropDialogRef = useRef<HTMLDialogElement>(null);
  const [cropSlot, setCropSlot] = useState<number | null>(null);
  const [cropX, setCropX] = useState(0.5);
  const [cropY, setCropY] = useState(0.5);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropFilter, setCropFilter] = useState<PhotoFilterId>("none");
  const pendingSlotRef = useRef<number | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const libraryInputRef = useRef<HTMLInputElement | null>(null);
  const batchInputRef = useRef<HTMLInputElement | null>(null);
  const slotPhotoMap = useMemo(() => getPhotoSlots(photos, maxPhotos), [photos, maxPhotos]);
  const selectedPhoto = slotPhotoMap[selectedSlot];
  const filledSlots = slotPhotoMap.filter(Boolean).length;
  const isHunt = variant === "hunt";
  const template = getCoverTemplate(templateId);
  const gridColumns = isHunt ? 3 : getCoverGridColumns(maxPhotos);
  const templateSlots = isHunt
    ? Array.from({ length: maxPhotos }, (_, index) => ({
        left: (index % 3) / 3,
        top: Math.floor(index / 3) / Math.ceil(maxPhotos / 3),
        width: 1 / 3,
        height: 1 / Math.ceil(maxPhotos / 3),
      }))
    : getCoverTemplateSlots(templateId, maxPhotos);
  const cropPhoto = cropSlot === null ? null : slotPhotoMap[cropSlot];
  const cropUsesWildMemory = templateId === "wild-memory-87" || cropFilter === "wild-memory-87";
  useEffect(() => {
    const dialog = cropDialogRef.current;
    if (cropSlot !== null && dialog && !dialog.open) dialog.showModal();
    return () => { dialog?.close(); };
  }, [cropSlot]);


  function openCropEditor(index: number) {
    const photo = slotPhotoMap[index];
    if (!photo) return;
    setSelectedSlot(index);
    const placement = getPosterPhotoPlacement(photo);
    setCropSlot(index); setCropX(placement.focalX); setCropY(placement.focalY); setCropZoom(placement.zoom); setCropFilter(templateId === "wild-memory-87" ? "wild-memory-87" : getPhotoFilterId(photo.photo_filter));
  }

  function saveCrop() {
    if (!cropPhoto) return;
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("photo_id", cropPhoto.id); formData.set("trip_id", tripId);
        formData.set("poster_focal_x", String(cropX)); formData.set("poster_focal_y", String(cropY)); formData.set("poster_zoom", String(cropZoom)); formData.set("photo_filter", cropFilter);
        await updatePhotoPosterPlacementAction(formData);
        setCropSlot(null); router.refresh();
      } catch (cropError) { setError(cropError instanceof Error ? cropError.message : "Unable to save that crop."); }
    });
  }

  function openPreferredPicker(slotIndex: number, hasPhoto: boolean) {
    setSelectedSlot(slotIndex);
    pendingSlotRef.current = slotIndex;

    if (hasPhoto) {
      libraryInputRef.current?.click();
      return;
    }

    libraryInputRef.current?.click();
  }

  async function refreshPhotos() {
    const supabase = createClient();
    const { data, error: readError } = await supabase.from("photos").select("*").eq("trip_id", tripId).eq("user_id", userId).order("sort_order");
    if (readError) throw readError;
    const rows = (data ?? []) as Photo[];
    const signed = rows.length ? await supabase.storage.from(bucketName).createSignedUrls(rows.map(photo => photo.storage_path), 3600) : null;
    const current = rows.map((photo, index) => ({ ...photo, image_url: signed?.data?.[index]?.signedUrl ?? null }));
    setPhotos(current);
    return current;
  }

  function handleFileSelection(event: React.ChangeEvent<HTMLInputElement>, source: "camera" | "library") {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    const targetSlot = pendingSlotRef.current ?? selectedSlot;
    pendingSlotRef.current = null;
    if (!selected.length || busyRef.current) return;
    const { accepted } = selectImageFiles(selected);
    if (!accepted.length) { setError(fileGuidance); return; }
    busyRef.current = true;
    setError(null);
    startTransition(async () => {
      try {
        const current = await refreshPhotos();
        const existing = getPhotoSlots(current, maxPhotos)[targetSlot];
        // Don't overwrite a new photo added in another tab while this picker was open.
        if (existing?.id !== slotPhotoMap[targetSlot]?.id) throw new Error("The grid changed.");
        setStatus("Preparing photo...");
        const compressed = await imageCompression(accepted[0], { maxSizeMB: 0.55, maxWidthOrHeight: 1600, useWebWorker: true, fileType: "image/webp", initialQuality: 0.82 });
        setStatus(existing ? "Replacing photo..." : "Saving photo...");
        const saved = await savePhotoUpload({ supabase: createClient(), bucketName, userId, tripId, missionId, slot: targetSlot, file: compressed, existingPhoto: existing });
        setPhotos(current.filter(photo => photo.id !== saved.id).concat(saved));
        setStatus(`Photo ${targetSlot + 1} ${existing ? "replaced" : "saved"}.`);
        trackEvent({ eventName: isHunt ? "hunt_slot_filled" : "cover_slot_filled", tripId, metadata: { slotIndex: targetSlot, source } });
      } catch (failure) {
        setStatus(null); setError(photoErrorMessage(failure));
        trackEvent({ eventName: isHunt ? "hunt_upload_failed" : "cover_upload_failed", tripId, metadata: { source } });
      } finally {
        await refreshPhotos().catch(() => undefined);
        router.refresh(); busyRef.current = false;
      }
    });
  }

  function uploadBatch(files: File[]) {
    if (busyRef.current || !files.length) return;
    busyRef.current = true;
    setRetryFiles([]); setError(null);
    startTransition(async () => {
      let savedCount = 0;
      let remainingFiles = files;
      try {
        const current = await refreshPhotos();
        const emptySlots = getPhotoSlots(current, maxPhotos).flatMap((photo, index) => photo ? [] : [index]);
        if (!emptySlots.length) { setStatus("All frames are filled. Tap a photo to replace it."); return; }
        const unsavedFiles = files.filter(file => !current.some(photo => photo.id === getFileUploadId(file)));
        const queued = unsavedFiles.slice(0, emptySlots.length);
        remainingFiles = queued;
        for (const [index, file] of queued.entries()) {
          setStatus(`Saving photo ${index + 1} of ${queued.length}...`);
          const compressed = await imageCompression(file, { maxSizeMB: 0.55, maxWidthOrHeight: 1600, useWebWorker: true, fileType: "image/webp", initialQuality: 0.82 });
          const saved = await savePhotoUpload({ supabase: createClient(), bucketName, userId, tripId, missionId, slot: emptySlots[index], file: compressed, uploadId: getFileUploadId(file) });
          savedCount += 1;
          remainingFiles = queued.slice(index + 1);
          setPhotos(previous => [...previous.filter(photo => photo.id !== saved.id), saved]);
          trackEvent({ eventName: isHunt ? "hunt_slot_filled" : "cover_slot_filled", tripId, metadata: { slotIndex: emptySlots[index], source: "library_batch" } });
        }
        setStatus(`${savedCount} photo${savedCount === 1 ? "" : "s"} saved.${files.length > queued.length ? ` Only ${queued.length} frames were available.` : " Tap a photo to adjust it."}`);
        trackEvent({ eventName: isHunt ? "hunt_batch_uploaded" : "cover_batch_uploaded", tripId, metadata: { photoCount: savedCount } });
      } catch (failure) {
        setRetryFiles(remainingFiles);
        setStatus(null);
        setError(`${savedCount ? `${savedCount} photos saved. ` : ""}${photoErrorMessage(failure)}`);
        trackEvent({ eventName: isHunt ? "hunt_upload_failed" : "cover_upload_failed", tripId, metadata: { source: "library_batch", savedCount } });
      } finally {
        await refreshPhotos().catch(() => undefined);
        router.refresh(); busyRef.current = false;
      }
    });
  }

  function handleBatchFileSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    const { accepted, rejected } = selectImageFiles(files);
    if (rejected) { setError(`${rejected} unsupported photo${rejected === 1 ? "" : "s"}. ${fileGuidance} Please select supported photos.`); return; }
    uploadBatch(accepted);
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

        setPhotos(current => current.filter(photo => photo.id !== selectedPhoto.id));
        await supabase.storage.from(bucketName).remove([selectedPhoto.storage_path]).catch(() => undefined);

        trackEvent({
          eventName: isHunt ? "hunt_slot_cleared" : "cover_slot_cleared",
          tripId,
          metadata: {
            templateId: isHunt ? null : templateId,
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

  const retryButton = retryFiles.length ? <button type="button" className="button-secondary mt-3" disabled={isPending} onClick={() => uploadBatch(retryFiles)}>Retry {retryFiles.length} remaining photo{retryFiles.length === 1 ? "" : "s"}</button> : null;

  if (inline) {
    return (
      <>
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
          <div id={previewId} className={`cover-preview-shell${isHunt ? " hunt-slot-shell" : ""}`}>
            <div className="cover-preview-grid" style={{ gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${Math.ceil(maxPhotos / gridColumns)}, minmax(0, 1fr))` }}>
              {slotPhotoMap.map((photo, index) => (
                <div key={`inline-photo-${index}`} className={`cover-preview-cell ${getPhotoFilterClassName(templateId === "wild-memory-87" ? "wild-memory-87" : photo?.photo_filter)}`}>
                  {photo ? (() => {
                    const placement = getPosterPhotoPlacement(photo);
                    const isWildMemory = templateId === "wild-memory-87" || getPhotoFilterId(photo.photo_filter) === "wild-memory-87";
                    const imageStyle = { objectPosition: `${placement.focalX * 100}% ${placement.focalY * 100}%`, transform: `scale(${placement.zoom})`, transformOrigin: `${placement.focalX * 100}% ${placement.focalY * 100}%` };
                    return <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={getPhotoUrl(photo)} alt={`Template photo ${index + 1}`} className={getPhotoFilterClassName(isWildMemory ? "wild-memory-87" : "none")} style={imageStyle} />
                      {isWildMemory ? <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={getPhotoUrl(photo)} alt="" aria-hidden="true" className="photo-filter-channel photo-filter-channel-red" style={{ ...imageStyle, transform: `translateX(-3px) scale(${placement.zoom})` }} />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={getPhotoUrl(photo)} alt="" aria-hidden="true" className="photo-filter-channel photo-filter-channel-blue" style={{ ...imageStyle, transform: `translateX(3px) scale(${placement.zoom})` }} />
                      </> : null}
                    </>;
                  })() : <div className="cover-preview-placeholder" />}
                </div>
              ))}
            </div>
            {!isHunt && template.overlaySrc ? <Image src={template.overlaySrc} alt="" fill className="cover-preview-overlay" sizes="(min-width: 1024px) 680px, 100vw" /> : null}
            {!isHunt && template.isCustomTitle && (titleStyle === "purple" || titleStyle === "purple-stacked") ? <PurpleGlyphTitle title={title} stacked={titleStyle === "purple-stacked"} /> : null}
            <div className="cover-template-slot-layer" data-export-hidden="true">
              {templateSlots.map((slot, index) => {
                const hasPhoto = Boolean(slotPhotoMap[index]);
                const isNext = !hasPhoto && slotPhotoMap.findIndex(photo => !photo) === index;
                return (
                  <button
                    key={`${template.id}-inline-slot-${index}`}
                    type="button"
                    className={`cover-template-slot-button cover-template-inline-slot ${hasPhoto ? "is-filled" : "is-empty"} ${isNext ? "is-next" : ""}`}
                    style={{ left: `${slot.left * 100}%`, top: `${slot.top * 100}%`, width: `${slot.width * 100}%`, height: `${slot.height * 100}%` }}
                    disabled={isPending}
                    onClick={() => hasPhoto ? openCropEditor(index) : openPreferredPicker(index, false)}
                    aria-label={hasPhoto ? `Edit photo ${index + 1}` : isNext ? `Add next photo, slot ${index + 1}` : `Add photo ${index + 1}`}
                  >
                    <span className="cover-template-inline-add">{hasPhoto ? "Edit" : isNext ? "Next +" : "+"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        {isHunt && filledSlots < maxPhotos ? (
          <div className="cover-inline-momentum" data-export-hidden="true">
            <span>{filledSlots === 0 ? "Start with a set, or tap any frame." : `${filledSlots}/${maxPhotos} frames ready. Next slot is highlighted.`}</span>
            {filledSlots === 0 ? (
              <button
                type="button"
                className="button-secondary"
                disabled={isPending}
                onClick={() => {
                  trackEvent({ eventName: "hunt_batch_picker_opened", tripId, metadata: { filledSlots, maxPhotos } });
                  batchInputRef.current?.click();
                }}
              >
                Add up to {maxPhotos} photos
              </button>
            ) : null}
          </div>
        ) : null}
        {cropPhoto ? <dialog ref={cropDialogRef} className="cover-crop-modal" aria-label="Edit photo" onCancel={event => { event.preventDefault(); if (!isPending) setCropSlot(null); }}><div className="cover-crop-panel"><div className={`cover-crop-preview ${getPhotoFilterClassName(cropUsesWildMemory ? "wild-memory-87" : "none")}`}><FilteredCropImage photo={cropPhoto} focalX={cropX} focalY={cropY} zoom={cropZoom} isWildMemory={cropUsesWildMemory} /></div><div className="cover-crop-controls"><p className="eyebrow">Adjust photo {(cropSlot ?? 0) + 1}</p><label>Left / right<input type="range" min="0" max="1" step="0.01" value={cropX} onChange={(event) => setCropX(Number(event.target.value))} /></label><label>Up / down<input type="range" min="0" max="1" step="0.01" value={cropY} onChange={(event) => setCropY(Number(event.target.value))} /></label><label>Zoom<input type="range" min="1" max="2.5" step="0.01" value={cropZoom} onChange={(event) => setCropZoom(Number(event.target.value))} /></label>{templateId === "wild-memory-87" ? <p className="cover-filter-lock">Wild Memory &apos;87 is built into this template.</p> : <fieldset className="cover-filter-picker"><legend>Photo treatment</legend><div><button type="button" className={cropFilter === "none" ? "is-selected" : ""} onClick={() => setCropFilter("none")}>Original</button><button type="button" className={cropFilter === "wild-memory-87" ? "is-selected" : ""} onClick={() => setCropFilter("wild-memory-87")}>Wild Memory &apos;87</button></div><p>Warm grain, colour bleed, and a worn camcorder edge.</p></fieldset>}<div className="flex gap-3"><button type="button" className="button-secondary" disabled={isPending} onClick={() => { const slot = cropSlot ?? selectedSlot; setCropSlot(null); openPreferredPicker(slot, true); }}>Replace photo</button><button type="button" className="button-secondary" disabled={isPending} onClick={() => { setCropSlot(null); handleDelete(); }}>Remove photo</button></div><div className="flex gap-3"><button type="button" className="button-secondary flex-1" onClick={() => setCropSlot(null)}>Cancel</button><button type="button" className="button-primary flex-1" disabled={isPending} onClick={saveCrop}>Save photo</button></div></div></div></dialog> : null}
        {retryButton}
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
                        disabled={isPending}
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

      {retryButton}
      {status ? <FeedbackToast kind="success" message={status} onDismiss={() => setStatus(null)} /> : null}
      {error ? <FeedbackToast kind="error" message={error} onDismiss={() => setError(null)} /> : null}
    </>
  );
}

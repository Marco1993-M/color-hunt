export type PhotoFilterId = "none" | "wild-memory-87";

export function getPhotoFilterId(value: string | null | undefined): PhotoFilterId {
  return value === "wild-memory-87" ? "wild-memory-87" : "none";
}

export function getPhotoFilterClassName(value: string | null | undefined) {
  return getPhotoFilterId(value) === "wild-memory-87" ? "photo-filter-wild-memory" : "";
}

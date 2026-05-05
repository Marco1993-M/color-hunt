"use client";

import { useEffect } from "react";

type FeedbackToastProps = {
  kind: "success" | "error" | "info";
  message: string;
  onDismiss?: () => void;
};

export function FeedbackToast({ kind, message, onDismiss }: FeedbackToastProps) {
  useEffect(() => {
    if (!onDismiss || kind === "error") {
      return;
    }

    const timeoutId = window.setTimeout(onDismiss, 3600);
    return () => window.clearTimeout(timeoutId);
  }, [kind, onDismiss]);

  const toneClass =
    kind === "success"
      ? "border-[rgba(45,106,79,0.18)] bg-[rgba(240,250,245,0.95)] text-[#245640]"
      : kind === "error"
        ? "border-[rgba(166,30,30,0.18)] bg-[rgba(255,244,244,0.97)] text-[#8c1d1d]"
        : "border-[rgba(32,26,23,0.12)] bg-[rgba(255,251,246,0.96)] text-[rgba(32,26,23,0.78)]";

  return (
    <div className={`toast-shell ${toneClass}`}>
      <p className="pr-2 text-sm leading-6">{message}</p>
      {onDismiss ? (
        <button
          className="shrink-0 text-xs font-semibold uppercase tracking-[0.16em] opacity-70 transition-opacity hover:opacity-100"
          type="button"
          onClick={onDismiss}
        >
          Close
        </button>
      ) : null}
    </div>
  );
}

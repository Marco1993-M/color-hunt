import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getTripBundle } from "@/lib/data";
import { generatePosterExports } from "@/lib/poster-cache";
import { isPosterComplete } from "@/lib/poster";
import type { PosterExportFormatId } from "@/lib/poster-export";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { user } = await requireUser();
    const payload = (await request.json()) as {
      tripId?: string;
      formats?: PosterExportFormatId[];
      force?: boolean;
    };
    const tripId = payload.tripId?.trim();
    const formats = Array.isArray(payload.formats)
      ? payload.formats.filter((format): format is PosterExportFormatId =>
          format === "post" || format === "story" || format === "square",
        )
      : undefined;
    const force = payload.force === true;

    if (!tripId) {
      return NextResponse.json({ ok: false, error: "Missing tripId." }, { status: 400 });
    }

    const bundle = await getTripBundle(tripId, user.id);

    if (!bundle) {
      return NextResponse.json({ ok: false, error: "Trip not found." }, { status: 404 });
    }

    if (!isPosterComplete(bundle.photos, bundle.mission.max_photos)) {
      return NextResponse.json({ ok: false, error: "Poster is not complete yet." }, { status: 409 });
    }

    const exports = await generatePosterExports({
      trip: bundle.trip,
      mission: bundle.mission,
      photos: bundle.photos,
      formats,
      force,
    });

    return NextResponse.json({
      ok: true,
      exports,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Poster export generation failed.",
      },
      { status: 500 },
    );
  }
}

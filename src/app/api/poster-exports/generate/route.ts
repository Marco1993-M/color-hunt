import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getTripBundle } from "@/lib/data";
import { generatePosterExports } from "@/lib/poster-cache";
import { isPosterComplete } from "@/lib/poster";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { user } = await requireUser();
    const payload = (await request.json()) as { tripId?: string };
    const tripId = payload.tripId?.trim();

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

    const origin = new URL(request.url).origin;
    const exports = await generatePosterExports({
      origin,
      trip: bundle.trip,
      mission: bundle.mission,
      photos: bundle.photos,
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

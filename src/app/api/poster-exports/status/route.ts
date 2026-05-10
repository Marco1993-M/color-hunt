import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getPosterExportForTrip, getTripBundle } from "@/lib/data";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { user } = await requireUser();
    const { searchParams } = new URL(request.url);
    const tripId = searchParams.get("tripId")?.trim();

    if (!tripId) {
      return NextResponse.json({ ok: false, error: "Missing tripId." }, { status: 400 });
    }

    const bundle = await getTripBundle(tripId, user.id);

    if (!bundle) {
      return NextResponse.json({ ok: false, error: "Trip not found." }, { status: 404 });
    }

    const [postExport, storyExport, squareExport] = await Promise.all([
      getPosterExportForTrip(tripId, "post"),
      getPosterExportForTrip(tripId, "story"),
      getPosterExportForTrip(tripId, "square"),
    ]);

    return NextResponse.json({
      ok: true,
      exports: {
        post: postExport?.image_url ?? null,
        story: storyExport?.image_url ?? null,
        square: squareExport?.image_url ?? null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Poster export status check failed.",
      },
      { status: 500 },
    );
  }
}

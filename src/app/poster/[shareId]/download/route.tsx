import { getPosterExportForTrip, getPublicTripBundleByShareId } from "@/lib/data";
import { isPosterComplete } from "@/lib/poster";
import { getPosterExportFormat } from "@/lib/poster-export";
import { createPosterImageResponse, getPosterExportFileName } from "@/lib/poster-render";

export const runtime = "nodejs";

type RouteProps = {
  params: Promise<{ shareId: string }>;
};

export async function GET(request: Request, { params }: RouteProps) {
  try {
    const { shareId } = await params;
    const bundle = await getPublicTripBundleByShareId(shareId);

    if (!bundle) {
      return new Response("Poster not found.", { status: 404 });
    }

    if (!isPosterComplete(bundle.photos, bundle.mission.max_photos)) {
      return new Response("Poster is not complete yet.", { status: 409 });
    }

    const { searchParams } = new URL(request.url);
    const format = getPosterExportFormat(searchParams.get("format"));
    const disposition = searchParams.get("disposition") === "inline" ? "inline" : "attachment";
    const fileName = getPosterExportFileName(bundle.trip.location, format.id);
    const cachedExport = await getPosterExportForTrip(bundle.trip.id, format.id);

    if (cachedExport?.image_url) {
      try {
        const cachedResponse = await fetch(cachedExport.image_url, {
          cache: "no-store",
        });

        if (cachedResponse.ok) {
          return new Response(await cachedResponse.arrayBuffer(), {
            headers: {
              "content-type": cachedResponse.headers.get("content-type") ?? "image/png",
              "content-disposition": `${disposition}; filename="${fileName}"`,
              "cache-control": "public, max-age=300",
            },
          });
        }
      } catch {
        // Fall through to on-demand generation if the cached asset can't be read.
      }
    }

    const imageResponse = await createPosterImageResponse({
      origin: new URL(request.url).origin,
      trip: bundle.trip,
      mission: bundle.mission,
      photos: bundle.photos,
      formatId: format.id,
    });

    return new Response(await imageResponse.arrayBuffer(), {
      headers: {
        "content-type": "image/png",
        "content-disposition": `${disposition}; filename="${fileName}"`,
        "cache-control": "public, max-age=300",
      },
    });
  } catch (error) {
    console.error("poster download failed", error);
    return new Response("Poster download failed.", { status: 500 });
  }
}

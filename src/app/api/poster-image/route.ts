import { NextResponse } from "next/server";
import { getSupabaseEnv } from "@/lib/env";

function isAllowedPosterImageUrl(value: string) {
  try {
    const source = new URL(value);
    const { url, storageBucket } = getSupabaseEnv();
    const supabase = new URL(url);

    if (source.origin !== supabase.origin) {
      return false;
    }

    return source.pathname.startsWith(`/storage/v1/object/public/${storageBucket}/`);
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get("src");

  if (!source || !isAllowedPosterImageUrl(source)) {
    return NextResponse.json({ error: "Invalid image source" }, { status: 400 });
  }

  const response = await fetch(source, {
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Image fetch failed" }, { status: 502 });
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  const arrayBuffer = await response.arrayBuffer();

  return new NextResponse(arrayBuffer, {
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=300",
    },
  });
}

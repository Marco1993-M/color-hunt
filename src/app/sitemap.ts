import type { MetadataRoute } from "next";
import { getAppOrigin } from "@/lib/app-url";
import { getPublicTripsForSitemap } from "@/lib/data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getAppOrigin() || "https://colorhunt.quest";
  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: origin,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];

  const publicTrips = await getPublicTripsForSitemap();
  const posterEntries: MetadataRoute.Sitemap = publicTrips.map((trip) => ({
    url: `${origin}/poster/${trip.share_id}`,
    lastModified: trip.created_at,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...staticEntries, ...posterEntries];
}

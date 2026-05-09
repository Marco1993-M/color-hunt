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
    {
      url: `${origin}/color-scavenger-hunt`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${origin}/travel-photo-challenge`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${origin}/turn-travel-photos-into-a-poster`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.76,
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

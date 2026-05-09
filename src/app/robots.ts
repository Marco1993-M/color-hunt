import type { MetadataRoute } from "next";
import { getAppOrigin } from "@/lib/app-url";

export default function robots(): MetadataRoute.Robots {
  const origin = getAppOrigin() || "https://colorhunt.quest";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/trips", "/auth", "/api"],
    },
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}

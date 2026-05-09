import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Color Hunt",
    short_name: "Color Hunt",
    description:
      "Turn travel into a color game. Hunt one color, collect nine moments, and make a poster worth sharing.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4efe7",
    theme_color: "#f4efe7",
    icons: [
      {
        src: "/favicon.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/favicon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}

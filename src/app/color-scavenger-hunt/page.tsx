import type { Metadata } from "next";
import { TopicPageShell } from "@/components/marketing/topic-page-shell";

export const metadata: Metadata = {
  title: "Color Scavenger Hunt ideas for travel, cities, and photo walks",
  description:
    "A playful guide to running a color scavenger hunt. Use one color, nine moments, and a simple prompt to make city walks, travel days, and photo walks feel more alive.",
  alternates: {
    canonical: "/color-scavenger-hunt",
  },
};

export default function ColorScavengerHuntPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Color Scavenger Hunt ideas for travel, cities, and photo walks",
    description:
      "A playful guide to running a color scavenger hunt with one color, nine moments, and a shareable poster at the end.",
    mainEntityOfPage: "https://colorhunt.quest/color-scavenger-hunt",
    author: {
      "@type": "Organization",
      name: "Color Hunt",
    },
    publisher: {
      "@type": "Organization",
      name: "Color Hunt",
    },
  };

  return (
    <TopicPageShell
      eyebrow="Color scavenger hunt"
      title="A color scavenger hunt makes ordinary walks feel like a game."
      description="Pick one color, let it lead your eye, and collect nine small details you would have missed otherwise. It works for travel days, neighborhood walks, and any photo outing that needs a point of view."
      accentClass="bg-[#ffeddc] text-[#e66a2f]"
      chips={["Orange Hunt", "Blue Hunt", "Market Walk", "Nine Finds"]}
      introTitle="What makes it work"
      introBody="A good color scavenger hunt is simple enough to start immediately and specific enough to sharpen attention. Instead of trying to photograph everything, you give people one small rule and let that rule do the magic."
      ideasTitle="Try this"
      ideas={[
        {
          title: "Pick one loud color",
          description:
            "Orange, blue, red, or pink are easy to spot quickly and make the hunt feel rewarding from the first few minutes.",
        },
        {
          title: "Stay in one area",
          description:
            "A single market lane, one block, one museum floor, or one beach town is enough. Constraint makes the results stronger.",
        },
        {
          title: "Stop at nine",
          description:
            "Nine images gives the hunt a satisfying finish line and creates a neat poster grid at the end instead of an endless camera roll.",
        },
      ]}
      stepsTitle="How to run it"
      steps={[
        {
          title: "Start with the place, not the perfect shot",
          description:
            "Begin wherever you are already moving. The fun comes from noticing overlooked details, not hunting for iconic postcard moments.",
        },
        {
          title: "Use the color as your filter",
          description:
            "Look for signs, food, paint, chairs, tiles, flowers, traffic cones, menus, packaging, and tiny repeated hits of the same tone.",
        },
        {
          title: "Turn it into something shareable",
          description:
            "Once you have nine moments, a clean poster or grid makes the scavenger hunt feel finished and worth sending to someone else.",
        },
      ]}
      payoffTitle="The point is not just collecting color. It is seeing a place differently."
      payoffBody="That is why color scavenger hunts work so well. They add a playful rule, give the walk a shape, and leave you with a visual artifact that feels far more personal than random vacation snapshots."
      relatedLinks={[
        { href: "/travel-photo-challenge", label: "Travel photo challenge ideas" },
        { href: "/turn-travel-photos-into-a-poster", label: "Turn travel photos into a poster" },
        { href: "/", label: "Start a real Color Hunt" },
      ]}
      jsonLd={jsonLd}
    />
  );
}

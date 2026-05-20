import type { Metadata } from "next";
import { TopicPageShell } from "@/components/marketing/topic-page-shell";

export const metadata: Metadata = {
  title: "City photo challenge ideas for streets, neighborhoods, and weekend walks",
  description:
    "Use a city photo challenge to make ordinary streets more interesting. One color, nine moments, and a clean poster payoff turns a walk through town into something memorable.",
  alternates: {
    canonical: "/city-photo-challenge",
  },
};

export default function CityPhotoChallengePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "City photo challenge ideas for streets, neighborhoods, and weekend walks",
    description:
      "A practical guide to running a city photo challenge with one color, nine moments, and a sharable poster at the end.",
    mainEntityOfPage: "https://colorhunt.quest/city-photo-challenge",
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
      eyebrow="City photo challenge"
      title="A city photo challenge makes familiar streets feel more alive."
      description="Cities are full of repeat patterns, hidden color, and overlooked details. A simple one-color prompt turns a normal walk into a playful city photo challenge with a much cleaner result at the end."
      accentClass="bg-[#e9f5ff] text-[#2574d9]"
      chips={["Street details", "Weekend walk", "Neighborhood game", "Nine frames"]}
      introTitle="Why cities work so well"
      introBody="A city gives you density. Signs, food packaging, tiles, traffic cones, painted doors, fashion, bikes, buses, and windows all become material once you stop trying to capture everything at once."
      ideasTitle="Best use cases"
      ideas={[
        {
          title: "One neighborhood, one color",
          description:
            "Staying inside a single district makes the finished poster feel more coherent and gives the walk a clear boundary.",
        },
        {
          title: "A rainy-day city prompt",
          description:
            "When a place feels less scenic, a simple city photo challenge gives the outing a reason and a structure.",
        },
        {
          title: "A better weekend walk",
          description:
            "Instead of wandering without focus, the challenge gives your walk a small mission and a satisfying end point.",
        },
      ]}
      stepsTitle="How to do it"
      steps={[
        {
          title: "Choose a color that will repeat well",
          description:
            "Blue, yellow, orange, and red tend to work especially well in cities because you see them in signs, transport, packaging, and street furniture.",
        },
        {
          title: "Mix big and small moments",
          description:
            "Use a few wider city frames, then balance them with tighter shots of menus, corners, textures, and useful little urban details.",
        },
        {
          title: "Stop when the grid feels full",
          description:
            "Nine moments is enough to make the city challenge feel like a finished object rather than a never-ending photo assignment.",
        },
      ]}
      payoffTitle="A city photo challenge gives ordinary streets a stronger story."
      payoffBody="That is why it works so well for neighborhoods you already know and cities you are seeing for the first time. The challenge does not just document the walk. It gives the place a lens."
      relatedLinks={[
        { href: "/color-scavenger-hunt", label: "Color scavenger hunt ideas" },
        { href: "/travel-photo-challenge", label: "Travel photo challenge guide" },
        { href: "/photo-walk-ideas", label: "Photo walk ideas" },
        { href: "/creative-travel-activities", label: "Creative travel activities" },
        { href: "/", label: "Start a city Color Hunt" },
      ]}
      faqs={[
        {
          question: "What is a city photo challenge?",
          answer:
            "A city photo challenge is a simple prompt for exploring streets with more intent. In Color Hunt, one color becomes the theme and nine moments become the final set.",
        },
        {
          question: "What should I photograph in a city challenge?",
          answer:
            "Look for street signs, buses, market stalls, painted walls, menus, fruit stands, doors, windows, fashion, and repeated textures that share the same tone.",
        },
        {
          question: "How long should a city photo challenge take?",
          answer:
            "A good city challenge can work in under an hour, but it also scales well across a whole day if you want the photos to reflect different corners of the same place.",
        },
      ]}
      jsonLd={jsonLd}
    />
  );
}

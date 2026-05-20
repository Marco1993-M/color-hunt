import type { Metadata } from "next";
import { TopicPageShell } from "@/components/marketing/topic-page-shell";

export const metadata: Metadata = {
  title: "Photo walk ideas that are simple, playful, and easy to finish",
  description:
    "Try photo walk ideas that give your camera roll a point of view. A one-color mission, nine moments, and a poster payoff make photo walks feel more creative and more memorable.",
  alternates: {
    canonical: "/photo-walk-ideas",
  },
};

export default function PhotoWalkIdeasPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Photo walk ideas that are simple, playful, and easy to finish",
    description:
      "A guide to better photo walk ideas using one color, a short frame count, and a simple output you actually want to save.",
    mainEntityOfPage: "https://colorhunt.quest/photo-walk-ideas",
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
      eyebrow="Photo walk ideas"
      title="The best photo walk ideas give you a lens, not a checklist."
      description="Most photo walks are more fun when they come with one small rule. A color-led prompt is easy to follow, light enough for a casual walk, and structured enough to make the finished photos feel intentional."
      accentClass="bg-[#fff1db] text-[#d56f2d]"
      chips={["Casual photo walk", "One color", "Nine moments", "Simple prompt"]}
      introTitle="Why one idea is enough"
      introBody="You do not need fifty prompts to make a walk creative. One color can shape what you notice, help you edit more confidently, and make the final set feel stronger without taking over the day."
      ideasTitle="Try these"
      ideas={[
        {
          title: "A single-color walk",
          description:
            "Follow one tone through signs, flowers, fashion, shadows, food, windows, and random little details you would normally miss.",
        },
        {
          title: "A market or café route",
          description:
            "Busy places are great for photo walks because there are so many small objects and repeated textures to collect quickly.",
        },
        {
          title: "A one-hour local walk",
          description:
            "Even a familiar route feels more interesting once the camera has a simple rule to obey.",
        },
      ]}
      stepsTitle="Make it feel effortless"
      steps={[
        {
          title: "Choose a prompt before you start walking",
          description:
            "Making the decision early means you spend the walk noticing more and second-guessing less.",
        },
        {
          title: "Collect contrast, texture, and scale",
          description:
            "A stronger photo walk set usually mixes wide scenes with tight details so the final poster feels varied without becoming chaotic.",
        },
        {
          title: "End while it still feels playful",
          description:
            "A short photo walk with a clear ending often produces a better final result than a long one that loses focus halfway through.",
        },
      ]}
      payoffTitle="Good photo walk ideas make editing easier too."
      payoffBody="Because the photos already belong together, the final set feels tighter, the selection feels faster, and the finished artifact feels more like a design object than a random folder of images."
      relatedLinks={[
        { href: "/color-scavenger-hunt", label: "Color scavenger hunt ideas" },
        { href: "/city-photo-challenge", label: "City photo challenge ideas" },
        { href: "/travel-photo-challenge", label: "Travel photo challenge guide" },
        { href: "/creative-travel-activities", label: "Creative travel activities" },
        { href: "/", label: "Start a Color Hunt walk" },
      ]}
      faqs={[
        {
          question: "What are good photo walk ideas for beginners?",
          answer:
            "The best beginner photo walk ideas are simple enough to remember while walking. One color is ideal because it is easy to spot and creates a clear visual thread across the final images.",
        },
        {
          question: "How many photos should a photo walk aim for?",
          answer:
            "A small number is often better than a huge one. Nine good frames gives the walk a finish line and makes the final edit feel much less overwhelming.",
        },
        {
          question: "Can a photo walk idea work in an ordinary neighborhood?",
          answer:
            "Absolutely. Familiar places often work especially well because the prompt forces you to notice details you usually ignore.",
        },
      ]}
      jsonLd={jsonLd}
    />
  );
}

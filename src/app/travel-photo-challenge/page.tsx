import type { Metadata } from "next";
import { TopicPageShell } from "@/components/marketing/topic-page-shell";

export const metadata: Metadata = {
  title: "Travel photo challenge ideas that feel playful, simple, and worth sharing",
  description:
    "Try a travel photo challenge that is easy to start and fun to finish. One color, nine moments, and a poster payoff turns any trip, city break, or day walk into a sharable photo game.",
  alternates: {
    canonical: "/travel-photo-challenge",
  },
};

export default function TravelPhotoChallengePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Travel photo challenge ideas that feel playful, simple, and worth sharing",
    description:
      "A guide to better travel photo challenges using one color, nine moments, and a clear payoff.",
    mainEntityOfPage: "https://colorhunt.quest/travel-photo-challenge",
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
      eyebrow="Travel photo challenge"
      title="A better travel photo challenge gives the day a point of view."
      description="Most photo challenges fail because they are too vague. A great travel photo challenge is easy to understand, playful to follow, and satisfying to finish with something you actually want to keep."
      accentClass="bg-[#e4efff] text-[#2f61df]"
      chips={["Travel day", "City break", "Beach town", "Photo challenge"]}
      introTitle="Why this feels better"
      introBody="Instead of telling people to capture anything beautiful, a Color Hunt gives them one filter. One color is enough to make a new place feel more vivid and to turn a wandering afternoon into a creative little mission."
      ideasTitle="Use it for"
      ideas={[
        {
          title: "One afternoon in a new city",
          description:
            "Pick a neighborhood, choose a color, and let the challenge shape how you move through side streets, cafés, and storefronts.",
        },
        {
          title: "A shared holiday prompt",
          description:
            "Friends or partners can take the same challenge in the same place and end up with completely different posters from the same day.",
        },
        {
          title: "A travel keepsake that is not cheesy",
          description:
            "The best travel photo challenge leaves you with something cleaner than a random dump of images and more personal than a generic postcard.",
        },
      ]}
      stepsTitle="How to make it click"
      steps={[
        {
          title: "Keep the rule tiny",
          description:
            "One color is memorable, portable, and easy to explain. It travels well across cities, beaches, markets, and road trips.",
        },
        {
          title: "Aim for repeatable moments",
          description:
            "Good prompts help people spot patterns in signs, food, transport, furniture, fashion, and small bits of street life.",
        },
        {
          title: "End with a visual souvenir",
          description:
            "The poster matters because it turns the challenge into a finished travel object, not just a set of loose images buried in your gallery.",
        },
      ]}
      payoffTitle="A travel photo challenge should leave you with more than a task list."
      payoffBody="It should create momentum while you are out in the world and give you an artifact afterward. That combination is what makes Color Hunt feel more like a game and less like homework."
      relatedLinks={[
        { href: "/color-scavenger-hunt", label: "Color scavenger hunt guide" },
        { href: "/city-photo-challenge", label: "City photo challenge ideas" },
        { href: "/photo-walk-ideas", label: "Photo walk ideas" },
        { href: "/turn-travel-photos-into-a-poster", label: "Turn travel photos into a poster" },
        { href: "/creative-travel-activities", label: "Creative travel activities" },
        { href: "/", label: "Start a Color Hunt" },
      ]}
      faqs={[
        {
          question: "What makes a travel photo challenge fun instead of awkward?",
          answer:
            "The best travel photo challenges are easy to explain, easy to start, and give the day a clear point of view. One color works because it is playful without becoming complicated.",
        },
        {
          question: "Can a travel photo challenge work for groups?",
          answer:
            "Yes. Group travel photo challenges work especially well when each person gets a different color or angle, because everyone ends up with a different result from the same place.",
        },
        {
          question: "What should the outcome of a travel photo challenge be?",
          answer:
            "A finished artifact helps most. Turning the set into a poster, story card, or collage makes the challenge feel complete and worth sharing.",
        },
      ]}
      jsonLd={jsonLd}
    />
  );
}

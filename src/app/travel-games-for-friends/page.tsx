import type { Metadata } from "next";
import { TopicPageShell } from "@/components/marketing/topic-page-shell";

export const metadata: Metadata = {
  title: "Travel games for friends that feel creative, easy, and worth sharing",
  description:
    "Looking for travel games for friends? A color-based group photo challenge turns one day, one place, and nine moments into a playful shared activity with a poster payoff.",
  alternates: {
    canonical: "/travel-games-for-friends",
  },
};

export default function TravelGamesForFriendsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Travel games for friends that feel creative, easy, and worth sharing",
    description:
      "A guide to travel games for friends built around a simple color challenge and a finished visual artifact.",
    mainEntityOfPage: "https://colorhunt.quest/travel-games-for-friends",
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
      eyebrow="Travel games for friends"
      title="Travel games for friends work best when they are easy to start and fun to compare."
      description="The best travel games for friends do not need much equipment or setup. A color-led challenge gives the trip a playful structure, creates good group energy, and leaves everyone with something better than a scattered photo dump."
      accentClass="bg-[#fff1db] text-[#d56f2d]"
      chips={["Friends trip", "Road trip idea", "Beach weekend", "Group activity"]}
      introTitle="Why a color game works"
      introBody="A color mission is a strong travel game because it is low friction. Everyone understands it quickly, but the results still feel personal because each person notices a different side of the same place."
      ideasTitle="Great use cases"
      ideas={[
        {
          title: "Road trips and stopovers",
          description:
            "A quick challenge gives everyone something to do at the same stop instead of just taking the same scenic photo over and over again.",
        },
        {
          title: "Beach or city weekends",
          description:
            "A shared game adds energy to a relaxed day and gives people a reason to notice more than the obvious landmarks.",
        },
        {
          title: "Friend-group memory keeping",
          description:
            "The challenge becomes more meaningful when each person ends up with a poster or collage that reflects their own point of view.",
        },
      ]}
      stepsTitle="How to keep it fun"
      steps={[
        {
          title: "Assign one color per person",
          description:
            "This keeps the game simple while making the final results more varied and more rewarding to compare.",
        },
        {
          title: "Keep the frame count low",
          description:
            "Nine moments is enough to make the challenge feel complete without making people feel like they are doing homework on the trip.",
        },
        {
          title: "Finish with a shareable artifact",
          description:
            "A game becomes much more memorable when it leaves you with a poster, collage, or group result that feels worth keeping.",
        },
      ]}
      payoffTitle="Good travel games for friends give the trip a little structure without making it feel managed."
      payoffBody="That is the sweet spot. You want something playful enough to create momentum, but light enough that it still feels like part of the trip rather than a separate assignment."
      relatedLinks={[
        { href: "/group-photo-challenge", label: "Group photo challenge ideas" },
        { href: "/weekend-activities-with-friends", label: "Weekend activities with friends" },
        { href: "/creative-travel-activities", label: "Creative travel activities" },
        { href: "/travel-photo-challenge", label: "Travel photo challenge guide" },
        { href: "/", label: "Start a travel Color Hunt" },
      ]}
      faqs={[
        {
          question: "What are good travel games for friends?",
          answer:
            "The best travel games for friends are easy to start, easy to explain, and fit naturally into the outing. A color-based photo challenge works well because it turns the day into a shared game without needing much setup.",
        },
        {
          question: "Can a travel game still feel stylish and worth posting?",
          answer:
            "Yes. When the game ends with a poster or collage, it feels much more intentional and premium than a throwaway challenge with no payoff.",
        },
        {
          question: "What is a good travel game for people who all like taking photos?",
          answer:
            "A group color challenge is a strong fit because it gives each person a unique prompt and creates results that are easy to compare afterward.",
        },
      ]}
      jsonLd={jsonLd}
    />
  );
}

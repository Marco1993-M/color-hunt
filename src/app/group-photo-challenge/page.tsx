import type { Metadata } from "next";
import { TopicPageShell } from "@/components/marketing/topic-page-shell";

export const metadata: Metadata = {
  title: "Group photo challenge ideas for friends, trips, and shared outings",
  description:
    "A group photo challenge is a simple way to make trips, birthdays, and weekends with friends more memorable. Give everyone a color, collect nine moments, and end with a poster.",
  alternates: {
    canonical: "/group-photo-challenge",
  },
};

export default function GroupPhotoChallengePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Group photo challenge ideas for friends, trips, and shared outings",
    description:
      "A practical guide to running a group photo challenge where everyone gets a prompt and the day ends with something worth sharing.",
    mainEntityOfPage: "https://colorhunt.quest/group-photo-challenge",
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
      eyebrow="Group photo challenge"
      title="A group photo challenge turns one shared day into something everyone sees differently."
      description="The best group photo challenges are easy to explain and fun to compare afterward. Giving each person a color creates just enough structure to make the outing feel playful without making it complicated."
      accentClass="bg-[#e9f7ef] text-[#2a9d84]"
      chips={["Friends trip", "Birthday idea", "Group game", "One color each"]}
      introTitle="Why it works in groups"
      introBody="A shared photo challenge gives everyone the same place and a different lens. That is what makes the final result interesting. People are doing the same activity, but they are not chasing the same photos."
      ideasTitle="Best moments for it"
      ideas={[
        {
          title: "Trips with friends",
          description:
            "A group photo challenge gives the day a shape and creates a much better souvenir than a random camera roll full of overlapping photos.",
        },
        {
          title: "Birthdays and celebrations",
          description:
            "It is playful enough to break the ice and simple enough to explain quickly, even when people are already in motion.",
        },
        {
          title: "Shared city or beach days",
          description:
            "Everyone can explore the same place with a different color prompt and end up with a totally different poster from the same outing.",
        },
      ]}
      stepsTitle="How to make it land"
      steps={[
        {
          title: "Give each person one unique color",
          description:
            "The group challenge gets stronger when every person has their own mission. That creates contrast in the final results without adding complexity.",
        },
        {
          title: "Keep the rules short",
          description:
            "One place, one color, nine moments. The cleaner the instruction, the easier it is for everyone to jump in without overthinking it.",
        },
        {
          title: "Compare the results at the end",
          description:
            "The payoff is not only the individual posters. It is seeing how differently everyone interpreted the same day.",
        },
      ]}
      payoffTitle="A group photo challenge gives the day a shared story and individual points of view."
      payoffBody="That combination is what makes the format so strong. It works as an activity while people are together, and it creates something worth comparing and sharing once the day is done."
      relatedLinks={[
        { href: "/travel-games-for-friends", label: "Travel games for friends" },
        { href: "/weekend-activities-with-friends", label: "Weekend activities with friends" },
        { href: "/travel-photo-challenge", label: "Travel photo challenge guide" },
        { href: "/creative-travel-activities", label: "Creative travel activities" },
        { href: "/", label: "Start a group Color Hunt" },
      ]}
      faqs={[
        {
          question: "What is a good group photo challenge?",
          answer:
            "A good group photo challenge is easy to explain, quick to start, and gives each person a slightly different mission. One color per person is a simple way to do that well.",
        },
        {
          question: "How many people can do a group photo challenge?",
          answer:
            "Small groups work especially well because everyone gets a clear role. Two to nine people is a strong range for a color-based challenge.",
        },
        {
          question: "What makes a group photo challenge worth sharing?",
          answer:
            "The best ones end with something tangible. Individual posters and a combined group result make the challenge feel finished and much more memorable.",
        },
      ]}
      jsonLd={jsonLd}
    />
  );
}

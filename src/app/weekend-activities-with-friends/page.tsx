import type { Metadata } from "next";
import { TopicPageShell } from "@/components/marketing/topic-page-shell";

export const metadata: Metadata = {
  title: "Weekend activities with friends that feel creative and actually memorable",
  description:
    "A color-led group challenge is one of the easiest weekend activities with friends to start. One place, one color each, and a poster payoff turns a normal day into something worth sharing.",
  alternates: {
    canonical: "/weekend-activities-with-friends",
  },
};

export default function WeekendActivitiesWithFriendsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Weekend activities with friends that feel creative and actually memorable",
    description:
      "A guide to weekend activities with friends built around a playful shared photo challenge and a stronger visual outcome.",
    mainEntityOfPage: "https://colorhunt.quest/weekend-activities-with-friends",
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
      eyebrow="Weekend activities with friends"
      title="Weekend activities with friends feel better when they create a story, not just a plan."
      description="A shared color challenge is an easy weekend activity because it works in almost any place. It adds a playful rule to the day, gets everyone involved, and leaves you with something much more memorable than a normal camera roll."
      accentClass="bg-[#e7f0ff] text-[#2f61df]"
      chips={["Weekend idea", "Friends activity", "Low planning", "Shared poster"]}
      introTitle="Why this is a good weekend format"
      introBody="The best weekend activities with friends are social, lightweight, and easy to start. A color mission works because it adds structure without needing lots of setup, equipment, or logistics."
      ideasTitle="Use it for"
      ideas={[
        {
          title: "A city afternoon",
          description:
            "Neighborhoods, cafés, markets, and side streets all become more interesting once everyone has a different lens on the same place.",
        },
        {
          title: "A beach or park day",
          description:
            "Even relaxed weekend plans get a playful boost when there is a simple mission running in the background.",
        },
        {
          title: "A birthday or celebration",
          description:
            "A group challenge gives the day a clearer shape and helps people leave with something more memorable than a few random snapshots.",
        },
      ]}
      stepsTitle="How to make it click"
      steps={[
        {
          title: "Choose one place",
          description:
            "A tighter boundary helps the whole group feel like they are playing the same game, even if everyone is noticing different details.",
        },
        {
          title: "Give each person a different color",
          description:
            "That creates immediate variation and makes the final group reveal much more satisfying.",
        },
        {
          title: "Compare the results before the day ends",
          description:
            "The activity lands best when people can actually see how the same outing turned into totally different visual outcomes.",
        },
      ]}
      payoffTitle="The best weekend activities with friends become part of the story you tell afterward."
      payoffBody="That is why a color-based group challenge works. It gives the day a clear little arc while you are in it and a poster or collage once it is over."
      relatedLinks={[
        { href: "/group-photo-challenge", label: "Group photo challenge ideas" },
        { href: "/travel-games-for-friends", label: "Travel games for friends" },
        { href: "/city-photo-challenge", label: "City photo challenge ideas" },
        { href: "/creative-travel-activities", label: "Creative travel activities" },
        { href: "/", label: "Start a weekend Color Hunt" },
      ]}
      faqs={[
        {
          question: "What are fun weekend activities with friends that are easy to organize?",
          answer:
            "Activities that need very little setup tend to work best. A shared color challenge is a strong option because it can fit a city walk, a café route, a beach day, or a park outing without much planning.",
        },
        {
          question: "Why does a group photo challenge work well for weekends?",
          answer:
            "It gives the day a playful rule without taking over the whole plan. People can still relax, wander, eat, and hang out while the challenge quietly adds structure.",
        },
        {
          question: "What makes a weekend activity feel memorable afterward?",
          answer:
            "A real outcome helps. When the day ends with posters or a combined result, the activity feels more meaningful than something that disappears as soon as it is over.",
        },
      ]}
      jsonLd={jsonLd}
    />
  );
}

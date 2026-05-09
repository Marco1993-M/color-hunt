import type { Metadata } from "next";
import { TopicPageShell } from "@/components/marketing/topic-page-shell";

export const metadata: Metadata = {
  title: "How to turn travel photos into a poster that feels personal and clean",
  description:
    "Learn how to turn travel photos into a poster without making it feel cluttered. A single color mission, nine moments, and a simple layout creates a keepsake that is worth saving and sharing.",
  alternates: {
    canonical: "/turn-travel-photos-into-a-poster",
  },
};

export default function TurnTravelPhotosIntoPosterPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to turn travel photos into a poster",
    description:
      "A simple method for turning travel photos into a personal poster using one color and nine moments.",
    totalTime: "PT20M",
    step: [
      { "@type": "HowToStep", name: "Choose one color", text: "Pick a single color to guide the whole set." },
      { "@type": "HowToStep", name: "Collect nine moments", text: "Look for repeated details that fit the same palette." },
      { "@type": "HowToStep", name: "Arrange and export", text: "Turn the set into a clean poster that is easy to save and share." },
    ],
    mainEntityOfPage: "https://colorhunt.quest/turn-travel-photos-into-a-poster",
  };

  return (
    <TopicPageShell
      eyebrow="Travel photo poster"
      title="Turn travel photos into a poster instead of a camera roll graveyard."
      description="A poster works best when the images belong together. One color gives the set a shared mood, nine moments gives it a clean endpoint, and the final layout makes the day feel like a finished artifact instead of a loose folder of pictures."
      accentClass="bg-[#ffe7f5] text-[#d85dac]"
      chips={["Poster layout", "Nine moments", "Color-led", "Save and share"]}
      introTitle="What makes a good poster"
      introBody="The trick is not adding more design. It is making the photo set itself more coherent. When the images already speak the same visual language, the poster can stay simple and still feel strong."
      ideasTitle="Focus on"
      ideas={[
        {
          title: "One palette, not everything",
          description:
            "A poster becomes more striking when the images feel related. One color is an easy way to create that connection without overthinking it.",
        },
        {
          title: "Nine images, not fifty",
          description:
            "A tighter edit makes the final artifact cleaner. Nine moments feels complete without turning the selection process into a headache.",
        },
        {
          title: "Everyday details, not only landmarks",
          description:
            "Benches, menus, paint, fruit, beach gear, doors, signs, and transport often make a more characterful poster than obvious tourist shots.",
        },
      ]}
      stepsTitle="Simple process"
      steps={[
        {
          title: "Choose the color first",
          description:
            "This gives the whole poster a visual spine and helps you avoid a final grid that feels random or messy.",
        },
        {
          title: "Collect nine small hits",
          description:
            "The best sets mix texture, object shots, street details, and one or two wider frames so the poster feels alive rather than repetitive.",
        },
        {
          title: "Export in a format made for sharing",
          description:
            "A clean 4:5, square, or story-sized poster makes the result easy to save, post, and send to friends without extra editing.",
        },
      ]}
      payoffTitle="A poster gives your travel photos a shape, not just a storage location."
      payoffBody="That is the real value. Instead of disappearing into the gallery, the trip becomes one colorful object you can revisit, share, or challenge someone else to make in their own way."
      relatedLinks={[
        { href: "/color-scavenger-hunt", label: "Color scavenger hunt ideas" },
        { href: "/travel-photo-challenge", label: "Travel photo challenge guide" },
        { href: "/", label: "Make a Color Hunt poster" },
      ]}
      jsonLd={jsonLd}
    />
  );
}

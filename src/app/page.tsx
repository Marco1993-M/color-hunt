import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { redirect } from "next/navigation";
import { EventOnView } from "@/components/analytics/event-on-view";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { SessionLandingRedirect } from "@/components/auth/session-landing-redirect";
import { createClient } from "@/lib/supabase/server";
import { isAnonymousUser } from "@/lib/user-state";

const fredoka = localFont({
  src: "../../node_modules/@fontsource-variable/fredoka/files/fredoka-latin-wght-normal.woff2",
  display: "swap",
});

const steps = [
  {
    label: "01",
    title: "Pick a place with texture",
    description: "A city block, a market lane, a coastline, or one neighborhood you want to notice properly.",
  },
  {
    label: "02",
    title: "Let one color lead",
    description: "The mission shifts your eye from sightseeing to collecting details most people walk past.",
  },
  {
    label: "03",
    title: "Finish with a poster",
    description: "Nine frames turn into a visual souvenir that feels personal enough to post and keep.",
  },
];

const heroChips = [
  { label: "Orange Hunt", tone: "bg-[#ffeddc] text-[#e66a2f]" },
  { label: "Blue Hunt", tone: "bg-[#e4efff] text-[#2f61df]" },
  { label: "Pink Hunt", tone: "bg-[#ffe7f5] text-[#d85dac]" },
];



const reasons = [
  "Feels like a game, not a camera roll chore.",
  "Makes the shareable story obvious at a glance.",
  "Turns tiny details into something worth keeping.",
];

const seoTopicLinks = [
  {
    href: "/color-scavenger-hunt",
    title: "Color scavenger hunt",
    description: "Ideas for turning one color into a playful walk, market mission, or city-side game.",
    tone: "bg-[#ffeddc] text-[#e66a2f]",
  },
  {
    href: "/travel-photo-challenge",
    title: "Travel photo challenge",
    description: "A better way to give trips, day walks, and city breaks a creative point of view.",
    tone: "bg-[#e4efff] text-[#2f61df]",
  },
  {
    href: "/turn-travel-photos-into-a-poster",
    title: "Turn travel photos into a poster",
    description: "How to make a clean sharable artifact instead of letting the best shots vanish in your gallery.",
    tone: "bg-[#ffe7f5] text-[#d85dac]",
  },
  {
    href: "/city-photo-challenge",
    title: "City photo challenge",
    description: "A playful way to make streets, neighborhoods, and weekend walks feel more visually alive.",
    tone: "bg-[#e9f5ff] text-[#2574d9]",
  },
  {
    href: "/photo-walk-ideas",
    title: "Photo walk ideas",
    description: "Simple prompts that make photo walks feel more focused, memorable, and worth finishing.",
    tone: "bg-[#fff1db] text-[#d56f2d]",
  },
  {
    href: "/creative-travel-activities",
    title: "Creative travel activities",
    description: "Low-friction travel ideas that give the day a creative lens and a shareable outcome.",
    tone: "bg-[#eef7df] text-[#4c8e3b]",
  },
  {
    href: "/group-photo-challenge",
    title: "Group photo challenge",
    description: "A shared color game that turns one day with friends into posters everyone sees differently.",
    tone: "bg-[#e9f7ef] text-[#2a9d84]",
  },
  {
    href: "/travel-games-for-friends",
    title: "Travel games for friends",
    description: "Low-friction travel ideas that give group trips a playful structure and a better souvenir.",
    tone: "bg-[#fff1db] text-[#d56f2d]",
  },
  {
    href: "/weekend-activities-with-friends",
    title: "Weekend activities with friends",
    description: "A simple shared challenge for city afternoons, beach days, birthdays, and weekends away.",
    tone: "bg-[#e7f0ff] text-[#2f61df]",
  },
];
const homepageFaqs = [
  {
    question: "How does a Color Hunt work?",
    answer:
      "You pick a place, follow one color, collect nine moments that fit the same palette, and turn them into a poster or collage that feels worth saving and sharing.",
  },
  {
    question: "What makes Color Hunt different from a normal photo challenge?",
    answer:
      "Color Hunt uses one clear rule and one clear finish line. That makes the prompt easy to follow and the final result much cleaner than a random camera roll.",
  },
  {
    question: "Can Color Hunt work for city walks, travel days, and groups?",
    answer:
      "Yes. The format works for solo walks, travel outings, and group challenges because the rule is simple enough to carry into almost any place.",
  },
];

type HomeProps = {
  searchParams: Promise<{
    challengeColor?: string;
    challengeLocation?: string;
    challengeTitle?: string;
    challengeStartDate?: string;
    challengeEndDate?: string;
    challengeShareId?: string;
  }>;
};

function buildChallengeMetadataCopy(params: {
  challengeColor?: string;
  challengeLocation?: string;
  challengeTitle?: string;
}) {
  const challengeColor = params.challengeColor?.trim() || "";
  const challengeLocation = params.challengeLocation?.trim() || "";
  const challengeTitle = params.challengeTitle?.trim() || "";
  const hasChallenge = Boolean(challengeColor);

  if (!hasChallenge) {
    return {
      title: "Color Hunt | Travel photo challenge and color scavenger hunt",
      description:
        "Turn travel into a color game. Pick a place, hunt one color, capture nine moments, and generate a poster worth sharing.",
    };
  }

  const locationLabel = challengeLocation || "this place";
  const challengeContext = challengeTitle ? `${challengeTitle} · ` : "";

  return {
    title: `You've been challenged to hunt ${challengeColor} in ${locationLabel} | Color Hunt`,
    description: `${challengeContext}Take on the ${challengeColor} challenge in ${locationLabel}. Collect nine moments, make your own poster, and see the place differently.`,
  };
}

export async function generateMetadata({ searchParams }: HomeProps): Promise<Metadata> {
  const params = await searchParams;
  const copy = buildChallengeMetadataCopy(params);
  const challengeColor = params.challengeColor?.trim() || "";
  const challengeLocation = params.challengeLocation?.trim() || "";
  const challengeTitle = params.challengeTitle?.trim() || "";
  const challengeUrl = buildChallengeLandingPath(params);
  const ogImageUrl = buildChallengeOgImageUrl(params);

  return {
    title: copy.title,
    description: copy.description,
    alternates: {
      canonical: challengeUrl,
    },
    openGraph: {
      title: copy.title,
      description: copy.description,
      type: "website",
      url: challengeUrl,
      siteName: "Color Hunt",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: challengeColor
            ? `${challengeColor} Color Hunt challenge${challengeLocation ? ` in ${challengeLocation}` : ""}`
            : challengeTitle || "Color Hunt",
        },
      ],
    },
    twitter: {
      card: "summary",
      title: copy.title,
      description: copy.description,
      images: [ogImageUrl],
    },
  };
}

function buildChallengeNextPath(params: {
  challengeColor?: string;
  challengeLocation?: string;
  challengeTitle?: string;
  challengeStartDate?: string;
  challengeEndDate?: string;
  challengeShareId?: string;
}) {
  const nextParams = new URLSearchParams();

  if (params.challengeColor) nextParams.set("challengeColor", params.challengeColor);
  if (params.challengeLocation) nextParams.set("challengeLocation", params.challengeLocation);
  if (params.challengeTitle) nextParams.set("challengeTitle", params.challengeTitle);
  if (params.challengeStartDate) nextParams.set("challengeStartDate", params.challengeStartDate);
  if (params.challengeEndDate) nextParams.set("challengeEndDate", params.challengeEndDate);
  if (params.challengeShareId) nextParams.set("challengeShareId", params.challengeShareId);

  const query = nextParams.toString();
  return query ? `/trips/new?${query}` : "/trips/new";
}

function buildChallengeLandingPath(params: {
  challengeColor?: string;
  challengeLocation?: string;
  challengeTitle?: string;
  challengeStartDate?: string;
  challengeEndDate?: string;
  challengeShareId?: string;
}) {
  const nextParams = new URLSearchParams();

  if (params.challengeColor) nextParams.set("challengeColor", params.challengeColor);
  if (params.challengeLocation) nextParams.set("challengeLocation", params.challengeLocation);
  if (params.challengeTitle) nextParams.set("challengeTitle", params.challengeTitle);
  if (params.challengeStartDate) nextParams.set("challengeStartDate", params.challengeStartDate);
  if (params.challengeEndDate) nextParams.set("challengeEndDate", params.challengeEndDate);
  if (params.challengeShareId) nextParams.set("challengeShareId", params.challengeShareId);

  const query = nextParams.toString();
  return query ? `/?${query}` : "/";
}

function buildChallengeOgImageUrl(params: {
  challengeColor?: string;
  challengeLocation?: string;
}) {
  const imageParams = new URLSearchParams();
  const challengeColor = params.challengeColor?.trim() || "";
  const challengeLocation = params.challengeLocation?.trim() || "";

  if (challengeColor) {
    imageParams.set("title", `You've been challenged to hunt ${challengeColor}.`);
    imageParams.set(
      "subtitle",
      challengeLocation
        ? `Take on the ${challengeColor} Color Hunt in ${challengeLocation} and turn nine moments into a poster worth sharing.`
        : `Take on the ${challengeColor} Color Hunt and turn nine moments into a poster worth sharing.`,
    );
    imageParams.set("eyebrow", "Color Hunt challenge");
    imageParams.set("accent", challengeColor.toLowerCase());
  } else {
    imageParams.set("title", "Turn travel into a color game.");
    imageParams.set(
      "subtitle",
      "Pick a place, hunt one color, collect nine moments, and generate a poster worth sharing.",
    );
    imageParams.set("eyebrow", "Color Hunt");
    imageParams.set("accent", "#2f61df");
  }

  return `/api/og?${imageParams.toString()}`;
}

export default async function Home({ searchParams }: HomeProps) {
  const challengeParams = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isGuest = isAnonymousUser(user);
  const challengeNextPath = buildChallengeNextPath(challengeParams);
  const challengeColorName = challengeParams.challengeColor?.trim() || null;
  const isChallengeFlow = Boolean(challengeColorName);
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Color Hunt",
    alternateName: "colorhunt.quest",
    url: "https://colorhunt.quest",
    description:
      "Turn travel into a color game. Pick a place, hunt one color, collect nine moments, and generate a poster worth sharing.",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://colorhunt.quest/?challengeColor={challengeColor}",
      "query-input": "required name=challengeColor",
    },
  };
  const appJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Color Hunt",
    applicationCategory: "PhotographyApplication",
    operatingSystem: "Web",
    url: "https://colorhunt.quest",
    description:
      "A playful travel photo challenge where one color leads the eye and nine moments become a poster.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: homepageFaqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  if (user && !isGuest && !isChallengeFlow) {
    redirect("/dashboard");
  }

  return (
    <main className="app-shell landing-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
      />
      <SessionLandingRedirect enabled={!isChallengeFlow} />
      <EventOnView
        eventName="landing_viewed"
        metadata={{
          isAuthenticated: Boolean(user),
          isAnonymous: isGuest,
          challengeColorName,
        }}
      />
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col gap-10 px-4 py-5 sm:gap-12 sm:px-10 sm:py-8 lg:px-16">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/"
              className={`${fredoka.className} text-lg font-semibold tracking-[0.02em] text-[rgba(45,34,74,0.82)]`}
            >
              Color Hunt
            </Link>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[rgba(67,58,97,0.56)]">colorhunt.quest · See places differently</p>
          </div>
        </header>

        <section className="landing-hunt-spotlight">
          <div className="landing-hunt-spotlight-copy">
            <p className="eyebrow">A photo scavenger hunt</p>
            <h1 className={`${fredoka.className} panel-title mt-3 text-4xl font-semibold sm:text-6xl`}>See your world in one color.</h1>
            <p className="body-copy mt-3 max-w-xl text-sm sm:text-base">
              Pick a color, find nine things that match, and turn your photos into a poster of the hunt.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {heroChips.map((chip) => (
                <span key={chip.label} className={`${fredoka.className} playful-chip ${chip.tone}`}>
                  {chip.label}
                </span>
              ))}
            </div>
            <TrackedLink
              className="button-primary mt-6 w-full sm:w-auto"
              href={isChallengeFlow ? challengeNextPath : "/trips/new"}
              eventName="landing_cta_clicked"
              metadata={{
                challengeColorName,
                destination: isChallengeFlow ? challengeNextPath : "/trips/new",
                isAuthenticated: Boolean(user),
                isChallengeFlow,
                source: "landing_hunt_spotlight",
              }}
            >
              {user && isChallengeFlow ? `Start the ${challengeColorName} challenge` : "Start a Color Hunt"}
            </TrackedLink>
          </div>
          <figure className="mx-auto w-full max-w-xs">
            <Image src="/color-hunt-example.png" alt="Nine photos of a green woodland and river walk collected into a Color Hunt keepsake." width={1974} height={3508} sizes="(max-width: 640px) 80vw, 320px" className="h-auto w-full rounded-xl shadow-lg" />
            <figcaption className="mt-3 text-center text-sm text-[var(--muted)]">Nine finds from a day outdoors.</figcaption>
          </figure>
        </section>

        <section id="start" className="landing-start-section">
          <div>
            {user ? (
              <div className="playful-card rounded-[2rem] p-6 sm:p-8">
                <p className="eyebrow mb-3">{isGuest ? "You already started" : "Back for another round?"}</p>
                <h2 className="panel-title text-3xl font-semibold">
                  {isGuest ? "Your guest hunt is still waiting." : "Your next poster is waiting."}
                </h2>
                <p className="body-copy mt-3 text-base">
                  {isGuest
                    ? "Continue your hunt. Connect Google to return to it on another device."
                    : "Open your dashboard to pick up an active hunt or start a new one."}
                </p>
                <Link className="button-primary mt-6 w-full sm:w-auto" href="/dashboard">
                  {isGuest ? "Resume guest hunt" : "Open dashboard"}
                </Link>
              </div>
            ) : (
              <div className="playful-card rounded-[2rem] p-6 sm:p-8">
                <p className="eyebrow mb-3">Make first</p>
                <h2 className="panel-title text-3xl font-semibold">You do not need an account to begin.</h2>
                <p className="body-copy mt-3 text-base">Start as a guest and download your finished poster. Connect Google to return to your hunts on another device.</p>
                <Link className="button-primary mt-6 w-full sm:w-auto" href={isChallengeFlow ? challengeNextPath : "/trips/new"}>Start a Color Hunt</Link>
              </div>
            )}
          </div>
          <div className="landing-proof-card">
            <p className="eyebrow">Why it clicks</p>
            <h2 className="panel-title mt-3 text-3xl font-semibold">A clear finish line changes everything.</h2>
            <ul className="mt-5 grid gap-3 text-sm text-[var(--muted)]">
              {reasons.map((reason, index) => (
                <li key={reason} className="reason-pill">
                  <span className="reason-pill-index">{index + 1}</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="poster-wall" className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="playful-card rounded-[2.4rem] p-6 sm:p-8">
            <p className="eyebrow">How it works</p>
            <h2 className="panel-title balanced-text mt-3 max-w-xl text-3xl font-semibold leading-tight sm:text-4xl">
              One tiny rule makes the trip feel different.
            </h2>
            <p className="body-copy mt-4 max-w-xl text-base">
              Most travel apps help you save more. Color Hunt gives you a point of view, a stopping point, and a result
              you can understand in one glance.
            </p>
          </div>

          <div className="grid gap-4">
            {steps.slice(0, 2).map((step) => (
              <article
                key={step.label}
                className="playful-card flex flex-col gap-3 rounded-[2rem] p-6 sm:flex-row sm:items-start sm:justify-between"
              >
              <div>
                  <p className="eyebrow">{step.label}</p>
                  <h3 className="panel-title mt-2 text-2xl font-semibold">{step.title}</h3>
                </div>
                <p className="body-copy max-w-xl text-sm sm:text-base">{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-5">
          <div className="playful-card rounded-[2.2rem] p-6 sm:p-8">
            <p className="eyebrow">Keep exploring</p>
            <h2 className="panel-title mt-3 text-3xl font-semibold sm:text-4xl">
              More colorful ways into the idea.
            </h2>
            <p className="body-copy mt-4 max-w-3xl text-base sm:text-lg">
              If you landed here looking for scavenger hunt ideas, travel photo prompts, or a cleaner way to turn a trip into something worth sharing, these guides are a good place to start.
            </p>
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {seoTopicLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="playful-card rounded-[1.8rem] p-5 transition hover:-translate-y-[1px]"
                >
                  <span className={`${fredoka.className} playful-chip ${link.tone}`}>{link.title}</span>
                  <h3 className="panel-title mt-4 text-2xl font-semibold">{link.title}</h3>
                  <p className="body-copy mt-2 text-sm sm:text-base">{link.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="playful-card rounded-[2rem] p-6 sm:p-8">
          <p className="eyebrow">FAQ</p>
          <h2 className="panel-title mt-3 text-3xl font-semibold sm:text-4xl">
            Quick answers before you start.
          </h2>
          <div className="mt-6 grid gap-4">
            {homepageFaqs.map((faq) => (
              <article
                key={faq.question}
                className="rounded-[1.5rem] border border-[rgba(88,58,134,0.1)] bg-white/70 px-5 py-5"
              >
                <h3 className="panel-title text-xl font-semibold">{faq.question}</h3>
                <p className="body-copy mt-2 text-sm sm:text-base">{faq.answer}</p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

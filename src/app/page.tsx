import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Fredoka } from "next/font/google";
import { redirect } from "next/navigation";
import { EventOnView } from "@/components/analytics/event-on-view";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { AuthPanel } from "@/components/auth/auth-panel";
import { SessionLandingRedirect } from "@/components/auth/session-landing-redirect";
import { createClient } from "@/lib/supabase/server";
import { isAnonymousUser } from "@/lib/user-state";

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["500", "600"],
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

const featuredTemplates = [
  {
    id: "june",
    label: "June",
    note: "A month in four frames",
    src: "/poster-template-story-june.png",
  },
  {
    id: "july",
    label: "July",
    note: "Summer, in one cover",
    src: "/poster-template-story-july.png",
  },
  {
    id: "august",
    label: "August",
    note: "The good kind of photo dump",
    src: "/poster-template-story-august.png",
  },
  {
    id: "summer-2026",
    label: "Summer 2026",
    note: "The season in four frames",
    src: "/poster-template-story-summer_2026.png",
  },
  {
    id: "usa",
    label: "USA",
    note: "Big-weekend energy",
    src: "/poster-template-story-usa.png",
  },
] as const;

const heroBoardTiles = [
  { face: "spark", tone: "bg-[#2a9d84] text-[#b8ea77]" },
  { face: "spark", tone: "bg-[#bde4ef] text-[#2f61df]" },
  { face: "smile", tone: "bg-[#ffd6eb] text-[#7e3af2]" },
  { face: "wink", tone: "bg-[#ffd632] text-[#ff5d54]" },
  { face: "dash", tone: "bg-[#f5e9db] text-[#ff9556]" },
  { face: "heart", tone: "bg-[#ff5d54] text-[#fff4e6]" },
  { face: "smile", tone: "bg-[#e95fca] text-[#fff8f0]" },
  { face: "wink", tone: "bg-[#ff9a5d] text-[#2a9d84]" },
  { face: "spark", tone: "bg-[#2f61df] text-[#ffd632]" },
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
          <TrackedLink
            className="header-utility-link"
            href={user ? "/dashboard" : "/covers/new"}
            eventName="landing_cta_clicked"
            metadata={{
              challengeColorName,
              destination: user ? "/dashboard" : "/covers/new",
              isAuthenticated: Boolean(user),
              isChallengeFlow,
              source: "landing_header",
            }}
          >
            {user ? (isGuest ? "Resume your guest hunt" : "Go to dashboard") : "Make a cover"}
          </TrackedLink>
        </header>

        <section className="landing-studio">
          <div className="landing-studio-intro">
            <div className="hero-topline inline-flex items-center gap-3 rounded-full border border-[rgba(88,58,134,0.12)] bg-[rgba(255,255,255,0.76)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[rgba(45,34,74,0.72)] shadow-[0_14px_40px_rgba(72,48,110,0.1)]">
              <div className="brand-dotline">
                <span />
                <span />
                <span />
                <span />
              </div>
              Color Hunt Studio
            </div>
            <h1 className={`${fredoka.className} panel-title balanced-text mt-5 max-w-5xl text-[3.35rem] font-semibold leading-[0.9] text-[var(--foreground)] sm:text-7xl lg:text-[6.1rem]`}>
              Your camera roll,
              <span className="block text-[#2f61df]">with a point of view.</span>
            </h1>
            <p className="body-copy balanced-text mx-auto mt-5 max-w-2xl text-base sm:text-xl">
              Pick a style, add four or six photos, and leave with a cover worth posting. No design skills. No blank canvas.
            </p>
            <div className="landing-studio-actions">
              <TrackedLink
                className="button-template w-full sm:w-auto"
                href="/covers/custom-title/new"
                eventName="landing_cta_clicked"
                metadata={{
                  challengeColorName,
                  destination: "/covers/custom-title/new",
                  isAuthenticated: Boolean(user),
                  isChallengeFlow,
                  source: "landing_studio_template",
                }}
              >
                Create your title
              </TrackedLink>
              <TrackedLink
                className="button-secondary w-full sm:w-auto"
                href={user ? (isChallengeFlow ? challengeNextPath : "/dashboard") : "#start"}
                eventName="landing_cta_clicked"
                metadata={{
                  challengeColorName,
                  destination: user ? (isChallengeFlow ? challengeNextPath : "/dashboard") : "#start",
                  isAuthenticated: Boolean(user),
                  isChallengeFlow,
                  source: "landing_studio_hunt",
                }}
              >
                Start a Color Hunt
              </TrackedLink>
            </div>
            <p className="landing-studio-note">Four or six photos · One finished cover · Ready to share</p>
          </div>

          <div className="landing-style-shelf">
            <div className="landing-style-shelf-heading">
              <div>
                <p className="eyebrow">Choose your cover</p>
                <h2 className="panel-title mt-2 text-2xl font-semibold sm:text-3xl">Your photos already have a better ending.</h2>
              </div>
              <span className="landing-style-shelf-count">New templates monthly</span>
            </div>
            <div className="landing-style-rail">
              {featuredTemplates.map((template) => (
                <TrackedLink
                  key={template.id}
                  className={`landing-style-card landing-style-card-${template.id}`}
                  href={`/covers/${template.id}/new`}
                  eventName="landing_cta_clicked"
                  metadata={{
                    challengeColorName,
                    destination: `/covers/${template.id}/new`,
                    templateId: template.id,
                    isAuthenticated: Boolean(user),
                    isChallengeFlow,
                    source: "landing_featured_template",
                  }}
                >
                  <div className="landing-style-card-art" aria-hidden="true">
                    <div className="landing-style-card-grid">
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                    <Image src={template.src} alt="" fill sizes="(min-width: 1024px) 16rem, 58vw" />
                  </div>
                  <div className="landing-style-card-copy">
                    <span>{template.label}</span>
                    <p>{template.note} · 4 or 6 photos</p>
                  </div>
                </TrackedLink>
              ))}
            </div>
          </div>

          <div className="landing-hunt-spotlight">
            <div className="landing-hunt-spotlight-copy">
              <p className="eyebrow">The Color Hunt original</p>
              <h2 className="panel-title mt-3 text-3xl font-semibold sm:text-4xl">Make the day the story.</h2>
              <p className="body-copy mt-3 max-w-xl text-sm sm:text-base">
                Pick one color. Chase nine moments. Finish with a poster that could only belong to that day.
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
                href={user ? (isChallengeFlow ? challengeNextPath : "/dashboard") : "#start"}
                eventName="landing_cta_clicked"
                metadata={{
                  challengeColorName,
                  destination: user ? (isChallengeFlow ? challengeNextPath : "/dashboard") : "#start",
                  isAuthenticated: Boolean(user),
                  isChallengeFlow,
                  source: "landing_hunt_spotlight",
                }}
              >
                {user && isChallengeFlow ? `Start the ${challengeColorName} challenge` : "Start a Color Hunt"}
              </TrackedLink>
            </div>
            <div className="landing-hunt-art landing-hunt-spotlight-art" aria-hidden="true">
              {heroBoardTiles.map((tile, index) => (
                <div key={`${tile.face}-${index}`} className={`landing-hunt-art-tile ${tile.tone}`}>
                  <div className={`mascot-face mascot-face-${tile.face}`}>
                    <span className="mascot-eye mascot-eye-left" />
                    <span className="mascot-eye mascot-eye-right" />
                    <span className="mascot-mouth" />
                  </div>
                </div>
              ))}
            </div>
          </div>
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
                    ? "Jump back in, finish the poster, and then attach Google when you want to save it properly."
                    : "Open your dashboard to pick up an active hunt, make a new cover, or start something fresh."}
                </p>
                <Link className="button-primary mt-6 w-full sm:w-auto" href="/dashboard">
                  {isGuest ? "Resume guest hunt" : "Open dashboard"}
                </Link>
              </div>
            ) : (
              <AuthPanel
                nextPath={challengeNextPath}
                challengeColorName={challengeColorName}
                requireSignIn={isChallengeFlow}
              />
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

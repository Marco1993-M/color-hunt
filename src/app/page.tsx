import Link from "next/link";
import { Fredoka } from "next/font/google";
import { EventOnView } from "@/components/analytics/event-on-view";
import { AuthPanel } from "@/components/auth/auth-panel";
import { createClient } from "@/lib/supabase/server";

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

const payoffPoster = {
  title: "Hoedspruit, South Africa",
  subtitle: "Exploring Hoedspruit, South Africa 2026",
  tone: "from-[#f7e8ae] via-[#edc34d] to-[#d89c23]",
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="app-shell landing-shell">
      <EventOnView eventName="landing_viewed" metadata={{ isAuthenticated: Boolean(user) }} />
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
          <Link className="header-utility-link" href={user ? "/dashboard" : "#start"}>
            {user ? "Go to dashboard" : "Jump to the hunt"}
          </Link>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-start lg:gap-10">
          <div className="space-y-6 pt-1 sm:space-y-8 sm:pt-6">
            <div className="hero-copy-shell">
              <div className="hero-topline inline-flex items-center gap-3 rounded-full border border-[rgba(88,58,134,0.12)] bg-[rgba(255,255,255,0.76)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[rgba(45,34,74,0.72)] shadow-[0_14px_40px_rgba(72,48,110,0.1)]">
                <div className="brand-dotline">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                One place. One color. Nine moments.
              </div>
              <div className="space-y-4 sm:space-y-5">
                <p className="eyebrow">Color Hunt</p>
                <h1
                  className={`${fredoka.className} panel-title balanced-text max-w-4xl text-[3.05rem] font-semibold leading-[0.92] text-[var(--foreground)] sm:text-7xl lg:text-[5.4rem]`}
                >
                  Turn travel
                  <span className="block text-[#2f61df]">into a color game.</span>
                </h1>
                <p className="body-copy balanced-text max-w-xl text-base sm:text-xl">
                  Pick a place, chase one color, and collect nine little hits that turn into something joyful enough to share.
                </p>
                <p className="hero-proof max-w-lg text-sm sm:text-base">
                  Made for city walks, market runs, beach towns, and travel rabbit holes.
                </p>
              </div>

              <div className="hero-chip-row flex flex-wrap gap-2">
                {heroChips.map((chip) => (
                  <span key={chip.label} className={`${fredoka.className} playful-chip ${chip.tone}`}>
                    {chip.label}
                  </span>
                ))}
              </div>

              <div className="game-start-rail">
                <Link className="button-primary w-full sm:w-auto" href={user ? "/dashboard" : "#start"}>
                  {user ? "Start your next hunt" : "Start your first hunt"}
                </Link>
                <p className="micro-copy text-[rgba(67,58,97,0.66)]">No app. One magic link. Start in seconds.</p>
              </div>
            </div>
          </div>

          <div className="relative space-y-5 lg:order-last">
            <div className="landing-glow absolute -left-8 top-8 hidden h-40 w-40 rounded-full lg:block" />
            <div className="hero-stage relative p-4 sm:p-5">
              <div className="landing-color-board">
                {heroBoardTiles.map((tile, index) => (
                  <div key={`${tile.face}-${index}`} className={`landing-color-tile ${tile.tone}`}>
                    <div className={`mascot-face mascot-face-${tile.face}`}>
                      <span className="mascot-eye mascot-eye-left" />
                      <span className="mascot-eye mascot-eye-right" />
                      <span className="mascot-mouth" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="landing-payoff-card">
                <div className="landing-payoff-copy">
                  <p className="eyebrow">The payoff</p>
                  <h3 className="panel-title text-2xl font-semibold sm:text-[2rem]">A poster worth posting.</h3>
                  <p className="body-copy mt-2 text-sm sm:text-base">
                    The hunt ends with a clean little artifact you can save, share, and actually want to keep.
                  </p>
                </div>
                <article className="landing-payoff-poster">
                  <div className="landing-payoff-topline">
                    <span>Color Hunt</span>
                    <span>Poster</span>
                  </div>
                  <div className="landing-payoff-hero">
                    <p className="landing-payoff-title">{payoffPoster.title}</p>
                    <p className="landing-payoff-subtitle">{payoffPoster.subtitle}</p>
                  </div>
                  <div className="landing-payoff-grid">
                    {Array.from({ length: 9 }).map((_, index) => (
                      <span
                        key={`payoff-${index}`}
                        className={`landing-payoff-cell bg-gradient-to-br ${payoffPoster.tone}`}
                      />
                    ))}
                  </div>
                  <p className="landing-payoff-footer">One place. One color. Nine moments.</p>
                </article>
              </div>
            </div>

            <div id="start" className="space-y-4">
              {user ? (
                <div className="playful-card rounded-[2rem] p-6 sm:p-8">
                  <p className="eyebrow mb-3">Back for another round?</p>
                  <h2 className="panel-title text-3xl font-semibold">Your next poster is waiting.</h2>
                  <p className="body-copy mt-3 text-base">
                    Head to your dashboard, choose a place, and start building a nine-frame story that feels worth keeping.
                  </p>
                  <Link className="button-primary mt-6 w-full sm:w-auto" href="/dashboard">
                    Open dashboard
                  </Link>
                </div>
              ) : (
                <AuthPanel />
              )}
              <div className="playful-card rounded-[2rem] p-5">
                <div className="flex items-center justify-between gap-4">
                  <p className="eyebrow">Why it clicks</p>
                  <span className={`${fredoka.className} text-sm font-semibold text-[rgba(47,97,223,0.8)]`}>Fast to get. Fun to share.</span>
                </div>
                <ul className="mt-4 grid gap-3 text-sm text-[var(--muted)] sm:grid-cols-3">
                  {reasons.map((reason, index) => (
                    <li key={reason} className="reason-pill">
                      <span className="reason-pill-index">{index + 1}</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
              <div className="playful-card rounded-[1.75rem] p-5">
                <p className="micro-copy">Format</p>
                <p className={`${fredoka.className} panel-title mt-3 text-2xl font-semibold`}>9 frames</p>
                <p className="body-copy mt-2 text-sm">Just enough constraint to create style.</p>
              </div>
              <div className="playful-card rounded-[1.75rem] p-5">
                <p className="micro-copy">Hook</p>
                <p className={`${fredoka.className} panel-title mt-3 text-2xl font-semibold`}>1 color</p>
                <p className="body-copy mt-2 text-sm">A simple mission that changes what you notice.</p>
              </div>
              <div className="playful-card rounded-[1.75rem] p-5">
                <p className="micro-copy">Outcome</p>
                <p className={`${fredoka.className} panel-title mt-3 text-2xl font-semibold`}>1 poster</p>
                <p className="body-copy mt-2 text-sm">A shareable artifact, not another camera roll dump.</p>
              </div>
            </div>
          </div>
        </div>

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
      </section>
    </main>
  );
}

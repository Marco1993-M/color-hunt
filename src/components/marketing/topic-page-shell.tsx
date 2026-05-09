import Link from "next/link";
import { Fredoka } from "next/font/google";

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["500", "600"],
});

type TopicPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  accentClass: string;
  chips: string[];
  introTitle: string;
  introBody: string;
  ideasTitle: string;
  ideas: Array<{ title: string; description: string }>;
  stepsTitle: string;
  steps: Array<{ title: string; description: string }>;
  payoffTitle: string;
  payoffBody: string;
  ctaLabel?: string;
  relatedLinks?: Array<{ href: string; label: string }>;
  jsonLd?: Record<string, unknown>;
};

export function TopicPageShell({
  eyebrow,
  title,
  description,
  accentClass,
  chips,
  introTitle,
  introBody,
  ideasTitle,
  ideas,
  stepsTitle,
  steps,
  payoffTitle,
  payoffBody,
  ctaLabel = "Start your first hunt",
  relatedLinks = [],
  jsonLd,
}: TopicPageShellProps) {
  return (
    <main className="app-shell landing-shell">
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-4 py-5 sm:gap-10 sm:px-10 sm:py-8 lg:px-16">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/"
              className={`${fredoka.className} text-lg font-semibold tracking-[0.02em] text-[rgba(45,34,74,0.82)]`}
            >
              Color Hunt
            </Link>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[rgba(67,58,97,0.56)]">
              colorhunt.quest · See places differently
            </p>
          </div>
          <Link className="header-utility-link" href="/#start">
            Jump to the hunt
          </Link>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
          <div className="space-y-6 pt-2 sm:space-y-8 sm:pt-6">
            <div className="hero-copy-shell">
              <div className="hero-topline inline-flex items-center gap-3 rounded-full border border-[rgba(88,58,134,0.12)] bg-[rgba(255,255,255,0.76)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[rgba(45,34,74,0.72)] shadow-[0_14px_40px_rgba(72,48,110,0.1)]">
                <div className="brand-dotline">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                {eyebrow}
              </div>
              <div className="space-y-4 sm:space-y-5">
                <p className="eyebrow">Color Hunt guide</p>
                <h1
                  className={`${fredoka.className} panel-title balanced-text max-w-4xl text-[2.85rem] font-semibold leading-[0.92] text-[var(--foreground)] sm:text-6xl lg:text-[4.9rem]`}
                >
                  {title}
                </h1>
                <p className="body-copy balanced-text max-w-2xl text-base sm:text-xl">
                  {description}
                </p>
              </div>

              <div className="hero-chip-row flex flex-wrap gap-2">
                {chips.map((chip) => (
                  <span key={chip} className={`${fredoka.className} playful-chip ${accentClass}`}>
                    {chip}
                  </span>
                ))}
              </div>

              <div className="game-start-rail">
                <Link className="button-primary w-full sm:w-auto" href="/#start">
                  {ctaLabel}
                </Link>
                <p className="micro-copy text-[rgba(67,58,97,0.66)]">
                  Start as a guest, then save with Google later.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-5 lg:pt-8">
            <div className="hero-stage relative p-4 sm:p-5">
              <div className="landing-color-board">
                {Array.from({ length: 9 }).map((_, index) => (
                  <div key={index} className={`landing-color-tile ${accentClass}`}>
                    <div className={`mascot-face ${index % 3 === 0 ? "mascot-face-spark" : index % 3 === 1 ? "mascot-face-wink" : "mascot-face-heart"}`}>
                      <span className="mascot-eye mascot-eye-left" />
                      <span className="mascot-eye mascot-eye-right" />
                      <span className="mascot-mouth" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="playful-card rounded-[2rem] p-6 sm:p-7">
              <p className="eyebrow">{introTitle}</p>
              <p className="body-copy mt-3 text-base sm:text-lg">{introBody}</p>
            </div>
          </div>
        </div>

        <section className="grid gap-4 sm:grid-cols-3">
          {ideas.map((idea) => (
            <article key={idea.title} className="playful-card rounded-[1.85rem] p-5">
              <p className="eyebrow">{ideasTitle}</p>
              <h2 className="panel-title mt-3 text-2xl font-semibold">{idea.title}</h2>
              <p className="body-copy mt-2 text-sm sm:text-base">{idea.description}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
          <div className="playful-card rounded-[2.4rem] p-6 sm:p-8">
            <p className="eyebrow">{stepsTitle}</p>
            <h2 className="panel-title balanced-text mt-3 max-w-xl text-3xl font-semibold leading-tight sm:text-4xl">
              Small rules. Better photos. Sharable payoff.
            </h2>
            <p className="body-copy mt-4 max-w-xl text-base">
              These prompts work best when they give people a clear eye-line, a satisfying stopping point, and a fun reason to keep moving.
            </p>
          </div>

          <div className="grid gap-4">
            {steps.map((step, index) => (
              <article
                key={step.title}
                className="playful-card flex flex-col gap-3 rounded-[2rem] p-6 sm:flex-row sm:items-start sm:justify-between"
              >
                <div>
                  <p className="eyebrow">{String(index + 1).padStart(2, "0")}</p>
                  <h3 className="panel-title mt-2 text-2xl font-semibold">{step.title}</h3>
                </div>
                <p className="body-copy max-w-xl text-sm sm:text-base">{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="playful-card rounded-[2rem] p-6 sm:p-8">
            <p className="eyebrow">Why it lands</p>
            <h2 className="panel-title mt-3 text-3xl font-semibold sm:text-4xl">{payoffTitle}</h2>
            <p className="body-copy mt-4 max-w-3xl text-base sm:text-lg">{payoffBody}</p>
          </div>
          <div className="flex flex-col gap-3">
            <Link className="button-primary" href="/#start">
              {ctaLabel}
            </Link>
            <Link className="button-secondary" href="/">
              Back to Color Hunt
            </Link>
          </div>
        </section>

        {relatedLinks.length ? (
          <section className="playful-card rounded-[2rem] p-6 sm:p-8">
            <p className="eyebrow">Keep exploring</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {relatedLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-[1.4rem] border border-[rgba(88,58,134,0.1)] bg-white/70 px-4 py-4 text-sm font-semibold text-[rgba(45,34,74,0.8)] transition hover:-translate-y-[1px] hover:bg-white/90"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}

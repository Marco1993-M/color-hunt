import Image from "next/image";
import Link from "next/link";
import { EventOnView } from "@/components/analytics/event-on-view";
import { SessionLandingRedirect } from "@/components/auth/session-landing-redirect";
import { coverTemplates } from "@/lib/covers";

export default function CoverTemplateLibraryPage() {
  return (
    <main className="app-shell page-frame">
      <SessionLandingRedirect enabled={false} />
      <EventOnView
        eventName="cover_template_library_viewed"
        metadata={{ templateCount: coverTemplates.length }}
      />
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <Link href="/" className="text-sm text-[var(--muted)]">
            ← Back to landing page
          </Link>
        </div>

        <section className="cover-library-hero playful-card rounded-[2.5rem] p-6 sm:p-8">
          <p className="eyebrow">Choose a template</p>
          <h1 className="panel-title mt-3 text-3xl font-semibold sm:text-4xl">
            Start from the layout you actually want.
          </h1>
          <p className="body-copy mt-3 max-w-3xl text-base">
            This is the separate template lane. Pick the cover first, see what you are making, then fill the exact photo spots one by one.
          </p>
        </section>

        <section className="cover-library-grid mt-8 grid gap-5 lg:grid-cols-2">
          {coverTemplates.map((template) => (
            <article key={template.id} className="cover-library-card playful-card rounded-[2rem] p-5 sm:p-6">
              <div className="cover-library-thumb">
                <Image
                  src={template.overlaySrc}
                  alt=""
                  fill
                  className="cover-library-thumb-image"
                  sizes="(min-width: 1024px) 12rem, 40vw"
                />
              </div>

              <div className="cover-library-card-copy mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="cover-library-card-text">
                  <p className="eyebrow">{template.photoCount} photo template</p>
                  <h2 className="panel-title mt-2 text-2xl font-semibold">{template.label}</h2>
                  <p className="body-copy mt-2 text-sm sm:text-base">{template.description}</p>
                </div>
                <Link className="button-primary w-full sm:w-auto" href={`/covers/${template.id}/new`}>
                  Use this template
                </Link>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

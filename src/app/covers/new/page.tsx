import Image from "next/image";
import Link from "next/link";
import { EventOnView } from "@/components/analytics/event-on-view";
import { AuthPanel } from "@/components/auth/auth-panel";
import { SessionLandingRedirect } from "@/components/auth/session-landing-redirect";
import { CoverPosterPreview } from "@/components/covers/cover-poster-preview";
import { createClient } from "@/lib/supabase/server";
import { coverTemplates } from "@/lib/covers";
import { isAnonymousUser } from "@/lib/user-state";

export default async function CoverTemplateLibraryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isGuest = isAnonymousUser(user);

  return (
    <main className="app-shell page-frame">
      <SessionLandingRedirect enabled={false} />
      <EventOnView
        eventName="cover_template_library_viewed"
        metadata={{ templateCount: coverTemplates.length, isAuthenticated: Boolean(user), isAnonymous: isGuest }}
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
            Pick a cover. Add your photos. Post the moment.
          </h1>
          <p className="body-copy mt-3 max-w-3xl text-base">
            Start with the finish line. Choose a style, then decide whether your moment needs four or six photos before adding everything in one go.
          </p>
        </section>

        {!user ? (
          <section id="template-auth" className="mt-6">
            <AuthPanel nextPath="/covers/new" entryMode="cover" />
          </section>
        ) : null}

        <section className="cover-library-grid mt-8 grid gap-5 lg:grid-cols-2">
          {coverTemplates.map((template) => (
            <article
              id={`template-${template.id}`}
              key={template.id}
              className="cover-library-card playful-card rounded-[2rem] p-5 sm:p-6"
            >
              <div className="cover-library-thumb">
                {template.overlaySrc ? (
                  <Image
                    src={template.overlaySrc}
                    alt=""
                    fill
                    className="cover-library-thumb-image"
                    sizes="(min-width: 1024px) 12rem, 40vw"
                  />
                ) : (
                  <CoverPosterPreview
                    templateId={template.id}
                    photos={Array.from({ length: template.photoCount }, () => null)}
                    title="YOUR TITLE"
                    titleStyle="purple"
                  />
                )}
              </div>

              <div className="cover-library-card-copy mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="cover-library-card-text">
                  <p className="eyebrow">{template.isCustomTitle ? "Custom text · 4 or 6 photos" : "4 or 6 photos · ready to post"}</p>
                  <h2 className="panel-title mt-2 text-2xl font-semibold">{template.label}</h2>
                  <p className="body-copy mt-2 text-sm sm:text-base">{template.description}</p>
                </div>
                <Link className="button-primary w-full sm:w-auto" href={`/covers/${template.id}/new`}>
                  Choose this template
                </Link>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

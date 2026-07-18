import Link from "next/link";
import { notFound } from "next/navigation";
import { createCoverAction } from "@/app/actions";
import { NewCoverBuilder } from "@/components/covers/new-cover-builder";
import { CoverSlotBuilder } from "@/components/covers/cover-slot-builder";
import { EventOnView } from "@/components/analytics/event-on-view";
import { AuthPanel } from "@/components/auth/auth-panel";
import { SessionLandingRedirect } from "@/components/auth/session-landing-redirect";
import { coverTemplates, isCoverTemplateId } from "@/lib/covers";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/env";
import { getTripBundle } from "@/lib/data";
import { isAnonymousUser } from "@/lib/user-state";

type NewTemplateCoverPageProps = {
  params: Promise<{ templateId: string }>;
  searchParams: Promise<{ draft?: string }>;
};

export default async function NewTemplateCoverPage({ params, searchParams }: NewTemplateCoverPageProps) {
  const { templateId } = await params;
  const { draft } = await searchParams;

  if (!isCoverTemplateId(templateId)) {
    notFound();
  }

  const template = coverTemplates.find((entry) => entry.id === templateId);

  if (!template) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isGuest = isAnonymousUser(user);
  const draftBundle = user && draft ? await getTripBundle(draft, user.id) : null;
  const isMatchingDraft = draftBundle?.trip.creation_mode === "cover" && draftBundle.trip.cover_template === template.id;

  return (
    <main className="app-shell page-frame">
      <SessionLandingRedirect enabled={false} />
      <EventOnView eventName={user ? "cover_template_selected" : "cover_template_auth_gate_viewed"} metadata={{ templateId, isAuthenticated: Boolean(user), isAnonymous: isGuest }} />
      <div className="mx-auto max-w-5xl">
        {user ? (
          isMatchingDraft ? (
            <div className="mx-auto max-w-4xl">
              <div className="mb-5 flex items-center justify-between gap-3">
                <Link href="/covers/new" className="text-sm text-[var(--muted)]">← Change template</Link>
                <p className="eyebrow">{template.label}</p>
              </div>
              <CoverSlotBuilder
                tripId={draftBundle.trip.id}
                missionId={draftBundle.mission.id}
                userId={user.id}
                bucketName={getSupabaseEnv().storageBucket}
                templateId={template.id}
                title={draftBundle.trip.title}
                titleStyle={draftBundle.trip.title_style}
                photos={draftBundle.photos}
                maxPhotos={draftBundle.mission.max_photos}
              />
            </div>
          ) : <NewCoverBuilder createAction={createCoverAction} templateId={template.id} />
        ) : (
          <>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/covers/new" className="text-sm text-[var(--muted)]">
            ← Back to templates
          </Link>
          <p className="eyebrow">Template mode</p>
        </div>

        <div className="playful-card rounded-[2.5rem] p-6 sm:p-8">
          <p className="eyebrow">{template.photoCount} photo template</p>
          <h1 className="panel-title mt-3 text-3xl font-semibold sm:text-4xl">{template.label}</h1>
          <p className="body-copy mt-3 max-w-2xl text-base">
            Start a guest session or sign in first, then we will open this layout and take you straight to photo selection.
          </p>
          <div className="mt-8">
            <AuthPanel nextPath={`/covers/${template.id}/new`} entryMode="cover" />
          </div>
        </div>
          </>
        )}
      </div>
    </main>
  );
}

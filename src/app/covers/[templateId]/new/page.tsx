import { notFound } from "next/navigation";
import { createCoverAction } from "@/app/actions";
import { NewCoverBuilder } from "@/components/covers/new-cover-builder";
import { EventOnView } from "@/components/analytics/event-on-view";
import { GuestSessionGate } from "@/components/auth/guest-session-gate";
import { SessionLandingRedirect } from "@/components/auth/session-landing-redirect";
import { coverTemplates, inferCoverTemplateId, isCoverTemplateId, isCoverTripLike } from "@/lib/covers";
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
  const isMatchingDraft = Boolean(
    draftBundle &&
      isCoverTripLike({ trip: draftBundle.trip, mission: draftBundle.mission }) &&
      inferCoverTemplateId({ trip: draftBundle.trip, mission: draftBundle.mission }) === template.id,
  );

  return (
    <main className="app-shell page-frame">
      <SessionLandingRedirect enabled={false} />
      <EventOnView eventName={user ? "cover_template_selected" : "cover_template_auth_gate_viewed"} metadata={{ templateId, isAuthenticated: Boolean(user), isAnonymous: isGuest }} />
      <div className="mx-auto max-w-5xl">
        {user ? (
          <NewCoverBuilder
            createAction={createCoverAction}
            templateId={template.id}
            userId={user.id}
            bucketName={getSupabaseEnv().storageBucket}
            isGuest={isGuest}
            initialDraft={isMatchingDraft && draftBundle ? {
              tripId: draftBundle.trip.id,
              missionId: draftBundle.mission.id,
              title: draftBundle.trip.title,
              titleStyle: draftBundle.trip.title_style,
              photos: draftBundle.photos,
              maxPhotos: draftBundle.mission.max_photos,
            } : null}
          />
        ) : (
          <GuestSessionGate nextPath={`/covers/${template.id}/new`} entryMode="cover" />
        )}
      </div>
    </main>
  );
}

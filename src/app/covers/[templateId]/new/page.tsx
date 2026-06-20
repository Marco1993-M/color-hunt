import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EventOnView } from "@/components/analytics/event-on-view";
import { AuthPanel } from "@/components/auth/auth-panel";
import { SessionLandingRedirect } from "@/components/auth/session-landing-redirect";
import { coverTemplates, isCoverTemplateId } from "@/lib/covers";
import { createClient } from "@/lib/supabase/server";
import { isAnonymousUser } from "@/lib/user-state";

type NewTemplateCoverPageProps = {
  params: Promise<{ templateId: string }>;
};

export default async function NewTemplateCoverPage({ params }: NewTemplateCoverPageProps) {
  const { templateId } = await params;

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

  if (user) {
    redirect(`/covers/new#template-${template.id}`);
  }

  return (
    <main className="app-shell page-frame">
      <SessionLandingRedirect enabled={false} />
      <EventOnView
        eventName="cover_template_auth_gate_viewed"
        metadata={{ templateId, isAuthenticated: false, isAnonymous: isGuest }}
      />
      <div className="mx-auto max-w-5xl">
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
            Start a guest session or sign in first, then you’ll land back on the template library ready to open this layout directly.
          </p>
          <div className="mt-8">
            <AuthPanel nextPath={`/covers/new#template-${template.id}`} entryMode="cover" />
          </div>
        </div>
      </div>
    </main>
  );
}

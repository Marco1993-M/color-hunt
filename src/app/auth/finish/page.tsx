import { AuthFinishClient } from "@/components/auth/auth-finish-client";

type AuthFinishPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function AuthFinishPage({ searchParams }: AuthFinishPageProps) {
  const params = await searchParams;
  const nextPath = params.next && params.next.startsWith("/") ? params.next : "/dashboard";

  return (
    <main className="app-shell page-frame">
      <div className="mx-auto max-w-xl">
        <AuthFinishClient nextPath={nextPath} />
      </div>
    </main>
  );
}

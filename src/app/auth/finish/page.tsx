import { AuthFinishClient } from "@/components/auth/auth-finish-client";

type AuthFinishPageProps = {
  searchParams: Promise<{
    next?: string;
    transferTripId?: string;
    guestUserId?: string;
  }>;
};

export default async function AuthFinishPage({ searchParams }: AuthFinishPageProps) {
  const params = await searchParams;
  const nextPath = params.next && params.next.startsWith("/") ? params.next : "/dashboard";
  const transferTripId = params.transferTripId?.trim() || null;
  const guestUserId = params.guestUserId?.trim() || null;

  return (
    <main className="app-shell page-frame">
      <div className="mx-auto max-w-xl">
        <AuthFinishClient nextPath={nextPath} transferTripId={transferTripId} guestUserId={guestUserId} />
      </div>
    </main>
  );
}

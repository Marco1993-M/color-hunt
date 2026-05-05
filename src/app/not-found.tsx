import Link from "next/link";

export default function NotFound() {
  return (
    <main className="app-shell flex min-h-screen items-center justify-center px-6">
      <div className="playful-card max-w-xl rounded-[2.3rem] p-8 text-center">
        <p className="eyebrow">Not Found</p>
        <h1 className="mt-3 text-3xl font-semibold">That hunt isn&apos;t available here.</h1>
        <p className="mt-3 text-base leading-7 text-[var(--muted)]">
          It may not belong to this account, it may not be public, or it hasn&apos;t been created yet.
        </p>
        <div className="loading-board mt-6">
          {Array.from({ length: 9 }).map((_, index) => (
            <div key={`not-found-${index}`} className="not-found-tile" />
          ))}
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/dashboard" className="button-primary">
            Back to dashboard
          </Link>
          <Link href="/" className="button-secondary">
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}

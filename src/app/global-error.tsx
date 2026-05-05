"use client";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#fff7ef] text-[#1f1934]">
        <main className="app-shell flex min-h-screen items-center justify-center px-6 py-10">
          <div className="playful-card max-w-xl rounded-[2.3rem] p-8 text-center">
            <p className="eyebrow">Something slipped</p>
            <h1 className="panel-title mt-3 text-3xl font-semibold sm:text-4xl">The hunt hit a weird moment.</h1>
            <p className="body-copy mt-3 text-base">
              Nothing is lost. Try the page again and we&apos;ll take another run at it.
            </p>
            {error?.digest ? (
              <p className="micro-copy mt-4 text-[rgba(67,58,97,0.58)]">Reference {error.digest}</p>
            ) : null}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button className="button-primary" type="button" onClick={() => unstable_retry()}>
                Try again
              </button>
              <a className="button-secondary" href="/">
                Back home
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}

export default function Loading() {
  return (
    <main className="app-shell page-frame">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="playful-card overflow-hidden rounded-[2.3rem] p-6 sm:p-8">
          <p className="eyebrow">Loading</p>
          <h1 className="panel-title mt-3 text-3xl font-semibold sm:text-4xl">Pulling the next color hunt into place.</h1>
          <p className="body-copy mt-3 max-w-2xl text-base">A quick beat while we set up the trip, grid, and poster tools.</p>
          <div className="loading-board mt-6">
            {Array.from({ length: 9 }).map((_, index) => (
              <div key={`loading-${index}`} className="skeleton-panel rounded-[1.5rem]" />
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[0.95fr_1.05fr]">
          <div className="skeleton-panel h-80 rounded-[2rem]" />
          <div className="skeleton-panel h-80 rounded-[2rem]" />
        </div>
      </div>
    </main>
  );
}

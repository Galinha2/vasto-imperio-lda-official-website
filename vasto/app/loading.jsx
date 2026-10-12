function Skeleton({ className = "" }) {
  return <span aria-hidden="true" className={`loading-skeleton block rounded-full ${className}`} />;
}

function ImagePlaceholder({ className = "" }) {
  return (
    <div aria-hidden="true" className={`loading-image-placeholder relative flex items-center justify-center overflow-hidden rounded-[28px] ${className}`}>
      <span className="loading-spinner" />
    </div>
  );
}

export default function Loading() {
  return (
    <div role="status" aria-live="polite" aria-label="A carregar a página" className="min-h-[75vh] bg-[#f5f5f7] px-4 pb-16 pt-8 sm:px-8 lg:px-10">
      <span className="sr-only">A carregar a página</span>
      <div aria-hidden="true" className="mx-auto max-w-[1480px]">
        <section className="grid min-h-[420px] gap-8 overflow-hidden rounded-[32px] border border-[#e5e5e7] bg-white p-5 sm:p-8 lg:min-h-[500px] lg:grid-cols-[1fr_0.9fr] lg:items-center lg:p-12">
          <div className="flex flex-col justify-center gap-5 py-4">
            <Skeleton className="h-8 w-44 rounded-full" />
            <div className="space-y-3">
              <Skeleton className="h-9 w-[92%] rounded-xl sm:h-12" />
              <Skeleton className="h-9 w-[72%] rounded-xl sm:h-12" />
            </div>
            <div className="space-y-2 pt-1">
              <Skeleton className="h-4 w-[88%]" />
              <Skeleton className="h-4 w-[65%]" />
            </div>
            <div className="flex gap-3 pt-2">
              <Skeleton className="h-12 w-36" />
              <Skeleton className="h-12 w-40" />
            </div>
          </div>
          <ImagePlaceholder className="min-h-[230px] sm:min-h-[300px] lg:min-h-[360px]" />
        </section>

        <section className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <article key={item} className="rounded-[28px] border border-[#e5e5e7] bg-white p-4 sm:p-5">
              <ImagePlaceholder className="h-40 sm:h-48" />
              <div className="space-y-3 px-1 pb-1 pt-5">
                <Skeleton className="h-5 w-3/4 rounded-lg" />
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-2/3" />
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}

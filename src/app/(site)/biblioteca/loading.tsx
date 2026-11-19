export default function Loading() {
  return (
    <div className="container-page pt-12 pb-8 md:pt-16" aria-busy="true" aria-label="Cargando la biblioteca">
      <div className="skeleton h-4 w-40" />
      <div className="skeleton mt-4 h-12 w-full max-w-xl" />
      <div className="skeleton mt-9 h-12 w-full !rounded-full" />
      <div className="mt-10 grid gap-10 lg:grid-cols-[17rem_1fr]">
        <div className="hidden space-y-3 lg:block">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="skeleton h-8" />
          ))}
        </div>
        <div className="space-y-8">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i}>
              <div className="skeleton h-5 w-48" />
              <div className="skeleton mt-3 h-7 w-4/5" />
              <div className="skeleton mt-3 h-4 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

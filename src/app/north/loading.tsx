// Ditampilkan langsung saat pindah halaman admin, selagi data halaman baru dimuat (streaming).
export default function NorthLoading() {
  return (
    <div className="max-w-6xl space-y-6 animate-pulse motion-reduce:animate-none" role="status" aria-label="Memuat halaman">
      <div>
        <div className="h-7 w-56 rounded-lg bg-border/70" />
        <div className="mt-3 h-4 w-96 max-w-full rounded bg-border/50" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl border border-border bg-card" />
        ))}
      </div>
      <div className="h-72 rounded-2xl border border-border bg-card" />
    </div>
  )
}

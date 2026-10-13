// Kerangka halaman pengguna yang tampil seketika saat berpindah halaman.
export default function PageLoading() {
  return (
    <div className="flex-1 w-full max-w-5xl mx-auto p-6 sm:p-12 animate-pulse motion-reduce:animate-none" role="status" aria-label="Memuat halaman">
      <div className="h-8 w-64 rounded-lg bg-border/70" />
      <div className="mt-3 h-4 w-80 max-w-full rounded bg-border/50" />
      <div className="mt-10 h-64 rounded-3xl border border-border bg-card" />
    </div>
  )
}

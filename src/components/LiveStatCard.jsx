/** A single big-number stat, optionally with a loading skeleton state. */
export default function LiveStatCard({ label, value, loading, accent = false }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur">
      <p className="text-xs uppercase tracking-wide text-neutral-400">{label}</p>
      {loading ? (
        <div className="mt-2 h-8 w-20 animate-pulse rounded bg-white/10" />
      ) : (
        <p className={`mt-1 text-2xl font-semibold tabular-nums ${accent ? 'text-emerald-400' : 'text-white'}`}>
          {value}
        </p>
      )}
    </div>
  )
}

import { shortAddr, money, centsToDollars } from '../lib/format.js'

/**
 * Per-payer breakdown for a group ledger: who contributed how much, computed
 * client-side from the group's expense list (no extra contract calls needed).
 * This is the concrete proof of "anyone can verify this ledger."
 */
export default function GroupPayerTable({ expenses }) {
  const byPayer = Object.values(
    expenses.reduce((acc, e) => {
      const key = e.payer
      if (!acc[key]) acc[key] = { payer: key, total: 0, count: 0 }
      acc[key].total += Number(e.amount)
      acc[key].count += 1
      return acc
    }, {}),
  ).sort((a, b) => b.total - a.total)

  if (byPayer.length === 0) return null

  return (
    <div className="mb-8 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Who contributed
      </h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
            <th className="pb-2 font-medium">Wallet</th>
            <th className="pb-2 font-medium">Entries</th>
            <th className="pb-2 text-right font-medium">Total logged</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {byPayer.map((row) => (
            <tr key={row.payer}>
              <td className="py-2 font-mono text-slate-700">{shortAddr(row.payer)}</td>
              <td className="py-2 text-slate-500">{row.count}</td>
              <td className="py-2 text-right font-semibold tabular-nums text-slate-900">
                {money.format(centsToDollars(row.total))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

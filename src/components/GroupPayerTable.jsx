import { useState } from 'react'
import { money, centsToDollars } from '../lib/format.js'
import { displayName, setNickname, getNickname, shortAddress } from '../lib/nicknames.js'

/**
 * Per-payer breakdown for a group ledger: who contributed how much, computed
 * client-side from the group's expense list. Shows wallet nicknames (editable,
 * stored locally) and formats amounts via the passed formatter (currency-aware).
 *
 * @param formatAmount (cents:number)=>string  optional; defaults to USD.
 * @param onRenamed    ()=>void                 optional; called after a rename.
 */
export default function GroupPayerTable({ expenses, formatAmount, onRenamed }) {
  const fmt = formatAmount || ((cents) => money.format(centsToDollars(cents)))
  const [editing, setEditing] = useState(null) // address being renamed
  const [draft, setDraft] = useState('')

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

  function startEdit(addr) {
    setEditing(addr)
    setDraft(getNickname(addr))
  }
  function save(addr) {
    setNickname(addr, draft)
    setEditing(null)
    onRenamed?.()
  }

  return (
    <div className="mb-8 rounded-xl border border-white/10 bg-neutral-900/80 p-5 shadow-md backdrop-blur-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
        Who contributed
      </h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-neutral-500 border-b border-white/10">
            <th className="pb-2 font-medium">Wallet</th>
            <th className="pb-2 font-medium">Entries</th>
            <th className="pb-2 text-right font-medium">Total logged</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {byPayer.map((row) => (
            <tr key={row.payer}>
              <td className="py-2.5 text-neutral-200">
                {editing === row.payer ? (
                  <span className="flex items-center gap-1.5">
                    <input
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') save(row.payer)
                        if (e.key === 'Escape') setEditing(null)
                      }}
                      placeholder={shortAddress(row.payer)}
                      className="w-28 rounded border border-white/20 bg-neutral-950 px-2 py-0.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    />
                    <button
                      onClick={() => save(row.payer)}
                      className="text-xs font-medium text-emerald-400 hover:text-emerald-300"
                    >
                      Save
                    </button>
                  </span>
                ) : (
                  <span className="group inline-flex items-center gap-1.5">
                    <span className={getNickname(row.payer) ? 'font-medium text-white' : 'font-mono text-neutral-400'}>
                      {displayName(row.payer)}
                    </span>
                    <button
                      onClick={() => startEdit(row.payer)}
                      className="text-[10px] text-neutral-500 opacity-0 transition group-hover:opacity-100 hover:text-emerald-400"
                      title="Rename this wallet"
                    >
                      ✎
                    </button>
                  </span>
                )}
              </td>
              <td className="py-2.5 text-neutral-400">{row.count}</td>
              <td className="py-2.5 text-right font-semibold tabular-nums text-white">
                {fmt(row.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

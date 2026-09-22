import { useCallback, useEffect, useMemo, useState, lazy, Suspense } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  getReadOnlyProvider,
  fetchGroupInfo,
  fetchGroupExpenses,
  sendAddGroupExpense,
  friendlyError,
  isContractConfigured,
  explorerTxUrl,
  todayISO,
  TARGET,
  CATEGORIES,
  DEFAULT_CATEGORY,
} from '../lib/chain.js'
import { money, centsToDollars, formatDay, downloadExpensesCsv } from '../lib/format.js'
import GroupPayerTable from '../components/GroupPayerTable.jsx'
import { ExpenseTrackerEvents } from '../lib/chain.js'
import { CURRENCIES, getPreferredCurrency, setPreferredCurrency, loadRates, makeFormatter } from '../lib/currency.js'
import { computeSettlement } from '../lib/settle.js'
import { displayName } from '../lib/nicknames.js'

const CategoryChart = lazy(() => import('../components/CategoryChart.jsx'))

function displayDate(e) {
  const d = e.date ? new Date(`${e.date}T00:00:00`) : new Date(e.timestamp * 1000)
  return formatDay(d)
}

export default function GroupTracker({ wallet }) {
  const { groupId } = useParams()
  const { signer, connected } = wallet

  const [group, setGroup] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(DEFAULT_CATEGORY)
  const [date, setDate] = useState(todayISO())
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState(null)
  const [currency, setCurrency] = useState(getPreferredCurrency())
  const [rates, setRates] = useState(null)
  const [rateInfo, setRateInfo] = useState(null)
  const [nameBump, setNameBump] = useState(0)

  const showToast = useCallback((kind, text, url) => {
    setToast({ kind, text, url })
    if (kind !== 'error') setTimeout(() => setToast(null), 6000)
  }, [])

  const total = useMemo(
    () => expenses.reduce((sum, e) => sum + centsToDollars(e.amount), 0),
    [expenses],
  )

  const fmt = useMemo(() => {
    if (rates) return makeFormatter(currency, rates)
    return (cents) => money.format(centsToDollars(cents))
  }, [currency, rates])

  const settlement = useMemo(() => computeSettlement(expenses), [expenses])
  void nameBump // re-render trigger after a nickname edit

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // A group id is a bytes32 hex string. If the URL param is malformed,
      // don't hand it to ethers (which throws a cryptic error) -- show the
      // clean "not found" screen instead.
      if (!/^0x[0-9a-fA-F]{64}$/.test(groupId || '')) {
        setNotFound(true)
        return
      }
      // Read-only provider: MUST work with no wallet connected, since anyone
      // with the link should be able to view the ledger.
      const provider = getReadOnlyProvider()
      const info = await fetchGroupInfo(provider, groupId)
      if (!info) {
        setNotFound(true)
        return
      }
      setGroup(info)
      const rows = await fetchGroupExpenses(provider, groupId)
      setExpenses([...rows].sort((a, b) => b.timestamp - a.timestamp))
    } catch (err) {
      console.error(err)
      showToast('error', `Could not load group: ${friendlyError(err)}`)
    } finally {
      setLoading(false)
    }
  }, [groupId, showToast])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    let cancelled = false
    loadRates().then((r) => {
      if (cancelled) return
      setRates(r.rates)
      setRateInfo(r)
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const off = ExpenseTrackerEvents.onGroupExpenseAdded(groupId, () => {
      showToast('info', 'New entry added to this ledger.')
      load()
    })
    return off
  }, [groupId, load, showToast])

  async function handleAdd(e) {
    e.preventDefault()
    if (!connected) return showToast('error', 'Connect your wallet first.')
    const dollars = Number(amount)
    if (!Number.isFinite(dollars) || dollars <= 0) return showToast('error', 'Enter an amount greater than 0.')
    if (!description.trim()) return showToast('error', 'Enter a description.')
    if (!date) return showToast('error', 'Pick a date.')
    const cents = Math.round(dollars * 100)

    setBusy(true)
    try {
      showToast('info', 'Confirm the transaction in MetaMask…')
      const receipt = await sendAddGroupExpense(signer, groupId, cents, category, description.trim(), date)
      setAmount('')
      setDescription('')
      setCategory(DEFAULT_CATEGORY)
      setDate(todayISO())
      const url = receipt?.hash ? explorerTxUrl(receipt.hash) : null
      showToast('success', 'Saved to the shared ledger on-chain.', url)
      await load()
    } catch (err) {
      showToast('error', friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  const contractMissing = !isContractConfigured()

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 h-32 animate-pulse rounded-xl border border-slate-200 bg-white" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Group not found</h1>
        <p className="mt-2 text-sm text-slate-500">
          Double-check the link you were given, or create a new shared ledger.
        </p>
        <Link
          to="/tracker"
          className="mt-6 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Go to your tracker
        </Link>
      </div>
    )
  }

  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{group.name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          A shared ledger on {TARGET.chainName} — anyone with this link can view every entry and
          verify who contributed what. No wallet required to look; connect one to add an expense.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <input
            readOnly
            value={shareUrl}
            onClick={(e) => e.target.select()}
            className="w-full max-w-md rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-500"
          />
          <button
            onClick={() => {
              navigator.clipboard?.writeText(shareUrl)
              showToast('info', 'Link copied.')
            }}
            className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Copy link
          </button>
        </div>
      </div>

      {contractMissing && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Contract address not set. Deploy the contract and paste its address into{' '}
          <code>src/lib/chain.js</code>.
        </div>
      )}

      {/* Summary */}
      <div className="mb-8 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Total logged</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{fmt(Math.round(total * 100))}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Entries</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{expenses.length}</p>
        </div>
      </div>

      {/* Currency selector + FX note */}
      <div className="mb-4 flex items-center gap-2 text-xs text-slate-500">
        <span>Show amounts in</span>
        <select
          value={currency}
          onChange={(e) => { setCurrency(e.target.value); setPreferredCurrency(e.target.value) }}
          className="rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-emerald-500 focus:outline-none"
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>{c.code} — {c.label}</option>
          ))}
        </select>
        {rateInfo && currency !== 'USD' && (
          <span className="text-slate-400">
            {rateInfo.source === 'live' ? `live rate${rateInfo.date ? ` · ${rateInfo.date}` : ''}` : `${rateInfo.source} rate`}
          </span>
        )}
      </div>

      {/* Settle up — who owes whom (off-chain math from on-chain data) */}
      {settlement.transfers.length > 0 && (
        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-400">Settle up</h2>
          <p className="mb-3 text-xs text-slate-400">
            Equal split across contributors · {fmt(settlement.perHead)} each. Computed from on-chain entries.
          </p>
          <ul className="space-y-2">
            {settlement.transfers.map((t, i) => (
              <li key={i} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                <span>
                  <span className="font-medium text-rose-600">{displayName(t.from)}</span>
                  <span className="mx-1.5 text-slate-400">pays</span>
                  <span className="font-medium text-emerald-700">{displayName(t.to)}</span>
                </span>
                <span className="font-semibold tabular-nums text-slate-900">{fmt(t.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Who contributed */}
      <GroupPayerTable expenses={expenses} formatAmount={fmt} onRenamed={() => setNameBump((n) => n + 1)} />

      {/* Spending-by-category chart */}
      <Suspense fallback={null}>
        <CategoryChart expenses={expenses} />
      </Suspense>

      {/* Add expense form (only usable once connected) */}
      <form onSubmit={handleAdd} className="mb-8 rounded-xl border border-slate-200 bg-white p-5">
        {!connected ? (
          <div className="flex flex-col items-start gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>Connect your wallet to add an expense to this shared ledger.</span>
            <Link
              to="/login"
              className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
            >
              Connect wallet
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
              <div className="sm:col-span-1">
                <label className="mb-1 block text-xs font-medium text-slate-500">Amount (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="12.50"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-500">Description</label>
                <input
                  type="text"
                  maxLength={180}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Rent, groceries, dinner…"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="sm:col-span-1">
                <label className="mb-1 block text-xs font-medium text-slate-500">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-1">
                <label className="mb-1 block text-xs font-medium text-slate-500">Date</label>
                <input
                  type="date"
                  value={date}
                  max={todayISO()}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={busy || contractMissing}
              className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {busy ? 'Working…' : 'Add expense to this group'}
            </button>
          </>
        )}
      </form>

      {/* List */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Ledger entries
          </h2>
          {expenses.length > 0 && (
            <button
              onClick={() => downloadExpensesCsv(expenses, `${group.name.replace(/\s+/g, '-')}-ledger.csv`)}
              className="text-xs font-medium text-emerald-700 underline hover:text-emerald-800"
            >
              Export CSV
            </button>
          )}
        </div>

        {expenses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
            No expenses logged to this group yet.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {expenses.map((e, i) => (
              <li key={i} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900">{e.description}</p>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                      {e.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {displayDate(e)} · logged by{' '}
                    <span className="font-medium text-slate-500">{displayName(e.payer)}</span>
                  </p>
                </div>
                <p className="font-semibold tabular-nums text-slate-900">
                  {fmt(e.amount)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {toast && (
        <div className="fixed bottom-4 left-1/2 z-20 w-[92%] max-w-md -translate-x-1/2">
          <div
            className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg ${
              toast.kind === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : toast.kind === 'error'
                  ? 'border-red-200 bg-red-50 text-red-800'
                  : 'border-slate-200 bg-white text-slate-700'
            }`}
          >
            <div className="break-words">
              {toast.text}
              {toast.url && (
                <>
                  {' '}
                  <a className="underline" href={toast.url} target="_blank" rel="noreferrer">
                    View transaction →
                  </a>
                </>
              )}
            </div>
            <button onClick={() => setToast(null)} className="shrink-0 text-slate-400 hover:text-slate-700" aria-label="Dismiss">
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

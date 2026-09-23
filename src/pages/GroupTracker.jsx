import { useCallback, useEffect, useMemo, useState, lazy, Suspense } from 'react'
import { useParams, Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import {
  getReadOnlyProvider,
  fetchGroupInfo,
  fetchGroupExpenses,
  sendAddGroupExpense,
  friendlyError,
  isContractConfigured,
  explorerTxUrl,
  explorerAddressUrl,
  CONTRACT_ADDRESS,
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
import { rememberGroup } from '../lib/groupStore.js'

const CategoryChart = lazy(() => import('../components/CategoryChart.jsx'))

function displayDate(e) {
  const d = e.date ? new Date(`${e.date}T00:00:00`) : new Date(e.timestamp * 1000)
  return formatDay(d)
}

export default function GroupTracker({ wallet }) {
  const { groupId } = useParams()
  const { signer, connected, address } = wallet

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
  const [searchQuery, setSearchQuery] = useState('')

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

  const visibleExpenses = useMemo(() => {
    if (!searchQuery.trim()) return expenses
    const q = searchQuery.toLowerCase().trim()
    return expenses.filter(
      (e) =>
        e.description.toLowerCase().includes(q) ||
        (e.date && e.date.toLowerCase().includes(q)) ||
        e.category.toLowerCase().includes(q) ||
        displayName(e.payer).toLowerCase().includes(q) ||
        e.payer.toLowerCase().includes(q),
    )
  }, [expenses, searchQuery])

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
      if (connected && address) {
        rememberGroup(address, groupId, info.name)
      }
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
        <div className="flex items-center gap-3">
          <div className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
          </div>
          <span className="text-sm font-medium text-neutral-400">Loading ledger data from {TARGET.chainName}…</span>
        </div>
        <div className="mt-6 h-32 animate-pulse rounded-2xl border border-white/10 bg-neutral-900/60" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-neutral-400">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-white">Ledger not found</h1>
        <p className="mt-2 text-sm text-neutral-400">
          This shared ledger was not found on <span className="font-semibold text-neutral-200">{TARGET.chainName}</span>.
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          Double-check the link or ID, or create a new ledger.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/tracker"
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-950/40 transition hover:bg-emerald-500"
          >
            Go to your tracker
          </Link>
          <Link
            to="/ledgers"
            className="rounded-xl border border-white/15 bg-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-200 shadow-sm transition hover:bg-neutral-800 hover:text-white"
          >
            Browse all ledgers
          </Link>
        </div>
      </div>
    )
  }

  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{group.name}</h1>
        <p className="mt-1 text-sm text-neutral-400">
          A shared ledger on {TARGET.chainName} — anyone with this link can view every entry and
          verify who contributed what. No wallet required to look; connect one to add an expense.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <input
            readOnly
            value={shareUrl}
            onClick={(e) => e.target.select()}
            className="w-full max-w-md rounded-lg border border-white/15 bg-neutral-950 px-3 py-1.5 text-xs text-neutral-300 focus:border-emerald-500 focus:outline-none"
          />
          <button
            onClick={() => {
              navigator.clipboard?.writeText(shareUrl)
              showToast('info', 'Link copied.')
            }}
            className="shrink-0 rounded-lg border border-white/15 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-800 hover:text-white"
          >
            Copy link
          </button>
        </div>
        {shareUrl && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-neutral-950 p-3">
            <div className="rounded-lg bg-white p-2">
              <QRCodeSVG value={shareUrl} size={88} level="M" />
            </div>
            <div className="text-xs text-neutral-400">
              <p className="font-medium text-neutral-200">Scan to open this ledger</p>
              <p className="mt-0.5">Point a phone camera here to view every entry on {TARGET.chainName} — no wallet needed to look.</p>
            </div>
          </div>
        )}
      </div>

      {contractMissing && (
        <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          Contract address not set. Deploy the contract and paste its address into{' '}
          <code>src/lib/chain.js</code>.
        </div>
      )}

      {/* Summary */}
      <div className="mb-8 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/10 bg-neutral-900/80 px-5 py-4 shadow-xl backdrop-blur-sm">
          <p className="text-xs uppercase tracking-wider text-neutral-400">Total logged</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-white">{fmt(Math.round(total * 100))}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-neutral-900/80 px-5 py-4 shadow-xl backdrop-blur-sm">
          <p className="text-xs uppercase tracking-wider text-neutral-400">Entries</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-white">{expenses.length}</p>
        </div>
      </div>

      {/* Currency selector + FX note */}
      <div className="mb-4 flex items-center gap-2 text-xs text-neutral-400">
        <span>Show amounts in</span>
        <select
          value={currency}
          onChange={(e) => { setCurrency(e.target.value); setPreferredCurrency(e.target.value) }}
          className="rounded-lg border border-white/15 bg-neutral-950 px-2.5 py-1 text-xs text-white focus:border-emerald-500 focus:outline-none"
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>{c.code} — {c.label}</option>
          ))}
        </select>
        {rateInfo && currency !== 'USD' && (
          <span className="text-neutral-500">
            {rateInfo.source === 'live' ? `live rate${rateInfo.date ? ` · ${rateInfo.date}` : ''}` : `${rateInfo.source} rate`}
          </span>
        )}
      </div>

      {/* Settle up — who owes whom (off-chain math from on-chain data) */}
      {settlement.transfers.length > 0 && (
        <div className="mb-8 rounded-2xl border border-white/10 bg-neutral-900/80 p-5 shadow-xl backdrop-blur-sm">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-400">Settle up</h2>
          <p className="mb-3 text-xs text-neutral-500">
            Equal split across contributors · {fmt(settlement.perHead)} each. Computed from on-chain entries.
          </p>
          <ul className="space-y-2">
            {settlement.transfers.map((t, i) => (
              <li key={i} className="flex items-center justify-between rounded-xl border border-white/5 bg-neutral-950/60 px-3.5 py-2.5 text-sm">
                <span>
                  <span className="font-medium text-rose-400">{displayName(t.from)}</span>
                  <span className="mx-1.5 text-neutral-500">pays</span>
                  <span className="font-medium text-emerald-400">{displayName(t.to)}</span>
                </span>
                <span className="font-semibold tabular-nums text-white">{fmt(t.amount)}</span>
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
      <form onSubmit={handleAdd} className="mb-8 rounded-2xl border border-white/10 bg-neutral-900/80 p-5 shadow-xl backdrop-blur-sm">
        {!connected ? (
          <div className="flex flex-col items-start gap-3 text-sm text-neutral-400 sm:flex-row sm:items-center sm:justify-between">
            <span>Connect your wallet to add an expense to this shared ledger.</span>
            <Link
              to="/login"
              className="shrink-0 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-950/30 hover:bg-emerald-500"
            >
              Connect wallet
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
              <div className="sm:col-span-1">
                <label className="mb-1 block text-xs font-medium text-neutral-400">Amount (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="12.50"
                  className="w-full rounded-lg border border-white/15 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-neutral-400">Description</label>
                <input
                  type="text"
                  maxLength={180}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Rent, groceries, dinner…"
                  className="w-full rounded-lg border border-white/15 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="sm:col-span-1">
                <label className="mb-1 block text-xs font-medium text-neutral-400">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-neutral-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-1">
                <label className="mb-1 block text-xs font-medium text-neutral-400">Date</label>
                <input
                  type="date"
                  value={date}
                  max={todayISO()}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-neutral-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 [color-scheme:dark]"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={busy || contractMissing}
              className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-950/40 transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {busy ? 'Working…' : 'Add expense to this group'}
            </button>
          </>
        )}
      </form>

      {/* List */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Ledger entries
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {expenses.length > 0 && (
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search entries…"
                  className="w-36 rounded-lg border border-white/15 bg-neutral-950 py-1 pl-7 pr-2 text-xs text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none sm:w-44"
                />
                <svg
                  className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            )}
            {expenses.length > 0 && (
              <button
                onClick={() => downloadExpensesCsv(visibleExpenses, `${group.name.replace(/\s+/g, '-')}-ledger.csv`)}
                className="text-xs font-medium text-emerald-400 underline hover:text-emerald-300"
              >
                Export CSV
              </button>
            )}
          </div>
        </div>

        {expenses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-neutral-900/40 px-4 py-8 text-center text-sm text-neutral-400">
            No expenses logged to this group yet.
          </div>
        ) : visibleExpenses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-neutral-900/40 px-4 py-8 text-center text-sm text-neutral-400">
            No entries match "{searchQuery}".
          </div>
        ) : (
          <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/80 shadow-xl backdrop-blur-sm">
            {visibleExpenses.map((e, i) => (
              <li key={i} className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-white/[0.02]">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white">{e.description}</p>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-medium text-neutral-300">
                      {e.category}
                    </span>
                  </div>
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-neutral-500">
                    <span>{displayDate(e)} · logged by <span className="font-medium text-neutral-300">{displayName(e.payer)}</span></span>
                    <a
                      href={explorerAddressUrl(CONTRACT_ADDRESS)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-0.5 text-emerald-500/70 transition-colors hover:text-emerald-400"
                      title="Verify on the BOT Chain explorer"
                    >
                      On-chain
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5h5m0 0v5m0-5L10 14M9 5H5v14h14v-4" />
                      </svg>
                    </a>
                  </p>
                </div>
                <p className="font-semibold tabular-nums text-white">
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
            className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-md ${
              toast.kind === 'success'
                ? 'border-emerald-500/30 bg-neutral-900/95 text-emerald-300'
                : toast.kind === 'error'
                  ? 'border-red-500/30 bg-neutral-900/95 text-red-300'
                  : 'border-white/15 bg-neutral-900/95 text-neutral-200'
            }`}
          >
            <div className="break-words">
              {toast.text}
              {toast.url && (
                <>
                  {' '}
                  <a className="underline hover:text-white" href={toast.url} target="_blank" rel="noreferrer">
                    View transaction →
                  </a>
                </>
              )}
            </div>
            <button onClick={() => setToast(null)} className="shrink-0 text-neutral-400 hover:text-white" aria-label="Dismiss">
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

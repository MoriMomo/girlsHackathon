import { useMemo, useState, useCallback, useRef, useEffect, lazy, Suspense } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  fetchExpenses,
  sendAddExpense,
  isContractConfigured,
  explorerTxUrl,
  todayISO,
  TARGET,
  CATEGORIES,
  DEFAULT_CATEGORY,
  friendlyError,
  randomGroupId,
  sendCreateGroup,
} from '../lib/chain.js'
import { scanReceipt, isAiAvailable } from '../lib/receiptScanner.js'
import { money, centsToDollars, formatDay, downloadExpensesCsv, categoryColor } from '../lib/format.js'
import { useCountUp } from '../lib/useCountUp.js'
import { listGroups, rememberGroup, parseGroupId } from '../lib/groupStore.js'
import { motion } from 'framer-motion'
const CategoryChart = lazy(() => import('../components/CategoryChart.jsx'))

function displayDate(e) {
  const d = e.date ? new Date(`${e.date}T00:00:00`) : new Date(e.timestamp * 1000)
  return formatDay(d)
}

function isThisMonth(e) {
  const d = e.date ? new Date(`${e.date}T00:00:00`) : new Date(e.timestamp * 1000)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

export default function Tracker({ wallet }) {
  const { provider, signer, address, connected } = wallet

  const navigate = useNavigate()
  const [groupNameInput, setGroupNameInput] = useState('')
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [savedGroups, setSavedGroups] = useState([])
  const [openGroupInput, setOpenGroupInput] = useState('')

  const [expenses, setExpenses] = useState([])
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(DEFAULT_CATEGORY)
  const [date, setDate] = useState(todayISO())
  const [filterCategory, setFilterCategory] = useState('All')
  const [toast, setToast] = useState(null)
  const [busy, setBusy] = useState(false)
  const [loadingList, setLoadingList] = useState(false)
  const [scanning, setScanning] = useState(false)
  const fileInputRef = useRef(null)

  const total = useMemo(
    () => expenses.reduce((sum, e) => sum + centsToDollars(e.amount), 0),
    [expenses],
  )
  const monthTotal = useMemo(
    () => expenses.filter(isThisMonth).reduce((sum, e) => sum + centsToDollars(e.amount), 0),
    [expenses],
  )
  const visibleExpenses = useMemo(
    () => (filterCategory === 'All' ? expenses : expenses.filter((e) => e.category === filterCategory)),
    [expenses, filterCategory],
  )

  const showToast = useCallback((kind, text, url) => {
    setToast({ kind, text, url })
    if (kind !== 'error') setTimeout(() => setToast(null), 6000)
  }, [])

  const refresh = useCallback(async () => {
    if (!provider || !address) return
    setLoadingList(true)
    try {
      const rows = await fetchExpenses(provider, address)
      setExpenses([...rows].reverse())
    } catch (err) {
      console.error(err)
      showToast('error', `Could not load expenses: ${friendlyError(err)}`)
    } finally {
      setLoadingList(false)
    }
  }, [provider, address, showToast])

  useEffect(() => {
    if (connected) refresh()
    else setExpenses([])
  }, [connected, address, refresh])

  useEffect(() => {
    setSavedGroups(connected ? listGroups(address) : [])
  }, [connected, address])

  async function handleScanFile(e) {
    const file = e.target.files?.[0]
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!file) return
    setScanning(true)
    try {
      const result = await scanReceipt({ file, hintText: file.name })
      if (result.amount != null) setAmount(String(result.amount))
      if (result.description) setDescription(result.description)
      if (result.date) setDate(result.date)
      if (result.category) setCategory(result.category)
      if (result.mode === 'ai') {
        showToast('info', 'AI read this receipt. Review the fields, then save.')
      } else if (result.fallbackReason?.includes('503')) {
        showToast('info', 'AI server is currently at capacity (503). Pre-filled local guess — please verify.')
      } else {
        showToast('info', 'Local scan pre-filled a best guess. Review the fields, then save.')
      }
    } catch (err) {
      showToast('error', `Scan failed: ${err.message || err}. Enter it manually.`)
    } finally {
      setScanning(false)
    }
  }

  async function handleAdd(e) {
    e.preventDefault()
    const dollars = Number(amount)
    if (!Number.isFinite(dollars) || dollars <= 0) return showToast('error', 'Enter an amount greater than 0.')
    if (!description.trim()) return showToast('error', 'Enter a description.')
    if (!date) return showToast('error', 'Pick a date.')
    const cents = Math.round(dollars * 100)

    setBusy(true)
    try {
      showToast('info', 'Confirm the transaction in MetaMask…')
      const receipt = await sendAddExpense(signer, cents, category, description.trim(), date)
      setAmount('')
      setDescription('')
      setCategory(DEFAULT_CATEGORY)
      setDate(todayISO())
      const url = receipt?.hash ? explorerTxUrl(receipt.hash) : null
      showToast('success', 'Saved on-chain.', url)
      await refresh()
    } catch (err) {
      showToast('error', friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateGroup(e) {
    e.preventDefault()
    if (!connected) return showToast('error', 'Connect your wallet first.')
    if (!groupNameInput.trim()) return showToast('error', 'Enter a name for the group.')

    setCreatingGroup(true)
    try {
      const groupId = randomGroupId()
      showToast('info', 'Confirm the transaction in MetaMask…')
      const name = groupNameInput.trim()
      await sendCreateGroup(signer, groupId, name)
      rememberGroup(address, groupId, name)
      navigate(`/group/${groupId}`)
    } catch (err) {
      showToast('error', friendlyError(err))
    } finally {
      setCreatingGroup(false)
    }
  }

  const contractMissing = !isContractConfigured()
  const aiOn = isAiAvailable()

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Your expense tracker</h1>
        <p className="mt-1 text-sm text-slate-500">
          Entries are committed directly to {TARGET.chainName} — public, immutable, and verifiable
          on the block explorer.
        </p>
      </div>

      {!connected && (
        <div className="mb-6 flex flex-col items-start gap-3 rounded-lg border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-800 sm:flex-row sm:items-center sm:justify-between">
          <span>Connect your wallet to add and view your on-chain records.</span>
          <Link
            to="/login"
            className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
          >
            Connect wallet
          </Link>
        </div>
      )}
      {contractMissing && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Contract address not set. Deploy the contract and paste its address into{' '}
          <code>src/lib/chain.js</code>.
        </div>
      )}

      {/* Summary */}
      <div className="mb-8 grid grid-cols-3 gap-3">
        <StatTile label="Total logged" value={total} format={(v) => money.format(v)} accent />
        <StatTile label="Entries" value={expenses.length} format={(v) => String(Math.round(v))} />
        <StatTile label="This month" value={monthTotal} format={(v) => money.format(v)} />
      </div>

      {/* Spending-by-category chart */}
      <Suspense fallback={null}>
        <CategoryChart expenses={expenses} />
      </Suspense>

      {/* Form */}
      <div className="mb-4 border-t border-slate-200 pt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Personal</h2>
        <p className="mt-1 text-sm text-slate-500">Your own expenses, logged to your wallet.</p>
      </div>
      <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">Add an expense</h3>
      <form onSubmit={handleAdd} className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleScanFile} className="hidden" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={scanning}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M14.5 4h-5L8 6H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-4l-1.5-2Z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
            {scanning ? 'Scanning…' : 'Scan receipt'}
          </button>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${aiOn ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}
            title={
              aiOn
                ? 'A Gemini key is configured: real AI vision scan.'
                : 'No AI key set: uses a local heuristic. Add VITE_GEMINI_API_KEY to enable AI vision.'
            }
          >
            <span className={`h-1.5 w-1.5 rounded-full ${aiOn ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            {aiOn ? 'AI vision on' : 'Local mode'}
          </span>
        </div>

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
              placeholder="Lunch, bus fare, groceries…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="sm:col-span-1">
            <label className="mb-1 block text-xs font-medium text-slate-500">Category</label>
            <div className="relative">
              <span
                className="pointer-events-none absolute left-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full"
                style={{ backgroundColor: categoryColor(category) }}
                aria-hidden="true"
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 pl-7 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
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
          disabled={!connected || busy || contractMissing}
          className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-700 hover:shadow-md hover:shadow-emerald-600/25 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {busy ? 'Working…' : connected ? 'Save expense on-chain' : 'Connect wallet to save'}
        </button>
      </form>

      {/* ============ SHARED SECTION ============ */}
      <div className="mb-4 border-t border-slate-200 pt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Shared ledgers</h2>
        <p className="mt-1 text-sm text-slate-500">
          Splitting rent, a trip fund, or club dues? Create a shared ledger anyone can contribute
          to and verify — no one has to trust a single spreadsheet.
        </p>
      </div>

      {/* Your saved shared ledgers */}
      {savedGroups.length > 0 && (
        <ul className="mb-4 grid gap-2 sm:grid-cols-2">
          {savedGroups.map((g) => (
            <li key={g.id}>
              <Link
                to={`/group/${g.id}`}
                className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/40"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-900">{g.name}</span>
                  <span className="block truncate font-mono text-[11px] text-slate-400">
                    {g.id.slice(0, 10)}…{g.id.slice(-6)}
                  </span>
                </span>
                <span className="ml-3 shrink-0 text-slate-300 transition group-hover:text-emerald-500">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Create + recover */}
      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <form onSubmit={handleCreateGroup} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            maxLength={80}
            value={groupNameInput}
            onChange={(e) => setGroupNameInput(e.target.value)}
            placeholder="Name a new ledger — e.g. Apartment 4B, Bali Trip Fund"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={!connected || creatingGroup || contractMissing}
            className="shrink-0 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creatingGroup ? 'Creating…' : connected ? 'Create shared ledger' : 'Connect wallet first'}
          </button>
        </form>

        {/* Recovery: open an existing ledger by link or id */}
        <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row">
          <input
            type="text"
            value={openGroupInput}
            onChange={(e) => setOpenGroupInput(e.target.value)}
            placeholder="Have a ledger link or ID? Paste it to open"
            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            type="button"
            onClick={() => {
              const id = parseGroupId(openGroupInput)
              if (!id) return showToast('error', 'That does not look like a valid ledger link or ID.')
              if (connected) rememberGroup(address, id, 'Shared ledger')
              navigate(`/group/${id}`)
            }}
            className="shrink-0 rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Open ledger
          </button>
        </div>
      </div>

      {/* List */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Personal records</h2>
          <div className="flex items-center gap-3">
            {expenses.length > 0 && (
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-600 focus:border-emerald-500 focus:outline-none"
              >
                {['All', ...CATEGORIES].map((c) => (
                  <option key={c} value={c}>
                    {c === 'All' ? 'All categories' : c}
                  </option>
                ))}
              </select>
            )}
            {expenses.length > 0 && (
              <button
                onClick={() => downloadExpensesCsv(expenses)}
                className="text-xs font-medium text-emerald-700 underline hover:text-emerald-800"
              >
                Export CSV
              </button>
            )}
          </div>
        </div>

        {!connected ? (
          <EmptyRow
            text="Connect your wallet to see your records."
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                <rect x="3" y="6" width="18" height="13" rx="2" />
                <path d="M16 12h3" />
                <path d="M3 9h13a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H3" />
              </svg>
            }
          />
        ) : loadingList ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg border border-slate-200 bg-white" />
            ))}
          </div>
        ) : visibleExpenses.length === 0 ? (
          <EmptyRow
            text={
              expenses.length === 0
                ? 'No expenses yet. Add your first one above.'
                : 'No expenses in this category.'
            }
          />
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {visibleExpenses.map((e, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.3), ease: 'easeOut' }}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-slate-900">{e.description}</p>
                    <span
                      className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{
                        color: categoryColor(e.category),
                        backgroundColor: `${categoryColor(e.category)}1a`,
                      }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: categoryColor(e.category) }} />
                      {e.category}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">{displayDate(e)}</p>
                </div>
                <p className="shrink-0 font-semibold tabular-nums text-slate-900">
                  {money.format(centsToDollars(e.amount))}
                </p>
              </motion.li>
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

function StatTile({ label, value, format, accent = false }) {
  const animated = useCountUp(value)
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      {/* accent top edge */}
      <div
        className={`absolute inset-x-0 top-0 h-0.5 ${accent ? 'bg-emerald-500' : 'bg-slate-200'}`}
        aria-hidden="true"
      />
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1.5 text-xl font-bold tabular-nums sm:text-2xl ${accent ? 'text-emerald-600' : 'text-slate-900'}`}>
        {format ? format(animated) : animated}
      </p>
    </div>
  )
}

function EmptyRow({ text, icon }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        {icon || (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
            <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" />
            <path d="M4 10h16" />
          </svg>
        )}
      </div>
      <p className="text-sm text-slate-400">{text}</p>
    </div>
  )
}

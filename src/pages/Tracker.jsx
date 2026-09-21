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
import { money, centsToDollars, formatDay, downloadExpensesCsv } from '../lib/format.js'
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
      showToast(
        'info',
        result.mode === 'ai'
          ? 'AI read this receipt. Review the fields, then save.'
          : 'Local scan pre-filled a best guess. Review the fields, then save.',
      )
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
      await sendCreateGroup(signer, groupId, groupNameInput.trim())
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
          Each entry is written to {TARGET.chainName} — permanent, public, and impossible to edit or
          delete.
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
        <StatTile label="Total logged" value={money.format(total)} />
        <StatTile label="Entries" value={String(expenses.length)} />
        <StatTile label="This month" value={money.format(monthTotal)} />
      </div>

      {/* Spending-by-category chart */}
      <Suspense fallback={null}>
        <CategoryChart expenses={expenses} />
      </Suspense>

      {/* Form */}
      <form onSubmit={handleAdd} className="mb-8 rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleScanFile} className="hidden" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={scanning}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            {scanning ? 'Scanning…' : 'Scan receipt'}
          </button>
          <span
            className={`text-xs ${aiOn ? 'text-emerald-600' : 'text-slate-400'}`}
            title={
              aiOn
                ? 'A Gemini key is configured: real AI vision scan.'
                : 'No AI key set: uses a local heuristic. Add VITE_GEMINI_API_KEY to enable AI vision.'
            }
          >
            {aiOn ? 'AI vision on' : 'local mode'}
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
          disabled={!connected || busy || contractMissing}
          className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy ? 'Working…' : connected ? 'Save expense on-chain' : 'Connect wallet to save'}
        </button>
      </form>

      {/* Shared group ledgers */}
      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Shared ledgers
        </h2>
        <p className="mt-1 mb-4 text-sm text-slate-500">
          Splitting rent, a trip fund, or club dues? Create a shared ledger anyone can contribute
          to and verify — no one has to trust a single spreadsheet.
        </p>
        <form onSubmit={handleCreateGroup} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            maxLength={80}
            value={groupNameInput}
            onChange={(e) => setGroupNameInput(e.target.value)}
            placeholder="e.g. Apartment 4B, Bali Trip Fund…"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={!connected || creatingGroup || contractMissing}
            className="shrink-0 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {creatingGroup ? 'Creating…' : connected ? 'Create shared ledger' : 'Connect wallet first'}
          </button>
        </form>
      </div>

      {/* List */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Your records</h2>
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
          <EmptyRow text="Connect your wallet to see your records." />
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
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {visibleExpenses.map((e, i) => (
              <li key={i} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900">{e.description}</p>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                      {e.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{displayDate(e)}</p>
                </div>
                <p className="font-semibold tabular-nums text-slate-900">
                  {money.format(centsToDollars(e.amount))}
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

function StatTile({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{value}</p>
    </div>
  )
}

function EmptyRow({ text }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
      {text}
    </div>
  )
}

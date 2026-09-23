import { useMemo, useState, useCallback, useRef, useEffect, lazy, Suspense } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  fetchExpenses,
  sendAddExpense,
  isContractConfigured,
  explorerTxUrl,
  explorerAddressUrl,
  CONTRACT_ADDRESS,
  todayISO,
  TARGET,
  CATEGORIES,
  DEFAULT_CATEGORY,
  friendlyError,
  randomGroupId,
  sendCreateGroup,
  checkGroupExists,
  getReadOnlyProvider,
} from '../lib/chain.js'
import { scanReceipt, isAiAvailable } from '../lib/receiptScanner.js'
import { money, centsToDollars, formatDay, downloadExpensesCsv, categoryColor } from '../lib/format.js'
import { CURRENCIES, getPreferredCurrency, setPreferredCurrency, loadRates, makeFormatter } from '../lib/currency.js'
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
  const [searchQuery, setSearchQuery] = useState('')
  const [currency, setCurrency] = useState(getPreferredCurrency())
  const [rates, setRates] = useState(null)
  const [rateInfo, setRateInfo] = useState(null)
  const [toast, setToast] = useState(null)
  const [busy, setBusy] = useState(false)
  const [loadingList, setLoadingList] = useState(false)
  const [scanning, setScanning] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    loadRates().then((r) => {
      if (cancelled) return
      setRates(r.rates)
      setRateInfo(r)
    })
    return () => { cancelled = true }
  }, [])

  const fmt = useMemo(() => {
    if (rates) return makeFormatter(currency, rates)
    return (cents) => money.format(centsToDollars(cents))
  }, [currency, rates])

  const total = useMemo(
    () => expenses.reduce((sum, e) => sum + centsToDollars(e.amount), 0),
    [expenses],
  )
  const monthTotal = useMemo(
    () => expenses.filter(isThisMonth).reduce((sum, e) => sum + centsToDollars(e.amount), 0),
    [expenses],
  )
  const visibleExpenses = useMemo(() => {
    let list = expenses
    if (filterCategory !== 'All') {
      list = list.filter((e) => e.category === filterCategory)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          (e.date && e.date.toLowerCase().includes(q)) ||
          e.category.toLowerCase().includes(q),
      )
    }
    return list
  }, [expenses, filterCategory, searchQuery])

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
    if (!connected || !address) {
      setSavedGroups([])
      return
    }
    const local = listGroups(address)
    setSavedGroups(local)

    // Asynchronously verify on-chain existence on Mainnet
    if (local.length > 0) {
      let cancelled = false
      const p = provider || getReadOnlyProvider()
      Promise.all(
        local.map(async (g) => {
          const exists = await checkGroupExists(g.id, p)
          return exists ? g : null
        }),
      )
        .then((verified) => {
          if (!cancelled) {
            const valid = verified.filter(Boolean)
            if (valid.length !== local.length) {
              setSavedGroups(valid)
            }
          }
        })
        .catch(() => {
          /* keep local cache on transient network error */
        })

      return () => {
        cancelled = true
      }
    }
  }, [connected, address, provider])

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
        <h1 className="text-2xl font-semibold tracking-tight text-white">Your expense tracker</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Entries are committed directly to {TARGET.chainName} — public, immutable, and verifiable
          on the block explorer.
        </p>
      </div>

      {!connected && (
        <div className="mb-6 flex flex-col items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-300 sm:flex-row sm:items-center sm:justify-between">
          <span>Connect your wallet to add and view your on-chain records.</span>
          <Link
            to="/login"
            className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-950 transition hover:bg-emerald-500"
          >
            Connect wallet
          </Link>
        </div>
      )}
      {contractMissing && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          Contract address not set. Deploy the contract and paste its address into{' '}
          <code className="font-mono text-amber-200">src/lib/chain.js</code>.
        </div>
      )}

      {/* Summary */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <StatTile label="Total logged" value={total} format={(v) => fmt(Math.round(v * 100))} accent />
        <StatTile label="Entries" value={expenses.length} format={(v) => String(Math.round(v))} />
        <StatTile label="This month" value={monthTotal} format={(v) => fmt(Math.round(v * 100))} />
      </div>

      {/* Currency selector + FX note */}
      <div className="mb-8 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
        <span>Show amounts in</span>
        <select
          value={currency}
          onChange={(e) => {
            setCurrency(e.target.value)
            setPreferredCurrency(e.target.value)
          }}
          className="rounded-lg border border-white/15 bg-neutral-900 px-2 py-1 text-xs text-neutral-200 focus:border-emerald-500 focus:outline-none"
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code} className="bg-neutral-900 text-white">
              {c.code} — {c.label}
            </option>
          ))}
        </select>
        {rateInfo && currency !== 'USD' && (
          <span className="text-neutral-500">
            {rateInfo.source === 'live'
              ? `live rate${rateInfo.date ? ` · ${rateInfo.date}` : ''}`
              : `${rateInfo.source} rate`}
          </span>
        )}
      </div>

      {/* Spending-by-category chart */}
      <Suspense fallback={null}>
        <CategoryChart expenses={expenses} />
      </Suspense>

      {/* Form */}
      <div className="mb-4 border-t border-white/10 pt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Personal</h2>
        <p className="mt-1 text-sm text-neutral-400">Your own expenses, logged to your wallet.</p>
      </div>
      <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-400">Add an expense</h3>
      <form onSubmit={handleAdd} className="mb-8 rounded-xl border border-white/10 bg-neutral-900/80 p-5 shadow-md backdrop-blur-sm">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleScanFile} className="hidden" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={scanning}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-neutral-950 px-3 py-2 text-sm font-medium text-neutral-200 transition hover:border-white/30 hover:bg-neutral-800 disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M14.5 4h-5L8 6H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-4l-1.5-2Z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
            {scanning ? 'Scanning…' : 'Scan receipt'}
          </button>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${aiOn ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-white/10 bg-white/5 text-neutral-400'}`}
            title={
              aiOn
                ? 'A Gemini key is configured: real AI vision scan.'
                : 'No AI key set: uses a local heuristic. Add VITE_GEMINI_API_KEY to enable AI vision.'
            }
          >
            <span className={`h-1.5 w-1.5 rounded-full ${aiOn ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-neutral-500'}`} />
            {aiOn ? 'AI vision on' : 'Local mode'}
          </span>
        </div>

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
              placeholder="Lunch, bus fare, groceries…"
              className="w-full rounded-lg border border-white/15 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="sm:col-span-1">
            <label className="mb-1 block text-xs font-medium text-neutral-400">Category</label>
            <div className="relative">
              <span
                className="pointer-events-none absolute left-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full"
                style={{ backgroundColor: categoryColor(category) }}
                aria-hidden="true"
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-neutral-950 py-2 pl-7 pr-3 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-neutral-900 text-white">
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="sm:col-span-1">
            <label className="mb-1 block text-xs font-medium text-neutral-400">Date</label>
            <input
              type="date"
              value={date}
              max={todayISO()}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-neutral-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={!connected || busy || contractMissing}
          className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-950 transition hover:bg-emerald-500 hover:shadow-emerald-900/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Working…' : connected ? 'Save expense on-chain' : 'Connect wallet to save'}
        </button>
      </form>

      {/* ============ SHARED SECTION ============ */}
      <div className="mb-4 border-t border-white/10 pt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Shared ledgers</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            {TARGET.chainName}
          </span>
        </div>
        <p className="mt-1 text-sm text-neutral-400">
          Splitting rent, a trip fund, or club dues? Create a shared ledger on {TARGET.chainName} anyone can contribute
          to and verify — no one has to trust a single spreadsheet.
        </p>
      </div>

      {/* Your saved shared ledgers */}
      {savedGroups.length > 0 ? (
        <ul className="mb-4 grid gap-2 sm:grid-cols-2">
          {savedGroups.map((g) => (
            <li key={g.id}>
              <Link
                to={`/group/${g.id}`}
                className="group flex items-center justify-between rounded-xl border border-white/10 bg-neutral-900/80 px-4 py-3 shadow-sm transition hover:border-emerald-500/40 hover:bg-emerald-950/20"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-white">{g.name}</span>
                  <span className="block truncate font-mono text-[11px] text-neutral-400">
                    {g.id.slice(0, 10)}…{g.id.slice(-6)}
                  </span>
                </span>
                <span className="ml-3 shrink-0 text-neutral-500 transition group-hover:text-emerald-400">→</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : connected ? (
        <div className="mb-4 rounded-xl border border-dashed border-white/15 bg-neutral-900/40 px-4 py-6 text-center text-xs text-neutral-500">
          No shared ledgers on {TARGET.chainName} yet. Create one below or paste a ledger link.
        </div>
      ) : null}

      {/* Create + recover */}
      <div className="mb-8 rounded-xl border border-white/10 bg-neutral-900/80 p-5 shadow-md backdrop-blur-sm">
        <form onSubmit={handleCreateGroup} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            maxLength={80}
            value={groupNameInput}
            onChange={(e) => setGroupNameInput(e.target.value)}
            placeholder="Name a new ledger — e.g. Apartment 4B, Bali Trip Fund"
            className="flex-1 rounded-lg border border-white/15 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={!connected || creatingGroup || contractMissing}
            className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-950 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creatingGroup ? 'Creating…' : connected ? 'Create shared ledger' : 'Connect wallet first'}
          </button>
        </form>

        {/* Recovery: open an existing ledger by link or id */}
        <div className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-3 sm:flex-row">
          <input
            type="text"
            value={openGroupInput}
            onChange={(e) => setOpenGroupInput(e.target.value)}
            placeholder="Have a ledger link or ID? Paste it to open"
            className="flex-1 rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            type="button"
            onClick={() => {
              const id = parseGroupId(openGroupInput)
              if (!id) return showToast('error', 'That does not look like a valid ledger link or ID.')
              if (connected) rememberGroup(address, id, 'Shared ledger')
              navigate(`/group/${id}`)
            }}
            className="shrink-0 rounded-lg border border-white/15 bg-neutral-800 px-4 py-2 text-xs font-medium text-neutral-300 transition hover:bg-neutral-700 hover:text-white"
          >
            Open ledger
          </button>
        </div>
      </div>

      {/* List */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Personal records</h2>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {expenses.length > 0 && (
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search expenses…"
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
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="rounded-lg border border-white/15 bg-neutral-900 px-2 py-1 text-xs text-neutral-200 focus:border-emerald-500 focus:outline-none"
              >
                {['All', ...CATEGORIES].map((c) => (
                  <option key={c} value={c} className="bg-neutral-900 text-white">
                    {c === 'All' ? 'All categories' : c}
                  </option>
                ))}
              </select>
            )}
            {expenses.length > 0 && (
              <button
                onClick={() => downloadExpensesCsv(visibleExpenses)}
                className="text-xs font-medium text-emerald-400 underline hover:text-emerald-300"
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
              <div key={i} className="h-16 animate-pulse rounded-xl border border-white/10 bg-neutral-900/60" />
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
          <ul className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10 bg-neutral-900/80 shadow-md">
            {visibleExpenses.map((e, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.3), ease: 'easeOut' }}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-white">{e.description}</p>
                    <span
                      className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{
                        color: categoryColor(e.category),
                        backgroundColor: `${categoryColor(e.category)}22`,
                      }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: categoryColor(e.category) }} />
                      {e.category}
                    </span>
                  </div>
                  <p className="mt-0.5 flex items-center gap-2 text-xs text-neutral-500">
                    <span>{displayDate(e)}</span>
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
                <p className="shrink-0 font-semibold tabular-nums text-white">
                  {fmt(e.amount)}
                </p>
              </motion.li>
            ))}
          </ul>
        )}
      </section>

      {toast && (
        <div className="fixed bottom-4 left-1/2 z-20 w-[92%] max-w-md -translate-x-1/2">
          <div
            className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-md ${
              toast.kind === 'success'
                ? 'border-emerald-500/40 bg-neutral-900/95 text-emerald-300'
                : toast.kind === 'error'
                  ? 'border-red-500/40 bg-neutral-900/95 text-red-300'
                  : 'border-white/15 bg-neutral-900/95 text-neutral-200'
            }`}
          >
            <div className="break-words">
              {toast.text}
              {toast.url && (
                <>
                  {' '}
                  <a className="underline text-emerald-400 hover:text-emerald-300" href={toast.url} target="_blank" rel="noreferrer">
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

function StatTile({ label, value, format, accent = false }) {
  const animated = useCountUp(value)
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-neutral-900/80 px-4 py-4 shadow-md backdrop-blur-sm">
      {/* accent top edge */}
      <div
        className={`absolute inset-x-0 top-0 h-0.5 ${accent ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-neutral-800'}`}
        aria-hidden="true"
      />
      <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className={`mt-1.5 text-xl font-bold tabular-nums sm:text-2xl ${accent ? 'text-emerald-400' : 'text-white'}`}>
        {format ? format(animated) : animated}
      </p>
    </div>
  )
}

function EmptyRow({ text, icon }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-neutral-900/50 px-4 py-12 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-neutral-400">
        {icon || (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
            <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" />
            <path d="M4 10h16" />
          </svg>
        )}
      </div>
      <p className="text-sm text-neutral-400">{text}</p>
    </div>
  )
}

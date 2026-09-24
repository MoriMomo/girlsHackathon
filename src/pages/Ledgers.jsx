import { useCallback, useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  getReadOnlyProvider,
  fetchGroupsByCreator,
  fetchAllGroups,
  isContractConfigured,
  TARGET,
} from '../lib/chain.js'
import { displayName } from '../lib/nicknames.js'
import { listGroups, parseGroupId } from '../lib/groupStore.js'
import { motion } from 'framer-motion'

export default function Ledgers({ wallet }) {
  const navigate = useNavigate()
  const { address, connected } = wallet
  const [tab, setTab] = useState(connected ? 'mine' : 'all') // 'mine' | 'all'
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [openInput, setOpenInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setGroups([]) // Clear previous list so loading state is immediately visible

    // Instant cache from localStorage (only meaningful for "mine" when connected).
    if (tab === 'mine' && connected) {
      const cached = listGroups(address)
      if (cached.length) {
        setGroups(cached.map((g) => ({ id: g.id, name: g.name, creator: address })))
      }
    }

    try {
      const provider = getReadOnlyProvider()
      const rows =
        tab === 'mine'
          ? connected
            ? await fetchGroupsByCreator(provider, address)
            : []
          : await fetchAllGroups(provider)
      setGroups(rows)
    } catch (err) {
      console.error(err)
      setError('Could not load ledgers from the chain. Try again in a moment.')
    } finally {
      setLoading(false)
    }
  }, [tab, connected, address])

  useEffect(() => {
    load()
  }, [load])

  const contractMissing = !isContractConfigured()

  const visibleGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups
    const q = searchQuery.toLowerCase().trim()
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.creator.toLowerCase().includes(q) ||
        displayName(g.creator).toLowerCase().includes(q),
    )
  }, [groups, searchQuery])

  function handleOpen(e) {
    e.preventDefault()
    const id = parseGroupId(openInput)
    if (!id) {
      setError('That does not look like a valid ledger link or ID.')
      return
    }
    navigate(`/group/${id}`)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pt-24 pb-8 sm:pt-28">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Shared ledgers</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Reconstructed live from {TARGET.chainName} — no database, no saved links needed. Open any
          ledger to view or contribute.
        </p>
      </div>

      {/* Tabs & Refresh action */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-white/10 bg-neutral-900/80 p-0.5 text-sm shadow-sm backdrop-blur-sm">
          <button
            onClick={() => setTab('mine')}
            className={`rounded-md px-4 py-1.5 font-medium transition ${
              tab === 'mine' ? 'bg-emerald-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            My ledgers
          </button>
          <button
            onClick={() => setTab('all')}
            className={`rounded-md px-4 py-1.5 font-medium transition ${
              tab === 'all' ? 'bg-emerald-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            All ledgers
          </button>
        </div>

        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-neutral-900/80 px-3 py-1.5 text-xs font-medium text-neutral-300 shadow-sm transition hover:bg-neutral-800 hover:text-white disabled:opacity-50 backdrop-blur-sm"
          title="Re-scan blockchain event logs"
        >
          <svg
            className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-emerald-400' : 'text-neutral-400'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>{loading ? 'Scanning chain…' : 'Refresh'}</span>
        </button>
      </div>

      {/* Open-by-link recovery form */}
      <form
        onSubmit={handleOpen}
        className="mb-6 flex flex-col gap-2 rounded-xl border border-white/10 bg-neutral-900/80 p-4 shadow-md backdrop-blur-sm sm:flex-row"
      >
        <input
          type="text"
          value={openInput}
          onChange={(e) => {
            setOpenInput(e.target.value)
            if (error) setError('')
          }}
          placeholder="Open a ledger by link or ID"
          className="flex-1 rounded-lg border border-white/15 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500"
        >
          Open
        </button>
      </form>

      {contractMissing && (
        <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          Contract address not set for {TARGET.chainName}.
        </div>
      )}
      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Content states */}
      {tab === 'mine' && !connected ? (
        <EmptyState
          text="Connect your wallet to see the ledgers you've created."
          cta={
            <Link
              to="/login"
              className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
            >
              Connect wallet
            </Link>
          }
        />
      ) : loading ? (
        /* ============ DEDICATED LOADING SCREEN ============ */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-neutral-900/80 p-8 sm:p-12 shadow-lg backdrop-blur-sm text-center">
          <div className="relative mb-4 flex h-14 w-14 items-center justify-center">
            {/* Spinning gradient ring */}
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-emerald-500/20 border-t-emerald-400" />
            {/* Center pulsing icon */}
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 shadow-inner">
              <svg className="h-5 w-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
          </div>

          <h3 className="text-base font-semibold text-white">
            Reconstructing ledgers from {TARGET.chainName}
          </h3>
          <p className="mt-1.5 max-w-md text-xs text-neutral-400">
            Querying on-chain <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-[11px] text-emerald-400">GroupCreated</code> event logs. Rebuilding ledger state directly from the blockchain with zero database.
          </p>

          {/* Skeleton cards preview */}
          <div className="mt-8 grid w-full gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="relative overflow-hidden rounded-xl border border-white/5 bg-neutral-950/60 p-4 text-left"
              >
                <div className="h-4 w-2/5 animate-pulse rounded bg-neutral-800" />
                <div className="mt-4 flex items-center justify-between">
                  <div className="h-3 w-1/3 animate-pulse rounded bg-neutral-800" />
                  <div className="h-3 w-3 animate-pulse rounded bg-neutral-800" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          text={
            tab === 'mine'
              ? `You haven't created any shared ledgers on ${TARGET.chainName} yet.`
              : `No shared ledgers found on ${TARGET.chainName} yet.`
          }
          cta={
            <Link
              to="/tracker"
              className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              Create a shared ledger
            </Link>
          }
        />
      ) : (
        <div>
          {/* Quick filter if multiple ledgers */}
          {groups.length > 2 && (
            <div className="mb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter ledgers by name or creator…"
                className="w-full rounded-lg border border-white/15 bg-neutral-950 px-3 py-1.5 text-xs text-white placeholder-neutral-500 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          )}

          {visibleGroups.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/10 bg-neutral-900/50 py-8 text-center text-xs text-neutral-400">
              No ledgers match "{searchQuery}".
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {visibleGroups.map((g, idx) => {
                const isCreator =
                  connected && address && g.creator.toLowerCase() === address.toLowerCase()
                return (
                  <motion.li
                    key={g.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(idx * 0.04, 0.2) }}
                  >
                    <Link
                      to={`/group/${g.id}`}
                      className="group flex h-full flex-col justify-between rounded-xl border border-white/10 bg-neutral-900/80 p-4 shadow-sm transition hover:border-emerald-500/40 hover:bg-emerald-950/20 hover:shadow"
                    >
                      <span className="font-medium text-white group-hover:text-emerald-300">
                        {g.name}
                      </span>
                      <span className="mt-3 flex items-center justify-between text-xs">
                        <span className="font-mono text-[11px] text-neutral-400">
                          by {isCreator ? 'You' : displayName(g.creator)}
                        </span>
                        <span className="text-neutral-500 transition group-hover:translate-x-0.5 group-hover:text-emerald-400">
                          →
                        </span>
                      </span>
                    </Link>
                  </motion.li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function EmptyState({ text, cta }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-neutral-900/50 px-4 py-14 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-neutral-400">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
          <path d="M4 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" />
        </svg>
      </div>
      <p className="text-sm text-neutral-400">{text}</p>
      {cta}
    </div>
  )
}


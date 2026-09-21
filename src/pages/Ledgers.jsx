import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getReadOnlyProvider,
  fetchGroupsByCreator,
  fetchAllGroups,
  isContractConfigured,
  TARGET,
} from '../lib/chain.js'
import { shortAddr } from '../lib/format.js'
import { listGroups, parseGroupId } from '../lib/groupStore.js'

export default function Ledgers({ wallet }) {
  const { address, connected } = wallet
  const [tab, setTab] = useState('mine') // 'mine' | 'all'
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [openInput, setOpenInput] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    // Instant cache from localStorage (only meaningful for "mine").
    if (tab === 'mine' && connected) {
      const cached = listGroups(address)
      if (cached.length) setGroups(cached.map((g) => ({ id: g.id, name: g.name, creator: address })))
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Shared ledgers</h1>
        <p className="mt-1 text-sm text-slate-500">
          Reconstructed live from {TARGET.chainName} — no database, no saved links needed. Open any
          ledger to view or contribute.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-5 inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm">
        <button
          onClick={() => setTab('mine')}
          className={`rounded-md px-4 py-1.5 font-medium transition ${
            tab === 'mine' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          My ledgers
        </button>
        <button
          onClick={() => setTab('all')}
          className={`rounded-md px-4 py-1.5 font-medium transition ${
            tab === 'all' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          All ledgers
        </button>
      </div>

      {/* Open-by-link recovery */}
      <div className="mb-6 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row">
        <input
          type="text"
          value={openInput}
          onChange={(e) => setOpenInput(e.target.value)}
          placeholder="Open a ledger by link or ID"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <a
          href={parseGroupId(openInput) ? `#/group/${parseGroupId(openInput)}` : undefined}
          onClick={(e) => {
            if (!parseGroupId(openInput)) {
              e.preventDefault()
              setError('That does not look like a valid ledger link or ID.')
            }
          }}
          className="shrink-0 rounded-lg border border-slate-300 px-4 py-2 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Open
        </a>
      </div>

      {contractMissing && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Contract address not set.
        </div>
      )}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {tab === 'mine' && !connected ? (
        <EmptyState
          text="Connect your wallet to see the ledgers you've created."
          cta={
            <Link
              to="/login"
              className="mt-4 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Connect wallet
            </Link>
          }
        />
      ) : loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          text={
            tab === 'mine'
              ? "You haven't created any shared ledgers yet."
              : 'No shared ledgers have been created yet.'
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {groups.map((g) => (
            <li key={g.id}>
              <Link
                to={`/group/${g.id}`}
                className="group flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/40"
              >
                <span className="font-medium text-slate-900">{g.name}</span>
                <span className="mt-2 flex items-center justify-between">
                  <span className="font-mono text-[11px] text-slate-400">
                    by {shortAddr(g.creator)}
                  </span>
                  <span className="text-slate-300 transition group-hover:text-emerald-500">→</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function EmptyState({ text, cta }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white px-4 py-14 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
          <path d="M4 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" />
        </svg>
      </div>
      <p className="text-sm text-slate-400">{text}</p>
      {cta}
    </div>
  )
}

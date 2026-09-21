import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { TARGET, fetchPlatformStats, getReadOnlyProvider } from '../lib/chain.js'
import { money, centsToDollars } from '../lib/format.js'
import ledgrLogo from '../assets/Green_and_White_Simple_Botanical_Blank_Pages_A5_Document-removebg-preview.png'
import LiveStatCard from '../components/LiveStatCard.jsx'

export default function Landing({ wallet }) {
  const navigate = useNavigate()
  const { connected, connecting, walletMissing, connect } = wallet

  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsAvailable, setStatsAvailable] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const provider = getReadOnlyProvider()
        const result = await fetchPlatformStats(provider)
        if (cancelled) return
        if (result) {
          setStats(result)
        } else {
          setStatsAvailable(false)
        }
      } catch {
        if (!cancelled) setStatsAvailable(false)
      } finally {
        if (!cancelled) setStatsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  async function handlePrimary() {
    if (connected) {
      navigate('/tracker')
      return
    }
    try {
      await connect()
      navigate('/tracker')
    } catch {
      /* error surfaced elsewhere */
    }
  }

  return (
    <div>
      {/* ================= HERO (dark, full-bleed) ================= */}
      <section className="relative overflow-hidden bg-black text-white">
        {/* Subtle glow accents -- pure CSS, no images */}
        <div
          className="pointer-events-none absolute left-1/2 top-[-10rem] h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-emerald-500/20 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-4xl px-4 pb-24 pt-20 text-center sm:pt-28">
          <img src={ledgrLogo} alt="ledgr" className="mx-auto mb-6 h-16 w-16 object-contain" />

          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-neutral-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Live on {TARGET.chainName}
          </span>

          <h1 className="mx-auto max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Expense records nobody can quietly edit.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-neutral-400 sm:text-lg">
            Connect a wallet, log an expense, and it&apos;s written permanently to{' '}
            {TARGET.chainName}. Create a shared ledger and anyone can verify who
            contributed what — no login, no trust required.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              onClick={handlePrimary}
              disabled={connecting || (walletMissing && !connected)}
              className="w-full rounded-lg bg-emerald-500 px-6 py-3 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 sm:w-auto"
            >
              {connected ? 'Go to your ledger' : connecting ? 'Connecting…' : 'Connect wallet and try it'}
            </button>
            <Link
              to="/tracker"
              className="w-full rounded-lg border border-white/15 px-6 py-3 text-center text-sm font-medium text-white hover:bg-white/5 sm:w-auto"
            >
              See the tracker first
            </Link>
          </div>

          {walletMissing && !connected && (
            <p className="mt-4 text-xs text-neutral-500">
              MetaMask not detected.{' '}
              <a className="underline hover:text-white" href="https://metamask.io" target="_blank" rel="noreferrer">
                Install it here
              </a>{' '}
              and refresh.
            </p>
          )}

          {/* Floating live-data card -- REAL numbers, not a mockup image */}
          {statsAvailable && (
            <div className="relative mx-auto mt-16 max-w-lg">
              <div className="rounded-2xl border border-white/10 bg-neutral-950/80 p-5 text-left shadow-2xl shadow-emerald-500/10 backdrop-blur">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                    Verified on-chain, right now
                  </span>
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <LiveStatCard
                    label="Expenses logged"
                    value={statsLoading ? null : String(stats?.totalExpenses ?? 0)}
                    loading={statsLoading}
                    accent
                  />
                  <LiveStatCard
                    label="Shared ledgers"
                    value={statsLoading ? null : String(stats?.totalGroups ?? 0)}
                    loading={statsLoading}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ================= KEY FEATURES ================= */}
      <section className="border-t border-white/10 bg-black py-20 text-white">
        <div className="mx-auto max-w-4xl px-4">
          <div className="mb-12 text-center">
            <span className="mb-3 inline-block rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-wide text-neutral-400">
              Features
            </span>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              What makes this different
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-neutral-400">
              Not a spreadsheet with extra steps. Every feature exists because it
              needs a blockchain to actually work.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FeatureCard
              icon={<LockIcon />}
              title="Permanent & public"
              body="Every entry is written on-chain. Nobody — not you, not the app owner — can quietly edit or delete a record after it's saved."
            />
            <FeatureCard
              icon={<UsersIcon />}
              title="Shared ledgers"
              body="Splitting rent, a trip fund, or club dues? Create a ledger anyone can contribute to and verify — no one has to trust a single spreadsheet."
            />
            <FeatureCard
              icon={<EyeIcon />}
              title="Verify without a wallet"
              body="Anyone with a shared ledger's link can view every entry and see exactly who paid what — no MetaMask, no login, no account needed to just look."
            />
            <FeatureCard
              icon={<SparkleIcon />}
              title="AI receipt scan"
              body="Snap a photo of a receipt and let AI pre-fill the amount, date, and category. Review it, then it's saved on-chain."
            />
          </div>
        </div>
      </section>

      {/* ================= NUMBERS THAT SPEAK ================= */}
      {statsAvailable && (
        <section className="border-t border-white/10 bg-neutral-950 py-20 text-white">
          <div className="mx-auto max-w-4xl px-4 text-center">
            <span className="mb-3 inline-block rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-wide text-neutral-400">
              Verified on-chain
            </span>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Numbers that speak</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-neutral-400">
              Nothing below is a marketing estimate. Every number is computed live
              from {TARGET.chainName} — check the block explorer yourself.
            </p>

            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              <BigStat
                label="Total value tracked"
                value={statsLoading ? null : money.format(centsToDollars((stats?.totalValueCents ?? 0n) + (stats?.groupValueCents ?? 0n)))}
                loading={statsLoading}
              />
              <BigStat
                label="Wallets that have logged an expense"
                value={statsLoading ? null : String(stats?.uniqueWallets ?? 0)}
                loading={statsLoading}
              />
              <BigStat
                label="Shared ledgers created"
                value={statsLoading ? null : String(stats?.totalGroups ?? 0)}
                loading={statsLoading}
              />
            </div>
          </div>
        </section>
      )}

      {/* ================= HOW IT WORKS ================= */}
      <section className="border-t border-white/10 bg-black py-20 text-white">
        <div className="mx-auto max-w-4xl px-4">
          <div className="grid gap-10 sm:grid-cols-3">
            <Step
              n="01"
              title="Connect MetaMask"
              body={`${TARGET.chainName} is added automatically. No manual setup. Takes about 10 seconds.`}
            />
            <Step
              n="02"
              title="Enter the expense"
              body="Amount, description, date. Or scan a receipt and let AI extract the details."
            />
            <Step
              n="03"
              title="Confirm in MetaMask"
              body="That's it. The record is on-chain. Open the block explorer and it's right there."
            />
          </div>
        </div>
      </section>

      {/* ================= WHY DOES THIS EXIST ================= */}
      <section className="border-t border-white/10 bg-black py-20 text-white">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="text-xl font-semibold tracking-tight">Why does this exist?</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-400">
            Any app can store a spreadsheet. Here, neither the app owner nor the
            user can quietly edit or delete a record after saving it. Every entry
            is on {TARGET.chainName}, permanently. If you need spending that has
            to be trusted after the fact — by you, by roommates, by a group —
            that&apos;s the point.
          </p>
          <p className="mt-8 text-sm font-medium">
            See it work.{' '}
            <button
              onClick={handlePrimary}
              disabled={connecting || (walletMissing && !connected)}
              className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300 disabled:opacity-50"
            >
              {connected ? 'Open your ledger.' : 'Connect your wallet.'}
            </button>
          </p>
        </div>
      </section>
    </div>
  )
}

function FeatureCard({ icon, title, body }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
        {icon}
      </div>
      <h3 className="text-base font-medium text-white">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">{body}</p>
    </div>
  )
}

function BigStat({ label, value, loading }) {
  return (
    <div>
      {loading ? (
        <div className="mx-auto h-10 w-24 animate-pulse rounded bg-white/10" />
      ) : (
        <p className="text-3xl font-semibold tabular-nums text-white sm:text-4xl">{value}</p>
      )}
      <p className="mt-2 text-xs uppercase tracking-wide text-neutral-500">{label}</p>
    </div>
  )
}

function Step({ n, title, body }) {
  return (
    <div>
      <span className="text-sm font-semibold text-emerald-400">{n}</span>
      <h3 className="mt-2 text-base font-medium text-white">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-neutral-400">{body}</p>
    </div>
  )
}

// --- Inline icons (no icon library dependency) ---
function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <rect x="4" y="11" width="16" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}
function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <circle cx="9" cy="8" r="3" />
      <path d="M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M17 15c2.5 0 5 1.5 5 5v1" />
    </svg>
  )
}
function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
    </svg>
  )
}

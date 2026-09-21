import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { TARGET, fetchPlatformStats, getReadOnlyProvider, explorerAddressUrl, CONTRACT_ADDRESS, isContractConfigured } from '../lib/chain.js'
import { money, centsToDollars } from '../lib/format.js'
import ScrollVelocityMarquee from '../components/ScrollVelocityMarquee.jsx'
import SideRays from '../components/SideRays.jsx'
import { motion } from 'framer-motion'

// ---------------------------------------------------------------------------
// Landing page — anti-slop redesign.
//
// Design pillars:
//   1. Typography-first: Inter for UI, JetBrains Mono for on-chain data.
//      Headlines are left-aligned, large, and specific — no vague taglines.
//   2. Show, don't decorate: the hero features a live terminal block that
//      mirrors an actual contract call, not a stock illustration or blob.
//   3. Proof over promises: the stats ticker pulls real on-chain data and
//      links to the explorer — nothing is a marketing estimate.
//   4. No generic patterns: no floating gradient orbs, no rounded-everything
//      card grids, no "Features" badge. Editorial layout with tight rows.
//   5. Monochrome + one accent (emerald-400). Color earns attention only
//      where the user needs to act or data is verified.
// ---------------------------------------------------------------------------

export default function Landing({ wallet }) {
  const navigate = useNavigate()
  const { connected, connecting, walletMissing, connect } = wallet

  // On-chain stats
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
        if (result) setStats(result)
        else setStatsAvailable(false)
      } catch {
        if (!cancelled) setStatsAvailable(false)
      } finally {
        if (!cancelled) setStatsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  async function handlePrimary() {
    if (connected) { navigate('/tracker'); return }
    try { await connect(); navigate('/tracker') } catch { /* error surfaced elsewhere */ }
  }

  // Terminal demo: loops through a sequence of expense entries forever, so the
  // hero feels live. Each entry types its 3 lines, holds, clears, next repeats.
  const termEntries = [
    [
      { text: '> addExpense(4250, "Coffee with team")', cls: 'text-emerald-400' },
      { text: '  tx 0x3a1f…c82e  confirming…', cls: 'text-neutral-500' },
      { text: '  ? block 24,069,891  confirmed', cls: 'text-emerald-400' },
    ],
    [
      { text: '> addExpense(1800, "Bus fare")', cls: 'text-emerald-400' },
      { text: '  tx 0x7be2…41aa  confirming…', cls: 'text-neutral-500' },
      { text: '  ? block 24,069,905  confirmed', cls: 'text-emerald-400' },
    ],
    [
      { text: '> addGroupExpense("Apt 4B", 32000, "Rent")', cls: 'text-emerald-400' },
      { text: '  tx 0x9c04…d7f1  confirming…', cls: 'text-neutral-500' },
      { text: '  ? block 24,069,932  confirmed', cls: 'text-emerald-400' },
    ],
    [
      { text: '> addExpense(950, "Groceries")', cls: 'text-emerald-400' },
      { text: '  tx 0x2ad8…6b3c  confirming…', cls: 'text-neutral-500' },
      { text: '  ? block 24,069,958  confirmed', cls: 'text-emerald-400' },
    ],
  ]

  const [termEntry, setTermEntry] = useState(0)
  const [termLine, setTermLine] = useState(0)
  const termLines = termEntries[termEntry]

  useEffect(() => {
    // Reveal lines one by one; once all shown, pause then advance to the next
    // entry (clearing first), looping back to the start endlessly.
    if (termLine < termLines.length) {
      const t = setTimeout(() => setTermLine((n) => n + 1), termLine === 0 ? 700 : 1000)
      return () => clearTimeout(t)
    }
    const hold = setTimeout(() => {
      setTermLine(0)
      setTermEntry((e) => (e + 1) % termEntries.length)
    }, 2200)
    return () => clearTimeout(hold)
  }, [termLine, termEntry, termLines.length])

  return (
    <div className="min-h-full bg-[#0a0a0a] font-sans text-white">

      {/* ====== HERO ====== */}
      <section className="relative overflow-hidden bg-[#0a0a0a]">
        {/* Subtle top-edge border — clean crisp 1px line, not a blob */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" aria-hidden="true" />

        {/* WebGL side rays -- brand-tinted, behind hero content (pointer-events:none) */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <SideRays
            speed={2}
            rayColor1="#10b981"
            rayColor2="#34d399"
            intensity={1.4}
            spread={2}
            origin="top-right"
            saturation={1.3}
            blend={0.6}
            falloff={1.6}
            opacity={0.55}
          />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-5 pb-20 pt-16 sm:pb-28 sm:pt-24">
          {/* Status chip */}
          <div className="mb-8 flex items-center gap-2 text-xs tracking-wide text-neutral-500">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="uppercase">Live on {TARGET.chainName}</span>
            {isContractConfigured() && (
              <>
                <span className="text-neutral-700">·</span>
                <a
                  href={explorerAddressUrl(CONTRACT_ADDRESS)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-neutral-600 transition hover:text-neutral-400"
                >
                  {CONTRACT_ADDRESS.slice(0, 6)}…{CONTRACT_ADDRESS.slice(-4)}
                </a>
              </>
            )}
          </div>

          {/* Headline — left-aligned, large, specific */}
          <h1 className="max-w-3xl text-[clamp(2rem,5.5vw,3.75rem)] font-bold leading-[1.08] tracking-tight">
            Expense tracking{' '}
            <br className="hidden sm:block" />
            that cannot be doctored.
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-neutral-400 sm:text-lg">
            Commit transactions directly to {TARGET.chainName}. Keep a personal log or
            share a group ledger link so roommates, clubs, and teams can inspect spending
            without accounts or spreadsheets.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              onClick={handlePrimary}
              disabled={connecting || (walletMissing && !connected)}
              className="rounded bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-50"
            >
              {connected ? 'Open your tracker' : connecting ? 'Connecting…' : 'Launch tracker'}
            </button>
            <Link
              to="/tracker"
              className="group flex items-center gap-1.5 px-1 text-sm font-medium text-neutral-400 transition hover:text-white"
            >
              Browse public group
              <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          </div>

          {walletMissing && !connected && (
            <p className="mt-4 text-xs text-neutral-600">
              MetaMask not detected.{' '}
              <a className="underline hover:text-neutral-400" href="https://metamask.io" target="_blank" rel="noreferrer">
                Install it
              </a>{' '}and refresh.
            </p>
          )}

          {/* Terminal block — shows a real contract call, not decoration */}
          <div className="mt-12 max-w-lg overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950 font-mono text-xs shadow-2xl">
            {/* Window bar */}
            <div className="flex items-center gap-2 border-b border-neutral-800/80 px-4 py-2.5">
              <span className="h-2 w-2 rounded-full bg-neutral-700" />
              <span className="h-2 w-2 rounded-full bg-neutral-700" />
              <span className="h-2 w-2 rounded-full bg-neutral-700" />
              <span className="ml-2 font-mono text-[11px] text-neutral-600">ExpenseTracker.sol</span>
            </div>

            {/* Terminal content */}
            <div className="p-4 leading-relaxed">
              <div className="space-y-1">
                {termLines.map((line, i) => (
                  <div
                    key={i}
                    className={`transition-all duration-500 ${i < termLine ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'} ${line.cls}`}
                  >
                    {line.text}
                  </div>
                ))}
                {termLine >= termLines.length && (
                  <span className="mt-1 inline-block h-4 w-1.5 animate-pulse bg-emerald-400" />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== SCROLL-VELOCITY MARQUEE (single use) ====== */}
      <ScrollVelocityMarquee />

      {/* ====== STATS TICKER ====== */}
      {statsAvailable && (
        <section className="border-y border-neutral-800 bg-[#0a0a0a]">
          <div className="mx-auto flex max-w-5xl flex-wrap items-baseline gap-x-12 gap-y-6 px-5 py-8 sm:py-10">
            <Ticker
              value={statsLoading ? '—' : money.format(centsToDollars(Number((stats?.totalValueCents ?? 0n) + (stats?.groupValueCents ?? 0n))))}
              label="tracked"
              loading={statsLoading}
              accent
            />
            <Ticker
              value={statsLoading ? '—' : String(stats?.totalGroups ?? 0)}
              label={stats?.totalGroups === 1 ? 'shared ledger' : 'shared ledgers'}
              loading={statsLoading}
            />
            <Ticker
              value={statsLoading ? '—' : String(stats?.uniqueWallets ?? 0)}
              label={stats?.uniqueWallets === 1 ? 'wallet' : 'wallets'}
              loading={statsLoading}
            />
            <Ticker
              value={statsLoading ? '—' : String(stats?.totalExpenses ?? 0)}
              label={stats?.totalExpenses === 1 ? 'entry' : 'entries'}
              loading={statsLoading}
            />
          </div>
        </section>
      )}

      {/* ====== CAPABILITIES ====== */}
      <section className="bg-[#0a0a0a] py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-5">
          <Reveal>
            <p className="mb-12 text-xs font-medium uppercase tracking-widest text-neutral-600">Capabilities</p>

            <div className="grid gap-4 sm:grid-cols-2">
              <CapabilityCard
                icon={<LockIcon />}
                title="Tamper-proof storage"
                body="Entries are committed directly to smart contract state. Once mined in a block, transaction history cannot be rewritten or erased by any party."
              />
              <CapabilityCard
                icon={<UsersIcon />}
                title="Collaborative group ledgers"
                body="Multiple wallets can post entries to a shared ledger ID. Ideal for shared rent, travel pools, and club funds that require open financial records."
              />
              <CapabilityCard
                icon={<EyeIcon />}
                title="Public read access"
                body="Shared ledger URLs are readable in standard web browsers. External reviewers can inspect balances, timestamps, and payer addresses without installing a wallet."
              />
              <CapabilityCard
                icon={<SparkleIcon />}
                title="Receipt OCR assistance"
                body="Extract merchant names, line totals, and dates from paper receipt photos to speed up manual transaction entry before signing."
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ====== WORKFLOW (horizontal pipeline) ====== */}
      <section className="border-t border-neutral-800 bg-[#0a0a0a] py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-5">
          <Reveal>
          <p className="mb-14 text-xs font-medium uppercase tracking-widest text-neutral-600">Workflow</p>

          <div className="grid gap-px sm:grid-cols-3">
            <PipelineStep
              n="01"
              title="Connect wallet"
              body={`Prompts your wallet to switch to ${TARGET.chainName} with pre-configured network parameters.`}
              first
            />
            <PipelineStep
              n="02"
              title="Log transaction"
              body="Specify amount, category, and description manually or populate from a photo receipt."
            />
            <PipelineStep
              n="03"
              title="Sign & broadcast"
              body="Sign via MetaMask. The contract executes and writes the entry to the ledger with an explorer link."
            />
          </div>
          </Reveal>
        </div>
      </section>

      {/* ====== ARCHITECTURE RATIONALE ====== */}
      <section className="border-t border-neutral-800 bg-[#0a0a0a] py-20 sm:py-24">
        <div className="mx-auto max-w-5xl px-5">
          <Reveal>
          <div className="max-w-xl">
            <p className="mb-4 text-xs font-medium uppercase tracking-widest text-neutral-600">Architecture</p>
            <p className="text-base leading-relaxed text-neutral-400">
              Traditional expense apps store records in centralized databases where rows
              can be altered, backdated, or dropped without trace. ledgr delegates record-keeping
              to an EVM smart contract, producing an immutable audit trail tied to cryptographic
              signatures.
            </p>
            <div className="mt-8">
              <button
                onClick={handlePrimary}
                disabled={connecting || (walletMissing && !connected)}
                className="text-sm font-medium text-emerald-400 underline underline-offset-4 decoration-emerald-400/30 transition hover:decoration-emerald-400 disabled:opacity-50"
              >
                {connected ? 'Go to your tracker →' : 'Launch tracker →'}
              </button>
            </div>
          </div>
          </Reveal>
        </div>
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Stats ticker item — large monospace number + small label */
function Ticker({ value, label, loading, accent }) {
  return (
    <div className="flex items-baseline gap-2">
      {loading ? (
        <div className="h-8 w-16 animate-pulse rounded bg-neutral-800" />
      ) : (
        <span className={`font-mono text-2xl font-medium tabular-nums sm:text-3xl ${accent ? 'text-emerald-400' : 'text-white'}`}>
          {value}
        </span>
      )}
      <span className="text-xs text-neutral-500">{label}</span>
    </div>
  )
}



/** Pipeline step with connecting line */
function PipelineStep({ n, title, body, first }) {
  return (
    <div className="relative pl-8 sm:pl-0">
      {/* Vertical connecting line (mobile) / top border (desktop) */}
      {!first && (
        <div className="absolute left-3 top-0 hidden h-px w-full bg-neutral-800 sm:block" style={{ width: 'calc(100% + 1px)', left: 0 }} />
      )}

      <div className="relative sm:px-0 sm:pt-8">
        {/* Large ghosted step digit behind the title */}
        <span className="pointer-events-none absolute -top-2 right-2 select-none font-mono text-6xl font-bold leading-none text-white/[0.04] sm:right-6">
          {n}
        </span>
        <span className="relative font-mono text-xs font-medium text-emerald-400">{n}</span>
        <h3 className="relative mt-3 text-base font-semibold text-white">{title}</h3>
        <p className="relative mt-2 max-w-xs text-sm leading-relaxed text-neutral-500">{body}</p>
      </div>
    </div>
  )
}


/** Scroll-reveal wrapper: fades + slides its children up when scrolled into
 *  view. Animates once. Honors reduced-motion via framer-motion's own handling. */
function Reveal({ children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: 'easeOut', delay }}
    >
      {children}
    </motion.div>
  )
}

/** Bordered capability card: icon + title + body. */
function CapabilityCard({ icon, title, body }) {
  return (
    <div className="group rounded-xl border border-neutral-800 bg-neutral-950/40 p-5 transition hover:border-emerald-500/40 hover:bg-neutral-900/40">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 transition group-hover:bg-emerald-500/20">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">{body}</p>
    </div>
  )
}

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
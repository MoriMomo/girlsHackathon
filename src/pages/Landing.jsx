import { Link, useNavigate } from 'react-router-dom'
import { TARGET } from '../lib/chain.js'
import ledgrLogo from '../assets/Green_and_White_Simple_Botanical_Blank_Pages_A5_Document-removebg-preview.png'

export default function Landing({ wallet }) {
  const navigate = useNavigate()
  const { connected, connecting, walletMissing, connect } = wallet

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
    <div className="mx-auto max-w-4xl px-4">
      {/* Hero */}
      <section className="flex flex-col items-center py-20 text-center sm:py-28">
        <img
          src={ledgrLogo}
          alt="ledgr"
          className="mb-8 h-20 w-20 object-contain"
        />
        <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Live on {TARGET.chainName}
        </span>

        <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl">
          Expense records nobody can delete.
        </h1>
        <p className="mt-4 max-w-xl text-base text-slate-500 sm:text-lg">
          Connect MetaMask, enter an amount, and your expense is written to {TARGET.chainName}.
          No database. No admin. No way to undo it.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <button
            onClick={handlePrimary}
            disabled={connecting || (walletMissing && !connected)}
            className="w-full rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 sm:w-auto"
          >
            {connected ? 'Go to your ledger' : connecting ? 'Connecting…' : 'Connect wallet and try it'}
          </button>
          <Link
            to="/tracker"
            className="w-full rounded-lg border border-slate-300 px-6 py-3 text-center text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
          >
            See the tracker first
          </Link>
        </div>

        {walletMissing && !connected && (
          <p className="mt-4 text-xs text-slate-400">
            MetaMask not detected.{' '}
            <a className="underline" href="https://metamask.io" target="_blank" rel="noreferrer">
              Install it here
            </a>{' '}
            and refresh.
          </p>
        )}
      </section>

      {/* How it works */}
      <section className="border-t border-slate-200 py-16">
        <div className="grid gap-10 sm:grid-cols-3">
          <Step
            n="01"
            title="Connect MetaMask"
            body="BOT Chain is added automatically. No manual setup. Takes about 10 seconds."
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
      </section>

      {/* Honest differentiator */}
      <section className="border-t border-slate-200 py-16">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">
          Why does this exist?
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-500">
          Any app can store a spreadsheet. Here, neither the app owner nor the user can quietly
          edit or delete a record after saving it. Every entry is on {TARGET.chainName}, permanently.
          If you need spending that has to be trusted after the fact, that&apos;s the point.
        </p>
        <p className="mt-8 text-sm font-medium text-slate-700">
          See it work.{' '}
          <button
            onClick={handlePrimary}
            disabled={connecting || (walletMissing && !connected)}
            className="text-emerald-700 underline underline-offset-2 hover:text-emerald-600 disabled:opacity-50"
          >
            {connected ? 'Open your ledger.' : 'Connect your wallet.'}
          </button>
        </p>
      </section>
    </div>
  )
}

function Step({ n, title, body }) {
  return (
    <div>
      <span className="text-sm font-semibold text-emerald-600">{n}</span>
      <h3 className="mt-2 text-base font-medium text-slate-900">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">{body}</p>
    </div>
  )
}

import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { shortAddr } from '../lib/format.js'
import { explorerAddressUrl, TARGET } from '../lib/chain.js'
import ledgrLogo from '../assets/ledgr.png'

export default function Login({ wallet }) {
  const navigate = useNavigate()
  const { connected, connecting, address, walletMissing, error, connect } = wallet

  // Auto-redirect once connected.
  useEffect(() => {
    if (connected) {
      const t = setTimeout(() => navigate('/tracker'), 900)
      return () => clearTimeout(t)
    }
  }, [connected, navigate])

  async function handleConnect() {
    try {
      await connect()
    } catch {
      /* error surfaced via wallet.error below */
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20">
      <img
        src={ledgrLogo}
        alt="ledgr"
        className="mb-6 h-14 w-14 object-contain"
      />

      <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 text-center">
        {connected ? (
          <>
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              ✓
            </div>
            <h1 className="text-lg font-semibold text-slate-900">You&apos;re in.</h1>
            <p className="mt-1 text-sm text-slate-500">
              Connected as{' '}
              <a
                href={explorerAddressUrl(address)}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-emerald-700 underline"
              >
                {shortAddr(address)}
              </a>
            </p>
            <p className="mt-1 text-xs text-slate-400">Taking you to your ledger…</p>
            <Link
              to="/tracker"
              className="mt-5 inline-block w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Go to ledger
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold text-slate-900">Connect your wallet to sign in</h1>
            <p className="mt-2 text-sm text-slate-500">
              No email. No password. Your wallet address is your identity on {TARGET.chainName}.
            </p>

            <button
              onClick={handleConnect}
              disabled={connecting || walletMissing}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {connecting ? 'Connecting…' : 'Connect Wallet'}
            </button>

            <p className="mt-3 text-xs text-slate-400">
              BOT Chain is added automatically. Nothing to configure.
            </p>

            {walletMissing && (
              <p className="mt-3 text-xs text-amber-600">
                MetaMask not detected.{' '}
                <a className="underline" href="https://metamask.io" target="_blank" rel="noreferrer">
                  Install it here
                </a>{' '}
                and refresh.
              </p>
            )}
            {error && <p className="mt-3 break-words text-xs text-red-600">{error}</p>}
          </>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        A wallet is a free app that holds your on-chain identity. ledgr never sees your private keys.
      </p>
    </div>
  )
}

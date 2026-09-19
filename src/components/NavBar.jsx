import { Link, NavLink, useNavigate } from 'react-router-dom'
import { shortAddr } from '../lib/format.js'
import { explorerAddressUrl, TARGET } from '../lib/chain.js'
import ledgrLogo from '../assets/ledgr.png'

// Shared top bar used on every page: logo + nav links on the left,
// wallet status on the right. Dark chrome (slate-900) with light text and an
// emerald accent, over a light content area below.
export default function NavBar({ wallet }) {
  const navigate = useNavigate()
  const { connected, connecting, address, walletMissing, connect, disconnect } = wallet

  const linkClass = ({ isActive }) =>
    `text-sm transition-colors ${isActive ? 'font-medium text-white' : 'text-slate-400 hover:text-white'
    }`

  async function handleConnect() {
    try {
      await connect()
      navigate('/tracker')
    } catch {
      /* error surfaced by the page via wallet.error */
    }
  }

  return (
    <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        {/* Brand + nav */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <img
              src={ledgrLogo}
              alt="ledgr"
              className="h-8 w-8 rounded bg-white p-0.5 object-contain"
            />
            <span className="text-lg font-semibold tracking-tight text-white">ledgr</span>
          </Link>
          <nav className="hidden items-center gap-5 sm:flex">
            <NavLink to="/" className={linkClass} end>
              Home
            </NavLink>
            <NavLink to="/tracker" className={linkClass}>
              Tracker
            </NavLink>
            {!connected && (
              <NavLink to="/login" className={linkClass}>
                Sign in
              </NavLink>
            )}
          </nav>
        </div>

        {/* Wallet */}
        {connected ? (
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300 sm:inline">
              {TARGET.chainName}
            </span>
            <a
              href={explorerAddressUrl(address)}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20"
            >
              {shortAddr(address)}
            </a>
            <button
              onClick={disconnect}
              className="rounded-full px-2 py-1 text-xs text-slate-400 hover:text-white"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={handleConnect}
            disabled={connecting || walletMissing}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {connecting ? 'Connecting…' : 'Connect Wallet'}
          </button>
        )}
      </div>
    </header>
  )
}

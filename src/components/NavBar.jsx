import { Link, NavLink, useNavigate } from 'react-router-dom'
import { shortAddr } from '../lib/format.js'
import { explorerAddressUrl, TARGET } from '../lib/chain.js'
import ledgrLogo from '../assets/Green_and_White_Simple_Botanical_Blank_Pages_A5_Document-removebg-preview.png'

// Shared top bar â€â€ full-black, minimalist.
export default function NavBar({ wallet }) {
  const navigate = useNavigate()
  const { connected, connecting, address, walletMissing, connect, disconnect } = wallet

  const linkClass = ({ isActive }) =>
    `text-sm transition-colors ${isActive ? 'font-medium text-white' : 'text-neutral-400 hover:text-white'
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
    <header className="sticky top-0 z-10 border-b border-white/10 bg-black">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        {/* Brand + nav */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <img
              src={ledgrLogo}
              alt="ledgr"
              className="h-10 w-10 object-contain"
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

        {/* Right side */}
        <div className="flex items-center gap-3">
          <a
            href="https://x.com/LedgrAppBOT"
            target="_blank"
            rel="noreferrer"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition hover:text-white"
            title="Follow @LedgrAppBOT on X"
          >
            <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>

          {/* Wallet */}
          {connected ? (
            <div className="flex items-center gap-2">
              <span className="hidden rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-neutral-300 sm:inline">
                {TARGET.chainName}
              </span>
              <a
                href={explorerAddressUrl(address)}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white hover:bg-white/10"
              >
                {shortAddr(address)}
              </a>
              <button
                onClick={disconnect}
                className="rounded-full px-2 py-1 text-xs text-neutral-400 hover:text-white"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              disabled={connecting || walletMissing}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50"
            >
              {connecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { shortAddr } from '../lib/format.js'
import { explorerAddressUrl, TARGET } from '../lib/chain.js'
import ledgrLogo from '../assets/Green_and_White_Simple_Botanical_Blank_Pages_A5_Document-removebg-preview.png'

// Shared top bar — full-black, minimalist with mobile drawer and live Mainnet status.
export default function NavBar({ wallet }) {
  const navigate = useNavigate()
  const { connected, connecting, address, walletMissing, connect, disconnect } = wallet
  const [mobileOpen, setMobileOpen] = useState(false)

  const linkClass = ({ isActive }) =>
    `text-sm transition-colors ${
      isActive ? 'font-medium text-white' : 'text-neutral-400 hover:text-white'
    }`

  const mobileLinkClass = ({ isActive }) =>
    `block px-3 py-2 rounded-lg text-sm font-medium transition ${
      isActive ? 'bg-white/10 text-white' : 'text-neutral-300 hover:bg-white/5 hover:text-white'
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
    <header className="sticky top-0 z-20 border-b border-white/10 bg-black">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        {/* Brand + desktop nav */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
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
            <NavLink to="/ledgers" className={linkClass}>
              Ledgers
            </NavLink>
            <NavLink to="/blog" className={linkClass}>
              Blog
            </NavLink>
            {!connected && (
              <NavLink to="/login" className={linkClass}>
                Sign in
              </NavLink>
            )}
          </nav>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Mainnet status badge */}
          <a
            href={TARGET.blockExplorerUrls[0]}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 transition hover:bg-emerald-500/15"
            title="Running live on BOT Chain Mainnet (Chain ID 677) — click to view block explorer"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
            <span className="hidden xs:inline sm:inline">BOT Chain Mainnet</span>
            <span className="inline xs:hidden sm:hidden">Mainnet</span>
          </a>

          <a
            href="https://x.com/LedgrAppBOT"
            target="_blank"
            rel="noreferrer"
            className="hidden h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition hover:text-white sm:flex"
            title="Follow @LedgrAppBOT on X"
          >
            <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>

          {/* Wallet */}
          {connected ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <a
                href={explorerAddressUrl(address)}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-medium text-white hover:bg-white/10 sm:px-3"
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
              className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-neutral-200 disabled:opacity-50 sm:px-4 sm:py-2 sm:text-sm"
            >
              {connecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}

          {/* Mobile hamburger menu toggle */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:text-white sm:hidden"
            aria-label="Toggle navigation menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="border-t border-white/10 bg-black/95 px-4 py-3 sm:hidden">
          <nav className="flex flex-col gap-1">
            <NavLink to="/" className={mobileLinkClass} end onClick={() => setMobileOpen(false)}>
              Home
            </NavLink>
            <NavLink to="/tracker" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>
              Tracker
            </NavLink>
            <NavLink to="/ledgers" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>
              Ledgers
            </NavLink>
            <NavLink to="/blog" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>
              Blog
            </NavLink>
            {!connected && (
              <NavLink to="/login" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>
                Sign in
              </NavLink>
            )}
            <div className="mt-2 border-t border-white/10 pt-2">
              <a
                href="https://x.com/LedgrAppBOT"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-xs text-neutral-400 hover:text-white"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span>Follow @LedgrAppBOT</span>
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

import { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { motion, useScroll, useMotionValueEvent } from 'framer-motion'
import { shortAddr } from '../lib/format.js'
import { explorerAddressUrl, TARGET } from '../lib/chain.js'
import ledgrLogo from '../assets/Green_and_White_Simple_Botanical_Blank_Pages_A5_Document-removebg-preview.png'

// Detachable floating navbar - idlix pill style. It animates on scroll: at the
// top the pill is wider and lightly translucent; once the page scrolls past a
// threshold it condenses (narrower max width, more padding shed, solid fill,
// deeper shadow) via framer-motion. Content is unchanged.
export default function NavBar({ wallet }) {
  const navigate = useNavigate()
  const { connected, connecting, address, walletMissing, connect, disconnect } = wallet
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Track scroll position and flip `scrolled` past a small threshold.
  const { scrollY } = useScroll()
  useMotionValueEvent(scrollY, 'change', (y) => {
    setScrolled(y > 24)
  })
  // Cover the case where the page loads already scrolled (refresh mid-page).
  useEffect(() => {
    setScrolled(window.scrollY > 24)
  }, [])

  // Active link becomes a filled emerald pill; inactive is a plain hover pill.
  const linkClass = ({ isActive }) =>
    `rounded-full px-3.5 py-1.5 text-sm transition-colors ${
      isActive
        ? 'bg-emerald-500/15 font-medium text-emerald-300 ring-1 ring-inset ring-emerald-400/30'
        : 'text-neutral-300 hover:bg-white/5 hover:text-white'
    }`

  const mobileLinkClass = ({ isActive }) =>
    `block px-3 py-2 rounded-lg text-sm font-medium transition ${
      isActive ? 'bg-emerald-500/15 text-emerald-300' : 'text-neutral-300 hover:bg-white/5 hover:text-white'
    }`

  async function handleConnect() {
    if (walletMissing) {
      navigate('/login')
      return
    }
    try {
      await connect()
      navigate('/tracker')
    } catch {
      /* error surfaced by the page via wallet.error */
    }
  }

  return (
    // Floating wrapper: fixed overlay, transparent. Padding tightens as the page
    // scrolls so the pill appears to lift and condense.
    <motion.div
      className="fixed top-0 inset-x-0 z-30 pointer-events-none"
      initial={false}
      animate={{
        paddingLeft: scrolled ? 12 : 16,
        paddingRight: scrolled ? 12 : 16,
        paddingTop: scrolled ? 8 : 16,
      }}
      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
    >
      <motion.header
        initial={false}
        animate={{
          maxWidth: scrolled ? 900 : 1152,
          backgroundColor: scrolled ? 'rgba(0,0,0,0.9)' : 'rgba(0,0,0,0.6)',
          boxShadow: scrolled
            ? '0 12px 32px -8px rgba(0,0,0,0.7)'
            : '0 8px 24px -12px rgba(0,0,0,0.5)',
        }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        className="pointer-events-auto mx-auto flex w-full items-center gap-3 rounded-full border border-white/10 px-3 py-2 backdrop-blur-md sm:gap-4 sm:px-5 sm:py-2.5"
      >
        {/* Brand - far left */}
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2 pl-1"
          onClick={() => setMobileOpen(false)}
        >
          <img
            src={ledgrLogo}
            alt=""
            width="36"
            height="36"
            className="h-9 w-9 object-contain"
          />
          <span className="text-lg font-semibold tracking-tight text-white">ledgr</span>
        </Link>

        {/* Primary nav - inline, packed after the brand (idlix layout) */}
        <nav className="hidden flex-1 items-center gap-1 md:flex">
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

        {/* Right side controls */}
        <div className="ml-auto flex items-center gap-2 md:ml-0 sm:gap-2.5">
          {/* Mainnet status badge */}
          <a
            href={TARGET.blockExplorerUrls[0]}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 transition hover:bg-emerald-500/15"
            title="Running live on BOT Chain Mainnet (Chain ID 677) - click to view block explorer"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
            <span className="hidden sm:inline">BOT Chain Mainnet</span>
            <span className="inline sm:hidden">Mainnet</span>
          </a>

          <a
            href="https://x.com/LedgrAppBOT"
            target="_blank"
            rel="noreferrer"
            className="hidden h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition hover:bg-white/5 hover:text-white sm:flex"
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
              disabled={connecting}
              className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20 hover:text-emerald-200 disabled:opacity-50 sm:px-4 sm:py-2 sm:text-sm"
            >
              {connecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}

          {/* Mobile hamburger menu toggle */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:bg-white/5 hover:text-white md:hidden"
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
      </motion.header>

      {/* Mobile nav drawer - floating pill panel below the bar */}
      {mobileOpen && (
        <div className="pointer-events-auto mx-auto mt-2 w-full max-w-7xl rounded-2xl border border-white/10 bg-black/90 px-3 py-3 shadow-lg shadow-black/40 backdrop-blur-md md:hidden">
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
    </motion.div>
  )
}

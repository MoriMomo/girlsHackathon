import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { shortAddr } from '../lib/format.js'
import { explorerAddressUrl, TARGET } from '../lib/chain.js'
import ledgrLogo from '../assets/Green_and_White_Simple_Botanical_Blank_Pages_A5_Document-removebg-preview.png'

export default function Login({ wallet }) {
  const navigate = useNavigate()
  const { connected, connecting, address, walletMissing, error, connect } = wallet

  // Auto-redirect once connected (small hold so the success state is seen).
  useEffect(() => {
    if (connected) {
      const t = setTimeout(() => navigate('/tracker'), 1300)
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
      {/* Logo, with an animated emerald glow + pulse while connecting */}
      <div className="relative mb-6 flex items-center justify-center">
        <AnimatePresence>
          {connecting && (
            <motion.span
              key="glow"
              className="absolute h-20 w-20 rounded-full bg-emerald-400/30 blur-xl"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.25, 1] }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </AnimatePresence>
        <motion.img
          src={ledgrLogo}
          alt="ledgr"
          className="relative h-14 w-14 object-contain"
          animate={connecting ? { scale: [1, 1.06, 1] } : { scale: 1 }}
          transition={connecting ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
        />
      </div>

      <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/80 p-6 text-center shadow-2xl shadow-emerald-950/20 backdrop-blur-md">
        <AnimatePresence mode="wait">
          {connected ? (
            <motion.div
              key="connected"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              {/* Success check pops in */}
              <motion.div
                className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.05 }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-6 w-6">
                  <motion.path
                    d="M20 6 9 17l-5-5"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.4, delay: 0.15, ease: 'easeOut' }}
                  />
                </svg>
              </motion.div>
              <h1 className="text-lg font-semibold text-white">You&apos;re in.</h1>
              <p className="mt-1 text-sm text-neutral-400">
                Connected as{' '}
                <a
                  href={explorerAddressUrl(address)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-emerald-400 underline"
                >
                  {shortAddr(address)}
                </a>
              </p>
              <p className="mt-1 text-xs text-neutral-500">Taking you to your ledger…</p>
              <Link
                to="/tracker"
                className="mt-5 inline-block w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500"
              >
                Go to ledger
              </Link>
            </motion.div>
          ) : (
            <motion.div
              key="disconnected"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <h1 className="text-lg font-semibold text-white">Connect your wallet to sign in</h1>
              <p className="mt-2 text-sm text-neutral-400">
                No email. No password. Your wallet address is your identity on {TARGET.chainName}.
              </p>

              <button
                onClick={handleConnect}
                disabled={connecting || walletMissing}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500 disabled:opacity-50"
              >
                {connecting ? (
                  <>
                    <motion.span
                      className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                    />
                    Connecting…
                  </>
                ) : (
                  'Connect Wallet'
                )}
              </button>

              <p className="mt-3 text-xs text-neutral-400">
                {connecting
                  ? 'Check MetaMask — approve the connection and network switch.'
                  : 'BOT Chain is added automatically. Nothing to configure.'}
              </p>

              {walletMissing && (
                <p className="mt-3 text-xs text-amber-400">
                  MetaMask not detected.{' '}
                  <a className="underline text-amber-300 hover:text-white" href="https://metamask.io" target="_blank" rel="noreferrer">
                    Install it here
                  </a>{' '}
                  and refresh.
                </p>
              )}
              {error && <p className="mt-3 break-words text-xs text-red-400">{error}</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="mt-6 text-center text-xs text-neutral-500">
        A wallet is a free app that holds your on-chain identity. ledgr never sees your private keys.
      </p>
    </div>
  )
}

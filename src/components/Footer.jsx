import { shortAddr } from '../lib/format.js'
import { explorerAddressUrl, isContractConfigured, CONTRACT_ADDRESS, TARGET } from '../lib/chain.js'
import ledgrLogo from '../assets/ledgr.png'
import botLogo from '../assets/botlogo.png'

// Shared footer used on every page. Dark chrome to match the NavBar.
// Carries the REQUIRED BOT Chain branding: name + logo, linking to
// botchain.ai and the BOT Chain Explorer.
export default function Footer() {
  return (
    <footer className="mt-16 w-full bg-slate-900 py-10 text-center text-xs text-slate-400">
      <div className="mx-auto max-w-4xl px-4">
        {/* Brand row */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="flex items-center gap-2">
            <img
              src={ledgrLogo}
              alt="ledgr"
              className="h-6 w-6 rounded bg-white p-0.5 object-contain"
            />
            <span className="text-sm font-semibold text-white">ledgr</span>
          </div>

          <span className="text-slate-700">·</span>

          <a
            href="https://x.com/LedgrAppBOT"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:text-white"
          >
            <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span>@LedgrAppBOT</span>
          </a>
        </div>

        <p className="mt-4">
          Records stored on {TARGET.chainName}. Contract:{' '}
          {isContractConfigured() ? (
            <a
              className="text-slate-300 underline hover:text-white"
              href={explorerAddressUrl(CONTRACT_ADDRESS)}
              target="_blank"
              rel="noreferrer"
            >
              {shortAddr(CONTRACT_ADDRESS)}
            </a>
          ) : (
            'not deployed yet'
          )}
        </p>

        {/* Required BOT Chain branding */}
        <div className="mt-5 flex flex-col items-center gap-2 border-t border-slate-800 pt-5">
          <a
            href="https://botchain.ai"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-slate-300 hover:text-white"
          >
            <img
              src={botLogo}
              alt="BOT Chain"
              className="h-5 object-contain"
            />
            <span className="font-medium">Built on BOT Chain</span>
          </a>
          <p>
            <a
              className="text-emerald-400 underline hover:text-emerald-300"
              href="https://botchain.ai"
              target="_blank"
              rel="noreferrer"
            >
              botchain.ai
            </a>
            {' · '}
            <a
              className="text-emerald-400 underline hover:text-emerald-300"
              href="https://scan.botchain.ai"
              target="_blank"
              rel="noreferrer"
            >
              BOT Chain Explorer
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}

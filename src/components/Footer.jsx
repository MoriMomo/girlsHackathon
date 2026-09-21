import { shortAddr } from '../lib/format.js'
import { explorerAddressUrl, isContractConfigured, CONTRACT_ADDRESS, TARGET } from '../lib/chain.js'
import ledgrLogo from '../assets/Green_and_White_Simple_Botanical_Blank_Pages_A5_Document-removebg-preview.png'
import botLogo from '../assets/botlogo.png'

// Shared footer �” full-black, minimalist, matches the NavBar.
export default function Footer() {
  return (
    <footer className="mt-16 w-full bg-black py-10 text-center text-xs text-neutral-400">
      <div className="mx-auto max-w-4xl px-4">
        {/* Brand row */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="flex items-center gap-2">
            <img
              src={ledgrLogo}
              alt="ledgr"
              className="h-8 w-8 object-contain"
            />
            <span className="text-sm font-semibold text-white">ledgr</span>
          </div>

          <span className="text-neutral-600">·</span>

          <a
            href="https://x.com/LedgrAppBOT"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-medium text-neutral-300 transition hover:border-white/30 hover:text-white"
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
              className="text-neutral-300 underline hover:text-white"
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
        <div className="mt-5 flex flex-col items-center gap-2 border-t border-white/10 pt-5">
          <a
            href="https://botchain.ai"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-neutral-300 hover:text-white"
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
              className="text-white underline hover:text-neutral-300"
              href="https://botchain.ai"
              target="_blank"
              rel="noreferrer"
            >
              botchain.ai
            </a>
            {' · '}
            <a
              className="text-white underline hover:text-neutral-300"
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

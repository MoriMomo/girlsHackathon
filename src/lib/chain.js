// Blockchain layer for the money tracker.
// Talks to the ExpenseTracker contract on BOT Chain via ethers.js + MetaMask.
//
// After you deploy contracts/ExpenseTracker.sol in Remix, paste the deployed
// address into CONTRACT_ADDRESS below (use your TESTNET address while testing,
// then switch to the MAINNET address for the final submission).

import { BrowserProvider, Contract, getAddress } from 'ethers'

// ---------------------------------------------------------------------------
// CONFIG -- edit these two things after deploying.
// ---------------------------------------------------------------------------

// Deployed ExpenseTracker address. Testnet deployment (chain 968).
// Wrapped in getAddress() so ethers normalizes the EIP-55 checksum for us --
// you can paste the address in ANY casing (even all-lowercase) and it just works.
// When you deploy to mainnet (677), replace the string with that address and
// set ACTIVE_NETWORK = 'mainnet'.
export const CONTRACT_ADDRESS = getAddress(
  '0x3b77eaca869e9084e152b62ba2816784fdc69c46',
)

// Which network the app targets. 'testnet' (968) while building, 'mainnet' (677) for submission.
export const ACTIVE_NETWORK = 'testnet'

// ---------------------------------------------------------------------------
// BOT Chain network definitions (from the hackathon guidebook / dev docs).
// ---------------------------------------------------------------------------
export const NETWORKS = {
  testnet: {
    chainId: 968,
    chainIdHex: '0x3c8', // 968
    chainName: 'BOT Chain Testnet',
    rpcUrls: ['https://rpc.bohr.life'],
    nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
    blockExplorerUrls: ['https://scan.bohr.life/'],
  },
  mainnet: {
    chainId: 677,
    chainIdHex: '0x2a5', // 677
    chainName: 'BOT Chain Mainnet',
    rpcUrls: ['https://rpc.botchain.ai'],
    nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
    blockExplorerUrls: ['https://scan.botchain.ai'],
  },
}

export const TARGET = NETWORKS[ACTIVE_NETWORK]

// Minimal ABI matching contracts/ExpenseTracker.sol.
export const ABI = [
  'function addExpense(uint256 amount, string description) external',
  'function expenseCount(address wallet) external view returns (uint256)',
  'function getExpense(address wallet, uint256 index) external view returns (uint256 amount, string description, uint256 timestamp)',
  'function getExpenses(address wallet) external view returns (tuple(uint256 amount, string description, uint256 timestamp)[])',
  'function totalSpent(address wallet) external view returns (uint256)',
  'event ExpenseAdded(address indexed owner, uint256 indexed index, uint256 amount, string description, uint256 timestamp)',
]

export function hasWallet() {
  return typeof window !== 'undefined' && !!window.ethereum
}

export function isContractConfigured() {
  return (
    /^0x[a-fA-F0-9]{40}$/.test(CONTRACT_ADDRESS) &&
    CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000'
  )
}

export function explorerAddressUrl(address) {
  const base = TARGET.blockExplorerUrls[0].replace(/\/$/, '')
  return `${base}/address/${address}`
}

export function explorerTxUrl(txHash) {
  const base = TARGET.blockExplorerUrls[0].replace(/\/$/, '')
  return `${base}/tx/${txHash}`
}

// ---------------------------------------------------------------------------
// Date encoding.
// The deployed contract stores (amount, description, block-timestamp). To let
// the user pick the DATE an expense happened -- without redeploying the
// contract -- we prefix the chosen date onto the description string on-chain
// using a delimiter, then split it back out for display.
//
//   on-chain description = "2026-09-10|lunch"
//
// encodeDescription / decodeDescription are the only two places that know about
// this format, so the UI stays clean. Records written before this feature (no
// delimiter) decode with a null date and just show their block time -- so old
// entries like "coffee" / "lunch" still render fine (backward compatible).
// ---------------------------------------------------------------------------
const DATE_DELIM = '|'
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Combine a chosen YYYY-MM-DD date with the description for on-chain storage. */
export function encodeDescription(dateStr, description) {
  const clean = String(description || '').trim()
  if (dateStr && ISO_DATE_RE.test(dateStr)) {
    return `${dateStr}${DATE_DELIM}${clean}`
  }
  return clean
}

/**
 * Split an on-chain description back into { date, description }.
 * date is a YYYY-MM-DD string, or null if the record predates this feature.
 */
export function decodeDescription(stored) {
  const s = String(stored || '')
  const idx = s.indexOf(DATE_DELIM)
  if (idx === 10 && ISO_DATE_RE.test(s.slice(0, 10))) {
    return { date: s.slice(0, 10), description: s.slice(idx + 1) }
  }
  return { date: null, description: s }
}

/** Today's date as YYYY-MM-DD in the user's local timezone (for the date input default). */
export function todayISO() {
  const d = new Date()
  const tzOffset = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// Resilience: the public BOT Chain RPC can be flaky and briefly return
// transient errors (-32002 "too many errors", "could not coalesce error",
// CALL_EXCEPTION with no revert data). Those are NOT real failures -- a retry
// a moment later succeeds. withRetry re-attempts an async call a few times with
// a short backoff, but does NOT retry a genuine user rejection (they clicked
// "Reject" in MetaMask) or a real contract revert with a reason string.
// ---------------------------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function isUserRejection(err) {
  // MetaMask user-denied signature/transaction.
  return err && (err.code === 4001 || err.code === 'ACTION_REJECTED')
}

function isRealRevert(err) {
  // A revert that actually carries a reason -- retrying won't help, surface it.
  const reason = err?.reason || err?.revert?.args?.[0]
  return typeof reason === 'string' && reason.length > 0
}

async function withRetry(fn, { attempts = 4, baseDelayMs = 700, label = 'call' } = {}) {
  let lastErr
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      // Don't retry things a retry can't fix.
      if (isUserRejection(err) || isRealRevert(err)) throw err
      if (i < attempts - 1) {
        const delay = baseDelayMs * (i + 1) // linear backoff: 0.7s, 1.4s, 2.1s
        console.warn(
          `[chain] ${label} failed (attempt ${i + 1}/${attempts}), retrying in ${delay}ms:`,
          err?.shortMessage || err?.message || err,
        )
        await sleep(delay)
      }
    }
  }
  throw lastErr
}

/**
 * Ensure MetaMask is on the target BOT Chain network. Adds it if missing.
 */
export async function ensureNetwork() {
  const eth = window.ethereum
  try {
    await eth.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: TARGET.chainIdHex }],
    })
  } catch (err) {
    // 4902 = chain not added to MetaMask yet -> add it, then it's selected.
    if (err && (err.code === 4902 || err.code === -32603)) {
      await eth.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: TARGET.chainIdHex,
            chainName: TARGET.chainName,
            rpcUrls: TARGET.rpcUrls,
            nativeCurrency: TARGET.nativeCurrency,
            blockExplorerUrls: TARGET.blockExplorerUrls,
          },
        ],
      })
    } else {
      throw err
    }
  }
}

/**
 * Prompt the wallet, switch to BOT Chain, and return { provider, signer, address }.
 */
export async function connectWallet() {
  if (!hasWallet()) {
    throw new Error('MetaMask not found. Install it from metamask.io first.')
  }
  await window.ethereum.request({ method: 'eth_requestAccounts' })
  await ensureNetwork()

  const provider = new BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()
  const address = await signer.getAddress()
  return { provider, signer, address }
}

function readContract(provider) {
  return new Contract(CONTRACT_ADDRESS, ABI, provider)
}

function writeContract(signer) {
  return new Contract(CONTRACT_ADDRESS, ABI, signer)
}

/**
 * Fetch all expenses for a wallet from the chain. Retries transient RPC errors.
 * Each row is decoded into { amount, description, date, timestamp } where `date`
 * is the user-chosen YYYY-MM-DD (or null for older records) and `timestamp` is
 * the on-chain block time.
 * @returns {Promise<Array<{amount: bigint, description: string, date: string|null, timestamp: number}>>}
 */
export async function fetchExpenses(provider, wallet) {
  if (!isContractConfigured()) return []
  const c = readContract(provider)
  const rows = await withRetry(() => c.getExpenses(wallet), {
    label: 'getExpenses',
  })
  return rows.map((r) => {
    const { date, description } = decodeDescription(r.description)
    return {
      amount: r.amount, // bigint, in minor units (cents)
      description,
      date, // user-chosen YYYY-MM-DD, or null
      timestamp: Number(r.timestamp), // on-chain block time
    }
  })
}

/**
 * Send an addExpense transaction. amountCents is an integer (e.g. $12.34 -> 1234).
 * dateStr is the user-chosen YYYY-MM-DD, encoded into the on-chain description.
 * Retries transient RPC errors while sending; a user rejection or a real revert
 * is surfaced immediately (not retried).
 * @returns {Promise<import('ethers').TransactionReceipt>}
 */
export async function sendAddExpense(signer, amountCents, description, dateStr) {
  if (!isContractConfigured()) {
    throw new Error(
      'Contract address not set. Deploy ExpenseTracker.sol and paste its address into src/lib/chain.js.',
    )
  }
  const c = writeContract(signer)
  const stored = encodeDescription(dateStr, description)
  // Retry only the send (getting the tx accepted by the node). Once we have a
  // tx, wait for it once -- a mined tx must not be re-sent.
  const tx = await withRetry(() => c.addExpense(BigInt(amountCents), stored), {
    label: 'addExpense',
  })
  return tx.wait()
}

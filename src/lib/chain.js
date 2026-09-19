// Blockchain layer for the money tracker.
// Talks to the ExpenseTracker contract on BOT Chain via ethers.js + MetaMask.

import { BrowserProvider, Contract, getAddress } from 'ethers'

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------
export const CONTRACT_ADDRESS = getAddress(
  '0x3b77eaca869e9084e152b62ba2816784fdc69c46',
)
export const ACTIVE_NETWORK = 'testnet'

// Expense categories. Stored on-chain inside the description string (see below).
export const CATEGORIES = [
  'Food',
  'Transport',
  'Bills',
  'Shopping',
  'Health',
  'Entertainment',
  'Housing',
  'Other',
]
export const DEFAULT_CATEGORY = 'Other'

// ---------------------------------------------------------------------------
// BOT Chain networks
// ---------------------------------------------------------------------------
export const NETWORKS = {
  testnet: {
    chainId: 968,
    chainIdHex: '0x3c8',
    chainName: 'BOT Chain Testnet',
    rpcUrls: ['https://rpc.bohr.life'],
    nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
    blockExplorerUrls: ['https://scan.bohr.life/'],
  },
  mainnet: {
    chainId: 677,
    chainIdHex: '0x2a5',
    chainName: 'BOT Chain Mainnet',
    rpcUrls: ['https://rpc.botchain.ai'],
    nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
    blockExplorerUrls: ['https://scan.botchain.ai'],
  },
}

export const TARGET = NETWORKS[ACTIVE_NETWORK]

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
// Encoding: the deployed contract stores (amount, description, block-timestamp).
// To carry a user-chosen DATE and CATEGORY without redeploying, we pack them
// into the description string with a delimiter:
//
//   "2026-09-10|Food|lunch"   (date | category | text)
//
// decodeDescription handles three formats for backward compatibility:
//   1. "date|category|text"  -> new (all three)
//   2. "date|text"           -> old (date only, no category)
//   3. "text"                -> oldest (plain text)
// Do NOT remove the old branches, or pre-existing on-chain records break.
// ---------------------------------------------------------------------------
const DATE_DELIM = '|'
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function encodeDescription(dateStr, category, description) {
  const clean = String(description || '').trim()
  const cat = CATEGORIES.includes(category) ? category : DEFAULT_CATEGORY
  if (dateStr && ISO_DATE_RE.test(dateStr)) {
    return `${dateStr}${DATE_DELIM}${cat}${DATE_DELIM}${clean}`
  }
  return clean
}

export function decodeDescription(stored) {
  const s = String(stored || '')
  const parts = s.split(DATE_DELIM)

  // New format: date | category | description
  if (parts.length >= 3 && ISO_DATE_RE.test(parts[0])) {
    return {
      date: parts[0],
      category: CATEGORIES.includes(parts[1]) ? parts[1] : DEFAULT_CATEGORY,
      description: parts.slice(2).join(DATE_DELIM),
    }
  }

  // Old format: date | description (no category)
  if (parts.length === 2 && ISO_DATE_RE.test(parts[0])) {
    return { date: parts[0], category: DEFAULT_CATEGORY, description: parts[1] }
  }

  // Oldest format: plain description
  return { date: null, category: DEFAULT_CATEGORY, description: s }
}

export function todayISO() {
  const d = new Date()
  const tzOffset = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10)
}

/**
 * Turn a raw ethers/MetaMask error into a short, judge-readable message.
 * Falls back to the raw shortMessage/message if no pattern matches.
 */
export function friendlyError(err) {
  const raw = String(err?.shortMessage || err?.message || err || '')

  if (err?.code === 4001 || err?.code === 'ACTION_REJECTED') {
    return 'Transaction cancelled in MetaMask.'
  }
  if (/insufficient funds/i.test(raw)) {
    return 'Not enough BOT in your wallet to pay for gas. Get testnet BOT from the faucet, or contact the organizer for mainnet BOT.'
  }
  if (/user rejected/i.test(raw)) {
    return 'Request rejected in MetaMask.'
  }
  if (/network|chain/i.test(raw) && /switch|add/i.test(raw)) {
    return 'Could not switch to BOT Chain automatically. Please switch networks manually in MetaMask.'
  }
  if (/could not detect network|failed to fetch|NETWORK_ERROR/i.test(raw)) {
    return 'Could not reach the BOT Chain network. Check your connection and try again.'
  }
  return raw || 'Something went wrong. Please try again.'
}
// ---------------------------------------------------------------------------
// Resilience: retry transient RPC errors, but not user rejections / real reverts.
// ---------------------------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function isUserRejection(err) {
  return err && (err.code === 4001 || err.code === 'ACTION_REJECTED')
}

function isRealRevert(err) {
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
      if (isUserRejection(err) || isRealRevert(err)) throw err
      if (i < attempts - 1) {
        const delay = baseDelayMs * (i + 1)
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

export async function ensureNetwork() {
  const eth = window.ethereum
  try {
    await eth.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: TARGET.chainIdHex }],
    })
  } catch (err) {
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
 * Fetch all expenses for a wallet. Each row decoded into
 * { amount, description, category, date, timestamp }.
 */
export async function fetchExpenses(provider, wallet) {
  if (!isContractConfigured()) return []
  const c = readContract(provider)
  const rows = await withRetry(() => c.getExpenses(wallet), { label: 'getExpenses' })
  return rows.map((r) => {
    const { date, category, description } = decodeDescription(r.description)
    return {
      amount: r.amount, // bigint, minor units (cents)
      description,
      category,
      date, // user-chosen YYYY-MM-DD or null
      timestamp: Number(r.timestamp), // block time
    }
  })
}

/**
 * Send an addExpense tx. amountCents is an integer; category + dateStr are
 * packed into the on-chain description via encodeDescription.
 */
export async function sendAddExpense(signer, amountCents, category, description, dateStr) {
  if (!isContractConfigured()) {
    throw new Error(
      'Contract address not set. Deploy ExpenseTracker.sol and paste its address into src/lib/chain.js.',
    )
  }
  const c = writeContract(signer)
  const stored = encodeDescription(dateStr, category, description)
  const tx = await withRetry(() => c.addExpense(BigInt(amountCents), stored), {
    label: 'addExpense',
  })
  return tx.wait()
}

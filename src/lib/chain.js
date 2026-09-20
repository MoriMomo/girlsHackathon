// Blockchain layer for the money tracker.
// Talks to the ExpenseTracker contract on BOT Chain via ethers.js + MetaMask.

import { BrowserProvider, Contract, getAddress, JsonRpcProvider } from 'ethers'

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------
// Contract WITH group-ledger functions, deployed on BOT Chain Testnet (968).
export const CONTRACT_ADDRESS = getAddress(
  '0x30A2A3AcD2E5118F50E34A0Ee2e464C5EF8614B0',
)
export const ACTIVE_NETWORK = 'testnet' // switch to 'mainnet' after final deploy

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
  // --- personal ledger ---
  'function addExpense(uint256 amount, string description) external',
  'function expenseCount(address wallet) external view returns (uint256)',
  'function getExpense(address wallet, uint256 index) external view returns (uint256 amount, string description, uint256 timestamp)',
  'function getExpenses(address wallet) external view returns (tuple(uint256 amount, string description, uint256 timestamp)[])',
  'function totalSpent(address wallet) external view returns (uint256)',
  'event ExpenseAdded(address indexed owner, uint256 indexed index, uint256 amount, string description, uint256 timestamp)',
  // --- group ledger ---
  'function createGroup(bytes32 groupId, string name) external',
  'function addGroupExpense(bytes32 groupId, uint256 amount, string description) external',
  'function getGroupExpenses(bytes32 groupId) external view returns (tuple(address payer, uint256 amount, string description, uint256 timestamp)[])',
  'function groupExpenseCount(bytes32 groupId) external view returns (uint256)',
  'function groupExists(bytes32 groupId) external view returns (bool)',
  'function groupName(bytes32 groupId) external view returns (string)',
  'function groupCreator(bytes32 groupId) external view returns (address)',
  'function groupTotalSpent(bytes32 groupId) external view returns (uint256)',
  'event GroupCreated(bytes32 indexed groupId, string name, address indexed creator)',
  'event GroupExpenseAdded(bytes32 indexed groupId, address indexed payer, uint256 indexed index, uint256 amount, string description, uint256 timestamp)',
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

// A read-only provider that doesn't require MetaMask or a connected wallet.
// Used so shared group links are viewable by anyone who opens them.
export function getReadOnlyProvider() {
  return new JsonRpcProvider(TARGET.rpcUrls[0])
}

// Generate a random bytes32 id for a new group, client-side.
export function randomGroupId() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return '0x' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

// ---------------------------------------------------------------------------
// Encoding: pack a user-chosen DATE and CATEGORY into the description string:
//   "2026-09-10|Food|lunch"   (date | category | text)
// decodeDescription handles three formats for backward compatibility.
// Reused for both personal and group expenses.
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

  if (parts.length >= 3 && ISO_DATE_RE.test(parts[0])) {
    return {
      date: parts[0],
      category: CATEGORIES.includes(parts[1]) ? parts[1] : DEFAULT_CATEGORY,
      description: parts.slice(2).join(DATE_DELIM),
    }
  }
  if (parts.length === 2 && ISO_DATE_RE.test(parts[0])) {
    return { date: parts[0], category: DEFAULT_CATEGORY, description: parts[1] }
  }
  return { date: null, category: DEFAULT_CATEGORY, description: s }
}

export function todayISO() {
  const d = new Date()
  const tzOffset = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10)
}

/**
 * Turn a raw ethers/MetaMask error into a short, judge-readable message.
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
  if (/group does not exist/i.test(raw)) {
    return 'This group does not exist. Double-check the link, or create a new group.'
  }
  if (/group already exists/i.test(raw)) {
    return 'That group ID is already taken. Try creating the group again.'
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
 * Fetch all personal expenses for a wallet, decoded.
 */
export async function fetchExpenses(provider, wallet) {
  if (!isContractConfigured()) return []
  const c = readContract(provider)
  const rows = await withRetry(() => c.getExpenses(wallet), { label: 'getExpenses' })
  return rows.map((r) => {
    const { date, category, description } = decodeDescription(r.description)
    return {
      amount: r.amount,
      description,
      category,
      date,
      timestamp: Number(r.timestamp),
    }
  })
}

/**
 * Send an addExpense tx (personal ledger).
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

// ---------------------------------------------------------------------------
// Group ledger functions
// ---------------------------------------------------------------------------

/** Create a new group ledger. groupId should come from randomGroupId(). */
export async function sendCreateGroup(signer, groupId, name) {
  if (!isContractConfigured()) {
    throw new Error('Contract address not set. Deploy the contract first.')
  }
  const c = writeContract(signer)
  const tx = await withRetry(() => c.createGroup(groupId, name), { label: 'createGroup' })
  return tx.wait()
}

/** Log an expense to a shared group. Reuses the personal date/category encoding. */
export async function sendAddGroupExpense(signer, groupId, amountCents, category, description, dateStr) {
  if (!isContractConfigured()) {
    throw new Error('Contract address not set. Deploy the contract first.')
  }
  const c = writeContract(signer)
  const stored = encodeDescription(dateStr, category, description)
  const tx = await withRetry(
    () => c.addGroupExpense(groupId, BigInt(amountCents), stored),
    { label: 'addGroupExpense' },
  )
  return tx.wait()
}

/** Fetch a group's metadata. Returns null if the group does not exist. */
export async function fetchGroupInfo(provider, groupId) {
  if (!isContractConfigured()) return null
  const c = readContract(provider)
  const exists = await withRetry(() => c.groupExists(groupId), { label: 'groupExists' })
  if (!exists) return null
  const [name, creator, total] = await Promise.all([
    c.groupName(groupId),
    c.groupCreator(groupId),
    c.groupTotalSpent(groupId),
  ])
  return { groupId, name, creator, total }
}

/** Fetch every expense logged to a group, decoded (each row includes `payer`). */
export async function fetchGroupExpenses(provider, groupId) {
  if (!isContractConfigured()) return []
  const c = readContract(provider)
  const rows = await withRetry(() => c.getGroupExpenses(groupId), { label: 'getGroupExpenses' })
  return rows.map((r) => {
    const { date, category, description } = decodeDescription(r.description)
    return {
      payer: r.payer,
      amount: r.amount,
      description,
      category,
      date,
      timestamp: Number(r.timestamp),
    }
  })
}

// Local memory of shared ledgers on BOT Chain Mainnet.

const KEY_PREFIX = 'ledgr.groups.mainnet.'
const LEGACY_PREFIX = 'ledgr.groups.'

// Known testnet groups from earlier staging/testing to permanently filter out of Mainnet
const TESTNET_IDS = new Set([
  '0x3f48b38407d136dbd8a292be406dd2341cc3036b5ab44bb22ed464c7d00ac2d4'.toLowerCase(), // tes 1
  '0x386a125fba94c19e751a2a448ea7209744a128099431971999f12e2ede34de53'.toLowerCase(), // tes2
])

function keyFor(wallet) {
  return `${KEY_PREFIX}${String(wallet || '').toLowerCase()}`
}

function legacyKeyFor(wallet) {
  return `${LEGACY_PREFIX}${String(wallet || '').toLowerCase()}`
}

/**
 * Clean up legacy storage to ensure no historical testnet groups leak into Mainnet.
 */
function sanitizeStorage(wallet) {
  if (!wallet || typeof localStorage === 'undefined') return
  const w = String(wallet).toLowerCase()

  try {
    // Remove old unpartitioned key so testnet groups don't persist
    localStorage.removeItem(legacyKeyFor(w))
    localStorage.removeItem(`ledgr.groups.testnet.${w}`)

    // Sanitize Mainnet key
    const raw = localStorage.getItem(keyFor(w))
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter((g) => {
          const id = g.id?.toLowerCase()
          return !TESTNET_IDS.has(id) && g.network !== 'testnet'
        })
        if (cleaned.length !== parsed.length) {
          localStorage.setItem(keyFor(w), JSON.stringify(cleaned))
        }
      }
    }
  } catch {
    /* non-fatal */
  }
}

/** Return the remembered groups for a wallet on Mainnet: [{ id, name, addedAt }]. */
export function listGroups(wallet) {
  if (!wallet) return []
  sanitizeStorage(wallet)
  try {
    const raw = localStorage.getItem(keyFor(wallet))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((g) => !TESTNET_IDS.has(g.id?.toLowerCase()))
  } catch {
    return []
  }
}

/** Helper kept for compatibility — always 0 since Testnet is removed. */
export function getOtherNetworkGroupCount() {
  return 0
}

/** Remember a group for a wallet on BOT Chain Mainnet. */
export function rememberGroup(wallet, id, name) {
  if (!wallet || !id) return listGroups(wallet)
  sanitizeStorage(wallet)
  const groups = listGroups(wallet)
  const existing = groups.find((g) => g.id.toLowerCase() === id.toLowerCase())
  let next
  if (existing) {
    next = groups.map((g) =>
      g.id.toLowerCase() === id.toLowerCase()
        ? { ...g, name: name || g.name }
        : g,
    )
  } else {
    next = [
      { id, name: name || 'Untitled ledger', addedAt: Date.now() },
      ...groups,
    ]
  }
  try {
    localStorage.setItem(keyFor(wallet), JSON.stringify(next))
  } catch {
    /* storage full / unavailable — non-fatal */
  }
  return next
}

/** Forget a group for a wallet on BOT Chain Mainnet. */
export function forgetGroup(wallet, id) {
  sanitizeStorage(wallet)
  const groups = listGroups(wallet)
  const next = groups.filter((g) => g.id.toLowerCase() !== String(id).toLowerCase())
  try {
    localStorage.setItem(keyFor(wallet), JSON.stringify(next))
  } catch {
    /* non-fatal */
  }
  return next
}

/** Extract a bytes32 group id from a pasted link or raw id, or null if invalid. */
export function parseGroupId(input) {
  const s = String(input || '').trim()
  // full URL like .../#/group/0x...  OR a bare 0x id
  const m = s.match(/(0x[0-9a-fA-F]{64})/)
  return m ? m[1] : null
}

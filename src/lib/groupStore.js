// Local memory of shared ledgers a wallet has created or opened.
//
// The contract doesn't index "which groups belong to wallet X" (that would need
// a contract change), so we remember them client-side in localStorage, keyed by
// wallet address. The ledgers themselves live on-chain and are never lost — this
// is just a convenience index so the UI can list "your" ledgers and link back
// into them. Clearing browser data resets this list (the on-chain groups still
// exist; you'd re-add them by link).

const KEY_PREFIX = 'ledgr.groups.'

function keyFor(wallet) {
  return `${KEY_PREFIX}${String(wallet || '').toLowerCase()}`
}

/** Return the remembered groups for a wallet: [{ id, name, addedAt }]. */
export function listGroups(wallet) {
  if (!wallet) return []
  try {
    const raw = localStorage.getItem(keyFor(wallet))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** Remember a group for a wallet (dedupes by id, keeps the newest name). */
export function rememberGroup(wallet, id, name) {
  if (!wallet || !id) return listGroups(wallet)
  const groups = listGroups(wallet)
  const existing = groups.find((g) => g.id.toLowerCase() === id.toLowerCase())
  let next
  if (existing) {
    next = groups.map((g) =>
      g.id.toLowerCase() === id.toLowerCase() ? { ...g, name: name || g.name } : g,
    )
  } else {
    next = [{ id, name: name || 'Untitled ledger', addedAt: Date.now() }, ...groups]
  }
  try {
    localStorage.setItem(keyFor(wallet), JSON.stringify(next))
  } catch {
    /* storage full / unavailable — non-fatal */
  }
  return next
}

/** Forget a group for a wallet (removes it from the local list only). */
export function forgetGroup(wallet, id) {
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

// Friendly names for wallet addresses, stored locally (per browser). Lets the
// UI show "Alice" instead of 0x18…5255a in group tables and ledger entries.
// Display-only convenience — nothing is written on-chain.

const KEY = 'ledgr.nicknames'

function readAll() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeAll(map) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map))
  } catch {
    /* storage unavailable — non-fatal */
  }
}

/** Get the saved nickname for an address, or '' if none. */
export function getNickname(address) {
  if (!address) return ''
  return readAll()[address.toLowerCase()] || ''
}

/** Save (or clear, if name is empty) a nickname for an address. */
export function setNickname(address, name) {
  if (!address) return
  const map = readAll()
  const key = address.toLowerCase()
  const clean = String(name || '').trim().slice(0, 40)
  if (clean) map[key] = clean
  else delete map[key]
  writeAll(map)
}

/** Short address form, e.g. 0x1863…5255a. */
export function shortAddress(a) {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : ''
}

/** Display label: nickname if set, else short address. */
export function displayName(address) {
  return getNickname(address) || shortAddress(address)
}

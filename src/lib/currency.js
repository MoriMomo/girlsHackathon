// Multi-currency DISPLAY layer. Amounts are stored on-chain as USD cents; this
// converts them for display only. Live rates from the Frankfurter API (free, no
// key, CORS-enabled, ECB data) with graceful fallback so the UI never breaks:
//   live fetch → localStorage cache → hardcoded baseline.

const RATE_CACHE_KEY = 'ledgr.fxRates'
const PREF_KEY = 'ledgr.currency'
const BASE = 'USD'

export const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'IDR', symbol: 'Rp', label: 'Indonesian Rupiah' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'SGD', symbol: 'S$', label: 'Singapore Dollar' },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen' },
]

// Fallback rates (approx, per 1 USD) if the API and cache are both unavailable.
const FALLBACK_RATES = { USD: 1, IDR: 16500, EUR: 0.92, GBP: 0.79, SGD: 1.35, JPY: 155 }

export function getPreferredCurrency() {
  try {
    return localStorage.getItem(PREF_KEY) || 'USD'
  } catch {
    return 'USD'
  }
}

export function setPreferredCurrency(code) {
  try {
    localStorage.setItem(PREF_KEY, code)
  } catch {
    /* non-fatal */
  }
}

function readCache() {
  try {
    const raw = localStorage.getItem(RATE_CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * Fetch live rates (base USD). Returns { rates, date, source }.
 * Falls back to cache, then to baseline — never throws.
 */
export async function loadRates() {
  const symbols = CURRENCIES.map((c) => c.code)
    .filter((c) => c !== BASE)
    .join(',')
  try {
    const res = await fetch(
      `https://api.frankfurter.dev/v1/latest?base=${BASE}&symbols=${symbols}`,
    )
    if (!res.ok) throw new Error(`FX ${res.status}`)
    const data = await res.json()
    const rates = { USD: 1, ...data.rates }
    const payload = { rates, date: data.date || new Date().toISOString().slice(0, 10), source: 'live' }
    try {
      localStorage.setItem(RATE_CACHE_KEY, JSON.stringify(payload))
    } catch {
      /* ignore */
    }
    return payload
  } catch {
    const cached = readCache()
    if (cached?.rates) return { ...cached, source: 'cached' }
    return { rates: FALLBACK_RATES, date: null, source: 'fallback' }
  }
}

/** Build a formatter: (cents) => localized currency string, from USD cents. */
export function makeFormatter(code, rates) {
  const rate = (rates && rates[code]) || FALLBACK_RATES[code] || 1
  // JPY/IDR conventionally show no decimals.
  const noDecimals = code === 'JPY' || code === 'IDR'
  const fmt = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: code,
    minimumFractionDigits: noDecimals ? 0 : 2,
    maximumFractionDigits: noDecimals ? 0 : 2,
  })
  return (cents) => fmt.format((Number(cents) / 100) * rate)
}

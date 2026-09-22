// AI receipt scanner for the money tracker.
//
// Reads a receipt image and extracts { amount, description, date, category } to
// PRE-FILL the expense form. The user always reviews and confirms the on-chain
// transaction -- the scan never writes anything.
//
// Modes:
//   1. REAL AI  -- if a Google Gemini key is set, the image is sent to Gemini's
//                  vision model. Free key: https://aistudio.google.com.
//   2. FALLBACK -- no key -> a local heuristic parses the file name. Never fails
//                  live during a demo.

import { CATEGORIES, DEFAULT_CATEGORY } from './chain.js'

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
// Resilient model fallback cascade: if the primary model is busy (503) or rate-limited (429),
// try the next active model endpoint before falling back to local heuristic.
const GEMINI_MODELS = [
  // Lead with Google's maintained aliases (kept pointed at a healthy model),
  // then concrete flash tiers. More endpoints = better odds during a 503 wave.
  // If ALL fail, scanReceipt() falls back to the local heuristic so the app
  // never breaks in a demo.
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'gemini-3.5-flash',
  'gemini-3-flash-preview',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
]

function todayISO() {
  const d = new Date()
  const tz = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tz).toISOString().slice(0, 10)
}

export function getApiKey() {
  try {
    const fromEnv = import.meta.env?.VITE_GEMINI_API_KEY
    if (fromEnv) return String(fromEnv).trim()
  } catch {
    /* import.meta.env may be undefined */
  }
  try {
    const fromLs = localStorage.getItem('gemini_api_key')
    if (fromLs) return fromLs.trim()
  } catch {
    /* localStorage unavailable */
  }
  return ''
}

export function isAiAvailable() {
  return getApiKey().length > 0
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(new Error('Could not read the image file.'))
    reader.readAsDataURL(file)
  })
}

// Robustly parse a money value that may arrive as a number or a messy string
// like "$1,234.56", "1.234,56", "Rp 15.000", or "12,50". Returns a positive
// number or null.
function parseAmount(raw) {
  if (typeof raw === 'number') return Number.isFinite(raw) && raw > 0 ? raw : null
  let str = String(raw).replace(/[^0-9.,]/g, '') // strip currency symbols/letters
  if (!str) return null
  const lastComma = str.lastIndexOf(',')
  const lastDot = str.lastIndexOf('.')
  // Whichever separator appears LAST is the decimal separator.
  if (lastComma > lastDot) {
    // comma is decimal: remove dots (thousands), swap comma -> dot
    str = str.replace(/\./g, '').replace(',', '.')
  } else {
    // dot is decimal (or none): remove commas (thousands)
    str = str.replace(/,/g, '')
  }
  const n = Number(str)
  return Number.isFinite(n) && n > 0 ? n : null
}

// Normalize/validate model or heuristic output into safe fields.
function normalize(fields) {
  const out = { amount: null, description: '', date: todayISO(), category: DEFAULT_CATEGORY }

  if (fields && fields.amount != null) {
    out.amount = parseAmount(fields.amount)
  }
  if (fields && typeof fields.description === 'string') {
    out.description = fields.description.trim().slice(0, 180)
  }
  if (fields && ISO_DATE_RE.test(String(fields.date || ''))) {
    out.date = String(fields.date) <= todayISO() ? String(fields.date) : todayISO()
  }
  if (fields && CATEGORIES.includes(fields.category)) {
    out.category = fields.category
  }
  return out
}

async function scanWithGemini(base64, mimeType, apiKey) {
  const cats = CATEGORIES.map((c) => `"${c}"`).join(',')
  let lastError = null

  for (const model of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text:
                    'You are extracting ONE expense from a photo of a receipt. Return the GRAND TOTAL actually paid ' +
                    '(the final total AFTER tax and tips, NOT the subtotal, NOT an individual line item). ' +
                    'Return fields: ' +
                    'amount = the grand total as a plain number only, no currency symbol, no thousands separators, dot for decimals e.g. 1234.56; ' +
                    'description = the merchant or store name if visible, else a 2-4 word summary of what was bought; ' +
                    'date = the purchase date on the receipt in strict YYYY-MM-DD format (assume current year if the year is missing, null if no date); ' +
                    'category = the single best fit from this list: ' + cats + '. ' +
                    'Map food/restaurants/cafes/groceries to Food; taxi/fuel/transit to Transport; utilities/telco/rent to Bills; ' +
                    'retail/clothing/electronics to Shopping; pharmacy/clinic to Health; movies/games/bars to Entertainment; otherwise Other. ' +
                    'If a field is genuinely unreadable use null for that field. Do not guess wildly.',
                },
                { inline_data: { mime_type: mimeType || 'image/jpeg', data: base64 } },
              ],
            },
          ],
          generationConfig: { temperature: 0, maxOutputTokens: 300, responseMimeType: 'application/json' },
        }),
      })

      if (!resp.ok) {
        const txt = await resp.text().catch(() => '')
        lastError = new Error(`Gemini ${model} failed (${resp.status}). ${txt.slice(0, 140)}`)
        // If high demand (503), rate limit (429), or model deprecated/unsupported (404), try next model
        if (resp.status === 503 || resp.status === 429 || resp.status === 404) {
          console.warn(`[receiptScanner] Model ${model} returned ${resp.status}, trying fallback model...`)
          continue
        }
        throw lastError
      }

      const data = await resp.json()
      const content = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || ''
      const match = content.match(/\{[\s\S]*\}/)
      if (!match) throw new Error(`Gemini ${model} did not return readable fields.`)
      return { ...JSON.parse(match[0]), modelUsed: model }
    } catch (err) {
      lastError = err
      console.warn(`[receiptScanner] Error querying ${model}:`, err?.message || err)
    }
  }

  throw lastError || new Error('All Gemini model endpoints failed.')
}

function scanLocally(hintText) {
  const text = String(hintText || '')
  const fields = { amount: null, description: '', date: null, category: null }

  const amountMatch = text.match(/(\d+(?:[.,]\d{1,2})?)/)
  if (amountMatch) fields.amount = amountMatch[1].replace(',', '.')

  const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/)
  if (dateMatch) fields.date = dateMatch[1]

  let desc = text
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(amountMatch?.[0] || '', '')
    .replace(dateMatch?.[0] || '', '')
    .trim()
  fields.description = desc || 'Scanned receipt'

  return fields
}

/**
 * Public entry point.
 * @returns {Promise<{ amount: number|null, description: string, date: string, category: string, mode: 'ai'|'local', modelUsed?: string, fallbackReason?: string }>}
 */
export async function scanReceipt({ file, hintText } = {}) {
  const apiKey = getApiKey()

  if (apiKey && file) {
    try {
      const base64 = await fileToBase64(file)
      const raw = await scanWithGemini(base64, file.type, apiKey)
      return { ...normalize(raw), mode: 'ai', modelUsed: raw.modelUsed }
    } catch (err) {
      console.warn('[receiptScanner] Gemini scan failed, falling back to local heuristic:', err)
      const raw = scanLocally(hintText || file?.name)
      return { ...normalize(raw), mode: 'local', fallbackReason: err?.message || 'AI unavailable' }
    }
  }

  const raw = scanLocally(hintText || file?.name)
  return { ...normalize(raw), mode: 'local' }
}


// AI receipt scanner for the ledgr expense tracker.
//
// Reads a receipt image and extracts { amount, description, date, category } to
// PRE-FILL the expense form. The user always reviews and confirms the on-chain
// transaction -- the scan never writes anything automatically.
//
// Honest scanning design:
//   - If a valid Gemini key is present, calls the Gemini multimodal vision endpoint.
//   - If no key is set or the API fails, the scanner fails honestly with a clear
//     explanation instead of regex-guessing junk numbers from the file name.

import { CATEGORIES, DEFAULT_CATEGORY } from './chain.js'

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// Active, production-tested Gemini vision models.
// Leads with stable flash aliases, cascading to lightweight and primary tiers.
const GEMINI_MODELS = [
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
]

function todayISO() {
  const d = new Date()
  const tz = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tz).toISOString().slice(0, 10)
}

export function getApiKey() {
  try {
    const fromEnv = import.meta.env?.VITE_GEMINI_API_KEY
    if (fromEnv && String(fromEnv).trim().length > 0) return String(fromEnv).trim()
  } catch {
    /* import.meta.env may be undefined */
  }
  try {
    const fromLs = localStorage.getItem('gemini_api_key')
    if (fromLs && fromLs.trim().length > 0) return fromLs.trim()
  } catch {
    /* localStorage unavailable */
  }
  return ''
}

export function setApiKey(key) {
  try {
    if (key && key.trim()) {
      localStorage.setItem('gemini_api_key', key.trim())
    } else {
      localStorage.removeItem('gemini_api_key')
    }
  } catch {
    /* ignore */
  }
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
  let str = String(raw).replace(/[^0-9.,]/g, '')
  if (!str) return null
  const lastComma = str.lastIndexOf(',')
  const lastDot = str.lastIndexOf('.')
  if (lastComma > lastDot) {
    str = str.replace(/\./g, '').replace(',', '.')
  } else {
    str = str.replace(/,/g, '')
  }
  const n = Number(str)
  return Number.isFinite(n) && n > 0 ? n : null
}

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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
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
                    'Return valid JSON only with these exact fields: ' +
                    'amount = the grand total as a plain number only, no currency symbol, no thousands separators, dot for decimals e.g. 1234.56, or null if unreadable; ' +
                    'description = the merchant or store name if visible, else a concise 2-4 word summary of what was bought; ' +
                    'date = the purchase date on the receipt in strict YYYY-MM-DD format (assume current year if year is missing, null if no date); ' +
                    'category = the single best fit from this exact list: ' + cats + '. ' +
                    'Map food/restaurants/cafes/groceries to Food; taxi/fuel/transit to Transport; utilities/telco/rent to Bills; ' +
                    'retail/clothing/electronics to Shopping; pharmacy/clinic to Health; movies/games/bars to Entertainment; otherwise Other. ' +
                    'If a field is genuinely unreadable or this is not a receipt, use null for amount and description. Do not guess wildly.',
                },
                { inline_data: { mime_type: mimeType || 'image/jpeg', data: base64 } },
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 300,
            responseMimeType: 'application/json',
          },
        }),
      })

      if (!resp.ok) {
        const txt = await resp.text().catch(() => '')
        let errorMsg = `Gemini ${model} failed (${resp.status})`
        try {
          const parsed = JSON.parse(txt)
          if (parsed?.error?.message) errorMsg = parsed.error.message
        } catch {
          if (txt) errorMsg = `${errorMsg}: ${txt.slice(0, 100)}`
        }

        // If key is invalid (400 or 403), stop cascading immediately
        if (resp.status === 400 || resp.status === 403) {
          throw new Error(`API key error: ${errorMsg}`)
        }

        lastError = new Error(errorMsg)
        // High demand (503), rate limit (429), or deprecated model (404) -> try next in cascade
        if (resp.status === 503 || resp.status === 429 || resp.status === 404) {
          console.warn(`[receiptScanner] Model ${model} returned ${resp.status}, cascading to next model...`)
          continue
        }
        throw lastError
      }

      const data = await resp.json()
      // Extract text content, filtering out internal thinking parts if present
      const parts = data?.candidates?.[0]?.content?.parts || []
      const textParts = parts.filter((p) => !p.thought).map((p) => p.text || '')
      const content = (textParts.length ? textParts.join('') : parts.map((p) => p.text || '').join('')).trim()

      const clean = content.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim()
      const match = clean.match(/\{[\s\S]*\}/)
      if (!match) throw new Error(`Gemini ${model} did not return structured JSON.`)

      const parsed = JSON.parse(match[0])
      return { ...parsed, modelUsed: model }
    } catch (err) {
      lastError = err
      console.warn(`[receiptScanner] Error querying ${model}:`, err?.message || err)
      // Stop early if it's an API key or client authentication error
      if (err?.message?.includes('API key error')) throw err
    }
  }

  throw lastError || new Error('All Gemini model endpoints failed. Please try again.')
}

/**
 * Public entry point.
 * @returns {Promise<{
 *   success: boolean,
 *   amount: number|null,
 *   description: string,
 *   date: string,
 *   category: string,
 *   mode: 'ai'|'unconfigured'|'failed',
 *   modelUsed?: string,
 *   error?: string
 * }>}
 */
export async function scanReceipt({ file } = {}) {
  const apiKey = getApiKey()

  if (!apiKey) {
    return {
      success: false,
      mode: 'unconfigured',
      error: 'No Gemini API key configured. Enter expense manually or add your key.',
      amount: null,
      description: '',
      date: todayISO(),
      category: DEFAULT_CATEGORY,
    }
  }

  if (!file) {
    return {
      success: false,
      mode: 'failed',
      error: 'No receipt file provided.',
      amount: null,
      description: '',
      date: todayISO(),
      category: DEFAULT_CATEGORY,
    }
  }

  try {
    const base64 = await fileToBase64(file)
    const raw = await scanWithGemini(base64, file.type, apiKey)
    const fields = normalize(raw)

    return {
      success: true,
      mode: 'ai',
      modelUsed: raw.modelUsed,
      ...fields,
    }
  } catch (err) {
    console.warn('[receiptScanner] Gemini scan failed:', err)
    return {
      success: false,
      mode: 'failed',
      error: err?.message || 'AI vision scan failed. Please enter the details manually.',
      amount: null,
      description: '',
      date: todayISO(),
      category: DEFAULT_CATEGORY,
    }
  }
}

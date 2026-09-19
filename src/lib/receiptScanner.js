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
const GEMINI_MODEL = 'gemini-flash-latest'

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

// Normalize/validate model or heuristic output into safe fields.
function normalize(fields) {
  const out = { amount: null, description: '', date: todayISO(), category: DEFAULT_CATEGORY }

  if (fields && fields.amount != null) {
    const n = Number(String(fields.amount).replace(/[^0-9.]/g, ''))
    if (Number.isFinite(n) && n > 0) out.amount = n
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
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
  const cats = CATEGORIES.map((c) => `"${c}"`).join(',')

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
                'You extract a single expense from a receipt image. Reply with ONLY compact JSON, no markdown fences: ' +
                `{"amount": number as a plain number, "description": short merchant or item summary, "date": "YYYY-MM-DD", "category": one of [${cats}]}. ` +
                'If a field is unreadable, use null.',
            },
            { inline_data: { mime_type: mimeType || 'image/jpeg', data: base64 } },
          ],
        },
      ],
      generationConfig: { temperature: 0, maxOutputTokens: 200 },
    }),
  })

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '')
    throw new Error(`Gemini request failed (${resp.status}). ${txt.slice(0, 140)}`)
  }
  const data = await resp.json()
  const content = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || ''
  const match = content.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Gemini did not return readable fields.')
  return JSON.parse(match[0])
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
 * @returns {Promise<{ amount: number|null, description: string, date: string, category: string, mode: 'ai'|'local' }>}
 */
export async function scanReceipt({ file, hintText } = {}) {
  const apiKey = getApiKey()

  if (apiKey && file) {
    try {
      const base64 = await fileToBase64(file)
      const raw = await scanWithGemini(base64, file.type, apiKey)
      return { ...normalize(raw), mode: 'ai' }
    } catch (err) {
      console.warn('[receiptScanner] Gemini scan failed, falling back to local:', err)
      const raw = scanLocally(hintText || file?.name)
      return { ...normalize(raw), mode: 'local' }
    }
  }

  const raw = scanLocally(hintText || file?.name)
  return { ...normalize(raw), mode: 'local' }
}

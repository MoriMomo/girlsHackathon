// Storage layer for expenses.
// This is intentionally isolated so it can later be swapped for a
// blockchain-backed implementation (e.g. calling MyCertificate-style
// contract methods) without touching the UI.

const STORAGE_KEY = 'financial-tracker.expenses'

/**
 * @typedef {Object} Expense
 * @property {string} id          Unique record id.
 * @property {number} amount      Expense amount (major units, e.g. dollars).
 * @property {string} description Short description.
 * @property {string} date        ISO date string (YYYY-MM-DD).
 * @property {number} createdAt   Unix ms timestamp when the record was logged.
 * @property {string} source      'manual' | 'scan'
 */

/**
 * Load all expenses from storage.
 * @returns {Expense[]}
 */
export function loadExpenses() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    console.error('Failed to load expenses:', err)
    return []
  }
}

/**
 * Persist the full expense list.
 * @param {Expense[]} expenses
 */
function saveExpenses(expenses) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses))
}

/**
 * Append a new expense as a permanent record (append-only, no edit/delete).
 * @param {{ amount: number, description: string, date: string, source?: string }} input
 * @returns {Expense} The stored record.
 */
export function addExpense(input) {
  const expenses = loadExpenses()
  const record = {
    id:
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now()) + Math.random().toString(16).slice(2),
    amount: Number(input.amount),
    description: String(input.description).trim(),
    date: input.date,
    createdAt: Date.now(),
    source: input.source || 'manual',
  }
  // Newest first for display.
  const next = [record, ...expenses]
  saveExpenses(next)
  return record
}

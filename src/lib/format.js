// Small display helpers shared across pages.

export const money = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
})

export function centsToDollars(cents) {
  return Number(cents) / 100
}

export function shortAddr(a) {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : ''
}

export function formatDay(d) {
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

// Guard against CSV formula injection: a spreadsheet treats a cell starting
// with = + - @ (or tab/CR) as a formula, and group descriptions come from
// other (untrusted) wallets. Prefix such values with a single quote so Excel/
// Sheets render them as literal text. Then quote-wrap and escape double-quotes.
function csvCell(value) {
  let s = String(value ?? '')
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}

/** Build a CSV from decoded expense rows and trigger a browser download. */
export function downloadExpensesCsv(expenses, filename = 'ledgr-expenses.csv') {
  const header = ['Date', 'Category', 'Description', 'Amount (USD)']
  const rows = expenses.map((e) => [
    csvCell(e.date || new Date(e.timestamp * 1000).toISOString().slice(0, 10)),
    csvCell(e.category || 'Other'),
    csvCell(e.description),
    centsToDollars(e.amount).toFixed(2),
  ])
  const csv = [header.map(csvCell), ...rows].map((r) => r.join(',')).join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

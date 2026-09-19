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

/** Build a CSV from decoded expense rows and trigger a browser download. */
export function downloadExpensesCsv(expenses, filename = 'ledgr-expenses.csv') {
  const header = ['Date', 'Category', 'Description', 'Amount (USD)']
  const rows = expenses.map((e) => [
    e.date || new Date(e.timestamp * 1000).toISOString().slice(0, 10),
    e.category || 'Other',
    `"${String(e.description).replace(/"/g, '""')}"`, // escape quotes
    centsToDollars(e.amount).toFixed(2),
  ])
  const csv = [header, ...rows].map((r) => r.join(',')).join('\n')

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

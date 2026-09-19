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

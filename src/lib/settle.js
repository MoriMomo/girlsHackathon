// Settle-up math for a shared group ledger. Given the group's expenses, compute
// each wallet's net balance (paid minus fair share) and a minimal set of
// "X pays Y $Z" transfers that squares everyone up.
//
// Assumption: an equal split across everyone who has contributed at least once
// to the group (the common "split evenly among the group" model). All amounts
// are in minor units (cents) to avoid floating-point drift; the greedy transfer
// algorithm is the standard debt-simplification approach.
//
// This is OFF-CHAIN math computed from ON-CHAIN data — it shows who owes whom;
// it does not move funds.

/**
 * @param expenses  [{ payer, amount(cents) }]
 * @returns {
 *   members: string[],                       // wallets involved
 *   perHead: number,                         // equal share in cents
 *   balances: { [addr]: number },            // + = owed to them, - = they owe
 *   transfers: [{ from, to, amount }]        // minimal settle-up transfers (cents)
 * }
 */
export function computeSettlement(expenses) {
  const paid = {}
  for (const e of expenses) {
    const a = e.payer
    paid[a] = (paid[a] || 0) + Number(e.amount)
  }
  const members = Object.keys(paid)
  const n = members.length
  const total = Object.values(paid).reduce((s, v) => s + v, 0)

  if (n === 0) return { members: [], perHead: 0, balances: {}, transfers: [] }

  // Equal share, with the rounding remainder distributed so sums stay exact.
  const base = Math.floor(total / n)
  let remainder = total - base * n
  const share = {}
  for (const m of members) {
    share[m] = base + (remainder > 0 ? 1 : 0)
    if (remainder > 0) remainder--
  }

  // Net balance: what they paid minus their fair share.
  const balances = {}
  for (const m of members) balances[m] = paid[m] - share[m]

  // Greedy debt simplification: match biggest creditor with biggest debtor.
  const creditors = members
    .filter((m) => balances[m] > 0)
    .map((m) => ({ addr: m, amt: balances[m] }))
    .sort((a, b) => b.amt - a.amt)
  const debtors = members
    .filter((m) => balances[m] < 0)
    .map((m) => ({ addr: m, amt: -balances[m] }))
    .sort((a, b) => b.amt - a.amt)

  const transfers = []
  let ci = 0
  let di = 0
  while (ci < creditors.length && di < debtors.length) {
    const c = creditors[ci]
    const d = debtors[di]
    const amount = Math.min(c.amt, d.amt)
    if (amount > 0) transfers.push({ from: d.addr, to: c.addr, amount })
    c.amt -= amount
    d.amt -= amount
    if (c.amt === 0) ci++
    if (d.amt === 0) di++
  }

  return { members, perHead: share[members[0]] ?? base, balances, transfers }
}

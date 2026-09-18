import { useEffect, useMemo, useState } from 'react'
import ExpenseForm from './components/ExpenseForm.jsx'
import ExpenseList from './components/ExpenseList.jsx'
import { loadExpenses, addExpense } from './lib/expenseStore.js'

const currency = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
})

export default function App() {
  const [expenses, setExpenses] = useState([])

  useEffect(() => {
    setExpenses(loadExpenses())
  }, [])

  const total = useMemo(
    () => expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
    [expenses],
  )

  function handleAdd(input) {
    const record = addExpense(input)
    setExpenses((prev) => [record, ...prev])
  }

  return (
    <div className="min-h-screen text-slate-800">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Financial Tracker</h1>
          <p className="text-slate-500 mt-1">
            Log an expense as a permanent record. Type it in, or scan a receipt with AI.
          </p>
        </header>

        <ExpenseForm onAdd={handleAdd} />

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Permanent record</h2>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-slate-400">Total logged</p>
              <p className="text-lg font-bold text-slate-900">{currency.format(total)}</p>
            </div>
          </div>

          <ExpenseList expenses={expenses} />
        </section>

        <footer className="mt-10 text-center text-xs text-slate-400">
          Records are stored locally in your browser for now. Blockchain sync comes later.
        </footer>
      </div>
    </div>
  )
}

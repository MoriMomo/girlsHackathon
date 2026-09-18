const currency = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
})

function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function ExpenseList({ expenses }) {
  if (expenses.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-400">
        No expenses logged yet. Add your first one above.
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {expenses.map((exp) => (
        <li
          key={exp.id}
          className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-slate-900 truncate">{exp.description}</p>
              {exp.source === 'scan' && (
                <span className="text-[10px] uppercase tracking-wide bg-indigo-50 text-indigo-600 rounded px-1.5 py-0.5">
                  Scanned
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 mt-0.5">{formatDate(exp.date)}</p>
          </div>
          <p className="text-lg font-semibold text-slate-900 shrink-0 ml-4">
            {currency.format(exp.amount)}
          </p>
        </li>
      ))}
    </ul>
  )
}

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { centsToDollars, money } from '../lib/format.js'

// Donut chart of spending grouped by category. Emerald-led palette to match
// the app's accent; renders nothing when there are no expenses.
const COLORS = [
  '#059669', // emerald
  '#0891b2', // cyan
  '#7c3aed', // violet
  '#db2777', // pink
  '#d97706', // amber
  '#dc2626', // red
  '#4f46e5', // indigo
  '#64748b', // slate
]

export default function CategoryChart({ expenses }) {
  const data = Object.values(
    expenses.reduce((acc, e) => {
      const key = e.category || 'Other'
      if (!acc[key]) acc[key] = { name: key, value: 0 }
      acc[key].value += centsToDollars(e.amount)
      return acc
    }, {}),
  ).sort((a, b) => b.value - a.value)

  if (data.length === 0) return null

  return (
    <div className="mb-8 rounded-xl border border-white/10 bg-neutral-900/80 p-5 shadow-md backdrop-blur-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
        Spending by category
      </h2>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="#171717" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v) => money.format(v)}
            contentStyle={{
              backgroundColor: '#171717',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '0.75rem',
              color: '#ffffff',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
            itemStyle={{ color: '#34d399' }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', color: '#a3a3a3' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { scanReceipt } from '../lib/receiptScanner.js'

const todayIso = () => new Date().toISOString().slice(0, 10)

export default function ExpenseForm({ onAdd }) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(todayIso())
  const [source, setSource] = useState('manual')
  const [error, setError] = useState('')

  const [scanning, setScanning] = useState(false)
  const [scanMsg, setScanMsg] = useState(null) // { type: 'ok' | 'err', text }
  const fileRef = useRef(null)

  function reset() {
    setAmount('')
    setDescription('')
    setDate(todayIso())
    setSource('manual')
  }

  function validate() {
    const amt = Number(amount)
    if (!amount || Number.isNaN(amt) || amt <= 0) {
      return 'Enter an amount greater than 0.'
    }
    if (!description.trim()) {
      return 'Add a short description.'
    }
    if (!date) {
      return 'Pick a date.'
    }
    return ''
  }

  function handleSubmit(e) {
    e.preventDefault()
    const msg = validate()
    if (msg) {
      setError(msg)
      return
    }
    setError('')
    onAdd({
      amount: Number(amount),
      description: description.trim(),
      date,
      source,
    })
    reset()
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setScanning(true)
    setScanMsg(null)
    try {
      const result = await scanReceipt(file)
      setAmount(String(result.amount))
      setDescription(result.description)
      setDate(result.date)
      setSource('scan')
      setScanMsg({ type: 'ok', text: 'Receipt scanned. Review the details, then log it.' })
    } catch (err) {
      console.error(err)
      setScanMsg({ type: 'err', text: 'Could not scan that receipt. Enter it manually.' })
    } finally {
      setScanning(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Add an expense</h2>

        <label
          className={`inline-flex items-center gap-2 text-sm font-medium cursor-pointer ${
            scanning ? 'text-slate-400 cursor-wait' : 'text-indigo-600 hover:text-indigo-700'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2M7 12h10" />
          </svg>
          {scanning ? 'Scanning…' : 'Scan receipt (AI)'}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={scanning}
            onChange={handleFile}
          />
        </label>
      </div>

      {scanMsg && (
        <div
          className={`mb-4 text-sm rounded-lg px-3 py-2 ${
            scanMsg.type === 'ok'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {scanMsg.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
          <input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="date" className="block text-sm font-medium text-slate-700 mb-1">Date</label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <input
            id="description"
            type="text"
            maxLength={120}
            placeholder="e.g. Coffee with team"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div className="sm:col-span-2 flex items-center justify-between">
          <p className="text-sm text-red-600">{error}</p>
          <button
            type="submit"
            className="ml-auto inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg px-5 py-2.5 transition-colors"
          >
            Log expense
          </button>
        </div>
      </form>
    </section>
  )
}

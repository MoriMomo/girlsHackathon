import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import {
  connectWallet,
  fetchExpenses,
  sendAddExpense,
  hasWallet,
  isContractConfigured,
  explorerAddressUrl,
  explorerTxUrl,
  todayISO,
  TARGET,
  CONTRACT_ADDRESS,
} from './lib/chain.js'
import { scanReceipt, isAiAvailable } from './lib/receiptScanner.js'

const money = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
})

// Contract stores amounts as integer minor units (cents). Convert for display.
function centsToDollars(cents) {
  return Number(cents) / 100
}

function shortAddr(a) {
  return a ? `${a.slice(0, 6)}...${a.slice(-4)}` : ''
}

// Render an expense's date: prefer the user-chosen date, fall back to block time.
function displayDate(e) {
  if (e.date) {
    const d = new Date(`${e.date}T00:00:00`)
    return d.toLocaleDateString()
  }
  return new Date(e.timestamp * 1000).toLocaleDateString()
}

export default function App() {
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [address, setAddress] = useState('')
  const [expenses, setExpenses] = useState([])
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(todayISO())
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [loadingList, setLoadingList] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanNote, setScanNote] = useState('')
  const fileInputRef = useRef(null)

  const connected = !!address

  const total = useMemo(
    () => expenses.reduce((sum, e) => sum + centsToDollars(e.amount), 0),
    [expenses],
  )

  const refresh = useCallback(
    async (prov = provider, wallet = address) => {
      if (!prov || !wallet) return
      setLoadingList(true)
      try {
        const rows = await fetchExpenses(prov, wallet)
        setExpenses([...rows].reverse())
      } catch (err) {
        console.error(err)
        setStatus(`Could not load expenses: ${err.message || err}`)
      } finally {
        setLoadingList(false)
      }
    },
    [provider, address],
  )

  async function handleConnect() {
    setStatus('')
    setBusy(true)
    try {
      const { provider: p, signer: s, address: a } = await connectWallet()
      setProvider(p)
      setSigner(s)
      setAddress(a)
      setStatus('')
      await refresh(p, a)
    } catch (err) {
      setStatus(err.message || String(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleScanFile(e) {
    const file = e.target.files?.[0]
    // reset the input so the same file can be re-selected later
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!file) return

    setScanNote('')
    setScanning(true)
    try {
      const result = await scanReceipt({ file, hintText: file.name })
      // Pre-fill whatever the scan found; the user reviews before saving.
      if (result.amount != null) setAmount(String(result.amount))
      if (result.description) setDescription(result.description)
      if (result.date) setDate(result.date)
      setScanNote(
        result.mode === 'ai'
          ? 'AI vision read this receipt. Review the fields, then save.'
          : 'Local scan (no AI key set) pre-filled a best guess. Review the fields, then save.',
      )
    } catch (err) {
      setScanNote(`Scan failed: ${err.message || err}. Enter the expense manually.`)
    } finally {
      setScanning(false)
    }
  }

  async function handleAdd(e) {
    e.preventDefault()
    setStatus('')

    const dollars = Number(amount)
    if (!Number.isFinite(dollars) || dollars <= 0) {
      setStatus('Enter an amount greater than 0.')
      return
    }
    if (!description.trim()) {
      setStatus('Enter a description.')
      return
    }
    if (!date) {
      setStatus('Pick a date.')
      return
    }
    const cents = Math.round(dollars * 100)

    setBusy(true)
    try {
      setStatus('Confirm the transaction in MetaMask...')
      const receipt = await sendAddExpense(signer, cents, description.trim(), date)
      setAmount('')
      setDescription('')
      setDate(todayISO())
      setScanNote('')
      const url = receipt?.hash ? explorerTxUrl(receipt.hash) : null
      setStatus(url ? `Saved on-chain. Tx: ${url}` : 'Saved on-chain.')
      await refresh()
    } catch (err) {
      const msg = err?.shortMessage || err?.message || String(err)
      setStatus(msg)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!hasWallet()) return
    const eth = window.ethereum
    const onAccounts = () => window.location.reload()
    const onChain = () => window.location.reload()
    eth.on?.('accountsChanged', onAccounts)
    eth.on?.('chainChanged', onChain)
    return () => {
      eth.removeListener?.('accountsChanged', onAccounts)
      eth.removeListener?.('chainChanged', onChain)
    }
  }, [])

  const walletMissing = !hasWallet()
  const contractMissing = !isContractConfigured()
  const aiOn = isAiAvailable()

  return (
    <div className="min-h-screen text-slate-800">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">On-Chain Money Tracker</h1>
            <p className="text-slate-500 mt-1">
              Log an expense as a permanent record on {TARGET.chainName}.
            </p>
          </div>
          {connected ? (
            <a
              href={explorerAddressUrl(address)}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
              title="View your wallet on the block explorer"
            >
              {shortAddr(address)}
            </a>
          ) : (
            <button
              onClick={handleConnect}
              disabled={busy || walletMissing}
              className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {busy ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </header>

        {/* Warnings */}
        {walletMissing && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            MetaMask not detected. Install it from{' '}
            <a className="underline" href="https://metamask.io" target="_blank" rel="noreferrer">
              metamask.io
            </a>{' '}
            to use this app.
          </div>
        )}
        {contractMissing && (
          <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
            Contract address not set yet. Deploy <code>ExpenseTracker.sol</code> in Remix, then
            paste its address into <code>src/lib/chain.js</code>. The UI runs now, but saving is
            disabled until then.
          </div>
        )}

        {/* Add form */}
        <form
          onSubmit={handleAdd}
          className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          {/* Scan row */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleScanFile}
              className="hidden"
              id="receipt-input"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={scanning}
              className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
            >
              {scanning ? 'Scanning...' : '📷 Scan receipt (AI)'}
            </button>
            <span
              className={`text-xs rounded-full px-2 py-0.5 ${
                aiOn
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-500 border border-slate-200'
              }`}
              title={
                aiOn
                  ? 'A Gemini key is configured: real vision scan.'
                  : 'No AI key set: uses a local heuristic. Add VITE_GEMINI_API_KEY to enable Gemini vision.'
              }
            >
              {aiOn ? 'AI vision on' : 'AI key not set (local mode)'}
            </span>
          </div>
          {scanNote && (
            <div className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-800">
              {scanNote}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-xs font-medium text-slate-500 mb-1">Amount (USD)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="12.50"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
              <input
                type="text"
                maxLength={180}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Lunch, bus fare, groceries..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
              <input
                type="date"
                value={date}
                max={todayISO()}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={!connected || busy || contractMissing}
            className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? 'Working...' : connected ? 'Save expense on-chain' : 'Connect wallet to save'}
          </button>
        </form>

        {/* Status line */}
        {status && (
          <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 break-words">
            {status.includes('http') ? (
              <span>
                Saved on-chain.{' '}
                <a
                  className="underline text-emerald-700"
                  href={status.split('Tx: ')[1] || status}
                  target="_blank"
                  rel="noreferrer"
                >
                  View transaction
                </a>
              </span>
            ) : (
              status
            )}
          </div>
        )}

        {/* List */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Your on-chain records</h2>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-slate-400">Total logged</p>
              <p className="text-lg font-bold text-slate-900">{money.format(total)}</p>
            </div>
          </div>

          {!connected ? (
            <p className="text-sm text-slate-400">Connect your wallet to see your records.</p>
          ) : loadingList ? (
            <p className="text-sm text-slate-400">Loading from the blockchain...</p>
          ) : expenses.length === 0 ? (
            <p className="text-sm text-slate-400">No expenses yet. Add your first one above.</p>
          ) : (
            <ul className="space-y-2">
              {expenses.map((e, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-slate-900">{e.description}</p>
                    <p className="text-xs text-slate-400">
                      {displayDate(e)}
                      {e.date && (
                        <span className="ml-2 text-slate-300">
                          · logged {new Date(e.timestamp * 1000).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                  </div>
                  <p className="font-semibold text-slate-900">
                    {money.format(centsToDollars(e.amount))}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="mt-10 text-center text-xs text-slate-400">
          <p>
            Records are stored permanently on {TARGET.chainName}. Contract:{' '}
            {isContractConfigured() ? (
              <a
                className="underline"
                href={explorerAddressUrl(CONTRACT_ADDRESS)}
                target="_blank"
                rel="noreferrer"
              >
                {shortAddr(CONTRACT_ADDRESS)}
              </a>
            ) : (
              'not deployed yet'
            )}
          </p>
        </footer>
      </div>
    </div>
  )
}

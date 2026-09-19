import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useWallet } from './lib/useWallet.js'
import NavBar from './components/NavBar.jsx'
import Footer from './components/Footer.jsx'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Tracker from './pages/Tracker.jsx'

// App root. Wallet state lives HERE (via useWallet) so it persists across every
// route -- connecting on one page keeps you connected on the others.
//
// HashRouter is deliberate: routes live under /#/, /#/login, /#/tracker, which
// never 404 on refresh or direct-open on GitHub Pages (no server rewrites needed).
export default function App() {
  const wallet = useWallet()

  return (
    <HashRouter>
      <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800">
        <NavBar wallet={wallet} />
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<Landing wallet={wallet} />} />
            <Route path="/login" element={<Login wallet={wallet} />} />
            <Route path="/tracker" element={<Tracker wallet={wallet} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </HashRouter>
  )
}

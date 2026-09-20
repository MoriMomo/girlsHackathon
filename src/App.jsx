import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useWallet } from './lib/useWallet.js'
import NavBar from './components/NavBar.jsx'
import Footer from './components/Footer.jsx'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Tracker from './pages/Tracker.jsx'
import GroupTracker from './pages/GroupTracker.jsx'

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
            <Route path="/group/:groupId" element={<GroupTracker wallet={wallet} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </HashRouter>
  )
}

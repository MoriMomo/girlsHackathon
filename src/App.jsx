import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useWallet } from './lib/useWallet.js'
import NavBar from './components/NavBar.jsx'
import Footer from './components/Footer.jsx'
import PageTransition from './components/PageTransition.jsx'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Tracker from './pages/Tracker.jsx'
import GroupTracker from './pages/GroupTracker.jsx'
import Ledgers from './pages/Ledgers.jsx'
import Blog from './pages/Blog.jsx'
import BlogPost from './pages/BlogPost.jsx'

// Routed content lives here (inside the Router) so it can read the location for
// animated transitions and scroll-reset on navigation.
function AnimatedRoutes({ wallet }) {
  const location = useLocation()

  // Reset scroll to top on route change — smoother than landing mid-page.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' })
  }, [location.pathname])

  const wrap = (el) => <PageTransition>{el}</PageTransition>

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={wrap(<Landing wallet={wallet} />)} />
        <Route path="/login" element={wrap(<Login wallet={wallet} />)} />
        <Route path="/tracker" element={wrap(<Tracker wallet={wallet} />)} />
        <Route path="/ledgers" element={wrap(<Ledgers wallet={wallet} />)} />
        <Route path="/blog" element={wrap(<Blog />)} />
        <Route path="/blog/:slug" element={wrap(<BlogPost />)} />
        <Route path="/group/:groupId" element={wrap(<GroupTracker wallet={wallet} />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  const wallet = useWallet()

  return (
    <HashRouter>
      <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800">
        <NavBar wallet={wallet} />
        <div className="flex-1">
          <AnimatedRoutes wallet={wallet} />
        </div>
        <Footer />
      </div>
    </HashRouter>
  )
}

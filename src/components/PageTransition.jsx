import { motion } from 'framer-motion'

// Wraps a page so it fades + slides in on route change. Respects reduced motion
// via framer-motion's own handling. Kept subtle (short, small offset) so it
// feels smooth, not slow — matters on a functional app.
export default function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

import { useEffect, useRef, useState } from 'react'
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from 'framer-motion'

// Wraps a value into a repeating range, e.g. wrap(-25, 0, -30) -> -5.
// Used to loop the marquee's horizontal position seamlessly.
function wrap(min, max, v) {
  const range = max - min
  return ((((v - min) % range) + range) % range) + min
}

// Respects the user's OS-level "reduce motion" preference -- scroll-linked
// animation can be genuinely uncomfortable for some people.
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])
  return reduced
}

function VelocityRow({ text, baseVelocity, className }) {
  const baseX = useMotionValue(0)
  const { scrollY } = useScroll()
  const scrollVelocity = useVelocity(scrollY)
  const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 400 })
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 5], { clamp: false })
  const reducedMotion = usePrefersReducedMotion()

  const containerRef = useRef(null)
  const textRef = useRef(null)
  const [repetitions, setRepetitions] = useState(4)

  // How many copies of the text fill the container width, plus extra for
  // seamless wraparound.
  useEffect(() => {
    function recalc() {
      if (containerRef.current && textRef.current) {
        const containerWidth = containerRef.current.offsetWidth
        const textWidth = textRef.current.offsetWidth
        if (textWidth > 0) setRepetitions(Math.ceil(containerWidth / textWidth) + 2)
      }
    }
    recalc()
    window.addEventListener('resize', recalc)
    return () => window.removeEventListener('resize', recalc)
  }, [text])

  const x = useTransform(baseX, (v) => `${wrap(-100 / repetitions, 0, v)}%`)
  const directionFactor = useRef(1)

  useAnimationFrame((_t, delta) => {
    if (reducedMotion) return // frozen for users who've asked for less motion

    let moveBy = directionFactor.current * baseVelocity * (delta / 1000)
    if (velocityFactor.get() < 0) directionFactor.current = -1
    else if (velocityFactor.get() > 0) directionFactor.current = 1
    moveBy += directionFactor.current * moveBy * velocityFactor.get()
    baseX.set(baseX.get() + moveBy)
  })

  return (
    <div ref={containerRef} className="w-full overflow-hidden whitespace-nowrap">
      <motion.div className={`inline-flex ${className}`} style={{ x }}>
        {Array.from({ length: repetitions }).map((_, i) => (
          <span key={i} ref={i === 0 ? textRef : null} className="mx-4 inline-block">
            {text}
          </span>
        ))}
      </motion.div>
    </div>
  )
}

/**
 * The one, single scroll-velocity marquee on the page. Two rows, opposite
 * directions, carrying ledgr's actual value props -- not fake partner logos.
 * Background matches the current dark landing design (#0a0a0a) for a seamless
 * seam with the hero and stats sections above/below it.
 */
export default function ScrollVelocityMarquee() {
  return (
    <div className="space-y-3 border-y border-neutral-800 bg-[#0a0a0a] py-10">
      <VelocityRow
        text="ON-CHAIN STORAGE · AUDITABLE LEDGER · PUBLIC VERIFICATION ·"
        baseVelocity={2.5}
        className="text-2xl font-semibold uppercase tracking-tight text-white sm:text-3xl"
      />
      <VelocityRow
        text="SHARED EXPENSES · NO DATABASE · DEPLOYED ON BOT CHAIN ·"
        baseVelocity={-2.5}
        className="text-2xl font-semibold uppercase tracking-tight text-emerald-400 sm:text-3xl"
      />
    </div>
  )
}

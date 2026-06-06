import { motion } from 'framer-motion'

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <motion.div
      onClick={onClick}
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 26 }}
      className={[
        'rounded-3xl p-6',
        // backdrop-blur is costly on mobile Safari, so the frosted-glass effect
        // is desktop-only; phones get a slightly more opaque panel instead.
        'bg-white/[0.14] md:bg-white/10 md:backdrop-blur-md border border-white/20 shadow-xl',
        onClick ? 'cursor-pointer' : '',
        className,
      ].join(' ')}
    >
      {children}
    </motion.div>
  )
}

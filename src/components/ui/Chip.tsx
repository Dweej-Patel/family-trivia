import { motion } from 'framer-motion'

interface ChipProps {
  label: string
  selected?: boolean
  onClick?: () => void
  emoji?: string
  color?: string
}

const GRAPE = '#7c3aed'

export function Chip({ label, selected = false, onClick, emoji, color }: ChipProps) {
  const fill = color ?? GRAPE

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.92 }}
      animate={{ scale: selected ? 1.05 : 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 24 }}
      style={selected ? { backgroundColor: fill, borderColor: fill } : undefined}
      className={[
        'inline-flex items-center gap-1.5 select-none cursor-pointer',
        'rounded-full px-4 py-2 font-body font-bold text-sm',
        'border-2 transition-colors duration-150 outline-none',
        'focus-visible:ring-4 focus-visible:ring-white/40',
        selected
          ? 'text-white shadow-glow'
          : 'bg-white/10 text-white/90 border-white/25 backdrop-blur-sm hover:bg-white/20',
      ].join(' ')}
    >
      {emoji && <span className="text-base leading-none">{emoji}</span>}
      <span>{label}</span>
    </motion.button>
  )
}

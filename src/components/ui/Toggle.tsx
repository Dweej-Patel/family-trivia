import { motion } from 'framer-motion'

interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
}

export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <label className="inline-flex items-center gap-3 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          'relative flex h-8 w-14 items-center rounded-full p-1',
          'outline-none transition-colors duration-200',
          'focus-visible:ring-4 focus-visible:ring-white/40',
          checked ? 'bg-mint justify-end' : 'bg-white/25 justify-start',
        ].join(' ')}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 600, damping: 32 }}
          className="block h-6 w-6 rounded-full bg-white shadow-md"
        />
      </button>
      {label && <span className="font-body font-semibold text-white/90">{label}</span>}
    </label>
  )
}

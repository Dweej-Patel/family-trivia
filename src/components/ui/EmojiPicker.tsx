import { motion } from 'framer-motion'

interface EmojiPickerProps {
  value: string
  onChange: (emoji: string) => void
}

const EMOJIS = [
  '🦄', '🐶', '🐱', '🦊', '🐼', '🐸', '🐵', '🦁',
  '🐯', '🐰', '🐨', '🐷', '🐔', '🦉', '🐙', '🦖',
  '🐬', '🦋', '🌟', '⭐', '🔥', '🚀', '🎈', '🎮',
  '🍕', '🍦', '🦕', '🐢', '🐝', '🦜', '🐧', '🦩',
  '🐳', '🦔', '🐹', '🐻', '🐮', '🦒', '🦓', '🐲',
]

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  return (
    <div className="no-scrollbar max-h-56 overflow-y-auto rounded-2xl bg-white/5 p-2">
      <div className="grid grid-cols-8 gap-2">
        {EMOJIS.map((emoji) => {
          const selected = emoji === value
          return (
            <motion.button
              key={emoji}
              type="button"
              onClick={() => onChange(emoji)}
              whileHover={{ scale: 1.18 }}
              whileTap={{ scale: 0.85 }}
              animate={{ scale: selected ? 1.12 : 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
              className={[
                'flex aspect-square items-center justify-center rounded-xl text-2xl',
                'outline-none transition-colors duration-150',
                selected
                  ? 'bg-white/20 ring-4 ring-sunny shadow-glow'
                  : 'bg-white/5 hover:bg-white/15',
              ].join(' ')}
              aria-label={`Choose ${emoji}`}
              aria-pressed={selected}
            >
              {emoji}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

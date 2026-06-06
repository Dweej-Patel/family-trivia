import { motion } from 'framer-motion'
import { useAudio } from '../../hooks/useAudio'

export function MuteButton() {
  const { muted, toggleMute } = useAudio()

  return (
    <motion.button
      type="button"
      onClick={toggleMute}
      whileHover={{ scale: 1.1, rotate: 6 }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 500, damping: 22 }}
      aria-label={muted ? 'Unmute sound' : 'Mute sound'}
      aria-pressed={muted}
      className={[
        'fixed top-4 right-4 z-50',
        'flex h-12 w-12 items-center justify-center rounded-full text-xl',
        'bg-white/15 backdrop-blur-md border border-white/25 shadow-lg',
        'outline-none focus-visible:ring-4 focus-visible:ring-white/40',
        'hover:bg-white/25 cursor-pointer',
      ].join(' ')}
    >
      {muted ? '🔇' : '🔊'}
    </motion.button>
  )
}

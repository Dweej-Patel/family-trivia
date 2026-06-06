import { motion } from 'framer-motion'
import { useAudio } from '../../hooks/useAudio'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: Variant
  size?: Size
  disabled?: boolean
  type?: 'button' | 'submit'
  className?: string
  fullWidth?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-gradient-to-br from-grape to-bubble text-white shadow-playful hover:shadow-playful',
  secondary:
    'bg-white/90 text-ink shadow-playful hover:bg-white',
  ghost:
    'bg-white/5 text-white border-2 border-white/40 shadow-playful-sm hover:bg-white/10',
  danger:
    'bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-playful',
}

const sizeClasses: Record<Size, string> = {
  sm: 'text-sm px-4 py-2 rounded-xl',
  md: 'text-base px-6 py-3 rounded-2xl',
  lg: 'text-xl px-8 py-4 rounded-2xl',
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  type = 'button',
  className = '',
  fullWidth = false,
}: ButtonProps) {
  const { play } = useAudio()

  const handleClick = () => {
    if (disabled) return
    play('select')
    onClick?.()
  }

  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={handleClick}
      whileHover={disabled ? undefined : { scale: 1.04 }}
      whileTap={disabled ? undefined : { scale: 0.94, y: 4, boxShadow: '0 2px 0 0 rgba(0,0,0,0.15)' }}
      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
      className={[
        'font-display font-bold tracking-wide select-none',
        'inline-flex items-center justify-center gap-2',
        'transition-shadow duration-150 outline-none',
        'focus-visible:ring-4 focus-visible:ring-white/50',
        sizeClasses[size],
        variantClasses[variant],
        fullWidth ? 'w-full' : '',
        disabled ? 'opacity-50 cursor-not-allowed saturate-50' : 'cursor-pointer',
        className,
      ].join(' ')}
    >
      {children}
    </motion.button>
  )
}

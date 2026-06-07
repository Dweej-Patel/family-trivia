import { useEffect, useState } from 'react'

interface ChipNumberInputProps {
  /** True when the committed value came from this input (i.e. isn't a preset),
   *  which lights it up like a selected Chip. */
  active: boolean
  value: number
  min: number
  max: number
  /** Optional unit shown after the number (e.g. "s" for seconds). */
  suffix?: string
  onCommit: (n: number) => void
}

const GRAPE = '#7c3aed'

/** A Chip-styled inline number input that sits alongside preset Chips for
 *  "pick your own" values. Typing is free-form; the number is clamped to
 *  [min, max] and committed on blur or Enter. */
export function ChipNumberInput({
  active,
  value,
  min,
  max,
  suffix,
  onCommit,
}: ChipNumberInputProps) {
  const [draft, setDraft] = useState(active ? String(value) : '')

  // Track the committed value while we own it; show the placeholder otherwise.
  useEffect(() => {
    setDraft(active ? String(value) : '')
  }, [active, value])

  const commit = () => {
    const n = Number.parseInt(draft, 10)
    if (Number.isNaN(n)) {
      setDraft(active ? String(value) : '') // revert gibberish / empty
      return
    }
    const clamped = Math.max(min, Math.min(max, n))
    setDraft(String(clamped))
    if (clamped !== value || !active) onCommit(clamped)
  }

  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full border-2 px-4 py-2',
        'font-body text-sm font-bold transition-colors duration-150',
        active
          ? 'text-white shadow-glow'
          : 'bg-white/10 text-white/90 border-white/25 backdrop-blur-sm focus-within:bg-white/20',
      ].join(' ')}
      style={active ? { backgroundColor: GRAPE, borderColor: GRAPE } : undefined}
    >
      <span aria-hidden>✏️</span>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={draft}
        placeholder="Custom"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        }}
        aria-label={`Custom value between ${min} and ${max}`}
        className={[
          'w-16 bg-transparent text-center outline-none placeholder-white/40',
          // Hide the browser's number spinners — they fight the chip look.
          '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none',
          '[&::-webkit-outer-spin-button]:appearance-none',
        ].join(' ')}
      />
      {suffix && <span>{suffix}</span>}
    </span>
  )
}

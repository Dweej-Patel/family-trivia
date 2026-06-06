// Web Audio API SFX + background music engine. All sounds are synthesized at
// runtime from oscillators + gain envelopes — zero external audio assets, so
// the app stays fully offline.
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { storage } from '../lib/storage'

export type SfxName =
  | 'correct'
  | 'wrong'
  | 'tick'
  | 'whoosh'
  | 'select'
  | 'victory'
  | 'countdown'

interface AudioApi {
  play: (name: SfxName) => void
  muted: boolean
  toggleMute: () => void
  startMusic: () => void
  stopMusic: () => void
}

const AudioContextRef = createContext<AudioApi | null>(null)

// Master gain kept low to avoid clipping when several SFX overlap.
const MASTER_GAIN = 0.5
const MUSIC_GAIN = 0.09

type AnyAudioContext = typeof AudioContext

function getAudioContextCtor(): AnyAudioContext | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    AudioContext?: AnyAudioContext
    webkitAudioContext?: AnyAudioContext
  }
  return w.AudioContext ?? w.webkitAudioContext ?? null
}

/** iOS (incl. iPadOS, which masquerades as Mac) — where the silent switch
 *  mutes Web Audio unless we route through a media element. */
function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const isiDevice = /iPad|iPhone|iPod/.test(ua)
  const isiPadOS = navigator.platform === 'MacIntel' && (navigator.maxTouchPoints ?? 0) > 1
  return isiDevice || isiPadOS
}

// A short silent WAV, created once, used as the looping media-element source.
// Playing an <audio> element promotes iOS Safari's audio session to the media
// channel so Web Audio becomes audible even when the ring/silent switch is on.
let silentLoopUrl: string | null = null
function getSilentLoopUrl(): string | null {
  if (typeof document === 'undefined') return null
  if (silentLoopUrl) return silentLoopUrl
  const sampleRate = 8000
  const numSamples = Math.floor(sampleRate * 0.5) // 0.5s of silence
  const dataSize = numSamples // 8-bit mono => 1 byte/sample
  const buf = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buf)
  const wstr = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i))
  }
  wstr(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true); wstr(8, 'WAVE')
  wstr(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true)
  view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate, true); view.setUint16(32, 1, true)
  view.setUint16(34, 8, true); wstr(36, 'data'); view.setUint32(40, dataSize, true)
  for (let i = 0; i < numSamples; i++) view.setUint8(44 + i, 128) // unsigned 8-bit silence
  silentLoopUrl = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }))
  return silentLoopUrl
}

export function AudioProvider({
  children,
}: {
  children: React.ReactNode
}): JSX.Element {
  const [muted, setMuted] = useState<boolean>(() => storage.loadMuted())
  const mutedRef = useRef<boolean>(muted)
  mutedRef.current = muted

  const ctxRef = useRef<AudioContext | null>(null)
  const masterRef = useRef<GainNode | null>(null)

  // iOS-only: a looping silent media element that lets Web Audio play over the
  // ring/silent switch. `iosUnlocked` makes the gesture handler a cheap no-op
  // after the first successful unlock (avoids per-tap work that caused lag).
  const silentElRef = useRef<HTMLAudioElement | null>(null)
  const audioUnlockedRef = useRef<boolean>(false)

  // Music bookkeeping so we can cleanly stop & avoid double-starts.
  const musicIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const musicGainRef = useRef<GainNode | null>(null)
  const musicStepRef = useRef<number>(0)
  // Whether music *should* be playing. The browser blocks audio until the
  // first user gesture, so we remember intent and actually start on unlock.
  const wantsMusicRef = useRef<boolean>(false)

  // Lazily create / resume the AudioContext on a user gesture.
  const ensureCtx = useCallback((): AudioContext | null => {
    if (!ctxRef.current) {
      const Ctor = getAudioContextCtor()
      if (!Ctor) return null
      const ctx = new Ctor()
      const master = ctx.createGain()
      master.gain.value = MASTER_GAIN
      master.connect(ctx.destination)
      ctxRef.current = ctx
      masterRef.current = master
    }
    const ctx = ctxRef.current
    if (ctx.state === 'suspended') {
      void ctx.resume()
    }
    return ctx
  }, [])

  // ── Low-level helpers ─────────────────────────────────────────────────────

  /** Schedule a single tone with an ADSR-ish envelope. Auto-cleans up. */
  const tone = useCallback(
    (
      ctx: AudioContext,
      dest: AudioNode,
      opts: {
        type: OscillatorType
        freq: number
        endFreq?: number
        start: number
        duration: number
        peak: number
        attack?: number
        release?: number
      }
    ): void => {
      const {
        type,
        freq,
        endFreq,
        start,
        duration,
        peak,
        attack = 0.01,
        release = 0.06,
      } = opts
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = type
      osc.frequency.setValueAtTime(freq, start)
      if (endFreq !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(endFreq, 1),
          start + duration
        )
      }

      const end = start + duration
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(peak, start + attack)
      gain.gain.setValueAtTime(peak, Math.max(start + attack, end - release))
      gain.gain.exponentialRampToValueAtTime(0.0001, end)

      osc.connect(gain)
      gain.connect(dest)
      osc.start(start)
      osc.stop(end + 0.02)
      osc.onended = () => {
        osc.disconnect()
        gain.disconnect()
      }
    },
    []
  )

  /** A short burst of filtered white noise (used by whoosh). Auto-cleans up. */
  const noiseBurst = useCallback(
    (
      ctx: AudioContext,
      dest: AudioNode,
      opts: {
        start: number
        duration: number
        peak: number
        startFreq: number
        endFreq: number
      }
    ): void => {
      const { start, duration, peak, startFreq, endFreq } = opts
      const frames = Math.floor(ctx.sampleRate * duration)
      const buffer = ctx.createBuffer(1, frames, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < frames; i++) {
        data[i] = Math.random() * 2 - 1
      }
      const src = ctx.createBufferSource()
      src.buffer = buffer

      const filter = ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.Q.value = 0.8
      filter.frequency.setValueAtTime(startFreq, start)
      filter.frequency.exponentialRampToValueAtTime(
        Math.max(endFreq, 1),
        start + duration
      )

      const gain = ctx.createGain()
      const end = start + duration
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(peak, start + duration * 0.3)
      gain.gain.exponentialRampToValueAtTime(0.0001, end)

      src.connect(filter)
      filter.connect(gain)
      gain.connect(dest)
      src.start(start)
      src.stop(end + 0.02)
      src.onended = () => {
        src.disconnect()
        filter.disconnect()
        gain.disconnect()
      }
    },
    []
  )

  // ── Public: play an SFX ────────────────────────────────────────────────────
  const play = useCallback(
    (name: SfxName): void => {
      if (mutedRef.current) return
      const ctx = ensureCtx()
      if (!ctx) return
      const dest = masterRef.current
      if (!dest) return
      const t = ctx.currentTime

      switch (name) {
        case 'select': {
          // Short soft blip.
          tone(ctx, dest, {
            type: 'triangle',
            freq: 660,
            start: t,
            duration: 0.08,
            peak: 0.18,
            attack: 0.005,
            release: 0.03,
          })
          break
        }
        case 'correct': {
          // Happy rising arpeggio: C5 E5 G5 C6.
          const notes = [523.25, 659.25, 783.99, 1046.5]
          notes.forEach((f, i) => {
            tone(ctx, dest, {
              type: 'sine',
              freq: f,
              start: t + i * 0.09,
              duration: 0.16,
              peak: 0.22,
              attack: 0.008,
              release: 0.06,
            })
            tone(ctx, dest, {
              type: 'triangle',
              freq: f * 2,
              start: t + i * 0.09,
              duration: 0.16,
              peak: 0.07,
              attack: 0.008,
              release: 0.06,
            })
          })
          break
        }
        case 'wrong': {
          // Descending buzzy "bzzt".
          tone(ctx, dest, {
            type: 'sawtooth',
            freq: 200,
            endFreq: 80,
            start: t,
            duration: 0.35,
            peak: 0.2,
            attack: 0.005,
            release: 0.1,
          })
          tone(ctx, dest, {
            type: 'square',
            freq: 150,
            endFreq: 60,
            start: t,
            duration: 0.35,
            peak: 0.08,
            attack: 0.005,
            release: 0.1,
          })
          break
        }
        case 'tick': {
          // Very short click.
          tone(ctx, dest, {
            type: 'square',
            freq: 880,
            start: t,
            duration: 0.04,
            peak: 0.14,
            attack: 0.002,
            release: 0.02,
          })
          break
        }
        case 'countdown': {
          // Tense higher tick for final seconds.
          tone(ctx, dest, {
            type: 'square',
            freq: 1320,
            start: t,
            duration: 0.05,
            peak: 0.18,
            attack: 0.002,
            release: 0.025,
          })
          break
        }
        case 'whoosh': {
          // Swept filtered noise for transitions.
          noiseBurst(ctx, dest, {
            start: t,
            duration: 0.25,
            peak: 0.18,
            startFreq: 300,
            endFreq: 2400,
          })
          tone(ctx, dest, {
            type: 'sine',
            freq: 220,
            endFreq: 880,
            start: t,
            duration: 0.25,
            peak: 0.08,
            attack: 0.02,
            release: 0.08,
          })
          break
        }
        case 'victory': {
          // Triumphant fanfare: C E G C, then a held C+E+G chord.
          const melody = [523.25, 659.25, 783.99, 1046.5]
          melody.forEach((f, i) => {
            tone(ctx, dest, {
              type: 'triangle',
              freq: f,
              start: t + i * 0.13,
              duration: 0.18,
              peak: 0.22,
              attack: 0.01,
              release: 0.06,
            })
          })
          const chordStart = t + melody.length * 0.13
          ;[523.25, 659.25, 783.99, 1046.5].forEach((f) => {
            tone(ctx, dest, {
              type: 'sine',
              freq: f,
              start: chordStart,
              duration: 0.6,
              peak: 0.16,
              attack: 0.02,
              release: 0.3,
            })
          })
          break
        }
        default: {
          // Exhaustiveness guard.
          const _never: never = name
          return _never
        }
      }
    },
    [ensureCtx, tone, noiseBurst]
  )

  // ── Public: background music ───────────────────────────────────────────────
  const stopMusic = useCallback((): void => {
    wantsMusicRef.current = false
    if (musicIntervalRef.current !== null) {
      clearInterval(musicIntervalRef.current)
      musicIntervalRef.current = null
    }
    const ctx = ctxRef.current
    const mg = musicGainRef.current
    if (ctx && mg) {
      const now = ctx.currentTime
      mg.gain.cancelScheduledValues(now)
      mg.gain.setValueAtTime(mg.gain.value, now)
      mg.gain.exponentialRampToValueAtTime(0.0001, now + 0.3)
      const toDisconnect = mg
      window.setTimeout(() => {
        toDisconnect.disconnect()
      }, 400)
    }
    musicGainRef.current = null
    musicStepRef.current = 0
  }, [])

  // Actually build the music graph + scheduler. Only succeeds once the
  // AudioContext is *running* (i.e. after a user gesture has unlocked audio).
  const tryStartMusic = useCallback((): void => {
    if (mutedRef.current || !wantsMusicRef.current) return
    if (musicIntervalRef.current !== null) return // already playing
    const ctx = ensureCtx()
    if (!ctx || ctx.state !== 'running') return // wait for unlock/resume
    const master = masterRef.current
    if (!master) return

    const musicGain = ctx.createGain()
    musicGain.gain.value = MUSIC_GAIN
    musicGain.connect(master)
    musicGainRef.current = musicGain
    musicStepRef.current = 0

    // An 8-bar progression in two phrases so the loop is less obvious.
    // Each bar carries a bass root + a sustained chord (pad).
    const progression: Array<{ bass: number; chord: number[] }> = [
      // Phrase A: C – Am – F – G
      { bass: 65.41, chord: [261.63, 329.63, 392.0] }, // C  : C4 E4 G4
      { bass: 110.0, chord: [220.0, 261.63, 329.63] }, // Am : A3 C4 E4
      { bass: 87.31, chord: [174.61, 220.0, 261.63] }, // F  : F3 A3 C4
      { bass: 98.0, chord: [196.0, 246.94, 293.66] }, // G  : G3 B3 D4
      // Phrase B: C – Em – Dm – G
      { bass: 65.41, chord: [261.63, 329.63, 392.0] }, // C  : C4 E4 G4
      { bass: 82.41, chord: [164.81, 196.0, 246.94] }, // Em : E3 G3 B3
      { bass: 73.42, chord: [146.83, 174.61, 220.0] }, // Dm : D3 F3 A3
      { bass: 98.0, chord: [196.0, 246.94, 293.66] }, // G  : G3 B3 D4
    ]
    // C-major pentatonic — always consonant over the chords above. The melody
    // picks from these with rests + jitter so each bar sounds a little different.
    const LEAD = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5]
    const stepMs = 2000 // one bar
    const barLen = 1.9
    const rand = () => Math.random()

    const playStep = (): void => {
      const mg = musicGainRef.current
      if (!mg) return
      // Guard the whole bar: a single scheduling hiccup must never tear down
      // the interval and silence the music.
      try {
      const bar = progression[musicStepRef.current % progression.length]
      const t = ctx.currentTime

      // ── Bass: warm root with a gentle mid-bar pulse for movement ──
      tone(ctx, mg, {
        type: 'triangle',
        freq: bar.bass,
        start: t,
        duration: barLen,
        peak: 0.5,
        attack: 0.04,
        release: 0.4,
      })
      tone(ctx, mg, {
        type: 'triangle',
        freq: bar.bass,
        start: t + 1.0,
        duration: 0.85,
        peak: 0.36,
        attack: 0.04,
        release: 0.3,
      })

      // ── Pad: sustained chord, soft sines fanned in slightly ──
      bar.chord.forEach((f, i) => {
        tone(ctx, mg, {
          type: 'sine',
          freq: f,
          start: t + i * 0.04,
          duration: barLen,
          peak: 0.2,
          attack: 0.3,
          release: 0.6,
        })
      })

      // ── Melody: four eighth-note slots, some left as rests, notes vary ──
      for (let s = 0; s < 4; s++) {
        if (rand() < 0.4) continue // rest — keeps it from feeling busy/looped
        const note = LEAD[Math.floor(rand() * LEAD.length)]
        const jitter = (rand() - 0.5) * 0.05 // subtle human timing
        // Clamp so timing jitter can never push the start before `t` (which
        // would be a negative AudioParam time right after the context resumes).
        const noteStart = Math.max(t, t + s * 0.5 + jitter)
        tone(ctx, mg, {
          type: 'triangle',
          freq: note,
          start: noteStart,
          duration: 0.42,
          peak: 0.16,
          attack: 0.01,
          release: 0.12,
        })
      }

      // ── Sparkle: occasional high shimmer for color ──
      if (rand() < 0.45) {
        const sparkle = LEAD[Math.floor(rand() * LEAD.length)] * 2
        tone(ctx, mg, {
          type: 'sine',
          freq: sparkle,
          start: t + 1.5,
          duration: 0.3,
          peak: 0.07,
          attack: 0.005,
          release: 0.15,
        })
      }

      musicStepRef.current += 1
      } catch {
        // Skip this bar; the next interval tick will try again.
        musicStepRef.current += 1
      }
    }

    playStep()
    musicIntervalRef.current = setInterval(playStep, stepMs)
  }, [ensureCtx, tone])

  const startMusic = useCallback((): void => {
    // Record intent, then try immediately. If audio is still locked (no user
    // gesture yet) the gesture-unlock listener below will start it later.
    wantsMusicRef.current = true
    if (mutedRef.current) {
      stopMusic()
      return
    }
    tryStartMusic()
  }, [stopMusic, tryStartMusic])

  // iOS: start the looping silent media element (lazily). Once it's playing,
  // iOS routes Web Audio through the media channel, so sound plays even with
  // the ring/silent switch on. No-op off iOS or while muted.
  const playSilentLoop = useCallback((): void => {
    if (!isIOS() || mutedRef.current) return
    try {
      if (!silentElRef.current) {
        const url = getSilentLoopUrl()
        if (!url) return
        const el = new Audio(url)
        el.loop = true
        el.preload = 'auto'
        el.setAttribute('playsinline', '')
        ;(el as unknown as { playsInline: boolean }).playsInline = true
        silentElRef.current = el
      }
      void silentElRef.current.play().catch(() => {})
    } catch {
      /* ignore — best-effort */
    }
  }, [])

  const pauseSilentLoop = useCallback((): void => {
    try {
      silentElRef.current?.pause()
    } catch {
      /* ignore */
    }
  }, [])

  // Unlock audio on the first user gesture. Desktop browsers just need the
  // AudioContext resumed; iOS Safari additionally needs a silent buffer played
  // *inside* the gesture, plus the silent media loop to beat the silent switch.
  // It also re-suspends the context when the tab/phone is backgrounded. After
  // the first successful unlock the handler short-circuits (so it's not doing
  // work on every tap — that was a source of mobile lag).
  useEffect(() => {
    const unlock = (): void => {
      if (audioUnlockedRef.current) return // already unlocked — cheap no-op
      const ctx = ensureCtx()
      if (!ctx) return
      // iOS: play a 1-sample silent buffer within the gesture to prime output.
      try {
        const buf = ctx.createBuffer(1, 1, 22050)
        const src = ctx.createBufferSource()
        src.buffer = buf
        src.connect(ctx.destination)
        src.start(0)
      } catch {
        /* ignore — best-effort prime */
      }
      playSilentLoop()
      void ctx.resume().then(() => {
        audioUnlockedRef.current = true
        tryStartMusic()
      })
    }
    // Re-resume when we come back to the foreground (iOS suspends on lock/switch).
    const onVisible = (): void => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return
      }
      const ctx = ctxRef.current
      if (ctx && ctx.state !== 'running') {
        void ctx.resume().then(() => tryStartMusic())
      }
      playSilentLoop()
    }
    const opts: AddEventListenerOptions = { passive: true }
    window.addEventListener('pointerdown', unlock, opts)
    window.addEventListener('touchend', unlock, opts)
    window.addEventListener('keydown', unlock)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pageshow', onVisible)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('touchend', unlock)
      window.removeEventListener('keydown', unlock)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pageshow', onVisible)
    }
  }, [ensureCtx, tryStartMusic, playSilentLoop])

  // ── Public: mute toggle ────────────────────────────────────────────────────
  const toggleMute = useCallback((): void => {
    setMuted((prev) => {
      const next = !prev
      storage.saveMuted(next)
      mutedRef.current = next
      if (next) {
        // Going muted: kill music and release the iOS media session so other
        // apps' audio can resume (but remember music was wanted).
        const wanted = wantsMusicRef.current
        stopMusic()
        pauseSilentLoop()
        wantsMusicRef.current = wanted
      } else {
        // Unmuting on a gesture: resume the context, retake the iOS media
        // session, and bring music back.
        ensureCtx()
        playSilentLoop()
        tryStartMusic()
      }
      return next
    })
  }, [ensureCtx, stopMusic, tryStartMusic, playSilentLoop, pauseSilentLoop])

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      stopMusic()
      const el = silentElRef.current
      if (el) {
        try {
          el.pause()
          el.src = ''
        } catch {
          /* ignore */
        }
        silentElRef.current = null
      }
      const ctx = ctxRef.current
      if (ctx) {
        void ctx.close()
        ctxRef.current = null
        masterRef.current = null
      }
    }
  }, [stopMusic])

  const api: AudioApi = {
    play,
    muted,
    toggleMute,
    startMusic,
    stopMusic,
  }

  return (
    <AudioContextRef.Provider value={api}>{children}</AudioContextRef.Provider>
  )
}

export function useAudio(): AudioApi {
  const ctx = useContext(AudioContextRef)
  if (!ctx) {
    throw new Error('useAudio must be used within an <AudioProvider>')
  }
  return ctx
}

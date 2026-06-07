import { create } from 'zustand'
import type { Question } from '../types'
import type { Pacing } from './types'

// Lightweight session state for the multiplayer flow (not persisted).
interface MpState {
  // ── Host session (set in host setup, read by the host screen) ──
  hostDeck: Question[]
  hostPacing: Pacing
  hostTimerSeconds: number
  setHostSession: (deck: Question[], pacing: Pacing, timerSeconds: number) => void

  // ── Player session (set after joining, read by the player screen) ──
  code: string | null
  uid: string | null
  setPlayerSession: (code: string, uid: string) => void

  // Prefill for the join screen (e.g. from a ?room=CODE deep link / QR scan).
  joinCodePrefill: string
  setJoinCodePrefill: (code: string) => void

  reset: () => void
}

export const useMpStore = create<MpState>((set) => ({
  hostDeck: [],
  hostPacing: 'timed',
  hostTimerSeconds: 20,
  setHostSession: (hostDeck, hostPacing, hostTimerSeconds) =>
    set({ hostDeck, hostPacing, hostTimerSeconds }),

  code: null,
  uid: null,
  setPlayerSession: (code, uid) => set({ code, uid }),

  joinCodePrefill: '',
  setJoinCodePrefill: (joinCodePrefill) => set({ joinCodePrefill }),

  reset: () => set({ hostDeck: [], code: null, uid: null }),
}))

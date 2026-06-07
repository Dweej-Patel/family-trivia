import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { getDatabase, goOnline, goOffline } from 'firebase/database'

// Public Firebase web config — safe to ship in client code; security is
// enforced by Auth (anonymous) + Realtime Database rules, not by hiding these.
export const firebaseConfig = {
  apiKey: 'AIzaSyCRdFJQZmu2pKoalRqumdfpNzh42i8IMto',
  authDomain: 'family-trivia-1c916.firebaseapp.com',
  databaseURL: 'https://family-trivia-1c916-default-rtdb.firebaseio.com',
  projectId: 'family-trivia-1c916',
  storageBucket: 'family-trivia-1c916.firebasestorage.app',
  messagingSenderId: '818741600115',
  appId: '1:818741600115:web:3390a3a6464968f8646f06',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getDatabase(app)

// Sign each device in anonymously (invisible to the user) so the database rules
// can require auth. Memoized so concurrent callers share one sign-in.
let signInPromise: Promise<string> | null = null
export function ensureSignedIn(): Promise<string> {
  if (auth.currentUser) return Promise.resolve(auth.currentUser.uid)
  if (!signInPromise) {
    signInPromise = signInAnonymously(auth).then((cred) => cred.user.uid)
  }
  return signInPromise
}

// Open / close the Realtime Database WebSocket explicitly. We close it whenever
// a user leaves multiplayer (so they stop counting against the concurrent-
// connection limit even with the tab still open) and reopen it on host/join.
export function connectDb(): void {
  goOnline(db)
}
export function disconnectDb(): void {
  goOffline(db)
}

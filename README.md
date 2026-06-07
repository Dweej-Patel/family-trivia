# 🧠 Family Trivia 🎉

A vibrant, animated **family trivia game** with two ways to play: pass-and-play on
one shared screen, **or** Kahoot-style multiplayer where everyone joins a room from
their phone. Big tactile buttons, spring animations, sound effects, confetti, and a
winner's podium.

**▶ Play it live:** https://dweej-patel.github.io/family-trivia/

![Home](docs/home.png?v=2)

## ✨ Features

- **Two modes:**
  - 🛋️ **One device** — pass-and-play on a shared screen (laptop, tablet, or TV), 1–8 players.
  - 📱 **Everyone's phones** — the host shows a room code + QR; players join from their
    phones and answer live, with a host-driven leaderboard and podium.
- **~970 questions across 13 categories**, all fact-checked and calibrated easy / medium
  / hard — plus **importable question packs** (e.g. an India Heritage pack) and a built-in
  pack picker.
- **Your own questions** — a full editor to add / edit / delete across custom categories,
  with search, filters, pagination, and **JSON import / export**.
- **Multiple-choice & true/false**, with a speed bonus for quick correct answers.
- **Playful visuals** — animated gradient background, springy motion, per-player avatars
  & colors, confetti.
- **Full audio** — synthesized sound effects + gentle background music, one-tap **mute**.
  No audio files needed.
- **Free & static-hostable.** Single-player works fully offline; multiplayer uses a free
  Firebase Realtime Database (anonymous, no logins for players).

## 🚀 Getting started

```bash
npm install
npm run dev      # http://localhost:5173
```

Production build:

```bash
npm run build    # outputs static files to dist/
npm run preview  # preview the production build
npm run typecheck
```

Deploy the `dist/` folder to any static host (Netlify, Vercel, GitHub Pages).

## 🎮 How to play

1. **Play** → add players (name + emoji + color).
2. **Game Setup** → pick categories, difficulty, question count, and timer.
3. Take turns: the active player reads the question, taps an answer, and hits **Lock In**.
4. Correct answers score points (with confetti!). Pass the device to the next player.
5. See standings at halftime, then crown the winner on the podium.

Manage your question bank anytime from **Manage Questions** on the home screen.

## 🛠 Tech stack

- **Vite + React 18 + TypeScript**
- **Tailwind CSS** (custom playful theme)
- **Framer Motion** (springs, layout, page transitions)
- **Zustand** (state) · **canvas-confetti** (celebrations)
- **Web Audio API** for runtime-synthesized sound (zero audio assets)

## 📁 Project structure

```
src/
  store/gameStore.ts      # Zustand store: flow, players, questions, scoring
  data/starterQuestions.ts# built-in question pack
  hooks/                  # useAudio (synth engine), useCountdown
  lib/                    # storage (localStorage), shuffle
  components/
    ui/                   # Button, Card, Chip, Toggle, EmojiPicker, background, confetti
    game/                 # QuestionCard parts, CountdownRing, ScoreHUD, Leaderboard, Podium
    screens/              # Home, Setup, Config, Play, RoundScore, Results, Library
```

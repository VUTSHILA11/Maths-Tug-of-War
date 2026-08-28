# 🪢 Math Tug-of-War

Immersive Interactive Competitive Mathematics Learning Platform for South African primary school classrooms (Grades 4–9).

## Getting Started

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a new project
2. Enable **Authentication** → Email/Password (for teachers)
3. Enable **Firestore Database** (for analytics & session metadata)
4. Enable **Realtime Database** (for live game sync)
5. Register a **Web App** in Project Settings → General

### 2. Configure Firebase

Copy `.env.example` to `.env` and fill in your Firebase config values:

```bash
cp .env.example .env
```

Then update `src/firebase/config.js` with your values (or use the env vars — see config.js).

### 3. Install & Run

```bash
npm install
npm run dev
```

---

## How It Works

| Role | Screen | What they do |
|------|--------|--------------|
| Teacher | `/` → Login | Authenticate with Firebase Auth |
| Teacher | `/dashboard` | Create session, get 6-char code |
| Teacher | `/lobby` | Wait for students, start game |
| Teacher | `/game` | Monitor, reveal answers, advance questions |
| Student | `/` → Join | Enter name, session code, pick team |
| Student | `/lobby` | Wait in team view |
| Student | `/game` | Answer questions, see rope move in real time |
| Both | `/results` | Winner announcement, player stats |
| Teacher | `/analytics` | Charts, accuracy, struggling learner alerts |

---

## Project Structure

```
src/
├── firebase/
│   └── config.js          ← Firebase initialization
├── context/
│   ├── AuthContext.jsx     ← Teacher authentication
│   └── GameContext.jsx     ← Live session state (RTDB)
├── utils/
│   ├── questions.js        ← Grade 4–7 question generator
│   ├── mistakeHistory.js   ← Player-specific incorrect answer history
│   └── sessionHelpers.js   ← Create/join session helpers
├── components/
│   ├── ProtectedRoute.jsx  ← Auth guard
│   ├── TugOfWarRope.jsx    ← Animated rope component
│   ├── CountdownTimer.jsx  ← Circular SVG timer
│   ├── FeedbackOverlay.jsx ← Correct/incorrect animations
│   └── Leaderboard.jsx     ← Live scores, compact + full
└── pages/
    ├── Landing.jsx         ← Student join + Teacher login
    ├── TeacherDashboard.jsx
    ├── Lobby.jsx
    ├── GameScreen.jsx      ← Core game
    ├── Results.jsx         ← End screen
    ├── Analytics.jsx       ← Chart.js analytics
    └── Mistakes.jsx        ← Learner incorrect-question review
```

---

## Tech Stack

- **React** (Vite)
- **Firebase** Auth + Firestore + Realtime Database
- **Framer Motion** — animations
- **Chart.js / react-chartjs-2** — analytics charts
- **React Router v6** — navigation

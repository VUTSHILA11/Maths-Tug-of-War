# 🪢 Math Tug-of-War
 
Immersive Interactive Competitive Mathematics Learning Platform for South African classrooms (Grades 4–9).
 
## Getting Started
 
### 1. Firebase Setup
 
1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. Enable **Authentication → Email/Password** for teachers.
3. Enable **Firestore Database** for analytics and session metadata.
4. Enable **Realtime Database** for live game synchronisation.
5. Register a **Web App** under Project Settings → General.
 
### 2. Configure Firebase
 
Copy `.env.example` to `.env` and fill in your Firebase configuration values:
 
```bash
cp .env.example .env
```
 
Then update `src/firebase/config.js` with your values, or use the environment variables as described in `config.js`.
 
### 3. Install & Run
 
```bash
npm install
npm run dev
```
 
---
 
## How It Works
 
| Role    | Screen                      | What they do                                                                                                                          |
| ------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Teacher | `/` → Login                 | Authenticate with Firebase Authentication.                                                                                            |
| Teacher | `/dashboard`                | Create a game session and receive a six-character session code.                                                                       |
| Teacher | `/lobby`                    | Wait for students to join and start the game.                                                                                         |
| Teacher | `/game`                     | Monitor gameplay, reveal answers, and advance questions.                                                                              |
| Student | `/` → Join                  | Enter their name, session code, and select a team.                                                                                    |
| Student | `/lobby`                    | Wait for the game to begin in their team lobby.                                                                                       |
| Student | `/game`                     | Answer mathematics questions and see the rope move in real time.                                                                      |
| Both    | `/results`                  | View the winner announcement and player statistics.                                                                                   |
| Teacher | `/analytics`                | Review performance charts, accuracy, and learners who may need additional support.                                                    |
| Student | `/analytics` or `/mistakes` | Review performance and identify incorrect answers and mathematics topics that need more practice, where supported by the application. |
 
---
 
## Question Modes and Learning Support
 
* **Grade Range:** Mathematics learning activities are intended for learners in Grades 4–9.
* **Question Modes:** Learners can select from Practice, Test, and Exam-style question modes, where implemented in the application.
* **Interactive Gameplay:** Teams compete by answering mathematics questions, with scores and rope movement updated in real time.
* **Mistake History:** Incorrect answers can be recorded for individual learners to support review and revision.
* **Performance Analytics:** Analytics help learners and teachers identify incorrect answers, review performance, and recognise areas where additional practice may be needed.
 
The aim is to combine competitive, team-based gameplay with meaningful feedback so that learners can improve their mathematics skills while remaining engaged.
 
---
 
## Project Structure
 
```text
src/
├── firebase/
│   └── config.js           ← Firebase initialization
├── context/
│   ├── AuthContext.jsx     ← Teacher authentication
│   └── GameContext.jsx     ← Live session state (RTDB)
├── utils/
│   ├── questions.js        ← Mathematics question generation
│   │                         for Grades 4–9, subject to implementation
│   ├── mistakeHistory.js   ← Player-specific incorrect-answer history
│   └── sessionHelpers.js   ← Create/join session helpers
├── components/
│   ├── ProtectedRoute.jsx  ← Authentication guard
│   ├── TugOfWarRope.jsx    ← Animated rope component
│   ├── CountdownTimer.jsx  ← Circular SVG timer
│   ├── FeedbackOverlay.jsx ← Correct/incorrect answer animations
│   └── Leaderboard.jsx     ← Live scores, compact and full views
└── pages/
    ├── Landing.jsx         ← Student join and teacher login
    ├── TeacherDashboard.jsx
    ├── Lobby.jsx
    ├── GameScreen.jsx     ← Core game
    ├── Results.jsx        ← End screen
    ├── Analytics.jsx      ← Chart.js performance analytics
    └── Mistakes.jsx       ← Learner incorrect-question review
```
 
---
 
## Tech Stack
 
* **React (Vite)** — Frontend application and development environment.
* **Firebase Authentication** — Teacher authentication.
* **Cloud Firestore** — Analytics and session metadata.
* **Firebase Realtime Database** — Live game synchronisation.
* **Framer Motion** — Animations and interactive visual effects.
* **Chart.js / react-chartjs-2** — Analytics charts and performance visualisation.
* **React Router v6** — Application navigation.
 
---
 
## Project Goal
 
Math Tug-of-War aims to make mathematics learning more engaging through interactive, team-based competition. It combines real-time gameplay with performance feedback to help teachers monitor learner progress and help learners identify areas for improvement.
 
The platform is intended to support mathematics learning in South African classrooms across Grades 4–9 while encouraging participation, collaboration, and continuous improvement.
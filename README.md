# AI Resume Builder — Fixed Edition

Fixed version of the React + Express resume builder. All bugs patched, features added.

## What was fixed
- Removed better-sqlite3 (needed Python to compile) — replaced with pure JSON file database
- Removed node-fetch v2 — now uses native fetch (built into Node 18+)
- Fixed Gemini model name (gemini-2.5-flash, free tier July 2026)
- Settings page — profile editing, password change, delete account now all fully work
- Register page — password strength meter with live rules checking
- Login page — show/hide password toggle
- Added file upload endpoint (PDF, DOCX, TXT)
- Added dark mode CSS

## Requirements
- Node.js v18 or higher (download at https://nodejs.org — choose LTS)

## Run the backend

```
cd backend
npm install
copy .env.example .env    (Windows)
cp .env.example .env      (Mac/Linux)
```

Open .env and set:
  JWT_SECRET=any-long-random-string
  GEMINI_API_KEY=your-key-from-aistudio.google.com  (optional but recommended)

Then:
  npm start

Backend runs at http://localhost:5000

## Run the frontend (separate terminal)

```
cd frontend
npm install
npm start
```

Frontend opens at http://localhost:3000

Both must be running at the same time for the app to work.

## How to stop
Press Ctrl+C in each terminal window.

## Notes
- Database file is created automatically at backend/database/db.json
- Get a free Gemini key at https://aistudio.google.com/apikey
- If no Gemini key is set, all AI features fall back to local rule-based logic (still works, no API needed)

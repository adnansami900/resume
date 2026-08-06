# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

ResumeAI v2 — an AI-assisted resume builder / career platform. React 18 (CRA) frontend + Express (CommonJS) backend, backed by a single JSON file acting as the database (no SQL, no ORM). AI features (summary rewriting, bullet rewriting, tailoring, resume parsing) call Gemini when a key is configured and fall back to deterministic local-rules logic otherwise — every AI-touched endpoint works with zero API keys.

## Commands

Backend (from `backend/`):
```
npm install
cp .env.example .env   # then set JWT_SECRET (16+ random chars); GEMINI_API_KEY optional
npm start               # node server.js, port 5000
npm run dev              # nodemon
```

Frontend (from `frontend/`):
```
npm install
npm start                # CRA dev server, port 3000
npm run build
```

Both must run simultaneously for the app to work. There is no test suite and no lint script configured in either `package.json` — do not assume `npm test` or `npm run lint` do anything meaningful.

The backend refuses to boot if `.env` is missing/invalid (`config/env.js` calls `process.exit(1)` with an actionable message) — check that first if the server won't start. `JWT_SECRET` is required and must not be the `.env.example` placeholder or under 16 chars.

## Architecture

```
backend/
  config/db.js       Single JSON file store (backend/database/db.json), exports flat CRUD functions
  config/env.js       Boot-time env validation, called before anything else in server.js
  middleware/auth.js       JWT verify → req.userId
  middleware/rateLimit.js  Per-route express-rate-limit instances
  routes/             One router per domain, mounted under /api/* in server.js
  utils/              Pure logic modules — no Express dependency, so they're reusable/testable
  server.js           Entry point; owns the generic /api/upload endpoint and the global error handler
frontend/src/
  context/AuthContext.jsx  Global user state; token/user cached in localStorage
  services/api.js          The one axios instance — JWT interceptor, 401 → auto-logout
  components/               Layout, Sidebar, shared UI primitives (Card, Alert, Spinner, ScoreRing, etc.)
  pages/                     One component per route, wired up in App.jsx
```

### Conventions every feature follows (violating these breaks the established pattern)

| Convention | Rule |
|---|---|
| Auth | `router.use(requireAuth)` at the top of the route file; every query scoped by `req.userId` |
| Data access | Never touch `db.json` directly — add a function to `config/db.js` |
| Business logic | Pure functions in `utils/`, no `req`/`res` params |
| Frontend data | Always through `services/api.js`, never a raw `fetch` |
| Page shell | Every page returns `<Layout title subtitle actions>` |

### The JSON database (`backend/config/db.js`)

- Loaded **once** into an in-memory `data` object at startup (`loadFromDisk()`). Every exported function mutates that object directly, then calls `save()`. Because Node is single-threaded and these functions contain no `await`, each call is effectively atomic — this is what eliminates the lost-update race that existed in the original version.
- `save()` writes to `db.json.tmp` then `fs.renameSync`s over `db.json` — atomic on the same filesystem, so a crash mid-write can't corrupt the file.
- Reads return **deep copies** (`clone()`), so callers can't mutate stored records by accident.
- A corrupt `db.json` on boot gets backed up to `db.json.corrupt-<timestamp>` rather than silently discarded.
- If you add a new collection, add it to `EMPTY_DB()` too, or old `db.json` files loaded via the `{...EMPTY_DB(), ...parsed}` spread won't get it.

### AI credit accounting (`backend/routes/ai.js`)

All three AI routes go through `withCredit(req, res, work)`:
1. **Reserve** the credit (`db.useQuota`) *before* calling the AI. Reserving first (not deducting on success) is deliberate — it's what prevents two simultaneous requests from both reading "1 credit left" and both succeeding.
2. Run `work()`.
3. On any throw, **refund** (`db.refundQuota`) and return 502 — a failed AI call never costs the user a credit.

Any new AI-costing endpoint should reuse `withCredit`, not reimplement quota logic.

### Truth-constrained AI output (`backend/utils/truthCheck.js`)

Every AI-generated (or local-fallback) text passes through `checkTextAgainstTruth()` before being returned to the client. It builds a "ground truth" word/number set from the user's *original* resume data and flags AI output that introduces numbers or skill-like terms not present in the original — reverting to the original text if `!isSafe`. This is a heuristic safety net, not a real fact-checker, and that limitation is documented inline. Any new AI feature that rewrites user content should route through this.

### Two-tier AI pattern (Gemini + local fallback)

Used identically in `utils/aiService.js` (summary/bullet/tailor) and `utils/resumeParser.js` (resume import): if `GEMINI_API_KEY` is set, try Gemini first (native `fetch`, no SDK); on missing key or any Gemini failure, fall through to a deterministic local-rules implementation. Every result carries `source: 'gemini' | 'local_rules'` so the frontend can be honest about which engine produced it. New AI features should follow this same shape rather than making Gemini a hard dependency.

### File upload validation (`backend/utils/fileValidation.js`, `utils/extractText.js`)

Uploaded files (PDF/DOCX/TXT, 5MB max) must agree on three independent signals before being parsed: file extension, reported MIME type, and magic bytes (`%PDF`, ZIP header `PK\x03\x04`, or "no NUL bytes" for txt). `extractText()` wraps this plus `mammoth`/`pdf-parse` extraction and is shared by the generic `/api/upload` endpoint and `/api/resumes/import` — don't duplicate extraction logic elsewhere.

### ATS scoring (`backend/utils/atsScoring.js`)

Pure, offline, no AI required — `scoreResumeAgainstJob(resume, jobDescription)` is the reusable core: keyword extraction/matching, a weighted 0–100 score (keyword 30%, skills 20%, sections 15%, contact 10%, action verbs 10%, achievements 10%, formatting 5%), all sub-scores and the total run through `clampScore()`. This function is also the basis `aiService.js` uses for its local (non-Gemini) summary/tailoring fallbacks — reuse it rather than re-deriving keyword matching elsewhere.

### Route ordering gotcha

In `routes/resume.js`, `POST /import` is declared *before* `GET /:id` — Express matches top-down, so if `/import` were declared after, it'd be swallowed by the `:id` param route.

### Frontend auth flow

`AuthContext` holds `user`/`loading` state; JWT and user JSON live in `localStorage`. On mount it calls `GET /auth/me` if a token exists to hydrate `user`. `services/api.js`'s response interceptor auto-clears storage and hard-redirects to `/login` on any 401 — so a route handler doesn't need to special-case expired tokens itself.

## Current state vs. planned work

Only "Step 1 — Critical Fixes" from `IMPLEMENTATION_PLAN.md` is done (see `STEP1_CHANGES.md` for the diffs and rationale, `UPLOAD_FEATURE.md` for the resume-import feature). `IMPLEMENTATION_PLAN.md` lays out the architecture for everything not yet built: resume templates, job search portal, application tracker upgrade (5→8 statuses), ATS insights + interview questions, job recommendations, analytics dashboard, and an AI career coach. Read it before starting any of those — it specifies exact new files, the provider-interface pattern for job search, and the data-migration approach for the status pipeline change.

Known, deliberately-undone items (see `IMPLEMENTATION_PLAN.md` §11): JWT lives in `localStorage` (XSS-readable — tradeoff documented, not accidental); single JSON file means no multi-process scaling; no email verification/password reset; no automated tests; no pagination on resume/application lists.

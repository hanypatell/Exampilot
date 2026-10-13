# ✈️ ExamPilot — your AI exam co-pilot

Plan smarter. Get unstuck faster. Walk into exams ready.

ExamPilot is a full-stack web app for students:

| Feature | What it does |
|---|---|
| **Syllabus → Study plan** | Upload a syllabus (and past papers). AI extracts topics, ranks them by exam importance (1–5★) and builds a day-by-day plan until the exam. |
| **DoubtSnap** | Photo of any question → step-by-step solution, key concept, common mistake and 3 similar practice questions. |
| **Chat with notes** | Ask questions about your uploaded PDFs. Answers cite the document and page number. |
| **Quizzes & flashcards** | One click creates 5 exam-style MCQs + 6 flashcards for any topic. |
| **Adaptive plan** | Doubts and low quiz scores lower a topic's mastery → the plan gives it more time. Missed days get re-planned. |
| **Dashboard** | Readiness score per subject, weak topics, today's sessions, study streak. |

## Tech stack

- **Next.js 16** (React, TypeScript) — frontend + backend API routes in one project
- **Tailwind CSS** — styling
- **Supabase** — PostgreSQL database, login (auth) and row-level security
- **Claude API** (or Gemini) — vision, structured JSON outputs
- **Vercel** — hosting

```
Browser (Next.js pages)
      │
Next.js API routes / Server Actions ──► AI (Claude or Gemini)
      │
Supabase (Postgres · Auth · full-text search)
```

### How the smart parts work
- **Planner** (`src/lib/planner.ts`): each topic gets a priority = importance × (1 + (100 − mastery)/50) + 2 × doubts. Days are split into 45-min slots: first a *learn* session for every topic, then *practice/revise* sessions by priority (halving a topic's priority each time it's picked), and a mock-test day before the exam.
- **Readiness** = mastery averaged over topics, weighted by importance.
- **Chat with notes** is retrieval-augmented generation (RAG): PDFs are split into pages, stored in Postgres with a full-text index, the best-matching pages are retrieved and given to the AI, which must cite them.

## Run it locally

1. Install [Node.js](https://nodejs.org) 20+.
2. Create a free project at [supabase.com](https://supabase.com).
   - **SQL Editor** → paste all of `supabase/schema.sql` → **Run**.
   - **Authentication → Sign In / Providers → Email** → turn **off** "Confirm email" (easier for demos).
3. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Supabase → Project Settings → API Keys)
   - `ANTHROPIC_API_KEY` from [console.anthropic.com](https://console.anthropic.com) **or** `GEMINI_API_KEY` from [aistudio.google.com](https://aistudio.google.com) with `AI_PROVIDER=gemini`
4. Run:
   ```bash
   npm install
   npm run dev
   ```
   Open http://localhost:3000

## Deploy (Vercel)

1. Push this folder to a GitHub repository.
2. On [vercel.com](https://vercel.com) → **Add New Project** → import the repo.
3. Add the same environment variables from `.env.local`.
4. Click **Deploy** — you get a live link like `exampilot.vercel.app`.
5. In Supabase → **Authentication → URL Configuration**, set the Site URL to your Vercel link.

## Project structure

```
src/
  app/
    page.tsx               landing page
    login/                 login & sign-up
    (app)/dashboard/       dashboard
    (app)/subjects/        add subject, subject page, chat
    (app)/doubt/           DoubtSnap upload
    (app)/doubts/[id]/     solution page
    (app)/practice/        quiz + flashcards
    api/                   backend: subjects, notes, chat, doubt, quiz
    actions.ts             server actions (login, tick task, save quiz…)
  lib/
    ai.ts                  talks to Claude / Gemini
    features.ts            AI prompts + output schemas
    planner.ts             study-plan algorithm
    data.ts                database helpers, PDF reading
  proxy.ts                 protects logged-in pages
supabase/schema.sql        database tables + security rules
```

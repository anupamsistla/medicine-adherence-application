# MedTrack

**Live app:** https://medtrack.anupamsistla.com

MedTrack is a medication tracker that helps people take the right medicine at the right time. It reminds you before each dose, records when you actually took it, warns you when stock is running low or a medicine is about to expire, and lets you ask questions about your own adherence and medical documents.

## Why I built it

My grandfather has dementia and used a pill box to keep track of his medicines. Filling it, remembering whether a dose was taken, and noticing when a bottle was running out were all tasks that depended on memory, and they were easy to get wrong. I wanted something that would do the remembering for him and give the family a clear picture of how he was doing, so MedTrack is built around three things:

- **Reminders** that arrive before each dose, so the dose doesn't depend on memory alone.
- **A simple record** of what was taken and when, so missed or late doses are visible.
- **Plain-language answers** to questions about his medicines, adherence, and recent medical documents, for whoever is helping him.

## Features

### Medications
- Add, edit, and delete medications with type, dose, unit, stock, expiry date, importance level, and an optional medical condition.
- Set one or more daily times and optionally specific days of the week.
- Upload a photo of the medicine and a copy of the prescription (PNG, JPEG, WebP, GIF, or PDF, up to 5 MB).
- Importance levels (Low, Medium, High, Critical) are shown in color on each card.

### Today
- A dashboard listing today's doses in time order, marked taken, missed, or upcoming.
- One-tap "Mark as taken." Taking a dose early asks for confirmation to avoid a double dose.
- The time each dose was taken is recorded for tracking, even though the dashboard doesn't display it.

### Reminders and alerts (sent by email)
- Reminder emails before each dose. The lead time (1 to 1440 minutes) is set in Settings.
- Low-stock alerts when a medicine falls below a percentage of its starting amount. The threshold is set in Settings, and the alert repeats every time a dose is taken while stock stays low.
- Expiry alerts when a medicine is within a set number of days of its expiry date. The window is set in Settings.

### History
- Day, week, and month views of every scheduled dose, with missed, taken, and timing (early, late, or on time) for each one.
- Filter by medication and year.
- Export any view as a PDF report.

### Appointment prep (Documents)
- Upload lab reports, visit notes, discharge summaries, referrals, and prescription leaflets (PDF or images). Text is extracted with Google Cloud Vision.
- Generate a prep summary before an appointment. It compares your most recent documents with your recent adherence and suggests questions to ask the doctor. The summary is for discussion with a doctor, not medical advice.

### Adherence assistant
- A chat assistant in the corner of every signed-in page answers questions about your adherence, such as "How often was I late with Eltroxin this month?"
- Answers come from your own dose records, not general medical knowledge.

### Settings and accounts
- Email and password sign-in. Each user's data is private to their account.
- Each user's time zone is detected from the browser, so times, reminders, and reports are shown in local time.
- Adjustable reminder lead time, low-stock threshold, and expiry window.

## Technology

- **Web app:** Next.js 16 (App Router), React, TypeScript, Tailwind CSS, shadcn/ui on Base UI
- **Data:** PostgreSQL with Prisma 7 (medications, dose logs, users) and MongoDB Atlas with vector search (document text and embeddings)
- **Auth:** Auth.js (NextAuth v5) with email and password
- **AI:** Anthropic Claude (assistant and appointment prep), Voyage AI (document embeddings), Google Cloud Vision (text extraction from documents)
- **Email:** Resend
- **Files:** Vercel Blob
- **Hosting:** Vercel, with a scheduled GitHub Actions workflow that calls the reminder check every five minutes

## Running it in development

### Requirements
- Node.js 20 or newer
- Docker Desktop (for the local PostgreSQL database)

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start PostgreSQL:
   ```bash
   docker compose up -d
   ```

3. Create a `.env` file in the project root with these variables:

   | Variable | What it's for |
   | --- | --- |
   | `DATABASE_URL` | PostgreSQL connection string, for example `postgresql://postgres:postgres@localhost:5433/medicine_adherence?schema=public` |
   | `AUTH_SECRET` | Random secret for sign-in (generate with `openssl rand -base64 32`) |
   | `CRON_SECRET` | Random secret that protects the reminder endpoint |
   | `RESEND_API_KEY` | Resend key for sending email |
   | `REMINDER_FROM_EMAIL` | Sender address for those emails |
   | `ANTHROPIC_API_KEY` | Claude API key for the assistant and appointment prep |
   | `MONGODB_URI` | MongoDB Atlas connection string for documents |
   | `VOYAGE_API_KEY` | Voyage AI key for document embeddings |
   | `GOOGLE_VISION_API_KEY` | Google Cloud Vision key for text extraction |
   | `BLOB_READ_WRITE_TOKEN` | Vercel Blob token for uploads (run `npx vercel env pull` after linking the project) |

   Features that depend on a key you haven't set will show an error, but the rest of the app still works.

4. Apply the database schema:
   ```bash
   npx prisma migrate dev
   ```

5. Start the web app:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000 and create an account at `/signup`.

6. Optional, in a second terminal: start the background worker that sends reminder and alert emails every minute:
   ```bash
   npm run worker
   ```

### Useful commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the web app in development mode |
| `npm run worker` | Run reminder and alert checks every minute |
| `npm run build` | Build for production |
| `npm run lint` | Run the linter |
| `npx tsc --noEmit` | Type-check the project |

## Running in production

The live app runs on Vercel and is deployed from the `main` branch of this repository.

- **Web app:** Vercel serves the Next.js app at https://medtrack.anupamsistla.com.
- **Database:** Prisma Postgres. Schema changes are applied with `npx prisma migrate deploy` against the production connection string before the new code is deployed.
- **Documents:** MongoDB Atlas, with a vector search index on the `chunks` collection.
- **Reminders and alerts:** the worker doesn't run in production. A GitHub Actions workflow (`.github/workflows/cron.yml`) calls `/api/cron/check` every five minutes with the `CRON_SECRET` header, and that endpoint runs the same checks the local worker runs.
- **Secrets:** all keys are stored as Vercel environment variables for production and as a GitHub Actions secret (`CRON_SECRET`). None are stored in the repository.

To deploy a change, push to `main` and run `npx vercel --prod`.

## Project structure

```
src/app/            Pages and server actions (dashboard, medications, history, documents, settings)
src/app/api/        Route handlers (PDF export, cron check, sign-up, auth)
src/components/     Shared UI, including the adherence assistant
src/lib/            Scheduling, time zones, reminders, expiry, email, and document processing
src/worker/         Local reminder worker
prisma/             Database schema and migrations
.github/workflows/  Scheduled reminder check
```

## Disclaimer

MedTrack is a personal reminder and record-keeping tool. It does not diagnose conditions or recommend treatment changes, and it isn't a substitute for a doctor or pharmacist. Always check with a healthcare professional before changing how a medicine is taken.

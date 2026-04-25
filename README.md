# Uteo — Web Client

**Your Dream Job Finds You.**

Uteo is an AI-powered, feed-based recruitment platform. This is the primary web application for job seekers and recruiters — a Next.js 14 app that delivers a social-media-style job discovery experience.

## What Job Seekers Get

- **Personalized Feed** — A scrollable, infinite feed of jobs ranked by AI match score
- **Match Score Bar** — Visual indicator showing how well each job fits your profile
- **One-Click Apply** — Apply with cover letter and resume link in seconds
- **Application Tracker** — Tab-based view of all your applications by status
- **Job Browser** — Full search and filter interface (type, location, salary, skills)
- **Saved Jobs** — Bookmark roles for later
- **Rich Profile** — Work experience, education, skills, and resume links

## What Recruiters Get

- **Job Posting** — Create and manage listings with skills tagging and salary ranges
- **Recruiter Dashboard** — Overview of company jobs and candidate pipeline
- **Application Manager** — Review, shortlist, schedule interviews, hire, or reject
- **Status Notifications** — Automatic in-app alerts sent to candidates on every move

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| HTTP | Axios |
| Auth | JWT with secure storage |

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Marketing landing page
│   ├── login/                # Auth screens
│   ├── register/             # Registration with role selection
│   ├── onboarding/           # 6-step job seeker setup wizard
│   ├── feed/                 # Personalized AI job feed
│   ├── jobs/                 # Browse + job detail
│   ├── applications/         # Application list + detail
│   ├── saved-jobs/           # Bookmarked jobs
│   ├── profile/              # Job seeker profile editor
│   ├── companies/            # Company profiles
│   ├── post-job/             # Job posting form (recruiters)
│   └── recruiter/            # Recruiter dashboard + applications
├── components/
│   ├── layout/               # Header, LayoutShell, sidebar nav
│   └── ui/                   # Shared UI primitives
└── lib/
    ├── api.ts                # Axios instance + interceptors
    ├── auth.ts               # Token management
    ├── uteo-types.ts         # All TypeScript types
    └── services/             # API service modules per domain
```

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_URL to your backend URL

# Start development server
npm run dev
```

## Navigation

**Job Seekers:**
- `/feed` — AI-powered job feed
- `/jobs` — Browse all jobs with filters
- `/applications` — My application history
- `/saved-jobs` — Saved/bookmarked jobs
- `/profile` — Edit profile, experience, education

**Recruiters:**
- `/recruiter` — Dashboard overview
- `/post-job` — Create a new job listing
- `/recruiter/applications` — Manage all applications

## License

Private — © 2026 Uteo

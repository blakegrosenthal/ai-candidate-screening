# AI Candidate Screening Assistant (MVP)

Evidence-based recruiter workflow prototype for first-pass applicant screening.

## Overview

This app helps recruiters upload or paste a job description, review multiple resumes, and quickly get from a large applicant pool to a short list worth screening.

- Strong screen, Review, and Reject buckets
- Evidence-based recruiter summaries
- Hard disqualifiers surfaced first
- Missing must-haves and credibility signals
- Structured reject reasons
- Suggested phone screen questions

It is intentionally an **assistive prototype** (not an autonomous hiring decision maker).

## Core MVP capabilities

- Landing page with clear positioning and CTA
- Screening workspace with:
  - Job description input
  - Multi-file resume upload
  - Drag-and-drop resume area
  - Manual pasted resume entry
  - Sample dataset loader (3 jobs)
- Transparent requirement extraction + editable recruiter controls
- Recruiter filters and sorting (bucket, evidence quality, years, location, missing must-haves, hard disqualifiers)
- Results table focused on evidence, missing must-haves, risks, years, and location
- Dedicated Strong screen, Review, Reject, and **Quick reject queue** views
- Candidate detail drawer with:
  - why the candidate is worth screening
  - concrete supporting evidence
  - missing must-haves
  - risk and credibility signals
  - hard disqualifiers
  - skill evidence map
  - suggested screening questions
  - resume preview
- Export actions:
  - copy shortlist summaries
  - copy review queue
  - copy structured reject reasons
  - copy screening questions

## Stack

- Vanilla HTML/CSS/JavaScript (ES modules)
- Deterministic analysis engine (designed for future LLM/API substitution)
- No database, auth, or ATS integration

## Run locally

```bash
npm run dev
```

Open: `http://localhost:3000`

## Build

```bash
npm run build
```

Build output is generated in `dist/`.

## Start built version

```bash
npm run start
```

Serves `dist/` at `http://localhost:3000`.

## Sample datasets

1. Senior Product Marketing Manager
2. Account Executive, SaaS
3. Backend Software Engineer

Each includes mixed-quality candidates (strong screens, borderline review cases, obvious rejects, weak evidence, and misleading keyword-heavy patterns).

## Architecture

- `src/main.js` → UI state + flow orchestration + interactions
- `src/engine/analyzer.js` → requirement extraction, parsing, evidence quality, screening buckets, reject reasons
- `src/data/sampleData.js` → seeded jobs and resumes
- `src/styles.css` → responsive recruiter-tech visual system
- `scripts/build.mjs` → static build pipeline

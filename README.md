# AI Candidate Screening Assistant (MVP)

Polished recruiter workflow prototype for screening inbound applicants faster.

## Overview

This app helps recruiters upload or paste a job description, review multiple resumes, and quickly get:

- Ranked shortlist
- Recruiter-style summaries
- Transparent match reasoning
- Reject flags
- Skill coverage and gaps
- Suggested screening decisions
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
- Recruiter filters and sorting (decision, years, location, must-have coverage, reject flags)
- Results table with ranking and quick flags
- **Quick reject workflow** tab for rapid elimination
- Candidate detail drawer with:
  - recruiter summary
  - positive signals
  - concerns
  - reject flags
  - skill coverage map (✓ △ ✕)
  - suggested screening questions
  - resume preview
- Export actions:
  - copy summaries
  - copy reject reasons
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

Each includes mixed-quality candidates (strong fit, adjacent fit, obvious rejects, and misleading/overqualified patterns).

## Architecture

- `src/main.js` → UI state + flow orchestration + interactions
- `src/engine/analyzer.js` → requirement extraction, parsing, scoring, explanation generation
- `src/data/sampleData.js` → seeded jobs and resumes
- `src/styles.css` → responsive recruiter-tech visual system
- `scripts/build.mjs` → static build pipeline

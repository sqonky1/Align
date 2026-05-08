# Align

Align is a hackathon MVP for senior care matching within a broader FDW support ecosystem.

**Core problem statement**: How might we enable and empower caregivers who are caring for seniors or PWDs so that they can alleviate caregiver fatigue and burnout?

The product helps employers structure a senior's care needs, compare those needs against a caregiver pool, and reduce caregiver burnout and fatigue caused by skills-care mismatch. While employers and helpers both benefit from better matching, the deeper problem Align is addressing is the pressure placed on foreign domestic workers when care demands exceed their training, language ability, or lived experience. Search is for recommendation and discovery, and employers can be referred through the website to a partner agency for hiring and placement.

## Product Scope

- Employer-facing main flow for this MVP
- Seniors only for this MVP
- Hardcoded mock data, no backend
- Agencies are part of the ecosystem and support downstream hiring and placement
- Structured care needs drive matching to reduce helper burnout and fatigue from poor fit
- Free-text notes are contextual only and do not affect score
- Primary product interaction is employer-side, but the problem framing should stay helper-aware and FDW-centered

## Current Information Architecture

### 1. Employer Profile Workspace `/`

- Main employer home
- Holds care profiles
- Holds saved caregivers
- Main entry point for creating new care profiles
- Each care profile can launch matched search with profile context

### 2. Create/Edit Care Profile

- `/profiles/new`
- `/profiles/:profileId/edit`
- Shared form route component for create and edit
- Stored in `localStorage`

### 3. Search `/search`

- Browse mode when no profile is active
- Matched mode when opened with `?profile=<id>`
- Browse mode shows the full caregiver dataset without fake match percentages
- Matched mode ranks caregivers from most to least relevant
- Website can guide the employer toward an agency handoff for hiring and placement after shortlist/discovery

### 4. Caregiver Detail Page

- Top 3 matched search cards are already designed as a preview of this direction

## Matching Model

Matching is weighted, rule-based, and explainable, scored out of 100.

Dimensions:

- Language
- Conditions overlap
- Daily care tasks overlap
- Mobility support overlap
- Medication support overlap
- Years of experience

Current weights:

- Language: `32`
- Conditions: `22`
- Daily care tasks: `18`
- Mobility support: `12`
- Medication support: `10`
- Experience: `6`

Design intent:

- Language mismatch matters strongly because communication gaps can increase helper strain
- Only structured profile fields drive score
- Match percentages should be defensible, not arbitrary
- Better matching should lower the risk of caregiver burnout and fatigue caused by skill-care mismatch
- Rationale should stay practical rather than clinical

## Current UX Decisions

- No manual `draft / ready for search` toggle
- Care profiles are continuously editable
- If needed, readiness is inferred, not user-managed
- Risk notes and additional notes stay separate
- Multi-select fields use type-to-search inputs
- Selector placeholder text is `Select`
- Gender labels render capitalized
- `Search ready` has been removed from care recipient cards

## Current Search UI

### Browse Mode

- Opens from navigation
- Uses the full caregiver dataset
- No fake match percentages
- Gallery-style caregiver cards

### Matched Mode

- Opens from a care profile with `?profile=<id>`
- Top 3 results render as compact detailed preview cards
- Remaining results render as a lighter ranked gallery
- Top 3 cards use medal accents:
  - Gold for `#1`
  - Silver for `#2`
  - Bronze for `#3`
- Fit chips are compact:
  - Green for fully fulfilled
  - Yellow for partially fulfilled
  - Red for not fulfilled

## Tech Stack

- Vite
- React
- TypeScript
- CSS
- Mock data stored in source files
- `localStorage` for care profile persistence

## Key Files

- [src/data/caregivers.ts](/Users/lawrence/Documents/Align/src/data/caregivers.ts)
- [src/data/careProfiles.ts](/Users/lawrence/Documents/Align/src/data/careProfiles.ts)
- [src/data/agencies.ts](/Users/lawrence/Documents/Align/src/data/agencies.ts)
- [src/data/savedCaregivers.ts](/Users/lawrence/Documents/Align/src/data/savedCaregivers.ts)
- [src/lib/data.ts](/Users/lawrence/Documents/Align/src/lib/data.ts)
- [src/lib/careProfiles.ts](/Users/lawrence/Documents/Align/src/lib/careProfiles.ts)
- [src/lib/matching.ts](/Users/lawrence/Documents/Align/src/lib/matching.ts)
- [src/pages/UserProfilePage.tsx](/Users/lawrence/Documents/Align/src/pages/UserProfilePage.tsx)
- [src/pages/NewCareProfilePage.tsx](/Users/lawrence/Documents/Align/src/pages/NewCareProfilePage.tsx)
- [src/pages/SearchPage.tsx](/Users/lawrence/Documents/Align/src/pages/SearchPage.tsx)
- [src/app/routes.tsx](/Users/lawrence/Documents/Align/src/app/routes.tsx)
- [src/types/index.ts](/Users/lawrence/Documents/Align/src/types/index.ts)
- [src/index.css](/Users/lawrence/Documents/Align/src/index.css)

## Local Development

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

## Current Status

Completed:

1. `chore: scaffold app shell routing and design tokens`
2. `feat: add typed mock data layer for agencies caregivers and care profiles`
3. `feat: implement create and edit care profile flow`
4. `feat: add caregiver matching engine and scoring utilities`
5. `feat: build ranked caregiver search results view`

Next likely commits:

1. `feat: add caregiver detail page with fit breakdown`
2. `feat: implement shortlist flow and website-based agency handoff simulation`
3. `feat: add AI note upload placeholder and extraction preview`
4. `style: polish copy states and match visualization`

## Constraints

Do not add yet:

- Supabase or any backend
- Profile deletion
- Full AI parsing
- Production-grade robustness

This repo is intentionally optimized for MVP speed, clear IA, explainable matching behavior, and sharper framing around FDW well-being alongside employer decision support.

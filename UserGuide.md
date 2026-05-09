# Align User Guide

This guide is for employers using Align to create care profiles, find suitable helpers, and hand off to agencies.

## 1. Navigate the App

- `Profile` tab: your workspace for care profiles and shortlisted helpers
- `Search` tab: browse all helpers or run profile-based matching

## 2. Create a Care Profile

1. Go to `Profile`.
2. Click `Create care profile`.
3. Fill in:
- Basic details (`name`, `age`, `gender`, `preferred language`)
- Care needs (`conditions`, `daily care tasks`)
- Support complexity (`mobility`, `medication`, `household context`)
- Context (`risk notes`, `additional notes`)
4. Save the profile.

Tip: more complete structured fields improve matching relevance.

## 3. Run Matching

You can start matching in two ways:

- From Search page: click `Match to care recipient`, then choose a profile
- From a care profile detail page: click `Start matching`

Align will rank helpers using structured overlap and language/experience fit.

## 4. Understand Search Results

- Browse mode (`/search` without profile): general helper browsing, no match scores
- Matched mode (`/search?profile=<id>`): ranked results with match percentages and fit chips
- Top ranked helpers appear first with stronger visual emphasis

## 5. Review Helper Detail

Open any helper card to view:

- Match overview against the selected profile
- Practical fit breakdown across care dimensions
- AI-generated practical reasoning summary (when backend/API key is configured)
- Agency handoff action

## 6. Shortlist Helpers

In helper detail (matched mode), click the star button to save/remove shortlist.

- Shortlisted helpers appear on:
- Main `Profile` workspace
- The specific care profile detail page

## 7. Agency Handoff

Use `Agency handoff` from helper detail to simulate the referral flow to an agency for hiring/placement follow-up.

## 8. Edit or Delete Care Profiles

- Edit: open a profile and use edit actions
- Delete: delete from workspace with confirmation

Deleting a profile removes its associated saved context from the local workspace state.

## 9. Current Limitations

- MVP uses local/mock data and browser storage (`localStorage`)
- No production account system or server-side persistence
- Matching depends on structured fields; free-text notes do not affect score directly
- AI match reasoning requires backend setup (`OPENAI_API_KEY`)

## 10. Next Feature (Planned)

Medical document processing will be added to extract relevant fields and prefill care profile writing details:

- Structured profile fields (conditions/tasks/mobility/medication/household)
- Context fields (`risk notes`, `additional notes`)

Users will review and edit extracted values before saving.

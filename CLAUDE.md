# GrundCheck.at — Claude Code Guide

## Project Overview

GrundCheck is an Austrian property and entity intelligence platform. It aggregates data from
Grundbuch, Firmenbuch, Ediktsdatei, and GISA into a graph database, then exposes it via a
natural language interface powered by Claude.

**Status:** Hackathon MVP — mock data only, no live API integrations.

## Key Commands

```bash
npm run dev          # Start dev server on localhost:3000
npm run seed         # Seed Neo4j with demo data from /data/*.json
npm run lint         # ESLint + Prettier check
npm run build        # Production build
npx prisma db push   # Sync Prisma schema to PostgreSQL
npx prisma studio    # Visual DB browser
```

## Architecture

- **Next.js 15** (App Router, TypeScript, Server Components)
- **Neo4j** — graph DB for property ↔ company ↔ person relationships
- **PostgreSQL** — users, watchlists, search logs (via Prisma)
- **Claude API** — natural language → Cypher query translation
- **D3.js** — force-directed ownership graph visualization
- **BullMQ + Redis** — watchlist monitoring queue (scaffolded, not active in hackathon)

## Environment Setup

1. Copy `.env.example` to `.env.local`
2. Fill in Neo4j, PostgreSQL, Redis, and Anthropic API key
3. Run `npx prisma db push` to create PostgreSQL tables
4. Run `npm run seed` to populate Neo4j with demo data

## Code Conventions

- **TypeScript strict mode** — no `any`, use `unknown` + type guards
- **ES modules only** — `import/export`, never `require()`
- **Named exports** — never default exports (except Next.js pages)
- **Server Components by default** — `'use client'` only for D3, interactive elements
- **Tailwind only** — no CSS modules; use `bg-[var(--surface)]` pattern for design tokens
- **German UI text** — all user-facing strings in German
- **English code/comments** — variable names, function names, comments in English

## Design Tokens

All colors are defined as CSS variables in `app/globals.css`:

| Variable | Value | Use |
|---|---|---|
| `--bg` | `#0A0A0F` | Page background |
| `--surface` | `#12121A` | Cards, panels |
| `--surface-2` | `#1A1A26` | Elevated surfaces |
| `--border` | `#2A2A3A` | Borders |
| `--text` | `#E8E6F0` | Primary text |
| `--text-muted` | `#8B89A0` | Secondary text |
| `--accent` | `#6C63FF` | Brand purple |
| `--green` | `#34D399` | LOW risk |
| `--amber` | `#FBBF24` | MEDIUM risk |
| `--red` | `#F87171` | HIGH risk |
| `--cyan` | `#22D3EE` | Graph nodes |

## Neo4j Data Model

```cypher
// Nodes
(:Property {address, plz, bezirk, ez, kg, blatt_a, blatt_b, blatt_c})
(:Company  {name, fn_number, legal_form, registered_since, status})
(:Person   {name, birth_year, roles: [string]})
(:Insolvency {case_number, type, date, court})

// Relationships
(:Property)-[:OWNED_BY]->(:Company)
(:Property)-[:OWNED_BY]->(:Person)
(:Company)-[:HAS_SHAREHOLDER {share_pct}]->(:Person)
(:Company)-[:HAS_SHAREHOLDER {share_pct}]->(:Company)
(:Company)-[:HAS_GF {since, until}]->(:Person)
(:Person)-[:INVOLVED_IN]->(:Insolvency)
(:Company)-[:INVOLVED_IN]->(:Insolvency)
(:Company)-[:SUBSIDIARY_OF]->(:Company)
```

## Risk Score

Score 0–100 → LOW (0–30) / MEDIUM (31–60) / HIGH (61–100):

- +30 linked person has insolvency
- +20 GF changed in last 12 months
- +15 company < 2 years old
- +10 per shell company layer
- +15 no Jahresabschluss filed
- +10 mass-registration address

## Hackathon Scope (What NOT to Build)

- ❌ User auth / NextAuth
- ❌ Payment / billing
- ❌ Live Firmenbuch / Grundbuch API calls
- ❌ Monitoring cronjobs (BullMQ scaffolded but not active)
- ❌ ESG module
- ❌ Mobile responsiveness

## Important Gotchas

- Neo4j queries **must** use parameterized queries (`$address`, not string concat)
- Claude API may return Cypher wrapped in markdown backticks — strip them in `lib/ai.ts`
- D3 force graph **must** be a `'use client'` component
- Search endpoint has 10-second timeout; return partial results if AI is slow
- German umlauts (ä, ö, ü, ß) must work — normalize with `.toLowerCase()` + collation
- Always show **"Dies ist keine Rechtsberatung"** disclaimer in the footer

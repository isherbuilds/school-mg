# school-mg

**Open-source school management platform** for administrative staff, teachers,
and school leadership. Born from the conviction that schools deserve better
software than the bloated, overpriced ERP suites that dominate the market.

## Vision

school-mg exists to build the school management system we wish existed:

- **Simple**. Teachers should mark attendance in two taps, not navigate five
  screens. Principals should set up a school in minutes, not weeks.
- **Open**. No vendor lock-in. No opaque pricing. No data hostage. You own your
  data, your infrastructure, and your future.
- **Modular**. Start with attendance and timetable. Add fees when you're ready.
  Add a parent portal when the time comes. No paid tiers to gate features.
- **Modern**. Built on a contemporary TypeScript stack with type safety from the
  database to the UI. Not a PHP relic from 2005 with a fresh coat of paint.

We are building for **small-to-medium K-12 schools** — the ones that get ignored
by both the enterprise ERP vendors and the under-funded open-source alternatives.
Schools with 50-5000 students that need real tools, not a glorified spreadsheet.

## Stack

| Layer         | Technology                                        |
| ------------- | ------------------------------------------------- |
| **Frontend**  | TanStack Start (React 19, SSR, Nitro) + shadcn/ui |
| **Server**    | Hono (Node.js, WinterCG-compliant)                |
| **API**       | oRPC (type-safe, OpenAPI/Scalar docs)             |
| **Database**  | PostgreSQL + Drizzle ORM                          |
| **Auth**      | Better Auth (self-hosted, OAuth, magic links)     |
| **i18n**      | Paraglide.js (compiled, zero-overhead)            |
| **State**     | TanStack Query (server) + Zustand (client)        |
| **Toolchain** | Vite Plus (dev, test, build, lint, type-check)    |

## What We Are Doing

### MVP: Staff Academic Operations (active)

The first useful release — what a principal needs to run a school:

- School setup (academic years, grade levels, sections, subjects)
- Staff management with access roles & assignment roles
- Student & guardian records with enrollment history
- Manual timetable builder
- Daily section attendance (present/absent with calendar exceptions)
- Basic transport assignment (routes, stops, riders)

### Next After MVP (planned)

- **Marksheets** — grading scales, assessments, report cards
- **Local Fees** — fee plans, charges, receipts, balances
- **Parent Portal** — attendance, homework, fee visibility

### Further Ahead (planned)

- Accounting integration (Edernal Books)
- Full transport operations (vehicles, crew, GPS, maintenance)
- Communication, chat, AI assistant with human review

### Explicitly Out of Scope

- Student social network
- Open student DMs
- Generic student chatbot

## Project Structure

```
school-mg/
├── apps/
│   ├── web/          # TanStack Start (React + SSR)
│   └── server/       # Hono API server (Node.js)
├── packages/
│   ├── api/          # oRPC router, procedures, OpenAPI
│   ├── auth/         # Better Auth client & server
│   ├── core/         # Domain types, schemas, enums, formatters
│   ├── db/           # Drizzle schema, migrations, queries
│   ├── env/          # Environment variable validation (t3-env)
│   ├── i18n/         # Paraglide.js translations
│   ├── logger/       # Structured logging (evlog)
│   ├── seo/          # SEO helpers (sitemap, OG, robots)
│   └── ui/           # shadcn/ui primitives
├── tools/
│   ├── tsconfig/     # Shared TypeScript configs
│   └── vite-plus/    # Custom toolchain lint rules
└── docs/
    ├── adr/          # Architecture Decision Records
    └── ROADMAP.md    # Detailed roadmap
```

## Getting Started

```bash
git clone https://github.com/isherbuilds/school-mg
cd school-mg
cp packages/env/.env.example packages/env/.env
cp .env.docker.example .env.docker
vp install              # install all dependencies
vp run auth:secret      # generate Better Auth secret
vp run db:dev:start     # start PostgreSQL (Docker)
vp run db:migrate       # run database migrations
vp run dev              # start all dev servers
```

See [detailed docs](.github/README.md) for deployment guides, Docker setup,
Cloudflare Workers, and environment variable reference.

## License

AGPL-3.0 © [Edernal Company](./LICENSE)

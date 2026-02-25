# LearnTrack – Learner Progress Tracking

## 🎥 Demo & Preview

### 🎬 App Walkthrough Video

[![Watch the demo](homepage.png)](https://youtu.be/LC5nzl8j8-0)

> A short walkthrough covering:
>
> - Learner progress tracking
> - Data quality checks & fixes
> - Admin utilities and insights

# 🚀 Tech Stack

## Backend

- **Node.js + TypeScript** — type safety and maintainability
- **Express.js** — lightweight, flexible HTTP framework
- **Drizzle ORM** — type-safe SQL with minimal abstraction
- **PostgreSQL** — relational integrity and strong constraints

## Frontend

- **Next.js (App Router)** — full-stack React framework with server-side rendering and file-based routing
- **React + TypeScript** — type-safe, component-driven UI development
- **Tailwind CSS** — utility-first styling for rapid and consistent design
- **Next Fonts (Geist)** — optimized, self-hosted typography

> **Note:** The frontend was primarily scaffolded and refined with the help of AI tools.

## Validation & Safety

- **Zod** — runtime validation for webhook payloads

## Testing

- **Jest + ts-jest** — unit testing

## DevOps

- **Docker + docker-compose** — reproducible local environments

---

# 🧠 Why This Stack?

| Decision    | Reason                                                           |
| ----------- | ---------------------------------------------------------------- |
| PostgreSQL  | Strong relational constraints (unique completions, FK integrity) |
| Drizzle ORM | Fully typed queries without heavy abstraction                    |
| Express     | Minimal overhead for case-study APIs                             |
| TypeScript  | Prevents bugs in derived calculations                            |
| Zod         | Safe webhook parsing and validation                              |

---

# 📦 Setup Instructions

## 1. Clone the repo

```bash
git clone git@github.com:bhatshakran/learntrack-api.git
cd learntrack
```

## 2. Environment variables

Create `.env`:

```env
DATABASE_URL=postgres://postgres:password@localhost:5432/learntrack
PORT=3000
```

## 3. Start with Docker

```bash
docker-compose up --build 2>&1 | tee docker.log
```

This will:

- Start PostgreSQL
- Build and run the API

---

# ▶️ How to Run

## Start API

```bash
docker-compose up --build 2>&1 | tee docker.log
```

## Stop

```bash
docker-compose down
```

## Seed database

```bash
pnpm run seed
```

# 📡 API Documentation

Base URL:

```
http://localhost:3000
```

---

Full API reference available here:

👉 [API Documentation](./API.md)

# 🧮 Architecture Overview

Full Architecture overview available here:

👉 [Architecture Documentation](./ARCHITECTURE.md)

# 🌍 Timezone Considerations

Daily streak depends on calendar day boundaries.

## Production approach

- Store timestamps in UTC (implemented this in one of my projects called Lisani (<https://lisani.org>))
- Compute streaks using learner timezone
- Persist user timezone in profile

---

# 🧪 Running Tests

```bash
pnpm run test          # all tests
pnpm run test:unit     # unit tests only
```

---

# 🏁 Future Improvements

- Bulk webhook ingestion

---

# 📬 Submission Checklist

- [x] Dockerized (mandatory)
- [x] Seed data (mandatory)
- [x] Data quality tools/api (mandatory)
- [x] Unit tests (recommended)
- [x] Curl examples (recommended)
- [x] Leaderboard (optional)
- [ ] Integration tests
- [x] Frontend (additional)

---

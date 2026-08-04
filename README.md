# VaultDrive Backend

> A production-grade Google Drive clone built with Node.js and Express — featuring SHA-256 smart file deduplication, AWS S3 object storage, Redis caching, Apache Kafka async messaging, JWT authentication with refresh token rotation, role-based access control, folder management, file sharing, and scheduled trash cleanup.

---

## Features

- **SHA-256 content-addressed deduplication** — identical files uploaded by any user are stored once in S3; duplicates only get a lightweight DB reference, and storage quotas aren't charged for dedup hits.
- **JWT auth** with short-lived access tokens and rotating refresh tokens (stored in Redis).
- **Role-based access control** (`USER` / `ADMIN`).
- **Folder system** with infinite nesting and breadcrumb navigation.
- **File sharing** via public tokenized links, with optional expiry and password protection.
- **Storage quota system** (5 GB default per user) with `413` rejection on overage.
- **Kafka event pipeline** — every upload publishes an event for async analytics processing.
- **Redis caching** for file listings, analytics, and folder trees.
- **Scheduled trash cleanup** — files trashed >30 days are auto-purged nightly.

---

## Tech Stack

Node.js 20 · Express 4 · PostgreSQL 15 · Redis 7 · Apache Kafka 3 · AWS S3 (SDK v3) · JWT · bcryptjs · Joi · Multer · Helmet · node-cron · Jest + Supertest · Docker Compose · Nginx

---

## Architecture

```
Client → Nginx (port 80) → Express API
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
  PostgreSQL 15            Redis 7                 AWS S3
  (users, files,       (refresh tokens,        (deduplicated
   folders, dedup       listing/analytics        file blobs)
   events, shares)          cache)
        │
   Apache Kafka → analytics-group consumer
```

Uploads compute a SHA-256 hash server-side; if a matching `file_blobs` row exists, S3 is skipped and a `file_references` row points to the existing blob. Otherwise the file is uploaded and a new blob is created. Every upload (dedup or not) publishes an `UploadEvent` to Kafka.

---

## Getting Started

### Prerequisites
- Node.js 20 LTS, PostgreSQL 15, Redis 7, Apache Kafka 3.x (or use Docker Compose), an AWS S3 bucket + IAM credentials

### Local Development

```bash
git clone https://github.com/manyakukreja1306/vaultdrive-backend.git
cd vaultdrive-backend
npm install
cp .env.example .env   # fill in your values
psql -U postgres -d vaultdrive -f migrations/001_initial_schema.sql
npm run dev
```

API runs at `http://localhost:5000`. Health check: `GET /health`.

### Docker (Full Stack)

```bash
git clone https://github.com/manyakukreja1306/vaultdrive-backend.git
cd vaultdrive-backend
cp .env.example .env   # set AWS credentials and JWT_SECRET at minimum
docker compose up --build -d
docker exec -i vaultdrive-db psql -U postgres -d vaultdrive < migrations/001_initial_schema.sql
curl http://localhost/health
```

Brings up: Nginx (80), API (5000, internal), PostgreSQL (5432), Redis (6379), Kafka (9092), Zookeeper (2181).

---

## Environment Variables

See `.env.example` for the full list. Key variables:

```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD
REDIS_HOST=localhost / REDIS_PORT
KAFKA_BROKERS=localhost:9092
JWT_SECRET=your_jwt_secret_here
ACCESS_TOKEN_EXPIRY=900000       # 15 min
REFRESH_TOKEN_EXPIRY=604800000   # 7 days
AWS_REGION / AWS_ACCESS_KEY / AWS_SECRET_KEY / S3_BUCKET
MAX_FILE_SIZE=5368709120         # 5 GB
```

Never commit `.env`. Generate a strong secret with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## API Overview

All routes are prefixed `/api`. Protected routes require `Authorization: Bearer <accessToken>`.

| Group | Endpoints |
|---|---|
| **Auth** | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout` |
| **Files** | `POST /files/upload`, `GET /files`, `/files/search`, `/files/starred`, `/files/trash`, `GET /files/:id/download`, `PATCH /files/:id/star`\|`/unstar`\|`/restore`, `DELETE /files/:id`\|`/permanent`, `GET /files/share/:token` (public) |
| **Folders** | `POST /folders`, `GET /folders`, `/folders/:id/contents`, `/folders/:id/breadcrumb`, `PATCH /folders/:id/rename`, `DELETE /folders/:id` |
| **Shares** | `POST /shares`, `GET /shares/file/:fileRefId`, `DELETE /shares/:shareLinkId` |
| **Analytics** | `GET /analytics/me`, `GET /analytics/global` (admin only) |

Uploading returns whether the file was deduplicated and how many bytes were saved:
```json
{
  "fileReferenceId": "uuid",
  "wasDeduplicated": true,
  "bytesSaved": 204800
}
```

Errors follow a consistent envelope (`status`, `error`, `message`, `timestamp`, `path`), with extra fields on `413 STORAGE_LIMIT_EXCEEDED`.

---

## Testing

```bash
npm test                                  # full suite
npx jest --verbose
npx jest tests/deduplicationService.test.js
```

Tests run against mocks — no live DB, Redis, S3, or Kafka connections required.

---

## Known Limitations

- Password-protected share links: storage layer ready, enforcement middleware pending.
- Cascade folder deletes don't trigger S3/blob cleanup for contained files — needs a pre-delete hook for production use.

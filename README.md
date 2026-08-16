# PaperHub

Scientific presentation archive — upload a talk, link it to the paper via DOI,
and let others find and cite it. React SPA on Cloudflare Workers, with D1 for
data and R2 for files. No Base44, no external app platform.

## Architecture

```
Browser ──▶ Worker (worker/index.js)
              ├── /api/auth/*        JWT sessions, e-mail OTP signup, password reset
              ├── /api/entities/*    D1 CRUD with per-entity row-level security
              ├── /api/files         upload to R2
              ├── /files/*           public file serving from R2
              ├── /api/functions/*   the five backend jobs (see below)
              └── /*                 the built SPA (static assets)
```

| Piece | What it replaced |
| --- | --- |
| `worker/lib/auth.js` | Base44 auth — PBKDF2 hashes, HS256 tokens, all on Web Crypto |
| `worker/lib/entities.js` | `base44.entities.*` — same call shapes, D1 underneath, RLS ported from the old entity schemas |
| `worker/lib/mail.js` | Base44 mail — Resend, or console output when unconfigured |
| `worker/lib/llm.js` | `integrations.Core.InvokeLLM` — Claude, optional |
| `src/api/client.js` | `@base44/sdk` |

Backend functions: `extractFileText` (PDF/PPTX text + reference DOIs),
`extractPptxThumbnail`, `lookupPaperLicense`, `downloadPresentation` (ZIP with
licence paperwork), `getPublicProfile`.

## Setup

```bash
npm install
npx wrangler login
```

Create the database and bucket, then put the returned `database_id` into
`wrangler.toml`:

```bash
npx wrangler d1 create paperhub
npx wrangler r2 bucket create paperhub-files
npm run db:migrate
```

Set the secrets:

```bash
npx wrangler secret put JWT_SECRET        # any long random string
npx wrangler secret put RESEND_API_KEY    # signup + password reset mail
npx wrangler secret put ANTHROPIC_API_KEY # optional, see below
```

`ANTHROPIC_API_KEY` is optional. Without it, licence lookups use CrossRef,
OpenAlex, Unpaywall and doi.org only, and scanned PDFs fall back to binary text
extraction. Everything else works unchanged.

Also set `APP_URL` and `MAIL_FROM` in `wrangler.toml` to your domain — `APP_URL`
is what upload URLs and password-reset links are built from.

## Running locally

```bash
npm run db:migrate:local   # once
npm run dev:api            # worker on :8787
npm run dev                # UI on :5173, proxies /api and /files to the worker
```

Without `RESEND_API_KEY`, signup codes and reset links are printed to the
`wrangler dev` log instead of being e-mailed — that is the intended dev flow.

## Deploying

```bash
npm run deploy
```

Builds the SPA and pushes the worker plus assets. Point your domain at the
worker in the Cloudflare dashboard (Workers → paperhub → Domains & Routes).

## Importing the Base44 data

Export each entity as JSON into `data/` (`User.json`, `Presentations.json`,
`Comments.json`, `Ratings.json`, `DownloadConsents.json`,
`AuthorshipAuditLog.json`), then:

```bash
node scripts/migrate-from-base44.mjs           # dry run — writes data/import.sql
node scripts/migrate-from-base44.mjs --apply   # uploads files to R2, loads the data
```

Files hosted on `media.base44.com` are downloaded, re-uploaded to R2, and the
stored URLs are rewritten.

**Passwords do not transfer** — Base44 stores the hashes and does not export
them. Imported accounts are marked verified but have no password; each user goes
through "forgot password" once. Tell them before you cut over.

### Switching the stored file URLs to a new host

Uploads are stored as absolute URLs, built from `APP_URL` at import time. The
first import used the `workers.dev` preview host so the preview was fully
usable. When you point the domain at the worker, rewrite the stored host once
(and set `APP_URL` in `wrangler.toml` to match, so new uploads follow):

```bash
npx wrangler d1 execute paperhub --remote --command "
UPDATE presentations SET
  file_url      = replace(file_url,      'https://paperhub.tight-art-4025.workers.dev', 'https://paperhub.io'),
  handout_url   = replace(handout_url,   'https://paperhub.tight-art-4025.workers.dev', 'https://paperhub.io'),
  thumbnail_url = replace(thumbnail_url, 'https://paperhub.tight-art-4025.workers.dev', 'https://paperhub.io')"
```

## Making yourself an admin

Admin rights gate destructive edits on other people's uploads:

```bash
npx wrangler d1 execute paperhub --remote \
  --command "UPDATE users SET is_admin = 1 WHERE email = 'you@example.com'"
```

## Notes

- Sessions are stateless JWTs in `localStorage`, valid 30 days. Rotating
  `JWT_SECRET` signs everyone out.
- Uploads are capped at 50 MB and get generated R2 keys — client filenames are
  never used as paths.
- `migrations/` is applied by `wrangler d1 migrations apply`; add new files
  rather than editing `0001_init.sql` once you have data.

# EdgeOne Pages URL Shortener (Functions + KV)

A production-ready URL shortener built on EdgeOne Pages Functions with KV storage. Provides a complete RESTful API and a minimal Next.js UI for creating and resolving short links.

## Features
- Create short link for a given URL (support custom slug)
- Idempotent: same URL returns the same slug
- 302 redirect via path `/:slug`
- Resolve API to get original URL
- Visit counter (+1 on each redirect) and stats API
- Configurable KV binding name via environment variable

## Endpoints
- POST `/api/shorten`
  - Body: `{ url: string; slug?: string }`
  - Response: `{ slug, url, shortUrl }`
  - Notes: 
    - If `slug` omitted, auto-generate
    - If the URL already exists, returns the existing short link (200)
- GET `/api/resolve?slug=abc123` or `/api/resolve?slug=https://your-domain/abc123` or `/api/resolve?url=https://your-domain/abc123`
  - Response: `{ slug, url }` or `404`
- GET `/:slug`
  - 302 redirect to the original URL
  - Increments visit counter `c:{slug}`
- GET `/api/stats?slug=abc123`
  - Response: `{ slug, url, visits }`

## KV Keys
- `s:{slug}` => original URL (forward mapping)
- `u:{url}`  => slug (reverse mapping for idempotency)
- `c:{slug}` => visit counter (string number)

## Environment Variables
- `DWZ_KV_BINDING`
  - The KV binding name to use at runtime
  - Default: `dwz_kv`
  - Runtime lookup order: `globalThis[bindingName]` -> `env[bindingName]`

## Local Development
```bash
npm install
npm run dev
```
Then open http://localhost:3000. The UI lets you create and resolve short links.

EdgeOne CLI dev mode may send relative URLs to the function. The code handles this when building absolute URLs by composing from request headers (`host`, `x-forwarded-proto`).

## Deployment (EdgeOne Pages)
1) Create/attach a KV namespace and bind it with name `dwz_kv` (or your own name)
2) If you use a custom binding name, set env `DWZ_KV_BINDING` to that name
3) Deploy the project as an EdgeOne Pages app

## Tech Stack
- Next.js (UI only)
- EdgeOne Pages Functions (serverless APIs)
- EdgeOne KV (storage)
- TypeScript

## License
MIT

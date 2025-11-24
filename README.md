# EdgeOne Pages URL Shortener

> A production-ready URL shortener service built on EdgeOne Pages Functions with KV storage. Features a complete RESTful API and a minimal Next.js UI interface.

## Quick Start

> **Prerequisites**: Please apply for and enable EdgeOne Pages KV storage service first

### One-Click Deployment

Choose the corresponding site to deploy:

**International Site**  
[![Use EdgeOne Pages to deploy](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?repository-url=https://github.com/lm379/dwz)

**China Site**  
[![使用 EdgeOne Pages 部署](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?repository-url=https://github.com/lm379/dwz)

### Manual Deployment

1. **Fork Repository**: Fork this repository to your GitHub account
2. **Bind Project**: Go to EdgeOne Pages console, bind your GitHub repository and select the forked repo
3. **Configure Build**: Complete the configuration following the wizard and deploy
4. **Additional Config**: If KV binding or environment variables were not configured during initial deployment, re-deploy after binding them

### Configuration Guide

After deployment, complete the following configuration:

1. **Create KV Namespace**
   - Create or attach a KV namespace in your project settings
   - Set the binding name to `dwz_kv` (or your custom name)

2. **Configure Environment Variables** (Optional)
   - If using a custom KV binding name, set `DWZ_KV_BINDING` environment variable
   - For API authentication protection, set `API_TOKEN` environment variable
   - To display ICP filing info, set `ICP` environment variable

3. **Re-deploy**
   - Trigger a re-deployment after configuration to apply changes

## API Documentation

### Create Short Link

**POST** `/api/shorten`

Create a new short link or return an existing one.

**Request Body**
```json
{
  "url": "https://example.com/very/long/url",
  "slug": "my-link"  // Optional, auto-generated if not provided
}
```

**Response**
```json
{
  "slug": "my-link",
  "url": "https://example.com/very/long/url",
  "shortUrl": "https://your.domain.com/s/my-link"
}
```

**Notes**
- Automatically generates a 7-character random slug if not provided
- Same URL returns the same short link on multiple requests (idempotency)
- If `API_TOKEN` is set, include in request headers:
  - `Authorization: Bearer {API_TOKEN}` or
  - `X-API-Token: {API_TOKEN}`

---

### Resolve Short Link

**GET** `/api/resolve?slug={slug}`

Query the original URL for a short link.

**Query Parameters**
- `slug`: Short link alias, e.g., `abc123`
- Also accepts full short URL, e.g., `https://your.domain.com/s/abc123`

**Response**
```json
{
  "slug": "abc123",
  "url": "https://example.com/original/url"
}
```

---

### Link Redirection

**GET** `/s/:slug`

302 redirect to the original URL and increment visit counter.

**Example**
```
https://your.domain.com/s/abc123 → https://example.com/original/url
```

---

## Architecture

### KV Storage Key Design

| Key Pattern | Value Type | Description |
|-------------|------------|-------------|
| `s:{slug}` | String | Forward mapping: short link alias → original URL |
| `u:{url}` | String | Reverse mapping: original URL → short link alias (for idempotency) |
| `c:{slug}` | String | Visit counter: stores the number of visits for a short link |

### Tech Stack

- **Frontend UI**: Next.js 14 + React + Tailwind CSS
- **Backend API**: EdgeOne Pages Functions (serverless)
- **Data Storage**: EdgeOne KV (key-value store)
- **Development Language**: TypeScript

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DWZ_KV_BINDING` | KV namespace binding name | `dwz_kv` | No |
| `API_TOKEN` | API access token, requires header auth when enabled | - | No |
| `PASSWORD` | Password required for creating short links | - | No |
| `NEXT_PUBLIC_PASSWORD_REQUIRED` | Set to `true` to show password input in UI (also set when PASSWORD is configured) | - | No |
| `NEXT_PUBLIC_ANNOUNCEMENT` | Announcement text displayed in top-right corner, auto-hides after 5 seconds, user can manually close, supports HTML tags | - | No |
| `NEXT_PUBLIC_ANNOUNCEMENT_ENCODED` | URL-encoded announcement content, takes priority over `NEXT_PUBLIC_ANNOUNCEMENT`, useful for cloud platforms with special character restrictions | - | No |
| `ICP` | ICP filing number, displays at page footer when set | - | No |

**Details**

- **DWZ_KV_BINDING**: Set this if your KV binding name is not `dwz_kv`
  - Runtime lookup order: `globalThis[bindingName]` → `env[bindingName]`
  
- **API_TOKEN**: Protects the short link creation endpoint from abuse
  - When enabled, calling `/api/shorten` requires:
    - `Authorization: Bearer {API_TOKEN}` or
    - `X-API-Token: {API_TOKEN}`
  - Same-origin requests (Web UI) don't require the token

- **PASSWORD**: Protects short link creation by requiring password input
  - When enabled, calling `/api/shorten` requires:
    - `{ "password": "your-password" }` in request body
  - Local development environment (localhost) automatically bypasses password validation

- **NEXT_PUBLIC_PASSWORD_REQUIRED**: Controls whether the Web UI displays password input
  - Set to `true` to show the password input field in UI
  - Should be set to `true` when `PASSWORD` is configured
  - Read at build time, no runtime API request needed
  
- **ICP**: Required for mainland China users to display website filing information

## Local Development

### 1. Install EdgeOne CLI

```bash
npm install -g edgeone
```

### 2. Bind Project

```bash
edgeone pages link
```

Follow the prompts to select or create an EdgeOne Pages project.

### 3. Configure KV

Go to [EdgeOne Console](https://console.cloud.tencent.com/edgeone), find your bound project, and attach a KV namespace in the project settings.

### 4. Start Development Server

```bash
edgeone pages dev
```

Visit http://localhost:8088 to view the application.

### 5. Development Notes

- Changes to `functions/` directory auto-reload
- Changes to `app/` and `components/` require server restart
- Local development environment automatically bypasses API Token validation

---

## Related Links

- [EdgeOne Pages Documentation](https://pages.edgeone.ai/document/product-introduction)
- [EdgeOne KV Documentation](https://pages.edgeone.ai/document/kv-storage)
- [Issue Tracker](https://github.com/lm379/dwz/issues)

---

<p align="center">
  <sub>Built with EdgeOne Pages ⚡</sub>
</p>

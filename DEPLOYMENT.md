# Production deployment

The application is split across Vercel and Render because the scraper needs a
long-running container with Chromium and both APIs need persistent SQLite disks.

## 1. Frontend (Vercel)

The Angular project root is `poe-app/frontend`. Deploy it with:

```powershell
cd poe-app/frontend
npx vercel --prod
```

## 2. APIs (Render)

1. Push this repository to GitHub.
2. In Render, create a **Blueprint** from the repository. Render reads the
   root-level `render.yaml` and creates `poe-scraper` and `poe-api` on free
   instances.
3. Supply `OPENAI_API_KEY` and `GEMINI_API_KEY` when prompted.
4. Set `POE_ALLOWED_ORIGINS` to the frontend URL, for example
   `https://poe-scrapper.vercel.app`.
5. If Render assigns a scraper URL other than
   `https://poe-scraper.onrender.com`, update `POE_API_URL` on `poe-api` to
   `<actual-scraper-url>/find-poe/`.

The Blueprint uses Render's free instance type. Free services spin down while
idle and use an ephemeral filesystem. The bundled reference records are copied
into place again at startup, but API search history and scraper task state can
be lost after a restart, redeploy, or idle spin-down. Use paid instances with
persistent disks before treating this as a production deployment.

The free services store their runtime SQLite files under `/tmp`, which is
writable but ephemeral on Render.

## 3. Connect Vercel to the API

The frontend proxies same-origin `/api` requests to the deployed Render API via
`poe-app/frontend/vercel.json`:

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://poe-api-2faf.onrender.com/api/:path*" }
  ]
}
```

Then redeploy from `poe-app/frontend` with `npx vercel --prod`. Keeping `/api`
same-origin avoids exposing environment-specific API URLs in the Angular bundle.

## Required production variables

| Service | Variable | Purpose |
| --- | --- | --- |
| `poe-scraper` | `OPENAI_API_KEY` | OpenAI provider |
| `poe-scraper` | `GEMINI_API_KEY` | Gemini provider |
| `poe-api` | `POE_API_URL` | Scraper `/find-poe/` endpoint |
| `poe-api` | `POE_ALLOWED_ORIGINS` | Comma-separated allowed frontend origins |

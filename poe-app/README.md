# POE Intelligence

The application has three independent services:

- **Angular frontend** — `http://localhost:4200`
- **Express backend** — `http://localhost:8080`
- **Scraper API** — `http://localhost:8001`

The Express backend uses Node's SQLite driver, reads `backend/data/poe_test.db`, submits work to the scraper, polls the scraper task endpoint, and stores search history. No Python runtime is used by this application.

## Run frontend and backend separately

Open PowerShell window 1:

```powershell
cd "C:\Users\ashut\Documents\Codex\2026-08-28\build-x20\outputs\poe-app"
.\start-backend.ps1
```

Open PowerShell window 2:

```powershell
cd "C:\Users\ashut\Documents\Codex\2026-08-28\build-x20\outputs\poe-app"
.\start-frontend.ps1
```

Then open `http://localhost:4200`.

`start-backend.ps1` also checks and starts the Dockerized scraper from `C:\Users\ashut\Documents\GitHub\scraper`. It runs on port 8001 because another Docker project currently owns port 8000.

## Run everything together

```powershell
.\start.ps1
```

## Direct development commands

Frontend:

```powershell
cd frontend
npm install
npm start
```

Backend:

```powershell
cd backend
npm install
npm start
```

Optional backend settings: `POE_PORT`, `POE_DB_PATH`, `POE_API_URL`, `POE_POLL_MS`, and `POE_TIMEOUT_MS`.

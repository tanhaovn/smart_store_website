# Deploy Free: Vercel + Render

## 1) Push code to GitHub

- Put `frontend/` and `backend/` in the same repository.
- Commit and push.

## 2) Deploy Backend on Render

- Create `PostgreSQL` on Render first, then copy `External Database URL`.
- Keep this URL, you will use it as `DATABASE_URL` for backend.

- Create `Web Service` from your GitHub repo.
- Configure:
  - Root Directory: `backend`
  - Build Command: `pip install -r requirements.txt`
  - Start Command: `python -m flask --app run.py db upgrade && python run.py`
- Add Environment Variables:
  - `DATABASE_URL` = Render Postgres `External Database URL`
  - `SECRET_KEY` = random secret
  - `JWT_SECRET` = random secret
  - `FLASK_DEBUG` = `false`
  - `AUTO_SEED_DEMO_ACCOUNTS` = `true` for first deploy; keep it `true` if you want demo data to stay available on fresh instances
  - `FRONTEND_ORIGIN` = your Vercel domain (add after frontend deploy)
  - `CORS_ALLOWED_ORIGINS` = comma-separated frontend domains
- Deploy and copy backend URL, example: `https://smartvision-api.onrender.com`

## 3) Deploy Frontend on Vercel

- Import the same GitHub repo into Vercel.
- Configure:
  - Root Directory: `frontend`
  - Framework: Vite
- Add Environment Variables:
  - `VITE_API_BASE_URL` = your Render backend URL
  - `VITE_SOCKET_URL` = your Render backend URL
  - `VITE_BACKEND_URL` = your Render backend URL
- Deploy and copy frontend URL, example: `https://smartvision-shop.vercel.app`

## 4) Final CORS wiring

- Go back to Render service env vars.
- Set:
  - `FRONTEND_ORIGIN=https://smartvision-shop.vercel.app`
  - `CORS_ALLOWED_ORIGINS=https://smartvision-shop.vercel.app,https://www.smartvision-shop.vercel.app`
- Redeploy Render.

## 5) Resulting domains

- Frontend domain: `https://<project>.vercel.app`
- Backend domain: `https://<project>.onrender.com`

## 6) One database source of truth

If you want Navicat and the web app to always show the same data, both must connect to the same database server and the same `DATABASE_URL`. That is the only way to get instant consistency for changes made in Navicat or in the web app.

Use the sync scripts below only when you are migrating data between two different databases. They are not live bidirectional replication.

Run from `backend/` with these env vars:

- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DB`
- `POSTGRES_URL` (use `?sslmode=require`)

One-time migration from local MySQL to cloud Postgres:

- `python scripts/sync_mysql_to_postgres.py`
- or run `scripts/sync_to_cloud.bat`

Repeat snapshot sync from local MySQL to cloud Postgres:

- `set AUTO_SYNC_INTERVAL_SECONDS=60` (optional, default 60s)
- run `scripts/auto_sync_to_cloud.bat`

One-time migration from cloud Postgres back to local MySQL:

- `python scripts/sync_postgres_to_mysql.py`
- or run `scripts/sync_to_local.bat`

Notes:

- Both scripts are full replace syncs (truncate + insert).
- Each sync auto-creates a JSON backup of the destination DB in `backend/backups/` before truncate.
- For production, prefer a single cloud Postgres database and point Navicat to that same database.

## Notes

- `frontend/vercel.json` is included for SPA routing so deep links do not 404.
- Backend already reads `PORT` from Render and supports CORS + Socket.IO origins from env.

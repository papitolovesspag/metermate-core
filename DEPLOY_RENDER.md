# Deploy MeterMate on Render (Main Branch)

This repo supports monorepo deployment on Render from `main` using [render.yaml](./render.yaml).

## 1) Push code to GitHub

Make sure `render.yaml` is in the repo root.

## 2) Create Blueprint in Render

- In Render dashboard, click **New** -> **Blueprint**.
- Select this repo and the `main` branch.
- Render will create:
  - `metermate-backend`
  - `metermate-python-engine`
  - `metermate-frontend`

## 3) Set environment variables

### Backend (`metermate-backend`)

- `DATABASE_URL` (Neon connection string)
- `JWT_SECRET`
- `PYTHON_ENGINE_URL` = `https://metermate-python-engine.onrender.com`
- `FRONTEND_URL` = `https://metermate-frontend.onrender.com`
- `INTERSWITCH_CLIENT_ID`
- `INTERSWITCH_CLIENT_SECRET`
- `INTERSWITCH_MERCHANT_CODE`
- `INTERSWITCH_DEMO_MODE` = `true` (or `false` for strict live verification)

### Frontend (`metermate-frontend`)

- `VITE_API_BASE_URL` = `https://metermate-backend.onrender.com/api`
- `VITE_INTERSWITCH_MERCHANT_CODE`
- `VITE_INTERSWITCH_PAY_ITEM_ID`
- `VITE_INTERSWITCH_MODE` = `TEST` (or `LIVE`)

### Python (`metermate-python-engine`)

- `PYTHON_VERSION` is pinned to `3.12.8` via `render.yaml` and `python-engine/runtime.txt`.
- No extra env vars are required for basic startup.

## 4) Verify after deploy

- Backend health: `https://metermate-backend.onrender.com/`
- Python health: `https://metermate-python-engine.onrender.com/`
- Frontend loads and can call backend APIs.

If backend logs show DB init failure, re-check `DATABASE_URL` and Neon allowlist/credentials.

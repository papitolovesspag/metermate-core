# Run MeterMate Locally (Main Branch)

## Prerequisites

- Node.js 22.x
- PostgreSQL database (or Neon DB URL)
- Python 3.10+ (for the calculation engine)

## 1) Fix PowerShell npm command issues (one-time)

If `npm` is blocked in PowerShell, run:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Or use `cmd /c npm ...` instead of `npm ...`.

## 2) Install dependencies

```powershell
cd backend
npm install

cd ..\metermate-frontend
npm install --include=dev
```

## 3) Configure environment files

```powershell
cd ..\backend
copy .env.example .env

cd ..\metermate-frontend
copy .env.example .env
```

Set in `backend/.env`:

- `DATABASE_URL`
- `JWT_SECRET`
- `PYTHON_ENGINE_URL=http://localhost:8001`

Set in `metermate-frontend/.env`:

- `VITE_API_BASE_URL=http://localhost:5000/api`

## 4) Recreate Python virtual environment

```powershell
cd ..\python-engine
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
```

## 5) Run the 3 services in 3 terminals

Terminal A:

```powershell
cd python-engine
.venv\Scripts\python.exe main.py
```

Terminal B:

```powershell
cd backend
npm run dev:plain
```

Terminal C:

```powershell
cd metermate-frontend
npm run dev
```

## Common crash fixes

- `vite ... spawn EPERM`: use Node 22 and run `npm install --include=dev` in frontend.
- `nodemon not recognized`: use `npm run dev:plain` or install backend dependencies.
- `DATABASE_URL is missing`: set `backend/.env` correctly before starting backend.

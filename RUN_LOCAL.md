# Run MeterMate Locally (Bash + Main Branch)

## Prerequisites

- Node.js 22.x
- Python 3.14 or 3.12 (CPython)
- PostgreSQL or Neon `DATABASE_URL`

## 1) Install Node dependencies

```bash
cd backend
npm install

cd ../metermate-frontend
npm install --include=dev
```

## 2) Configure env files

```bash
cd ../backend
cp .env.example .env

cd ../metermate-frontend
cp .env.example .env
```

Set in `backend/.env`:

- `DATABASE_URL`
- `JWT_SECRET`
- `PYTHON_ENGINE_URL=http://localhost:8001`

Set in `metermate-frontend/.env`:

- `VITE_API_BASE_URL=http://localhost:5000/api`

## 3) Create/recreate Python venv

```bash
cd ../python-engine
python -m venv .venv
source .venv/Scripts/activate
python -m pip install --upgrade pip setuptools wheel
python -m pip install --prefer-binary -r requirements.txt
```

## 4) Run all 3 services in separate terminals

Terminal A:

```bash
cd python-engine
source .venv/Scripts/activate
python main.py
```

Terminal B:

```bash
cd backend
npm run dev:plain
```

Terminal C:

```bash
cd metermate-frontend
npm run dev
```

## Common crash fixes

- `No matching distribution found for pydantic-core`: recreate venv, then run install with `--prefer-binary` as above.
- `vite ... spawn EPERM`: fixed by native config loader; reinstall frontend deps if needed.
- `DATABASE_URL is missing`: backend starts but DB init fails until env is set.

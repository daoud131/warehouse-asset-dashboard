# Stockroom — Warehouse Asset Register

A small full-stack prototype built with React, Flask, SQLite and a local image store.

## Architecture

- **React + Vite**: responsive browser UI.
- **Flask REST API**: validation, asset operations and image serving.
- **SQLite**: stores asset ID, category, image filename and server-created timestamp.
- **Uploads directory**: stores image files separately from relational data.

The API is designed as a boundary between the UI and storage. A future automated source (barcode scanner, ERP, IoT device or warehouse system) can submit records to `POST /api/assets` without changing the dashboard.

## Run locally

Requirements: Python 3.10+ and Node.js 18+.

### 1. Start the backend

```bash
cd backend
python -m venv .venv
# Windows:
.venv\\Scripts\\activate
# macOS/Linux:
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

The API listens on `http://localhost:5000`. SQLite database and uploaded photographs are created automatically in `backend/`.

### 2. Start the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal (usually `http://localhost:5173`).

## Access from other devices on the warehouse LAN

1. Connect the server computer and phones/tablets to the same trusted warehouse network.
2. Find the server computer's LAN IPv4 address (for example `192.168.1.20`).
3. Keep Flask listening on `0.0.0.0` (the default in this prototype).
4. Start Vite with `npm run dev -- --host 0.0.0.0`.
5. Allow the required ports through the server firewall for the private warehouse network.
6. On another device, visit `http://SERVER-LAN-IP:5173`.

For a more permanent deployment, build the frontend with `npm run build`, serve `frontend/dist` from Flask or a reverse proxy, and expose one internal URL. Use a production WSGI server (such as Waitress on Windows or Gunicorn on Linux) rather than Flask's development server.

## REST API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/assets?q=WH-01` | List assets; optional partial Asset ID search |
| POST | `/api/assets` | Create asset using `multipart/form-data` |
| GET | `/api/assets/{id}` | Retrieve one record |
| GET | `/api/uploads/{filename}` | Retrieve uploaded photograph |

`POST /api/assets` form fields:
- `asset_id` (required, unique)
- `category` (required)
- `photo` (optional image file)

The backend creates `created_at` in UTC. The UI formats that timestamp using the browser's local timezone.

## Production hardening before real warehouse use

This is an evaluation prototype, not a secured production deployment. Before operational use:
- Add operator authentication and role-based access.
- Restrict CORS and network/firewall access to trusted subnets.
- Add HTTPS, audit logging, backups and a retention policy.
- Validate actual image content (not only filename extension), add malware scanning if appropriate, and consider image dimension limits.
- Use migrations and a managed database if write volume or concurrent access grows.
- Add pagination and server-side filtering for large inventories.
- Define whether Asset IDs are globally unique and whether records can be edited or archived.

## Automated data integration

Keep the REST API as the stable integration contract. Future devices or upstream applications can POST the same asset fields. For reliable integrations, add API keys/service accounts, idempotency keys, source-system identifiers, request validation and an integration event log.

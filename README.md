# Fleet Tracker Frontend

Admin dashboard for the Fleet Tracker Indomobil GPS tracking system.

## Quick Start

```bash
bun install
bun run dev
```

## Configuration

Edit `.env` to set the backend URL:

```env
VITE_BACKEND_URL=http://localhost:3000
```

For remote server:
```env
VITE_BACKEND_URL=http://192.168.1.100:3000
```

## Default Login

- **Username:** `admin`
- **Password:** `admin123`

## Pages

- **Dashboard** - Overview of vehicles, devices, and system status
- **Vehicles** - Vehicle management (CRUD)
- **Devices** - GPS device management
- **System** - Server health and monitoring

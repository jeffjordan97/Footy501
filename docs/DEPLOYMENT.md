# Footy 501 - Deployment Guide (Railway + Neon)

**Last Updated**: March 2026

This guide walks through deploying Footy 501 with:
- **Server**: Railway (Node.js)
- **Client**: Vercel (static site)
- **Database**: Neon (serverless PostgreSQL)

**Estimated time**: 30 minutes
**Cost**: $0/month (free tiers)

---

## Prerequisites

Before you begin, ensure you have:

- [ ] A GitHub account with the Footy 501 repo pushed
- [ ] Node.js 22+ and pnpm installed locally
- [ ] The project builds successfully locally (`cd server && pnpm build` and `cd client && pnpm build`)

---

## Step 1: Create the Database (Neon)

### 1.1 Sign up and create a project

1. Go to [neon.tech](https://neon.tech) and sign up (GitHub SSO works)
2. Click **Create Project**
3. Name it `footy501`
4. Select the region closest to your users (e.g. `eu-west-1` for Europe, `us-east-1` for US)
5. Click **Create Project**

### 1.2 Copy the connection string

1. On the project dashboard, find the **Connection string**
2. Make sure the format is: `postgresql://username:password@host/footy501?sslmode=require`
3. Copy this — you'll need it for the server

> **Important**: Neon connection strings include `?sslmode=require` by default. The server is configured to use SSL in production via `NODE_ENV=production`.

### 1.3 Run database migrations

From your local machine:

```bash
cd server
DATABASE_URL="postgresql://username:password@host/footy501?sslmode=require" pnpm db:migrate
```

### 1.4 Seed the database with player data

```bash
# Download player data (if not already done)
DATABASE_URL="postgresql://username:password@host/footy501?sslmode=require" pnpm db:download

# Import players into the database
DATABASE_URL="postgresql://username:password@host/footy501?sslmode=require" pnpm db:seed
```

> **Tip**: You can also set `DATABASE_URL` as an environment variable instead of prefixing each command.

---

## Step 2: Deploy the Server (Railway)

### 2.1 Sign up and create a project

1. Go to [railway.app](https://railway.app) and sign up (GitHub SSO works)
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your Footy 501 repository
4. Railway detects a monorepo — set the **Root Directory** to `server`

### 2.2 Configure the build

Railway auto-detects Node.js. Verify or set these:

| Setting | Value |
|---------|-------|
| **Root Directory** | `server` |
| **Build Command** | `pnpm install && pnpm build` |
| **Start Command** | `node dist/index.js` |

### 2.3 Set environment variables

In the Railway service settings, go to **Variables** and add:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Your Neon connection string (from Step 1.2) |
| `JWT_SECRET` | Generate with: `openssl rand -base64 48` |
| `CLIENT_URL` | Leave blank for now — set after deploying client (Step 3) |

### 2.4 Deploy

1. Click **Deploy** (or it may auto-deploy)
2. Wait for the build to complete (2-3 minutes)
3. Railway assigns a public URL like `footy501-server-production.up.railway.app`
4. Test it: visit `https://your-railway-url/api/health`
   - You should see: `{"status":"ok","database":"connected"}`

### 2.5 Note the server URL

Copy the Railway public URL — you'll need it for the client and for `CLIENT_URL`.

---

## Step 3: Deploy the Client (Vercel)

### 3.1 Sign up and import project

1. Go to [vercel.com](https://vercel.com) and sign up (GitHub SSO works)
2. Click **Add New** → **Project** → **Import Git Repository**
3. Select your Footy 501 repository

### 3.2 Configure the build

| Setting | Value |
|---------|-------|
| **Root Directory** | `client` |
| **Framework Preset** | Vue.js |
| **Build Command** | `pnpm build` |
| **Output Directory** | `dist` |
| **Install Command** | `pnpm install` |

### 3.3 Set environment variables

In the Vercel project settings, add:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | Your Railway server URL (e.g. `https://footy501-server-production.up.railway.app`) |

> **Important**: Do NOT include a trailing slash. The client appends `/api/...` paths to this URL.

### 3.4 Deploy

1. Click **Deploy**
2. Wait for the build to complete (1-2 minutes)
3. Vercel assigns a URL like `footy501.vercel.app`

### 3.5 Note the client URL

Copy the Vercel URL — you need it for the next step.

---

## Step 4: Connect Client ↔ Server

### 4.1 Update CLIENT_URL on Railway

1. Go back to your Railway service → **Variables**
2. Set `CLIENT_URL` to your Vercel URL (e.g. `https://footy501.vercel.app`)
3. Railway automatically redeploys with the updated variable

> This configures CORS so the client can make API requests and establish Socket.IO connections to the server.

### 4.2 Verify the connection

1. Visit your Vercel URL
2. The app should load
3. Try creating a local game — it should connect to the server via the Railway URL

---

## Step 5: Verify Everything Works

### Health check

```bash
curl https://your-railway-url/api/health
# Expected: {"status":"ok","database":"connected"}
```

### Client loads

Visit your Vercel URL — the home page should render.

### Game works

1. Start a local game from the client
2. Verify player search returns results (database is seeded)
3. Play a turn — verify scoring works

### Socket.IO connects

Open browser DevTools → Network → WS tab. You should see a WebSocket connection to the Railway server.

---

## Troubleshooting

### "database: disconnected" in health check

- Verify `DATABASE_URL` is correct in Railway variables
- Check that Neon project is active (free tier auto-suspends after 5 min idle — first request wakes it in 1-2s)
- Ensure the connection string includes `?sslmode=require`

### CORS errors in browser console

- Verify `CLIENT_URL` in Railway exactly matches the Vercel URL (including `https://`, no trailing slash)
- Redeploy the Railway service after changing `CLIENT_URL`

### Socket.IO won't connect

- Check browser console for WebSocket errors
- Verify `VITE_API_URL` in Vercel points to the Railway URL
- Railway supports WebSockets natively — no special config needed

### Client shows blank page

- Check Vercel build logs for errors
- Verify `VITE_API_URL` is set (without it, API calls go to relative paths which 404 on Vercel)

### Railway service sleeps (cold starts)

- Free tier sleeps after ~15 minutes of inactivity
- First request takes 5-10 seconds to wake up
- Active games keep the service awake
- Upgrade to Hobby plan ($5/month) to remove sleep

### Database connection timeout

- Neon free tier auto-suspends after 5 minutes of inactivity
- First connection after suspend takes 1-2 seconds
- This is normal — subsequent requests are fast

---

## Custom Domain (Optional)

### Vercel (client)

1. Go to Vercel project → **Settings** → **Domains**
2. Add your domain (e.g. `footy501.com`)
3. Follow DNS instructions (CNAME or nameserver delegation)

### Railway (server)

1. Go to Railway service → **Settings** → **Networking** → **Custom Domain**
2. Add your domain (e.g. `api.footy501.com`)
3. Follow DNS instructions

### After adding custom domains

Update these environment variables:
- Railway: `CLIENT_URL` → `https://footy501.com`
- Vercel: `VITE_API_URL` → `https://api.footy501.com`

---

## Environment Variables Summary

### Server (Railway)

| Variable | Required | Example |
|----------|----------|---------|
| `NODE_ENV` | Yes | `production` |
| `PORT` | No | Railway sets automatically |
| `DATABASE_URL` | Yes | `postgresql://user:pass@host/footy501?sslmode=require` |
| `JWT_SECRET` | Yes | `openssl rand -base64 48` |
| `CLIENT_URL` | Yes | `https://footy501.vercel.app` |

### Client (Vercel)

| Variable | Required | Example |
|----------|----------|---------|
| `VITE_API_URL` | Yes | `https://footy501-server-production.up.railway.app` |

---

## Architecture in Production

```
┌──────────────────┐     HTTPS/WSS     ┌──────────────────┐
│                  │ ◄──────────────── │                  │
│   Vercel CDN     │                    │   Browser        │
│   (Vue 3 SPA)    │ ──────────────── │   (User)         │
│                  │     Static        │                  │
└──────────────────┘     Assets        └────────┬─────────┘
                                                │
                                                │ HTTPS + WSS
                                                │ (API + Socket.IO)
                                                ▼
                                       ┌──────────────────┐
                                       │                  │
                                       │   Railway        │
                                       │   (Express +     │
                                       │    Socket.IO)    │
                                       │                  │
                                       └────────┬─────────┘
                                                │
                                                │ PostgreSQL (SSL)
                                                ▼
                                       ┌──────────────────┐
                                       │                  │
                                       │   Neon           │
                                       │   (PostgreSQL)   │
                                       │                  │
                                       └──────────────────┘
```

---

## Known Limitations (Free Tier)

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| Railway sleeps after 15min idle | Cold start delay (5-10s) | Upgrade to Hobby ($5/mo) |
| Neon suspends after 5min idle | First DB query slow (1-2s) | Auto-wakes on request |
| In-memory game state lost on restart | Active games interrupted | Accept for hobby; persist to DB for production |
| Single server instance | No horizontal scaling | Fine for hundreds of concurrent users |
| 500 build hours/month (Railway) | Build limit | Sufficient for hobby use |

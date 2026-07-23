# Deploying Cerberus

Cerberus has two halves that deploy differently:

- **Frontend** (`web/`) — a static Next.js app. Deploys to Vercel.
- **Backend** (`cerberus/`) + **SigNoz** + **MCP server** — a FastAPI service plus a
  container stack. Runs locally via Foundry (`foundryctl cast -f casting.yaml`); Vercel
  cannot host it (serverless, no persistent containers).

## Frontend → Vercel

The build has **no required environment variables** — every API call is a client-side
`fetch`, and the API base URL falls back to `http://localhost:8030`.

1. Import `CodeMuscle/cerberus` in Vercel.
2. **Set Root Directory to `web`** — the Next app is not at the repo root. This is the one
   setting that, if missed, fails the deploy with *"No Next.js version detected."* The
   framework preset auto-detects as Next.js once the root is `web`.
3. Deploy. Build command and output directory stay at their Next.js defaults.

### Optional: point the deployed dashboard at a live backend

| Variable | Value | When |
|---|---|---|
| `NEXT_PUBLIC_CERBERUS_API` | public URL of the FastAPI backend | only if you want live data on the deployed site |

It is `NEXT_PUBLIC_`, so it is inlined **at build time** — set it before deploying, then
redeploy. Without it, the site builds and renders but the dashboard shows a graceful
"can't reach the API" state instead of live incidents.

### Do not put backend secrets in Vercel

`SIGNOZ_API_KEY` and `ANTHROPIC_API_KEY` are **backend-only**. The frontend never reads
them; adding them to Vercel (especially as `NEXT_PUBLIC_`) would expose them in the public
JS bundle. They live only in the backend's `.env`.

## Making the deployed dashboard live (optional)

The deployed frontend needs the backend reachable at a public URL:

- **Quickest (demo):** tunnel the local backend — `cloudflared tunnel --url http://localhost:8030`
  (or `ngrok http 8030`) — and set `NEXT_PUBLIC_CERBERUS_API` to the tunnel URL.
- **Persistent:** host the FastAPI app on Railway / Render / Fly, set its `SIGNOZ_MCP_URL`,
  `SIGNOZ_API_KEY`, and `ANTHROPIC_API_KEY`, then point `NEXT_PUBLIC_CERBERUS_API` at it.

For the hackathon, the common split is Vercel for the shareable landing + dashboard shell,
and a local run (or tunnel) for the live-data demo.

## Backend `.env`

The backend reads these (never committed — `.env` is gitignored):

| Variable | Purpose | Default |
|---|---|---|
| `SIGNOZ_API_KEY` | auth for the SigNoz MCP server | — (required for live reads) |
| `SIGNOZ_MCP_URL` | MCP endpoint | `http://localhost:8000/mcp` |
| `ANTHROPIC_API_KEY` | copilot LLM (Claude); falls back to local Ollama if unset | — |
| `CERBERUS_SERVICE` | observed service name | `cerberus-demo-agent` |
| `CERBERUS_ORIGINS` | allowed CORS origins | `http://localhost:3000` |

When deploying the frontend to Vercel, add the Vercel URL to `CERBERUS_ORIGINS` on the
backend so the browser can call it cross-origin.

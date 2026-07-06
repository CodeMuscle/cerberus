# Cerberus sandbox — SigNoz + OpenTelemetry, day-1 ready

Goal: get real agent traces into SigNoz and confirm you can **read them back via the
API** (the thing Cerberus's copilot depends on) — *before* the hackathon starts.

## 1. Start SigNoz (self-hosted, Docker)

Docker Desktop must be running. Follow the current official quickstart —
<https://signoz.io/docs/install/docker/> — it's roughly:

```bash
git clone -b main https://github.com/SigNoz/signoz.git
cd signoz/deploy/docker
docker compose up -d
```

Open the UI (newer builds: <http://localhost:8080>, older: <http://localhost:3301>),
create the first account. The OTel collector listens for OTLP gRPC on **:4317**.

> 8GB M2 Air: SigNoz + ClickHouse is heavy. Watch memory; if it thrashes, use the
> **SigNoz Cloud 30-day trial** instead and point `OTEL_EXPORTER_OTLP_ENDPOINT` +
> `SIGNOZ_URL`/`SIGNOZ_API_KEY` at it.

## 2. Run the demo agent

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --port 8090
```

Generate traffic — one healthy run, one incident:

```bash
curl "localhost:8090/run"
curl "localhost:8090/run?fail=1"     # forced failure + token/cost spike
```

In SigNoz → **Services** you should see `cerberus-demo-agent`; open a trace to see
`agent.run → extract_claims → judge`, with the GenAI attributes on `judge`
(`gen_ai.request.model`, `gen_ai.usage.input_tokens/output_tokens`, `cost_usd`).

## 3. Confirm the query API (the important one)

```bash
python query_signoz.py
```

If it returns spans — the copilot's data path is proven. If it 404s / shape-mismatches
(expected across versions), open the SigNoz **Trace explorer**, build the same
service filter, then copy the real request body from the browser Network tab into
`query_signoz.py`. **Pinning this API is the single most valuable prep task.**

## Files
- `otel.py` — OTLP → SigNoz tracer setup (`:4317`).
- `app.py` — toy agent (extract → judge → result) emitting LLM spans; `?fail=1` = incident.
- `query_signoz.py` — SigNoz query-API probe (verify endpoint/auth day-1).
- `requirements.txt` — OTel + FastAPI deps.

## Day-1 checklist
- [ ] SigNoz up; first account created.
- [ ] `cerberus-demo-agent` visible in Services; `judge` span shows token attrs.
- [ ] `query_signoz.py` returns real spans (endpoint/auth pinned).
- [ ] Swap the toy agent for the real Crosscheck/Argus pipeline (same `otel.py` import).

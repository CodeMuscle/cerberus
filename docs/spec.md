# Cerberus — an AI SRE copilot on SigNoz

**Date:** 2026-07-06 (prep for *Agents of SigNoz*, Jul 20–26 2026)
**Track:** 1 — AI & Agent Observability
**Name:** **Cerberus** (the three-headed watchdog → the three signals it guards: traces · metrics · logs). Alts: **Augur** (reads the signs), **Vigil**.
**One-liner:** Instrument any AI-agent stack into SigNoz, then let an LLM copilot *read* those traces/metrics and explain — in plain English — what broke, what it cost, and what to do.

---

## Problem

AI agents fail in ways classic monitoring misses: a tool call silently retries 5×, a model’s token cost spikes 4× on one bad prompt, a judge step times out, an agent loops. Teams either fly blind or drown in raw spans. Observability platforms show the data; nobody reads it *for* you.

## The concept (hits all three theme keywords at once)

*agent-native observability · SRE copilot · AI/LLM observability dashboard* — one project, three pillars:

1. **Emit** — OpenTelemetry instrumentation of an AI-agent workload → SigNoz. Every LLM call, tool call, retry, and failure becomes a span with token count, cost, latency, model, and prompt/response size.
2. **Dashboard** — a SigNoz dashboard (Query Builder) for agent health: cost per run, p95 latency, tool error rate, token burn over time, top failing steps.
3. **Copilot (the wow)** — an LLM agent that *consumes* SigNoz data via its query API and answers "what happened in run X?" / "why did cost spike at 14:03?" in plain English, citing the exact traces. **Agent-native observability = an agent observing agents.**

**Why it wins "Best Use of SigNoz":** the project both *produces* telemetry (OTel → SigNoz) **and** *consumes* it (copilot reads SigNoz’s query API). Most entries only do one side.

## What gets observed (unfair advantage — reuse existing work)

The agent being watched = **Crosscheck / Argus** (already built, Python/FastAPI/local-LLM). A real multi-step agent workload (extract → structural filter → LLM judge → result) to instrument on day 1 — no need to build a demo agent from scratch. Any OTel-instrumentable app works; this one is ready.

## Architecture

```
[ AI agent workload ]  --OTel SDK-->  [ OTel Collector ]  -->  [ SigNoz (ClickHouse) ]
  (Crosscheck/Argus,                                              traces · metrics · logs
   LLM + tool spans)                                                     |
                                                                         | query API
                                                            [ Cerberus copilot (FastAPI + LLM) ]
                                                                         |
                                                              [ Chat / incident panel UI ]
```

**Units (keep each small + testable):**
- `instrument/` — OTel setup + LLM-span helpers (token, cost, model attrs). Follows OpenLLMetry / OpenInference semantic conventions so spans are standard, not bespoke.
- `signoz_client/` — thin wrapper over SigNoz’s query API (fetch traces/metrics for a window/run). Injectable → unit-testable offline with recorded fixtures.
- `copilot/` — the LLM analyst: takes a question + fetched telemetry → grounded answer citing trace ids. Pure logic + injected LLM, offline-testable (same pattern as Crosscheck’s judge).
- `api.py` + `ui/` — FastAPI + a chat/incident panel (reuse the refined Argus UI shell + tokens).
- `dashboard/` — exported SigNoz dashboard JSON (so it’s reproducible, not click-built).

## Tech stack
SigNoz self-hosted (Docker) · OpenTelemetry Python SDK + OTel Collector · OpenLLMetry/OpenInference LLM conventions · SigNoz query API · FastAPI · a copilot LLM (local Llama for offline demo, or hosted for quality) · ClickHouse (via SigNoz, not touched directly).

## MVP scope (7 days) — judged on demo + README + presentation
- **Day 1–2:** SigNoz up in Docker; instrument the agent; confirm spans land (token/cost/latency).
- **Day 3:** SigNoz dashboard (Query Builder) for the 5 key agent-health metrics; export JSON.
- **Day 4–5:** `signoz_client` + `copilot` — question → fetch telemetry → grounded plain-English answer with trace citations. Offline tests on recorded fixtures.
- **Day 6:** chat/incident UI (reuse Argus shell); one "inject a failure → copilot explains it" scripted demo.
- **Day 7:** README, 3-min video, blog (Best-Blogs side track), social posts (top-10 side track). Polish UX + presentation (both are explicit judging axes).

## Judging-criteria map (the 6 axes, addressed on purpose)
- **Potential impact** — every AI-agent team needs this; agents-observing-agents is where the industry is going.
- **Creativity** — a copilot that *reads* observability data, not just emits it.
- **Technical excellence** — standards-based OTel spans + a query-API consumer + tests.
- **Best Use of SigNoz** — emits *and* consumes SigNoz; ships a reusable dashboard.
- **UX** — clean incident panel + plain-English answers (reuse the refined Argus design system).
- **Presentation** — tight 3-min demo: inject failure → dashboard spikes → ask copilot → it explains.

## Demo (the money shot)
Trigger a bad agent run (force a tool to fail / a prompt to blow up cost) → the SigNoz dashboard spikes live → open Cerberus, ask *"what just went wrong?"* → it answers: *"Run 8f2 failed — the judge step timed out 3×, token cost jumped 4× on an oversized prompt; here are the 3 spans."*

## Risks / unknowns to resolve DURING prep (before Jul 20)
- SigNoz **query API** shape + auth for programmatic reads (the copilot depends on it) — verify early.
- LLM span conventions: pick OpenLLMetry vs OpenInference; confirm they render well in SigNoz traces.
- Local-LLM copilot quality on trace-reasoning — may need a hosted model for the demo (offline is a nice-to-have, not the hero here).
- Docker/SigNoz resource load on an 8GB M2 Air — test the self-host footprint now; consider SigNoz Cloud 30-day trial as fallback.

## Out of scope (YAGNI for the hackathon)
Auto-remediation/actions, multi-tenant, alerting rules engine, historical anomaly ML. Copilot *explains*; it doesn’t *act*.

## Prep checklist (do before Day 1)
- [ ] SigNoz self-hosted in Docker; send test telemetry; find the query API.
- [ ] OTel Python auto-instrumentation on a toy FastAPI app; then on Crosscheck/Argus.
- [ ] Pick + test an LLM-span convention (OpenLLMetry/OpenInference).
- [ ] Build one SigNoz dashboard by hand; export its JSON.
- [ ] Form a team of ≤4 (prize is per member).

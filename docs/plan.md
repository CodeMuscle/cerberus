# Cerberus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An AI SRE copilot that reads an AI-agent's SigNoz telemetry and explains, in plain English with trace citations, what failed / what it cost / what to do.

**Architecture:** One runtime-unknown — the SigNoz query-API JSON shape — is isolated in a single `span_from_signoz()` adapter. Everything downstream (`summarize`, `explain`) is pure and offline-testable via injected transport + injected LLM (the pattern from Crosscheck's injectable judge). Live SigNoz is only touched by the default transport.

**Tech Stack:** Python 3.11+, FastAPI, OpenTelemetry (emit side — already in `sandbox/`), SigNoz query API (read side), a copilot LLM (local Llama offline, hosted for demo quality), pytest.

## Global Constraints

- The SigNoz response shape is **unverified until Day-1**. Only `model.span_from_signoz()` and the test fixtures depend on it; when the real shape differs, fix those two spots and nothing else.
- All logic (`summarize`, `explain`) is tested with **no network and no LLM** — transport and analyst are injected.
- The observed workload is the existing Crosscheck/Argus agent (reuse `sandbox/otel.py` to instrument it); Cerberus only *reads*.
- Reuse the refined Argus UI shell/tokens for the panel.
- Commits: no Claude/Anthropic co-author trailer.
- Project dir `~/cerberus/` (git init in Task 1). Run tests: `python -m pytest`.

---

### Task 1: Scaffold + telemetry model

**Files:**
- Create: `cerberus/__init__.py` (empty), `cerberus/model.py`, `tests/test_model.py`
- Create: `pyproject.toml` (or just a venv + `pip install fastapi uvicorn pytest`)

**Interfaces:**
- Produces: `Span(trace_id, span_id, name, service, duration_ms, status, attrs)` (frozen dataclass); `span_from_signoz(d: dict) -> Span` (the ONLY SigNoz-shape-dependent function).

- [ ] **Step 1: Write the failing test**

```python
# tests/test_model.py
from cerberus.model import span_from_signoz, Span

# A best-guess SigNoz span row — REPLACE this fixture with a real row from your
# SigNoz Trace explorer (browser Network tab) on Day-1; adjust span_from_signoz to match.
RAW = {
    "traceID": "abc123", "spanID": "s1", "name": "judge", "serviceName": "cerberus-demo-agent",
    "durationNano": 5_000_000, "statusCode": 2,  # 2 = error in OTel
    "tagMap": {"gen_ai.usage.input_tokens": "4000", "gen_ai.usage.cost_usd": "0.12"},
}

def test_span_from_signoz_maps_core_fields():
    s = span_from_signoz(RAW)
    assert isinstance(s, Span)
    assert s.trace_id == "abc123" and s.name == "judge"
    assert s.service == "cerberus-demo-agent"
    assert s.duration_ms == 5.0          # nanos -> ms
    assert s.status == "error"           # statusCode 2 -> "error"
    assert s.attrs["gen_ai.usage.input_tokens"] == "4000"
```

- [ ] **Step 2: Run — expect FAIL** (`No module named 'cerberus'`).
Run: `python -m pytest tests/test_model.py -q`

- [ ] **Step 3: Implement**

```python
# cerberus/model.py
"""Telemetry model + the single SigNoz-shape adapter.

span_from_signoz is the ONE place that knows SigNoz's JSON. Everything else uses
the clean Span. When the real SigNoz shape differs from the guess, fix only here.
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class Span:
    trace_id: str
    span_id: str
    name: str
    service: str
    duration_ms: float
    status: str          # "ok" | "error" | "unset"
    attrs: dict


def _status(code):
    return {1: "ok", 2: "error"}.get(code, "unset")  # OTel StatusCode: 1 OK, 2 ERROR


def span_from_signoz(d: dict) -> Span:
    return Span(
        trace_id=d.get("traceID") or d.get("trace_id", ""),
        span_id=d.get("spanID") or d.get("span_id", ""),
        name=d.get("name", ""),
        service=d.get("serviceName") or d.get("service.name", ""),
        duration_ms=(d.get("durationNano", 0) or 0) / 1_000_000,
        status=_status(d.get("statusCode", d.get("status_code", 0))),
        attrs=d.get("tagMap") or d.get("attributes") or {},
    )
```

- [ ] **Step 4: Run — expect PASS.**
- [ ] **Step 5: Commit**
```bash
cd ~/cerberus && git init -q && git add -A && git commit -q -m "feat(cerberus): telemetry model + SigNoz span adapter"
```

---

### Task 2: SigNoz client (injectable transport)

**Files:**
- Create: `cerberus/signoz_client.py`, `tests/test_signoz_client.py`

**Interfaces:**
- Consumes: `model.span_from_signoz`.
- Produces: `fetch_spans(service, minutes=15, transport=None) -> list[Span]`. `transport() -> list[dict]` returns raw SigNoz span rows; default transport calls SigNoz (adapted from `sandbox/query_signoz.py`).

- [ ] **Step 1: Write the failing test**

```python
# tests/test_signoz_client.py
from cerberus.signoz_client import fetch_spans

RAW_ROWS = [
    {"traceID":"t1","spanID":"a","name":"agent.run","serviceName":"svc","durationNano":9_000_000,"statusCode":2,"tagMap":{}},
    {"traceID":"t1","spanID":"b","name":"judge","serviceName":"svc","durationNano":5_000_000,"statusCode":2,"tagMap":{"gen_ai.usage.input_tokens":"4000"}},
]

def test_fetch_spans_parses_via_injected_transport():
    spans = fetch_spans("svc", transport=lambda: RAW_ROWS)
    assert len(spans) == 2
    assert spans[1].name == "judge" and spans[1].status == "error"
```

- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Implement**

```python
# cerberus/signoz_client.py
"""Read spans from SigNoz. The HTTP call is injectable so logic tests need no network.

Default transport posts to SigNoz's query_range API (see sandbox/query_signoz.py).
On Day-1, verify the endpoint/auth/body against your SigNoz version, then paste the
working request here — it is the only network-dependent code in Cerberus.
"""
import json, os, time, urllib.request

from cerberus.model import span_from_signoz


def _default_transport(service, minutes):
    base = os.getenv("SIGNOZ_URL", "http://localhost:8080")
    key = os.getenv("SIGNOZ_API_KEY", "")
    now = int(time.time() * 1000)
    body = {"start": now - minutes*60_000, "end": now,
            "compositeQuery": {"queryType": "builder", "panelType": "list",
              "builderQueries": {"A": {"dataSource": "traces", "queryName": "A",
                "aggregateOperator": "noop",
                "filters": {"op": "AND", "items": [{"key": {"key": "service.name"}, "op": "=", "value": service}]},
                "limit": 50}}}}
    req = urllib.request.Request(base + "/api/v4/query_range", data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", **({"SIGNOZ-API-KEY": key} if key else {})}, method="POST")
    with urllib.request.urlopen(req, timeout=15) as r:
        data = json.load(r)
    # Day-1: adjust this extraction to the real response path.
    return data.get("data", {}).get("result", [{}])[0].get("list", [])


def fetch_spans(service, minutes=15, transport=None):
    rows = transport() if transport else _default_transport(service, minutes)
    return [span_from_signoz(r) for r in rows]
```

- [ ] **Step 4: Run — expect PASS.**
- [ ] **Step 5: Commit** `feat(cerberus): SigNoz client with injectable transport`

---

### Task 3: Deterministic incident summary (pure)

**Files:**
- Create: `cerberus/analyze.py`, `tests/test_analyze.py`

**Interfaces:**
- Consumes: `model.Span`.
- Produces: `summarize(spans) -> list[dict]` — one dict per trace_id: `{trace_id, ok, failed_steps, total_tokens, cost_usd, max_latency_ms, flags}`, worst (not-ok, then cost) first. `flags` ⊆ {"error","token_spike","cost_spike"}.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_analyze.py
from cerberus.model import Span
from cerberus.analyze import summarize

def _s(tid, name, status, tokens=0, cost=0.0, dur=1.0):
    return Span(tid, name, name, "svc", dur, status, {
        "gen_ai.usage.input_tokens": str(tokens), "gen_ai.usage.cost_usd": str(cost)})

def test_summarize_flags_failed_and_costly_run():
    spans = [
        _s("t1","agent.run","error"), _s("t1","judge","error",tokens=4000,cost=0.12,dur=5.0),
        _s("t2","agent.run","ok"),    _s("t2","judge","ok",tokens=300,cost=0.0,dur=0.2),
    ]
    runs = summarize(spans, token_baseline=1000)
    assert runs[0]["trace_id"] == "t1"          # worst first
    assert runs[0]["ok"] is False
    assert "judge" in runs[0]["failed_steps"]
    assert runs[0]["total_tokens"] == 4000
    assert "error" in runs[0]["flags"] and "token_spike" in runs[0]["flags"]
    assert runs[1]["ok"] is True and runs[1]["flags"] == []
```

- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Implement**

```python
# cerberus/analyze.py
"""Deterministic incident facts from spans — computed BEFORE any LLM (the analog of
Crosscheck's structural pre-filter). Groups spans by trace, flags errors + spikes."""


def _num(attrs, key):
    try:
        return float(attrs.get(key, 0) or 0)
    except (TypeError, ValueError):
        return 0.0


def summarize(spans, token_baseline=1000, cost_baseline=0.05):
    by_trace = {}
    for s in spans:
        by_trace.setdefault(s.trace_id, []).append(s)
    runs = []
    for tid, members in by_trace.items():
        failed = [m.name for m in members if m.status == "error"]
        tokens = sum(_num(m.attrs, "gen_ai.usage.input_tokens")
                     + _num(m.attrs, "gen_ai.usage.output_tokens") for m in members)
        cost = sum(_num(m.attrs, "gen_ai.usage.cost_usd") for m in members)
        max_lat = max((m.duration_ms for m in members), default=0.0)
        flags = []
        if failed: flags.append("error")
        if tokens > token_baseline: flags.append("token_spike")
        if cost > cost_baseline: flags.append("cost_spike")
        runs.append({"trace_id": tid, "ok": not failed, "failed_steps": failed,
                     "total_tokens": int(tokens), "cost_usd": round(cost, 4),
                     "max_latency_ms": round(max_lat, 1), "flags": flags})
    runs.sort(key=lambda r: (r["ok"], -r["cost_usd"], -r["total_tokens"]))
    return runs
```

- [ ] **Step 4: Run — expect PASS.**
- [ ] **Step 5: Commit** `feat(cerberus): deterministic incident summary`

---

### Task 4: Copilot (injected LLM, grounded answer)

**Files:**
- Create: `cerberus/copilot.py`, `tests/test_copilot.py`

**Interfaces:**
- Consumes: the `summarize` output (`list[dict]`).
- Produces: `explain(question, runs, analyst=None) -> str`. `analyst(prompt: str) -> str` is injectable; default calls the LLM. Returns a grounded answer; when there are no runs, returns a fixed "no telemetry" string without calling the analyst.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_copilot.py
from cerberus.copilot import explain

RUNS = [{"trace_id":"t1","ok":False,"failed_steps":["judge"],"total_tokens":4080,
         "cost_usd":0.12,"max_latency_ms":5.0,"flags":["error","token_spike"]}]

def test_explain_grounds_prompt_and_returns_analyst_output():
    seen = {}
    def analyst(prompt):
        seen["prompt"] = prompt
        return "Run t1 failed at the judge step; token use spiked to 4080."
    out = explain("what went wrong?", RUNS, analyst=analyst)
    assert "t1" in seen["prompt"] and "judge" in seen["prompt"]   # facts are in the prompt
    assert out.startswith("Run t1 failed")

def test_explain_no_runs_short_circuits():
    called = []
    explain("anything", [], analyst=lambda p: called.append(1) or "x")
    assert called == []      # analyst not invoked when there's nothing to explain
```

- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Implement**

```python
# cerberus/copilot.py
"""The SRE copilot: turn deterministic incident facts + a question into a grounded,
trace-cited answer. The LLM (analyst) is injected so this is unit-testable offline."""
import json


def _default_analyst(prompt):
    import asyncio
    from cognee.infrastructure.llm.LLMGateway import LLMGateway  # reuse the Crosscheck LLM path
    return asyncio.run(LLMGateway.acreate_structured_output(
        text_input=prompt,
        system_prompt="You are an SRE copilot. Explain the incident in 2-3 sentences, "
                      "grounded ONLY in the facts given, and cite the trace_id. No speculation.",
        response_model=str))


def explain(question, runs, analyst=None):
    if not runs:
        return "No telemetry in range — nothing to explain yet."
    analyst = analyst or _default_analyst
    facts = json.dumps(runs[:5], indent=2)
    prompt = (f"Question: {question}\n\nAgent runs (worst first), with trace_id, "
              f"failed_steps, tokens, cost, latency, flags:\n{facts}\n\n"
              "Answer the question using only these facts; cite the trace_id.")
    return analyst(prompt)
```

- [ ] **Step 4: Run — expect PASS.**
- [ ] **Step 5: Commit** `feat(cerberus): SRE copilot over incident facts`

---

### Task 5: FastAPI app

**Files:**
- Create: `cerberus/api.py`

**Interfaces:**
- Consumes: `fetch_spans`, `summarize`, `explain`.
- Produces: `GET /incidents?service=&minutes=` → `summarize` list; `POST /ask` (`{question, service}`) → `{answer, runs}`; `GET /` → the panel.

- [ ] **Step 1: Implement**

```python
# cerberus/api.py
"""Cerberus web app. /incidents lists ranked runs; /ask explains them with the copilot."""
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from pydantic import BaseModel

from cerberus.signoz_client import fetch_spans
from cerberus.analyze import summarize
from cerberus.copilot import explain

app = FastAPI(title="Cerberus")
_STATIC = Path(__file__).parent / "static"


class Ask(BaseModel):
    question: str
    service: str = "cerberus-demo-agent"


@app.get("/incidents")
def incidents(service: str = "cerberus-demo-agent", minutes: int = 15):
    return summarize(fetch_spans(service, minutes))


@app.post("/ask")
def ask(a: Ask):
    runs = summarize(fetch_spans(a.service))
    return {"answer": explain(a.question, runs), "runs": runs[:5]}


@app.get("/")
def index():
    return FileResponse(_STATIC / "index.html")
```

- [ ] **Step 2: Verify** (needs live SigNoz + the demo agent sending traffic):
```bash
uvicorn cerberus.api:app --port 8030
curl "localhost:8030/incidents" | python3 -m json.tool | head
```
Expected: a JSON list of runs (worst first). If empty, generate traffic with the sandbox agent (`/run?fail=1`).

- [ ] **Step 3: Commit** `feat(cerberus): FastAPI app — /incidents + /ask`

---

### Task 6: Panel UI + dashboard export + live smoke

**Files:**
- Create: `cerberus/static/index.html` (reuse Argus tokens/shell: incident list + a chat box hitting `/ask`)
- Create: `cerberus/dashboard.json` (export from SigNoz once built by hand)
- Create: `cerberus/live_smoke.py`

- [ ] **Step 1: Build the panel** — reuse the Argus `index.html` token block; two panes: left = incident cards from `GET /incidents` (trace_id, failed steps, tokens, cost, flags as badges), right = a chat box POSTing to `/ask` and rendering `answer`. (Copy the Argus card/tooltip CSS; swap the data shape.)

- [ ] **Step 2: `live_smoke.py`**
```python
# cerberus/live_smoke.py
"""End-to-end against live SigNoz: fetch -> summarize -> explain a forced incident."""
from cerberus.signoz_client import fetch_spans
from cerberus.analyze import summarize
from cerberus.copilot import explain

if __name__ == "__main__":
    runs = summarize(fetch_spans("cerberus-demo-agent"))
    print(f"{len(runs)} runs; worst: {runs[0] if runs else 'none'}")
    print(explain("what went wrong in the last runs?", runs))
```

- [ ] **Step 3: Export the SigNoz dashboard** you built by hand (Dashboards → ⋯ → Export) to `cerberus/dashboard.json` so it's reproducible, not click-built.

- [ ] **Step 4: Commit** `feat(cerberus): panel UI + dashboard JSON + live smoke`

---

## Self-Review

- **Spec coverage:** emit side = existing `sandbox/` (OTel → SigNoz); read side = Task 2 (`signoz_client`); deterministic facts = Task 3; copilot = Task 4; dashboard = Task 6; UI/UX = Task 6; "Best Use of SigNoz" (emit *and* consume) = Tasks 2+3+4 reading the API + sandbox emitting. Covered.
- **Placeholders:** none — every step has runnable code + commands. The two intentionally-provisional spots (SigNoz response path in Task 2's `_default_transport`, and Task 1's fixture) are explicitly flagged as Day-1 adjustments, isolated to those two functions.
- **Type consistency:** `Span` fields identical across Tasks 1–4; `summarize` returns the same dict keys consumed by `explain`, `/incidents`, and the UI (`trace_id, ok, failed_steps, total_tokens, cost_usd, max_latency_ms, flags`).
- **Prep-vs-live:** Tasks 1, 3, 4 are 100% offline-testable now. Tasks 2 (default transport), 5, 6 need live SigNoz — do their *tests* now (injected), their *verify* steps Day-1.

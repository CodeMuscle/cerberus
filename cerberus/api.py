"""Cerberus web app. /incidents lists ranked runs; /ask explains them with the copilot."""

import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from cerberus.alerts import arm
from cerberus.analyze import summarize
from cerberus.copilot import explain
from cerberus.signoz_client import fetch_spans

DEFAULT_SERVICE = os.getenv("CERBERUS_SERVICE", "cerberus-demo-agent")

app = FastAPI(title="Cerberus")

# The Next.js panel in web/ is served separately (dev :3000, prod :3000), so it is
# cross-origin to this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CERBERUS_ORIGINS", "http://localhost:3000").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


class Ask(BaseModel):
    question: str
    service: str = DEFAULT_SERVICE
    minutes: int = 15


class Guard(BaseModel):
    service: str = DEFAULT_SERVICE
    token_baseline: int = 1000


def _causes(e: BaseException, depth: int = 0):
    """Flatten an exception tree. The MCP client runs in a task group, so the real
    HTTP error is nested inside an ExceptionGroup — str(e) alone just says
    "unhandled errors in a TaskGroup" and hides the status code."""
    if depth > 10:  # cause chains can cycle
        return
    yield e
    if isinstance(e, BaseExceptionGroup):
        for sub in e.exceptions:
            yield from _causes(sub, depth + 1)
    for nxt in (e.__cause__, e.__context__):
        if nxt is not None:
            yield from _causes(nxt, depth + 1)


def _runs(service: str, minutes: int):
    """Fetch + summarize, turning a dead or unauthenticated MCP server into a 503
    that says what to fix. Without this the MCP 401 surfaces as a bare 500."""
    try:
        return summarize(fetch_spans(service, minutes))
    except Exception as e:
        text = " | ".join(str(x) for x in _causes(e))
        if "401" in text or "403" in text:
            detail = (
                "SigNoz MCP server rejected the request (401/403). Set SIGNOZ_API_KEY "
                "to a key from SigNoz → Settings → Service Accounts."
            )
        else:
            detail = f"Cannot read telemetry from the SigNoz MCP server: {text[:300]}"
        raise HTTPException(status_code=503, detail=detail) from e


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/incidents")
def incidents(service: str = DEFAULT_SERVICE, minutes: int = 15):
    return _runs(service, minutes)


@app.post("/ask")
def ask(a: Ask):
    runs = _runs(a.service, a.minutes)
    try:
        answer = explain(a.question, runs)
    except Exception as e:
        # The incident facts are still useful without prose, so return them with a
        # readable note instead of a 500 that loses the analysis entirely.
        answer = (
            f"Copilot unavailable ({type(e).__name__}). The ranked runs below are still "
            "accurate. Set ANTHROPIC_API_KEY for Claude, or check that Ollama is reachable."
        )
    return {"answer": answer, "runs": runs[:5]}


@app.post("/guard")
def guard(g: Guard):
    """Close the loop: create the SigNoz alert rule that would have caught this
    service's token-spike incidents. Idempotent."""
    try:
        return arm(g.service, g.token_baseline)
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Could not create the alert via the SigNoz MCP server: {str(e)[:300]}",
        ) from e

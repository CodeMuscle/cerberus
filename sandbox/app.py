"""Toy agent whose runs land in SigNoz as traces — the workload Cerberus observes.

Mirrors Crosscheck/Argus shape: a multi-step agent (extract -> judge -> result)
where the `judge` step is an LLM call carrying GenAI semantic-convention attrs
(model, token usage) plus a cost attribute. Hit /run?fail=1 to force a failure +
cost spike, so there's an incident for the copilot to explain.

Run:  uvicorn app:app --port 8090
Then: curl "localhost:8090/run"  and  curl "localhost:8090/run?fail=1"
Open SigNoz -> Services -> cerberus-demo-agent to see the traces.
"""

import os
import time

from fastapi import FastAPI
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.trace import Status, StatusCode
from otel import setup_logging, setup_tracing

tracer = setup_tracing()
log = setup_logging()
app = FastAPI(title="cerberus-demo-agent")
FastAPIInstrumentor.instrument_app(app)

MODEL = os.getenv("DEMO_MODEL", "claude-opus-4-8")


COST_PER_1K = float(os.getenv("COST_PER_1K", "0.03"))


def _llm_span(name, prompt_tokens, completion_tokens, fail=False):
    """Emit one LLM call as a span with GenAI semantic-convention attributes."""
    with tracer.start_as_current_span(name) as span:
        span.set_attribute("gen_ai.system", "ollama")
        span.set_attribute("gen_ai.request.model", MODEL)
        span.set_attribute("gen_ai.usage.input_tokens", prompt_tokens)
        span.set_attribute("gen_ai.usage.output_tokens", completion_tokens)
        cost = (prompt_tokens + completion_tokens) / 1000 * COST_PER_1K
        span.set_attribute("gen_ai.usage.cost_usd", round(cost, 6))
        time.sleep(0.05)
        if fail:
            span.set_status(Status(StatusCode.ERROR, "judge timed out"))
            raise RuntimeError("judge step timed out")
        return completion_tokens


@app.get("/run")
def run(fail: bool = False):
    """One agent run: extract claims -> judge -> result. ?fail=1 injects an incident."""
    with tracer.start_as_current_span("agent.run") as run_span:
        log.info("agent.run started")
        with tracer.start_as_current_span("extract_claims"):
            time.sleep(0.03)

        p_tok = 4000 if fail else 300
        try:
            _llm_span("judge", prompt_tokens=p_tok, completion_tokens=80, fail=fail)
        except RuntimeError as e:
            run_span.set_status(Status(StatusCode.ERROR, str(e)))
            log.error("agent.run failed at judge: %s (input_tokens=%d)", e, p_tok)
            return {"ok": False, "error": str(e)}
        log.info("agent.run ok (input_tokens=%d, model=%s)", p_tok, MODEL)
        return {"ok": True, "model": MODEL, "prompt_tokens": p_tok}

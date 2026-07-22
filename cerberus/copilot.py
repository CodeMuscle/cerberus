"""The SRE copilot: turn deterministic incident facts + a question into a grounded,
trace-cited answer. The LLM (analyst) is injected so this is unit-testable offline."""

import json
import os

SYSTEM = (
    "You are an SRE copilot. Explain the incident in 2-3 sentences, grounded ONLY in the "
    "facts given, and cite the trace_id. No speculation. If the facts don't answer the "
    "question, say so."
)


def _claude(prompt: str) -> str:
    import anthropic

    message = anthropic.Anthropic().messages.create(
        model=os.getenv("CERBERUS_MODEL", "claude-opus-4-8"),
        max_tokens=1024,  # answers are 2-3 sentences; a bigger cap only adds latency
        system=SYSTEM,
        messages=[{"role": "user", "content": prompt}],
    )
    return next((b.text for b in message.content if b.type == "text"), "")


def _ollama(prompt: str) -> str:
    """Keyless fallback so the repo runs for anyone who clones it."""
    import httpx

    host = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    r = httpx.post(
        f"{host}/api/generate",
        json={
            "model": os.getenv("OLLAMA_MODEL", "llama3.1:8b"),
            "system": SYSTEM,
            "prompt": prompt,
            "stream": False,
        },
        timeout=120,
    )
    r.raise_for_status()
    return r.json().get("response", "")


def _default_analyst(prompt):
    return _claude(prompt) if os.getenv("ANTHROPIC_API_KEY") else _ollama(prompt)


def explain(question, runs, analyst=None):
    if not runs:
        return "No telemetry in range — nothing to explain yet."
    analyst = analyst or _default_analyst
    facts = json.dumps(runs[:5], indent=2)
    prompt = (
        f"Question: {question}\n\nAgent runs (worst first), with trace_id, "
        f"failed_steps, tokens, cost, latency, flags:\n{facts}\n\n"
        "Answer the question using only these facts; cite the trace_id."
    )
    return analyst(prompt)

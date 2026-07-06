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

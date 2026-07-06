from cerberus.copilot import explain

RUNS = [{"trace_id": "t1", "ok": False, "failed_steps": ["judge"], "total_tokens": 4080,
         "cost_usd": 0.12, "max_latency_ms": 5.0, "flags": ["error", "token_spike"]}]


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

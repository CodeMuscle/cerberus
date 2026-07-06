from cerberus.analyze import summarize
from cerberus.model import Span


def _s(tid, name, status, tokens=0, cost=0.0, dur=1.0):
    return Span(
        tid,
        name,
        name,
        "svc",
        dur,
        status,
        {"gen_ai.usage.input_tokens": str(tokens), "gen_ai.usage.cost_usd": str(cost)},
    )


def test_summarize_flags_failed_and_costly_run():
    spans = [
        _s("t1", "agent.run", "error"),
        _s("t1", "judge", "error", tokens=4000, cost=0.12, dur=5.0),
        _s("t2", "agent.run", "ok"),
        _s("t2", "judge", "ok", tokens=300, cost=0.0, dur=0.2),
    ]
    runs = summarize(spans, token_baseline=1000)
    assert runs[0]["trace_id"] == "t1"  # worst first
    assert runs[0]["ok"] is False
    assert "judge" in runs[0]["failed_steps"]
    assert runs[0]["total_tokens"] == 4000
    assert "error" in runs[0]["flags"] and "token_spike" in runs[0]["flags"]
    assert runs[1]["ok"] is True and runs[1]["flags"] == []

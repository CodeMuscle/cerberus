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
        if failed:
            flags.append("error")
        if tokens > token_baseline:
            flags.append("token_spike")
        if cost > cost_baseline:
            flags.append("cost_spike")
        runs.append({"trace_id": tid, "ok": not failed, "failed_steps": failed,
                     "total_tokens": int(tokens), "cost_usd": round(cost, 4),
                     "max_latency_ms": round(max_lat, 1), "flags": flags})
    runs.sort(key=lambda r: (r["ok"], -r["cost_usd"], -r["total_tokens"]))
    return runs

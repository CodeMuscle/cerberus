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
    status: str  # "ok" | "error" | "unset"
    attrs: dict


def _status(d: dict) -> str:
    """MCP rows carry has_error; the legacy trace-explorer rows carry OTel statusCode."""
    if "has_error" in d:
        return "error" if d["has_error"] in (True, "true", "True", 1) else "ok"
    code = d.get("statusCode", d.get("status_code", 0))
    return {1: "ok", 2: "error"}.get(code, "unset")  # OTel StatusCode: 1 OK, 2 ERROR


def span_from_signoz(d: dict) -> Span:
    return Span(
        trace_id=d.get("traceID") or d.get("trace_id", ""),
        span_id=d.get("spanID") or d.get("span_id", ""),
        name=d.get("name", ""),
        service=d.get("serviceName") or d.get("service_name") or d.get("service.name", ""),
        duration_ms=(d.get("durationNano") or d.get("duration_nano") or 0) / 1_000_000,
        status=_status(d),
        # Query Builder rows are flat — the row itself carries gen_ai.usage.* —
        # while trace-explorer rows nest attributes under tagMap/attributes.
        attrs=d.get("tagMap") or d.get("attributes") or d.get("attributes_string") or d,
    )

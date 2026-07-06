from cerberus.model import Span, span_from_signoz

# A best-guess SigNoz span row — REPLACE this fixture with a real row from your
# SigNoz Trace explorer (browser Network tab) on Day-1; adjust span_from_signoz to match.
RAW = {
    "traceID": "abc123",
    "spanID": "s1",
    "name": "judge",
    "serviceName": "cerberus-demo-agent",
    "durationNano": 5_000_000,
    "statusCode": 2,  # 2 = error in OTel
    "tagMap": {"gen_ai.usage.input_tokens": "4000", "gen_ai.usage.cost_usd": "0.12"},
}


def test_span_from_signoz_maps_core_fields():
    s = span_from_signoz(RAW)
    assert isinstance(s, Span)
    assert s.trace_id == "abc123" and s.name == "judge"
    assert s.service == "cerberus-demo-agent"
    assert s.duration_ms == 5.0  # nanos -> ms
    assert s.status == "error"  # statusCode 2 -> "error"
    assert s.attrs["gen_ai.usage.input_tokens"] == "4000"

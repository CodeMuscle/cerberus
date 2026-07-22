from cerberus.model import Span, span_from_signoz

# Legacy SigNoz trace-explorer row (camelCase). Kept so both shapes stay supported.
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


# The shape the SigNoz MCP server actually returns from signoz_search_traces:
# canonical Query Builder field names, snake_case, has_error instead of statusCode.
MCP_ROW = {
    "trace_id": "abc123",
    "span_id": "s1",
    "name": "judge",
    "service_name": "cerberus-demo-agent",
    "duration_nano": 5_000_000,
    "has_error": True,
    "attributes": {"gen_ai.usage.input_tokens": "4000", "gen_ai.usage.cost_usd": "0.12"},
}


def test_span_from_mcp_row():
    s = span_from_signoz(MCP_ROW)
    assert s.trace_id == "abc123" and s.span_id == "s1" and s.name == "judge"
    assert s.service == "cerberus-demo-agent"
    assert s.duration_ms == 5.0
    assert s.status == "error"
    assert s.attrs["gen_ai.usage.cost_usd"] == "0.12"


def test_span_from_mcp_row_no_error_is_ok():
    assert span_from_signoz({**MCP_ROW, "has_error": False}).status == "ok"
    assert span_from_signoz({**MCP_ROW, "has_error": "false"}).status == "ok"


def test_span_from_unknown_row_degrades_to_unset():
    s = span_from_signoz({})
    assert s.trace_id == "" and s.status == "unset" and s.duration_ms == 0.0

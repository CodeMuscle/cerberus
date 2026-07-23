from cerberus.model import Span, span_from_signoz

RAW = {
    "traceID": "abc123",
    "spanID": "s1",
    "name": "judge",
    "serviceName": "cerberus-demo-agent",
    "durationNano": 5_000_000,
    "statusCode": 2,
    "tagMap": {"gen_ai.usage.input_tokens": "4000", "gen_ai.usage.cost_usd": "0.12"},
}


def test_span_from_signoz_maps_core_fields():
    s = span_from_signoz(RAW)
    assert isinstance(s, Span)
    assert s.trace_id == "abc123" and s.name == "judge"
    assert s.service == "cerberus-demo-agent"
    assert s.duration_ms == 5.0
    assert s.status == "error"
    assert s.attrs["gen_ai.usage.input_tokens"] == "4000"


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


BUILDER_ROW = {
    "trace_id": "e810dd9331230d212cd9b219963af606",
    "span_id": "cff4a3ad708ec77b",
    "name": "judge",
    "service.name": "cerberus-demo-agent",
    "has_error": True,
    "duration_nano": 54_082_000,
    "gen_ai.usage.input_tokens": 4000,
    "gen_ai.usage.output_tokens": 80,
    "gen_ai.usage.cost_usd": 0.122,
}


def test_span_from_builder_query_row_keeps_gen_ai_attrs():
    s = span_from_signoz(BUILDER_ROW)
    assert s.trace_id == "e810dd9331230d212cd9b219963af606"
    assert s.name == "judge" and s.service == "cerberus-demo-agent"
    assert s.status == "error"
    assert s.duration_ms == 54.082

    assert s.attrs["gen_ai.usage.input_tokens"] == 4000
    assert s.attrs["gen_ai.usage.cost_usd"] == 0.122

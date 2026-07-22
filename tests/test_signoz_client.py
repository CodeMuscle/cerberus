import json

from cerberus.signoz_client import _rows, fetch_spans

RAW_ROWS = [
    {
        "traceID": "t1",
        "spanID": "a",
        "name": "agent.run",
        "serviceName": "svc",
        "durationNano": 9_000_000,
        "statusCode": 2,
        "tagMap": {},
    },
    {
        "traceID": "t1",
        "spanID": "b",
        "name": "judge",
        "serviceName": "svc",
        "durationNano": 5_000_000,
        "statusCode": 2,
        "tagMap": {"gen_ai.usage.input_tokens": "4000"},
    },
]


def test_fetch_spans_parses_via_injected_transport():
    spans = fetch_spans("svc", transport=lambda: RAW_ROWS)
    assert len(spans) == 2
    assert spans[1].name == "judge" and spans[1].status == "error"


def test_fetch_spans_empty_transport():
    assert fetch_spans("svc", transport=lambda: []) == []


def test_rows_finds_span_list_whatever_the_wrapper_key():
    assert _rows(json.dumps({"data": {"spans": RAW_ROWS}})) == RAW_ROWS
    assert _rows(json.dumps({"result": RAW_ROWS})) == RAW_ROWS
    assert _rows(json.dumps(RAW_ROWS)) == RAW_ROWS


def test_rows_survives_non_json_and_empty_payloads():
    assert _rows("No traces found in the last 15m.") == []
    assert _rows("") == []
    assert _rows(json.dumps({"data": {"spans": []}})) == []

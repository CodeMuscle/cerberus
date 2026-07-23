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


def _payload(rows, note=""):
    """The envelope signoz_execute_builder_query actually returns."""
    body = json.dumps({"status": "success", "data": {"data": {"results": [{"rows": rows}]}}})
    return body + note


def test_rows_unwraps_builder_query_envelope():
    rows = [{"data": {"trace_id": "t1", "name": "judge"}, "timestamp": "2026-07-22T06:54:09Z"}]
    assert _rows(_payload(rows)) == [{"trace_id": "t1", "name": "judge"}]


def test_rows_ignores_trailing_note():

    rows = [{"data": {"trace_id": "t1"}}]
    note = "\nnote: returned 1 rows (limit 1) — more results likely exist (hasMore=true)."
    assert _rows(_payload(rows, note)) == [{"trace_id": "t1"}]


def test_rows_concatenates_multiple_results():
    payload = json.dumps(
        {
            "data": {
                "data": {
                    "results": [
                        {"rows": [{"data": {"span_id": "a"}}]},
                        {"rows": [{"data": {"span_id": "b"}}]},
                    ]
                }
            }
        }
    )
    assert _rows(payload) == [{"span_id": "a"}, {"span_id": "b"}]


def test_rows_survives_non_json_and_empty_payloads():
    assert _rows("No traces found in the last 15m.") == []
    assert _rows("") == []
    assert _rows(_payload([])) == []


def test_rows_handles_null_rows_from_empty_window():

    payload = json.dumps({"data": {"data": {"results": [{"rows": None}]}}})
    assert _rows(payload) == []

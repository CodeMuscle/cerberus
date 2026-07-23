"""Read spans from SigNoz through the SigNoz MCP server.

Cerberus does not talk to SigNoz's REST API directly. It speaks MCP to the
`signoz-mcp` service that Foundry deploys alongside SigNoz (see casting.yaml),
which means the same tool surface an AI client gets — search_traces, dashboards,
alerts — is the surface Cerberus is built on.

The network call is injectable: `fetch_spans(..., transport=...)` lets every test
run offline. `call_tool` is the one place that knows MCP, and `_rows` the one
place that knows what the payload looks like.
"""

import asyncio
import json
import os
import time

from cerberus.model import Span, span_from_signoz


def _endpoint() -> tuple[str, dict[str, str]]:
    url = os.getenv("SIGNOZ_MCP_URL", "http://localhost:8000/mcp")
    headers = {}
    if key := os.getenv("SIGNOZ_API_KEY"):
        headers["SIGNOZ-API-KEY"] = key
    if signoz_url := os.getenv("SIGNOZ_URL"):
        headers["X-SigNoz-URL"] = signoz_url
    return url, headers


async def _acall_tool(name: str, arguments: dict) -> str:
    from mcp import ClientSession
    from mcp.client.streamable_http import streamablehttp_client

    url, headers = _endpoint()
    async with (
        streamablehttp_client(url, headers=headers) as (read, write, _),
        ClientSession(read, write) as session,
    ):
        await session.initialize()
        result = await session.call_tool(name, arguments)
    return "\n".join(c.text for c in result.content if getattr(c, "text", None))


def call_tool(name: str, arguments: dict) -> str:
    """Call one SigNoz MCP tool, returning its text payload."""
    return asyncio.run(_acall_tool(name, arguments))


def _rows(payload: str) -> list[dict]:
    """Dig the span rows out of an MCP text payload.

    Two things the payload does that a plain json.loads() gets wrong:
      * it can carry a trailing human-readable note after the JSON object
        ("note: returned 3 rows (limit 3) ..."), so we decode a prefix, and
      * each row wraps its fields in a "data" sub-object alongside "timestamp",
        so the span fields are one level down.

    Rows come back flat (trace_id, duration_nano, gen_ai.usage.*), which is what
    span_from_signoz expects. A non-JSON payload (an error string) yields no rows
    rather than raising.
    """
    try:
        data, _ = json.JSONDecoder().raw_decode(payload.lstrip())
    except (json.JSONDecodeError, AttributeError):
        return []
    results = data.get("data", {}).get("data", {}).get("results") or []

    rows = [row for result in results for row in (result.get("rows") or [])]

    return [row.get("data", row) if isinstance(row, dict) else row for row in rows]


def _field(name: str, dtype: str, context: str) -> dict:
    return {"name": name, "fieldDataType": dtype, "signal": "traces", "fieldContext": context}


_SELECT = [
    _field("trace_id", "string", "span"),
    _field("span_id", "string", "span"),
    _field("name", "string", "span"),
    _field("has_error", "bool", "span"),
    _field("duration_nano", "number", "span"),
    _field("service.name", "string", "resource"),
    _field("gen_ai.usage.input_tokens", "number", "tag"),
    _field("gen_ai.usage.output_tokens", "number", "tag"),
    _field("gen_ai.usage.cost_usd", "number", "tag"),
]


def build_query(service: str, minutes: int, now_ms: int, limit: int = 200) -> dict:
    """A SigNoz Query Builder v5 raw-trace request for one service's spans."""
    return {
        "schemaVersion": "v1",
        "start": now_ms - minutes * 60_000,
        "end": now_ms,
        "requestType": "raw",
        "compositeQuery": {
            "queries": [
                {
                    "type": "builder_query",
                    "spec": {
                        "name": "A",
                        "signal": "traces",
                        "disabled": False,
                        "limit": limit,
                        "offset": 0,
                        "order": [{"key": {"name": "timestamp"}, "direction": "desc"}],
                        "having": {"expression": ""},
                        "filter": {"expression": f"service.name = '{service}'"},
                        "selectFields": _SELECT,
                    },
                }
            ]
        },
        "formatOptions": {"formatTableResultForUI": False, "fillGaps": False},
        "variables": {},
    }


def _default_transport(service: str, minutes: int) -> list[dict]:
    query = build_query(service, minutes, int(time.time() * 1000))
    return _rows(
        call_tool(
            "signoz_execute_builder_query",
            {
                "query": query,
                "searchContext": (
                    f"List spans for service {service} over the last {minutes} minutes with "
                    "gen_ai token and cost attributes, to rank agent runs by failure and spend."
                ),
            },
        )
    )


def fetch_spans(service: str, minutes: int = 15, transport=None) -> list[Span]:
    rows = transport() if transport else _default_transport(service, minutes)
    return [span_from_signoz(r) for r in rows]

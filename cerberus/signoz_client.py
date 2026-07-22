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

    The server wraps results differently per tool/version, so rather than pin one
    key we take the first list-of-dicts we find. Non-JSON payloads (an error
    string, a rendered table) yield no rows instead of raising.
    """
    try:
        data = json.loads(payload)
    except (json.JSONDecodeError, TypeError):
        return []
    stack = [data]
    while stack:
        node = stack.pop(0)
        if isinstance(node, list):
            if node and all(isinstance(x, dict) for x in node):
                return node
        elif isinstance(node, dict):
            stack.extend(node.values())
    return []


def _default_transport(service: str, minutes: int) -> list[dict]:
    return _rows(
        call_tool(
            "signoz_search_traces",
            {"service": service, "timeRange": f"{minutes}m", "limit": 200},
        )
    )


def fetch_spans(service: str, minutes: int = 15, transport=None) -> list[Span]:
    rows = transport() if transport else _default_transport(service, minutes)
    return [span_from_signoz(r) for r in rows]

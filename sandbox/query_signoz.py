"""Probe SigNoz's query API — the dependency Cerberus's copilot is built on.

⚠️ VERIFY THIS DAY-1. SigNoz's HTTP API path/auth moves between versions; this is
a starting point, not a guarantee. Run it after some traces exist and adjust the
endpoint/body until it returns data. That confirmation de-risks the whole copilot.

Self-host defaults: UI/API on http://localhost:8080 (newer) or :3301 (older).
Auth: SigNoz Cloud uses SIGNOZ_API_KEY header; self-host may need none or a key
from Settings -> API Keys. Set SIGNOZ_URL / SIGNOZ_API_KEY env vars.
"""

import json
import os
import time
import urllib.request

BASE = os.getenv("SIGNOZ_URL", "http://localhost:8080")
API_KEY = os.getenv("SIGNOZ_API_KEY", "")


def _post(path, body):
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(body).encode(),
        headers={
            "Content-Type": "application/json",
            **({"SIGNOZ-API-KEY": API_KEY} if API_KEY else {}),
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.load(r)


def recent_agent_spans(service="cerberus-demo-agent", minutes=15):
    """Query recent spans for the demo service. Uses the v4 query_range shape.

    If this 404s or shape-mismatches, open the SigNoz UI, build the same query in
    the Trace explorer, hit the browser Network tab, and copy the real request
    body here — that's the fastest way to pin the current API.
    """
    now_ms = int(time.time() * 1000)
    body = {
        "start": now_ms - minutes * 60_000,
        "end": now_ms,
        "compositeQuery": {
            "queryType": "builder",
            "panelType": "list",
            "builderQueries": {
                "A": {
                    "dataSource": "traces",
                    "queryName": "A",
                    "aggregateOperator": "noop",
                    "filters": {
                        "op": "AND",
                        "items": [{"key": {"key": "service.name"}, "op": "=", "value": service}],
                    },
                    "limit": 20,
                }
            },
        },
    }
    return _post("/api/v4/query_range", body)


if __name__ == "__main__":
    try:
        print(json.dumps(recent_agent_spans(), indent=2)[:2000])
    except Exception as e:
        print(
            f"Query failed ({e}). Expected until you verify the endpoint/auth "
            f"for your SigNoz version — see the module docstring."
        )

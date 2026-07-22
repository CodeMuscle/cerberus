"""Cerberus web app. /incidents lists ranked runs; /ask explains them with the copilot."""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from cerberus.analyze import summarize
from cerberus.copilot import explain
from cerberus.signoz_client import fetch_spans

DEFAULT_SERVICE = os.getenv("CERBERUS_SERVICE", "cerberus-demo-agent")

app = FastAPI(title="Cerberus")

# The Next.js panel in web/ is served separately (dev :3000, prod :3000), so it is
# cross-origin to this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CERBERUS_ORIGINS", "http://localhost:3000").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


class Ask(BaseModel):
    question: str
    service: str = DEFAULT_SERVICE
    minutes: int = 15


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/incidents")
def incidents(service: str = DEFAULT_SERVICE, minutes: int = 15):
    return summarize(fetch_spans(service, minutes))


@app.post("/ask")
def ask(a: Ask):
    runs = summarize(fetch_spans(a.service, a.minutes))
    return {"answer": explain(a.question, runs), "runs": runs[:5]}

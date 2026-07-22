"""OpenTelemetry → SigNoz wiring. One call sets up tracing for the whole app.

SigNoz runs an OTel collector that listens for OTLP gRPC on :4317. We point a
BatchSpanProcessor at it. `service.name` is how the app shows up in SigNoz.
"""

import os

from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor


def setup_tracing(service_name="cerberus-demo-agent"):
    endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317")
    provider = TracerProvider(resource=Resource.create({"service.name": service_name}))
    provider.add_span_processor(
        BatchSpanProcessor(OTLPSpanExporter(endpoint=endpoint, insecure=True))
    )
    trace.set_tracer_provider(provider)
    return trace.get_tracer(service_name)

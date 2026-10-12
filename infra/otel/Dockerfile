FROM otel/opentelemetry-collector-contrib:0.162.0
COPY infra/otel/collector.yaml /etc/otelcol-contrib/config.yaml
CMD ["--config=/etc/otelcol-contrib/config.yaml"]

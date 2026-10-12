FROM prom/prometheus:v3.15.0
COPY infra/prometheus/prometheus.yaml /etc/prometheus/prometheus.yml
CMD ["--config.file=/etc/prometheus/prometheus.yml", "--web.enable-otlp-receiver", "--web.enable-remote-write-receiver", "--storage.tsdb.path=/prometheus", "--storage.tsdb.retention.time=90d"]

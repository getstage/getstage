FROM grafana/loki:3.7.8
COPY infra/loki/config.yaml /etc/loki/local-config.yaml
CMD ["-config.file=/etc/loki/local-config.yaml"]

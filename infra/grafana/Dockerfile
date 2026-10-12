FROM grafana/grafana:13.2.3
COPY infra/grafana/provisioning /etc/grafana/provisioning
COPY infra/grafana/dashboards /etc/grafana/dashboards
ENV GF_DASHBOARDS_DEFAULT_HOME_DASHBOARD_PATH=/etc/grafana/dashboards/research.json \
    GF_AUTH_ANONYMOUS_ENABLED=false \
    GF_USERS_ALLOW_SIGN_UP=false \
    GF_USERS_AUTO_ASSIGN_ORG=false \
    GF_ANALYTICS_REPORTING_ENABLED=false

use super::*;
use crate::models::errors::EngineError;
use serde_json::{Value, json};

const RUN_ID: &str = "cb572955-559b-4c7f-bf8c-9827da761a09";

fn metadata() -> Metadata {
    Metadata {
        app_version: "0.2.55".into(),
        channel: "testing",
        os: "macOS 26.0".into(),
        session_id: "44a9023e-8f22-4cee-8be7-fec93ca586be".into(),
    }
}

fn request() -> StartRunRequest {
    serde_json::from_value(json!({
        "providerId": "claude", "modelId": "private-model@example.com", "prompt": "private prompt",
        "workingDirectory": "/Users/private/project", "mode": "research",
        "context": { "projectId": "j123456789abcdef", "source": "private source" },
        "attachments": [{ "id": "private-id", "kind": "document", "name": "private.pdf", "url": "https://private.example/secret" }]
    })).expect("request fixture")
}

fn client() -> (Arc<TelemetryClient>, mpsc::Receiver<Queued>) {
    let (sender, receiver) = mpsc::channel(QUEUE_CAPACITY);
    let worker = tokio::spawn(std::future::pending::<()>());
    (
        Arc::new(TelemetryClient {
            sender,
            metadata: metadata(),
            enabled: AtomicBool::new(true),
            worker: worker.abort_handle(),
        }),
        receiver,
    )
}

fn run(client: &Arc<TelemetryClient>) -> Arc<RunDiagnostics> {
    client
        .research(&request(), RUN_ID, Some("secret.session.token"))
        .expect("enabled research")
}

fn terminal(outcome: &str) -> RunEvent {
    match outcome {
        "succeeded" => RunEvent::RunCompleted {
            api_version: "v1",
            run_id: RUN_ID.into(),
            provider_id: ProviderId::Claude,
            created_at: now_millis(),
            final_text: Some("private output".into()),
        },
        "cancelled" => RunEvent::RunCancelled {
            api_version: "v1",
            run_id: RUN_ID.into(),
            provider_id: ProviderId::Claude,
            created_at: now_millis(),
            reason: Some("private reason".into()),
        },
        _ => RunEvent::RunFailed {
            api_version: "v1",
            run_id: RUN_ID.into(),
            provider_id: ProviderId::Claude,
            created_at: now_millis(),
            error: EngineError {
                code: EngineErrorCode::InternalError,
                message: "private error".into(),
                provider_id: Some(ProviderId::Claude),
                retryable: true,
                detail: Some("secret token /Users/private".into()),
            },
        },
    }
}

fn serialized(receiver: &mut mpsc::Receiver<Queued>) -> Vec<Value> {
    let mut events = Vec::new();
    while let Ok(queued) = receiver.try_recv() {
        let mut value = serde_json::to_value(queued.event).expect("serialize event");
        value["ts"] = json!(1791288000000_u64);
        value["durationMs"] = json!(1250);
        events.push(value);
    }
    events
}

#[test]
fn config_fails_closed_outside_explicit_testing_opt_in() {
    let convex = "https://reliable-bullfrog-917.convex.cloud";
    assert!(Metadata::testing("1", "testing", convex, "0.2.55", "macOS 26.0").is_some());
    for (enabled, channel, url, version, os) in [
        ("0", "testing", convex, "0.2.55", "macOS 26.0"),
        ("1", "production", convex, "0.2.55", "macOS 26.0"),
        (
            "1",
            "testing",
            "https://production.convex.cloud",
            "0.2.55",
            "macOS 26.0",
        ),
        ("1", "testing", convex, "private-version", "macOS 26.0"),
        ("1", "testing", convex, "0.2.55", "private OS /Users/name"),
    ] {
        assert!(Metadata::testing(enabled, channel, url, version, os).is_none());
    }
}

#[tokio::test]
async fn rust_payloads_match_shared_zod_fixtures_and_terminal_is_once() {
    let (client, mut receiver) = client();
    let failed = run(&client);
    failed.step_started(TelemetryStep::Provider);
    failed.step_completed(TelemetryStep::Provider);
    failed.step_started(TelemetryStep::Parse);
    failed.observe(&terminal("failed"));
    failed.observe(&terminal("succeeded"));
    failed.observe(&terminal("cancelled"));
    let succeeded = run(&client);
    succeeded.observe(&terminal("succeeded"));
    succeeded.observe(&terminal("succeeded"));
    let cancelled = run(&client);
    cancelled.step_started(TelemetryStep::Provider);
    cancelled.observe(&terminal("cancelled"));
    cancelled.observe(&terminal("failed"));
    let expected: Vec<Value> = serde_json::from_str(include_str!(
        "../../../../packages/data-ops/tests/fixtures/telemetry-engine.json"
    ))
    .expect("shared fixture");
    assert_eq!(serialized(&mut receiver), expected);
    assert!(!format!("{client:?} {failed:?}").contains("secret"));
}

#[tokio::test]
async fn ignores_private_output_arbitrary_tools_and_invalid_ids() {
    let (client, mut receiver) = client();
    let mut request = request();
    request.context.project_id = Some("private name /Users/name".into());
    request.context.source = Some("section:private section text".into());
    let run = client
        .research(&request, RUN_ID, Some("secret-token"))
        .expect("research");
    run.observe(&RunEvent::OutputDelta {
        api_version: "v1",
        run_id: RUN_ID.into(),
        provider_id: ProviderId::Claude,
        created_at: now_millis(),
        text: "private output".into(),
    });
    run.observe(&RunEvent::ToolCallStarted {
        api_version: "v1",
        run_id: RUN_ID.into(),
        provider_id: ProviderId::Claude,
        created_at: now_millis(),
        tool_call_id: "private arbitrary tool".into(),
        label: "private label".into(),
    });
    assert!(receiver.try_recv().is_err());
    run.observe(&terminal("succeeded"));
    let events = serialized(&mut receiver);
    assert_eq!(events[0]["module"], "research_section");
    assert!(events[0].get("projectId").is_none());
    assert!(
        !serde_json::to_string(&events)
            .expect("json")
            .contains("private")
    );
    request.mode = RunMode::Chat;
    assert!(client.research(&request, RUN_ID, Some("token")).is_none());
    request.mode = RunMode::Research;
    assert!(client.research(&request, RUN_ID, None).is_none());
}

#[tokio::test]
async fn full_queue_drops_without_waiting_or_failing_a_run() {
    let (client, receiver) = client();
    let run = run(&client);
    for _ in 0..QUEUE_CAPACITY {
        client.emit(
            Arc::clone(&run.token),
            run.event("run", "succeeded", run.started),
        );
    }
    assert_eq!(receiver.len(), QUEUE_CAPACITY);
    run.observe(&terminal("succeeded"));
    assert_eq!(receiver.len(), QUEUE_CAPACITY);
    assert!(run.terminal.load(Ordering::Acquire));
}

#[tokio::test]
async fn offline_flush_drops_and_shutdown_does_not_hang() {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("listener");
    let endpoint = format!("http://{}/", listener.local_addr().expect("address"));
    drop(listener);
    let (client, receiver) = client();
    let run = run(&client);
    client.emit(
        Arc::clone(&run.token),
        run.event("run", "succeeded", run.started),
    );
    drop(run);
    drop(client); // Closed queue flushes immediately, not after ten seconds.
    tokio::time::timeout(
        Duration::from_secs(2),
        export_batches(reqwest::Client::new(), &endpoint, receiver),
    )
    .await
    .expect("offline sender must finish");
}

#[tokio::test]
async fn expired_tokens_are_header_only_and_never_retried() {
    let (captured, mut requests) = mpsc::channel(2);
    let router = axum::Router::new().route(
        "/",
        axum::routing::post(
            move |headers: axum::http::HeaderMap, axum::Json(body): axum::Json<Value>| {
                let captured = captured.clone();
                async move {
                    captured.send((headers, body)).await.expect("capture");
                    axum::http::StatusCode::UNAUTHORIZED
                }
            },
        ),
    );
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("listener");
    let endpoint = format!("http://{}/", listener.local_addr().expect("address"));
    let server = tokio::spawn(async move {
        axum::serve(listener, router).await.expect("server");
    });
    let (client, receiver) = client();
    let run = run(&client);
    for _ in 0..BATCH_SIZE {
        client.emit(
            Arc::clone(&run.token),
            run.event("run", "succeeded", run.started),
        );
    }
    drop(run);
    drop(client);
    tokio::time::timeout(
        Duration::from_secs(2),
        export_batches(reqwest::Client::new(), &endpoint, receiver),
    )
    .await
    .expect("expired tokens must not cause retry loops");
    let (headers, body) = requests.recv().await.expect("one request");
    assert_eq!(headers["authorization"], "Bearer secret.session.token");
    assert_eq!(body["events"].as_array().expect("events").len(), BATCH_SIZE);
    assert!(!body.to_string().contains("secret"));
    assert!(requests.try_recv().is_err());
    server.abort();
}

#[tokio::test]
async fn disable_aborts_worker_and_stops_existing_run_producers() {
    let (sender, receiver) = mpsc::channel(QUEUE_CAPACITY);
    let worker = tokio::spawn(export_batches(reqwest::Client::new(), ENDPOINT, receiver));
    let client = Arc::new(TelemetryClient {
        sender,
        metadata: metadata(),
        enabled: AtomicBool::new(true),
        worker: worker.abort_handle(),
    });
    let run = run(&client);
    client.emit(
        Arc::clone(&run.token),
        run.event("run", "succeeded", run.started),
    );
    tokio::task::yield_now().await; // The actual worker is waiting on its first batch, not a test stub.
    client.disable();
    run.step_started(TelemetryStep::Provider);
    run.observe(&terminal("succeeded"));
    assert!(worker.await.expect_err("aborted worker").is_cancelled());
    assert!(client.sender.is_closed());
    assert_eq!(Arc::strong_count(&run.token), 1); // Pending batches/queued credentials were purged.
    assert!(client.research(&request(), RUN_ID, Some("token")).is_none());
}

#[tokio::test]
async fn concurrent_terminal_events_are_once_even_when_step_lock_is_busy() {
    let (client, mut receiver) = client();
    let run = run(&client);
    let lock = run.steps.lock().expect("step lock");
    run.observe(&terminal("failed")); // try_lock must not block or interfere with the run.
    drop(lock);
    let mut tasks = tokio::task::JoinSet::new();
    for _ in 0..50 {
        let run = Arc::clone(&run);
        tasks.spawn(async move {
            run.observe(&terminal("succeeded"));
        });
    }
    while let Some(result) = tasks.join_next().await {
        result.expect("observer");
    }
    assert_eq!(serialized(&mut receiver).len(), 1);
}

#[tokio::test]
async fn distinct_sessions_are_never_exported_under_the_wrong_bearer() {
    let (captured, mut requests) = mpsc::channel(3);
    let router = axum::Router::new().route(
        "/",
        axum::routing::post(
            move |headers: axum::http::HeaderMap, axum::Json(body): axum::Json<Value>| {
                let captured = captured.clone();
                async move {
                    captured.send((headers, body)).await.expect("capture");
                    axum::http::StatusCode::NO_CONTENT
                }
            },
        ),
    );
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("listener");
    let endpoint = format!("http://{}/", listener.local_addr().expect("address"));
    let server = tokio::spawn(async move {
        axum::serve(listener, router).await.expect("server");
    });
    let (client, receiver) = client();
    let run = run(&client);
    for index in 0..BATCH_SIZE {
        let token = if index % 2 == 0 {
            "session-a"
        } else {
            "session-b"
        };
        let mut event = run.event("run", "succeeded", run.started);
        event.run_id = token.to_string(); // Test routing marker, never sent to the real intake.
        client.emit(Arc::from(token), event);
    }
    assert!(
        client
            .sender
            .try_send(Queued {
                token: Arc::from("stale-session"),
                event: run.event("run", "succeeded", run.started),
                queued_at: Instant::now() - MAX_AGE - Duration::from_secs(1),
            })
            .is_ok()
    );
    drop(run);
    drop(client);
    tokio::time::timeout(
        Duration::from_secs(2),
        export_batches(reqwest::Client::new(), &endpoint, receiver),
    )
    .await
    .expect("bounded flush");
    for token in ["session-a", "session-b"] {
        let (headers, body) = requests.recv().await.expect("session request");
        assert_eq!(headers["authorization"], format!("Bearer {token}"));
        let events = body["events"].as_array().expect("events");
        assert_eq!(events.len(), BATCH_SIZE / 2);
        assert!(events.iter().all(|event| event["runId"] == token));
    }
    assert!(requests.try_recv().is_err()); // Stale credentials/events were not exported.
    server.abort();
}

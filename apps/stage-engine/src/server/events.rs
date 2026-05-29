use axum::{
    extract::{
        State,
        ws::{Message, WebSocket, WebSocketUpgrade},
    },
    response::IntoResponse,
};

use crate::app::AppState;
use crate::helpers::time::now_millis;
use crate::models::commands::EngineCommand;
use crate::models::events::{EngineEvent, EngineEventPayload, EngineEventType};

pub async fn events(ws: WebSocketUpgrade, State(state): State<AppState>) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(mut socket: WebSocket, state: AppState) {
    tracing::info!("engine websocket connected");

    while let Some(message) = socket.recv().await {
        let message = match message {
            Ok(message) => message,
            Err(error) => {
                tracing::warn!(%error, "failed to receive websocket message");
                break;
            }
        };

        match message {
            Message::Text(raw) => {
                if let Err(error) = handle_text_message(&mut socket, &state, &raw).await {
                    tracing::warn!(%error, "failed to handle websocket text message");
                    break;
                }
            }
            Message::Close(_) => break,
            Message::Ping(payload) => {
                if socket.send(Message::Pong(payload)).await.is_err() {
                    break;
                }
            }
            Message::Pong(_) | Message::Binary(_) => {}
        }
    }

    tracing::info!("engine websocket disconnected");
}

async fn handle_text_message(
    socket: &mut WebSocket,
    state: &AppState,
    raw: &str,
) -> anyhow::Result<()> {
    let command = match serde_json::from_str::<EngineCommand>(raw) {
        Ok(command) => command,
        Err(error) => {
            send_error(
                socket,
                state,
                None,
                "invalid_command_json",
                error.to_string(),
            )
            .await?;
            return Ok(());
        }
    };

    if command.api_version != state.api_version {
        send_error(
            socket,
            state,
            Some(command.id),
            "unsupported_api_version",
            format!("expected apiVersion `{}`", state.api_version),
        )
        .await?;
        return Ok(());
    }

    match command.command_type {
        crate::models::commands::EngineCommandType::EnginePing => {
            send_ready(socket, state, command.id).await?;
        }
    }

    Ok(())
}

async fn send_ready(
    socket: &mut WebSocket,
    state: &AppState,
    command_id: String,
) -> anyhow::Result<()> {
    let timestamp_ms = now_millis();
    let event = EngineEvent {
        api_version: state.api_version,
        id: format!("{command_id}:ready"),
        command_id: Some(command_id),
        job_id: None,
        event_type: EngineEventType::EngineReady,
        payload: EngineEventPayload::Ready {
            service: state.service_name,
            ready: true,
            timestamp_ms,
        },
        created_at: timestamp_ms,
    };

    send_event(socket, event).await
}

async fn send_error(
    socket: &mut WebSocket,
    state: &AppState,
    command_id: Option<String>,
    code: &'static str,
    message: String,
) -> anyhow::Result<()> {
    let timestamp_ms = now_millis();
    let event = EngineEvent {
        api_version: state.api_version,
        id: format!("engine-error-{timestamp_ms}"),
        command_id,
        job_id: None,
        event_type: EngineEventType::EngineError,
        payload: EngineEventPayload::Error {
            code,
            message,
            timestamp_ms,
        },
        created_at: timestamp_ms,
    };

    send_event(socket, event).await
}

async fn send_event(socket: &mut WebSocket, event: EngineEvent) -> anyhow::Result<()> {
    let raw = serde_json::to_string(&event)?;
    socket.send(Message::Text(raw.into())).await?;
    Ok(())
}

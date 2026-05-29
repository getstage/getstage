#![allow(dead_code)]
// Contract mirror for batch OpenRouter/Voxtral transcription. Voice execution
// is wired after provider status and run streaming are stable.

use serde::{Deserialize, Serialize};

use super::errors::EngineError;

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum VoiceTranscriptionProvider {
    Openrouter,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
pub enum VoiceTranscriptionModel {
    #[serde(rename = "mistralai/voxtral-mini-transcribe")]
    VoxtralMiniTranscribe,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum VoiceCaptureMode {
    Batch,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
pub enum VoiceAudioFormat {
    #[serde(rename = "audio/webm")]
    AudioWebm,
    #[serde(rename = "audio/wav")]
    AudioWav,
    #[serde(rename = "audio/mpeg")]
    AudioMpeg,
    #[serde(rename = "audio/mp4")]
    AudioMp4,
    #[serde(rename = "audio/ogg")]
    AudioOgg,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum VoiceTranscriptionStatus {
    Queued,
    Uploading,
    Transcribing,
    Completed,
    Failed,
    Cancelled,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum VoiceSource {
    Companion,
    Chat,
    Research,
    Generation,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VoiceTranscriptionContext {
    pub project_id: Option<String>,
    pub source: Option<VoiceSource>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VoiceTranscriptionRequest {
    pub provider: VoiceTranscriptionProvider,
    pub model: VoiceTranscriptionModel,
    pub mode: VoiceCaptureMode,
    pub audio_mime_type: VoiceAudioFormat,
    pub audio_size_bytes: u64,
    pub duration_ms: Option<u64>,
    pub language: Option<String>,
    pub prompt: Option<String>,
    #[serde(default)]
    pub context: VoiceTranscriptionContext,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VoiceTranscriptResponse {
    pub api_version: &'static str,
    pub transcription_id: String,
    pub provider: VoiceTranscriptionProvider,
    pub model: VoiceTranscriptionModel,
    pub mode: VoiceCaptureMode,
    pub status: VoiceTranscriptionStatus,
    pub text: String,
    pub duration_ms: Option<u64>,
    pub created_at: u128,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(
    tag = "type",
    rename_all = "snake_case",
    rename_all_fields = "camelCase"
)]
pub enum VoiceTranscriptionEvent {
    TranscriptionStarted {
        api_version: &'static str,
        transcription_id: String,
        created_at: u128,
    },
    TranscriptionCompleted {
        api_version: &'static str,
        transcription_id: String,
        text: String,
        created_at: u128,
    },
    TranscriptionFailed {
        api_version: &'static str,
        transcription_id: String,
        error: EngineError,
        created_at: u128,
    },
    TranscriptionCancelled {
        api_version: &'static str,
        transcription_id: String,
        created_at: u128,
    },
}

use std::{env, net::SocketAddr, time::Duration};

use crate::contracts::RequestLimits;

const DEFAULT_NEBIUS_BASE_URL: &str = "https://api.tokenfactory.nebius.com/v1";

#[derive(Debug, Clone)]
pub struct Config {
    pub bind_addr: SocketAddr,
    pub nebius_api_key: String,
    pub nebius_base_url: String,
    pub nebius_model: String,
    pub stage_api_base_url: String,
    pub provider_timeout: Duration,
    pub auth_timeout: Duration,
    pub max_concurrent_generations: usize,
    pub max_request_bytes: usize,
    pub request_limits: RequestLimits,
}

impl Config {
    pub fn from_env() -> Result<Self, ConfigError> {
        let port = parse_env_or("PORT", 48231_u16)?;
        let provider_timeout_seconds = parse_env_or("WIREFRAME_PROVIDER_TIMEOUT_SECONDS", 600_u64)?;
        let auth_timeout_seconds = parse_env_or("STAGE_AUTH_TIMEOUT_SECONDS", 5_u64)?;

        Ok(Self {
            bind_addr: SocketAddr::from(([0, 0, 0, 0], port)),
            nebius_api_key: required_env("NEBIUS_API_KEY")?,
            nebius_base_url: env::var("NEBIUS_BASE_URL")
                .unwrap_or_else(|_| DEFAULT_NEBIUS_BASE_URL.to_owned()),
            nebius_model: required_env("NEBIUS_MODEL")?,
            stage_api_base_url: trim_trailing_slash(required_env("STAGE_API_BASE_URL")?),
            provider_timeout: Duration::from_secs(provider_timeout_seconds),
            auth_timeout: Duration::from_secs(auth_timeout_seconds),
            max_concurrent_generations: parse_non_zero_env_or("MAX_CONCURRENT_GENERATIONS", 4)?,
            max_request_bytes: parse_non_zero_env_or("MAX_REQUEST_BYTES", 12_000_000)?,
            request_limits: RequestLimits {
                max_component_bundles: parse_non_zero_env_or("MAX_COMPONENT_BUNDLES", 24)?,
                max_source_bytes: parse_non_zero_env_or("MAX_SOURCE_BYTES", 1_500_000)?,
                max_validation_failures: parse_non_zero_env_or("MAX_VALIDATION_FAILURES", 16)?,
            },
        })
    }
}

fn required_env(name: &'static str) -> Result<String, ConfigError> {
    let value = env::var(name).map_err(|_| ConfigError::Missing(name))?;
    if value.trim().is_empty() {
        return Err(ConfigError::Empty(name));
    }
    Ok(value)
}

fn parse_env_or<T>(name: &'static str, default: T) -> Result<T, ConfigError>
where
    T: std::str::FromStr,
{
    match env::var(name) {
        Ok(value) => value.parse().map_err(|_| ConfigError::Invalid(name, value)),
        Err(env::VarError::NotPresent) => Ok(default),
        Err(env::VarError::NotUnicode(_)) => Err(ConfigError::NotUnicode(name)),
    }
}

fn parse_non_zero_env_or(name: &'static str, default: usize) -> Result<usize, ConfigError> {
    let value = parse_env_or(name, default)?;
    if value == 0 {
        return Err(ConfigError::Zero(name));
    }
    Ok(value)
}

fn trim_trailing_slash(mut value: String) -> String {
    while value.ends_with('/') {
        value.pop();
    }
    value
}

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum ConfigError {
    #[error("required environment variable {0} is missing")]
    Missing(&'static str),
    #[error("required environment variable {0} is empty")]
    Empty(&'static str),
    #[error("environment variable {0} is not valid Unicode")]
    NotUnicode(&'static str),
    #[error("environment variable {0} has invalid value {1}")]
    Invalid(&'static str, String),
    #[error("environment variable {0} must be greater than zero")]
    Zero(&'static str),
}

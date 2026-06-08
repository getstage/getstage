use std::net::{IpAddr, Ipv4Addr, SocketAddr};

#[derive(Clone, Debug)]
pub struct AppConfig {
    pub host: IpAddr,
    pub port: u16,
    pub refero: ReferoConfig,
    pub paper: PaperConfig,
    pub figma: FigmaConfig,
    pub convex: ConvexConfig,
}

#[derive(Clone, Debug)]
pub struct ReferoConfig {
    pub mcp_url: String,
    pub token: Option<String>,
}

#[derive(Clone, Debug)]
pub struct PaperConfig {
    pub mcp_url: String,
}

#[derive(Clone, Debug)]
pub struct FigmaConfig;

#[derive(Clone, Debug)]
pub struct ConvexConfig {
    pub deployment_url: String,
}

impl AppConfig {
    pub fn from_env() -> anyhow::Result<Self> {
        let port = match std::env::var("STAGE_ENGINE_PORT") {
            Ok(raw) => raw.parse::<u16>()?,
            Err(_) => 48_221,
        };

        Ok(Self {
            host: IpAddr::V4(Ipv4Addr::LOCALHOST),
            port,
            refero: ReferoConfig::from_env(),
            paper: PaperConfig::from_env(),
            figma: FigmaConfig::from_env(),
            convex: ConvexConfig::from_env(),
        })
    }

    pub fn socket_addr(&self) -> SocketAddr {
        SocketAddr::new(self.host, self.port)
    }
}

impl PaperConfig {
    pub fn from_env() -> Self {
        Self {
            mcp_url: std::env::var("PAPER_MCP_URL")
                .unwrap_or_else(|_| "http://127.0.0.1:29979/mcp".to_string()),
        }
    }
}

impl ReferoConfig {
    pub fn from_env() -> Self {
        Self {
            mcp_url: std::env::var("REFERO_MCP_URL")
                .unwrap_or_else(|_| "https://api.refero.design/mcp".to_string()),
            token: std::env::var("REFERO_MCP_TOKEN")
                .ok()
                .filter(|token| !token.trim().is_empty()),
        }
    }

    pub fn is_configured(&self) -> bool {
        self.token.is_some()
    }
}

impl FigmaConfig {
    pub fn from_env() -> Self {
        Self
    }
}

impl ConvexConfig {
    pub fn from_env() -> Self {
        Self {
            deployment_url: std::env::var("CONVEX_URL")
                .or_else(|_| std::env::var("VITE_CONVEX_URL"))
                .unwrap_or_else(|_| "https://reliable-bullfrog-917.convex.cloud".to_string()),
        }
    }
}

use std::net::{IpAddr, Ipv4Addr, SocketAddr};

#[derive(Clone, Debug)]
pub struct AppConfig {
    pub host: IpAddr,
    pub port: u16,
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
        })
    }

    pub fn socket_addr(&self) -> SocketAddr {
        SocketAddr::new(self.host, self.port)
    }
}

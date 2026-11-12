use crate::config::ConvexConfig;

/// Where the engine reaches Refero and Details: Stage's backend relays (`/integrations/{refero,details}/mcp`),
/// which add Stage's keys server-side. The engine authenticates with the user's Stage session, so the keys
/// never reach the desktop app.
#[derive(Clone, Debug)]
pub struct ReferenceRelay {
    site_url: String,
}

impl ReferenceRelay {
    pub fn new(config: &ConvexConfig) -> Self {
        Self {
            site_url: http_actions_url(&config.deployment_url),
        }
    }

    pub fn refero_url(&self) -> String {
        format!("{}/integrations/refero/mcp", self.site_url)
    }

    pub fn details_url(&self) -> String {
        format!("{}/integrations/details/mcp", self.site_url)
    }
}

/// Convex serves HTTP actions on `.convex.site`; the client API lives on `.convex.cloud`.
fn http_actions_url(deployment_url: &str) -> String {
    deployment_url
        .trim_end_matches('/')
        .replace(".convex.cloud", ".convex.site")
}

#[cfg(test)]
mod tests {
    use super::http_actions_url;

    #[test]
    fn maps_deployment_url_to_http_actions_url() {
        assert_eq!(
            http_actions_url("https://reliable-bullfrog-917.convex.cloud/"),
            "https://reliable-bullfrog-917.convex.site"
        );
    }
}

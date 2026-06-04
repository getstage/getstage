#[derive(Clone, Debug, Eq, PartialEq)]
pub enum FlowsRegenerateTarget {
    Screen(String),
    Flow(String),
}

pub fn parse_flows_regenerate_target(source: Option<&str>) -> Option<FlowsRegenerateTarget> {
    let source = source?.trim();
    if let Some(screen_id) = source.strip_prefix("screen:") {
        let screen_id = screen_id.trim();
        if !screen_id.is_empty() {
            return Some(FlowsRegenerateTarget::Screen(screen_id.to_string()));
        }
    }
    if let Some(flow_id) = source.strip_prefix("flow:") {
        let flow_id = flow_id.trim();
        if !flow_id.is_empty() {
            return Some(FlowsRegenerateTarget::Flow(flow_id.to_string()));
        }
    }

    None
}

use serde_json::Value;

pub fn unwrap_mcp_tool_result(raw: &Value) -> Value {
    if let Some(structured) = raw.get("structuredContent") {
        return structured.clone();
    }

    if let Some(result) = raw.get("result") {
        return unwrap_mcp_tool_result(result);
    }

    if let Some(content) = raw.get("content").and_then(Value::as_array) {
        let mut merged_text = String::new();
        let mut collected = Vec::new();

        for item in content {
            if let Some(text) = item.get("text").and_then(Value::as_str) {
                merged_text.push_str(text);
            }

            if item.is_object() && item.get("type").is_none() {
                collected.push(item.clone());
            }
        }

        let trimmed = merged_text.trim();
        if !trimmed.is_empty() {
            if let Ok(parsed) = serde_json::from_str::<Value>(trimmed) {
                return parsed;
            }
        }

        if !collected.is_empty() {
            return Value::Array(collected);
        }
    }

    raw.clone()
}

pub fn extract_reference_values(raw: &Value) -> Vec<Value> {
    let unwrapped = unwrap_mcp_tool_result(raw);

    // Refero search tools return `{ pagination, records: [...] }`.
    for key in ["records", "items", "results", "screens", "flows", "data"] {
        if let Some(items) = unwrapped.get(key).and_then(Value::as_array) {
            return items.to_vec();
        }
    }

    if let Some(content) = unwrapped.get("content").and_then(Value::as_array) {
        return content.to_vec();
    }

    unwrapped
        .as_array()
        .map(|items| items.to_vec())
        .unwrap_or_default()
}

pub fn nested_string_field(value: &Value, path: &[&str]) -> Option<String> {
    let mut current = value;
    for key in path {
        current = current.get(*key)?;
    }

    string_field(current, &[])
        .or_else(|| current.as_str().map(str::trim).filter(|text| !text.is_empty()).map(ToOwned::to_owned))
}

fn numeric_id_field(value: &Value, keys: &[&str]) -> Option<String> {
    keys.iter().find_map(|key| {
        value.get(*key).and_then(|raw| {
            raw.as_u64()
                .or_else(|| raw.as_i64().and_then(|n| u64::try_from(n).ok()))
                .map(|id| id.to_string())
        })
    })
}

pub fn refero_tags(value: &Value) -> Vec<String> {
    use std::collections::BTreeSet;

    let mut tags = BTreeSet::new();
    for key in [
        "page_types",
        "pageTypes",
        "ux_patterns",
        "uxPatterns",
        "ui_elements",
        "uiElements",
        "tags",
        "categories",
    ] {
        for tag in string_array_field(value, &[key]) {
            tags.insert(tag);
        }
    }

    tags.into_iter().collect()
}

pub fn string_field(value: &Value, keys: &[&str]) -> Option<String> {
    if keys.is_empty() {
        return value
            .as_str()
            .map(str::trim)
            .filter(|text| !text.is_empty())
            .map(ToOwned::to_owned);
    }

    keys.iter()
        .find_map(|key| value.get(*key).and_then(Value::as_str))
        .map(str::trim)
        .filter(|text| !text.is_empty())
        .map(ToOwned::to_owned)
}

pub fn string_array_field(value: &Value, keys: &[&str]) -> Vec<String> {
    keys.iter()
        .find_map(|key| value.get(*key).and_then(Value::as_array))
        .map(|items| {
            items
                .iter()
                .filter_map(Value::as_str)
                .map(str::trim)
                .filter(|text| !text.is_empty())
                .map(ToOwned::to_owned)
                .collect()
        })
        .unwrap_or_default()
}

pub fn decode_image_bytes(raw: &Value) -> Option<Vec<u8>> {
    if let Some(bytes) = raw.as_array() {
        return Some(bytes.iter().filter_map(|v| v.as_u64().map(|n| n as u8)).collect());
    }

    if let Some(text) = raw.as_str() {
        if text.starts_with("data:") {
            let payload = text.split_once(',').map(|(_, data)| data).unwrap_or(text);
            return base64_decode(payload);
        }
        return base64_decode(text);
    }

    if let Some(content) = raw.get("content") {
        return decode_image_bytes(content);
    }

    if let Some(data) = raw.get("data").and_then(Value::as_str) {
        return base64_decode(data);
    }

    None
}

fn base64_decode(input: &str) -> Option<Vec<u8>> {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let cleaned: String = input.chars().filter(|c| !c.is_whitespace()).collect();
    if cleaned.is_empty() {
        return None;
    }

    let mut bytes = Vec::with_capacity(cleaned.len() * 3 / 4);
    let mut buffer = 0u32;
    let mut bits = 0;

    for ch in cleaned.chars() {
        if ch == '=' {
            break;
        }
        let value = TABLE.iter().position(|&byte| byte as char == ch)? as u32;
        buffer = (buffer << 6) | value;
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            bytes.push((buffer >> bits) as u8);
            buffer &= (1 << bits) - 1;
        }
    }

    if bytes.is_empty() {
        return None;
    }

    Some(bytes)
}

pub fn infer_image_mime(bytes: &[u8]) -> &'static str {
    if bytes.starts_with(&[0x89, b'P', b'N', b'G']) {
        "image/png"
    } else if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        "image/jpeg"
    } else if bytes.starts_with(b"RIFF") && bytes.get(8..12) == Some(b"WEBP") {
        "image/webp"
    } else {
        "image/png"
    }
}

pub fn infer_extension(mime_type: &str) -> &'static str {
    match mime_type {
        "image/jpeg" => "jpg",
        "image/webp" => "webp",
        _ => "png",
    }
}

pub fn reference_id(value: &Value, kind: &str, index: usize) -> String {
    let id = match kind {
        "flow" => numeric_id_field(value, &["id", "flowId", "flow_id"]).or_else(|| {
            string_field(value, &["uuid", "slug", "id", "flowId", "flow_id", "_id"])
        }),
        "style" => string_field(value, &["uuid", "styleId", "style_id", "id", "slug", "_id"]),
        _ => string_field(
            value,
            &["uuid", "screenId", "screen_id", "id", "slug", "_id"],
        ),
    };

    id.unwrap_or_else(|| format!("{kind}-{index}"))
}

/// Fallback ids we generate when Refero MCP omits a real screen/flow id.
pub fn is_synthetic_reference_id(id: &str) -> bool {
    let Some((prefix, suffix)) = id.split_once('-') else {
        return false;
    };

    matches!(prefix, "screen" | "flow" | "style") && !suffix.is_empty() && suffix.chars().all(|c| c.is_ascii_digit())
}

pub fn looks_like_image_bytes(bytes: &[u8]) -> bool {
    if bytes.len() < 12 {
        return false;
    }

    bytes.starts_with(&[0x89, b'P', b'N', b'G'])
        || bytes.starts_with(&[0xFF, 0xD8, 0xFF])
        || (bytes.starts_with(b"RIFF") && bytes.get(8..12) == Some(b"WEBP"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn unwraps_json_from_mcp_text_content() {
        let raw = json!({
            "content": [{
                "type": "text",
                "text": "[{\"id\":\"abc\",\"title\":\"Pricing\"}]"
            }]
        });

        let parsed = unwrap_mcp_tool_result(&raw);
        assert!(parsed.as_array().is_some());
    }

    #[test]
    fn detects_synthetic_reference_ids() {
        assert!(is_synthetic_reference_id("screen-0"));
        assert!(is_synthetic_reference_id("flow-3"));
        assert!(!is_synthetic_reference_id("550e8400-e29b-41d4-a716-446655440000"));
    }

    #[test]
    fn extracts_records_from_refero_search_payload() {
        let raw = json!({
            "pagination": { "page": 1, "count": 1 },
            "records": [{
                "uuid": "20c61554-3c93-4848-aeb1-e3c1ba62d99d",
                "platform": "web",
                "thumbnail_url": "https://images.refero.design/screenshots/example.png"
            }]
        });

        let records = extract_reference_values(&raw);
        assert_eq!(records.len(), 1);
        assert_eq!(
            reference_id(&records[0], "screen", 0),
            "20c61554-3c93-4848-aeb1-e3c1ba62d99d"
        );
    }

    #[test]
    fn extracts_numeric_flow_id() {
        let raw = json!({
            "records": [{
                "id": 11201,
                "name": "Subscription cancellation",
                "platform": "web"
            }]
        });

        let records = extract_reference_values(&raw);
        assert_eq!(reference_id(&records[0], "flow", 0), "11201");
    }
}

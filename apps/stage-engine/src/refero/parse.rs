use serde_json::{Value, json};

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
            if !items.is_empty() {
                return items.to_vec();
            }
        }
    }

    // Refero defaults to markdown when `response_format: "json"` is omitted.
    for source in [raw, &unwrapped] {
        if let Some(markdown_records) = extract_records_from_refero_markdown(source) {
            if !markdown_records.is_empty() {
                tracing::warn!(
                    record_count = markdown_records.len(),
                    "Parsed Refero search results from markdown fallback (missing response_format=json?)"
                );
                return markdown_records;
            }
        }
    }

    if let Some(content) = unwrapped.get("content").and_then(Value::as_array) {
        if content.iter().all(|item| looks_like_refero_record(item)) && !content.is_empty() {
            return content.to_vec();
        }
    }

    if let Some(items) = unwrapped.as_array() {
        if items.iter().all(|item| looks_like_refero_record(item)) && !items.is_empty() {
            return items.to_vec();
        }
    }

    Vec::new()
}

fn looks_like_refero_record(value: &Value) -> bool {
    value.get("uuid").is_some()
        || value.get("id").is_some()
        || value.get("screenId").is_some()
        || value.get("flowId").is_some()
}

fn extract_records_from_refero_markdown(value: &Value) -> Option<Vec<Value>> {
    let text = collect_refero_markdown_text(value)?;
    let mut records = Vec::new();
    let mut current_uuid: Option<String> = None;
    let mut thumbnail_url: Option<String> = None;
    let mut preview_url: Option<String> = None;
    let mut page_url: Option<String> = None;
    let mut product_name: Option<String> = None;

    let flush = |records: &mut Vec<Value>,
                 uuid: &mut Option<String>,
                 thumbnail_url: &mut Option<String>,
                 preview_url: &mut Option<String>,
                 page_url: &mut Option<String>,
                 product_name: &mut Option<String>| {
        let Some(id) = uuid.take() else {
            return;
        };

        let mut record = serde_json::Map::new();
        record.insert("uuid".to_string(), Value::String(id));
        if let Some(url) = thumbnail_url.take() {
            record.insert("thumbnail_url".to_string(), Value::String(url));
        }
        if let Some(url) = preview_url.take() {
            record.insert("preview_url".to_string(), Value::String(url));
        }
        if let Some(url) = page_url.take() {
            record.insert("page_url".to_string(), Value::String(url));
        }
        if let Some(name) = product_name.take() {
            record.insert("site".to_string(), json!({ "name": name }));
        }

        records.push(Value::Object(record));
    };

    for line in text.lines() {
        let trimmed = line.trim();

        if let Some(id) = trimmed.strip_prefix("## Screen: ") {
            flush(
                &mut records,
                &mut current_uuid,
                &mut thumbnail_url,
                &mut preview_url,
                &mut page_url,
                &mut product_name,
            );
            current_uuid = Some(id.trim().to_string());
            continue;
        }

        if let Some(id) = trimmed.strip_prefix("## Flow: ") {
            flush(
                &mut records,
                &mut current_uuid,
                &mut thumbnail_url,
                &mut preview_url,
                &mut page_url,
                &mut product_name,
            );
            if let Ok(flow_id) = id.trim().parse::<u64>() {
                records.push(json!({
                    "id": flow_id,
                    "name": "Refero flow",
                    "platform": "web",
                }));
            }
            current_uuid = None;
            continue;
        }

        if current_uuid.is_some() {
            if let Some(url) = extract_markdown_field(trimmed, "Thumbnail URL") {
                thumbnail_url = Some(url);
            } else if let Some(url) = extract_markdown_field(trimmed, "Preview URL") {
                preview_url = Some(url);
            } else if let Some(url) = extract_markdown_field(trimmed, "Page URL") {
                page_url = Some(url);
            } else if let Some(name) = extract_markdown_field(trimmed, "Site") {
                product_name = Some(name);
            }
        }
    }

    flush(
        &mut records,
        &mut current_uuid,
        &mut thumbnail_url,
        &mut preview_url,
        &mut page_url,
        &mut product_name,
    );

    if records.is_empty() {
        None
    } else {
        Some(records)
    }
}

fn collect_refero_markdown_text(value: &Value) -> Option<String> {
    if let Some(text) = value.as_str() {
        return Some(text.to_string());
    }

    if let Some(content) = value.get("content").and_then(Value::as_array) {
        let merged = content
            .iter()
            .filter_map(|item| item.get("text").and_then(Value::as_str))
            .collect::<String>();
        if !merged.trim().is_empty() {
            return Some(merged);
        }
    }

    None
}

fn extract_markdown_field(line: &str, label: &str) -> Option<String> {
    let marker = format!("**{label}**:");
    let rest = line.strip_prefix(&marker)?.trim();
    if rest.is_empty() {
        return None;
    }
    Some(rest.to_string())
}

pub fn nested_string_field(value: &Value, path: &[&str]) -> Option<String> {
    let mut current = value;
    for key in path {
        current = current.get(*key)?;
    }

    string_field(current, &[]).or_else(|| {
        current
            .as_str()
            .map(str::trim)
            .filter(|text| !text.is_empty())
            .map(ToOwned::to_owned)
    })
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
        return Some(
            bytes
                .iter()
                .filter_map(|v| v.as_u64().map(|n| n as u8))
                .collect(),
        );
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
    } else if bytes.starts_with(b"GIF87a") || bytes.starts_with(b"GIF89a") {
        "image/gif"
    } else {
        "image/png"
    }
}

pub fn infer_extension(mime_type: &str) -> &'static str {
    match mime_type {
        "image/jpeg" => "jpg",
        "image/webp" => "webp",
        "image/gif" => "gif",
        _ => "png",
    }
}

pub fn reference_id(value: &Value, kind: &str, index: usize) -> String {
    let id = match kind {
        "flow" => numeric_id_field(value, &["id", "flowId", "flow_id"])
            .or_else(|| string_field(value, &["uuid", "slug", "id", "flowId", "flow_id", "_id"])),
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

    matches!(prefix, "screen" | "flow" | "style")
        && !suffix.is_empty()
        && suffix.chars().all(|c| c.is_ascii_digit())
}

pub fn looks_like_image_bytes(bytes: &[u8]) -> bool {
    if bytes.len() < 12 {
        return false;
    }

    bytes.starts_with(&[0x89, b'P', b'N', b'G'])
        || bytes.starts_with(&[0xFF, 0xD8, 0xFF])
        || (bytes.starts_with(b"RIFF") && bytes.get(8..12) == Some(b"WEBP"))
        || bytes.starts_with(b"GIF87a")
        || bytes.starts_with(b"GIF89a")
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
        assert!(!is_synthetic_reference_id(
            "550e8400-e29b-41d4-a716-446655440000"
        ));
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

    #[test]
    fn extracts_records_from_refero_markdown() {
        let raw = json!({
            "content": [{
                "type": "text",
                "text": "*Page 1 of 100 · 1000 results*\n\n## Screen: e680e476-6cd9-4ee0-a001-d961efbf9ab9\n\n- **Platform**: web\n- **Thumbnail URL**: https://images.refero.design/screenshots/example_thumb.jpg\n- **Page URL**: https://example.com/checkout\n\n## Screen: f87d2cf7-183b-4188-ae10-30864ee67fa6\n\n- **Thumbnail URL**: https://images.refero.design/screenshots/example2_thumb.jpg\n"
            }]
        });

        let records = extract_reference_values(&raw);
        assert_eq!(records.len(), 2);
        assert_eq!(
            reference_id(&records[0], "screen", 0),
            "e680e476-6cd9-4ee0-a001-d961efbf9ab9"
        );
    }
}

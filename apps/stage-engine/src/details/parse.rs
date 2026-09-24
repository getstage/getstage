use serde_json::Value;

use crate::refero::parse::unwrap_mcp_tool_result;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct DetailsSearchHit {
    pub id: String,
    pub title: String,
    pub product_name: Option<String>,
    pub source_url: Option<String>,
    pub thumbnail_url: Option<String>,
    pub tags: Vec<String>,
}

pub fn extract_search_hits(raw: &Value) -> Vec<DetailsSearchHit> {
    unwrap_mcp_tool_result(raw)
        .as_array()
        .cloned()
        .or_else(|| first_array(&unwrap_mcp_tool_result(raw)))
        .unwrap_or_default()
        .into_iter()
        .filter_map(|item| parse_search_hit(&item))
        .collect()
}

pub fn media_image_url(raw: &Value) -> Option<String> {
    let structured = unwrap_mcp_tool_result(raw);
    let media = structured.get("media").unwrap_or(&structured);

    string_field(media, &["imageUrl", "image_url"])
        .or_else(|| {
            media
                .get("frameUrls")
                .or_else(|| media.get("frame_urls"))
                .and_then(Value::as_array)
                .and_then(|frames| frames.get(frames.len() / 2))
                .and_then(Value::as_str)
                .map(ToOwned::to_owned)
        })
        .or_else(|| {
            media
                .get("assets")
                .and_then(Value::as_array)
                .and_then(|assets| assets.first())
                .and_then(|asset| string_field(asset, &["url", "imageUrl", "posterUrl"]))
        })
        .or_else(|| string_field(media, &["posterUrl", "poster_url"]))
}

fn parse_search_hit(item: &Value) -> Option<DetailsSearchHit> {
    let id = string_field(item, &["id", "inspirationId", "inspiration_id", "slug"])?;
    let title = string_field(item, &["title", "name", "label"]).unwrap_or_else(|| id.clone());
    Some(DetailsSearchHit {
        id,
        title,
        product_name: string_field(
            item,
            &["siteName", "site_name", "productName", "brand", "site"],
        ),
        source_url: string_field(item, &["url", "sourceUrl", "pageUrl", "siteUrl"]),
        thumbnail_url: string_field(
            item,
            &[
                "previewUrl",
                "preview_url",
                "thumbnailUrl",
                "imageUrl",
                "posterUrl",
                "coverUrl",
            ],
        ),
        tags: string_array_field(item, &["tags", "categories", "labels"]),
    })
}

fn first_array(value: &Value) -> Option<Vec<Value>> {
    for key in [
        "inspirations",
        "items",
        "results",
        "records",
        "data",
        "hits",
    ] {
        if let Some(items) = value.get(key).and_then(Value::as_array)
            && !items.is_empty()
        {
            return Some(items.clone());
        }
    }
    None
}

fn string_field(value: &Value, keys: &[&str]) -> Option<String> {
    keys.iter().find_map(|key| {
        value
            .get(key)
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|text| !text.is_empty())
            .map(ToOwned::to_owned)
    })
}

fn string_array_field(value: &Value, keys: &[&str]) -> Vec<String> {
    keys.iter()
        .find_map(|key| value.get(key).and_then(Value::as_array))
        .into_iter()
        .flatten()
        .filter_map(Value::as_str)
        .map(str::trim)
        .filter(|text| !text.is_empty())
        .map(ToOwned::to_owned)
        .collect()
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::{extract_search_hits, media_image_url};

    #[test]
    fn extracts_search_hits_from_details_results() {
        let raw = json!({
            "structuredContent": {
                "results": [
                    {
                        "id": "insp-1",
                        "title": "Linear pricing",
                        "site": "linear.app",
                        "sourceUrl": "https://linear.app/pricing",
                        "previewUrl": "https://cdn.details.so/preview.jpg",
                        "tags": ["pricing", "saas"]
                    }
                ]
            }
        });

        let hits = extract_search_hits(&raw);
        assert_eq!(hits.len(), 1);
        assert_eq!(hits[0].id, "insp-1");
        assert_eq!(hits[0].product_name.as_deref(), Some("linear.app"));
        assert_eq!(
            hits[0].thumbnail_url.as_deref(),
            Some("https://cdn.details.so/preview.jpg")
        );
    }

    #[test]
    fn prefers_middle_video_frame_over_poster() {
        let raw = json!({
            "media": {
                "kind": "video",
                "posterUrl": "https://cdn.details.so/poster.jpg",
                "videoUrl": "https://cdn.details.so/clip.mp4",
                "frameUrls": [
                    "https://cdn.details.so/frame-1.jpg",
                    "https://cdn.details.so/frame-2.jpg",
                    "https://cdn.details.so/frame-3.jpg"
                ],
                "assets": [{ "kind": "frame", "url": "https://cdn.details.so/asset.jpg" }]
            }
        });

        assert_eq!(
            media_image_url(&raw).as_deref(),
            Some("https://cdn.details.so/frame-2.jpg")
        );
    }
}

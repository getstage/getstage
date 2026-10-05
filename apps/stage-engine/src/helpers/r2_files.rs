// Downloading uploaded files (brand kits, research briefs) from the public R2 bucket.

pub fn r2_object_url(key: &str, r2_public_base_url: Option<&str>) -> Option<String> {
    let trimmed = key.trim();
    // Default-deny: accept only a relative R2 object key, never a caller-supplied URL,
    // absolute path, or traversal. Otherwise a run could make the local engine fetch
    // arbitrary or internal network URLs (SSRF).
    if trimmed.is_empty()
        || trimmed.contains("://")
        || trimmed.starts_with('/')
        || trimmed.contains("..")
    {
        return None;
    }

    let base = r2_public_base_url
        .filter(|base| !base.trim().is_empty())?
        .trim_end_matches('/');
    Some(format!("{base}/{trimmed}"))
}

pub fn extension_from_key(key: &str) -> &str {
    key.rsplit('/')
        .next()
        .and_then(|name| name.rsplit_once('.'))
        .map(|(_, ext)| ext)
        .filter(|ext| {
            !ext.is_empty() && ext.len() <= 5 && ext.chars().all(|c| c.is_ascii_alphanumeric())
        })
        .unwrap_or("bin")
}

pub async fn fetch_bytes(url: &str) -> Result<Vec<u8>, reqwest::Error> {
    let response = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::limited(3))
        .build()?
        .get(url)
        .send()
        .await?
        .error_for_status()?;
    Ok(response.bytes().await?.to_vec())
}

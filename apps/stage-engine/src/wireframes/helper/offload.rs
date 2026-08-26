/// Moves React-rendered screens out of the artifact and into R2: the compiled
/// stylesheet is identical across a run's screens, and embedding it in every
/// fragment is what pushed Mantine runs past Convex's 1 MiB document limit,
/// losing the whole run at save time. The stylesheet uploads once, each rendered
/// screen's fragment uploads once, and the artifact keeps only the keys
/// (`cssUrl` at the root, `htmlUrl` per screen) — reads resolve them to URLs.
///
/// Best-effort degradation: when the stylesheet upload fails, every rendered
/// screen gets the CSS re-embedded inline (the pre-offload shape); when a single
/// screen's upload fails, only that screen does. An R2 outage degrades to the
/// old behaviour instead of losing the run.
pub(crate) async fn offload_rendered_screens(
    asset_uploader: &crate::convex_store::asset_upload::ConvexAssetUploader,
    auth_token: &str,
    project_id: &str,
    artifact: &mut serde_json::Value,
    css: &str,
) {
    // Only React-rendered screens reference the shared build; model-HTML
    // fallbacks are self-contained and stay untouched either way.
    let embed_css = |screen: &mut serde_json::Value| {
        let is_react = screen.get("renderMode").and_then(serde_json::Value::as_str)
            == Some(crate::wireframes::render::RENDER_MODE_REACT);
        if !is_react {
            return;
        }
        if let Some(object) = screen.as_object_mut()
            && let Some(html) = object.get("html").and_then(serde_json::Value::as_str)
            && !html.trim().is_empty()
        {
            object.insert(
                "html".to_string(),
                serde_json::json!(format!("<style data-stage-render>{css}</style>\n{html}")),
            );
        }
    };

    let css_key = match asset_uploader
        .upload_file(
            auth_token,
            project_id,
            "wireframe-screen",
            "wireframes.css",
            "text/css",
            css.as_bytes(),
        )
        .await
    {
        Ok(key) => key,
        Err(error) => {
            tracing::warn!(
                error = error.to_string(),
                "wireframes stylesheet upload failed; keeping CSS inline"
            );
            if let Some(screens) = artifact
                .get_mut("generatedScreens")
                .and_then(serde_json::Value::as_array_mut)
            {
                for screen in screens.iter_mut() {
                    embed_css(screen);
                }
            }
            return;
        }
    };

    let mut offloaded = 0usize;
    let Some(screens) = artifact
        .get_mut("generatedScreens")
        .and_then(serde_json::Value::as_array_mut)
    else {
        return;
    };
    for screen in screens.iter_mut() {
        let is_react = screen.get("renderMode").and_then(serde_json::Value::as_str)
            == Some(crate::wireframes::render::RENDER_MODE_REACT);
        let html = screen
            .get("html")
            .and_then(serde_json::Value::as_str)
            .unwrap_or("")
            .trim()
            .to_string();
        if !is_react || html.is_empty() {
            continue;
        }
        let screen_id = screen
            .get("id")
            .and_then(serde_json::Value::as_str)
            .unwrap_or("screen")
            .to_string();
        match asset_uploader
            .upload_file(
                auth_token,
                project_id,
                "wireframe-screen",
                &format!("{screen_id}.html"),
                "text/html",
                html.as_bytes(),
            )
            .await
        {
            Ok(key) => {
                if let Some(object) = screen.as_object_mut() {
                    object.insert("htmlUrl".to_string(), serde_json::json!(key));
                    object.remove("html");
                }
                offloaded += 1;
            }
            Err(error) => {
                tracing::warn!(
                    error = error.to_string(),
                    screen_id = screen_id.as_str(),
                    "wireframe screen upload failed; keeping its CSS inline"
                );
                embed_css(screen);
            }
        }

        // The live bundle (React + motion) rides in R2 too — far too large to inline.
        // On upload failure drop it so the artifact stays small; the static html
        // preview is the fallback.
        let live = screen
            .get("liveHtml")
            .and_then(serde_json::Value::as_str)
            .unwrap_or("")
            .trim()
            .to_string();
        if !live.is_empty() {
            let live_key = asset_uploader
                .upload_file(
                    auth_token,
                    project_id,
                    "wireframe-screen",
                    &format!("{screen_id}.live.html"),
                    "text/html",
                    live.as_bytes(),
                )
                .await;
            if let Some(object) = screen.as_object_mut() {
                object.remove("liveHtml");
                if let Ok(key) = live_key {
                    object.insert("liveUrl".to_string(), serde_json::json!(key));
                }
            }
        }
    }

    // No point publishing a stylesheet key when every screen kept its inline copy.
    if offloaded > 0
        && let Some(object) = artifact.as_object_mut()
    {
        object.insert("cssUrl".to_string(), serde_json::json!(css_key));
    }
    tracing::info!(offloaded, "offloaded rendered wireframe screens to R2");
}

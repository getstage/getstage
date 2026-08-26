pub(crate) fn parse_kind_from_source(source: &str) -> Option<&str> {
    parse_token(source, "kind:")
}

pub(crate) fn parse_brand_source_from_source(source: &str) -> Option<&str> {
    parse_token(source, "brand:")
}

pub(crate) fn parse_style_direction_from_source(source: &str) -> Option<&str> {
    parse_token(source, "style-direction:")
}

pub(crate) fn parse_screens_from_source(source: &str) -> Option<Vec<String>> {
    let raw = parse_token(source, "screens:")?;
    let ids = raw
        .split(';')
        .map(str::trim)
        .filter(|segment| !segment.is_empty())
        .map(ToOwned::to_owned)
        .collect::<Vec<_>>();
    if ids.is_empty() { None } else { Some(ids) }
}

pub(crate) fn parse_token<'a>(source: &'a str, prefix: &str) -> Option<&'a str> {
    source
        .split(',')
        .map(str::trim)
        .find(|segment| segment.starts_with(prefix))
        .map(|segment| &segment[prefix.len()..])
}

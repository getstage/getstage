use super::*;

#[test]
fn parses_kind_brand_and_style_direction_from_source() {
    let source = "kind:hifi,brand:style-guide,style-direction:dir_42";

    assert_eq!(parse_kind_from_source(source), Some("hifi"));
    assert_eq!(parse_brand_source_from_source(source), Some("style-guide"));
    assert_eq!(
        parse_style_direction_from_source(source),
        Some("dir_42")
    );
}

#[test]
fn parses_multiple_screen_ids_from_semicolon_delimited_token() {
    let source = "kind:hifi,brand:brand-kit,screens:homepage;pricing;checkout";

    assert_eq!(
        parse_screens_from_source(source),
        Some(vec![
            "homepage".to_string(),
            "pricing".to_string(),
            "checkout".to_string()
        ])
    );
}

#[test]
fn returns_none_when_screens_token_is_empty() {
    let source = "kind:hifi,screens:";

    assert_eq!(parse_screens_from_source(source), None);
}

#[test]
fn parse_token_splits_on_commas_not_semicolons() {
    let source = "kind:hifi,screens:screen-a;screen-b";

    assert_eq!(parse_token(source, "screens:"), Some("screen-a;screen-b"));
}

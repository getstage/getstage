//! Pure-ish helpers for the wireframes workflow: parsing, workspace materialization,
//! parallel screen runs, brand kit fetch, and artifact merge/validation.
//!
//! `workflow.rs` owns orchestration; these modules own the supporting mechanics.

pub(crate) mod artifact;
pub(crate) mod attachments;
pub(crate) mod brand_kit;
pub(crate) mod design_director;
pub(crate) mod error;
pub(crate) mod events;
pub(crate) mod offload;
pub(crate) mod parallel;
pub(crate) mod source;
pub(crate) mod workspace;

pub(crate) use artifact::{
    configured_screens_from_input, merge_tsx_screens, missing_screen_ids,
    selected_moodboard_asset_keys,
};
pub(crate) use attachments::{MAX_MOODBOARD_IMAGES, fetch_visual_attachments};
pub(crate) use design_director::resolve_design_plan;
pub(crate) use error::WorkflowError;
pub(crate) use events::{tool_completed, tool_started};
pub(crate) use offload::offload_rendered_screens;
pub(crate) use parallel::{MAX_PARALLEL_SCREEN_RUNS, run_screens_in_parallel};
pub(crate) use source::{
    parse_brand_source_from_source, parse_kind_from_source, parse_screens_from_source,
    parse_style_direction_from_source,
};
pub(crate) use workspace::{
    configure_provider_workspace_call, materialize_common_workspace, materialize_screen_call,
    safe_context_segment, screen_workspace_required_files,
};

pub mod debug_dump;
pub mod design_plan;
pub mod gateway;
pub(crate) mod helper;
pub mod normalize;
pub mod prompt;
pub mod provider_workspace;
pub mod quality;
pub mod render;
pub mod workflow;

/// Tunable limits for the wireframes module, kept in one place.
/// Caps on how many blocks/sections a normalized screen may keep.
pub(crate) const MAX_SECTIONS_PER_SCREEN: usize = 8;
pub(crate) const MAX_BLOCKS_PER_SECTION: usize = 8;
/// How many brand kit files a Hi-Fi run will fetch and attach, and the per-file size cap.
pub(crate) const MAX_BRAND_KIT_FILES: usize = 4;
pub(crate) const MAX_BRAND_KIT_BYTES: usize = 10 * 1024 * 1024;

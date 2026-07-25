#![allow(dead_code)]
// Research workflow boundary. This module turns Stage project input plus Refero
// context into provider-ready prompts and, next, typed Research artifacts.

pub mod competitive;
pub mod context;
pub mod normalize;
pub mod pipeline;
pub mod prompt;
pub mod refero_assets;
pub mod section;
pub mod service;
pub mod workflow;

#[cfg(test)]
#[path = "../testing/research/fixtures.rs"]
pub(crate) mod fixtures;

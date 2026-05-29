//! Learning note: Tokio concurrency pattern for the future Stage Rust engine.
//!
//! This is not part of the desktop build. It is a small scratch example that
//! shows the V1 technique we want later in `apps/stage-engine`: spawn bounded
//! async work, await all jobs, and keep network/file work off the UI process.
//!
//! To turn this into a runnable example later, place it in a Cargo project with:
//!
//! [dependencies]
//! anyhow = "1"
//! futures = "0.3"
//! reqwest = "0.12"
//! tokio = { version = "1", features = ["full"] }

use anyhow::Result;
use futures::future::join_all;

#[tokio::main(worker_threads = 2)]
async fn main() -> Result<()> {
    fetch_known_pages().await?;
    fetch_many_with_join_all().await?;
    Ok(())
}

async fn fetch_known_pages() -> Result<()> {
    let hacker_news = tokio::spawn(get_page("https://news.ycombinator.com/"));
    let lobsters = tokio::spawn(get_page("https://www.lobste.rs/"));
    let daily_dev = tokio::spawn(get_page("https://www.daily.dev/"));
    let hashnode = get_page("https://www.hashnode.com/");

    let _ = tokio::join!(hacker_news, lobsters, daily_dev, hashnode);
    Ok(())
}

async fn fetch_many_with_join_all() -> Result<()> {
    let handles = (0..=50).map(|_| {
        tokio::spawn(get_page("https://news.ycombinator.com/"))
    });

    let _ = join_all(handles).await;
    Ok(())
}

async fn get_page(url: &str) -> Result<()> {
    println!("Retrieving {url}");
    let _response = reqwest::get(url).await?;
    println!("Retrieved {url}");
    Ok(())
}

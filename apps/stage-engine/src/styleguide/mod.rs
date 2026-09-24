use crate::models::research::ProjectCategory;

mod normalize;
mod prompt;
mod workflow;

pub use workflow::StyleguideWorkflow;

fn category_conventions(category: ProjectCategory) -> &'static [&'static str] {
    match category {
        ProjectCategory::Websites => &[
            "Use responsive marketing-page hierarchy with a clear narrative and conversion path.",
            "Specify semantic page sections, reusable content modules, and mobile-through-desktop behavior.",
            "Treat performance, accessibility, SEO structure, and content scanning as first-class constraints.",
        ],
        ProjectCategory::WebApps => &[
            "Use stateful product patterns with explicit navigation, system feedback, forms, tables, and empty states.",
            "Specify responsive application shells and information density for sustained use.",
            "Cover keyboard access, loading, error, success, and permission states.",
        ],
        ProjectCategory::IosApps => &[
            "Follow native iOS navigation, safe-area, sheet, tab, and gesture conventions.",
            "Use Dynamic Type-compatible hierarchy and touch targets of at least 44 points.",
            "Specify light and dark appearance behavior plus loading, error, empty, and permission states.",
        ],
    }
}

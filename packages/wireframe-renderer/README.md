# Stage Wireframe Renderer

Private monorepo package that renders model-generated TSX to Stage's existing static HTML-fragment contract.

## Contract

The CLI reads one JSON batch from stdin:

```json
{
  "version": 2,
  "screens": [{ "id": "home", "tsx": "..." }],
  "catalog": [{ "path": "components/hero.tsx", "content": "..." }]
}
```

The Rust workflow retrieves verified component source through Convex RAG and asks the provider to compose a screen from those files. The renderer writes `catalog[]` into the batch, maps `@/` onto that root, and permits `react`, `lucide-react`, `motion`, `next/link` (rewritten to `<a>`), and `@/` specifiers that resolve to a retrieved file. Nested registry files are loaded with a cap so one particle cannot pull the entire registry. Local `@stage/*` aliases, eval, fetch, and other runtime capabilities stay rejected. It renders with `react-dom/server`, compiles Tailwind once per batch, and returns static plus sandboxed live output. A failed screen never replaces its HTML fallback.

## Sources

Exact component sources live in R2. Convex stores searchable metadata and Qwen embeddings; the renderer intentionally contains no copied component library.

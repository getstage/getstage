import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { flowsArtifactSchema, type FlowsArtifact, type FlowsCanvasEdit, type ProjectCategory } from "@stage/data-ops/contracts";
import { applyFlowsCanvasEdit, getFlowCanvasBoard } from "@stage/data-ops/domain";
import { FlowsCanvas } from "../../../src/components/project/tabs/flows/FlowsCanvas";
import { STAGE_CHAT_OPEN_REQUEST } from "../../../src/lib/companion/shortcutEvents";
import "../../../src/styles/globals.css";

const storeKey = "sta56.test.canvas";
const initial: FlowsArtifact = {
  apiVersion: "v1", artifactKind: "flowsArtifact", projectId: "local-test", title: "Isolated fixture", generatedAt: 1,
  flows: [{ id: "sitemap", title: "Website structure", description: "Local browser test only", category: "Website", status: "Draft", screenCount: 4,
    steps: ["Home", "About", "Features", "Pricing"].map((label, order) => ({ id: label.toLowerCase(), label, order, screenId: label === "Home" ? "screen-home" : label === "Features" ? "screen-features" : label === "Pricing" ? "removed-screen" : undefined })) }],
  screens: [
    { id: "screen-home", title: "Homepage", description: "Primary landing page with navigation and calls to action.", flowCount: 1, keyElements: ["Sticky header with Primary CTA", "Dropdown menu with secondary options", "Search bar with filter capabilities", "Interactive table with sorting features", "Pagination controls for large datasets", "Contextual help tooltip for user guidance", "Responsive design for mobile compatibility", "User avatar with dropdown profile settings"] },
    { id: "screen-features", title: "Feature overview", description: "Saved details resolved by screen ID, not the node label.", flowCount: 1, keyElements: ["Filterable feature list", "Feature comparison"] },
  ],
  canvas: { version: 1, boards: [{ flowId: "sitemap", positions: [{ stepId: "home", x: 350, y: 80 }, { stepId: "about", x: 100, y: 210 }, { stepId: "features", x: 350, y: 210 }, { stepId: "pricing", x: 600, y: 210 }], edges: [{ source: "home", target: "about" }, { source: "home", target: "features" }] }] },
};
function readState() {
  const json = localStorage.getItem(storeKey);
  if (!json) return { artifact: initial, updatedAt: 1 };
  const stored = JSON.parse(json);
  return { artifact: flowsArtifactSchema.parse(stored.artifact), updatedAt: Number(stored.updatedAt) };
}
declare global {
  interface Window { __canvasEdits: FlowsCanvasEdit[]; __chatRequests: number; __screenSaves: number; }
}
window.__canvasEdits = [];
window.__chatRequests = 0;
window.__screenSaves = 0;

function App() {
  const [state, setState] = useState(readState);
  const [category, setCategory] = useState<ProjectCategory>("websites");
  const [fail, setFail] = useState(false);
  const [add, setAdd] = useState(false);
  const [paused, setPaused] = useState(false);
  function commit(edit: FlowsCanvasEdit) {
    const current = readState();
    const next = { artifact: applyFlowsCanvasEdit(current.artifact, edit), updatedAt: Math.max(Date.now(), current.updatedAt + 1) };
    localStorage.setItem(storeKey, JSON.stringify(next));
    setState(next);
    return next;
  }
  useEffect(() => {
    const sync = (event: StorageEvent) => { if (event.key === storeKey) setState(readState()); };
    const chat = () => { window.__chatRequests += 1; };
    window.addEventListener("storage", sync);
    window.addEventListener(STAGE_CHAT_OPEN_REQUEST, chat);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener(STAGE_CHAT_OPEN_REQUEST, chat); };
  }, []);
  return <main>
    <h1>STA-56 canvas · isolated test fixture</h1>
    <p>No account/backend writes. Saves and remote updates are simulated locally.</p>
    <button onClick={() => setCategory(category === "websites" ? "web-apps" : "websites")}>Switch category</button>
    <button onClick={() => setFail((current) => !current)}>Toggle failed saves</button>
    <button onClick={() => setPaused((current) => !current)}>Toggle editing paused</button>
    <button onClick={() => {
      const from = getFlowCanvasBoard(readState().artifact.flows[0], readState().artifact.canvas).positions.find((position) => position.stepId === "home");
      if (from) commit({ type: "move", flowId: "sitemap", stepId: "home", from, to: { x: from.x + 25, y: from.y + 25 } });
    }}>Simulate remote move</button>
    <section className="flows-canvas-workspace" style={{ display: "flex", height: "calc(100dvh - 210px)", minHeight: 360 }}>
    <FlowsCanvas artifact={state.artifact} updatedAt={state.updatedAt} projectCategory={category} disabled={paused} onAdd={() => setAdd(true)} onSaveScreen={async (screenId, elements, original) => {
      window.__screenSaves += 1;
      await new Promise((resolve) => setTimeout(resolve, 80));
      if (fail) throw new Error("Simulated screen save failure");
      const current = readState();
      const screen = current.artifact.screens.find((entry) => entry.id === screenId);
      if (!screen || JSON.stringify(screen.keyElements) !== JSON.stringify(original)) throw new Error("Screen elements changed elsewhere. Cancel and reopen the editor before saving.");
      const next = { artifact: { ...current.artifact, screens: current.artifact.screens.map((entry) => entry.id === screenId ? { ...entry, keyElements: elements } : entry) }, updatedAt: Math.max(Date.now(), current.updatedAt + 1) };
      localStorage.setItem(storeKey, JSON.stringify(next));
      setState(next);
    }} onEdit={async (edit) => {
      await new Promise((resolve) => setTimeout(resolve, 80));
      if (fail) throw new Error("Simulated save failure");
      const result = commit(edit);
      window.__canvasEdits.push(edit);
      return result;
    }} />
    </section>
    {add ? <p role="status">Add diagram requested</p> : null}
  </main>;
}
const root = document.getElementById("root");
if (!root) throw new Error("Test root missing");
createRoot(root).render(<StrictMode><App /></StrictMode>);

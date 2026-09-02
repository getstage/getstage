# Wireframes run failure diagnosis — 2026-08-11

## Scope

This document records the observed failures from two live Hi-Fi wireframe runs on 2026-08-11. It separates provider authentication, context delivery, model output, React rendering, repair behavior, and final persistence behavior.

No component-contract fixes described in this document were applied as part of this diagnosis.

## Runs

| Provider | Run ID | Result |
|---|---|---|
| Codex | `3a6dd117-1e58-49ca-aa56-633cc360dd63` | Rejected after Codex completed without reading the required workspace files |
| Claude | `7c2890d5-cb08-4168-ad20-5ab9b4c6c40f` | Rejected after one repaired screen continued to fail React rendering |

---

## 1. Codex failure was not an authentication failure

The installed Codex CLI and authentication state were checked directly:

```text
codex-cli 0.144.4
Logged in using ChatGPT
```

The recommendation to run `codex login` was therefore incorrect.

### Observed sequence

1. Codex started normally.
2. The process ran for approximately 90 seconds.
3. Codex completed without reading the mandatory workspace context files.
4. Stage checked required-read evidence only after the provider process completed.
5. The required-context gate rejected the response.
6. A generic provider-process error fallback incorrectly presented the failure as a possible login problem.

The terminal error listed every context file for which Stage had not observed a structured read event, including the Design Director call manifest, output contract, project context, selected library catalog, and selected skill adapters.

### Why the error appeared late

The required-read gate runs after the provider exits successfully. Stage cannot report that the provider ignored required files until the process has finished and the complete structured event stream has been evaluated.

This was a context-compliance failure followed by misleading error translation. It was not evidence that the Codex session had expired.

---

## 2. Claude proved that the workspace architecture was active

The Claude run did not fail because of provider authentication or missing project context.

Claude successfully read:

- each per-screen call manifest;
- the screen implementation contract;
- selected project and run context;
- the selected Origin UI, Aceternity UI, and Bklit UI library catalog;
- the selected UI UX Pro Max and Emil Design Engineering skill adapters;
- the selected moodboard image;
- each screen-specific design plan;
- each screen's component recipe imports;
- each screen-specific flow;
- each screen inventory and prior-screen context;
- each screen's brand evidence.

The run returned all three requested screens:

```text
screens_returned=3
screens_requested=3
```

All three provider responses passed the response-integrity gate before React rendering began.

This confirms that the isolated workspace, selected skills, selected libraries, moodboard evidence, Design Director plan, and per-screen context delivery were active during the run.

---

## 3. Two generated screens failed real React rendering

### 3.1 Sign-up screen: invalid Lucide export

Claude generated:

```tsx
import { ArrowLeft, Chrome } from "lucide-react";
```

The installed `lucide-react` package does not export `Chrome`. Module loading failed with:

```text
SyntaxError: The requested module 'lucide-react' does not provide an export named 'Chrome'
```

Stage's selected-library validation checks the approved `@stage/*` component surfaces, but it does not currently prove that every named import from a free dependency such as `lucide-react` exists before module execution.

#### Repair result

The isolated repair correctly identified the invalid icon import and replaced `Chrome` with `LogIn`:

```tsx
import { ArrowLeft, LogIn } from "lucide-react";
```

The repaired sign-up screen subsequently passed rendering.

### 3.2 Marketing screen: incomplete `AreaChart` props

Claude generated:

```tsx
<AreaChart data={sellThrough} />
```

The actual Bklit-compatible Stage component requires both `data` and `label`:

```tsx
export function AreaChart({
  data,
  label,
  className,
}: {
  data: ChartPoint[];
  label: string;
  className?: string;
})
```

The implementation immediately derives its SVG gradient identifier from `label`:

```tsx
const gradientId = `area-${label.replaceAll(/[^a-zA-Z0-9]/g, "-").toLowerCase()}`;
```

Because the generated component call omitted `label`, React SSR received `undefined` and failed with:

```text
TypeError: Cannot read properties of undefined (reading 'replaceAll')
```

---

## 4. Internal component metadata is inconsistent

The Bklit library's general usage guidance correctly states:

```text
Every chart takes data: { label: string; value: number }[] and a label string for accessibility.
```

However, the `trend-analysis` recipe declares only `data` as required for `AreaChart`:

```json
{
  "exportName": "AreaChart",
  "purpose": "time-series magnitude and trend",
  "requiredProps": ["data"]
}
```

The real React component requires:

```text
data + label
```

The recipe contract advertises:

```text
data only
```

Therefore, the Design Director and quality validator can approve a planned `AreaChart` recipe that is incomplete according to the runtime component.

This is the primary source of the marketing-screen render failure. The model followed an incomplete machine-readable contract.

---

## 5. Repair behavior

Stage correctly isolated the two initially failed screens:

```text
failed=2
repairing failed wireframe quality gates once
```

The results were:

| Screen | Initial failure | Repair result |
|---|---|---|
| Sign-up | Invalid `Chrome` import | Replaced with `LogIn`; passed |
| Marketing home | Missing `AreaChart.label` | Repair still omitted `label`; failed again |
| Cart review | None | Passed without repair |

The marketing repair read its failure evidence but returned another component call without the required `label` prop:

```tsx
<AreaChart data={sellThrough} />
```

Because Stage permits one repair attempt, the second AreaChart failure became terminal:

```text
quality validation failed after one repair
```

---

## 6. Why the Claude failure also appeared late

The observed execution order was:

1. Three screen calls ran in parallel.
2. Provider generation took approximately 226 seconds.
3. Stage parsed and normalized all three screen responses.
4. Real React SSR then detected two runtime failures.
5. Stage launched one isolated repair for each failed screen.
6. The repair calls added another expensive provider round trip.
7. The sign-up repair passed.
8. The marketing repair failed with the same missing prop.
9. Stage rejected the run.

The chart error can only be observed when the generated TSX reaches real module loading and SSR:

```text
provider generation
→ response parsing
→ React module loading
→ component execution
→ SSR failure
→ repair provider call
→ second SSR failure
→ terminal run failure
```

The late result was therefore deterministic, not random. Expensive generation completed before the incomplete component contract was exercised at runtime.

---

## 7. Final observed outcome

| Area | Observed result |
|---|---|
| Isolated provider workspace | Worked |
| Selected skill delivery | Worked for Claude |
| Selected library delivery | Worked for Claude |
| Moodboard image delivery | Worked for Claude |
| Per-screen parallel generation | Worked |
| Three requested screens returned | Worked |
| Cart-review screen | Passed |
| Sign-up initial render | Failed due to nonexistent Lucide export |
| Sign-up repair | Passed |
| Marketing initial render | Failed due to missing `AreaChart.label` |
| Marketing repair | Failed with the same missing prop |
| Final Claude run | Rejected |
| Existing saved screens | Left unchanged |
| Codex authentication | Valid |
| Codex required context reads | Not observed in the failed Codex run |
| Codex error message | Incorrectly suggested login |

---

## 8. Root causes

### Codex

The provider ignored the required workspace-read instruction. Stage detected this only after provider completion. The subsequent generic error translation incorrectly suggested an authentication failure even though Codex was logged in.

### Claude sign-up screen

Stage does not currently validate named exports from free imports such as `lucide-react` before executing generated TSX. Claude selected an icon name that does not exist in the installed package.

### Claude marketing screen

Stage's component metadata does not match the real `AreaChart` TypeScript contract. The recipe omitted the required `label` prop, allowing both the Design Director and generated screen to appear contract-compliant before runtime.

### Terminal run behavior

The single bounded repair worked for the invalid icon but repeated the incomplete chart call. One remaining invalid screen caused the final run to fail and kept existing screens unchanged.

---

## 9. Diagnosis conclusion

These failures are not one provider-authentication problem.

They are three separate contract failures:

1. **Codex context-compliance contract:** Codex completed without reading required files.
2. **Free-import export contract:** generated Lucide names are not proven against the installed package before execution.
3. **Component-prop contract:** Bklit `AreaChart` metadata advertises fewer required props than the real React component.

The Claude log demonstrates that the new context architecture was operating. The terminal failure happened later because the runtime component contract was incomplete and the single repair repeated that incomplete usage.

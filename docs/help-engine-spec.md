# Help Engine Specification

## Purpose

The help engine provides contextual guidance at every stage of the EU AI Act compliance assessment. It answers three questions for the user at all times:

1. **Why can't I proceed?** (blocked reason)
2. **What should I do next?** (next best actions)
3. **What does this field/concept mean?** (contextual hints)

The engine is deterministic, non-blocking, and derives all guidance from `assessmentState`.

---

## Architecture

```
assessmentState + currentPhase + unlockedPhases
        |
        v
  computeGuidance()   <-- pure function, no side effects
        |
        v
  {
    blockedReason: string | null,
    nextBestActions: Action[],
    contextualHints: Hint[],
    progressSummary: ProgressSummary
  }
```

### Inputs

| Input | Source | Type |
|-------|--------|------|
| `assessmentState` | `useAssessment()` hook in `App.jsx` | Full reducer state |
| `currentPhase` | `useState` in `App.jsx` | Phase ID string |
| `unlockedPhases` | Derived `Set<string>` in `App.jsx` | Set of unlocked phase IDs |

### Outputs

```
interface GuidanceResult {
  blockedReason: string | null;
  nextBestActions: Action[];
  contextualHints: Hint[];
  progressSummary: ProgressSummary;
}

interface Action {
  id: string;
  label: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  targetPhase: string;
}

interface Hint {
  fieldId: string;
  text: string;
  learnMoreLabel?: string;
}

interface ProgressSummary {
  completedPhases: number;
  totalPhases: number;
  currentPhaseProgress: string;   // e.g. "3 of 10 obligations evaluated"
  overallPercent: number;         // 0-100, integer
}
```

---

## Phase Rules

### Registration (always unlocked)

| Condition | blockedReason | nextBestActions |
|-----------|---------------|-----------------|
| `system.name` empty | null (phase is open) | "Enter system name and vendor to begin." |
| `system.intendedPurpose` < 100 chars | null | "Describe the system purpose in at least 100 characters." |
| All required fields filled | null | "Review and submit to proceed to Risk Classification." |

**Contextual hints:**
- `systemType`: "This determines whether the AI Act definition applies. If unsure, select Unknown."
- `intendedPurpose`: "Be specific: what does the system do, to whom, and what decisions does it inform?"
- `inputDataController`: "Select who controls what data flows into the AI system."
- `affectsEuResidents`: "The AI Act applies if EU residents are affected, even if your company is outside the EU."

---

### Classification (unlocks when `system.name` non-empty)

| Condition | blockedReason | nextBestActions |
|-----------|---------------|-----------------|
| Phase locked | "Complete System Registration to unlock." | -- |
| Step 1 not started | null | "Answer the 8 prohibited practice questions to begin classification." |
| Art. 5 YES detected | null | "A prohibited practice has been flagged. Acknowledge and consult legal." |
| Steps 1-5 complete, not classified | null | "Click Classify to run the rules engine." |
| Classified, rationale < 20 chars | null | "Enter your consultant rationale (min 20 characters) to confirm." |

**Contextual hints:**
- Art. 5 toggles: "If any of these apply, the system may be prohibited under the AI Act."
- Annex III domains: "Check all domains that match. Domain 5 (Credit/Insurance) is common in FS."
- Art. 6(3) profiling: "Profiling always results in HIGH_RISK, regardless of other factors."
- Role determination: "If you have customised or integrated the system, provider obligations may apply."

---

### Obligation Assessment (unlocks when classification confirmed)

| Condition | blockedReason | nextBestActions |
|-----------|---------------|-----------------|
| Phase locked | "Confirm Risk Classification to unlock." | -- |
| 0 obligations evaluated | null | "Start with Art. 26(2) (Human Oversight) -- it is usually the first gap in FS deployments." |
| Some evaluated, some pending | null | "Continue to the next unevaluated obligation: [name]." |
| All evaluated, none confirmed | null | "Review each verdict and confirm or override before proceeding." |

**Contextual hints:**
- `controlDescription`: "Describe the actual control in place, not the aspiration. Min 80 characters."
- `evidenceReference`: "Name the document, its version, date, and owner."
- `evidenceType`: "Policy = governing document. Procedure = operational steps. Record = proof of execution."
- `confidenceQualifier`: "'To be confirmed' signals evidence the consultant has not yet independently verified."
- Verdict badges: "CITATION_FAILED means the tool could not verify the source quote -- manual check needed."

---

### Evidence Pack (unlocks when >= 1 obligation evaluated)

| Condition | blockedReason | nextBestActions |
|-----------|---------------|-----------------|
| Phase locked | "Evaluate at least one obligation to unlock." | -- |
| Overall completeness < 40% | null | "Focus on missing Tier 1 artefacts first -- they have the highest compliance value." |
| Cross-clause artefacts missing | null | "Prioritise [artefact name] -- it closes [N] obligations at once." |
| Overall completeness >= 80% | null | "Evidence pack is substantially complete. Generate the Evidence Request PDF." |

**Contextual hints:**
- Missing artefacts: "Red items are required documents that are absent from the evidence described."
- Cross-clause panel: "These documents satisfy requirements across multiple obligations simultaneously."
- Completeness bar: "Score reflects presence of required artefacts based on keyword matching. It is indicative, not definitive."

---

### Gap Synthesis (unlocks when all applicable obligations evaluated or confirmed)

| Condition | blockedReason | nextBestActions |
|-----------|---------------|-----------------|
| Phase locked | "Evaluate all applicable obligations to unlock." | -- |
| Synthesis loading | null | "Synthesis in progress -- analysing patterns across obligations." |
| Synthesis complete, gaps present | null | "Review the gap register. Assign owners and target dates before proceeding." |
| Synthesis complete, no gaps | null | "No gaps identified. Proceed to Report Generation." |

**Contextual hints:**
- Risk posture: "Derived from the worst-case obligation findings. CRITICAL means at least one obligation has a critical gap."
- Gap register: "Drag rows to reorder priority. Assign owners and dates before generating the report."
- Remediation phases: "Phase 1 (30 days) = CRITICAL. Phase 2 (90 days) = HIGH. Phase 3 (6 months) = MEDIUM."

---

### Report Generation (unlocks when synthesis is non-null)

| Condition | blockedReason | nextBestActions |
|-----------|---------------|-----------------|
| Phase locked | "Complete Gap Synthesis to unlock." | -- |
| Consultant gate incomplete | null | "Check all 7 review items and enter your name to unlock exports." |
| Consultant gate complete | null | "Export the full report PDF or individual artefacts." |

**Contextual hints:**
- Checklist items: "Each item confirms a professional duty of care step. All must be checked."
- Export buttons: "PDF exports use server-formatted data. Excel export generates a styled .xlsx workbook."
- Artefact tabs: "Click a tab to preview a single section before exporting."

---

## UX Placement

### Sticky "Next Steps" Panel
- Rendered in `App.jsx`, positioned below `PhaseNav` when the active phase has guidance.
- Max height: 80px. Collapsible. Subtle blue background (`#EFF6FF`).
- Shows: `blockedReason` (if locked), or top 1-2 `nextBestActions`.
- Never blocks interaction. Dismissible per session.

### Phase-Level Callouts
- Rendered inside each phase component as a light callout card.
- Triggered by specific conditions (e.g., "No obligations evaluated yet").
- Disappear once the triggering condition is resolved.

### Field-Level Tooltips
- Rendered via existing `Tooltip` / helper text patterns in form fields.
- `contextualHints` map field IDs to guidance text.
- Shown on focus or hover of the info icon.

### Progress Summary
- Rendered in `PhaseNav` as a small text label: "Step 3 of 6 -- 5/10 obligations evaluated".
- Updates reactively from `progressSummary`.

---

## Implementation Notes

- `computeGuidance(assessmentState, currentPhase, unlockedPhases)` is a pure function.
- It lives in `client/src/utils/helpEngine.js`.
- It is called in `App.jsx` via `useMemo` and passed as a prop or via context.
- No external dependencies. No API calls. No localStorage.
- All copy is hardcoded in the engine (no CMS or i18n layer needed for MVP).
- The engine must handle partial/empty state gracefully (draft assessments).

---

## Non-Functional Requirements

- The help panel must never obstruct primary content.
- Guidance must never contradict the assessment tool's own logic (e.g., don't suggest skipping a required phase).
- All guidance text must be legally neutral (no advice, no recommendations on compliance strategy).
- Performance: `computeGuidance` must complete in < 5ms for any state shape.

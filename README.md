# EU AI Act Compliance Engine

**Deterministic classification and grounded regulatory analysis for the EU AI Act**

Article 5 / Annex III / Article 6(3) classification · RAG over primary legal sources · Evidence-pack generation

-----

## The Problem

The EU AI Act is now enforceable, and most organizations cannot answer the first question it asks of them: is this AI system prohibited, high-risk, limited-risk, or minimal-risk? The answer is not a judgment call. It is a structured determination against specific provisions: the Article 5 prohibited practices, the Annex III high-risk domains, and the Article 6(3) profiling carve-outs. Getting it wrong in either direction is expensive: over-classify and you spend compliance budget on systems that do not need it, under-classify and you ship a system that carries regulatory exposure.

The tools that exist are either static questionnaires that give you a risk label with no legal grounding, or general-purpose LLM chats that will confidently cite Articles that do not say what they claim. Neither produces something a compliance consultant can put their name on.

## The Hypothesis

Classification should be **deterministic and auditable** (a rules engine walking the actual legal tree, not an LLM guessing), and the legal interpretation layered on top should be **grounded in source text, never in model memory**. Separating the two is what makes the output defensible: the classification is reproducible, and every piece of regulatory context traces back to a retrieved provision.

## What This Does

A full-stack assessment tool that takes a structured description of an AI system and produces a classification, a gap evaluation, and a source-grounded evidence pack.

```
System facts (purpose, sector, deployment, Annex III / Art.5 / Art.6(3) responses)
        │
        ▼
┌────────────────────┐
│ Classification Tree │  Deterministic rules engine
│ Art.5 → prohibited  │  (no LLM — reproducible)
│ Annex III → high    │
│ Art.6(3) → carve-out│
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│  Retrieval (RAG)    │  Corpus of primary + commentary
│  tiered chunks      │  sources, grounded to the finding
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│  Interpretation     │  LLM agents, source-grounded only
│  + Plain Language    │  (regulatory context, safe paths,
│  + Synthesis agents  │   enforcement risk)
└─────────┬──────────┘
          │
          ▼
   Evidence Pack (PDF / XLSX export)
```

### Key Capabilities

- **Deterministic classification engine** — Walks the actual legal structure: Article 5 prohibited practices, Annex III high-risk domains (biometrics, employment, credit and insurance, law enforcement, border control, education, justice, critical infrastructure), and the Article 6(3) profiling/decision-influence carve-outs. Every provision is referenced by its exact citation (e.g. `Art. 5(1)(f)`, `Annex III, 4(a)`). The classification is reproducible — no model in the path.
- **Fact validation gate** — Required top-level and nested facts are validated before classification runs, so the tool refuses to produce a label from incomplete input rather than guessing.
- **Source-grounded RAG** — Retrieval over a corpus of primary legislation and commentary, returning tiered chunks tied to the specific obligation under evaluation.
- **Regulatory interpretation agents** — LLM agents (interpretation, plain-language, synthesis) that add regulatory context, recognized safe harbours, enforcement-risk profile, and — where the law is contested — the diverging interpretations and which has stronger textual support. Every agent is constrained to ground all claims in retrieved source chunks with **no external knowledge**, and returns structured JSON.
- **Consistency checking** — A dedicated route re-checks findings for internal consistency across the assessment.
- **Evidence-pack generation** — Assembles the classification, evaluation, and grounded context into an exportable pack (PDF via `@react-pdf/renderer`, spreadsheet via `xlsx`) that a consultant can hand to a client or auditor.
- **Deterministic help engine** — Contextual guidance at every step (why a phase is blocked, what to do next, what a field means), computed as a pure function of assessment state — non-blocking and side-effect-free.

## Architecture Decisions (and Why)

| Decision | Choice | Why |
|---|---|---|
| Classification | Deterministic rules engine, no LLM | A compliance label must be reproducible and auditable. The same facts must always yield the same classification, traceable to specific Articles |
| LLM grounding | Retrieved source chunks only, "no external knowledge" | The failure mode of AI legal tools is confident hallucination. Constraining agents to retrieved text is what makes the output defensible |
| Separation of concerns | Classify first, interpret second | Determinism where the law is structured (classification), LLM only where nuance helps (context, enforcement risk, contested readings) |
| Corpus design | Primary sources + commentary, tiered retrieval | Primary legislation is authoritative; commentary bridges to practice. Tiering keeps the highest-authority source closest to the finding |
| Help engine | Pure function of assessment state | Guidance must be predictable and never block the user. Deterministic derivation makes it testable |

## Tech Stack

- **Server** — Node.js / Express. Routes for classify, evaluate, synthesise, consistency, report. Anthropic Claude via the official SDK.
- **Client** — React + Vite. PDF export (`@react-pdf/renderer`) and spreadsheet export (`xlsx`). Playwright for end-to-end tests.
- **Data** — Supabase (corpus storage, clause seeding, assessment data).
- **Corpus tooling** — Build, verify, and seed scripts with a manifest; synthetic assessment data and validation-test scripts for the classification logic.

## Quick Start

### Prerequisites

Node.js 18+ · a Supabase project · an Anthropic API key

### Install and Run

```bash
git clone https://github.com/vinaysflow/EU-AI-ACT.git
cd EU-AI-ACT
npm install

# Configure
cp .env.example .env
# Set ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY, PORT

# Build and seed the corpus
npm run corpus:build
npm run corpus:verify
npm run clauses:seed

# Run (client + server)
npm run dev
```

### Validate the classification logic

```bash
npm run test:validate
```

## What I'd Measure

| Metric | Why It Matters |
|---|---|
| Classification reproducibility | The same facts must always produce the same label. Any drift is a correctness bug, not a tuning question |
| Grounding rate | What % of agent claims trace to a retrieved source chunk? Ungrounded claims are the thing to drive to zero |
| Over- vs. under-classification | Both are costly. The tool should be measured on both false-high and false-low classifications against expert review |
| Corpus coverage | For what share of obligations does retrieval return authoritative primary source, not just commentary? |

## Project Status

| Component | Status | Detail |
|---|---|---|
| Classification engine | Shipped | Art. 5, Annex III, Art. 6(3), role determination, with exact citations |
| Fact validation gate | Shipped | Required top-level and nested facts enforced before classification |
| RAG corpus + retrieval | Shipped | Primary + commentary, tiered chunks, build/verify/seed tooling |
| Interpretation agents | Shipped | Source-grounded, structured JSON, no external knowledge |
| Consistency checking | Shipped | Cross-finding consistency route |
| Evidence pack export | Shipped | PDF + XLSX |
| Help engine | Shipped | Deterministic, state-derived contextual guidance |

## License

[...]  <!-- add a LICENSE file (e.g. Apache 2.0 or MIT) and name it here, or delete this section -->

-----

Built by [Vinay Tripathi](https://github.com/vinaysflow)

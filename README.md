# AI-SDLC Sprint Pipeline — Demo

This repository is a self-contained demo of a multi-agent software delivery pipeline. A small team of specialized agents (Product Owner, Architect, Developer, QA) runs a sprint end to end, and a lightweight orchestrator drives them in order with human checkpoints in between. The example product they build is a simple internal Time-Off request system, but the product is just a vehicle: the point of the demo is the pipeline and how it is governed.

## Not sensitive — safe to share

There is nothing confidential in this repository. It contains no client data, no real people, no real credentials, and no proprietary business information. The only credentials present are intentionally hardcoded demo values (`password123`, a default `workshop-secret` JWT signing key, and fake `@test.com` email addresses) that exist so the app boots with zero configuration. Treat them as illustrative, never reuse them anywhere real. The repository is public so it can be cloned and shared freely, including with non-technical audiences who just want to see the pipeline in action.

## The intention

The goal is to make an agentic delivery pipeline tangible. Instead of one model doing everything in a single pass, the work is split across role-specific agents that hand off artifacts to each other on disk: the Product Owner writes stories, the Architect turns them into a design and Architecture Decision Records, the Developer implements one story at a time with passing unit tests, and QA adversarially reviews the result and files bugs. Each role has a narrow job, a fixed set of inputs and outputs, and clear rules for when to stop and ask a human. You can read the whole state of a sprint by looking at the files under `docs/`, which makes the process auditable and easy to explain.

## How the orchestrator works

The pipeline is driven by the `/sprint` skill (defined in `.claude/skills/sprint/SKILL.md`). You run it with a sprint number:

```
/sprint 1
```

That number, `N`, selects the `N`-th theme from the backlog and threads through every agent. The orchestrator runs the configured phases in order. Today the pipeline is:

1. **`po`** — expands the theme into user stories with testable acceptance criteria (`plan.md`)
2. **`architect`** — turns the stories into a technical design and ADRs (`design.md`, `docs/architecture/decisions/`)
3. **`developer`** — implements each story with unit tests, one at a time
4. **`qa`** — adversarially reviews the implementation and files bugs; never edits code
5. **`developer`** — a final rework pass that fixes any bugs QA filed (exits silently if there are none)

After each phase the orchestrator records a breadcrumb in `docs/sprints/sprint-N/.phase` and applies that phase's **stop gate**, which decides whether to pause for you or continue on its own:

- `always` — pause and wait for you to type `continue` before the next phase
- `on_anomaly` — continue automatically if the phase finished cleanly, pause only if something went wrong or an agent raised a question
- `never` — continue silently

Because progress is written to `.phase`, a sprint is resumable. If you stop midway and run `/sprint N` again, it picks up from the next phase; if every phase has already run, it recognizes the sprint is complete and stops. You change the pipeline by editing the `phases:` block in `SKILL.md` — add a row to insert an agent, or change a `stop_gate` to give the run more or less autonomy.

A longer walkthrough of the orchestrator, including a flow diagram, lives in `.claude/skills/sprint/README.md`. Each agent is defined under `.claude/agents/`, and `.claude/agents/README-po.md` explains the Product Owner agent in detail as a worked example.

## The rules the agents follow

The agents are not free to do whatever they want. `docs/ARCHITECTURE.md` holds the hard rules and the review checklist that every story is judged against: the stack is fixed, persistence is an in-memory store with no database or files, users are hardcoded, the dependency list is a short allowlist, and the whole system must run locally with nothing more than `npm install` and `npm start`. When an agent hits a genuine conflict with these rules it stops and writes a question rather than guessing, so the human stays in control of the decisions that matter.

## Running the demo app

The Time-Off system that the pipeline produces runs on its own:

```
npm install
npm start
```

It boots on `http://localhost:3000` with a landing page and a `GET /health` endpoint. State lives in memory and resets on restart, which is expected. Requires Node 22.6 or newer (the code runs TypeScript directly via Node's native type stripping, so there is no build step).

## Repository layout

```
docs/
  BRD.md                     business requirements
  BACKLOG.md                 themes, one per sprint, with status badges
  ARCHITECTURE.md            hard rules + QA review checklist
  architecture/decisions/    ADRs
  sprints/sprint-N/          per-sprint plan, design, QA report, bugs, .phase
.claude/
  agents/                    po, architect, developer, qa
  skills/sprint/             the /sprint orchestrator
src/, public/, test/         the demo app the pipeline builds
```

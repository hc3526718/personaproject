# Ruflo MCP + reasoning patterns (gstack)

This repo wires **Ruflo** from [ruvnet/ruflo](https://github.com/ruvnet/ruflo) into MCP config and captures **methodology ideas** from [garrytan/gstack](https://github.com/garrytan/gstack) for future **reasoning-heavy** features (AI coaching flows, proposal triage, planning UIs, etc.).

## Ruflo MCP attachment

Ruflo exposes a **stdio MCP server**. The upstream README’s canonical registration is:

```bash
claude mcp add ruflo -- npx ruflo@latest mcp start
```

For **Cursor / VS Code–style MCP JSON** (this project), the equivalent is already added under:

- `.vscode/mcp.json` → `servers.ruflo`
- `config/mcporter.json` → `mcpServers.ruflo`

```json
"ruflo": {
  "command": "npx",
  "args": ["-y", "ruflo@latest", "mcp", "start"]
}
```

### Requirements & notes

1. **Node / npx** must be on `PATH` where the IDE spawns MCP processes.
2. **First run** may download the `ruflo` package; allow network on that process.
3. Ruflo’s **full** orchestration loop (many agents, hooks, daemon) comes from **`npx ruflo@latest init`** (or `init wizard`), which drops files into the workspace. The **MCP server alone** exposes Ruflo tools to the client; for the complete product see Ruflo’s [README](https://github.com/ruvnet/ruflo) (“Path A” plugins vs “Path B” CLI install).
4. If MCP fails to start, run the same command in a terminal and read the error; then check Ruflo issues for platform-specific fixes.

### Optional: deeper Ruflo setup

- **Goal planning / GOAP-style decomposition** is described in Ruflo docs (e.g. [goal.ruv.io](https://goal.ruv.io/)) — useful when you want **explicit plans** before tool calls.
- **Federation / swarms** matter if you ever run **multi-agent** or cross-machine workflows; not required for local Cursor use.

---

## Research: gstack and “logical reasoning” for this project

[gstack](https://github.com/garrytan/gstack) is not an MCP server; it is a **disciplined process** implemented as **slash-command skills** (primarily for Claude Code). The transferable ideas for **Dalton / Expo** reasoning features:

### 1. Staged pipeline instead of one-shot prompts

gstack encodes: **Think → Plan → Build → Review → Test → Ship → Reflect**.

For product features that “reason” (e.g. coach feedback, media proposal scoring, safety review):

- **Persist intermediate artifacts** (short design note, test matrix, acceptance criteria) instead of jumping straight to implementation.
- **UI analogy**: wizard steps or a “plan card” the user confirms before execution.

### 2. Role separation (even with one model)

gstack assigns **CEO / Eng manager / QA / Security** personas in separate commands. That reduces **self-review bias** where the same prompt both proposes and validates.

Application pattern:

- **Planner** system prompt: constraints, user goal, no code.
- **Critic** system prompt: attack the plan (edge cases, abuse, offline, RLS).
- **Implementer**: only after plan + critic pass (or user override).

### 3. Forcing functions

- **`/office-hours` style**: a small set of **fixed questions** before building (who hurts, what’s the narrow wedge, what are you *not* shipping).
- **`/investigate` style**: **no fix without** reproduction / trace (Iron Law in gstack docs) — map to debugging coach or support flows in-app.

### 4. Explicit engineering artifacts

From `/plan-eng-review` patterns:

- Data flow and **failure paths** spelled out before coding.
- **Test matrix** as a checklist (not “add tests later”).

Maps well to:

- Supabase RPCs and RLS-heavy flows (Dalton already uses these).
- Premium gates, proposals, master review queues.

### 5. Security and release as first-class phases

- **`/cso`**: OWASP + STRIDE-style threat thinking before shipping sensitive flows.
- **`/ship` / `/qa`**: merge criteria tied to **real** verification (browser, staging).

### 6. Installing gstack skills in Cursor (optional)

gstack’s setup can target Cursor:

```bash
git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/gstack
cd ~/gstack && ./setup --host cursor
```

That installs skills under `~/.cursor/skills/gstack-*` (see gstack README). It **complements** Ruflo MCP: Ruflo supplies **tools/orchestration**; gstack supplies **repeatable reasoning procedures** you can mimic in app copy, wizards, or internal playbooks.

**Windows / Bun note:** If `bun run build` fails inside `./setup` with a Bun error about subshells and redirections, run the heavy steps manually from Git Bash in the gstack clone, then re-run setup:

```bash
bun run vendor:xterm && bun run gen:skill-docs --host all
bun build --compile browse/src/cli.ts --outfile browse/dist/browse
bun build --compile browse/src/find-browse.ts --outfile browse/dist/find-browse
./setup --host cursor --quiet
```

Bun emits `browse.exe` on Windows; current gstack `setup` resolves that when checking for the browse binary. If `./setup` still says `Unknown --host value: cursor`, pull the latest gstack (or ensure `cursor` is listed in the `--host` case near the top of `setup`).

---

## Suggested use in this repo

| Need | Ruflo (MCP) | gstack-style process |
|------|-------------|----------------------|
| Multi-tool agent runs in IDE | Enable `ruflo` MCP server | Use staged prompts in custom features |
| Memory / swarms / federation | Follow Ruflo full init + docs | Usually N/A for app runtime |
| Feature design for reasoning UI | Optional | Encode stages + roles in product spec |

There was **no separate attached GitHub repo** in the request beyond the public **ruvnet/ruflo** and **garrytan/gstack** references; this document and the JSON entries are the **project-local attachment** for Ruflo MCP.

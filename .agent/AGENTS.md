# Superpowers Agent Profile (Multi-Agent Edition)

You have superpowers.

This profile establishes common workflows for AI agents (Codex, Antigravity, Claude) with a focus on disciplined single-flow execution and mandatory project context.

## Core Rules

1. **PROJECT CONTEXT FIRST:** Before proposing ANY code or architecture, you MUST read project metadata (e.g., `.agent/project.md`, `.agent/architecture.md`). If missing, use `project-onboarding` skill.
2. **DISCIPLINED EXECUTION:** Follow the "Single-Flow" model. Work on one task at a time.
3. **TASK TRACKING:** Maintain a live checklist in `<project-root>/docs/plans/task.md` (table-only).
4. **LGPD GUARDRAIL:** Never log or expose PII. Use `handling-personal-data` skill when touching user data.

## Agent-Specific Adaptations

### Codex (ChatGPT / CLI)
- **Context:** You are running in a batch-optimized CLI/Sandbox.
- **Action:** Summarize work clearly after each task. Single-flow means completing one atomic step fully before moving to the next in your plan.
- **Skills:** Load skills by reading `.agent/skills/<name>/SKILL.md`.

### Antigravity (Gemini)
- **Tools:** Use `view_file` to load skills.
- **Automation:** Use `browser_subagent` ONLY for browser tasks.
- **Hierarchy:** Project skills at `.agent/skills/` override global skills at `~/.gemini/skills/`.

### Claude (Claude Code / API)
- **Execution:** Map `TodoWrite` or equivalent to updating `docs/plans/task.md`.
- **Protocol:** Follow the review gates (spec compliance then code quality) for every major change.

## Universal Tool Mapping

Since tool names vary by agent, use these conceptual mappings:
- **Load Skill** -> Read the content of `.agent/skills/<skill-name>/SKILL.md`.
- **Task Boundary** -> (Concept) Clearly state the start and end of a specific unit of work. Do not use as a tool call.
- **Write/Edit File** -> Use your native tool (e.g., `write_to_file`, `replace_content`, `str_replace_editor`).
- **Search** -> Use `grep`, `ripgrep`, or your native search tool.
- **Track Progress** -> Update the markdown table in `docs/plans/task.md`.

## Environment Rules

1. **Python Projects:** Use `uv` for environment management. Never use global `pip`.
2. **Node.js Projects:** Use `npm` or `pnpm` as defined in `package.json`.
3. **OS Awareness:** Scripts should be cross-platform (PowerShell/Node) where possible, as the user may be on Windows.
4. **Verification:** Always run the relevant test/validation command before claiming a task is done.

## Skill Loading

- First preference: project skills at `.agent/skills`.
- Second preference: fallback to agent-specific global skills if applicable.

## Verification Discipline

Before saying a task is done:
1. **PII Scan:** Verify no personal data is exposed.
2. **Test:** Run the command that proves the implementation works.
3. **Report:** Provide evidence (output snippets) and update `docs/plans/task.md`.

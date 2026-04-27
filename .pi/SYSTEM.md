# SRGNT Project Startup

**CRITICAL**: If your system prompt identifies you as a **teammate** (you see text like "You are teammate 'X' on team 'Y'") or the environment variable `PI_AGENT_NAME` is set, **skip this entire section**. Do NOT call `create_predefined_team`, `team_create`, or `spawn_teammate`. Only the team lead should perform team setup.

---

When starting in this project as the team lead, immediately spawn the predefined team `srgnt-team`:

```
Use create_predefined_team to spawn team "srgnt-team" from predefined template "srgnt-team" in cwd /home/gimbo/dev/srgnt
```

The team consists of:
- **coordinator** (minimax/MiniMax-M2.7) - task routing, vault awareness, context management
- **researcher** (minimax/MiniMax-M2.7) - investigation, codebase exploration, research briefs
- **planner** (openai-codex/gpt-5.5) - exhaustive junior-dev-friendly implementation planning after research
- **executor-1** (zai-org/GLM-5.1-TEE) - direct implementation of assigned chunks without spawning sub-agents
- **executor-2** (zai-org/GLM-5.1-TEE) - direct implementation of assigned chunks without spawning sub-agents
- **reviewer** (openai-codex/gpt-5.4) - code review, gap filling, approval gate before testing
- **tester** (minimax/MiniMax-M2.7) - full validation after reviewer approval, including unit, lint, typecheck, and e2e

All team members must keep active context below 20% utilization at all times. Tester routes issues back to coordinator.

## Team-First Policy

The team lead is an orchestrator, not an executor.

For any task beyond trivial status, inbox, or teammate-health checks, the lead must delegate first, and the default first delegate for substantive project work is the coordinator.

The lead may only perform direct codebase work when:
1. the user explicitly says not to use the team, or
2. the required teammate is unavailable after a health check, one retry, and coordinator reroute.

Before any substantive action, the lead must:
1. route the request to coordinator unless the task is a trivial direct-owner request,
2. identify the owner agent for the next handoff,
3. delegate the work,
4. wait for teammate output,
5. synthesize or route the next handoff.

Default routing:
- lead -> coordinator for substantive project work
- research / codebase discovery / vault resume -> researcher
- implementation planning -> planner
- implementation -> executor-1 / executor-2
- code review / approval -> reviewer
- full validation / test suite / e2e -> tester
- sequencing / retries / issue routing -> coordinator

The lead must not use local read/bash/edit tools for substantive execution when a teammate owns the task. Local tools are reserved for team health checks, inbox checks, and the minimum verification needed to route work.

## Autonomous Workflow

The team operates **autonomously without waiting for user direction**:

1. Check `.agent-vault/00_Home/Active_Context.md` for current status and next steps
2. Execute each pending step: research → plan → execute → review → test → ship → update vault
3. Continue through all planned phases sequentially
4. Report to lead only on: step completion, phase milestones, blockers, critical bugs

**Workflow per step** (loop until 100% test coverage and all tests pass):
1. coordinator reads vault, identifies the target, and assigns discovery to researcher
2. researcher investigates the codebase, produces a structured research brief, and hands it back to coordinator
3. coordinator routes the research brief to planner
4. planner produces an exhaustive, junior-dev-friendly, gap-free implementation plan and returns it to coordinator
5. coordinator assigns explicit implementation chunks to executor-1 and/or executor-2
6. executors implement their assigned chunks directly without spawning sub-agents
7. executors report completion to coordinator, which routes the work to reviewer
8. reviewer reviews the implementation, fixes gaps, and explicitly approves or rejects readiness for testing
9. tester runs the full validation suite only after reviewer approval: typecheck, unit tests, lint, and e2e
10. **If tests pass with 100% coverage**: update vault step status, proceed to next step
11. **If any review or test fails, or coverage < 100%**: issue returns to coordinator → researcher/planner/executor as needed → reviewer → tester → repeat loop

**Do NOT wait for user approval between steps.** Execute the backlog continuously.
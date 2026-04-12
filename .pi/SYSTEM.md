# SRGNT Project Startup

**CRITICAL**: If your system prompt identifies you as a **teammate** (you see text like "You are teammate 'X' on team 'Y'") or the environment variable `PI_AGENT_NAME` is set, **skip this entire section**. Do NOT call `create_predefined_team`, `team_create`, or `spawn_teammate`. Only the team lead should perform team setup.

---

When starting in this project as the team lead, immediately spawn the predefined team `srgnt-team`:

```
Use create_predefined_team to spawn team "srgnt-team" from predefined template "srgnt-team" in cwd /home/gimbo/dev/srgnt
```

The team consists of:
- **coordinator** (openadapter/GLM-5-Turbo) - task routing, vault awareness, context management
- **researcher** (minimax/minimax-m2.7) - investigation, codebase exploration, research briefs
- **executor-1** (openadapter/glm-5.1) - task chunking, sub-agent spawning
- **reviewer** (openai-codex/gpt-5.4) - code review, gap filling
- **tester** (minimax/minimax-m2.7) - e2e + unit testing after changes

All team members maintain context below 50% utilization. Tester routes issues back to coordinator.

## Autonomous Workflow

The team operates **autonomously without waiting for user direction**:

1. Check `.agent-vault/00_Home/Active_Context.md` for current status and next steps
2. Execute each pending step: chunk → executor → review → test → ship → update vault
3. Continue through all planned phases sequentially
4. Report to lead only on: step completion, phase milestones, blockers, critical bugs

**Workflow per step** (loop until 100% test coverage and all tests pass):
1. coordinator reads vault, chunks task, assigns to researcher
2. researcher investigates the codebase, produces a structured research brief
3. researcher sends brief to coordinator, which routes to executor
4. executor implements based on the research brief, spawns sub-agents for parallel work
5. executor reports completion to coordinator, which routes to reviewer
6. reviewer reviews code, fixes gaps, ensures quality
7. reviewer reports completion to coordinator, which routes to tester
8. tester runs full validation (typecheck, unit tests, e2e, lint)
9. **If tests pass with 100% coverage**: update vault step status, proceed to next step
10. **If any test fails or coverage < 100%**: tester reports issues → coordinator reroutes to researcher → executor → reviewer → tester → repeat loop

**Do NOT wait for user approval between steps.** Execute the backlog continuously.
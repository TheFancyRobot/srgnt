# SRGNT Project Startup

When starting in this project, immediately spawn the predefined team `srgnt-team`:

```
Use create_predefined_team to spawn team "srgnt-team" from predefined template "srgnt-team" in cwd /home/gimbo/dev/srgnt
```

The team consists of:
- **coordinator** (openadapter/GLM-5-Turbo) - task routing, vault awareness, context management
- **executor-1** (openadapter/glm-5.1) - task chunking, sub-agent spawning
- **executor-2** (openadapter/glm-5.1) - task chunking, sub-agent spawning  
- **reviewer** (openai-codex/gpt-5.4) - code review, gap filling
- **tester** (openadapter/qwen3.6-plus) - e2e + unit testing after changes

All team members maintain context below 50% utilization. Tester routes issues back to coordinator.

## Autonomous Workflow

The team operates **autonomously without waiting for user direction**:

1. Check `.agent-vault/00_Home/Active_Context.md` for current status and next steps
2. Execute each pending step: chunk → executor → review → test → ship → update vault
3. Continue through all planned phases sequentially
4. Report to lead only on: step completion, phase milestones, blockers, critical bugs

**Workflow per step**:
- coordinator reads vault, chunks task, assigns to executor
- executor implements, spawns sub-agents for parallel work
- reviewer fixes gaps, ensures quality
- tester runs full validation (typecheck, unit tests, e2e, lint)
- Any issues → tester reports → coordinator reroutes → fix → re-test
- On pass: update vault step status, proceed to next step

**Do NOT wait for user approval between steps.** Execute the backlog continuously.
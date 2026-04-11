# Pi Team Workflow

The Pi team templates used with this repo are maintained globally in `~/.pi/` to speed up review, bugfixing, and future execution work.

## Available global templates

- `review-team` — single orchestrator that routes QA findings to bugfix and bugfix completions back to QA
- `review-orchestrator` — same workflow under a more explicit name
- `qa` — reviewer + tester team for regression checks
- `bugfix` — fixer-opus + fixer-codex team for implementing and cross-reviewing fixes

## Recommended flow

1. Start `qa` to review changes and run regression tests.
2. Start `bugfix` when QA reports issues.
3. Use `review-team` when you want one team to keep the loop moving automatically.
4. After restarting pi, add the execution team and wire it into the same loop.

## Quick start

```text
create_predefined_team({ team_name: "qa", predefined_team: "qa", cwd: "/path/to/srgnt" })
create_predefined_team({ team_name: "bugfix", predefined_team: "bugfix", cwd: "/path/to/srgnt" })
create_predefined_team({ team_name: "review", predefined_team: "review-team", cwd: "/path/to/srgnt" })
```

## Handoff tips

- When `bugfix` finishes, it should tag the report with `QA REVIEW REQUESTED` if it came from a manual user prompt.
- `qa` should automatically re-review bugfix output and rerun targeted tests.
- Keep one orchestrator team active at a time to avoid duplicate routing.
- If the execution team is not available yet, mark it as pending and continue the QA → bugfix → QA loop.

---
name: daily-report
description: Generate the Jira/Tempo daily report via this repo's jira-report CLI.
disable-model-invocation: true
---

# Daily Report

Produce the daily report with the `jira-report` CLI (source in `go-tui/`).
The report contains: previous workday's logged work (Tempo worklogs), today's in-progress Jira tasks, blockers, and a todo list.
The CLI owns the format — present its output as-is, adjusting only at the user's request.

## Steps

1. **Locate the binary.** Use `go-tui/bin/jira-report` from the repo root
   (`bin/jira-report` when cwd is `go-tui/`).
   If missing, build: `cd go-tui && go build -o bin/jira-report ./cmd/jira-report`.
2. **Generate.** Run `jira-report generate -s`.
   Add `-c` (copy to clipboard) or `-o <path>` (save to file) only when the user asks.
3. **Present.** Show the report text to the user.

Done when the user has the report text (plus clipboard/file copy if requested).

## Failure handling

- `Failed to load configuration` / auth errors → tell the user to run
  `jira-report config init` (basic auth) or `jira-report auth login` (OAuth), then stop.
- `jira-report config show` is safe for diagnosis — tokens are masked.

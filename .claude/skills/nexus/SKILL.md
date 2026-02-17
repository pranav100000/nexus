---
name: nexus
description: Run Nexus AI multi-agent orchestrator on your repository
argument-hint: "[action] [options]"
---

# Nexus Multi-Agent Orchestrator

Run Nexus to orchestrate multiple AI agents on the current repository. Each agent defines its own output schema. The bundled agents (security, performance, test coverage) perform code review, but custom agents can perform any analysis task.

## Usage

Use the Bash tool to run Nexus commands. The most common workflow is reviewing recent changes:

### Review the latest commit
```bash
nexus run review --commit HEAD
```

### Review changes against a base branch
```bash
nexus run review --base main
```

### Run specific agents only
```bash
nexus run review --commit HEAD --agents security-reviewer
nexus run review --commit HEAD --agents security-reviewer,test-generator
```

### Get JSON output (for programmatic use)
```bash
nexus run review --commit HEAD --format json
```

## Options

| Flag | Description |
|------|-------------|
| `--commit <ref>` | Review a specific commit (e.g., `HEAD`, `abc1234`) |
| `--base <ref>` | Compare HEAD against a base ref (e.g., `main`, `HEAD~5`) |
| `--agents <list>` | Comma-separated list of agents to run |
| `--format <fmt>` | Output format: `terminal` (default) or `json` |
| `--max-cost <amt>` | Maximum cost in dollars |
| `--timeout <secs>` | Timeout in seconds |

## Behavior

1. When the user asks for a code review, run `nexus run review` with appropriate flags based on context.
2. If the user mentions a specific commit or branch, use `--commit` or `--base` accordingly.
3. If no specific scope is mentioned, default to `--commit HEAD` to review the latest commit.
4. Present the terminal output directly to the user — Nexus formats findings with severity, file locations, and suggestions.
5. If the user asks about specific concerns (security, performance, tests), use `--agents` to run only the relevant agent.

## Available agents

- `security-reviewer` — finds security vulnerabilities
- `perf-analyzer` — identifies performance issues
- `test-generator` — identifies missing test coverage

# Nexus

AI agent orchestrator for automated code review. Nexus runs specialized agents (security reviewer, performance analyzer, test generator) in parallel against your diffs, powered by OpenAI, Anthropic, or Google models.

## Quickstart

```bash
npm install -g @nexus-agent/cli
nexus init
export ANTHROPIC_API_KEY=sk-...    # or OPENAI_API_KEY / GOOGLE_API_KEY
cd your-repo
nexus run review
```

## Example output

```
$ nexus run review --base main

Nexus — running 3 agents against 4 changed files...

  ✔ security-reviewer   2 findings (1 high, 1 medium)
  ✔ perf-analyzer       1 finding  (1 low)
  ✔ test-generator      3 test suggestions

┌─────────────────────────────────────────────────────────┐
│ HIGH  SQL injection in src/db/queries.ts:42             │
│       User input interpolated directly into query       │
│                                                         │
│ MED   Missing rate limit on POST /api/upload            │
│       No throttle on file upload endpoint               │
│                                                         │
│ LOW   O(n²) loop in src/utils/diff.ts:18                │
│       Consider using a Set for lookups                  │
└─────────────────────────────────────────────────────────┘

3 agents · 4 files · 6 findings · $0.03 · 12s
```

## Commands

| Command         | Description                                  |
|-----------------|----------------------------------------------|
| `nexus init`    | Initialize config and install default agents |
| `nexus run`     | Submit a review task                         |
| `nexus status`  | Show daemon status and active tasks          |
| `nexus result`  | Get the result of a completed task           |
| `nexus watch`   | Stream live progress of a running task       |
| `agents list`   | List installed agents                        |

## Options

| Option             | Description                                   |
|--------------------|-----------------------------------------------|
| `--path <path>`    | Path to repository (default: cwd)             |
| `--agents <list>`  | Comma-separated list of agents to use         |
| `--format <fmt>`   | Output format: `terminal` or `json`           |
| `--base <ref>`     | Compare HEAD against a base ref               |
| `--commit <ref>`   | Review a specific commit                      |
| `--max-cost <$>`   | Maximum cost in dollars                       |
| `--timeout <sec>`  | Timeout in seconds                            |

## Architecture

```
CLI  →  Daemon  →  Orchestrator  →  Agents (parallel)
                        ↓
                  Decomposer → Context Manager → LLM Provider
```

The CLI sends tasks to a local Fastify daemon. The orchestrator decomposes work, builds context per agent, and fans out to LLM providers. Results are merged and streamed back.

## License

MIT

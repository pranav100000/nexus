# Nexus Sprint 1: Daemon + CLI (Revised for OpenClaw Bridge)

## Architecture Overview

The PRD was rewritten from a protocol SDK to a daemon + CLI system that bridges with OpenClaw.

```
CLI (thin client) --HTTP--> Daemon (Fastify, localhost:19200) --> Orchestrator --> Agents (LLM conversations)
                  <--SSE---                                   <-- Results
```

**Sprint 1 scope:**
- Daemon with HTTP API (Fastify)
- Task submission + SSE streaming
- CLI: `nexus init`, `nexus run`, `nexus status`, `nexus watch`, `nexus agents list`
- Auto-start daemon from CLI
- Basic orchestrator (parallel execution, simple merge)
- Model-agnostic LLM layer via Vercel AI SDK

**NOT in Sprint 1:** OpenClaw SKILL.md (Sprint 3), LLM-based task decomposer (Sprint 2), Docker sandboxing, agent tool-use

---

## Monorepo Structure

```
nexus/
├── package.json              # pnpm workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .gitignore
├── PRD.md
├── packages/
│   ├── shared/               # @nexus-agent/shared — types, constants, errors
│   ├── daemon/               # @nexus-agent/daemon — Fastify server + orchestrator
│   └── cli/                  # @nexus-agent/cli — CLI binary
```

Tooling: pnpm workspaces, tsup (build), vitest (test), tsx (dev), TypeScript 5.7+

---

## Implementation Phases

### Phase 1: Repo Setup + Shared Types (Day 1-2)

Initialize git, create root config, build the shared types package.

**Root files:**
- `package.json` — workspace root
- `pnpm-workspace.yaml` — `packages: ["packages/*"]`
- `tsconfig.base.json` — strict, ES2022, ESNext modules, bundler resolution
- `.gitignore` — node_modules, dist, .env, .nexus/

**@nexus-agent/shared files:**

| File | Key Exports |
|------|-------------|
| `src/types/task.ts` | TaskInput, TaskState, TaskStatus, TaskResult, Subtask, SubtaskResult, Finding, FindingSchema (Zod), Constraints, TaskContext |
| `src/types/agent.ts` | AgentManifest, AgentInfo, AgentOutputSchema (Zod) |
| `src/types/events.ts` | TaskEvent (discriminated union), ProgressEvent, ResultEvent, ErrorEvent |
| `src/types/config.ts` | NexusConfig, ProviderConfig |
| `src/constants.ts` | DAEMON_PORT (19200), DAEMON_HOST, DAEMON_URL, paths, defaults |
| `src/errors.ts` | NexusError, DaemonNotRunningError, TaskNotFoundError, NoAgentsError, LLMError, ConfigError |
| `src/index.ts` | Barrel re-export |

**Key types:**

```typescript
TaskInput { action, description?, context: TaskContext, agents?: string[], constraints, pr? }
TaskContext { repoPath, gitDiff?, changedFiles?, branch?, languages? }
TaskState { id, input, status, subtaskResults[], result?, error? }
Finding { severity: 'critical'|'warning'|'info', file?, line?, message, suggestion? }
AgentManifest { name, version, description, capabilities[], languages[], tools[], model, maxContextTokens }

NexusConfig {
  defaultModel: string;            // e.g. "anthropic/claude-sonnet-4-5-20250929"
  providers: {
    [name: string]: ProviderConfig  // keyed by provider name
  };
  maxCost?: number;
  timeout?: number;
}

ProviderConfig {
  apiKey?: string;
  baseUrl?: string;                // for Ollama, LM Studio, OpenRouter, etc.
}
```

**Zod schemas:** Define Zod schemas alongside types for agent output validation (used by `generateObject()` in Phase 2).

```typescript
// Agent output schema — used by generateObject() for guaranteed valid JSON
const AgentOutputSchema = z.object({
  summary: z.string(),
  findings: z.array(z.object({
    severity: z.enum(['critical', 'warning', 'info']),
    file: z.string().optional(),
    line: z.number().optional(),
    message: z.string(),
    suggestion: z.string().optional(),
  })),
  confidence: z.number().min(0).max(1),
  approve: z.boolean(),
});
```

**Gate:** `pnpm --filter @nexus-agent/shared build` succeeds.

---

### Phase 2: LLM Abstraction Layer (Day 2-3)

Uses the **Vercel AI SDK** (`ai` package) for model-agnostic LLM access. Supports Anthropic, OpenAI, Google, Ollama, OpenRouter, and any OpenAI-compatible endpoint out of the box.

**packages/daemon/src/llm/ files:**

| File | Key Exports |
|------|-------------|
| `types.ts` | LLMProvider interface, ChatMessage, ChatRequest, ChatResponse, StructuredRequest |
| `provider-factory.ts` | createProvider() — resolves model string to AI SDK provider |
| `llm-service.ts` | LLMService — wraps AI SDK's generateText() and generateObject() |
| `index.ts` | Barrel export |

**LLMProvider interface:**

```typescript
interface LLMService {
  // Free-form text generation (for orchestrator planning, etc.)
  chat(request: ChatRequest): Promise<ChatResponse>;
  
  // Structured output with Zod schema validation
  // Uses AI SDK's generateObject() — returns typed, validated JSON
  // No manual JSON parsing, no regex extraction, no retries needed
  structured<T>(request: StructuredRequest<T>): Promise<T>;
  
  estimateCost(inputTokens: number, outputTokens: number, model: string): number;
}
```

**Provider resolution:** Model strings follow the `provider/model` convention (matching OpenClaw):

```typescript
// provider-factory.ts
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';

function createProvider(modelString: string, config: NexusConfig) {
  const [providerName, ...rest] = modelString.split('/');
  const modelId = rest.join('/');
  const providerConfig = config.providers[providerName];
  
  switch (providerName) {
    case 'anthropic':
      return anthropic(modelId, { apiKey: providerConfig?.apiKey });
    case 'openai':
      return openai(modelId, { apiKey: providerConfig?.apiKey });
    case 'google':
      return google(modelId, { apiKey: providerConfig?.apiKey });
    case 'ollama':
      // Ollama uses OpenAI-compatible API
      return openai(modelId, { baseURL: providerConfig?.baseUrl ?? 'http://localhost:11434/v1' });
    case 'openrouter':
      return openai(modelId, {
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: providerConfig?.apiKey,
      });
    default:
      // Generic OpenAI-compatible endpoint
      if (providerConfig?.baseUrl) {
        return openai(modelId, { baseURL: providerConfig.baseUrl, apiKey: providerConfig?.apiKey });
      }
      throw new ConfigError(`Unknown provider: ${providerName}`);
  }
}
```

**Structured output (the key feature):**

```typescript
// llm-service.ts
import { generateText, generateObject } from 'ai';

class LLMServiceImpl implements LLMService {
  async structured<T>(request: StructuredRequest<T>): Promise<T> {
    const provider = createProvider(request.model, this.config);
    
    const { object } = await generateObject({
      model: provider,
      system: request.system,
      prompt: request.prompt,
      schema: request.schema,   // Zod schema — AI SDK handles the rest
    });
    
    return object; // Already typed and validated
  }
}
```

- Throws `ConfigError` if provider can't be resolved or API key missing
- Throws `LLMError` if generation fails
- `estimateCost()` uses hardcoded pricing per known model, returns 0 for unknown/local

**Tests:** Mock the AI SDK, test provider resolution, structured output mapping, error handling.

---

### Phase 3: Task Store (Day 3)

**File:** `packages/daemon/src/task-store.ts`

**Exports:** TaskStore

In-memory task state + EventEmitter for SSE streaming.

```
TaskStore {
  create(id, input): TaskState
  get(id): TaskState                    // throws TaskNotFoundError
  getAll(): TaskState[]
  updateStatus(id, status): void
  addSubtaskResult(id, result): void
  setResult(id, result): void
  setError(id, error): void
  emit(id, event: TaskEvent): void      // push SSE event
  subscribe(id): AsyncIterable<TaskEvent>  // async iterator for SSE consumers
}
```

Each task gets its own EventEmitter. `subscribe()` returns an AsyncIterable that yields events as they happen, with a done signal on terminal state.

**Tests:** Async iterable pattern, event ordering, terminal events close stream.

---

### Phase 4: Context Layer (Day 3-4)

**packages/daemon/src/context/ files:**

| File | Key Exports |
|------|-------------|
| `git.ts` | getGitDiff(), getChangedFiles(), getCurrentBranch() |
| `context-manager.ts` | ContextManager — builds RepoContext from TaskContext |

**Scope for Sprint 1 (timeboxed):**
- Read git diff for staged/committed changes only
- Read changed file contents
- Detect languages from file extensions (simple map, no AST)
- **Skip:** full repo scanning, monorepo detection, binary file handling, symlink resolution, framework detection. These are Sprint 2.

Git operations use `child_process.execFile` (not shell, for safety).

`ContextManager.filterForAgent()` filters files by the agent's declared `languages` array. Simple extension matching — nothing fancy.

---

### Phase 5: Agent Layer (Day 4-5)

**packages/daemon/src/agents/ files:**

| File | Key Exports |
|------|-------------|
| `manifest-loader.ts` | loadAgentManifests() — reads `~/.nexus/agents/*/manifest.json` |
| `agent-runner.ts` | AgentRunner — runs one agent as an LLM conversation |
| `agent-manager.ts` | AgentManager — loads all agents, queries by capability |

**AgentRunner design:**
- Each agent gets: system prompt + filtered context + subtask description
- Uses `LLMService.structured()` with `AgentOutputSchema` — returns typed, validated results directly from the AI SDK. No manual JSON parsing.
- No tool-use in Sprint 1 (agents are analysis-only)
- Returns SubtaskResult with findings, confidence, token usage, cost
- Each agent's model is resolved from its `manifest.json` `model` field, falling back to `config.defaultModel`

**Agent manifest format** (files in `~/.nexus/agents/<name>/`):

```
manifest.json     — AgentManifest (model field is provider-prefixed, e.g. "anthropic/claude-sonnet-4-5-20250929")
system-prompt.md  — system prompt for the LLM (optional, has defaults)
```

**Tests:** Mock LLM service, test prompt building, verify structured output schema is passed correctly.

---

### Phase 6: Orchestrator (Day 5-7)

**packages/daemon/src/orchestrator/ files:**

| File | Key Exports |
|------|-------------|
| `strategies/types.ts` | ExecutionStrategy interface, SubtaskAssignment |
| `strategies/parallel.ts` | ParallelStrategy — Promise.all over all agents |
| `strategies/sequential.ts` | SequentialStrategy — agents run one at a time |
| `decomposer.ts` | TaskDecomposer interface + ManualDecomposer |
| `merger.ts` | ResultMerger — combines agent outputs, deduplicates findings |
| `index.ts` | Orchestrator class — ties everything together |

**ManualDecomposer (Sprint 1):**
- If user specified `--agents`, use those
- Otherwise, run ALL available agents in parallel
- Sprint 2 replaces with LLM-based decomposer (same interface)

**Orchestrator.execute() flow:**
1. Update task status to `running`
2. Build repo context via ContextManager
3. Decompose task via ManualDecomposer → list of Subtasks
4. Validate agents exist for all subtasks
5. Execute via ParallelStrategy (emitting progress events)
6. Merge results via ResultMerger
7. Store final TaskResult
8. Emit result event (or error event on failure)

**Tests:** Mock agent manager + context manager. Test full flow with mock data, error propagation.

---

### Phase 7: HTTP Server (Day 7-9)

**packages/daemon/src/ files:**

| File | Key Exports |
|------|-------------|
| `config.ts` | loadConfig() — loads `~/.nexus/config.json` + env vars |
| `pid.ts` | writePidFile(), readPidFile(), isDaemonRunning() |
| `routes/health.ts` | `GET /health` → `{ status: 'ok' }` |
| `routes/tasks.ts` | `POST /tasks`, `GET /tasks/:id`, `GET /tasks/:id/stream` (SSE) |
| `routes/agents.ts` | `GET /agents` |
| `server.ts` | createServer() — Fastify app setup + route registration |
| `index.ts` | Entry point — wires everything, starts server |

**SSE route** (`GET /tasks/:id/stream`):
- Sets headers: `text/event-stream`, `no-cache`, `keep-alive`
- Subscribes to TaskStore's async iterable for that task
- Writes `data: ${JSON.stringify(event)}\n\n` for each event
- Closes connection on terminal event (result or error)

**Daemon entry (index.ts) startup:**
1. `loadConfig()` → NexusConfig
2. Create LLMService with provider config
3. Create TaskStore, AgentManager, ContextManager
4. Load agents via `agentManager.loadAgents()`
5. Create Orchestrator
6. Create Fastify server, register routes
7. Write PID file
8. Listen on `127.0.0.1:19200`
9. Handle SIGINT/SIGTERM → remove PID, close server

**Daemon logging:** stdout/stderr redirected to `~/.nexus/daemon.log`. Log rotation not needed for Sprint 1, but ensure crash stack traces are captured. On daemon start, log the config (redacting API keys), loaded agents, and listening address.

**Tests:** Start Fastify on ephemeral port, submit task via HTTP, stream SSE, verify lifecycle. Mock only LLM.

---

### Phase 8: CLI (Day 9-11)

**packages/cli/src/ files:**

| File | Key Exports |
|------|-------------|
| `client/sse-client.ts` | parseSSEStream() — parses ReadableStream into SSE events |
| `client/daemon-client.ts` | DaemonClient — HTTP client using native fetch |
| `client/daemon-lifecycle.ts` | DaemonLifecycle — auto-start daemon, health polling |
| `format/terminal.ts` | Rich chalk formatting for findings, progress, results |
| `format/json.ts` | Machine-readable JSON output |
| `commands/init.ts` | `nexus init` — creates `~/.nexus/`, copies default agents, writes starter config |
| `commands/run.ts` | `nexus run <action> [description]` with `--pr`, `--path`, `--agents`, `--format`, `--max-cost`, `--timeout` |
| `commands/status.ts` | `nexus status` — list active tasks |
| `commands/result.ts` | `nexus result <id>` — get completed task result |
| `commands/watch.ts` | `nexus watch <id>` — stream live progress |
| `commands/agents.ts` | `nexus agents list` |
| `index.ts` | Commander program setup |
| `bin/nexus.ts` | `#!/usr/bin/env node` shebang entry |

**`nexus init` flow:**
1. Create `~/.nexus/` directory structure
2. Copy bundled default agents (security-reviewer, perf-analyzer, test-generator) from the CLI package's `templates/agents/` into `~/.nexus/agents/`
3. Write starter `~/.nexus/config.json` with `defaultModel` and empty `providers` map
4. Prompt user for API key (or tell them to set `ANTHROPIC_API_KEY` / add to config)
5. Print next steps: "Run `nexus agents list` to see your agents, then `nexus run review` in a git repo"

**Auto-start daemon** (`DaemonLifecycle.ensureRunning()`):
1. `GET /health` → if ok, return
2. If `~/.nexus/` doesn't exist, run init automatically
3. Spawn daemon as detached child process (`spawn` with `detached: true`, `stdio` redirected to `~/.nexus/daemon.log`, then `unref()`)
4. Poll `/health` with backoff (max 5s)
5. If daemon doesn't start, throw DaemonStartError with message pointing to `~/.nexus/daemon.log`

**`nexus run review` flow:**
1. `ensureRunning()` — start daemon if needed
2. Resolve repo context from `--path` (default cwd)
3. `POST /tasks` with TaskInput → get taskId
4. `GET /tasks/:id/stream` → stream SSE events
5. Format and print events (progress to stderr, final result to stdout)

**Dependencies:** commander, chalk (no inquirer needed for Sprint 1)

---

### Phase 9: Bundled Agents + Integration (Day 11-13)

**Bundled agents** (shipped in CLI package under `templates/agents/`, copied to `~/.nexus/agents/` by `nexus init`):

**security-reviewer:**

manifest.json:
```json
{
  "name": "security-reviewer",
  "version": "0.1.0",
  "description": "Identifies security vulnerabilities, auth issues, and injection risks",
  "capabilities": ["security-review", "vulnerability-detection", "auth-audit"],
  "languages": ["typescript", "javascript", "python", "go", "rust"],
  "tools": [],
  "model": "anthropic/claude-sonnet-4-5-20250929",
  "maxContextTokens": 100000
}
```

system-prompt.md:
```markdown
You are a senior application security engineer performing a code review. Your job is to identify security vulnerabilities, not style issues or general code quality.

## What to look for

Focus exclusively on security-relevant findings:

- **Injection flaws**: SQL injection, command injection, XSS, template injection, LDAP injection, path traversal
- **Authentication & authorization**: Missing auth checks, broken access control, privilege escalation, insecure session management, hardcoded credentials
- **Cryptography**: Weak algorithms (MD5, SHA1 for security), hardcoded keys/secrets, insecure random number generation, missing encryption for sensitive data
- **Data exposure**: Sensitive data in logs, error messages leaking internals, unmasked PII, secrets in source code
- **Input validation**: Missing validation on user input, type confusion, buffer overflows, deserialization of untrusted data
- **Configuration**: CORS misconfiguration, missing security headers, debug mode in production, overly permissive permissions
- **Dependencies**: Known vulnerable patterns (not version checking — focus on usage patterns that indicate vulnerability)

## What NOT to report

Do not report: code style, naming conventions, missing documentation, performance issues, test coverage, refactoring suggestions, or anything that is not a security concern. If a file has no security issues, say so — do not invent findings.

## Severity guidelines

- **critical**: Exploitable vulnerability that could lead to data breach, RCE, or privilege escalation. Requires immediate fix.
- **warning**: Security weakness that could be exploited under certain conditions, or a defense-in-depth gap. Should be fixed before merge.
- **info**: Security best practice not followed, but not directly exploitable. Nice to fix but not blocking.

Be specific. Reference exact file paths and line numbers. Explain WHY something is a vulnerability, not just WHAT it is. Include a concrete suggestion for how to fix it.

If you are not confident a finding is a real vulnerability (confidence < 0.5), do not include it. False positives erode trust.
```

---

**perf-analyzer:**

manifest.json:
```json
{
  "name": "perf-analyzer",
  "version": "0.1.0",
  "description": "Identifies performance bottlenecks, N+1 queries, and optimization opportunities",
  "capabilities": ["performance-review", "complexity-analysis", "query-optimization"],
  "languages": ["typescript", "javascript", "python", "go"],
  "tools": [],
  "model": "anthropic/claude-sonnet-4-5-20250929",
  "maxContextTokens": 100000
}
```

system-prompt.md:
```markdown
You are a senior performance engineer reviewing code for performance issues. Focus on problems that have measurable impact at scale — not micro-optimizations.

## What to look for

- **Database**: N+1 query patterns, missing indexes (inferred from query patterns), unbounded queries (no LIMIT), full table scans on large datasets, missing pagination, transactions held open too long
- **Algorithmic**: O(n^2) or worse in hot paths, unnecessary nested loops, repeated computation that should be cached/memoized, large datasets processed synchronously
- **Memory**: Memory leaks (event listeners not removed, growing caches without eviction, closures capturing large objects), loading entire files/datasets into memory when streaming would work
- **I/O**: Sequential API calls that could be parallelized, missing caching for repeated external calls, synchronous file I/O in async contexts, unbatched operations
- **Concurrency**: Missing connection pooling, unbounded concurrency (Promise.all on 10k items), blocking the event loop
- **Frontend** (if applicable): Bundle size regressions, unnecessary re-renders, missing lazy loading, unoptimized images

## What NOT to report

Do not report: security issues, code style, missing tests, documentation, or theoretical performance concerns that would only matter at unrealistic scale. Do not suggest premature optimization for code that runs once at startup or handles <100 items.

## Severity guidelines

- **critical**: Performance bug that will cause outages, timeouts, or OOM at production scale. Examples: unbounded memory growth, O(n^2) on user-generated data.
- **warning**: Noticeable performance impact for typical usage. Examples: N+1 query, sequential API calls that could be parallel, missing pagination.
- **info**: Optimization opportunity that would improve performance but isn't causing problems yet. Examples: could cache this expensive computation, consider connection pooling.

Be specific about the scale at which the issue matters. "This is O(n^2) where n is the number of users" is useful. "This could be faster" is not.
```

---

**test-generator:**

manifest.json:
```json
{
  "name": "test-generator",
  "version": "0.1.0",
  "description": "Generates comprehensive test cases with edge case coverage",
  "capabilities": ["test-generation", "coverage-analysis", "edge-case-detection"],
  "languages": ["typescript", "javascript", "python"],
  "tools": [],
  "model": "anthropic/claude-sonnet-4-5-20250929",
  "maxContextTokens": 100000
}
```

system-prompt.md:
```markdown
You are a senior QA engineer reviewing code changes and identifying what tests are missing or inadequate. Your goal is to find gaps in test coverage that could let bugs ship.

## What to look for

- **Missing test coverage**: Public functions/methods with no tests, API endpoints with no integration tests, error paths never tested
- **Edge cases**: Boundary values (0, -1, MAX_INT, empty string, null, undefined), concurrent access, race conditions, timeout behavior, Unicode/special characters, very large inputs
- **Error handling**: What happens when dependencies fail? Network errors, database errors, filesystem errors, malformed input, auth failures — are these tested?
- **Integration gaps**: Components tested in isolation but their interaction is untested, mocked dependencies that behave differently in production
- **Regression risks**: Code changes that modify behavior but have no corresponding test updates, removed or weakened assertions

## Output format

For each finding, describe:
1. What specific test is missing
2. Why it matters (what bug could ship without it)
3. A concrete test case description (not full code — just what to test and what to assert)

## Severity guidelines

- **critical**: Missing tests for core business logic, auth/payment flows, or data integrity. A bug here causes real user harm.
- **warning**: Missing edge case coverage or error path tests. A bug here causes degraded experience or intermittent failures.
- **info**: Test improvement opportunity — better assertions, better test organization, flaky test patterns.

Do not suggest tests for trivial getters/setters, auto-generated code, or configuration files. Focus on logic that makes decisions.
```

**Integration tests:**
- Full flow: CLI → daemon → orchestrator → agent (mocked LLM) → result
- End-to-end: `nexus run review --path ./test-repo` against a fixture repo

**Gate:** All tests pass, full pipeline works.

---

### Phase 10: Polish + Buffer (Day 13-16)

Extended to include 2 buffer days for overruns from Phases 5-8.

- Error message polish (include actionable hints, point to daemon.log on failures)
- CLI help text for all commands
- Root README.md with quickstart
- Initial git commit
- Smoke test: fresh machine install flow (`npm install -g` → `nexus init` → `nexus run review`)

---

## Dependency Graph

```
Phase 1 (shared types + Zod schemas)
  └→ Phase 2 (LLM layer — Vercel AI SDK)
  └→ Phase 3 (task store)
  └→ Phase 4 (context layer — timeboxed, git diff + changed files only)
       └→ Phase 5 (agent layer) [depends on LLM + context]
            └→ Phase 6 (orchestrator) [depends on agents + task store]
                 └→ Phase 7 (HTTP server) [depends on orchestrator + task store]
                      └→ Phase 8 (CLI + nexus init) [depends on shared types + running daemon]
                           └→ Phase 9 (bundled agents + integration tests)
                                └→ Phase 10 (polish + buffer)
```

Phases 2, 3, 4 can be built in parallel after Phase 1.

---

## Key Dependencies

| Package | Version | Why |
|---------|---------|-----|
| `ai` | ^4.x | Vercel AI SDK — unified LLM interface, generateObject() for structured output |
| `@ai-sdk/anthropic` | latest | Anthropic provider for AI SDK |
| `@ai-sdk/openai` | latest | OpenAI + OpenAI-compatible provider (also used for Ollama, OpenRouter, LM Studio) |
| `@ai-sdk/google` | latest | Google Gemini provider |
| `zod` | ^3.x | Schema validation for structured LLM output + config |
| `fastify` | ^5.x | HTTP server for daemon |
| `commander` | ^13.x | CLI argument parsing |
| `chalk` | ^5.x | Terminal colors |
| `typescript` | ^5.7 | Type checking |
| `tsup` | ^8.x | Build |
| `vitest` | ^3.x | Tests |
| `tsx` | ^4.x | Dev-time TS execution |

---

## Key Design Decisions

1. **Vercel AI SDK for model-agnostic LLM access** — supports Anthropic, OpenAI, Google, Ollama, OpenRouter, and any OpenAI-compatible endpoint. Model strings use `provider/model` convention matching OpenClaw (e.g., `anthropic/claude-sonnet-4-5-20250929`, `ollama/llama3`).
2. **`generateObject()` with Zod schemas for agent output** — no manual JSON parsing, no regex extraction, no retries. The AI SDK handles structured output natively, returning typed and validated objects. This eliminates the LLM JSON reliability problem entirely.
3. **Manual decomposer in Sprint 1** — runs all available agents or user-specified agents. LLM decomposer in Sprint 2 (same `TaskDecomposer` interface).
4. **No agent tool-use in Sprint 1** — agents are analysis-only LLM conversations. Tool-use (semgrep, file write) in Sprint 2.
5. **In-memory TaskStore** — no persistence. Tasks lost on daemon restart. SQLite can be added later.
6. **SSE over WebSocket** — simpler, sufficient for one-way streaming.
7. **Native fetch in CLI** — no HTTP client dependency (Node 18+).
8. **Daemon as detached child process** — CLI spawns with `detached: true`, PID tracked in `~/.nexus/daemon.pid`, stdout/stderr to `~/.nexus/daemon.log`.
9. **Fail loudly everywhere** — missing API key throws, malformed agent JSON throws, daemon start failure throws. No silent fallbacks.
10. **`nexus init` for first-run setup** — creates `~/.nexus/` directory, copies bundled agents, writes starter config. Auto-triggered by `ensureRunning()` if `~/.nexus/` doesn't exist.
11. **Context layer timeboxed** — Sprint 1 reads git diff + changed files only. Full repo scanning, monorepo support, binary detection deferred to Sprint 2.

---

## Runtime Layout (~/.nexus/)

```
~/.nexus/
├── config.json       # user config (defaultModel, providers, maxCost, timeout)
├── daemon.pid        # PID of running daemon
├── daemon.log        # daemon stdout/stderr (crash traces captured here)
└── agents/
    ├── security-reviewer/
    │   ├── manifest.json
    │   └── system-prompt.md
    ├── perf-analyzer/
    │   ├── manifest.json
    │   └── system-prompt.md
    └── test-generator/
        ├── manifest.json
        └── system-prompt.md
```

### Example config.json

```json
{
  "defaultModel": "anthropic/claude-sonnet-4-5-20250929",
  "providers": {
    "anthropic": {
      "apiKey": "sk-ant-..."
    },
    "openai": {
      "apiKey": "sk-..."
    },
    "ollama": {
      "baseUrl": "http://localhost:11434"
    },
    "openrouter": {
      "apiKey": "sk-or-...",
      "baseUrl": "https://openrouter.ai/api/v1"
    }
  },
  "maxCost": 1.00,
  "timeout": 300
}
```

---

## Verification

After all phases:
1. `pnpm build` — all 3 packages compile
2. `pnpm test` — all tests pass
3. `nexus init` → creates `~/.nexus/` with agents and config
4. Start daemon manually: `node packages/daemon/dist/index.js` → listening on :19200
5. `curl localhost:19200/health` → `{ "status": "ok" }`
6. `nexus agents list` → shows 3 bundled agents
7. `nexus run review --path ./test-repo` → streams progress, returns formatted results
8. Test with different providers: swap `defaultModel` to `openai/gpt-4o`, verify it works
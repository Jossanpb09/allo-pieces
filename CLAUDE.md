# CLAUDE.md — allo-pieces

**Start every session by reading `docs/PROGRESS.md`** — it holds the handoff
state from the last session (current task, what is done, what is next). Keep it
updated as you work and commit it with your changes. Chats die; that file is how
the next session continues without losing the plan.

Auto spare parts project. The repo is still mostly empty — when a stack is
chosen, record it here (framework, package manager, build/test/lint commands)
so a fresh session does not have to rediscover it.

## Commands

_To fill in once the project is scaffolded, e.g.:_

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
```

## Context hygiene — READ THIS FIRST

Sessions on this project keep ending with `Context window was full` and
`Compaction failed · conversation could not be reduced below the context limit`.
That happens when a handful of very large items (whole-file reads, full build
logs, big pastes) are sitting in the context — once one single item is too big,
compaction can no longer get under the limit and the session is unrecoverable.

Follow these rules in every session.

### Reading files

- Never read a whole file larger than ~200 lines. Read a range instead:
  `sed -n '120,200p' path/to/file`
- To find something, search — don't read: `rg -n "pattern" src/`
- To see a file's shape before reading it: `rg -n "^(export|function|const|class|interface|type) " path/to/file`
- Never open these at all: `package-lock.json`, `node_modules/`, `.next/`,
  `dist/`, `build/`, `coverage/`, `*.log`, generated Supabase types, minified
  or bundled files, binary/image assets.
- Reading the same file twice wastes the whole file again — read it once and
  work from what you already have.

### Running commands

- Never let a long command print its full output into the conversation. Send it
  to a file and read only what matters:
  ```bash
  npm run build > /tmp/build.log 2>&1 || tail -n 40 /tmp/build.log
  npm run typecheck > /tmp/tsc.log 2>&1; grep -E "error TS" /tmp/tsc.log | head -n 30
  npm run lint > /tmp/lint.log 2>&1; grep -E "error|warning" /tmp/lint.log | head -n 30
  ```
- Cap anything that can run long: `| head -n 50`, `| tail -n 40`.
- `git diff` → `git diff --stat` first, then diff only the files that matter.
- `git log` → always `--oneline -n 20`.
- `git status` → `--short`.
- Never `cat` a lockfile, a log, or a dump to "check" it — `wc -l` and `grep` it.

### Exploration

- For "where is X", "how does Y work", "which files touch Z" — use a subagent
  (the `Explore` agent) instead of reading the files in the main session. The
  subagent burns its own context and hands back only the answer.
- Same for reviewing a large diff or auditing many files at once.

### Session discipline

- One session = one task. When the task changes, start a new session.
- Run `/compact` at around 50% context, not at 95%. Early compaction works;
  late compaction fails.
- Before a session gets long, write the state into `docs/PROGRESS.md`:
  what the task is, which files were touched, what is done, what is next.
  A new session then starts with "read docs/PROGRESS.md and continue".
- Paste nothing large into chat. Save long logs, JSON, or error dumps to a file
  and give the path.

### MCP servers / plugins

Every connected MCP server loads its full tool list into the context *before*
any work starts. Keep only what this repo actually needs enabled (GitHub, and
Supabase where the project uses it) and disable the rest with `/mcp`. A dozen
unused servers can consume a large share of the window on an empty session.

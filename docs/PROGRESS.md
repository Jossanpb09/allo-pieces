# PROGRESS

Session handoff file. **Any Claude session working on this repo must keep this
file current**, and a new session must read it first.

Why: a chat can die (`Context window was full`, failed compaction) at any time.
The code is safe — it is committed in git — but the *plan* lives only in the
chat unless it is written down here. This file is what lets a brand-new session
pick up exactly where the dead one stopped.

## How to use it

**Starting a session:** read this file, then `git log --oneline -n 10` to see
what actually landed. Work from those two things, not from memory of an old chat.

**During a session:** update the block below whenever something lands — a
finished sub-task, a decision, a dead end. Commit it with the code.

**Before a session gets long:** make sure the block is accurate, then start a
fresh session instead of fighting a full context window.

---

## Current task

_One line: what is being built right now._

Status: `not started` / `in progress` / `blocked` / `done`
Branch: `claude/charming-pasteur-84fij2`

### Done

- _what already works and is committed_

### In progress

- _what is half-finished, and in which file_

### Next

- [ ] _the next concrete step_
- [ ] _the one after that_

### Decisions / constraints

- _choices made that a new session must not undo (schema shape, library picked,
  naming, RLS rules, anything agreed with the client)_

### Blocked / open questions

- _anything waiting on an answer or on access_

---

## Log

Newest first. One or two lines per session — what changed, what to watch out for.

- `YYYY-MM-DD` — _summary_

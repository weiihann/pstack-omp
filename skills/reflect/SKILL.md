---
name: reflect
description: Spawn three parallel review subagents over the active transcript, surface learnings, and route each to a concrete edit on an existing skill. Use when the user says reflect.
disable-model-invocation: true
---

# Reflect

Follow the [portable runtime contract](../pstack-omp/references/runtime.md) for transcript discovery, child roles, model choices, tool access, questions, and skill authoring.

Mine the current conversation for durable learnings, then route them into skill edits.

Invoke when the user says "reflect" or "/reflect". Skip when the conversation is trivial, off-topic, or already covered by an existing skill the parent followed correctly. One-offs are not learnings.

## 1. Locate the active transcript

The parent resolves its own transcript before fanning out. Use the host's active history resource, an explicit transcript directory, or `$PSTACK_TRANSCRIPTS_DIR`, in that order. Never scan another workspace or a global vendor history tree. If no transcript resolves, write a tight digest of the session and use that instead.

```bash
ls -t <agent-transcripts>/*.jsonl <agent-transcripts>/*/*.jsonl <agent-transcripts>/*/subagents/*.jsonl 2>/dev/null | head -10
```

That covers the legacy flat (`<id>.jsonl`), current nested (`<id>/<id>.jsonl`), and subagent (`<parent>/subagents/<child>.jsonl`) layouts. For each candidate, read the first JSONL line. Take the file whose `message.content[0].text` contains the conversation's opening user prompt. If none matches, pass a tight digest of the session instead.

## 2. Spawn three reviewers in parallel

Launch three reviewer children concurrently through the host's task facility. Reviewers need the host tools that look up the tickets, chat threads, and observability traces the transcript references. Forbid file writes in the brief. The parent applies edits. If the host cannot combine a read-only repository posture with external-tool access, keep tool access and enforce no writes in the brief.

Each reviewer and the synthesizer name a role line in the model configuration (`$PSTACK_CONFIG` or `.pstack/config.md`) and a default role. Set `model` to that line's value, or use the default role if the configuration or the line is missing. Leave `model` unset when the value is `auto` or `inherit-parent`. If the host task runner rejects a model, use the default role and say so. If it rejects the default, use the closest valid choice of the same family from its error message.

| Lens | Role line | Default role | Prompt template |
|---|---|---|---|
| Judgment | `reflect judgment` | `reviewer` | `references/judgment-reviewer.md` |
| Tooling | `reflect tooling` | `researcher` | `references/tooling-reviewer.md` |
| Divergent | `reflect divergent` | `designer` | `references/divergent-reviewer.md` |

Pass each template verbatim, substituting the transcript path or digest where marked. Reviewers return findings in their child reports.

## 3. Synthesize

Launch one child with the model from the `reflect synthesizer` line (default role `synthesizer`). It spot-verifies citations through host tools, so keep that access and forbid repository writes in its brief. Pass `references/synthesizer.md` verbatim, with each reviewer's full output inlined where marked. It returns an Accepted / Rejected / Backlog list.

## 4. Structural enforcement check

Move any Accepted item that a lint rule, script, metadata flag, or runtime check would enforce more reliably to Backlog. See the **encode-lessons-in-structure** principle skill.

## 5. Apply

Present the synthesizer's full Accepted / Rejected / Backlog output and wait for explicit approval before applying any Accepted edit. The user picks the subset and may redirect routings. Skill changes affect every future agent in the org. Do not auto-apply.

File each Backlog item to your team's devex or backlog tracker without waiting. Only the Accepted list waits for approval.

Follow each approved row's Routing exactly:

- Trivial existing-skill edit (a one-line bullet, a tightened sentence, a stale fact corrected): the parent does it directly.
- Substantive existing-skill edit (a new section, a new pattern table, more than ~10 lines): use the host's skill-authoring facility when available and run its draft / test / iterate loop. Otherwise apply that loop directly.
- `tune description: <skill path>` (the skill exists but didn't trigger when it should have): use the host's skill-authoring facility when available, or directly run the same description-review loop.
- `new skill: <kebab-name>`: use the host's skill-authoring facility when available, or author it directly from package conventions. Do not invent the shape ad hoc.

If your environment ships a SKILL.md validator, run it on every touched skill before declaring done.

## 6. Summarize for the user

Short list, no preamble:

- Edits applied: `<skill path>`. What changed, one line each.
- New skills created: `<skill path>`. One line each (rare).
- Backlog filed to the devex tracker: `<issue title>` (`<tags>`). One line each.
- Dropped: one line per rejected finding + reason from the synthesizer.

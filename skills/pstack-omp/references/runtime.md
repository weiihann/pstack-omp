# OMP pstack runtime contract

This file is the OMP binding for the imported pstack skills. Read it before using
any instruction that mentions a task runner, model, transcript, question tool,
skill path, or long-running loop.

## Runtime selection

Use the capabilities the live OMP session exposes. The `task` tool's inventory is
authoritative for agent names; do not assume an agent, tool, or model exists that
the session did not report. When a capability is unavailable, preserve the
workflow gate and use the nearest truthful local equivalent. Do not claim a
child, review, transcript, or live check happened unless OMP reported it.

## Canonical roles

| pstack role | Required behavior |
| --- | --- |
| `explorer` | Read-only repository reconnaissance and trace reduction. |
| `watcher` | Observe one exact state transition, then terminate. |
| `planner` | Technical architecture, decomposition, and sequencing. |
| `designer` | Product, interaction, or alternative design candidates. |
| `reviewer` | Independent code, protocol, behavioral, or security review. |
| `researcher` | Source-verified external documentation and API research. |
| `synthesizer` | Adjudicate frozen reports without changing their evidence. |
| `implementer` | Bounded implementation or test changes with explicit ownership. |
| `owner` | One coupled implementation session retained through its lifecycle. |
| `mechanical` | Fully specified low-judgment edits. |

Map these roles to OMP's bundled task agents: `scout`, `designer`, `reviewer`,
`security-reviewer`, `librarian`, `task`, and `sonic`. The live `task` inventory
wins over this document.

Every child brief must stand alone. It must name its goal, role, writable scope,
acceptance criteria, verification command, forbidden scope, and report format. A
child does not spawn another child unless the host explicitly supports nested
delegation and the active playbook requires it.

## Models

Model inventory is not model delegation. OMP resolves a task agent's model
through its settings (`modelRoles`, `task.agentModelOverrides`, the agent
definition, and normal fallback), not through the task payload. Agent selection
and model selection are separate decisions: do not put a `model` field in a task
item and do not use a model alias as the `agent` value.

Use concrete `provider/model-id` values in configuration only when OMP's live
model inventory reported them. `inherit-parent` runs a role on the parent chat
model; a missing role entry means the OMP default. A panel is a list of role or
model choices, and its size controls fan-out.

The optional configuration path is `$PSTACK_CONFIG`. If it is unset, use
`.pstack/config.md` in the current project for project-local settings. Do not
write to a vendor-specific home directory.

## Questions and interaction

Use the host's structured user-interaction tool when it exists. Otherwise ask one
focused question in the normal conversation. An observable fact belongs to a
probe or verification run, not a user question.

## Skills and paths

Invoke skills by their OMP-supported skill name, normally `/skill:<name>` or
`$name`. Within this package, sibling files are under `skills/<name>/`. Do not
assume a global installation path.

## Transcripts and history

Transcript-dependent skills read OMP session history through `history://`
resources or accept an explicit transcript directory via `$PSTACK_TRANSCRIPTS_DIR`.
Never scan another project or a global transcript tree. If no transcript source
is available, report the gap and continue only with evidence that does not
require it.

## Long-running work and verification

Use the host's durable goal, watcher, or loop facility when available. Otherwise keep
the predicate and checkpoint in a project-local decision trail. A timed heartbeat is
only a fallback. Re-arm a watcher after every state-changing wave.

The root coordinator owns user interaction, approvals, integration, and final
verification. A worker report is evidence, not proof. The root must inspect artifacts
and run the promised checks on the integrated result.

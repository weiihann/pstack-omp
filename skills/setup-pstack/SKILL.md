---
name: setup-pstack
description: Configure which OMP roles or models pstack uses per workflow role, and at what reasoning budget. Detects the live OMP inventory and writes portable project-local configuration. Use for /setup-pstack, "configure pstack models", "pstack budget", or changing pstack's role choices.
---

# Setup pstack

Follow the [portable runtime contract](../pstack-omp/references/runtime.md) throughout this setup.

Write the optional pstack configuration at `$PSTACK_CONFIG` when that variable is set; otherwise use `.pstack/config.md` in the current project. This is an override layer, not a requirement. Never write to a vendor-specific home directory.

## Steps

Model discovery and model assignment are different capabilities. A model listed by
the live OMP inventory is available to the current session, but per-role assignment
happens through OMP settings, not through the task payload. OMP resolves a task
agent's model through `modelRoles`, `task.agentModelOverrides`, the agent
definition, and normal fallback. Do not claim that a role was assigned when the
facility that would execute it is absent.

### 1. Detect available choices

Detect both of these independently:

1. The model IDs the current OMP session actually exposes, in `provider/model-id` form.
2. The live `task` tool's agent inventory.

The live inventories are authoritative. Never copy a model slug from prose or
guess that a model or agent is available.

If the session's task facility is disabled or an expected agent is absent, use
only the roles the live inventory documents. Do not ask the user to invent a raw
slug. `inherit-parent` is valid only when OMP can pass the current model to a
child.

### 2. Load current state

The default role-to-model mapping is the shape shown in step 5 below. Read the
selected configuration path when it exists and treat its concrete values and its
`# budget` line as the current choices; otherwise start from those defaults. A
line whose role is not in step 5, such as `how critics`, is from a retired role.
Drop it. If the file contains only role aliases the current OMP settings cannot
honor, treat those aliases as stale inactive state and start from the detected
models.

### 3. Budget, map, and confirm

**(a) Ask for a budget.** When both model inventory and per-child model selection
are available, ask for a budget before mapping roles. Use the host's structured
interaction tool when available; otherwise ask one focused question in normal
conversation. Offer these four options with these exact labels, and name the
current budget when the configuration records one.

- `unlimited — keep max`
- `large — xhigh reasoning`
- `medium — high reasoning`
- `small — medium reasoning`

**(b) Apply it.** Build the working table from the default role mapping in step 5,
and on a re-run keep any role you changed by family, list, or alias
(`inherit-parent`). `unlimited` leaves every effort as in that table. `large`,
`medium`, and `small` set the effort token of every real model ID, panel entries
included, to `xhigh`, `high`, or `medium`. The effort token is the last token, or
the one before a trailing `fast`, on the ladder `max` > `xhigh` > `high` >
`medium` > `low`. If the result is not a detected model, use the same family's
detected model with the highest effort at or below the target, else mark the role
as needing a choice. `inherit-parent` does not change. So `small` turns
`claude-opus-5-5-max` into `claude-opus-5-5-medium`, and `grok-4.7-xhigh-fast`
into `grok-4.7-medium-fast`.

**(c) Show the roles and confirm.** Show every workflow role with its current
concrete `provider/model-id` choice. Mark an explicit model absent from the live
inventory as needing a replacement, and also list each line step 2 dropped. Ask
the user to accept or change the choices, offering only detected model IDs plus
`inherit-parent` when the host supports it (that alias runs the role on the parent
chat model). Use the host's structured interaction tool when available; otherwise
ask one focused question in normal conversation.

If the live session exposes models but no usable task facility, stop model
mapping with an explicit capability report naming the missing capability. Say
that no pstack role can receive a different model in this session and do not
present the portable defaults as an assignment or overwrite an existing role
configuration with inactive aliases.

For panel roles (`arena runners`, `arena cross-judge pool`, `architect runners`,
and `interrogate reviewers`), one child runs per entry, so list length controls
fan-out. Prefer diversity for judgment-sensitive panels. `arena cross-judge pool`
is also a list, but Arena selects one value from it whose model family differs
from the parent's when possible. `swarm workers` is the default choice for every
worker unless a race or comparison assigns a different choice per arm.

### 4. Validate

Every explicit model written must be present in the detected host inventory.
Role aliases pass only when the host task facility documents those aliases.
`inherit-parent` passes only when the host can pass the current model to a child. If
a selected explicit model is unavailable, stop and ask for a replacement. Never
write a configuration that requires another host.

### 5. Write the configuration

When the host supports per-child selection, create the parent directory when
needed and overwrite the selected file so re-runs remain idempotent. Record the
chosen budget as a `# budget` line with its label and target effort, then write
one line per role. Use concrete detected model IDs in this shape. Replace every
placeholder with a model the current host reported, and use `inherit-parent` only
when the host supports it:

```md
# pstack role and model configuration
# Values are concrete provider/model-id choices confirmed by the host.
# budget: unlimited (max)
feature, refactoring: <implementer-model>
bug-fix: <reviewer-model>
perf-issue: <reviewer-model>
hillclimb: <implementer-model>
judgment and prose: <reviewer-model>
hardest tasks: inherit-parent
how explorer: <explorer-model>
how explainer: <synthesizer-model>
why investigators: <researcher-model>
why synthesizer: <synthesizer-model>
reflect tooling: <researcher-model>
reflect judgment: <reviewer-model>
reflect divergent: <designer-model>
reflect synthesizer: <synthesizer-model>
arena runners: <designer-model>, <planner-model>, <implementer-model>
arena cross-judge pool: <reviewer-model>, <planner-model>, <designer-model>
swarm workers: <implementer-model>
architect runners: <designer-model>, <planner-model>, <reviewer-model>
interrogate reviewers: <reviewer-model>, <planner-model>, <designer-model>
```

The configuration file is the portable record. To make OMP honor per-agent
models, map the chosen values into OMP settings (`modelRoles` or
`task.agentModelOverrides`) through the project's normal OMP configuration,
preserving unrelated keys. The role map in the `pstack-omp` skill defines the
canonical-role-to-agent translation.

### 6. Confirm

If a concrete configuration was written, tell the user the exact path and list
the model IDs assigned to each role family. State that configuration does not
create models, child agents, permissions, or delegation facilities.

If the session lacks per-child model selection, report that no role
configuration was written or activated. Tell the user which model is active and
how to switch it.

### 7. Offer a verification skill (optional)

Check whether the project has a way to drive the real app for proof, such as a `verify-*` skill or an existing harness. If not, offer once to invoke the sibling **create-verification-skill** skill. On no, move on without pushing.

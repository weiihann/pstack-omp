---
name: arena
description: "Spawn N parallel candidates at the same task, pick a base, graft the strongest parts of the losers into it. Use for /arena, 'arena this', 'throw it in the arena', or when one attempt at a non-trivial artifact would lock in the wrong shape."
disable-model-invocation: true
---

# Arena

Follow the [portable runtime contract](../pstack-omp/references/runtime.md) for child briefs, parallel execution, panels, models, and fallbacks.

Track one checklist entry per phase (Frame, Fan out, Cross-judge, Pick, Graft, Verify) before launching anything. Use the host's planning facility when available. Otherwise keep a compact checklist in the conversation.

## Phase A: Frame

Every candidate gets the same prompt, so the prompt is the contract.

1. State the artifact each candidate is producing.
2. Derive the rubric, 3-6 concrete gradeable criteria for what success looks like on *this* task. It is the picker's tool in Phase D. Candidates only see the task.
3. Pick the runners. Use the `arena runners` line in `$PSTACK_CONFIG (or .pstack/config.md)`. If the configuration or that line is missing, use a diverse host-supported panel drawn from `designer`, `planner`, `reviewer`, and `inherit-parent`. The live host inventory wins. An `auto` or `inherit-parent` entry in this line or the cross-judge line runs that seat on the parent chat model, with no explicit model choice. If the host task runner rejects a configured entry, run that seat on the default panel choice of its family and say so. Families go by model prefix (`claude-*`, `gpt-*`, `grok-*`) or canonical role. With no family match, use `inherit-parent`. If it rejects a default, use the closest live choice of the same family the host exposes. Spawn more runners when the arena covers multiple design directions. Use the same choice N times when the work is generation-bound rather than judgment-sensitive.
4. Give each candidate its own output location (a git worktree where possible, otherwise `/tmp/arena-<slug>/candidate-<n>/`), per the **separate-before-serializing-shared-state** principle skill.

## Phase B: Fan out

Launch all N children concurrently through the host's task facility. Give each a standalone brief with the task, the path to the shared grounding, its own output path, acceptance criteria, verification, forbidden scope, and instructions to produce the artifact and a short rationale naming the alternatives it considered and what it rejected.

If a candidate produces no output, proceed with N-1 and note the dropout.

## Phase C: Cross-judge

After all Phase B candidates complete, choose one from the `arena cross-judge pool` line in `$PSTACK_CONFIG (or .pstack/config.md)`. If the configuration or that line is missing, use the host's `reviewer` role or `inherit-parent`. Prefer a different model family from the parent's when the host exposes model identity. Launch one read-only judge child on that choice. It sees the rubric and the candidates by path label, scores each criterion, and recommends a base with rationale. It runs in parallel with your reading in Phase D. Don't spawn it while candidates are still writing.

## Phase D: Pick a base

Read every candidate end to end before picking. Score each against the rubric criterion by criterion, not on holistic feel, and compare with the cross-judge. Agreement on the base confirms the pick. Disagreement means one of you is biased or the rubric was ambiguous. Read both rationales before deciding.

Pick the base a future maintainer can extend most easily without breaking invariants. When two feel tied, prefer the cleaner boundary or smaller API, per the Laziness Protocol.

## Phase E: Graft

Walk each losing candidate once more for what is worth porting into the base, usually one or two things per candidate, not most of it. Fold each graft in by hand, per the **redesign-from-first-principles** principle skill, so the result stays coherent under one mental model. Don't paste mechanically.

If the candidates converge on one shape, that is strong agreement. Note it and ship the consensus shape. No graft is needed. If they wildly diverge, Phase A was under-specified. Reframe and re-run rather than averaging the divergence.

## Phase F: Verify

Verify the synthesized artifact like any other output, per the **prove-it-works** principle skill. If verification finds a problem the arena missed, either Phase A was wrong (re-frame and re-run) or a candidate caught it and you missed the graft (go back to Phase E). Don't paper over it.

## Outputs

One synthesized artifact, with a short synthesis note alongside naming the base and why, the cross-judge's verdict, each graft with its source candidate, what was rejected and why, any convergence or dropouts, and the verification result.

---
name: swarm
description: "Fan out N parallel workers, drain them, and return one report. Use for /swarm, 'swarm this', or parallel coverage, races, gauntlets, and exploration."
disable-model-invocation: true
---

# Swarm

Follow the [portable runtime contract](../pstack-omp/references/runtime.md) for worker roles, concurrent execution, models, writable isolation, and unavailable-capability fallbacks.

Fan out N parallel workers through the current host. They may cover separate slices, race the same brief, or mix both. The parent waits, aggregates, and returns one report.

## Start

Track one checklist entry per phase before launching anything. Use the host's planning facility when available; otherwise keep a compact checklist in the conversation or project-local decision trail.

1. Frame
2. Fan out
3. Aggregate
4. Report

## Phase A: Frame

1. State the done predicate and the artifact or report the swarm must return.
2. Choose the shape. Partition into slices, race N workers on identical briefs, or mix both. For a race or mixed shape, declare `first pass`, `rank all`, or `best-of` before spawning.
3. Set N from the user or derive it from the shape. N is total workers, not the host's concurrency limit.
4. Pick the worker choice from the `swarm workers` line in `$PSTACK_CONFIG (or .pstack/config.md)`. If the rule or that line is missing, use the canonical `implementer` role. For `auto` or `inherit-parent`, leave the model unset so the workers run on the parent model. If the host task runner rejects a role or model choice, use the default and say so. If it rejects the default, use the closest valid choice of the same kind from its error message. For a model race, name each arm's role or model choice up front.
5. Give each worker its own writable output when it writes. Use a worktree, branch, or `/tmp/swarm-<slug>/worker-<n>/`. When workers verify or measure commits, each brief names the exact SHAs. A measurement brief also names the method (sample count, what one sample is, order). The worker records both in its result.

## Phase B: Fan out

Launch all N workers in one batch through the host's task facility, using the step 4 choice, left unset for `auto` or `inherit-parent`. Use the environment the current host actually provides; do not assume remote execution, uploaded repositories, or access to the user's machine. If workers need a non-default branch or checkout, name it in each standalone brief and verify that the host can access it before launch.

Every brief stands alone. Include the goal, scope, exact slice or race arm, how to verify, and what to report. Reports use `PASS`, `ISSUES`, or `BLOCKED` with evidence. A worker that can prove a defect reports `ISSUES` and lists every issue it can prove, not only the first.

If a worker drops out, proceed with N-1 and note it.

## Phase C: Aggregate

Read the terminal results. Drop a result that does not record the SHAs and method its brief names, and rerun that worker once. After a second miss, record a gap. A gap does not count as a pass. For coverage, every required slice needs a result. For a race, apply the selection rule declared up front. Use first pass, rank all, or best-of. Do not paste raw worker dumps.

Keep a compact result table, one-line evidenced issues, and explicit gaps or dropouts.

## Phase D: Report

Return one consolidated in-chat report with the table, issue one-liners, gaps or dropouts, and the race rule when used.

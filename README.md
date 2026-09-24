# pstack-omp

Rigorous engineering workflows for [OMP](https://omp.sh/).

`pstack-omp` is an OMP port of the original
[Cursor pstack](https://github.com/cursor/plugins/tree/main/pstack). It keeps the
upstream workflow catalog, playbooks, principles, references, and verification
scripts while replacing Cursor-only runtime assumptions with an OMP adapter.

## What is included

- The upstream pstack skills and their supporting references.
- Benny's three fail-closed issue-triage/reproduction skills.
- `poteto-mode` for routing work through the right playbook.
- `pstack-omp` for translating roles, delegation, models, transcripts, questions,
  and long-running work to OMP.
- Native OMP package metadata.
- Daily upstream synchronization that opens a verified pull request.

The original Cursor repository is the content authority. The dsebban repository
was used only as an early structural example; it is not an upstream source.

## Install

Install the public GitHub package:

```bash
omp install https://github.com/weiihann/pstack-omp
```

For local development, load the checkout directly:

```bash
omp --plugin-dir /path/to/pstack-omp
```

Use `omp plugin list` to confirm the package. Remove it with
`omp plugin uninstall pstack-omp`. The package runs with full system access;
review the source before installing and keep it pinned or update it
deliberately.

## Quick start

Start substantial work with `poteto-mode`. Use `pstack-omp` when a workflow
needs delegation or OMP-specific lifecycle behavior.

The runtime adapter maps canonical pstack roles to OMP's bundled task agents
(`scout`, `designer`, `reviewer`, `security-reviewer`, `librarian`, `task`,
`sonic`). Missing integrations are reported honestly and fail closed; for
example, Benny requires an available Slack/tracker/control adapter rather than
pretending those tools exist.

## First-time setup

After installing, start a fresh OMP session in the project you want to work on.
Run the setup skill once:

```text
$setup-pstack
```

It detects the models and task agents your OMP session actually exposes, lets
you choose the defaults for implementation and review work, and writes concrete
`provider/model-id` assignments to `.pstack/config.md` (or to `$PSTACK_CONFIG`
when set). Model routing itself lives in OMP settings (`modelRoles`,
`task.agentModelOverrides`); the configuration file is the portable record.

Then route your first real task through the main workflow:

```text
$poteto-mode add a small feature and prove it works end to end
```

The setup skill may offer to create a project verification skill when the project
has no existing way to exercise the real application. Accept that offer when you
want repeatable behavioral proof; otherwise setup finishes without changing the
project. Read `skills/setup-pstack/SKILL.md` for the complete setup contract.

## Automatic upstream updates

`.github/workflows/upstream-sync.yml` checks the original pstack `main` branch
every day at 04:17 UTC and can also be started manually. The pinned baseline lives
in `upstream.lock.json`.

The updater:

1. Fetches the latest upstream revision.
2. Normalizes known Cursor runtime bindings for OMP.
3. Updates only upstream-owned files.
4. Preserves OMP adapters and protected portability adaptations.
5. Stops before writing if an adapted file changed upstream.
6. Runs verification, updater tests, Bun tests, and strict TypeScript checking.
7. Opens a pull request only after those checks pass.

Run it locally:

```bash
npm run sync:check
npm run sync:apply -- --dry-run
npm run sync:apply
```

Protected adaptation changes require a human merge decision. The updater never
silently overwrites them.

## Development and verification

```bash
npm run verify
npm run test:sync
bun install --cwd skills/poteto-mode/scripts --frozen-lockfile
bun test orch watch-pr
bunx tsc --project skills/poteto-mode/scripts/watch-pr/tsconfig.json --noEmit --strict
```

`npm run verify` checks skill inventory, frontmatter, local references, manifests,
the upstream lock, and forbidden vendor-specific runtime bindings.

## Host contract

Read `skills/pstack-omp/references/runtime.md` before adapting a workflow. It
defines canonical roles, capability mapping, configuration paths, transcript
handling, interaction fallbacks, and verification ownership for OMP.

## License and attribution

MIT. See `LICENSE` and `THIRD_PARTY_NOTICES.md`.

The pstack-derived material is adapted from Lauren Tan's original work in
`cursor/plugins`. See `THIRD_PARTY_NOTICES.md` for attribution and license text.

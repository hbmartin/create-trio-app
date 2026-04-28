# create-trio-app

Standalone generator for production-oriented Next.js modular-monolith projects.

## Quick start

```sh
pnpm create trio-app my-app
```

This scaffolds `./my-app`, then runs `pnpm install`, `pnpm db:generate`, and
`git init` inside it. Skip any of those with the flags below.

## Requirements

- Node.js >= 24
- pnpm 10+

## Commands

### Create a project

```
create-trio-app <target-dir> [options]
```

| Option | Description |
| --- | --- |
| `--name <package-name>` | npm package name (defaults to the target directory name) |
| `--skip-install` | do not run `pnpm install` |
| `--skip-migrations` | do not run `pnpm db:generate` |
| `--skip-git` | do not run `git init` |
| `--force` | overwrite conflicting files |
| `--dry-run` | print the file list without writing |

### Add a module

```
create-trio-app add module <module-name> [--project <path>] [--force] [--dry-run]
```

Scaffolds a new module under `modules/<module-name>/` (domain, application,
infrastructure, transport, plus `index.ts`) and registers it in
`sheriff.config.ts`. `--project` defaults to the current directory.

### Other

- `--help` / `-h` — show usage
- `--version` / `-v` — print package version

## What's in the generated app

- Next.js App Router with strict TypeScript
- Drizzle ORM + Postgres
- Kernel module and composition roots
- Minimal admin and users modules
- UI primitives
- Vitest test setup
- Sheriff architecture guardrails

Product modules (messaging, memberships, payments, AI workflows, etc.) are
intentionally excluded from v1 — add them with `add module` or by hand.

## Local development

```sh
pnpm install
pnpm build
node dist/cli.js ../my-app --skip-install --skip-git --skip-migrations
node dist/cli.js add module billing --project ../my-app
```

Useful scripts:

- `pnpm dev` — run the CLI from sources via `tsx`
- `pnpm check` — lint, typecheck, and test
- `pnpm test` — Vitest only
- `pnpm format` — Biome write mode

## Release

Releases are manual. This project intentionally does not use Release Please or
conventional-commit release automation.

```sh
pnpm version patch --no-git-tag-version
pnpm check
pnpm pack:dry-run
```

Commit the version bump, merge to `main`, then run the `release` workflow from
GitHub Actions. The workflow verifies the package, checks that the version is
not already published, and publishes to npm with provenance using `NPM_TOKEN`.

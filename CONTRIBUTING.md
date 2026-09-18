# Contributing to Amfora

Thanks for wanting to help. Amfora is a small project, so the process is short.

## Before you start

Open an issue first for anything bigger than a bug fix. It saves you building
something that does not fit, and it saves me reviewing it.

## Setting up

```bash
git clone https://github.com/Solutionmax/amfora.git
cd amfora
(cd apps/server && pnpm install)
(cd apps/web && pnpm install)
```

Run the API and the web app in two terminals:

```bash
cd apps/server && pnpm dev      # :3333
cd apps/web    && pnpm dev      # :3000
```

## Before you push

```bash
cd apps/web    && pnpm prettier --write "src/**/*.tsx" && pnpm validate
cd apps/server && pnpm validate && pnpm test
```

The build runs ESLint with the Prettier rule, so unformatted code fails the build
rather than the linter. The pre push hook runs the validation for you.

## Commits and pull requests

- One subject per pull request.
- Write commit messages as `type: what changed`, using `feat`, `fix`, `refactor`,
  `docs`, `test`, `chore`, `perf` or `ci`.
- Say what you changed and why. A screenshot helps for anything visual.
- New behaviour needs a check that fails when the behaviour breaks.

## Reporting a security problem

Do not open a public issue. Mail the address in the repository profile instead,
and give me a reasonable window to fix it before you publish anything.

## Licence

Contributions are accepted under the Apache License 2.0, the same licence as the
project. See [NOTICE](NOTICE) for the attribution to the upstream project this
fork is based on.

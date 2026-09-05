# Repository phase completion workflow

The user authorizes automatic commits and pushes directly to `origin/main` after
each successfully completed development phase. Do not create a checkpoint branch
unless a newer task-specific user instruction requests one. Communicate in Persian.

At phase start, fetch `origin` and record the starting `origin/main` SHA. Preserve
unrelated working-tree changes and identify the intended phase files explicitly.

Automatically commit and push only when ALL conditions hold:

1. The phase is COMPLETE and all acceptance criteria are satisfied.
2. Required tests and typecheck pass; lint has no new errors.
3. Relevant database and migration verification passes.
4. `git diff --check` passes.
5. No unresolved code, security, or data/migration blocker remains.
6. Secret and artifact scans of intended files AND staged content are clean.
7. No ambiguous or unrelated staged files are included.
8. A fresh fetch confirms remote `main` has not unexpectedly changed since phase start.

When these conditions pass, without asking for separate permission:

- Ensure the active branch is `main`; stage only the intended, verified phase files.
- Review the staged diff, run `git diff --cached --check`, and repeat the secret/artifact scan.
- Create one clear commit for the completed phase, without amending existing history.
- Push `main` to `origin/main` without force, then verify local HEAD equals the actual remote HEAD.
- Report the commit SHA, verification results, and push outcome.

If the phase is PARTIALLY COMPLETE or BLOCKED, any required check fails, a blocker
or ambiguous staged file remains, or remote `main` unexpectedly changes: STOP and
report it. Do not automatically merge, rebase, commit, or push to bypass a blocker.
If a push fails, stop and report the failure; never rewrite history to recover.

Never commit `.env` or its variants (except placeholder-only `.env.example`), live
databases or backups, WAL/SHM/journal files, credentials, real connection strings,
JWT/API secrets, PostgreSQL test/marker tokens, logs, uploads, exports, temporary
files, `.prisma/`, `prisma/generated/`, `.next/`, `node_modules/`, coverage/build/out
artifacts, `next-env.d.ts`, or `*.tsbuildinfo`. An intentional staged deletion of a
previously tracked sensitive artifact must remain a deletion, not be restored.
Never migrate or modify `prisma/dev.db` without explicit task-specific permission.

Do not automatically tag ordinary phase completions. Create an annotated release
tag only when explicitly requested by the user or when the roadmap explicitly
designates a release milestone. Never overwrite or force-update a tag. Push only
the intended new tag, after its commit has successfully reached remote `main`,
then verify the peeled remote tag target equals the intended commit.

Newer task-specific user instructions, including audit-only requests, take
precedence over this standing workflow authorization.

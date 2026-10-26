# bpc
BizPartnerCheck

## Setup

The setup script creates the database schema and the one Super Admin account (DI-01).
It runs on Cloudflare D1 through `wrangler`.

Prerequisites: Node.js 22.5 or later, and `npm install`.

```sh
# Local development database (stored in .wrangler/)
SUPER_ADMIN_EMAIL=ops@example.com npm run setup

# Cloudflare D1 (needs `npx wrangler login` and the real database_id in wrangler.toml)
SUPER_ADMIN_EMAIL=ops@example.com npm run setup -- --remote
```

| Variable | Required | Meaning |
| --- | --- | --- |
| `SUPER_ADMIN_EMAIL` | yes | E-mail address of the Super Admin |
| `SUPER_ADMIN_PASSWORD` | no | Initial password, at least 12 characters. If unset, a random one is generated and printed once. |
| `D1_DATABASE` | no | D1 database name, default `bpc` |

What the script does:

1. Applies all migrations in `migrations/` that have not run yet.
2. Creates the Super Admin with a hashed password, marked so the password must be changed at first login (assumption for OI-08).

Running it again is safe: already applied migrations are skipped, and if a Super Admin exists it prints its e-mail and creates nothing.
The database also refuses a second Super Admin through a unique index.

Run the tests with `npm test`.

## Contributing

Every change must be traceable to a backlog item in Jira (project key `SCRUM`).
`main` is protected: nobody pushes to it directly, all changes go through a pull request.

### Branches

Create one branch per Jira issue, named `<ISSUE-KEY>-<short-description>`:

```
SCRUM-11-setup-script
SCRUM-34-org-profile
```

```sh
git switch main
git pull
git switch -c SCRUM-11-setup-script
```

### Commits

Start every commit message with the issue key followed by a colon:

```
SCRUM-11: Create database schema
SCRUM-11: Add Super Admin seed to setup script
```

### Pull requests

1. Push your branch and open a pull request against `main`.
2. Put the issue key at the start of the PR title, e.g. `SCRUM-11: Setup script for schema and Super Admin`.
3. Fill in the `Jira issue: SCRUM-__` line in the PR template.
4. The **Jira key check** workflow must pass. It fails if the PR title or the branch name has no `SCRUM-<number>` key.
5. Get a review from at least one teammate, then merge.

Because the issue key appears in the branch, commits and PR, the GitHub for Jira integration links all of them to the ticket automatically.

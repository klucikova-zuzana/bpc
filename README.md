# bpc
BizPartnerCheck

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

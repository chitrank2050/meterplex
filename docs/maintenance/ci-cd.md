# CI/CD & Automated Maintenance

Meterplex uses a state-of-the-art CI/CD infrastructure designed for **Zero-Trust security** and **automated supply chain health**. This document explains our security layers and automated workflows.

## 🛡️ Security Layers

### 1. Egress Control (Harden Runner)

Every workflow job starts with **Step Security's Harden Runner**. This provides runtime security for the GitHub Actions runner.

* **What it does**: It monitors all outbound network traffic during the build process.
* **Why it's there**: To prevent "phoning home" attacks where a compromised dependency attempts to steal `GITHUB_TOKEN` or other secrets and send them to an external server.
* **Status**: Currently in `audit` mode. Once the list of required endpoints is finalized, it will be switched to `block` mode for maximum security.

### 2. OpenSSF Scorecard

We use the **OpenSSF Scorecard** to track the overall security health of the repository.

* **What it does**: It scans the repo for 19+ security best practices, including branch protection, use of dangerous workflows, and dependency pinning.
* **How to view**: Check the "Security" tab in GitHub or click the Scorecard badge in the [README](../../README.md).
* **Automation**: Runs automatically on every push to `main` and on a weekly schedule.

### 3. Build Provenance & Attestations

We use **GitHub Actions Build Provenance** (`actions/attest-build-provenance`) to cryptographically sign our releases.

* **What it does**: It generates a non-forgeable attestation that links the published release directly to the specific GitHub Actions run and commit that produced it.
* **Why it's there**: It provides downstream users with high-assurance verification that the release artifact was not tampered with and actually originated from this repository.

### 4. Access Control (Environments)

We use the **`production`** GitHub Environment to isolate release-specific permissions and provide deployment tracking.

* **What it does**: It creates a dedicated logical space for the release workflow.
* **Approval Gate**: This environment is configured to require **manual approval** before a release can be published, providing a human-in-the-loop safety check for production changes.
* **Deployment URL**: Each release automatically links back to the published tag on GitHub for easy traceability.

### 5. Secret Scanning (Gitleaks)

* **Local**: Integrated into `lefthook` to prevent secrets from ever being committed.
* **CI**: A dedicated job in `ci.yml` scans the entire history on every PR.

### 6. Dependency Auditing (OSV-Scanner)

* Scans our `pnpm-lock.yaml` against Google's Open Source Vulnerabilities (OSV) database.
* Blocks the PR if a known vulnerability is found in our dependencies.

---

## 🤖 Automated Maintenance

To keep the codebase healthy without manual toil, we have several automated maintenance cycles:

### Automated Releases

Triggered by pushing a version tag (e.g., `v0.5.4`).

1. **Changelog**: `git-cliff` generates a beautiful, categorized changelog.
2. **Pull Request**: An automated PR is opened to commit the new `CHANGELOG.md` to `main`.
3. **GitHub Release**: A formal release is created with automated notes and assets.
4. **Docs Deployment**: The MkDocs documentation is automatically built and deployed to GitHub Pages.

### Dependency Management (Renovate)

We use **Renovate** to keep our dependencies up to date. Unlike standard tools, Renovate is configured to group updates and provide clear release notes.

### Smart Auto-Approval

To maintain velocity while following strict branch protection rules:

* **Patch/Minor**: Automated PRs for minor/patch updates are automatically approved by a dedicated workflow (`auto-approve.yml`) once CI passes.
* **Major**: Breaking changes and major version updates always require human review and manual approval.

### Override Pruning

A custom workflow (`maintenance.yml`) that runs weekly to check if any entries in `pnpm.overrides` are no longer needed. If a dependency has been updated such that the override is redundant, it opens a PR to prune it.

---

## 📋 Workflow Catalog

| Workflow | File | Purpose | Trigger |
| :--- | :--- | :--- | :--- |
| **CI & Security** | `ci.yml` | Validates code quality, runs tests, checks formatting, and audits security. | Every PR / Push to main |
| **Action Linting** | `workflow-lint.yml` | Audits our GitHub Actions for security flaws and unpinned versions using `zizmor`. | Changes to workflows |
| **Semantic PR** | `semantic-pr.yml` | Enforces [Conventional Commits](https://www.conventionalcommits.org/) on PR titles to ensure clean history. | PR open / edit / sync |
| **Auto-Approve** | `auto-approve.yml` | Automatically approves safe dependency updates from Renovate. | PR from Renovate |
| **Scorecard** | `scorecard.yml` | Tracks repo-level security health and supply chain best practices (OpenSSF). | Weekly / Push to main |
| **Branch Name** | `branch-name.yml` | Enforces a naming convention via `validate-branch-name` (config in `package.json`). | Every Push |
| **Release** | `git-release.yml` | Automates changelogs, updates version tags, and creates formal GitHub releases. | Tag Push (`v*`) |
| **Docs Deploy** | `docs.yml` | Builds the MkDocs Material site and publishes it to GitHub Pages. | Push to main |
| **Maintenance** | `maintenance.yml` | Weekly automated cleanup of redundant dependency overrides. | Weekly schedule |

---

## 🏗️ Workflow Standards

All workflows in this repository follow these strict standards:

1. **SHA Pinning**: All actions are pinned to a 40-character commit SHA (e.g., `actions/checkout@de0fac2...`). This prevents "tag moving" attacks where a version tag could be maliciously updated.
2. **Least Privilege**: `persist-credentials: false` is used wherever possible to prevent the GitHub token from being stored on the runner's disk longer than necessary.
3. **No Injection**: `${{ ... }}` expansion is NEVER used inside `run:` scripts. Data is always passed via environment variables (e.g., `env: DATA: ${{ ... }}`) to prevent shell injection vulnerabilities.
4. **Egress Security**: Every job includes `harden-runner` to monitor and restrict outbound network connections.

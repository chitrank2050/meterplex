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
* **CI**: A dedicated job in `ci.yml` perform **incremental scans** of only the new commits in a PR, ensuring near-instant feedback as the repository grows.

### 6. Dependency Auditing (OSV-Scanner)

* Scans our `pnpm-lock.yaml` against Google's Open Source Vulnerabilities (OSV) database.
* Blocks the PR if a known vulnerability is found in our dependencies.

### 7. Zombie Code Detection (Knip)

* **What it does**: Scans the entire project for unused files, exports, and dependencies.
* **Why it's there**: To keep the codebase lean and prevent "code rot." It ensures that every line of code in the repo actually serves a purpose.
* **CI**: Integrated into the main hygiene job. If a PR introduces unused code, the build fails.

---

## 🏎️ Extreme Performance Architecture

Our CI pipeline is optimized for speed and cost-efficiency (Free-tier friendly):

1. **Parallel Hygiene**: Code linting, formatting checks, and markdown audits run in parallel jobs. This provides developer feedback 3x faster than sequential runs.
2. **Smart Caching**:
    * **pnpm Store**: Global cache for dependency resolution.
    * **Prisma Client**: The generated Prisma client is cached and only rebuilt when `schema.prisma` changes, saving ~20s per build.
    * **Pip**: Python dependencies for documentation are cached.
3. **Trigger Lockdown**: To save Actions minutes, workflows **only** run on the `main` branch or within a Pull Request targeting `main`. Intermediate pushes to feature branches do not trigger CI, encouraging local testing via `lefthook`.

---

## 🤖 Automated Maintenance & Governance

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
* **Safety Gates**: The approval bot verifies the PR author is Renovate, the branch starts with `renovate/`, and all status checks are green before signing off.

### Community Governance 🏛️

* **`SECURITY.md`**: Formal vulnerability disclosure policy for OpenSSF compliance.
* **`CONTRIBUTING.md`**: Streamlined onboarding guide for new developers.
* **Stale Bot**: Automatically manages inactive issues and PRs to keep the backlog fresh.
* **PR Labeler**: Categorizes PRs automatically (e.g., `area/logic`, `area/docs`) based on changed files.

---

## 📋 Workflow Catalog

| Workflow | File | Purpose | Trigger |
| :--- | :--- | :--- | :--- |
| **CI & Security** | `ci.yml` | Validates code quality, runs tests, and audits security. Parallelized for speed. | PR to main / Push to main |
| **Action Linting** | `workflow-lint.yml` | Audits GitHub Actions for security flaws using `zizmor`. | Changes to workflows |
| **PR Autofill** | `pr-autofill.yml` | Populates PR descriptions based on commit history. | PR to main |
| **Semantic PR** | `semantic-pr.yml` | Enforces Conventional Commits on PR titles. | PR to main |
| **Auto-Approve** | `auto-approve.yml` | Approves safe dependency updates. Optimized to only wake up for CI completion. | CI finish on `renovate/*` |
| **Scorecard** | `scorecard.yml` | Tracks repo-level security health (OpenSSF). | Weekly / Push to main |
| **Branch Name** | `branch-name.yml` | Enforces naming conventions. | PR to main |
| **Release** | `git-release.yml` | Automates changelogs and GitHub releases. | Tag Push (`v*`) |
| **Docs Deploy** | `docs.yml` | Builds and publishes documentation. | Push to main (Build-only on PR) |
| **Labeler** | `labeler.yml` | Automatically labels PRs based on file paths. | PR to main |
| **Stale** | `stale.yml` | Manages inactive issues and PRs. | Daily schedule |
| **Maintenance** | `maintenance.yml` | Weekly automated cleanup of dependency overrides. | Weekly schedule |

---

## 🏗️ Workflow Standards

All workflows in this repository follow these strict standards:

1. **SHA Pinning**: All actions are pinned to a 40-character commit SHA to prevent "tag moving" attacks.
2. **Least Privilege**: `permissions` blocks are explicitly defined for every job.
3. **No Injection**: `${{ ... }}` expansion is NEVER used inside `run:` scripts. Data is always passed via environment variables.
4. **Egress Security**: Every job includes `harden-runner` to monitor and restrict network traffic.

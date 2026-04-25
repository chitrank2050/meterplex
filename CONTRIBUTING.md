# Contributing to Meterplex 🌊🏗️

First off, thank you for considering contributing to Meterplex! It's people like you that make it a great tool for everyone.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct (standard Contributor Covenant).

## Getting Started

### Prerequisites

- **Node.js**: v24 or higher
- **pnpm**: v9 or higher
- **Docker**: For running local databases/Kafka

### Local Setup

1. **Clone the repo**:

   ```bash
   git clone https://github.com/chitrank2050/meterplex.git
   cd meterplex
   ```

2. **Run the Setup Script**:

   Our setup script handles dependency installation, infrastructure startup (Docker), and database seeding automatically.

   ```bash
   pnpm setup
   ```

## Development Workflow

### 🌿 Branch Naming

We enforce strict branch naming via CI. Please use the following format:
`type/description` (e.g., `feat/add-api-key-auth`)

Allowed types: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`.

### 🧪 Testing & Linting

Before pushing, please ensure your changes pass our quality checks:

```bash
pnpm run lint
pnpm run test
```

### 💬 Commit Messages

We follow **Conventional Commits**. Please format your commit messages as:
`type(scope): description`

## Pull Request Process

1. **Link an Issue**: Every PR should ideally address an existing issue.
2. **Keep it Focused**: Small, surgical PRs are much easier to review and merge.
3. **Automated Feedback**: Our CI bots will automatically provide feedback on your branch name, PR title, and security.
4. **Approval**: Once the CI passes, a maintainer will review your code.

## Need Help?

If you have questions, feel free to open a **GitHub Discussion** or ping us in our community channels!

Happy coding! 🚀✨

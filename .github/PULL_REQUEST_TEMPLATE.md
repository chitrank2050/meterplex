## What does this PR do?

<!-- A clear description of the change. Link the issue if applicable. -->
<!-- autofill-start -->
<!-- autofill-end -->

## Type of change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Refactor (no functional changes)
- [ ] Documentation
- [ ] CI/CD or build configuration

## How was this tested?

<!-- Describe how you verified this works. Include commands, curl examples, or test names. -->
```bash
# Example
curl http://localhost:3000/api/v1/tenants | jq
pnpm test
```

## Checklist

- [ ] My code follows the project conventions (strict TypeScript, Prettier, ESLint)
- [ ] I have added/updated tests for this change
- [ ] I have updated documentation if needed
- [ ] `pnpm lint` passes
- [ ] `pnpm build` passes
- [ ] New environment variables are added to `.env.example`
- [ ] Database changes include a Prisma migration (`pnpm db:migrate:dev`)

## Screenshots (if applicable)

<!-- Scalar API docs, Swagger output, or terminal output showing the change works. -->
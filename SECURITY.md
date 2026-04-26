# Security Policy

## Supported Versions

We actively maintain and provide security updates for the following versions of Meterplex:

| Version | Supported          |
| ------- | ------------------ |
| v0.5.x  | :white_check_mark: |
| < v0.5  | :x:                |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

If you discover a security vulnerability within Meterplex, please report it privately. We take security seriously and will respond to your report within 48 hours.

### How to Report

Please send an email to **<chitrank2050@gmail.com>** (or open a [GitHub Private Vulnerability Report](https://github.com/chitrank2050/meterplex/security/advisories/new)) with the following information:

1. **Description**: A detailed description of the vulnerability.
2. **Steps to Reproduce**: A clear, step-by-step guide to reproducing the issue.
3. **Impact**: What could an attacker achieve with this vulnerability?
4. **Suggested Fix**: If you have a fix in mind, please share it!

### Our Process

1. **Acknowledgment**: We will acknowledge receipt of your report within 48 hours.
2. **Investigation**: We will investigate the issue and determine its severity.
3. **Disclosure**: Once a fix is ready, we will coordinate a public disclosure date with you.
4. **Credit**: We are happy to credit you for your discovery in our security advisories and changelogs.

## Security Practices

Meterplex is built with a **Security-First** mindset:

- **Egress Lockdown**: CI/CD runners are restricted to known endpoints.
- **Dependency Auditing**: Automated OSV scanning on every PR.
- **Secret Scanning**: Gitleaks integrated into local hooks and CI.
- **Minimal Surface**: We use the principle of least privilege for all cloud and CI tokens.

Thank you for helping keep Meterplex secure! 🛡️✨

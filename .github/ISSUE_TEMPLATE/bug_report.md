---
name: Bug report
about: Report something that isn't working correctly
title: "[BUG] "
labels: bug
assignees: ""
---

## Describe the bug

A clear description of what the bug is.

## To reproduce

Steps to reproduce the behavior:

1. Send a request to `...`
2. With this payload `...`
3. See error

## Expected behavior

What you expected to happen.

## Actual behavior

What actually happened. Include the full error response if applicable:
```json
{
  "statusCode": 500,
  "message": "...",
  "correlationId": "paste-the-correlation-id-here"
}
```

## Correlation ID

If you have the `x-correlation-id` from the response header or error body, paste it here. This lets us find the exact request in the logs.

## Environment

- Node.js version: [e.g. 22.0.0]
- pnpm version: [e.g. 9.15.0]
- OS: [e.g. macOS 15, Ubuntu 24.04]
- Docker version: [e.g. 27.0.0]

## Additional context

Logs, screenshots, or anything else that helps.
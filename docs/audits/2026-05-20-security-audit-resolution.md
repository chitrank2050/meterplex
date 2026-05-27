# Security Audit - Resolution Tracker

**Audit date:** 2026-05-20
**Resolution completed:** 2026-05-23
**Auditor:** Internal review
**Phase:** 5.5

---

## Summary

| Severity  | Total  | Resolved | Remaining |
| --------- | ------ | -------- | --------- |
| Critical  | 4      | 4        | 0         |
| High      | 1      | 1        | 0         |
| Medium    | 4      | 4        | 0         |
| Low       | 2      | 2        | 0         |
| **Total** | **11** | **11**   | **0**     |

---

## Resolution details

| #   | Finding                                                          | Severity | Issue | Status   |
| --- | ---------------------------------------------------------------- | -------- | ----- | -------- |
| 1   | Tenant :id param vs x-tenant-id mismatch - cross-tenant mutation | Critical | #140  | ✅ Fixed |
| 2   | User update endpoint allows any user to modify any profile       | Critical | #141  | ✅ Fixed |
| 3   | No PlatformAdminGuard - any user can mutate billing catalog      | Critical | #142  | ✅ Fixed |
| 4   | No rate limiting - auth brute force and DoS trivial              | Critical | #143  | ✅ Fixed |
| 5   | Refresh token findUniqueOrThrow fails open on purged tokens      | High     | #144  | ✅ Fixed |
| 6   | Cancel endpoint doesn't update status to CANCELLED               | Medium   | #145  | ✅ Fixed |
| 7   | Consume endpoint doesn't persist usage events                    | Medium   | #146  | ✅ Fixed |
| 8   | Audit log shallow sanitization + no size limit                   | Medium   | #147  | ✅ Fixed |
| 9   | Billing ledger endpoints missing RolesGuard                      | Medium   | #148  | ✅ Fixed |
| 10  | Invoices controller direct Prisma queries                        | Low      | #149  | ✅ Fixed |
| 11  | process.env.PORT, missing pagination, duplicate comment          | Low      | #150  | ✅ Fixed |

---

## Verification checklist

- [x] Cross-tenant mutation: PATCH tenant with mismatched header/param returns 403
- [x] User update: DEVELOPER cannot update other users, self-update works, isActive requires OWNER
- [x] Platform admin: non-admin gets 403 on plan/feature/entitlement/price mutations
- [x] Rate limiting: 11th login attempt returns 429 with Retry-After header
- [x] Refresh token: purged token returns 401, not 500
- [x] Subscription cancel: status changes to CANCELLED, not just cancelledAt
- [x] Consume persistence: usage_event row created with source=consume-endpoint
- [x] Audit sanitization: nested passwords redacted, Date fields serialize as ISO strings
- [x] Billing roles: DEVELOPER gets 403 on ledger/balance/payments endpoints
- [x] Invoice service: controller has no PrismaService import, generate throws NotFoundException
- [x] Misc: app uses ConfigService for PORT, subscriptions/api-keys have pagination

---

## Security posture after Phase 5.5

### What's protected

- **Tenant isolation:** URL param validated against header on tenant mutations
- **User authorization:** self-update vs admin-update with role checks
- **Catalog integrity:** only platform admins can mutate plans/features/entitlements/prices
- **Brute force prevention:** IP-based rate limiting on auth endpoints
- **Financial data access:** OWNER/ADMIN/BILLING roles required for billing endpoints
- **Audit integrity:** recursive sanitization, size limits, no sensitive data in logs
- **Billing correctness:** cancelled subscriptions stop generating invoices, consumed usage is durable

### Known limitations (future phases)

- Rate limiting is fixed-window, not sliding window (2x burst at boundaries)
- Auth rate limit fails open on Redis errors (should fail closed)
- No IP blocklist or ban after repeated failures
- No CSRF protection (API-only, no browser forms)
- No request body size limit at application level (rely on nginx/reverse proxy)
- Webhook signature validation depends on provider adapter correctness

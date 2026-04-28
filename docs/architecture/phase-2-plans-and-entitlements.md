# Phase 2 - Plans, Features, Entitlements, and Subscriptions

**Goal:** Decide what a customer is allowed to do. Define plans, map features to plans with access rules, and check entitlements at runtime.

**Status:** In progress

---

## Data model overview

![Phase 2 ERD](phase-2-erd.png)

Phase 2 adds 6 new tables to the existing Phase 1 schema:

| Table                   | Purpose                                            | Relates to                                         |
| :---------------------- | :------------------------------------------------- | :------------------------------------------------- |
| `plans`                 | What you sell: "Starter", "Pro", "Enterprise"      | plan_prices, entitlements, subscriptions           |
| `plan_prices`           | How much it costs: $99/mo, $948/yr                 | plans, subscriptions                               |
| `features`              | Global catalog of capabilities: "API Calls", "SSO" | entitlements                                       |
| `entitlements`          | Bridge: Plan + Feature = access rule               | plans, features                                    |
| `subscriptions`         | Tenant → Plan binding with billing period          | tenants, plans, plan_prices, entitlement_snapshots |
| `entitlement_snapshots` | Frozen copy of entitlements at subscribe time      | subscriptions                                      |

### Relationship map

```text
Tenant ──1:N──▶ Subscription ──N:1──▶ Plan ──1:N──▶ PlanPrice
                     │                   │
                     │                   └──1:N──▶ Entitlement ──N:1──▶ Feature
                     │
                     └──1:N──▶ EntitlementSnapshot
```

---

## Table details

### plans

The product identity. Does NOT contain pricing - that's in `plan_prices`.

| Column        | Type                   | Description                                                         |
| :------------ | :--------------------- | :------------------------------------------------------------------ |
| id            | UUID PK                | Auto-generated                                                      |
| name          | VARCHAR(255)           | "Starter", "Pro", "Enterprise"                                      |
| slug          | VARCHAR(100) UNIQUE    | URL-safe identifier: "pro" → `/api/v1/plans/pro`                    |
| description   | TEXT                   | Optional marketing copy for pricing pages                           |
| status        | ENUM(ACTIVE, ARCHIVED) | ARCHIVED = no new subscriptions, existing ones continue             |
| is_public     | BOOLEAN                | Show on pricing page? False = hidden/enterprise plans               |
| display_order | INT                    | Sorting on pricing pages. Starter=1, Pro=2, Enterprise=3            |
| metadata      | JSONB                  | Custom attributes: `{ "trialDays": 14, "supportTier": "priority" }` |

**Why separate from pricing?** This mirrors Stripe's Product/Price split. Changing from $99/mo to $119/mo means archiving the old price and creating a new one - the plan identity stays unchanged. Without separation, you'd need a new plan for every price change, breaking references from existing subscriptions.

### plan_prices

Multiple prices per plan. Same plan, different intervals and currencies.

| Column    | Type                    | Description                                          |
| :-------- | :---------------------- | :--------------------------------------------------- |
| id        | UUID PK                 | Auto-generated                                       |
| plan_id   | UUID FK → plans         | Which plan this price belongs to                     |
| interval  | ENUM(MONTHLY, ANNUALLY) | Billing frequency                                    |
| amount    | INT                     | Price in smallest currency unit. $99.00 = 9900 cents |
| currency  | VARCHAR(3)              | ISO 4217 lowercase: "usd", "eur", "gbp"              |
| is_active | BOOLEAN                 | Can this price be used for new subscriptions?        |

**Why store amount in cents (integer)?** Floating-point math produces rounding errors in billing calculations. `0.1 + 0.2 = 0.30000000000000004` in JavaScript/most languages. Integers don't have this problem. $99.99 = 9999 cents. All arithmetic stays in integers, convert to dollars only at display time.

**Unique constraint:** `(plan_id, interval, currency)` - one active price per plan per interval per currency.

### features

The global catalog of things your platform can do. Features exist independently of plans.

| Column      | Type                          | Description                                                |
| :---------- | :---------------------------- | :--------------------------------------------------------- |
| id          | UUID PK                       | Auto-generated                                             |
| name        | VARCHAR(255)                  | "API Calls", "SSO", "Storage", "Webhooks"                  |
| lookup_key  | VARCHAR(100) UNIQUE           | Stable code identifier: "api_calls", "sso", "storage"      |
| type        | ENUM(BOOLEAN, QUOTA, METERED) | How this feature is gated                                  |
| unit        | VARCHAR(50)                   | Measurement unit: "calls", "GB", "seats". Null for BOOLEAN |
| description | TEXT                          | Documentation/pricing page description                     |
| status      | ENUM(ACTIVE, ARCHIVED)        | ARCHIVED features can't be added to new entitlements       |
| metadata    | JSONB                         | Custom attributes                                          |

**Why `lookup_key` instead of just `slug`?** This is the Stripe pattern. Your code checks entitlements using the lookup_key, not the UUID:

```bash
GET /api/v1/entitlements/api_calls/check
```

The lookup_key is immutable after creation - changing it would break all code that references it.

**Feature types explained:**

| Type    | What it controls         | Example                                    |
| :------ | :----------------------- | :----------------------------------------- |
| BOOLEAN | On/off access            | SSO, webhooks, priority support            |
| QUOTA   | Numeric limit per period | 50,000 API calls/month, 5 team seats       |
| METERED | Usage-based billing      | Storage at $0.02/GB, tokens at $0.001/call |

### entitlements

The bridge between Plan and Feature. "The Pro plan grants 50,000 API calls/month."

| Column          | Type                           | Description                                                |
| :-------------- | :----------------------------- | :--------------------------------------------------------- |
| id              | UUID PK                        | Auto-generated                                             |
| plan_id         | UUID FK → plans                | Which plan grants this                                     |
| feature_id      | UUID FK → features             | Which feature is granted                                   |
| value           | BOOLEAN                        | For BOOLEAN features: true=granted, false=denied           |
| limit           | INT                            | For QUOTA features: numeric limit per reset period         |
| limit_behavior  | ENUM(HARD, SOFT)               | HARD=block at limit, SOFT=allow overage + charge           |
| overage_price   | INT                            | Per-unit charge beyond limit/included amount (micro-cents) |
| included_amount | INT                            | For METERED: free units before overage kicks in            |
| reset_period    | ENUM(MONTHLY, ANNUALLY, NEVER) | When quota counters reset                                  |

**Unique constraint:** `(plan_id, feature_id)` - one entitlement per feature per plan.

**Why `limit_behavior` is on the entitlement, not the feature:** The same feature ("API Calls") can be hard-capped on Starter (block at 1,000) and soft-capped on Pro (allow overage beyond 50,000, charge $0.001/call). The behavior depends on the plan, not the feature.

**Overage price in micro-cents:** Sub-cent pricing is common in API billing. $0.001/API call can't be stored as cents (0.1 cents is not an integer). Micro-cents solve this:

| Real price  | Micro-cents | Calculation             |
| :---------- | :---------- | :---------------------- |
| $0.001/call | 10          | $0.001 × 10,000 = 10    |
| $0.02/GB    | 200         | $0.02 × 10,000 = 200    |
| $0.50/seat  | 5000        | $0.50 × 10,000 = 5000   |
| $1.00/unit  | 10000       | $1.00 × 10,000 = 10,000 |

Formula: `micro_cents = real_price_in_dollars × 10,000`

All billing math stays in integers. Convert to dollars at display time only.

**Entitlement examples by feature type:**

BOOLEAN - "Pro includes SSO":

```text
plan_id: pro, feature_id: sso, value: true
(all other fields null)
```

QUOTA (hard limit) - "Starter gets 1,000 API calls/month, blocked at limit":

```text
plan_id: starter, feature_id: api_calls
limit: 1000, limit_behavior: HARD, reset_period: MONTHLY
(overage_price: null, included_amount: null)
```

QUOTA (soft limit) - "Pro gets 50,000 API calls/month, $0.001/call overage":

```text
plan_id: pro, feature_id: api_calls
limit: 50000, limit_behavior: SOFT, overage_price: 10, reset_period: MONTHLY
```

METERED - "Pro gets 10GB storage free, $0.02/GB after":

```text
plan_id: pro, feature_id: storage
included_amount: 10, overage_price: 200, reset_period: MONTHLY
(limit: null, limit_behavior: null)
```

### subscriptions

Binds a tenant to a plan + price. One active subscription per tenant at a time.

| Column               | Type                                                | Description                                      |
| :------------------- | :-------------------------------------------------- | :----------------------------------------------- |
| id                   | UUID PK                                             | Auto-generated                                   |
| tenant_id            | UUID FK → tenants                                   | Which tenant holds this subscription             |
| plan_id              | UUID FK → plans                                     | Which plan they're on                            |
| price_id             | UUID FK → plan_prices                               | Which price they're paying                       |
| status               | ENUM(ACTIVE, TRIALING, PAST_DUE, CANCELLED, PAUSED) | Current lifecycle state                          |
| current_period_start | TIMESTAMP                                           | Start of current billing period                  |
| current_period_end   | TIMESTAMP                                           | End of current billing period (next charge date) |
| billing_anchor       | INT (1-28)                                          | Day-of-month for recurring charges               |
| trial_ends_at        | TIMESTAMP                                           | When trial expires. Null if no trial             |
| cancelled_at         | TIMESTAMP                                           | When cancellation was requested. Null if active  |

**Why billing_anchor is capped at 28:** February has 28 days. If you anchor on the 31st, what happens in February? Every billing system has this edge case. Capping at 28 eliminates it. Stripe does the same thing.

**Subscription lifecycle:**

```text
TRIALING → ACTIVE → PAST_DUE → CANCELLED
                  → PAUSED → ACTIVE
                  → CANCELLED
```

**Why one active subscription per tenant?** Upgrades/downgrades cancel the old subscription and create a new one. This keeps the audit trail clean - each subscription is a point-in-time contract. The old subscription stays in the database with status=CANCELLED for historical reference.

### entitlement_snapshots

Frozen copy of entitlements at the moment a tenant subscribes.

| Column             | Type                           | Description                             |
| :----------------- | :----------------------------- | :-------------------------------------- |
| id                 | UUID PK                        | Auto-generated                          |
| subscription_id    | UUID FK → subscriptions        | Which subscription this belongs to      |
| feature_lookup_key | VARCHAR(100)                   | Denormalized from features.lookup_key   |
| feature_type       | ENUM(BOOLEAN, QUOTA, METERED)  | Denormalized from features.type         |
| value              | BOOLEAN                        | Snapshot of entitlement value           |
| limit              | INT                            | Snapshot of entitlement limit           |
| limit_behavior     | ENUM(HARD, SOFT)               | Snapshot of limit behavior              |
| overage_price      | INT                            | Snapshot of overage price (micro-cents) |
| included_amount    | INT                            | Snapshot of included amount             |
| reset_period       | ENUM(MONTHLY, ANNUALLY, NEVER) | Snapshot of reset period                |

**Why snapshot?** When Acme Corp subscribes to Pro with 50,000 API calls/month, we freeze that number. If we later change Pro to 25,000 API calls/month, Acme Corp keeps 50,000 until their subscription renews. The snapshot is their contract.

**Why denormalize `feature_lookup_key` and `feature_type`?** The entitlement check service runs on every API request. It needs to look up "does this tenant have `api_calls` access?" as fast as possible. Denormalizing avoids a JOIN to the features table on every check. The query becomes:

```sql
SELECT * FROM entitlement_snapshots
WHERE subscription_id = $1 AND feature_lookup_key = $2
```

**Unique constraint:** `(subscription_id, feature_lookup_key)` - one snapshot per feature per subscription.

**Immutable:** No `updated_at` column. Snapshots are created once when the subscription starts and never modified. When a subscription renews or changes plan, new snapshots are created for the new subscription.

---

## Entitlement check flow

This is the hot path - it runs on every API request that needs authorization.

```text
1. Client calls: GET /api/v1/entitlements/api_calls/check
                 Header: x-tenant-id: <acme-corp-id>

2. Service finds tenant's active subscription
   → SELECT * FROM subscriptions
     WHERE tenant_id = $1 AND status = 'ACTIVE'

3. Service finds the entitlement snapshot for this feature
   → SELECT * FROM entitlement_snapshots
     WHERE subscription_id = $1 AND feature_lookup_key = 'api_calls'

4. Service evaluates based on feature_type:
   BOOLEAN → return { allowed: snapshot.value }
   QUOTA   → check usage counter against snapshot.limit
   METERED → always allowed, but track for billing

5. Response:
   {
     "allowed": true,
     "feature": "api_calls",
     "limit": 50000,
     "used": 23456,
     "remaining": 26544,
     "resetAt": "2026-05-01T00:00:00Z"
   }
```

## Quota consumption flow

```text
1. Client calls: POST /api/v1/entitlements/api_calls/consume
                 Body: { "amount": 1 }

2. Service finds active subscription + snapshot (same as above)

3. Service checks current usage against limit:
   HARD limit: if (used + amount > limit) → 403 "Quota exceeded"
   SOFT limit: if (used + amount > limit) → allow, flag as overage

4. Service increments usage counter

5. Response:
   {
     "allowed": true,
     "feature": "api_calls",
     "consumed": 1,
     "used": 23457,
     "remaining": 26543,
     "overage": false
   }
```

---

## Seed data plan

Three plans with features and entitlements:

### Plans

| Plan       | Slug       | Price (monthly) | Price (annual)      |
| :--------- | :--------- | :-------------- | :------------------ |
| Starter    | starter    | $29/mo          | $278/yr ($23.17/mo) |
| Pro        | pro        | $99/mo          | $948/yr ($79/mo)    |
| Enterprise | enterprise | $499/mo         | $4,788/yr ($399/mo) |

### Features

| Feature          | Lookup Key       | Type    | Unit  |
| :--------------- | :--------------- | :------ | :---- |
| API Access       | api_access       | BOOLEAN | -     |
| API Calls        | api_calls        | QUOTA   | calls |
| Storage          | storage          | METERED | GB    |
| SSO              | sso              | BOOLEAN | -     |
| Webhooks         | webhooks         | BOOLEAN | -     |
| Priority Support | priority_support | BOOLEAN | -     |
| Team Seats       | team_seats       | QUOTA   | seats |
| Analytics Export | analytics_export | BOOLEAN | -     |

### Entitlements (Plan × Feature matrix)

| Feature          | Starter                 | Pro                          | Enterprise                     |
| :--------------- | :---------------------- | :--------------------------- | :----------------------------- |
| API Access       | ✅ true                 | ✅ true                      | ✅ true                        |
| API Calls        | 1,000/mo HARD           | 50,000/mo SOFT ($0.001/call) | 500,000/mo SOFT ($0.0005/call) |
| Storage          | 1 GB included, $0.05/GB | 10 GB included, $0.02/GB     | 100 GB included, $0.01/GB      |
| SSO              | ❌ false                | ❌ false                     | ✅ true                        |
| Webhooks         | ❌ false                | ✅ true                      | ✅ true                        |
| Priority Support | ❌ false                | ❌ false                     | ✅ true                        |
| Team Seats       | 3 seats HARD            | 10 seats SOFT ($10/seat)     | 50 seats SOFT ($8/seat)        |
| Analytics Export | ❌ false                | ✅ true                      | ✅ true                        |

### Subscriptions (dev tenants)

| Tenant            | Plan       | Interval |
| :---------------- | :--------- | :------- |
| Acme Corp         | Pro        | Monthly  |
| Globex Industries | Starter    | Monthly  |
| Stark Enterprises | Enterprise | Annually |

---

## Key design decisions

| Decision                           | Why                                                                       |
| :--------------------------------- | :------------------------------------------------------------------------ |
| Plan/Price separation              | Stripe pattern. Change pricing without creating new plans                 |
| Features as global catalog         | Decouple capabilities from plans. Same feature, different limits per plan |
| Entitlement as the bridge          | Single place to define "Plan X gets Feature Y with these rules"           |
| Entitlement snapshots              | Existing subscribers keep their contracted limits when plan changes       |
| Micro-cents for overage pricing    | Avoids floating-point math for sub-cent pricing ($0.001/call)             |
| limit_behavior on entitlement      | Same feature can be HARD on Starter and SOFT on Pro                       |
| lookup_key on features             | Stable code-facing identifier. Code checks "api_calls", not a UUID        |
| Denormalized snapshots             | Avoids JOIN on the hot path (entitlement check per request)               |
| One active subscription per tenant | Clean audit trail. Upgrades create new subscription, cancel old           |
| billing_anchor capped at 28        | Avoids February edge case (28/29/30/31 days)                              |

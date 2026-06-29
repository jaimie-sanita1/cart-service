# cart-service Live Demo — Rehearsal Guide

Rehearsal checklist and scripted prompts for the 45–60 minute customer demo.

## Pre-demo (30 min before)

```bash
cd cart-service
lsof -ti :3001 | xargs kill -9 2>/dev/null || true
npm install && npm start
curl -s http://localhost:3001/healthz   # expect {"status":"ok"}
```

In Cursor:

```
/postman:setup
```

Verify Postman MCP is connected (`POSTMAN_API_KEY` must be set). Run Tier 1 once:

```
/postman:test
```

Use collection `[Baseline] cart-service` with QA environment (`baseUrl: http://localhost:3001`).

## Git branches

| Branch | Purpose | Switch command |
|--------|---------|----------------|
| `main` | Stable demo baseline (Tier 2 scaffold, no test scripts) | `git checkout main` |
| `demo/break-checkout` | Act 2 — controlled checkout failure (201 vs 200) | `git checkout demo/break-checkout` |
| `demo/api-change` | Act 4 — GET /products change detection | `git checkout demo/api-change` |

## Tier 2 fallback stash

If the agent is slow during Act 1, restore pre-generated Tier 2 tests:

```bash
git stash list   # look for "demo-tier2-fallback"
git stash pop
```

To re-create the stash after editing Tier 2 files:

```bash
git stash push -m "demo-tier2-fallback" -- \
  "postman/collections/[Baseline] cart-service/Tier 2 - Negative & Edge Cases/"
```

---

## Act 0 — Context (5 min)

Show: `cart.yaml`, `postman/collections/`, `.github/workflows/`, `.postman/workflows.yaml`

---

## Act 1 — AI-generated tests from OpenAPI (12 min)

**Prompt (use verbatim):**

> Read cart.yaml and the [Baseline] cart-service collection. Generate Tier 2 negative and edge-case tests: 404s, empty cart checkout (409), invalid quantity (400), and item removal cleanup. Add pm.test assertions for status codes and Error schema shape. Chain variables like cartId and itemId across requests.

**Then:**

```
/postman:test
```

**Fallback:** `git stash pop` (see Tier 2 fallback stash above)

---

## Act 2 — Agentic build → run → diagnose (15 min)

```bash
git checkout demo/break-checkout
# restart server if needed
```

**Prompt:**

> Run the Baseline cart-service tests against localhost:3001. If anything fails, read the handler code and tell me whether the API or the test is wrong. Fix the right one and re-run.

**After demo:**

```bash
git checkout main
```

---

## Act 3 — Standardization + CI/CD + governance (10 min)

```bash
postman login --with-api-key $POSTMAN_API_KEY
postman spec lint a08b042b-59ea-4dfc-a267-42133bdf6106 \
  --workspace-id 577d629c-9b7d-478f-acb1-97c5413bb366 --report-events
```

Show workflows:

- `.github/workflows/postman-tests.yaml` — collection run on PR
- `.github/workflows/postman-governance.yaml` — spec lint
- `.github/workflows/postman-publish.yml` — workspace push on merge

---

## Act 4 — Autonomous change detection (15 min)

```bash
git checkout demo/api-change
# restart server — GET /products now available
curl -s http://localhost:3001/products
```

**Prompt:**

> Compare the cart.yaml diff on this branch to the [Baseline] and [Blueprint] collections. List impacted tests, missing coverage for the new endpoint, and generate the new requests and assertions needed. Sync the Blueprint collection from the updated spec.

**Then:**

```
/postman:sync
/postman:test
```

**After demo:**

```bash
git checkout main
```

---

## Timing targets

| Act | Target |
|-----|--------|
| Act 0 | 5 min |
| Act 1 | 12 min |
| Act 2 | 15 min |
| Act 3 | 10 min |
| Act 4 | 15 min |
| Close | 3 min |

**Total:** ~60 min

## Postman entity IDs (reference)

| Entity | ID |
|--------|-----|
| Workspace | `577d629c-9b7d-478f-acb1-97c5413bb366` |
| Spec (cart.yaml) | `a08b042b-59ea-4dfc-a267-42133bdf6106` |
| Baseline collection | `52538155-864ff4d0-3683-4a3c-b9ca-1d78de91d297` |
| Blueprint collection | `52538155-84e53afe-4bbc-450d-859f-2d95b13f0606` |
| Production environment | `52538155-d754a7a9-e250-4464-b6c1-d2cf1d97e8f6` |

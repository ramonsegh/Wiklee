---
name: React Query invalidation after mutations
description: CRUD pages built by a DESIGN subagent (or scaffolded quickly) can wire up create/update/delete mutations without invalidating the related list/detail queries, so the UI shows a success toast but the list doesn't refresh.
---

When a page has a mutation (create/update/delete/replace) alongside a `useList*`/`useGet*` query for the same resource, the mutation's `onSuccess` must call `queryClient.invalidateQueries({ queryKey: getX QueryKey() })` for every query key affected (the resource's own list/detail key, plus any dashboard/summary aggregate that depends on it).

**Why:** Found via e2e testing (`runTest`) in a cal.com-style scheduling app — after "Create event type" succeeded (toast shown, network 200), the event types list still showed the empty state because no query invalidation was wired up. The bug was invisible to typecheck and to manual code read-through; only an end-to-end test caught it because the mutation looked complete (had onSuccess/onError, toast) but never touched the query cache.

**How to apply:** After building or reviewing any create/update/delete/replace flow using generated React Query hooks (Orval-style `useCreateX`/`useUpdateX`/`useDeleteX` + `getXQueryKey()` helpers), always run an e2e test that verifies the UI actually reflects the change (item appears/disappears in the list), not just that a success toast appeared. Don't trust the toast as proof of correctness.

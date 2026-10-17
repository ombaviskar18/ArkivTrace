# Arkiv Friction Log

- 2026-10-16: Arkiv Tiramisu RPC returned HTTP 429 / `ANON_COST_LIMITED` during live regression and evidence lookups for Modules 1-6.
- 2026-10-16: Do not repeat live smoke calls after a 429. The backend now surfaces rate limiting as a dedicated failure and logs `Retry-After` when provided.
- 2026-10-16: Live smoke validation should stay at the minimum request count: one dashboard summary call and one discrepancy list call are enough for a basic transport check.


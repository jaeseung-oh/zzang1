# Production data safety

- Treat all existing payment records, purchases, enrollments, course progress, and certificates as permanent production data.
- Never delete, reset, seed over, rename away, or bulk overwrite these records during code changes, price changes, builds, migrations, or deployments.
- Deployments must update code only. Do not run destructive Firestore operations.
- Recovery must use existing trusted payment/purchase records as the source of truth and may only create or repair missing enrollment records.
- Preserve historical paid amounts and product IDs. New catalog prices must not rewrite old transactions.
- Before any explicitly requested data deletion, require a scoped backup and separate confirmation of the exact records.

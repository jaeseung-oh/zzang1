# ResetEdu operational data safety

## Production Firebase project

Production must use only this Firebase project:

- projectId: jaeseung-try-2-34973152-e44aa

Cloudflare Worker must set FIREBASE_PROJECT_ID to the same value. The Worker refuses production Firestore writes when FIREBASE_PROJECT_ID differs from EXPECTED_FIREBASE_PROJECT_ID or the built-in production project ID.

## Data that must never be deleted by deployments

- users
- orders
- payments
- purchases
- enrollments
- courseProgress
- certificates
- adminLogs
- adminAuditLogs
- adminManualEnrollmentGrants

Builds and deploys must update code only. Do not run Firestore delete, seed, reset, truncate, or collection rewrite jobs during deployment.

## Backup procedure

Before production deployment:

1. Run the admin data health check from /admin/integrity.
2. Record counts for users, payments, enrollments, active enrollments, courseProgress, and certificates.
3. Create a managed Firestore export in Google Cloud Console or CLI to a protected Cloud Storage bucket.
4. Confirm export completion before deploying a high-risk change.
5. After deployment, run /admin/integrity health check again and compare counts.

Recommended managed export command:

```bash
gcloud firestore export gs://<backup-bucket>/resetedu/firestore-$(date -u +%Y%m%dT%H%M%SZ) \
  --project=jaeseung-try-2-34973152-e44aa \
  --collection-ids=users,orders,payments,purchases,enrollments,courseProgress,certificates,adminLogs,adminAuditLogs
```

Keep daily backups for at least 30 days and deployment snapshots for at least 90 days.

## Recovery rules

- Existing payment/order records are the source of truth.
- Recovery may create or repair missing enrollment documents.
- Recovery must not rewrite historical payment amount, productId, transactionId, or paidAt.
- If courseId is missing and cannot be inferred from a trusted productId, place the record in the administrator review list. Do not default it to DUI.
- Every repair must leave an admin audit log.

## Deployment checklist

1. Confirm FIREBASE_PROJECT_ID is jaeseung-try-2-34973152-e44aa.
2. Confirm NEXT_PUBLIC_FIREBASE_PROJECT_ID or default client config points to the same project.
3. Run npm run build.
4. Run admin health check before deployment.
5. Deploy Worker and Pages.
6. Run admin health check after deployment.
7. Investigate any unexpected decrease before doing further writes.

# Firestore rules (minimal)

> Goal: allow the vocab game to read/write only the `leaderboard` collection without auth.

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /leaderboard/{docId} {
      allow read, write: if true;
    }
  }
}
```

## Notes

- This is intentionally open. If you need anti-abuse later, add one of:
  - Anonymous Auth + require `request.auth != null`
  - App Check
  - Server-side validation (not possible on pure GitHub Pages without a backend)

## Index gotcha

If your client uses multi-field ordering (e.g. `bestScore desc` + `updatedAt desc`), Firestore will require a composite index.
Current `vocab-review.html` avoids this by ordering on one field and doing the secondary sort client-side.

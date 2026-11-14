# Security Specification — RisetAI Academic Studio

## 1. Data Invariants
1. **Strict Owner Isolation (Projects & Profiles)**: Every document in `users/{userId}` and `projects/{projectId}` is strictly private to the authenticated, email-verified user whose `request.auth.uid` matches `userId` / `ownerId`. Zero public or cross-user reads/lists/writes are permitted.
2. **Master Gate Relational Integrity (Subcollections)**: No reference (`projects/{projectId}/references/{referenceId}`) or instrument (`projects/{projectId}/instruments/{instrumentId}`) can exist without an existing parent document in `projects/{projectId}` owned by `request.auth.uid`. Both `ownerId` and `projectId` in the subcollection document must match the authenticated user and path parameter, and are immutable on update.
3. **Strict Schema & Boundary Enforcement**: Every document creation requires exact keys (`hasAll` + `hasOnly`) and bounded lengths matching `firebase-blueprint.json`. Every update requires `isValid[Entity](incoming())`, `affectedKeys().hasOnly(...)` action allowlists, immutable `ownerId`/`projectId`/`createdAt`, and server timestamp `updatedAt == request.time`.
4. **Path ID Poisoning Guard**: Every single-document operation (`get`, `create`, `update`, `delete`) enforces `isValidId()` (`^[a-zA-Z0-9_-]+$`, max 128 chars).

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Cross-User Project Read**: Authenticated user B attempts `get(/projects/proj_userA)`. Expected: `PERMISSION_DENIED`.
2. **Blanket List Scraping**: Authenticated user B runs `getDocs(collection(db, 'projects'))` without `where('ownerId', '==', uidB)`. Expected: `PERMISSION_DENIED`.
3. **Identity Spoofing on Create**: User A creates `/projects/p1` with `ownerId: "user_B"`. Expected: `PERMISSION_DENIED`.
4. **Shadow Ghost Field Injection**: User A creates `/projects/p1` with valid fields plus `"isAdmin": true` or `"quotaBypass": true`. Expected: `PERMISSION_DENIED`.
5. **Client Timestamp Forgery**: User A creates `/projects/p1` with `createdAt: Timestamp.fromDate(new Date('2020-01-01'))` instead of `serverTimestamp()`. Expected: `PERMISSION_DENIED`.
6. **Immutable Owner Hijack on Update**: User A updates `/projects/p1` trying to change `ownerId` to `"user_B"`. Expected: `PERMISSION_DENIED`.
7. **Unverified Email Write**: Authenticated user with `email_verified: false` attempts to create a project. Expected: `PERMISSION_DENIED`.
8. **ID Poisoning**: User A attempts to create `/projects/bad$id!@#` or a 200-char ID. Expected: `PERMISSION_DENIED`.
9. **Chapter Map Key Injection**: User A updates `/projects/p1` adding `chapters.bab99 = "inject"`. Expected: `PERMISSION_DENIED`.
10. **Denial-of-Wallet String Overflow**: User A attempts to set `title` to a 500-character string (`> 300` maxLength). Expected: `PERMISSION_DENIED`.
11. **Orphan Subcollection Write**: User A attempts to create `/projects/nonexistent_proj/references/ref1` where parent project does not exist. Expected: `PERMISSION_DENIED`.
12. **Cross-Owner Subcollection Write**: User B attempts to add an instrument to `/projects/proj_userA/instruments/inst1` even if setting `ownerId: uidB`. Expected: `PERMISSION_DENIED` (blocked by Master Gate `get()` on parent project).

# B1-003 — README contradicts itself about the demo credentials the app seeds

- **id:** B1-003
- **related_story:** S1-001
- **severity:** low
- **status:** open
- **found_in_pass:** 1
- **files:** `README.md`

## Summary

`README.md` is a named deliverable of S1-001 ("how to run, the three credentials, the
no-persistence caveat, append if a README already exists" in `design.md` section 8). The
appended section is correct, but the file now states two different things about the same
credentials.

Line 7, under "Not sensitive — safe to share", says the only credentials present are
"`password123`, a default `workshop-secret` JWT signing key, and fake `@test.com` email
addresses". None of those user credentials exist in the repository. `src/seed.ts` seeds
`employee@timeoff.local` / `employee123`, `manager@timeoff.local` / `manager123` and
`hr@timeoff.local` / `hr123`, which is what the new section at lines 61 to 65 documents
correctly. Only the `workshop-secret` half of the sentence is still accurate.

A reader who trusts the earlier paragraph will try `password123` against an `@test.com` address
and get a 401, and the file's own credential table then contradicts it thirty lines later.

## Repro

1. Open `README.md` and read line 7.
2. Read the credential table at lines 61 to 65 of the same file.
3. Compare both against `src/seed.ts`. The table matches the seed; line 7 does not.
4. Confirm behaviourally:

```
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"email":"employee@test.com","password":"password123"}' http://localhost:3000/login
{"error":"invalid credentials"}
```

## Expected

One consistent statement of the seeded fixture credentials in the README. The "Not sensitive"
paragraph should name the credentials that actually exist, or point at the credential table
instead of restating values.

## Notes for the fix

The stale sentence predates this sprint; it described an earlier iteration of the demo. S1-001
is the story that introduced the real fixtures, so reconciling the sentence belongs here. This
is documentation only, no source change.

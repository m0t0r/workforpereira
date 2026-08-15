# The `Person` ↔ Better Auth `user` seam

Better Auth documents nothing about foreign keys from application tables to `user.id` (established
by the audit in issue #3). Its own core foreign keys cascade, so mirroring them means `deleteUser`
silently reaches into our data, and not mirroring them means a user delete fails against a RESTRICT
constraint. We chose neither: **`person` has its own primary key and a nullable `user_id` referencing
`user.id` with `ON DELETE SET NULL`, and every other domain table references `person.id`, never
`user.id`.**

## Why

- **The domain package must be framework-agnostic** — a standing constraint of this project. That is
  impossible if the central entity's identity is owned by the auth library. With this seam, the
  domain touches Better Auth in exactly one column.
- **Deleting an auth account and erasing a titular are different operations, and Ley 1581 forces the
  distinction.** Art. 11 of Decreto 1377 requires suppression once a purpose is met, while arts. 9
  and 17(b) require us to *conserve proof of the authorization* we were given. A cascade from
  `user.id` would make that choice for us, wrongly, and irreversibly. The seam leaves erasure as a
  designed operation (issue #21) rather than a side effect of a library call.
- Cascades *within* the domain (`person` → `publication` → `capability_profile` / `need`) are then
  entirely ours to choose.

## Consequence

`person.user_id` is `text`, matching Better Auth's default id type rather than our `bigint`
convention (see ADR-0003). This is deliberate: Better Auth's id is a *foreign identifier we store*,
not one of our keys, and it should look like theirs at the one place the two systems meet.

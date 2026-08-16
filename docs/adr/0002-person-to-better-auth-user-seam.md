# The `Person` ↔ Better Auth `user` seam

Better Auth documents nothing about foreign keys from application tables to `users.id` (established
by the audit in issue #3). Its own core foreign keys cascade, so mirroring them means `deleteUser`
silently reaches into our data, and not mirroring them means a user delete fails against a RESTRICT
constraint. We chose neither: **`persons` has its own primary key and a nullable `user_id` referencing
`users.id` with `ON DELETE SET NULL`, and every other domain table references `persons.id`, never
`users.id`.**

## Why

- **The domain package must be framework-agnostic** — a standing constraint of this project. That is
  impossible if the central entity's identity is owned by the auth library. With this seam, the
  domain touches Better Auth in exactly one column.
- **Deleting an auth account and erasing a titular are different operations, and Ley 1581 forces the
  distinction.** Art. 11 of Decreto 1377 requires suppression once a purpose is met, while arts. 9
  and 17(b) require us to _conserve proof of the authorization_ we were given. A cascade from
  `users.id` would make that choice for us, wrongly, and irreversibly. The seam leaves erasure as a
  designed operation (issue #21) rather than a side effect of a library call.
- Cascades _within_ the domain (`persons` → `publications` → `capability_profiles` / `needs`) are then
  entirely ours to choose. **ADR-0008 chose them**: `RESTRICT` by default, `CASCADE` only within an
  aggregate, and this seam is the sole `SET NULL` in the schema.

## Consequence

`persons.user_id` is `text`, matching Better Auth's default id type rather than our `bigint`
convention (see ADR-0003). This is deliberate: Better Auth's id is a _foreign identifier we store_,
not one of our keys, and it should look like theirs at the one place the two systems meet.

Per ADR-0008, Better Auth's tables are remapped to plural — `users`, `sessions`, `accounts`,
`verifications` — via `schema.<model>.modelName` in its config. The **model** name stays `user`, which
is what Better Auth's own documentation and error messages say; only the physical table is renamed.
This is configuration, not hand-written DDL, so the refusal above to own their schema still holds.

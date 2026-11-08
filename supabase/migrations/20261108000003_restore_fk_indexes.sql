-- Revert 20261108000002: dropping the two membership helper indexes traded an
-- INFO unused_index finding for an INFO unindexed_foreign_keys finding with no
-- upside. Indexes-present is the better state: FK enforcement stays fast and
-- the unused flags clear themselves once the tables see traffic.
create index if not exists idx_membership_members_member
  on public.membership_members (member_id);
create index if not exists idx_memberships_registration
  on public.memberships (registration_id);

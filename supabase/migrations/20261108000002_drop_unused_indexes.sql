-- Drop confirmed-unused helper indexes (advisor: unused_index).
-- idx_scan = 0 on all four; the membership link/lineage pair is dropped.
-- member_registrations phone/email indexes are intentionally kept: they back
-- duplicate-applicant detection and will matter as applications accumulate.
drop index if exists public.idx_membership_members_member;
drop index if exists public.idx_memberships_registration;

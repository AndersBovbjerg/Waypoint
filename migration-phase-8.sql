-- Phase 8: Settings, the reworked review, and the Apple Calendar feed.
--
-- One file for the whole round, run once in the Supabase SQL editor before
-- the code that needs it is deployed. Every statement is additive or widens
-- a constraint, so running it early is safe for the app already live.

-- 1. Settings: "System" as a third appearance, resolved on the device from
--    prefers-color-scheme. The inline check from schema.sql only allowed
--    light and dark, so choosing System failed to save.
alter table prefs drop constraint if exists prefs_mode_check;
alter table prefs add constraint prefs_mode_check check (mode in ('light', 'dark', 'system'));

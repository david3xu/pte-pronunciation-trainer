-- ============================================================================
-- PTE Pronunciation Trainer - Add SWT Task Type
-- ============================================================================
-- Version: 2.1.0
-- Date: 2026-07-23
-- Description: Adds 'swt' (Summarize Written Text) to the task_type and
--              current_practice_mode CHECK constraints. Additive migration:
--              does not edit 20250108000000_initial_schema.sql or
--              20250113000000_ai_powered_features.sql directly, since those
--              may already be applied to live environments and editing them
--              would not change an existing database's constraints.
-- ============================================================================

-- practice_sessions.task_type was created as an unnamed inline column check,
-- so Postgres auto named it. Look the name up rather than assume it, drop
-- it, then add an explicitly named replacement that includes 'swt'.
do $$
declare
  r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_attribute att on att.attrelid = rel.oid
    where rel.relname = 'practice_sessions'
      and con.contype = 'c'
      and att.attname = 'task_type'
      and att.attnum = any(con.conkey)
  loop
    execute format('alter table public.practice_sessions drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.practice_sessions
  add constraint practice_sessions_task_type_check
  check (task_type in ('rs', 'asq', 'wfd', 'swt', 'ra', 'di', 'rl', 'fib_r', 'fib_l', 'vocabulary'));

-- user_settings.current_practice_mode: same pattern.
do $$
declare
  r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_attribute att on att.attrelid = rel.oid
    where rel.relname = 'user_settings'
      and con.contype = 'c'
      and att.attname = 'current_practice_mode'
      and att.attnum = any(con.conkey)
  loop
    execute format('alter table public.user_settings drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.user_settings
  add constraint user_settings_current_practice_mode_check
  check (current_practice_mode in ('rs', 'asq', 'wfd', 'swt'));

comment on constraint practice_sessions_task_type_check on public.practice_sessions
  is 'Allowed task types, including swt (Summarize Written Text) added 2026-07-23';
comment on constraint user_settings_current_practice_mode_check on public.user_settings
  is 'Allowed practice modes, including swt (Summarize Written Text) added 2026-07-23';

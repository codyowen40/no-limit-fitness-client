alter table public.workout_logs add column if not exists is_unlogged boolean not null default false;

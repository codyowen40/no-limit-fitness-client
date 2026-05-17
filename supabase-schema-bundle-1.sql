-- No Limit Fitness Backend Bundle 1
-- Supabase database foundation
-- Run this in Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'client' check (role in ('coach', 'client')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid references public.profiles(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  name text not null,
  email text not null,
  status text not null default 'Active' check (status in ('Active', 'Paused', 'Archived')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exercise_library (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  categories text[] not null default '{}',
  muscles_worked text not null default '',
  equipment text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid references public.profiles(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  plan_name text not null,
  status text not null default 'Active' check (status in ('Active', 'Archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.workout_plans(id) on delete cascade,
  day_name text not null,
  day_order int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plan_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_day_id uuid not null references public.workout_days(id) on delete cascade,
  exercise_library_id uuid references public.exercise_library(id) on delete set null,
  exercise_name text not null,
  exercise_order int not null default 1,
  sets text,
  reps_or_time text,
  weight_guidance text,
  rest_period text,
  coach_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  plan_id uuid references public.workout_plans(id) on delete set null,
  workout_day_id uuid references public.workout_days(id) on delete set null,
  plan_name text,
  day_name text,
  status text not null check (status in ('completed', 'skipped')),
  skip_reason text,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.workout_entries (
  id uuid primary key default gen_random_uuid(),
  workout_log_id uuid not null references public.workout_logs(id) on delete cascade,
  plan_exercise_id uuid references public.plan_exercises(id) on delete set null,
  exercise_name text not null,
  actual_weight text,
  sets_completed text,
  reps_completed text,
  time_completed text,
  actual_rest text,
  exercise_substitution text,
  client_notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  sender_profile_id uuid references public.profiles(id) on delete set null,
  sender_role text not null check (sender_role in ('coach', 'client')),
  body text not null,
  unread_for_coach boolean not null default false,
  unread_for_client boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid references public.profiles(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid references public.profiles(id) on delete cascade,
  client_completed_workout boolean not null default true,
  client_skipped_workout boolean not null default true,
  client_changed_exercise boolean not null default true,
  client_changed_values boolean not null default true,
  client_left_note boolean not null default true,
  coach_assigned_plan boolean not null default true,
  coach_sent_message boolean not null default true,
  client_sent_message boolean not null default true,
  coach_email text,
  future_email_provider text default 'Supabase + Resend',
  backend_status text default 'Frontend placeholder only',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clients_coach_id_idx on public.clients(coach_id);
create index if not exists workout_plans_client_id_idx on public.workout_plans(client_id);
create index if not exists workout_days_plan_id_idx on public.workout_days(plan_id);
create index if not exists plan_exercises_workout_day_id_idx on public.plan_exercises(workout_day_id);
create index if not exists workout_logs_client_id_idx on public.workout_logs(client_id);
create index if not exists workout_entries_log_id_idx on public.workout_entries(workout_log_id);
create index if not exists messages_client_id_idx on public.messages(client_id);
create index if not exists notifications_coach_id_idx on public.notifications(coach_id);

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.exercise_library enable row level security;
alter table public.workout_plans enable row level security;
alter table public.workout_days enable row level security;
alter table public.plan_exercises enable row level security;
alter table public.workout_logs enable row level security;
alter table public.workout_entries enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
create table if not exists public.training_events (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint training_events_valid_range check (ends_at > starts_at)
);

create index if not exists training_events_starts_at_idx on public.training_events(starts_at);
create index if not exists training_events_client_id_idx on public.training_events(client_id);

alter table public.training_events enable row level security;

create policy "training events visible to assigned accounts"
on public.training_events for select to authenticated
using (
  coach_id = auth.uid()
  or exists (select 1 from public.clients where clients.id = training_events.client_id and clients.profile_id = auth.uid())
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

create policy "coaches manage training events"
on public.training_events for all to authenticated
using (
  coach_id = auth.uid()
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
)
with check (
  coach_id = auth.uid()
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

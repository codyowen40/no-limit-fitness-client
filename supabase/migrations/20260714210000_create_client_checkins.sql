create table if not exists public.client_checkins (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references public.clients(id) on delete cascade,
  check_in_date date not null, weight numeric check (weight > 0), waist numeric check (waist > 0), adherence integer not null check (adherence between 0 and 100),
  workouts_completed integer not null check (workouts_completed >= 0), protein integer not null check (protein between 1 and 5), hunger integer not null check (hunger between 1 and 5),
  energy integer not null check (energy between 1 and 5), sleep integer not null check (sleep between 1 and 5), stress integer not null check (stress between 1 and 5),
  digestion integer not null check (digestion between 1 and 5), recovery integer not null check (recovery between 1 and 5), notes text not null default '',
  front_note text not null default '', side_note text not null default '', back_note text not null default '', created_at timestamptz not null default now(),
  unique(client_id, check_in_date), constraint checkin_not_future check (check_in_date <= current_date)
);
create table if not exists public.progress_photo_checkins (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references public.clients(id) on delete cascade, photo_date date not null,
  front_path text not null, side_path text not null, back_path text not null, notes text not null default '', front_note text not null default '', side_note text not null default '', back_note text not null default '',
  coach_notes text not null default '', created_at timestamptz not null default now(), unique(client_id, photo_date), constraint photo_not_future check (photo_date <= current_date)
);
alter table public.client_checkins enable row level security; alter table public.progress_photo_checkins enable row level security;
create policy "assigned accounts read checkins" on public.client_checkins for select to authenticated using (exists (select 1 from public.clients c where c.id=client_id and (c.profile_id=auth.uid() or c.coach_id=auth.uid())) or exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
create policy "clients manage own checkins" on public.client_checkins for all to authenticated using (exists (select 1 from public.clients c where c.id=client_id and c.profile_id=auth.uid())) with check (exists (select 1 from public.clients c where c.id=client_id and c.profile_id=auth.uid()));
create policy "assigned accounts read photos" on public.progress_photo_checkins for select to authenticated using (exists (select 1 from public.clients c where c.id=client_id and (c.profile_id=auth.uid() or c.coach_id=auth.uid())) or exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
create policy "clients manage own photos" on public.progress_photo_checkins for all to authenticated using (exists (select 1 from public.clients c where c.id=client_id and c.profile_id=auth.uid())) with check (exists (select 1 from public.clients c where c.id=client_id and c.profile_id=auth.uid()));
insert into storage.buckets (id,name,public) values ('progress-photos','progress-photos',false) on conflict (id) do update set public=false;
create policy "owners upload progress photos" on storage.objects for insert to authenticated with check (bucket_id='progress-photos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "assigned accounts view progress photos" on storage.objects for select to authenticated using (bucket_id='progress-photos' and ((storage.foldername(name))[1]=auth.uid()::text or exists (select 1 from public.clients c where c.profile_id::text=(storage.foldername(name))[1] and (c.coach_id=auth.uid() or exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')))));
create policy "owners delete progress photos" on storage.objects for delete to authenticated using (bucket_id='progress-photos' and (storage.foldername(name))[1]=auth.uid()::text);

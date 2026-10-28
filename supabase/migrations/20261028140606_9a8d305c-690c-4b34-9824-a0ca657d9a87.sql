create table public.patient_care_messages (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  kind text not null check (kind in ('recall_6m','postop_d1','postop_d3','postop_d7')),
  source_key text not null,
  treatment_name text,
  due_at timestamptz not null,
  status text not null default 'queued' check (status in ('queued','sending','sent','failed','skipped')),
  template_name text not null,
  attempts int not null default 0,
  last_error text,
  wa_message_id text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, source_key)
);
create index patient_care_messages_due_idx on public.patient_care_messages (status, due_at);
alter table public.patient_care_messages enable row level security;
grant select, update on public.patient_care_messages to authenticated;
grant all on public.patient_care_messages to service_role;
create policy "Staff view care messages" on public.patient_care_messages for select to authenticated using (public.is_staff());
create policy "Staff update care messages" on public.patient_care_messages for update to authenticated using (public.is_staff()) with check (public.is_staff());
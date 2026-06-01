-- =====================================================================
--  ترقية رقم 2 — إضافة الحقول الطبية وملفات المريض (بدون فقدان البيانات)
--  شغّلها مرة واحدة في Supabase SQL Editor.
-- =====================================================================

-- حقول جديدة على المريض
alter table public.patients add column if not exists street text;
alter table public.patients add column if not exists age int;
alter table public.patients add column if not exists diagnosis text;
alter table public.patients add column if not exists present_history text;
alter table public.patients add column if not exists past_history text;
alter table public.patients add column if not exists operations text[] not null default '{}';
alter table public.patients add column if not exists symptoms text[] not null default '{}';
alter table public.patients add column if not exists treatment_program text[] not null default '{}';

-- جدول ملفات المريض (أشعة/تحاليل/صور)
create table if not exists public.patient_files (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references public.patients(id) on delete cascade,
  path        text not null,
  name        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_files_patient on public.patient_files (patient_id);
alter table public.patient_files enable row level security;

-- مخزن الملفات الخاص
insert into storage.buckets (id, name, public)
values ('patient-files', 'patient-files', false)
on conflict (id) do nothing;

-- =====================================================================
--  ترقية قاعدة البيانات (الإصدار 2) — آمنة وقابلة لإعادة التشغيل
--  شغّلها مرة واحدة في Supabase SQL Editor. لن تفقد أي بيانات.
-- =====================================================================

-- ---------- (من الإصدار 1) الميعاد ورقم الكورس والجلسات التعويضية ----------
alter table public.patients add column if not exists default_time time;
alter table public.sessions add column if not exists course_number int not null default 1;

alter table public.sessions drop constraint if exists sessions_session_number_check;
alter table public.sessions add constraint sessions_session_number_check check (session_number >= 1);
alter table public.sessions drop constraint if exists sessions_course_number_check;
alter table public.sessions add constraint sessions_course_number_check check (course_number >= 1);

alter table public.sessions drop constraint if exists sessions_patient_id_session_number_key;
alter table public.sessions drop constraint if exists sessions_patient_course_session_key;
alter table public.sessions add constraint sessions_patient_course_session_key
  unique (patient_id, course_number, session_number);

-- ---------- (الإصدار 2) بيانات وملف المريض الطبي ----------
alter table public.patients add column if not exists address           text;
alter table public.patients add column if not exists age               int;
alter table public.patients add column if not exists diagnosis         text;
alter table public.patients add column if not exists present_history   text;
alter table public.patients add column if not exists past_history      text;
alter table public.patients add column if not exists extra_info        text;
alter table public.patients add column if not exists operations        jsonb not null default '[]'::jsonb;
alter table public.patients add column if not exists symptoms          jsonb not null default '[]'::jsonb;
alter table public.patients add column if not exists treatment_program jsonb not null default '[]'::jsonb;

-- ---------- جدول المرفقات (صور أشعة / تحاليل / أي ملف) ----------
create table if not exists public.attachments (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references public.patients(id) on delete cascade,
  file_name    text not null,
  storage_path text not null,
  mime_type    text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_attachments_patient on public.attachments (patient_id);
alter table public.attachments enable row level security;

-- ---------- مخزن الملفات (Bucket خاص) ----------
insert into storage.buckets (id, name, public)
values ('patient-files', 'patient-files', false)
on conflict (id) do nothing;

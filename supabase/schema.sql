-- =====================================================================
--  قاعدة بيانات تطبيق إدارة جلسات العلاج الطبيعي المنزلي
--  شغّل هذا الملف في Supabase: SQL Editor > New query > Run
-- =====================================================================

-- ---------- جدول المرضى ----------
create table if not exists public.patients (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  phone              text not null,
  area               text not null,
  street             text,
  age                int,
  course_start_date  date not null,
  -- نظام الأيام: sat_mon_wed = سبت/اتنين/أربع | sun_tue_thu = حد/تلات/خميس
  days_system        text not null check (days_system in ('sat_mon_wed', 'sun_tue_thu')),
  session_price      numeric(10,2) not null default 0 check (session_price >= 0),
  discount           numeric(10,2) not null default 0 check (discount >= 0),
  -- طريقة الدفع: advance = مقدم | per_session = جلسة بجلسة | every_3_sessions = مؤخر كل 3 جلسات
  payment_method     text not null check (payment_method in ('advance', 'per_session', 'every_3_sessions')),
  default_time       time,
  diagnosis          text,
  present_history    text,
  past_history       text,
  operations         text[] not null default '{}',
  symptoms           text[] not null default '{}',
  treatment_program  text[] not null default '{}',
  notes              text,
  archived           boolean not null default false,
  created_at         timestamptz not null default now()
);

-- ---------- ملفات المريض (أشعة/تحاليل/صور) ----------
create table if not exists public.patient_files (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references public.patients(id) on delete cascade,
  path        text not null,
  name        text not null,
  created_at  timestamptz not null default now()
);

-- ---------- جدول الجلسات ----------
create table if not exists public.sessions (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.patients(id) on delete cascade,
  course_number   int not null default 1 check (course_number >= 1),
  session_number  int not null check (session_number >= 1),
  session_date    date not null,
  session_time    time,
  -- الحالة: done = تمت | pending = لم تتم | postponed = مؤجلة | cancelled = ملغية
  status          text not null default 'pending' check (status in ('done', 'pending', 'postponed', 'cancelled')),
  notes           text,
  created_at      timestamptz not null default now(),
  unique (patient_id, course_number, session_number)
);

-- ---------- جدول الدفعات ----------
create table if not exists public.payments (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references public.patients(id) on delete cascade,
  amount        numeric(10,2) not null check (amount > 0),
  payment_date  date not null default current_date,
  note          text,
  created_at    timestamptz not null default now()
);

-- ---------- الفهارس ----------
create index if not exists idx_sessions_patient  on public.sessions (patient_id);
create index if not exists idx_sessions_date     on public.sessions (session_date);
create index if not exists idx_sessions_status   on public.sessions (status);
create index if not exists idx_payments_patient  on public.payments (patient_id);
create index if not exists idx_patients_archived on public.patients (archived);
create index if not exists idx_patients_name     on public.patients (name);
create index if not exists idx_patients_area     on public.patients (area);
create index if not exists idx_files_patient      on public.patient_files (patient_id);

-- ---------- الأمان (RLS) ----------
-- التطبيق يعمل بمستخدم واحد عبر مفتاح الخدمة (service role) من جهة السيرفر فقط.
-- نفعّل RLS ولا نضيف أي Policy عامة، أي أن مفتاح anon لا يصل للبيانات إطلاقًا،
-- بينما يتجاوز مفتاح الخدمة (المستخدم في Server Actions) سياسات RLS تلقائيًا.
alter table public.patients enable row level security;
alter table public.sessions enable row level security;
alter table public.payments enable row level security;
alter table public.patient_files enable row level security;

-- ---------- مخزن الملفات (Storage) ----------
-- مخزن خاص (غير عام) لملفات المرضى. الوصول للملفات يتم عبر روابط موقّعة من السيرفر.
insert into storage.buckets (id, name, public)
values ('patient-files', 'patient-files', false)
on conflict (id) do nothing;

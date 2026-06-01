-- =====================================================================
--  بيانات تجريبية — شغّلها بعد schema.sql
--  (اختياري — لتجربة التطبيق ببيانات جاهزة)
-- =====================================================================

-- مريض 1: دفع مقدم — مدفوع بالكامل
with p as (
  insert into public.patients
    (name, phone, area, course_start_date, days_system, session_price, discount, payment_method, notes, archived)
  values
    ('أحمد محمود', '01012345678', 'المعادي', current_date - 4, 'sat_mon_wed', 200, 0, 'advance', 'إصابة في الركبة', false)
  returning id, session_price, discount
)
insert into public.sessions (patient_id, session_number, session_date, session_time, status)
select p.id, n,
       (current_date - 4) + (n * 2),
       '17:00'::time,
       case when n <= 2 then 'done' else 'pending' end
from p, generate_series(1, 12) as n;

insert into public.payments (patient_id, amount, payment_date, note)
select id, (session_price * 12) - discount, current_date - 4, 'دفعة مقدمة كاملة'
from public.patients where name = 'أحمد محمود';

-- مريض 2: جلسة بجلسة — مدفوع جزئيًا
with p as (
  insert into public.patients
    (name, phone, area, course_start_date, days_system, session_price, discount, payment_method, notes, archived)
  values
    ('منى السيد', '01298765432', 'مدينة نصر', current_date - 2, 'sun_tue_thu', 250, 200, 'per_session', 'علاج طبيعي للظهر', false)
  returning id
)
insert into public.sessions (patient_id, session_number, session_date, session_time, status)
select p.id, n,
       (current_date - 2) + (n * 2),
       '11:30'::time,
       case when n = 1 then 'done' when n = 2 then 'postponed' else 'pending' end
from p, generate_series(1, 12) as n;

insert into public.payments (patient_id, amount, payment_date, note)
select id, 250, current_date - 2, 'جلسة 1'
from public.patients where name = 'منى السيد';

-- مريض 3: مؤخر كل 3 جلسات — يوجد مستحق
with p as (
  insert into public.patients
    (name, phone, area, course_start_date, days_system, session_price, discount, payment_method, notes, archived)
  values
    ('خالد عبد الله', '01155667788', 'المعادي', current_date - 8, 'sat_mon_wed', 180, 0, 'every_3_sessions', '', false)
  returning id
)
insert into public.sessions (patient_id, session_number, session_date, session_time, status)
select p.id, n,
       (current_date - 8) + (n * 2),
       '19:00'::time,
       case when n <= 4 then 'done' else 'pending' end
from p, generate_series(1, 12) as n;

-- مريض 4: كورس منتهٍ (مؤرشف)
with p as (
  insert into public.patients
    (name, phone, area, course_start_date, days_system, session_price, discount, payment_method, notes, archived)
  values
    ('سعاد إبراهيم', '01033445566', '6 أكتوبر', current_date - 30, 'sun_tue_thu', 220, 0, 'advance', 'انتهى الكورس بنجاح', true)
  returning id, session_price, discount
)
insert into public.sessions (patient_id, session_number, session_date, session_time, status)
select p.id, n, (current_date - 30) + (n * 2), '10:00'::time, 'done'
from p, generate_series(1, 12) as n;

insert into public.payments (patient_id, amount, payment_date, note)
select id, (session_price * 12) - discount, current_date - 30, 'دفعة كاملة'
from public.patients where name = 'سعاد إبراهيم';

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase";
import { generateSessionDates, nextSessionDatesAfter } from "@/lib/utils";
import { patientSchema } from "@/lib/validation";
import { Session, TOTAL_SESSIONS } from "@/lib/types";

export type ActionState = { error?: string } | null;

function parsePatientForm(formData: FormData) {
  return patientSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    area: formData.get("area"),
    street: formData.get("street") || "",
    age: formData.get("age") || "",
    gender: formData.get("gender") || undefined,
    course_start_date: formData.get("course_start_date"),
    days_system: formData.get("days_system"),
    session_price: formData.get("session_price"),
    discount: formData.get("discount") || 0,
    payment_method: formData.get("payment_method"),
    default_time: formData.get("default_time") || "",
    diagnosis: formData.get("diagnosis") || "",
    present_history: formData.get("present_history") || "",
    past_history: formData.get("past_history") || "",
    operations: formData.getAll("operations").map(String),
    symptoms: formData.getAll("symptoms").map(String),
    treatment_program: formData.getAll("treatment_program").map(String),
    notes: formData.get("notes") || "",
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function patientRecord(data: any) {
  return {
    name: data.name,
    phone: data.phone,
    area: data.area,
    street: data.street || null,
    age: data.age ?? null,
    gender: data.gender ?? null,
    course_start_date: data.course_start_date,
    days_system: data.days_system,
    session_price: data.session_price,
    discount: data.discount,
    payment_method: data.payment_method,
    default_time: data.default_time || null,
    diagnosis: data.diagnosis || null,
    present_history: data.present_history || null,
    past_history: data.past_history || null,
    operations: data.operations ?? [],
    symptoms: data.symptoms ?? [],
    treatment_program: data.treatment_program ?? [],
    notes: data.notes || null,
  };
}

export async function createPatient(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parsePatientForm(formData);

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "بيانات غير صحيحة" };
  }

  const data = parsed.data;
  const supabase = createServerSupabase();

  // 1) إنشاء المريض
  const { data: patient, error: pErr } = await supabase
    .from("patients")
    .insert(patientRecord(data))
    .select("id")
    .single();

  if (pErr || !patient) {
    return { error: "تعذّر حفظ المريض: " + (pErr?.message ?? "") };
  }

  // 2) توليد 12 جلسة تلقائيًا (الكورس رقم 1) بميعاد افتراضي إن وُجد
  const dates = generateSessionDates(data.course_start_date, data.days_system, TOTAL_SESSIONS);
  const sessions = dates.map((d, i) => ({
    patient_id: patient.id,
    course_number: 1,
    session_number: i + 1,
    session_date: d,
    session_time: data.default_time || null,
    status: "pending" as const,
  }));

  const { error: sErr } = await supabase.from("sessions").insert(sessions);
  if (sErr) {
    return { error: "تم حفظ المريض لكن تعذّر إنشاء الجلسات: " + sErr.message };
  }

  revalidatePath("/");
  revalidatePath("/patients");
  revalidatePath("/calc");
  redirect(`/patients/${patient.id}`);
}

export async function updatePatient(
  patientId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parsePatientForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "بيانات غير صحيحة" };
  }
  const supabase = createServerSupabase();
  const { error } = await supabase
    .from("patients")
    .update(patientRecord(parsed.data))
    .eq("id", patientId);
  if (error) return { error: "تعذّر تحديث البيانات: " + error.message };

  revalidatePath("/");
  revalidatePath("/patients");
  revalidatePath("/calc");
  revalidatePath(`/patients/${patientId}`);
  redirect(`/patients/${patientId}`);
}

export async function renewCourse(
  patientId: string,
  startDate?: string,
  startTime?: string
) {
  const supabase = createServerSupabase();

  const { data: patient } = await supabase
    .from("patients")
    .select("days_system, default_time")
    .eq("id", patientId)
    .single();
  if (!patient) return;

  const { data: existing } = await supabase
    .from("sessions")
    .select("course_number, session_date")
    .eq("patient_id", patientId);

  const sessions = (existing ?? []) as Pick<Session, "course_number" | "session_date">[];
  const nextCourse =
    sessions.length === 0 ? 1 : Math.max(...sessions.map((s) => s.course_number ?? 1)) + 1;

  // التواريخ: إما تبدأ من تاريخ يحدّده المستخدم (لو المريض ريّح وجدّد لاحقًا)،
  // وإلا تكمل بعد آخر جلسة حالية.
  let dates: string[];
  if (startDate) {
    dates = generateSessionDates(startDate, patient.days_system, TOTAL_SESSIONS);
  } else {
    const lastDate =
      sessions.length === 0
        ? new Date().toISOString().slice(0, 10)
        : sessions.map((s) => s.session_date).sort().at(-1)!;
    dates = nextSessionDatesAfter(lastDate, patient.days_system, TOTAL_SESSIONS);
  }

  const time = startTime || patient.default_time || null;
  const rows = dates.map((d, i) => ({
    patient_id: patientId,
    course_number: nextCourse,
    session_number: i + 1,
    session_date: d,
    session_time: time,
    status: "pending" as const,
  }));

  await supabase.from("sessions").insert(rows);
  // إعادة ترقيم الكورسات حسب التاريخ (الأقدم = كورس 1)
  await renumberCourses(supabase, patientId);
  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/");
  revalidatePath("/calc");
}

// إعادة ترقيم كل كورسات المريض بترتيب أقدم تاريخ جلسة (يصبح كورس 1، 2، 3 ...)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function renumberCourses(supabase: any, patientId: string) {
  const { data } = await supabase
    .from("sessions")
    .select("course_number, session_date")
    .eq("patient_id", patientId);
  const rows = (data ?? []) as Pick<Session, "course_number" | "session_date">[];
  if (rows.length === 0) return;

  // أقدم تاريخ لكل كورس
  const minDate = new Map<number, string>();
  for (const r of rows) {
    const cur = minDate.get(r.course_number);
    if (!cur || r.session_date < cur) minDate.set(r.course_number, r.session_date);
  }
  // ترتيب أرقام الكورسات الحالية حسب أقدم تاريخ
  const ordered = Array.from(minDate.entries())
    .sort((a, b) => (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0))
    .map(([num]) => num);

  // لو الترتيب صحيح بالفعل لا تفعل شيئًا
  const alreadyOk = ordered.every((num, i) => num === i + 1);
  if (alreadyOk) return;

  // مرحلتان لتفادي تعارض قيد التفرّد: إزاحة مؤقتة ثم الأرقام النهائية
  for (let i = 0; i < ordered.length; i++) {
    await supabase
      .from("sessions")
      .update({ course_number: 1000 + i })
      .eq("patient_id", patientId)
      .eq("course_number", ordered[i]);
  }
  for (let i = 0; i < ordered.length; i++) {
    await supabase
      .from("sessions")
      .update({ course_number: i + 1 })
      .eq("patient_id", patientId)
      .eq("course_number", 1000 + i);
  }
}

// حذف كورس كامل (كل جلساته) ثم إعادة الترقيم
export async function deleteCourse(patientId: string, courseNumber: number) {
  const supabase = createServerSupabase();
  await supabase
    .from("sessions")
    .delete()
    .eq("patient_id", patientId)
    .eq("course_number", courseNumber);
  await renumberCourses(supabase, patientId);
  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/");
  revalidatePath("/calc");
}

// تعديل مواعيد كورس: إعادة توزيع تواريخ جلساته بدءًا من تاريخ جديد (مع الحفاظ على الحالات والملاحظات)
export async function rescheduleCourse(
  patientId: string,
  courseNumber: number,
  startDate: string,
  startTime?: string
) {
  const supabase = createServerSupabase();
  const { data: patient } = await supabase
    .from("patients")
    .select("days_system, default_time")
    .eq("id", patientId)
    .single();
  if (!patient) return;

  const { data } = await supabase
    .from("sessions")
    .select("id, session_number")
    .eq("patient_id", patientId)
    .eq("course_number", courseNumber)
    .order("session_number");
  const rows = (data ?? []) as Pick<Session, "id" | "session_number">[];
  if (rows.length === 0) return;

  const dates = generateSessionDates(startDate, patient.days_system, rows.length);
  const time = startTime || null;
  for (let i = 0; i < rows.length; i++) {
    const patch: { session_date: string; session_time?: string | null } = {
      session_date: dates[i],
    };
    if (startTime) patch.session_time = time;
    await supabase.from("sessions").update(patch).eq("id", rows[i].id);
  }
  // التواريخ تغيّرت فقد يتغيّر الترتيب الزمني بين الكورسات
  await renumberCourses(supabase, patientId);
  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/");
  revalidatePath("/calc");
}

export async function toggleArchive(patientId: string, archived: boolean) {
  const supabase = createServerSupabase();
  await supabase.from("patients").update({ archived }).eq("id", patientId);
  revalidatePath("/patients");
  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/");
}
export async function deletePatient(patientId: string) {
  const supabase = createServerSupabase();
  await supabase.from("patients").delete().eq("id", patientId);
  revalidatePath("/patients");
  revalidatePath("/");
  revalidatePath("/calc");
  redirect("/patients");
}

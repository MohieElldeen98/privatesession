"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase";
import { paymentSchema, sessionUpdateSchema } from "@/lib/validation";
import { nextSessionDatesAfter } from "@/lib/utils";
import { Session } from "@/lib/types";

export type ActionResult = { ok: boolean; error?: string };

// تحديث حالة الجلسة + الوقت + الملاحظة
// عند تحويل الحالة إلى "مؤجلة": يُضاف تلقائيًا جلسة تعويضية في آخر نفس الكورس
// لضمان اكتمال 12 جلسة فعلية. وعند التراجع عن التأجيل تُحذف آخر جلسة تعويضية معلّقة.
export async function updateSession(formData: FormData): Promise<ActionResult> {
  const parsed = sessionUpdateSchema.safeParse({
    session_id: formData.get("session_id"),
    patient_id: formData.get("patient_id"),
    status: formData.get("status"),
    session_time: formData.get("session_time") || "",
    notes: formData.get("notes") || "",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "بيانات غير صحيحة" };
  }

  const { session_id, patient_id, status, session_time, notes } = parsed.data;
  const supabase = createServerSupabase();

  // الحالة السابقة (لمعرفة هل تغيّرت إلى/من "مؤجلة")
  const { data: current } = await supabase
    .from("sessions")
    .select("status, course_number")
    .eq("id", session_id)
    .single();
  const oldStatus = current?.status as Session["status"] | undefined;
  const courseNumber = current?.course_number ?? 1;

  const { error } = await supabase
    .from("sessions")
    .update({
      status,
      session_time: session_time ? session_time : null,
      notes: notes || null,
    })
    .eq("id", session_id);

  if (error) return { ok: false, error: error.message };

  // تحوّلت إلى مؤجلة → أضف جلسة تعويضية في آخر الكورس
  if (oldStatus && oldStatus !== "postponed" && status === "postponed") {
    await addMakeupSession(supabase, patient_id, courseNumber);
  }
  // تراجع عن التأجيل → احذف آخر جلسة تعويضية معلّقة (إن وُجدت زيادة عن 12)
  if (oldStatus === "postponed" && status !== "postponed") {
    await removeLastMakeup(supabase, patient_id, courseNumber);
  }

  revalidatePath(`/patients/${patient_id}`);
  revalidatePath("/");
  return { ok: true };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function addMakeupSession(supabase: any, patientId: string, courseNumber: number) {
  const { data: patient } = await supabase
    .from("patients")
    .select("days_system, default_time")
    .eq("id", patientId)
    .single();
  if (!patient) return;

  const { data: courseSessions } = await supabase
    .from("sessions")
    .select("session_number, session_date")
    .eq("patient_id", patientId)
    .eq("course_number", courseNumber);

  const rows = (courseSessions ?? []) as Pick<Session, "session_number" | "session_date">[];
  if (rows.length === 0) return;

  const maxNum = Math.max(...rows.map((r) => r.session_number));
  const lastDate = rows.map((r) => r.session_date).sort().at(-1)!;
  const [nextDate] = nextSessionDatesAfter(lastDate, patient.days_system, 1);

  await supabase.from("sessions").insert({
    patient_id: patientId,
    course_number: courseNumber,
    session_number: maxNum + 1,
    session_date: nextDate,
    session_time: patient.default_time || null,
    status: "pending",
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function removeLastMakeup(supabase: any, patientId: string, courseNumber: number) {
  const { data: courseSessions } = await supabase
    .from("sessions")
    .select("id, session_number, status")
    .eq("patient_id", patientId)
    .eq("course_number", courseNumber)
    .order("session_number", { ascending: false });

  const rows = (courseSessions ?? []) as Pick<Session, "id" | "session_number" | "status">[];
  // احذف فقط لو الكورس أصبح أكثر من 12 جلسة، وكانت آخر جلسة معلّقة
  if (rows.length > 12) {
    const last = rows[0];
    if (last.status === "pending") {
      await supabase.from("sessions").delete().eq("id", last.id);
    }
  }
}

// تغيير حالة عدة جلسات دفعة واحدة
export async function bulkUpdateStatus(
  patientId: string,
  sessionIds: string[],
  status: Session["status"]
): Promise<ActionResult> {
  if (sessionIds.length === 0) return { ok: true };
  const supabase = createServerSupabase();

  // لمعالجة الجلسات المؤجلة: نجيب حالاتها الحالية أولاً
  const { data: before } = await supabase
    .from("sessions")
    .select("id, status, course_number")
    .in("id", sessionIds);
  const rows = (before ?? []) as Pick<Session, "id" | "status" | "course_number">[];

  const { error } = await supabase
    .from("sessions")
    .update({ status })
    .in("id", sessionIds);
  if (error) return { ok: false, error: error.message };

  // أضف جلسة تعويضية لكل جلسة تحوّلت إلى "مؤجلة"
  if (status === "postponed") {
    for (const r of rows) {
      if (r.status !== "postponed") {
        await addMakeupSession(supabase, patientId, r.course_number);
      }
    }
  }

  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/");
  return { ok: true };
}

// حذف دفعة (للتراجع عن دفعة مسجلة بالخطأ)
export async function deletePayment(
  patientId: string,
  paymentId: string
): Promise<ActionResult> {
  const supabase = createServerSupabase();
  const { error } = await supabase.from("payments").delete().eq("id", paymentId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/");
  return { ok: true };
}

// تسجيل دفعة بضغطة واحدة (لأزرار التحصيل السريعة)
export async function quickPay(
  patientId: string,
  amount: number,
  note: string
): Promise<ActionResult> {
  if (!patientId || !(amount > 0)) {
    return { ok: false, error: "مبلغ غير صحيح" };
  }
  const supabase = createServerSupabase();
  const { error } = await supabase.from("payments").insert({
    patient_id: patientId,
    amount,
    note: note || null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/");
  return { ok: true };
}

// تسجيل دفعة
export async function createPayment(formData: FormData): Promise<ActionResult> {
  const parsed = paymentSchema.safeParse({
    patient_id: formData.get("patient_id"),
    amount: formData.get("amount"),
    note: formData.get("note") || "",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "مبلغ غير صحيح" };
  }

  const { patient_id, amount, note } = parsed.data;
  const supabase = createServerSupabase();

  const { error } = await supabase.from("payments").insert({
    patient_id,
    amount,
    note: note || null,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/patients/${patient_id}`);
  revalidatePath("/");
  return { ok: true };
}

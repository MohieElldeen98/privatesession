import { createServerSupabase } from "@/lib/supabase";
import { Patient, Session, TOTAL_SESSIONS } from "@/lib/types";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { CalcView, CalcPatient, CalcSession } from "@/components/calc-view";

export const dynamic = "force-dynamic";

// سعر الجلسة الفعلي بعد توزيع الخصم على أول 12 جلسة
function effectivePrice(p: Patient): number {
  const total = Number(p.session_price) * TOTAL_SESSIONS - Number(p.discount);
  return total / TOTAL_SESSIONS;
}

export default async function CalcPage() {
  const supabase = createServerSupabase();

  const [{ data: patients }, { data: sessions }] = await Promise.all([
    supabase.from("patients").select("id, name, session_price, discount, archived"),
    supabase.from("sessions").select("patient_id, session_date, status"),
  ]);

  const allPatients = (patients ?? []) as Patient[];
  const effMap = new Map(allPatients.map((p) => [p.id, effectivePrice(p)]));
  const nameMap = new Map(allPatients.map((p) => [p.id, p.name]));

  const calcPatients: CalcPatient[] = allPatients
    .filter((p) => !p.archived)
    .map((p) => ({ id: p.id, name: p.name, price: effMap.get(p.id) ?? 0 }))
    .sort((a, b) => a.name.localeCompare(b.name, "ar"));

  const calcSessions: CalcSession[] = ((sessions ?? []) as Pick<
    Session,
    "patient_id" | "session_date" | "status"
  >[]).map((s) => ({
    patient_id: s.patient_id,
    session_date: s.session_date,
    status: s.status,
    price: effMap.get(s.patient_id) ?? 0,
  }));

  return (
    <div className="pb-20">
      <AppHeader title="الحساب" />
      <div className="p-4">
        <CalcView
          patients={calcPatients}
          sessions={calcSessions}
          names={Object.fromEntries(nameMap)}
        />
      </div>
      <BottomNav />
    </div>
  );
}

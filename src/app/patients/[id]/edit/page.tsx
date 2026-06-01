import { notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase";
import { Patient } from "@/lib/types";
import { AppHeader } from "@/components/app-header";
import { PatientForm } from "@/components/patient-form";
import { updatePatient } from "@/app/actions/patients";

export const dynamic = "force-dynamic";

export default async function EditPatientPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabase();
  const { data } = await supabase.from("patients").select("*").eq("id", params.id).single();
  if (!data) notFound();
  const patient = data as Patient;

  // ربط معرّف المريض بدالة التحديث
  const action = updatePatient.bind(null, patient.id);

  return (
    <div className="pb-8">
      <AppHeader title="تعديل بيانات المريض" backHref={`/patients/${patient.id}`} />
      <div className="p-4">
        <PatientForm action={action} patient={patient} submitLabel="حفظ التعديلات" />
      </div>
    </div>
  );
}

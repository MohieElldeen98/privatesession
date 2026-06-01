import { AppHeader } from "@/components/app-header";
import { PatientForm } from "@/components/patient-form";
import { createPatient } from "@/app/actions/patients";

export default function NewPatientPage() {
  return (
    <div className="pb-8">
      <AppHeader title="مريض جديد" backHref="/patients" />
      <div className="p-4">
        <PatientForm action={createPatient} submitLabel="حفظ وإنشاء 12 جلسة" />
      </div>
    </div>
  );
}

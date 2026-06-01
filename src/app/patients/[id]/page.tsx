import { notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase";
import { Patient, PatientFile, Payment, Session } from "@/lib/types";
import { calcFinance, getCoursesCount } from "@/lib/utils";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CallButton, WhatsAppButton } from "@/components/contact-buttons";
import { FinanceCard } from "@/components/finance-card";
import { SessionsTable } from "@/components/sessions-table";
import { ArchiveButton } from "@/components/archive-button";
import { RenewButton } from "@/components/renew-button";
import { PatientActions } from "@/components/patient-actions";
import { FileManager } from "@/components/file-manager";
import { MapPin, Phone, User } from "lucide-react";

export const dynamic = "force-dynamic";

function ChipList({ title, items }: { title: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{title}</span>
      <div className="flex flex-wrap gap-1.5">
        {items.map((v) => (
          <Badge key={v} variant="muted">{v}</Badge>
        ))}
      </div>
    </div>
  );
}

function Field({ title, value }: { title: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <span className="mb-0.5 block text-xs font-semibold text-muted-foreground">{title}</span>
      <p className="whitespace-pre-wrap text-sm">{value}</p>
    </div>
  );
}

export default async function PatientPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabase();

  const [{ data: patientData }, { data: sessionsData }, { data: paymentsData }, { data: filesData }] =
    await Promise.all([
      supabase.from("patients").select("*").eq("id", params.id).single(),
      supabase.from("sessions").select("*").eq("patient_id", params.id).order("course_number").order("session_number"),
      supabase.from("payments").select("*").eq("patient_id", params.id),
      supabase.from("patient_files").select("*").eq("patient_id", params.id).order("created_at", { ascending: false }),
    ]);

  if (!patientData) notFound();

  const patient = patientData as Patient;
  const sessions = (sessionsData ?? []) as Session[];
  const payments = (paymentsData ?? []) as Payment[];
  const files = (filesData ?? []) as PatientFile[];
  const finance = calcFinance(patient, sessions, payments);

  // روابط موقّعة لعرض الملفات (صالحة ساعة)
  for (const f of files) {
    const { data: signed } = await supabase.storage
      .from("patient-files")
      .createSignedUrl(f.path, 3600);
    f.signed_url = signed?.signedUrl;
  }

  const hasMedical =
    patient.diagnosis ||
    patient.present_history ||
    patient.past_history ||
    patient.symptoms?.length ||
    patient.operations?.length ||
    patient.treatment_program?.length;

  return (
    <div className="pb-10">
      <AppHeader title={patient.name} backHref="/patients" />

      <div className="space-y-4 p-4">
        {/* بطاقة المريض */}
        <Card>
          <CardContent className="pt-4">
            <h2 className="text-xl font-bold">{patient.name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {patient.area}
                {patient.street ? ` — ${patient.street}` : ""}
              </span>
              {patient.age != null && (
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {patient.age} سنة
                </span>
              )}
              <span className="flex items-center gap-1" dir="ltr">
                <Phone className="h-4 w-4" />
                {patient.phone}
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              <CallButton phone={patient.phone} size="default" />
              <WhatsAppButton phone={patient.phone} size="default" />
            </div>
          </CardContent>
        </Card>

        {/* الحالة الطبية */}
        {hasMedical && (
          <Card>
            <CardContent className="space-y-3 pt-4">
              <h2 className="font-semibold">الحالة الطبية</h2>
              <Field title="التشخيص" value={patient.diagnosis} />
              <Field title="Present history" value={patient.present_history} />
              <Field title="Past history" value={patient.past_history} />
              <ChipList title="الأعراض" items={patient.symptoms ?? []} />
              <ChipList title="العمليات السابقة" items={patient.operations ?? []} />
              <ChipList title="برنامج العلاج الطبيعي" items={patient.treatment_program ?? []} />
            </CardContent>
          </Card>
        )}

        {/* الملفات والأشعة */}
        <FileManager patientId={patient.id} files={files} />

        {/* الحالة المالية */}
        <FinanceCard patient={patient} finance={finance} payments={payments} sessions={sessions} />

        {/* الجلسات */}
        <SessionsTable sessions={sessions} patientId={patient.id} />

        {patient.notes && (
          <Card>
            <CardContent className="pt-4">
              <Field title="معلومات أخرى" value={patient.notes} />
            </CardContent>
          </Card>
        )}

        <RenewButton patientId={patient.id} nextCourse={getCoursesCount(sessions) + 1} defaultTime={patient.default_time} />
        <PatientActions patientId={patient.id} name={patient.name} />
        <ArchiveButton patientId={patient.id} archived={patient.archived} />
      </div>
    </div>
  );
}

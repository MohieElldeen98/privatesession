import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { PatientsBrowser, PatientListItem } from "@/components/patients-browser";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PatientsPage() {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from("patients")
    .select("id, name, phone, area, archived, days_system, default_time")
    .order("name");

  const patients = (data ?? []) as PatientListItem[];

  return (
    <div className="pb-20">
      <AppHeader
        title="المرضى"
        action={
          <Button asChild size="sm">
            <Link href="/patients/new">
              <Plus /> جديد
            </Link>
          </Button>
        }
      />
      <div className="p-4">
        <PatientsBrowser patients={patients} />
      </div>
      <BottomNav />
    </div>
  );
}

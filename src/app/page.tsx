import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase";
import { Patient, Payment, Session, TodaySession } from "@/lib/types";
import { calcFinance, formatMoney, formatTime, todayISO } from "@/lib/utils";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CallButton, WhatsAppButton } from "@/components/contact-buttons";
import { Plus, Users, CalendarClock, Wallet, FileText, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = createServerSupabase();
  const today = todayISO();

  const [{ data: patients }, { data: sessions }, { data: payments }] = await Promise.all([
    supabase.from("patients").select("*").eq("archived", false),
    supabase.from("sessions").select("*"),
    supabase.from("payments").select("*"),
  ]);

  const activePatients = (patients ?? []) as Patient[];
  const allSessions = (sessions ?? []) as Session[];
  const allPayments = (payments ?? []) as Payment[];

  // إجمالي المستحقات غير المحصلة (مجموع المتبقي للمرضى النشطين)
  let totalRemaining = 0;
  for (const p of activePatients) {
    const ps = allSessions.filter((s) => s.patient_id === p.id);
    const pp = allPayments.filter((pay) => pay.patient_id === p.id);
    totalRemaining += calcFinance(p, ps, pp).remaining;
  }

  // جلسات اليوم
  const patientMap = new Map(activePatients.map((p) => [p.id, p]));
  const todaySessions: TodaySession[] = allSessions
    .filter((s) => s.session_date === today && patientMap.has(s.patient_id))
    .map((s) => {
      const p = patientMap.get(s.patient_id)!;
      return { ...s, patient_name: p.name, patient_area: p.area, patient_phone: p.phone };
    })
    .sort((a, b) => (a.session_time ?? "99").localeCompare(b.session_time ?? "99"));

  return (
    <div className="pb-20">
      <AppHeader
        title="جلسات اليوم"
        action={
          <Button asChild size="sm">
            <Link href="/patients/new">
              <Plus /> مريض
            </Link>
          </Button>
        }
      />

      <div className="space-y-4 p-4">
        {/* الملخص السريع */}
        <div className="grid grid-cols-3 gap-2">
          <SummaryCard icon={<Users className="h-4 w-4" />} value={activePatients.length} label="مريض نشط" />
          <SummaryCard icon={<CalendarClock className="h-4 w-4" />} value={todaySessions.length} label="جلسة اليوم" />
          <SummaryCard
            icon={<Wallet className="h-4 w-4" />}
            value={formatMoney(totalRemaining)}
            label="مستحقات (ج)"
            tone="warning"
          />
        </div>

        {/* جلسات اليوم */}
        <div>
          <h2 className="mb-2 px-1 text-sm font-semibold text-muted-foreground">جلسات اليوم</h2>
          {todaySessions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                لا توجد جلسات اليوم
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {todaySessions.map((s) => (
                <Card key={s.id}>
                  <CardContent className="flex items-center gap-3 p-3">
                    <div className="flex w-14 shrink-0 flex-col items-center">
                      <span className="text-sm font-bold text-primary">{formatTime(s.session_time)}</span>
                    </div>
                    <div className="min-w-0 flex-1 border-r pr-3">
                      <div className="truncate font-medium">{s.patient_name}</div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {s.patient_area}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <CallButton phone={s.patient_phone} />
                      <WhatsAppButton phone={s.patient_phone} />
                      <Button asChild variant="outline" size="icon" aria-label="ملف المريض">
                        <Link href={`/patients/${s.patient_id}`}>
                          <FileText />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

function SummaryCard({
  icon,
  value,
  label,
  tone,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  tone?: "warning";
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-1 p-3 text-center">
        <div className={tone === "warning" ? "text-warning" : "text-primary"}>{icon}</div>
        <div className="text-xl font-bold leading-none">{value}</div>
        <div className="text-[11px] leading-tight text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

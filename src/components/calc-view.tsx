"use client";

import { useMemo, useState } from "react";
import { SessionStatus } from "@/lib/types";
import { formatMoney, toISODate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { CalendarRange, Calculator, Plus, X } from "lucide-react";

export interface CalcPatient {
  id: string;
  name: string;
  price: number; // سعر الجلسة بعد الخصم
}
export interface CalcSession {
  patient_id: string;
  session_date: string;
  status: SessionStatus;
  price: number; // بعد الخصم
}

type Preset = "week" | "month" | "custom";

function weekRange(): [string, string] {
  const today = new Date();
  const day = today.getDay();
  const diffToSat = (day + 1) % 7;
  const start = new Date(today);
  start.setDate(today.getDate() - diffToSat);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return [toISODate(start), toISODate(end)];
}

function monthRange(): [string, string] {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return [toISODate(start), toISODate(end)];
}

interface CalcRow {
  patientId: string;
  count: string;
}

export function CalcView({
  patients,
  sessions,
  names,
}: {
  patients: CalcPatient[];
  sessions: CalcSession[];
  names: Record<string, string>;
}) {
  const [preset, setPreset] = useState<Preset>("week");
  const [wStart, wEnd] = weekRange();
  const [mStart, mEnd] = monthRange();
  const [from, setFrom] = useState(wStart);
  const [to, setTo] = useState(wEnd);

  const range: [string, string] =
    preset === "week" ? [wStart, wEnd] : preset === "month" ? [mStart, mEnd] : [from, to];

  const inRange = useMemo(
    () =>
      sessions.filter(
        (s) =>
          s.session_date >= range[0] &&
          s.session_date <= range[1] &&
          s.status !== "cancelled" &&
          s.status !== "postponed"
      ),
    [sessions, range]
  );

  const total = inRange.reduce((sum, s) => sum + s.price, 0);

  const perPatient = useMemo(() => {
    const map = new Map<string, { count: number; sum: number }>();
    for (const s of inRange) {
      const cur = map.get(s.patient_id) ?? { count: 0, sum: 0 };
      cur.count += 1;
      cur.sum += s.price;
      map.set(s.patient_id, cur);
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, name: names[id] ?? "—", ...v }))
      .sort((a, b) => b.sum - a.sum);
  }, [inRange, names]);

  // حاسبة متعددة المرضى
  const [rows, setRows] = useState<CalcRow[]>([{ patientId: patients[0]?.id ?? "", count: "12" }]);

  function updateRow(i: number, patch: Partial<CalcRow>) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }
  function addRow() {
    setRows((r) => [...r, { patientId: patients[0]?.id ?? "", count: "12" }]);
  }
  function removeRow(i: number) {
    setRows((r) => r.filter((_, idx) => idx !== i));
  }

  const priceOf = (id: string) => patients.find((p) => p.id === id)?.price ?? 0;
  const rowTotal = (row: CalcRow) => priceOf(row.patientId) * (parseInt(row.count || "0", 10) || 0);
  const grandTotal = rows.reduce((s, r) => s + rowTotal(r), 0);

  return (
    <div className="space-y-5">
      {/* إيرادات الفترة */}
      <div>
        <h2 className="mb-2 flex items-center gap-2 px-1 text-sm font-semibold text-muted-foreground">
          <CalendarRange className="h-4 w-4" /> إيرادات الفترة
        </h2>

        <div className="mb-3 flex gap-2">
          <Button variant={preset === "week" ? "default" : "outline"} size="sm" className="flex-1" onClick={() => setPreset("week")}>هذا الأسبوع</Button>
          <Button variant={preset === "month" ? "default" : "outline"} size="sm" className="flex-1" onClick={() => setPreset("month")}>هذا الشهر</Button>
          <Button variant={preset === "custom" ? "default" : "outline"} size="sm" className="flex-1" onClick={() => setPreset("custom")}>تحديد</Button>
        </div>

        {preset === "custom" && (
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="from">من</Label>
              <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="to">إلى</Label>
              <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
        )}

        <Card>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-primary">{formatMoney(total)} ج</div>
            <div className="text-xs text-muted-foreground">{inRange.length} جلسة في الفترة المحددة</div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              محسوب بسعر الجلسة بعد الخصم، لكل الجلسات الفعلية بغضّ النظر عن طريقة الدفع أو التحصيل.
            </p>
          </CardContent>
        </Card>

        {perPatient.length > 0 && (
          <ul className="mt-2 divide-y rounded-xl border bg-card">
            {perPatient.map((p) => (
              <li key={p.id} className="flex items-center justify-between p-3 text-sm">
                <span className="font-medium">{p.name}</span>
                <span className="text-muted-foreground">
                  {p.count} جلسة · <span className="font-semibold text-foreground">{formatMoney(p.sum)} ج</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* حاسبة متعددة المرضى */}
      <div>
        <h2 className="mb-2 flex items-center gap-2 px-1 text-sm font-semibold text-muted-foreground">
          <Calculator className="h-4 w-4" /> حاسبة جلسات (مريض أو أكثر)
        </h2>
        <Card>
          <CardContent className="space-y-3 pt-4">
            {rows.map((row, i) => (
              <div key={i} className="flex items-end gap-2">
                <div className="flex-1">
                  <Label htmlFor={`p-${i}`}>المريض</Label>
                  <Select id={`p-${i}`} value={row.patientId} onChange={(e) => updateRow(i, { patientId: e.target.value })}>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatMoney(p.price)} ج)
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="w-20">
                  <Label htmlFor={`c-${i}`}>جلسات</Label>
                  <Input id={`c-${i}`} type="number" inputMode="numeric" min="0" value={row.count} onChange={(e) => updateRow(i, { count: e.target.value })} />
                </div>
                {rows.length > 1 && (
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeRow(i)}>
                    <X />
                  </Button>
                )}
              </div>
            ))}

            <Button variant="outline" className="w-full" onClick={addRow}>
              <Plus /> أضف مريض
            </Button>

            <div className="rounded-md bg-accent p-3 text-center">
              <span className="text-sm text-accent-foreground">الإجمالي: </span>
              <span className="text-xl font-bold text-primary">{formatMoney(grandTotal)} ج</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

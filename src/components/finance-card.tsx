"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPayment, quickPay } from "@/app/actions/sessions";
import { FinanceSummary, formatMoney } from "@/lib/utils";
import { Patient, PAYMENT_METHOD_LABELS } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, AlertTriangle, CheckCircle2 } from "lucide-react";

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={strong ? "text-base font-bold" : "text-sm font-medium"}>{value}</span>
    </div>
  );
}

export function FinanceCard({
  patient,
  finance,
}: {
  patient: Patient;
  finance: FinanceSummary;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // قيمة مقترحة لزر الدفع حسب طريقة الدفع
  const suggested =
    patient.payment_method === "advance"
      ? finance.remaining
      : patient.payment_method === "every_3_sessions"
        ? finance.dueNow
        : Math.round(finance.perSession);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createPayment(formData);
      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error ?? "حدث خطأ");
      }
    });
  }

  function handleQuickPay(amount: number, note: string) {
    setError(null);
    startTransition(async () => {
      const res = await quickPay(patient.id, amount, note);
      if (res.ok) router.refresh();
      else setError(res.error ?? "حدث خطأ");
    });
  }

  // نص الزر السريع حسب طريقة الدفع
  const quickLabel =
    patient.payment_method === "advance"
      ? "تحصيل المقدم بالكامل"
      : patient.payment_method === "every_3_sessions"
        ? "تحصيل المستحق الآن"
        : "سجّل دفعة جلسة";
  const quickNote =
    patient.payment_method === "advance"
      ? "تحصيل المقدم"
      : patient.payment_method === "every_3_sessions"
        ? "تحصيل مستحق"
        : "دفعة جلسة";
  const canQuickPay = suggested > 0 && finance.remaining > 0;

  return (
    <Card>
      <CardContent className="pt-4">
        <h2 className="mb-2 font-semibold">الحالة المالية</h2>
        <div className="mb-2 text-xs">
          <span className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">
            {PAYMENT_METHOD_LABELS[patient.payment_method]}
          </span>
        </div>

        {finance.hasDue && (
          <div className="mb-3 flex items-center gap-2 rounded-md bg-warning/15 p-3 text-sm font-medium text-warning">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            يوجد مبلغ مستحق للتحصيل: {formatMoney(finance.dueNow)} ج
          </div>
        )}

        <div className="divide-y">
          <Row label="سعر الجلسة" value={`${formatMoney(patient.session_price)} ج`} />
          <Row
            label="عدد الجلسات"
            value={
              finance.coursesCount > 1
                ? `${finance.billableSessions} (${finance.coursesCount} كورسات)`
                : "12"
            }
          />
          <Row label="الخصم" value={`${formatMoney(patient.discount)} ج`} />
          <Row label="الإجمالي المستحق" value={`${formatMoney(finance.total)} ج`} strong />
          <Row label="المدفوع" value={`${formatMoney(finance.paid)} ج`} />
          <Row label="المتبقي" value={`${formatMoney(finance.remaining)} ج`} strong />
        </div>

        {canQuickPay && (
          <Button
            variant="success"
            className="mt-4 w-full"
            size="lg"
            disabled={isPending}
            onClick={() => handleQuickPay(suggested, quickNote)}
          >
            <CheckCircle2 /> {quickLabel} ({formatMoney(suggested)} ج)
          </Button>
        )}

        <Button
          variant={canQuickPay ? "outline" : "default"}
          onClick={() => { setError(null); setOpen(true); }}
          className="mt-2 w-full"
          size="lg"
        >
          <Plus /> دفعة بمبلغ مختلف
        </Button>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تسجيل دفعة</DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} className="space-y-4">
            <input type="hidden" name="patient_id" value={patient.id} />
            <div>
              <Label htmlFor="amount">المبلغ (ج)</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                inputMode="numeric"
                min="1"
                required
                defaultValue={suggested > 0 ? suggested : ""}
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="note">ملاحظة</Label>
              <Input id="note" name="note" placeholder="اختياري" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={isPending}>
              {isPending ? "جارٍ الحفظ..." : "حفظ الدفعة"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

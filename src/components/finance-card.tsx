"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPayment, quickPay, deletePayment, updatePayment } from "@/app/actions/sessions";
import { FinanceSummary, formatMoney, formatArabicDate, todayISO, courseForDate } from "@/lib/utils";
import { Patient, Payment, Session, PAYMENT_METHOD_LABELS } from "@/lib/types";
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
import { Plus, AlertTriangle, CheckCircle2, Trash2, Pencil, ChevronDown, ChevronLeft } from "lucide-react";

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
  payments,
  sessions,
}: {
  patient: Patient;
  finance: FinanceSummary;
  payments: Payment[];
  sessions: Session[];
}) {
  const initMaxPayCourse = payments.length
    ? Math.max(...payments.map((p) => courseForDate(sessions, p.payment_date)))
    : 1;

  const [open, setOpen] = useState(false);
  const [openPay, setOpenPay] = useState<Set<number>>(new Set([initMaxPayCourse]));
  const [confirmQuick, setConfirmQuick] = useState(false);
  const [deleting, setDeleting] = useState<Payment | null>(null);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editNote, setEditNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const today = todayISO();
  const paidToday = payments.filter((p) => p.payment_date === today);
  const sortedPayments = [...payments].sort((a, b) =>
    a.created_at < b.created_at ? 1 : -1
  );

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

  function doQuickPay() {
    setError(null);
    startTransition(async () => {
      const res = await quickPay(patient.id, suggested, quickNote);
      if (res.ok) {
        setConfirmQuick(false);
        router.refresh();
      } else {
        setError(res.error ?? "حدث خطأ");
      }
    });
  }

  function doDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const res = await deletePayment(patient.id, deleting.id);
      if (res.ok) {
        setDeleting(null);
        router.refresh();
      } else {
        setError(res.error ?? "حدث خطأ");
      }
    });
  }

  function openEdit(p: Payment) {
    setError(null);
    setEditAmount(String(Number(p.amount)));
    setEditDate(p.payment_date);
    setEditNote(p.note ?? "");
    setEditing(p);
  }

  function doEdit() {
    if (!editing) return;
    startTransition(async () => {
      const res = await updatePayment(
        patient.id,
        editing.id,
        Number(editAmount || 0),
        editDate,
        editNote
      );
      if (res.ok) {
        setEditing(null);
        router.refresh();
      } else {
        setError(res.error ?? "حدث خطأ");
      }
    });
  }

  function togglePayCourse(n: number) {
    setOpenPay((prev) => {
      const next = new Set(prev);
      next.has(n) ? next.delete(n) : next.add(n);
      return next;
    });
  }

  // تجميع الدفعات حسب الكورس (من تاريخ كل دفعة)
  const payGroups = new Map<number, Payment[]>();
  for (const p of sortedPayments) {
    const c = courseForDate(sessions, p.payment_date);
    if (!payGroups.has(c)) payGroups.set(c, []);
    payGroups.get(c)!.push(p);
  }
  const payCourseNums = Array.from(payGroups.keys()).sort((a, b) => a - b);

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
          <Row label="الإجمالي قبل الخصم" value={`${formatMoney(finance.totalBeforeDiscount)} ج`} />
          <Row label="الخصم" value={`${formatMoney(finance.discountApplied)} ج`} />
          <Row label="الإجمالي بعد الخصم" value={`${formatMoney(finance.total)} ج`} strong />
          <Row label="المدفوع" value={`${formatMoney(finance.paid)} ج`} />
          <Row label="المتبقي" value={`${formatMoney(finance.remaining)} ج`} strong />
        </div>

        {canQuickPay && (
          <Button
            variant="success"
            className="mt-4 w-full"
            size="lg"
            disabled={isPending}
            onClick={() => { setError(null); setConfirmQuick(true); }}
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

        {/* سجل الدفعات مجمّعًا حسب الكورس */}
        {sortedPayments.length > 0 && (
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">الدفعات المسجلة</h3>
            {payCourseNums.map((courseNum) => {
              const list = payGroups.get(courseNum)!;
              const sum = list.reduce((s, p) => s + Number(p.amount), 0);
              const isOpen = openPay.has(courseNum);
              return (
                <div key={courseNum} className="overflow-hidden rounded-lg border">
                  <button
                    onClick={() => togglePayCourse(courseNum)}
                    className="flex w-full items-center gap-2 bg-secondary/50 p-2.5 text-right"
                  >
                    <div className="flex-1">
                      <span className="text-sm font-medium">دفعات كورس {courseNum}</span>
                      <span className="block text-xs text-muted-foreground">
                        {list.length} دفعة · {formatMoney(sum)} ج
                      </span>
                    </div>
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  {isOpen && (
                    <ul className="divide-y border-t">
                      {list.map((p) => (
                        <li key={p.id} className="flex items-center gap-2 p-2.5">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium">{formatMoney(Number(p.amount))} ج</div>
                            <div className="text-xs text-muted-foreground">
                              {formatArabicDate(p.payment_date)}
                              {p.note ? ` · ${p.note}` : ""}
                            </div>
                          </div>
                          <button
                            onClick={() => openEdit(p)}
                            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                            aria-label="تعديل الدفعة"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleting(p)}
                            className="flex h-8 w-8 items-center justify-center rounded-md text-destructive hover:bg-accent"
                            aria-label="حذف الدفعة"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* تأكيد التحصيل السريع */}
      <Dialog open={confirmQuick} onOpenChange={setConfirmQuick}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد تسجيل الدفعة</DialogTitle>
          </DialogHeader>
          <p className="text-sm">
            هيتم تسجيل دفعة بقيمة <span className="font-bold">{formatMoney(suggested)} ج</span>.
          </p>
          {paidToday.length > 0 && (
            <div className="flex items-start gap-2 rounded-md bg-warning/15 p-3 text-sm text-warning">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                تنبيه: فيه {paidToday.length} دفعة اتسجلت النهارده بالفعل
                (إجمالي {formatMoney(paidToday.reduce((s, p) => s + Number(p.amount), 0))} ج).
                متأكد إنك عايز تسجّل تاني؟
              </span>
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button className="flex-1" disabled={isPending} onClick={doQuickPay}>
              {isPending ? "جارٍ الحفظ..." : "تأكيد"}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setConfirmQuick(false)}>
              إلغاء
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* حذف دفعة */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف الدفعة</DialogTitle>
          </DialogHeader>
          <p className="text-sm">
            حذف دفعة بقيمة{" "}
            <span className="font-bold">{deleting ? formatMoney(Number(deleting.amount)) : ""} ج</span>؟
            لا يمكن التراجع.
          </p>
          <div className="flex gap-2">
            <Button variant="destructive" className="flex-1" disabled={isPending} onClick={doDelete}>
              {isPending ? "جارٍ الحذف..." : "نعم، احذف"}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setDeleting(null)}>
              إلغاء
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* تعديل دفعة */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل الدفعة</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="edit-amount">المبلغ (ج)</Label>
              <Input id="edit-amount" type="number" inputMode="numeric" min="1" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="edit-date">تاريخ الدفعة</Label>
              <Input id="edit-date" type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
              {editDate && (
                <p className="mt-1 text-xs text-muted-foreground">
                  هتتحسب على: كورس {courseForDate(sessions, editDate)}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="edit-note">الملاحظة</Label>
              <Input id="edit-note" value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="اختياري" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" size="lg" disabled={isPending || !editDate} onClick={doEdit}>
              {isPending ? "جارٍ الحفظ..." : "حفظ التعديل"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تسجيل دفعة</DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} className="space-y-4">
            <input type="hidden" name="patient_id" value={patient.id} />
            <div>
              <Label htmlFor="amount">المبلغ (ج)</Label>
              <Input id="amount" name="amount" type="number" inputMode="numeric" min="1" required defaultValue={suggested > 0 ? suggested : ""} autoFocus />
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

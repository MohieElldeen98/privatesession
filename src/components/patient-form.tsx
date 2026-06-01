"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { ActionState } from "@/app/actions/patients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ChecklistField } from "@/components/checklist-field";
import { PricingFields } from "@/components/pricing-fields";
import { todayISO } from "@/lib/utils";
import {
  DAYS_SYSTEM_LABELS,
  PAYMENT_METHOD_LABELS,
  DEFAULT_OPERATIONS,
  DEFAULT_SYMPTOMS,
  DEFAULT_TREATMENT_PROGRAM,
  Patient,
} from "@/lib/types";
import { AlertCircle } from "lucide-react";

type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "جارٍ الحفظ..." : label}
    </Button>
  );
}

export function PatientForm({
  action,
  patient,
  submitLabel = "حفظ وإنشاء 12 جلسة",
}: {
  action: FormAction;
  patient?: Patient;
  submitLabel?: string;
}) {
  const [state, formAction] = useFormState<ActionState, FormData>(action, null);
  const isEdit = !!patient;

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.error}
        </div>
      )}

      <Card>
        <CardContent className="space-y-4 pt-4">
          <div>
            <Label htmlFor="name">اسم المريض</Label>
            <Input id="name" name="name" required defaultValue={patient?.name} placeholder="الاسم بالكامل" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="phone">رقم الهاتف</Label>
              <Input id="phone" name="phone" type="tel" inputMode="tel" required defaultValue={patient?.phone} placeholder="01xxxxxxxxx" />
            </div>
            <div>
              <Label htmlFor="age">السن</Label>
              <Input id="age" name="age" type="number" inputMode="numeric" min="0" defaultValue={patient?.age ?? ""} placeholder="—" />
            </div>
            <div>
              <Label htmlFor="gender">النوع</Label>
              <Select id="gender" name="gender" defaultValue={patient?.gender ?? ""}>
                <option value="">—</option>
                <option value="male">ذكر</option>
                <option value="female">أنثى</option>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="area">المنطقة</Label>
            <Input id="area" name="area" required defaultValue={patient?.area} placeholder="مثال: مدينة نصر" />
          </div>
          <div>
            <Label htmlFor="street">العنوان التفصيلي</Label>
            <Input id="street" name="street" defaultValue={patient?.street ?? ""} placeholder="مثال: عباس العقاد" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-4">
          <div>
            <Label htmlFor="course_start_date">تاريخ بداية الكورس</Label>
            <Input
              id="course_start_date"
              name="course_start_date"
              type="date"
              required
              defaultValue={patient?.course_start_date ?? todayISO()}
            />
          </div>
          <div>
            <Label htmlFor="days_system">نظام الأيام</Label>
            <Select id="days_system" name="days_system" required defaultValue={patient?.days_system ?? "sat_mon_wed"}>
              <option value="sat_mon_wed">{DAYS_SYSTEM_LABELS.sat_mon_wed}</option>
              <option value="sun_tue_thu">{DAYS_SYSTEM_LABELS.sun_tue_thu}</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="default_time">ميعاد الجلسة (اختياري)</Label>
            <Input id="default_time" name="default_time" type="time" defaultValue={patient?.default_time ?? ""} />
            {!isEdit && (
              <p className="mt-1 text-xs text-muted-foreground">يتطبّق على كل الجلسات، وتقدر تعدّله لأي جلسة بعدين.</p>
            )}
          </div>
          {isEdit && (
            <p className="text-xs text-muted-foreground">
              تعديل التاريخ/الأيام هنا لا يحرّك الجلسات الحالية — بيأثّر على التجديدات القادمة فقط.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <PricingFields defaultPrice={patient?.session_price} defaultDiscount={patient?.discount ?? 0} />
          </div>
          <div>
            <Label htmlFor="payment_method">طريقة الدفع</Label>
            <Select id="payment_method" name="payment_method" required defaultValue={patient?.payment_method ?? "advance"}>
              <option value="advance">{PAYMENT_METHOD_LABELS.advance}</option>
              <option value="per_session">{PAYMENT_METHOD_LABELS.per_session}</option>
              <option value="every_3_sessions">{PAYMENT_METHOD_LABELS.every_3_sessions}</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-4">
          <h2 className="font-semibold">الحالة الطبية</h2>
          <div>
            <Label htmlFor="diagnosis">التشخيص</Label>
            <Textarea id="diagnosis" name="diagnosis" defaultValue={patient?.diagnosis ?? ""} placeholder="اختياري" />
          </div>
          <div>
            <Label htmlFor="present_history">Present history</Label>
            <Textarea id="present_history" name="present_history" defaultValue={patient?.present_history ?? ""} placeholder="اختياري" />
          </div>
          <div>
            <Label htmlFor="past_history">Past history</Label>
            <Textarea id="past_history" name="past_history" defaultValue={patient?.past_history ?? ""} placeholder="اختياري" />
          </div>
          <ChecklistField name="symptoms" label="الأعراض" options={DEFAULT_SYMPTOMS} initial={patient?.symptoms ?? []} />
          <ChecklistField name="operations" label="العمليات السابقة" options={DEFAULT_OPERATIONS} initial={patient?.operations ?? []} />
          <ChecklistField name="treatment_program" label="برنامج العلاج الطبيعي" options={DEFAULT_TREATMENT_PROGRAM} initial={patient?.treatment_program ?? []} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <Label htmlFor="notes">معلومات أخرى</Label>
          <Textarea id="notes" name="notes" defaultValue={patient?.notes ?? ""} placeholder="أي ملاحظات إضافية عن المريض" />
        </CardContent>
      </Card>

      <SubmitButton label={submitLabel} />
    </form>
  );
}

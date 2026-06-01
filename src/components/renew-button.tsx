"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { renewCourse } from "@/app/actions/patients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { RefreshCw } from "lucide-react";

export function RenewButton({
  patientId,
  nextCourse,
  defaultTime,
}: {
  patientId: string;
  nextCourse: number;
  defaultTime: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [auto, setAuto] = useState(true); // متابعة بعد آخر جلسة أم تحديد تاريخ
  const [date, setDate] = useState("");
  const [time, setTime] = useState(defaultTime ?? "");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    startTransition(async () => {
      await renewCourse(patientId, auto ? undefined : date || undefined, time || undefined);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="secondary" className="w-full" onClick={() => setOpen(true)}>
        <RefreshCw /> تجديد — إضافة كورس جديد (12 جلسة)
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تجديد الكورس (كورس رقم {nextCourse})</DialogTitle>
            <DialogDescription>
              اختر بداية الكورس الجديد، والبرنامج هيظبط الـ 12 جلسة على نفس نظام الأيام تلقائيًا.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex gap-2">
              <Button variant={auto ? "default" : "outline"} className="flex-1" size="sm" onClick={() => setAuto(true)}>
                يكمل بعد آخر جلسة
              </Button>
              <Button variant={!auto ? "default" : "outline"} className="flex-1" size="sm" onClick={() => setAuto(false)}>
                أحدّد التاريخ
              </Button>
            </div>

            {!auto && (
              <div>
                <Label htmlFor="renew-date">تاريخ أول جلسة في الكورس الجديد</Label>
                <Input id="renew-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            )}

            <div>
              <Label htmlFor="renew-time">ميعاد الجلسات (اختياري)</Label>
              <Input id="renew-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>

            <Button className="w-full" disabled={isPending || (!auto && !date)} onClick={submit}>
              {isPending ? "جارٍ الإنشاء..." : "أضف الكورس"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

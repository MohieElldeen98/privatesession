"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { deletePatient } from "@/app/actions/patients";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Pencil, Trash2 } from "lucide-react";

export function PatientActions({ patientId, name }: { patientId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      <Button asChild variant="outline" className="flex-1">
        <Link href={`/patients/${patientId}/edit`}>
          <Pencil /> تعديل
        </Link>
      </Button>
      <Button variant="outline" className="flex-1 text-destructive" onClick={() => setOpen(true)}>
        <Trash2 /> حذف
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف المريض</DialogTitle>
            <DialogDescription>
              هيتم حذف «{name}» وكل الجلسات والدفعات والملفات الخاصة به نهائيًا. لا يمكن التراجع.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              className="flex-1"
              disabled={isPending}
              onClick={() => startTransition(async () => { await deletePatient(patientId); })}
            >
              {isPending ? "جارٍ الحذف..." : "نعم، احذف"}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

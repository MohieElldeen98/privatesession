"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { bulkUpdateStatus, quickPay } from "@/app/actions/sessions";
import { Button } from "@/components/ui/button";
import { Check, Banknote, FileText } from "lucide-react";

export function TodaySessionActions({
  sessionId,
  patientId,
  isDone,
  payAmount,
  payNote,
  canPay,
}: {
  sessionId: string;
  patientId: string;
  isDone: boolean;
  payAmount: number;
  payNote: string;
  canPay: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function markDone() {
    startTransition(async () => {
      await bulkUpdateStatus(patientId, [sessionId], "done");
      router.refresh();
    });
  }

  function pay() {
    startTransition(async () => {
      await quickPay(patientId, payAmount, payNote);
      router.refresh();
    });
  }

  return (
    <div className="flex shrink-0 gap-1.5">
      <Button
        variant={isDone ? "success" : "outline"}
        size="icon"
        disabled={isPending}
        onClick={markDone}
        aria-label="تمت الجلسة"
        title="تمت الجلسة"
      >
        <Check className={isDone ? undefined : "text-success"} />
      </Button>
      <Button
        variant="outline"
        size="icon"
        disabled={isPending || !canPay}
        onClick={pay}
        aria-label="تسجيل دفعة"
        title="تسجيل دفعة الجلسة"
      >
        <Banknote className="text-primary" />
      </Button>
      <Button asChild variant="outline" size="icon" aria-label="ملف المريض">
        <Link href={`/patients/${patientId}`}>
          <FileText />
        </Link>
      </Button>
    </div>
  );
}

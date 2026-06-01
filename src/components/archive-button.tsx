"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleArchive } from "@/app/actions/patients";
import { Button } from "@/components/ui/button";
import { Archive, ArchiveRestore } from "lucide-react";

export function ArchiveButton({
  patientId,
  archived,
}: {
  patientId: string;
  archived: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="outline"
      className="w-full"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await toggleArchive(patientId, !archived);
          router.refresh();
        })
      }
    >
      {archived ? (
        <>
          <ArchiveRestore /> إعادة من الأرشيف
        </>
      ) : (
        <>
          <Archive /> نقل إلى الأرشيف
        </>
      )}
    </Button>
  );
}

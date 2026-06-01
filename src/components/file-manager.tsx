"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadFile, deleteFile } from "@/app/actions/files";
import { PatientFile } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Paperclip, Upload, Trash2, FileText, ImageIcon } from "lucide-react";

function isImage(name: string) {
  return /\.(png|jpe?g|gif|webp|heic)$/i.test(name);
}

export function FileManager({
  patientId,
  files,
}: {
  patientId: string;
  files: PatientFile[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    startTransition(async () => {
      const res = await uploadFile(patientId, fd);
      if (res.ok) router.refresh();
      else setError(res.error ?? "تعذّر الرفع");
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  function onDelete(f: PatientFile) {
    setError(null);
    startTransition(async () => {
      const res = await deleteFile(patientId, f.id, f.path);
      if (res.ok) router.refresh();
      else setError(res.error ?? "تعذّر الحذف");
    });
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <h2 className="mb-2 flex items-center gap-2 font-semibold">
          <Paperclip className="h-4 w-4" /> الملفات والأشعة
        </h2>

        <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={onPick} />
        <Button variant="outline" className="w-full" disabled={isPending} onClick={() => inputRef.current?.click()}>
          <Upload /> {isPending ? "جارٍ الرفع..." : "رفع ملف (صورة أو PDF)"}
        </Button>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

        {files.length > 0 && (
          <ul className="mt-3 space-y-2">
            {files.map((f) => (
              <li key={f.id} className="overflow-hidden rounded-lg border">
                {isImage(f.name) && f.signed_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <a href={f.signed_url} target="_blank" rel="noopener noreferrer">
                    <img src={f.signed_url} alt={f.name} className="max-h-48 w-full object-cover" />
                  </a>
                ) : null}
                <div className="flex items-center gap-2 p-2.5">
                  {isImage(f.name) ? (
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  )}
                  <a
                    href={f.signed_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 flex-1 truncate text-sm text-primary"
                  >
                    {f.name}
                  </a>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" disabled={isPending} onClick={() => onDelete(f)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

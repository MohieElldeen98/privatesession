"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase";

export type FileActionResult = { ok: boolean; error?: string };

const BUCKET = "patient-files";

export async function uploadFile(
  patientId: string,
  formData: FormData
): Promise<FileActionResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "اختر ملفًا أولاً" };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { ok: false, error: "حجم الملف أكبر من 10 ميجا" };
  }

  const supabase = createServerSupabase();
  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${patientId}/${Date.now()}-${safeName}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type || "application/octet-stream" });
  if (upErr) return { ok: false, error: "تعذّر رفع الملف: " + upErr.message };

  const { error: dbErr } = await supabase
    .from("patient_files")
    .insert({ patient_id: patientId, path, name: file.name });
  if (dbErr) return { ok: false, error: dbErr.message };

  revalidatePath(`/patients/${patientId}`);
  return { ok: true };
}

export async function deleteFile(
  patientId: string,
  fileId: string,
  path: string
): Promise<FileActionResult> {
  const supabase = createServerSupabase();
  await supabase.storage.from(BUCKET).remove([path]);
  const { error } = await supabase.from("patient_files").delete().eq("id", fileId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/patients/${patientId}`);
  return { ok: true };
}

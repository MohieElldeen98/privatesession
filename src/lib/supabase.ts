import "server-only";
import { createClient } from "@supabase/supabase-js";

// عميل Supabase للسيرفر فقط (Server Components / Server Actions).
// يستخدم مفتاح الخدمة الذي يتجاوز RLS — لا تستخدمه أبدًا في كود العميل.
export function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "مفاتيح Supabase غير موجودة. أضف NEXT_PUBLIC_SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY في .env.local"
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

"use client";

import { createBrowserClient } from "@supabase/ssr";

// عميل المتصفح لتسجيل الدخول/الخروج (يستخدم المفتاح العام anon — آمن للعرض)
export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

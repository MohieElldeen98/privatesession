import { LoginForm } from "@/components/login-form";
import { Activity } from "lucide-react";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col justify-center p-6">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Activity className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold">جلسات العلاج الطبيعي</h1>
        <p className="text-sm text-muted-foreground">سجّل الدخول للمتابعة</p>
      </div>
      <LoginForm />
    </div>
  );
}

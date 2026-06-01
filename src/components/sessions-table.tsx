"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Session, SESSION_STATUS_LABELS, SessionStatus } from "@/lib/types";
import { updateSession, bulkUpdateStatus } from "@/app/actions/sessions";
import { formatArabicDate, formatTime } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronDown, CheckSquare, Square, X } from "lucide-react";

const STATUSES: SessionStatus[] = ["done", "pending", "postponed", "cancelled"];

export function SessionsTable({
  sessions,
  patientId,
}: {
  sessions: Session[];
  patientId: string;
}) {
  const [active, setActive] = useState<Session | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const courses = Array.from(new Set(sessions.map((s) => s.course_number))).sort((a, b) => a - b);
  const maxCourse = courses.length ? Math.max(...courses) : 1;

  // الكورس الحالي مفتوح افتراضيًا، الباقي مطوي
  const [openCourses, setOpenCourses] = useState<Set<number>>(new Set([maxCourse]));
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<SessionStatus>("done");

  function toggleCourse(n: number) {
    setOpenCourses((prev) => {
      const next = new Set(prev);
      next.has(n) ? next.delete(n) : next.add(n);
      return next;
    });
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await updateSession(formData);
      if (res.ok) {
        setActive(null);
        router.refresh();
      } else {
        setError(res.error ?? "حدث خطأ");
      }
    });
  }

  function applyBulk() {
    if (selectedIds.size === 0) return;
    startTransition(async () => {
      const res = await bulkUpdateStatus(patientId, Array.from(selectedIds), bulkStatus);
      if (res.ok) {
        setSelectedIds(new Set());
        setSelectMode(false);
        router.refresh();
      } else {
        setError(res.error ?? "حدث خطأ");
      }
    });
  }

  return (
    <>
      {/* شريط أدوات التحديد */}
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-muted-foreground">الجلسات</h2>
        {selectMode ? (
          <button
            onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }}
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground"
          >
            <X className="h-4 w-4" /> إلغاء التحديد
          </button>
        ) : (
          <button
            onClick={() => setSelectMode(true)}
            className="flex items-center gap-1 text-sm font-medium text-primary"
          >
            <CheckSquare className="h-4 w-4" /> تحديد متعدد
          </button>
        )}
      </div>

      <div className="space-y-4">
        {courses.map((courseNum) => {
          const courseSessions = sessions.filter((s) => s.course_number === courseNum);
          const done = courseSessions.filter((s) => s.status === "done").length;
          const finished = courseSessions.every(
            (s) => s.status === "done" || s.status === "cancelled"
          );
          const isOpen = openCourses.has(courseNum);
          const cumulative = 12 * courseNum;
          return (
            <div key={courseNum} className="overflow-hidden rounded-xl border bg-card">
              <button
                onClick={() => toggleCourse(courseNum)}
                className="flex w-full items-center gap-2 p-3 text-right"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">كورس رقم {courseNum}</span>
                    <span
                      className={
                        finished ? "text-xs font-medium text-success" : "text-xs font-medium text-primary"
                      }
                    >
                      {finished ? "انتهى" : `${done}/12 تمت`}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">إجمالي {cumulative} جلسة</span>
                </div>
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {isOpen && (
                <ul className="divide-y border-t">
                  {courseSessions.map((s) => {
                    const checked = selectedIds.has(s.id);
                    return (
                      <li key={s.id}>
                        <button
                          onClick={() => {
                            if (selectMode) toggleSelect(s.id);
                            else { setError(null); setActive(s); }
                          }}
                          className="flex w-full items-center gap-3 p-3 text-right transition-colors hover:bg-accent/40"
                        >
                          {selectMode &&
                            (checked ? (
                              <CheckSquare className="h-5 w-5 shrink-0 text-primary" />
                            ) : (
                              <Square className="h-5 w-5 shrink-0 text-muted-foreground" />
                            ))}
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                            {s.session_number}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium">{formatArabicDate(s.session_date)}</div>
                            <div className="text-xs text-muted-foreground">{formatTime(s.session_time)}</div>
                          </div>
                          <StatusBadge status={s.status} />
                          {!selectMode && <ChevronLeft className="h-4 w-4 text-muted-foreground" />}
                        </button>
                        {s.notes && (
                          <p className="-mt-1 px-3 pb-2 pr-14 text-xs text-muted-foreground">{s.notes}</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="mt-2 px-1 text-sm text-destructive">{error}</p>}

      {/* شريط تطبيق الحالة على المحدد */}
      {selectMode && selectedIds.size > 0 && (
        <div className="fixed bottom-16 right-1/2 z-40 w-full max-w-md translate-x-1/2 border-t bg-card p-3 shadow-lg">
          <div className="mb-2 text-sm font-medium">المحدد: {selectedIds.size} جلسة</div>
          <div className="flex gap-2">
            <Select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as SessionStatus)} className="flex-1">
              {STATUSES.map((st) => (
                <option key={st} value={st}>{SESSION_STATUS_LABELS[st]}</option>
              ))}
            </Select>
            <Button onClick={applyBulk} disabled={isPending}>
              {isPending ? "..." : "تطبيق"}
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>الجلسة رقم {active?.session_number}</DialogTitle>
          </DialogHeader>
          {active && (
            <form action={handleSubmit} className="space-y-4">
              <input type="hidden" name="session_id" value={active.id} />
              <input type="hidden" name="patient_id" value={patientId} />
              <div>
                <Label htmlFor="status">الحالة</Label>
                <Select id="status" name="status" defaultValue={active.status}>
                  {STATUSES.map((st) => (
                    <option key={st} value={st}>{SESSION_STATUS_LABELS[st]}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="session_time">الوقت</Label>
                <Input id="session_time" name="session_time" type="time" defaultValue={active.session_time ?? ""} />
              </div>
              <div>
                <Label htmlFor="notes">ملاحظة</Label>
                <Textarea id="notes" name="notes" defaultValue={active.notes ?? ""} placeholder="اختياري" />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" size="lg" className="w-full" disabled={isPending}>
                {isPending ? "جارٍ الحفظ..." : "حفظ"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

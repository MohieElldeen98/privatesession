"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Session, SESSION_STATUS_LABELS, SessionStatus } from "@/lib/types";
import { updateSession, bulkUpdateStatus, deleteSession } from "@/app/actions/sessions";
import { deleteCourse, rescheduleCourse, endCourse } from "@/app/actions/patients";
import { formatArabicDate, formatTime, todayISO } from "@/lib/utils";
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
import { ChevronLeft, ChevronDown, CheckSquare, Square, X, Pencil, Trash2, Flag } from "lucide-react";

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

  // إجمالي تراكمي بالجلسات الفعلية (مش الملغية/المؤجلة) لكل كورس
  const cumulativeActive = new Map<number, number>();
  {
    let running = 0;
    for (const c of courses) {
      running += sessions.filter(
        (s) => s.course_number === c && s.status !== "cancelled" && s.status !== "postponed"
      ).length;
      cumulativeActive.set(c, running);
    }
  }

  // الكورس الحالي مفتوح افتراضيًا، الباقي مطوي
  const [openCourses, setOpenCourses] = useState<Set<number>>(new Set([maxCourse]));
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<SessionStatus>("done");

  // تعديل/حذف/إنهاء كورس
  const [editCourse, setEditCourse] = useState<number | null>(null);
  const [delCourse, setDelCourse] = useState<number | null>(null);
  const [delSession, setDelSession] = useState<Session | null>(null);
  const [endC, setEndC] = useState<number | null>(null);
  const [reDate, setReDate] = useState(todayISO());
  const [reTime, setReTime] = useState("");

  function doReschedule() {
    if (editCourse == null) return;
    startTransition(async () => {
      await rescheduleCourse(patientId, editCourse, reDate, reTime || undefined);
      setEditCourse(null);
      router.refresh();
    });
  }

  function doDeleteCourse() {
    if (delCourse == null) return;
    startTransition(async () => {
      await deleteCourse(patientId, delCourse);
      setDelCourse(null);
      router.refresh();
    });
  }

  function doDeleteSession() {
    if (!delSession) return;
    startTransition(async () => {
      const res = await deleteSession(patientId, delSession.id);
      if (res.ok) {
        setDelSession(null);
        router.refresh();
      } else {
        setError(res.error ?? "حدث خطأ");
      }
    });
  }

  function doEndCourse() {
    if (endC == null) return;
    startTransition(async () => {
      await endCourse(patientId, endC);
      setEndC(null);
      router.refresh();
    });
  }

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
          const activeInCourse = courseSessions.filter(
            (s) => s.status !== "cancelled" && s.status !== "postponed"
          ).length;
          const hasPending = courseSessions.some((s) => s.status === "pending");
          const finished = courseSessions.every(
            (s) => s.status === "done" || s.status === "cancelled"
          );
          const isOpen = openCourses.has(courseNum);
          const cumulative = cumulativeActive.get(courseNum) ?? activeInCourse;
          return (
            <div key={courseNum} className="overflow-hidden rounded-xl border bg-card">
              <div className="flex items-center gap-1 p-3">
                <button onClick={() => toggleCourse(courseNum)} className="flex flex-1 items-center gap-2 text-right">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">كورس رقم {courseNum}</span>
                      <span
                        className={
                          finished ? "text-xs font-medium text-success" : "text-xs font-medium text-primary"
                        }
                      >
                        {finished ? "انتهى" : `${done}/${activeInCourse} تمت`}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">إجمالي {cumulative} جلسة</span>
                  </div>
                </button>
                <button
                  onClick={() => { setReDate(courseSessions[0]?.session_date ?? todayISO()); setReTime(""); setEditCourse(courseNum); }}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                  aria-label="تعديل مواعيد الكورس"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDelCourse(courseNum)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-destructive hover:bg-accent"
                  aria-label="حذف الكورس"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button onClick={() => toggleCourse(courseNum)} className="flex h-8 w-8 items-center justify-center" aria-label="فتح/طي">
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </div>

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

              {isOpen && hasPending && (
                <div className="border-t p-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-warning"
                    onClick={() => setEndC(courseNum)}
                  >
                    <Flag /> إنهاء الكورس (إلغاء الجلسات المتبقية)
                  </Button>
                </div>
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

      {/* تعديل مواعيد كورس */}
      <Dialog open={editCourse != null} onOpenChange={(o) => !o && setEditCourse(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل مواعيد كورس رقم {editCourse}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              هيتم إعادة توزيع تواريخ جلسات الكورس بدءًا من التاريخ ده على نفس نظام الأيام، مع الحفاظ على حالة كل جلسة.
            </p>
            <div>
              <Label htmlFor="re-date">تاريخ أول جلسة</Label>
              <Input id="re-date" type="date" value={reDate} onChange={(e) => setReDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="re-time">الميعاد (اختياري)</Label>
              <Input id="re-time" type="time" value={reTime} onChange={(e) => setReTime(e.target.value)} />
            </div>
            <Button className="w-full" disabled={isPending || !reDate} onClick={doReschedule}>
              {isPending ? "جارٍ الحفظ..." : "حفظ المواعيد"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* إنهاء كورس */}
      <Dialog open={endC != null} onOpenChange={(o) => !o && setEndC(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إنهاء كورس رقم {endC}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            هيتم إلغاء كل الجلسات اللي لسه ما اتعملتش في الكورس ده (المريض خلّص بدري أو ربنا شفاه)،
            والحساب المالي هيتحسب على الجلسات اللي اتعملت فعلًا بس. الجلسات اللي تمت هتفضل زي ما هي.
          </p>
          <div className="flex gap-2">
            <Button className="flex-1" disabled={isPending} onClick={doEndCourse}>
              {isPending ? "جارٍ الإنهاء..." : "نعم، أنهِ الكورس"}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setEndC(null)}>
              إلغاء
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* حذف كورس */}
      <Dialog open={delCourse != null} onOpenChange={(o) => !o && setDelCourse(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف كورس رقم {delCourse}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            هيتم حذف كل جلسات الكورس ده نهائيًا، وباقي الكورسات هيُعاد ترقيمها. لا يمكن التراجع.
          </p>
          <div className="flex gap-2">
            <Button variant="destructive" className="flex-1" disabled={isPending} onClick={doDeleteCourse}>
              {isPending ? "جارٍ الحذف..." : "نعم، احذف الكورس"}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setDelCourse(null)}>
              إلغاء
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full text-destructive"
                disabled={isPending}
                onClick={() => { setDelSession(active); setActive(null); }}
              >
                <Trash2 /> حذف الجلسة
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* حذف جلسة */}
      <Dialog open={!!delSession} onOpenChange={(o) => !o && setDelSession(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف الجلسة رقم {delSession?.session_number}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            هيتم حذف الجلسة دي نهائيًا من الكورس. لا يمكن التراجع.
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button variant="destructive" className="flex-1" disabled={isPending} onClick={doDeleteSession}>
              {isPending ? "جارٍ الحذف..." : "نعم، احذف الجلسة"}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setDelSession(null)}>
              إلغاء
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

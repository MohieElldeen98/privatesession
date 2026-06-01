import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  DaysSystem,
  Patient,
  Payment,
  Session,
  TOTAL_SESSIONS,
} from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ---------- التواريخ ----------
// خريطة أيام الأسبوع حسب getDay: الأحد=0 .. السبت=6
const DAY_MAP: Record<DaysSystem, number[]> = {
  sat_mon_wed: [6, 1, 3], // السبت، الاثنين، الأربعاء
  sun_tue_thu: [0, 2, 4], // الأحد، الثلاثاء، الخميس
};

// صيغة تاريخ محلية YYYY-MM-DD بدون مشاكل المناطق الزمنية
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  const cairoDate = new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "Africa/Cairo",
    })
  );

  return toISODate(cairoDate);
}

// توليد تواريخ 12 جلسة بدءًا من تاريخ البداية حسب نظام الأيام
export function generateSessionDates(
  startISO: string,
  system: DaysSystem,
  count: number = TOTAL_SESSIONS
): string[] {
  const days = DAY_MAP[system];
  const dates: string[] = [];
  const cursor = new Date(`${startISO}T12:00:00`);

  // حد أمان لتجنب أي حلقة لا نهائية
  let guard = 0;
  while (dates.length < count && guard < 400) {
    if (days.includes(cursor.getDay())) {
      dates.push(toISODate(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
    guard++;
  }
  return dates;
}

// توليد تواريخ جلسات تبدأ بعد تاريخ معيّن (للجلسات التعويضية والتجديد)
export function nextSessionDatesAfter(
  afterISO: string,
  system: DaysSystem,
  count: number
): string[] {
  const start = new Date(`${afterISO}T12:00:00`);
  start.setDate(start.getDate() + 1);
  return generateSessionDates(toISODate(start), system, count);
}

const AR_DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export function formatArabicDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  const dayName = AR_DAYS[d.getDay()];
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  return `${dayName} ${day}/${month}/${year}`;
}

export function formatTime(time: string | null): string {
  if (!time) return "—";
  const [hStr, m] = time.split(":");
  let h = parseInt(hStr, 10);
  const period = h >= 12 ? "م" : "ص";
  h = h % 12 || 12;
  return `${h}:${m} ${period}`;
}

export function formatMoney(n: number): string {
  return new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(
    Math.round(n)
  );
}

// ---------- الحسابات المالية ----------
export interface FinanceSummary {
  total: number; // إجمالي المستحق بعد الخصم (لكل الكورسات)
  totalBeforeDiscount: number; // الإجمالي قبل الخصم
  discountApplied: number; // إجمالي الخصم المطبّق (الخصم × عدد الكورسات)
  paid: number; // المدفوع
  remaining: number; // المتبقي
  perSession: number; // سعر الجلسة الفعلي بعد توزيع الخصم
  doneCount: number; // عدد الجلسات التي تمت
  coursesCount: number; // عدد الكورسات
  billableSessions: number; // عدد الجلسات المحاسَب عليها (12 × عدد الكورسات)
  // مبلغ مستحق للتحصيل الآن (لطريقة "مؤخر كل 3 جلسات")
  dueNow: number;
  hasDue: boolean;
}

// أقصى رقم كورس موجود في الجلسات (الكورسات تبدأ من 1)
export function getCoursesCount(sessions: Session[]): number {
  if (sessions.length === 0) return 1;
  return Math.max(...sessions.map((s) => s.course_number ?? 1));
}

// تاريخ بداية كل كورس
export function courseStartDates(sessions: Session[]): Map<number, string> {
  const m = new Map<number, string>();
  for (const s of sessions) {
    const cur = m.get(s.course_number);
    if (!cur || s.session_date < cur) m.set(s.course_number, s.session_date);
  }
  return m;
}

// تحديد الكورس الذي تتبعه دفعة بناءً على تاريخها:
// الكورس صاحب أحدث تاريخ بداية أقل من أو يساوي تاريخ الدفعة
export function courseForDate(sessions: Session[], dateISO: string): number {
  const starts = Array.from(courseStartDates(sessions).entries()).sort((a, b) =>
    a[1] < b[1] ? -1 : 1
  );
  if (starts.length === 0) return 1;
  let result = starts[0][0];
  for (const [num, start] of starts) {
    if (start <= dateISO) result = num;
    else break;
  }
  return result;
}

export function calcFinance(
  patient: Patient,
  sessions: Session[],
  payments: Payment[]
): FinanceSummary {
  const coursesCount = getCoursesCount(sessions);
  const billableSessions = TOTAL_SESSIONS * coursesCount;
  // الخصم يُطبّق على كل كورس على حدة
  const totalBeforeDiscount = patient.session_price * billableSessions;
  const discountApplied = patient.discount * coursesCount;
  const total = totalBeforeDiscount - discountApplied;
  const paid = payments.reduce((s, p) => s + Number(p.amount), 0);
  const remaining = Math.max(total - paid, 0);
  const perSession = total / billableSessions;
  const doneCount = sessions.filter((s) => s.status === "done").length;

  let dueNow = 0;
  let hasDue = false;

  if (patient.payment_method === "every_3_sessions") {
    // المبلغ القابل للتحصيل = عدد الجلسات المكتملة (مقربة لأقرب 3) × سعر الجلسة الفعلي
    const collectibleSessions = Math.floor(doneCount / 3) * 3;
    const collectible = collectibleSessions * perSession;
    dueNow = Math.max(Math.round(collectible - paid), 0);
    hasDue = dueNow > 0;
  }

  return {
    total,
    totalBeforeDiscount,
    discountApplied,
    paid,
    remaining,
    perSession,
    doneCount,
    coursesCount,
    billableSessions,
    dueNow,
    hasDue,
  };
}

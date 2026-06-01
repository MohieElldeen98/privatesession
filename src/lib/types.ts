export type DaysSystem = "sat_mon_wed" | "sun_tue_thu";
export type PaymentMethod = "advance" | "per_session" | "every_3_sessions";
export type SessionStatus = "done" | "pending" | "postponed" | "cancelled";
export type Gender = "male" | "female";

export const GENDER_LABELS: Record<Gender, string> = {
  male: "ذكر",
  female: "أنثى",
};

export const TOTAL_SESSIONS = 12;

export interface Patient {
  id: string;
  name: string;
  gender: Gender | null;
  phone: string;
  area: string;
  street: string | null;
  age: number | null;
  course_start_date: string;
  days_system: DaysSystem;
  session_price: number;
  discount: number;
  payment_method: PaymentMethod;
  default_time: string | null;
  diagnosis: string | null;
  present_history: string | null;
  past_history: string | null;
  operations: string[];
  symptoms: string[];
  treatment_program: string[];
  notes: string | null;
  archived: boolean;
  created_at: string;
}

export interface PatientFile {
  id: string;
  patient_id: string;
  path: string;
  name: string;
  created_at: string;
  // يُحسب وقت العرض
  signed_url?: string;
}

export interface Session {
  id: string;
  patient_id: string;
  course_number: number;
  session_number: number;
  session_date: string;
  session_time: string | null;
  status: SessionStatus;
  notes: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  patient_id: string;
  amount: number;
  payment_date: string;
  note: string | null;
  created_at: string;
}

// جلسة اليوم مع اسم المريض ومنطقته (لشاشة الرئيسية)
export interface TodaySession extends Session {
  patient_name: string;
  patient_area: string;
  patient_phone: string;
}

// ---------- التسميات العربية ----------
export const DAYS_SYSTEM_LABELS: Record<DaysSystem, string> = {
  sat_mon_wed: "سبت - اتنين - أربع",
  sun_tue_thu: "حد - تلات - خميس",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  advance: "مقدم",
  per_session: "جلسة بجلسة",
  every_3_sessions: "مؤخر كل 3 جلسات",
};

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  done: "تمت",
  pending: "لم تتم",
  postponed: "مؤجلة",
  cancelled: "ملغية",
};

// ---------- قوائم اختيار افتراضية (يمكن للمستخدم إضافة غيرها) ----------
export const DEFAULT_OPERATIONS = [
  "رباط صليبي",
  "غضروف الركبة (منيسكس)",
  "تثبيت كسر",
  "استبدال مفصل",
  "غضروف فقري (ديسك)",
  "إصلاح وتر",
  "تنظير مفصل",
];

export const DEFAULT_SYMPTOMS = [
  "ألم",
  "تورّم",
  "تنميل",
  "ضعف عضلي",
  "تيبّس",
  "محدودية حركة",
  "صعوبة في المشي",
  "عدم اتزان",
];

export const DEFAULT_TREATMENT_PROGRAM = [
  "تمارين تقوية",
  "تحفيز كهربي",
  "مساج",
  "سترتشات",
  "تمارين اتزان",
  "تمارين مشي",
  "علاج بالموجات",
  "ثلج / كمادات",
];

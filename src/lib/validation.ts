import { z } from "zod";

export const patientSchema = z.object({
  name: z.string().trim().min(2, "اسم المريض مطلوب"),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\s-]{7,15}$/, "رقم هاتف غير صحيح"),
  gender: z.enum(["male", "female"]).optional(),
  area: z.string().trim().min(1, "المنطقة مطلوبة"),
  street: z.string().trim().optional().default(""),
  age: z.coerce.number().int().min(0).max(120).optional().or(z.literal("").transform(() => undefined)),
  course_start_date: z.string().min(1, "تاريخ البداية مطلوب"),
  days_system: z.enum(["sat_mon_wed", "sun_tue_thu"], {
    errorMap: () => ({ message: "اختر نظام الأيام" }),
  }),
  session_price: z.coerce.number().min(0, "سعر غير صحيح"),
  discount: z.coerce.number().min(0, "خصم غير صحيح").default(0),
  payment_method: z.enum(["advance", "per_session", "every_3_sessions"], {
    errorMap: () => ({ message: "اختر طريقة الدفع" }),
  }),
  default_time: z.string().optional().default(""),
  diagnosis: z.string().trim().optional().default(""),
  present_history: z.string().trim().optional().default(""),
  past_history: z.string().trim().optional().default(""),
  operations: z.array(z.string()).optional().default([]),
  symptoms: z.array(z.string()).optional().default([]),
  treatment_program: z.array(z.string()).optional().default([]),
  notes: z.string().trim().optional().default(""),
});

export type PatientInput = z.infer<typeof patientSchema>;

export const paymentSchema = z.object({
  patient_id: z.string().uuid(),
  amount: z.coerce.number().positive("أدخل مبلغًا صحيحًا"),
  note: z.string().trim().optional().default(""),
});

export const sessionUpdateSchema = z.object({
  session_id: z.string().uuid(),
  patient_id: z.string().uuid(),
  status: z.enum(["done", "pending", "postponed", "cancelled"]),
  session_time: z.string().optional().default(""),
  notes: z.string().trim().optional().default(""),
});

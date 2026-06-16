import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Неверный формат email"),
  password: z.string().min(1, "Пароль обязателен"),
});

export const registerSchema = z.object({
  email: z.string().email("Неверный формат email"),
  password: z.string().min(8, "Пароль должен содержать минимум 8 символов"),
  fullName: z
    .string()
    .min(2, "ФИО обязательно")
    .max(255, "ФИО слишком длинное"),
  phone: z.string().max(32).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

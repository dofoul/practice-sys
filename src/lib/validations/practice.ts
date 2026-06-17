import { z } from "zod";

export const createPracticeSchema = z
  .object({
    practiceTypeId: z.number().int().positive("Выберите тип практики"),
    periodId: z.number().int().positive("Выберите период практики"),
    offerId: z.number().int().positive().optional().nullable(),
    customPlace: z.string().max(255).optional().nullable(),
    dateStart: z.string().optional().nullable(),
    dateEnd: z.string().optional().nullable(),
  })
  .refine((d) => d.offerId || d.customPlace, {
    message: "Укажите место из каталога или введите своё место практики",
    path: ["customPlace"],
  })
  .refine(
    (d) => !d.dateStart || !d.dateEnd || new Date(d.dateEnd) > new Date(d.dateStart),
    { message: "Дата окончания должна быть позже даты начала", path: ["dateEnd"] }
  );

export const reviewPracticeSchema = z.object({
  status: z.enum(["approved", "needs_revision", "rejected"]),
  comment: z.string().optional(),
});

export const gradePracticeSchema = z.object({
  grade: z.string().min(1, "Укажите оценку").max(16),
  comment: z.string().optional(),
});

export const reviewDocumentSchema = z.object({
  status: z.enum(["accepted", "rejected"]),
  comment: z.string().optional(),
});

export type CreatePracticeInput = z.infer<typeof createPracticeSchema>;
export type ReviewPracticeInput = z.infer<typeof reviewPracticeSchema>;
export type GradePracticeInput = z.infer<typeof gradePracticeSchema>;
export type ReviewDocumentInput = z.infer<typeof reviewDocumentSchema>;

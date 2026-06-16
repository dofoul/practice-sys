import { z } from "zod";

export const createOfferSchema = z.object({
  companyId: z.number().int().positive("Выберите предприятие"),
  practiceTypeId: z.number().int().positive("Выберите тип практики"),
  periodId: z.number().int().positive("Выберите период"),
  title: z.string().min(3, "Заголовок обязателен").max(255),
  description: z.string().optional(),
  slotsTotal: z.number().int().min(1, "Укажите количество мест"),
  isPublished: z.boolean().default(true),
});

export const updateOfferSchema = createOfferSchema.partial();

export type CreateOfferInput = z.infer<typeof createOfferSchema>;
export type UpdateOfferInput = z.infer<typeof updateOfferSchema>;

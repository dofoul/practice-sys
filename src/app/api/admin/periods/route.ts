import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole, ok, err } from "@/lib/api";
import { z } from "zod";

const createPeriodSchema = z
  .object({
    name: z.string().min(1, "Название обязательно").max(128),
    dateStart: z.string().min(1, "Дата начала обязательна"),
    dateEnd: z.string().min(1, "Дата окончания обязательна"),
    isOpen: z.boolean().default(true),
  })
  .refine((d) => new Date(d.dateEnd) > new Date(d.dateStart), {
    message: "Дата окончания должна быть позже даты начала",
    path: ["dateEnd"],
  });

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const items = await prisma.practicePeriod.findMany({ orderBy: { dateStart: "desc" } });
  return ok({ items });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const roleError = requireRole(session, "admin");
  if (roleError) return roleError;

  try {
    const body = await req.json();
    const parsed = createPeriodSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.errors[0].message, 400);

    const { name, dateStart, dateEnd, isOpen } = parsed.data;
    const item = await prisma.practicePeriod.create({
      data: { name, dateStart: new Date(dateStart), dateEnd: new Date(dateEnd), isOpen },
    });
    return ok(item, 201);
  } catch (e) {
    console.error(e);
    return err("Ошибка создания периода", 500);
  }
}
